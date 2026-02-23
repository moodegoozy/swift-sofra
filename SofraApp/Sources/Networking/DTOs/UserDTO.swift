// UserDTO.swift
// App user model matching web app's User interface in src/types/index.ts

import Foundation

struct AppUser: Identifiable {
    let uid: String
    var email: String
    var name: String?
    var phone: String?
    var city: String?
    var address: String?
    var role: UserRole
    var savedLocation: SavedLocation?
    var location: GeoLocation?
    var createdAt: Date?

    var id: String { uid }

    var displayName: String {
        name ?? email.split(separator: "@").first.map(String.init) ?? "مستخدم"
    }

    // MARK: - Init from Firestore document
    init(from doc: FirestoreDocumentResponse) {
        let f = doc.fields ?? [:]
        self.uid = doc.documentId ?? ""
        self.email = f["email"]?.stringVal ?? ""
        self.name = f["name"]?.stringVal
        self.phone = f["phone"]?.stringVal
        self.city = f["city"]?.stringVal
        self.address = f["address"]?.stringVal
        self.role = UserRole(rawValue: f["role"]?.stringVal ?? "customer") ?? .customer
        self.createdAt = f["createdAt"]?.dateVal

        // Location fields
        if let locMap = f["savedLocation"]?.mapVal {
            self.savedLocation = SavedLocation(
                lat: locMap["lat"]?.doubleVal ?? 0,
                lng: locMap["lng"]?.doubleVal ?? 0,
                address: locMap["address"]?.stringVal ?? ""
            )
        }
        if let locMap = f["location"]?.mapVal {
            self.location = GeoLocation(
                lat: locMap["lat"]?.doubleVal ?? 0,
                lng: locMap["lng"]?.doubleVal ?? 0
            )
        }
    }

    // MARK: - Manual init
    init(uid: String, email: String, name: String? = nil, phone: String? = nil, city: String? = nil, role: UserRole = .customer) {
        self.uid = uid
        self.email = email
        self.name = name
        self.phone = phone
        self.city = city
        self.role = role
    }

    // MARK: - To Firestore fields
    func toFirestoreFields() -> [String: Any] {
        var fields: [String: Any] = [
            "email": email,
            "role": role.rawValue
        ]
        if let name { fields["name"] = name }
        if let phone { fields["phone"] = phone }
        if let city { fields["city"] = city }
        if let address { fields["address"] = address }
        if let loc = savedLocation {
            fields["savedLocation"] = [
                "lat": loc.lat,
                "lng": loc.lng,
                "address": loc.address
            ] as [String: Any]
        }
        if let geo = location {
            fields["location"] = [
                "lat": geo.lat,
                "lng": geo.lng
            ] as [String: Any]
        }
        return fields
    }
}

// MARK: - Supporting Types
struct SavedLocation {
    let lat: Double
    let lng: Double
    let address: String
}

struct GeoLocation {
    let lat: Double
    let lng: Double
}
