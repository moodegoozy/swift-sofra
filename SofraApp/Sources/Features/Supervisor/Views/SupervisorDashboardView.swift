// SupervisorDashboardView.swift
// Supervisor dashboard — manage orders, restaurants, and users

import SwiftUI

struct SupervisorDashboardView: View {
    @Environment(AppState.self) var appState
    @State private var vm = SupervisorDashboardViewModel()
    @State private var selectedTab = 0

    var body: some View {
        VStack(spacing: 0) {
            // Tab Bar
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: SofraSpacing.sm) {
                    tabButton("نظرة عامة", icon: "chart.bar.fill", tag: 0)
                    tabButton("الطلبات", icon: "list.clipboard.fill", tag: 1)
                    tabButton("المطاعم", icon: "storefront.fill", tag: 2)
                    tabButton("المستخدمين", icon: "person.3.fill", tag: 3)
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)
                .padding(.vertical, SofraSpacing.sm)
            }
            .background(SofraColors.cardBackground)

            TabView(selection: $selectedTab) {
                overviewTab.tag(0)
                ordersTab.tag(1)
                restaurantsTab.tag(2)
                usersTab.tag(3)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
        }
        .ramadanBackground()
        .navigationTitle("لوحة المشرف")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await vm.loadDashboard(token: try? await appState.validToken())
        }
    }

    // MARK: - Tab Button
    private func tabButton(_ title: String, icon: String, tag: Int) -> some View {
        Button {
            withAnimation { selectedTab = tag }
        } label: {
            HStack(spacing: SofraSpacing.xs) {
                Text(title)
                    .font(SofraTypography.calloutSemibold)
                Image(systemName: icon)
            }
            .padding(.horizontal, SofraSpacing.md)
            .padding(.vertical, SofraSpacing.sm)
            .background(selectedTab == tag ? SofraColors.info : SofraColors.sky100)
            .foregroundStyle(selectedTab == tag ? .white : SofraColors.textSecondary)
            .clipShape(Capsule())
        }
    }

    // MARK: - Overview Tab
    private var overviewTab: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.lg) {
                if vm.isLoading {
                    ForEach(0..<3, id: \.self) { _ in SkeletonCard() }
                        .padding(.horizontal, SofraSpacing.screenHorizontal)
                } else {
                    // Stats Grid
                    LazyVGrid(columns: [.init(.flexible()), .init(.flexible())], spacing: SofraSpacing.md) {
                        statCard("طلبات اليوم", value: "\(vm.todayOrders)", icon: "bag.fill", color: SofraColors.primary)
                        statCard("طلبات نشطة", value: "\(vm.activeOrders)", icon: "clock.fill", color: SofraColors.warning)
                        statCard("إجمالي الإيرادات", value: String(format: "%.0f ر.س", vm.totalRevenue), icon: "banknote.fill", color: SofraColors.success)
                        statCard("رسوم الخدمة", value: String(format: "%.0f ر.س", vm.totalCommission), icon: "percent", color: SofraColors.info)
                        statCard("المطاعم", value: "\(vm.totalRestaurants)", icon: "storefront.fill", color: SofraColors.primaryDark)
                        statCard("المستخدمين", value: "\(vm.totalUsers)", icon: "person.3.fill", color: SofraColors.gold400)
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)

                    // Pending Orders Alert
                    if !vm.pendingOrders.isEmpty {
                        SofraCard {
                            HStack {
                                Text("\(vm.pendingOrders.count)")
                                    .font(SofraTypography.title2)
                                    .foregroundStyle(SofraColors.warning)
                                Spacer()
                                HStack(spacing: SofraSpacing.xs) {
                                    Text("طلبات بانتظار القبول")
                                        .font(SofraTypography.headline)
                                    Image(systemName: "exclamationmark.triangle.fill")
                                        .foregroundStyle(SofraColors.warning)
                                }
                            }
                        }
                        .padding(.horizontal, SofraSpacing.screenHorizontal)
                    }

                    // Unverified Restaurants
                    if !vm.unverifiedRestaurants.isEmpty {
                        SofraCard {
                            HStack {
                                Text("\(vm.unverifiedRestaurants.count)")
                                    .font(SofraTypography.title2)
                                    .foregroundStyle(SofraColors.error)
                                Spacer()
                                HStack(spacing: SofraSpacing.xs) {
                                    Text("مطاعم بانتظار التوثيق")
                                        .font(SofraTypography.headline)
                                    Image(systemName: "shield.lefthalf.filled")
                                        .foregroundStyle(SofraColors.error)
                                }
                            }
                        }
                        .padding(.horizontal, SofraSpacing.screenHorizontal)
                    }

                    // Recent Orders
                    VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
                        Text("آخر الطلبات")
                            .font(SofraTypography.title3)
                            .padding(.horizontal, SofraSpacing.screenHorizontal)

                        ForEach(vm.orders.prefix(10)) { order in
                            supervisorOrderRow(order)
                        }
                    }
                }

                Spacer(minLength: SofraSpacing.xxxl)
            }
            .padding(.top, SofraSpacing.md)
        }
        .refreshable {
            await vm.loadDashboard(token: try? await appState.validToken())
        }
    }

    // MARK: - Orders Tab
    private var ordersTab: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.md) {
                if vm.orders.isEmpty {
                    EmptyStateView(
                        icon: "list.clipboard",
                        title: "لا توجد طلبات",
                        message: "جميع الطلبات ستظهر هنا"
                    )
                } else {
                    // Summary bar
                    HStack(spacing: SofraSpacing.md) {
                        miniStat("الكل", count: vm.totalOrders, color: SofraColors.textPrimary)
                        miniStat("نشط", count: vm.activeOrders, color: SofraColors.warning)
                        miniStat("مكتمل", count: vm.deliveredOrders.count, color: SofraColors.success)
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)

                    ForEach(vm.orders) { order in
                        supervisorOrderRow(order)
                    }
                }
            }
            .padding(.top, SofraSpacing.md)
        }
        .refreshable {
            if let token = try? await appState.validToken() {
                await vm.loadOrders(token: token)
            }
        }
    }

    // MARK: - Restaurants Tab
    private var restaurantsTab: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.md) {
                if vm.restaurants.isEmpty {
                    EmptyStateView(
                        icon: "storefront",
                        title: "لا توجد مطاعم",
                        message: "المطاعم المسجلة ستظهر هنا"
                    )
                } else {
                    // Unverified first
                    if !vm.unverifiedRestaurants.isEmpty {
                        Text("بانتظار التوثيق")
                            .font(SofraTypography.title3)
                            .foregroundStyle(SofraColors.warning)
                            .padding(.horizontal, SofraSpacing.screenHorizontal)

                        ForEach(vm.unverifiedRestaurants, id: \.id) { restaurant in
                            restaurantRow(restaurant)
                        }
                    }

                    Text("المطاعم الموثقة (\(vm.verifiedRestaurants.count))")
                        .font(SofraTypography.title3)
                        .padding(.horizontal, SofraSpacing.screenHorizontal)

                    ForEach(vm.verifiedRestaurants, id: \.id) { restaurant in
                        restaurantRow(restaurant)
                    }
                }
            }
            .padding(.top, SofraSpacing.md)
        }
        .refreshable {
            if let token = try? await appState.validToken() {
                await vm.loadRestaurants(token: token)
            }
        }
    }

    // MARK: - Users Tab
    private var usersTab: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.md) {
                if vm.users.isEmpty {
                    EmptyStateView(icon: "person.3", title: "لا يوجد مستخدمين", message: "")
                } else {
                    // Role groups
                    let roles: [(UserRole, String, String)] = [
                        (.owner, "أصحاب المطاعم", "storefront.fill"),
                        (.courier, "المندوبين", "car.fill"),
                        (.customer, "العملاء", "person.fill"),
                        (.supervisor, "المشرفين", "shield.fill"),
                        (.developer, "المطورين", "wrench.and.screwdriver.fill"),
                    ]

                    ForEach(roles, id: \.0) { role, title, icon in
                        let roleUsers = vm.users(byRole: role)
                        if !roleUsers.isEmpty {
                            VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
                                HStack(spacing: SofraSpacing.xs) {
                                    Text("(\(roleUsers.count))")
                                        .font(SofraTypography.caption)
                                        .foregroundStyle(SofraColors.textMuted)
                                    Text(title)
                                        .font(SofraTypography.title3)
                                    Image(systemName: icon)
                                        .foregroundStyle(SofraColors.primary)
                                }
                                .padding(.horizontal, SofraSpacing.screenHorizontal)

                                ForEach(roleUsers, id: \.uid) { user in
                                    userRow(user)
                                }
                            }
                        }
                    }
                }
            }
            .padding(.top, SofraSpacing.md)
        }
        .refreshable {
            if let token = try? await appState.validToken() {
                await vm.loadUsers(token: token)
            }
        }
    }

    // MARK: - Order Row
    private func supervisorOrderRow(_ order: Order) -> some View {
        VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
            HStack {
                StatusBadge(text: order.status.arabicLabel, color: order.status.uiColor)
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text(order.restaurantName ?? "مطعم")
                        .font(SofraTypography.headline)
                    Text("#\(order.id.prefix(8))")
                        .font(SofraTypography.caption2)
                        .foregroundStyle(SofraColors.textMuted)
                }
            }

            HStack {
                HStack(spacing: SofraSpacing.xs) {
                    Text("\(order.total, specifier: "%.0f") ر.س")
                        .font(SofraTypography.priceSmall)
                        .foregroundStyle(SofraColors.primaryDark)
                    if order.commissionAmount > 0 {
                        Text("(\(order.commissionAmount, specifier: "%.0f") رسوم)")
                            .font(SofraTypography.caption2)
                            .foregroundStyle(SofraColors.info)
                    }
                }
                Spacer()
                if let name = order.customerName {
                    Text(name)
                        .font(SofraTypography.caption)
                        .foregroundStyle(SofraColors.textSecondary)
                }
            }

            if let date = order.createdAt {
                Text(date.relativeArabic)
                    .font(SofraTypography.caption2)
                    .foregroundStyle(SofraColors.textMuted)
            }

            // Quick status actions
            if order.status == .pending {
                HStack(spacing: SofraSpacing.md) {
                    Button("إلغاء") {
                        Task { await vm.updateOrderStatus(orderId: order.id, newStatus: .cancelled, token: try? await appState.validToken()) }
                    }
                    .font(SofraTypography.caption)
                    .foregroundStyle(SofraColors.error)

                    Spacer()

                    Button("قبول") {
                        Task { await vm.updateOrderStatus(orderId: order.id, newStatus: .accepted, token: try? await appState.validToken()) }
                    }
                    .font(SofraTypography.calloutSemibold)
                    .foregroundStyle(SofraColors.success)
                }
            }
        }
        .padding(SofraSpacing.cardPadding)
        .background(SofraColors.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
        .shadow(color: .black.opacity(0.04), radius: 6, y: 3)
        .padding(.horizontal, SofraSpacing.screenHorizontal)
    }

    // MARK: - Restaurant Row
    private func restaurantRow(_ restaurant: Restaurant) -> some View {
        VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
            HStack {
                // Verify toggle
                Button {
                    Task {
                        await vm.verifyRestaurant(
                            restaurantId: restaurant.id,
                            verified: !restaurant.isVerified,
                            token: try? await appState.validToken()
                        )
                    }
                } label: {
                    StatusBadge(
                        text: restaurant.isVerified ? "موثق" : "غير موثق",
                        color: restaurant.isVerified ? SofraColors.success : SofraColors.error
                    )
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 2) {
                    Text(restaurant.name)
                        .font(SofraTypography.headline)
                    if let phone = restaurant.phone {
                        Text(phone)
                            .font(SofraTypography.caption)
                            .foregroundStyle(SofraColors.textMuted)
                    }
                }

                // Logo
                CachedPhaseImage(url: URL(string: restaurant.logoUrl ?? "")) { phase in
                    switch phase {
                    case .success(let img):
                        img.resizable().aspectRatio(contentMode: .fill)
                    default:
                        Image(systemName: "storefront.fill")
                            .foregroundStyle(SofraColors.textMuted)
                    }
                }
                .frame(width: 44, height: 44)
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }

            HStack {
                Text("رسوم: \(ServiceFee.perItem, specifier: "%.2f") ر.س/صنف")
                    .font(SofraTypography.caption)
                    .foregroundStyle(SofraColors.info)

                Spacer()

                HStack(spacing: SofraSpacing.sm) {
                    StatusBadge(text: restaurant.isOpen ? "مفتوح" : "مغلق", color: restaurant.isOpen ? SofraColors.success : SofraColors.error)
                    Text("أصناف: \(restaurant.menuItemCount ?? 0)")
                        .font(SofraTypography.caption)
                        .foregroundStyle(SofraColors.textSecondary)
                }
            }
        }
        .padding(SofraSpacing.cardPadding)
        .background(SofraColors.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
        .shadow(color: .black.opacity(0.04), radius: 6, y: 3)
        .padding(.horizontal, SofraSpacing.screenHorizontal)
    }

    // MARK: - User Row
    private func userRow(_ user: AppUser) -> some View {
        HStack {
            // Role badge
            Text(roleLabel(user.role))
                .font(SofraTypography.caption2)
                .foregroundStyle(.white)
                .padding(.horizontal, 8)
                .padding(.vertical, 3)
                .background(roleColor(user.role))
                .clipShape(Capsule())

            Spacer()

            VStack(alignment: .trailing, spacing: 2) {
                Text(user.displayName)
                    .font(SofraTypography.headline)
                Text(user.email)
                    .font(SofraTypography.caption)
                    .foregroundStyle(SofraColors.textMuted)
                if let phone = user.phone {
                    Text(phone)
                        .font(SofraTypography.caption2)
                        .foregroundStyle(SofraColors.textMuted)
                }
            }

            Image(systemName: "person.circle.fill")
                .font(.title2)
                .foregroundStyle(roleColor(user.role))
        }
        .padding(SofraSpacing.cardPadding)
        .background(SofraColors.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
        .padding(.horizontal, SofraSpacing.screenHorizontal)
    }

    // MARK: - Helpers
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

    private func miniStat(_ label: String, count: Int, color: Color) -> some View {
        VStack(spacing: 2) {
            Text("\(count)")
                .font(SofraTypography.headline)
                .foregroundStyle(color)
            Text(label)
                .font(SofraTypography.caption2)
                .foregroundStyle(SofraColors.textMuted)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, SofraSpacing.sm)
        .background(SofraColors.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private func roleLabel(_ role: UserRole) -> String {
        switch role {
        case .customer: return "عميل"
        case .owner: return "مالك"
        case .courier: return "مندوب"
        case .admin: return "مدير"
        case .developer: return "مطور"
        case .supervisor: return "مشرف"
        case .social_media: return "تواصل"
        case .support: return "دعم"
        case .accountant: return "محاسب"
        }
    }

    private func roleColor(_ role: UserRole) -> Color {
        switch role {
        case .customer: return SofraColors.primary
        case .owner: return SofraColors.success
        case .courier: return SofraColors.warning
        case .admin: return SofraColors.error
        case .developer: return SofraColors.info
        case .supervisor: return SofraColors.primaryDark
        case .social_media: return SofraColors.gold400
        case .support: return SofraColors.sky400
        case .accountant: return SofraColors.gold600
        }
    }
}

#Preview {
    NavigationStack {
        SupervisorDashboardView()
            .environment(AppState())
    }
}
