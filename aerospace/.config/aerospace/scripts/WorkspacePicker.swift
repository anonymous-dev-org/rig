import SwiftUI
import AppKit
import SQLite3

// MARK: - Data

struct Desktop: Identifiable {
    let id: String
    let apps: [String]
    let previews: [AppPreview]
    let notifyApps: [String]
    var isCurrent: Bool
    var hasWindows: Bool { !apps.isEmpty }
    var hasNotification: Bool { !notifyApps.isEmpty }
}

struct AppPreview: Identifiable, Hashable {
    let name: String
    let bundleId: String?

    var id: String { bundleId ?? name }
    var initials: String {
        let words = name.split(whereSeparator: { $0 == " " || $0 == "-" || $0 == "_" })
        let chars = words.prefix(2).compactMap { $0.first }
        let value = String(chars).uppercased()
        return value.isEmpty ? String(name.prefix(1)).uppercased() : value
    }
}

struct Preset: Codable, Identifiable {
    var id: String { name }
    let name: String
    let desktops: [String: [String]]

    var appList: String {
        let apps = Set(desktops.values.flatMap { $0 }).sorted()
        return apps.joined(separator: ", ")
    }
}

struct GridPos: Equatable {
    var row: Int
    var col: Int
}

enum FocusArea: Equatable {
    case grid
    case presets
}

let desktopPositions = ["n", "e", "s", "w"]
let desktopLabels = ["N", "E", "S", "W"]
let presetsPath = NSHomeDirectory() + "/.config/aerospace/saved-workspaces.json"

func run(_ args: String...) -> String {
    let p = Process()
    let pipe = Pipe()
    p.executableURL = URL(fileURLWithPath: "/usr/bin/env")
    p.arguments = args
    p.standardOutput = pipe
    p.standardError = FileHandle.nullDevice
    try? p.run()
    p.waitUntilExit()
    return String(data: pipe.fileHandleForReading.readDataToEndOfFile(), encoding: .utf8) ?? ""
}

func parseWorkspaceId(_ workspaceId: String) -> (position: String, displaySlot: Int)? {
    guard let first = workspaceId.first else { return nil }
    let position = String(first)
    guard desktopPositions.contains(position) else { return nil }
    let slotText = String(workspaceId.dropFirst())
    guard let displaySlot = Int(slotText), displaySlot > 0 else { return nil }
    return (position, displaySlot)
}

func workspaceId(position: String, displaySlot: Int) -> String {
    "\(position)\(displaySlot)"
}

func isBuiltinMonitorName(_ name: String) -> Bool {
    let lowercased = name.lowercased()
    return lowercased.contains("built-in")
        || lowercased.contains("retina")
        || lowercased.contains("macbook")
        || lowercased.contains("color lcd")
}

func monitorIdsByDisplaySlot() -> [String] {
    let lines = run("aerospace", "list-monitors", "--format", "%{monitor-id}|%{monitor-name}")
        .split(separator: "\n")
        .map(String.init)

    var builtIn: [String] = []
    var external: [String] = []

    for line in lines {
        let parts = line.split(separator: "|", maxSplits: 1, omittingEmptySubsequences: false)
        guard let id = parts.first.map(String.init), !id.isEmpty else { continue }
        let name = parts.count > 1 ? String(parts[1]) : ""
        if isBuiltinMonitorName(name) {
            builtIn.append(id)
        } else {
            external.append(id)
        }
    }

    return builtIn.isEmpty ? external : builtIn + external
}

let notifDbPath = NSHomeDirectory() + "/Library/Group Containers/group.com.apple.usernoted/db2/db"

/// Query the macOS Notification Center database for bundle IDs with active notifications.
func getNotifyingBundleIdsFromDB() -> Set<String> {
    var db: OpaquePointer?
    guard sqlite3_open_v2(notifDbPath, &db, SQLITE_OPEN_READONLY, nil) == SQLITE_OK else {
        return []
    }
    defer { sqlite3_close(db) }

    var result = Set<String>()
    let query = """
        SELECT DISTINCT a.identifier FROM app a
        LEFT JOIN record r ON a.app_id = r.app_id
        WHERE a.identifier NOT LIKE '_system_center_%'
          AND (a.badge > 0 OR r.rec_id IS NOT NULL)
    """

    var stmt: OpaquePointer?
    guard sqlite3_prepare_v2(db, query, -1, &stmt, nil) == SQLITE_OK else { return [] }
    defer { sqlite3_finalize(stmt) }

    while sqlite3_step(stmt) == SQLITE_ROW {
        if let cStr = sqlite3_column_text(stmt, 0) {
            result.insert(String(cString: cStr))
        }
    }
    return result
}

/// Fallback: detect apps with dock badges via lsappinfo per-app query.
func extractBadgeLabel(_ output: String) -> String? {
    guard let labelRange = output.range(of: "\"label\"=\"") else { return nil }
    let afterLabel = output[labelRange.upperBound...]
    guard let closeQuote = afterLabel.firstIndex(of: "\"") else { return nil }
    let value = String(afterLabel[..<closeQuote])
    if value.isEmpty || value == "0" { return nil }
    return value
}

func getBadgeAppsFromLsappinfo(_ appNames: Set<String>) -> Set<String> {
    var badged = Set<String>()
    for app in appNames {
        let status = run("lsappinfo", "info", "-only", "StatusLabel", app)
        if extractBadgeLabel(status) != nil {
            badged.insert(app)
        }
        let attention = run("lsappinfo", "info", "-only", "LSWantsAttention", app)
        if attention.contains("true") {
            badged.insert(app)
        }
    }
    return badged
}

