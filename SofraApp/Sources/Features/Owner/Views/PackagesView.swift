// PackagesView.swift
// صفحة الباقات — يشوفها صاحب المطعم ويختار باقته

import SwiftUI

struct PackagesView: View {
    let restaurant: Restaurant
    @Environment(AppState.self) var appState
    @Environment(\.dismiss) var dismiss
    @State private var isRequesting = false
    @State private var requestSent = false
    @State private var errorMessage: String?
    @State private var packagePrices: PackagePrices = .defaults
    @State private var loadingPrices = true
    @State private var existingRequest: PackageRequest?

    private let firestoreService = FirestoreService()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: SofraSpacing.xl) {
                    // Header
                    headerSection

                    // Current Package
                    currentPackageBanner

                    // Package Cards
                    freePackageCard
                    premiumPackageCard

                    // Request Status
                    if let existingRequest {
                        requestStatusBanner(existingRequest)
                    }

                    if let errorMessage {
                        Text(errorMessage)
                            .font(SofraTypography.caption)
                            .foregroundStyle(SofraColors.error)
                            .padding(.horizontal, SofraSpacing.screenHorizontal)
                    }

                    Spacer(minLength: SofraSpacing.xxxl)
                }
                .padding(.top, SofraSpacing.md)
            }
            .ramadanBackground()
            .navigationTitle("الباقات")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("إغلاق") { dismiss() }
                }
            }
            .task {
                await loadPrices()
                await loadExistingRequest()
            }
        }
    }

    // MARK: - Header
    private var headerSection: some View {
        VStack(spacing: SofraSpacing.sm) {
            Image(systemName: "crown.fill")
                .font(.system(size: 40))
                .foregroundStyle(SofraColors.gold400)

            Text("اختر باقتك")
                .font(SofraTypography.title2)
                .foregroundStyle(SofraColors.textPrimary)

            Text("ارتقِ بمطعمك مع الباقة الذهبية")
                .font(SofraTypography.callout)
                .foregroundStyle(SofraColors.textSecondary)
        }
        .padding(.horizontal, SofraSpacing.screenHorizontal)
    }

    // MARK: - Current Package Banner
    private var currentPackageBanner: some View {
        SofraCard {
            HStack {
                StatusBadge(
                    text: restaurant.packageType == .premium ? "ذهبية" : "أساسية",
                    color: restaurant.packageType == .premium ? SofraColors.gold400 : SofraColors.textMuted
                )
                Spacer()
                HStack(spacing: SofraSpacing.xs) {
                    Text("باقتك الحالية")
                        .font(SofraTypography.headline)
                    Image(systemName: restaurant.packageType == .premium ? "crown.fill" : "tag.fill")
                        .foregroundStyle(restaurant.packageType == .premium ? SofraColors.gold400 : SofraColors.textMuted)
                }
            }
        }
        .padding(.horizontal, SofraSpacing.screenHorizontal)
    }

    // MARK: - Free Package Card
    private var freePackageCard: some View {
        VStack(spacing: 0) {
            // Card Header
            HStack {
                if restaurant.packageType == .free {
                    StatusBadge(text: "باقتك الحالية", color: SofraColors.success)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text("الباقة الأساسية")
                        .font(SofraTypography.title3)
                        .foregroundStyle(SofraColors.textPrimary)
                    Text("مجاناً")
                        .font(SofraTypography.price)
                        .foregroundStyle(SofraColors.success)
                }
            }
            .padding(SofraSpacing.cardPadding)
            .background(SofraColors.cardBackground)

            Divider().background(SofraColors.surfaceElevated)

            // Features
            VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
                featureRow("عرض المطعم في التطبيق", included: true)
                featureRow("استقبال الطلبات", included: true)
                featureRow("إدارة القائمة", included: true)
                featureRow("محادثة مع الزبائن", included: true)
                featureRow("ظهور مميز في البحث", included: false)
                featureRow("شارة مميز على المطعم", included: false)
                featureRow("أولوية في الصفحة الرئيسية", included: false)
                featureRow("تقارير متقدمة", included: false)
            }
            .padding(SofraSpacing.cardPadding)
            .background(SofraColors.cardBackground)
        }
        .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous)
                .strokeBorder(restaurant.packageType == .free ? SofraColors.success.opacity(0.5) : Color.clear, lineWidth: 2)
        )
        .shadow(color: .black.opacity(0.08), radius: 8, y: 4)
        .padding(.horizontal, SofraSpacing.screenHorizontal)
    }

    // MARK: - Premium Package Card
    private var premiumPackageCard: some View {
        VStack(spacing: 0) {
            // Card Header with gold gradient
            HStack {
                if restaurant.packageType == .premium {
                    StatusBadge(text: "باقتك الحالية", color: SofraColors.gold400)
                } else if existingRequest == nil {
                    Button {
                        Task { await requestPremium() }
                    } label: {
                        if isRequesting {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Text("طلب الباقة")
                                .font(SofraTypography.headline)
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(SofraColors.gold500)
                    .disabled(isRequesting)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    HStack(spacing: SofraSpacing.xs) {
                        Text("الباقة الذهبية")
                            .font(SofraTypography.title3)
                            .foregroundStyle(SofraColors.gold400)
                        Image(systemName: "crown.fill")
                            .foregroundStyle(SofraColors.gold400)
                    }
                    if loadingPrices {
                        SkeletonView(width: 80, height: 20, radius: 4)
                    } else {
                        Text("\(packagePrices.premiumMonthly, specifier: "%.0f") ر.س/شهر")
                            .font(SofraTypography.price)
                            .foregroundStyle(SofraColors.gold400)
                    }
                }
            }
            .padding(SofraSpacing.cardPadding)
            .background(
                LinearGradient(
                    colors: [SofraColors.gold500.opacity(0.1), SofraColors.cardBackground],
                    startPoint: .topTrailing,
                    endPoint: .bottomLeading
                )
            )

            Divider().background(SofraColors.gold500.opacity(0.3))

            // Features
            VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
                featureRow("عرض المطعم في التطبيق", included: true)
                featureRow("استقبال الطلبات", included: true)
                featureRow("إدارة القائمة", included: true)
                featureRow("محادثة مع الزبائن", included: true)
                featureRow("ظهور مميز في البحث", included: true)
                featureRow("شارة مميز على المطعم", included: true)
                featureRow("أولوية في الصفحة الرئيسية", included: true)
                featureRow("تقارير متقدمة", included: true)
            }
            .padding(SofraSpacing.cardPadding)
            .background(SofraColors.cardBackground)
        }
        .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous)
                .strokeBorder(SofraColors.gold500.opacity(restaurant.packageType == .premium ? 0.6 : 0.2), lineWidth: 2)
        )
        .shadow(color: SofraColors.gold500.opacity(0.15), radius: 12, y: 6)
        .padding(.horizontal, SofraSpacing.screenHorizontal)
    }

    // MARK: - Feature Row
    private func featureRow(_ text: String, included: Bool) -> some View {
        HStack(spacing: SofraSpacing.sm) {
            Spacer()
            Text(text)
                .font(SofraTypography.body)
                .foregroundStyle(included ? SofraColors.textPrimary : SofraColors.textMuted)
            Image(systemName: included ? "checkmark.circle.fill" : "xmark.circle")
                .foregroundStyle(included ? SofraColors.success : SofraColors.textMuted.opacity(0.5))
                .font(.body)
        }
    }

    // MARK: - Request Status Banner
    private func requestStatusBanner(_ request: PackageRequest) -> some View {
        SofraCard {
            VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
                HStack {
                    StatusBadge(
                        text: request.statusLabel,
                        color: request.statusColor
                    )
                    Spacer()
                    HStack(spacing: SofraSpacing.xs) {
                        Text("طلب الترقية")
                            .font(SofraTypography.headline)
                        Image(systemName: "clock.fill")
                            .foregroundStyle(SofraColors.warning)
                    }
                }

                Text("تم إرسال طلب ترقية للباقة الذهبية. سيتم مراجعته من الإدارة.")
                    .font(SofraTypography.caption)
                    .foregroundStyle(SofraColors.textSecondary)
                    .multilineTextAlignment(.trailing)

                if let date = request.createdAt {
                    Text("تاريخ الطلب: \(date.formatted(.dateTime.day().month().year()))")
                        .font(SofraTypography.caption2)
                        .foregroundStyle(SofraColors.textMuted)
                }
            }
        }
        .padding(.horizontal, SofraSpacing.screenHorizontal)
    }

    // MARK: - Load Prices from Firestore
    private func loadPrices() async {
        do {
            let token = try await appState.validToken()
            let doc = try await firestoreService.getDocument(
                collection: "config", id: "packages", idToken: token
            )
            let f = doc.fields ?? [:]
            packagePrices = PackagePrices(
                premiumMonthly: f["premiumMonthly"]?.doubleVal ?? PackagePrices.defaults.premiumMonthly,
                premiumYearly: f["premiumYearly"]?.doubleVal ?? PackagePrices.defaults.premiumYearly
            )
        } catch {
            // Use defaults if config doesn't exist
            packagePrices = .defaults
        }
        loadingPrices = false
    }

    // MARK: - Load Existing Request
    private func loadExistingRequest() async {
        do {
            let token = try await appState.validToken()
            let docs = try await firestoreService.query(
                collection: "packageRequests",
                filters: [
                    QueryFilter(field: "restaurantId", op: "EQUAL", value: restaurant.id)
                ],
                idToken: token
            )
            // Find pending request
            let requests = docs.map { PackageRequest(from: $0) }
            existingRequest = requests.first { $0.status == .pending || $0.status == .approved }
        } catch {
            // No existing request
        }
    }

    // MARK: - Request Premium
    private func requestPremium() async {
        isRequesting = true
        errorMessage = nil

        do {
            let token = try await appState.validToken()
            let requestId = UUID().uuidString
            try await firestoreService.createDocument(
                collection: "packageRequests",
                id: requestId,
                fields: [
                    "restaurantId": restaurant.id,
                    "restaurantName": restaurant.name,
                    "ownerId": appState.currentUser?.uid ?? "",
                    "requestedPackage": "premium",
                    "currentPackage": restaurant.packageType.rawValue,
                    "status": "pending",
                    "premiumPrice": packagePrices.premiumMonthly,
                    "createdAt": ISO8601DateFormatter().string(from: Date()),
                    "note": ""
                ],
                idToken: token
            )

            requestSent = true
            existingRequest = PackageRequest(
                id: requestId,
                restaurantId: restaurant.id,
                restaurantName: restaurant.name,
                requestedPackage: "premium",
                status: .pending,
                premiumPrice: packagePrices.premiumMonthly,
                createdAt: Date()
            )
        } catch {
            errorMessage = "تعذر إرسال الطلب. حاول مرة أخرى"
            Logger.log("Package request error: \(error)", level: .error)
        }

        isRequesting = false
    }
}

