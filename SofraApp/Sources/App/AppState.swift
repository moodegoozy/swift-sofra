// AppState.swift
// Central app state: auth status, current user, role

import SwiftUI
import Observation
import CoreLocation

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

    // MARK: - Location State
    /// True when the user needs to pick their location (after login/session restore)
    var needsLocationPick = false
    /// User's current confirmed latitude
    var userLatitude: Double = 0
    /// User's current confirmed longitude
    var userLongitude: Double = 0
    /// User's current confirmed address text
    var userAddress: String = ""

    var hasConfirmedLocation: Bool {
        userLatitude != 0 || userLongitude != 0
    }

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
            self.needsLocationPick = true
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
        self.needsLocationPick = true
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
        self.needsLocationPick = true
    }

    // MARK: - Delete Account
    func deleteAccount() async throws {
        let token = try await validToken()
        guard let uid = currentUser?.uid else { throw APIError.unauthorized }

        // 1. Delete user document from Firestore
        try await firestoreService.deleteDocument(collection: "users", id: uid, idToken: token)

        // 2. Delete Firebase Auth account
        try await authService.deleteAccount(idToken: token)

        // 3. Clear local state
        logout()
    }

    // MARK: - Logout
    func logout() {
        keychain.delete(key: .idToken)
        keychain.delete(key: .refreshToken)
        idToken = nil
        currentUser = nil
        role = nil
        isAuthenticated = false
        needsLocationPick = false
        userLatitude = 0
        userLongitude = 0
        userAddress = ""
        OrderPollingService.shared.stopAll()
    }

    // MARK: - Location
    /// Called when user confirms their location on the map
    func confirmLocation(lat: Double, lng: Double, address: String) {
        self.userLatitude = lat
        self.userLongitude = lng
        self.userAddress = address
        self.needsLocationPick = false

        // Update LocationManager too
        LocationManager.shared.userLatitude = lat
        LocationManager.shared.userLongitude = lng

        // Save to Firestore in background
        Task {
            await saveUserLocation(lat: lat, lng: lng, address: address)
        }
    }

    /// Persist user location to Firestore
    func saveUserLocation(lat: Double, lng: Double, address: String) async {
        guard let uid = currentUser?.uid else { return }
        let locationFields: [String: Any] = [
            "savedLocation": [
                "lat": lat,
                "lng": lng,
                "address": address
            ] as [String: Any],
            "location": [
                "lat": lat,
                "lng": lng
            ] as [String: Any]
        ]
        do {
            let token = try await validToken()
            try await firestoreService.updateDocument(
                collection: "users", id: uid,
                fields: locationFields,
                idToken: token
            )
            // Update local user
            currentUser?.savedLocation = SavedLocation(lat: lat, lng: lng, address: address)
            currentUser?.location = GeoLocation(lat: lat, lng: lng)
        } catch {
            Logger.log("Save location error: \(error)", level: .error)
        }
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
