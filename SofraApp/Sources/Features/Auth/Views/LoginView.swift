// LoginView.swift
// 🌙 شاشة تسجيل دخول فخمة بطابع رمضاني

import SwiftUI

struct LoginView: View {
    @Environment(AppState.self) var appState
    @State private var vm = AuthViewModel()
    @State private var showRegister = false
    @State private var showGuestBrowse = false
    @State private var loginMethod: LoginMethod = .email

    enum LoginMethod: String, CaseIterable {
        case email, phone
        var label: String {
            switch self {
            case .email: return "بريد إلكتروني"
            case .phone: return "رقم الجوال"
            }
        }
    }

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

                // MARK: - Login Method Picker
                Picker("طريقة الدخول", selection: $loginMethod) {
                    ForEach(LoginMethod.allCases, id: \.self) { method in
                        Text(method.label).tag(method)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                // MARK: - Form
                if loginMethod == .email {
                    emailLoginForm
                } else {
                    PhoneLoginView()
                }

                // MARK: - Register
                SofraButton(
                    title: "إنشاء حساب جديد",
                    style: .ghost
                ) {
                    showRegister = true
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)
                
                // MARK: - Browse as Guest
                VStack(spacing: SofraSpacing.sm) {
                    HStack {
                        Rectangle()
                            .fill(SofraColors.gold500.opacity(0.3))
                            .frame(height: 1)
                        Text("أو")
                            .font(SofraTypography.caption)
                            .foregroundStyle(SofraColors.textMuted)
                        Rectangle()
                            .fill(SofraColors.gold500.opacity(0.3))
                            .frame(height: 1)
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                    
                    Button {
                        showGuestBrowse = true
                    } label: {
                        HStack(spacing: SofraSpacing.sm) {
                            Image(systemName: "eye.fill")
                                .font(.body.weight(.semibold))
                            Text("تصفح المطاعم كزائر")
                                .font(SofraTypography.headline)
                        }
                        .foregroundStyle(SofraColors.gold400)
                        .frame(maxWidth: .infinity)
                        .frame(height: SofraSpacing.buttonHeight)
                        .background(
                            RoundedRectangle(cornerRadius: SofraSpacing.buttonRadius)
                                .strokeBorder(
                                    LinearGradient(
                                        colors: [SofraColors.gold300, SofraColors.gold500],
                                        startPoint: .leading,
                                        endPoint: .trailing
                                    ),
                                    lineWidth: 1.5
                                )
                        )
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                }

                Spacer(minLength: SofraSpacing.xxxl)
            }
        }
        .ramadanBackground()
        .navigationDestination(isPresented: $showRegister) {
            RegisterChoiceView()
        }
        .fullScreenCover(isPresented: $showGuestBrowse) {
            GuestBrowseView()
        }
        .alert("خطأ", isPresented: $vm.showError) {
            Button("حسناً", role: .cancel) {}
        } message: {
            Text(vm.errorMessage ?? "حدث خطأ غير متوقع")
        }
    }

    // MARK: - Email Login Form
    private var emailLoginForm: some View {
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

            SofraButton(
                title: "تسجيل الدخول",
                icon: "arrow.right.circle.fill",
                isLoading: vm.isLoading
            ) {
                Task { await vm.login(appState: appState) }
            }
        }
        .padding(.horizontal, SofraSpacing.screenHorizontal)
    }
}

#Preview {
    NavigationStack {
        LoginView()
            .environment(AppState())
    }
}
