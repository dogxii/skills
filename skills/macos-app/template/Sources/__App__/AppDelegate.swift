import AppKit

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    private var item: NSStatusItem!

    func applicationDidFinishLaunching(_ notification: Notification) {
        item = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        item.button?.title = "__app__"
        let menu = NSMenu()
        menu.addItem(withTitle: String(localized: "退出"), action: #selector(NSApplication.terminate), keyEquivalent: "q")
        item.menu = menu
    }
}
