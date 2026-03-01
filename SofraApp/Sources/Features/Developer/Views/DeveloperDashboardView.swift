// DeveloperDashboardView.swift
// لوحة تحكم المطور - تصميم فخم بأيقونات واضحة

import SwiftUI

// MARK: - Main Dashboard View
struct DeveloperDashboardView: View {
    @Environment(AppState.self) var appState
    @State private var vm = DeveloperDashboardViewModel()
    @State private var selectedSection: DashboardSection?
    @State private var showMessaging = false
    
    // Sheets
    @State private var editingCommission: Restaurant?
    @State private var editingUserRole: AppUser?
    @State private var selectedRole: UserRole = .customer
    
    // Package management
    @State private var showPriceEditor = false
    @State private var editPremiumMonthly: String = "99"
    @State private var editPremiumYearly: String = "999"
    @State private var packageRequests: [PackageRequest] = []
    @State private var loadingRequests = false
    @State private var isSavingPrices = false
    
    enum DashboardSection: String, CaseIterable, Identifiable {
        case restaurants = "المطاعم"
        case families = "الأسر المنتجة"
        case supervisors = "المشرفات"
        case users = "المستخدمين"
        case reports = "التقارير"
        case licenses = "التراخيص"
        case settings = "الإعدادات"
        
        var id: String { rawValue }
        
        var icon: String {
            switch self {
            case .restaurants: return "fork.knife"
            case .families: return "house.fill"
            case .supervisors: return "person.2.badge.gearshape.fill"
            case .users: return "person.3.fill"
            case .reports: return "chart.bar.xaxis"
            case .licenses: return "doc.text.fill"
            case .settings: return "gearshape.fill"
            }
        }
        
        var color: Color {
            switch self {
            case .restaurants: return Color(hex: "#F97316")
            case .families: return Color(hex: "#8B5CF6")
            case .supervisors: return Color(hex: "#06B6D4")
            case .users: return Color(hex: "#3B82F6")
            case .reports: return Color(hex: "#10B981")
            case .licenses: return Color(hex: "#F59E0B")
            case .settings: return Color(hex: "#6366F1")
            }
        }
        
