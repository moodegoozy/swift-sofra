// OrdersViewModel.swift
// Manages customer order list with real-time style polling

import Foundation
import Observation

@Observable
final class OrdersViewModel {
    var orders: [Order] = []
    var isLoading = false
    var errorMessage: String?

    private let firestoreService = FirestoreService()
    private let notificationService = NotificationService.shared

    /// Order groups for UI
    var activeOrders: [Order] {
        orders.filter { $0.status != .delivered && $0.status != .cancelled }
            .sorted { ($0.createdAt ?? .distantPast) > ($1.createdAt ?? .distantPast) }
    }

    var pastOrders: [Order] {
        orders.filter { $0.status == .delivered || $0.status == .cancelled }
            .sorted { ($0.createdAt ?? .distantPast) > ($1.createdAt ?? .distantPast) }
    }

    func loadOrders(userId: String, token: String?) async {
        guard let token else { return }

        let previousStatuses = Dictionary(uniqueKeysWithValues: orders.map { ($0.id, $0.status) })
        let isFirstLoad = orders.isEmpty

        isLoading = true
        errorMessage = nil

        do {
            // Query without orderBy to avoid composite index requirement
            // Sort client-side instead
            let docs = try await firestoreService.query(
                collection: "orders",
                filters: [QueryFilter(field: "customerId", op: "EQUAL", value: userId)],
                idToken: token
            )
            self.orders = docs.map { Order(from: $0) }
                .sorted { ($0.createdAt ?? .distantPast) > ($1.createdAt ?? .distantPast) }

            // Notify for status changes (not on first load)
            if !isFirstLoad {
                for order in self.orders {
                    if let prevStatus = previousStatuses[order.id], prevStatus != order.status {
                        notificationService.notifyOrderStatusChange(
                            orderId: order.id,
                            status: order.status.rawValue,
                            restaurantName: order.restaurantName
                        )
                    }
                }
            }
        } catch {
            Logger.log("Orders load error: \(error)", level: .error)
            errorMessage = "تعذر تحميل الطلبات"
        }

        isLoading = false
    }

    func cancelOrder(orderId: String, restaurantId: String?, customerName: String?, token: String?) async {
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

            // Determine restaurantId from parameter or fallback to order data
            let rid = restaurantId ?? orders.first(where: { $0.id == orderId })?.restaurantId

            // إشعار صاحب المطعم بإلغاء الطلب
            if let rid, !rid.isEmpty {
                let displayName = (customerName ?? "").isEmpty ? "العميل" : customerName!
                let notifId = UUID().uuidString
                let notifFields: [String: Any] = [
                    "userId": rid,
                    "title": "❌ تم إلغاء طلب",
                    "body": "\(displayName) ألغى الطلب #\(orderId.prefix(8))",
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
            Logger.log("Cancel order error: \(error)", level: .error)
        }
    }
}