func getWorkspaces() -> (workspaces: [[Desktop]], currentPos: GridPos?, notifyBundleIds: Set<String>) {
    let currentWs = run("aerospace", "list-workspaces", "--focused").trimmingCharacters(in: .whitespacesAndNewlines)

    let currentParsed = parseWorkspaceId(currentWs)
    let monitorSlotCount = max(1, monitorIdsByDisplaySlot().count)
    var maxDisplaySlot = monitorSlotCount
    if let currentParsed {
        maxDisplaySlot = max(maxDisplaySlot, currentParsed.displaySlot)
    }

    // Collect all window metadata in one AeroSpace call. Spawning one process per desktop
    // makes the picker noticeably slow when many workspaces are populated.
    var desktopApps: [String: [String]] = [:]          // wsName -> [appName]
    var desktopBundleIds: [String: Set<String>] = [:]  // wsName -> {bundleId}
    var desktopPreviews: [String: [AppPreview]] = [:]  // wsName -> app previews in first-seen order
    var bundleIdToName: [String: String] = [:]         // bundleId -> appName
    var allAppNames = Set<String>()

    let windowLines = run("aerospace", "list-windows", "--all",
                          "--format", "%{workspace}|%{app-name}|%{app-bundle-id}")
        .split(separator: "\n")

    for line in windowLines {
        let parts = line.split(separator: "|", maxSplits: 2, omittingEmptySubsequences: false)
        guard parts.count >= 2 else { continue }

        let wsName = String(parts[0]).trimmingCharacters(in: .whitespacesAndNewlines)
        guard let parsed = parseWorkspaceId(wsName) else { continue }
        maxDisplaySlot = max(maxDisplaySlot, parsed.displaySlot)

        let name = String(parts[1]).trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { continue }

        let bundleId: String? = {
            guard parts.count >= 3 else { return nil }
            let raw = String(parts[2]).trimmingCharacters(in: .whitespacesAndNewlines)
            return raw.isEmpty ? nil : raw
        }()

        desktopApps[wsName, default: []].append(name)
        allAppNames.insert(name)

        if let bundleId {
            desktopBundleIds[wsName, default: []].insert(bundleId)
            bundleIdToName[bundleId] = name
        }

        let preview = AppPreview(name: name, bundleId: bundleId)
        if !(desktopPreviews[wsName] ?? []).contains(preview) {
            desktopPreviews[wsName, default: []].append(preview)
        }
    }

    desktopApps = desktopApps.mapValues { Array(Set($0)).sorted() }

    // Try notification DB first, fall back to lsappinfo
    let dbBundleIds = getNotifyingBundleIdsFromDB()
    let notifyBundleIds: Set<String>
    if !dbBundleIds.isEmpty {
        notifyBundleIds = dbBundleIds
    } else {
        let badgedNames = getBadgeAppsFromLsappinfo(allAppNames)
        notifyBundleIds = Set(bundleIdToName.filter { badgedNames.contains($0.value) }.map { $0.key })
    }

    // Second pass: build grid. Row 1 is always the Mac built-in display when present.
    var grid: [[Desktop]] = []
    for displaySlot in 1...maxDisplaySlot {
        var row: [Desktop] = []
        for position in desktopPositions {
            let wsName = workspaceId(position: position, displaySlot: displaySlot)
            let uniqueApps = desktopApps[wsName] ?? []
            let bids = desktopBundleIds[wsName] ?? []
            let notifyingBidsOnDesktop = bids.intersection(notifyBundleIds)
            let notifyApps = notifyingBidsOnDesktop.compactMap { bundleIdToName[$0] }.sorted()
            let dt = Desktop(
                id: wsName, apps: uniqueApps, previews: desktopPreviews[wsName] ?? [],
                notifyApps: notifyApps, isCurrent: wsName == currentWs
            )
            row.append(dt)
        }
        grid.append(row)
    }

    var currentPos: GridPos?
    if let currentParsed,
       let positionIndex = desktopPositions.firstIndex(of: currentParsed.position) {
        currentPos = GridPos(row: currentParsed.displaySlot - 1, col: positionIndex)
    }

    return (grid, currentPos, notifyBundleIds)
}

// MARK: - Presets

func loadPresets() -> [Preset] {
    guard let data = try? Data(contentsOf: URL(fileURLWithPath: presetsPath)),
          let presets = try? JSONDecoder().decode([Preset].self, from: data) else {
        return []
    }
    return presets
}

func savePresetsToFile(_ presets: [Preset]) {
    let encoder = JSONEncoder()
    encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
    guard let data = try? encoder.encode(presets) else { return }
    try? data.write(to: URL(fileURLWithPath: presetsPath))
}

func captureCurrentWorkspace() -> [String: [String]] {
    let current = run("aerospace", "list-workspaces", "--focused")
        .trimmingCharacters(in: .whitespacesAndNewlines)
    let currentSlot = parseWorkspaceId(current)?.displaySlot ?? 1

    var desktopMap: [String: [String]] = [:]
    for position in desktopPositions {
        let wsName = workspaceId(position: position, displaySlot: currentSlot)
        let apps = run("aerospace", "list-windows", "--workspace", wsName, "--format", "%{app-name}")
            .split(separator: "\n").map { String($0) }.filter { !$0.isEmpty }
        if !apps.isEmpty {
            desktopMap[position] = Array(Set(apps)).sorted()
        }
    }
    return desktopMap
}

