// AuthViewModel.swift
// Handles login/register form state and validation

import SwiftUI

@MainActor
final class AuthViewModel: ObservableObject {
    // MARK: - Login Fields
    @Published var loginEmail = ""
    @Published var loginPassword = ""

    // MARK: - Register Fields
    @Published var registerEmail = ""
    @Published var registerPassword = ""
    @Published var registerName = ""
    @Published var registerPhone = ""
    @Published var registerCity = ""
    @Published var selectedRole: UserRole = .customer

    // MARK: - State
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var showError = false

    // MARK: - Login
    func login(appState: AppState) async {
        guard validateLogin() else { return }
        isLoading = true
        errorMessage = nil

        do {
            try await appState.login(email: loginEmail.trimmed, password: loginPassword)
        } catch let error as APIError {
            handleError(error)
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }

        isLoading = false
    }

    // MARK: - Register
    func register(appState: AppState) async {
        guard validateRegister() else { return }
        isLoading = true
        errorMessage = nil

        do {
            try await appState.register(
                email: registerEmail.trimmed,
                password: registerPassword,
                name: registerName.trimmed,
                phone: registerPhone.trimmed,
                city: registerCity.trimmed,
                userRole: selectedRole
            )
        } catch let error as APIError {
            handleError(error)
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }

        isLoading = false
    }

    // MARK: - Validation
    private func validateLogin() -> Bool {
        if loginEmail.trimmed.isEmpty {
            errorMessage = "يرجى إدخال البريد الإلكتروني"
            showError = true
            return false
        }
        if loginPassword.isEmpty {
            errorMessage = "يرجى إدخال كلمة المرور"
            showError = true
            return false
        }
        return true
    }

    private func validateRegister() -> Bool {
        if registerName.trimmed.isEmpty {
            errorMessage = "يرجى إدخال الاسم"
            showError = true
            return false
        }
        if registerEmail.trimmed.isEmpty || !registerEmail.contains("@") {
            errorMessage = "يرجى إدخال بريد إلكتروني صحيح"
            showError = true
            return false
        }
        if registerPassword.count < 6 {
            errorMessage = "كلمة المرور يجب أن تكون 6 أحرف على الأقل"
            showError = true
            return false
        }
        return true
    }

    // MARK: - Firebase Error Mapping
    private func handleError(_ error: APIError) {
        switch error {
        case .firebaseError(let msg):
            switch msg {
            case let m where m.contains("EMAIL_NOT_FOUND"):
                errorMessage = "البريد الإلكتروني غير مسجل"
            case let m where m.contains("INVALID_PASSWORD"), let m where m.contains("INVALID_LOGIN_CREDENTIALS"):
                errorMessage = "كلمة المرور غير صحيحة"
            case let m where m.contains("EMAIL_EXISTS"):
                errorMessage = "البريد الإلكتروني مسجل مسبقاً"
            case let m where m.contains("WEAK_PASSWORD"):
                errorMessage = "كلمة المرور ضعيفة جداً"
            case let m where m.contains("TOO_MANY_ATTEMPTS"):
                errorMessage = "محاولات كثيرة. حاول لاحقاً"
            default:
                errorMessage = msg
            }
        default:
            errorMessage = error.localizedDescription
        }
        showError = true
    }
}

// MARK: - String Helper
extension String {
    var trimmed: String {
        trimmingCharacters(in: .whitespacesAndNewlines)
    }
}
