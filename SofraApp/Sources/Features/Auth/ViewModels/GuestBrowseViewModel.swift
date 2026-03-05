// GuestBrowseViewModel.swift
// ViewModel for guest restaurant browsing - uses anonymous auth

import Foundation
import Observation

@Observable
final class GuestBrowseViewModel {
    var restaurants: [Restaurant] = []
    var isLoading = false
    var errorMessage: String?
    
    private let firestoreService = FirestoreService()
    
    // MARK: - Load Restaurants as Guest
    func loadRestaurantsAsGuest() async {
        isLoading = true
        errorMessage = nil
        
        do {
            // Load restaurants without authentication (public read)
            let docs = try await firestoreService.listDocumentsPublic(
                collection: "restaurants",
                pageSize: 100
            )
            
            var allRestaurants = docs.map { Restaurant(from: $0) }
            
            // Sort: open first, then alphabetically
            allRestaurants.sort { a, b in
                if a.isOpen != b.isOpen { return a.isOpen && !b.isOpen }
                return a.name < b.name
            }
            
            restaurants = allRestaurants
            
            // Prefetch images
            let imageURLs = allRestaurants.compactMap { $0.logoUrl ?? $0.coverUrl }.compactMap { URL(string: $0) }
            ImageCache.shared.prefetch(imageURLs)
            
        } catch {
            Logger.log("Guest browse error: \(error)", level: .error)
            errorMessage = "تعذر تحميل المطاعم. يرجى المحاولة لاحقاً"
        }
        
        isLoading = false
    }
    
    // MARK: - Load Menu Items for Guest
    func loadMenuItems(restaurantId: String) async throws -> (Restaurant?, [MenuItem]) {
        // Load restaurant (public read)
        let restaurantDoc = try await firestoreService.getDocumentPublic(
            collection: "restaurants",
            id: restaurantId
        )
        let restaurant = Restaurant(from: restaurantDoc)
        
        // Load menu items (public query by ownerId which is the restaurant ID)
        let menuDocs = try await firestoreService.queryPublic(
            collection: "menuItems",
            filters: [QueryFilter(field: "ownerId", op: "EQUAL", value: restaurantId)]
        )
        
        var items = menuDocs.map { MenuItem(from: $0) }
        
        // Sort by category then name
        items.sort { a, b in
            let catA = a.category ?? ""
            let catB = b.category ?? ""
            if catA != catB { return catA < catB }
            return a.name < b.name
        }
        
        return (restaurant, items)
    }
}
