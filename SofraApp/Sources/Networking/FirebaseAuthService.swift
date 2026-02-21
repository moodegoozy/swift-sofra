// FirebaseAuthService.swift
// Firebase Auth REST API integration (no SDK needed)

import Foundation

struct AuthResponse: Decodable {
    let idToken: String
    let refreshToken: String
    let localId: String       // = Firebase UID
    let email: String
    let expiresIn: String     // seconds until expiry

    // The REST API uses these exact keys
    enum CodingKeys: String, CodingKey {
        case idToken, refreshToken, localId, email, expiresIn
    }
}

struct RefreshTokenResponse: Decodable {
    let idToken: String       // access_token in some responses
    let refreshToken: String  // refresh_token
    let localId: String       // user_id
    let expiresIn: String

    enum CodingKeys: String, CodingKey {
        case idToken = "id_token"
        case refreshToken = "refresh_token"
        case localId = "user_id"
        case expiresIn = "expires_in"
    }
}

final class FirebaseAuthService {
    private let client = APIClient.shared

    // MARK: - Sign In with Email/Password
    func signIn(email: String, password: String) async throws -> AuthResponse {
        let body: [String: Any] = [
            "email": email,
            "password": password,
            "returnSecureToken": true
        ]
        let data = try JSONSerialization.data(withJSONObject: body)
        return try await client.request(url: Endpoints.signIn, method: "POST", body: data)
    }

    // MARK: - Sign Up with Email/Password
    func signUp(email: String, password: String) async throws -> AuthResponse {
        let body: [String: Any] = [
            "email": email,
            "password": password,
            "returnSecureToken": true
        ]
        let data = try JSONSerialization.data(withJSONObject: body)
        return try await client.request(url: Endpoints.signUp, method: "POST", body: data)
    }

    // MARK: - Refresh Token
    func refreshToken(_ refreshToken: String) async throws -> RefreshTokenResponse {
        let body: [String: Any] = [
            "grant_type": "refresh_token",
            "refresh_token": refreshToken
        ]
        let data = try JSONSerialization.data(withJSONObject: body)
        return try await client.request(url: Endpoints.refreshToken, method: "POST", body: data)
    }
}