func findNextEmptyWorkspace() -> Int? {
    let occupied = run("aerospace", "list-workspaces", "--monitor", "all", "--empty", "no")
        .split(separator: "\n").map(String.init)
    let displaySlotCount = max(1, monitorIdsByDisplaySlot().count)
    for w in 1...displaySlotCount {
        var used = false
        for position in desktopPositions {
            if occupied.contains(workspaceId(position: position, displaySlot: w)) {
                used = true
                break
            }
        }
        if !used { return w }
    }
    return nil
}

func applyPreset(_ preset: Preset) {
    guard let ws = findNextEmptyWorkspace() else {
        _ = run("osascript", "-e",
            "display notification \"All connected displays already have windows\" with title \"AeroSpace\"")
        return
    }

    let windowList = run("aerospace", "list-windows", "--all", "--format", "%{window-id}|%{app-name}")
        .split(separator: "\n")

    var windowsByApp: [String: [String]] = [:]
    for line in windowList {
        let parts = line.split(separator: "|", maxSplits: 1)
        if parts.count == 2 {
            let wid = String(parts[0]).trimmingCharacters(in: .whitespaces)
            let app = String(parts[1]).trimmingCharacters(in: .whitespaces)
            windowsByApp[app, default: []].append(wid)
        }
    }

    for (desktop, apps) in preset.desktops.sorted(by: { $0.key < $1.key }) where desktopPositions.contains(desktop) {
        let targetWs = workspaceId(position: desktop, displaySlot: ws)
        for app in apps {
            if var ids = windowsByApp[app], !ids.isEmpty {
                let wid = ids.removeFirst()
                windowsByApp[app] = ids
                _ = run("aerospace", "move-node-to-workspace", "--window-id", wid, targetWs)
            } else {
                _ = run("open", "-a", app)
            }
        }
    }

    _ = run("aerospace", "workspace", workspaceId(position: "n", displaySlot: ws))
}

// MARK: - State

/// Notification info for the selected desktop's overlay.
struct DesktopNotification: Identifiable {
    let id: String
    let appName: String
    let windowId: String
    let badgeCount: Int?
}

func windowIds(in workspaceId: String) -> [String] {
    run("aerospace", "list-windows", "--workspace", workspaceId, "--format", "%{window-id}")
        .split(separator: "\n")
        .map { String($0).trimmingCharacters(in: .whitespacesAndNewlines) }
        .filter { !$0.isEmpty }
}

func moveWindows(_ windowIds: [String], to workspaceId: String) {
    for windowId in windowIds {
        _ = run("aerospace", "move-node-to-workspace", "--window-id", windowId, workspaceId)
    }
}

func swapDesktops(from source: Desktop, to target: Desktop) {
    guard source.id != target.id else { return }

    let sourceWindows = windowIds(in: source.id)
    let targetWindows = windowIds(in: target.id)

    if sourceWindows.isEmpty && targetWindows.isEmpty { return }

    if sourceWindows.isEmpty {
        moveWindows(targetWindows, to: source.id)
    } else if targetWindows.isEmpty {
        moveWindows(sourceWindows, to: target.id)
    } else {
        let tempWorkspace = "__tmp_swap__"
        // Drain any leftovers first
        moveWindows(windowIds(in: tempWorkspace), to: source.id)
        moveWindows(sourceWindows, to: tempWorkspace)
        moveWindows(targetWindows, to: source.id)
        moveWindows(windowIds(in: tempWorkspace), to: target.id)
    }

    _ = run("aerospace", "workspace", target.id)
}

func activateWorkspace(_ workspaceId: String) {
    DispatchQueue.main.async {
        NSApp.windows.forEach { $0.orderOut(nil) }
        DispatchQueue.global().async {
            // Let the picker release focus before AeroSpace switches. This avoids
            // empty workspaces flashing and returning to the picker workspace.
            usleep(60_000)
            _ = run("aerospace", "workspace", workspaceId)
            DispatchQueue.main.async { NSApp.terminate(nil) }
        }
    }
}

class PickerState: ObservableObject {
    @Published var gridCursor: GridPos
    @Published var presetCursor: Int = 0
    @Published var focus: FocusArea = .grid
    @Published var presets: [Preset]
    @Published var showingHelp: Bool = false
    @Published var showingNotifications: Bool = false
    @Published var desktopNotifications: [DesktopNotification] = []
    @Published var notifCursor: Int = 0
    @Published var swapSourceId: String? = nil

    let grid: [[Desktop]]
    let notifyBundleIds: Set<String>

    init() {
        let result = getWorkspaces()
        self.grid = result.workspaces
        self.gridCursor = result.currentPos ?? GridPos(row: 0, col: 0)
        self.presets = loadPresets()
        self.notifyBundleIds = result.notifyBundleIds
    }

    var notificationDesktops: [Desktop] {
        grid.flatMap { $0 }.filter { $0.hasNotification && !$0.isCurrent }
    }

    var selectedDesktop: Desktop? {
        guard gridCursor.row < grid.count, gridCursor.col < grid[gridCursor.row].count else { return nil }
        return grid[gridCursor.row][gridCursor.col]
    }

    var rowCount: Int { grid.count }
    var isSwapMode: Bool { swapSourceId != nil }
    var visibleRowRange: Range<Int> {
        centeredRange(
            around: gridCursor.row,
            count: grid.count,
            visibleCount: WorkspacePaletteLayout.visibleRows
        )
    }

    var visibleColumnRange: Range<Int> {
        centeredRange(
            around: gridCursor.col,
            count: desktopPositions.count,
            visibleCount: WorkspacePaletteLayout.visibleColumns
        )
    }

