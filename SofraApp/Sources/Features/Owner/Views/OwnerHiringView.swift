// OwnerHiringView.swift
// إدارة التوظيف — عرض طلبات المناديب وقبول/رفض

import SwiftUI

struct OwnerHiringView: View {
    @Environment(AppState.self) var appState
    let restaurant: Restaurant
    @State private var isHiring = false
    @State private var hiringDescription = ""
    @State private var applications: [CourierApplication] = []
    @State private var approvedCouriers: [CourierApplication] = []
    @State private var isLoading = false
    @State private var isSaving = false

    private let firestoreService = FirestoreService()

    var body: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.lg) {
                // Hiring Toggle
                SofraCard {
                    VStack(alignment: .trailing, spacing: SofraSpacing.md) {
                        HStack {
                            Toggle("", isOn: $isHiring)
                                .tint(SofraColors.success)
                                .onChange(of: isHiring) { _, newVal in
                                    Task { await toggleHiring(newVal) }
                                }

                            Spacer()

                            VStack(alignment: .trailing) {
                                Text("حالة التوظيف")
                                    .font(SofraTypography.headline)
                                StatusBadge(
                                    text: isHiring ? "مفتوح للتوظيف" : "التوظيف مغلق",
                                    color: isHiring ? SofraColors.success : SofraColors.error
                                )
                            }

                            Image(systemName: "person.3.fill")
                                .font(.title2)
                                .foregroundStyle(SofraColors.info)
                        }

                        if isHiring {
                            SofraTextField(
                                label: "وصف التوظيف",
                                text: $hiringDescription,
                                icon: "text.alignright",
                                placeholder: "مثال: نحتاج مناديب توصيل في منطقة الرياض"
                            )

                            SofraButton(title: "حفظ الوصف", icon: "checkmark", isLoading: isSaving) {
                                Task { await saveHiringDescription() }
                            }
                        }
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                // Pending Applications
                VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
                    Text("طلبات التوظيف المعلقة")
                        .font(SofraTypography.title3)
                        .padding(.horizontal, SofraSpacing.screenHorizontal)

                    if isLoading {
                        ForEach(0..<2, id: \.self) { _ in SkeletonCard() }
                            .padding(.horizontal, SofraSpacing.screenHorizontal)
                    } else if applications.isEmpty {
                        EmptyStateView(
                            icon: "person.badge.clock",
                            title: "لا توجد طلبات",
                            message: "طلبات المناديب ستظهر هنا عند التقديم"
                        )
                    } else {
                        ForEach(applications) { app in
                            applicationCard(app, isPending: true)
                        }
                        .padding(.horizontal, SofraSpacing.screenHorizontal)
                    }
                }

                // Approved Couriers
                if !approvedCouriers.isEmpty {
                    VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
                        Text("المناديب المعتمدون")
                            .font(SofraTypography.title3)
                            .padding(.horizontal, SofraSpacing.screenHorizontal)

                        ForEach(approvedCouriers) { app in
                            applicationCard(app, isPending: false)
                        }
                        .padding(.horizontal, SofraSpacing.screenHorizontal)
                    }
                }

                Spacer(minLength: SofraSpacing.xxxl)
            }
            .padding(.top, SofraSpacing.md)
        }
        .task {
            isHiring = restaurant.isHiring
            hiringDescription = restaurant.hiringDescription ?? ""
            await loadApplications()
        }
    }

    // MARK: - Application Card
    private func applicationCard(_ app: CourierApplication, isPending: Bool) -> some View {
        SofraCard {
            VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
                HStack {
                    if isPending {
                        // Accept/Reject buttons
                        HStack(spacing: SofraSpacing.sm) {
                            Button {
                                Task { await rejectApplication(app) }
                            } label: {
                                Text("رفض")
                                    .font(SofraTypography.calloutSemibold)
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, SofraSpacing.md)
                                    .padding(.vertical, SofraSpacing.sm)
                                    .background(SofraColors.error)
                                    .clipShape(Capsule())
                            }

                            Button {
                                Task { await approveApplication(app) }
                            } label: {
                                Text("قبول")
                                    .font(SofraTypography.calloutSemibold)
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, SofraSpacing.md)
                                    .padding(.vertical, SofraSpacing.sm)
                                    .background(SofraColors.success)
                                    .clipShape(Capsule())
                            }
                        }
                    } else {
                        StatusBadge(text: "معتمد", color: SofraColors.success)
                    }

                    Spacer()

                    VStack(alignment: .trailing) {
                        Text(app.courierName)
                            .font(SofraTypography.headline)
                        StatusBadge(text: app.status.arabicLabel, color: app.status.color)
                    }

                    Image(systemName: "car.fill")
                        .font(.title2)
                        .foregroundStyle(SofraColors.primary)
                }

                Divider()

                HStack {
                    Spacer()
                    Label(app.courierPhone, systemImage: "phone.fill")
                        .font(SofraTypography.body)
                        .foregroundStyle(SofraColors.textSecondary)
                }

                HStack {
                    Spacer()
                    Label(app.vehicleType, systemImage: "car.fill")
                        .font(SofraTypography.body)
                        .foregroundStyle(SofraColors.textSecondary)
                }

                if let date = app.createdAt {
                    HStack {
                        Spacer()
                        Text(date.relativeArabic)
                            .font(SofraTypography.caption)
                            .foregroundStyle(SofraColors.textMuted)
                    }
                }
            }
        }
    }

    // MARK: - Actions
    private func loadApplications() async {
        guard let token = try? await appState.validToken() else { return }
        isLoading = true
        do {
            // Load pending applications
            let pendingDocs = try await firestoreService.query(
                collection: "courierApplications",
                filters: [
                    QueryFilter(field: "restaurantId", op: "EQUAL", value: restaurant.id),
                    QueryFilter(field: "status", op: "EQUAL", value: "pending")
                ],
                orderBy: "createdAt",
                descending: true,
                idToken: token
            )
            applications = pendingDocs.map { CourierApplication(from: $0) }

            // Load approved couriers
            let approvedDocs = try await firestoreService.query(
                collection: "courierApplications",
                filters: [
                    QueryFilter(field: "restaurantId", op: "EQUAL", value: restaurant.id),
                    QueryFilter(field: "status", op: "EQUAL", value: "approved")
                ],
                idToken: token
            )
            approvedCouriers = approvedDocs.map { CourierApplication(from: $0) }
        } catch {
            Logger.log("Load applications error: \(error)", level: .error)
        }
        isLoading = false
    }

    private func toggleHiring(_ enabled: Bool) async {
        guard let token = try? await appState.validToken() else { return }
        do {
            try await firestoreService.updateDocument(
                collection: "restaurants", id: restaurant.id,
                fields: ["isHiring": enabled],
                idToken: token
            )
        } catch {
            Logger.log("Toggle hiring error: \(error)", level: .error)
        }
    }

    private func saveHiringDescription() async {
        guard let token = try? await appState.validToken() else { return }
        isSaving = true
        do {
            try await firestoreService.updateDocument(
                collection: "restaurants", id: restaurant.id,
                fields: ["hiringDescription": hiringDescription],
                idToken: token
            )
        } catch {
            Logger.log("Save hiring desc error: \(error)", level: .error)
        }
        isSaving = false
    }

    private func approveApplication(_ app: CourierApplication) async {
        guard let token = try? await appState.validToken() else { return }
        do {
            try await firestoreService.updateDocument(
                collection: "courierApplications", id: app.id,
                fields: ["status": "approved"],
                idToken: token
            )
            // Also update the courier's user doc with the assigned restaurantId
            try await firestoreService.updateDocument(
                collection: "users", id: app.courierId,
                fields: [
                    "assignedRestaurantId": restaurant.id,
                    "assignedRestaurantName": restaurant.name,
                    "courierStatus": "approved"
                ],
                idToken: token
            )

            // Move from pending to approved
            if let idx = applications.firstIndex(where: { $0.id == app.id }) {
                var approved = applications.remove(at: idx)
                approved.status = .approved
                approvedCouriers.insert(approved, at: 0)
            }
        } catch {
            Logger.log("Approve application error: \(error)", level: .error)
        }
    }

    private func rejectApplication(_ app: CourierApplication) async {
        guard let token = try? await appState.validToken() else { return }
        do {
            try await firestoreService.updateDocument(
                collection: "courierApplications", id: app.id,
                fields: ["status": "rejected"],
                idToken: token
            )
            applications.removeAll { $0.id == app.id }
        } catch {
            Logger.log("Reject application error: \(error)", level: .error)
        }
    }
}

