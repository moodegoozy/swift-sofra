// OwnerDashboardViewModel.swift
// Manages owner dashboard data (restaurant info, orders, menu items, stats)

import Foundation
import Observation

@Observable
final class OwnerDashboardViewModel {
    var restaurant: Restaurant?
    var orders: [Order] = []
    var menuItems: [MenuItem] = []
    var hiringApplications: [CourierApplication] = []
    var isLoading = false
    var errorMessage: String?
    var isUploadingImage = false
    var showAddMenuItem = false

    // Stats
    var todayOrders = 0
    var totalRevenue: Double = 0
    var totalCommission: Double = 0
    var menuItemsCount = 0

    private let firestoreService = FirestoreService()
    private let storageService = StorageService.shared
    private let notificationService = NotificationService.shared

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
                .reduce(0) { $0 + $1.netAmount }

            totalCommission = orders
                .filter { $0.status == .delivered }
                .reduce(0) { $0 + $1.commissionAmount }

            menuItemsCount = menuItems.count

        } catch {
            Logger.log("Owner dashboard load error: \(error)", level: .error)
            errorMessage = "تعذر تحميل البيانات"
        }

        isLoading = false
    }

    func loadOrders(ownerId: String, token: String?) async {
        guard let token else { return }
        let previousOrderIds = Set(orders.map { $0.id })
        let isFirstLoad = orders.isEmpty

        do {
            // Query without orderBy to avoid composite index requirement
            // Sort client-side instead
            let docs = try await firestoreService.query(
                collection: "orders",
                filters: [QueryFilter(field: "restaurantId", op: "EQUAL", value: ownerId)],
                idToken: token
            )
            self.orders = docs.map { Order(from: $0) }
                .sorted { ($0.createdAt ?? .distantPast) > ($1.createdAt ?? .distantPast) }

            // Notify for new orders (not on first load)
            if !isFirstLoad {
                let newOrders = self.orders.filter { !previousOrderIds.contains($0.id) }
                for order in newOrders {
                    notificationService.notifyNewOrder(
                        orderId: order.id,
                        customerName: nil,
                        total: order.total
                    )
                }
            }
        } catch {
            Logger.log("Owner orders load error: \(error)", level: .error)
            errorMessage = "تعذر تحميل الطلبات"
        }
    }

    func loadMenu(ownerId: String, token: String) async {
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

    func updateRestaurantInfo(ownerId: String, name: String, phone: String, token: String?) async -> Bool {
        guard let token else { return false }
        do {
            try await firestoreService.updateDocument(
                collection: "restaurants", id: ownerId,
                fields: ["name": name, "phone": phone],
                idToken: token
            )
            restaurant?.name = name
            restaurant?.phone = phone
            return true
        } catch {
            Logger.log("Update restaurant info error: \(error)", level: .error)
            errorMessage = "تعذر حفظ بيانات المطعم"
            return false
        }
    }

    func updateOrderStatus(orderId: String, newStatus: OrderStatus, customerId: String? = nil, token: String?) async {
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

            // إنشاء إشعار Firestore للعميل عند تغيير حالة الطلب
            let cid = customerId ?? orders.first(where: { $0.id == orderId })?.customerId
            if let cid, !cid.isEmpty {
                let restName = restaurant?.name ?? "المطعم"
                let notifId = UUID().uuidString
                let notifFields: [String: Any] = [
                    "userId": cid,
                    "title": newStatus.notificationTitle,
                    "body": "\(restName) — الطلب #\(orderId.prefix(8)): \(newStatus.arabicLabel)",
                    "type": "order_status",
                    "read": false,
                    "orderId": orderId,
                    "createdAt": Date()
                ]
                try? await firestoreService.createDocument(
                    collection: "notifications",
                    id: notifId,
                    fields: notifFields,
                    idToken: token
                )
            }
        } catch {
            Logger.log("Update order status error: \(error)", level: .error)
        }
    }

    /// إلغاء الطلب من قبل المالك
    func cancelOrder(orderId: String, customerId: String?, token: String?) async {
        guard let token else { return }
        do {
            try await firestoreService.updateDocument(
                collection: "orders", id: orderId,
                fields: ["status": "cancelled"],
                idToken: token
            )
            if let idx = orders.firstIndex(where: { $0.id == orderId }) {
                orders[idx].status = .cancelled
            }

            // إشعار العميل
            let cid = customerId ?? orders.first(where: { $0.id == orderId })?.customerId
            if let cid, !cid.isEmpty {
                let restName = restaurant?.name ?? "المطعم"
                let notifId = UUID().uuidString
                let notifFields: [String: Any] = [
                    "userId": cid,
                    "title": "❌ تم إلغاء طلبك",
                    "body": "\(restName) ألغى الطلب #\(orderId.prefix(8))",
                    "type": "order_cancelled",
                    "read": false,
                    "orderId": orderId,
                    "createdAt": Date()
                ]
                try? await firestoreService.createDocument(
                    collection: "notifications", id: notifId,
                    fields: notifFields, idToken: token
                )
            }
        } catch {
            Logger.log("Owner cancel order error: \(error)", level: .error)
        }
    }
    
    /// إلغاء الطلب مع ذكر السبب - يُشعر العميل والمطور
    func cancelOrderWithReason(order: Order, reason: String, restaurantName: String, token: String?) async {
        guard let token else { return }
        do {
            // 1. تحديث حالة الطلب مع سبب الإلغاء
            try await firestoreService.updateDocument(
                collection: "orders", id: order.id,
                fields: [
                    "status": "cancelled",
                    "cancellationReason": reason,
                    "cancelledBy": "restaurant",
                    "cancelledAt": Date()
                ],
                idToken: token
            )
            
            if let idx = orders.firstIndex(where: { $0.id == order.id }) {
                orders[idx].status = .cancelled
            }
            
            // 2. إشعار العميل بالسبب
            let customerName = order.customerName ?? "عميل"
            let customerId = order.customerId
            if !customerId.isEmpty {
                let customerNotifId = UUID().uuidString
                let customerNotifFields: [String: Any] = [
                    "userId": customerId,
                    "title": "❌ تم إلغاء طلبك",
                    "body": "قام مطعم \(restaurantName) بإلغاء الطلب #\(order.id.prefix(8))\n\n📝 السبب: \(reason)",
                    "type": "order_cancelled_by_restaurant",
                    "read": false,
                    "orderId": order.id,
                    "cancellationReason": reason,
                    "createdAt": Date()
                ]
                try? await firestoreService.createDocument(
                    collection: "notifications", id: customerNotifId,
                    fields: customerNotifFields, idToken: token
                )
            }
            
            // 3. إشعار المطور/الإدارة
            let devNotifId = UUID().uuidString
            let devNotifFields: [String: Any] = [
                "userId": "developer",  // سيصل للمطور
                "title": "⚠️ إلغاء طلب من مطعم",
                "body": """
                🔴 تم إلغاء طلب من المطعم
                
                📋 الطلب: #\(order.id.prefix(8))
                💰 المبلغ: \(String(format: "%.2f", order.total)) ر.س
                
                👤 العميل: \(customerName)
                🆔 معرف العميل: \(customerId.prefix(12))...
                
                🏪 المطعم: \(restaurantName)
                
                📝 سبب الإلغاء:
                \(reason)
                """,
                "type": "restaurant_cancelled_order",
                "read": false,
                "orderId": order.id,
                "customerId": customerId,
                "customerName": customerName,
                "restaurantName": restaurantName,
                "cancellationReason": reason,
                "orderTotal": order.total,
                "createdAt": Date()
            ]
            try? await firestoreService.createDocument(
                collection: "notifications", id: devNotifId,
                fields: devNotifFields, idToken: token
            )
            
            Logger.log("Order \(order.id) cancelled by restaurant with reason: \(reason)", level: .info)
            
        } catch {
            Logger.log("Cancel order with reason error: \(error)", level: .error)
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

    // MARK: - Upload Restaurant Photo
    func uploadRestaurantPhoto(imageData: Data, ownerId: String, token: String?) async {
        guard let token else { return }
        isUploadingImage = true
        do {
            let path = "restaurants/\(ownerId)/logo_\(Int(Date().timeIntervalSince1970)).jpg"
            let downloadUrl = try await storageService.uploadImage(data: imageData, path: path, token: token)

            // Update restaurant doc with new logo URL
            try await firestoreService.updateDocument(
                collection: "restaurants", id: ownerId,
                fields: ["logoUrl": downloadUrl, "coverUrl": downloadUrl],
                idToken: token
            )

            restaurant?.logoUrl = downloadUrl
            restaurant?.coverUrl = downloadUrl
            Logger.log("Restaurant photo uploaded: \(downloadUrl)", level: .info)
        } catch {
            Logger.log("Upload restaurant photo error: \(error)", level: .error)
            errorMessage = "تعذر رفع الصورة"
        }
        isUploadingImage = false
    }

    // MARK: - Add Menu Item (Fast — instant local add, background upload)
    /// Returns the doc ID immediately so the view can dismiss fast.
    /// Image upload + Firestore write happen concurrently after local insert.
    @discardableResult
    func addMenuItem(
        name: String,
        description: String,
        price: Double,
        category: String,
        imageData: Data?,
        ownerId: String,
        token: String?
    ) async -> String? {
        guard let token else { return nil }
        let docId = UUID().uuidString

        // 1) Insert locally IMMEDIATELY — user sees result instantly
        let newItem = MenuItem(
            id: docId,
            name: name,
            desc: description.isEmpty ? nil : description,
            price: price,
            category: category.isEmpty ? nil : category,
            imageUrl: nil,
            available: true,
            ownerId: ownerId
        )
        menuItems.insert(newItem, at: 0)
        menuItemsCount = menuItems.count

        // 2) Build base fields (no image yet)
        var fields: [String: Any] = [
            "name": name,
            "price": price,
            "available": true,
            "ownerId": ownerId,
            "createdAt": ISO8601DateFormatter().string(from: Date())
        ]
        if !description.isEmpty { fields["desc"] = description }
        if !category.isEmpty { fields["category"] = category }

        // 3) Background: create Firestore doc + upload image concurrently
        Task.detached { [firestoreService, storageService, weak self] in
            do {
                // Create document (fast, no image yet)
                try await firestoreService.createDocument(
                    collection: "menuItems", id: docId,
                    fields: fields,
                    idToken: token
                )

                // Upload image if provided, then patch the doc
                if let imageData {
                    let path = "menuItems/\(ownerId)/\(docId).jpg"
                    let imageUrl = try await storageService.uploadImage(data: imageData, path: path, token: token)
                    try await firestoreService.updateDocument(
                        collection: "menuItems", id: docId,
                        fields: ["imageUrl": imageUrl],
                        idToken: token
                    )
                    // Update local item with image URL
                    await MainActor.run {
                        if let idx = self?.menuItems.firstIndex(where: { $0.id == docId }) {
                            self?.menuItems[idx].imageUrl = imageUrl
                        }
                    }
                }

                // Update menuItemCount on restaurant doc
                let count = await MainActor.run { self?.menuItemsCount ?? 0 }
                try? await firestoreService.updateDocument(
                    collection: "restaurants", id: ownerId,
                    fields: ["menuItemCount": count],
                    idToken: token
                )

                Logger.log("Menu item added: \(name)", level: .info)
            } catch {
                Logger.log("Add menu item error: \(error)", level: .error)
                await MainActor.run {
                    self?.errorMessage = "تعذر حفظ الصنف في الخادم"
                }
            }
        }

        return docId
    }

    // MARK: - Update Menu Item
    func updateMenuItem(
        itemId: String,
        name: String,
        description: String,
        price: Double,
        category: String,
        imageData: Data?,
        ownerId: String,
        token: String?
    ) async -> Bool {
        guard let token else { return false }

        // 1) Update local immediately
        if let idx = menuItems.firstIndex(where: { $0.id == itemId }) {
            menuItems[idx].name = name
            menuItems[idx].description = description.isEmpty ? nil : description
            menuItems[idx].price = price
            menuItems[idx].category = category.isEmpty ? nil : category
        }

        // 2) Build fields to update
        var fields: [String: Any] = [
            "name": name,
            "price": price,
        ]
        if !description.isEmpty { fields["desc"] = description }
        if !category.isEmpty { fields["category"] = category }

        // 3) Background: update Firestore + optional image upload
        do {
            try await firestoreService.updateDocument(
                collection: "menuItems", id: itemId,
                fields: fields,
                idToken: token
            )

            // Upload new image if provided
            if let imageData {
                Task.detached { [firestoreService, storageService, weak self] in
                    do {
                        let path = "menuItems/\(ownerId)/\(itemId).jpg"
                        let imageUrl = try await storageService.uploadImage(data: imageData, path: path, token: token)
                        try await firestoreService.updateDocument(
                            collection: "menuItems", id: itemId,
                            fields: ["imageUrl": imageUrl],
                            idToken: token
                        )
                        await MainActor.run {
                            if let idx = self?.menuItems.firstIndex(where: { $0.id == itemId }) {
                                self?.menuItems[idx].imageUrl = imageUrl
                            }
                        }
                    } catch {
                        Logger.log("Update menu item image error: \(error)", level: .error)
                    }
                }
            }

            Logger.log("Menu item updated: \(name)", level: .info)
            return true
        } catch {
            Logger.log("Update menu item error: \(error)", level: .error)
            errorMessage = "تعذر تعديل الصنف"
            return false
        }
    }

    // MARK: - Delete Menu Item
    func deleteMenuItem(itemId: String, ownerId: String, token: String?) async {
        guard let token else { return }
        do {
            try await firestoreService.deleteDocument(
                collection: "menuItems", id: itemId, idToken: token
            )
            menuItems.removeAll { $0.id == itemId }
            menuItemsCount = menuItems.count

            // Update menuItemCount on restaurant doc for visibility
            try? await firestoreService.updateDocument(
                collection: "restaurants", id: ownerId,
                fields: ["menuItemCount": menuItemsCount],
                idToken: token
            )
        } catch {
            Logger.log("Delete menu item error: \(error)", level: .error)
            errorMessage = "تعذر حذف الصنف"
        }
    }

    // MARK: - Hiring Applications
    func loadHiringApplications(ownerId: String, token: String?) async {
        guard let token else { return }
        do {
            let docs = try await firestoreService.query(
                collection: "courierApplications",
                filters: [QueryFilter(field: "restaurantId", op: "EQUAL", value: ownerId)],
                orderBy: "createdAt",
                descending: true,
                limit: 50,
                idToken: token
            )
            self.hiringApplications = docs.map { CourierApplication(from: $0) }
        } catch {
            Logger.log("Load hiring applications error: \(error)", level: .error)
        }
    }
}
