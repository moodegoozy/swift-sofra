// AppState.swift
// Central app state: auth status, current user, role

import SwiftUI
import Observation

/// Roles matching the web app's union type exactly
enum UserRole: String, Codable, CaseIterable {
    case customer, courier, owner, admin, developer
    case supervisor, social_media, support, accountant
}

/// Central observable state shared across the entire app
@Observable
final class AppState {
    // MARK: - State
    var isAuthenticated = false
    var isLoading = true
    var currentUser: AppUser?
    var role: UserRole?
    var idToken: String?
    var selectedMainTab = 0

    // MARK: - Services
    private let authService = FirebaseAuthService()
    private let firestoreService = FirestoreService()
    private let keychain = KeychainHelper.shared

    // MARK: - Session Restore
    /// Called on app launch to restore a valid session from Keychain
    func restoreSession() async {
        defer { isLoading = false }

        guard let refreshToken = keychain.read(key: .refreshToken) else {
            isAuthenticated = false
            return
        }

        do {
            let tokens = try await authService.refreshToken(refreshToken)
            keychain.save(tokens.idToken, key: .idToken)
            keychain.save(tokens.refreshToken, key: .refreshToken)
            self.idToken = tokens.idToken

            // Fetch user document from Firestore
            let user = try await firestoreService.getUser(uid: tokens.localId, idToken: tokens.idToken)
            self.currentUser = user
            self.role = user.role
            self.isAuthenticated = true
        } catch {
            Logger.log("Session restore failed: \(error.localizedDescription)", level: .warning)
            logout()
        }
    }

    // MARK: - Login
    func login(email: String, password: String) async throws {
        let response = try await authService.signIn(email: email, password: password)
        keychain.save(response.idToken, key: .idToken)
        keychain.save(response.refreshToken, key: .refreshToken)
        self.idToken = response.idToken

        let user = try await firestoreService.getUser(uid: response.localId, idToken: response.idToken)
        self.currentUser = user
        self.role = user.role
        self.isAuthenticated = true
    }

    // MARK: - Register
    func register(email: String, password: String, name: String, phone: String, city: String, userRole: UserRole) async throws {
        let response = try await authService.signUp(email: email, password: password)
        keychain.save(response.idToken, key: .idToken)
        keychain.save(response.refreshToken, key: .refreshToken)
        self.idToken = response.idToken

        // Create user document in Firestore
        let newUser = AppUser(
            uid: response.localId,
            email: email,
            name: name,
            phone: phone,
            city: city,
            role: userRole
        )
        try await firestoreService.createUser(newUser, idToken: response.idToken)

        self.currentUser = newUser
        self.role = userRole
        self.isAuthenticated = true
    }

    // MARK: - Logout
    func logout() {
        keychain.delete(key: .idToken)
        keychain.delete(key: .refreshToken)
        idToken = nil
        currentUser = nil
        role = nil
        isAuthenticated = false
    }

    // MARK: - Token Helper
    /// Returns a valid ID token, refreshing if needed
    func validToken() async throws -> String {
        if let token = idToken { return token }
        guard let rt = keychain.read(key: .refreshToken) else {
            throw APIError.unauthorized
        }
        let tokens = try await authService.refreshToken(rt)
        keychain.save(tokens.idToken, key: .idToken)
        keychain.save(tokens.refreshToken, key: .refreshToken)
        self.idToken = tokens.idToken
        return tokens.idToken
    }
}
