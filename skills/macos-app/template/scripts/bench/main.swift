// 启动可执行文件，计时到它在屏幕上拥有第一个窗口（即菜单栏图标）为止。
// 输出：毫秒数 进程号。进程保持运行，由调用方结束。
import CoreGraphics
import Foundation

let process = Process()
process.executableURL = URL(fileURLWithPath: CommandLine.arguments[1])
let start = DispatchTime.now().uptimeNanoseconds
try process.run()
let pid = process.processIdentifier

func hasWindow() -> Bool {
    let list = CGWindowListCopyWindowInfo([.optionOnScreenOnly], kCGNullWindowID) as? [[String: Any]] ?? []
    return list.contains { ($0[kCGWindowOwnerPID as String] as? Int32) == pid }
}

while !hasWindow() {
    if DispatchTime.now().uptimeNanoseconds - start > 5_000_000_000 { print("timeout \(pid)"); exit(1) }
    usleep(500)
}
print(String(format: "%.0f %d", Double(DispatchTime.now().uptimeNanoseconds - start) / 1e6, pid))