// MARK: - Package Prices Model
struct PackagePrices {
    var premiumMonthly: Double
    var premiumYearly: Double

    static let defaults = PackagePrices(premiumMonthly: 99, premiumYearly: 999)
}

// MARK: - Package Request Model
struct PackageRequest: Identifiable {
    let id: String
    let restaurantId: String
    let restaurantName: String
    let requestedPackage: String
    var status: RequestStatus
    let premiumPrice: Double
    let createdAt: Date?

    enum RequestStatus: String {
        case pending, approved, rejected
    }

    var statusLabel: String {
        switch status {
        case .pending: return "قيد المراجعة"
        case .approved: return "مقبول"
        case .rejected: return "مرفوض"
        }
    }

    var statusColor: Color {
        switch status {
        case .pending: return SofraColors.warning
        case .approved: return SofraColors.success
        case .rejected: return SofraColors.error
        }
    }

    // From Firestore
    init(from doc: FirestoreDocumentResponse) {
        let f = doc.fields ?? [:]
        self.id = doc.documentId ?? ""
        self.restaurantId = f["restaurantId"]?.stringVal ?? ""
        self.restaurantName = f["restaurantName"]?.stringVal ?? ""
        self.requestedPackage = f["requestedPackage"]?.stringVal ?? "premium"
        self.status = RequestStatus(rawValue: f["status"]?.stringVal ?? "pending") ?? .pending
        self.premiumPrice = f["premiumPrice"]?.doubleVal ?? 99
        if let dateStr = f["createdAt"]?.stringVal {
            self.createdAt = ISO8601DateFormatter().date(from: dateStr)
        } else {
            self.createdAt = nil
        }
    }

    // Manual init
    init(id: String, restaurantId: String, restaurantName: String, requestedPackage: String, status: RequestStatus, premiumPrice: Double, createdAt: Date?) {
        self.id = id
        self.restaurantId = restaurantId
        self.restaurantName = restaurantName
        self.requestedPackage = requestedPackage
        self.status = status
        self.premiumPrice = premiumPrice
        self.createdAt = createdAt
    }
}

import SwiftUI

#Preview {
    PackagesView(restaurant: .init(from: FirestoreDocumentResponse(
        name: "projects/x/databases/(default)/documents/restaurants/abc",
        fields: [
            "name": .string("مطبخ أم خالد"),
            "packageType": .string("free"),
            "isOpen": .boolean(true)
        ],
        createTime: nil, updateTime: nil
    )))
    .environment(AppState())
}
