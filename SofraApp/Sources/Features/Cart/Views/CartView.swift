// CartView.swift
// Shopping cart screen matching web /cart route

import SwiftUI

struct CartView: View {
    @Environment(CartViewModel.self) var cartVM
    @Environment(AppState.self) var appState
    @State private var showCheckout = false
    
    private let minimumOrderAmount: Double = 15.0 // Minimum order amount in SAR

    /// Customer must have name, phone, and location to order
    private var isProfileComplete: Bool {
        guard let user = appState.currentUser else { return false }
        let hasName = !(user.name ?? "").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        let hasPhone = !(user.phone ?? "").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        let hasLocation = appState.hasConfirmedLocation || (user.savedLocation != nil && user.savedLocation!.lat != 0)
        return hasName && hasPhone && hasLocation
    }
    
    private var meetsMinimumOrder: Bool {
        cartVM.subtotal >= minimumOrderAmount
    }
    
    private var canCheckout: Bool {
        isProfileComplete && meetsMinimumOrder
    }

    private var missingFields: [String] {
        guard let user = appState.currentUser else { return ["الاسم", "رقم الجوال", "الموقع"] }
        var missing: [String] = []
        if (user.name ?? "").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { missing.append("الاسم") }
        if (user.phone ?? "").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { missing.append("رقم الجوال") }
        let hasLoc = appState.hasConfirmedLocation || (user.savedLocation != nil && user.savedLocation!.lat != 0)
        if !hasLoc { missing.append("الموقع") }
        return missing
    }

    var body: some View {
        Group {
            if cartVM.isEmpty {
                EmptyStateView(
                    icon: "cart",
                    title: "السلة فارغة",
                    message: "أضف وجباتك المفضلة من قائمة المطعم",
                    actionTitle: "تصفح المطاعم"
                ) {
                    appState.selectedMainTab = 1
                }
            } else {
                ScrollView {
                    VStack(spacing: SofraSpacing.md) {
                        // Profile incomplete warning
                        if !isProfileComplete {
                            profileIncompleteWarning
                        }

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
                            
                            // Minimum order notice
                            if !meetsMinimumOrder {
                                HStack(spacing: SofraSpacing.xs) {
                                    Image(systemName: "info.circle.fill")
                                        .foregroundStyle(SofraColors.warning)
                                    Text("الحد الأدنى للطلب \(Int(minimumOrderAmount)) ر.س - أضف المزيد بـ \(Int(minimumOrderAmount - cartVM.subtotal)) ر.س")
                                        .font(SofraTypography.caption)
                                        .foregroundStyle(SofraColors.warning)
                                }
                                .padding(.top, SofraSpacing.xs)
                            }
                        }
                        .padding(.horizontal, SofraSpacing.screenHorizontal)

                        // Actions
                        VStack(spacing: SofraSpacing.sm) {
                            SofraButton(
                                title: meetsMinimumOrder ? "إتمام الطلب" : "أضف المزيد (\(Int(minimumOrderAmount - cartVM.subtotal)) ر.س)",
                                icon: meetsMinimumOrder ? "creditcard.fill" : "plus.circle.fill",
                                isDisabled: !canCheckout
                            ) {
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
        .ramadanBackground()
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

    // MARK: - Profile Incomplete Warning
    private var profileIncompleteWarning: some View {
        VStack(spacing: SofraSpacing.sm) {
            HStack(spacing: SofraSpacing.sm) {
                VStack(alignment: .trailing, spacing: SofraSpacing.xs) {
                    Text("أكمل بياناتك أولاً")
                        .font(SofraTypography.headline)
                        .foregroundStyle(SofraColors.warning)
                    Text("يجب إضافة \(missingFields.joined(separator: " و")) قبل الطلب")
                        .font(SofraTypography.caption)
                        .foregroundStyle(SofraColors.textSecondary)
                        .multilineTextAlignment(.trailing)
                }
                Spacer()
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.title2)
                    .foregroundStyle(SofraColors.warning)
            }

            NavigationLink {
                ProfileView()
            } label: {
                HStack(spacing: SofraSpacing.xs) {
                    Image(systemName: "chevron.left")
                    Text("الذهاب للملف الشخصي")
                        .font(SofraTypography.calloutSemibold)
                }
                .foregroundStyle(SofraColors.primary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, SofraSpacing.sm)
                .background(SofraColors.primary.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
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
}

#Preview {
    NavigationStack {
        CartView()
            .environment(CartViewModel())
            .environment(AppState())
    }
}
