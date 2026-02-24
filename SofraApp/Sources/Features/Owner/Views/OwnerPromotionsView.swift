// OwnerPromotionsView.swift
// إدارة العروض الترويجية والخصومات للمطعم

import SwiftUI

struct OwnerPromotionsView: View {
    @Environment(AppState.self) var appState
    let restaurant: Restaurant
    @State private var promotions: [Promotion] = []
    @State private var isLoading = false
    @State private var showAddPromotion = false

    // Add form
    @State private var promoTitle = ""
    @State private var promoDescription = ""
    @State private var discountPercent = ""
    @State private var promoCode = ""
    @State private var isActive = true
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var successMessage: String?

    private let firestoreService = FirestoreService()

    var body: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.lg) {
                // Header
                HStack {
                    Button {
                        showAddPromotion = true
                    } label: {
                        HStack(spacing: SofraSpacing.xs) {
                            Text("إضافة عرض")
                                .font(SofraTypography.calloutSemibold)
                            Image(systemName: "plus.circle.fill")
                        }
                        .padding(.horizontal, SofraSpacing.md)
                        .padding(.vertical, SofraSpacing.sm)
                        .background(SofraColors.primary)
                        .foregroundStyle(.white)
                        .clipShape(Capsule())
                    }

                    Spacer()

                    Text("العروض الترويجية")
                        .font(SofraTypography.title3)
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                if isLoading {
                    ForEach(0..<3, id: \.self) { _ in SkeletonCard() }
                        .padding(.horizontal, SofraSpacing.screenHorizontal)
                } else if promotions.isEmpty {
                    EmptyStateView(
                        icon: "megaphone",
                        title: "لا توجد عروض",
                        message: "أضف عروض ترويجية لجذب المزيد من العملاء"
                    )
                } else {
                    ForEach(promotions) { promo in
                        promotionCard(promo)
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                }

                // Messages
                if let error = errorMessage {
                    Text(error).font(SofraTypography.callout).foregroundStyle(SofraColors.error)
                }
                if let success = successMessage {
                    Text(success).font(SofraTypography.callout).foregroundStyle(SofraColors.success)
                }

                Spacer(minLength: SofraSpacing.xxxl)
            }
            .padding(.top, SofraSpacing.md)
        }
        .task { await loadPromotions() }
        .sheet(isPresented: $showAddPromotion) {
            addPromotionSheet
        }
    }

    // MARK: - Promotion Card
    private func promotionCard(_ promo: Promotion) -> some View {
        SofraCard {
            VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
                HStack {
                    // Toggle active
                    Toggle("", isOn: Binding(
                        get: { promo.isActive },
                        set: { newVal in
                            Task { await togglePromotion(promo, active: newVal) }
                        }
                    ))
                    .tint(SofraColors.success)

                    Spacer()

                    VStack(alignment: .trailing) {
                        Text(promo.title)
                            .font(SofraTypography.headline)
                        if !promo.description.isEmpty {
                            Text(promo.description)
                                .font(SofraTypography.caption)
                                .foregroundStyle(SofraColors.textSecondary)
                        }
                    }

                    StatusBadge(
                        text: "\(Int(promo.discountPercent))% خصم",
                        color: SofraColors.warning
                    )
                }

                HStack {
                    // Delete button
                    Button {
                        Task { await deletePromotion(promo) }
                    } label: {
                        Image(systemName: "trash")
                            .foregroundStyle(SofraColors.error)
                    }

                    Spacer()

                    if !promo.code.isEmpty {
                        HStack(spacing: SofraSpacing.xs) {
                            Text(promo.code)
                                .font(SofraTypography.calloutSemibold)
                                .foregroundStyle(SofraColors.gold400)
                            Image(systemName: "ticket.fill")
                                .foregroundStyle(SofraColors.gold400)
                        }
                    }

                    StatusBadge(
                        text: promo.isActive ? "فعّال" : "معطّل",
                        color: promo.isActive ? SofraColors.success : SofraColors.error
                    )
                }
            }
        }
    }

    // MARK: - Add Promotion Sheet
    private var addPromotionSheet: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: SofraSpacing.lg) {
                    SofraTextField(label: "اسم العرض", text: $promoTitle, icon: "megaphone", placeholder: "مثال: خصم رمضان")
                    SofraTextField(label: "الوصف", text: $promoDescription, icon: "text.alignright", placeholder: "وصف العرض")
                    SofraTextField(label: "نسبة الخصم %", text: $discountPercent, icon: "percent", placeholder: "مثال: 20", keyboardType: .numberPad)
                    SofraTextField(label: "كود الخصم (اختياري)", text: $promoCode, icon: "ticket", placeholder: "مثال: RAMADAN25")

                    SofraButton(title: "حفظ العرض", icon: "checkmark", isLoading: isSaving) {
                        Task { await savePromotion() }
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)
                .padding(.top, SofraSpacing.lg)
            }
            .ramadanBackground()
            .navigationTitle("إضافة عرض ترويجي")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("إلغاء") { showAddPromotion = false }
                }
            }
        }
    }

    // MARK: - Actions
    private func loadPromotions() async {
        guard let token = try? await appState.validToken() else { return }
        isLoading = true
        do {
            let docs = try await firestoreService.query(
                collection: "promotions",
                filters: [QueryFilter(field: "restaurantId", op: "EQUAL", value: restaurant.id)],
                orderBy: "createdAt",
                descending: true,
                idToken: token
            )
            promotions = docs.map { Promotion(from: $0) }
        } catch {
            Logger.log("Load promotions error: \(error)", level: .error)
        }
        isLoading = false
    }

    private func savePromotion() async {
        guard let token = try? await appState.validToken() else { return }
        guard !promoTitle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            errorMessage = "أدخل اسم العرض"
            return
        }
        guard let percent = Double(discountPercent), percent > 0, percent <= 100 else {
            errorMessage = "أدخل نسبة خصم صحيحة (1-100)"
            return
        }

        isSaving = true
        errorMessage = nil
        do {
            let docId = UUID().uuidString
            let fields: [String: Any] = [
                "restaurantId": restaurant.id,
                "title": promoTitle.trimmingCharacters(in: .whitespacesAndNewlines),
                "description": promoDescription.trimmingCharacters(in: .whitespacesAndNewlines),
                "discountPercent": percent,
                "code": promoCode.trimmingCharacters(in: .whitespacesAndNewlines).uppercased(),
                "isActive": true,
                "createdAt": ISO8601DateFormatter().string(from: Date())
            ]
            try await firestoreService.createDocument(
                collection: "promotions", id: docId,
                fields: fields, idToken: token
            )
            promotions.insert(Promotion(id: docId, restaurantId: restaurant.id, title: promoTitle, description: promoDescription, discountPercent: percent, code: promoCode.uppercased(), isActive: true, createdAt: Date()), at: 0)
            showAddPromotion = false
            successMessage = "تم إضافة العرض"
            // Reset form
            promoTitle = ""
            promoDescription = ""
            discountPercent = ""
            promoCode = ""
        } catch {
            errorMessage = "فشل حفظ العرض: \(error.localizedDescription)"
        }
        isSaving = false
    }

    private func togglePromotion(_ promo: Promotion, active: Bool) async {
        guard let token = try? await appState.validToken() else { return }
        do {
            try await firestoreService.updateDocument(
                collection: "promotions", id: promo.id,
                fields: ["isActive": active], idToken: token
            )
            if let idx = promotions.firstIndex(where: { $0.id == promo.id }) {
                promotions[idx].isActive = active
            }
        } catch {
            Logger.log("Toggle promotion error: \(error)", level: .error)
        }
    }

    private func deletePromotion(_ promo: Promotion) async {
        guard let token = try? await appState.validToken() else { return }
        do {
            try await firestoreService.deleteDocument(
                collection: "promotions", id: promo.id, idToken: token
            )
            promotions.removeAll { $0.id == promo.id }
        } catch {
            Logger.log("Delete promotion error: \(error)", level: .error)
        }
    }
}

// MARK: - Promotion Model
struct Promotion: Identifiable {
    let id: String
    var restaurantId: String
    var title: String
    var description: String
    var discountPercent: Double
    var code: String
    var isActive: Bool
    var createdAt: Date?

    init(id: String, restaurantId: String, title: String, description: String, discountPercent: Double, code: String, isActive: Bool, createdAt: Date?) {
        self.id = id
        self.restaurantId = restaurantId
        self.title = title
        self.description = description
        self.discountPercent = discountPercent
        self.code = code
        self.isActive = isActive
        self.createdAt = createdAt
    }

    init(from doc: FirestoreDocumentResponse) {
        let f = doc.fields ?? [:]
        self.id = doc.documentId ?? ""
        self.restaurantId = f["restaurantId"]?.stringVal ?? ""
        self.title = f["title"]?.stringVal ?? ""
        self.description = f["description"]?.stringVal ?? ""
        self.discountPercent = f["discountPercent"]?.doubleVal ?? 0
        self.code = f["code"]?.stringVal ?? ""
        self.isActive = f["isActive"]?.boolVal ?? true
        self.createdAt = f["createdAt"]?.dateVal
    }
}
