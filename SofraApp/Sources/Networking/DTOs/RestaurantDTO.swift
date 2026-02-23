// RestaurantDTO.swift
// Restaurant model matching web app's Restaurant interface

import Foundation

struct Restaurant: Identifiable {
    let id: String           // doc ID = ownerId (one-to-one)
    var name: String
    var ownerId: String
    var email: String?
    var phone: String?
    var city: String?
    var location: String?    // address description
    var logoUrl: String?
    var coverUrl: String?
    var isOpen: Bool
    var allowDelivery: Bool
    var allowPickup: Bool
    var packageType: PackageType
    var isVerified: Bool
    var sellerTier: SellerTier
    var averageRating: Double?
    var totalOrders: Int?
    var announcement: String?
    var isHiring: Bool
    var hiringDescription: String?
    // Coordinates for distance filtering
    var latitude: Double?
    var longitude: Double?
    // Menu item count for completeness check
    var menuItemCount: Int?

    enum PackageType: String {
        case free, premium
    }

    enum SellerTier: String {
        case bronze, silver, gold
    }

    // MARK: - Init from Firestore
    init(from doc: FirestoreDocumentResponse) {
        let f = doc.fields ?? [:]
        self.id = doc.documentId ?? ""
        self.name = f["name"]?.stringVal ?? "مطعم"
        self.ownerId = f["ownerId"]?.stringVal ?? doc.documentId ?? ""
        self.email = f["email"]?.stringVal
        self.phone = f["phone"]?.stringVal
        self.city = f["city"]?.stringVal
        self.location = f["location"]?.stringVal
        self.logoUrl = f["logoUrl"]?.stringVal
        self.coverUrl = f["coverUrl"]?.stringVal
        self.isOpen = f["isOpen"]?.boolVal ?? true
        self.allowDelivery = f["allowDelivery"]?.boolVal ?? true
        self.allowPickup = f["allowPickup"]?.boolVal ?? false
        self.packageType = PackageType(rawValue: f["packageType"]?.stringVal ?? "free") ?? .free
        self.isVerified = f["isVerified"]?.boolVal ?? false
        self.sellerTier = SellerTier(rawValue: f["sellerTier"]?.stringVal ?? "bronze") ?? .bronze
        self.averageRating = f["averageRating"]?.doubleVal
        self.totalOrders = f["totalOrders"]?.intVal
        self.announcement = f["announcement"]?.stringVal
        self.isHiring = f["isHiring"]?.boolVal ?? false
        self.hiringDescription = f["hiringDescription"]?.stringVal
        self.menuItemCount = f["menuItemCount"]?.intVal

        // Parse coordinates from savedLocation or location map
        if let locMap = f["savedLocation"]?.mapVal {
            self.latitude = locMap["lat"]?.doubleVal
            self.longitude = locMap["lng"]?.doubleVal
        } else if let locMap = f["coordinates"]?.mapVal {
            self.latitude = locMap["lat"]?.doubleVal
            self.longitude = locMap["lng"]?.doubleVal
        }
    }

    /// Tier icon for display
    var tierIcon: String {
        switch sellerTier {
        case .bronze: return "medal"
        case .silver: return "medal.fill"
        case .gold:   return "crown.fill"
        }
    }

    /// Rating display string
    var ratingText: String {
        guard let r = averageRating else { return "جديد" }
        return String(format: "%.1f", r)
    }

    /// Whether this restaurant has coordinates set
    var hasCoordinates: Bool {
        latitude != nil && longitude != nil
    }

    /// Distance in km from a given location. Returns nil if restaurant has no coordinates.
    func distanceKm(fromLat: Double, fromLng: Double) -> Double? {
        guard let lat = latitude, let lng = longitude else { return nil }
        let earthRadius = 6371.0 // km
        let dLat = (lat - fromLat) * .pi / 180
        let dLng = (lng - fromLng) * .pi / 180
        let a = sin(dLat / 2) * sin(dLat / 2) +
                cos(fromLat * .pi / 180) * cos(lat * .pi / 180) *
                sin(dLng / 2) * sin(dLng / 2)
        let c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return earthRadius * c
    }

    /// Formatted distance text
    func distanceText(fromLat: Double, fromLng: Double) -> String? {
        guard let km = distanceKm(fromLat: fromLat, fromLng: fromLng) else { return nil }
        if km < 1 {
            return "\(Int(km * 1000)) م"
        }
        return String(format: "%.1f كم", km)
    }
}
