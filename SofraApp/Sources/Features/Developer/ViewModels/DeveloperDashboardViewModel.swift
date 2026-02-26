// DeveloperDashboardViewModel.swift
// Full system control: all supervisor features + settings, analytics, user management

import Foundation
import Observation

@Observable
final class DeveloperDashboardViewModel {
    var orders: [Order] = []
    var restaurants: [Restaurant] = []
    var users: [AppUser] = []
    var isLoading = false
    var errorMessage: String?

    // System-wide stats
    var totalOrders = 0
    var activeOrders = 0
    var totalRevenue: Double = 0
    var totalCommission: Double = 0
    var netPlatformEarnings: Double = 0
    var totalRestaurants = 0
    var totalUsers = 0
    var todayOrders = 0
    var todayRevenue: Double = 0
    var courierPlatformFees: Double = 0

    // Per-role counts
    var customerCount = 0
    var ownerCount = 0
    var courierCount = 0
    var supervisorCount = 0

    private let firestoreService = FirestoreService()

    // MARK: - Load All Data
    func loadDashboard(token: String?) async {
        guard let token else { return }

        isLoading = true
        errorMessage = nil

        async let ordersTask: () = loadOrders(token: token)
        async let restaurantsTask: () = loadRestaurants(token: token)
        async let usersTask: () = loadUsers(token: token)

        await ordersTask
        await restaurantsTask
        await usersTask

        calculateStats()
        isLoading = false
    }

    // MARK: - Load Orders
    func loadOrders(token: String) async {
        do {
            let docs = try await firestoreService.query(
                collection: "orders",
                orderBy: "createdAt",
                descending: true,
                limit: 500,
                idToken: token
            )
            self.orders = docs.map { Order(from: $0) }
        } catch {
            Logger.log("Developer orders load error: \(error)", level: .error)
            errorMessage = "تعذر تحميل الطلبات"
        }
    }

    // MARK: - Load Restaurants
    func loadRestaurants(token: String) async {
        do {
            let docs = try await firestoreService.listDocuments(
                collection: "restaurants", idToken: token, pageSize: 500
            )
            self.restaurants = docs.map { Restaurant(from: $0) }
        } catch {
            Logger.log("Developer restaurants load error: \(error)", level: .error)
        }
    }

    // MARK: - Load Users
    func loadUsers(token: String) async {
        do {
            let docs = try await firestoreService.listDocuments(
                collection: "users", idToken: token, pageSize: 500
            )
            self.users = docs.map { AppUser(from: $0) }
        } catch {
            Logger.log("Developer users load error: \(error)", level: .error)
        }
    }

    // MARK: - Calculate Stats
    private func calculateStats() {
        totalOrders = orders.count
        activeOrders = orders.filter { $0.status != .delivered && $0.status != .cancelled }.count

        let delivered = orders.filter { $0.status == .delivered }
        totalRevenue = delivered.reduce(0) { $0 + $1.total }
        totalCommission = delivered.reduce(0) { $0 + $1.commissionAmount }

        // Courier platform fees (3.75 per delivered order with courier)
        let courierDeliveries = delivered.filter { $0.courierId != nil && !($0.courierId ?? "").isEmpty }
        courierPlatformFees = Double(courierDeliveries.count) * 3.75

        // Total platform earnings = service fees + courier fees
        netPlatformEarnings = totalCommission + courierPlatformFees

        totalRestaurants = restaurants.count
        totalUsers = users.count

        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        let todayDelivered = delivered.filter { ($0.createdAt ?? .distantPast) >= today }
        todayOrders = orders.filter { ($0.createdAt ?? .distantPast) >= today }.count
        todayRevenue = todayDelivered.reduce(0) { $0 + $1.total }

        customerCount = users.filter { $0.role == .customer }.count
        ownerCount = users.filter { $0.role == .owner }.count
        courierCount = users.filter { $0.role == .courier }.count
        supervisorCount = users.filter { $0.role == .supervisor }.count
    }

    // MARK: - Update Order Status
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
            calculateStats()
        } catch {
            Logger.log("Dev update order error: \(error)", level: .error)
        }
    }

    // MARK: - Verify Restaurant
    func verifyRestaurant(restaurantId: String, verified: Bool, token: String?) async {
        guard let token else { return }
        do {
            try await firestoreService.updateDocument(
                collection: "restaurants", id: restaurantId,
                fields: ["isVerified": verified],
                idToken: token
            )
            if let idx = restaurants.firstIndex(where: { $0.id == restaurantId }) {
                restaurants[idx].isVerified = verified
            }
        } catch {
            Logger.log("Dev verify restaurant error: \(error)", level: .error)
        }
    }

    // MARK: - Update Commission Rate
    func updateCommissionRate(restaurantId: String, rate: Double, token: String?) async {
        guard let token else { return }
        do {
            try await firestoreService.updateDocument(
                collection: "restaurants", id: restaurantId,
                fields: ["commissionRate": rate],
                idToken: token
            )
            if let idx = restaurants.firstIndex(where: { $0.id == restaurantId }) {
                restaurants[idx].commissionRate = rate
            }
        } catch {
            Logger.log("Dev update commission error: \(error)", level: .error)
        }
    }

    // MARK: - Update User Role
    func updateUserRole(userId: String, newRole: UserRole, token: String?) async {
        guard let token else { return }
        do {
            try await firestoreService.updateDocument(
                collection: "users", id: userId,
                fields: ["role": newRole.rawValue],
                idToken: token
            )
            if let idx = users.firstIndex(where: { $0.uid == userId }) {
                users[idx].role = newRole
            }
            calculateStats()
        } catch {
            Logger.log("Dev update user role error: \(error)", level: .error)
        }
    }

    // MARK: - Delete User
    func deleteUser(userId: String, token: String?) async {
        guard let token else { return }
        do {
            try await firestoreService.deleteDocument(
                collection: "users", id: userId, idToken: token
            )
            users.removeAll { $0.uid == userId }
            calculateStats()
        } catch {
            Logger.log("Dev delete user error: \(error)", level: .error)
        }
    }

    // MARK: - Delete Restaurant
    func deleteRestaurant(restaurantId: String, token: String?) async {
        guard let token else { return }
        do {
            try await firestoreService.deleteDocument(
                collection: "restaurants", id: restaurantId, idToken: token
            )
            restaurants.removeAll { $0.id == restaurantId }
            calculateStats()
        } catch {
            Logger.log("Dev delete restaurant error: \(error)", level: .error)
        }
    }

    // MARK: - Helpers
    var deliveredOrders: [Order] { orders.filter { $0.status == .delivered } }
    var pendingOrders: [Order] { orders.filter { $0.status == .pending } }
    var cancelledOrders: [Order] { orders.filter { $0.status == .cancelled } }
    var verifiedRestaurants: [Restaurant] { restaurants.filter { $0.isVerified } }
    var unverifiedRestaurants: [Restaurant] { restaurants.filter { !$0.isVerified } }
}
