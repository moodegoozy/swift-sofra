// PhoneLoginView.swift
// Phone number OTP login screen
// Uses Firebase Identity Toolkit REST API for phone auth

import SwiftUI

struct PhoneLoginView: View {
    @Environment(AppState.self) var appState
    @State private var phoneNumber = ""
    @State private var otpCode = ""
    @State private var sessionInfo: String?
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showError = false
    @State private var countdownSeconds = 0
    @State private var timerTask: Task<Void, Never>?
    // reCAPTCHA
    @State private var showRecaptcha = false
    @State private var recaptchaSiteKey: String?
    @State private var loadingSiteKey = false

    private var isPhoneValid: Bool {
        let digits = phoneNumber.filter { $0.isNumber }
        return digits.count >= 9
    }

    private var isOTPValid: Bool {
        otpCode.count == 6
    }

    /// Format phone to E.164: e.g. 05xxxxxxxx → +966xxxxxxxx
    private var formattedPhone: String {
        var digits = phoneNumber.filter { $0.isNumber }
        if digits.hasPrefix("0") {
            digits = String(digits.dropFirst())
        }
        if !digits.hasPrefix("966") {
            digits = "966" + digits
        }
        return "+\(digits)"
    }

    var body: some View {
        VStack(spacing: SofraSpacing.xl) {
            // Header
            VStack(spacing: SofraSpacing.sm) {
                Image(systemName: "iphone.and.arrow.forward")
                    .font(.system(size: 48))
                    .foregroundStyle(SofraColors.gold400)

                Text("تسجيل بالجوال")
                    .font(SofraTypography.title2)
                    .foregroundStyle(SofraColors.gold300)

                Text("سنرسل لك رمز تحقق على رقم جوالك")
                    .font(SofraTypography.body)
                    .foregroundStyle(SofraColors.textSecondary)
            }
            .padding(.top, SofraSpacing.lg)

            if showRecaptcha, let siteKey = recaptchaSiteKey {
                // reCAPTCHA Step
                VStack(spacing: SofraSpacing.md) {
                    Text("أكمل التحقق الأمني لإرسال الرمز")
                        .font(SofraTypography.callout)
                        .foregroundStyle(SofraColors.textSecondary)

                    RecaptchaWebView(
                        siteKey: siteKey,
                        onToken: { token in
                            showRecaptcha = false
                            Task { await sendOTPWithToken(token) }
                        },
                        onError: { error in
                            showRecaptcha = false
                            errorMessage = "تعذر التحقق الأمني: \(error)"
                            showError = true
                        }
                    )
                    .frame(height: 200)
                    .clipShape(RoundedRectangle(cornerRadius: 12))

                    Button {
                        showRecaptcha = false
                    } label: {
                        Text("رجوع")
                            .font(SofraTypography.callout)
                            .foregroundStyle(SofraColors.textSecondary)
                    }
                }
            } else if sessionInfo == nil {
                // Step 1: Enter phone number
                phoneInputStep
            } else {
                // Step 2: Enter OTP
                otpInputStep
            }

            Spacer(minLength: SofraSpacing.xxxl)
        }
        .padding(.horizontal, SofraSpacing.screenHorizontal)
        .alert("خطأ", isPresented: $showError) {
            Button("حسناً", role: .cancel) {}
        } message: {
            Text(errorMessage ?? "حدث خطأ غير متوقع")
        }
    }

    // MARK: - Phone Input Step
    private var phoneInputStep: some View {
        VStack(spacing: SofraSpacing.lg) {
            SofraTextField(
                label: "رقم الجوال",
                text: $phoneNumber,
                icon: "phone",
                placeholder: "05xxxxxxxx",
                keyboardType: .phonePad
            )
            .textContentType(.telephoneNumber)

            SofraButton(
                title: "إرسال رمز التحقق",
                icon: "arrow.right.circle.fill",
                isLoading: isLoading,
                isDisabled: !isPhoneValid
            ) {
                Task { await sendOTP() }
            }

            // Note about reCAPTCHA
            Text("قد تحتاج لإكمال تحقق أمني قبل إرسال الرمز")
                .font(SofraTypography.caption2)
                .foregroundStyle(SofraColors.textMuted)
                .multilineTextAlignment(.center)
        }
    }

