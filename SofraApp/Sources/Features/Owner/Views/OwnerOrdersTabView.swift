// OwnerOrdersTabView.swift
// صفحة الطلبات للمالك - تظهر في الشريط السفلي

import SwiftUI

struct OwnerOrdersTabView: View {
    @Environment(AppState.self) var appState
    @State private var vm = OwnerDashboardViewModel()
    @State private var orderFilter: OrderFilter = .new
    @State private var chatOrder: Order?
    @State private var cancellingOrder: Order?
    @State private var showCancelSheet = false
    @State private var cancelReason = ""
    @State private var showStatusPicker = false
    @State private var statusPickerOrder: Order?
    
    private enum OrderFilter: String, CaseIterable {
        case new = "جديدة"
        case accepted = "مقبولة"
        case preparing = "تحضير"
        case ready = "جاهزة"
        case delivery = "توصيل"
        case delivered = "مكتملة"
        case cancelled = "ملغية"
        
        var icon: String {
            switch self {
            case .new: return "bell.fill"
            case .accepted: return "checkmark.circle.fill"
            case .preparing: return "flame.fill"
            case .ready: return "bag.fill"
            case .delivery: return "car.fill"
            case .delivered: return "gift.fill"
            case .cancelled: return "xmark.circle.fill"
            }
        }
        
        var statuses: [OrderStatus] {
            switch self {
            case .new: return [.pending]
            case .accepted: return [.accepted]
            case .preparing: return [.preparing]
            case .ready: return [.ready]
            case .delivery: return [.outForDelivery]
            case .delivered: return [.delivered]
            case .cancelled: return [.cancelled]
            }
        }
    }
    
    private var filteredOrders: [Order] {
        vm.orders
            .filter { orderFilter.statuses.contains($0.status) }
            .sorted { ($0.createdAt ?? .distantPast) > ($1.createdAt ?? .distantPast) }
    }
    
    private var pendingOrdersCount: Int {
        vm.orders.filter { $0.status == .pending }.count
    }
    
