// SofraCard.swift
// Reusable card container with consistent styling

import SwiftUI

struct SofraCard<Content: View>: View {
    var padding: CGFloat = SofraSpacing.cardPadding
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .trailing, spacing: SofraSpacing.cardSpacing) {
            content()
        }
        .padding(padding)
        .frame(maxWidth: .infinity, alignment: .trailing)
        .background(SofraColors.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
        .shadow(color: .black.opacity(0.05), radius: 10, x: 0, y: 4)
    }
}

#Preview {
    SofraCard {
        Text("عنوان البطاقة")
            .font(SofraTypography.headline)
        Text("محتوى البطاقة هنا")
            .font(SofraTypography.body)
            .foregroundStyle(SofraColors.textSecondary)
    }
    .padding()
}
