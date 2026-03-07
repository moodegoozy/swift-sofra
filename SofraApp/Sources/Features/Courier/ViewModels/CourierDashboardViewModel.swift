// CourierDashboardViewModel.swift
// Manages courier dashboard: employment application flow + delivery after approval

import Foundation
import Observation
import CoreLocation

@Observable
final class CourierDashboardViewModel {
    // MARK: - Employment State
    var courierStatus: CourierEmploymentStatus = .notApplied
    var assignedRestaurantId: String?
    var assignedRestaurantName: String?
    var hiringRestaurants: [Restaurant] = []
    var allRestaurants: [Restaurant] = []      // All restaurants (for browsing)
    var myApplication: CourierApplication?

    // MARK: - Dashboard State (after approval)
    var isAvailable = false
    var restaurantOrders: [Order] = []         // All ready orders (not just assigned restaurant)
    var activeOrders: [Order] = []             // Orders the courier picked up
    var deliveredOrders: [Order] = []
    var totalDeliveries = 0
    var rating: Double = 0
    var totalEarnings: Double = 0
    var todayEarnings: Double = 0
    var isLoading = false
    var errorMessage: String?
    var successMessage: String?
    
    // MARK: - Location & Filter
    var courierLocation: CLLocationCoordinate2D?
    var maxDistanceKm: Double = 25.0            // Default 25km filter
    var showOnlyNearby: Bool = false            // Filter toggle

    private let firestoreService = FirestoreService()
    private var courierId: String = ""

    static let platformFee: Double = 3.75

    enum CourierEmploymentStatus: String {
        case notApplied     // No application yet
        case pending        // Applied, waiting for restaurant approval
        case approved       // Approved — can see orders
        case rejected       // Rejected — can apply to another
    }

    // MARK: - Load Dashboard
    func loadDashboard(courierId: String, token: String?) async {
        guard let token else { return }
        self.courierId = courierId
        isLoading = true
        errorMessage = nil

        do {
            // 1. Load courier profile to check employment status
            let profileDoc = try await firestoreService.getDocument(
                collection: "users", id: courierId, idToken: token
            )
            self.isAvailable = profileDoc.boolField("isAvailable") ?? false
            self.totalDeliveries = profileDoc.intField("totalDeliveries") ?? 0
            self.rating = profileDoc.doubleField("rating") ?? 0
            self.assignedRestaurantId = profileDoc.stringField("assignedRestaurantId")
            self.assignedRestaurantName = profileDoc.stringField("assignedRestaurantName")
            let statusRaw = profileDoc.stringField("courierStatus") ?? ""

            // 2. Determine employment status
            if statusRaw == "approved", let restId = assignedRestaurantId, !restId.isEmpty {
                courierStatus = .approved
                // Load ALL ready orders (not just assigned restaurant) + my deliveries
                await loadAllReadyOrders(token: token)
                await loadMyDeliveries(token: token)
            } else {
                // Check if there's a pending application (single filter to avoid composite index)
                let apps = try await firestoreService.query(
                    collection: "courierApplications",
                    filters: [
                        QueryFilter(field: "courierId", op: "EQUAL", value: courierId)
                    ],
                    limit: 10,
                    idToken: token
                )
                
                // Filter locally for pending
                let pendingApp = apps.first { doc in
                    doc.stringField("status") == "pending"
                }
                
                if let appDoc = pendingApp {
                    myApplication = CourierApplication(from: appDoc)
                    courierStatus = .pending
                } else {
                    // Check for rejected locally
                    let hasRejected = apps.contains { doc in
                        doc.stringField("status") == "rejected"
                    }
                    if hasRejected {
                        courierStatus = .rejected
                    } else {
                        courierStatus = .notApplied
                    }
                }

                // Load all restaurants (for browsing) + hiring restaurants
                await loadAllRestaurants(token: token)
                await loadHiringRestaurants(token: token)
            }
        } catch {
            Logger.log("Courier dashboard error: \(error)", level: .error)
            errorMessage = "تعذر تحميل البيانات"
        }

        isLoading = false
    }
    
    // MARK: - Load All Restaurants
    func loadAllRestaurants(token: String) async {
        do {
            // تحميل جميع المطاعم بدون فلتر
            let docs = try await firestoreService.listDocuments(
                collection: "restaurants",
                idToken: token,
                pageSize: 100
            )
            allRestaurants = docs.map { Restaurant(from: $0) }
                .sorted { a, b in
                    // ترتيب: المطاعم التي توظف أولاً
                    if a.isHiring != b.isHiring { return a.isHiring && !b.isHiring }
                    return a.name < b.name
                }
        } catch {
            Logger.log("Load all restaurants error: \(error)", level: .error)
            errorMessage = "تعذر تحميل المطاعم"
        }
    }
    
