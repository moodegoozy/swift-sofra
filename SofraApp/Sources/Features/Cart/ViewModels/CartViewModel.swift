// CartViewModel.swift
// Cart state management — mirrors web useCart hook (localStorage-based)
// Uses @AppStorage for persistence (equivalent to web's localStorage key 'broast_cart')

import SwiftUI
import Observation

/// Cart item matching web's CartItem type
struct CartItem: Identifiable, Codable, Equatable, Sendable {
    let id: String
    let name: String
    let price: Double
    var qty: Int
    let ownerId: String?

    var lineTotal: Double { price * Double(qty) }
}

@Observable
final class CartViewModel {
    private static let storageKey = "broast_cart"
    private static let nameKey = "broast_cart_restaurant"
    private static let maxQty = 99

    var items: [CartItem] = []
    var restaurantName: String = ""

    // Restaurant change alert state
    var showRestaurantChangeAlert = false
    private var pendingRestaurantName: String?
    private var pendingMenuItem: MenuItem?

    var subtotal: Double {
        items.reduce(0) { $0 + $1.lineTotal }
    }

    var isEmpty: Bool { items.isEmpty }

    init() {
        loadFromStorage()
    }

    // MARK: - Add Item
    func addItem(_ menuItem: MenuItem, qty: Int = 1, restaurantName: String? = nil) {
        // Prevent mixing items from different restaurants
        if !items.isEmpty, let existingOwner = items.first?.ownerId, existingOwner != menuItem.ownerId {
            pendingMenuItem = menuItem
            pendingRestaurantName = restaurantName
            showRestaurantChangeAlert = true
            return
        }
        if let rn = restaurantName { self.restaurantName = rn }
        if let idx = items.firstIndex(where: { $0.id == menuItem.id }) {
            items[idx].qty = min(items[idx].qty + qty, Self.maxQty)
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
        items[idx].qty = max(1, min(qty, Self.maxQty))
        saveToStorage()
    }

    // MARK: - Clear
    func clear() {
        items = []
        restaurantName = ""
        saveToStorage()
    }

    // MARK: - Restaurant Change Confirmation
    func confirmRestaurantChange() {
        guard let item = pendingMenuItem else { return }
        items = []
        restaurantName = pendingRestaurantName ?? ""
        let cartItem = CartItem(
            id: item.id, name: item.name, price: item.finalPrice,
            qty: 1, ownerId: item.ownerId
        )
        items.append(cartItem)
        pendingMenuItem = nil
        pendingRestaurantName = nil
        saveToStorage()
    }

    func cancelRestaurantChange() {
        pendingMenuItem = nil
        pendingRestaurantName = nil
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
        UserDefaults.standard.set(restaurantName, forKey: CartViewModel.nameKey)
    }

    private func loadFromStorage() {
        guard let data = UserDefaults.standard.data(forKey: CartViewModel.storageKey),
              let stored = try? JSONDecoder().decode([CartItem].self, from: data)
        else { return }
        items = stored
        restaurantName = UserDefaults.standard.string(forKey: CartViewModel.nameKey) ?? ""
    }
}
