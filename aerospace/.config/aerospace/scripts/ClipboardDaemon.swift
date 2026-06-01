import Foundation
import AppKit

// MARK: - Data

struct ClipboardEntry: Codable {
    let id: String
    let content: String
    let preview: String
    let timestamp: Double
    let appName: String
}

let historyPath = NSHomeDirectory() + "/.clipboard-history.json"
let maxEntries = 500
let maxContentLength = 10_000

let sensitiveApps: Set<String> = [
    "1Password", "Keychain Access", "LastPass", "Bitwarden", "KeePassXC"
]

// MARK: - Storage

func loadHistory() -> [ClipboardEntry] {
    guard let data = try? Data(contentsOf: URL(fileURLWithPath: historyPath)),
          let entries = try? JSONDecoder().decode([ClipboardEntry].self, from: data) else {
        return []
    }
    return entries
}

func saveHistory(_ entries: [ClipboardEntry]) {
    guard let data = try? JSONEncoder().encode(entries) else { return }
    try? data.write(to: URL(fileURLWithPath: historyPath), options: .atomic)
}

func makePreview(_ content: String) -> String {
    String(content.components(separatedBy: .newlines)
        .joined(separator: " ")
        .trimmingCharacters(in: .whitespaces)
        .prefix(100))
}

// MARK: - Daemon

class ClipboardDaemon {
    var lastChangeCount: Int
    var history: [ClipboardEntry]

    init() {
        self.lastChangeCount = NSPasteboard.general.changeCount
        self.history = loadHistory()
    }

    func start() {
        Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
            self.poll()
        }
    }

    func poll() {
        let pb = NSPasteboard.general
        let currentCount = pb.changeCount
        guard currentCount != lastChangeCount else { return }
        lastChangeCount = currentCount

        guard var content = pb.string(forType: .string),
              !content.isEmpty else { return }

        // Cap content length
        if content.count > maxContentLength {
            content = String(content.prefix(maxContentLength))
        }

        // Skip if identical to most recent entry
        if let last = history.first, last.content == content { return }

        // Skip sensitive apps
        let appName = NSWorkspace.shared.frontmostApplication?.localizedName ?? ""
        if sensitiveApps.contains(appName) { return }

        let entry = ClipboardEntry(
            id: UUID().uuidString,
            content: content,
            preview: makePreview(content),
            timestamp: Date().timeIntervalSince1970,
            appName: appName
        )

        history.insert(entry, at: 0)
        if history.count > maxEntries {
            history = Array(history.prefix(maxEntries))
        }
        saveHistory(history)
    }
}

// MARK: - App

let app = NSApplication.shared
app.setActivationPolicy(.accessory)

let daemon = ClipboardDaemon()
daemon.start()

app.run()
