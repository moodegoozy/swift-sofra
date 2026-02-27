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
    // Auto-refresh timer for orders
    @State private var orderRefreshTask: Task<Void, Never>?
    // Cancel order confirmation
    @State private var cancellingOrder: Order?
    @State private var showCancelSheet = false
    @State private var cancelReason = ""
    // Order status management
    @State private var showStatusPicker = false
    @State private var statusPickerOrder: Order?

    var body: some View {
        ZStack(alignment: .bottom) {
            VStack(spacing: 0) {
                // Quick access bar for orders (always visible)
                if pendingOrdersCount > 0 && selectedTab != 2 {
                    quickOrdersBar
                }
                
                ownerTabBar

                TabView(selection: $selectedTab) {
                    ownerHome.tag(0)
                    ownerProducts.tag(1)
                    ownerOrders.tag(2)
                    ownerReports.tag(3)
                    ownerHiring.tag(4)
                    ownerSettings.tag(5)
                    ownerRestaurants.tag(6)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
            }
        }
        .ramadanBackground()
        .navigationTitle(vm.restaurant?.name ?? "لوحة المطعم")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showStatusPicker) {
            if let order = statusPickerOrder {
                orderStatusPickerSheet(order)
            }
        }
        .task {
            guard let uid = appState.currentUser?.uid else { return }
            await vm.loadDashboard(ownerId: uid, token: try? await appState.validToken())
            if let rest = vm.restaurant {
                editRestName = rest.name == "مطعم" ? "" : rest.name
                editRestPhone = rest.phone ?? ""
            }
            // تحديث تلقائي للطلبات كل 15 ثانية
            startOrderRefreshTimer(uid: uid)
        }
        .onDisappear {
            orderRefreshTask?.cancel()
            orderRefreshTask = nil
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
        .sheet(isPresented: $showCancelSheet) {
            cancelOrderSheet
        }
    }
    
    // MARK: - Quick Orders Bar (shortcut)
    private var quickOrdersBar: some View {
        Button {
            withAnimation(.easeInOut(duration: 0.2)) { selectedTab = 2 }
        } label: {
            HStack(spacing: SofraSpacing.sm) {
                // Pulsing indicator
                Circle()
                    .fill(SofraColors.error)
                    .frame(width: 10, height: 10)
                    .overlay(
                        Circle()
                            .stroke(SofraColors.error.opacity(0.5), lineWidth: 2)
                            .scaleEffect(1.5)
                    )
                
                Text("لديك \(pendingOrdersCount) طلبات جديدة")
                    .font(SofraTypography.calloutSemibold)
                    .foregroundStyle(.white)
                
                Spacer()
                
                HStack(spacing: 4) {
                    Text("عرض الطلبات")
                        .font(SofraTypography.caption)
                    Image(systemName: "chevron.left")
                        .font(.caption)
                }
                .foregroundStyle(.white.opacity(0.8))
            }
            .padding(.horizontal, SofraSpacing.screenHorizontal)
            .padding(.vertical, SofraSpacing.sm)
            .background(
                LinearGradient(
                    colors: [Color(hex: "#EF4444"), Color(hex: "#DC2626")],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
        }
    }
    
    // MARK: - Cancel Order Sheet
    private var cancelOrderSheet: some View {
        NavigationStack {
            VStack(spacing: SofraSpacing.lg) {
                // Order info
                if let order = cancellingOrder {
                    SofraCard {
                        HStack {
                            VStack(alignment: .trailing, spacing: 4) {
                                Text("#\(order.id.prefix(8))")
                                    .font(SofraTypography.headline)
                                if let name = order.customerName, !name.isEmpty {
                                    Text(name)
                                        .font(SofraTypography.caption)
                                        .foregroundStyle(SofraColors.textMuted)
                                }
                            }
                            Spacer()
                            Text("\(order.total, specifier: "%.2f") ر.س")
                                .font(SofraTypography.price)
                                .foregroundStyle(SofraColors.primaryDark)
                        }
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                }
                
                // Reason input
                VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
                    Text("سبب الإلغاء (مطلوب)")
                        .font(SofraTypography.headline)
                        .foregroundStyle(SofraColors.textPrimary)
                    
                    TextEditor(text: $cancelReason)
                        .frame(minHeight: 100)
                        .font(SofraTypography.body)
                        .scrollContentBackground(.hidden)
                        .padding(SofraSpacing.sm)
                        .background(SofraColors.surfaceElevated)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(SofraColors.sky200, lineWidth: 1)
                        )
                    
                    Text("سيتم إرسال السبب للعميل وإشعار الإدارة")
                        .font(SofraTypography.caption)
                        .foregroundStyle(SofraColors.textMuted)
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)
                
                // Quick reasons
                VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
                    Text("أسباب شائعة")
                        .font(SofraTypography.caption)
                        .foregroundStyle(SofraColors.textMuted)
                    
                    FlowLayout(spacing: 8) {
                        quickReasonChip("المكونات غير متوفرة")
                        quickReasonChip("المطعم مغلق")
                        quickReasonChip("ضغط عمل كبير")
                        quickReasonChip("خطأ في الطلب")
                        quickReasonChip("العنوان غير واضح")
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)
                
                Spacer()
                
                // Actions
                VStack(spacing: SofraSpacing.sm) {
                    SofraButton(
                        title: "إلغاء الطلب",
                        icon: "xmark.circle.fill",
                        style: .destructive,
                        isDisabled: cancelReason.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                    ) {
                        if let order = cancellingOrder {
                            Task {
                                await vm.cancelOrderWithReason(
                                    order: order,
                                    reason: cancelReason.trimmingCharacters(in: .whitespacesAndNewlines),
                                    restaurantName: vm.restaurant?.name ?? "المطعم",
                                    token: try? await appState.validToken()
                                )
                                cancelReason = ""
                                cancellingOrder = nil
                                showCancelSheet = false
                            }
                        }
                    }
                    
                    SofraButton(title: "تراجع", style: .ghost) {
                        cancelReason = ""
                        showCancelSheet = false
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)
                .padding(.bottom, SofraSpacing.lg)
            }
            .padding(.top, SofraSpacing.md)
            .navigationTitle("إلغاء الطلب")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("إغلاق") {
                        cancelReason = ""
                        showCancelSheet = false
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
    
    private func quickReasonChip(_ reason: String) -> some View {
        Button {
            cancelReason = reason
        } label: {
            Text(reason)
                .font(SofraTypography.caption)
                .foregroundStyle(cancelReason == reason ? .white : SofraColors.textSecondary)
                .padding(.horizontal, SofraSpacing.sm)
                .padding(.vertical, 6)
                .background(cancelReason == reason ? SofraColors.primary : SofraColors.sky100)
                .clipShape(Capsule())
        }
    }
    

    
    // MARK: - Order Status Picker Sheet
    private func orderStatusPickerSheet(_ order: Order) -> some View {
        NavigationStack {
            VStack(spacing: SofraSpacing.lg) {
                // Order info header
                SofraCard {
                    HStack {
                        VStack(alignment: .trailing, spacing: 4) {
                            Text("#\(order.id.prefix(8))")
                                .font(SofraTypography.headline)
                            if let name = order.customerName, !name.isEmpty {
                                Text(name)
                                    .font(SofraTypography.caption)
                                    .foregroundStyle(SofraColors.textMuted)
                            }
                        }
                        Spacer()
                        StatusBadge(text: order.status.arabicLabel, color: order.status.uiColor)
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)
                
                // Status options
                VStack(spacing: SofraSpacing.sm) {
                    Text("تغيير الحالة")
                        .font(SofraTypography.headline)
                        .foregroundStyle(SofraColors.textPrimary)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                        .padding(.horizontal, SofraSpacing.screenHorizontal)
                    
                    ScrollView {
                        VStack(spacing: SofraSpacing.sm) {
                            ForEach(availableStatuses(for: order.status), id: \.self) { status in
                                statusOptionCard(order: order, targetStatus: status)
                            }
                        }
                        .padding(.horizontal, SofraSpacing.screenHorizontal)
                    }
                }
                
                Spacer()
                
                // Cancel option
                if order.status != .delivered && order.status != .cancelled {
                    SofraButton(
                        title: "إلغاء الطلب",
                        icon: "xmark.circle.fill",
                        style: .destructive
                    ) {
                        showStatusPicker = false
                        cancellingOrder = order
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                            showCancelSheet = true
                        }
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                    .padding(.bottom, SofraSpacing.lg)
                }
            }
            .padding(.top, SofraSpacing.md)
            .navigationTitle("إدارة الطلب")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("إغلاق") {
                        showStatusPicker = false
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }
    
    private func availableStatuses(for currentStatus: OrderStatus) -> [OrderStatus] {
        switch currentStatus {
        case .pending:
            return [.accepted]
        case .accepted:
            return [.preparing, .pending] // Can go back to pending
        case .preparing:
            return [.ready, .accepted] // Can go back
        case .ready:
            return [.outForDelivery, .preparing] // Can go back
        case .outForDelivery:
            return [.delivered, .ready] // Can go back
        case .delivered, .cancelled:
            return []
        }
    }
    
    private func statusOptionCard(order: Order, targetStatus: OrderStatus) -> some View {
        let isForward = statusIndex(targetStatus) > statusIndex(order.status)
        let config = statusConfig(for: targetStatus, isForward: isForward)
        
        return Button {
            Task {
                await vm.updateOrderStatus(
                    orderId: order.id,
                    newStatus: targetStatus,
                    customerId: order.customerId,
                    token: try? await appState.validToken()
                )
                showStatusPicker = false
            }
        } label: {
            HStack(spacing: SofraSpacing.md) {
                // Icon
                ZStack {
                    Circle()
                        .fill(config.gradient)
                        .frame(width: 50, height: 50)
                        .shadow(color: config.color.opacity(0.3), radius: 6, x: 0, y: 3)
                    
                    Image(systemName: config.icon)
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundStyle(.white)
                }
                
                VStack(alignment: .leading, spacing: 4) {
                    HStack(spacing: 6) {
                        Text(config.title)
                            .font(SofraTypography.headline)
                            .foregroundStyle(SofraColors.textPrimary)
                        
                        if !isForward {
                            Text("رجوع")
                                .font(.caption2.bold())
                                .foregroundStyle(.white)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(SofraColors.warning)
                                .clipShape(Capsule())
                        }
                    }
                    
                    Text(config.subtitle)
                        .font(SofraTypography.caption)
                        .foregroundStyle(SofraColors.textMuted)
                }
                
                Spacer()
                
                Image(systemName: isForward ? "arrow.left.circle.fill" : "arrow.right.circle.fill")
                    .font(.system(size: 24))
                    .foregroundStyle(config.color.opacity(0.7))
            }
            .padding(SofraSpacing.md)
            .background(SofraColors.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous)
                    .stroke(config.color.opacity(0.2), lineWidth: 1)
            )
            .shadow(color: .black.opacity(0.04), radius: 4, y: 2)
        }
    }
    
    private func statusIndex(_ status: OrderStatus) -> Int {
        switch status {
        case .pending: return 0
        case .accepted: return 1
        case .preparing: return 2
        case .ready: return 3
        case .outForDelivery: return 4
        case .delivered: return 5
        case .cancelled: return -1
        }
    }
    
    private func statusConfig(for status: OrderStatus, isForward: Bool) -> (icon: String, title: String, subtitle: String, color: Color, gradient: LinearGradient) {
        switch status {
        case .pending:
            return ("clock.fill", "انتظار", "إرجاع للمراجعة", SofraColors.warning,
                   LinearGradient(colors: [SofraColors.warning, SofraColors.warning.opacity(0.8)], startPoint: .topLeading, endPoint: .bottomTrailing))
        case .accepted:
            return ("checkmark.circle.fill", "مقبول", isForward ? "قبول الطلب" : "إرجاع لمقبول", Color(hex: "#10B981"),
                   LinearGradient(colors: [Color(hex: "#10B981"), Color(hex: "#059669")], startPoint: .topLeading, endPoint: .bottomTrailing))
        case .preparing:
            return ("flame.fill", "تحضير", isForward ? "بدء التحضير" : "إرجاع للتحضير", Color(hex: "#F97316"),
                   LinearGradient(colors: [Color(hex: "#F97316"), Color(hex: "#EA580C")], startPoint: .topLeading, endPoint: .bottomTrailing))
        case .ready:
            return ("bag.fill", "جاهز", isForward ? "الطلب جاهز" : "إرجاع لجاهز", SofraColors.gold500,
                   LinearGradient(colors: [SofraColors.gold500, SofraColors.gold600], startPoint: .topLeading, endPoint: .bottomTrailing))
        case .outForDelivery:
            return ("car.fill", "في الطريق", isForward ? "إرسال للتوصيل" : "إرجاع للتوصيل", Color(hex: "#6366F1"),
                   LinearGradient(colors: [Color(hex: "#6366F1"), Color(hex: "#4F46E5")], startPoint: .topLeading, endPoint: .bottomTrailing))
        case .delivered:
            return ("gift.fill", "تم التسليم", "تأكيد التسليم", Color(hex: "#10B981"),
                   LinearGradient(colors: [Color(hex: "#10B981"), Color(hex: "#047857")], startPoint: .topLeading, endPoint: .bottomTrailing))
        case .cancelled:
            return ("xmark.circle.fill", "ملغي", "تم الإلغاء", SofraColors.error,
                   LinearGradient(colors: [SofraColors.error, SofraColors.error.opacity(0.8)], startPoint: .topLeading, endPoint: .bottomTrailing))
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // MARK: - Order Auto-Refresh Timer
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    private func startOrderRefreshTimer(uid: String) {
        orderRefreshTask?.cancel()
        orderRefreshTask = Task {
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(15))
                guard !Task.isCancelled else { break }
                let token = try? await appState.validToken()
                await vm.loadOrders(ownerId: uid, token: token)
            }
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
                ownerTabPill("المطاعم", icon: "storefront.fill", tag: 6)
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
        case cancelled = "ملغية"

        var matchingStatuses: [OrderStatus] {
            switch self {
            case .new: return [.pending]
            case .preparing: return [.accepted, .preparing]
            case .ready: return [.ready]
            case .delivery: return [.outForDelivery]
            case .delivered: return [.delivered]
            case .cancelled: return [.cancelled]
            }
        }

        var icon: String {
            switch self {
            case .new: return "bell.badge.fill"
            case .preparing: return "flame.fill"
            case .ready: return "bag.fill"
            case .delivery: return "car.fill"
            case .delivered: return "checkmark.seal.fill"
            case .cancelled: return "xmark.circle.fill"
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
            
            // Order Progress Indicator (only for active non-cancelled orders)
            if order.status != .cancelled {
                orderProgressIndicator(order.status)
                    .padding(.vertical, SofraSpacing.xs)
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
                        HStack(spacing: 6) {
                            Image(systemName: "bubble.left.and.bubble.right.fill")
                                .font(.system(size: 13, weight: .medium))
                            Text("محادثة")
                                .font(SofraTypography.caption)
                                .fontWeight(.medium)
                        }
                        .foregroundStyle(SofraColors.info)
                        .padding(.horizontal, SofraSpacing.sm)
                        .padding(.vertical, 8)
                        .background(
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .fill(SofraColors.info.opacity(0.1))
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .stroke(SofraColors.info.opacity(0.3), lineWidth: 1)
                        )
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
            HStack(spacing: SofraSpacing.sm) {
                // Accept button - premium
                Button {
                    Task { await vm.updateOrderStatus(orderId: order.id, newStatus: .accepted, customerId: order.customerId, token: try? await appState.validToken()) }
                } label: {
                    luxuryActionButton(
                        text: "قبول",
                        icon: "checkmark.circle.fill",
                        config: .accept
                    )
                }
                
                // Reject button
                Button {
                    cancellingOrder = order
                    showCancelSheet = true
                } label: {
                    luxuryActionButton(
                        text: "رفض",
                        icon: "xmark.circle.fill",
                        config: .reject
                    )
                }
            }
            
        case .accepted:
            HStack(spacing: SofraSpacing.sm) {
                Button {
                    Task { await vm.updateOrderStatus(orderId: order.id, newStatus: .preparing, customerId: order.customerId, token: try? await appState.validToken()) }
                } label: {
                    luxuryActionButton(
                        text: "تحضير",
                        icon: "flame.fill",
                        config: .preparing
                    )
                }
                
                statusManageButton(order)
            }
            
        case .preparing:
            HStack(spacing: SofraSpacing.sm) {
                Button {
                    Task { await vm.updateOrderStatus(orderId: order.id, newStatus: .ready, customerId: order.customerId, token: try? await appState.validToken()) }
                } label: {
                    luxuryActionButton(
                        text: "جاهز",
                        icon: "bag.fill",
                        config: .ready
                    )
                }
                
                statusManageButton(order)
            }
            
        case .ready:
            HStack(spacing: SofraSpacing.sm) {
                Button {
                    Task { await vm.updateOrderStatus(orderId: order.id, newStatus: .outForDelivery, customerId: order.customerId, token: try? await appState.validToken()) }
                } label: {
                    luxuryActionButton(
                        text: "توصيل",
                        icon: "car.fill",
                        config: .delivery
                    )
                }
                
                statusManageButton(order)
            }
            
        case .outForDelivery:
            HStack(spacing: SofraSpacing.sm) {
                Button {
                    Task { await vm.updateOrderStatus(orderId: order.id, newStatus: .delivered, customerId: order.customerId, token: try? await appState.validToken()) }
                } label: {
                    luxuryActionButton(
                        text: "تم",
                        icon: "gift.fill",
                        config: .complete
                    )
                }
                
                statusManageButton(order)
            }
            
        default:
            EmptyView()
        }
    }
    
    private func statusManageButton(_ order: Order) -> some View {
        Button {
            statusPickerOrder = order
            showStatusPicker = true
        } label: {
            Image(systemName: "slider.horizontal.3")
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(SofraColors.textSecondary)
                .padding(12)
                .background(
                    Circle()
                        .fill(SofraColors.sky100)
                )
                .overlay(
                    Circle()
                        .stroke(SofraColors.sky200, lineWidth: 1)
                )
        }
    }
    
    // MARK: - Luxury Action Button
    private enum LuxuryButtonConfig {
        case accept, reject, preparing, ready, delivery, complete
        
        var gradient: LinearGradient {
            switch self {
            case .accept:
                return LinearGradient(
                    stops: [
                        .init(color: Color(hex: "#22C55E"), location: 0),
                        .init(color: Color(hex: "#16A34A"), location: 0.5),
                        .init(color: Color(hex: "#15803D"), location: 1)
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
            case .reject:
                return LinearGradient(
                    stops: [
                        .init(color: Color(hex: "#F87171"), location: 0),
                        .init(color: Color(hex: "#EF4444"), location: 0.5),
                        .init(color: Color(hex: "#DC2626"), location: 1)
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
            case .preparing:
                return LinearGradient(
                    stops: [
                        .init(color: Color(hex: "#FB923C"), location: 0),
                        .init(color: Color(hex: "#F97316"), location: 0.5),
                        .init(color: Color(hex: "#EA580C"), location: 1)
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
            case .ready:
                return LinearGradient(
                    stops: [
                        .init(color: SofraColors.gold400, location: 0),
                        .init(color: SofraColors.gold500, location: 0.5),
                        .init(color: SofraColors.gold600, location: 1)
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
            case .delivery:
                return LinearGradient(
                    stops: [
                        .init(color: Color(hex: "#818CF8"), location: 0),
                        .init(color: Color(hex: "#6366F1"), location: 0.5),
                        .init(color: Color(hex: "#4F46E5"), location: 1)
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
            case .complete:
                return LinearGradient(
                    stops: [
                        .init(color: Color(hex: "#34D399"), location: 0),
                        .init(color: Color(hex: "#10B981"), location: 0.5),
                        .init(color: Color(hex: "#059669"), location: 1)
                    ],
                    startPoint: .top,
                    endPoint: .bottom
                )
            }
        }
        
        var glowColor: Color {
            switch self {
            case .accept, .complete: return Color(hex: "#22C55E")
            case .reject: return Color(hex: "#EF4444")
            case .preparing: return Color(hex: "#F97316")
            case .ready: return SofraColors.gold500
            case .delivery: return Color(hex: "#6366F1")
            }
        }
        
        var iconBackground: Color {
            switch self {
            case .accept, .complete: return Color(hex: "#166534")
            case .reject: return Color(hex: "#991B1B")
            case .preparing: return Color(hex: "#9A3412")
            case .ready: return SofraColors.gold700
            case .delivery: return Color(hex: "#3730A3")
            }
        }
    }
    
    private func luxuryActionButton(text: String, icon: String, config: LuxuryButtonConfig) -> some View {
        HStack(spacing: SofraSpacing.xs) {
            // Icon with circular background
            ZStack {
                Circle()
                    .fill(config.iconBackground.opacity(0.5))
                    .frame(width: 26, height: 26)
                
                Image(systemName: icon)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundStyle(.white)
            }
            
            Text(text)
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(.white)
        }
        .padding(.leading, 6)
        .padding(.trailing, 14)
        .padding(.vertical, 10)
        .background(
            ZStack {
                // Main gradient
                config.gradient
                
                // Inner highlight at top
                LinearGradient(
                    colors: [.white.opacity(0.25), .clear],
                    startPoint: .top,
                    endPoint: .center
                )
                
                // Subtle inner shadow at bottom
                LinearGradient(
                    colors: [.clear, .black.opacity(0.15)],
                    startPoint: .center,
                    endPoint: .bottom
                )
            }
        )
        .clipShape(Capsule())
        .overlay(
            Capsule()
                .stroke(
                    LinearGradient(
                        colors: [.white.opacity(0.4), .white.opacity(0.1)],
                        startPoint: .top,
                        endPoint: .bottom
                    ),
                    lineWidth: 1
                )
        )
        .shadow(color: config.glowColor.opacity(0.4), radius: 8, x: 0, y: 4)
        .shadow(color: config.glowColor.opacity(0.2), radius: 16, x: 0, y: 8)
    }
    
    // MARK: - Order Progress Indicator
    private func orderProgressIndicator(_ status: OrderStatus) -> some View {
        let steps: [(icon: String, label: String, status: OrderStatus)] = [
            ("clock.fill", "انتظار", .pending),
            ("checkmark.circle.fill", "مقبول", .accepted),
            ("flame.fill", "تحضير", .preparing),
            ("bag.fill", "جاهز", .ready),
            ("car.fill", "توصيل", .outForDelivery),
            ("gift.fill", "تم", .delivered)
        ]
        
        let currentIndex = steps.firstIndex { $0.status == status } ?? 0
        
        return HStack(spacing: 0) {
            ForEach(Array(steps.enumerated()), id: \.offset) { index, step in
                let isCompleted = index < currentIndex
                let isCurrent = index == currentIndex
                
                // Step circle
                ZStack {
                    Circle()
                        .fill(isCompleted || isCurrent ? stepColor(for: step.status) : SofraColors.sky200)
                        .frame(width: 28, height: 28)
                    
                    if isCompleted {
                        Image(systemName: "checkmark")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(.white)
                    } else {
                        Image(systemName: step.icon)
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(isCurrent ? .white : SofraColors.textMuted)
                    }
                }
                .scaleEffect(isCurrent ? 1.1 : 1.0)
                .animation(.spring(duration: 0.3), value: status)
                
                // Connecting line
                if index < steps.count - 1 {
                    Rectangle()
                        .fill(isCompleted ? stepColor(for: step.status) : SofraColors.sky200)
                        .frame(height: 3)
                        .frame(maxWidth: .infinity)
                }
            }
        }
        .padding(.horizontal, SofraSpacing.xs)
    }
    
    private func stepColor(for status: OrderStatus) -> Color {
        switch status {
        case .pending: return SofraColors.warning
        case .accepted: return SofraColors.success
        case .preparing: return Color(hex: "#F97316")
        case .ready: return SofraColors.gold500
        case .outForDelivery: return SofraColors.info
        case .delivered: return SofraColors.success
        case .cancelled: return SofraColors.error
        }
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
    // MARK: - 7) المطاعم — All Restaurants Tab
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    @State private var restaurantsVM = RestaurantsViewModel()
    @State private var restSearchText = ""

    private var ownerRestaurants: some View {
        ScrollView {
            LazyVStack(spacing: SofraSpacing.md) {
                // Info banner
                HStack(spacing: SofraSpacing.xs) {
                    Text("جميع المطاعم المفعّلة على المنصة")
                        .font(SofraTypography.caption)
                        .foregroundStyle(SofraColors.textMuted)
                    Spacer()
                    Image(systemName: "storefront.fill")
                        .font(.caption2)
                        .foregroundStyle(SofraColors.primary)
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                if restaurantsVM.isLoading && restaurantsVM.restaurants.isEmpty {
                    ForEach(0..<5, id: \.self) { _ in
                        SkeletonCard()
                    }
                } else if let error = restaurantsVM.errorMessage {
                    ErrorStateView(message: error) {
                        await loadAllRestaurants()
                    }
                } else if filteredAllRestaurants.isEmpty {
                    EmptyStateView(
                        icon: "magnifyingglass",
                        title: "لا توجد نتائج",
                        message: restSearchText.isEmpty
                            ? "لا توجد مطاعم مفعّلة حالياً"
                            : "لم نجد مطاعم تطابق '\(restSearchText)'"
                    )
                } else {
                    // Search bar
                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundStyle(SofraColors.textMuted)
                        TextField("ابحث عن مطعم...", text: $restSearchText)
                            .font(SofraTypography.body)
                            .textFieldStyle(.plain)
                        if !restSearchText.isEmpty {
                            Button {
                                restSearchText = ""
                            } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundStyle(SofraColors.textMuted)
                            }
                        }
                    }
                    .padding(SofraSpacing.sm)
                    .background(SofraColors.cardBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                    .padding(.horizontal, SofraSpacing.screenHorizontal)

                    Text("\(filteredAllRestaurants.count) مطعم")
                        .font(SofraTypography.caption)
                        .foregroundStyle(SofraColors.textMuted)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                        .padding(.horizontal, SofraSpacing.screenHorizontal)

                    ForEach(filteredAllRestaurants) { restaurant in
                        ownerRestaurantRow(restaurant)
                    }
                }
            }
            .padding(.top, SofraSpacing.md)
            .padding(.bottom, SofraSpacing.xxxl)
        }
        .refreshable {
            await loadAllRestaurants()
        }
        .task {
            if restaurantsVM.restaurants.isEmpty {
                await loadAllRestaurants()
            }
        }
    }

    private func loadAllRestaurants() async {
        let token = (try? await appState.validToken()) ?? appState.idToken
        await restaurantsVM.loadRestaurants(
            token: token,
            showAll: true
        )
    }

    private var filteredAllRestaurants: [Restaurant] {
        if restSearchText.isEmpty { return restaurantsVM.restaurants }
        return restaurantsVM.restaurants.filter {
            $0.name.localizedCaseInsensitiveContains(restSearchText) ||
            ($0.city?.localizedCaseInsensitiveContains(restSearchText) ?? false)
        }
    }

    private func ownerRestaurantRow(_ restaurant: Restaurant) -> some View {
        HStack(spacing: SofraSpacing.md) {
            // Info
            VStack(alignment: .trailing, spacing: SofraSpacing.xs) {
                HStack(spacing: SofraSpacing.xs) {
                    StatusBadge(
                        text: restaurant.isOpen ? "مفتوح" : "مغلق",
                        color: restaurant.isOpen ? SofraColors.success : SofraColors.error
                    )
                    Spacer()
                    Text(restaurant.name)
                        .font(SofraTypography.headline)
                        .foregroundStyle(SofraColors.textPrimary)
                        .lineLimit(1)
                }

                HStack {
                    if let count = restaurant.menuItemCount, count > 0 {
                        Text("\(count) منتج")
                            .font(.caption2)
                            .foregroundStyle(SofraColors.textMuted)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(SofraColors.sky100)
                            .clipShape(Capsule())
                    }
                    if let city = restaurant.city {
                        Text(city)
                            .font(.caption2)
                            .foregroundStyle(SofraColors.textMuted)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(SofraColors.sky100)
                            .clipShape(Capsule())
                    }
                    Spacer()
                    if let phone = restaurant.phone, !phone.isEmpty {
                        Text(phone)
                            .font(SofraTypography.caption)
                            .foregroundStyle(SofraColors.textSecondary)
                    }
                }

                HStack {
                    Text(restaurant.packageType == .premium ? "ذهبية" : "أساسية")
                        .font(.caption2.bold())
                        .foregroundStyle(restaurant.packageType == .premium ? SofraColors.gold400 : SofraColors.textMuted)
                    Spacer()
                    if let orders = restaurant.totalOrders, orders > 0 {
                        Text("\(orders) طلب")
                            .font(.caption2)
                            .foregroundStyle(SofraColors.textSecondary)
                    }
                }
            }

            // Logo
            CachedPhaseImage(url: URL(string: restaurant.logoUrl ?? restaurant.coverUrl ?? "")) { phase in
                switch phase {
                case .success(let img):
                    img.resizable().aspectRatio(contentMode: .fill)
                default:
                    ZStack {
                        SofraColors.sky100
                        Image(systemName: "storefront.fill")
                            .foregroundStyle(SofraColors.sky300)
                    }
                }
            }
            .frame(width: 56, height: 56)
            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        }
        .padding(SofraSpacing.cardPadding)
        .background(SofraColors.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
        .shadow(color: .black.opacity(0.03), radius: 4, y: 2)
        .padding(.horizontal, SofraSpacing.screenHorizontal)
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
