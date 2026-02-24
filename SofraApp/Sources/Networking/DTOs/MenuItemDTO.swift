// MenuItemDTO.swift
// Menu item model matching web app's MenuItem interface

import Foundation

struct MenuItem: Identifiable {
    let id: String
    var name: String
    var description: String?
    var price: Double
    var imageUrl: String?
    var available: Bool
    var category: String?
    var ownerId: String
    var discountPercent: Double?
    var orderCount: Int?

    /// Final price after discount
    var finalPrice: Double {
        guard let discount = discountPercent, discount > 0 else { return price }
        return price * (1 - discount / 100)
    }

    /// Has active discount
    var hasDiscount: Bool {
        guard let d = discountPercent else { return false }
        return d > 0
    }

    // MARK: - Init from Firestore
    init(from doc: FirestoreDocumentResponse) {
        let f = doc.fields ?? [:]
        self.id = doc.documentId ?? ""
        self.name = f["name"]?.stringVal ?? ""
        self.description = f["desc"]?.stringVal ?? f["description"]?.stringVal
        self.price = f["price"]?.doubleVal ?? 0
        self.imageUrl = f["imageUrl"]?.stringVal
        self.available = f["available"]?.boolVal ?? true
        self.category = f["category"]?.stringVal ?? f["categoryId"]?.stringVal
        self.ownerId = f["ownerId"]?.stringVal ?? ""
        self.discountPercent = f["discountPercent"]?.doubleVal
        self.orderCount = f["orderCount"]?.intVal
    }

    /// Manual init (for cart items, new items, etc.)
    init(id: String, name: String, desc: String? = nil, price: Double, category: String? = nil, imageUrl: String? = nil, available: Bool = true, ownerId: String) {
        self.id = id
        self.name = name
        self.description = desc
        self.price = price
        self.category = category
        self.imageUrl = imageUrl
        self.available = available
        self.ownerId = ownerId
    }
}
