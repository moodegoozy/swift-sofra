// ProfileView.swift
// User profile screen matching web /profile

import SwiftUI

struct ProfileView: View {
    @Environment(AppState.self) var appState
    @State private var vm = ProfileViewModel()

    @State private var name = ""
    @State private var phone = ""
    @State private var address = ""
    @State private var city = ""
    @State private var showLogoutConfirm = false

    var body: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.lg) {
                // Avatar & Info
                VStack(spacing: SofraSpacing.sm) {
                    ZStack {
                        Circle()
                            .fill(SofraColors.sky100)
                            .frame(width: 80, height: 80)
                        Image(systemName: "person.fill")
                            .font(.largeTitle)
                            .foregroundStyle(SofraColors.primary)
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
                        SofraTextField(label: "المدينة", text: $city, icon: "map")
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
                        settingsRow(icon: "bell", label: "الإشعارات") {}
                        settingsRow(icon: "shield", label: "سياسة الخصوصية") {}
                        settingsRow(icon: "doc.text", label: "الشروط والأحكام") {}
                        settingsRow(icon: "questionmark.circle", label: "الدعم الفني") {}
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                // Logout
                SofraButton(title: "تسجيل الخروج", icon: "rectangle.portrait.and.arrow.right", style: .danger) {
                    showLogoutConfirm = true
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                Spacer(minLength: SofraSpacing.xxxl)
            }
        }
        .background(SofraColors.background.ignoresSafeArea())
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
            name = u.name
            phone = u.phone ?? ""
            address = u.address ?? ""
            city = u.city ?? ""
        }
    }

    private func saveProfile() async {
        guard let uid = appState.currentUser?.uid else { return }
        let fields: [String: Any] = [
            "name": name,
            "phone": phone,
            "address": address,
            "city": city
        ]
        let success = await vm.updateProfile(
            uid: uid, fields: fields,
            token: try? await appState.validToken()
        )
        if success {
            appState.currentUser?.name = name
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
