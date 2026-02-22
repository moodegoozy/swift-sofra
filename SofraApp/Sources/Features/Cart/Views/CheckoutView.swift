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

    private let deliveryFee: Double = 0 // Set by courier/owner later

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

                // Delivery Address
                if deliveryType == "delivery" {
                    SofraCard {
                        Text("عنوان التوصيل")
                            .font(SofraTypography.headline)
                        TextField("أدخل عنوان التوصيل", text: $address)
                            .font(SofraTypography.body)
                            .textFieldStyle(.roundedBorder)
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
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
        .task {
            // Auto-populate address from user profile
            if let user = appState.currentUser {
                address = user.savedLocation?.address ?? user.address ?? ""
            }
        }
    }

    // MARK: - Submit Order
    private func submitOrder() async {
        guard let user = appState.currentUser else {
            errorMessage = "يرجى تسجيل الدخول"
            return
        }

        isSubmitting = true
        errorMessage = nil

        let orderFields: [String: Any] = [
            "customerId": user.uid,
            "items": cartVM.items.map { item -> [String: Any] in
                ["id": item.id, "name": item.name, "price": item.price, "qty": item.qty, "ownerId": item.ownerId ?? ""]
            },
            "subtotal": cartVM.subtotal,
            "deliveryFee": deliveryFee,
            "total": total,
            "status": "pending",
            "address": address.isEmpty ? (user.savedLocation?.address ?? user.address ?? "") : address,
            "deliveryType": deliveryType,
            "notes": notes,
            "restaurantId": cartVM.restaurantOwnerId ?? "",
            "restaurantName": cartVM.restaurantName,
            "createdAt": ISO8601DateFormatter().string(from: Date())
        ]

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
