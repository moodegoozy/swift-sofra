// FirestoreDocument.swift
// Generic Firestore REST API document parsing
// Firestore REST returns typed value wrappers: { "stringValue": "..." , "integerValue": "42" }

import Foundation

/// Raw Firestore document from REST API
struct FirestoreDocumentResponse: Decodable {
    let name: String?  // full path: projects/.../documents/collection/docId
    let fields: [String: FirestoreValue]?
    let createTime: String?
    let updateTime: String?

    /// Extract just the document ID from the full path
    var documentId: String? {
        name?.split(separator: "/").last.map(String.init)
    }

    // MARK: - Convenience Field Accessors
    func stringField(_ key: String) -> String? {
        fields?[key]?.stringVal
    }

    func intField(_ key: String) -> Int? {
        fields?[key]?.intVal
    }

    func doubleField(_ key: String) -> Double? {
        fields?[key]?.doubleVal
    }

    func boolField(_ key: String) -> Bool? {
        fields?[key]?.boolVal
    }

    func dateField(_ key: String) -> Date? {
        fields?[key]?.dateVal
    }

    func mapField(_ key: String) -> [String: FirestoreValue]? {
        fields?[key]?.mapVal
    }

    func arrayField(_ key: String) -> [FirestoreValue]? {
        fields?[key]?.arrayVal
    }
}

/// Firestore list response
struct FirestoreListResponse: Decodable {
    let documents: [FirestoreDocumentResponse]?
    let nextPageToken: String?
}

/// Firestore runQuery response item
struct FirestoreQueryResult: Decodable {
    let document: FirestoreDocumentResponse?
    let readTime: String?
}

/// Typed value wrapper from Firestore REST
enum FirestoreValue: Decodable {
    case string(String)
    case integer(String)   // Firestore sends integers as strings
    case double(Double)
    case boolean(Bool)
    case timestamp(String)
    case null
    case map([String: FirestoreValue])
    case array([FirestoreValue])
    case geoPoint(latitude: Double, longitude: Double)

    enum CodingKeys: String, CodingKey {
        case stringValue, integerValue, doubleValue, booleanValue
        case timestampValue, nullValue, mapValue, arrayValue, geoPointValue
    }

    struct MapWrapper: Decodable {
        let fields: [String: FirestoreValue]?
    }

    struct ArrayWrapper: Decodable {
        let values: [FirestoreValue]?
    }

    struct GeoPointWrapper: Decodable {
        let latitude: Double
        let longitude: Double
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        if let v = try? container.decode(String.self, forKey: .stringValue) {
            self = .string(v); return
        }
        if let v = try? container.decode(String.self, forKey: .integerValue) {
            self = .integer(v); return
        }
        if let v = try? container.decode(Double.self, forKey: .doubleValue) {
            self = .double(v); return
        }
        if let v = try? container.decode(Bool.self, forKey: .booleanValue) {
            self = .boolean(v); return
        }
        if let v = try? container.decode(String.self, forKey: .timestampValue) {
            self = .timestamp(v); return
        }
        if (try? container.decodeNil(forKey: .nullValue)) != nil {
            self = .null; return
        }
        if let wrapper = try? container.decode(MapWrapper.self, forKey: .mapValue) {
            self = .map(wrapper.fields ?? [:]); return
        }
        if let wrapper = try? container.decode(ArrayWrapper.self, forKey: .arrayValue) {
            self = .array(wrapper.values ?? []); return
        }
        if let geo = try? container.decode(GeoPointWrapper.self, forKey: .geoPointValue) {
            self = .geoPoint(latitude: geo.latitude, longitude: geo.longitude); return
        }
        self = .null
    }

    // MARK: - Convenience Accessors
    var stringVal: String? {
        if case .string(let v) = self { return v }
        return nil
    }

    var intVal: Int? {
        if case .integer(let v) = self { return Int(v) }
        if case .double(let v) = self { return Int(v) }
        return nil
    }

    var doubleVal: Double? {
        if case .double(let v) = self { return v }
        if case .integer(let v) = self { return Double(v) }
        return nil
    }

    var boolVal: Bool? {
        if case .boolean(let v) = self { return v }
        return nil
    }

    var dateVal: Date? {
        if case .timestamp(let v) = self { return Date(firestoreTimestamp: v) }
        return nil
    }

    var mapVal: [String: FirestoreValue]? {
        if case .map(let v) = self { return v }
        return nil
    }

    var arrayVal: [FirestoreValue]? {
        if case .array(let v) = self { return v }
        return nil
    }
}

// MARK: - Encode Firestore Fields
/// Converts a Swift dictionary to Firestore REST fields format
enum FirestoreEncoder {
    static func encode(_ dict: [String: Any]) -> [String: Any] {
        var fields: [String: Any] = [:]
        for (key, value) in dict {
            fields[key] = encodeValue(value)
        }
        return fields
    }

    static func encodeValue(_ value: Any) -> [String: Any] {
        switch value {
        case let v as Bool:
            return ["booleanValue": v]
        case let v as String:
            return ["stringValue": v]
        case let v as Int:
            return ["integerValue": String(v)]
        case let v as Double:
            return ["doubleValue": v]
        case let v as Date:
            return ["timestampValue": ISO8601DateFormatter().string(from: v)]
        case let v as [String: Any]:
            return ["mapValue": ["fields": encode(v)]]
        case let v as [Any]:
            return ["arrayValue": ["values": v.map { encodeValue($0) }]]
        default:
            return ["nullValue": NSNull()]
        }
    }

    static func documentBody(_ fields: [String: Any]) throws -> Data {
        let body: [String: Any] = ["fields": encode(fields)]
        return try JSONSerialization.data(withJSONObject: body)
    }
}
