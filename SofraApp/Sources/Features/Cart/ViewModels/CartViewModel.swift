// CartViewModel.swift
// Cart state management — mirrors web useCart hook (localStorage-based)
// Uses @AppStorage for persistence (equivalent to web's localStorage key 'broast_cart')

import SwiftUI

/// Cart item matching web's CartItem type
struct CartItem: Identifiable, Codable, Equatable {
    let id: String
    let name: String
    let price: Double
    var qty: Int
    let ownerId: String?

    var lineTotal: Double { price * Double(qty) }
}

@MainActor
final class CartViewModel: ObservableObject {
    private static let storageKey = "broast_cart"

    @Published var items: [CartItem] = []

    var subtotal: Double {
        items.reduce(0) { $0 + $1.lineTotal }
    }

    var isEmpty: Bool { items.isEmpty }

    init() {
        loadFromStorage()
    }

    // MARK: - Add Item
    func addItem(_ menuItem: MenuItem, qty: Int = 1) {
        if let idx = items.firstIndex(where: { $0.id == menuItem.id }) {
            items[idx].qty += qty
        } else {
            let cartItem = CartItem(
                id: menuItem.id,
                name: menuItem.name,
                price: menuItem.finalPrice,
                qty: qty,
                ownerId: menuItem.ownerId
            )
            items.append(cartItem)
        }
        saveToStorage()
    }

    // MARK: - Remove Item
    func removeItem(id: String) {
        items.removeAll { $0.id == id }
        saveToStorage()
    }

    // MARK: - Change Quantity
    func changeQty(id: String, qty: Int) {
        guard let idx = items.firstIndex(where: { $0.id == id }) else { return }
        items[idx].qty = max(1, qty)
        saveToStorage()
    }

    // MARK: - Clear
    func clear() {
        items = []
        saveToStorage()
    }

    // MARK: - Restaurant ID (all items must be from same restaurant)
    var restaurantOwnerId: String? {
        items.first?.ownerId
    }

    // MARK: - Persistence (UserDefaults, equivalent to web localStorage)
    private func saveToStorage() {
        if let data = try? JSONEncoder().encode(items) {
            UserDefaults.standard.set(data, forKey: CartViewModel.storageKey)
        }
    }

    private func loadFromStorage() {
        guard let data = UserDefaults.standard.data(forKey: CartViewModel.storageKey),
              let stored = try? JSONDecoder().decode([CartItem].self, from: data)
        else { return }
        items = stored
    }
}
