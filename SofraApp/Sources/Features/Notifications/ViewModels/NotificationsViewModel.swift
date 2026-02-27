// NotificationsViewModel.swift
// Loads user notifications from Firestore

import Foundation

struct AppNotification: Identifiable {
    let id: String
    let userId: String
    let title: String
    let body: String
    let type: String?
    var read: Bool
    let createdAt: Date?
    // Dev message reply fields
    let devMessageId: String?
    let canReply: Bool
    var hasReplied: Bool

    init(from doc: FirestoreDocumentResponse) {
        self.id = doc.documentId ?? UUID().uuidString
        self.userId = doc.stringField("userId") ?? ""
        self.title = doc.stringField("title") ?? ""
        self.body = doc.stringField("body") ?? ""
        self.type = doc.stringField("type")
        self.read = doc.boolField("read") ?? false
        self.createdAt = doc.dateField("createdAt")
        self.devMessageId = doc.stringField("devMessageId")
        self.canReply = doc.boolField("canReply") ?? false
        self.hasReplied = doc.boolField("hasReplied") ?? false
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
        } catch let error as APIError where error.isForbiddenOrNotFound {
            // Firestore rules don't allow querying notifications collection,
            // or collection doesn't exist yet — show empty state
            Logger.log("Notifications access restricted: \(error)", level: .info)
            self.notifications = []
        } catch {
            Logger.log("Notifications load error: \(error)", level: .error)
            // Try user-specific subcollection as fallback
            do {
                let docs = try await firestoreService.listDocuments(
                    collection: "users/\(userId)/notifications",
                    idToken: token,
                    pageSize: 50
                )
                self.notifications = docs.map { AppNotification(from: $0) }
                    .sorted { ($0.createdAt ?? .distantPast) > ($1.createdAt ?? .distantPast) }
            } catch {
                // If both fail, just show empty — not an error worth showing to the user
                Logger.log("Notifications fallback also failed: \(error)", level: .info)
                self.notifications = []
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
            // Update local state — mark as read instead of removing
            if let idx = notifications.firstIndex(where: { $0.id == notifId }) {
                notifications[idx].read = true
            }
        } catch {
            Logger.log("Mark read error: \(error)", level: .error)
        }
    }
}
