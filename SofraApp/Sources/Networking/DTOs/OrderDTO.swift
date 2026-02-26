// OrderDTO.swift
// Order model matching web app's Order interface and status flow

import Foundation

struct Order: Identifiable {
    let id: String
    var customerId: String
    var items: [OrderItem]
    var subtotal: Double
    var deliveryFee: Double
    var total: Double
    var status: OrderStatus
    var address: String?
    var deliveryType: String?    // "delivery" | "pickup"
    var courierId: String?
    var notes: String?
    var restaurantName: String?
    var restaurantId: String?
    var customerName: String?
    // Commission / platform fee (legacy percentage system)
    var commissionRate: Double      // e.g. 15 = 15% (legacy, now 0)
    var commissionAmount: Double    // = serviceFeeTotal (for backward compat)
    var netAmount: Double           // total - commissionAmount (owner's earnings)
    // Service fee system (flat per-item fee)
    var serviceFeePerItem: Double   // 1.75 SAR
    var serviceFeeTotal: Double     // 1.75 × total item count
    var platformFee: Double         // platform's share of service fees
    var supervisorFee: Double       // supervisor's share (0 if no supervisor)
    var supervisorId: String?       // supervisor who added the restaurant (nil = self-registered)
    var createdAt: Date?
    var updatedAt: Date?

    // Timestamps for each phase
    var acceptedAt: Date?
    var readyAt: Date?
    var pickedUpAt: Date?
    var deliveredAt: Date?

    // MARK: - Manual Init (for previews & checkout)
    init(
        id: String,
        customerId: String,
        restaurantId: String? = nil,
        items: [OrderItem] = [],
        subtotal: Double = 0,
        deliveryFee: Double = 0,
        total: Double = 0,
        status: OrderStatus = .pending,
        address: String? = nil,
        restaurantName: String? = nil,
        courierId: String? = nil,
        notes: String? = nil,
        createdAt: Date? = nil,
        commissionRate: Double = 0,
        commissionAmount: Double = 0,
        netAmount: Double = 0,
        customerName: String? = nil,
        serviceFeePerItem: Double = ServiceFee.perItem,
        serviceFeeTotal: Double = 0,
        platformFee: Double = 0,
        supervisorFee: Double = 0,
        supervisorId: String? = nil
    ) {
        self.id = id
        self.customerId = customerId
        self.restaurantId = restaurantId
        self.items = items
        self.subtotal = subtotal
        self.deliveryFee = deliveryFee
        self.total = total
        self.status = status
        self.address = address
        self.restaurantName = restaurantName
        self.courierId = courierId
        self.notes = notes
        self.createdAt = createdAt
        self.commissionRate = commissionRate
        self.commissionAmount = commissionAmount
        self.netAmount = netAmount == 0 ? total : netAmount
        self.customerName = customerName
        self.serviceFeePerItem = serviceFeePerItem
        self.serviceFeeTotal = serviceFeeTotal
        self.platformFee = platformFee
        self.supervisorFee = supervisorFee
        self.supervisorId = supervisorId
    }

    // MARK: - Init from Firestore
    init(from doc: FirestoreDocumentResponse) {
        let f = doc.fields ?? [:]
        self.id = doc.documentId ?? ""
        self.customerId = f["customerId"]?.stringVal ?? ""
        self.subtotal = f["subtotal"]?.doubleVal ?? 0
        self.deliveryFee = f["deliveryFee"]?.doubleVal ?? 0
        self.total = f["total"]?.doubleVal ?? 0
        self.status = OrderStatus(rawValue: f["status"]?.stringVal ?? "pending") ?? .pending
        self.address = f["address"]?.stringVal
        self.deliveryType = f["deliveryType"]?.stringVal
        self.courierId = f["courierId"]?.stringVal
        self.notes = f["notes"]?.stringVal
        self.restaurantName = f["restaurantName"]?.stringVal
        self.restaurantId = f["restaurantId"]?.stringVal
        self.customerName = f["customerName"]?.stringVal
        self.commissionRate = f["commissionRate"]?.doubleVal ?? 0
        self.commissionAmount = f["commissionAmount"]?.doubleVal ?? 0
        let rawNet = f["netAmount"]?.doubleVal ?? 0
        self.netAmount = rawNet > 0 ? rawNet : self.total
        self.serviceFeePerItem = f["serviceFeePerItem"]?.doubleVal ?? ServiceFee.perItem
        self.serviceFeeTotal = f["serviceFeeTotal"]?.doubleVal ?? self.commissionAmount
        self.platformFee = f["platformFee"]?.doubleVal ?? 0
        self.supervisorFee = f["supervisorFee"]?.doubleVal ?? 0
        self.supervisorId = f["supervisorId"]?.stringVal
        self.createdAt = f["createdAt"]?.dateVal
        self.updatedAt = f["updatedAt"]?.dateVal

        // Parse items array
        if let itemsArray = f["items"]?.arrayVal {
            self.items = itemsArray.compactMap { val -> OrderItem? in
                guard let map = val.mapVal else { return nil }
                return OrderItem(
                    id: map["id"]?.stringVal ?? "",
                    name: map["name"]?.stringVal ?? "",
                    price: map["price"]?.doubleVal ?? 0,
                    qty: map["qty"]?.intVal ?? 1,
                    ownerId: map["ownerId"]?.stringVal
                )
            }
        } else {
            self.items = []
        }

        // Parse timestamps sub-document
        if let ts = f["timestamps"]?.mapVal {
            self.acceptedAt = ts["acceptedAt"]?.dateVal
            self.readyAt = ts["readyAt"]?.dateVal
            self.pickedUpAt = ts["pickedUpAt"]?.dateVal
            self.deliveredAt = ts["deliveredAt"]?.dateVal
        }
    }

    /// Status icon for display
    var statusIcon: String {
        switch status {
        case .pending:         return "clock"
        case .accepted:        return "checkmark.circle"
        case .preparing:       return "flame"
        case .ready:           return "bag.fill"
        case .outForDelivery:  return "car.fill"
        case .delivered:       return "checkmark.seal.fill"
        case .cancelled:       return "xmark.circle.fill"
        }
    }
}

// MARK: - Order Item
struct OrderItem: Identifiable {
    let id: String
    let name: String
    let price: Double
    let qty: Int
    let ownerId: String?

    var lineTotal: Double { price * Double(qty) }
}

// MARK: - Order Status
enum OrderStatus: String, CaseIterable {
    case pending
    case accepted
    case preparing
    case ready
    case outForDelivery = "out_for_delivery"
    case delivered
    case cancelled

    var arabicLabel: String {
        switch self {
        case .pending:        return "بانتظار القبول"
        case .accepted:       return "تم القبول"
        case .preparing:      return "قيد التحضير"
        case .ready:          return "جاهز"
        case .outForDelivery: return "في الطريق"
        case .delivered:      return "تم التوصيل"
        case .cancelled:      return "ملغي"
        }
    }
}
