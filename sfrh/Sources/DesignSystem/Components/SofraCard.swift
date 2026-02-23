// SofraCard.swift
// 🌙 بطاقة فخمة بتأثير زجاجي رمضاني — Glassmorphism Dark Card

import SwiftUI

struct SofraCard<Content: View>: View {
    var padding: CGFloat = SofraSpacing.cardPadding
    var showBorder: Bool = true
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .trailing, spacing: SofraSpacing.cardSpacing) {
            content()
        }
        .padding(padding)
        .frame(maxWidth: .infinity, alignment: .trailing)
        .background(
            ZStack {
                // Glassmorphism base
                RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous)
                    .fill(.ultraThinMaterial)
                    .environment(\.colorScheme, .dark)

                // Subtle gold border glow
                if showBorder {
                    RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous)
                        .strokeBorder(
                            LinearGradient(
                                colors: [
                                    SofraColors.gold500.opacity(0.25),
                                    SofraColors.gold400.opacity(0.08),
                                    SofraColors.gold500.opacity(0.15)
                                ],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: 0.8
                        )
                }
            }
        )
        .shadow(color: Color.black.opacity(0.2), radius: 12, x: 0, y: 6)
    }
}

#Preview {
    VStack(spacing: 16) {
        SofraCard {
            Text("عنوان البطاقة")
                .font(SofraTypography.headline)
                .foregroundStyle(SofraColors.textPrimary)
            Text("محتوى فخم بطابع رمضاني")
                .font(SofraTypography.body)
                .foregroundStyle(SofraColors.textSecondary)
        }
        .padding(.horizontal)
    }
    .frame(maxHeight: .infinity)
    .background(SofraColors.background)
}
