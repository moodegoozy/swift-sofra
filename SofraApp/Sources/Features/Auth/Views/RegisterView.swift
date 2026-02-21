// RegisterView.swift
// Registration form matching web app /register/form

import SwiftUI

struct RegisterView: View {
    let selectedRole: UserRole
    @EnvironmentObject var appState: AppState
    @StateObject private var vm = AuthViewModel()

    var body: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.xl) {
                // Header
                VStack(spacing: SofraSpacing.sm) {
                    Image(systemName: roleIcon)
                        .font(.system(size: 48))
                        .foregroundStyle(SofraColors.primary)

                    Text(roleTitle)
                        .font(SofraTypography.title2)
                        .foregroundStyle(SofraColors.primaryDark)
                }
                .padding(.top, SofraSpacing.lg)

                // Form
                VStack(spacing: SofraSpacing.lg) {
                    SofraTextField(
                        label: "الاسم الكامل",
                        text: $vm.registerName,
                        icon: "person",
                        placeholder: "أدخل اسمك"
                    )
                    .textContentType(.name)

                    SofraTextField(
                        label: "البريد الإلكتروني",
                        text: $vm.registerEmail,
                        icon: "envelope",
                        placeholder: "example@email.com",
                        keyboardType: .emailAddress
                    )
                    .textContentType(.emailAddress)
                    .autocapitalization(.none)

                    SofraTextField(
                        label: "رقم الجوال",
                        text: $vm.registerPhone,
                        icon: "phone",
                        placeholder: "05xxxxxxxx",
                        keyboardType: .phonePad
                    )
                    .textContentType(.telephoneNumber)

                    SofraTextField(
                        label: "المدينة",
                        text: $vm.registerCity,
                        icon: "mappin.circle",
                        placeholder: "مثال: الرياض"
                    )

                    SofraTextField(
                        label: "كلمة المرور",
                        text: $vm.registerPassword,
                        icon: "lock",
                        placeholder: "6 أحرف على الأقل",
                        isSecure: true
                    )
                    .textContentType(.newPassword)
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                // Submit
                SofraButton(
                    title: "إنشاء الحساب",
                    icon: "person.badge.plus",
                    isLoading: vm.isLoading
                ) {
                    vm.selectedRole = selectedRole
                    Task { await vm.register(appState: appState) }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                Spacer(minLength: SofraSpacing.xxxl)
            }
        }
        .background(SofraColors.background.ignoresSafeArea())
        .navigationTitle("تسجيل جديد")
        .navigationBarTitleDisplayMode(.inline)
        .alert("خطأ", isPresented: $vm.showError) {
            Button("حسناً", role: .cancel) {}
        } message: {
            Text(vm.errorMessage ?? "")
        }
    }

    // MARK: - Role-specific UI
    private var roleIcon: String {
        switch selectedRole {
        case .customer: return "bag.fill"
        case .owner:    return "storefront.fill"
        case .courier:  return "car.fill"
        default:        return "person.fill"
        }
    }

    private var roleTitle: String {
        switch selectedRole {
        case .customer: return "حساب عميل جديد"
        case .owner:    return "تسجيل أسرة منتجة"
        case .courier:  return "تسجيل مندوب"
        default:        return "تسجيل جديد"
        }
    }
}

#Preview {
    NavigationStack {
        RegisterView(selectedRole: .customer)
            .environmentObject(AppState())
    }
}