    // MARK: - Filter Restaurants by Distance
    var nearbyRestaurants: [Restaurant] {
        guard showOnlyNearby, let courierLoc = courierLocation else {
            return allRestaurants
        }
        return allRestaurants.filter { restaurant in
            guard let lat = restaurant.latitude, let lng = restaurant.longitude else { return true }
            let distance = calculateDistance(from: courierLoc, to: CLLocationCoordinate2D(latitude: lat, longitude: lng))
            return distance <= maxDistanceKm
        }
    }
    
    var nearbyHiringRestaurants: [Restaurant] {
        guard showOnlyNearby, let courierLoc = courierLocation else {
            return hiringRestaurants
        }
        return hiringRestaurants.filter { restaurant in
            guard let lat = restaurant.latitude, let lng = restaurant.longitude else { return true }
            let distance = calculateDistance(from: courierLoc, to: CLLocationCoordinate2D(latitude: lat, longitude: lng))
            return distance <= maxDistanceKm
        }
    }
    
    // Calculate distance in kilometers
    private func calculateDistance(from: CLLocationCoordinate2D, to: CLLocationCoordinate2D) -> Double {
        let fromLoc = CLLocation(latitude: from.latitude, longitude: from.longitude)
        let toLoc = CLLocation(latitude: to.latitude, longitude: to.longitude)
        return fromLoc.distance(from: toLoc) / 1000.0  // Convert to km
    }

    // MARK: - Load Hiring Restaurants
    func loadHiringRestaurants(token: String) async {
        do {
            let docs = try await firestoreService.query(
                collection: "restaurants",
                filters: [QueryFilter(field: "isHiring", op: "EQUAL", value: true)],
                idToken: token
            )
            hiringRestaurants = docs.map { Restaurant(from: $0) }
        } catch {
            Logger.log("Load hiring restaurants error: \(error)", level: .error)
        }
    }

    // MARK: - Apply to Restaurant
    func applyToRestaurant(
        restaurant: Restaurant,
        courierName: String,
        courierPhone: String,
        vehicleType: String,
        token: String?
    ) async {
        guard let token else { return }
        isLoading = true
        errorMessage = nil

        do {
            let docId = UUID().uuidString
            let fields: [String: Any] = [
                "courierId": courierId,
                "courierName": courierName,
                "courierPhone": courierPhone,
                "vehicleType": vehicleType,
                "restaurantId": restaurant.id,
                "restaurantName": restaurant.name,
                "ownerId": restaurant.ownerId,
                "status": "pending",
                "createdAt": Date()
            ]
            try await firestoreService.createDocument(
                collection: "courierApplications", id: docId,
                fields: fields, idToken: token
            )
            
            // Send notification to restaurant owner
            await sendApplicationNotification(
                to: restaurant.ownerId,
                courierName: courierName,
                restaurantName: restaurant.name,
                vehicleType: vehicleType,
                token: token
            )

            myApplication = CourierApplication(
                id: docId,
                courierId: courierId,
                courierName: courierName,
                courierPhone: courierPhone,
                vehicleType: vehicleType,
                restaurantId: restaurant.id,
                restaurantName: restaurant.name,
                status: .pending,
                createdAt: Date()
            )
            courierStatus = .pending
            successMessage = "تم إرسال طلب التوظيف بنجاح"
        } catch {
            Logger.log("Apply to restaurant error: \(error)", level: .error)
            errorMessage = "فشل إرسال الطلب"
        }
        isLoading = false
    }

    // MARK: - Load All Ready Orders (for approved courier)
    func loadAllReadyOrders(token: String) async {
        do {
            // Load all orders with status "ready" - no restaurant filter
            let readyDocs = try await firestoreService.query(
                collection: "orders",
                filters: [
                    QueryFilter(field: "status", op: "EQUAL", value: "ready")
                ],
                idToken: token
            )
            restaurantOrders = readyDocs.map { Order(from: $0) }
                .filter { $0.courierId == nil || $0.courierId?.isEmpty == true }
                .sorted { ($0.createdAt ?? .distantPast) > ($1.createdAt ?? .distantPast) }
        } catch {
            Logger.log("Load all ready orders error: \(error)", level: .error)
        }
    }
    
    // MARK: - Load Restaurant Orders (legacy - for specific restaurant)
    func loadRestaurantOrders(restaurantId: String, token: String) async {
        do {
            let readyDocs = try await firestoreService.query(
                collection: "orders",
                filters: [
                    QueryFilter(field: "restaurantId", op: "EQUAL", value: restaurantId),
                    QueryFilter(field: "status", op: "EQUAL", value: "ready")
                ],
                idToken: token
            )
            restaurantOrders = readyDocs.map { Order(from: $0) }
                .filter { $0.courierId == nil || $0.courierId?.isEmpty == true }
                .sorted { ($0.createdAt ?? .distantPast) > ($1.createdAt ?? .distantPast) }
        } catch {
            Logger.log("Load restaurant orders error: \(error)", level: .error)
        }
    }