        var gradient: LinearGradient {
            LinearGradient(
                colors: [color, color.opacity(0.7)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: SofraSpacing.lg) {
                    // Hero Stats
                    heroStatsSection
                    
                    // Quick Stats Row
                    quickStatsRow
                    
                    // Section Icons Grid
                    sectionIconsGrid
                    
                    Spacer(minLength: SofraSpacing.xxxl)
                }
                .padding(.top, SofraSpacing.md)
            }
            .ramadanBackground()
            .navigationTitle("لوحة التحكم")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button { showMessaging = true } label: {
                        Image(systemName: "paperplane.fill")
                            .foregroundStyle(SofraColors.gold400)
                    }
                }
            }
            .task {
                await vm.loadDashboard(token: try? await appState.validToken())
            }
            .refreshable {
                await vm.loadDashboard(token: try? await appState.validToken())
            }
            .sheet(item: $selectedSection) { section in
                sectionDetailView(section)
            }
            .sheet(isPresented: $showMessaging) {
                DevMessagingView()
            }
            .sheet(item: $editingCommission) { restaurant in
                commissionEditorSheet(restaurant)
            }
            .sheet(item: $editingUserRole) { user in
                roleEditorSheet(user)
            }
        }
    }
    
    // MARK: - Hero Stats Section
    private var heroStatsSection: some View {
        VStack(spacing: SofraSpacing.md) {
            // Platform Earnings
            ZStack {
                RoundedRectangle(cornerRadius: 24, style: .continuous)
                    .fill(
                        LinearGradient(
                            stops: [
                                .init(color: SofraColors.gold600, location: 0),
                                .init(color: SofraColors.gold500, location: 0.5),
                                .init(color: SofraColors.gold400, location: 1)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .shadow(color: SofraColors.gold500.opacity(0.4), radius: 20, y: 10)
                
                VStack(spacing: SofraSpacing.sm) {
                    Image(systemName: "chart.line.uptrend.xyaxis")
                        .font(.system(size: 36, weight: .semibold))
                        .foregroundStyle(.white.opacity(0.9))
                    
                    Text("أرباح المنصة")
                        .font(SofraTypography.calloutSemibold)
                        .foregroundStyle(.white.opacity(0.8))
                    
                    Text("\(vm.netPlatformEarnings, specifier: "%.2f") ر.س")
                        .font(.system(size: 36, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                    
                    HStack(spacing: SofraSpacing.xl) {
                        VStack(spacing: 2) {
                            Text("\(vm.totalCommission, specifier: "%.0f")")
                                .font(SofraTypography.headline)
                            Text("رسوم الخدمة")
                                .font(.caption2)
                        }
                        
                        Rectangle()
                            .fill(.white.opacity(0.3))
                            .frame(width: 1, height: 30)
                        
                        VStack(spacing: 2) {
                            Text("\(vm.courierPlatformFees, specifier: "%.0f")")
                                .font(SofraTypography.headline)
                            Text("رسوم المندوبين")
                                .font(.caption2)
                        }
                    }
                    .foregroundStyle(.white.opacity(0.9))
                }
                .padding(.vertical, SofraSpacing.xl)
            }
            .frame(height: 220)
            .padding(.horizontal, SofraSpacing.screenHorizontal)
        }
    }
    
    // MARK: - Quick Stats Row
    private var quickStatsRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: SofraSpacing.md) {
                quickStatCard(
                    title: "الطلبات",
                    value: "\(vm.totalOrders)",
                    subtitle: "اليوم: \(vm.todayOrders)",
                    icon: "bag.fill",
                    color: SofraColors.primary
                )
                
                quickStatCard(
                    title: "الإيرادات",
                    value: "\(Int(vm.totalRevenue))",
                    subtitle: "اليوم: \(Int(vm.todayRevenue))",
                    icon: "banknote.fill",
                    color: SofraColors.success
                )
                
                quickStatCard(
                    title: "المطاعم",
                    value: "\(vm.totalRestaurants)",
                    subtitle: "موثق: \(vm.verifiedRestaurants.count)",
                    icon: "storefront.fill",
                    color: Color(hex: "#F97316")
                )
                
                quickStatCard(
                    title: "المستخدمين",
                    value: "\(vm.users.count)",
                    subtitle: "عملاء: \(vm.customerCount)",
                    icon: "person.3.fill",
                    color: SofraColors.info
                )
            }
            .padding(.horizontal, SofraSpacing.screenHorizontal)
        }
    }
    
    private func quickStatCard(title: String, value: String, subtitle: String, icon: String, color: Color) -> some View {
        VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
            HStack {
                Spacer()
                ZStack {
                    Circle()
                        .fill(color.opacity(0.15))
                        .frame(width: 40, height: 40)
                    Image(systemName: icon)
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(color)
                }
            }
            
            Text(value)
                .font(.system(size: 28, weight: .bold, design: .rounded))
                .foregroundStyle(SofraColors.textPrimary)
            
            Text(title)
                .font(SofraTypography.calloutSemibold)
                .foregroundStyle(SofraColors.textSecondary)
            
            Text(subtitle)
                .font(SofraTypography.caption2)
                .foregroundStyle(SofraColors.textMuted)
        }
        .frame(width: 140)
        .padding(SofraSpacing.md)
        .background(SofraColors.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .shadow(color: .black.opacity(0.04), radius: 8, y: 4)
    }
    
    // MARK: - Section Icons Grid
    private var sectionIconsGrid: some View {
        VStack(alignment: .trailing, spacing: SofraSpacing.md) {
            Text("الأقسام")
                .font(SofraTypography.title3)
                .foregroundStyle(SofraColors.textPrimary)
                .padding(.horizontal, SofraSpacing.screenHorizontal)
            
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: SofraSpacing.md) {
                ForEach(DashboardSection.allCases) { section in
                    sectionIconButton(section)
                }
            }
            .padding(.horizontal, SofraSpacing.screenHorizontal)
        }
    }
    
    private func sectionIconButton(_ section: DashboardSection) -> some View {
        Button {
            selectedSection = section
        } label: {
            VStack(spacing: SofraSpacing.sm) {
                ZStack {
                    Circle()
                        .fill(section.gradient)
                        .frame(width: 64, height: 64)
                        .shadow(color: section.color.opacity(0.4), radius: 8, y: 4)
                    
                    Image(systemName: section.icon)
                        .font(.system(size: 26, weight: .semibold))
                        .foregroundStyle(.white)
                }
                
                Text(section.rawValue)
                    .font(SofraTypography.calloutSemibold)
                    .foregroundStyle(SofraColors.textPrimary)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, SofraSpacing.md)
            .background(SofraColors.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .shadow(color: .black.opacity(0.03), radius: 6, y: 3)
        }
    }
    
    // MARK: - Section Detail Views
    @ViewBuilder
    private func sectionDetailView(_ section: DashboardSection) -> some View {
        NavigationStack {
            Group {
                switch section {
                case .restaurants:
                    restaurantsDetailView
                case .families:
                    familiesDetailView
                case .supervisors:
                    supervisorsDetailView
                case .users:
                    usersDetailView
                case .reports:
                    reportsDetailView
                case .licenses:
                    licensesDetailView
                case .settings:
                    settingsDetailView
                }
            }
            .navigationTitle(section.rawValue)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("إغلاق") { selectedSection = nil }
                }
            }
        }
        .presentationDetents([.large])
    }
}

