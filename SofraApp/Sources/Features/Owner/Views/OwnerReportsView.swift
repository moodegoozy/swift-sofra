// OwnerReportsView.swift
// تقارير المطعم — إحصائيات المبيعات والأرباح

import SwiftUI

struct OwnerReportsView: View {
    @Environment(AppState.self) var appState
    let restaurant: Restaurant
    let orders: [Order]

    @State private var selectedPeriod = 0 // 0=اليوم, 1=الأسبوع, 2=الشهر, 3=الكل

    private let periods = ["اليوم", "الأسبوع", "الشهر", "الكل"]

    var body: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.lg) {
                // Period Picker
                HStack(spacing: SofraSpacing.sm) {
                    ForEach(0..<periods.count, id: \.self) { idx in
                        Button {
                            withAnimation { selectedPeriod = idx }
                        } label: {
                            Text(periods[idx])
                                .font(SofraTypography.calloutSemibold)
                                .padding(.horizontal, SofraSpacing.md)
                                .padding(.vertical, SofraSpacing.sm)
                                .background(selectedPeriod == idx ? SofraColors.primary : SofraColors.sky100)
                                .foregroundStyle(selectedPeriod == idx ? .white : SofraColors.textSecondary)
                                .clipShape(Capsule())
                        }
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                // Stats Cards
                LazyVGrid(columns: [.init(.flexible()), .init(.flexible())], spacing: SofraSpacing.md) {
                    reportCard("إجمالي الطلبات", value: "\(filteredOrders.count)", icon: "bag.fill", color: SofraColors.primary)
                    reportCard("المبيعات", value: String(format: "%.0f ر.س", totalSales), icon: "banknote.fill", color: SofraColors.success)
                    reportCard("رسوم الخدمة", value: String(format: "%.0f ر.س", totalCommission), icon: "percent", color: SofraColors.warning)
                    reportCard("صافي الربح", value: String(format: "%.0f ر.س", netProfit), icon: "chart.line.uptrend.xyaxis", color: SofraColors.info)
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                // Order Status Breakdown
                SofraCard {
                    VStack(alignment: .trailing, spacing: SofraSpacing.md) {
                        Text("تفصيل الطلبات")
                            .font(SofraTypography.headline)
                            .foregroundStyle(SofraColors.gold400)

                        statusRow("معلقة", count: countByStatus(.pending), color: SofraColors.warning)
                        statusRow("مقبولة", count: countByStatus(.accepted), color: SofraColors.info)
                        statusRow("قيد التحضير", count: countByStatus(.preparing), color: SofraColors.primary)
                        statusRow("جاهزة", count: countByStatus(.ready), color: SofraColors.gold400)
                        statusRow("في التوصيل", count: countByStatus(.outForDelivery), color: SofraColors.info)
                        statusRow("مكتملة", count: countByStatus(.delivered), color: SofraColors.success)
                        statusRow("ملغية", count: countByStatus(.cancelled), color: SofraColors.error)
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                // Delivery Fee Breakdown
                SofraCard {
                    VStack(alignment: .trailing, spacing: SofraSpacing.md) {
                        Text("ملخص التوصيل")
                            .font(SofraTypography.headline)
                            .foregroundStyle(SofraColors.gold400)

                        HStack {
                            Text(String(format: "%.0f ر.س", totalDeliveryFees))
                                .font(SofraTypography.title2)
                                .foregroundStyle(SofraColors.success)
                            Spacer()
                            Text("إجمالي رسوم التوصيل")
                                .font(SofraTypography.body)
                        }

                        HStack {
                            Text(String(format: "%.0f ر.س", averageOrderValue))
                                .font(SofraTypography.title2)
                                .foregroundStyle(SofraColors.info)
                            Spacer()
                            Text("متوسط قيمة الطلب")
                                .font(SofraTypography.body)
                        }

                        HStack {
                            Text("\(deliveredCount)")
                                .font(SofraTypography.title2)
                                .foregroundStyle(SofraColors.primary)
                            Spacer()
                            Text("طلبات مكتملة")
                                .font(SofraTypography.body)
                        }
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                // Top Items
                if !topItems.isEmpty {
                    SofraCard {
                        VStack(alignment: .trailing, spacing: SofraSpacing.md) {
                            Text("الأصناف الأكثر طلباً")
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

    // MARK: - Computed Properties
    private var filteredOrders: [Order] {
        let calendar = Calendar.current
        let now = Date()
        switch selectedPeriod {
        case 0: // Today
            let start = calendar.startOfDay(for: now)
            return orders.filter { ($0.createdAt ?? .distantPast) >= start }
        case 1: // Week
            let start = calendar.date(byAdding: .day, value: -7, to: now)!
            return orders.filter { ($0.createdAt ?? .distantPast) >= start }
        case 2: // Month
            let start = calendar.date(byAdding: .month, value: -1, to: now)!
            return orders.filter { ($0.createdAt ?? .distantPast) >= start }
        default: // All
            return orders
        }
    }

    private var totalSales: Double {
        filteredOrders.reduce(0) { $0 + $1.total }
    }

    private var totalCommission: Double {
        filteredOrders.filter { $0.status == .delivered }.reduce(0) { $0 + $1.commissionAmount }
    }

    private var netProfit: Double {
        filteredOrders.filter { $0.status == .delivered }.reduce(0) { $0 + $1.netAmount }
    }

    private var totalDeliveryFees: Double {
        filteredOrders.reduce(0) { $0 + $1.deliveryFee }
    }

    private var deliveredCount: Int {
        filteredOrders.filter { $0.status == .delivered }.count
    }

    private var averageOrderValue: Double {
        guard !filteredOrders.isEmpty else { return 0 }
        return totalSales / Double(filteredOrders.count)
    }

    private func countByStatus(_ status: OrderStatus) -> Int {
        filteredOrders.filter { $0.status == status }.count
    }

    private var topItems: [(name: String, count: Int)] {
        var counts: [String: Int] = [:]
        for order in filteredOrders {
            for item in order.items {
                counts[item.name, default: 0] += item.qty
            }
        }
        return counts.map { (name: $0.key, count: $0.value) }
            .sorted { $0.count > $1.count }
    }

    // MARK: - Views
    private func reportCard(_ title: String, value: String, icon: String, color: Color) -> some View {
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

    private func statusRow(_ label: String, count: Int, color: Color) -> some View {
        HStack {
            Text("\(count)")
                .font(SofraTypography.headline)
                .foregroundStyle(color)
                .frame(width: 40)
            
            // Simple bar
            GeometryReader { geo in
                let maxCount = max(filteredOrders.count, 1)
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
}