    // MARK: - Load My Deliveries
    func loadMyDeliveries(token: String) async {
        do {
            let activeDocs = try await firestoreService.query(
                collection: "orders",
                filters: [
                    QueryFilter(field: "courierId", op: "EQUAL", value: courierId),
                    QueryFilter(field: "status", op: "EQUAL", value: "out_for_delivery")
                ],
                idToken: token
            )
            activeOrders = activeDocs.map { Order(from: $0) }

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
            deliveredOrders = deliveredDocs.map { Order(from: $0) }

            totalEarnings = deliveredOrders.reduce(0) { $0 + $1.deliveryFee }
                - (Double(deliveredOrders.count) * Self.platformFee)

            let calendar = Calendar.current
            let today = calendar.startOfDay(for: Date())
            todayEarnings = deliveredOrders
                .filter { ($0.createdAt ?? .distantPast) >= today }
                .reduce(0) { $0 + ($1.deliveryFee - Self.platformFee) }
        } catch {
            Logger.log("Load my deliveries error: \(error)", level: .error)
        }
    }

    // MARK: - Toggle Availability
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

    // MARK: - Accept Delivery
    func acceptDelivery(orderId: String, token: String?) async {
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

            var movedOrder: Order?
            if let idx = restaurantOrders.firstIndex(where: { $0.id == orderId }) {
                var order = restaurantOrders.remove(at: idx)
                order.status = .outForDelivery
                order.courierId = courierId
                activeOrders.insert(order, at: 0)
                movedOrder = order
            }

            // إشعار العميل بأن الطلب في الطريق
            if let cid = movedOrder?.customerId, !cid.isEmpty {
                let notifId = UUID().uuidString
                let notifFields: [String: Any] = [
                    "userId": cid,
                    "title": "🚛 طلبك في الطريق!",
                    "body": "المندوب في طريقه إليك",
                    "type": "order_status",
                    "read": false,
                    "orderId": orderId,
                    "createdAt": ISO8601DateFormatter().string(from: Date())
                ]
                try? await firestoreService.createDocument(
                    collection: "notifications", id: notifId,
                    fields: notifFields, idToken: token
                )
            }
        } catch {
            Logger.log("Accept delivery error: \(error)", level: .error)
        }
    }

    // MARK: - Mark Delivered
    func markDelivered(orderId: String, token: String?) async {
        guard let token else { return }
        do {
            try await firestoreService.updateDocument(
                collection: "orders", id: orderId,
                fields: ["status": "delivered"],
                idToken: token
            )

            var deliveredOrder: Order?
            if let idx = activeOrders.firstIndex(where: { $0.id == orderId }) {
                var order = activeOrders.remove(at: idx)
                order.status = .delivered
                deliveredOrders.insert(order, at: 0)
                totalDeliveries += 1
                deliveredOrder = order
            }

            // إشعار العميل بإتمام التوصيل
            if let cid = deliveredOrder?.customerId, !cid.isEmpty {
                let notifId = UUID().uuidString
                let notifFields: [String: Any] = [
                    "userId": cid,
                    "title": "✅ تم التوصيل!",
                    "body": "تم توصيل طلبك بنجاح. بالعافية!",
                    "type": "order_status",
                    "read": false,
                    "orderId": orderId,
                    "createdAt": ISO8601DateFormatter().string(from: Date())
                ]
                try? await firestoreService.createDocument(
                    collection: "notifications", id: notifId,
                    fields: notifFields, idToken: token
                )
            }

            // إشعار صاحب المطعم بإتمام التوصيل
            if let rid = deliveredOrder?.restaurantId, !rid.isEmpty {
                let notifId2 = UUID().uuidString
                let notifFields2: [String: Any] = [
                    "userId": rid,
                    "title": "✅ تم توصيل الطلب",
                    "body": "الطلب #\(orderId.prefix(8)) تم توصيله للعميل",
                    "type": "order_delivered",
                    "read": false,
                    "orderId": orderId,
                    "createdAt": Date()
                ]
                try? await firestoreService.createDocument(
                    collection: "notifications", id: notifId2,
                    fields: notifFields2, idToken: token
                )
            }
        } catch {
            Logger.log("Mark delivered error: \(error)", level: .error)
        }
    }
    
    // MARK: - Send Application Notification
    private func sendApplicationNotification(to ownerId: String, courierName: String, restaurantName: String, vehicleType: String, token: String) async {
        let notificationId = UUID().uuidString
        do {
            try await firestoreService.createDocument(
                collection: "notifications",
                id: notificationId,
                fields: [
                    "userId": ownerId,
                    "title": "طلب توظيف جديد!",
                    "body": "\(courierName) يريد العمل كمندوب في \(restaurantName). نوع المركبة: \(vehicleType)",
                    "type": "courier_application",
                    "read": false,
                    "createdAt": Date(),
                    "senderId": courierId,
                    "senderName": courierName
                ],
                idToken: token
            )
        } catch {
            Logger.log("Failed to send application notification: \(error)", level: .error)
        }
    }
}