    var swapSourceDesktop: Desktop? {
        guard let swapSourceId else { return nil }
        return grid.flatMap { $0 }.first { $0.id == swapSourceId }
    }

    func centeredRange(around cursor: Int, count: Int, visibleCount: Int) -> Range<Int> {
        guard count > visibleCount else { return 0..<count }
        let half = visibleCount / 2
        var start = max(0, cursor - half)
        let end = min(count, start + visibleCount)
        start = max(0, end - visibleCount)
        return start..<end
    }

    func moveUp() {
        switch focus {
        case .grid:
            if gridCursor.row > 0 { gridCursor.row -= 1 }
        case .presets:
            if presetCursor > 0 {
                presetCursor -= 1
            } else if !grid.isEmpty {
                focus = .grid
                gridCursor.row = rowCount - 1
            }
        }
    }

    func moveDown() {
        switch focus {
        case .grid:
            if gridCursor.row < rowCount - 1 {
                gridCursor.row += 1
            } else if !presets.isEmpty {
                focus = .presets
                presetCursor = 0
            }
        case .presets:
            if presetCursor < presets.count - 1 { presetCursor += 1 }
        }
    }

    func moveLeft() {
        if focus == .grid && gridCursor.col > 0 { gridCursor.col -= 1 }
    }

    func moveRight() {
        if focus == .grid && gridCursor.col < desktopPositions.count - 1 { gridCursor.col += 1 }
    }

    func confirm() {
        if isSwapMode {
            confirmSwap()
            return
        }

        switch focus {
        case .grid:
            guard let dt = selectedDesktop else { NSApp.terminate(nil); return }
            activateWorkspace(dt.id)
        case .presets:
            guard presetCursor < presets.count else { return }
            let preset = presets[presetCursor]
            DispatchQueue.global().async {
                applyPreset(preset)
                DispatchQueue.main.async { NSApp.terminate(nil) }
            }
        }
    }

    func toggleSwapMode() {
        guard focus == .grid else { return }
        if isSwapMode {
            swapSourceId = nil
            return
        }
        swapSourceId = selectedDesktop?.id
    }

    func confirmSwap() {
        guard let source = swapSourceDesktop, let target = selectedDesktop else { return }
        guard source.id != target.id else {
            swapSourceId = nil
            return
        }

        DispatchQueue.global().async {
            swapDesktops(from: source, to: target)
            DispatchQueue.main.async {
                self.swapSourceId = nil
                NSApp.terminate(nil)
            }
        }
    }

    func save() {
        let alert = NSAlert()
        alert.messageText = "Save workspace"
        alert.informativeText = "Name for this workspace layout:"
        alert.addButton(withTitle: "Save")
        alert.addButton(withTitle: "Cancel")

        let input = NSTextField(frame: NSRect(x: 0, y: 0, width: 200, height: 24))
        input.placeholderString = "e.g. work, personal"
        alert.accessoryView = input
        alert.window.initialFirstResponder = input

        let response = alert.runModal()
        if response == .alertFirstButtonReturn {
            let name = input.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
            if !name.isEmpty {
                let desktopMap = captureCurrentWorkspace()
                if desktopMap.isEmpty { return }
                let preset = Preset(name: name, desktops: desktopMap)
                presets.removeAll { $0.name == name }
                presets.append(preset)
                presets.sort { $0.name < $1.name }
                savePresetsToFile(presets)
            }
        }
    }

    func deletePreset() {
        guard focus == .presets, presetCursor < presets.count else { return }
        presets.remove(at: presetCursor)
        savePresetsToFile(presets)
        if presets.isEmpty {
            focus = .grid
        } else if presetCursor >= presets.count {
            presetCursor = presets.count - 1
        }
    }

    func toggleHelp() { showingHelp.toggle() }

    func toggleNotifications() {
        if showingNotifications {
            showingNotifications = false
            return
        }
        guard focus == .grid, let dt = selectedDesktop else { return }
        // Get notification details for the selected desktop
        let windowLines = run("aerospace", "list-windows", "--workspace", dt.id,
                              "--format", "%{window-id}|%{app-name}|%{app-bundle-id}")
            .split(separator: "\n")

        // Also query badge counts from DB
        var badgeCounts: [String: Int] = [:]
        var db: OpaquePointer?
        if sqlite3_open_v2(notifDbPath, &db, SQLITE_OPEN_READONLY, nil) == SQLITE_OK {
            let query = "SELECT identifier, badge FROM app WHERE badge > 0"
            var stmt: OpaquePointer?
            if sqlite3_prepare_v2(db, query, -1, &stmt, nil) == SQLITE_OK {
                while sqlite3_step(stmt) == SQLITE_ROW {
                    if let cStr = sqlite3_column_text(stmt, 0) {
                        badgeCounts[String(cString: cStr)] = Int(sqlite3_column_int(stmt, 1))
                    }
                }
                sqlite3_finalize(stmt)
            }
            sqlite3_close(db)
        }

        var notifs: [DesktopNotification] = []
        var seen = Set<String>()
        for line in windowLines {
            let parts = line.split(separator: "|", maxSplits: 2)
            guard parts.count == 3 else { continue }
            let wid = String(parts[0]).trimmingCharacters(in: .whitespaces)
            let appName = String(parts[1]).trimmingCharacters(in: .whitespaces)
            let bundleId = String(parts[2]).trimmingCharacters(in: .whitespaces)
            if notifyBundleIds.contains(bundleId) && !seen.contains(bundleId) {
                seen.insert(bundleId)
                notifs.append(DesktopNotification(
                    id: bundleId,
                    appName: appName,
                    windowId: wid,
                    badgeCount: badgeCounts[bundleId]
                ))
            }
        }

        if notifs.isEmpty { return }
        desktopNotifications = notifs.sorted { $0.appName < $1.appName }
        notifCursor = 0
        showingNotifications = true
    }

