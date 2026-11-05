// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "__App__",
    platforms: [.macOS(.v14)],
    targets: [
        .executableTarget(name: "__App__", path: "Sources/__App__"),
        .testTarget(name: "__App__Tests", dependencies: ["__App__"], path: "Tests/__App__Tests"),
    ]
)
