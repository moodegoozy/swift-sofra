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
    
    // Supervisor Revenue Stats
    var mySupervisorFeeTotal: Double = 0       // إجمالي حصة المشرف
    var mySupervisorFeeToday: Double = 0       // حصة المشرف اليوم
    var mySupervisorFeeThisMonth: Double = 0   // حصة المشرف هذا الشهر
    var myDeliveredOrdersCount: Int = 0        // عدد الطلبات المكتملة
    var myTodayOrdersCount: Int = 0            // عدد طلبات اليوم
    var myTotalItemsCount: Int = 0             // إجمالي المنتجات المباعة

    private let firestoreService = FirestoreService()
    
    // Current supervisor ID for filtering
    private(set) var currentSupervisorId: String?

    // MARK: - Load All Data (Filtered by Supervisor ID)
    func loadDashboard(token: String?, supervisorId: String) async {
        guard let token else { return }
        
        self.currentSupervisorId = supervisorId

        isLoading = true
        errorMessage = nil

        do {
            // Load restaurants first (needed for user filtering)
            await loadRestaurants(token: token, supervisorId: supervisorId)
            
            // Then load orders and users in parallel
            async let ordersTask: () = loadOrders(token: token, supervisorId: supervisorId)
            async let usersTask: () = loadUsers(token: token)
            
            await ordersTask
            await usersTask

            calculateStats(supervisorId: supervisorId)
        }

        isLoading = false
    }

    // MARK: - Load Orders (Only for my restaurants)
    func loadOrders(token: String, supervisorId: String) async {
        do {
            // Query orders directly by supervisorId field
            let docs = try await firestoreService.query(
                collection: "orders",
                filters: [QueryFilter(field: "supervisorId", op: "EQUAL", value: supervisorId)],
                orderBy: "createdAt",
                descending: true,
                limit: 500,
                idToken: token
            )
            self.orders = docs.map { Order(from: $0) }
        } catch {
            Logger.log("Supervisor orders load error: \(error)", level: .error)
            errorMessage = "تعذر تحميل الطلبات"
        }
    }

    // MARK: - Load Restaurants (Only assigned to this supervisor)
    func loadRestaurants(token: String, supervisorId: String) async {
        do {
            let docs = try await firestoreService.query(
                collection: "restaurants",
                filters: [QueryFilter(field: "supervisorId", op: "EQUAL", value: supervisorId)],
                idToken: token
            )
            self.restaurants = docs.map { Restaurant(from: $0) }
        } catch {
            Logger.log("Supervisor restaurants load error: \(error)", level: .error)
        }
    }

    // MARK: - Load Users (Only owners of my restaurants)
    func loadUsers(token: String) async {
        do {
            // Get owner IDs from my restaurants
            let ownerIds = Set(restaurants.compactMap { $0.ownerId })
            
            if ownerIds.isEmpty {
                self.users = []
                return
            }
            
            // Load all users and filter by owner IDs
            let docs = try await firestoreService.listDocuments(
                collection: "users", idToken: token, pageSize: 200
            )
            let allUsers = docs.map { AppUser(from: $0) }
            
            // Filter to only show owners of my restaurants
            self.users = allUsers.filter { ownerIds.contains($0.uid) }
        } catch {
            Logger.log("Supervisor users load error: \(error)", level: .error)
        }
    }

    // MARK: - Calculate Stats
    private func calculateStats(supervisorId: String) {
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
        
        // Calculate supervisor-specific revenue automatically
        calculateMyRevenue()
    }
    
    // MARK: - Calculate Supervisor Revenue (all orders are already filtered)
    func calculateMyRevenue() {
        let deliveredOrders = orders.filter { $0.status == .delivered }
        
        // حساب إجمالي حصة المشرف من الطلبات المكتملة
        mySupervisorFeeTotal = deliveredOrders.reduce(0.0) { $0 + $1.supervisorFee }
        myDeliveredOrdersCount = deliveredOrders.count
        
        // حساب إجمالي المنتجات المباعة
        myTotalItemsCount = deliveredOrders.reduce(0) { total, order in
            total + order.items.reduce(0) { $0 + $1.qty }
        }
        
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        let startOfMonth = calendar.date(from: calendar.dateComponents([.year, .month], from: Date())) ?? Date()
        
        // طلبات اليوم
        let todayDelivered = deliveredOrders.filter { order in
            guard let created = order.createdAt else { return false }
            return created >= today
        }
        mySupervisorFeeToday = todayDelivered.reduce(0.0) { $0 + $1.supervisorFee }
        myTodayOrdersCount = orders.filter { order in
            guard let created = order.createdAt else { return false }
            return created >= today
        }.count
        
        // طلبات هذا الشهر
        let monthDelivered = deliveredOrders.filter { order in
            guard let created = order.createdAt else { return false }
            return created >= startOfMonth
        }
        mySupervisorFeeThisMonth = monthDelivered.reduce(0.0) { $0 + $1.supervisorFee }
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
            if let supervisorId = currentSupervisorId {
                calculateStats(supervisorId: supervisorId)
            }
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
    
    // MARK: - Orders for My Restaurants (using supervisorId directly from order)
    func ordersForMyRestaurants(supervisorId: String) -> [Order] {
        // الأفضل: استخدام supervisorId المحفوظ في الطلب مباشرة
        // إذا لم يكن موجوداً (طلبات قديمة)، نرجع للطريقة القديمة
        let directOrders = orders.filter { $0.supervisorId == supervisorId }
        if !directOrders.isEmpty {
            return directOrders
        }
        // Fallback للطلبات القديمة التي لا تحتوي على supervisorId
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
