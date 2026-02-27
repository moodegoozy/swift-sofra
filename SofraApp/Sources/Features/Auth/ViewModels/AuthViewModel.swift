// AuthViewModel.swift
// Handles login/register form state and validation

import SwiftUI
import Observation

@Observable
final class AuthViewModel {
    // MARK: - Login Fields
    var loginEmail = ""
    var loginPassword = ""

    // MARK: - Register Fields
    var registerEmail = ""
    var registerPassword = ""
    var registerName = ""
    var registerPhone = ""
    var registerCity = ""
    var selectedRole: UserRole = .customer
    var registerLat: Double = 0
    var registerLng: Double = 0
    var registerLocationAddress = ""

    // MARK: - State
    var isLoading = false
    var errorMessage: String?
    var showError = false

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
                userRole: selectedRole,
                lat: registerLat,
                lng: registerLng,
                locationAddress: registerLocationAddress
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
        // Proper email validation
        let emailPattern = #"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"#
        let emailRegex = try? NSRegularExpression(pattern: emailPattern)
        let emailRange = NSRange(loginEmail.trimmed.startIndex..., in: loginEmail.trimmed)
        if loginEmail.trimmed.isEmpty || emailRegex?.firstMatch(in: loginEmail.trimmed, range: emailRange) == nil {
            errorMessage = "يرجى إدخال بريد إلكتروني صحيح"
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
        if registerName.trimmed.count < 2 {
            errorMessage = "الاسم يجب أن يكون حرفين على الأقل"
            showError = true
            return false
        }
        // Proper email validation using regex
        let emailPattern = #"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"#
        let emailRegex = try? NSRegularExpression(pattern: emailPattern)
        let emailRange = NSRange(registerEmail.trimmed.startIndex..., in: registerEmail.trimmed)
        if registerEmail.trimmed.isEmpty || emailRegex?.firstMatch(in: registerEmail.trimmed, range: emailRange) == nil {
            errorMessage = "يرجى إدخال بريد إلكتروني صحيح"
            showError = true
            return false
        }
        if registerPassword.count < 6 {
            errorMessage = "كلمة المرور يجب أن تكون 6 أحرف على الأقل"
            showError = true
            return false
        }
        // Check password strength (at least one letter and one number)
        let hasLetter = registerPassword.rangeOfCharacter(from: .letters) != nil
        let hasNumber = registerPassword.rangeOfCharacter(from: .decimalDigits) != nil
        if !hasLetter || !hasNumber {
            errorMessage = "كلمة المرور يجب أن تحتوي على أحرف وأرقام"
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
