// OrdersView.swift
// Customer orders screen matching web /orders (TrackOrders)

import SwiftUI

struct OrdersView: View {
    @Environment(AppState.self) var appState
    @State private var vm = OrdersViewModel()
    @State private var selectedTab = 0

    var body: some View {
        VStack(spacing: 0) {
            // Tabs
            Picker("", selection: $selectedTab) {
                Text("النشطة (\(vm.activeOrders.count))").tag(0)
                Text("السابقة (\(vm.pastOrders.count))").tag(1)
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, SofraSpacing.screenHorizontal)
            .padding(.top, SofraSpacing.sm)

            if vm.isLoading {
                ScrollView {
                    VStack(spacing: SofraSpacing.md) {
                        ForEach(0..<3, id: \.self) { _ in
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
            } else {
                let ordersToShow = selectedTab == 0 ? vm.activeOrders : vm.pastOrders

                if ordersToShow.isEmpty {
                    EmptyStateView(
                        icon: selectedTab == 0 ? "clock" : "archivebox",
                        title: selectedTab == 0 ? "لا توجد طلبات نشطة" : "لا توجد طلبات سابقة",
                        message: selectedTab == 0
                            ? "طلباتك الجارية ستظهر هنا"
                            : "طلباتك المكتملة والملغية ستظهر هنا"
                    )
                } else {
                    ScrollView {
                        LazyVStack(spacing: SofraSpacing.md) {
                            ForEach(ordersToShow) { order in
                                NavigationLink {
                                    OrderDetailView(order: order)
                                } label: {
                                    OrderRowView(order: order)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.horizontal, SofraSpacing.screenHorizontal)
                        .padding(.top, SofraSpacing.md)
                    }
                    .refreshable { await loadData() }
                }
            }
        }
        .background(SofraColors.background.ignoresSafeArea())
        .navigationTitle("طلباتي")
        .navigationBarTitleDisplayMode(.large)
        .task { await loadData() }
    }

    private func loadData() async {
        guard let uid = appState.currentUser?.uid else { return }
        await vm.loadOrders(userId: uid, token: try? await appState.validToken())
    }
}

// MARK: - Order Row
struct OrderRowView: View {
    let order: Order

    var body: some View {
        VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
            // Header
            HStack {
                StatusBadge(text: order.status.arabicLabel, color: order.status.uiColor)

                Spacer()

                VStack(alignment: .trailing, spacing: 2) {
                    Text(order.restaurantName ?? "مطعم")
                        .font(SofraTypography.headline)
                        .foregroundStyle(SofraColors.textPrimary)
                    Text("#\(order.id.prefix(8))")
                        .font(SofraTypography.caption2)
                        .foregroundStyle(SofraColors.textMuted)
                }
            }

            Divider()

            // Items summary
            HStack {
                Text("\(order.total, specifier: "%.2f") ر.س")
                    .font(SofraTypography.priceSmall)
                    .foregroundStyle(SofraColors.primaryDark)
                Spacer()
                Text("\(order.items.count) صنف")
                    .font(SofraTypography.caption)
                    .foregroundStyle(SofraColors.textSecondary)
            }

            // Time
            if let createdAt = order.createdAt {
                Text(createdAt.relativeArabic)
                    .font(SofraTypography.caption2)
                    .foregroundStyle(SofraColors.textMuted)
            }
        }
        .padding(SofraSpacing.cardPadding)
        .background(SofraColors.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
        .shadow(color: .black.opacity(0.04), radius: 6, y: 3)
    }
}

#Preview {
    NavigationStack {
        OrdersView()
            .environment(AppState())
    }
}
