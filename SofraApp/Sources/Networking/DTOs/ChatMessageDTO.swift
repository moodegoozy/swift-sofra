// ChatMessageDTO.swift
// Chat message model for order-based temporary chats
// Collection path: chats/{orderId}/messages/{messageId}

import Foundation

struct ChatMessage: Identifiable {
    let id: String
    let orderId: String
    let senderId: String
    let senderName: String
    let senderRole: String  // "customer" | "owner"
    let text: String
    let createdAt: Date?

    // MARK: - Init from Firestore
    init(from doc: FirestoreDocumentResponse, orderId: String) {
        let f = doc.fields ?? [:]
        self.id = doc.documentId ?? UUID().uuidString
        self.orderId = orderId
        self.senderId = f["senderId"]?.stringVal ?? ""
        self.senderName = f["senderName"]?.stringVal ?? "مستخدم"
        self.senderRole = f["senderRole"]?.stringVal ?? "customer"
        self.text = f["text"]?.stringVal ?? ""
        self.createdAt = f["createdAt"]?.dateVal
    }

    // MARK: - Manual init (for optimistic display)
    init(id: String, orderId: String, senderId: String, senderName: String, senderRole: String, text: String, createdAt: Date?) {
        self.id = id
        self.orderId = orderId
        self.senderId = senderId
        self.senderName = senderName
        self.senderRole = senderRole
        self.text = text
        self.createdAt = createdAt
    }

    /// Convert to Firestore fields for creating a message document
    func toFirestoreFields() -> [String: Any] {
        var fields: [String: Any] = [
            "senderId": senderId,
            "senderName": senderName,
            "senderRole": senderRole,
            "text": text,
            "orderId": orderId
        ]
        if let createdAt {
            fields["createdAt"] = createdAt
        }
        return fields
    }
}
