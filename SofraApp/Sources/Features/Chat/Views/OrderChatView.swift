// OrderChatView.swift
// Temporary chat screen between customer and restaurant for a specific order
// Opens when an order is accepted (status >= accepted and not cancelled/delivered)

import SwiftUI

struct OrderChatView: View {
    let orderId: String
    let restaurantName: String
    let orderStatus: OrderStatus

    @Environment(AppState.self) var appState
    @Environment(\.dismiss) var dismiss
    @State private var vm = ChatViewModel()
    @State private var messageText = ""
    @FocusState private var isInputFocused: Bool

    private var currentUserId: String { appState.currentUser?.uid ?? "" }
    private var currentUserName: String { appState.currentUser?.displayName ?? "مستخدم" }
    private var currentUserRole: String { appState.role?.rawValue ?? "customer" }

    /// Chat is active only for accepted through ready statuses
    private var isChatActive: Bool {
        switch orderStatus {
        case .accepted, .preparing, .ready, .outForDelivery:
            return true
        default:
            return false
        }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Chat header info
                chatHeader

                Divider()

                // Messages
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(spacing: SofraSpacing.sm) {
                            // System message
                            systemBubble("محادثة مؤقتة للطلب #\(orderId.prefix(6)) — تنتهي عند اكتمال الطلب")

                            if vm.isLoading && vm.messages.isEmpty {
                                ProgressView()
                                    .padding(.top, SofraSpacing.xxxl)
                            } else {
                                ForEach(vm.messages) { message in
                                    chatBubble(message)
                                        .id(message.id)
                                }
                            }
                        }
                        .padding(.horizontal, SofraSpacing.screenHorizontal)
                        .padding(.vertical, SofraSpacing.md)
                    }
                    .onChange(of: vm.messages.count) { _, _ in
                        withAnimation {
                            if let lastId = vm.messages.last?.id {
                                proxy.scrollTo(lastId, anchor: .bottom)
                            }
                        }
                    }
                }

                // Input bar
                if isChatActive {
                    chatInputBar
                } else {
                    closedChatBar
                }
            }
            .ramadanBackground()
            .navigationTitle("محادثة الطلب")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("إغلاق") { dismiss() }
                }
            }
            .task {
                await vm.loadMessages(orderId: orderId, token: try? await appState.validToken(), currentUserId: currentUserId)
                vm.startPolling(orderId: orderId, token: try? await appState.validToken())
            }
            .onDisappear {
                vm.stopPolling()
            }
        }
    }

    // MARK: - Chat Header
    private var chatHeader: some View {
        HStack(spacing: SofraSpacing.sm) {
            VStack(alignment: .trailing, spacing: 2) {
                Text(restaurantName)
                    .font(SofraTypography.headline)
                    .foregroundStyle(SofraColors.textPrimary)
                HStack(spacing: SofraSpacing.xs) {
                    StatusBadge(text: orderStatus.arabicLabel, color: orderStatus.uiColor)
                    Text("طلب #\(orderId.prefix(6))")
                        .font(SofraTypography.caption2)
                        .foregroundStyle(SofraColors.textMuted)
                }
            }

            Spacer()

            ZStack {
                Circle()
                    .fill(SofraColors.primary.opacity(0.15))
                    .frame(width: 44, height: 44)
                Image(systemName: "bubble.left.and.bubble.right.fill")
                    .foregroundStyle(SofraColors.primary)
            }
        }
        .padding(.horizontal, SofraSpacing.screenHorizontal)
        .padding(.vertical, SofraSpacing.sm)
        .background(SofraColors.cardBackground)
    }

    // MARK: - System Bubble
    private func systemBubble(_ text: String) -> some View {
        Text(text)
            .font(SofraTypography.caption2)
            .foregroundStyle(SofraColors.textMuted)
            .multilineTextAlignment(.center)
            .padding(.horizontal, SofraSpacing.lg)
            .padding(.vertical, SofraSpacing.sm)
            .frame(maxWidth: .infinity)
    }

    // MARK: - Chat Bubble
    private func chatBubble(_ message: ChatMessage) -> some View {
        let isMe = message.senderId == currentUserId
        return HStack {
            if isMe { Spacer(minLength: 60) }

            VStack(alignment: isMe ? .trailing : .leading, spacing: 2) {
                if !isMe {
                    Text(message.senderName)
                        .font(SofraTypography.caption2)
                        .foregroundStyle(SofraColors.primary)
                }

                Text(message.text)
                    .font(SofraTypography.body)
                    .foregroundStyle(isMe ? .white : SofraColors.textPrimary)
                    .padding(.horizontal, SofraSpacing.md)
                    .padding(.vertical, SofraSpacing.sm)
                    .background(isMe ? SofraColors.primary : SofraColors.cardBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .shadow(color: .black.opacity(0.04), radius: 3, y: 2)

                if let date = message.createdAt {
                    Text(date.formatted(.dateTime.hour().minute()))
                        .font(.system(size: 10))
                        .foregroundStyle(SofraColors.textMuted)
                }
            }

            if !isMe { Spacer(minLength: 60) }
        }
    }

    // MARK: - Input Bar
    private var chatInputBar: some View {
        HStack(spacing: SofraSpacing.sm) {
            // Send button
            Button {
                Task {
                    let text = messageText
                    messageText = ""
                    await vm.sendMessage(
                        text: text,
                        orderId: orderId,
                        senderId: currentUserId,
                        senderName: currentUserName,
                        senderRole: currentUserRole,
                        token: try? await appState.validToken()
                    )
                }
            } label: {
                Image(systemName: "paperplane.fill")
                    .font(.title3)
                    .foregroundStyle(messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? SofraColors.textMuted : SofraColors.primary)
                    .rotationEffect(.degrees(-45))
            }
            .disabled(messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || vm.isSending)

            // Text field
            TextField("اكتب رسالتك...", text: $messageText, axis: .vertical)
                .font(SofraTypography.body)
                .textFieldStyle(.plain)
                .lineLimit(1...4)
                .focused($isInputFocused)
                .multilineTextAlignment(.trailing)
                .padding(.horizontal, SofraSpacing.md)
                .padding(.vertical, SofraSpacing.sm)
                .background(SofraColors.sky100)
                .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        }
        .padding(.horizontal, SofraSpacing.screenHorizontal)
        .padding(.vertical, SofraSpacing.sm)
        .background(SofraColors.cardBackground)
        .shadow(color: .black.opacity(0.05), radius: 4, y: -2)
    }

    // MARK: - Closed Chat Bar
    private var closedChatBar: some View {
        HStack(spacing: SofraSpacing.sm) {
            Spacer()
            Image(systemName: orderStatus == .delivered ? "checkmark.circle.fill" : "xmark.circle.fill")
                .foregroundStyle(SofraColors.textMuted)
            Text(orderStatus == .delivered ? "تم اكتمال الطلب — انتهت المحادثة" : "المحادثة غير متاحة لهذا الطلب")
                .font(SofraTypography.caption)
                .foregroundStyle(SofraColors.textMuted)
            Spacer()
        }
        .padding(.vertical, SofraSpacing.md)
        .background(SofraColors.sky100)
    }
}

#Preview {
    OrderChatView(
        orderId: "abc123",
        restaurantName: "مطعم سفرة البيت",
        orderStatus: .accepted
    )
    .environment(AppState())
}