    func notifUp() {
        if notifCursor > 0 { notifCursor -= 1 }
    }

    func notifDown() {
        if notifCursor < desktopNotifications.count - 1 { notifCursor += 1 }
    }

    func confirmNotif() {
        guard notifCursor < desktopNotifications.count else { return }
        let notif = desktopNotifications[notifCursor]
        guard let dt = selectedDesktop else { return }
        DispatchQueue.global().async {
            DispatchQueue.main.sync {
                NSApp.windows.forEach { $0.orderOut(nil) }
            }
            usleep(60_000)
            _ = run("aerospace", "workspace", dt.id)
            _ = run("aerospace", "focus", "--window-id", notif.windowId)
            DispatchQueue.main.async { NSApp.terminate(nil) }
        }
    }

    func cancel() {
        if showingHelp { showingHelp = false }
        else if showingNotifications { showingNotifications = false }
        else if isSwapMode { swapSourceId = nil }
        else { NSApp.terminate(nil) }
    }
}

// MARK: - Views

class AppIconStore {
    static let shared = AppIconStore()
    private var cache: [String: NSImage] = [:]
    private var missingBundleIds = Set<String>()

    func icon(for preview: AppPreview) -> NSImage? {
        guard let bundleId = preview.bundleId else { return nil }
        if let cached = cache[bundleId] { return cached }
        if missingBundleIds.contains(bundleId) { return nil }
        guard let url = NSWorkspace.shared.urlForApplication(withBundleIdentifier: bundleId) else {
            missingBundleIds.insert(bundleId)
            return nil
        }
        let image = NSWorkspace.shared.icon(forFile: url.path)
        image.size = NSSize(width: 16, height: 16)
        cache[bundleId] = image
        return image
    }
}

struct HelpView: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("KEYBINDINGS")
                .font(.system(size: 10, weight: .bold, design: .monospaced))
                .foregroundColor(.accentColor)
                .padding(.bottom, 10)

            helpSection("Neovim Splits", "ctrl+w", [
                ("hjkl", "Focus split"),
                ("HJKL", "Move split"),
                ("r", "Resize to default"),
                ("z", "Zoom toggle"),
            ])

            helpSection("Kitty Tabs", "ctrl+alt", [
                ("h / l", "Prev / next tab"),
                ("1-9", "Go to tab N"),
                ("+shift h/l", "Move tab"),
            ])

            helpSection("Desktop Windows", "alt", [
                ("hjkl", "Focus window"),
                ("+shift hjkl", "Move window"),
                ("f", "Fullscreen"),
                ("/ / ,", "Tiles / accordion"),
                ("r", "Resize mode"),
                ("v / b", "Join right / down"),
                ("p", "Picker (this)"),
                ("tab", "Focus back-and-forth"),
            ])

            helpSection("Workspaces", "cmd+alt", [
                ("hjkl", "Switch desktop"),
                ("+shift", "Send window instead"),
            ])

            helpSection("App Launchers", "alt+shift", [
                ("t", "Kitty"),
                ("s", "Safari"),
                ("f", "Finder"),
            ])

            helpSection("This Picker", "", [
                ("hjkl", "Navigate"),
                ("\u{23ce}", "Select / load preset"),
                ("m", "Start desktop swap"),
                ("hjkl", "Choose swap target"),
                ("\u{23ce}", "Confirm desktop swap"),
                ("i", "Desktop notifications"),
                ("s", "Save workspace"),
                ("x", "Delete preset"),
                ("?", "Toggle this help"),
                ("Esc", "Close"),
            ])
        }
        .padding(16)
        .frame(width: 320)
        .background(VisualEffectBlur())
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(Color.white.opacity(0.2), lineWidth: 0.5)
        )
        .shadow(color: .black.opacity(0.3), radius: 20, y: 10)
    }

    func helpSection(_ title: String, _ modifier: String, _ rows: [(String, String)]) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(spacing: 6) {
                Text(title)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(.primary)
                if !modifier.isEmpty {
                    Text(modifier)
                        .font(.system(size: 9, weight: .medium, design: .monospaced))
                        .foregroundColor(.secondary)
                        .padding(.horizontal, 4)
                        .padding(.vertical, 1)
                        .background(Color.primary.opacity(0.08))
                        .cornerRadius(3)
                }
            }
            .padding(.bottom, 2)

            ForEach(rows, id: \.0) { key, desc in
                HStack(spacing: 0) {
                    Text(key)
                        .font(.system(size: 10, weight: .medium, design: .monospaced))
                        .foregroundColor(.accentColor.opacity(0.8))
                        .frame(width: 90, alignment: .leading)
                    Text(desc)
                        .font(.system(size: 10))
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(.bottom, 8)
    }
}

enum WorkspacePaletteLayout {
    static let visibleRows = 5
    static let visibleColumns = 4
    static let cellWidth: CGFloat = 58
    static let cellHeight: CGFloat = 44
    static let appIconSize: CGFloat = 17
    static let singleAppIconSize: CGFloat = 26
    static let appIconSpacing: CGFloat = 2
    static let iconCornerRadius: CGFloat = 3
    static let rowLabelWidth: CGFloat = 18
    static let cellSpacing: CGFloat = 3
}