    var body: some View {
        VStack(spacing: 0) {
            // Stats bar
            orderStatsBar
            
            // Filter tabs
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: SofraSpacing.sm) {
                    ForEach(OrderFilter.allCases, id: \.self) { filter in
                        Button {
                            withAnimation(.easeInOut(duration: 0.2)) { orderFilter = filter }
                        } label: {
                            HStack(spacing: 4) {
                                if filter == .new && pendingOrdersCount > 0 {
                                    Text("\(pendingOrdersCount)")
                                        .font(.caption2.bold())
                                        .foregroundStyle(.white)
                                        .padding(.horizontal, 5)
                                        .padding(.vertical, 1)
                                        .background(SofraColors.error)
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
            
            // Orders list
            ScrollView {
                VStack(spacing: SofraSpacing.md) {
                    if filteredOrders.isEmpty {
                        EmptyStateView(
                            icon: "list.clipboard",
                            title: "لا توجد طلبات",
                            message: "لا توجد طلبات في «\(orderFilter.rawValue)»"
                        )
                        .padding(.top, SofraSpacing.xxxl)
                    } else {
                        ForEach(filteredOrders) { order in
                            orderCard(order)
                        }
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)
                .padding(.top, SofraSpacing.sm)
                .padding(.bottom, SofraSpacing.xxxl)
            }
        }
        .ramadanBackground()
        .navigationTitle("الطلبات")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            guard let uid = appState.currentUser?.uid else { return }
            await vm.loadDashboard(ownerId: uid, token: try? await appState.validToken())
        }
        .refreshable {
            guard let uid = appState.currentUser?.uid else { return }
            await vm.loadOrders(ownerId: uid, token: try? await appState.validToken())
        }
        .sheet(item: $chatOrder) { order in
            OrderChatView(
                orderId: order.id,
                restaurantName: vm.restaurant?.name ?? "المطعم",
                orderStatus: order.status,
                chatRole: "owner"
            )
        }
        .sheet(isPresented: $showCancelSheet) {
            cancelOrderSheet
        }
        .sheet(isPresented: $showStatusPicker) {
            if let order = statusPickerOrder {
                orderStatusPickerSheet(order)
            }
        }
    }
    
    // MARK: - Stats Bar
    private var orderStatsBar: some View {
        HStack(spacing: SofraSpacing.md) {
            statPill(icon: "clock.fill", count: vm.orders.filter { $0.status == .pending }.count, color: SofraColors.warning, label: "جديد")
            statPill(icon: "flame.fill", count: vm.orders.filter { $0.status == .preparing }.count, color: Color(hex: "#F97316"), label: "تحضير")
            statPill(icon: "bag.fill", count: vm.orders.filter { $0.status == .ready }.count, color: SofraColors.gold500, label: "جاهز")
            statPill(icon: "car.fill", count: vm.orders.filter { $0.status == .outForDelivery }.count, color: Color(hex: "#6366F1"), label: "توصيل")
        }
        .padding(.horizontal, SofraSpacing.screenHorizontal)
        .padding(.vertical, SofraSpacing.sm)
        .background(SofraColors.cardBackground)
    }
    
    private func statPill(icon: String, count: Int, color: Color, label: String) -> some View {
        VStack(spacing: 4) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 14, weight: .semibold))
                Text("\(count)")
                    .font(SofraTypography.headline)
            }
            .foregroundStyle(color)
            
            Text(label)
                .font(.caption2)
                .foregroundStyle(SofraColors.textMuted)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, SofraSpacing.sm)
        .background(color.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
    
    // MARK: - Order Card
    private func orderCard(_ order: Order) -> some View {
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
            
            // Progress indicator
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
    
    // MARK: - Order Action Button
    @ViewBuilder
    private func orderActionButton(_ order: Order) -> some View {
        switch order.status {
        case .pending:
            HStack(spacing: SofraSpacing.sm) {
                Button {
                    Task { await vm.updateOrderStatus(orderId: order.id, newStatus: .accepted, customerId: order.customerId, token: try? await appState.validToken()) }
                } label: {
                    luxuryButton(text: "قبول", icon: "checkmark.circle.fill", config: .accept)
                }
                
                Button {
                    cancellingOrder = order
                    showCancelSheet = true
                } label: {
                    luxuryButton(text: "رفض", icon: "xmark.circle.fill", config: .reject)
                }
            }
            
        case .accepted:
            HStack(spacing: SofraSpacing.sm) {
                Button {
                    Task { await vm.updateOrderStatus(orderId: order.id, newStatus: .preparing, customerId: order.customerId, token: try? await appState.validToken()) }
                } label: {
                    luxuryButton(text: "تحضير", icon: "flame.fill", config: .preparing)
                }
                statusManageButton(order)
            }
            
        case .preparing:
            HStack(spacing: SofraSpacing.sm) {
                Button {
                    Task { await vm.updateOrderStatus(orderId: order.id, newStatus: .ready, customerId: order.customerId, token: try? await appState.validToken()) }
                } label: {
                    luxuryButton(text: "جاهز", icon: "bag.fill", config: .ready)
                }
                statusManageButton(order)
            }
            
        case .ready:
            HStack(spacing: SofraSpacing.sm) {
                Button {
                    Task { await vm.updateOrderStatus(orderId: order.id, newStatus: .outForDelivery, customerId: order.customerId, token: try? await appState.validToken()) }
                } label: {
                    luxuryButton(text: "توصيل", icon: "car.fill", config: .delivery)
                }
                statusManageButton(order)
            }
            
        case .outForDelivery:
            HStack(spacing: SofraSpacing.sm) {
                Button {
                    Task { await vm.updateOrderStatus(orderId: order.id, newStatus: .delivered, customerId: order.customerId, token: try? await appState.validToken()) }
                } label: {
                    luxuryButton(text: "تم", icon: "gift.fill", config: .complete)
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
                .background(Circle().fill(SofraColors.sky100))
                .overlay(Circle().stroke(SofraColors.sky200, lineWidth: 1))
        }
    }
    
    // MARK: - Luxury Button
    private enum LuxuryConfig {
        case accept, reject, preparing, ready, delivery, complete
        
        var gradient: LinearGradient {
            switch self {
            case .accept:
                return LinearGradient(stops: [.init(color: Color(hex: "#22C55E"), location: 0), .init(color: Color(hex: "#16A34A"), location: 0.5), .init(color: Color(hex: "#15803D"), location: 1)], startPoint: .top, endPoint: .bottom)
            case .reject:
                return LinearGradient(stops: [.init(color: Color(hex: "#F87171"), location: 0), .init(color: Color(hex: "#EF4444"), location: 0.5), .init(color: Color(hex: "#DC2626"), location: 1)], startPoint: .top, endPoint: .bottom)
            case .preparing:
                return LinearGradient(stops: [.init(color: Color(hex: "#FB923C"), location: 0), .init(color: Color(hex: "#F97316"), location: 0.5), .init(color: Color(hex: "#EA580C"), location: 1)], startPoint: .top, endPoint: .bottom)
            case .ready:
                return LinearGradient(stops: [.init(color: SofraColors.gold400, location: 0), .init(color: SofraColors.gold500, location: 0.5), .init(color: SofraColors.gold600, location: 1)], startPoint: .top, endPoint: .bottom)
            case .delivery:
                return LinearGradient(stops: [.init(color: Color(hex: "#818CF8"), location: 0), .init(color: Color(hex: "#6366F1"), location: 0.5), .init(color: Color(hex: "#4F46E5"), location: 1)], startPoint: .top, endPoint: .bottom)
            case .complete:
                return LinearGradient(stops: [.init(color: Color(hex: "#34D399"), location: 0), .init(color: Color(hex: "#10B981"), location: 0.5), .init(color: Color(hex: "#059669"), location: 1)], startPoint: .top, endPoint: .bottom)
            }
        }
        
        var glow: Color {
            switch self {
            case .accept, .complete: return Color(hex: "#22C55E")
            case .reject: return Color(hex: "#EF4444")
            case .preparing: return Color(hex: "#F97316")
            case .ready: return SofraColors.gold500
            case .delivery: return Color(hex: "#6366F1")
            }
        }
        
        var iconBg: Color {
            switch self {
            case .accept, .complete: return Color(hex: "#166534")
            case .reject: return Color(hex: "#991B1B")
            case .preparing: return Color(hex: "#9A3412")
            case .ready: return SofraColors.gold700
            case .delivery: return Color(hex: "#3730A3")
            }
        }
    }
    
    private func luxuryButton(text: String, icon: String, config: LuxuryConfig) -> some View {
        HStack(spacing: SofraSpacing.xs) {
            ZStack {
                Circle().fill(config.iconBg.opacity(0.5)).frame(width: 26, height: 26)
                Image(systemName: icon).font(.system(size: 13, weight: .bold)).foregroundStyle(.white)
            }
            Text(text).font(.system(size: 14, weight: .bold)).foregroundStyle(.white)
        }
        .padding(.leading, 6).padding(.trailing, 14).padding(.vertical, 10)
        .background(
            ZStack {
                config.gradient
                LinearGradient(colors: [.white.opacity(0.25), .clear], startPoint: .top, endPoint: .center)
                LinearGradient(colors: [.clear, .black.opacity(0.15)], startPoint: .center, endPoint: .bottom)
            }
        )
        .clipShape(Capsule())
        .overlay(Capsule().stroke(LinearGradient(colors: [.white.opacity(0.4), .white.opacity(0.1)], startPoint: .top, endPoint: .bottom), lineWidth: 1))
        .shadow(color: config.glow.opacity(0.4), radius: 8, x: 0, y: 4)
        .shadow(color: config.glow.opacity(0.2), radius: 16, x: 0, y: 8)
    }
    
    // MARK: - Progress Indicator
    private func orderProgressIndicator(_ status: OrderStatus) -> some View {
        let steps: [(icon: String, status: OrderStatus)] = [
            ("clock.fill", .pending),
            ("checkmark.circle.fill", .accepted),
            ("flame.fill", .preparing),
            ("bag.fill", .ready),
            ("car.fill", .outForDelivery),
            ("gift.fill", .delivered)
        ]
        let currentIndex = steps.firstIndex { $0.status == status } ?? 0
        
        return HStack(spacing: 0) {
            ForEach(Array(steps.enumerated()), id: \.offset) { index, step in
                let isCompleted = index < currentIndex
                let isCurrent = index == currentIndex
                
                ZStack {
                    Circle()
                        .fill(isCompleted || isCurrent ? stepColor(for: step.status) : SofraColors.sky200)
                        .frame(width: 24, height: 24)
                    
                    if isCompleted {
                        Image(systemName: "checkmark").font(.system(size: 10, weight: .bold)).foregroundStyle(.white)
                    } else {
                        Image(systemName: step.icon).font(.system(size: 10, weight: .semibold)).foregroundStyle(isCurrent ? .white : SofraColors.textMuted)
                    }
                }
                .scaleEffect(isCurrent ? 1.1 : 1.0)
                
                if index < steps.count - 1 {
                    Rectangle()
                        .fill(isCompleted ? stepColor(for: step.status) : SofraColors.sky200)
                        .frame(height: 2)
                        .frame(maxWidth: .infinity)
                }
            }
        }
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
    
    // MARK: - Cancel Sheet
    private var cancelOrderSheet: some View {
        NavigationStack {
            VStack(spacing: SofraSpacing.lg) {
                if let order = cancellingOrder {
                    SofraCard {
                        HStack {
                            VStack(alignment: .trailing, spacing: 4) {
                                Text("#\(order.id.prefix(8))").font(SofraTypography.headline)
                                if let name = order.customerName, !name.isEmpty {
                                    Text(name).font(SofraTypography.caption).foregroundStyle(SofraColors.textMuted)
                                }
                            }
                            Spacer()
                            Text("\(order.total, specifier: "%.2f") ر.س").font(SofraTypography.price).foregroundStyle(SofraColors.primaryDark)
                        }
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                }
                
                VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
                    Text("سبب الإلغاء (مطلوب)").font(SofraTypography.headline)
                    TextEditor(text: $cancelReason)
                        .frame(minHeight: 100).font(SofraTypography.body).scrollContentBackground(.hidden)
                        .padding(SofraSpacing.sm).background(SofraColors.surfaceElevated)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(SofraColors.sky200, lineWidth: 1))
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)
                
                FlowLayout(spacing: 8) {
                    ForEach(["المكونات غير متوفرة", "المطعم مغلق", "ضغط عمل كبير", "خطأ في الطلب"], id: \.self) { reason in
                        Button { cancelReason = reason } label: {
                            Text(reason).font(SofraTypography.caption)
                                .foregroundStyle(cancelReason == reason ? .white : SofraColors.textSecondary)
                                .padding(.horizontal, SofraSpacing.sm).padding(.vertical, 6)
                                .background(cancelReason == reason ? SofraColors.primary : SofraColors.sky100)
                                .clipShape(Capsule())
                        }
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)
                
                Spacer()
                
                VStack(spacing: SofraSpacing.sm) {
                    SofraButton(title: "إلغاء الطلب", icon: "xmark.circle.fill", style: .destructive, isDisabled: cancelReason.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty) {
                        if let order = cancellingOrder {
                            Task {
                                await vm.cancelOrderWithReason(order: order, reason: cancelReason.trimmingCharacters(in: .whitespacesAndNewlines), restaurantName: vm.restaurant?.name ?? "المطعم", token: try? await appState.validToken())
                                cancelReason = ""; cancellingOrder = nil; showCancelSheet = false
                            }
                        }
                    }
                    SofraButton(title: "تراجع", style: .ghost) { cancelReason = ""; showCancelSheet = false }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)
                .padding(.bottom, SofraSpacing.lg)
            }
            .padding(.top, SofraSpacing.md)
            .navigationTitle("إلغاء الطلب")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("إغلاق") { cancelReason = ""; showCancelSheet = false } } }
        }
        .presentationDetents([.medium, .large])
    }
    
    // MARK: - Status Picker Sheet
    private func orderStatusPickerSheet(_ order: Order) -> some View {
        NavigationStack {
            VStack(spacing: SofraSpacing.lg) {
                SofraCard {
                    HStack {
                        VStack(alignment: .trailing, spacing: 4) {
                            Text("#\(order.id.prefix(8))").font(SofraTypography.headline)
                            if let name = order.customerName { Text(name).font(SofraTypography.caption).foregroundStyle(SofraColors.textMuted) }
                        }
                        Spacer()
                        StatusBadge(text: order.status.arabicLabel, color: order.status.uiColor)
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)
                
                VStack(spacing: SofraSpacing.sm) {
                    Text("تغيير الحالة").font(SofraTypography.headline).frame(maxWidth: .infinity, alignment: .trailing)
                    
                    ForEach(availableStatuses(for: order.status), id: \.self) { status in
                        Button {
                            Task {
                                await vm.updateOrderStatus(orderId: order.id, newStatus: status, customerId: order.customerId, token: try? await appState.validToken())
                                showStatusPicker = false
                            }
                        } label: {
                            statusOptionRow(status: status, isForward: statusIndex(status) > statusIndex(order.status))
                        }
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)
                
                Spacer()
                
                if order.status != .delivered && order.status != .cancelled {
                    SofraButton(title: "إلغاء الطلب", icon: "xmark.circle.fill", style: .destructive) {
                        showStatusPicker = false
                        cancellingOrder = order
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { showCancelSheet = true }
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                    .padding(.bottom, SofraSpacing.lg)
                }
            }
            .padding(.top, SofraSpacing.md)
            .navigationTitle("إدارة الطلب")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("إغلاق") { showStatusPicker = false } } }
        }
        .presentationDetents([.medium, .large])
    }
    
    private func statusOptionRow(status: OrderStatus, isForward: Bool) -> some View {
        let config = statusInfo(status)
        return HStack(spacing: SofraSpacing.md) {
            ZStack {
                Circle().fill(config.gradient).frame(width: 44, height: 44)
                    .shadow(color: config.color.opacity(0.3), radius: 4, y: 2)
                Image(systemName: config.icon).font(.system(size: 18, weight: .semibold)).foregroundStyle(.white)
            }
            VStack(alignment: .leading, spacing: 2) {
                HStack {
                    Text(config.title).font(SofraTypography.headline).foregroundStyle(SofraColors.textPrimary)
                    if !isForward {
                        Text("رجوع").font(.caption2.bold()).foregroundStyle(.white)
                            .padding(.horizontal, 6).padding(.vertical, 2).background(SofraColors.warning).clipShape(Capsule())
                    }
                }
                Text(config.subtitle).font(SofraTypography.caption).foregroundStyle(SofraColors.textMuted)
            }
            Spacer()
            Image(systemName: isForward ? "arrow.left.circle.fill" : "arrow.right.circle.fill")
                .font(.system(size: 22)).foregroundStyle(config.color.opacity(0.6))
        }
        .padding(SofraSpacing.md)
        .background(SofraColors.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(config.color.opacity(0.2), lineWidth: 1))
    }
    
    private func availableStatuses(for current: OrderStatus) -> [OrderStatus] {
        switch current {
        case .pending: return [.accepted]
        case .accepted: return [.preparing, .pending]
        case .preparing: return [.ready, .accepted]
        case .ready: return [.outForDelivery, .preparing]
        case .outForDelivery: return [.delivered, .ready]
        case .delivered, .cancelled: return []
        }
    }
    
    private func statusIndex(_ status: OrderStatus) -> Int {
        switch status {
        case .pending: return 0; case .accepted: return 1; case .preparing: return 2
        case .ready: return 3; case .outForDelivery: return 4; case .delivered: return 5; case .cancelled: return -1
        }
    }
    
    private func statusInfo(_ status: OrderStatus) -> (icon: String, title: String, subtitle: String, color: Color, gradient: LinearGradient) {
        switch status {
        case .pending: return ("clock.fill", "انتظار", "إرجاع للمراجعة", SofraColors.warning, LinearGradient(colors: [SofraColors.warning, SofraColors.warning.opacity(0.8)], startPoint: .topLeading, endPoint: .bottomTrailing))
        case .accepted: return ("checkmark.circle.fill", "مقبول", "قبول الطلب", Color(hex: "#10B981"), LinearGradient(colors: [Color(hex: "#10B981"), Color(hex: "#059669")], startPoint: .topLeading, endPoint: .bottomTrailing))
        case .preparing: return ("flame.fill", "تحضير", "بدء التحضير", Color(hex: "#F97316"), LinearGradient(colors: [Color(hex: "#F97316"), Color(hex: "#EA580C")], startPoint: .topLeading, endPoint: .bottomTrailing))
        case .ready: return ("bag.fill", "جاهز", "الطلب جاهز", SofraColors.gold500, LinearGradient(colors: [SofraColors.gold500, SofraColors.gold600], startPoint: .topLeading, endPoint: .bottomTrailing))
        case .outForDelivery: return ("car.fill", "توصيل", "إرسال للتوصيل", Color(hex: "#6366F1"), LinearGradient(colors: [Color(hex: "#6366F1"), Color(hex: "#4F46E5")], startPoint: .topLeading, endPoint: .bottomTrailing))
        case .delivered: return ("gift.fill", "تم", "تأكيد التسليم", Color(hex: "#10B981"), LinearGradient(colors: [Color(hex: "#10B981"), Color(hex: "#047857")], startPoint: .topLeading, endPoint: .bottomTrailing))
        case .cancelled: return ("xmark.circle.fill", "ملغي", "تم الإلغاء", SofraColors.error, LinearGradient(colors: [SofraColors.error, SofraColors.error.opacity(0.8)], startPoint: .topLeading, endPoint: .bottomTrailing))
        }
    }
}
