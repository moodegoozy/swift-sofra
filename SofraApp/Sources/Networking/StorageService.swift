// StorageService.swift
// Firebase Storage REST API upload service

import Foundation

final class StorageService {
    static let shared = StorageService()
    private let session: URLSession

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 120
        config.timeoutIntervalForResource = 300
        self.session = URLSession(configuration: config)
    }

    /// Uploads image data to Firebase Storage and returns the public download URL.
    /// - Parameters:
    ///   - data: The image data (JPEG)
    ///   - path: Storage path, e.g. "restaurants/uid/logo.jpg"
    ///   - token: Firebase ID token for auth
    /// - Returns: The full download URL string
    func uploadImage(data: Data, path: String, token: String) async throws -> String {
        let url = Endpoints.storageUpload(path: path)

        var components = URLComponents(url: url, resolvingAgainstBaseURL: false)!
        components.queryItems = [URLQueryItem(name: "uploadType", value: "media")]

        var request = URLRequest(url: components.url!)
        request.httpMethod = "POST"
        request.setValue("image/jpeg", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.httpBody = data

        Logger.log("Storage upload: \(path) (\(data.count) bytes)", level: .debug)

        let (responseData, response) = try await session.data(for: request)

        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0
            Logger.log("Storage upload failed: \(statusCode)", level: .error)
            throw APIError.serverError(statusCode)
        }

        // Parse the response to get the file name for building the download URL
        guard let json = try? JSONSerialization.jsonObject(with: responseData) as? [String: Any],
              let name = json["name"] as? String else {
            throw APIError.unknown("Could not parse storage upload response")
        }

        // Build the public download URL with token
        let downloadUrl = Endpoints.storageDownload(path: name)
        return downloadUrl.absoluteString
    }
}
