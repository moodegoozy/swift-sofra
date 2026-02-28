// SupervisorDashboardViewModel.swift
// Manages supervisor dashboard: all orders, restaurants, users

import Foundation
import Observation

@Observable
final class SupervisorDashboardViewModel {
    var orders: [Order] = []
    var restaurants: [Restaurant] = []
    var users: [AppUser] = []
    var isLoading = false
    var errorMessage: String?

    // Stats
    var totalOrders = 0
    var activeOrders = 0
    var totalRevenue: Double = 0
    var totalCommission: Double = 0
    var totalRestaurants = 0
    var totalUsers = 0
    var todayOrders = 0

    private let firestoreService = FirestoreService()

    // MARK: - Load All Data
    func loadDashboard(token: String?) async {
        guard let token else { return }

        isLoading = true
        errorMessage = nil

        do {
            async let ordersTask: () = loadOrders(token: token)
            async let restaurantsTask: () = loadRestaurants(token: token)
            async let usersTask: () = loadUsers(token: token)

            await ordersTask
            await restaurantsTask
            await usersTask

            calculateStats()
        }

        isLoading = false
    }

    // MARK: - Load Orders
    func loadOrders(token: String) async {
        do {
            let docs = try await firestoreService.query(
                collection: "orders",
                orderBy: "createdAt",
                descending: true,
                limit: 200,
                idToken: token
            )
            self.orders = docs.map { Order(from: $0) }
        } catch {
            Logger.log("Supervisor orders load error: \(error)", level: .error)
            errorMessage = "تعذر تحميل الطلبات"
        }
    }

    // MARK: - Load Restaurants
    func loadRestaurants(token: String) async {
        do {
            let docs = try await firestoreService.listDocuments(
                collection: "restaurants", idToken: token, pageSize: 200
            )
            self.restaurants = docs.map { Restaurant(from: $0) }
        } catch {
            Logger.log("Supervisor restaurants load error: \(error)", level: .error)
        }
    }

    // MARK: - Load Users
    func loadUsers(token: String) async {
        do {
            let docs = try await firestoreService.listDocuments(
                collection: "users", idToken: token, pageSize: 200
            )
            self.users = docs.map { AppUser(from: $0) }
        } catch {
            Logger.log("Supervisor users load error: \(error)", level: .error)
        }
    }

    // MARK: - Calculate Stats
    private func calculateStats() {
        totalOrders = orders.count
        activeOrders = orders.filter { $0.status != .delivered && $0.status != .cancelled }.count
        totalRevenue = orders.filter { $0.status == .delivered }.reduce(0) { $0 + $1.total }
        totalCommission = orders.filter { $0.status == .delivered }.reduce(0) { $0 + $1.commissionAmount }
        totalRestaurants = restaurants.count
        totalUsers = users.count

        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        todayOrders = orders.filter { order in
            guard let created = order.createdAt else { return false }
            return created >= today
        }.count
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
            Logger.log("Supervisor update order error: \(error)", level: .error)
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
            Logger.log("Verify restaurant error: \(error)", level: .error)
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
        } catch {
            Logger.log("Update user role error: \(error)", level: .error)
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
            Logger.log("Update commission rate error: \(error)", level: .error)
        }
    }

    // MARK: - Filter helpers
    var deliveredOrders: [Order] {
        orders.filter { $0.status == .delivered }
    }

    var pendingOrders: [Order] {
        orders.filter { $0.status == .pending }
    }

    var verifiedRestaurants: [Restaurant] {
        restaurants.filter { $0.isVerified }
    }

    var unverifiedRestaurants: [Restaurant] {
        restaurants.filter { !$0.isVerified }
    }

    func users(byRole role: UserRole) -> [AppUser] {
        users.filter { $0.role == role }
    }
    
    // MARK: - My Restaurants (registered by this supervisor)
    func myRestaurants(supervisorId: String) -> [Restaurant] {
        restaurants.filter { $0.supervisorId == supervisorId }
    }
    
    // MARK: - Orders for My Restaurants
    func ordersForMyRestaurants(supervisorId: String) -> [Order] {
        let myRestIds = Set(myRestaurants(supervisorId: supervisorId).map { $0.id })
        return orders.filter { myRestIds.contains($0.restaurantId ?? "") }
    }
    
    // MARK: - Register Restaurant Owner (by Supervisor)
    private let authService = FirebaseAuthService()
    
    func registerRestaurantOwner(
        email: String,
        password: String,
        restaurantName: String,
        phone: String,
        city: String,
        supervisorId: String,
        supervisorToken: String
    ) async throws -> (userId: String, restaurantId: String) {
        // 1. Create user account in Firebase Auth
        let authResponse = try await authService.signUp(email: email, password: password)
        let newUserId = authResponse.localId
        let newUserToken = authResponse.idToken
        
        // 2. Create user document in Firestore (using new user's token)
        let userFields: [String: Any] = [
            "uid": newUserId,
            "email": email,
            "name": restaurantName,
            "phone": phone,
            "city": city,
            "role": "owner",
            "createdAt": ISO8601DateFormatter().string(from: Date()),
            "registeredBySupervisor": supervisorId
        ]
        try await firestoreService.createDocument(
            collection: "users",
            id: newUserId,
            fields: userFields,
            idToken: newUserToken
        )
        
        // 3. Create restaurant document with supervisorId
        let restaurantFields: [String: Any] = [
            "name": restaurantName,
            "ownerId": newUserId,
            "email": email,
            "phone": phone,
            "city": city,
            "isOpen": true,
            "allowDelivery": true,
            "allowPickup": false,
            "packageType": "free",
            "isVerified": true, // Auto-verify since added by supervisor
            "sellerTier": "bronze",
            "commissionRate": 0,
            "isHiring": false,
            "menuItemCount": 0,
            "supervisorId": supervisorId,
            "createdAt": ISO8601DateFormatter().string(from: Date())
        ]
        try await firestoreService.createDocument(
            collection: "restaurants",
            id: newUserId,
            fields: restaurantFields,
            idToken: newUserToken
        )
        
        // 4. Reload data using supervisor's token
        await loadRestaurants(token: supervisorToken)
        await loadUsers(token: supervisorToken)
        
        return (newUserId, newUserId)
    }
}
