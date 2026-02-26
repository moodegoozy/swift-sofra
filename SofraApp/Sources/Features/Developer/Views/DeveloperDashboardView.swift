// DeveloperDashboardView.swift
// Full admin/developer dashboard — system analytics, user management,
// restaurant management, commission settings, order control

import SwiftUI

struct DeveloperDashboardView: View {
    @Environment(AppState.self) var appState
    @State private var vm = DeveloperDashboardViewModel()
    @State private var selectedTab = 0
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
    @State private var showMessaging = false

    var body: some View {
        VStack(spacing: 0) {
            // Tab Bar
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: SofraSpacing.sm) {
                    devTab("التحليلات", icon: "chart.bar.fill", tag: 0)
                    devTab("الطلبات", icon: "list.clipboard.fill", tag: 1)
                    devTab("المطاعم", icon: "storefront.fill", tag: 2)
                    devTab("المستخدمين", icon: "person.3.fill", tag: 3)
                    devTab("الباقات", icon: "crown.fill", tag: 4)
                    devTab("النظام", icon: "gearshape.2.fill", tag: 5)
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
                packagesTab.tag(4)
                systemTab.tag(5)
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
        .sheet(isPresented: $showMessaging) {
            DevMessagingView()
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
                                Text("رسوم الخدمة")
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

    // MARK: - Packages Tab
    private var packagesTab: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.lg) {
                // Price Settings
                SofraCard {
                    VStack(alignment: .trailing, spacing: SofraSpacing.md) {
                        HStack(spacing: SofraSpacing.xs) {
                            Text("أسعار الباقات")
                                .font(SofraTypography.headline)
                            Image(systemName: "tag.fill")
                                .foregroundStyle(SofraColors.gold400)
                        }

                        VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
                            HStack {
                                HStack(spacing: 4) {
                                    Text("ر.س/شهر")
                                        .font(SofraTypography.caption)
                                        .foregroundStyle(SofraColors.textMuted)
                                    TextField("99", text: $editPremiumMonthly)
                                        .keyboardType(.decimalPad)
                                        .multilineTextAlignment(.center)
                                        .frame(width: 80)
                                        .padding(.vertical, 6)
                                        .background(SofraColors.surfaceElevated)
                                        .clipShape(RoundedRectangle(cornerRadius: 8))
                                }
                                Spacer()
                                Text("الباقة الذهبية (شهري)")
                                    .font(SofraTypography.body)
                                    .foregroundStyle(SofraColors.textPrimary)
                            }

                            HStack {
                                HStack(spacing: 4) {
                                    Text("ر.س/سنة")
                                        .font(SofraTypography.caption)
                                        .foregroundStyle(SofraColors.textMuted)
                                    TextField("999", text: $editPremiumYearly)
                                        .keyboardType(.decimalPad)
                                        .multilineTextAlignment(.center)
                                        .frame(width: 80)
                                        .padding(.vertical, 6)
                                        .background(SofraColors.surfaceElevated)
                                        .clipShape(RoundedRectangle(cornerRadius: 8))
                                }
                                Spacer()
                                Text("الباقة الذهبية (سنوي)")
                                    .font(SofraTypography.body)
                                    .foregroundStyle(SofraColors.textPrimary)
                            }
                        }

                        SofraButton(
                            title: isSavingPrices ? "جاري الحفظ..." : "حفظ الأسعار",
                            style: .primary
                        ) {
                            Task { await savePackagePrices() }
                        }
                        .disabled(isSavingPrices)
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                // Package Requests
                SofraCard {
                    HStack(spacing: SofraSpacing.xs) {
                        if loadingRequests {
                            ProgressView()
                                .scaleEffect(0.8)
                        }
                        Text("طلبات الترقية (\(packageRequests.count))")
                            .font(SofraTypography.headline)
                        Image(systemName: "arrow.up.circle.fill")
                            .foregroundStyle(SofraColors.warning)
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                if packageRequests.isEmpty && !loadingRequests {
                    EmptyStateView(
                        icon: "crown",
                        title: "لا توجد طلبات",
                        message: "عندما يطلب مطعم ترقية ستظهر هنا"
                    )
                } else {
                    ForEach(packageRequests) { request in
                        packageRequestCard(request)
                    }
                }

                // Restaurants with packages overview
                SofraCard {
                    VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
                        HStack(spacing: SofraSpacing.xs) {
                            Text("ملخص الباقات")
                                .font(SofraTypography.headline)
                            Image(systemName: "chart.pie.fill")
                                .foregroundStyle(SofraColors.info)
                        }

                        let premiumCount = vm.restaurants.filter { $0.packageType == .premium }.count
                        let freeCount = vm.restaurants.filter { $0.packageType == .free }.count

                        HStack {
                            Text("\(premiumCount)")
                                .font(SofraTypography.price)
                                .foregroundStyle(SofraColors.gold400)
                            Spacer()
                            HStack(spacing: SofraSpacing.xs) {
                                Text("مطاعم ذهبية")
                                    .font(SofraTypography.body)
                                Image(systemName: "crown.fill")
                                    .foregroundStyle(SofraColors.gold400)
                            }
                        }

                        HStack {
                            Text("\(freeCount)")
                                .font(SofraTypography.price)
                                .foregroundStyle(SofraColors.textSecondary)
                            Spacer()
                            HStack(spacing: SofraSpacing.xs) {
                                Text("مطاعم أساسية")
                                    .font(SofraTypography.body)
                                Image(systemName: "tag.fill")
                                    .foregroundStyle(SofraColors.textMuted)
                            }
                        }
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                Spacer(minLength: SofraSpacing.xxxl)
            }
            .padding(.top, SofraSpacing.md)
        }
        .task {
            await loadPackageData()
        }
        .refreshable {
            await loadPackageData()
        }
    }

    // MARK: - Package Request Card
    private func packageRequestCard(_ request: PackageRequest) -> some View {
        VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
            HStack {
                // Action Buttons
                if request.status == .pending {
                    HStack(spacing: SofraSpacing.sm) {
                        Button {
                            Task { await handlePackageRequest(request, approve: false) }
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .font(.title2)
                                .foregroundStyle(SofraColors.error)
                        }

                        Button {
                            Task { await handlePackageRequest(request, approve: true) }
                        } label: {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.title2)
                                .foregroundStyle(SofraColors.success)
                        }
                    }
                } else {
                    StatusBadge(text: request.statusLabel, color: request.statusColor)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 2) {
                    Text(request.restaurantName)
                        .font(SofraTypography.headline)
                    Text("طلب: \(request.requestedPackage == "premium" ? "الذهبية" : request.requestedPackage)")
                        .font(SofraTypography.caption)
                        .foregroundStyle(SofraColors.gold400)
                }
            }

            HStack {
                Text("\(request.premiumPrice, specifier: "%.0f") ر.س/شهر")
                    .font(SofraTypography.priceSmall)
                    .foregroundStyle(SofraColors.success)
                Spacer()
                if let date = request.createdAt {
                    Text(date.formatted(.dateTime.day().month().year()))
                        .font(SofraTypography.caption2)
                        .foregroundStyle(SofraColors.textMuted)
                }
            }
        }
        .padding(SofraSpacing.cardPadding)
        .background(SofraColors.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous)
                .strokeBorder(
                    request.status == .pending ? SofraColors.warning.opacity(0.3) : Color.clear,
                    lineWidth: 1
                )
        )
        .shadow(color: .black.opacity(0.04), radius: 6, y: 3)
        .padding(.horizontal, SofraSpacing.screenHorizontal)
    }

    // MARK: - Package Data Loading
    private func loadPackageData() async {
        loadingRequests = true
        do {
            let token = try await appState.validToken()

            // Load prices
            let priceDoc = try? await FirestoreService().getDocument(
                collection: "config", id: "packages", idToken: token
            )
            if let f = priceDoc?.fields {
                editPremiumMonthly = String(format: "%.0f", f["premiumMonthly"]?.doubleVal ?? 99)
                editPremiumYearly = String(format: "%.0f", f["premiumYearly"]?.doubleVal ?? 999)
            }

            // Load package requests
            let docs = try await FirestoreService().listDocuments(
                collection: "packageRequests", idToken: token, pageSize: 100
            )
            packageRequests = docs.map { PackageRequest(from: $0) }
                .sorted { ($0.createdAt ?? .distantPast) > ($1.createdAt ?? .distantPast) }
        } catch {
            Logger.log("Load package data error: \(error)", level: .error)
        }
        loadingRequests = false
    }

    // MARK: - Save Package Prices
    private func savePackagePrices() async {
        isSavingPrices = true
        do {
            let token = try await appState.validToken()
            let monthly = Double(editPremiumMonthly) ?? 99
            let yearly = Double(editPremiumYearly) ?? 999

            try await FirestoreService().createDocument(
                collection: "config",
                id: "packages",
                fields: [
                    "premiumMonthly": monthly,
                    "premiumYearly": yearly,
                    "updatedAt": ISO8601DateFormatter().string(from: Date())
                ],
                idToken: token
            )
        } catch {
            Logger.log("Save prices error: \(error)", level: .error)
        }
        isSavingPrices = false
    }

    // MARK: - Handle Package Request (approve/reject)
    private func handlePackageRequest(_ request: PackageRequest, approve: Bool) async {
        do {
            let token = try await appState.validToken()
            let firestoreService = FirestoreService()

            // Update request status
            try await firestoreService.updateDocument(
                collection: "packageRequests",
                id: request.id,
                fields: [
                    "status": approve ? "approved" : "rejected",
                    "reviewedAt": ISO8601DateFormatter().string(from: Date())
                ],
                idToken: token
            )

            // If approved, update restaurant's packageType
            if approve {
                try await firestoreService.updateDocument(
                    collection: "restaurants",
                    id: request.restaurantId,
                    fields: ["packageType": "premium"],
                    idToken: token
                )

                // Update local restaurant data
                if let idx = vm.restaurants.firstIndex(where: { $0.id == request.restaurantId }) {
                    vm.restaurants[idx].packageType = .premium
                }
            }

            // Update local request
            if let idx = packageRequests.firstIndex(where: { $0.id == request.id }) {
                packageRequests[idx].status = approve ? .approved : .rejected
            }
        } catch {
            Logger.log("Handle package request error: \(error)", level: .error)
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
                            infoRow("رسوم الخدمة", value: "\(ServiceFee.perItem) ر.س/صنف")
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
                        infoRow("رسوم الخدمة", value: String(format: "%.2f ر.س", vm.totalCommission))
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
                        quickAction("الرسائل", icon: "envelope.fill", color: SofraColors.gold400) { showMessaging = true }
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
                        Text("رسوم: \(order.commissionAmount, specifier: "%.0f") | صافي: \(order.netAmount, specifier: "%.0f")")
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
                        editingCommission = restaurant
                    } label: {
                        Text("\(ServiceFee.perItem, specifier: "%.2f") ر.س")
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
                    Text("رسوم الخدمة")
                        .font(SofraTypography.headline)

                    Text("\(ServiceFee.perItem, specifier: "%.2f") ر.س")
                        .font(.system(size: 48, weight: .bold, design: .rounded))
                        .foregroundStyle(SofraColors.info)

                    Text("لكل صنف")
                        .font(SofraTypography.calloutSemibold)
                        .foregroundStyle(SofraColors.textSecondary)

                    Divider()
                        .padding(.horizontal, SofraSpacing.xl)

                    VStack(spacing: SofraSpacing.md) {
                        HStack {
                            Text(restaurant.supervisorId != nil ? "\(ServiceFee.platformShareWithSupervisor, specifier: "%.2f") ر.س" : "\(ServiceFee.platformShareNoSupervisor, specifier: "%.2f") ر.س")
                                .font(SofraTypography.headline)
                                .foregroundStyle(SofraColors.success)
                            Spacer()
                            Text("حصة المنصة")
                                .font(SofraTypography.body)
                        }
                        if restaurant.supervisorId != nil {
                            HStack {
                                Text("\(ServiceFee.supervisorShare, specifier: "%.2f") ر.س")
                                    .font(SofraTypography.headline)
                                    .foregroundStyle(SofraColors.warning)
                                Spacer()
                                Text("حصة المشرف")
                                    .font(SofraTypography.body)
                            }
                        }
                        HStack {
                            Text(restaurant.supervisorId != nil ? "مضاف من مشرف" : "تسجيل ذاتي")
                                .font(SofraTypography.caption)
                                .foregroundStyle(restaurant.supervisorId != nil ? SofraColors.info : SofraColors.textMuted)
                            Spacer()
                            Text("نوع التسجيل")
                                .font(SofraTypography.caption)
                                .foregroundStyle(SofraColors.textMuted)
                        }
                    }
                    .padding(.horizontal, SofraSpacing.xl)
                }

                SofraButton(title: "إغلاق", icon: "xmark") {
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

// Make Restaurant equatable/hashable for sheet item
extension Restaurant: Equatable, Hashable {
    public static func == (lhs: Restaurant, rhs: Restaurant) -> Bool { lhs.id == rhs.id }
    public func hash(into hasher: inout Hasher) { hasher.combine(id) }
}

// Make AppUser equatable/hashable for sheet item
extension AppUser: Equatable, Hashable {
    public static func == (lhs: AppUser, rhs: AppUser) -> Bool { lhs.uid == rhs.uid }
    public func hash(into hasher: inout Hasher) { hasher.combine(uid) }
}

#Preview {
    NavigationStack {
        DeveloperDashboardView()
            .environment(AppState())
    }
}
