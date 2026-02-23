// Endpoints.swift
// Firebase REST API endpoint configuration
// Uses xcconfig-driven base URLs for Debug/Staging/Prod

import Foundation

enum Endpoints {
    // MARK: - Firebase Project Config (from web app's firebase.ts)
    static let apiKey    = "AIzaSyC1iM3g3gGfu23GKLpDRQplBuHidPniFIk"
    static let projectId = "albayt-sofra"

    // MARK: - Auth (Firebase Identity Toolkit REST API)
    private static let authBase = "https://identitytoolkit.googleapis.com/v1"
    private static let tokenBase = "https://securetoken.googleapis.com/v1"

    static var signIn: URL {
        URL(string: "\(authBase)/accounts:signInWithPassword?key=\(apiKey)")!
    }

    static var signUp: URL {
        URL(string: "\(authBase)/accounts:signUp?key=\(apiKey)")!
    }

    static var refreshToken: URL {
        URL(string: "\(tokenBase)/token?key=\(apiKey)")!
    }

    static var getUserData: URL {
        URL(string: "\(authBase)/accounts:lookup?key=\(apiKey)")!
    }

    // MARK: - Firestore REST API
    private static let firestoreBase = "https://firestore.googleapis.com/v1/projects/\(projectId)/databases/(default)/documents"

    /// GET/POST a collection, e.g. "users", "restaurants"
    static func collection(_ name: String) -> URL {
        URL(string: "\(firestoreBase)/\(name)")!
    }

    /// GET/PATCH/DELETE a specific document
    static func document(_ collection: String, id: String) -> URL {
        URL(string: "\(firestoreBase)/\(collection)/\(id)")!
    }

    /// POST runQuery (structured queries)
    static var runQuery: URL {
        URL(string: "\(firestoreBase):runQuery")!
    }

    // MARK: - Storage
    static let storageBucket = "albayt-sofra.firebasestorage.app"

    static func storageDownload(path: String) -> URL {
        // Firebase Storage REST API requires full path as a single URL component
        // where '/' must be encoded as '%2F'
        var allowed = CharacterSet.urlPathAllowed
        allowed.remove("/")
        let encoded = path.addingPercentEncoding(withAllowedCharacters: allowed) ?? path
        return URL(string: "https://firebasestorage.googleapis.com/v0/b/\(storageBucket)/o/\(encoded)?alt=media")!
    }

    /// Upload to Firebase Storage (returns metadata JSON, use storageDownload for the actual URL)
    static func storageUpload(path: String) -> URL {
        var allowed = CharacterSet.urlPathAllowed
        allowed.remove("/")
        let encoded = path.addingPercentEncoding(withAllowedCharacters: allowed) ?? path
        return URL(string: "https://firebasestorage.googleapis.com/v0/b/\(storageBucket)/o/\(encoded)")!
    }
}
