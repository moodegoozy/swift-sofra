// NotificationsView.swift
// Notifications screen matching web /notifications

import SwiftUI

struct NotificationsView: View {
    @Environment(AppState.self) var appState
    @State private var vm = NotificationsViewModel()
    @State private var replyingTo: AppNotification?
    @State private var replyText = ""
    @State private var isSendingReply = false
    @State private var showReplySuccess = false

    private let firestoreService = FirestoreService()

    var body: some View {
        Group {
            if vm.isLoading {
                ScrollView {
                    VStack(spacing: SofraSpacing.md) {
                        ForEach(0..<5, id: \.self) { _ in
                            SkeletonCard()
                        }
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                    .padding(.top, SofraSpacing.md)
                }
            } else if let err = vm.errorMessage {
                ErrorStateView(message: err) {
                    await loadData()
                }
            } else if vm.notifications.isEmpty {
                EmptyStateView(
                    icon: "bell.slash",
                    title: "لا توجد إشعارات",
                    message: "ستصلك إشعارات عند تحديث حالة طلبك"
                )
            } else {
                List(vm.notifications) { notif in
                    notificationRow(notif)
                        .listRowSeparator(.hidden)
                        .listRowBackground(Color.clear)
                        .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16))
                }
                .listStyle(.plain)
                .refreshable { await loadData() }
            }
        }
        .ramadanBackground()
        .navigationTitle("الإشعارات")
        .navigationBarTitleDisplayMode(.large)
        .task { await loadData() }
        .sheet(item: $replyingTo) { notif in
            replySheet(notif)
        }
        .alert("تم إرسال الرد ✅", isPresented: $showReplySuccess) {
            Button("حسناً") {}
        }
    }

    private func notificationRow(_ notif: AppNotification) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: SofraSpacing.md) {
                // Unread indicator
                if !notif.read {
                    Circle()
                        .fill(SofraColors.primary)
                        .frame(width: 8, height: 8)
                }

                VStack(alignment: .trailing, spacing: SofraSpacing.xs) {
                    // Time
                    if let date = notif.createdAt {
                        Text(date.relativeArabic)
                            .font(SofraTypography.caption2)
                            .foregroundStyle(SofraColors.textMuted)
                    }

                    Text(notif.body)
                        .font(SofraTypography.callout)
                        .foregroundStyle(SofraColors.textSecondary)
                        .lineLimit(2)

                    Text(notif.title)
                        .font(SofraTypography.headline)
                        .foregroundStyle(SofraColors.textPrimary)

                    // Reply button for dev messages
                    if notif.type == "dev_message" && notif.canReply && !notif.hasReplied {
                        Button {
                            replyingTo = notif
                        } label: {
                            HStack(spacing: SofraSpacing.xxs) {
                                Text("رد")
                                    .font(SofraTypography.calloutSemibold)
                                Image(systemName: "arrowshape.turn.up.left.fill")
                                    .font(.caption)
                            }
                            .padding(.horizontal, SofraSpacing.md)
                            .padding(.vertical, SofraSpacing.xs)
                            .background(SofraColors.primary)
                            .foregroundStyle(.white)
                            .clipShape(Capsule())
                        }
                    } else if notif.type == "dev_message" && notif.hasReplied {
                        Text("تم الرد ✓")
                            .font(SofraTypography.caption)
                            .foregroundStyle(SofraColors.success)
                    }
                }

                Spacer()

                // Icon
                Image(systemName: notifIcon(notif.type))
                    .font(.title2)
                    .foregroundStyle(notif.read ? SofraColors.sky300 : SofraColors.primary)
                    .frame(width: 36, height: 36)
            }
            .padding(SofraSpacing.cardPadding)
            .background(notif.read ? SofraColors.cardBackground : SofraColors.surfaceElevated)
            .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
            .shadow(color: .black.opacity(0.03), radius: 4, y: 2)
        }
    }

    // MARK: - Reply Sheet
    private func replySheet(_ notif: AppNotification) -> some View {
        NavigationStack {
            VStack(spacing: SofraSpacing.lg) {
                // Original message
                SofraCard {
                    VStack(alignment: .trailing, spacing: SofraSpacing.xs) {
                        Text(notif.title)
                            .font(SofraTypography.headline)
                        Text(notif.body)
                            .font(SofraTypography.body)
                            .foregroundStyle(SofraColors.textSecondary)
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                // Reply field
                VStack(alignment: .trailing, spacing: SofraSpacing.xs) {
                    Text("ردك (رسالة واحدة فقط)")
                        .font(SofraTypography.calloutSemibold)
                        .foregroundStyle(SofraColors.textPrimary)

                    TextEditor(text: $replyText)
                        .frame(minHeight: 100)
                        .font(SofraTypography.body)
                        .foregroundStyle(SofraColors.textPrimary)
                        .scrollContentBackground(.hidden)
                        .padding(SofraSpacing.sm)
                        .background(SofraColors.surfaceElevated.opacity(0.6))
                        .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.inputRadius, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: SofraSpacing.inputRadius, style: .continuous)
                                .strokeBorder(SofraColors.gold500.opacity(0.15), lineWidth: 0.8)
                        )
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                SofraButton(
                    title: "إرسال الرد",
                    icon: "paperplane.fill",
                    isLoading: isSendingReply,
                    isDisabled: replyText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                ) {
                    Task { await sendReply(notif) }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                Spacer()
            }
            .padding(.top, SofraSpacing.md)
            .ramadanBackground()
            .navigationTitle("الرد على رسالة المطور")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("إلغاء") { replyingTo = nil; replyText = "" }
                }
            }
        }
    }

    private func sendReply(_ notif: AppNotification) async {
        guard let user = appState.currentUser else { return }
        guard let devMsgId = notif.devMessageId, !devMsgId.isEmpty else { return }
        let text = replyText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }

        isSendingReply = true
        do {
            let token = try await appState.validToken()

            // 1. Create reply document
            let replyId = UUID().uuidString
            let fields: [String: Any] = [
                "devMessageId": devMsgId,
                "senderId": user.uid,
                "senderName": user.displayName,
                "senderRole": (appState.role ?? .customer).rawValue,
                "body": text,
                "createdAt": ISO8601DateFormatter().string(from: Date())
            ]
            try await firestoreService.createDocument(
                collection: "devMessageReplies", id: replyId,
                fields: fields, idToken: token
            )

            // 2. Mark notification as replied
            try await firestoreService.updateDocument(
                collection: "notifications", id: notif.id,
                fields: ["hasReplied": true],
                idToken: token
            )

            // 3. Increment reply count on devMessage
            let msgDoc = try await firestoreService.getDocument(
                collection: "devMessages", id: devMsgId, idToken: token
            )
            let currentCount = msgDoc.intField("replyCount") ?? 0
            try await firestoreService.updateDocument(
                collection: "devMessages", id: devMsgId,
                fields: ["replyCount": currentCount + 1],
                idToken: token
            )

            // 4. Create notification for the developer (senderId of devMessage)
            let devSenderId = msgDoc.stringField("senderId") ?? ""
            if !devSenderId.isEmpty {
                let devNotifId = UUID().uuidString
                let devNotifFields: [String: Any] = [
                    "userId": devSenderId,
                    "title": "💬 رد من \(user.displayName)",
                    "body": text,
                    "type": "dev_reply",
                    "devMessageId": devMsgId,
                    "read": false,
                    "createdAt": ISO8601DateFormatter().string(from: Date())
                ]
                try await firestoreService.createDocument(
                    collection: "notifications", id: devNotifId,
                    fields: devNotifFields, idToken: token
                )
            }

            replyText = ""
            replyingTo = nil
            showReplySuccess = true
            // Reload notifications
            await loadData()
        } catch {
            Logger.log("Send reply error: \(error)", level: .error)
        }
        isSendingReply = false
    }

    private func notifIcon(_ type: String?) -> String {
        switch type {
        case "order":       return "bag.fill"
        case "delivery":    return "car.fill"
        case "promo":       return "tag.fill"
        case "support":     return "headphones"
        case "wallet":      return "creditcard.fill"
        case "dev_message": return "megaphone.fill"
        case "dev_reply":   return "arrowshape.turn.up.left.fill"
        default:            return "bell.fill"
        }
    }

    private func loadData() async {
        guard let uid = appState.currentUser?.uid else { return }
        await vm.loadNotifications(userId: uid, token: try? await appState.validToken())
    }
}

#Preview {
    NavigationStack {
        NotificationsView()
            .environment(AppState())
    }
}
