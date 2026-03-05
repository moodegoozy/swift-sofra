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
    var totalCommission: Double = 0       // إجمالي رسوم الخدمة (كلها)
    var totalSupervisorFees: Double = 0   // إجمالي حصة المشرفين
    var platformOnlyFees: Double = 0      // حصة المنصة فقط (بدون المشرفين)
    var netPlatformEarnings: Double = 0   // صافي أرباح المنصة = platformOnlyFees + courierFees
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
        
        // حساب حصة المشرفين وحصة المنصة فقط
        totalSupervisorFees = delivered.reduce(0) { $0 + $1.supervisorFee }
        platformOnlyFees = delivered.reduce(0) { $0 + $1.platformFee }

        // Courier platform fees (3.75 per delivered order with courier)
        let courierDeliveries = delivered.filter { $0.courierId != nil && !($0.courierId ?? "").isEmpty }
        courierPlatformFees = Double(courierDeliveries.count) * 3.75

        // Total platform earnings = platform fees only + courier fees (NOT including supervisor fees)
        netPlatformEarnings = platformOnlyFees + courierPlatformFees

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

    // MARK: - Assign Supervisor to Restaurant
    func assignSupervisor(restaurantId: String, supervisorId: String?, token: String?) async {
        guard let token else { return }
        do {
            if let supervisorId = supervisorId {
                try await firestoreService.updateDocument(
                    collection: "restaurants", id: restaurantId,
                    fields: ["supervisorId": supervisorId],
                    idToken: token
                )
            } else {
                // Remove supervisor - set to null
                try await firestoreService.updateDocument(
                    collection: "restaurants", id: restaurantId,
                    fields: ["supervisorId": NSNull()],
                    idToken: token
                )
            }
            if let idx = restaurants.firstIndex(where: { $0.id == restaurantId }) {
                restaurants[idx].supervisorId = supervisorId
            }
            Logger.log("Assigned supervisor \(supervisorId ?? "nil") to restaurant \(restaurantId)", level: .info)
        } catch {
            Logger.log("Dev assign supervisor error: \(error)", level: .error)
        }
    }

    // MARK: - Get Supervisors
    var supervisors: [AppUser] {
        users.filter { $0.role == .supervisor }
    }

    // MARK: - Create Supervisor Account
    func createSupervisor(email: String, password: String, name: String, phone: String, city: String = "الرياض") async throws {
        let authService = FirebaseAuthService()
        
        // 1. Create Firebase Auth account
        let authResponse = try await authService.signUp(email: email, password: password)
        
        // 2. Create user document with supervisor role
        let newSupervisor = AppUser(
            uid: authResponse.localId,
            email: email,
            name: name,
            phone: phone,
            city: city,
            role: .supervisor
        )
        
        // Use the new account's token to create its own document
        try await firestoreService.createUser(newSupervisor, idToken: authResponse.idToken)
        
        // 3. Add to local list
        users.append(newSupervisor)
        supervisorCount += 1
        totalUsers += 1
        
        Logger.log("Created supervisor account: \(email)", level: .info)
    }

    // MARK: - Helpers
    var deliveredOrders: [Order] { orders.filter { $0.status == .delivered } }
    var pendingOrders: [Order] { orders.filter { $0.status == .pending } }
    var cancelledOrders: [Order] { orders.filter { $0.status == .cancelled } }
    var verifiedRestaurants: [Restaurant] { restaurants.filter { $0.isVerified } }
    var unverifiedRestaurants: [Restaurant] { restaurants.filter { !$0.isVerified } }
    
    // MARK: - License Management
    
    /// Restaurants with active licenses (verified with expiry date)
    var activeLicenseRestaurants: [Restaurant] {
        restaurants.filter { $0.isVerified && $0.licenseExpiryDate != nil && !$0.isLicenseExpired }
    }
    
    /// Restaurants with expired licenses
    var expiredLicenseRestaurants: [Restaurant] {
        restaurants.filter { $0.isVerified && $0.isLicenseExpired }
    }
    
    /// Restaurants with licenses expiring within 30 days
    var expiringLicenseRestaurants: [Restaurant] {
        restaurants.filter { $0.isVerified && $0.isLicenseExpiringSoon }
    }
    
    /// Update restaurant license expiry date
    func updateLicenseExpiry(restaurantId: String, expiryDate: Date, token: String?) async {
        guard let token else { return }
        do {
            try await firestoreService.updateDocument(
                collection: "restaurants", id: restaurantId,
                fields: ["licenseExpiryDate": expiryDate],
                idToken: token
            )
            if let idx = restaurants.firstIndex(where: { $0.id == restaurantId }) {
                restaurants[idx].licenseExpiryDate = expiryDate
            }
            Logger.log("Updated license expiry for \(restaurantId) to \(expiryDate)", level: .info)
        } catch {
            Logger.log("Failed to update license expiry: \(error)", level: .error)
        }
    }
    
    /// Check and send notifications for expiring licenses
    func checkExpiringLicenses(token: String?) async {
        guard let token else { return }
        
        let expiring = expiringLicenseRestaurants
        Logger.log("Found \(expiring.count) restaurants with expiring licenses", level: .info)
        
        for restaurant in expiring {
            guard let days = restaurant.daysUntilLicenseExpiry else { continue }
            
            // Send notification at 30, 14, 7, 3, 1 days before expiry
            let notificationDays = [30, 14, 7, 3, 1]
            if notificationDays.contains(days) {
                await sendLicenseExpiryNotification(
                    to: restaurant.ownerId,
                    restaurantName: restaurant.name,
                    daysRemaining: days,
                    token: token
                )
            }
        }
    }
    
    /// Send license expiry notification
    private func sendLicenseExpiryNotification(to userId: String, restaurantName: String, daysRemaining: Int, token: String) async {
        let notificationId = UUID().uuidString
        
        let title = "⚠️ تنبيه: اقتراب انتهاء الترخيص"
        let body: String
        if daysRemaining == 1 {
            body = "ينتهي ترخيص \"\(restaurantName)\" غداً. يرجى تجديد الترخيص لتجنب إيقاف الحساب."
        } else if daysRemaining <= 7 {
            body = "ينتهي ترخيص \"\(restaurantName)\" خلال \(daysRemaining) أيام. يرجى تجديد الترخيص في أقرب وقت."
        } else {
            body = "ينتهي ترخيص \"\(restaurantName)\" خلال \(daysRemaining) يوماً. يرجى التخطيط لتجديد الترخيص."
        }
        
        do {
            try await firestoreService.createDocument(
                collection: "notifications",
                id: notificationId,
                fields: [
                    "userId": userId,
                    "title": title,
                    "body": body,
                    "type": "license_expiry",
                    "read": false,
                    "createdAt": Date(),
                    "senderId": "system",
                    "senderName": "إدارة سفرة البيت"
                ],
                idToken: token
            )
            Logger.log("Sent license expiry notification to \(userId): \(daysRemaining) days remaining", level: .info)
        } catch {
            Logger.log("Failed to send license expiry notification: \(error)", level: .error)
        }
    }
}
