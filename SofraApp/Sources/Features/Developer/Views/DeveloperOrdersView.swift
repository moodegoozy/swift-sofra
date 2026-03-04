// DeveloperOrdersView.swift
// عرض جميع طلبات النظام بالتفصيل - للمطور فقط

import SwiftUI

struct DeveloperOrdersView: View {
    @Environment(AppState.self) var appState
    @State private var orders: [Order] = []
    @State private var restaurants: [Restaurant] = []
    @State private var isLoading = false
    @State private var selectedRestaurant: Restaurant?
    @State private var selectedOrder: Order?
    @State private var filterStatus: OrderStatus?
    @State private var searchText = ""
    
    private let firestoreService = FirestoreService()
    
    // Filtered orders
    private var filteredOrders: [Order] {
        var result = orders
        
        // Filter by restaurant
        if let rest = selectedRestaurant {
            result = result.filter { $0.restaurantId == rest.id }
        }
        
        // Filter by status
        if let status = filterStatus {
            result = result.filter { $0.status == status }
        }
        
        // Filter by search
        if !searchText.isEmpty {
            result = result.filter { order in
                order.id.localizedCaseInsensitiveContains(searchText) ||
                (order.customerName ?? "").localizedCaseInsensitiveContains(searchText) ||
                (order.restaurantName ?? "").localizedCaseInsensitiveContains(searchText)
            }
        }
        
        return result.sorted { ($0.createdAt ?? .distantPast) > ($1.createdAt ?? .distantPast) }
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Filters
            filterBar
            
            if isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if filteredOrders.isEmpty {
                EmptyStateView(
                    icon: "list.clipboard",
                    title: "لا توجد طلبات",
                    message: "لم يتم العثور على طلبات"
                )
            } else {
                ScrollView {
                    LazyVStack(spacing: SofraSpacing.md) {
                        // Stats header
                        statsHeader
                        
                        ForEach(filteredOrders) { order in
                            orderDetailCard(order)
                        }
                    }
                    .padding(.top, SofraSpacing.md)
                    .padding(.bottom, SofraSpacing.xxxl)
                }
            }
        }
        .ramadanBackground()
        .navigationTitle("جميع الطلبات")
        .navigationBarTitleDisplayMode(.inline)
        .searchable(text: $searchText, prompt: "بحث برقم الطلب أو اسم العميل")
        .refreshable {
            await loadData()
        }
        .task {
            await loadData()
        }
        .sheet(item: $selectedOrder) { order in
            orderDetailSheet(order)
        }
    }
    
    // MARK: - Filter Bar
    private var filterBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: SofraSpacing.sm) {
                // Restaurant filter
                Menu {
                    Button("جميع المطاعم") { selectedRestaurant = nil }
                    Divider()
                    ForEach(restaurants, id: \.id) { rest in
                        Button(rest.name) { selectedRestaurant = rest }
                    }
                } label: {
                    filterChip(
                        title: selectedRestaurant?.name ?? "المطعم",
                        isActive: selectedRestaurant != nil,
                        icon: "storefront.fill"
                    )
                }
                
                // Status filter
                Menu {
                    Button("جميع الحالات") { filterStatus = nil }
                    Divider()
                    ForEach(OrderStatus.allCases, id: \.self) { status in
                        Button(status.arabicLabel) { filterStatus = status }
                    }
                } label: {
                    filterChip(
                        title: filterStatus?.arabicLabel ?? "الحالة",
                        isActive: filterStatus != nil,
                        icon: "line.3.horizontal.decrease.circle.fill"
                    )
                }
                
                // Clear filters
                if selectedRestaurant != nil || filterStatus != nil {
                    Button {
                        selectedRestaurant = nil
                        filterStatus = nil
                    } label: {
                        Label("مسح", systemImage: "xmark.circle.fill")
                            .font(SofraTypography.caption)
                            .foregroundStyle(SofraColors.error)
                    }
                }
            }
            .padding(.horizontal, SofraSpacing.screenHorizontal)
            .padding(.vertical, SofraSpacing.sm)
        }
        .background(SofraColors.cardBackground)
    }
    
    private func filterChip(title: String, isActive: Bool, icon: String) -> some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.caption)
            Text(title)
                .font(SofraTypography.caption)
            Image(systemName: "chevron.down")
                .font(.caption2)
        }
        .padding(.horizontal, SofraSpacing.md)
        .padding(.vertical, SofraSpacing.sm)
        .background(isActive ? SofraColors.primary : SofraColors.surfaceElevated)
        .foregroundStyle(isActive ? .white : SofraColors.textPrimary)
        .clipShape(Capsule())
    }
    
    // MARK: - Stats Header
    private var statsHeader: some View {
        HStack(spacing: SofraSpacing.md) {
            statBadge(
                title: "الكل",
                count: filteredOrders.count,
                color: SofraColors.textPrimary
            )
            statBadge(
                title: "بانتظار",
                count: filteredOrders.filter { $0.status == .pending }.count,
                color: SofraColors.warning
            )
            statBadge(
                title: "نشط",
                count: filteredOrders.filter { $0.status != .delivered && $0.status != .cancelled && $0.status != .pending }.count,
                color: SofraColors.info
            )
            statBadge(
                title: "مكتمل",
                count: filteredOrders.filter { $0.status == .delivered }.count,
                color: SofraColors.success
            )
        }
        .padding(.horizontal, SofraSpacing.screenHorizontal)
    }
    
    private func statBadge(title: String, count: Int, color: Color) -> some View {
        VStack(spacing: 2) {
            Text("\(count)")
                .font(SofraTypography.headline)
                .foregroundStyle(color)
            Text(title)
                .font(SofraTypography.caption2)
                .foregroundStyle(SofraColors.textMuted)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, SofraSpacing.sm)
        .background(SofraColors.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
    
    // MARK: - Order Detail Card
    private func orderDetailCard(_ order: Order) -> some View {
        Button {
            selectedOrder = order
        } label: {
            VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
                // Header: Status + Restaurant
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
                
                Divider()
                
                // Customer Info
                HStack {
                    if let date = order.createdAt {
                        Text(date.relativeArabic)
                            .font(SofraTypography.caption2)
                            .foregroundStyle(SofraColors.textMuted)
                    }
                    Spacer()
                    HStack(spacing: SofraSpacing.xs) {
                        Text(order.customerName ?? "عميل")
                            .font(SofraTypography.callout)
                        Image(systemName: "person.fill")
                            .font(.caption)
                            .foregroundStyle(SofraColors.textMuted)
                    }
                }
                
                // Items Summary
                HStack {
                    Text("\(order.total, specifier: "%.2f") ر.س")
                        .font(SofraTypography.priceSmall)
                        .foregroundStyle(SofraColors.primary)
                    Spacer()
                    Text("\(order.items.count) أصناف • \(order.items.reduce(0) { $0 + $1.qty }) منتج")
                        .font(SofraTypography.caption)
                        .foregroundStyle(SofraColors.textSecondary)
                }
                
                // Fee breakdown
                HStack(spacing: SofraSpacing.md) {
                    feeLabel(title: "المنصة", amount: order.platformFee, color: SofraColors.info)
                    feeLabel(title: "المشرف", amount: order.supervisorFee, color: SofraColors.warning)
                    feeLabel(title: "صافي المالك", amount: order.netAmount, color: SofraColors.success)
                }
            }
            .padding(SofraSpacing.cardPadding)
            .background(SofraColors.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
            .shadow(color: .black.opacity(0.04), radius: 6, y: 3)
        }
        .buttonStyle(.plain)
        .padding(.horizontal, SofraSpacing.screenHorizontal)
    }
    
    private func feeLabel(title: String, amount: Double, color: Color) -> some View {
        VStack(spacing: 2) {
            Text(String(format: "%.2f", amount))
                .font(SofraTypography.caption)
                .foregroundStyle(color)
            Text(title)
                .font(.system(size: 9))
                .foregroundStyle(SofraColors.textMuted)
        }
    }
    
    // MARK: - Order Detail Sheet
    private func orderDetailSheet(_ order: Order) -> some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: SofraSpacing.lg) {
                    // Status Header
                    VStack(spacing: SofraSpacing.sm) {
                        Image(systemName: order.statusIcon)
                            .font(.system(size: 48))
                            .foregroundStyle(order.status.uiColor)
                        
                        Text(order.status.arabicLabel)
                            .font(SofraTypography.title2)
                        
                        Text("#\(order.id)")
                            .font(SofraTypography.caption)
                            .foregroundStyle(SofraColors.textMuted)
                    }
                    .padding(.top, SofraSpacing.lg)
                    
                    // Restaurant & Customer
                    SofraCard {
                        infoRow(icon: "storefront.fill", title: "المطعم", value: order.restaurantName ?? "—")
                        Divider()
                        infoRow(icon: "person.fill", title: "العميل", value: order.customerName ?? "—")
                        Divider()
                        infoRow(icon: "mappin.circle.fill", title: "العنوان", value: order.address ?? "—")
                        if let type = order.deliveryType {
                            Divider()
                            infoRow(icon: "car.fill", title: "النوع", value: type == "delivery" ? "توصيل" : "استلام")
                        }
                        if let date = order.createdAt {
                            Divider()
                            infoRow(icon: "calendar", title: "التاريخ", value: date.formatted(date: .abbreviated, time: .shortened))
                        }
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                    
                    // Order Items
                    SofraCard {
                        VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
                            HStack {
                                Spacer()
                                Text("محتوى الطلب")
                                    .font(SofraTypography.headline)
                                Image(systemName: "bag.fill")
                                    .foregroundStyle(SofraColors.primary)
                            }
                            
                            Divider()
                            
                            ForEach(order.items, id: \.id) { item in
                                HStack {
                                    Text("\(item.lineTotal, specifier: "%.2f") ر.س")
                                        .font(SofraTypography.callout)
                                        .foregroundStyle(SofraColors.primary)
                                    
                                    Spacer()
                                    
                                    Text("×\(item.qty)")
                                        .font(SofraTypography.caption)
                                        .foregroundStyle(SofraColors.textMuted)
                                    
                                    Text(item.name)
                                        .font(SofraTypography.body)
                                }
                            }
                        }
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                    
                    // Financial Breakdown
                    SofraCard {
                        VStack(spacing: SofraSpacing.sm) {
                            HStack {
                                Spacer()
                                Text("التفاصيل المالية")
                                    .font(SofraTypography.headline)
                                Image(systemName: "banknote.fill")
                                    .foregroundStyle(SofraColors.gold500)
                            }
                            
                            Divider()
                            
                            financialRow(title: "المجموع الفرعي", amount: order.subtotal)
                            financialRow(title: "رسوم التوصيل", amount: order.deliveryFee)
                            financialRow(title: "الإجمالي", amount: order.total, isBold: true)
                            
                            Divider()
                            
                            financialRow(title: "رسوم الخدمة", amount: order.serviceFeeTotal, color: SofraColors.textMuted)
                            financialRow(title: "حصة المنصة", amount: order.platformFee, color: SofraColors.info)
                            financialRow(title: "حصة المشرف", amount: order.supervisorFee, color: SofraColors.warning)
                            financialRow(title: "صافي المالك", amount: order.netAmount, color: SofraColors.success, isBold: true)
                        }
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                    
                    // Notes
                    if let notes = order.notes, !notes.isEmpty {
                        SofraCard {
                            VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
                                HStack {
                                    Spacer()
                                    Text("ملاحظات")
                                        .font(SofraTypography.headline)
                                    Image(systemName: "note.text")
                                        .foregroundStyle(SofraColors.textMuted)
                                }
                                Text(notes)
                                    .font(SofraTypography.body)
                                    .foregroundStyle(SofraColors.textSecondary)
                                    .frame(maxWidth: .infinity, alignment: .trailing)
                            }
                        }
                        .padding(.horizontal, SofraSpacing.screenHorizontal)
                    }
                    
                    // Supervisor Info
                    if let supId = order.supervisorId, !supId.isEmpty {
                        SofraCard {
                            infoRow(icon: "person.badge.shield.checkmark.fill", title: "المشرف", value: supId.prefix(8) + "...")
                        }
                        .padding(.horizontal, SofraSpacing.screenHorizontal)
                    }
                    
                    Spacer(minLength: SofraSpacing.xxxl)
                }
            }
            .ramadanBackground()
            .navigationTitle("تفاصيل الطلب")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("إغلاق") { selectedOrder = nil }
                }
            }
        }
        .presentationDetents([.large])
    }
    
    private func infoRow(icon: String, title: String, value: String) -> some View {
        HStack {
            Text(value)
                .font(SofraTypography.body)
                .foregroundStyle(SofraColors.textPrimary)
                .lineLimit(2)
            Spacer()
            HStack(spacing: SofraSpacing.xs) {
                Text(title)
                    .font(SofraTypography.caption)
                    .foregroundStyle(SofraColors.textMuted)
                Image(systemName: icon)
                    .foregroundStyle(SofraColors.textMuted)
            }
        }
    }
    
    private func financialRow(title: String, amount: Double, color: Color = SofraColors.textPrimary, isBold: Bool = false) -> some View {
        HStack {
            Text(String(format: "%.2f ر.س", amount))
                .font(isBold ? SofraTypography.headline : SofraTypography.body)
                .foregroundStyle(color)
            Spacer()
            Text(title)
                .font(SofraTypography.caption)
                .foregroundStyle(SofraColors.textMuted)
        }
    }
    
    // MARK: - Load Data
    private func loadData() async {
        guard let token = try? await appState.validToken() else { return }
        isLoading = true
        
        do {
            // Load all orders
            let orderDocs = try await firestoreService.query(
                collection: "orders",
                orderBy: "createdAt",
                descending: true,
                limit: 500,
                idToken: token
            )
            self.orders = orderDocs.map { Order(from: $0) }
            
            // Load all restaurants for filter
            let restDocs = try await firestoreService.listDocuments(
                collection: "restaurants",
                idToken: token,
                pageSize: 200
            )
            self.restaurants = restDocs.map { Restaurant(from: $0) }
        } catch {
            Logger.log("Developer orders load error: \(error)", level: .error)
        }
        
        isLoading = false
    }
}

#Preview {
    NavigationStack {
        DeveloperOrdersView()
            .environment(AppState())
    }
}
