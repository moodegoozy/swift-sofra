// NotificationsViewModel.swift
// Loads user notifications from Firestore

import Foundation

struct AppNotification: Identifiable {
    let id: String
    let title: String
    let body: String
    let type: String?
    let read: Bool
    let createdAt: Date?

    init(from doc: FirestoreDocument) {
        self.id = doc.id
        self.title = doc.stringField("title") ?? ""
        self.body = doc.stringField("body") ?? ""
        self.type = doc.stringField("type")
        self.read = doc.boolField("read") ?? false
        self.createdAt = doc.dateField("createdAt")
    }
}

@MainActor
final class NotificationsViewModel: ObservableObject {
    @Published var notifications: [AppNotification] = []
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let firestoreService = FirestoreService()

    var unreadCount: Int {
        notifications.filter { !$0.read }.count
    }

    func loadNotifications(userId: String, token: String?) async {
        guard let token else { return }

        isLoading = true
        errorMessage = nil

        do {
            let docs = try await firestoreService.query(
                collection: "notifications",
                filters: [QueryFilter(field: "userId", op: "EQUAL", value: userId)],
                orderBy: "createdAt",
                descending: true,
                limit: 50,
                idToken: token
            )
            self.notifications = docs.map { AppNotification(from: $0) }
        } catch {
            Logger.log("Notifications load error: \(error)", level: .error)
            errorMessage = "تعذر تحميل الإشعارات"
        }

        isLoading = false
    }

    func markAsRead(notifId: String, token: String?) async {
        guard let token else { return }
        do {
            try await firestoreService.updateDocument(
                collection: "notifications", id: notifId,
                fields: ["read": true],
                idToken: token
            )
            if let idx = notifications.firstIndex(where: { $0.id == notifId }) {
                // Create a new notification with read = true
                let old = notifications[idx]
                notifications[idx] = AppNotification(from: FirestoreDocument(
                    id: old.id,
                    fields: [:],
                    createTime: nil,
                    updateTime: nil
                ))
            }
        } catch {
            Logger.log("Mark read error: \(error)", level: .error)
        }
    }
}
