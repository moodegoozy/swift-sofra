// SofraColors.swift
// 🌙 تصميم فخم بطابع رمضاني — ألوان ذهبية ونيلية غنية
// Luxurious Ramadan-themed color palette: deep navy, rich gold, emerald accents

import SwiftUI
import UIKit

enum SofraColors {

    // MARK: - Adaptive Color Helper
    /// Creates a Color that automatically adapts between dark and light mode
    private static func adaptive(dark: String, light: String) -> Color {
        Color(UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(Color(hex: dark))
                : UIColor(Color(hex: light))
        })
    }

    // MARK: - 🌙 Ramadan Deep Navy Palette (fixed)
    static let navy50  = Color(hex: "EEF0F8")
    static let navy100 = Color(hex: "D4D8EC")
    static let navy200 = Color(hex: "A9B1D9")
    static let navy300 = Color(hex: "7E8AC6")
    static let navy400 = Color(hex: "5363B3")
    static let navy500 = Color(hex: "2D3A8C")
    static let navy600 = Color(hex: "232E70")
    static let navy700 = Color(hex: "1A2354")
    static let navy800 = Color(hex: "111738")
    static let navy900 = Color(hex: "0A0E22")

    // MARK: - ✨ Ramadan Gold Palette (fixed)
    static let gold50  = Color(hex: "FFF9E6")
    static let gold100 = Color(hex: "FFF0BF")
    static let gold200 = Color(hex: "FFE699")
    static let gold300 = Color(hex: "FFD966")
    static let gold400 = Color(hex: "FFCC33")
    static let gold500 = Color(hex: "D4A017")
    static let gold600 = Color(hex: "B8860B")
    static let gold700 = Color(hex: "8B6914")
    static let gold800 = Color(hex: "705618")
    static let gold900 = Color(hex: "4A3A10")

    // MARK: - 🌿 Emerald Accents
    static let emerald400 = Color(hex: "34D399")
    static let emerald500 = Color(hex: "10B981")
    static let emerald600 = Color(hex: "059669")

    // MARK: - Sky (legacy compatibility)
    static let sky50  = navy50
    static let sky100 = navy100
    static let sky200 = navy200
    static let sky300 = navy300
    static let sky400 = navy400
    static let sky500 = navy500
    static let sky600 = navy600
    static let sky700 = navy700
    static let sky800 = navy800
    static let sky900 = navy900

    // MARK: - 🎨 Semantic Colors — Adaptive (dark = Ramadan luxe, light = warm parchment)
    static let primary      = gold500
    static let primaryLight = gold400
    static let primaryDark  = gold700
    static let accent       = gold400

    static let background      = adaptive(dark: "0A0E22", light: "F5EDE0")
    static let cardBackground  = adaptive(dark: "141A3D", light: "FFFBF5")
    static let secondaryBg     = adaptive(dark: "111738", light: "EDE5D8")
    static let surfaceElevated = adaptive(dark: "1C2347", light: "F0E8DA")

    static let textPrimary   = adaptive(dark: "F5F0E1", light: "1A2354")
    static let textSecondary = adaptive(dark: "9CA3C4", light: "5363B3")
    static let textMuted     = adaptive(dark: "6B7196", light: "8690B5")
    static let textGold: Color = adaptive(dark: "FFCC33", light: "B8860B")

    // MARK: - ⭐ Status Colors
    static let success = Color(hex: "10B981")
    static let warning = Color(hex: "F59E0B")
    static let error   = Color(hex: "EF4444")
    static let info    = Color(hex: "6366F1")

    // MARK: - 🌙 Ramadan Special
    static let moonGlow      = Color(hex: "FFFDE7").opacity(0.15)
    static let lanternOrange = Color(hex: "FF8C00")
    static let lanternGlow   = Color(hex: "FFB347").opacity(0.3)
    static let starGold      = Color(hex: "FFD700")

    // MARK: - 🔮 Gradients (adaptive)
    static let goldGradient = LinearGradient(
        colors: [gold400, gold600],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static var navyGradient: LinearGradient {
        LinearGradient(
            colors: [adaptive(dark: "1A2354", light: "EDE5D8"), adaptive(dark: "0A0E22", light: "F5EDE0")],
            startPoint: .top,
            endPoint: .bottom
        )
    }

    static var premiumGradient: LinearGradient {
        LinearGradient(
            colors: [adaptive(dark: "1A1F4B", light: "F0E8DA"), adaptive(dark: "0D1126", light: "F5EDE0")],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    static var cardGradient: LinearGradient {
        LinearGradient(
            colors: [adaptive(dark: "1C2347", light: "FFFBF5").opacity(0.85), adaptive(dark: "141A3D", light: "FFF8EE")],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    // MARK: - Order Status
    static func orderStatusColor(_ status: String) -> Color {
        switch status {
        case "pending":          return warning
        case "accepted":         return info
        case "preparing":        return gold500
        case "ready":            return Color(hex: "8B5CF6")
        case "out_for_delivery": return Color(hex: "3B82F6")
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
