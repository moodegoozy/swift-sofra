// SofraButton.swift
// Reusable premium button component

import SwiftUI

struct SofraButton: View {
    let title: String
    var icon: String?
    var style: Style = .primary
    var isLoading: Bool = false
    var isDisabled: Bool = false
    let action: () -> Void

    enum Style {
        case primary, secondary, destructive, ghost
        /// Alias for destructive
        static let danger: Style = .destructive
    }

    var body: some View {
        Button(action: {
            let impactFeedback = UIImpactFeedbackGenerator(style: .medium)
            impactFeedback.impactOccurred()
            action()
        }) {
            HStack(spacing: SofraSpacing.sm) {
                if isLoading {
                    ProgressView()
                        .tint(foregroundColor)
                } else {
                    if let icon {
                        Image(systemName: icon)
                            .font(.body.weight(.semibold))
                    }
                    Text(title)
                        .font(SofraTypography.headline)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: SofraSpacing.buttonHeight)
            .foregroundStyle(foregroundColor)
            .background(backgroundColor)
            .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.buttonRadius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: SofraSpacing.buttonRadius, style: .continuous)
                    .strokeBorder(borderColor, lineWidth: style == .ghost ? 1.5 : 0)
            )
        }
        .disabled(isLoading || isDisabled)
        .opacity(isDisabled ? 0.5 : 1)
    }

    // MARK: - Style Helpers
    private var foregroundColor: Color {
        switch style {
        case .primary:     return .white
        case .secondary:   return SofraColors.primary
        case .destructive: return .white
        case .ghost:       return SofraColors.primary
        }
    }

    private var backgroundColor: Color {
        switch style {
        case .primary:     return SofraColors.primary
        case .secondary:   return SofraColors.sky100
        case .destructive: return SofraColors.error
        case .ghost:       return .clear
        }
    }

    private var borderColor: Color {
        switch style {
        case .ghost: return SofraColors.sky200
        default:     return .clear
        }
    }
}

#Preview {
    VStack(spacing: 16) {
        SofraButton(title: "تسجيل الدخول", icon: "arrow.right.circle.fill", action: {})
        SofraButton(title: "إنشاء حساب", style: .secondary, action: {})
        SofraButton(title: "حذف الحساب", style: .destructive, action: {})
        SofraButton(title: "متابعة كزائر", style: .ghost, action: {})
        SofraButton(title: "جاري التحميل...", isLoading: true, action: {})
    }
    .padding()
}
