// SofraButton.swift
// 🌙 زر فخم بتأثيرات ذهبية رمضانية — Premium Ramadan Button

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
            .background(backgroundView)
            .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.buttonRadius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: SofraSpacing.buttonRadius, style: .continuous)
                    .strokeBorder(borderGradient, lineWidth: borderWidth)
            )
            .shadow(color: shadowColor, radius: 10, y: 4)
        }
        .disabled(isLoading || isDisabled)
        .opacity(isDisabled ? 0.5 : 1)
    }

    // MARK: - Style Helpers
    private var foregroundColor: Color {
        switch style {
        case .primary:     return SofraColors.navy900
        case .secondary:   return SofraColors.gold400
        case .destructive: return .white
        case .ghost:       return SofraColors.gold400
        }
    }

    @ViewBuilder
    private var backgroundView: some View {
        switch style {
        case .primary:
            SofraColors.goldGradient
        case .secondary:
            SofraColors.surfaceElevated.opacity(0.8)
        case .destructive:
            LinearGradient(
                colors: [SofraColors.error, SofraColors.error.opacity(0.8)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        case .ghost:
            Color.clear
        }
    }

    private var borderGradient: LinearGradient {
        switch style {
        case .ghost:
            return LinearGradient(
                colors: [SofraColors.gold500.opacity(0.4), SofraColors.gold400.opacity(0.2)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        case .secondary:
            return LinearGradient(
                colors: [SofraColors.gold500.opacity(0.3), SofraColors.gold400.opacity(0.1)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        default:
            return LinearGradient(colors: [.clear], startPoint: .top, endPoint: .bottom)
        }
    }

    private var borderWidth: CGFloat {
        switch style {
        case .ghost, .secondary: return 1.2
        default: return 0
        }
    }

    private var shadowColor: Color {
        switch style {
        case .primary: return SofraColors.gold500.opacity(0.3)
        case .destructive: return SofraColors.error.opacity(0.3)
        default: return .clear
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
    .background(SofraColors.background)
}