// MARK: - Restaurants Section
extension DeveloperDashboardView {
    private var restaurantsDetailView: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.md) {
                // Stats
                HStack(spacing: SofraSpacing.md) {
                    restaurantStatCard("نشط", count: vm.verifiedRestaurants.filter { $0.isOpen }.count, color: SofraColors.success)
                    restaurantStatCard("موقوف", count: vm.verifiedRestaurants.filter { !$0.isOpen }.count, color: SofraColors.error)
                    restaurantStatCard("بانتظار", count: vm.unverifiedRestaurants.count, color: SofraColors.warning)
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)
                
                // Restaurants List
                if vm.restaurants.isEmpty {
                    EmptyStateView(icon: "storefront", title: "لا توجد مطاعم", message: "")
                        .padding(.top, SofraSpacing.xxxl)
                } else {
                    ForEach(vm.restaurants, id: \.id) { restaurant in
                        restaurantDetailCard(restaurant)
                    }
                }
            }
            .padding(.top, SofraSpacing.md)
        }
        .ramadanBackground()
    }
    
    private func restaurantStatCard(_ title: String, count: Int, color: Color) -> some View {
        VStack(spacing: SofraSpacing.xs) {
            Text("\(count)")
                .font(.system(size: 28, weight: .bold, design: .rounded))
                .foregroundStyle(color)
            Text(title)
                .font(SofraTypography.caption)
                .foregroundStyle(SofraColors.textMuted)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, SofraSpacing.md)
        .background(color.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
    
    private func restaurantDetailCard(_ restaurant: Restaurant) -> some View {
        let restaurantOrders = vm.orders.filter { $0.restaurantId == restaurant.id }
        let totalSales = restaurantOrders.filter { $0.status == .delivered }.reduce(0.0) { $0 + $1.total }
        
        return VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
            // Header
            HStack {
                // Status Badge
                HStack(spacing: 4) {
                    Circle()
                        .fill(restaurant.isVerified ? (restaurant.isOpen ? SofraColors.success : SofraColors.error) : SofraColors.warning)
                        .frame(width: 8, height: 8)
                    Text(restaurant.isVerified ? (restaurant.isOpen ? "نشط" : "موقوف") : "بانتظار")
                        .font(SofraTypography.caption2)
                        .foregroundStyle(restaurant.isVerified ? (restaurant.isOpen ? SofraColors.success : SofraColors.error) : SofraColors.warning)
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(restaurant.isVerified ? (restaurant.isOpen ? SofraColors.success.opacity(0.1) : SofraColors.error.opacity(0.1)) : SofraColors.warning.opacity(0.1))
                .clipShape(Capsule())
                
                Spacer()
                
                Text(restaurant.name)
                    .font(SofraTypography.headline)
                    .foregroundStyle(SofraColors.textPrimary)
            }
            
            Divider()
            
            // Stats
            HStack(spacing: SofraSpacing.lg) {
                VStack(spacing: 2) {
                    Text("\(restaurantOrders.count)")
                        .font(SofraTypography.headline)
                        .foregroundStyle(SofraColors.info)
                    Text("الطلبات")
                        .font(SofraTypography.caption2)
                        .foregroundStyle(SofraColors.textMuted)
                }
                
                VStack(spacing: 2) {
                    Text("\(Int(totalSales))")
                        .font(SofraTypography.headline)
                        .foregroundStyle(SofraColors.success)
                    Text("المبيعات")
                        .font(SofraTypography.caption2)
                        .foregroundStyle(SofraColors.textMuted)
                }
                
                Spacer()
                
                // Actions
                HStack(spacing: SofraSpacing.sm) {
                    Button {
                        editingCommission = restaurant
                    } label: {
                        Image(systemName: "slider.horizontal.3")
                            .font(.system(size: 16))
                            .foregroundStyle(SofraColors.info)
                            .padding(10)
                            .background(SofraColors.info.opacity(0.1))
                            .clipShape(Circle())
                    }
                    
                    Button {
                        Task {
                            await vm.verifyRestaurant(restaurantId: restaurant.id, verified: !restaurant.isVerified, token: try? await appState.validToken())
                        }
                    } label: {
                        Image(systemName: restaurant.isVerified ? "xmark.shield" : "checkmark.shield")
                            .font(.system(size: 16))
                            .foregroundStyle(restaurant.isVerified ? SofraColors.error : SofraColors.success)
                            .padding(10)
                            .background((restaurant.isVerified ? SofraColors.error : SofraColors.success).opacity(0.1))
                            .clipShape(Circle())
                    }
                }
            }
            
            // Contact Info
            if let phone = restaurant.phone, !phone.isEmpty {
                HStack {
                    Text(phone)
                        .font(SofraTypography.caption)
                        .foregroundStyle(SofraColors.textMuted)
                    Image(systemName: "phone.fill")
                        .font(.caption2)
                        .foregroundStyle(SofraColors.textMuted)
                }
            }
        }
        .padding(SofraSpacing.cardPadding)
        .background(SofraColors.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
        .shadow(color: .black.opacity(0.04), radius: 6, y: 3)
        .padding(.horizontal, SofraSpacing.screenHorizontal)
    }
}

// MARK: - Families Section (الأسر المنتجة)
extension DeveloperDashboardView {
    private var familiesDetailView: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.md) {
                // Info Banner
                HStack(spacing: SofraSpacing.md) {
                    Image(systemName: "info.circle.fill")
                        .font(.title2)
                        .foregroundStyle(SofraColors.info)
                    
                    VStack(alignment: .trailing, spacing: 4) {
                        Text("الأسر المنتجة")
                            .font(SofraTypography.headline)
                        Text("المطاعم المسجلة كأسر منتجة (من خلال المشرفات)")
                            .font(SofraTypography.caption)
                            .foregroundStyle(SofraColors.textMuted)
                    }
                    
                    Spacer()
                }
                .padding(SofraSpacing.md)
                .background(SofraColors.info.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .padding(.horizontal, SofraSpacing.screenHorizontal)
                
                // Families (restaurants with supervisorId)
                let families = vm.restaurants.filter { $0.supervisorId != nil }
                
                if families.isEmpty {
                    EmptyStateView(icon: "house", title: "لا توجد أسر منتجة", message: "الأسر المسجلة عن طريق المشرفات ستظهر هنا")
                        .padding(.top, SofraSpacing.xxxl)
                } else {
                    // Stats
                    HStack(spacing: SofraSpacing.md) {
                        familyStatCard("الإجمالي", count: families.count, color: SofraColors.primary)
                        familyStatCard("نشط", count: families.filter { $0.isVerified && $0.isOpen }.count, color: SofraColors.success)
                        familyStatCard("معلق", count: families.filter { !$0.isVerified }.count, color: SofraColors.warning)
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                    
                    ForEach(families, id: \.id) { family in
                        familyCard(family)
                    }
                }
            }
            .padding(.top, SofraSpacing.md)
        }
        .ramadanBackground()
    }
    
    private func familyStatCard(_ title: String, count: Int, color: Color) -> some View {
        VStack(spacing: SofraSpacing.xs) {
            Text("\(count)")
                .font(.system(size: 24, weight: .bold, design: .rounded))
                .foregroundStyle(color)
            Text(title)
                .font(SofraTypography.caption)
                .foregroundStyle(SofraColors.textMuted)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, SofraSpacing.md)
        .background(color.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
    
    private func familyCard(_ family: Restaurant) -> some View {
        let familyOrders = vm.orders.filter { $0.restaurantId == family.id }
        let earnings = familyOrders.filter { $0.status == .delivered }.reduce(0.0) { $0 + $1.netAmount }
        let menuCount = family.menuItemCount ?? 0
        
        return VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
            HStack {
                StatusBadge(
                    text: family.isVerified ? "مفعّل" : "معلق",
                    color: family.isVerified ? SofraColors.success : SofraColors.warning
                )
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 2) {
                    Text(family.name)
                        .font(SofraTypography.headline)
                    if let city = family.city {
                        Text(city)
                            .font(SofraTypography.caption)
                            .foregroundStyle(SofraColors.textMuted)
                    }
                }
                
                ZStack {
                    Circle()
                        .fill(Color(hex: "#8B5CF6").opacity(0.1))
                        .frame(width: 44, height: 44)
                    Image(systemName: "house.fill")
                        .foregroundStyle(Color(hex: "#8B5CF6"))
                }
            }
            
            Divider()
            
            HStack(spacing: SofraSpacing.lg) {
                VStack(spacing: 2) {
                    Text("\(menuCount)")
                        .font(SofraTypography.headline)
                        .foregroundStyle(SofraColors.info)
                    Text("المنتجات")
                        .font(SofraTypography.caption2)
                        .foregroundStyle(SofraColors.textMuted)
                }
                
                VStack(spacing: 2) {
                    Text("\(Int(earnings))")
                        .font(SofraTypography.headline)
                        .foregroundStyle(SofraColors.success)
                    Text("الأرباح")
                        .font(SofraTypography.caption2)
                        .foregroundStyle(SofraColors.textMuted)
                }
                
                VStack(spacing: 2) {
                    Text("\(familyOrders.count)")
                        .font(SofraTypography.headline)
                        .foregroundStyle(SofraColors.warning)
                    Text("الطلبات")
                        .font(SofraTypography.caption2)
                        .foregroundStyle(SofraColors.textMuted)
                }
                
                Spacer()
            }
        }
        .padding(SofraSpacing.cardPadding)
        .background(SofraColors.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
        .shadow(color: .black.opacity(0.04), radius: 6, y: 3)
        .padding(.horizontal, SofraSpacing.screenHorizontal)
    }
}

// MARK: - Supervisors Section
extension DeveloperDashboardView {
    private var supervisorsDetailView: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.md) {
                let supervisors = vm.users.filter { $0.role == .supervisor }
                
                // Stats
                HStack(spacing: SofraSpacing.md) {
                    supervisorStatCard("المشرفات", count: supervisors.count, icon: "person.2.fill", color: Color(hex: "#06B6D4"))
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)
                
                if supervisors.isEmpty {
                    EmptyStateView(icon: "person.2.badge.gearshape", title: "لا توجد مشرفات", message: "")
                        .padding(.top, SofraSpacing.xxxl)
                } else {
                    ForEach(supervisors, id: \.uid) { supervisor in
                        supervisorCard(supervisor)
                    }
                }
            }
            .padding(.top, SofraSpacing.md)
        }
        .ramadanBackground()
    }
    
    private func supervisorStatCard(_ title: String, count: Int, icon: String, color: Color) -> some View {
        HStack(spacing: SofraSpacing.md) {
            ZStack {
                Circle()
                    .fill(color.opacity(0.15))
                    .frame(width: 48, height: 48)
                Image(systemName: icon)
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundStyle(color)
            }
            
            VStack(alignment: .leading, spacing: 2) {
                Text("\(count)")
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundStyle(color)
                Text(title)
                    .font(SofraTypography.caption)
                    .foregroundStyle(SofraColors.textMuted)
            }
            
            Spacer()
        }
        .padding(SofraSpacing.md)
        .background(SofraColors.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.04), radius: 6, y: 3)
    }
    
    private func supervisorCard(_ supervisor: AppUser) -> some View {
        let supervisorRestaurants = vm.restaurants.filter { $0.supervisorId == supervisor.uid }
        
        return VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
            HStack {
                // Actions
                HStack(spacing: SofraSpacing.sm) {
                    Button {
                        editingUserRole = supervisor
                    } label: {
                        Image(systemName: "pencil")
                            .font(.system(size: 14))
                            .foregroundStyle(SofraColors.info)
                            .padding(8)
                            .background(SofraColors.info.opacity(0.1))
                            .clipShape(Circle())
                    }
                    
                    Button {
                        Task {
                            await vm.updateUserRole(userId: supervisor.uid, newRole: .customer, token: try? await appState.validToken())
                        }
                    } label: {
                        Image(systemName: "person.badge.minus")
                            .font(.system(size: 14))
                            .foregroundStyle(SofraColors.error)
                            .padding(8)
                            .background(SofraColors.error.opacity(0.1))
                            .clipShape(Circle())
                    }
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 2) {
                    Text(supervisor.name ?? "مشرفة")
                        .font(SofraTypography.headline)
                    Text(supervisor.email ?? "")
                        .font(SofraTypography.caption)
                        .foregroundStyle(SofraColors.textMuted)
                }
                
                ZStack {
                    Circle()
                        .fill(Color(hex: "#06B6D4").opacity(0.1))
                        .frame(width: 44, height: 44)
                    Image(systemName: "person.badge.shield.checkmark.fill")
                        .foregroundStyle(Color(hex: "#06B6D4"))
                }
            }
            
            Divider()
            
            HStack {
                Text("\(supervisorRestaurants.count) أسرة منتجة")
                    .font(SofraTypography.caption)
                    .foregroundStyle(SofraColors.textSecondary)
                
                Spacer()
                
                Text("الصلاحيات: إدارة الأسر")
                    .font(SofraTypography.caption)
                    .foregroundStyle(SofraColors.textMuted)
            }
        }
        .padding(SofraSpacing.cardPadding)
        .background(SofraColors.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
        .shadow(color: .black.opacity(0.04), radius: 6, y: 3)
        .padding(.horizontal, SofraSpacing.screenHorizontal)
    }
}