struct CellView: View {
    let dt: Desktop
    let isSelected: Bool

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 4)
                .fill(cellBackground)
                .frame(width: WorkspacePaletteLayout.cellWidth, height: WorkspacePaletteLayout.cellHeight)

            if isSelected {
                RoundedRectangle(cornerRadius: 4)
                    .strokeBorder(Color.accentColor, lineWidth: 2)
                    .frame(width: WorkspacePaletteLayout.cellWidth, height: WorkspacePaletteLayout.cellHeight)
            }

            if dt.hasWindows {
                AppIconClusterView(dt: dt)
            }

            if dt.hasNotification {
                Circle()
                    .fill(Color.orange)
                    .frame(width: 5, height: 5)
                    .offset(x: 24, y: -17)
            }
        }
        .frame(width: WorkspacePaletteLayout.cellWidth, height: WorkspacePaletteLayout.cellHeight)
        .contentShape(Rectangle())
    }

    var cellBackground: Color {
        if isSelected && dt.hasNotification {
            return Color.orange.opacity(0.25)
        } else if isSelected {
            return Color.accentColor.opacity(0.2)
        } else if dt.hasNotification {
            return Color.orange.opacity(0.1)
        } else if dt.hasWindows {
            return Color.primary.opacity(0.08)
        } else {
            return Color.primary.opacity(0.035)
        }
    }
}

struct AppIconClusterView: View {
    let dt: Desktop

    private var previews: [AppPreview] {
        Array(dt.previews.prefix(4))
    }

    var body: some View {
        ZStack(alignment: .bottomTrailing) {
            if previews.count == 1, let preview = previews.first {
                AppIconView(
                    preview: preview,
                    isCurrent: dt.isCurrent,
                    size: WorkspacePaletteLayout.singleAppIconSize
                )
            } else {
                LazyVGrid(
                    columns: Array(
                        repeating: GridItem(.fixed(WorkspacePaletteLayout.appIconSize), spacing: WorkspacePaletteLayout.appIconSpacing),
                        count: 2
                    ),
                    spacing: WorkspacePaletteLayout.appIconSpacing
                ) {
                    ForEach(previews) { preview in
                        AppIconView(
                            preview: preview,
                            isCurrent: dt.isCurrent,
                            size: WorkspacePaletteLayout.appIconSize
                        )
                    }
                }
                .frame(
                    width: WorkspacePaletteLayout.appIconSize * 2 + WorkspacePaletteLayout.appIconSpacing,
                    height: WorkspacePaletteLayout.appIconSize * 2 + WorkspacePaletteLayout.appIconSpacing
                )
            }

            if dt.previews.count > 4 {
                Text("+\(dt.previews.count - 4)")
                    .font(.system(size: 8, weight: .semibold, design: .monospaced))
                    .foregroundColor(.white)
                    .padding(.horizontal, 3)
                    .frame(height: 11)
                    .background(Capsule().fill(Color.black.opacity(0.55)))
                    .offset(x: 5, y: 4)
            }
        }
    }
}

struct AppIconView: View {
    let preview: AppPreview
    let isCurrent: Bool
    let size: CGFloat

    var body: some View {
        iconContent
            .frame(width: size, height: size)
            .background(
                RoundedRectangle(cornerRadius: WorkspacePaletteLayout.iconCornerRadius)
                    .fill(isCurrent ? Color.accentColor : Color.primary.opacity(0.12))
            )
            .clipShape(RoundedRectangle(cornerRadius: WorkspacePaletteLayout.iconCornerRadius))
    }

    @ViewBuilder
    var iconContent: some View {
        if let image = AppIconStore.shared.icon(for: preview) {
            Image(nsImage: image)
                .resizable()
                .aspectRatio(contentMode: .fit)
                .padding(1)
        } else {
            Text(preview.initials)
                .font(.system(size: preview.initials.count > 1 ? size * 0.38 : size * 0.52, weight: .bold, design: .rounded))
                .foregroundColor(isCurrent ? .white : .primary)
                .minimumScaleFactor(0.7)
        }
    }
}

struct PresetRowView: View {
    let preset: Preset
    let isSelected: Bool

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "square.grid.2x2")
                .font(.system(size: 10))
                .foregroundColor(isSelected ? .accentColor : .secondary)

            Text(preset.name)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.primary)

            Spacer()

            Text(preset.appList)
                .font(.system(size: 10))
                .foregroundColor(.secondary)
                .lineLimit(1)
                .truncationMode(.tail)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 4)
        .background(
            RoundedRectangle(cornerRadius: 4)
                .fill(isSelected ? Color.accentColor.opacity(0.15) : Color.clear)
                .padding(.horizontal, 8)
        )
    }
}

struct PickerView: View {
    @ObservedObject var state: PickerState

    var body: some View {
        if state.showingHelp {
            HelpView()
        } else if state.showingNotifications {
            notificationsOverlay
        } else {
            pickerContent
        }
    }

    var notificationsOverlay: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack(spacing: 6) {
                Text("NOTIFICATIONS")
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundColor(.orange.opacity(0.8))
                Spacer()
                if let dt = state.selectedDesktop {
                    Text(dt.id)
                        .font(.system(size: 10, weight: .bold, design: .monospaced))
                        .foregroundColor(.secondary)
                }
            }
            .padding(.horizontal, 14)
            .padding(.top, 12)
            .padding(.bottom, 6)

