// WalletView.swift
// Owner wallet screen showing balance and order-based earnings

import SwiftUI

struct WalletView: View {
    @Environment(AppState.self) var appState
    @Environment(\.dismiss) var dismiss
    let orders: [Order]
    let restaurantName: String

    private var deliveredOrders: [Order] {
        orders.filter { $0.status == .delivered }
    }

    private var totalEarnings: Double {
        deliveredOrders.reduce(0) { $0 + $1.total }
    }

    private var pendingOrders: [Order] {
        orders.filter { $0.status != .delivered && $0.status != .cancelled }
    }

    private var pendingAmount: Double {
        pendingOrders.reduce(0) { $0 + $1.total }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: SofraSpacing.lg) {
                    // Balance Card
                    VStack(spacing: SofraSpacing.md) {
                        Image(systemName: "creditcard.fill")
                            .font(.system(size: 40))
                            .foregroundStyle(SofraColors.primary)

                        Text("الرصيد الكلي")
                            .font(SofraTypography.calloutSemibold)
                            .foregroundStyle(SofraColors.textSecondary)

                        Text("\(totalEarnings, specifier: "%.2f") ر.س")
                            .font(.system(size: 36, weight: .bold, design: .rounded))
                            .foregroundStyle(SofraColors.success)

                        Text(restaurantName)
                            .font(SofraTypography.caption)
                            .foregroundStyle(SofraColors.textMuted)
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

                    // Stats Row
                    HStack(spacing: SofraSpacing.md) {
                        walletStat(
                            title: "طلبات مكتملة",
                            value: "\(deliveredOrders.count)",
                            icon: "checkmark.circle.fill",
                            color: SofraColors.success
                        )
                        walletStat(
                            title: "قيد التنفيذ",
                            value: "\(pendingOrders.count)",
                            icon: "clock.fill",
                            color: SofraColors.warning
                        )
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)

                    // Pending Amount
                    if pendingAmount > 0 {
                        SofraCard {
                            HStack {
                                Text("\(pendingAmount, specifier: "%.2f") ر.س")
                                    .font(SofraTypography.headline)
                                    .foregroundStyle(SofraColors.warning)
                                Spacer()
                                HStack(spacing: SofraSpacing.xs) {
                                    Text("مبالغ قيد التحصيل")
                                        .font(SofraTypography.body)
                                    Image(systemName: "hourglass")
                                        .foregroundStyle(SofraColors.warning)
                                }
                            }
                        }
                        .padding(.horizontal, SofraSpacing.screenHorizontal)
                    }

                    // Recent Transactions
                    VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
                        Text("آخر المعاملات")
                            .font(SofraTypography.title3)
                            .padding(.horizontal, SofraSpacing.screenHorizontal)

                        if deliveredOrders.isEmpty {
                            EmptyStateView(
                                icon: "banknote",
                                title: "لا توجد معاملات",
                                message: "ستظهر الأرباح هنا عند اكتمال الطلبات"
                            )
                        } else {
                            ForEach(deliveredOrders.prefix(20)) { order in
                                transactionRow(order)
                            }
                            .padding(.horizontal, SofraSpacing.screenHorizontal)
                        }
                    }

                    Spacer(minLength: SofraSpacing.xxxl)
                }
                .padding(.top, SofraSpacing.md)
            }
            .ramadanBackground()
            .navigationTitle("المحفظة")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("إغلاق") { dismiss() }
                }
            }
        }
    }

    // MARK: - Wallet Stat Card
    private func walletStat(title: String, value: String, icon: String, color: Color) -> some View {
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

    // MARK: - Transaction Row
    private func transactionRow(_ order: Order) -> some View {
        HStack {
            Text("+\(order.total, specifier: "%.2f") ر.س")
                .font(SofraTypography.headline)
                .foregroundStyle(SofraColors.success)

            Spacer()

            VStack(alignment: .trailing, spacing: 2) {
                Text("طلب #\(order.id.prefix(6))")
                    .font(SofraTypography.body)
                    .foregroundStyle(SofraColors.textPrimary)
                if let date = order.createdAt {
                    Text(date.formatted(.dateTime.day().month().hour().minute()))
                        .font(SofraTypography.caption2)
                        .foregroundStyle(SofraColors.textMuted)
                }
            }

            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(SofraColors.success)
        }
        .padding(SofraSpacing.cardPadding)
        .background(SofraColors.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
    }
}
