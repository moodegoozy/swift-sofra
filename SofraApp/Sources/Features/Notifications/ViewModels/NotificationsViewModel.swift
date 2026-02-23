// NotificationsViewModel.swift
// Loads user notifications from Firestore

import Foundation

struct AppNotification: Identifiable {
    let id: String
    let userId: String
    let title: String
    let body: String
    let type: String?
    let read: Bool
    let createdAt: Date?

    init(from doc: FirestoreDocumentResponse) {
        self.id = doc.documentId ?? UUID().uuidString
        self.userId = doc.stringField("userId") ?? ""
        self.title = doc.stringField("title") ?? ""
        self.body = doc.stringField("body") ?? ""
        self.type = doc.stringField("type")
        self.read = doc.boolField("read") ?? false
        self.createdAt = doc.dateField("createdAt")
    }
}

import Observation

@Observable
final class NotificationsViewModel {
    var notifications: [AppNotification] = []
    var isLoading = false
    var errorMessage: String?

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
                limit: 50,
                idToken: token
            )
            self.notifications = docs.map { AppNotification(from: $0) }
                .sorted { ($0.createdAt ?? .distantPast) > ($1.createdAt ?? .distantPast) }
        } catch {
            Logger.log("Notifications load error: \(error)", level: .error)
            // If query fails (index missing), try simple list and filter locally
            do {
                let allDocs = try await firestoreService.listDocuments(
                    collection: "notifications",
                    idToken: token,
                    pageSize: 200
                )
                self.notifications = allDocs.map { AppNotification(from: $0) }
                    .filter { $0.userId == userId }
                    .sorted { ($0.createdAt ?? .distantPast) > ($1.createdAt ?? .distantPast) }
                self.errorMessage = nil
            } catch {
                Logger.log("Notifications fallback error: \(error)", level: .error)
                errorMessage = "تعذر تحميل الإشعارات"
            }
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
            // Update local state
            if let idx = notifications.firstIndex(where: { $0.id == notifId }) {
                notifications.remove(at: idx)
                // Reload to get fresh data
            }
        } catch {
            Logger.log("Mark read error: \(error)", level: .error)
        }
    }
}
