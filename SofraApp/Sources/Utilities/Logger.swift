// Logger.swift
// Lightweight structured logger for debug/staging builds

import Foundation
import os.log

enum Logger {
    enum Level: String {
        case debug = "🔍"
        case info = "ℹ️"
        case warning = "⚠️"
        case error = "❌"
    }

    private static let osLog = os.Logger(subsystem: "com.sofra.app", category: "general")

    static func log(_ message: String, level: Level = .debug, file: String = #file, line: Int = #line) {
        #if DEBUG
        let filename = (file as NSString).lastPathComponent
        let formatted = "\(level.rawValue) [\(filename):\(line)] \(message)"
        switch level {
        case .debug:  osLog.debug("\(formatted)")
        case .info:   osLog.info("\(formatted)")
        case .warning: osLog.warning("\(formatted)")
        case .error:  osLog.error("\(formatted)")
        }
        #endif
    }
}
