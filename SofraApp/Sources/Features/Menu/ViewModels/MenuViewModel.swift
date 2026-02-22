// MenuViewModel.swift
// Loads menu items for a specific restaurant

import Foundation

final class MenuViewModel: ObservableObject {
    @Published var menuItems: [MenuItem] = []
    @Published var restaurant: Restaurant?
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let firestoreService = FirestoreService()

    /// Grouped items by category
    var groupedItems: [(category: String, items: [MenuItem])] {
        let available = menuItems.filter { $0.available }
        let grouped = Dictionary(grouping: available) { $0.category ?? "عام" }
        return grouped
            .map { (category: $0.key, items: $0.value) }
            .sorted { $0.category < $1.category }
    }

    func loadMenu(restaurantId: String, token: String?) async {
        guard let token else { return }

        isLoading = true
        errorMessage = nil

        do {
            // Load restaurant info
            let restDoc = try await firestoreService.getDocument(
                collection: "restaurants", id: restaurantId, idToken: token
            )
            self.restaurant = Restaurant(from: restDoc)

            // Query menu items for this restaurant
            let docs = try await firestoreService.query(
                collection: "menuItems",
                filters: [QueryFilter(field: "ownerId", op: "EQUAL", value: restaurantId)],
                idToken: token
            )
            self.menuItems = docs.map { MenuItem(from: $0) }
                .sorted { ($0.orderCount ?? 0) > ($1.orderCount ?? 0) }
        } catch {
            Logger.log("Menu load error: \(error)", level: .error)
            errorMessage = "تعذر تحميل القائمة"
        }

        isLoading = false
    }
}
