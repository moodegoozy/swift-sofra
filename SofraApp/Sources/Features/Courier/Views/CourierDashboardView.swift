// CourierDashboardView.swift
// لوحة المندوب: تقديم طلب توظيف → بعد القبول يرى طلبات المطعم ومواقع التوصيل

import SwiftUI
import MapKit

struct CourierDashboardView: View {
    @Environment(AppState.self) var appState
    @State private var vm = CourierDashboardViewModel()
    @State private var selectedHiringRestaurant: Restaurant?

    var body: some View {
        Group {
            if vm.isLoading && vm.courierStatus == .notApplied {
                loadingView
            } else {
                switch vm.courierStatus {
                case .notApplied, .rejected:
                    hiringBrowseView
                case .pending:
                    pendingView
                case .approved:
                    approvedDashboard
                }
            }
        }
        .ramadanBackground()
        .navigationTitle("لوحة المندوب")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            guard let uid = appState.currentUser?.uid else { return }
            await vm.loadDashboard(courierId: uid, token: try? await appState.validToken())
        }
    }

    // MARK: - Loading
    private var loadingView: some View {
        VStack(spacing: SofraSpacing.lg) {
            Spacer()
            ProgressView()
                .scaleEffect(1.5)
                .tint(SofraColors.gold400)
            Text("جاري التحميل...")
                .font(SofraTypography.body)
                .foregroundStyle(SofraColors.textSecondary)
            Spacer()
        }
    }

    // MARK: - Browse Hiring Restaurants (not applied / rejected)
    private var hiringBrowseView: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.lg) {
                // Header
                VStack(spacing: SofraSpacing.sm) {
                    Image(systemName: "car.fill")
                        .font(.system(size: 48))
                        .foregroundStyle(SofraColors.gold400)

                    Text("ابحث عن مطعم للعمل")
                        .font(SofraTypography.title2)
                        .foregroundStyle(SofraColors.gold300)

                    Text("اختر مطعم يوظف مناديب وقدم طلبك")
                        .font(SofraTypography.body)
                        .foregroundStyle(SofraColors.textSecondary)
                }
                .padding(.top, SofraSpacing.xl)

                if vm.courierStatus == .rejected {
                    // Rejected notice
                    HStack(spacing: SofraSpacing.sm) {
                        VStack(alignment: .trailing, spacing: SofraSpacing.xs) {
                            Text("تم رفض طلبك السابق")
                                .font(SofraTypography.headline)
                                .foregroundStyle(SofraColors.error)
                            Text("يمكنك التقديم في مطعم آخر")
                                .font(SofraTypography.caption)
                                .foregroundStyle(SofraColors.textSecondary)
                        }
                        Spacer()
                        Image(systemName: "exclamationmark.circle.fill")
                            .font(.title2)
                            .foregroundStyle(SofraColors.error)
                    }
                    .padding(SofraSpacing.cardPadding)
                    .background(SofraColors.error.opacity(0.08))
                    .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous)
                            .strokeBorder(SofraColors.error.opacity(0.3), lineWidth: 1)
                    )
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                }

                // Messages
                if let error = vm.errorMessage {
                    Text(error).font(SofraTypography.callout).foregroundStyle(SofraColors.error)
                }
                if let success = vm.successMessage {
                    Text(success).font(SofraTypography.callout).foregroundStyle(SofraColors.success)
                }

                // Hiring Restaurants List
                VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
                    Text("مطاعم تبحث عن مناديب")
                        .font(SofraTypography.title3)
                        .padding(.horizontal, SofraSpacing.screenHorizontal)

                    if vm.hiringRestaurants.isEmpty {
                        EmptyStateView(
                            icon: "storefront",
                            title: "لا توجد مطاعم تبحث عن مناديب",
                            message: "تحقق لاحقاً. المطاعم تحدث حالة التوظيف باستمرار"
                        )
                    } else {
                        ForEach(vm.hiringRestaurants) { restaurant in
                            Button {
                                selectedHiringRestaurant = restaurant
                            } label: {
                                hiringRestaurantCard(restaurant)
                            }
                            .buttonStyle(.plain)
                            .padding(.horizontal, SofraSpacing.screenHorizontal)
                        }
                    }
                }

                Spacer(minLength: SofraSpacing.xxxl)
            }
        }
        .sheet(item: $selectedHiringRestaurant) { restaurant in
            CourierApplyView(restaurant: restaurant)
        }
        .refreshable {
            guard let uid = appState.currentUser?.uid else { return }
            await vm.loadDashboard(courierId: uid, token: try? await appState.validToken())
        }
    }

    private func hiringRestaurantCard(_ restaurant: Restaurant) -> some View {
        SofraCard {
            VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
                HStack {
                    Image(systemName: "chevron.left")
                        .foregroundStyle(SofraColors.textMuted)

                    StatusBadge(text: "يوظف مناديب", color: SofraColors.success)

                    Spacer()

                    VStack(alignment: .trailing) {
                        Text(restaurant.name)
                            .font(SofraTypography.headline)
                            .foregroundStyle(SofraColors.textPrimary)
                        if let city = restaurant.city {
                            Label(city, systemImage: "location.fill")
                                .font(SofraTypography.caption)
                                .foregroundStyle(SofraColors.textSecondary)
                        }
                    }

                    // Restaurant icon
                    ZStack {
                        Circle()
                            .fill(SofraColors.sky100)
                            .frame(width: 48, height: 48)
                        Image(systemName: "storefront.fill")
                            .foregroundStyle(SofraColors.primary)
                    }
                }

                if let desc = restaurant.hiringDescription, !desc.isEmpty {
                    Text(desc)
                        .font(SofraTypography.caption)
                        .foregroundStyle(SofraColors.textSecondary)
                        .multilineTextAlignment(.trailing)
                        .lineLimit(2)
                }
            }
        }
    }

    // MARK: - Pending Application View
    private var pendingView: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.xl) {
                Spacer(minLength: SofraSpacing.xxxl)

                VStack(spacing: SofraSpacing.md) {
                    Image(systemName: "clock.badge.checkmark")
                        .font(.system(size: 60))
                        .foregroundStyle(SofraColors.warning)

                    Text("طلبك قيد المراجعة")
                        .font(SofraTypography.title2)
                        .foregroundStyle(SofraColors.gold300)

                    Text("تم إرسال طلب التوظيف بنجاح")
                        .font(SofraTypography.body)
                        .foregroundStyle(SofraColors.textSecondary)
                }

                if let app = vm.myApplication {
                    SofraCard {
                        VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
                            HStack {
                                StatusBadge(text: "معلق", color: SofraColors.warning)
                                Spacer()
                                Text("تفاصيل الطلب")
                                    .font(SofraTypography.headline)
                                    .foregroundStyle(SofraColors.gold400)
                            }

                            Divider()

                            infoRow(icon: "storefront.fill", label: "المطعم", value: app.restaurantName)
                            infoRow(icon: "person.fill", label: "الاسم", value: app.courierName)
                            infoRow(icon: "phone.fill", label: "الجوال", value: app.courierPhone)
                            infoRow(icon: "car.fill", label: "نوع المركبة", value: app.vehicleType)

                            if let date = app.createdAt {
                                infoRow(icon: "calendar", label: "تاريخ التقديم", value: date.relativeArabic)
                            }
                        }
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                }

                Text("سيتم إشعارك عند قبول طلبك من المطعم")
                    .font(SofraTypography.caption)
                    .foregroundStyle(SofraColors.textMuted)
                    .multilineTextAlignment(.center)

                Spacer(minLength: SofraSpacing.xxxl)
            }
        }
        .refreshable {
            guard let uid = appState.currentUser?.uid else { return }
            await vm.loadDashboard(courierId: uid, token: try? await appState.validToken())
        }
    }

    // MARK: - Approved Dashboard (Full)
    @State private var selectedTab = 0

    private var approvedDashboard: some View {
        VStack(spacing: 0) {
            // Tab Bar
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: SofraSpacing.sm) {
                    courierTab("الطلبات", icon: "box.truck.fill", tag: 0)
                    courierTab("توصيلاتي", icon: "shippingbox.fill", tag: 1)
                    courierTab("السجل", icon: "clock.fill", tag: 2)
                    courierTab("الأرباح", icon: "banknote.fill", tag: 3)
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)
                .padding(.vertical, SofraSpacing.sm)
            }
            .background(SofraColors.cardBackground)

            TabView(selection: $selectedTab) {
                restaurantOrdersTab.tag(0)
                activeDeliveriesTab.tag(1)
                deliveryHistoryTab.tag(2)
                earningsTab.tag(3)
            }
            .tabViewStyle(.page(indexDisplayMode: .never))
        }
    }

    private func courierTab(_ title: String, icon: String, tag: Int) -> some View {
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

    // MARK: - Restaurant Orders Tab (Ready for Pickup)
    private var restaurantOrdersTab: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.lg) {
                // Restaurant info
                HStack {
                    StatusBadge(
                        text: vm.isAvailable ? "متاح" : "غير متاح",
                        color: vm.isAvailable ? SofraColors.success : SofraColors.error
                    )

                    Toggle("", isOn: Binding(
                        get: { vm.isAvailable },
                        set: { newVal in
                            Task { await vm.toggleAvailability(available: newVal, token: try? await appState.validToken()) }
                        }
                    ))
                    .tint(SofraColors.success)
                    .frame(width: 60)

                    Spacer()

                    VStack(alignment: .trailing) {
                        Text(vm.assignedRestaurantName ?? "المطعم")
                            .font(SofraTypography.headline)
                        Text("طلبات جاهزة للتوصيل")
                            .font(SofraTypography.caption)
                            .foregroundStyle(SofraColors.textSecondary)
                    }

                    Image(systemName: "storefront.fill")
                        .font(.title2)
                        .foregroundStyle(SofraColors.gold400)
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                // Stats
                LazyVGrid(columns: [.init(.flexible()), .init(.flexible())], spacing: SofraSpacing.md) {
                    statCard("جاهزة", value: "\(vm.restaurantOrders.count)", icon: "bag.fill", color: SofraColors.warning)
                    statCard("قيد التوصيل", value: "\(vm.activeOrders.count)", icon: "box.truck.fill", color: SofraColors.info)
                    statCard("التوصيلات", value: "\(vm.totalDeliveries)", icon: "checkmark.circle.fill", color: SofraColors.success)
                    statCard("أرباح اليوم", value: String(format: "%.0f ر.س", vm.todayEarnings), icon: "banknote.fill", color: SofraColors.gold400)
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                // Ready Orders
                if vm.restaurantOrders.isEmpty {
                    EmptyStateView(
                        icon: "tray",
                        title: "لا توجد طلبات جاهزة",
                        message: "ستظهر هنا الطلبات الجاهزة للتوصيل"
                    )
                } else {
                    ForEach(vm.restaurantOrders) { order in
                        readyOrderCard(order)
                            .padding(.horizontal, SofraSpacing.screenHorizontal)
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

    private func readyOrderCard(_ order: Order) -> some View {
        SofraCard {
            VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
                HStack {
                    Button("قبول التوصيل") {
                        Task {
                            await vm.acceptDelivery(
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

                    Spacer()

                    VStack(alignment: .trailing) {
                        Text("#\(order.id.prefix(8))")
                            .font(SofraTypography.headline)
                        Text("\(order.items.count) أصناف")
                            .font(SofraTypography.caption)
                            .foregroundStyle(SofraColors.textMuted)
                    }
                }

                // Customer delivery address
                if let addr = order.address, !addr.isEmpty {
                    HStack {
                        Spacer()
                        Label {
                            Text(addr)
                                .font(SofraTypography.caption)
                                .foregroundStyle(SofraColors.textSecondary)
                                .lineLimit(2)
                                .multilineTextAlignment(.trailing)
                        } icon: {
                            Image(systemName: "location.fill")
                                .foregroundStyle(SofraColors.primary)
                        }
                    }
                }

                // Map preview of customer location
                if let customerName = order.customerName {
                    HStack {
                        Spacer()
                        Label(customerName, systemImage: "person.fill")
                            .font(SofraTypography.caption)
                            .foregroundStyle(SofraColors.textSecondary)
                    }
                }

                HStack {
                    Text("\(order.deliveryFee, specifier: "%.0f") ر.س أجرة")
                        .font(SofraTypography.priceSmall)
                        .foregroundStyle(SofraColors.success)
                    Spacer()
                    Text("\(order.total, specifier: "%.2f") ر.س")
                        .font(SofraTypography.priceSmall)
                        .foregroundStyle(SofraColors.primaryDark)
                }
            }
        }
    }

    // MARK: - Active Deliveries Tab
    private var activeDeliveriesTab: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.md) {
                if vm.activeOrders.isEmpty {
                    EmptyStateView(
                        icon: "box.truck",
                        title: "لا توجد توصيلات نشطة",
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

    private func activeOrderCard(_ order: Order) -> some View {
        VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
            HStack {
                StatusBadge(text: "في التوصيل", color: SofraColors.info)
                Spacer()
                Text("#\(order.id.prefix(8))")
                    .font(SofraTypography.headline)
            }

            // Customer location with map
            if let addr = order.address, !addr.isEmpty {
                HStack {
                    Spacer()
                    Label {
                        Text(addr)
                            .font(SofraTypography.body)
                            .foregroundStyle(SofraColors.textSecondary)
                            .multilineTextAlignment(.trailing)
                    } icon: {
                        Image(systemName: "mappin.and.ellipse")
                            .foregroundStyle(SofraColors.primary)
                    }
                }

                // Open in Maps button
                Button {
                    openInMaps(address: addr)
                } label: {
                    HStack(spacing: SofraSpacing.xs) {
                        Text("فتح في الخرائط")
                            .font(SofraTypography.calloutSemibold)
                        Image(systemName: "map.fill")
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, SofraSpacing.sm)
                    .background(SofraColors.info.opacity(0.15))
                    .foregroundStyle(SofraColors.info)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                }
            }

            if let customerName = order.customerName {
                HStack {
                    Spacer()
                    Label(customerName, systemImage: "person.fill")
                        .font(SofraTypography.callout)
                        .foregroundStyle(SofraColors.textSecondary)
                }
            }

            HStack {
                if order.status == .outForDelivery {
                    Button("تم التوصيل ✓") {
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

    // MARK: - Delivery History Tab
    private var deliveryHistoryTab: some View {
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
    private var earningsTab: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.lg) {
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
                        Text("\(CourierDashboardViewModel.platformFee, specifier: "%.2f") ر.س / طلب")
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

    // MARK: - Open Address in Apple Maps
    private func openInMaps(address: String) {
        let query = address.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
        if let url = URL(string: "http://maps.apple.com/?q=\(query)") {
            UIApplication.shared.open(url)
        }
    }
}

#Preview {
    NavigationStack {
        CourierDashboardView()
            .environment(AppState())
            .environment(CartViewModel())
    }
}
