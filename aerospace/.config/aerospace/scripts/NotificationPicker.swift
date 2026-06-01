import SwiftUI
import AppKit
import SQLite3

// MARK: - Data

struct NotificationEntry: Identifiable {
    let id: String
    let appName: String
    let bundleId: String
    let windowId: String
    let desktopId: String
    let badgeCount: Int?
    let latestDate: Double  // CoreData timestamp (seconds since 2001-01-01)
}

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

// MARK: - Notification Detection

let notifDbPath = NSHomeDirectory() + "/Library/Group Containers/group.com.apple.usernoted/db2/db"

/// App notification info from the macOS Notification Center DB.
struct AppNotifInfo {
    let badge: Int       // 0 = no badge but has records
    let latestDate: Double // most recent delivered_date
}

/// Query the notification DB for apps with active notifications, including recency info.
func getNotifyingAppsFromDB() -> [String: AppNotifInfo] {
    var db: OpaquePointer?
    guard sqlite3_open_v2(notifDbPath, &db, SQLITE_OPEN_READONLY, nil) == SQLITE_OK else {
        return [:]
    }
    defer { sqlite3_close(db) }

    var result: [String: AppNotifInfo] = [:]
    let query = """
        SELECT a.identifier,
            COALESCE(a.badge, 0) as badge,
            COALESCE(MAX(r.delivered_date), 0) as latest_date
        FROM app a
        LEFT JOIN record r ON a.app_id = r.app_id
        WHERE a.identifier NOT LIKE '_system_center_%'
          AND (a.badge > 0 OR r.rec_id IS NOT NULL)
        GROUP BY a.app_id
    """

    var stmt: OpaquePointer?
    guard sqlite3_prepare_v2(db, query, -1, &stmt, nil) == SQLITE_OK else { return [:] }
    defer { sqlite3_finalize(stmt) }

    while sqlite3_step(stmt) == SQLITE_ROW {
        if let cStr = sqlite3_column_text(stmt, 0) {
            let bundleId = String(cString: cStr)
            let badge = Int(sqlite3_column_int(stmt, 1))
            let latestDate = sqlite3_column_double(stmt, 2)
            result[bundleId] = AppNotifInfo(badge: badge, latestDate: latestDate)
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

// MARK: - Data Assembly

struct WindowInfo {
    let ws: String
    let wid: String
    let appName: String
    let bundleId: String
}

/// Get all notification entries across all desktops, sorted by most recent first.
func getAllNotifications() -> [NotificationEntry] {
    let nonEmptyWorkspaces = run("aerospace", "list-workspaces", "--monitor", "all", "--empty", "no")
        .split(separator: "\n").map(String.init)

    // Collect all windows with bundle IDs
    var allWindows: [WindowInfo] = []

    for ws in nonEmptyWorkspaces {
        let windowList = run("aerospace", "list-windows", "--workspace", ws,
                             "--format", "%{window-id}|%{app-name}|%{app-bundle-id}")
            .split(separator: "\n")

        for line in windowList {
            let parts = line.split(separator: "|", maxSplits: 2)
            guard parts.count == 3 else { continue }
            let wid = String(parts[0]).trimmingCharacters(in: .whitespaces)
            let appName = String(parts[1]).trimmingCharacters(in: .whitespaces)
            let bundleId = String(parts[2]).trimmingCharacters(in: .whitespaces)
            allWindows.append(WindowInfo(ws: ws, wid: wid, appName: appName, bundleId: bundleId))
        }
    }

    // Get notification info from DB
    let dbApps = getNotifyingAppsFromDB()

    // Fallback to lsappinfo if DB is empty
    var notifyInfo: [String: AppNotifInfo]
    if !dbApps.isEmpty {
        notifyInfo = dbApps
    } else {
        let appNames = Set(allWindows.map { $0.appName })
        let badged = getBadgeAppsFromLsappinfo(appNames)
        notifyInfo = [:]
        for w in allWindows where badged.contains(w.appName) {
            notifyInfo[w.bundleId] = AppNotifInfo(badge: 0, latestDate: 0)
        }
    }

    if notifyInfo.isEmpty { return [] }

    // Build entries: one per app per desktop, sorted by most recent
    var entries: [NotificationEntry] = []
    var seen = Set<String>()

    for w in allWindows {
        let key = "\(w.bundleId)-\(w.ws)"
        if let info = notifyInfo[w.bundleId], !seen.contains(key) {
            seen.insert(key)
            entries.append(NotificationEntry(
                id: key,
                appName: w.appName,
                bundleId: w.bundleId,
                windowId: w.wid,
                desktopId: w.ws,
                badgeCount: info.badge > 0 ? info.badge : nil,
                latestDate: info.latestDate
            ))
        }
    }

    // Sort by most recent notification first
    entries.sort { $0.latestDate > $1.latestDate }
    return entries
}

// MARK: - State

class NotificationPickerState: ObservableObject {
    @Published var cursor: Int = 0

    let entries: [NotificationEntry]
    let currentWs: String

    var isEmpty: Bool { entries.isEmpty }

    init() {
        self.currentWs = run("aerospace", "list-workspaces", "--focused")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        self.entries = getAllNotifications()
    }

    var selectedEntry: NotificationEntry? {
        entries.indices.contains(cursor) ? entries[cursor] : nil
    }

    func moveUp() {
        if cursor > 0 { cursor -= 1 }
    }

    func moveDown() {
        if cursor < entries.count - 1 { cursor += 1 }
    }

    func confirm() {
        guard let entry = selectedEntry else { NSApp.terminate(nil); return }
        DispatchQueue.global().async {
            _ = run("aerospace", "workspace", entry.desktopId)
            _ = run("aerospace", "focus", "--window-id", entry.windowId)
            DispatchQueue.main.async { NSApp.terminate(nil) }
        }
    }

    func cancel() { NSApp.terminate(nil) }
}

// MARK: - Views

struct NotificationRowView: View {
    let entry: NotificationEntry
    let isSelected: Bool
    let isCurrent: Bool

    var body: some View {
        HStack(spacing: 8) {
            Circle()
                .fill(Color.orange)
                .frame(width: 6, height: 6)

            Text(entry.appName)
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(.primary)

            Spacer()

            Text(entry.desktopId)
                .font(.system(size: 10, weight: .medium, design: .monospaced))
                .foregroundColor(isCurrent ? .accentColor : .secondary)

            if let count = entry.badgeCount {
                Text("\(count)")
                    .font(.system(size: 10, weight: .bold, design: .monospaced))
                    .foregroundColor(.orange)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 5)
        .background(
            RoundedRectangle(cornerRadius: 4)
                .fill(isSelected ? Color.accentColor.opacity(0.2) : Color.clear)
                .padding(.horizontal, 8)
        )
    }
}

struct NotificationPickerView: View {
    @ObservedObject var state: NotificationPickerState

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            if state.isEmpty {
                emptyState
            } else {
                listContent
            }
        }
        .frame(width: 300)
        .background(VisualEffectBlur())
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(Color.white.opacity(0.2), lineWidth: 0.5)
        )
        .shadow(color: .black.opacity(0.3), radius: 20, y: 10)
    }

    var emptyState: some View {
        HStack {
            Spacer()
            Text("No notifications")
                .font(.system(size: 12))
                .foregroundColor(.secondary)
            Spacer()
        }
        .padding(.vertical, 16)
        .padding(.horizontal, 14)
    }

    var listContent: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("NOTIFICATIONS")
                .font(.system(size: 9, weight: .semibold))
                .foregroundColor(.orange.opacity(0.8))
                .padding(.horizontal, 14)
                .padding(.top, 12)
                .padding(.bottom, 6)

            ForEach(Array(state.entries.enumerated()), id: \.element.id) { idx, entry in
                NotificationRowView(
                    entry: entry,
                    isSelected: state.cursor == idx,
                    isCurrent: entry.desktopId == state.currentWs
                )
                .onTapGesture {
                    state.cursor = idx
                    state.confirm()
                }
            }

            Rectangle()
                .fill(Color.primary.opacity(0.1))
                .frame(height: 1)
                .padding(.horizontal, 14)
                .padding(.vertical, 6)

            HStack(spacing: 12) {
                hintLabel("j/k", "navigate")
                hintLabel("\u{23ce}", "go to app")
                hintLabel("esc", "close")
            }
            .padding(.horizontal, 14)
            .padding(.bottom, 10)
        }
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
    let state = NotificationPickerState()

    func applicationDidFinishLaunching(_ notification: Notification) {
        let content = NotificationPickerView(state: state)
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
            switch event.charactersIgnoringModifiers {
            case "j": self.state.moveDown()
            case "k": self.state.moveUp()
            case "\r": self.state.confirm()
            case "\u{1b}": self.state.cancel()
            default: break
            }
            self.resizeWindow()
            return nil
        }

        NSEvent.addGlobalMonitorForEvents(matching: .leftMouseDown) { _ in
            self.state.cancel()
        }
    }

    func resizeWindow() {
        guard let hostingView = window.contentView as? NSHostingView<NotificationPickerView> else { return }
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
