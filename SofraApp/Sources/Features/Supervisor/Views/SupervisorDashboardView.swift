// SupervisorDashboardView.swift
// Supervisor dashboard — manage orders, restaurants, and users

import SwiftUI

struct SupervisorDashboardView: View {
    @Environment(AppState.self) var appState
    @State private var vm = SupervisorDashboardViewModel()
    @State private var selectedTab = 0
    
    // Registration sheet state
    @State private var showRegisterRestaurant = false
    @State private var regRestaurantName = ""
    @State private var regEmail = ""
    @State private var regPassword = ""
    @State private var regPhone = ""
    @State private var regCity = ""
    @State private var isRegistering = false
    @State private var registrationError: String?
    @State private var registrationSuccess = false
    
    // Selected restaurant for orders
    @State private var selectedRestaurantForOrders: Restaurant?

    var body: some View {
        VStack(spacing: 0) {
            // Tab Bar
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: SofraSpacing.sm) {
                    tabButton("نظرة عامة", icon: "chart.bar.fill", tag: 0)
                    tabButton("مطاعمي", icon: "star.fill", tag: 4)
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
                myRestaurantsTab.tag(4)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
        }
        .ramadanBackground()
        .navigationTitle("لوحة المشرف")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await vm.loadDashboard(token: try? await appState.validToken())
        }
        .sheet(isPresented: $showRegisterRestaurant) {
            registerRestaurantSheet
        }
        .sheet(item: $selectedRestaurantForOrders) { restaurant in
            restaurantOrdersSheet(restaurant)
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
    
    // MARK: - My Restaurants Tab
    private var myRestaurantsTab: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.md) {
                // Add restaurant button
                Button { showRegisterRestaurant = true } label: {
                    HStack(spacing: SofraSpacing.sm) {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 22))
                        Text("تسجيل مطعم جديد")
                            .font(SofraTypography.headline)
                    }
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, SofraSpacing.md)
                    .background(
                        LinearGradient(
                            colors: [SofraColors.success, SofraColors.success.opacity(0.8)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .shadow(color: SofraColors.success.opacity(0.3), radius: 8, y: 4)
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)
                
                let myRestaurants = vm.myRestaurants(supervisorId: appState.currentUser?.uid ?? "")
                
                if myRestaurants.isEmpty {
                    EmptyStateView(
                        icon: "storefront",
                        title: "لا توجد مطاعم مسجلة",
                        message: "المطاعم التي تسجلها ستظهر هنا"
                    )
                    .padding(.top, SofraSpacing.xxxl)
                } else {
                    // Stats for my restaurants
                    let myOrders = vm.ordersForMyRestaurants(supervisorId: appState.currentUser?.uid ?? "")
                    let pendingCount = myOrders.filter { $0.status == .pending }.count
                    let activeCount = myOrders.filter { $0.status != .delivered && $0.status != .cancelled && $0.status != .pending }.count
                    let deliveredCount = myOrders.filter { $0.status == .delivered }.count
                    let totalRevenue = myOrders.filter { $0.status == .delivered }.reduce(0.0) { $0 + $1.total }
                    
                    // My stats card
                    SofraCard {
                        VStack(spacing: SofraSpacing.md) {
                            HStack {
                                Text("\(myRestaurants.count)")
                                    .font(SofraTypography.title2)
                                    .foregroundStyle(SofraColors.primary)
                                Spacer()
                                HStack(spacing: SofraSpacing.xs) {
                                    Text("عدد مطاعمي")
                                        .font(SofraTypography.headline)
                                    Image(systemName: "storefront.fill")
                                        .foregroundStyle(SofraColors.primary)
                                }
                            }
                            
                            Divider()
                            
                            HStack(spacing: SofraSpacing.lg) {
                                VStack(spacing: 2) {
                                    Text("\(pendingCount)")
                                        .font(SofraTypography.headline)
                                        .foregroundStyle(SofraColors.warning)
                                    Text("بانتظار")
                                        .font(SofraTypography.caption2)
                                        .foregroundStyle(SofraColors.textMuted)
                                }
                                
                                VStack(spacing: 2) {
                                    Text("\(activeCount)")
                                        .font(SofraTypography.headline)
                                        .foregroundStyle(SofraColors.info)
                                    Text("نشطة")
                                        .font(SofraTypography.caption2)
                                        .foregroundStyle(SofraColors.textMuted)
                                }
                                
                                VStack(spacing: 2) {
                                    Text("\(deliveredCount)")
                                        .font(SofraTypography.headline)
                                        .foregroundStyle(SofraColors.success)
                                    Text("مكتملة")
                                        .font(SofraTypography.caption2)
                                        .foregroundStyle(SofraColors.textMuted)
                                }
                                
                                VStack(spacing: 2) {
                                    Text(String(format: "%.0f", totalRevenue))
                                        .font(SofraTypography.headline)
                                        .foregroundStyle(SofraColors.gold500)
                                    Text("ر.س")
                                        .font(SofraTypography.caption2)
                                        .foregroundStyle(SofraColors.textMuted)
                                }
                            }
                        }
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                    
                    Text("المطاعم المسجلة (\(myRestaurants.count))")
                        .font(SofraTypography.title3)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                        .padding(.horizontal, SofraSpacing.screenHorizontal)
                    
                    ForEach(myRestaurants, id: \.id) { restaurant in
                        myRestaurantRow(restaurant)
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
    
    // MARK: - My Restaurant Row
    private func myRestaurantRow(_ restaurant: Restaurant) -> some View {
        let restaurantOrders = vm.orders.filter { $0.restaurantId == restaurant.id }
        let pendingCount = restaurantOrders.filter { $0.status == .pending }.count
        let activeCount = restaurantOrders.filter { $0.status != .delivered && $0.status != .cancelled && $0.status != .pending }.count
        
        return Button {
            selectedRestaurantForOrders = restaurant
        } label: {
            VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
                HStack {
                    // Orders badge
                    if pendingCount > 0 {
                        HStack(spacing: 4) {
                            Text("\(pendingCount)")
                                .font(.caption.bold())
                            Image(systemName: "exclamationmark.circle.fill")
                        }
                        .foregroundStyle(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(SofraColors.warning)
                        .clipShape(Capsule())
                    }
                    
                    if activeCount > 0 {
                        HStack(spacing: 4) {
                            Text("\(activeCount)")
                                .font(.caption.bold())
                            Image(systemName: "clock.fill")
                        }
                        .foregroundStyle(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(SofraColors.info)
                        .clipShape(Capsule())
                    }
                    
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(restaurant.name)
                            .font(SofraTypography.headline)
                            .foregroundStyle(SofraColors.textPrimary)
                        if let city = restaurant.city {
                            Text(city)
                                .font(SofraTypography.caption)
                                .foregroundStyle(SofraColors.textMuted)
                        }
                    }
                    
                    ZStack {
                        Circle()
                            .fill(SofraColors.primary.opacity(0.1))
                            .frame(width: 44, height: 44)
                        Image(systemName: "storefront.fill")
                            .foregroundStyle(SofraColors.primary)
                    }
                }
                
                HStack {
                    Image(systemName: "chevron.left")
                        .font(.caption)
                        .foregroundStyle(SofraColors.textMuted)
                    
                    Text("عرض الطلبات")
                        .font(SofraTypography.caption)
                        .foregroundStyle(SofraColors.info)
                    
                    Spacer()
                    
                    if let phone = restaurant.phone {
                        Text(phone)
                            .font(SofraTypography.caption)
                            .foregroundStyle(SofraColors.textSecondary)
                    }
                }
            }
            .padding(SofraSpacing.cardPadding)
            .background(SofraColors.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
            .shadow(color: .black.opacity(0.04), radius: 6, y: 3)
            .overlay(alignment: .topLeading) {
                if pendingCount > 0 {
                    Circle()
                        .fill(SofraColors.warning)
                        .frame(width: 10, height: 10)
                        .offset(x: 8, y: 8)
                }
            }
        }
        .padding(.horizontal, SofraSpacing.screenHorizontal)
    }
    
    // MARK: - Register Restaurant Sheet
    private var registerRestaurantSheet: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: SofraSpacing.lg) {
                    // Header
                    VStack(spacing: SofraSpacing.sm) {
                        ZStack {
                            Circle()
                                .fill(SofraColors.success.opacity(0.1))
                                .frame(width: 80, height: 80)
                            Image(systemName: "storefront.fill")
                                .font(.system(size: 36))
                                .foregroundStyle(SofraColors.success)
                        }
                        
                        Text("تسجيل مطعم جديد")
                            .font(SofraTypography.title2)
                        
                        Text("سيتم إنشاء حساب للمطعم وربطه بك كمشرف")
                            .font(SofraTypography.caption)
                            .foregroundStyle(SofraColors.textMuted)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top, SofraSpacing.md)
                    
                    VStack(spacing: SofraSpacing.md) {
                        SofraTextField(
                            label: "اسم المطعم",
                            icon: "storefront",
                            text: $regRestaurantName,
                            placeholder: "اسم المطعم"
                        )
                        
                        SofraTextField(
                            label: "البريد الإلكتروني",
                            icon: "envelope",
                            text: $regEmail,
                            placeholder: "email@example.com",
                            keyboardType: .emailAddress
                        )
                        
                        SofraTextField(
                            label: "كلمة المرور",
                            icon: "lock",
                            text: $regPassword,
                            placeholder: "••••••••",
                            isSecure: true
                        )
                        
                        SofraTextField(
                            label: "رقم الهاتف",
                            icon: "phone",
                            text: $regPhone,
                            placeholder: "05xxxxxxxx",
                            keyboardType: .phonePad
                        )
                        
                        SofraTextField(
                            label: "المدينة",
                            icon: "mappin",
                            text: $regCity,
                            placeholder: "المدينة"
                        )
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                    
                    if let error = registrationError {
                        HStack(spacing: SofraSpacing.xs) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundStyle(SofraColors.error)
                            Text(error)
                                .font(SofraTypography.caption)
                                .foregroundStyle(SofraColors.error)
                        }
                        .padding(.horizontal, SofraSpacing.screenHorizontal)
                    }
                    
                    if registrationSuccess {
                        HStack(spacing: SofraSpacing.xs) {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(SofraColors.success)
                            Text("تم تسجيل المطعم بنجاح!")
                                .font(SofraTypography.calloutSemibold)
                                .foregroundStyle(SofraColors.success)
                        }
                        .padding(.horizontal, SofraSpacing.screenHorizontal)
                    }
                    
                    SofraButton(
                        title: isRegistering ? "جاري التسجيل..." : "تسجيل المطعم",
                        icon: "checkmark.circle.fill",
                        style: .primary,
                        isLoading: isRegistering,
                        isDisabled: !isRegistrationFormValid
                    ) {
                        Task { await registerRestaurant() }
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                    
                    SofraButton(title: "إلغاء", style: .ghost) {
                        resetRegistrationForm()
                        showRegisterRestaurant = false
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                    
                    Spacer(minLength: SofraSpacing.xxxl)
                }
            }
            .navigationTitle("تسجيل مطعم")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("إغلاق") {
                        resetRegistrationForm()
                        showRegisterRestaurant = false
                    }
                }
            }
        }
        .presentationDetents([.large])
    }
    
    private var isRegistrationFormValid: Bool {
        !regRestaurantName.trimmingCharacters(in: .whitespaces).isEmpty &&
        !regEmail.trimmingCharacters(in: .whitespaces).isEmpty &&
        regEmail.contains("@") &&
        regPassword.count >= 6 &&
        !regPhone.trimmingCharacters(in: .whitespaces).isEmpty &&
        !regCity.trimmingCharacters(in: .whitespaces).isEmpty
    }
    
    private func registerRestaurant() async {
        guard let supervisorId = appState.currentUser?.uid,
              let token = try? await appState.validToken() else {
            registrationError = "خطأ في المصادقة"
            return
        }
        
        isRegistering = true
        registrationError = nil
        registrationSuccess = false
        
        do {
            _ = try await vm.registerRestaurantOwner(
                email: regEmail.trimmingCharacters(in: .whitespaces).lowercased(),
                password: regPassword,
                restaurantName: regRestaurantName.trimmingCharacters(in: .whitespaces),
                phone: regPhone.trimmingCharacters(in: .whitespaces),
                city: regCity.trimmingCharacters(in: .whitespaces),
                supervisorId: supervisorId,
                supervisorToken: token
            )
            
            registrationSuccess = true
            
            // Close sheet after delay
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                resetRegistrationForm()
                showRegisterRestaurant = false
            }
        } catch {
            Logger.log("Registration error: \(error)", level: .error)
            if let apiError = error as? APIError {
                switch apiError {
                case .serverError(let message):
                    if message.contains("EMAIL_EXISTS") {
                        registrationError = "البريد الإلكتروني مستخدم بالفعل"
                    } else if message.contains("WEAK_PASSWORD") {
                        registrationError = "كلمة المرور ضعيفة"
                    } else if message.contains("INVALID_EMAIL") {
                        registrationError = "البريد الإلكتروني غير صالح"
                    } else {
                        registrationError = "فشل التسجيل: \(message)"
                    }
                default:
                    registrationError = "حدث خطأ غير متوقع"
                }
            } else {
                registrationError = "فشل التسجيل: \(error.localizedDescription)"
            }
        }
        
        isRegistering = false
    }
    
    private func resetRegistrationForm() {
        regRestaurantName = ""
        regEmail = ""
        regPassword = ""
        regPhone = ""
        regCity = ""
        registrationError = nil
        registrationSuccess = false
    }
    
    // MARK: - Restaurant Orders Sheet
    private func restaurantOrdersSheet(_ restaurant: Restaurant) -> some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: SofraSpacing.md) {
                    // Restaurant header
                    SofraCard {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                if let phone = restaurant.phone {
                                    Text(phone)
                                        .font(SofraTypography.caption)
                                        .foregroundStyle(SofraColors.textMuted)
                                }
                                if let city = restaurant.city {
                                    Text(city)
                                        .font(SofraTypography.caption)
                                        .foregroundStyle(SofraColors.textMuted)
                                }
                            }
                            
                            Spacer()
                            
                            VStack(alignment: .trailing, spacing: 2) {
                                Text(restaurant.name)
                                    .font(SofraTypography.title3)
                                StatusBadge(
                                    text: restaurant.isOpen ? "مفتوح" : "مغلق",
                                    color: restaurant.isOpen ? SofraColors.success : SofraColors.error
                                )
                            }
                        }
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                    
                    let restaurantOrders = vm.orders
                        .filter { $0.restaurantId == restaurant.id }
                        .sorted { ($0.createdAt ?? .distantPast) > ($1.createdAt ?? .distantPast) }
                    
                    if restaurantOrders.isEmpty {
                        EmptyStateView(
                            icon: "list.clipboard",
                            title: "لا توجد طلبات",
                            message: "لم يتم استلام أي طلبات بعد"
                        )
                        .padding(.top, SofraSpacing.xxxl)
                    } else {
                        // Order stats
                        HStack(spacing: SofraSpacing.md) {
                            miniStat("جديد", count: restaurantOrders.filter { $0.status == .pending }.count, color: SofraColors.warning)
                            miniStat("نشط", count: restaurantOrders.filter { $0.status != .delivered && $0.status != .cancelled && $0.status != .pending }.count, color: SofraColors.info)
                            miniStat("مكتمل", count: restaurantOrders.filter { $0.status == .delivered }.count, color: SofraColors.success)
                        }
                        .padding(.horizontal, SofraSpacing.screenHorizontal)
                        
                        ForEach(restaurantOrders) { order in
                            supervisorOrderRow(order)
                        }
                    }
                    
                    Spacer(minLength: SofraSpacing.xxxl)
                }
                .padding(.top, SofraSpacing.md)
            }
            .ramadanBackground()
            .navigationTitle("طلبات \(restaurant.name)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("إغلاق") { selectedRestaurantForOrders = nil }
                }
            }
        }
        .presentationDetents([.large])
    }
}

#Preview {
    NavigationStack {
        SupervisorDashboardView()
            .environment(AppState())
    }
}
