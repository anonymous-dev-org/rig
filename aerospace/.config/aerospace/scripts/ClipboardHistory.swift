import SwiftUI
import AppKit

// MARK: - Data

struct ClipboardEntry: Codable, Identifiable {
    let id: String
    let content: String
    let preview: String
    let timestamp: Double
    let appName: String
}

let historyPath = NSHomeDirectory() + "/.clipboard-history.json"

func loadHistory() -> [ClipboardEntry] {
    guard let data = try? Data(contentsOf: URL(fileURLWithPath: historyPath)),
          let entries = try? JSONDecoder().decode([ClipboardEntry].self, from: data) else {
        return []
    }
    return entries
}

// MARK: - Time Formatting

func relativeTime(_ timestamp: Double) -> String {
    let diff = Date().timeIntervalSince1970 - timestamp
    if diff < 60 { return "now" }
    if diff < 3600 { return "\(Int(diff / 60))m" }
    if diff < 86400 { return "\(Int(diff / 3600))h" }
    return "\(Int(diff / 86400))d"
}

// MARK: - State

class ClipboardHistoryState: ObservableObject {
    @Published var cursor: Int = 0
    @Published var searchText: String = ""
    @Published var isSearching: Bool = false

    let allEntries: [ClipboardEntry]

    var filteredEntries: [ClipboardEntry] {
        if searchText.isEmpty { return allEntries }
        let query = searchText.lowercased()
        return allEntries.filter {
            $0.content.lowercased().contains(query) ||
            $0.appName.lowercased().contains(query)
        }
    }

    var isEmpty: Bool { filteredEntries.isEmpty }

    var selectedEntry: ClipboardEntry? {
        filteredEntries.indices.contains(cursor) ? filteredEntries[cursor] : nil
    }

    let maxVisible = 15

    var visibleRange: Range<Int> {
        let count = filteredEntries.count
        if count <= maxVisible { return 0..<count }
        let half = maxVisible / 2
        var start = max(0, cursor - half)
        let end = min(count, start + maxVisible)
        start = max(0, end - maxVisible)
        return start..<end
    }

    init() {
        self.allEntries = loadHistory()
    }

    func moveUp() {
        if cursor > 0 { cursor -= 1 }
    }

    func moveDown() {
        if cursor < filteredEntries.count - 1 { cursor += 1 }
    }

    func updateSearch(_ text: String) {
        searchText = text
        cursor = 0
    }

    func confirm() {
        guard let entry = selectedEntry else { NSApp.terminate(nil); return }
        let pb = NSPasteboard.general
        pb.clearContents()
        pb.setString(entry.content, forType: .string)
        NSApp.terminate(nil)
    }

    func cancel() { NSApp.terminate(nil) }
}

// MARK: - Views

struct ClipboardRowView: View {
    let entry: ClipboardEntry
    let isSelected: Bool

    var body: some View {
        HStack(spacing: 8) {
            Text(entry.preview)
                .font(.system(size: 11, weight: .regular))
                .foregroundColor(.primary)
                .lineLimit(1)
                .truncationMode(.tail)

            Spacer()

            if !entry.appName.isEmpty {
                Text(entry.appName)
                    .font(.system(size: 9, weight: .medium))
                    .foregroundColor(.secondary.opacity(0.6))
                    .lineLimit(1)
            }

            Text(relativeTime(entry.timestamp))
                .font(.system(size: 9, weight: .medium, design: .monospaced))
                .foregroundColor(.secondary)
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

struct ClipboardHistoryView: View {
    @ObservedObject var state: ClipboardHistoryState

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            if state.allEntries.isEmpty {
                emptyState
            } else {
                listContent
            }
        }
        .frame(width: 400)
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
            Text("No clipboard history")
                .font(.system(size: 12))
                .foregroundColor(.secondary)
            Spacer()
        }
        .padding(.vertical, 16)
        .padding(.horizontal, 14)
    }

    var listContent: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            Text("CLIPBOARD")
                .font(.system(size: 9, weight: .semibold))
                .foregroundColor(.accentColor.opacity(0.8))
                .padding(.horizontal, 14)
                .padding(.top, 12)
                .padding(.bottom, 6)

            // Search bar
            if state.isSearching {
                HStack(spacing: 2) {
                    Text("/")
                        .font(.system(size: 11, weight: .medium, design: .monospaced))
                        .foregroundColor(.secondary)
                    Text(state.searchText)
                        .font(.system(size: 11))
                        .foregroundColor(.primary)
                    Rectangle()
                        .fill(Color.accentColor)
                        .frame(width: 1, height: 14)
                }
                .padding(.horizontal, 14)
                .padding(.bottom, 6)
            }

            // Entry list
            if state.filteredEntries.isEmpty {
                HStack {
                    Spacer()
                    Text("No matches")
                        .font(.system(size: 11))
                        .foregroundColor(.secondary)
                    Spacer()
                }
                .padding(.vertical, 8)
            } else {
                let range = state.visibleRange
                ForEach(Array(range), id: \.self) { idx in
                    let entry = state.filteredEntries[idx]
                    ClipboardRowView(
                        entry: entry,
                        isSelected: state.cursor == idx
                    )
                    .onTapGesture {
                        state.cursor = idx
                        state.confirm()
                    }
                }

                if state.filteredEntries.count > state.maxVisible {
                    Text("\(state.filteredEntries.count) items")
                        .font(.system(size: 9))
                        .foregroundColor(.secondary.opacity(0.5))
                        .padding(.horizontal, 14)
                        .padding(.top, 4)
                }
            }

            // Separator + hints
            Rectangle()
                .fill(Color.primary.opacity(0.1))
                .frame(height: 1)
                .padding(.horizontal, 14)
                .padding(.vertical, 6)

            HStack(spacing: 12) {
                hintLabel("j/k", "navigate")
                hintLabel("\u{23ce}", "copy")
                hintLabel("/", "search")
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
    let state = ClipboardHistoryState()

    func applicationDidFinishLaunching(_ notification: Notification) {
        let content = ClipboardHistoryView(state: state)
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

            if self.state.isSearching {
                if chars == "\u{1b}" {
                    // Esc exits search
                    self.state.isSearching = false
                    self.state.updateSearch("")
                } else if chars == "\r" {
                    self.state.confirm()
                } else if chars == "\u{7f}" {
                    // Backspace
                    if self.state.searchText.isEmpty {
                        self.state.isSearching = false
                    } else {
                        self.state.updateSearch(String(self.state.searchText.dropLast()))
                    }
                } else if event.keyCode == 125 {
                    // Down arrow
                    self.state.moveDown()
                } else if event.keyCode == 126 {
                    // Up arrow
                    self.state.moveUp()
                } else if let c = event.characters, c.count == 1,
                          let scalar = c.unicodeScalars.first,
                          scalar.isASCII, scalar.value >= 32 {
                    self.state.updateSearch(self.state.searchText + c)
                }
            } else {
                switch chars {
                case "j": self.state.moveDown()
                case "k": self.state.moveUp()
                case "\r": self.state.confirm()
                case "\u{1b}": self.state.cancel()
                case "/": self.state.isSearching = true
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
        guard let hostingView = window.contentView as? NSHostingView<ClipboardHistoryView> else { return }
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
