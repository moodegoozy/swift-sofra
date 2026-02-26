// OwnerDashboardView.swift
// لوحة تحكم صاحب المطعم — تصميم احترافي مختلف عن واجهة العميل
// 6 تبويبات: الرئيسية، المنتجات، الطلبات، التقارير، التوظيف، الإعدادات

import SwiftUI
import PhotosUI

struct OwnerDashboardView: View {
    @Environment(AppState.self) var appState
    @State private var vm = OwnerDashboardViewModel()
    @State private var selectedTab = 0
    @State private var showWallet = false
    @State private var showAddMenuItem = false
    @State private var editingItem: MenuItem?
    @State private var deletingItem: MenuItem?
    // Photo upload
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var restaurantImage: UIImage?
    // Chat
    @State private var chatOrder: Order?
    // Restaurant info editing
    @State private var editRestName = ""
    @State private var editRestPhone = ""
    @State private var isSavingInfo = false
    @State private var infoSaveMessage: String?
    // Packages & promotions
    @State private var showPackages = false
    @State private var showPromotions = false

    var body: some View {
        VStack(spacing: 0) {
            ownerTabBar

            TabView(selection: $selectedTab) {
                ownerHome.tag(0)
                ownerProducts.tag(1)
                ownerOrders.tag(2)
                ownerReports.tag(3)
                ownerHiring.tag(4)
                ownerSettings.tag(5)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
        }
        .ramadanBackground()
        .navigationTitle(vm.restaurant?.name ?? "لوحة المطعم")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            guard let uid = appState.currentUser?.uid else { return }
            await vm.loadDashboard(ownerId: uid, token: try? await appState.validToken())
            if let rest = vm.restaurant {
                editRestName = rest.name == "مطعم" ? "" : rest.name
                editRestPhone = rest.phone ?? ""
            }
        }
        .sheet(isPresented: $showWallet) {
            WalletView(orders: vm.orders, restaurantName: vm.restaurant?.name ?? "المطعم")
        }
        .sheet(isPresented: $showAddMenuItem) {
            AddMenuItemView(vm: vm)
        }
        .sheet(item: $editingItem) { item in
            EditMenuItemView(vm: vm, item: item)
        }
        .sheet(item: $chatOrder) { order in
            OrderChatView(
                orderId: order.id,
                restaurantName: vm.restaurant?.name ?? "المطعم",
                orderStatus: order.status,
                chatRole: "owner"
            )
        }
        .sheet(isPresented: $showPackages) {
            if let rest = vm.restaurant { PackagesView(restaurant: rest) }
        }
        .sheet(isPresented: $showPromotions) {
            if let rest = vm.restaurant {
                NavigationStack {
                    OwnerPromotionsView(restaurant: rest)
                        .navigationTitle("العروض الترويجية")
                        .navigationBarTitleDisplayMode(.inline)
                }
            }
        }
        .alert("حذف الصنف", isPresented: .init(
            get: { deletingItem != nil },
            set: { if !$0 { deletingItem = nil } }
        )) {
            Button("حذف", role: .destructive) {
                if let item = deletingItem {
                    Task {
                        await vm.deleteMenuItem(
                            itemId: item.id,
                            ownerId: appState.currentUser?.uid ?? "",
                            token: try? await appState.validToken()
                        )
                    }
                    deletingItem = nil
                }
            }
            Button("إلغاء", role: .cancel) { deletingItem = nil }
        } message: {
            Text("هل أنت متأكد من حذف «\(deletingItem?.name ?? "")»؟ لا يمكن التراجع.")
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // MARK: - Tab Bar (6 tabs, scrollable)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    private var ownerTabBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: SofraSpacing.sm) {
                ownerTabPill("الرئيسية", icon: "house.fill", tag: 0)
                ownerTabPill("المنتجات", icon: "menucard.fill", tag: 1)
                ownerTabPill("الطلبات", icon: "list.clipboard.fill", tag: 2, badge: pendingOrdersCount)
                ownerTabPill("التقارير", icon: "chart.bar.fill", tag: 3)
                ownerTabPill("التوظيف", icon: "person.3.fill", tag: 4, badge: pendingApplicationsCount)
                ownerTabPill("الإعدادات", icon: "gearshape.fill", tag: 5)
            }
            .padding(.horizontal, SofraSpacing.screenHorizontal)
            .padding(.vertical, SofraSpacing.sm)
        }
        .background(SofraColors.cardBackground)
        .shadow(color: .black.opacity(0.03), radius: 2, y: 1)
    }

    private func ownerTabPill(_ title: String, icon: String, tag: Int, badge: Int = 0) -> some View {
        Button {
            withAnimation(.easeInOut(duration: 0.2)) { selectedTab = tag }
        } label: {
            HStack(spacing: SofraSpacing.xs) {
                if badge > 0 {
                    Text("\(badge)")
                        .font(.caption2.bold())
                        .foregroundStyle(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(SofraColors.error)
                        .clipShape(Capsule())
                }
                Text(title)
                    .font(SofraTypography.calloutSemibold)
                Image(systemName: icon)
                    .font(.system(size: 14))
            }
            .padding(.horizontal, SofraSpacing.md)
            .padding(.vertical, 10)
            .background(selectedTab == tag ? SofraColors.primary : SofraColors.sky100)
            .foregroundStyle(selectedTab == tag ? .white : SofraColors.textSecondary)
            .clipShape(Capsule())
        }
    }

    private var pendingOrdersCount: Int {
        vm.orders.filter { $0.status == .pending }.count
    }

    private var pendingApplicationsCount: Int {
        vm.hiringApplications.filter { $0.status == .pending }.count
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // MARK: - 1) الرئيسية — Home Tab
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    private var ownerHome: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.lg) {
                if vm.isLoading {
                    ForEach(0..<3, id: \.self) { _ in SkeletonCard() }
                        .padding(.horizontal, SofraSpacing.screenHorizontal)
                } else {
                    // Completeness warnings
                    if let warnings = ownerCompletenessWarnings, !warnings.isEmpty {
                        completenessWarning(warnings)
                    }

                    // Open/Close toggle
                    if let rest = vm.restaurant {
                        restaurantStatusCard(rest)
                    }

                    // Quick stats
                    homeStatsGrid

                    // Revenue summary card
                    revenueSummaryCard

                    // Recent orders preview
                    if !vm.orders.isEmpty {
                        recentOrdersPreview
                    }
                }

                Spacer(minLength: SofraSpacing.xxxl)
            }
            .padding(.top, SofraSpacing.md)
        }
        .refreshable {
            guard let uid = appState.currentUser?.uid else { return }
            await vm.loadDashboard(ownerId: uid, token: try? await appState.validToken())
        }
    }

    // MARK: Restaurant Open/Close
    private func restaurantStatusCard(_ rest: Restaurant) -> some View {
        HStack {
            Toggle("", isOn: Binding(
                get: { rest.isOpen },
                set: { newVal in
                    Task {
                        await vm.toggleOpen(ownerId: appState.currentUser?.uid ?? "", isOpen: newVal, token: try? await appState.validToken())
                    }
                }
            ))
            .tint(SofraColors.success)

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                HStack(spacing: SofraSpacing.xs) {
                    Circle()
                        .fill(rest.isOpen ? SofraColors.success : SofraColors.error)
                        .frame(width: 10, height: 10)
                    Text(rest.isOpen ? "المطعم مفتوح" : "المطعم مغلق")
                        .font(SofraTypography.headline)
                        .foregroundStyle(SofraColors.textPrimary)
                    Image(systemName: "storefront.fill")
                        .foregroundStyle(rest.isOpen ? SofraColors.success : SofraColors.error)
                }
                Text(rest.isOpen ? "تستقبل الطلبات الآن" : "لن تظهر للعملاء حالياً")
                    .font(SofraTypography.caption)
                    .foregroundStyle(SofraColors.textSecondary)
            }
        }
        .padding(SofraSpacing.cardPadding)
        .background(SofraColors.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous)
                .strokeBorder(
                    (vm.restaurant?.isOpen ?? false) ? SofraColors.success.opacity(0.3) : SofraColors.error.opacity(0.3),
                    lineWidth: 1
                )
        )
        .padding(.horizontal, SofraSpacing.screenHorizontal)
    }

    // MARK: Stats Grid
    private var homeStatsGrid: some View {
        LazyVGrid(columns: [.init(.flexible()), .init(.flexible()), .init(.flexible())], spacing: SofraSpacing.sm) {
            homeStat("طلبات اليوم", value: "\(vm.todayOrders)", icon: "bag.fill", color: SofraColors.primary)
            homeStat("إجمالي المبيعات", value: String(format: "%.0f", vm.totalRevenue + vm.totalCommission), icon: "banknote.fill", color: SofraColors.success)
            homeStat("المنتجات", value: "\(vm.menuItemsCount)", icon: "menucard.fill", color: SofraColors.info)
        }
        .padding(.horizontal, SofraSpacing.screenHorizontal)
    }

    private func homeStat(_ title: String, value: String, icon: String, color: Color) -> some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 20))
                .foregroundStyle(color)
            Text(value)
                .font(.system(size: 22, weight: .bold, design: .rounded))
                .foregroundStyle(SofraColors.textPrimary)
            Text(title)
                .font(.caption2)
                .foregroundStyle(SofraColors.textSecondary)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, SofraSpacing.md)
        .background(SofraColors.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .shadow(color: .black.opacity(0.03), radius: 4, y: 2)
    }

    // MARK: Revenue Summary
    private var revenueSummaryCard: some View {
        VStack(spacing: SofraSpacing.md) {
            HStack {
                Button {
                    showWallet = true
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "chevron.left")
                            .font(.caption2)
                        Text("المحفظة")
                            .font(SofraTypography.caption)
                    }
                    .foregroundStyle(.white.opacity(0.8))
                }
                Spacer()
                HStack(spacing: SofraSpacing.xs) {
                    Text("صافي الدخل")
                        .font(SofraTypography.headline)
                        .foregroundStyle(.white)
                    Image(systemName: "chart.line.uptrend.xyaxis")
                        .foregroundStyle(.white.opacity(0.8))
                }
            }

            Text("\(vm.totalRevenue, specifier: "%.2f") ر.س")
                .font(.system(size: 32, weight: .bold, design: .rounded))
                .foregroundStyle(.white)

            HStack(spacing: SofraSpacing.xl) {
                VStack(spacing: 2) {
                    Text("رسوم الخدمة")
                        .font(.caption2)
                        .foregroundStyle(.white.opacity(0.6))
                    Text("\(vm.totalCommission, specifier: "%.0f") ر.س")
                        .font(SofraTypography.calloutSemibold)
                        .foregroundStyle(.white.opacity(0.9))
                }
                Rectangle()
                    .fill(.white.opacity(0.2))
                    .frame(width: 1, height: 28)
                VStack(spacing: 2) {
                    Text("طلبات مكتملة")
                        .font(.caption2)
                        .foregroundStyle(.white.opacity(0.6))
                    Text("\(vm.orders.filter { $0.status == .delivered }.count)")
                        .font(SofraTypography.calloutSemibold)
                        .foregroundStyle(.white.opacity(0.9))
                }
            }
        }
        .frame(maxWidth: .infinity)
        .padding(SofraSpacing.lg)
        .background(
            LinearGradient(
                colors: [SofraColors.primary, SofraColors.primaryDark],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
        )
        .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
        .shadow(color: SofraColors.primary.opacity(0.2), radius: 10, y: 5)
        .padding(.horizontal, SofraSpacing.screenHorizontal)
        .onTapGesture { showWallet = true }
    }

    // MARK: Recent Orders Preview
    private var recentOrdersPreview: some View {
        VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
            HStack {
                Button {
                    withAnimation { selectedTab = 2 }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "chevron.left")
                            .font(.caption2)
                        Text("عرض الكل")
                            .font(SofraTypography.caption)
                    }
                    .foregroundStyle(SofraColors.primary)
                }
                Spacer()
                Text("آخر الطلبات")
                    .font(SofraTypography.headline)
                    .foregroundStyle(SofraColors.textPrimary)
            }
            .padding(.horizontal, SofraSpacing.screenHorizontal)

            ForEach(Array(vm.orders.prefix(3))) { order in
                compactOrderRow(order)
            }
            .padding(.horizontal, SofraSpacing.screenHorizontal)
        }
    }

    private func compactOrderRow(_ order: Order) -> some View {
        HStack {
            StatusBadge(text: order.status.arabicLabel, color: order.status.uiColor)

            Text("\(order.total, specifier: "%.0f") ر.س")
                .font(SofraTypography.calloutSemibold)
                .foregroundStyle(SofraColors.primaryDark)

            Spacer()

            VStack(alignment: .trailing, spacing: 2) {
                Text("#\(order.id.prefix(6))")
                    .font(SofraTypography.calloutSemibold)
                if let name = order.customerName, !name.isEmpty {
                    Text(name)
                        .font(.caption2)
                        .foregroundStyle(SofraColors.textMuted)
                }
            }
        }
        .padding(SofraSpacing.sm)
        .padding(.horizontal, SofraSpacing.xs)
        .background(SofraColors.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        .shadow(color: .black.opacity(0.02), radius: 3, y: 1)
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // MARK: - 2) المنتجات — Products Tab
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    private var ownerProducts: some View {
        VStack(spacing: 0) {
            // Header bar
            HStack {
                Button {
                    showAddMenuItem = true
                } label: {
                    HStack(spacing: SofraSpacing.xs) {
                        Text("إضافة منتج")
                            .font(SofraTypography.calloutSemibold)
                        Image(systemName: "plus")
                            .font(.system(size: 14, weight: .bold))
                    }
                    .padding(.horizontal, SofraSpacing.md)
                    .padding(.vertical, 10)
                    .background(SofraColors.success)
                    .foregroundStyle(.white)
                    .clipShape(Capsule())
                }

                Spacer()

                VStack(alignment: .trailing) {
                    Text("إدارة المنتجات")
                        .font(SofraTypography.title3)
                        .foregroundStyle(SofraColors.textPrimary)
                    Text("\(vm.menuItemsCount) منتج")
                        .font(SofraTypography.caption)
                        .foregroundStyle(SofraColors.textSecondary)
                }
            }
            .padding(.horizontal, SofraSpacing.screenHorizontal)
            .padding(.vertical, SofraSpacing.sm)

            ScrollView {
                if vm.menuItems.isEmpty {
                    VStack(spacing: SofraSpacing.lg) {
                        Spacer(minLength: SofraSpacing.xxxl)
                        EmptyStateView(
                            icon: "menucard",
                            title: "لا يوجد منتجات",
                            message: "أضف منتجاتك لبدء استقبال الطلبات"
                        )
                        SofraButton(title: "إضافة أول منتج", icon: "plus.circle.fill") {
                            showAddMenuItem = true
                        }
                        .padding(.horizontal, SofraSpacing.screenHorizontal)
                    }
                } else {
                    LazyVStack(spacing: SofraSpacing.md) {
                        ForEach(vm.menuItems) { item in
                            ownerProductCard(item)
                        }
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                    .padding(.top, SofraSpacing.xs)
                    .padding(.bottom, SofraSpacing.xxxl)
                }
            }
        }
    }

    private func ownerProductCard(_ item: MenuItem) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: SofraSpacing.md) {
                // Info
                VStack(alignment: .trailing, spacing: SofraSpacing.xs) {
                    HStack(spacing: SofraSpacing.xs) {
                        if !item.available {
                            Text("متوقف")
                                .font(.caption2.bold())
                                .foregroundStyle(.white)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(SofraColors.error)
                                .clipShape(Capsule())
                        }
                        Text(item.name)
                            .font(SofraTypography.headline)
                            .foregroundStyle(item.available ? SofraColors.textPrimary : SofraColors.textMuted)
                            .lineLimit(1)
                    }

                    if let desc = item.description, !desc.isEmpty {
                        Text(desc)
                            .font(SofraTypography.caption)
                            .foregroundStyle(SofraColors.textSecondary)
                            .lineLimit(2)
                            .multilineTextAlignment(.trailing)
                    }

                    HStack(spacing: SofraSpacing.sm) {
                        if let cat = item.category {
                            Text(cat)
                                .font(.caption2)
                                .foregroundStyle(SofraColors.textMuted)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(SofraColors.sky100)
                                .clipShape(Capsule())
                        }
                        Spacer()
                        VStack(alignment: .trailing, spacing: 2) {
                            Text("\(item.price, specifier: "%.0f") ر.س")
                                .font(SofraTypography.priceSmall)
                                .foregroundStyle(SofraColors.primaryDark)
                            Text("+ رسوم الخدمة \(ServiceFee.perItem, specifier: "%.2f") ر.س")
                                .font(.caption2)
                                .foregroundStyle(SofraColors.textMuted)
                        }
                    }
                }

                // Image
                CachedPhaseImage(url: URL(string: item.imageUrl ?? "")) { phase in
                    switch phase {
                    case .success(let img):
                        img.resizable().aspectRatio(contentMode: .fill)
                    default:
                        ZStack {
                            SofraColors.sky100
                            Image(systemName: "fork.knife")
                                .foregroundStyle(SofraColors.sky300)
                        }
                    }
                }
                .frame(width: 72, height: 72)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            }
            .padding(SofraSpacing.cardPadding)

            Divider()
                .padding(.horizontal, SofraSpacing.sm)

            // Actions: Toggle + Edit + Delete
            HStack(spacing: SofraSpacing.lg) {
                Button {
                    deletingItem = item
                } label: {
                    HStack(spacing: 4) {
                        Text("حذف")
                            .font(.caption)
                        Image(systemName: "trash")
                            .font(.caption)
                    }
                    .foregroundStyle(SofraColors.error)
                }

                Button {
                    editingItem = item
                } label: {
                    HStack(spacing: 4) {
                        Text("تعديل")
                            .font(.caption)
                        Image(systemName: "pencil")
                            .font(.caption)
                    }
                    .foregroundStyle(SofraColors.info)
                }

                Spacer()

                HStack(spacing: SofraSpacing.xs) {
                    Toggle("", isOn: Binding(
                        get: { item.available },
                        set: { newVal in
                            Task {
                                await vm.toggleItemAvailability(
                                    itemId: item.id, available: newVal,
                                    token: try? await appState.validToken()
                                )
                            }
                        }
                    ))
                    .tint(SofraColors.success)
                    .labelsHidden()

                    Text(item.available ? "متوفر" : "إيقاف مؤقت")
                        .font(.caption)
                        .foregroundStyle(item.available ? SofraColors.success : SofraColors.error)
                }
            }
            .padding(.horizontal, SofraSpacing.cardPadding)
            .padding(.vertical, SofraSpacing.sm)
        }
        .background(SofraColors.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
        .shadow(color: .black.opacity(0.04), radius: 6, y: 3)
        .opacity(item.available ? 1 : 0.7)
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // MARK: - 3) الطلبات — Orders Tab (5 statuses)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    @State private var orderFilter: OwnerOrderFilter = .new

    private enum OwnerOrderFilter: String, CaseIterable {
        case new = "جديدة"
        case preparing = "قيد التحضير"
        case ready = "جاهز للاستلام"
        case delivery = "جاري التوصيل"
        case delivered = "تم التسليم"

        var matchingStatuses: [OrderStatus] {
            switch self {
            case .new: return [.pending]
            case .preparing: return [.accepted, .preparing]
            case .ready: return [.ready]
            case .delivery: return [.outForDelivery]
            case .delivered: return [.delivered]
            }
        }

        var icon: String {
            switch self {
            case .new: return "bell.badge.fill"
            case .preparing: return "flame.fill"
            case .ready: return "bag.fill"
            case .delivery: return "car.fill"
            case .delivered: return "checkmark.seal.fill"
            }
        }
    }

    private var filteredOrders: [Order] {
        vm.orders.filter { orderFilter.matchingStatuses.contains($0.status) }
    }

    private func orderCountForFilter(_ filter: OwnerOrderFilter) -> Int {
        vm.orders.filter { filter.matchingStatuses.contains($0.status) }.count
    }

    private var ownerOrders: some View {
        VStack(spacing: 0) {
            // Filter pills with counts
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: SofraSpacing.sm) {
                    ForEach(OwnerOrderFilter.allCases, id: \.self) { filter in
                        let count = orderCountForFilter(filter)
                        Button {
                            withAnimation { orderFilter = filter }
                        } label: {
                            HStack(spacing: 4) {
                                if count > 0 && orderFilter != filter {
                                    Text("\(count)")
                                        .font(.caption2.bold())
                                        .foregroundStyle(.white)
                                        .padding(.horizontal, 5)
                                        .padding(.vertical, 1)
                                        .background(filter == .new ? SofraColors.error : SofraColors.textMuted)
                                        .clipShape(Capsule())
                                }
                                Image(systemName: filter.icon)
                                    .font(.caption2)
                                Text(filter.rawValue)
                                    .font(SofraTypography.caption)
                                    .fontWeight(.medium)
                            }
                            .padding(.horizontal, SofraSpacing.md)
                            .padding(.vertical, 8)
                            .background(orderFilter == filter ? SofraColors.primary.opacity(0.15) : SofraColors.sky100)
                            .foregroundStyle(orderFilter == filter ? SofraColors.primary : SofraColors.textSecondary)
                            .clipShape(Capsule())
                        }
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)
                .padding(.vertical, SofraSpacing.sm)
            }

            ScrollView {
                VStack(spacing: SofraSpacing.md) {
                    if filteredOrders.isEmpty {
                        EmptyStateView(
                            icon: "list.clipboard",
                            title: "لا توجد طلبات",
                            message: "لا توجد طلبات في «\(orderFilter.rawValue)»"
                        )
                    } else {
                        ForEach(filteredOrders) { order in
                            ownerOrderCard(order)
                        }
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)
                .padding(.top, SofraSpacing.sm)
                .padding(.bottom, SofraSpacing.xxxl)
            }
        }
        .refreshable {
            guard let uid = appState.currentUser?.uid else { return }
            await vm.loadOrders(ownerId: uid, token: try? await appState.validToken())
        }
    }

    private func ownerOrderCard(_ order: Order) -> some View {
        VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
            // Header
            HStack {
                StatusBadge(text: order.status.arabicLabel, color: order.status.uiColor)
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text("#\(order.id.prefix(8))")
                        .font(SofraTypography.headline)
                    if let name = order.customerName, !name.isEmpty {
                        Text(name)
                            .font(SofraTypography.caption)
                            .foregroundStyle(SofraColors.textMuted)
                    }
                }
            }

            Divider()

            // Items
            ForEach(Array(order.items.enumerated()), id: \.offset) { _, item in
                HStack {
                    Text("\(item.price, specifier: "%.0f") × \(item.qty)")
                        .font(SofraTypography.caption)
                        .foregroundStyle(SofraColors.textMuted)
                    Spacer()
                    Text(item.name)
                        .font(SofraTypography.body)
                }
            }

            // Notes
            if let notes = order.notes, !notes.isEmpty {
                HStack {
                    Spacer()
                    Text(notes)
                        .font(SofraTypography.caption)
                        .foregroundStyle(SofraColors.textSecondary)
                    Image(systemName: "note.text")
                        .font(.caption2)
                        .foregroundStyle(SofraColors.warning)
                }
            }

            Divider()

            // Bottom: Action + Chat + Price
            HStack(spacing: SofraSpacing.md) {
                orderActionButton(order)

                if order.status != .pending && order.status != .cancelled && order.status != .delivered {
                    Button {
                        chatOrder = order
                    } label: {
                        HStack(spacing: 4) {
                            Text("محادثة")
                                .font(.caption)
                            Image(systemName: "bubble.left.fill")
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(SofraColors.info.opacity(0.12))
                        .foregroundStyle(SofraColors.info)
                        .clipShape(Capsule())
                    }
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 2) {
                    Text("\(order.total, specifier: "%.2f") ر.س")
                        .font(SofraTypography.price)
                        .foregroundStyle(SofraColors.primaryDark)
                    Text(order.deliveryType == "delivery" ? "توصيل" : "استلام")
                        .font(.caption2)
                        .foregroundStyle(SofraColors.textMuted)
                }
            }
        }
        .padding(SofraSpacing.cardPadding)
        .background(SofraColors.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
        .shadow(color: .black.opacity(0.04), radius: 6, y: 3)
        .overlay(alignment: .topLeading) {
            if order.status == .pending {
                Circle()
                    .fill(SofraColors.error)
                    .frame(width: 10, height: 10)
                    .offset(x: 8, y: 8)
            }
        }
    }

    @ViewBuilder
    private func orderActionButton(_ order: Order) -> some View {
        switch order.status {
        case .pending:
            Button {
                Task { await vm.updateOrderStatus(orderId: order.id, newStatus: .accepted, token: try? await appState.validToken()) }
            } label: {
                actionPill("قبول", icon: "checkmark", color: SofraColors.success)
            }
        case .accepted:
            Button {
                Task { await vm.updateOrderStatus(orderId: order.id, newStatus: .preparing, token: try? await appState.validToken()) }
            } label: {
                actionPill("تحضير", icon: "flame", color: SofraColors.info)
            }
        case .preparing:
            Button {
                Task { await vm.updateOrderStatus(orderId: order.id, newStatus: .ready, token: try? await appState.validToken()) }
            } label: {
                actionPill("جاهز", icon: "checkmark.circle", color: SofraColors.primary)
            }
        case .ready:
            Button {
                Task { await vm.updateOrderStatus(orderId: order.id, newStatus: .outForDelivery, token: try? await appState.validToken()) }
            } label: {
                actionPill("توصيل", icon: "car.fill", color: SofraColors.warning)
            }
        case .outForDelivery:
            Button {
                Task { await vm.updateOrderStatus(orderId: order.id, newStatus: .delivered, token: try? await appState.validToken()) }
            } label: {
                actionPill("تم التسليم", icon: "checkmark.seal.fill", color: SofraColors.success)
            }
        default:
            EmptyView()
        }
    }

    private func actionPill(_ text: String, icon: String, color: Color) -> some View {
        HStack(spacing: 4) {
            Text(text)
                .font(SofraTypography.calloutSemibold)
            Image(systemName: icon)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .background(color)
        .foregroundStyle(.white)
        .clipShape(Capsule())
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // MARK: - 4) التقارير — Reports Tab (inline)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    @State private var reportPeriod = 0

    private let reportPeriods = ["اليوم", "الأسبوع", "الشهر", "الكل"]

    private var reportOrders: [Order] {
        let calendar = Calendar.current
        let now = Date()
        switch reportPeriod {
        case 0:
            let start = calendar.startOfDay(for: now)
            return vm.orders.filter { ($0.createdAt ?? .distantPast) >= start }
        case 1:
            let start = calendar.date(byAdding: .day, value: -7, to: now)!
            return vm.orders.filter { ($0.createdAt ?? .distantPast) >= start }
        case 2:
            let start = calendar.date(byAdding: .month, value: -1, to: now)!
            return vm.orders.filter { ($0.createdAt ?? .distantPast) >= start }
        default:
            return vm.orders
        }
    }

    private var reportTotalSales: Double {
        reportOrders.reduce(0) { $0 + $1.total }
    }

    private var reportServiceFees: Double {
        reportOrders.filter { $0.status == .delivered }.reduce(0) { $0 + $1.commissionAmount }
    }

    private var reportNetIncome: Double {
        reportOrders.filter { $0.status == .delivered }.reduce(0) { $0 + $1.netAmount }
    }

    private var reportDeliveredCount: Int {
        reportOrders.filter { $0.status == .delivered }.count
    }

    private var ownerReports: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.lg) {
                // Period Picker
                HStack(spacing: SofraSpacing.sm) {
                    ForEach(0..<reportPeriods.count, id: \.self) { idx in
                        Button {
                            withAnimation { reportPeriod = idx }
                        } label: {
                            Text(reportPeriods[idx])
                                .font(SofraTypography.calloutSemibold)
                                .padding(.horizontal, SofraSpacing.md)
                                .padding(.vertical, SofraSpacing.sm)
                                .background(reportPeriod == idx ? SofraColors.primary : SofraColors.sky100)
                                .foregroundStyle(reportPeriod == idx ? .white : SofraColors.textSecondary)
                                .clipShape(Capsule())
                        }
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                // Main stats
                LazyVGrid(columns: [.init(.flexible()), .init(.flexible())], spacing: SofraSpacing.md) {
                    reportStatCard("إجمالي الطلبات", value: "\(reportOrders.count)", icon: "bag.fill", color: SofraColors.primary)
                    reportStatCard("المبيعات", value: String(format: "%.0f ر.س", reportTotalSales), icon: "banknote.fill", color: SofraColors.success)
                    reportStatCard("رسوم الخدمة", value: String(format: "%.0f ر.س", reportServiceFees), icon: "percent", color: SofraColors.warning)
                    reportStatCard("صافي الدخل", value: String(format: "%.0f ر.س", reportNetIncome), icon: "chart.line.uptrend.xyaxis", color: SofraColors.info)
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                // Net Income Hero
                VStack(spacing: SofraSpacing.sm) {
                    Text("صافي الدخل")
                        .font(SofraTypography.headline)
                        .foregroundStyle(.white.opacity(0.8))
                    Text("\(reportNetIncome, specifier: "%.2f") ر.س")
                        .font(.system(size: 36, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                    Text("\(reportDeliveredCount) طلب مكتمل")
                        .font(SofraTypography.caption)
                        .foregroundStyle(.white.opacity(0.7))
                }
                .frame(maxWidth: .infinity)
                .padding(SofraSpacing.lg)
                .background(
                    LinearGradient(
                        colors: [SofraColors.success, SofraColors.success.opacity(0.7)],
                        startPoint: .topLeading, endPoint: .bottomTrailing
                    )
                )
                .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                // Order Status Breakdown
                SofraCard {
                    VStack(alignment: .trailing, spacing: SofraSpacing.md) {
                        Text("تفصيل الطلبات")
                            .font(SofraTypography.headline)
                            .foregroundStyle(SofraColors.gold400)

                        reportStatusRow("جديدة", count: reportOrders.filter { $0.status == .pending }.count, color: SofraColors.warning)
                        reportStatusRow("قيد التحضير", count: reportOrders.filter { $0.status == .accepted || $0.status == .preparing }.count, color: SofraColors.primary)
                        reportStatusRow("جاهز", count: reportOrders.filter { $0.status == .ready }.count, color: SofraColors.gold400)
                        reportStatusRow("في التوصيل", count: reportOrders.filter { $0.status == .outForDelivery }.count, color: SofraColors.info)
                        reportStatusRow("مكتملة", count: reportDeliveredCount, color: SofraColors.success)
                        reportStatusRow("ملغية", count: reportOrders.filter { $0.status == .cancelled }.count, color: SofraColors.error)
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                // Top Items
                let topItems = reportTopItems
                if !topItems.isEmpty {
                    SofraCard {
                        VStack(alignment: .trailing, spacing: SofraSpacing.md) {
                            Text("الأكثر طلباً")
                                .font(SofraTypography.headline)
                                .foregroundStyle(SofraColors.gold400)

                            ForEach(topItems.prefix(5), id: \.name) { item in
                                HStack {
                                    Text("\(item.count) طلب")
                                        .font(SofraTypography.callout)
                                        .foregroundStyle(SofraColors.textMuted)
                                    Spacer()
                                    Text(item.name)
                                        .font(SofraTypography.body)
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
    }

    private var reportTopItems: [(name: String, count: Int)] {
        var counts: [String: Int] = [:]
        for order in reportOrders {
            for item in order.items {
                counts[item.name, default: 0] += item.qty
            }
        }
        return counts.map { (name: $0.key, count: $0.value) }
            .sorted { $0.count > $1.count }
    }

    private func reportStatCard(_ title: String, value: String, icon: String, color: Color) -> some View {
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

    private func reportStatusRow(_ label: String, count: Int, color: Color) -> some View {
        HStack {
            Text("\(count)")
                .font(SofraTypography.headline)
                .foregroundStyle(color)
                .frame(width: 40)

            GeometryReader { geo in
                let maxCount = max(reportOrders.count, 1)
                let width = geo.size.width * CGFloat(count) / CGFloat(maxCount)
                RoundedRectangle(cornerRadius: 4)
                    .fill(color.opacity(0.3))
                    .frame(width: max(width, 0))
            }
            .frame(height: 8)

            Spacer()
            Text(label)
                .font(SofraTypography.body)
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // MARK: - 5) التوظيف — Hiring Tab (inline)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    @State private var isHiringToggle = false
    @State private var hiringDesc = ""
    @State private var isSavingHiring = false
    @State private var hiringFilter = 0 // 0 = New, 1 = Previous

    private var ownerHiring: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.lg) {
                // Hiring toggle
                SofraCard {
                    VStack(alignment: .trailing, spacing: SofraSpacing.md) {
                        HStack {
                            Toggle("", isOn: $isHiringToggle)
                                .tint(SofraColors.success)
                                .onChange(of: isHiringToggle) { _, newVal in
                                    Task { await toggleHiringState(newVal) }
                                }

                            Spacer()

                            VStack(alignment: .trailing) {
                                Text("حالة التوظيف")
                                    .font(SofraTypography.headline)
                                StatusBadge(
                                    text: isHiringToggle ? "مفتوح للتوظيف" : "التوظيف مغلق",
                                    color: isHiringToggle ? SofraColors.success : SofraColors.error
                                )
                            }

                            Image(systemName: "person.3.fill")
                                .font(.title2)
                                .foregroundStyle(SofraColors.info)
                        }

                        if isHiringToggle {
                            SofraTextField(
                                label: "وصف التوظيف",
                                text: $hiringDesc,
                                icon: "text.alignright",
                                placeholder: "مثال: نحتاج مناديب توصيل في منطقة الرياض"
                            )

                            SofraButton(title: "حفظ الوصف", icon: "checkmark", isLoading: isSavingHiring) {
                                Task { await saveHiringDesc() }
                            }
                        }
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                // Filter: New / Previous
                HStack(spacing: SofraSpacing.sm) {
                    Button {
                        withAnimation { hiringFilter = 0 }
                    } label: {
                        HStack(spacing: 4) {
                            if !pendingHiringApps.isEmpty {
                                Text("\(pendingHiringApps.count)")
                                    .font(.caption2.bold())
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, 5)
                                    .padding(.vertical, 1)
                                    .background(SofraColors.error)
                                    .clipShape(Capsule())
                            }
                            Text("طلبات جديدة")
                                .font(SofraTypography.calloutSemibold)
                        }
                        .padding(.horizontal, SofraSpacing.md)
                        .padding(.vertical, SofraSpacing.sm)
                        .background(hiringFilter == 0 ? SofraColors.primary : SofraColors.sky100)
                        .foregroundStyle(hiringFilter == 0 ? .white : SofraColors.textSecondary)
                        .clipShape(Capsule())
                    }

                    Button {
                        withAnimation { hiringFilter = 1 }
                    } label: {
                        Text("طلبات سابقة")
                            .font(SofraTypography.calloutSemibold)
                            .padding(.horizontal, SofraSpacing.md)
                            .padding(.vertical, SofraSpacing.sm)
                            .background(hiringFilter == 1 ? SofraColors.primary : SofraColors.sky100)
                            .foregroundStyle(hiringFilter == 1 ? .white : SofraColors.textSecondary)
                            .clipShape(Capsule())
                    }

                    Spacer()
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                if hiringFilter == 0 {
                    // New (Pending) Applications
                    if pendingHiringApps.isEmpty {
                        EmptyStateView(
                            icon: "person.badge.clock",
                            title: "لا توجد طلبات توظيف جديدة",
                            message: "طلبات المناديب ستظهر هنا عند التقديم"
                        )
                    } else {
                        ForEach(pendingHiringApps) { app in
                            hiringApplicationCard(app, isPending: true)
                        }
                        .padding(.horizontal, SofraSpacing.screenHorizontal)
                    }
                } else {
                    // Previous (approved/rejected)
                    if previousHiringApps.isEmpty {
                        EmptyStateView(
                            icon: "person.3",
                            title: "لا توجد طلبات سابقة",
                            message: ""
                        )
                    } else {
                        ForEach(previousHiringApps) { app in
                            hiringApplicationCard(app, isPending: false)
                        }
                        .padding(.horizontal, SofraSpacing.screenHorizontal)
                    }
                }

                Spacer(minLength: SofraSpacing.xxxl)
            }
            .padding(.top, SofraSpacing.md)
        }
        .task {
            isHiringToggle = vm.restaurant?.isHiring ?? false
            hiringDesc = vm.restaurant?.hiringDescription ?? ""
            await vm.loadHiringApplications(
                ownerId: appState.currentUser?.uid ?? "",
                token: try? await appState.validToken()
            )
        }
    }

    private var pendingHiringApps: [CourierApplication] {
        vm.hiringApplications.filter { $0.status == .pending }
    }

    private var previousHiringApps: [CourierApplication] {
        vm.hiringApplications.filter { $0.status != .pending }
    }

    private func hiringApplicationCard(_ app: CourierApplication, isPending: Bool) -> some View {
        SofraCard {
            VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
                HStack {
                    if isPending {
                        HStack(spacing: SofraSpacing.sm) {
                            Button {
                                Task { await rejectHiringApp(app) }
                            } label: {
                                Text("رفض")
                                    .font(SofraTypography.calloutSemibold)
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, SofraSpacing.md)
                                    .padding(.vertical, SofraSpacing.sm)
                                    .background(SofraColors.error)
                                    .clipShape(Capsule())
                            }

                            Button {
                                Task { await approveHiringApp(app) }
                            } label: {
                                Text("قبول")
                                    .font(SofraTypography.calloutSemibold)
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, SofraSpacing.md)
                                    .padding(.vertical, SofraSpacing.sm)
                                    .background(SofraColors.success)
                                    .clipShape(Capsule())
                            }
                        }
                    } else {
                        StatusBadge(
                            text: app.status == .approved ? "مقبول" : "مرفوض",
                            color: app.status == .approved ? SofraColors.success : SofraColors.error
                        )
                    }

                    Spacer()

                    VStack(alignment: .trailing) {
                        Text(app.courierName)
                            .font(SofraTypography.headline)
                        if !app.courierPhone.isEmpty {
                            Text(app.courierPhone)
                                .font(SofraTypography.caption)
                                .foregroundStyle(SofraColors.textMuted)
                        }
                        if !app.vehicleType.isEmpty {
                            Text(app.vehicleType)
                                .font(.caption2)
                                .foregroundStyle(SofraColors.textMuted)
                        }
                    }

                    Image(systemName: "person.circle.fill")
                        .font(.title2)
                        .foregroundStyle(SofraColors.info)
                }

                if let date = app.createdAt {
                    Text(date.relativeArabic)
                        .font(SofraTypography.caption2)
                        .foregroundStyle(SofraColors.textMuted)
                }
            }
        }
    }

    // Hiring helper functions
    private func toggleHiringState(_ isOpen: Bool) async {
        guard let token = try? await appState.validToken(),
              let uid = appState.currentUser?.uid else { return }
        let service = FirestoreService()
        try? await service.updateDocument(
            collection: "restaurants", id: uid,
            fields: ["isHiring": isOpen],
            idToken: token
        )
        vm.restaurant?.isHiring = isOpen
    }

    private func saveHiringDesc() async {
        isSavingHiring = true
        guard let token = try? await appState.validToken(),
              let uid = appState.currentUser?.uid else { isSavingHiring = false; return }
        let service = FirestoreService()
        try? await service.updateDocument(
            collection: "restaurants", id: uid,
            fields: ["hiringDescription": hiringDesc],
            idToken: token
        )
        vm.restaurant?.hiringDescription = hiringDesc
        isSavingHiring = false
    }

    private func approveHiringApp(_ app: CourierApplication) async {
        guard let token = try? await appState.validToken() else { return }
        let service = FirestoreService()
        try? await service.updateDocument(
            collection: "courierApplications", id: app.id,
            fields: ["status": "approved"],
            idToken: token
        )
        if let idx = vm.hiringApplications.firstIndex(where: { $0.id == app.id }) {
            vm.hiringApplications[idx].status = .approved
        }
    }

    private func rejectHiringApp(_ app: CourierApplication) async {
        guard let token = try? await appState.validToken() else { return }
        let service = FirestoreService()
        try? await service.updateDocument(
            collection: "courierApplications", id: app.id,
            fields: ["status": "rejected"],
            idToken: token
        )
        if let idx = vm.hiringApplications.firstIndex(where: { $0.id == app.id }) {
            vm.hiringApplications[idx].status = .rejected
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // MARK: - 6) الإعدادات — Settings Tab
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    private var ownerSettings: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.lg) {
                if let rest = vm.restaurant {
                    // Restaurant Photo
                    SofraCard {
                        VStack(spacing: SofraSpacing.md) {
                            ZStack {
                                if let restaurantImage {
                                    Image(uiImage: restaurantImage)
                                        .resizable()
                                        .aspectRatio(contentMode: .fill)
                                } else {
                                    CachedPhaseImage(url: URL(string: rest.logoUrl ?? rest.coverUrl ?? "")) { phase in
                                        switch phase {
                                        case .success(let img):
                                            img.resizable().aspectRatio(contentMode: .fill)
                                        default:
                                            VStack(spacing: SofraSpacing.sm) {
                                                Image(systemName: "camera.fill")
                                                    .font(.system(size: 30))
                                                    .foregroundStyle(SofraColors.textMuted)
                                                Text("صورة المطعم")
                                                    .font(SofraTypography.caption)
                                                    .foregroundStyle(SofraColors.textMuted)
                                            }
                                        }
                                    }
                                }

                                if vm.isUploadingImage {
                                    Color.black.opacity(0.4)
                                    ProgressView()
                                        .tint(.white)
                                        .scaleEffect(1.5)
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 160)
                            .background(SofraColors.sky100)
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

                            PhotosPicker(selection: $selectedPhoto, matching: .images) {
                                HStack(spacing: SofraSpacing.xs) {
                                    Text(rest.logoUrl != nil ? "تغيير الصورة" : "رفع صورة المطعم")
                                        .font(SofraTypography.calloutSemibold)
                                    Image(systemName: "photo.on.rectangle.angled")
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, SofraSpacing.sm)
                                .background(SofraColors.primary.opacity(0.1))
                                .foregroundStyle(SofraColors.primary)
                                .clipShape(RoundedRectangle(cornerRadius: 10))
                            }
                            .onChange(of: selectedPhoto) { _, newItem in
                                Task {
                                    if let data = try? await newItem?.loadTransferable(type: Data.self),
                                       let uiImage = UIImage(data: data) {
                                        restaurantImage = uiImage
                                        if let jpegData = uiImage.jpegData(compressionQuality: 0.7) {
                                            await vm.uploadRestaurantPhoto(
                                                imageData: jpegData,
                                                ownerId: appState.currentUser?.uid ?? "",
                                                token: try? await appState.validToken()
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)

                    // Restaurant Info Form
                    SofraCard {
                        VStack(alignment: .trailing, spacing: SofraSpacing.md) {
                            HStack(spacing: SofraSpacing.xs) {
                                Text("بيانات المطعم")
                                    .font(SofraTypography.headline)
                                    .foregroundStyle(SofraColors.gold400)
                                Image(systemName: "storefront.fill")
                                    .foregroundStyle(SofraColors.gold400)
                            }

                            SofraTextField(
                                label: "اسم المطعم",
                                text: $editRestName,
                                icon: "storefront",
                                placeholder: "أدخل اسم المطعم"
                            )

                            SofraTextField(
                                label: "رقم الجوال",
                                text: $editRestPhone,
                                icon: "phone",
                                placeholder: "05xxxxxxxx",
                                keyboardType: .phonePad
                            )

                            if let city = rest.city {
                                HStack {
                                    Spacer()
                                    Text(city)
                                        .font(SofraTypography.body)
                                    Image(systemName: "location.fill")
                                        .foregroundStyle(SofraColors.primary)
                                }
                            }

                            if let msg = infoSaveMessage {
                                Text(msg)
                                    .font(SofraTypography.caption)
                                    .foregroundStyle(SofraColors.success)
                            }

                            SofraButton(
                                title: "حفظ البيانات",
                                icon: "checkmark",
                                isLoading: isSavingInfo,
                                isDisabled: editRestName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                            ) {
                                Task {
                                    isSavingInfo = true
                                    infoSaveMessage = nil
                                    let ok = await vm.updateRestaurantInfo(
                                        ownerId: appState.currentUser?.uid ?? "",
                                        name: editRestName.trimmingCharacters(in: .whitespacesAndNewlines),
                                        phone: editRestPhone.trimmingCharacters(in: .whitespacesAndNewlines),
                                        token: try? await appState.validToken()
                                    )
                                    if ok { infoSaveMessage = "تم الحفظ ✓" }
                                    isSavingInfo = false
                                }
                            }
                        }
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)

                    // Package info
                    Button { showPackages = true } label: {
                        SofraCard {
                            HStack {
                                Image(systemName: "chevron.left")
                                    .font(.caption)
                                    .foregroundStyle(SofraColors.textMuted)
                                StatusBadge(
                                    text: rest.packageType == .premium ? "ذهبية" : "أساسية",
                                    color: rest.packageType == .premium ? SofraColors.gold400 : SofraColors.textMuted
                                )
                                Spacer()
                                HStack(spacing: SofraSpacing.xs) {
                                    Text("الباقة")
                                        .font(SofraTypography.headline)
                                        .foregroundStyle(SofraColors.textPrimary)
                                    Image(systemName: rest.packageType == .premium ? "crown.fill" : "tag.fill")
                                        .foregroundStyle(rest.packageType == .premium ? SofraColors.gold400 : SofraColors.textMuted)
                                }
                            }
                        }
                    }
                    .buttonStyle(.plain)
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                }

                // Quick links
                SofraCard {
                    VStack(spacing: SofraSpacing.md) {
                        settingsLink(icon: "creditcard.fill", label: "المحفظة والإيرادات", color: SofraColors.success) { showWallet = true }
                        Divider()
                        settingsLink(icon: "megaphone.fill", label: "العروض الترويجية", color: SofraColors.warning) { showPromotions = true }
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                Spacer(minLength: SofraSpacing.xxxl)
            }
            .padding(.top, SofraSpacing.md)
        }
    }

    private func settingsLink(icon: String, label: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                Image(systemName: "chevron.left")
                    .font(.caption)
                    .foregroundStyle(SofraColors.textMuted)
                Spacer()
                Text(label)
                    .font(SofraTypography.body)
                    .foregroundStyle(SofraColors.textPrimary)
                Image(systemName: icon)
                    .foregroundStyle(color)
                    .frame(width: 28)
            }
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // MARK: - Shared Helpers
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    private func completenessWarning(_ warnings: [String]) -> some View {
        VStack(spacing: SofraSpacing.sm) {
            HStack(spacing: SofraSpacing.sm) {
                VStack(alignment: .trailing, spacing: SofraSpacing.xs) {
                    Text("أكمل بيانات مطعمك")
                        .font(SofraTypography.headline)
                        .foregroundStyle(SofraColors.warning)
                    Text("ليظهر مطعمك للعملاء ويستقبل الطلبات:")
                        .font(SofraTypography.caption)
                        .foregroundStyle(SofraColors.textSecondary)
                        .multilineTextAlignment(.trailing)
                }
                Spacer()
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.title2)
                    .foregroundStyle(SofraColors.warning)
            }
            ForEach(warnings, id: \.self) { warning in
                HStack(spacing: SofraSpacing.xs) {
                    Spacer()
                    Text(warning)
                        .font(SofraTypography.callout)
                        .foregroundStyle(SofraColors.textPrimary)
                    Image(systemName: "xmark.circle")
                        .foregroundStyle(SofraColors.error)
                }
            }
        }
        .padding(SofraSpacing.cardPadding)
        .background(SofraColors.warning.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous)
                .strokeBorder(SofraColors.warning.opacity(0.3), lineWidth: 1)
        )
        .padding(.horizontal, SofraSpacing.screenHorizontal)
    }

    private var ownerCompletenessWarnings: [String]? {
        var warnings: [String] = []
        if let rest = vm.restaurant {
            if rest.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || rest.name == "مطعم" {
                warnings.append("أضف اسم المطعم في الإعدادات")
            }
            if (rest.phone ?? "").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                warnings.append("أضف رقم الجوال في الإعدادات")
            }
            if rest.logoUrl == nil && rest.coverUrl == nil {
                warnings.append("ارفع صورة المطعم في الإعدادات")
            }
        }
        if vm.menuItemsCount == 0 {
            warnings.append("أضف منتج واحد على الأقل في القائمة")
        }
        return warnings.isEmpty ? nil : warnings
    }
}

#Preview {
    OwnerDashboardView()
        .environment(AppState())
        .environment(CartViewModel())
}
