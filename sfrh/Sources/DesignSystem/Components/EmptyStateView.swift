// EmptyStateView.swift
// 🌙 حالة فارغة فخمة بتوهج ذهبي — Premium Empty State

import SwiftUI

struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String
    var actionTitle: String?
    var action: (() -> Void)?

    var body: some View {
        VStack(spacing: SofraSpacing.lg) {
            ZStack {
                Circle()
                    .fill(SofraColors.gold500.opacity(0.08))
                    .frame(width: 100, height: 100)

                Image(systemName: icon)
                    .font(.system(size: 44))
                    .foregroundStyle(
                        .linearGradient(
                            colors: [SofraColors.gold400, SofraColors.gold600],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
            }

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
    .background(SofraColors.background)
}