// MARK: - Users Section
extension DeveloperDashboardView {
    private var usersDetailView: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.md) {
                // Stats
                LazyVGrid(columns: [.init(.flexible()), .init(.flexible())], spacing: SofraSpacing.md) {
                    userStatCard("العملاء", count: vm.customerCount, icon: "person.fill", color: SofraColors.primary)
                    userStatCard("المطاعم", count: vm.ownerCount, icon: "storefront.fill", color: Color(hex: "#F97316"))
                    userStatCard("المندوبين", count: vm.courierCount, icon: "car.fill", color: SofraColors.warning)
                    userStatCard("المشرفات", count: vm.supervisorCount, icon: "shield.fill", color: Color(hex: "#06B6D4"))
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)
                
                // Users List
                if vm.users.isEmpty {
                    EmptyStateView(icon: "person.3", title: "لا يوجد مستخدمين", message: "")
                        .padding(.top, SofraSpacing.xxxl)
                } else {
                    ForEach(vm.users.prefix(50), id: \.uid) { user in
                        userDetailCard(user)
                    }
                }
            }
            .padding(.top, SofraSpacing.md)
        }
        .ramadanBackground()
    }
    
    private func userStatCard(_ title: String, count: Int, icon: String, color: Color) -> some View {
        VStack(spacing: SofraSpacing.sm) {
            ZStack {
                Circle()
                    .fill(color.opacity(0.15))
                    .frame(width: 44, height: 44)
                Image(systemName: icon)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(color)
            }
            
            Text("\(count)")
                .font(.system(size: 24, weight: .bold, design: .rounded))
                .foregroundStyle(color)
            
            Text(title)
                .font(SofraTypography.caption)
                .foregroundStyle(SofraColors.textMuted)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, SofraSpacing.md)
        .background(SofraColors.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.04), radius: 6, y: 3)
    }
    
    private func userDetailCard(_ user: AppUser) -> some View {
        let userOrders = vm.orders.filter { $0.customerId == user.uid }
        let totalSpent = userOrders.filter { $0.status == .delivered }.reduce(0.0) { $0 + $1.total }
        
        return VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
            HStack {
                // Actions
                HStack(spacing: SofraSpacing.sm) {
                    Button {
                        editingUserRole = user
                    } label: {
                        Image(systemName: "pencil")
                            .font(.system(size: 14))
                            .foregroundStyle(SofraColors.info)
                            .padding(8)
                            .background(SofraColors.info.opacity(0.1))
                            .clipShape(Circle())
                    }
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 2) {
                    Text(user.name ?? "مستخدم")
                        .font(SofraTypography.headline)
                    Text(roleLabel(user.role))
                        .font(SofraTypography.caption)
                        .foregroundStyle(roleColor(user.role))
                }
                
                ZStack {
                    Circle()
                        .fill(roleColor(user.role).opacity(0.1))
                        .frame(width: 40, height: 40)
                    Image(systemName: roleIcon(user.role))
                        .foregroundStyle(roleColor(user.role))
                }
            }
            
            HStack {
                Text("\(userOrders.count) طلب • \(Int(totalSpent)) ر.س")
                    .font(SofraTypography.caption)
                    .foregroundStyle(SofraColors.textMuted)
                
                Spacer()
                
                if let phone = user.phone {
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
        .padding(.horizontal, SofraSpacing.screenHorizontal)
    }
    
    private func roleLabel(_ role: UserRole) -> String {
        switch role {
        case .customer: return "عميل"
        case .owner: return "صاحب مطعم"
        case .courier: return "مندوب"
        case .admin: return "مدير"
        case .developer: return "مطور"
        case .supervisor: return "مشرفة"
        case .social_media: return "تواصل"
        case .support: return "دعم"
        case .accountant: return "محاسب"
        }
    }
    
    private func roleColor(_ role: UserRole) -> Color {
        switch role {
        case .customer: return SofraColors.primary
        case .owner: return Color(hex: "#F97316")
        case .courier: return SofraColors.warning
        case .admin: return SofraColors.error
        case .developer: return SofraColors.primaryDark
        case .supervisor: return Color(hex: "#06B6D4")
        case .social_media: return SofraColors.gold400
        case .support: return SofraColors.sky400
        case .accountant: return SofraColors.gold600
        }
    }
    
    private func roleIcon(_ role: UserRole) -> String {
        switch role {
        case .customer: return "person.fill"
        case .owner: return "storefront.fill"
        case .courier: return "car.fill"
        case .admin: return "crown.fill"
        case .developer: return "hammer.fill"
        case .supervisor: return "shield.fill"
        case .social_media: return "megaphone.fill"
        case .support: return "headphones"
        case .accountant: return "banknote.fill"
        }
    }
}

// MARK: - Reports Section
extension DeveloperDashboardView {
    private var reportsDetailView: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.lg) {
                // Revenue Report
                reportCard(
                    title: "تقرير الأرباح",
                    icon: "chart.line.uptrend.xyaxis",
                    color: SofraColors.success,
                    stats: [
                        ("إجمالي الأرباح", "\(Int(vm.netPlatformEarnings)) ر.س"),
                        ("رسوم الخدمة", "\(Int(vm.totalCommission)) ر.س"),
                        ("رسوم المندوبين", "\(Int(vm.courierPlatformFees)) ر.س")
                    ]
                )
                
                // Sales Report
                reportCard(
                    title: "تقرير المبيعات",
                    icon: "bag.fill",
                    color: SofraColors.primary,
                    stats: [
                        ("إجمالي المبيعات", "\(Int(vm.totalRevenue)) ر.س"),
                        ("مبيعات اليوم", "\(Int(vm.todayRevenue)) ر.س"),
                        ("عدد الطلبات", "\(vm.totalOrders)")
                    ]
                )
                
                // Orders Report
                reportCard(
                    title: "تقرير الطلبات",
                    icon: "list.clipboard.fill",
                    color: SofraColors.info,
                    stats: [
                        ("طلبات اليوم", "\(vm.todayOrders)"),
                        ("مكتملة", "\(vm.orders.filter { $0.status == .delivered }.count)"),
                        ("ملغية", "\(vm.orders.filter { $0.status == .cancelled }.count)")
                    ]
                )
                
                // Export Buttons
                VStack(spacing: SofraSpacing.md) {
                    Text("تصدير التقارير")
                        .font(SofraTypography.headline)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                    
                    HStack(spacing: SofraSpacing.md) {
                        exportButton(title: "PDF", icon: "doc.fill", color: SofraColors.error)
                        exportButton(title: "Excel", icon: "tablecells.fill", color: SofraColors.success)
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)
            }
            .padding(.top, SofraSpacing.md)
        }
        .ramadanBackground()
    }
    
    private func reportCard(title: String, icon: String, color: Color, stats: [(String, String)]) -> some View {
        VStack(alignment: .trailing, spacing: SofraSpacing.md) {
            HStack {
                Spacer()
                Text(title)
                    .font(SofraTypography.headline)
                ZStack {
                    Circle()
                        .fill(color.opacity(0.15))
                        .frame(width: 40, height: 40)
                    Image(systemName: icon)
                        .foregroundStyle(color)
                }
            }
            
            Divider()
            
            ForEach(stats, id: \.0) { stat in
                HStack {
                    Text(stat.1)
                        .font(SofraTypography.headline)
                        .foregroundStyle(color)
                    Spacer()
                    Text(stat.0)
                        .font(SofraTypography.body)
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
    
    private func exportButton(title: String, icon: String, color: Color) -> some View {
        Button {
            // Export functionality placeholder
        } label: {
            HStack(spacing: SofraSpacing.sm) {
                Image(systemName: icon)
                Text(title)
                    .font(SofraTypography.calloutSemibold)
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, SofraSpacing.md)
            .background(color)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }
}

// MARK: - Licenses Section
extension DeveloperDashboardView {
    private var licensesDetailView: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.md) {
                // Info
                HStack(spacing: SofraSpacing.md) {
                    Image(systemName: "doc.badge.clock")
                        .font(.title2)
                        .foregroundStyle(SofraColors.warning)
                    
                    VStack(alignment: .trailing, spacing: 4) {
                        Text("التراخيص والمستندات")
                            .font(SofraTypography.headline)
                        Text("مراجعة المستندات المرفوعة من المطاعم والأسر المنتجة")
                            .font(SofraTypography.caption)
                            .foregroundStyle(SofraColors.textMuted)
                    }
                    
                    Spacer()
                }
                .padding(SofraSpacing.md)
                .background(SofraColors.warning.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .padding(.horizontal, SofraSpacing.screenHorizontal)
                
                // Pending verifications
                let unverified = vm.unverifiedRestaurants
                
                if unverified.isEmpty {
                    EmptyStateView(icon: "checkmark.seal", title: "لا توجد طلبات معلقة", message: "جميع المستندات تمت مراجعتها")
                        .padding(.top, SofraSpacing.xxxl)
                } else {
                    ForEach(unverified, id: \.id) { restaurant in
                        licenseCard(restaurant)
                    }
                }
            }
            .padding(.top, SofraSpacing.md)
        }
        .ramadanBackground()
    }
    
    private func licenseCard(_ restaurant: Restaurant) -> some View {
        VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
            HStack {
                StatusBadge(text: "بانتظار المراجعة", color: SofraColors.warning)
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 2) {
                    Text(restaurant.name)
                        .font(SofraTypography.headline)
                    if let email = restaurant.email {
                        Text(email)
                            .font(SofraTypography.caption)
                            .foregroundStyle(SofraColors.textMuted)
                    }
                }
            }
            
            Divider()
            
            // Actions
            HStack(spacing: SofraSpacing.md) {
                Button {
                    Task {
                        await vm.verifyRestaurant(restaurantId: restaurant.id, verified: false, token: try? await appState.validToken())
                        // TODO: Send rejection notification
                    }
                } label: {
                    HStack(spacing: SofraSpacing.xs) {
                        Image(systemName: "xmark.circle.fill")
                        Text("رفض")
                    }
                    .font(SofraTypography.calloutSemibold)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, SofraSpacing.sm)
                    .background(SofraColors.error)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }
                
                Button {
                    Task {
                        await vm.verifyRestaurant(restaurantId: restaurant.id, verified: true, token: try? await appState.validToken())
                        // TODO: Send approval notification
                    }
                } label: {
                    HStack(spacing: SofraSpacing.xs) {
                        Image(systemName: "checkmark.circle.fill")
                        Text("قبول")
                    }
                    .font(SofraTypography.calloutSemibold)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, SofraSpacing.sm)
                    .background(SofraColors.success)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }
            }
        }
        .padding(SofraSpacing.cardPadding)
        .background(SofraColors.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
        .shadow(color: .black.opacity(0.04), radius: 6, y: 3)
        .padding(.horizontal, SofraSpacing.screenHorizontal)
    }
}

