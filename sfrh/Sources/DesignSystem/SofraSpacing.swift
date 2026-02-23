// SofraSpacing.swift
// 🌙 مسافات وأحجام فخمة — Premium Spacing Tokens

import SwiftUI

enum SofraSpacing {
    // MARK: - Base Spacing
    static let xxs: CGFloat = 2
    static let xs: CGFloat  = 4
    static let sm: CGFloat  = 8
    static let md: CGFloat  = 12
    static let lg: CGFloat  = 16
    static let xl: CGFloat  = 24
    static let xxl: CGFloat = 32
    static let xxxl: CGFloat = 48

    // MARK: - Screen
    static let screenHorizontal: CGFloat = 16
    static let screenVertical: CGFloat = 16

    // MARK: - Card (larger radius for premium feel)
    static let cardPadding: CGFloat = 18
    static let cardRadius: CGFloat = 20
    static let cardSpacing: CGFloat = 12

    // MARK: - Button
    static let buttonHeight: CGFloat = 52
    static let buttonRadius: CGFloat = 16
    static let buttonHPadding: CGFloat = 24

    // MARK: - Input
    static let inputHeight: CGFloat = 52
    static let inputRadius: CGFloat = 14
    static let inputHPadding: CGFloat = 16

    // MARK: - Avatars
    static let avatarSmall: CGFloat = 36
    static let avatarMedium: CGFloat = 48
    static let avatarLarge: CGFloat = 72
}
