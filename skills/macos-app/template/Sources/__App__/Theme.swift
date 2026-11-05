import AppKit

/// 界面默认值：直接使用，用不到的删掉。改数值要有产品上的理由
@MainActor
enum Theme {
    // 透明度随深浅色自动适配。不用 separatorColor：半透明面板背后是深色内容时它会发白
    static var divider: NSColor { .labelColor.withAlphaComponent(0.1) }
    static var hover: NSColor { .labelColor.withAlphaComponent(0.07) }
    static var pressed: NSColor { .labelColor.withAlphaComponent(0.12) }

    static let panelWidth: CGFloat = 268
    static let inset: CGFloat = 14
    static let gap: CGFloat = 11
    static let rowHeight: CGFloat = 30
    static let radius: CGFloat = 7

    static let headline = NSFont.systemFont(ofSize: 13.5, weight: .semibold)
    static let body = NSFont.systemFont(ofSize: 12.5)
    static let caption = NSFont.systemFont(ofSize: 11)
    static let digits = NSFont.monospacedDigitSystemFont(ofSize: 12.5, weight: .regular)
}
