// CheckoutView.swift
// Order checkout screen matching web /checkout

import SwiftUI

struct CheckoutView: View {
    @Environment(CartViewModel.self) var cartVM
    @Environment(AppState.self) var appState
    @Environment(\.dismiss) var dismiss
    @State private var notes = ""
    @State private var address = ""
    @State private var deliveryType = "delivery"
    @State private var isSubmitting = false
    @State private var showSuccess = false
    @State private var errorMessage: String?
    @State private var showLocationPicker = false
    @State private var deliveryLat: Double = 0
    @State private var deliveryLng: Double = 0

    /// Platform commission rate (default 15%)
    private let commissionRate: Double = 15
    private let deliveryFee: Double = 0 // Set by courier/owner later

    var commissionAmount: Double {
        cartVM.subtotal * commissionRate / 100
    }

    var total: Double {
        cartVM.subtotal + deliveryFee
    }

    var body: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.lg) {
                // Order Summary
                SofraCard {
                    HStack {
                        Text("\(cartVM.items.count)")
                            .font(SofraTypography.headline)
                        Spacer()
                        Text("عدد الأصناف")
                            .font(SofraTypography.body)
                            .foregroundStyle(SofraColors.textSecondary)
                    }
                    HStack {
                        Text("\(cartVM.subtotal, specifier: "%.2f") ر.س")
                            .font(SofraTypography.headline)
                        Spacer()
                        Text("المجموع الفرعي")
                            .font(SofraTypography.body)
                            .foregroundStyle(SofraColors.textSecondary)
                    }
                    Divider()
                    HStack {
                        Text("\(total, specifier: "%.2f") ر.س")
                            .font(SofraTypography.price)
                            .foregroundStyle(SofraColors.primaryDark)
                        Spacer()
                        Text("الإجمالي")
                            .font(SofraTypography.title3)
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                // Delivery Type
                SofraCard {
                    Text("نوع التسليم")
                        .font(SofraTypography.headline)

                    Picker("", selection: $deliveryType) {
                        Text("توصيل").tag("delivery")
                        Text("استلام").tag("pickup")
                    }
                    .pickerStyle(.segmented)
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                // Notes
                SofraCard {
                    Text("ملاحظات (اختياري)")
                        .font(SofraTypography.headline)
                    TextEditor(text: $notes)
                        .frame(minHeight: 60)
                        .font(SofraTypography.body)
                        .scrollContentBackground(.hidden)
                        .background(SofraColors.surfaceElevated)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                // Delivery Address — map picker
                if deliveryType == "delivery" {
                    SofraCard {
                        HStack {
                            Button {
                                showLocationPicker = true
                            } label: {
                                HStack(spacing: SofraSpacing.xs) {
                                    Text("تغيير")
                                        .font(SofraTypography.caption)
                                    Image(systemName: "map")
                                }
                                .foregroundStyle(SofraColors.primary)
                            }

                            Spacer()

                            VStack(alignment: .trailing, spacing: SofraSpacing.xxs) {
                                HStack(spacing: SofraSpacing.xs) {
                                    Text("عنوان التوصيل")
                                        .font(SofraTypography.headline)
                                    Image(systemName: "mappin.and.ellipse")
                                        .foregroundStyle(SofraColors.gold400)
                                }
                                Text(address.isEmpty ? "اضغط لتحديد الموقع على الخريطة" : address)
                                    .font(SofraTypography.caption)
                                    .foregroundStyle(address.isEmpty ? SofraColors.textMuted : SofraColors.textSecondary)
                                    .multilineTextAlignment(.trailing)
                                    .lineLimit(2)
                            }
                        }
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                    .onTapGesture {
                        showLocationPicker = true
                    }
                }

                // Payment info
                SofraCard {
                    HStack(spacing: SofraSpacing.sm) {
                        Text("الدفع عند الاستلام")
                            .font(SofraTypography.body)
                            .foregroundStyle(SofraColors.textSecondary)
                        Spacer()
                        Image(systemName: "banknote")
                            .foregroundStyle(SofraColors.success)
                        Text("طريقة الدفع")
                            .font(SofraTypography.headline)
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                // Error
                if let error = errorMessage {
                    Text(error)
                        .font(SofraTypography.callout)
                        .foregroundStyle(SofraColors.error)
                        .padding(.horizontal, SofraSpacing.screenHorizontal)
                }

                // Submit
                SofraButton(
                    title: "تأكيد الطلب",
                    icon: "checkmark.circle.fill",
                    isLoading: isSubmitting
                ) {
                    Task { await submitOrder() }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                Spacer(minLength: SofraSpacing.xxxl)
            }
            .padding(.top, SofraSpacing.md)
        }
        .ramadanBackground()
        .navigationTitle("إتمام الطلب")
        .navigationBarTitleDisplayMode(.inline)
        .alert("تم إنشاء الطلب بنجاح! 🎉", isPresented: $showSuccess) {
            Button("حسناً") { dismiss() }
        }
        .sheet(isPresented: $showLocationPicker) {
            LocationPickerView(
                title: "موقع التوصيل",
                subtitle: "حدد موقع التوصيل على الخريطة"
            ) { lat, lng, addr in
                deliveryLat = lat
                deliveryLng = lng
                address = addr
                // Also update the user's saved location
                appState.confirmLocation(lat: lat, lng: lng, address: addr)
            }
        }
        .task {
            // Auto-populate from appState confirmed location, or user profile
            if appState.hasConfirmedLocation {
                address = appState.userAddress
                deliveryLat = appState.userLatitude
                deliveryLng = appState.userLongitude
            } else if let user = appState.currentUser {
                address = user.savedLocation?.address ?? user.address ?? ""
                deliveryLat = user.savedLocation?.lat ?? 0
                deliveryLng = user.savedLocation?.lng ?? 0
            }
        }
    }

    // MARK: - Submit Order
    private func submitOrder() async {
        guard let user = appState.currentUser else {
            errorMessage = "يرجى تسجيل الدخول"
            return
        }

        // Require complete profile (name, phone, location)
        let hasName = !(user.name ?? "").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        let hasPhone = !(user.phone ?? "").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        let hasLocation = appState.hasConfirmedLocation || (user.savedLocation != nil && user.savedLocation!.lat != 0)
        if !hasName || !hasPhone || !hasLocation {
            var missing: [String] = []
            if !hasName { missing.append("الاسم") }
            if !hasPhone { missing.append("رقم الجوال") }
            if !hasLocation { missing.append("الموقع") }
            errorMessage = "أكمل بياناتك في صفحة حسابي أولاً: \(missing.joined(separator: "، "))"
            return
        }

        // Require location for delivery
        if deliveryType == "delivery" && deliveryLat == 0 && deliveryLng == 0 {
            showLocationPicker = true
            return
        }

        isSubmitting = true
        errorMessage = nil

        var orderFields: [String: Any] = [
            "customerId": user.uid,
            "customerName": user.displayName,
            "items": cartVM.items.map { item -> [String: Any] in
                ["id": item.id, "name": item.name, "price": item.price, "qty": item.qty, "ownerId": item.ownerId ?? ""]
            },
            "subtotal": cartVM.subtotal,
            "deliveryFee": deliveryFee,
            "total": total,
            "commissionRate": commissionRate,
            "commissionAmount": commissionAmount,
            "netAmount": total - commissionAmount,
            "status": "pending",
            "address": address.isEmpty ? (user.savedLocation?.address ?? user.address ?? "") : address,
            "deliveryType": deliveryType,
            "notes": notes,
            "restaurantId": cartVM.restaurantOwnerId ?? "",
            "restaurantName": cartVM.restaurantName,
            "createdAt": ISO8601DateFormatter().string(from: Date())
        ]

        // Add delivery location coordinates
        if deliveryLat != 0 || deliveryLng != 0 {
            orderFields["deliveryLocation"] = [
                "lat": deliveryLat,
                "lng": deliveryLng
            ] as [String: Any]
        }

        do {
            let token = try await appState.validToken()
            let orderId = UUID().uuidString.prefix(20).lowercased()
            let service = FirestoreService()
            try await service.createDocument(
                collection: "orders",
                id: String(orderId),
                fields: orderFields,
                idToken: token
            )
            cartVM.clear()
            showSuccess = true
        } catch {
            errorMessage = "فشل إنشاء الطلب: \(error.localizedDescription)"
        }

        isSubmitting = false
    }
}

#Preview {
    NavigationStack {
        CheckoutView()
            .environment(CartViewModel())
            .environment(AppState())
    }
}
