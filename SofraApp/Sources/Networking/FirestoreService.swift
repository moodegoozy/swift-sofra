// FirestoreService.swift
// Firestore REST API operations: CRUD + queries

import Foundation

final class FirestoreService {
    private let client = APIClient.shared

    // MARK: - Get Single Document
    func getDocument(collection: String, id: String, idToken: String) async throws -> FirestoreDocumentResponse {
        let url = Endpoints.document(collection, id: id)
        return try await client.request(url: url, token: idToken)
    }

    // MARK: - List Documents
    func listDocuments(collection: String, idToken: String, pageSize: Int = 100, orderBy: String? = nil) async throws -> [FirestoreDocumentResponse] {
        var components = URLComponents(url: Endpoints.collection(collection), resolvingAgainstBaseURL: false)!
        var items = [URLQueryItem(name: "pageSize", value: String(pageSize))]
        if let orderBy {
            items.append(URLQueryItem(name: "orderBy", value: orderBy))
        }
        components.queryItems = items
        let response: FirestoreListResponse = try await client.request(url: components.url!, token: idToken)
        return response.documents ?? []
    }

    // MARK: - Create Document (with specific ID)
    func createDocument(collection: String, id: String, fields: [String: Any], idToken: String) async throws {
        let url = Endpoints.collection(collection)
        var components = URLComponents(url: url, resolvingAgainstBaseURL: false)!
        components.queryItems = [URLQueryItem(name: "documentId", value: id)]
        let body = try FirestoreEncoder.documentBody(fields)
        try await client.send(url: components.url!, method: "POST", body: body, token: idToken)
    }

    // MARK: - Update Document (PATCH)
    func updateDocument(collection: String, id: String, fields: [String: Any], idToken: String) async throws {
        let url = Endpoints.document(collection, id: id)
        // Build update mask from field keys
        var components = URLComponents(url: url, resolvingAgainstBaseURL: false)!
        components.queryItems = fields.keys.map { URLQueryItem(name: "updateMask.fieldPaths", value: $0) }
        let body = try FirestoreEncoder.documentBody(fields)
        try await client.send(url: components.url!, method: "PATCH", body: body, token: idToken)
    }

    // MARK: - Delete Document
    func deleteDocument(collection: String, id: String, idToken: String) async throws {
        let url = Endpoints.document(collection, id: id)
        try await client.send(url: url, method: "DELETE", token: idToken)
    }

    // MARK: - Structured Query
    func query(
        collection: String,
        filters: [QueryFilter] = [],
        orderBy: String? = nil,
        descending: Bool = false,
        limit: Int? = nil,
        idToken: String
    ) async throws -> [FirestoreDocumentResponse] {
        var structuredQuery: [String: Any] = [
            "from": [["collectionId": collection]]
        ]

        // Composite filter
        if !filters.isEmpty {
            if filters.count == 1, let f = filters.first {
                structuredQuery["where"] = f.toDict()
            } else {
                structuredQuery["where"] = [
                    "compositeFilter": [
                        "op": "AND",
                        "filters": filters.map { $0.toDict() }
                    ]
                ]
            }
        }

        // OrderBy
        if let orderBy {
            structuredQuery["orderBy"] = [[
                "field": ["fieldPath": orderBy],
                "direction": descending ? "DESCENDING" : "ASCENDING"
            ]]
        }

        // Limit
        if let limit {
            structuredQuery["limit"] = limit
        }

        let bodyDict: [String: Any] = ["structuredQuery": structuredQuery]
        let bodyData = try JSONSerialization.data(withJSONObject: bodyDict)
        let results: [FirestoreQueryResult] = try await client.request(
            url: Endpoints.runQuery,
            method: "POST",
            body: bodyData,
            token: idToken
        )
        return results.compactMap { $0.document }
    }

    // MARK: - Convenience: Get User
    func getUser(uid: String, idToken: String) async throws -> AppUser {
        let doc = try await getDocument(collection: "users", id: uid, idToken: idToken)
        return AppUser(from: doc)
    }

    // MARK: - Convenience: Create User
    func createUser(_ user: AppUser, idToken: String) async throws {
        try await createDocument(
            collection: "users",
            id: user.uid,
            fields: user.toFirestoreFields(),
            idToken: idToken
        )
    }
}

// MARK: - Query Filter Helper
struct QueryFilter {
    let field: String
    let op: String   // "EQUAL", "LESS_THAN", "GREATER_THAN", "IN", etc.
    let value: Any

    func toDict() -> [String: Any] {
        return [
            "fieldFilter": [
                "field": ["fieldPath": field],
                "op": op,
                "value": FirestoreEncoder.encodeValue(value)
            ]
        ]
    }
}
