// LoginView.swift
// Login screen matching the web app's /login route
// Premium Apple-like design with sky palette

import SwiftUI

struct LoginView: View {
    @Environment(AppState.self) var appState
    @State private var vm = AuthViewModel()
    @State private var showRegister = false

    var body: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.xl) {
                // MARK: - Header
                VStack(spacing: SofraSpacing.md) {
                    Image(systemName: "fork.knife.circle.fill")
                        .font(.system(size: 72))
                        .foregroundStyle(SofraColors.primary)

                    Text("سفرة البيت")
                        .font(SofraTypography.largeTitle)
                        .foregroundStyle(SofraColors.primaryDark)

                    Text("أهلاً بك! سجّل دخولك للمتابعة")
                        .font(SofraTypography.body)
                        .foregroundStyle(SofraColors.textSecondary)
                }
                .padding(.top, SofraSpacing.xxxl)

                // MARK: - Form
                VStack(spacing: SofraSpacing.lg) {
                    SofraTextField(
                        label: "البريد الإلكتروني",
                        text: $vm.loginEmail,
                        icon: "envelope",
                        placeholder: "example@email.com",
                        keyboardType: .emailAddress
                    )
                    .textContentType(.emailAddress)
                    .autocapitalization(.none)

                    SofraTextField(
                        label: "كلمة المرور",
                        text: $vm.loginPassword,
                        icon: "lock",
                        placeholder: "••••••••",
                        isSecure: true
                    )
                    .textContentType(.password)
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                // MARK: - Actions
                VStack(spacing: SofraSpacing.md) {
                    SofraButton(
                        title: "تسجيل الدخول",
                        icon: "arrow.right.circle.fill",
                        isLoading: vm.isLoading
                    ) {
                        Task { await vm.login(appState: appState) }
                    }

                    SofraButton(
                        title: "إنشاء حساب جديد",
                        style: .ghost
                    ) {
                        showRegister = true
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                Spacer(minLength: SofraSpacing.xxxl)
            }
        }
        .background(SofraColors.background.ignoresSafeArea())
        .navigationDestination(isPresented: $showRegister) {
            RegisterChoiceView()
        }
        .alert("خطأ", isPresented: $vm.showError) {
            Button("حسناً", role: .cancel) {}
        } message: {
            Text(vm.errorMessage ?? "حدث خطأ غير متوقع")
        }
    }
}

#Preview {
    NavigationStack {
        LoginView()
            .environment(AppState())
    }
}
