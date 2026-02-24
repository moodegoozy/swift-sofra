// DevMessagingView.swift
// نظام رسائل المطور — إرسال رسائل جماعية أو فردية للمطاعم والمناديب والعملاء

import SwiftUI

struct DevMessagingView: View {
    @Environment(AppState.self) var appState
    @Environment(\.dismiss) var dismiss

    // Message compose
    @State private var messageTitle = ""
    @State private var messageBody = ""
    @State private var targetAudience: TargetAudience = .allRestaurants
    @State private var selectedUserId: String?
    @State private var selectedUserName: String?
    @State private var isSending = false
    @State private var showSuccess = false
    @State private var errorMessage: String?

    // Sent messages
    @State private var sentMessages: [DevMessage] = []
    @State private var isLoadingMessages = false
    @State private var selectedMessage: DevMessage?

    // Users for individual selection
    @State private var users: [AppUser] = []
    @State private var searchText = ""
    @State private var showUserPicker = false

    private let firestoreService = FirestoreService()

    enum TargetAudience: String, CaseIterable {
        case allRestaurants = "owner"
        case allCouriers = "courier"
        case allCustomers = "customer"
        case individual = "individual"

        var label: String {
            switch self {
            case .allRestaurants: return "كل المطاعم"
            case .allCouriers: return "كل المناديب"
            case .allCustomers: return "كل العملاء"
            case .individual: return "مستخدم محدد"
            }
        }