// MARK: - Settings Section
extension DeveloperDashboardView {
    private var settingsDetailView: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.lg) {
                // Commission Settings
                settingsGroup(title: "العمولة والرسوم", icon: "percent") {
                    settingsRow(title: "رسوم المنصة", value: "\(ServiceFee.perItem) ر.س / منتج", icon: "banknote.fill")
                    settingsRow(title: "حصة المنصة", value: "\(ServiceFee.platformShare) ر.س", icon: "building.2.fill")
                    settingsRow(title: "حصة المشرف", value: "\(ServiceFee.supervisorShare) ر.س", icon: "person.badge.shield.checkmark.fill")
                }
                
                // Payment Methods
                settingsGroup(title: "طرق الدفع", icon: "creditcard.fill") {
                    settingsRow(title: "الدفع عند الاستلام", value: "مفعّل", icon: "banknote.fill", isEnabled: true)
                    settingsRow(title: "Apple Pay", value: "قريباً", icon: "apple.logo", isEnabled: false)
                    settingsRow(title: "STC Pay", value: "قريباً", icon: "phone.fill", isEnabled: false)
                }
                
                // Notifications
                settingsGroup(title: "الإشعارات", icon: "bell.fill") {
                    settingsRow(title: "إشعارات الطلبات", value: "مفعّل", icon: "bag.fill", isEnabled: true)
                    settingsRow(title: "إشعارات المطاعم", value: "مفعّل", icon: "storefront.fill", isEnabled: true)
                }
                
                // Packages Button
                NavigationLink {
                    packagesManagementView
                } label: {
                    HStack {
                        Image(systemName: "chevron.left")
                            .foregroundStyle(SofraColors.textMuted)
                        
                        Spacer()
                        
                        Text("إدارة الباقات")
                            .font(SofraTypography.headline)
                        
                        ZStack {
                            Circle()
                                .fill(SofraColors.gold400.opacity(0.15))
                                .frame(width: 40, height: 40)
                            Image(systemName: "crown.fill")
                                .foregroundStyle(SofraColors.gold400)
                        }
                    }
                    .padding(SofraSpacing.cardPadding)
                    .background(SofraColors.cardBackground)
                    .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
                    .shadow(color: .black.opacity(0.04), radius: 6, y: 3)
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)
                
                // Promo Codes Button
                settingsGroup(title: "الأكواد الترويجية", icon: "ticket.fill") {
                    settingsRow(title: "أكواد نشطة", value: "0", icon: "checkmark.seal.fill")
                    settingsRow(title: "إضافة كود", value: "", icon: "plus.circle.fill")
                }
            }
            .padding(.top, SofraSpacing.md)
        }
        .ramadanBackground()
    }
    
    private func settingsGroup(title: String, icon: String, @ViewBuilder content: () -> some View) -> some View {
        VStack(alignment: .trailing, spacing: SofraSpacing.md) {
            HStack {
                Spacer()
                Text(title)
                    .font(SofraTypography.headline)
                Image(systemName: icon)
                    .foregroundStyle(SofraColors.primary)
            }
            .padding(.horizontal, SofraSpacing.screenHorizontal)
            
            VStack(spacing: 1) {
                content()
            }
            .background(SofraColors.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
            .shadow(color: .black.opacity(0.04), radius: 6, y: 3)
            .padding(.horizontal, SofraSpacing.screenHorizontal)
        }
    }
    
    private func settingsRow(title: String, value: String, icon: String, isEnabled: Bool? = nil) -> some View {
        HStack {
            if let isEnabled {
                Circle()
                    .fill(isEnabled ? SofraColors.success : SofraColors.textMuted)
                    .frame(width: 8, height: 8)
            }
            
            Text(value)
                .font(SofraTypography.body)
                .foregroundStyle(SofraColors.textSecondary)
            
            Spacer()
            
            Text(title)
                .font(SofraTypography.body)
            
            Image(systemName: icon)
                .foregroundStyle(SofraColors.textMuted)
                .frame(width: 24)
        }
        .padding(SofraSpacing.md)
        .background(SofraColors.cardBackground)
    }
    
    private var packagesManagementView: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.lg) {
                // Premium Monthly
                packagePriceCard(
                    title: "الباقة الشهرية",
                    price: "99",
                    period: "شهر",
                    color: SofraColors.gold400
                )
                
                // Premium Yearly
                packagePriceCard(
                    title: "الباقة السنوية",
                    price: "999",
                    period: "سنة",
                    color: SofraColors.gold500,
                    discount: "وفّر 17%"
                )
                
                // Save Button
                SofraButton(title: "حفظ التغييرات", icon: "checkmark.circle.fill") {
                    // Save prices
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)
            }
            .padding(.top, SofraSpacing.md)
        }
        .ramadanBackground()
        .navigationTitle("إدارة الباقات")
        .navigationBarTitleDisplayMode(.inline)
    }
    
    private func packagePriceCard(title: String, price: String, period: String, color: Color, discount: String? = nil) -> some View {
        VStack(alignment: .trailing, spacing: SofraSpacing.md) {
            HStack {
                if let discount {
                    Text(discount)
                        .font(SofraTypography.caption)
                        .foregroundStyle(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(SofraColors.success)
                        .clipShape(Capsule())
                }
                
                Spacer()
                
                Text(title)
                    .font(SofraTypography.headline)
                
                Image(systemName: "crown.fill")
                    .foregroundStyle(color)
            }
            
            HStack {
                Text("/ \(period)")
                    .font(SofraTypography.body)
                    .foregroundStyle(SofraColors.textMuted)
                
                Text("\(price) ر.س")
                    .font(.system(size: 32, weight: .bold, design: .rounded))
                    .foregroundStyle(color)
            }
        }
        .padding(SofraSpacing.cardPadding)
        .background(SofraColors.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
        .shadow(color: .black.opacity(0.04), radius: 6, y: 3)
        .padding(.horizontal, SofraSpacing.screenHorizontal)
    }
}

// MARK: - Commission Editor Sheet
extension DeveloperDashboardView {
    private func commissionEditorSheet(_ restaurant: Restaurant) -> some View {
        NavigationStack {
            VStack(spacing: SofraSpacing.lg) {
                // Restaurant Info
                SofraCard {
                    HStack {
                        StatusBadge(
                            text: restaurant.isVerified ? "موثق" : "غير موثق",
                            color: restaurant.isVerified ? SofraColors.success : SofraColors.warning
                        )
                        Spacer()
                        Text(restaurant.name)
                            .font(SofraTypography.headline)
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)
                
                // Fee Info
                VStack(spacing: SofraSpacing.md) {
                    HStack {
                        Text("\(ServiceFee.perItem) ر.س")
                            .font(SofraTypography.headline)
                            .foregroundStyle(SofraColors.primary)
                        Spacer()
                        Text("رسوم لكل منتج")
                            .font(SofraTypography.body)
                    }
                    
                    HStack {
                        Text("\(ServiceFee.platformShare) ر.س")
                            .font(SofraTypography.headline)
                            .foregroundStyle(SofraColors.info)
                        Spacer()
                        Text("حصة المنصة")
                            .font(SofraTypography.body)
                    }
                    
                    if restaurant.supervisorId != nil {
                        HStack {
                            Text("\(ServiceFee.supervisorShare) ر.س")
                                .font(SofraTypography.headline)
                                .foregroundStyle(SofraColors.warning)
                            Spacer()
                            Text("حصة المشرف")
                                .font(SofraTypography.body)
                        }
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)
                
                Spacer()
                
                SofraButton(title: "إغلاق", icon: "xmark") {
                    editingCommission = nil
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)
                .padding(.bottom, SofraSpacing.lg)
            }
            .padding(.top, SofraSpacing.md)
            .navigationTitle("تفاصيل الرسوم")
            .navigationBarTitleDisplayMode(.inline)
        }
        .presentationDetents([.medium])
    }
}

// MARK: - Role Editor Sheet
extension DeveloperDashboardView {
    private func roleEditorSheet(_ user: AppUser) -> some View {
        NavigationStack {
            VStack(spacing: SofraSpacing.lg) {
                // User Info
                SofraCard {
                    HStack {
                        StatusBadge(text: roleLabel(user.role), color: roleColor(user.role))
                        Spacer()
                        VStack(alignment: .trailing) {
                            Text(user.name ?? "مستخدم")
                                .font(SofraTypography.headline)
                            Text(user.email ?? "")
                                .font(SofraTypography.caption)
                                .foregroundStyle(SofraColors.textMuted)
                        }
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)
                
                // Role Selection
                VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
                    Text("تغيير الدور")
                        .font(SofraTypography.headline)
                        .padding(.horizontal, SofraSpacing.screenHorizontal)
                    
                    ForEach([UserRole.customer, .owner, .courier, .supervisor, .developer], id: \.self) { role in
                        Button {
                            selectedRole = role
                        } label: {
                            HStack {
                                if selectedRole == role {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundStyle(SofraColors.success)
                                }
                                
                                Spacer()
                                
                                Text(roleLabel(role))
                                    .font(SofraTypography.body)
                                    .foregroundStyle(SofraColors.textPrimary)
                                
                                Image(systemName: roleIcon(role))
                                    .foregroundStyle(roleColor(role))
                                    .frame(width: 24)
                            }
                            .padding(SofraSpacing.md)
                            .background(selectedRole == role ? roleColor(role).opacity(0.1) : SofraColors.cardBackground)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                        }
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                }
                
                Spacer()
                
                VStack(spacing: SofraSpacing.sm) {
                    SofraButton(title: "حفظ", icon: "checkmark.circle.fill") {
                        Task {
                            await vm.updateUserRole(userId: user.uid, newRole: selectedRole, token: try? await appState.validToken())
                            editingUserRole = nil
                        }
                    }
                    
                    SofraButton(title: "إلغاء", style: .ghost) {
                        editingUserRole = nil
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)
                .padding(.bottom, SofraSpacing.lg)
            }
            .padding(.top, SofraSpacing.md)
            .navigationTitle("تعديل المستخدم")
            .navigationBarTitleDisplayMode(.inline)
            .onAppear {
                selectedRole = user.role
            }
        }
        .presentationDetents([.large])
    }
}

#Preview {
    DeveloperDashboardView()
        .environment(AppState())
}
