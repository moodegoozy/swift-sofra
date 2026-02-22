// LoginView.swift
// 🌙 شاشة تسجيل دخول فخمة بطابع رمضاني

import SwiftUI

struct LoginView: View {
    @Environment(AppState.self) var appState
    @State private var vm = AuthViewModel()
    @State private var showRegister = false

    var body: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.xl) {
                // MARK: - Header with Ramadan Decorations
                ZStack {
                    // Floating stars background
                    FloatingStarsView(count: 15)
                        .frame(height: 220)

                    VStack(spacing: SofraSpacing.md) {
                        // Crescent moon icon
                        CrescentMoonView(size: 56, glowRadius: 15)

                        Text("سفرة البيت")
                            .font(SofraTypography.ramadanTitle)
                            .foregroundStyle(
                                .linearGradient(
                                    colors: [SofraColors.gold300, SofraColors.gold500],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )

                        Text("أهلاً بك! سجّل دخولك للمتابعة")
                            .font(SofraTypography.body)
                            .foregroundStyle(SofraColors.textSecondary)
                    }
                }
                .padding(.top, SofraSpacing.xl)

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
        .ramadanBackground()
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