        var icon: String {
            switch self {
            case .allRestaurants: return "storefront.fill"
            case .allCouriers: return "car.fill"
            case .allCustomers: return "person.fill"
            case .individual: return "person.crop.circle"
            }
        }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: SofraSpacing.lg) {
                    // MARK: - Compose Section
                    composeSection

                    Divider().padding(.horizontal, SofraSpacing.screenHorizontal)

                    // MARK: - Sent Messages
                    sentMessagesSection
                }
                .padding(.top, SofraSpacing.md)
            }
            .ramadanBackground()
            .navigationTitle("الرسائل")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("إغلاق") { dismiss() }
                }
            }
            .task { await loadSentMessages() }
            .sheet(isPresented: $showUserPicker) {
                userPickerSheet
            }
            .sheet(item: $selectedMessage) { msg in
                DevMessageDetailView(message: msg)
            }
            .alert("تم الإرسال بنجاح ✅", isPresented: $showSuccess) {
                Button("حسناً") {}
            }
        }
    }

    // MARK: - Compose Section
    private var composeSection: some View {
        VStack(spacing: SofraSpacing.md) {
            HStack {
                Spacer()
                HStack(spacing: SofraSpacing.xs) {
                    Text("رسالة جديدة")
                        .font(SofraTypography.title3)
                    Image(systemName: "envelope.fill")
                        .foregroundStyle(SofraColors.gold400)
                }
            }
            .padding(.horizontal, SofraSpacing.screenHorizontal)

            // Target audience
            VStack(alignment: .trailing, spacing: SofraSpacing.xs) {
                Text("المستلمين")
                    .font(SofraTypography.calloutSemibold)
                    .foregroundStyle(SofraColors.textPrimary)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: SofraSpacing.sm) {
                        ForEach(TargetAudience.allCases, id: \.self) { audience in
                            Button {
                                targetAudience = audience
                                if audience == .individual {
                                    showUserPicker = true
                                } else {
                                    selectedUserId = nil
                                    selectedUserName = nil
                                }
                            } label: {
                                HStack(spacing: SofraSpacing.xxs) {
                                    Text(audience.label)
                                        .font(SofraTypography.calloutSemibold)
                                    Image(systemName: audience.icon)
                                        .font(.caption)
                                }
                                .padding(.horizontal, SofraSpacing.md)
                                .padding(.vertical, SofraSpacing.sm)
                                .background(targetAudience == audience ? SofraColors.primary : SofraColors.surfaceElevated)
                                .foregroundStyle(targetAudience == audience ? .white : SofraColors.textSecondary)
                                .clipShape(Capsule())
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, SofraSpacing.screenHorizontal)

            // Show selected user if individual
            if targetAudience == .individual, let name = selectedUserName {
                HStack {
                    Button {
                        showUserPicker = true
                    } label: {
                        Text("تغيير")
                            .font(SofraTypography.caption)
                            .foregroundStyle(SofraColors.primary)
                    }
                    Spacer()
                    HStack(spacing: SofraSpacing.xs) {
                        Text(name)
                            .font(SofraTypography.calloutSemibold)
                            .foregroundStyle(SofraColors.textPrimary)
                        Image(systemName: "person.crop.circle.fill")
                            .foregroundStyle(SofraColors.gold400)
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)
            }

            // Title
            SofraTextField(
                label: "عنوان الرسالة",
                text: $messageTitle,
                icon: "text.bubble",
                placeholder: "مثال: تحديث مهم"
            )
            .padding(.horizontal, SofraSpacing.screenHorizontal)

            // Body
            VStack(alignment: .trailing, spacing: SofraSpacing.xs) {
                Text("نص الرسالة")
                    .font(SofraTypography.calloutSemibold)
                    .foregroundStyle(SofraColors.textPrimary)

                TextEditor(text: $messageBody)
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

            // Error
            if let error = errorMessage {
                Text(error)
                    .font(SofraTypography.callout)
                    .foregroundStyle(SofraColors.error)
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
            }

            // Send Button
            SofraButton(
                title: "إرسال الرسالة",
                icon: "paperplane.fill",
                isLoading: isSending,
                isDisabled: !canSend
            ) {
                Task { await sendMessage() }
            }
            .padding(.horizontal, SofraSpacing.screenHorizontal)
        }
    }

    private var canSend: Bool {
        !messageTitle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !messageBody.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        (targetAudience != .individual || selectedUserId != nil)
    }

    // MARK: - Sent Messages Section
    private var sentMessagesSection: some View {
        VStack(spacing: SofraSpacing.md) {
            HStack {
                Spacer()
                HStack(spacing: SofraSpacing.xs) {
                    Text("الرسائل المرسلة")
                        .font(SofraTypography.title3)
                    Image(systemName: "tray.full.fill")
                        .foregroundStyle(SofraColors.gold400)
                }
            }
            .padding(.horizontal, SofraSpacing.screenHorizontal)

            if isLoadingMessages {
                ForEach(0..<3, id: \.self) { _ in SkeletonCard() }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
            } else if sentMessages.isEmpty {
                EmptyStateView(
                    icon: "envelope.open",
                    title: "لا توجد رسائل",
                    message: "لم ترسل أي رسائل بعد"
                )
            } else {
                ForEach(sentMessages) { msg in
                    Button {
                        selectedMessage = msg
                    } label: {
                        sentMessageCard(msg)
                    }
                    .buttonStyle(.plain)
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                }
            }

            Spacer(minLength: SofraSpacing.xxxl)
        }
    }

    private func sentMessageCard(_ msg: DevMessage) -> some View {
        SofraCard {
            HStack {
                if msg.replyCount > 0 {
                    HStack(spacing: 2) {
                        Text("\(msg.replyCount)")
                            .font(SofraTypography.caption2)
                        Image(systemName: "arrowshape.turn.up.left.fill")
                            .font(.caption2)
                    }
                    .foregroundStyle(SofraColors.info)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: SofraSpacing.xxs) {
                    Text(msg.title)
                        .font(SofraTypography.headline)
                        .foregroundStyle(SofraColors.textPrimary)
                    Text(msg.body)
                        .font(SofraTypography.caption)
                        .foregroundStyle(SofraColors.textSecondary)
                        .lineLimit(2)
                }
            }
            HStack {
                if let date = msg.createdAt {
                    Text(date.relativeArabic)
                        .font(SofraTypography.caption2)
                        .foregroundStyle(SofraColors.textMuted)
                }
                Spacer()
                HStack(spacing: SofraSpacing.xxs) {
                    Text(msg.audienceLabel)
                        .font(SofraTypography.caption)
                    Image(systemName: msg.audienceIcon)
                        .font(.caption2)
                }
                .foregroundStyle(SofraColors.primary)
            }
        }
    }

    // MARK: - User Picker
    private var userPickerSheet: some View {
        NavigationStack {
            List {
                ForEach(filteredUsers) { user in
                    Button {
                        selectedUserId = user.uid
                        selectedUserName = user.displayName
                        showUserPicker = false
                    } label: {
                        HStack {
                            Spacer()
                            VStack(alignment: .trailing, spacing: 2) {
                                Text(user.displayName)
                                    .font(SofraTypography.headline)
                                    .foregroundStyle(SofraColors.textPrimary)
                                HStack(spacing: SofraSpacing.xs) {
                                    StatusBadge(text: roleLabel(user.role), color: roleColor(user.role))
                                    Text(user.email)
                                        .font(SofraTypography.caption)
                                        .foregroundStyle(SofraColors.textMuted)
                                }
                            }
                            Image(systemName: "person.crop.circle")
                                .foregroundStyle(SofraColors.gold400)
                                .font(.title2)
                        }
                    }
                }
            }
            .searchable(text: $searchText, prompt: "ابحث بالاسم أو البريد")
            .navigationTitle("اختر مستخدم")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("إلغاء") { showUserPicker = false }
                }
            }
            .task { await loadUsers() }
        }
    }

    private var filteredUsers: [AppUser] {
        if searchText.isEmpty { return users }
        let q = searchText.lowercased()
        return users.filter {
            ($0.name ?? "").lowercased().contains(q) ||
            $0.email.lowercased().contains(q) ||
            ($0.phone ?? "").contains(q)
        }
    }

    // MARK: - Actions

    private func sendMessage() async {
        guard canSend else { return }
        guard let devId = appState.currentUser?.uid else { return }

        isSending = true
        errorMessage = nil

        do {
            let token = try await appState.validToken()

            if targetAudience == .individual, let userId = selectedUserId {
                // Send to one user → create notification + devMessages doc
                let msgId = UUID().uuidString
                let fields: [String: Any] = [
                    "senderId": devId,
                    "title": messageTitle.trimmingCharacters(in: .whitespacesAndNewlines),
                    "body": messageBody.trimmingCharacters(in: .whitespacesAndNewlines),
                    "targetRole": "individual",
                    "targetUserId": userId,
                    "targetUserName": selectedUserName ?? "",
                    "replyCount": 0,
                    "createdAt": ISO8601DateFormatter().string(from: Date())
                ]
                try await firestoreService.createDocument(
                    collection: "devMessages", id: msgId,
                    fields: fields, idToken: token
                )
                // Create notification for the user
                try await createNotification(
                    userId: userId, title: messageTitle,
                    body: messageBody, msgId: msgId, token: token
                )
            } else {
                // Bulk send — query users by role then create notifications
                let role = targetAudience.rawValue
                let msgId = UUID().uuidString
                let fields: [String: Any] = [
                    "senderId": devId,
                    "title": messageTitle.trimmingCharacters(in: .whitespacesAndNewlines),
                    "body": messageBody.trimmingCharacters(in: .whitespacesAndNewlines),
                    "targetRole": role,
                    "targetUserId": "",
                    "targetUserName": "",
                    "replyCount": 0,
                    "createdAt": ISO8601DateFormatter().string(from: Date())
                ]
                try await firestoreService.createDocument(
                    collection: "devMessages", id: msgId,
                    fields: fields, idToken: token
                )

                // Get all users with that role
                let userDocs = try await firestoreService.query(
                    collection: "users",
                    filters: [QueryFilter(field: "role", op: "EQUAL", value: role)],
                    limit: 500,
                    idToken: token
                )
                // Create notifications for each user
                for doc in userDocs {
                    let uid = doc.documentId ?? ""
                    if !uid.isEmpty {
                        try? await createNotification(
                            userId: uid, title: messageTitle,
                            body: messageBody, msgId: msgId, token: token
                        )
                    }
                }
            }

            // Reset form
            messageTitle = ""
            messageBody = ""
            showSuccess = true

            // Reload sent messages
            await loadSentMessages()
        } catch {
            errorMessage = "فشل إرسال الرسالة: \(error.localizedDescription)"
        }

        isSending = false
    }

    private func createNotification(userId: String, title: String, body: String, msgId: String, token: String) async throws {
        let notifId = UUID().uuidString
        let fields: [String: Any] = [
            "userId": userId,
            "title": "📢 \(title)",
            "body": body,
            "type": "dev_message",
            "devMessageId": msgId,
            "read": false,
            "canReply": true,
            "hasReplied": false,
            "createdAt": ISO8601DateFormatter().string(from: Date())
        ]
        try await firestoreService.createDocument(
            collection: "notifications", id: notifId,
            fields: fields, idToken: token
        )
    }

    private func loadSentMessages() async {
        guard let devId = appState.currentUser?.uid else { return }
        isLoadingMessages = true
        do {
            let token = try await appState.validToken()
            let docs = try await firestoreService.query(
                collection: "devMessages",
                filters: [QueryFilter(field: "senderId", op: "EQUAL", value: devId)],
                orderBy: "createdAt",
                descending: true,
                limit: 50,
                idToken: token
            )
            sentMessages = docs.map { DevMessage(from: $0) }
        } catch {
            Logger.log("Load dev messages error: \(error)", level: .error)
        }
        isLoadingMessages = false
    }

    private func loadUsers() async {
        guard users.isEmpty else { return }
        do {
            let token = try await appState.validToken()
            let docs = try await firestoreService.query(
                collection: "users",
                limit: 500,
                idToken: token
            )
            users = docs.map { AppUser(from: $0) }
        } catch {
            Logger.log("Load users for messaging error: \(error)", level: .error)
        }
    }

    // MARK: - Helpers
    private func roleLabel(_ role: UserRole) -> String {
        switch role {
        case .owner: return "مطعم"
        case .courier: return "مندوب"
        case .customer: return "عميل"
        case .admin, .developer: return "مطور"
        case .supervisor: return "مشرف"
        default: return role.rawValue
        }
    }

    private func roleColor(_ role: UserRole) -> Color {
        switch role {
        case .owner: return SofraColors.success
        case .courier: return SofraColors.warning
        case .customer: return SofraColors.info
        case .developer, .admin: return SofraColors.error
        default: return SofraColors.textMuted
        }
    }
}

// MARK: - DevMessage Model
struct DevMessage: Identifiable {
    let id: String
    let senderId: String
    let title: String
    let body: String
    let targetRole: String
    let targetUserId: String
    let targetUserName: String
    var replyCount: Int
    let createdAt: Date?
    var replies: [DevMessageReply] = []

    var audienceLabel: String {
        switch targetRole {
        case "owner": return "كل المطاعم"
        case "courier": return "كل المناديب"
        case "customer": return "كل العملاء"
        case "individual": return targetUserName.isEmpty ? "مستخدم" : targetUserName
        default: return targetRole
        }
    }

    var audienceIcon: String {
        switch targetRole {
        case "owner": return "storefront.fill"
        case "courier": return "car.fill"
        case "customer": return "person.fill"
        case "individual": return "person.crop.circle"
        default: return "person.3.fill"
        }
    }

    init(from doc: FirestoreDocumentResponse) {
        self.id = doc.documentId ?? UUID().uuidString
        self.senderId = doc.stringField("senderId") ?? ""
        self.title = doc.stringField("title") ?? ""
        self.body = doc.stringField("body") ?? ""
        self.targetRole = doc.stringField("targetRole") ?? ""
        self.targetUserId = doc.stringField("targetUserId") ?? ""
        self.targetUserName = doc.stringField("targetUserName") ?? ""
        self.replyCount = doc.intField("replyCount") ?? 0
        self.createdAt = doc.dateField("createdAt")
    }
}

struct DevMessageReply: Identifiable {
    let id: String
    let senderId: String
    let senderName: String
    let senderRole: String
    let body: String
    let createdAt: Date?

    init(from doc: FirestoreDocumentResponse) {
        self.id = doc.documentId ?? UUID().uuidString
        self.senderId = doc.stringField("senderId") ?? ""
        self.senderName = doc.stringField("senderName") ?? ""
        self.senderRole = doc.stringField("senderRole") ?? ""
        self.body = doc.stringField("body") ?? ""
        self.createdAt = doc.dateField("createdAt")
    }
}

// MARK: - DevMessage Detail with Replies
struct DevMessageDetailView: View {
    @Environment(AppState.self) var appState
    @Environment(\.dismiss) var dismiss
    let message: DevMessage

    @State private var replies: [DevMessageReply] = []
    @State private var isLoading = false

    private let firestoreService = FirestoreService()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: SofraSpacing.lg) {
                    // Original message
                    SofraCard {
                        VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
                            HStack(spacing: SofraSpacing.xs) {
                                Text(message.audienceLabel)
                                    .font(SofraTypography.caption)
                                    .foregroundStyle(SofraColors.primary)
                                Image(systemName: message.audienceIcon)
                                    .foregroundStyle(SofraColors.primary)
                                    .font(.caption)
                                Spacer()
                                Text(message.title)
                                    .font(SofraTypography.headline)
                            }
                            Text(message.body)
                                .font(SofraTypography.body)
                                .foregroundStyle(SofraColors.textSecondary)
                                .frame(maxWidth: .infinity, alignment: .trailing)

                            if let date = message.createdAt {
                                Text(date.relativeArabic)
                                    .font(SofraTypography.caption2)
                                    .foregroundStyle(SofraColors.textMuted)
                            }
                        }
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)

                    // Replies
                    HStack {
                        Spacer()
                        HStack(spacing: SofraSpacing.xs) {
                            Text("الردود (\(replies.count))")
                                .font(SofraTypography.headline)
                            Image(systemName: "arrowshape.turn.up.left.2.fill")
                                .foregroundStyle(SofraColors.gold400)
                        }
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)

                    if isLoading {
                        ProgressView()
                    } else if replies.isEmpty {
                        EmptyStateView(
                            icon: "text.bubble",
                            title: "لا توجد ردود",
                            message: "لم يرد أحد على هذه الرسالة بعد"
                        )
                    } else {
                        ForEach(replies) { reply in
                            SofraCard {
                                VStack(alignment: .trailing, spacing: SofraSpacing.xs) {
                                    HStack {
                                        if let date = reply.createdAt {
                                            Text(date.relativeArabic)
                                                .font(SofraTypography.caption2)
                                                .foregroundStyle(SofraColors.textMuted)
                                        }
                                        Spacer()
                                        HStack(spacing: SofraSpacing.xxs) {
                                            Text(reply.senderName)
                                                .font(SofraTypography.calloutSemibold)
                                            Image(systemName: "person.crop.circle.fill")
                                                .foregroundStyle(SofraColors.gold400)
                                        }
                                    }
                                    Text(reply.body)
                                        .font(SofraTypography.body)
                                        .foregroundStyle(SofraColors.textSecondary)
                                        .frame(maxWidth: .infinity, alignment: .trailing)
                                }
                            }
                            .padding(.horizontal, SofraSpacing.screenHorizontal)
                        }
                    }

                    Spacer(minLength: SofraSpacing.xxxl)
                }
                .padding(.top, SofraSpacing.md)
            }
            .ramadanBackground()
            .navigationTitle("تفاصيل الرسالة")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("إغلاق") { dismiss() }
                }
            }
            .task { await loadReplies() }
        }
    }

    private func loadReplies() async {
        isLoading = true
        do {
            let token = try await appState.validToken()
            let docs = try await firestoreService.query(
                collection: "devMessageReplies",
                filters: [QueryFilter(field: "devMessageId", op: "EQUAL", value: message.id)],
                orderBy: "createdAt",
                descending: false,
                limit: 100,
                idToken: token
            )
            replies = docs.map { DevMessageReply(from: $0) }
        } catch {
            Logger.log("Load replies error: \(error)", level: .error)
        }
        isLoading = false
    }
}
