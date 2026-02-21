// CourierDashboardView.swift
// Courier app dashboard matching web /courier (CourierApp.tsx)

import SwiftUI

struct CourierDashboardView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var vm = CourierDashboardViewModel()
    @State private var selectedTab = 0

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Tab Bar
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: SofraSpacing.sm) {
                        tabButton("الرئيسية", icon: "house.fill", tag: 0)
                        tabButton("الطلبات", icon: "box.truck.fill", tag: 1)
                        tabButton("السجل", icon: "clock.fill", tag: 2)
                        tabButton("الأرباح", icon: "banknote.fill", tag: 3)
                        tabButton("حسابي", icon: "person.fill", tag: 4)
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                    .padding(.vertical, SofraSpacing.sm)
                }
                .background(SofraColors.cardBackground)

                TabView(selection: $selectedTab) {
                    courierHome.tag(0)
                    courierOrders.tag(1)
                    courierHistory.tag(2)
                    courierEarnings.tag(3)
                    courierProfile.tag(4)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
            }
            .background(SofraColors.background.ignoresSafeArea())
            .navigationTitle("لوحة المندوب")
            .navigationBarTitleDisplayMode(.inline)
            .task {
                guard let uid = appState.currentUser?.uid else { return }
                await vm.loadDashboard(courierId: uid, token: try? await appState.validToken())
            }
        }
    }

    // MARK: - Tab Button
    private func tabButton(_ title: String, icon: String, tag: Int) -> some View {
        Button {
            withAnimation { selectedTab = tag }
        } label: {
            HStack(spacing: SofraSpacing.xs) {
                Text(title)
                    .font(SofraTypography.caption)
                Image(systemName: icon)
            }
            .padding(.horizontal, SofraSpacing.md)
            .padding(.vertical, SofraSpacing.sm)
            .background(selectedTab == tag ? SofraColors.primary : SofraColors.sky100)
            .foregroundStyle(selectedTab == tag ? .white : SofraColors.textSecondary)
            .clipShape(Capsule())
        }
    }

    // MARK: - Home Tab
    private var courierHome: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.lg) {
                // Availability Toggle
                SofraCard {
                    HStack {
                        Toggle("", isOn: Binding(
                            get: { vm.isAvailable },
                            set: { newVal in
                                Task {
                                    await vm.toggleAvailability(
                                        available: newVal,
                                        token: try? await appState.validToken()
                                    )
                                }
                            }
                        ))
                        .tint(SofraColors.success)

                        Spacer()

                        VStack(alignment: .trailing) {
                            Text("حالة التوفر")
                                .font(SofraTypography.headline)
                            StatusBadge(
                                text: vm.isAvailable ? "متاح للتوصيل" : "غير متاح",
                                color: vm.isAvailable ? SofraColors.success : SofraColors.error
                            )
                        }

                        Image(systemName: vm.isAvailable ? "power" : "power.circle")
                            .font(.title)
                            .foregroundStyle(vm.isAvailable ? SofraColors.success : SofraColors.error)
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                // Stats
                LazyVGrid(columns: [.init(.flexible()), .init(.flexible())], spacing: SofraSpacing.md) {
                    statCard("التوصيلات", value: "\(vm.totalDeliveries)", icon: "box.truck.fill", color: SofraColors.primary)
                    statCard("التقييم", value: String(format: "%.1f", vm.rating), icon: "star.fill", color: SofraColors.warning)
                    statCard("طلبات نشطة", value: "\(vm.activeOrders.count)", icon: "clock.fill", color: SofraColors.info)
                    statCard("أرباح اليوم", value: String(format: "%.0f ر.س", vm.todayEarnings), icon: "banknote.fill", color: SofraColors.success)
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                // Ready for Pickup Orders
                if !vm.readyOrders.isEmpty {
                    VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
                        Text("طلبات جاهزة للتوصيل")
                            .font(SofraTypography.title3)
                            .padding(.horizontal, SofraSpacing.screenHorizontal)

                        ForEach(vm.readyOrders) { order in
                            readyOrderCard(order)
                                .padding(.horizontal, SofraSpacing.screenHorizontal)
                        }
                    }
                }

                Spacer(minLength: SofraSpacing.xxxl)
            }
            .padding(.top, SofraSpacing.md)
        }
        .refreshable {
            guard let uid = appState.currentUser?.uid else { return }
            await vm.loadDashboard(courierId: uid, token: try? await appState.validToken())
        }
    }

    // MARK: - Orders Tab (Active)
    private var courierOrders: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.md) {
                if vm.activeOrders.isEmpty {
                    EmptyStateView(
                        icon: "box.truck",
                        title: "لا توجد طلبات نشطة",
                        message: "اقبل طلبات من قائمة الطلبات الجاهزة"
                    )
                } else {
                    ForEach(vm.activeOrders) { order in
                        activeOrderCard(order)
                    }
                }
            }
            .padding(.horizontal, SofraSpacing.screenHorizontal)
            .padding(.top, SofraSpacing.md)
        }
    }

    // MARK: - History Tab
    private var courierHistory: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.md) {
                if vm.deliveredOrders.isEmpty {
                    EmptyStateView(
                        icon: "clock",
                        title: "لا توجد توصيلات سابقة",
                        message: "سجل توصيلاتك سيظهر هنا"
                    )
                } else {
                    ForEach(vm.deliveredOrders) { order in
                        HStack {
                            Text("\(order.deliveryFee, specifier: "%.0f") ر.س")
                                .font(SofraTypography.priceSmall)
                                .foregroundStyle(SofraColors.success)
                            Spacer()
                            VStack(alignment: .trailing) {
                                Text(order.restaurantName ?? "طلب")
                                    .font(SofraTypography.headline)
                                if let date = order.createdAt {
                                    Text(date.relativeArabic)
                                        .font(SofraTypography.caption)
                                        .foregroundStyle(SofraColors.textMuted)
                                }
                            }
                            StatusBadge(text: "تم التوصيل", color: SofraColors.success)
                        }
                        .padding(SofraSpacing.cardPadding)
                        .background(SofraColors.cardBackground)
                        .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
                    }
                }
            }
            .padding(.horizontal, SofraSpacing.screenHorizontal)
            .padding(.top, SofraSpacing.md)
        }
    }

    // MARK: - Earnings Tab
    private var courierEarnings: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.lg) {
                // Total Earnings Card
                VStack(spacing: SofraSpacing.sm) {
                    Image(systemName: "banknote.fill")
                        .font(.system(size: 40))
                        .foregroundStyle(SofraColors.success)
                    Text(String(format: "%.2f ر.س", vm.totalEarnings))
                        .font(SofraTypography.largeTitle)
                        .foregroundStyle(SofraColors.textPrimary)
                    Text("إجمالي الأرباح")
                        .font(SofraTypography.callout)
                        .foregroundStyle(SofraColors.textSecondary)
                }
                .frame(maxWidth: .infinity)
                .padding(SofraSpacing.xl)
                .background(SofraColors.cardBackground)
                .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
                .shadow(color: .black.opacity(0.04), radius: 6, y: 3)
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                LazyVGrid(columns: [.init(.flexible()), .init(.flexible())], spacing: SofraSpacing.md) {
                    statCard("اليوم", value: String(format: "%.0f ر.س", vm.todayEarnings), icon: "sun.max.fill", color: SofraColors.warning)
                    statCard("التوصيلات", value: "\(vm.totalDeliveries)", icon: "box.truck.fill", color: SofraColors.primary)
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                SofraCard {
                    HStack {
                        Text("3.75 ر.س / طلب")
                            .font(SofraTypography.body)
                            .foregroundStyle(SofraColors.textSecondary)
                        Spacer()
                        HStack(spacing: SofraSpacing.xs) {
                            Text("رسوم المنصة")
                                .font(SofraTypography.headline)
                            Image(systemName: "info.circle")
                                .foregroundStyle(SofraColors.info)
                        }
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                Spacer(minLength: SofraSpacing.xxxl)
            }
            .padding(.top, SofraSpacing.md)
        }
    }

    // MARK: - Profile Tab
    private var courierProfile: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.lg) {
                // Avatar
                VStack(spacing: SofraSpacing.sm) {
                    ZStack {
                        Circle()
                            .fill(SofraColors.sky100)
                            .frame(width: 80, height: 80)
                        Image(systemName: "car.fill")
                            .font(.largeTitle)
                            .foregroundStyle(SofraColors.primary)
                    }
                    Text(appState.currentUser?.name ?? "")
                        .font(SofraTypography.title2)
                    StatusBadge(text: "مندوب توصيل", color: SofraColors.primary)
                }
                .frame(maxWidth: .infinity)

                // Info
                SofraCard {
                    infoRow(icon: "phone.fill", label: "الهاتف", value: appState.currentUser?.phone ?? "غير محدد")
                    infoRow(icon: "location.fill", label: "المدينة", value: appState.currentUser?.city ?? "غير محدد")
                    infoRow(icon: "star.fill", label: "التقييم", value: String(format: "%.1f", vm.rating))
                    infoRow(icon: "box.truck.fill", label: "التوصيلات", value: "\(vm.totalDeliveries)")
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                // Documents Status
                SofraCard {
                    HStack {
                        StatusBadge(
                            text: vm.documentsStatus,
                            color: vm.documentsStatus == "approved" ? SofraColors.success : SofraColors.warning
                        )
                        Spacer()
                        HStack(spacing: SofraSpacing.xs) {
                            Text("حالة المستندات")
                                .font(SofraTypography.headline)
                            Image(systemName: "doc.fill")
                                .foregroundStyle(SofraColors.info)
                        }
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                Spacer(minLength: SofraSpacing.xxxl)
            }
            .padding(.top, SofraSpacing.md)
        }
    }

    // MARK: - Helper Subviews
    private func readyOrderCard(_ order: Order) -> some View {
        VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
            HStack {
                Button("قبول التوصيل") {
                    Task {
                        await vm.acceptDelivery(
                            orderId: order.id,
                            courierId: appState.currentUser?.uid ?? "",
                            token: try? await appState.validToken()
                        )
                    }
                }
                .font(SofraTypography.calloutSemibold)
                .foregroundStyle(.white)
                .padding(.horizontal, SofraSpacing.md)
                .padding(.vertical, SofraSpacing.sm)
                .background(SofraColors.success)
                .clipShape(Capsule())

                Spacer()

                VStack(alignment: .trailing) {
                    Text(order.restaurantName ?? "مطعم")
                        .font(SofraTypography.headline)
                    Text("\(order.items.count) أصناف")
                        .font(SofraTypography.caption)
                        .foregroundStyle(SofraColors.textMuted)
                }
            }
            HStack {
                Text("\(order.deliveryFee, specifier: "%.0f") ر.س أجرة")
                    .font(SofraTypography.priceSmall)
                    .foregroundStyle(SofraColors.success)
                Spacer()
                if let addr = order.address, !addr.isEmpty {
                    Label(addr, systemImage: "location.fill")
                        .font(SofraTypography.caption)
                        .foregroundStyle(SofraColors.textSecondary)
                        .lineLimit(1)
                }
            }
        }
        .padding(SofraSpacing.cardPadding)
        .background(SofraColors.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
        .shadow(color: .black.opacity(0.04), radius: 6, y: 3)
    }

    private func activeOrderCard(_ order: Order) -> some View {
        VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
            HStack {
                StatusBadge(text: order.status.arabicLabel, color: order.status.uiColor)
                Spacer()
                Text(order.restaurantName ?? "مطعم")
                    .font(SofraTypography.headline)
            }
            if let addr = order.address {
                Label(addr, systemImage: "location.fill")
                    .font(SofraTypography.caption)
                    .foregroundStyle(SofraColors.textSecondary)
                    .lineLimit(2)
            }
            HStack {
                if order.status == .outForDelivery {
                    Button("تم التوصيل") {
                        Task {
                            await vm.markDelivered(
                                orderId: order.id,
                                token: try? await appState.validToken()
                            )
                        }
                    }
                    .font(SofraTypography.calloutSemibold)
                    .foregroundStyle(.white)
                    .padding(.horizontal, SofraSpacing.md)
                    .padding(.vertical, SofraSpacing.sm)
                    .background(SofraColors.success)
                    .clipShape(Capsule())
                }
                Spacer()
                Text("\(order.total, specifier: "%.2f") ر.س")
                    .font(SofraTypography.priceSmall)
                    .foregroundStyle(SofraColors.primaryDark)
            }
        }
        .padding(SofraSpacing.cardPadding)
        .background(SofraColors.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
        .shadow(color: .black.opacity(0.04), radius: 6, y: 3)
    }

    private func statCard(_ title: String, value: String, icon: String, color: Color) -> some View {
        VStack(spacing: SofraSpacing.sm) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(color)
            Text(value)
                .font(SofraTypography.title2)
                .foregroundStyle(SofraColors.textPrimary)
            Text(title)
                .font(SofraTypography.caption)
                .foregroundStyle(SofraColors.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(SofraSpacing.cardPadding)
        .background(SofraColors.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
        .shadow(color: .black.opacity(0.03), radius: 4, y: 2)
    }

    private func infoRow(icon: String, label: String, value: String) -> some View {
        HStack {
            Text(value)
                .font(SofraTypography.body)
                .foregroundStyle(SofraColors.textSecondary)
            Spacer()
            Text(label)
                .font(SofraTypography.body)
                .foregroundStyle(SofraColors.textPrimary)
            Image(systemName: icon)
                .foregroundStyle(SofraColors.primary)
                .frame(width: 24)
        }
    }
}

#Preview {
    CourierDashboardView()
        .environmentObject(AppState())
        .environmentObject(CartViewModel())
}
