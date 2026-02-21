// SofraTypography.swift
// Consistent type scale using Dynamic Type with Arabic-friendly fonts

import SwiftUI

enum SofraTypography {
    // MARK: - Headings
    static let largeTitle = Font.system(.largeTitle, design: .rounded).weight(.bold)
    static let title      = Font.system(.title, design: .rounded).weight(.bold)
    static let title2     = Font.system(.title2, design: .rounded).weight(.semibold)
    static let title3     = Font.system(.title3, design: .rounded).weight(.semibold)

    // MARK: - Body
    static let headline   = Font.system(.headline, design: .rounded)
    static let body       = Font.system(.body, design: .rounded)
    static let callout    = Font.system(.callout, design: .rounded)
    static let subheadline = Font.system(.subheadline, design: .rounded)

    // MARK: - Small
    static let footnote   = Font.system(.footnote, design: .rounded)
    static let caption    = Font.system(.caption, design: .rounded)
    static let caption2   = Font.system(.caption2, design: .rounded)

    // MARK: - Price / Numbers
    static let price      = Font.system(.title2, design: .monospaced).weight(.bold)
    static let priceSmall = Font.system(.headline, design: .monospaced).weight(.semibold)
}
