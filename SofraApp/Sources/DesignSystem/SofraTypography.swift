// SofraTypography.swift
// 🌙 خطوط فخمة بطابع رمضاني — تناسق مع الطابع الداكن الذهبي
// Premium typography with Arabic-friendly serif touches

import SwiftUI

enum SofraTypography {
    // MARK: - Headings (serif for luxury feel)
    static let largeTitle = Font.system(.largeTitle, design: .serif).weight(.bold)
    static let title      = Font.system(.title, design: .serif).weight(.bold)
    static let title2     = Font.system(.title2, design: .rounded).weight(.semibold)
    static let title3     = Font.system(.title3, design: .rounded).weight(.semibold)

    // MARK: - Body
    static let headline    = Font.system(.headline, design: .rounded).weight(.semibold)
    static let body        = Font.system(.body, design: .rounded)
    static let callout     = Font.system(.callout, design: .rounded)
    static let subheadline = Font.system(.subheadline, design: .rounded)

    // MARK: - Semibold variants
    static let calloutSemibold = Font.system(.callout, design: .rounded).weight(.semibold)

    // MARK: - Small
    static let footnote = Font.system(.footnote, design: .rounded)
    static let caption  = Font.system(.caption, design: .rounded)
    static let caption2 = Font.system(.caption2, design: .rounded)

    // MARK: - Price / Numbers (monospaced for alignment)
    static let price      = Font.system(.title2, design: .monospaced).weight(.bold)
    static let priceSmall = Font.system(.headline, design: .monospaced).weight(.semibold)

    // MARK: - 🌙 Ramadan Decorative
    static let ramadanTitle = Font.system(.title, design: .serif).weight(.heavy)
    static let ramadanSubtitle = Font.system(.title3, design: .serif).weight(.medium)
}
