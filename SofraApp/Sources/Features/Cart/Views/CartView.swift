// CartView.swift
// Shopping cart screen matching web /cart route

import SwiftUI

struct CartView: View {
    @EnvironmentObject var cartVM: CartViewModel
    @EnvironmentObject var appState: AppState
    @State private var showCheckout = false

    var body: some View {
        Group {
            if cartVM.isEmpty {
                EmptyStateView(
                    icon: "cart",
                    title: "السلة فارغة",
                    message: "أضف وجباتك المفضلة من قائمة المطعم",
                    actionTitle: "تصفح المطاعم"
                ) {}
            } else {
                ScrollView {
                    VStack(spacing: SofraSpacing.md) {
                        // Cart Items
                        ForEach(cartVM.items) { item in
                            cartItemRow(item)
                        }

                        Divider()
                            .padding(.horizontal, SofraSpacing.screenHorizontal)

                        // Summary
                        SofraCard {
                            HStack {
                                Text("\(cartVM.subtotal, specifier: "%.2f") ر.س")
                                    .font(SofraTypography.price)
                                    .foregroundStyle(SofraColors.primaryDark)
                                Spacer()
                                Text("المجموع الفرعي")
                                    .font(SofraTypography.headline)
                                    .foregroundStyle(SofraColors.textSecondary)
                            }

                            Text("رسوم التوصيل تُحدد عند الدفع")
                                .font(SofraTypography.caption)
                                .foregroundStyle(SofraColors.textMuted)
                        }
                        .padding(.horizontal, SofraSpacing.screenHorizontal)

                        // Actions
                        VStack(spacing: SofraSpacing.sm) {
                            SofraButton(title: "إتمام الطلب", icon: "creditcard.fill") {
                                showCheckout = true
                            }

                            SofraButton(title: "تفريغ السلة", icon: "trash", style: .ghost) {
                                withAnimation { cartVM.clear() }
                            }
                        }
                        .padding(.horizontal, SofraSpacing.screenHorizontal)

                        Spacer(minLength: SofraSpacing.xxxl)
                    }
                    .padding(.top, SofraSpacing.md)
                }
            }
        }
        .background(SofraColors.background.ignoresSafeArea())
        .navigationTitle("السلة")
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(isPresented: $showCheckout) {
            CheckoutView()
        }
    }

    // MARK: - Cart Item Row
    private func cartItemRow(_ item: CartItem) -> some View {
        HStack(spacing: SofraSpacing.md) {
            // Remove button
            Button {
                withAnimation { cartVM.removeItem(id: item.id) }
            } label: {
                Image(systemName: "trash")
                    .foregroundStyle(SofraColors.error)
            }

            // Price
            Text("\(item.lineTotal, specifier: "%.0f") ر.س")
                .font(SofraTypography.priceSmall)
                .foregroundStyle(SofraColors.primaryDark)
                .frame(width: 70)

            // Qty stepper
            HStack(spacing: SofraSpacing.sm) {
                Button { cartVM.changeQty(id: item.id, qty: item.qty - 1) } label: {
                    Image(systemName: "minus.circle.fill")
                        .foregroundStyle(SofraColors.sky400)
                }
                Text("\(item.qty)")
                    .font(SofraTypography.headline)
                    .frame(minWidth: 24)
                Button { cartVM.changeQty(id: item.id, qty: item.qty + 1) } label: {
                    Image(systemName: "plus.circle.fill")
                        .foregroundStyle(SofraColors.primary)
                }
            }

            Spacer()

            // Name
            VStack(alignment: .trailing) {
                Text(item.name)
                    .font(SofraTypography.headline)
                    .foregroundStyle(SofraColors.textPrimary)
                    .lineLimit(1)
                Text("\(item.price, specifier: "%.0f") ر.س/للقطعة")
                    .font(SofraTypography.caption)
                    .foregroundStyle(SofraColors.textMuted)
            }
        }
        .padding(SofraSpacing.cardPadding)
        .background(SofraColors.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
        .shadow(color: .black.opacity(0.03), radius: 4, y: 2)
        .padding(.horizontal, SofraSpacing.screenHorizontal)
    }
}

#Preview {
    NavigationStack {
        CartView()
            .environmentObject(CartViewModel())
            .environmentObject(AppState())
    }
}