    // MARK: - OTP Input Step
    private var otpInputStep: some View {
        VStack(spacing: SofraSpacing.lg) {
            VStack(spacing: SofraSpacing.xs) {
                Text("تم إرسال الرمز إلى")
                    .font(SofraTypography.body)
                    .foregroundStyle(SofraColors.textSecondary)
                Text(formattedPhone)
                    .font(SofraTypography.headline)
                    .foregroundStyle(SofraColors.gold400)
            }

            SofraTextField(
                label: "رمز التحقق",
                text: $otpCode,
                icon: "lock.shield",
                placeholder: "000000",
                keyboardType: .numberPad
            )
            .textContentType(.oneTimeCode)

            SofraButton(
                title: "تسجيل الدخول",
                icon: "checkmark.circle.fill",
                isLoading: isLoading,
                isDisabled: !isOTPValid
            ) {
                Task { await verifyOTP() }
            }

            HStack(spacing: SofraSpacing.sm) {
                Button {
                    Task { await sendOTP() }
                } label: {
                    Text(countdownSeconds > 0 ? "إعادة إرسال (\(countdownSeconds))" : "إعادة إرسال الرمز")
                        .font(SofraTypography.callout)
                        .foregroundStyle(countdownSeconds > 0 ? SofraColors.textMuted : SofraColors.primary)
                }
                .disabled(countdownSeconds > 0 || isLoading)

                Button {
                    sessionInfo = nil
                    otpCode = ""
                } label: {
                    Text("تغيير الرقم")
                        .font(SofraTypography.callout)
                        .foregroundStyle(SofraColors.textSecondary)
                }
            }
        }
    }

    // MARK: - Actions

    /// Step 1: Validate phone → fetch reCAPTCHA site key → show reCAPTCHA
    private func sendOTP() async {
        isLoading = true
        errorMessage = nil

        do {
            // Fetch site key if not already loaded
            if recaptchaSiteKey == nil {
                loadingSiteKey = true
                let siteKey = try await RecaptchaHelper.fetchSiteKey()
                recaptchaSiteKey = siteKey
                loadingSiteKey = false
            }

            // Show reCAPTCHA challenge
            isLoading = false
            showRecaptcha = true
        } catch {
            loadingSiteKey = false
            isLoading = false
            errorMessage = "تعذر تحميل التحقق الأمني. تأكد من اتصالك بالإنترنت"
            showError = true
        }
    }

    /// Step 2: Called after reCAPTCHA succeeds with real token
    private func sendOTPWithToken(_ recaptchaToken: String) async {
        isLoading = true
        errorMessage = nil

        do {
            let session = try await appState.sendPhoneOTP(
                phoneNumber: formattedPhone,
                recaptchaToken: recaptchaToken
            )
            sessionInfo = session
            startCountdown()
        } catch let error as APIError {
            switch error {
            case .firebaseError(let msg):
                if msg.contains("INVALID_PHONE_NUMBER") {
                    errorMessage = "رقم الجوال غير صحيح"
                } else if msg.contains("TOO_MANY_ATTEMPTS") {
                    errorMessage = "محاولات كثيرة. حاول لاحقاً"
                } else if msg.contains("CAPTCHA_CHECK_FAILED") || msg.contains("MISSING_RECAPTCHA_TOKEN") {
                    errorMessage = "فشل التحقق الأمني. حاول مرة أخرى"
                    recaptchaSiteKey = nil // Re-fetch on next attempt
                } else {
                    errorMessage = msg
                }
            default:
                errorMessage = error.localizedDescription
            }
            showError = true
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }

        isLoading = false
    }

    private func verifyOTP() async {
        guard let session = sessionInfo else { return }
        isLoading = true
        errorMessage = nil

        do {
            try await appState.verifyPhoneOTP(sessionInfo: session, code: otpCode)
        } catch let error as APIError {
            switch error {
            case .firebaseError(let msg):
                if msg.contains("INVALID_CODE") || msg.contains("INVALID_SESSION_INFO") {
                    errorMessage = "الرمز غير صحيح أو منتهي الصلاحية"
                } else if msg.contains("SESSION_EXPIRED") {
                    errorMessage = "انتهت صلاحية الجلسة. أعد إرسال الرمز"
                    sessionInfo = nil
                } else {
                    errorMessage = msg
                }
            default:
                errorMessage = error.localizedDescription
            }
            showError = true
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }

        isLoading = false
    }

    private func startCountdown() {
        timerTask?.cancel()
        countdownSeconds = 60
        timerTask = Task {
            while countdownSeconds > 0, !Task.isCancelled {
                try? await Task.sleep(for: .seconds(1))
                if !Task.isCancelled {
                    countdownSeconds -= 1
                }
            }
        }
    }
}

#Preview {
    PhoneLoginView()
        .environment(AppState())
}
