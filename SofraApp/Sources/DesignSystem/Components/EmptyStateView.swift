// EmptyStateView.swift
// Beautiful empty state for lists with no data

import SwiftUI

struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String
    var actionTitle: String?
    var action: (() -> Void)?

    var body: some View {
        VStack(spacing: SofraSpacing.lg) {
            Image(systemName: icon)
                .font(.system(size: 56))
                .foregroundStyle(SofraColors.sky300)

            Text(title)
                .font(SofraTypography.title3)
                .foregroundStyle(SofraColors.textPrimary)

            Text(message)
                .font(SofraTypography.body)
                .foregroundStyle(SofraColors.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, SofraSpacing.xxl)

            if let actionTitle, let action {
                SofraButton(title: actionTitle, action: action)
                    .padding(.horizontal, SofraSpacing.xxxl)
            }
        }
        .padding(.vertical, SofraSpacing.xxxl)
    }
}

#Preview {
    EmptyStateView(
        icon: "bag",
        title: "لا توجد طلبات",
        message: "لم تقم بأي طلب بعد. تصفح المطاعم واطلب وجبتك المفضلة!",
        actionTitle: "تصفح المطاعم"
    ) {}
}
