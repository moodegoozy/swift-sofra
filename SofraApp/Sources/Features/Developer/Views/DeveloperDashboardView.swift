// DeveloperDashboardView.swift
// Full admin/developer dashboard — system analytics, user management,
// restaurant management, commission settings, order control

import SwiftUI

struct DeveloperDashboardView: View {
    @Environment(AppState.self) var appState
    @State private var vm = DeveloperDashboardViewModel()
    @State private var selectedTab = 0
    @State private var editingCommission: Restaurant?
    @State private var newCommissionRate: Double = 15
    @State private var editingUserRole: AppUser?
    @State private var selectedRole: UserRole = .customer

    var body: some View {
        VStack(spacing: 0) {
            // Tab Bar
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: SofraSpacing.sm) {
                    devTab("التحليلات", icon: "chart.bar.fill", tag: 0)
                    devTab("الطلبات", icon: "list.clipboard.fill", tag: 1)
                    devTab("المطاعم", icon: "storefront.fill", tag: 2)
                    devTab("المستخدمين", icon: "person.3.fill", tag: 3)
                    devTab("النظام", icon: "gearshape.2.fill", tag: 4)
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)
                .padding(.vertical, SofraSpacing.sm)
            }
            .background(SofraColors.cardBackground)

            TabView(selection: $selectedTab) {
                analyticsTab.tag(0)
                ordersTab.tag(1)
                restaurantsTab.tag(2)
                usersTab.tag(3)
                systemTab.tag(4)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
        }
        .ramadanBackground()
        .navigationTitle("لوحة المطور")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await vm.loadDashboard(token: try? await appState.validToken())
        }
        .sheet(item: $editingCommission) { restaurant in
            commissionEditor(restaurant)
        }
        .sheet(item: $editingUserRole) { user in
            roleEditor(user)
        }
    }

    // MARK: - Dev Tab Button
    private func devTab(_ title: String, icon: String, tag: Int) -> some View {
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
            .background(selectedTab == tag ? SofraColors.primaryDark : SofraColors.sky100)
            .foregroundStyle(selectedTab == tag ? .white : SofraColors.textSecondary)
            .clipShape(Capsule())
        }
    }

    // MARK: - Analytics Tab
    private var analyticsTab: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.lg) {
                if vm.isLoading {
                    ForEach(0..<3, id: \.self) { _ in SkeletonCard() }
                        .padding(.horizontal, SofraSpacing.screenHorizontal)
                } else {
                    // Platform Earnings Hero
                    VStack(spacing: SofraSpacing.md) {
                        Image(systemName: "chart.line.uptrend.xyaxis")
                            .font(.system(size: 40))
                            .foregroundStyle(SofraColors.gold400)

                        Text("أرباح المنصة")
                            .font(SofraTypography.calloutSemibold)
                            .foregroundStyle(SofraColors.textSecondary)

                        Text("\(vm.netPlatformEarnings, specifier: "%.2f") ر.س")
                            .font(.system(size: 32, weight: .bold, design: .rounded))
                            .foregroundStyle(SofraColors.success)

                        HStack(spacing: SofraSpacing.lg) {
                            VStack(spacing: 2) {
                                Text("\(vm.totalCommission, specifier: "%.0f") ر.س")
                                    .font(SofraTypography.headline)
                                    .foregroundStyle(SofraColors.info)
                                Text("عمولات المطاعم")
                                    .font(SofraTypography.caption2)
                                    .foregroundStyle(SofraColors.textMuted)
                            }
                            VStack(spacing: 2) {
                                Text("\(vm.courierPlatformFees, specifier: "%.0f") ر.س")
                                    .font(SofraTypography.headline)
                                    .foregroundStyle(SofraColors.warning)
                                Text("رسوم المندوبين")
                                    .font(SofraTypography.caption2)
                                    .foregroundStyle(SofraColors.textMuted)
                            }
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(SofraSpacing.xl)
                    .background(
                        LinearGradient(
                            colors: [SofraColors.cardBackground, SofraColors.sky100],
                            startPoint: .top, endPoint: .bottom
                        )
                    )
                    .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
                    .shadow(color: .black.opacity(0.06), radius: 10, y: 5)
                    .padding(.horizontal, SofraSpacing.screenHorizontal)

                    // Stats Grid
                    LazyVGrid(columns: [.init(.flexible()), .init(.flexible())], spacing: SofraSpacing.md) {
                        statCard("إجمالي الطلبات", value: "\(vm.totalOrders)", icon: "bag.fill", color: SofraColors.primary)
                        statCard("طلبات اليوم", value: "\(vm.todayOrders)", icon: "calendar", color: SofraColors.warning)
                        statCard("إيرادات اليوم", value: String(format: "%.0f ر.س", vm.todayRevenue), icon: "banknote", color: SofraColors.success)
                        statCard("إجمالي الإيرادات", value: String(format: "%.0f ر.س", vm.totalRevenue), icon: "banknote.fill", color: SofraColors.primaryDark)
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)

                    // User Breakdown
                    SofraCard {
                        Text("توزيع المستخدمين")
                            .font(SofraTypography.headline)

                        LazyVGrid(columns: [.init(.flexible()), .init(.flexible())], spacing: SofraSpacing.md) {
                            userStatBadge("العملاء", count: vm.customerCount, icon: "person.fill", color: SofraColors.primary)
                            userStatBadge("أصحاب المطاعم", count: vm.ownerCount, icon: "storefront.fill", color: SofraColors.success)
                            userStatBadge("المندوبين", count: vm.courierCount, icon: "car.fill", color: SofraColors.warning)
                            userStatBadge("المشرفين", count: vm.supervisorCount, icon: "shield.fill", color: SofraColors.info)
                        }
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)

                    // Restaurant Breakdown
                    SofraCard {
                        Text("حالة المطاعم")
                            .font(SofraTypography.headline)

                        HStack(spacing: SofraSpacing.lg) {
                            VStack(spacing: 4) {
                                Text("\(vm.verifiedRestaurants.count)")
                                    .font(SofraTypography.title2)
                                    .foregroundStyle(SofraColors.success)
                                Text("موثق")
                                    .font(SofraTypography.caption)
                                    .foregroundStyle(SofraColors.textMuted)
                            }
                            .frame(maxWidth: .infinity)

                            Divider().frame(height: 40)

                            VStack(spacing: 4) {
                                Text("\(vm.unverifiedRestaurants.count)")
                                    .font(SofraTypography.title2)
                                    .foregroundStyle(SofraColors.error)
                                Text("بانتظار التوثيق")
                                    .font(SofraTypography.caption)
                                    .foregroundStyle(SofraColors.textMuted)
                            }
                            .frame(maxWidth: .infinity)

                            Divider().frame(height: 40)

                            VStack(spacing: 4) {
                                Text("\(vm.totalRestaurants)")
                                    .font(SofraTypography.title2)
                                    .foregroundStyle(SofraColors.textPrimary)
                                Text("الإجمالي")
                                    .font(SofraTypography.caption)
                                    .foregroundStyle(SofraColors.textMuted)
                            }
                            .frame(maxWidth: .infinity)
                        }
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)

                    // Order Status Breakdown
                    SofraCard {
                        Text("حالة الطلبات")
                            .font(SofraTypography.headline)

                        ForEach(OrderStatus.allCases, id: \.self) { status in
                            let count = vm.orders.filter { $0.status == status }.count
                            if count > 0 {
                                HStack {
                                    Text("\(count)")
                                        .font(SofraTypography.headline)
                                        .foregroundStyle(status.uiColor)
                                        .frame(width: 40)
                                    // Progress bar
                                    GeometryReader { geo in
                                        RoundedRectangle(cornerRadius: 4)
                                            .fill(status.uiColor.opacity(0.3))
                                            .frame(width: geo.size.width)
                                            .overlay(alignment: .trailing) {
                                                RoundedRectangle(cornerRadius: 4)
                                                    .fill(status.uiColor)
                                                    .frame(width: geo.size.width * CGFloat(count) / CGFloat(max(vm.totalOrders, 1)))
                                            }
                                    }
                                    .frame(height: 8)
                                    Spacer()
                                    Text(status.arabicLabel)
                                        .font(SofraTypography.caption)
                                        .foregroundStyle(SofraColors.textSecondary)
                                }
                            }
                        }
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
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
                    EmptyStateView(icon: "list.clipboard", title: "لا توجد طلبات", message: "")
                } else {
                    ForEach(vm.orders) { order in
                        devOrderCard(order)
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
                    EmptyStateView(icon: "storefront", title: "لا توجد مطاعم", message: "")
                } else {
                    ForEach(vm.restaurants, id: \.id) { restaurant in
                        devRestaurantCard(restaurant)
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
                    ForEach(vm.users, id: \.uid) { user in
                        devUserCard(user)
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

    // MARK: - System Tab
    private var systemTab: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.lg) {
                // Platform Config
                SofraCard {
                    VStack(alignment: .trailing, spacing: SofraSpacing.md) {
                        HStack(spacing: SofraSpacing.xs) {
                            Text("إعدادات المنصة")
                                .font(SofraTypography.headline)
                            Image(systemName: "gearshape.2.fill")
                                .foregroundStyle(SofraColors.primaryDark)
                        }

                        Group {
                            infoRow("معرف المشروع", value: Endpoints.projectId)
                            infoRow("العمولة الافتراضية", value: "15%")
                            infoRow("رسوم المندوب", value: "3.75 ر.س/طلب")
                            infoRow("إجمالي المستخدمين", value: "\(vm.totalUsers)")
                            infoRow("إجمالي المطاعم", value: "\(vm.totalRestaurants)")
                            infoRow("إجمالي الطلبات", value: "\(vm.totalOrders)")
                        }
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                // Revenue Summary
                SofraCard {
                    VStack(alignment: .trailing, spacing: SofraSpacing.md) {
                        HStack(spacing: SofraSpacing.xs) {
                            Text("ملخص الإيرادات")
                                .font(SofraTypography.headline)
                            Image(systemName: "chart.pie.fill")
                                .foregroundStyle(SofraColors.success)
                        }

                        infoRow("إجمالي المبيعات", value: String(format: "%.2f ر.س", vm.totalRevenue))
                        infoRow("عمولات المطاعم", value: String(format: "%.2f ر.س", vm.totalCommission))
                        infoRow("رسوم المندوبين", value: String(format: "%.2f ر.س", vm.courierPlatformFees))
                        Divider()
                        HStack {
                            Text(String(format: "%.2f ر.س", vm.netPlatformEarnings))
                                .font(SofraTypography.price)
                                .foregroundStyle(SofraColors.success)
                            Spacer()
                            Text("صافي أرباح المنصة")
                                .font(SofraTypography.headline)
                                .foregroundStyle(SofraColors.gold400)
                        }
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                // Quick Actions
                SofraCard {
                    Text("إجراءات سريعة")
                        .font(SofraTypography.headline)

                    LazyVGrid(columns: [.init(.flexible()), .init(.flexible())], spacing: SofraSpacing.md) {
                        quickAction("الطلبات", icon: "list.clipboard", color: SofraColors.primary) { selectedTab = 1 }
                        quickAction("المطاعم", icon: "storefront", color: SofraColors.success) { selectedTab = 2 }
                        quickAction("المستخدمين", icon: "person.3", color: SofraColors.info) { selectedTab = 3 }
                        quickAction("التحليلات", icon: "chart.bar", color: SofraColors.warning) { selectedTab = 0 }
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                Spacer(minLength: SofraSpacing.xxxl)
            }
            .padding(.top, SofraSpacing.md)
        }
    }

    // MARK: - Dev Order Card
    private func devOrderCard(_ order: Order) -> some View {
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

            // Customer + financials
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("\(order.total, specifier: "%.0f") ر.س")
                        .font(SofraTypography.priceSmall)
                        .foregroundStyle(SofraColors.primaryDark)
                    if order.commissionAmount > 0 {
                        Text("عمولة: \(order.commissionAmount, specifier: "%.0f") | صافي: \(order.netAmount, specifier: "%.0f")")
                            .font(SofraTypography.caption2)
                            .foregroundStyle(SofraColors.info)
                    }
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text(order.customerName ?? "عميل")
                        .font(SofraTypography.caption)
                        .foregroundStyle(SofraColors.textSecondary)
                    if let date = order.createdAt {
                        Text(date.relativeArabic)
                            .font(SofraTypography.caption2)
                            .foregroundStyle(SofraColors.textMuted)
                    }
                }
            }

            // Status change buttons
            HStack(spacing: SofraSpacing.sm) {
                if order.status != .cancelled && order.status != .delivered {
                    Button("إلغاء") {
                        Task { await vm.updateOrderStatus(orderId: order.id, newStatus: .cancelled, token: try? await appState.validToken()) }
                    }
                    .font(SofraTypography.caption)
                    .foregroundStyle(SofraColors.error)
                }

                Spacer()

                if order.status == .pending {
                    Button("قبول") {
                        Task { await vm.updateOrderStatus(orderId: order.id, newStatus: .accepted, token: try? await appState.validToken()) }
                    }
                    .font(SofraTypography.calloutSemibold)
                    .foregroundStyle(SofraColors.success)
                }
                if order.status == .accepted {
                    Button("تحضير") {
                        Task { await vm.updateOrderStatus(orderId: order.id, newStatus: .preparing, token: try? await appState.validToken()) }
                    }
                    .font(SofraTypography.calloutSemibold)
                    .foregroundStyle(SofraColors.info)
                }
                if order.status == .preparing {
                    Button("جاهز") {
                        Task { await vm.updateOrderStatus(orderId: order.id, newStatus: .ready, token: try? await appState.validToken()) }
                    }
                    .font(SofraTypography.calloutSemibold)
                    .foregroundStyle(SofraColors.primary)
                }
                if order.status == .ready {
                    Button("تم التوصيل") {
                        Task { await vm.updateOrderStatus(orderId: order.id, newStatus: .delivered, token: try? await appState.validToken()) }
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

    // MARK: - Dev Restaurant Card
    private func devRestaurantCard(_ restaurant: Restaurant) -> some View {
        VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
            HStack {
                // Actions
                HStack(spacing: SofraSpacing.sm) {
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
                            text: restaurant.isVerified ? "موثق ✓" : "توثيق",
                            color: restaurant.isVerified ? SofraColors.success : SofraColors.warning
                        )
                    }

                    Button {
                        newCommissionRate = restaurant.commissionRate
                        editingCommission = restaurant
                    } label: {
                        Text("\(restaurant.commissionRate, specifier: "%.0f")%")
                            .font(SofraTypography.caption)
                            .foregroundStyle(SofraColors.info)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(SofraColors.info.opacity(0.15))
                            .clipShape(Capsule())
                    }
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 2) {
                    Text(restaurant.name)
                        .font(SofraTypography.headline)
                    Text(restaurant.phone ?? "بدون جوال")
                        .font(SofraTypography.caption)
                        .foregroundStyle(SofraColors.textMuted)
                }

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
                StatusBadge(text: restaurant.isOpen ? "مفتوح" : "مغلق", color: restaurant.isOpen ? SofraColors.success : SofraColors.error)
                Spacer()
                Text("أصناف: \(restaurant.menuItemCount ?? 0)")
                    .font(SofraTypography.caption)
                    .foregroundStyle(SofraColors.textSecondary)
                Text("طلبات: \(restaurant.totalOrders ?? 0)")
                    .font(SofraTypography.caption)
                    .foregroundStyle(SofraColors.textSecondary)
            }
        }
        .padding(SofraSpacing.cardPadding)
        .background(SofraColors.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
        .shadow(color: .black.opacity(0.04), radius: 6, y: 3)
        .padding(.horizontal, SofraSpacing.screenHorizontal)
        .contextMenu {
            Button(role: .destructive) {
                Task { await vm.deleteRestaurant(restaurantId: restaurant.id, token: try? await appState.validToken()) }
            } label: {
                Label("حذف المطعم", systemImage: "trash")
            }
        }
    }

    // MARK: - Dev User Card
    private func devUserCard(_ user: AppUser) -> some View {
        HStack {
            // Role badge + edit
            Button {
                selectedRole = user.role
                editingUserRole = user
            } label: {
                Text(roleLabel(user.role))
                    .font(SofraTypography.caption2)
                    .foregroundStyle(.white)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(roleColor(user.role))
                    .clipShape(Capsule())
            }

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
        .contextMenu {
            Button(role: .destructive) {
                Task { await vm.deleteUser(userId: user.uid, token: try? await appState.validToken()) }
            } label: {
                Label("حذف المستخدم", systemImage: "trash")
            }
        }
    }

    // MARK: - Commission Editor Sheet
    private func commissionEditor(_ restaurant: Restaurant) -> some View {
        NavigationStack {
            VStack(spacing: SofraSpacing.xl) {
                Text(restaurant.name)
                    .font(SofraTypography.title2)
                    .foregroundStyle(SofraColors.textPrimary)

                VStack(spacing: SofraSpacing.sm) {
                    Text("نسبة العمولة")
                        .font(SofraTypography.headline)

                    Text("\(newCommissionRate, specifier: "%.0f")%")
                        .font(.system(size: 48, weight: .bold, design: .rounded))
                        .foregroundStyle(SofraColors.info)

                    Slider(value: $newCommissionRate, in: 0...50, step: 1)
                        .tint(SofraColors.info)
                        .padding(.horizontal, SofraSpacing.xl)

                    HStack {
                        Text("50%")
                            .font(SofraTypography.caption)
                            .foregroundStyle(SofraColors.textMuted)
                        Spacer()
                        Text("0%")
                            .font(SofraTypography.caption)
                            .foregroundStyle(SofraColors.textMuted)
                    }
                    .padding(.horizontal, SofraSpacing.xl)
                }

                SofraButton(title: "حفظ العمولة", icon: "checkmark") {
                    Task {
                        await vm.updateCommissionRate(
                            restaurantId: restaurant.id,
                            rate: newCommissionRate,
                            token: try? await appState.validToken()
                        )
                        editingCommission = nil
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                Spacer()
            }
            .padding(.top, SofraSpacing.xl)
            .ramadanBackground()
            .navigationTitle("تعديل العمولة")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("إغلاق") { editingCommission = nil }
                }
            }
        }
    }

    // MARK: - Role Editor Sheet
    private func roleEditor(_ user: AppUser) -> some View {
        NavigationStack {
            VStack(spacing: SofraSpacing.xl) {
                Image(systemName: "person.circle.fill")
                    .font(.system(size: 60))
                    .foregroundStyle(roleColor(user.role))

                Text(user.displayName)
                    .font(SofraTypography.title2)

                Text(user.email)
                    .font(SofraTypography.body)
                    .foregroundStyle(SofraColors.textMuted)

                VStack(spacing: SofraSpacing.sm) {
                    Text("تغيير الدور")
                        .font(SofraTypography.headline)

                    Picker("", selection: $selectedRole) {
                        ForEach(UserRole.allCases, id: \.self) { role in
                            Text(roleLabel(role)).tag(role)
                        }
                    }
                    .pickerStyle(.wheel)
                    .frame(height: 150)
                }

                SofraButton(title: "حفظ الدور", icon: "checkmark") {
                    Task {
                        await vm.updateUserRole(
                            userId: user.uid,
                            newRole: selectedRole,
                            token: try? await appState.validToken()
                        )
                        editingUserRole = nil
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                Spacer()
            }
            .padding(.top, SofraSpacing.xl)
            .ramadanBackground()
            .navigationTitle("تعديل الدور")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("إغلاق") { editingUserRole = nil }
                }
            }
        }
    }

    // MARK: - Helper Views
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

    private func userStatBadge(_ title: String, count: Int, icon: String, color: Color) -> some View {
        HStack(spacing: SofraSpacing.sm) {
            Text("\(count)")
                .font(SofraTypography.headline)
                .foregroundStyle(color)
            Spacer()
            HStack(spacing: SofraSpacing.xs) {
                Text(title)
                    .font(SofraTypography.caption)
                Image(systemName: icon)
                    .foregroundStyle(color)
            }
        }
        .padding(SofraSpacing.sm)
        .background(color.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private func infoRow(_ label: String, value: String) -> some View {
        HStack {
            Text(value)
                .font(SofraTypography.body)
                .foregroundStyle(SofraColors.textPrimary)
            Spacer()
            Text(label)
                .font(SofraTypography.body)
                .foregroundStyle(SofraColors.textSecondary)
        }
    }

    private func quickAction(_ title: String, icon: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: SofraSpacing.sm) {
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundStyle(color)
                Text(title)
                    .font(SofraTypography.caption)
                    .foregroundStyle(SofraColors.textPrimary)
            }
            .frame(maxWidth: .infinity)
            .padding(SofraSpacing.md)
            .background(color.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    private func roleLabel(_ role: UserRole) -> String {
        switch role {
        case .customer: return "عميل"
        case .owner: return "مالك مطعم"
        case .courier: return "مندوب"
        case .admin: return "مدير"
        case .developer: return "مطور"
        case .supervisor: return "مشرف"
        case .social_media: return "تواصل اجتماعي"
        case .support: return "دعم فني"
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

// Make Restaurant Identifiable as sheet item
extension Restaurant: @retroactive Identifiable, @retroactive Equatable, @retroactive Hashable {
    public static func == (lhs: Restaurant, rhs: Restaurant) -> Bool { lhs.id == rhs.id }
    public func hash(into hasher: inout Hasher) { hasher.combine(id) }
}

// Make AppUser equatable/hashable for sheet item
extension AppUser: @retroactive Equatable, @retroactive Hashable {
    public static func == (lhs: AppUser, rhs: AppUser) -> Bool { lhs.uid == rhs.uid }
    public func hash(into hasher: inout Hasher) { hasher.combine(uid) }
}

#Preview {
    NavigationStack {
        DeveloperDashboardView()
            .environment(AppState())
    }
}
