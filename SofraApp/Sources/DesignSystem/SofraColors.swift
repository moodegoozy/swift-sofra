// SofraColors.swift
// Design system colors — mirrors the web app's sky-centric Tailwind palette

import SwiftUI

enum SofraColors {
    // MARK: - Brand Sky Palette (from tailwind.config.js)
    static let sky50  = Color(hex: "F0F9FF")
    static let sky100 = Color(hex: "E0F2FE")
    static let sky200 = Color(hex: "BAE6FD")
    static let sky300 = Color(hex: "7DD3FC")
    static let sky400 = Color(hex: "38BDF8")
    static let sky500 = Color(hex: "0EA5E9")
    static let sky600 = Color(hex: "0284C7")
    static let sky700 = Color(hex: "0369A1")
    static let sky800 = Color(hex: "075985")
    static let sky900 = Color(hex: "0C4A6E")

    // MARK: - Semantic Colors
    static let primary      = sky500
    static let primaryLight = sky400
    static let primaryDark  = sky900
    static let accent       = sky400

    static let background      = sky50
    static let cardBackground  = Color.white
    static let secondaryBg     = sky100

    static let textPrimary   = sky900
    static let textSecondary = Color(hex: "64748B") // slate-500
    static let textMuted     = Color(hex: "94A3B8") // slate-400

    // MARK: - Status Colors
    static let success = Color(hex: "10B981") // emerald-500
    static let warning = Color(hex: "F59E0B") // amber-500
    static let error   = Color(hex: "EF4444") // red-500
    static let info    = sky500

    // MARK: - Order Status
    static func orderStatusColor(_ status: String) -> Color {
        switch status {
        case "pending":          return warning
        case "accepted":         return info
        case "preparing":        return sky600
        case "ready":            return Color(hex: "8B5CF6") // violet
        case "out_for_delivery": return Color(hex: "3B82F6") // blue
        case "delivered":        return success
        case "cancelled":        return error
        default:                 return textMuted
        }
    }
}

// MARK: - Hex Color Extension
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: .alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 6: (a, r, g, b) = (255, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        case 8: (a, r, g, b) = (int >> 24 & 0xFF, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default: (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(.sRGB, red: Double(r) / 255, green: Double(g) / 255, blue: Double(b) / 255, opacity: Double(a) / 255)
    }
}
