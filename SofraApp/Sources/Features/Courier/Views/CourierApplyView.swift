// CourierApplyView.swift
// شاشة تقديم طلب توظيف للمندوب في مطعم محدد

import SwiftUI

struct CourierApplyView: View {
    @Environment(AppState.self) var appState
    @Environment(\.dismiss) var dismiss
    let restaurant: Restaurant

    @State private var courierName = ""
    @State private var courierPhone = ""
    @State private var vehicleType = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var submitted = false

    private let vehicleTypes = ["سيارة", "دباب", "دراجة هوائية", "مشي"]
    private let firestoreService = FirestoreService()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: SofraSpacing.xl) {
                    if submitted {
                        // Success state
                        VStack(spacing: SofraSpacing.lg) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 64))
                                .foregroundStyle(SofraColors.success)

                            Text("تم إرسال طلبك بنجاح!")
                                .font(SofraTypography.title2)
                                .foregroundStyle(SofraColors.gold300)

                            Text("سيتم مراجعة طلبك من قبل \(restaurant.name) وإشعارك بالنتيجة")
                                .font(SofraTypography.body)
                                .foregroundStyle(SofraColors.textSecondary)
                                .multilineTextAlignment(.center)

                            SofraButton(title: "رجوع", icon: "arrow.right") {
                                dismiss()
                            }
                        }
                        .padding(.top, SofraSpacing.xxxl)
                    } else {
                        // Restaurant Info
                        VStack(spacing: SofraSpacing.sm) {
                            Image(systemName: "storefront.fill")
                                .font(.system(size: 48))
                                .foregroundStyle(SofraColors.gold400)

                            Text(restaurant.name)
                                .font(SofraTypography.title2)
                                .foregroundStyle(SofraColors.gold300)

                            if let desc = restaurant.hiringDescription, !desc.isEmpty {
                                Text(desc)
                                    .font(SofraTypography.body)
                                    .foregroundStyle(SofraColors.textSecondary)
                                    .multilineTextAlignment(.center)
                            }
                        }
                        .padding(.top, SofraSpacing.lg)

                        // Application Form
                        VStack(spacing: SofraSpacing.lg) {
                            SofraTextField(
                                label: "الاسم الكامل",
                                text: $courierName,
                                icon: "person",
                                placeholder: "أدخل اسمك الكامل"
                            )

                            SofraTextField(
                                label: "رقم الجوال",
                                text: $courierPhone,
                                icon: "phone",
                                placeholder: "05xxxxxxxx",
                                keyboardType: .phonePad
                            )

                            // Vehicle Type Picker
                            VStack(alignment: .trailing, spacing: SofraSpacing.xs) {
                                Text("نوع المركبة")
                                    .font(SofraTypography.callout)
                                    .foregroundStyle(SofraColors.textSecondary)

                                HStack(spacing: SofraSpacing.sm) {
                                    ForEach(vehicleTypes, id: \.self) { type in
                                        Button {
                                            vehicleType = type
                                        } label: {
                                            Text(type)
                                                .font(SofraTypography.calloutSemibold)
                                                .padding(.horizontal, SofraSpacing.md)
                                                .padding(.vertical, SofraSpacing.sm)
                                                .background(vehicleType == type ? SofraColors.primary : SofraColors.sky100)
                                                .foregroundStyle(vehicleType == type ? .white : SofraColors.textSecondary)
                                                .clipShape(Capsule())
                                        }
                                    }
                                }
                            }

                            if let error = errorMessage {
                                Text(error)
                                    .font(SofraTypography.callout)
                                    .foregroundStyle(SofraColors.error)
                            }

                            SofraButton(
                                title: "إرسال طلب التوظيف",
                                icon: "paperplane.fill",
                                isLoading: isLoading,
                                isDisabled: courierName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || courierPhone.isEmpty || vehicleType.isEmpty
                            ) {
                                Task { await submitApplication() }
                            }
                        }
                        .padding(.horizontal, SofraSpacing.screenHorizontal)
                    }

                    Spacer(minLength: SofraSpacing.xxxl)
                }
            }
            .ramadanBackground()
            .navigationTitle("طلب توظيف")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("إلغاء") { dismiss() }
                        .foregroundStyle(SofraColors.gold400)
                }
            }
            .task {
                // Pre-fill from user data
                courierName = appState.currentUser?.name ?? ""
                courierPhone = appState.currentUser?.phone ?? ""
            }
        }
    }

    // MARK: - Submit
    private func submitApplication() async {
        guard let uid = appState.currentUser?.uid else { return }
        guard let token = try? await appState.validToken() else { return }

        isLoading = true
        errorMessage = nil

        do {
            // Check if already applied
            let existing = try await firestoreService.query(
                collection: "courierApplications",
                filters: [
                    QueryFilter(field: "courierId", op: "EQUAL", value: uid),
                    QueryFilter(field: "restaurantId", op: "EQUAL", value: restaurant.id)
                ],
                idToken: token
            )
            if !existing.isEmpty {
                let status = existing.first?.fields?["status"]?.stringVal ?? ""
                if status == "pending" {
                    errorMessage = "لديك طلب معلق بالفعل لهذا المطعم"
                } else if status == "approved" {
                    errorMessage = "أنت معتمد بالفعل في هذا المطعم"
                } else {
                    // Rejected — allow reapply by creating new
                    try await createApplication(uid: uid, token: token)
                }
            } else {
                try await createApplication(uid: uid, token: token)
            }
        } catch {
            errorMessage = "فشل إرسال الطلب: \(error.localizedDescription)"
        }
        isLoading = false
    }

    private func createApplication(uid: String, token: String) async throws {
        let docId = UUID().uuidString
        let fields: [String: Any] = [
            "courierId": uid,
            "courierName": courierName.trimmingCharacters(in: .whitespacesAndNewlines),
            "courierPhone": courierPhone.trimmingCharacters(in: .whitespacesAndNewlines),
            "vehicleType": vehicleType,
            "restaurantId": restaurant.id,
            "restaurantName": restaurant.name,
            "status": "pending",
            "createdAt": ISO8601DateFormatter().string(from: Date())
        ]
        try await firestoreService.createDocument(
            collection: "courierApplications", id: docId,
            fields: fields, idToken: token
        )
        submitted = true
    }
}
