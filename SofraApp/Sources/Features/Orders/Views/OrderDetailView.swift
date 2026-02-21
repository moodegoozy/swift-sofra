// OrderDetailView.swift
// Single order detail screen matching web order tracking

import SwiftUI

struct OrderDetailView: View {
    let order: Order
    @EnvironmentObject var appState: AppState
    @StateObject private var vm = OrdersViewModel()
    @State private var showCancelConfirm = false

    var body: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.lg) {

                // Status Header
                VStack(spacing: SofraSpacing.md) {
                    Image(systemName: order.status.systemIcon)
                        .font(.system(size: 44))
                        .foregroundStyle(order.status.uiColor)

                    Text(order.status.arabicLabel)
                        .font(SofraTypography.title2)
                        .foregroundStyle(order.status.uiColor)

                    Text("#\(order.id.prefix(8))")
                        .font(SofraTypography.caption)
                        .foregroundStyle(SofraColors.textMuted)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, SofraSpacing.xl)

                // Status Timeline
                SofraCard {
                    Text("مسار الطلب")
                        .font(SofraTypography.headline)

                    ForEach(Array(OrderStatus.fullFlow.enumerated()), id: \.element) { idx, status in
                        HStack(spacing: SofraSpacing.md) {
                            Text(status.arabicLabel)
                                .font(isReached(status) ? SofraTypography.calloutSemibold : SofraTypography.callout)
                                .foregroundStyle(isReached(status) ? SofraColors.textPrimary : SofraColors.textMuted)

                            Spacer()

                            Image(systemName: isReached(status) ? "checkmark.circle.fill" : "circle")
                                .foregroundStyle(isReached(status) ? SofraColors.success : SofraColors.sky200)
                        }
                        if idx < OrderStatus.fullFlow.count - 1 {
                            Rectangle()
                                .fill(isReached(OrderStatus.fullFlow[idx + 1]) ? SofraColors.success.opacity(0.4) : SofraColors.sky100)
                                .frame(width: 2, height: 16)
                                .frame(maxWidth: .infinity, alignment: .trailing)
                                .padding(.trailing, 10)
                        }
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                // Items
                SofraCard {
                    Text("الأصناف")
                        .font(SofraTypography.headline)

                    ForEach(Array(order.items.enumerated()), id: \.offset) { idx, item in
                        HStack {
                            Text("\(item.price * Double(item.qty), specifier: "%.0f") ر.س")
                                .font(SofraTypography.callout)
                                .foregroundStyle(SofraColors.textSecondary)
                            Spacer()
                            Text("\(item.name) × \(item.qty)")
                                .font(SofraTypography.body)
                        }
                        if idx < order.items.count - 1 { Divider() }
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                // Totals
                SofraCard {
                    HStack {
                        Text("\(order.subtotal, specifier: "%.2f") ر.س")
                            .font(SofraTypography.body)
                        Spacer()
                        Text("المجموع الفرعي")
                            .font(SofraTypography.body)
                            .foregroundStyle(SofraColors.textSecondary)
                    }
                    if order.deliveryFee > 0 {
                        HStack {
                            Text("\(order.deliveryFee, specifier: "%.2f") ر.س")
                                .font(SofraTypography.body)
                            Spacer()
                            Text("رسوم التوصيل")
                                .font(SofraTypography.body)
                                .foregroundStyle(SofraColors.textSecondary)
                        }
                    }
                    Divider()
                    HStack {
                        Text("\(order.total, specifier: "%.2f") ر.س")
                            .font(SofraTypography.price)
                            .foregroundStyle(SofraColors.primaryDark)
                        Spacer()
                        Text("الإجمالي")
                            .font(SofraTypography.title3)
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                // Notes
                if let notes = order.notes, !notes.isEmpty {
                    SofraCard {
                        HStack {
                            Text(notes)
                                .font(SofraTypography.body)
                            Spacer()
                            Text("ملاحظات")
                                .font(SofraTypography.headline)
                        }
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                }

                // Cancel
                if order.status == .pending {
                    SofraButton(title: "إلغاء الطلب", icon: "xmark.circle", style: .danger) {
                        showCancelConfirm = true
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                }

                Spacer(minLength: SofraSpacing.xxxl)
            }
        }
        .background(SofraColors.background.ignoresSafeArea())
        .navigationTitle("تفاصيل الطلب")
        .navigationBarTitleDisplayMode(.inline)
        .confirmationDialog("هل تريد إلغاء هذا الطلب؟", isPresented: $showCancelConfirm) {
            Button("إلغاء الطلب", role: .destructive) {
                Task {
                    await vm.cancelOrder(orderId: order.id, token: try? await appState.validToken())
                }
            }
        }
    }

    private func isReached(_ status: OrderStatus) -> Bool {
        let flow = OrderStatus.fullFlow
        guard let targetIdx = flow.firstIndex(of: status),
              let currentIdx = flow.firstIndex(of: order.status)
        else { return false }
        return currentIdx >= targetIdx
    }
}

// MARK: - OrderStatus helpers
extension OrderStatus {
    static var fullFlow: [OrderStatus] {
        [.pending, .accepted, .preparing, .ready, .outForDelivery, .delivered]
    }

    var systemIcon: String {
        switch self {
        case .pending:       return "clock.fill"
        case .accepted:      return "checkmark.circle.fill"
        case .preparing:     return "flame.fill"
        case .ready:         return "bag.fill"
        case .outForDelivery: return "car.fill"
        case .delivered:     return "checkmark.seal.fill"
        case .cancelled:     return "xmark.circle.fill"
        }
    }

    var uiColor: Color {
        switch self {
        case .pending:       return SofraColors.warning
        case .accepted:      return SofraColors.info
        case .preparing:     return SofraColors.primaryDark
        case .ready:         return SofraColors.success
        case .outForDelivery: return SofraColors.primary
        case .delivered:     return SofraColors.success
        case .cancelled:     return SofraColors.error
        }
    }
}

#Preview {
    NavigationStack {
        OrderDetailView(order: .init(
            id: "abc123", customerId: "u1", restaurantId: "r1",
            items: [
                .init(id: "i1", name: "برست دجاج", price: 25, qty: 2, ownerId: "r1"),
                .init(id: "i2", name: "بطاطس", price: 10, qty: 1, ownerId: "r1")
            ],
            subtotal: 60, deliveryFee: 5, total: 65, status: .preparing
        ))
        .environmentObject(AppState())
    }
}
