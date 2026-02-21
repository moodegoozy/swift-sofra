// NotificationsView.swift
// Notifications screen matching web /notifications

import SwiftUI

struct NotificationsView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var vm = NotificationsViewModel()

    var body: some View {
        Group {
            if vm.isLoading {
                ScrollView {
                    VStack(spacing: SofraSpacing.md) {
                        ForEach(0..<5, id: \.self) { _ in
                            SkeletonCard()
                        }
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                    .padding(.top, SofraSpacing.md)
                }
            } else if let err = vm.errorMessage {
                ErrorStateView(message: err) {
                    await loadData()
                }
            } else if vm.notifications.isEmpty {
                EmptyStateView(
                    icon: "bell.slash",
                    title: "لا توجد إشعارات",
                    message: "ستصلك إشعارات عند تحديث حالة طلبك"
                )
            } else {
                List(vm.notifications) { notif in
                    notificationRow(notif)
                        .listRowSeparator(.hidden)
                        .listRowBackground(Color.clear)
                        .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16))
                }
                .listStyle(.plain)
                .refreshable { await loadData() }
            }
        }
        .background(SofraColors.background.ignoresSafeArea())
        .navigationTitle("الإشعارات")
        .navigationBarTitleDisplayMode(.large)
        .task { await loadData() }
    }

    private func notificationRow(_ notif: AppNotification) -> some View {
        HStack(spacing: SofraSpacing.md) {
            // Unread indicator
            if !notif.read {
                Circle()
                    .fill(SofraColors.primary)
                    .frame(width: 8, height: 8)
            }

            VStack(alignment: .trailing, spacing: SofraSpacing.xs) {
                // Time
                if let date = notif.createdAt {
                    Text(date.relativeArabic)
                        .font(SofraTypography.caption2)
                        .foregroundStyle(SofraColors.textMuted)
                }

                Text(notif.body)
                    .font(SofraTypography.callout)
                    .foregroundStyle(SofraColors.textSecondary)
                    .lineLimit(2)

                Text(notif.title)
                    .font(SofraTypography.headline)
                    .foregroundStyle(SofraColors.textPrimary)
            }

            Spacer()

            // Icon
            Image(systemName: notifIcon(notif.type))
                .font(.title2)
                .foregroundStyle(notif.read ? SofraColors.sky300 : SofraColors.primary)
                .frame(width: 36, height: 36)
        }
        .padding(SofraSpacing.cardPadding)
        .background(notif.read ? SofraColors.cardBackground : SofraColors.sky50)
        .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
        .shadow(color: .black.opacity(0.03), radius: 4, y: 2)
    }

    private func notifIcon(_ type: String?) -> String {
        switch type {
        case "order":    return "bag.fill"
        case "delivery": return "car.fill"
        case "promo":    return "tag.fill"
        case "support":  return "headphones"
        case "wallet":   return "creditcard.fill"
        default:         return "bell.fill"
        }
    }

    private func loadData() async {
        guard let uid = appState.currentUser?.uid else { return }
        await vm.loadNotifications(userId: uid, token: try? await appState.validToken())
    }
}

#Preview {
    NavigationStack {
        NotificationsView()
            .environmentObject(AppState())
    }
}
