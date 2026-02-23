// APIClient.swift
// Central HTTP client wrapping URLSession with auth token injection

import Foundation

actor APIClient {
    static let shared = APIClient()
    private let session: URLSession
    private let decoder = JSONDecoder()

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 30
        config.timeoutIntervalForResource = 60
        self.session = URLSession(configuration: config)
    }

    // MARK: - Generic Request
    func request<T: Decodable>(
        url: URL,
        method: String = "GET",
        body: Data? = nil,
        token: String? = nil,
        headers: [String: String] = [:]
    ) async throws -> T {
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        for (key, value) in headers {
            req.setValue(value, forHTTPHeaderField: key)
        }
        if let body {
            req.httpBody = body
        }

        Logger.log("\(method) \(url.absoluteString)", level: .debug)

        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await session.data(for: req)
        } catch {
            throw APIError.networkError(error)
        }

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.unknown("Invalid response type")
        }

        switch httpResponse.statusCode {
        case 200...299:
            break
        case 401:
            throw APIError.unauthorized
        case 403:
            throw APIError.forbidden
        case 404:
            throw APIError.notFound
        default:
            // Try to extract Firebase error message
            if let errorBody = try? JSONDecoder().decode(FirebaseErrorResponse.self, from: data) {
                throw APIError.firebaseError(errorBody.error.message)
            }
            throw APIError.serverError(httpResponse.statusCode)
        }

        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            Logger.log("Decoding error: \(error)", level: .error)
            throw APIError.decodingError(error)
        }
    }

    // MARK: - Fire-and-forget (for PATCH/DELETE that return empty or non-typed body)
    func send(
        url: URL,
        method: String,
        body: Data? = nil,
        token: String? = nil
    ) async throws {
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        if let body {
            req.httpBody = body
        }

        let (data, response): (Data, URLResponse)
        do {
            (data, response) = try await session.data(for: req)
        } catch {
            throw APIError.networkError(error)
        }
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            if let errorBody = try? JSONDecoder().decode(FirebaseErrorResponse.self, from: data) {
                throw APIError.firebaseError(errorBody.error.message)
            }
            throw APIError.serverError((response as? HTTPURLResponse)?.statusCode ?? 0)
        }
    }
}

// MARK: - Firebase Error Shape
struct FirebaseErrorResponse: Decodable {
    let error: FirebaseErrorDetail
}

struct FirebaseErrorDetail: Decodable {
    let code: Int
    let message: String
}
