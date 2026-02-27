// ProfileView.swift
// User profile screen matching web /profile

import SwiftUI

struct ProfileView: View {
    @Environment(AppState.self) var appState
    @State private var vm = ProfileViewModel()

    @State private var name = ""
    @State private var phone = ""
    @State private var address = ""
    @State private var showLogoutConfirm = false
    @State private var showDeleteConfirm = false
    @State private var isDeleting = false
    @State private var showNotifications = false
    @State private var showPrivacy = false
    @State private var showTerms = false
    @State private var showSupport = false
    private let appearance = AppearanceManager.shared
    @State private var showLocationPicker = false
    @State private var locationAddress = ""

    var body: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.lg) {
                // Avatar & Info
                VStack(spacing: SofraSpacing.sm) {
                    ZStack {
                        // Gold glow
                        Circle()
                            .fill(SofraColors.gold500.opacity(0.15))
                            .frame(width: 96, height: 96)

                        Circle()
                            .fill(SofraColors.surfaceElevated)
                            .frame(width: 80, height: 80)
                            .overlay(
                                Circle()
                                    .strokeBorder(
                                        LinearGradient(
                                            colors: [SofraColors.gold400, SofraColors.gold600],
                                            startPoint: .topLeading,
                                            endPoint: .bottomTrailing
                                        ),
                                        lineWidth: 2
                                    )
                            )

                        Image(systemName: "person.fill")
                            .font(.largeTitle)
                            .foregroundStyle(SofraColors.gold400)
                    }

                    Text(vm.user?.name ?? appState.currentUser?.name ?? "")
                        .font(SofraTypography.title2)

                    if let role = vm.user?.role ?? appState.currentUser?.role {
                        StatusBadge(text: roleArabicLabel(role), color: SofraColors.primary)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, SofraSpacing.lg)

                // Edit Form
                if vm.isLoading {
                    VStack(spacing: SofraSpacing.md) {
                        ForEach(0..<4, id: \.self) { _ in
                            SkeletonView(width: nil, height: 48, radius: 10)
                                .padding(.horizontal, SofraSpacing.screenHorizontal)
                        }
                    }
                } else {
                    VStack(spacing: SofraSpacing.md) {
                        SofraTextField(label: "الاسم", text: $name, icon: "person")
                        SofraTextField(label: "الهاتف", text: $phone, icon: "phone")
                            .keyboardType(.phonePad)
                        SofraTextField(label: "العنوان", text: $address, icon: "location")

                        // Location via Map
                        Button {
                            showLocationPicker = true
                        } label: {
                            HStack {
                                Image(systemName: "chevron.left")
                                    .foregroundStyle(SofraColors.textMuted)
                                Spacer()
                                VStack(alignment: .trailing, spacing: SofraSpacing.xxs) {
                                    Text("الموقع على الخريطة")
                                        .font(SofraTypography.callout)
                                        .foregroundStyle(SofraColors.textPrimary)
                                    Text(locationAddress.isEmpty ? "اضغط لتحديد موقعك" : locationAddress)
                                        .font(SofraTypography.caption)
                                        .foregroundStyle(locationAddress.isEmpty ? SofraColors.textMuted : SofraColors.success)
                                        .lineLimit(1)
                                }
                                Image(systemName: "map.fill")
                                    .foregroundStyle(SofraColors.gold400)
                                    .frame(width: 28)
                            }
                            .padding(SofraSpacing.md)
                            .background(SofraColors.cardBackground)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .strokeBorder(SofraColors.gold500.opacity(0.15), lineWidth: 0.5)
                            )
                        }
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)

                    // Messages
                    if let error = vm.errorMessage {
                        Text(error)
                            .font(SofraTypography.callout)
                            .foregroundStyle(SofraColors.error)
                    }
                    if let success = vm.successMessage {
                        Text(success)
                            .font(SofraTypography.callout)
                            .foregroundStyle(SofraColors.success)
                    }

                    // Save button
                    SofraButton(title: "حفظ التعديلات", icon: "checkmark", isLoading: vm.isSaving) {
                        Task { await saveProfile() }
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                }

                Divider()
                    .padding(.horizontal, SofraSpacing.screenHorizontal)

                // Settings Section
                SofraCard {
                    VStack(spacing: SofraSpacing.md) {
                        // Dark/Light Mode Toggle
                        HStack {
                            Toggle("", isOn: Binding(
                                get: { appearance.isDarkMode },
                                set: { appearance.isDarkMode = $0 }
                            ))
                            .tint(SofraColors.gold400)

                            Spacer()
                            Text("الوضع الداكن")
                                .font(SofraTypography.body)
                                .foregroundStyle(SofraColors.textPrimary)
                            Image(systemName: appearance.isDarkMode ? "moon.fill" : "sun.max.fill")
                                .foregroundStyle(appearance.isDarkMode ? SofraColors.gold400 : SofraColors.warning)
                                .frame(width: 28)
                        }

                        NavigationLink {
                            NotificationsView()
                        } label: {
                            HStack {
                                Image(systemName: "chevron.left")
                                    .foregroundStyle(SofraColors.textMuted)
                                Spacer()
                                Text("الإشعارات")
                                    .font(SofraTypography.body)
                                    .foregroundStyle(SofraColors.textPrimary)
                                Image(systemName: "bell")
                                    .foregroundStyle(SofraColors.primary)
                                    .frame(width: 28)
                            }
                        }
                        settingsRow(icon: "shield", label: "سياسة الخصوصية") { showPrivacy = true }
                        settingsRow(icon: "doc.text", label: "الشروط والأحكام") { showTerms = true }
                        settingsRow(icon: "questionmark.circle", label: "الدعم الفني") { showSupport = true }
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                // Logout
                SofraButton(title: "تسجيل الخروج", icon: "rectangle.portrait.and.arrow.right", style: .danger) {
                    showLogoutConfirm = true
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                // Delete Account
                Button {
                    showDeleteConfirm = true
                } label: {
                    HStack(spacing: SofraSpacing.xs) {
                        if isDeleting {
                            ProgressView()
                                .tint(.red)
                        }
                        Text("حذف الحساب نهائياً")
                            .font(SofraTypography.callout)
                        Image(systemName: "trash")
                    }
                    .foregroundStyle(.red.opacity(0.7))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, SofraSpacing.sm)
                }
                .disabled(isDeleting)
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                Spacer(minLength: SofraSpacing.xxxl)
            }
        }
        .ramadanBackground()
        .navigationTitle("الملف الشخصي")
        .navigationBarTitleDisplayMode(.large)
        .task { await loadAndPopulate() }
        .confirmationDialog("تسجيل الخروج", isPresented: $showLogoutConfirm) {
            Button("تسجيل الخروج", role: .destructive) {
                appState.logout()
            }
        } message: {
            Text("هل أنت متأكد من تسجيل الخروج؟")
        }
        .confirmationDialog("حذف الحساب", isPresented: $showDeleteConfirm) {
            Button("حذف الحساب نهائياً", role: .destructive) {
                Task {
                    isDeleting = true
                    do {
                        try await appState.deleteAccount()
                    } catch {
                        vm.errorMessage = "فشل حذف الحساب: \(error.localizedDescription)"
                        isDeleting = false
                    }
                }
            }
        } message: {
            Text("هل أنت متأكد؟ سيتم حذف حسابك وجميع بياناتك نهائياً ولا يمكن التراجع عن هذا الإجراء.")
        }
        .sheet(isPresented: $showPrivacy) {
            PrivacyPolicyView()
        }
        .sheet(isPresented: $showTerms) {
            TermsConditionsView()
        }
        .sheet(isPresented: $showSupport) {
            SupportView()
        }
        .sheet(isPresented: $showLocationPicker) {
            LocationPickerView(
                title: "حدد موقعك",
                subtitle: "اضغط على الخريطة لتحديد موقعك"
            ) { lat, lng, addr in
                locationAddress = addr
                appState.confirmLocation(lat: lat, lng: lng, address: addr)
            }
        }
    }

    // MARK: - Settings Row
    private func settingsRow(icon: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                Image(systemName: "chevron.left")
                    .foregroundStyle(SofraColors.textMuted)
                Spacer()
                Text(label)
                    .font(SofraTypography.body)
                    .foregroundStyle(SofraColors.textPrimary)
                Image(systemName: icon)
                    .foregroundStyle(SofraColors.primary)
                    .frame(width: 28)
            }
        }
    }

    // MARK: - Data
    private func loadAndPopulate() async {
        guard let uid = appState.currentUser?.uid else { return }
        await vm.loadProfile(uid: uid, token: try? await appState.validToken())
        if let u = vm.user {
            name = u.name ?? ""
            phone = u.phone ?? ""
            address = u.address ?? ""
            locationAddress = u.savedLocation?.address ?? ""
        }
    }

    private func saveProfile() async {
        guard let uid = appState.currentUser?.uid else { return }
        
        // Validation
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedPhone = phone.trimmingCharacters(in: .whitespacesAndNewlines)
        
        if trimmedName.isEmpty {
            vm.errorMessage = "يرجى إدخال الاسم"
            return
        }
        
        if trimmedName.count < 2 {
            vm.errorMessage = "الاسم يجب أن يكون حرفين على الأقل"
            return
        }
        
        // Phone validation (Saudi format: 05XXXXXXXX)
        if !trimmedPhone.isEmpty {
            let phonePattern = #"^05\d{8}$"#
            let phoneRegex = try? NSRegularExpression(pattern: phonePattern)
            let range = NSRange(trimmedPhone.startIndex..., in: trimmedPhone)
            if phoneRegex?.firstMatch(in: trimmedPhone, range: range) == nil {
                vm.errorMessage = "رقم الهاتف غير صحيح (مثال: 0512345678)"
                return
            }
        }
        
        var fields: [String: Any] = [
            "name": trimmedName,
            "phone": trimmedPhone,
            "address": address
        ]
        // Include location if set
        if let loc = appState.currentUser?.savedLocation, loc.lat != 0 {
            fields["savedLocation"] = [
                "lat": loc.lat,
                "lng": loc.lng,
                "address": loc.address
            ] as [String: Any]
            fields["location"] = [
                "lat": loc.lat,
                "lng": loc.lng
            ] as [String: Any]
        }
        let success = await vm.updateProfile(
            uid: uid, fields: fields,
            token: try? await appState.validToken()
        )
        if success {
            // Update the entire struct to ensure @Observable triggers
            if var updatedUser = appState.currentUser {
                updatedUser.name = trimmedName
                updatedUser.phone = trimmedPhone
                updatedUser.address = address
                appState.currentUser = updatedUser
            }
        }
    }

    private func roleArabicLabel(_ role: UserRole) -> String {
        switch role {
        case .customer:     return "عميل"
        case .owner:        return "صاحب مطعم"
        case .courier:      return "سائق توصيل"
        case .admin:        return "مشرف"
        case .developer:    return "مطور"
        case .supervisor:   return "مراقب"
        case .social_media: return "تواصل اجتماعي"
        case .support:      return "دعم فني"
        case .accountant:   return "محاسب"
        }
    }
}

#Preview {
    NavigationStack {
        ProfileView()
            .environment(AppState())
    }
}