            ForEach(Array(state.desktopNotifications.enumerated()), id: \.element.id) { idx, notif in
                HStack(spacing: 8) {
                    Circle()
                        .fill(Color.orange)
                        .frame(width: 6, height: 6)

                    Text(notif.appName)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.primary)

                    Spacer()

                    if let count = notif.badgeCount {
                        Text("\(count)")
                            .font(.system(size: 10, weight: .bold, design: .monospaced))
                            .foregroundColor(.orange)
                    }
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 5)
                .background(
                    RoundedRectangle(cornerRadius: 4)
                        .fill(state.notifCursor == idx ? Color.accentColor.opacity(0.2) : Color.clear)
                        .padding(.horizontal, 8)
                )
                .onTapGesture {
                    state.notifCursor = idx
                    state.confirmNotif()
                }
            }

            Rectangle()
                .fill(Color.primary.opacity(0.1))
                .frame(height: 1)
                .padding(.horizontal, 14)
                .padding(.vertical, 6)

            HStack(spacing: 12) {
                hintLabel("j/k", "navigate")
                hintLabel("\u{23ce}", "focus app")
                hintLabel("esc", "back")
            }
            .padding(.horizontal, 14)
            .padding(.bottom, 10)
        }
        .frame(width: 280)
        .background(VisualEffectBlur())
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(Color.white.opacity(0.2), lineWidth: 0.5)
        )
        .shadow(color: .black.opacity(0.3), radius: 20, y: 10)
    }

    var pickerContent: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header with desktop labels
            HStack(spacing: WorkspacePaletteLayout.cellSpacing) {
                Text("")
                    .frame(width: WorkspacePaletteLayout.rowLabelWidth)
                ForEach(Array(state.visibleColumnRange), id: \.self) { colIdx in
                    Text(desktopLabels[colIdx])
                        .font(.system(size: 9, weight: .medium, design: .monospaced))
                        .foregroundColor(.secondary)
                        .frame(width: WorkspacePaletteLayout.cellWidth)
                }
            }
            .padding(.horizontal, 12)
            .padding(.top, 12)
            .padding(.bottom, 4)

            // Grid
            ForEach(Array(state.visibleRowRange), id: \.self) { rowIdx in
                HStack(spacing: WorkspacePaletteLayout.cellSpacing) {
                    Text("\(rowIdx + 1)")
                        .font(.system(size: 10, weight: .semibold, design: .monospaced))
                        .foregroundColor(.secondary)
                        .frame(width: WorkspacePaletteLayout.rowLabelWidth, alignment: .trailing)

                    ForEach(Array(state.visibleColumnRange), id: \.self) { colIdx in
                        let dt = state.grid[rowIdx][colIdx]
                        CellView(
                            dt: dt,
                            isSelected: state.focus == .grid &&
                                state.gridCursor == GridPos(row: rowIdx, col: colIdx)
                        )
                        .contentShape(Rectangle())
                        .onTapGesture {
                            state.focus = .grid
                            state.gridCursor = GridPos(row: rowIdx, col: colIdx)
                            if state.isSwapMode {
                                state.confirmSwap()
                            } else {
                                state.confirm()
                            }
                        }
                    }
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 1)
            }

            if let source = state.swapSourceDesktop, let target = state.selectedDesktop {
                HStack(spacing: 4) {
                    Text("SWAP")
                        .font(.system(size: 10, weight: .bold, design: .monospaced))
                        .foregroundColor(.orange)
                    Text(source.id)
                        .font(.system(size: 12, weight: .bold, design: .monospaced))
                        .foregroundColor(.primary)
                    Text("\u{2194}")
                        .font(.system(size: 11, weight: .medium, design: .monospaced))
                        .foregroundColor(.secondary)
                    Text(target.id)
                        .font(.system(size: 12, weight: .bold, design: .monospaced))
                        .foregroundColor(.accentColor)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
            }

            // Notifications section
            if !state.notificationDesktops.isEmpty {
                Rectangle()
                    .fill(Color.primary.opacity(0.1))
                    .frame(height: 1)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 4)

                Text("NOTIFICATIONS")
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundColor(.orange.opacity(0.8))
                    .padding(.horizontal, 12)
                    .padding(.bottom, 4)

                ForEach(state.notificationDesktops) { dt in
                    HStack(spacing: 6) {
                        Circle()
                            .fill(Color.orange)
                            .frame(width: 6, height: 6)

                        Text(dt.id)
                            .font(.system(size: 11, weight: .semibold, design: .monospaced))
                            .foregroundColor(.primary)

                        Text(dt.notifyApps.joined(separator: ", "))
                            .font(.system(size: 11))
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                            .truncationMode(.tail)

                        Spacer()
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 1)
                    .contentShape(Rectangle())
                    .onTapGesture {
                        if let rowIdx = state.grid.firstIndex(where: { $0.contains(where: { $0.id == dt.id }) }),
                           let colIdx = state.grid[rowIdx].firstIndex(where: { $0.id == dt.id }) {
                            state.focus = .grid
                            state.gridCursor = GridPos(row: rowIdx, col: colIdx)
                            state.confirm()
                        }
                    }
                }
                .padding(.bottom, 4)
            }

            // Divider
            Rectangle()
                .fill(Color.primary.opacity(0.1))
                .frame(height: 1)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)

            // Detail panel for grid selection
            if state.focus == .grid, let dt = state.selectedDesktop {
                HStack(spacing: 8) {
                    Text(dt.id)
                        .font(.system(size: 12, weight: .semibold, design: .monospaced))
                        .foregroundColor(.primary)

                    if dt.hasWindows {
                        Text(formatApps(dt))
                            .font(.system(size: 12, weight: .regular))
                            .foregroundColor(.secondary)
                            .lineLimit(1)
                            .truncationMode(.tail)
                    } else {
                        Text("empty")
                            .font(.system(size: 12, weight: .regular))
                            .foregroundColor(.secondary.opacity(0.5))
                    }

                    Spacer()

                    if dt.isCurrent {
                        Text("current")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundColor(.accentColor)
                    }
                }
                .padding(.horizontal, 12)
                .padding(.bottom, state.presets.isEmpty ? 0 : 4)
            }

            // Presets section
            if !state.presets.isEmpty {
                Rectangle()
                    .fill(Color.primary.opacity(0.1))
                    .frame(height: 1)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 4)

                Text("PRESETS")
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundColor(.secondary.opacity(0.6))
                    .padding(.horizontal, 12)
                    .padding(.bottom, 4)

                ForEach(Array(state.presets.enumerated()), id: \.element.name) { idx, preset in
                    PresetRowView(
                        preset: preset,
                        isSelected: state.focus == .presets && state.presetCursor == idx
                    )
                    .onTapGesture {
                        state.focus = .presets
                        state.presetCursor = idx
                        state.confirm()
                    }
                }
                .padding(.bottom, 4)
            }

            // Hint bar
            Rectangle()
                .fill(Color.primary.opacity(0.1))
                .frame(height: 1)
                .padding(.horizontal, 12)
                .padding(.vertical, 4)

            HStack(spacing: 6) {
                hintLabel("hjkl", "nav")
                hintLabel("\u{23ce}", "sel")
                hintLabel("m", state.isSwapMode ? "swap\u{00d7}" : "swap")
                hintLabel("i", "notif")
                hintLabel("s", "save")
                if state.focus == .presets {
                    hintLabel("x", "del")
                }
                hintLabel("?", "help")
            }
            .fixedSize()
            .padding(.horizontal, 12)
            .padding(.bottom, 10)
        }
        .frame(width: 292)
        .background(VisualEffectBlur())
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(Color.white.opacity(0.2), lineWidth: 0.5)
        )
        .shadow(color: .black.opacity(0.3), radius: 20, y: 10)
    }

    func formatApps(_ dt: Desktop) -> String {
        dt.apps.map { app in
            dt.notifyApps.contains(app) ? "\(app)!" : app
        }.joined(separator: ", ")
    }

    func hintLabel(_ key: String, _ label: String) -> some View {
        HStack(spacing: 2) {
            Text(key)
                .font(.system(size: 9, weight: .medium, design: .monospaced))
                .foregroundColor(.secondary.opacity(0.6))
            Text(label)
                .font(.system(size: 9))
                .foregroundColor(.secondary.opacity(0.4))
        }
    }
}

