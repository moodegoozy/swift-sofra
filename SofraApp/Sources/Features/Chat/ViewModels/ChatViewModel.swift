// ChatViewModel.swift
// Manages order-based chat: send messages + poll for new ones
// Messages stored in Firestore: chats/{orderId}/messages/{messageId}

import Foundation
import Observation

@Observable
final class ChatViewModel {
    var messages: [ChatMessage] = []
    var isLoading = false
    var errorMessage: String?
    var isSending = false

    private let firestoreService = FirestoreService()
    private let notificationService = NotificationService.shared
    private var pollingTask: Task<Void, Never>?
    private var orderId: String = ""
    private var currentUserId: String = ""
    
    /// IDs of messages that are still being sent (not yet confirmed in Firestore)
    private var pendingMessageIds: Set<String> = []

    // MARK: - Load Messages
    func loadMessages(orderId: String, token: String?, currentUserId: String? = nil) async {
        guard let token else { return }
        self.orderId = orderId
        if let currentUserId { self.currentUserId = currentUserId }

        isLoading = messages.isEmpty
        errorMessage = nil

        let previousCount = messages.count
        let previousIds = Set(messages.map { $0.id })
        
        // Keep optimistic (pending) messages before loading from server
        let pendingMessages = messages.filter { pendingMessageIds.contains($0.id) }

        do {
            // Query without orderBy to avoid composite index requirement
            // Sort client-side instead
            let docs = try await firestoreService.query(
                collection: "chatMessages",
                filters: [QueryFilter(field: "orderId", op: "EQUAL", value: orderId)],
                idToken: token
            )
            var serverMessages = docs.map { ChatMessage(from: $0, orderId: orderId) }
            
            // Remove confirmed messages from pending set
            let serverIds = Set(serverMessages.map { $0.id })
            pendingMessageIds = pendingMessageIds.subtracting(serverIds)
            
            // Add remaining pending messages (not yet on server)
            for pendingMsg in pendingMessages where !serverIds.contains(pendingMsg.id) {
                serverMessages.append(pendingMsg)
            }
            
            self.messages = serverMessages.sorted { ($0.createdAt ?? .distantPast) < ($1.createdAt ?? .distantPast) }

            // Notify for new messages from others (only during polling, not initial load)
            if previousCount > 0 {
                let newMessages = self.messages.filter { !previousIds.contains($0.id) && $0.senderId != self.currentUserId && !pendingMessageIds.contains($0.id) }
                for msg in newMessages {
                    notificationService.notifyNewMessage(
                        senderName: msg.senderName,
                        text: msg.text,
                        orderId: orderId
                    )
                }
            }
        } catch {
            Logger.log("Chat load error: \(error)", level: .error)
            errorMessage = "تعذر تحميل المحادثة"
        }

        isLoading = false
    }

    // MARK: - Send Message
    func sendMessage(
        text: String,
        orderId: String,
        senderId: String,
        senderName: String,
        senderRole: String,
        token: String?
    ) async {
        guard let token, !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }

        let trimmedText = text.trimmingCharacters(in: .whitespacesAndNewlines)
        let messageId = UUID().uuidString
        let now = Date()

        // Optimistic insert
        let newMessage = ChatMessage(
            id: messageId,
            orderId: orderId,
            senderId: senderId,
            senderName: senderName,
            senderRole: senderRole,
            text: trimmedText,
            createdAt: now
        )
        messages.append(newMessage)
        
        // Mark as pending so polling doesn't remove it
        pendingMessageIds.insert(messageId)

        isSending = true
        do {
            let fields = newMessage.toFirestoreFields()
            try await firestoreService.createDocument(
                collection: "chatMessages",
                id: messageId,
                fields: fields,
                idToken: token
            )
            // Message sent successfully - will be confirmed on next poll
            // Remove from pending after a short delay to ensure Firestore has it
            Task {
                try? await Task.sleep(for: .seconds(1))
                pendingMessageIds.remove(messageId)
            }
        } catch {
            Logger.log("Send message error: \(error)", level: .error)
            // Remove from pending
            pendingMessageIds.remove(messageId)
            // Remove optimistic message on failure
            messages.removeAll { $0.id == messageId }
            errorMessage = "تعذر إرسال الرسالة"
        }
        isSending = false
    }

    // MARK: - Start Polling (every 5 seconds)
    /// Token provider closure refreshes the token on each poll cycle
    func startPolling(orderId: String, tokenProvider: @escaping () async -> String?) {
        stopPolling()
        pollingTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(5))
                guard !Task.isCancelled else { break }
                let freshToken = await tokenProvider()
                await self?.loadMessages(orderId: orderId, token: freshToken)
            }
        }
    }

    /// Legacy convenience — static token (not recommended for long sessions)
    func startPolling(orderId: String, token: String?) {
        startPolling(orderId: orderId) { token }
    }

    // MARK: - Stop Polling
    func stopPolling() {
        pollingTask?.cancel()
        pollingTask = nil
    }
}
