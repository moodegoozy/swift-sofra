// CourierApplicationDTO.swift
// Courier hiring application model

import Foundation
import SwiftUI

struct CourierApplication: Identifiable {
    let id: String
    var courierId: String
    var courierName: String
    var courierPhone: String
    var vehicleType: String
    var restaurantId: String
    var restaurantName: String
    var status: ApplicationStatus
    var createdAt: Date?

    enum ApplicationStatus: String {
        case pending, approved, rejected

        var arabicLabel: String {
            switch self {
            case .pending:  return "معلق"
            case .approved: return "معتمد"
            case .rejected: return "مرفوض"
            }
        }

        var color: Color {
            switch self {
            case .pending:  return SofraColors.warning
            case .approved: return SofraColors.success
            case .rejected: return SofraColors.error
            }
        }
    }

    init(id: String, courierId: String, courierName: String, courierPhone: String, vehicleType: String, restaurantId: String, restaurantName: String, status: ApplicationStatus, createdAt: Date?) {
        self.id = id
        self.courierId = courierId
        self.courierName = courierName
        self.courierPhone = courierPhone
        self.vehicleType = vehicleType
        self.restaurantId = restaurantId
        self.restaurantName = restaurantName
        self.status = status
        self.createdAt = createdAt
    }

    init(from doc: FirestoreDocumentResponse) {
        let f = doc.fields ?? [:]
        self.id = doc.documentId ?? ""
        self.courierId = f["courierId"]?.stringVal ?? ""
        self.courierName = f["courierName"]?.stringVal ?? ""
        self.courierPhone = f["courierPhone"]?.stringVal ?? ""
        self.vehicleType = f["vehicleType"]?.stringVal ?? ""
        self.restaurantId = f["restaurantId"]?.stringVal ?? ""
        self.restaurantName = f["restaurantName"]?.stringVal ?? ""
        self.status = ApplicationStatus(rawValue: f["status"]?.stringVal ?? "pending") ?? .pending
        self.createdAt = f["createdAt"]?.dateVal
    }
}