// MARK: - Courier Application Model
struct CourierApplication: Identifiable {
    let id: String
    var courierId: String
    var courierName: String
    var courierPhone: String
    var vehicleType: String
    var restaurantId: String
    var restaurantName: String
    var status: ApplicationStatus
    var createdAt: Date?

    enum ApplicationStatus: String {
        case pending, approved, rejected

        var arabicLabel: String {
            switch self {
            case .pending:  return "معلق"
            case .approved: return "معتمد"
            case .rejected: return "مرفوض"
            }
        }

        var color: Color {
            switch self {
            case .pending:  return SofraColors.warning
            case .approved: return SofraColors.success
            case .rejected: return SofraColors.error
            }
        }
    }

    init(id: String, courierId: String, courierName: String, courierPhone: String, vehicleType: String, restaurantId: String, restaurantName: String, status: ApplicationStatus, createdAt: Date?) {
        self.id = id
        self.courierId = courierId
        self.courierName = courierName
        self.courierPhone = courierPhone
        self.vehicleType = vehicleType
        self.restaurantId = restaurantId
        self.restaurantName = restaurantName
        self.status = status
        self.createdAt = createdAt
    }

    init(from doc: FirestoreDocumentResponse) {
        let f = doc.fields ?? [:]
        self.id = doc.documentId ?? ""
        self.courierId = f["courierId"]?.stringVal ?? ""
        self.courierName = f["courierName"]?.stringVal ?? ""
        self.courierPhone = f["courierPhone"]?.stringVal ?? ""
        self.vehicleType = f["vehicleType"]?.stringVal ?? ""
        self.restaurantId = f["restaurantId"]?.stringVal ?? ""
        self.restaurantName = f["restaurantName"]?.stringVal ?? ""
        self.status = ApplicationStatus(rawValue: f["status"]?.stringVal ?? "pending") ?? .pending
        self.createdAt = f["createdAt"]?.dateVal
    }
}
