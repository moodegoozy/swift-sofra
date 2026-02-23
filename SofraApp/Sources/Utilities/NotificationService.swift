// NotificationService.swift
// Local push notifications with sound for orders, chat messages, and other events
// Shows banner notifications even when app is in foreground

import Foundation
import UserNotifications
import Observation

@Observable
final class NotificationService: NSObject, UNUserNotificationCenterDelegate {
    static let shared = NotificationService()

    var isAuthorized = false

    private override init() {
        super.init()
    }

    // MARK: - Request Permission
    func requestPermission() async {
        let center = UNUserNotificationCenter.current()
        center.delegate = self

        do {
            let granted = try await center.requestAuthorization(options: [.alert, .sound, .badge, .providesAppNotificationSettings])
            isAuthorized = granted
            Logger.log("Notification permission: \(granted)", level: .info)
        } catch {
            Logger.log("Notification permission error: \(error)", level: .error)
        }
    }

    // MARK: - Show notification even when app is in foreground
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        // Show banner + sound + badge even when app is open
        completionHandler([.banner, .sound, .badge, .list])
    }

    // MARK: - Handle notification tap
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        let userInfo = response.notification.request.content.userInfo
        Logger.log("Notification tapped: \(userInfo)", level: .debug)
        completionHandler()
    }

    // MARK: - Send Local Notifications

    /// New chat message notification
    func notifyNewMessage(senderName: String, text: String, orderId: String) {
        let content = UNMutableNotificationContent()
        content.title = "💬 رسالة جديدة"
        content.subtitle = senderName
        content.body = text
        content.sound = .default
        content.categoryIdentifier = "CHAT_MESSAGE"
        content.userInfo = ["type": "chat", "orderId": orderId]
        content.threadIdentifier = "chat-\(orderId)"

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 0.1, repeats: false)
        let request = UNNotificationRequest(
            identifier: "chat-\(orderId)-\(UUID().uuidString.prefix(8))",
            content: content,
            trigger: trigger
        )

        UNUserNotificationCenter.current().add(request) { error in
            if let error {
                Logger.log("Notification error: \(error)", level: .error)
            }
        }
    }

    /// Order status changed notification
    func notifyOrderStatusChange(orderId: String, status: String, restaurantName: String?) {
        let content = UNMutableNotificationContent()
        content.title = "🛵 تحديث الطلب"
        content.subtitle = restaurantName ?? "طلبك"
        content.body = statusMessage(status)
        content.sound = .default
        content.categoryIdentifier = "ORDER_STATUS"
        content.userInfo = ["type": "order", "orderId": orderId, "status": status]
        content.threadIdentifier = "order-\(orderId)"

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 0.1, repeats: false)
        let request = UNNotificationRequest(
            identifier: "order-\(orderId)-\(status)",
            content: content,
            trigger: trigger
        )

        UNUserNotificationCenter.current().add(request) { error in
            if let error {
                Logger.log("Notification error: \(error)", level: .error)
            }
        }
    }

    /// New order for restaurant owner
    func notifyNewOrder(orderId: String, customerName: String?, total: Double) {
        let content = UNMutableNotificationContent()
        content.title = "🔔 طلب جديد!"
        content.subtitle = customerName ?? "عميل"
        content.body = "طلب جديد بقيمة \(String(format: "%.2f", total)) ر.س"
        content.sound = UNNotificationSound.default
        content.categoryIdentifier = "NEW_ORDER"
        content.userInfo = ["type": "new_order", "orderId": orderId]
        content.threadIdentifier = "orders"
        content.interruptionLevel = .timeSensitive

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 0.1, repeats: false)
        let request = UNNotificationRequest(
            identifier: "new-order-\(orderId)",
            content: content,
            trigger: trigger
        )

        UNUserNotificationCenter.current().add(request) { error in
            if let error {
                Logger.log("Notification error: \(error)", level: .error)
            }
        }
    }

    /// Generic notification
    func notifyGeneric(title: String, body: String, type: String = "general") {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        content.categoryIdentifier = "GENERAL"
        content.userInfo = ["type": type]

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 0.1, repeats: false)
        let request = UNNotificationRequest(
            identifier: "general-\(UUID().uuidString.prefix(8))",
            content: content,
            trigger: trigger
        )

        UNUserNotificationCenter.current().add(request) { error in
            if let error {
                Logger.log("Notification error: \(error)", level: .error)
            }
        }
    }

    // MARK: - Status message helper
    private func statusMessage(_ status: String) -> String {
        switch status {
        case "accepted":       return "تم قبول طلبك ✅"
        case "preparing":      return "طلبك قيد التحضير 🍳"
        case "ready":          return "طلبك جاهز للاستلام 📦"
        case "out_for_delivery": return "طلبك في الطريق إليك 🚗"
        case "delivered":      return "تم توصيل طلبك بنجاح! 🎉"
        case "cancelled":      return "تم إلغاء الطلب ❌"
        default:               return "تم تحديث حالة طلبك"
        }
    }

    // MARK: - Register categories
    func registerCategories() {
        let chatCategory = UNNotificationCategory(
            identifier: "CHAT_MESSAGE",
            actions: [],
            intentIdentifiers: [],
            options: .customDismissAction
        )

        let orderCategory = UNNotificationCategory(
            identifier: "ORDER_STATUS",
            actions: [],
            intentIdentifiers: [],
            options: .customDismissAction
        )

        let newOrderCategory = UNNotificationCategory(
            identifier: "NEW_ORDER",
            actions: [],
            intentIdentifiers: [],
            options: .customDismissAction
        )

        let generalCategory = UNNotificationCategory(
            identifier: "GENERAL",
            actions: [],
            intentIdentifiers: [],
            options: .customDismissAction
        )

        UNUserNotificationCenter.current().setNotificationCategories([
            chatCategory, orderCategory, newOrderCategory, generalCategory
        ])
    }
}
