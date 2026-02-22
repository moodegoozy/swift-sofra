// CourierDashboardViewModel.swift
// Manages courier dashboard data (availability, orders, earnings)

import Foundation

final class CourierDashboardViewModel: ObservableObject {
    @Published var isAvailable = false
    @Published var readyOrders: [Order] = []
    @Published var activeOrders: [Order] = []
    @Published var deliveredOrders: [Order] = []
    @Published var totalDeliveries = 0
    @Published var rating: Double = 0
    @Published var totalEarnings: Double = 0
    @Published var todayEarnings: Double = 0
    @Published var documentsStatus = "pending"
    @Published var isLoading = false

    private let firestoreService = FirestoreService()
    private var courierId: String = ""

    /// Platform fee per delivery (matches web COURIER_PLATFORM_FEE)
    static let platformFee: Double = 3.75

    func loadDashboard(courierId: String, token: String?) async {
        guard let token else { return }
        self.courierId = courierId

        isLoading = true

        do {
            // Load courier profile
            let profileDoc = try await firestoreService.getDocument(
                collection: "users", id: courierId, idToken: token
            )
            self.isAvailable = profileDoc.boolField("isAvailable") ?? false
            self.totalDeliveries = profileDoc.intField("totalDeliveries") ?? 0
            self.rating = profileDoc.doubleField("rating") ?? 0
            self.documentsStatus = profileDoc.stringField("documentsStatus") ?? "pending"

            // Load ready orders (status == 'ready', no courier assigned)
            let readyDocs = try await firestoreService.query(
                collection: "orders",
                filters: [QueryFilter(field: "status", op: "EQUAL", value: "ready")],
                idToken: token
            )
            self.readyOrders = readyDocs.map { Order(from: $0) }
                .filter { $0.courierId == nil || $0.courierId?.isEmpty == true }

            // Load my active orders
            let activeDocs = try await firestoreService.query(
                collection: "orders",
                filters: [
                    QueryFilter(field: "courierId", op: "EQUAL", value: courierId),
                    QueryFilter(field: "status", op: "EQUAL", value: "out_for_delivery")
                ],
                idToken: token
            )
            self.activeOrders = activeDocs.map { Order(from: $0) }

            // Load delivered orders
            let deliveredDocs = try await firestoreService.query(
                collection: "orders",
                filters: [
                    QueryFilter(field: "courierId", op: "EQUAL", value: courierId),
                    QueryFilter(field: "status", op: "EQUAL", value: "delivered")
                ],
                orderBy: "createdAt",
                descending: true,
                limit: 30,
                idToken: token
            )
            self.deliveredOrders = deliveredDocs.map { Order(from: $0) }

            // Calculate earnings
            let allMyDelivered = deliveredOrders
            totalEarnings = allMyDelivered.reduce(0) { $0 + $1.deliveryFee }
                - (Double(allMyDelivered.count) * Self.platformFee)

            let calendar = Calendar.current
            let today = calendar.startOfDay(for: Date())
            todayEarnings = allMyDelivered
                .filter { ($0.createdAt ?? .distantPast) >= today }
                .reduce(0) { $0 + $1.deliveryFee - Self.platformFee }

        } catch {
            Logger.log("Courier dashboard error: \(error)", level: .error)
        }

        isLoading = false
    }

    func toggleAvailability(available: Bool, token: String?) async {
        guard let token else { return }
        do {
            try await firestoreService.updateDocument(
                collection: "users", id: courierId,
                fields: ["isAvailable": available],
                idToken: token
            )
            isAvailable = available
        } catch {
            Logger.log("Toggle availability error: \(error)", level: .error)
        }
    }

    func acceptDelivery(orderId: String, courierId: String, token: String?) async {
        guard let token else { return }
        do {
            try await firestoreService.updateDocument(
                collection: "orders", id: orderId,
                fields: [
                    "courierId": courierId,
                    "status": "out_for_delivery"
                ],
                idToken: token
            )
            // Move from ready to active
            if let idx = readyOrders.firstIndex(where: { $0.id == orderId }) {
                var order = readyOrders.remove(at: idx)
                order.status = .outForDelivery
                order.courierId = courierId
                activeOrders.insert(order, at: 0)
            }
        } catch {
            Logger.log("Accept delivery error: \(error)", level: .error)
        }
    }

    func markDelivered(orderId: String, token: String?) async {
        guard let token else { return }
        do {
            try await firestoreService.updateDocument(
                collection: "orders", id: orderId,
                fields: ["status": "delivered"],
                idToken: token
            )
            if let idx = activeOrders.firstIndex(where: { $0.id == orderId }) {
                var order = activeOrders.remove(at: idx)
                order.status = .delivered
                deliveredOrders.insert(order, at: 0)
                totalDeliveries += 1
            }
        } catch {
            Logger.log("Mark delivered error: \(error)", level: .error)
        }
    }
}
