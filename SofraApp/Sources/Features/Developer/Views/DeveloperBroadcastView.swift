// DeveloperBroadcastView.swift
// واجهة إرسال إشعارات جماعية لأدوار معينة - للمطور فقط

import SwiftUI

struct DeveloperBroadcastView: View {
    @Environment(AppState.self) var appState
    @State private var title: String = ""
    @State private var messageBody: String = ""
    @State private var selectedRoles: Set<UserRole> = []
    @State private var isSending = false
    @State private var showSuccess = false
    @State private var sentCount = 0
    @State private var notificationType: NotificationType = .announcement
    
    private let firestoreService = FirestoreService()
    
    enum NotificationType: String, CaseIterable {
        case announcement = "announcement"
        case update = "update"
        case promotion = "promotion"
        case alert = "alert"
        
        var icon: String {
            switch self {
            case .announcement: return "megaphone.fill"
            case .update: return "arrow.triangle.2.circlepath"
            case .promotion: return "tag.fill"
            case .alert: return "exclamationmark.triangle.fill"
            }
        }
        
        var arabicLabel: String {
            switch self {
            case .announcement: return "إعلان"
            case .update: return "تحديث"
            case .promotion: return "عرض"
            case .alert: return "تنبيه"
            }
        }
        
        var color: Color {
            switch self {
            case .announcement: return SofraColors.info
            case .update: return SofraColors.success
            case .promotion: return SofraColors.gold500
            case .alert: return SofraColors.warning
            }
        }
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.lg) {
                // Header
                headerCard
                
                // Notification Type
                typeSelector
                
                // Content
                contentCard
                
                // Role Selector
                roleSelector
                
                // Send Button
                sendButton
                
                Spacer(minLength: SofraSpacing.xxxl)
            }
            .padding(.top, SofraSpacing.md)
        }
        .ramadanBackground()
        .navigationTitle("بث إشعار")
        .navigationBarTitleDisplayMode(.inline)
        .alert("تم الإرسال ✓", isPresented: $showSuccess) {
            Button("حسناً") {
                // Reset form
                title = ""
                messageBody = ""
                selectedRoles = []
            }
        } message: {
            Text("تم إرسال الإشعار إلى \(sentCount) مستخدم")
        }
    }
    
    // MARK: - Header
    private var headerCard: some View {
        SofraCard {
            VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
                HStack {
                    Spacer()
                    Text("إرسال إشعار جماعي")
                        .font(SofraTypography.headline)
                    Image(systemName: "bell.badge.fill")
                        .foregroundStyle(SofraColors.primary)
                }
                Text("سيظهر الإشعار لجميع المستخدمين المحددين")
                    .font(SofraTypography.caption)
                    .foregroundStyle(SofraColors.textMuted)
            }
        }
        .padding(.horizontal, SofraSpacing.screenHorizontal)
    }
    
    // MARK: - Type Selector
    private var typeSelector: some View {
        VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
            Text("نوع الإشعار")
                .font(SofraTypography.subheadline)
                .foregroundStyle(SofraColors.textSecondary)
                .padding(.horizontal, SofraSpacing.screenHorizontal)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: SofraSpacing.sm) {
                    ForEach(NotificationType.allCases, id: \.self) { type in
                        Button {
                            notificationType = type
                        } label: {
                            VStack(spacing: SofraSpacing.xs) {
                                Image(systemName: type.icon)
                                    .font(.title3)
                                Text(type.arabicLabel)
                                    .font(SofraTypography.caption)
                            }
                            .frame(width: 70, height: 60)
                            .background(notificationType == type ? type.color.opacity(0.2) : SofraColors.surfaceElevated)
                            .foregroundStyle(notificationType == type ? type.color : SofraColors.textMuted)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(notificationType == type ? type.color : .clear, lineWidth: 2)
                            )
                        }
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)
            }
        }
    }
    
    // MARK: - Content Card
    private var contentCard: some View {
        SofraCard {
            VStack(alignment: .trailing, spacing: SofraSpacing.md) {
                HStack {
                    Spacer()
                    Text("محتوى الإشعار")
                        .font(SofraTypography.subheadline)
                    Image(systemName: "text.bubble.fill")
                        .foregroundStyle(SofraColors.textMuted)
                }
                
                // Title
                VStack(alignment: .trailing, spacing: 4) {
                    Text("العنوان")
                        .font(SofraTypography.caption)
                        .foregroundStyle(SofraColors.textMuted)
                    TextField("عنوان الإشعار", text: $title)
                        .textFieldStyle(.roundedBorder)
                        .multilineTextAlignment(.trailing)
                }
                
                // Body
                VStack(alignment: .trailing, spacing: 4) {
                    Text("الرسالة")
                        .font(SofraTypography.caption)
                        .foregroundStyle(SofraColors.textMuted)
                    TextEditor(text: $messageBody)
                        .frame(height: 100)
                        .scrollContentBackground(.hidden)
                        .background(SofraColors.surfaceElevated)
                        .clipShape(RoundedRectangle(cornerRadius: 8))
                        .multilineTextAlignment(.trailing)
                }
                
                // Character count
                HStack {
                    Spacer()
                    Text("\(messageBody.count) / 500 حرف")
                        .font(SofraTypography.caption2)
                        .foregroundStyle(messageBody.count > 500 ? SofraColors.error : SofraColors.textMuted)
                }
            }
        }
        .padding(.horizontal, SofraSpacing.screenHorizontal)
    }
    
    // MARK: - Role Selector
    private var roleSelector: some View {
        VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
            HStack {
                Spacer()
                Text("المستهدفون")
                    .font(SofraTypography.subheadline)
                Image(systemName: "person.3.fill")
                    .foregroundStyle(SofraColors.textMuted)
            }
            .padding(.horizontal, SofraSpacing.screenHorizontal)
            
            // Select All
            Button {
                if selectedRoles.count == UserRole.allCases.count {
                    selectedRoles = []
                } else {
                    selectedRoles = Set(UserRole.allCases)
                }
            } label: {
                HStack {
                    Image(systemName: selectedRoles.count == UserRole.allCases.count ? "checkmark.circle.fill" : "circle")
                        .foregroundStyle(selectedRoles.count == UserRole.allCases.count ? SofraColors.primary : SofraColors.textMuted)
                    Spacer()
                    Text("تحديد الكل")
                        .font(SofraTypography.body)
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)
            }
            .buttonStyle(.plain)
            
            // Role Grid
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: SofraSpacing.sm) {
                ForEach(UserRole.allCases, id: \.self) { role in
                    roleChip(role)
                }
            }
            .padding(.horizontal, SofraSpacing.screenHorizontal)
        }
    }
    
    private func roleChip(_ role: UserRole) -> some View {
        Button {
            if selectedRoles.contains(role) {
                selectedRoles.remove(role)
            } else {
                selectedRoles.insert(role)
            }
        } label: {
            HStack(spacing: SofraSpacing.sm) {
                Image(systemName: selectedRoles.contains(role) ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(selectedRoles.contains(role) ? SofraColors.primary : SofraColors.textMuted)
                
                Spacer()
                
                Text(role.arabicLabel)
                    .font(SofraTypography.body)
                    .foregroundStyle(SofraColors.textPrimary)
                
                Image(systemName: role.icon)
                    .foregroundStyle(role.color)
            }
            .padding(SofraSpacing.md)
            .background(selectedRoles.contains(role) ? SofraColors.primary.opacity(0.1) : SofraColors.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(selectedRoles.contains(role) ? SofraColors.primary : SofraColors.textMuted.opacity(0.3), lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
    
    // MARK: - Send Button
    private var sendButton: some View {
        VStack(spacing: SofraSpacing.sm) {
            if !selectedRoles.isEmpty {
                Text("سيتم الإرسال إلى: \(selectedRoles.map { $0.arabicLabel }.joined(separator: "، "))")
                    .font(SofraTypography.caption)
                    .foregroundStyle(SofraColors.textMuted)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
            }
            
            SofraButton(
                title: isSending ? "جارٍ الإرسال..." : "إرسال الإشعار",
                icon: isSending ? "hourglass" : "paperplane.fill",
                style: canSend ? .primary : .secondary
            ) {
                Task { await sendNotification() }
            }
            .disabled(!canSend || isSending)
            .padding(.horizontal, SofraSpacing.screenHorizontal)
        }
    }
    
    private var canSend: Bool {
        !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !messageBody.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
        !selectedRoles.isEmpty &&
        messageBody.count <= 500
    }
    
    // MARK: - Send Notification
    private func sendNotification() async {
        guard let token = try? await appState.validToken() else { return }
        isSending = true
        
        do {
            // Get all users matching selected roles
            let userDocs = try await firestoreService.listDocuments(
                collection: "users",
                idToken: token,
                pageSize: 1000
            )
            
            let users = userDocs.map { AppUser(from: $0) }
            let targetUsers = users.filter { user in
                selectedRoles.contains(user.role)
            }
            
            // Create notification for each user
            for user in targetUsers {
                let notificationId = UUID().uuidString
                let now = Date()
                
                try await firestoreService.createDocument(
                    collection: "notifications",
                    id: notificationId,
                    fields: [
                        "userId": user.uid,
                        "title": title.trimmingCharacters(in: .whitespacesAndNewlines),
                        "body": messageBody.trimmingCharacters(in: .whitespacesAndNewlines),
                        "type": notificationType.rawValue,
                        "read": false,
                        "isBroadcast": true,
                        "createdAt": now,
                        "senderId": appState.currentUser?.uid ?? "system",
                        "senderName": "إدارة سفرة البيت"
                    ],
                    idToken: token
                )
            }
            
            sentCount = targetUsers.count
            Logger.log("Broadcast sent to \(sentCount) users", level: .info)
            showSuccess = true
            
        } catch {
            Logger.log("Broadcast error: \(error)", level: .error)
        }
        
        isSending = false
    }
}

// MARK: - UserRole Extensions
extension UserRole {
    var arabicLabel: String {
        switch self {
        case .customer: return "عميل"
        case .courier: return "مندوب"
        case .owner: return "مالك مطعم"
        case .admin: return "مدير"
        case .developer: return "مطور"
        case .supervisor: return "مشرف"
        case .social_media: return "سوشيال ميديا"
        case .support: return "دعم فني"
        case .accountant: return "محاسب"
        }
    }
    
    var icon: String {
        switch self {
        case .customer: return "person.fill"
        case .courier: return "bicycle"
        case .owner: return "storefront.fill"
        case .admin: return "shield.fill"
        case .developer: return "wrench.and.screwdriver.fill"
        case .supervisor: return "person.badge.shield.checkmark.fill"
        case .social_media: return "megaphone.fill"
        case .support: return "headphones"
        case .accountant: return "banknote.fill"
        }
    }
    
    var color: Color {
        switch self {
        case .customer: return SofraColors.info
        case .courier: return SofraColors.success
        case .owner: return SofraColors.gold500
        case .admin: return SofraColors.error
        case .developer: return SofraColors.textPrimary
        case .supervisor: return SofraColors.warning
        case .social_media: return SofraColors.info
        case .support: return SofraColors.success
        case .accountant: return SofraColors.gold400
        }
    }
}

#Preview {
    NavigationStack {
        DeveloperBroadcastView()
            .environment(AppState())
    }
}