struct VisualEffectBlur: NSViewRepresentable {
    func makeNSView(context: Context) -> NSVisualEffectView {
        let view = NSVisualEffectView()
        view.material = .hudWindow
        view.blendingMode = .behindWindow
        view.state = .active
        return view
    }
    func updateNSView(_ nsView: NSVisualEffectView, context: Context) {}
}

// MARK: - App

class AppDelegate: NSObject, NSApplicationDelegate {
    var window: NSWindow!
    let state = PickerState()

    func applicationDidFinishLaunching(_ notification: Notification) {
        if state.grid.isEmpty && state.presets.isEmpty {
            NSApp.terminate(nil)
            return
        }

        let content = PickerView(state: state)
        let hostingView = NSHostingView(rootView: content)
        hostingView.frame.size = hostingView.fittingSize

        window = NSWindow(
            contentRect: NSRect(origin: .zero, size: hostingView.fittingSize),
            styleMask: [.borderless],
            backing: .buffered,
            defer: false
        )
        window.isOpaque = false
        window.backgroundColor = .clear
        window.level = .floating
        window.contentView = hostingView
        window.center()
        window.makeKeyAndOrderFront(nil)
        window.isMovableByWindowBackground = false

        NSEvent.addLocalMonitorForEvents(matching: .keyDown) { event in
            let chars = event.charactersIgnoringModifiers ?? ""

            if self.state.showingHelp {
                switch chars {
                case "?", "\u{1b}": self.state.showingHelp = false
                default: break
                }
            } else if self.state.showingNotifications {
                switch chars {
                case "j": self.state.notifDown()
                case "k": self.state.notifUp()
                case "\r": self.state.confirmNotif()
                case "\u{1b}", "i": self.state.showingNotifications = false
                default: break
                }
            } else {
                switch chars {
                case "h": self.state.moveLeft()
                case "j": self.state.moveDown()
                case "k": self.state.moveUp()
                case "l": self.state.moveRight()
                case "\r": self.state.confirm()
                case "\u{1b}": self.state.cancel()
                case "s": self.state.save()
                case "m": self.state.toggleSwapMode()
                case "x": self.state.deletePreset()
                case "?": self.state.toggleHelp()
                case "i": self.state.toggleNotifications()
                default: break
                }
            }
            self.resizeWindow()
            return nil
        }

        NSEvent.addGlobalMonitorForEvents(matching: .leftMouseDown) { _ in
            self.state.cancel()
        }
    }

    func resizeWindow() {
        guard let hostingView = window.contentView as? NSHostingView<PickerView> else { return }
        let newSize = hostingView.fittingSize
        var frame = window.frame
        let dy = frame.height - newSize.height
        frame.size = newSize
        frame.origin.y += dy
        window.setFrame(frame, display: true, animate: false)
    }
}

let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let delegate = AppDelegate()
app.delegate = delegate
app.activate(ignoringOtherApps: true)
app.run()
