// ErrorStateView.swift
// Reusable error state with retry button

import SwiftUI

struct ErrorStateView: View {
    let message: String
    var retryAction: (() async -> Void)?

    @State private var isRetrying = false

    var body: some View {
        VStack(spacing: SofraSpacing.lg) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 48))
                .foregroundStyle(SofraColors.warning)

            Text("حدث خطأ")
                .font(SofraTypography.title3)
                .foregroundStyle(SofraColors.textPrimary)

            Text(message)
                .font(SofraTypography.body)
                .foregroundStyle(SofraColors.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, SofraSpacing.xxl)

            if let retryAction {
                SofraButton(
                    title: "إعادة المحاولة",
                    icon: "arrow.clockwise",
                    style: .secondary,
                    isLoading: isRetrying
                ) {
                    Task {
                        isRetrying = true
                        await retryAction()
                        isRetrying = false
                    }
                }
                .padding(.horizontal, SofraSpacing.xxxl)
            }
        }
        .padding(.vertical, SofraSpacing.xxxl)
    }
}

#Preview {
    ErrorStateView(message: "تعذر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.") {}
}
