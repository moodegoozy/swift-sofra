// OwnerDashboardView.swift
// Professional restaurant owner dashboard — designed for الأسر المنتجة
// Clean, functional, easy to use with clear actions

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
    // Packages
    @State private var showPackages = false
    @State private var showPromotions = false
    @State private var showReports = false
    @State private var showHiring = false

    var body: some View {
        VStack(spacing: 0) {
            ownerTabBar

            TabView(selection: $selectedTab) {
                ownerOverview.tag(0)
                ownerOrders.tag(1)
                ownerMenu.tag(2)
                ownerSettings.tag(3)
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
        .sheet(isPresented: $showReports) {
            if let rest = vm.restaurant {
                NavigationStack {
                    OwnerReportsView(restaurant: rest, orders: vm.orders)
                        .navigationTitle("التقارير")
                        .navigationBarTitleDisplayMode(.inline)
                }
            }
        }
        .sheet(isPresented: $showHiring) {
            if let rest = vm.restaurant {
                NavigationStack {
                    OwnerHiringView(restaurant: rest)
                        .navigationTitle("التوظيف")
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

    // MARK: - Tab Bar
    private var ownerTabBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: SofraSpacing.sm) {
                ownerTabPill("الرئيسية", icon: "square.grid.2x2.fill", tag: 0)
                ownerTabPill("الطلبات", icon: "list.clipboard.fill", tag: 1, badge: pendingOrdersCount)
                ownerTabPill("القائمة", icon: "menucard.fill", tag: 2)
                ownerTabPill("الإعدادات", icon: "gearshape.fill", tag: 3)
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

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // MARK: - Overview Tab
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    private var ownerOverview: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.lg) {
                if vm.isLoading {
                    ForEach(0..<3, id: \.self) { _ in SkeletonCard() }
                        .padding(.horizontal, SofraSpacing.screenHorizontal)
                } else {
                    if let warnings = ownerCompletenessWarnings, !warnings.isEmpty {
                        completenessWarning(warnings)
                    }

                    revenueHeroCard
                    statsGrid

                    if let rest = vm.restaurant {
                        restaurantStatusCard(rest)
                    }

                    quickActionsGrid

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

    // MARK: Revenue Hero
    private var revenueHeroCard: some View {
        VStack(spacing: SofraSpacing.md) {
            HStack {
                Button {
                    showWallet = true
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "chevron.left")
                            .font(.caption2)
                        Text("التفاصيل")
                            .font(SofraTypography.caption)
                    }
                    .foregroundStyle(.white.opacity(0.8))
                }
                Spacer()
                HStack(spacing: SofraSpacing.xs) {
                    Text("الإيرادات")
                        .font(SofraTypography.headline)
                        .foregroundStyle(.white)
                    Image(systemName: "chart.line.uptrend.xyaxis")
                        .foregroundStyle(.white.opacity(0.8))
                }
            }

            Text("\(vm.totalRevenue, specifier: "%.2f") ر.س")
                .font(.system(size: 34, weight: .bold, design: .rounded))
                .foregroundStyle(.white)

            HStack(spacing: SofraSpacing.lg) {
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
                    .frame(width: 1, height: 30)
                VStack(spacing: 2) {
                    Text("إجمالي المبيعات")
                        .font(.caption2)
                        .foregroundStyle(.white.opacity(0.6))
                    Text("\(vm.totalRevenue + vm.totalCommission, specifier: "%.0f") ر.س")
                        .font(SofraTypography.calloutSemibold)
                        .foregroundStyle(.white.opacity(0.9))
                }
                Rectangle()
                    .fill(.white.opacity(0.2))
                    .frame(width: 1, height: 30)
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
        .shadow(color: SofraColors.primary.opacity(0.25), radius: 12, y: 6)
        .padding(.horizontal, SofraSpacing.screenHorizontal)
        .onTapGesture { showWallet = true }
    }

    // MARK: Stats Grid
    private var statsGrid: some View {
        LazyVGrid(columns: [.init(.flexible()), .init(.flexible()), .init(.flexible())], spacing: SofraSpacing.sm) {
            miniStat("طلبات اليوم", value: "\(vm.todayOrders)", icon: "bag.fill", color: SofraColors.primary)
            miniStat("قيد الانتظار", value: "\(pendingOrdersCount)", icon: "clock.fill", color: SofraColors.warning)
            miniStat("الأصناف", value: "\(vm.menuItemsCount)", icon: "menucard.fill", color: SofraColors.info)
        }
        .padding(.horizontal, SofraSpacing.screenHorizontal)
    }

    private func miniStat(_ title: String, value: String, icon: String, color: Color) -> some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.system(size: 18))
                .foregroundStyle(color)
            Text(value)
                .font(.system(size: 20, weight: .bold, design: .rounded))
                .foregroundStyle(SofraColors.textPrimary)
            Text(title)
                .font(.caption2)
                .foregroundStyle(SofraColors.textSecondary)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, SofraSpacing.md)
        .background(SofraColors.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .shadow(color: .black.opacity(0.03), radius: 4, y: 2)
    }

    // MARK: Restaurant Status
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
                        .frame(width: 8, height: 8)
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
                .strokeBorder(rest.isOpen ? SofraColors.success.opacity(0.3) : SofraColors.error.opacity(0.3), lineWidth: 1)
        )
        .padding(.horizontal, SofraSpacing.screenHorizontal)
    }

    // MARK: Quick Actions
    private var quickActionsGrid: some View {
        VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
            Text("إجراءات سريعة")
                .font(SofraTypography.headline)
                .foregroundStyle(SofraColors.textPrimary)
                .padding(.horizontal, SofraSpacing.screenHorizontal)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: SofraSpacing.md) {
                    ownerQuickBtn("إضافة صنف", icon: "plus.circle.fill", color: SofraColors.success) {
                        showAddMenuItem = true
                    }
                    ownerQuickBtn("الطلبات", icon: "list.clipboard.fill", color: SofraColors.primary) {
                        withAnimation { selectedTab = 1 }
                    }
                    ownerQuickBtn("المحفظة", icon: "creditcard.fill", color: SofraColors.info) {
                        showWallet = true
                    }
                    ownerQuickBtn("العروض", icon: "megaphone.fill", color: SofraColors.warning) {
                        showPromotions = true
                    }
                    ownerQuickBtn("التقارير", icon: "chart.bar.fill", color: SofraColors.primaryDark) {
                        showReports = true
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)
            }
        }
    }

    private func ownerQuickBtn(_ title: String, icon: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundStyle(color)
                    .frame(width: 44, height: 44)
                    .background(color.opacity(0.12))
                    .clipShape(Circle())
                Text(title)
                    .font(.caption2)
                    .foregroundStyle(SofraColors.textSecondary)
                    .lineLimit(1)
            }
            .frame(width: 76)
        }
        .buttonStyle(.plain)
    }

    // MARK: Recent Orders Preview
    private var recentOrdersPreview: some View {
        VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
            HStack {
                Button {
                    withAnimation { selectedTab = 1 }
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
    // MARK: - Orders Tab
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    @State private var orderFilter: OrderFilter = .all

    private enum OrderFilter: String, CaseIterable {
        case all = "الكل"
        case pending = "جديدة"
        case active = "قيد التنفيذ"
        case delivered = "مكتملة"
    }

    private var filteredOrders: [Order] {
        switch orderFilter {
        case .all: return vm.orders
        case .pending: return vm.orders.filter { $0.status == .pending }
        case .active: return vm.orders.filter { [.accepted, .preparing, .ready, .pickedUp].contains($0.status) }
        case .delivered: return vm.orders.filter { $0.status == .delivered }
        }
    }

    private var ownerOrders: some View {
        VStack(spacing: 0) {
            // Filter pills
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: SofraSpacing.sm) {
                    ForEach(OrderFilter.allCases, id: \.self) { filter in
                        Button {
                            withAnimation { orderFilter = filter }
                        } label: {
                            Text(filter.rawValue)
                                .font(SofraTypography.caption)
                                .fontWeight(.medium)
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
                            message: orderFilter == .all ? "الطلبات الواردة ستظهر هنا" : "لا توجد طلبات في هذا التصنيف"
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
                HStack(spacing: 4) {
                    Text("قبول")
                        .font(SofraTypography.calloutSemibold)
                    Image(systemName: "checkmark")
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(SofraColors.success)
                .foregroundStyle(.white)
                .clipShape(Capsule())
            }
        case .accepted:
            Button {
                Task { await vm.updateOrderStatus(orderId: order.id, newStatus: .preparing, token: try? await appState.validToken()) }
            } label: {
                HStack(spacing: 4) {
                    Text("تحضير")
                        .font(SofraTypography.calloutSemibold)
                    Image(systemName: "flame")
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(SofraColors.info)
                .foregroundStyle(.white)
                .clipShape(Capsule())
            }
        case .preparing:
            Button {
                Task { await vm.updateOrderStatus(orderId: order.id, newStatus: .ready, token: try? await appState.validToken()) }
            } label: {
                HStack(spacing: 4) {
                    Text("جاهز")
                        .font(SofraTypography.calloutSemibold)
                    Image(systemName: "checkmark.circle")
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(SofraColors.primary)
                .foregroundStyle(.white)
                .clipShape(Capsule())
            }
        default:
            EmptyView()
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // MARK: - Menu Tab — Professional Item Management
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    private var ownerMenu: some View {
        VStack(spacing: 0) {
            HStack {
                Button {
                    showAddMenuItem = true
                } label: {
                    HStack(spacing: SofraSpacing.xs) {
                        Text("إضافة")
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
                    Text("أصناف القائمة")
                        .font(SofraTypography.title3)
                        .foregroundStyle(SofraColors.textPrimary)
                    Text("\(vm.menuItemsCount) صنف")
                        .font(SofraTypography.caption)
                        .foregroundStyle(SofraColors.textSecondary)
                }
            }
            .padding(.horizontal, SofraSpacing.screenHorizontal)
            .padding(.vertical, SofraSpacing.sm)

            ScrollView {
                if vm.menuItems.isEmpty {
                    VStack(spacing: SofraSpacing.lg) {
                        EmptyStateView(
                            icon: "menucard",
                            title: "القائمة فارغة",
                            message: "أضف أصنافك لبدء استقبال الطلبات"
                        )
                        SofraButton(title: "إضافة أول صنف", icon: "plus.circle.fill") {
                            showAddMenuItem = true
                        }
                        .padding(.horizontal, SofraSpacing.screenHorizontal)
                    }
                } else {
                    LazyVStack(spacing: SofraSpacing.md) {
                        ForEach(vm.menuItems) { item in
                            ownerMenuItemCard(item)
                        }
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                    .padding(.bottom, SofraSpacing.xxxl)
                }
            }
        }
    }

    private func ownerMenuItemCard(_ item: MenuItem) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: SofraSpacing.md) {
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

            // Action bar: Toggle + Edit + Delete
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

                    Text(item.available ? "متوفر" : "غير متوفر")
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
    // MARK: - Settings Tab
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

                // Links
                SofraCard {
                    VStack(spacing: SofraSpacing.md) {
                        settingsLink(icon: "creditcard.fill", label: "المحفظة والإيرادات", color: SofraColors.success) { showWallet = true }
                        Divider()
                        settingsLink(icon: "person.3.fill", label: "التوظيف", color: SofraColors.info) { showHiring = true }
                        Divider()
                        settingsLink(icon: "megaphone.fill", label: "العروض الترويجية", color: SofraColors.warning) { showPromotions = true }
                        Divider()
                        settingsLink(icon: "chart.bar.fill", label: "التقارير", color: SofraColors.primaryDark) { showReports = true }
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

    // MARK: - Completeness Warning
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
