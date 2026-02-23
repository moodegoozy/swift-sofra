// OwnerDashboardViewModel.swift
// Manages owner dashboard data (restaurant info, orders, menu items, stats)

import Foundation
import Observation

@Observable
final class OwnerDashboardViewModel {
    var restaurant: Restaurant?
    var orders: [Order] = []
    var menuItems: [MenuItem] = []
    var isLoading = false
    var errorMessage: String?

    // Stats
    var todayOrders = 0
    var totalRevenue: Double = 0
    var menuItemsCount = 0

    private let firestoreService = FirestoreService()

    func loadDashboard(ownerId: String, token: String?) async {
        guard let token else { return }

        isLoading = true
        errorMessage = nil

        do {
            // Load restaurant info (restaurants/{ownerId})
            let restDoc = try await firestoreService.getDocument(
                collection: "restaurants", id: ownerId, idToken: token
            )
            self.restaurant = Restaurant(from: restDoc)

            // Load orders and menu in parallel
            async let ordersTask = loadOrders(ownerId: ownerId, token: token)
            async let menuTask = loadMenu(ownerId: ownerId, token: token)

            await ordersTask
            await menuTask

            // Calculate stats
            let calendar = Calendar.current
            let today = calendar.startOfDay(for: Date())
            todayOrders = orders.filter { order in
                guard let created = order.createdAt else { return false }
                return created >= today
            }.count

            totalRevenue = orders
                .filter { $0.status == .delivered }
                .reduce(0) { $0 + $1.total }

            menuItemsCount = menuItems.count

        } catch {
            Logger.log("Owner dashboard load error: \(error)", level: .error)
            errorMessage = "تعذر تحميل البيانات"
        }

        isLoading = false
    }

    func loadOrders(ownerId: String, token: String?) async {
        guard let token else { return }
        do {
            let docs = try await firestoreService.query(
                collection: "orders",
                filters: [QueryFilter(field: "restaurantId", op: "EQUAL", value: ownerId)],
                orderBy: "createdAt",
                descending: true,
                limit: 50,
                idToken: token
            )
            self.orders = docs.map { Order(from: $0) }
        } catch {
            Logger.log("Owner orders load error: \(error)", level: .error)
            errorMessage = "تعذر تحميل الطلبات"
        }
    }

    private func loadMenu(ownerId: String, token: String) async {
        do {
            let docs = try await firestoreService.query(
                collection: "menuItems",
                filters: [QueryFilter(field: "ownerId", op: "EQUAL", value: ownerId)],
                idToken: token
            )
            self.menuItems = docs.map { MenuItem(from: $0) }
        } catch {
            Logger.log("Owner menu load error: \(error)", level: .error)
        }
    }

    func toggleOpen(ownerId: String, isOpen: Bool, token: String?) async {
        guard let token else { return }
        do {
            try await firestoreService.updateDocument(
                collection: "restaurants", id: ownerId,
                fields: ["isOpen": isOpen],
                idToken: token
            )
            restaurant?.isOpen = isOpen
        } catch {
            Logger.log("Toggle open error: \(error)", level: .error)
        }
    }

    func updateOrderStatus(orderId: String, newStatus: OrderStatus, token: String?) async {
        guard let token else { return }
        do {
            try await firestoreService.updateDocument(
                collection: "orders", id: orderId,
                fields: ["status": newStatus.rawValue],
                idToken: token
            )
            if let idx = orders.firstIndex(where: { $0.id == orderId }) {
                orders[idx].status = newStatus
            }
        } catch {
            Logger.log("Update order status error: \(error)", level: .error)
        }
    }

    func toggleItemAvailability(itemId: String, available: Bool, token: String?) async {
        guard let token else { return }
        do {
            try await firestoreService.updateDocument(
                collection: "menuItems", id: itemId,
                fields: ["available": available],
                idToken: token
            )
            if let idx = menuItems.firstIndex(where: { $0.id == itemId }) {
                menuItems[idx].available = available
            }
        } catch {
            Logger.log("Toggle availability error: \(error)", level: .error)
        }
    }
}
