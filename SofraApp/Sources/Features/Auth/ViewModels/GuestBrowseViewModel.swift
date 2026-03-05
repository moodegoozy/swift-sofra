// GuestBrowseViewModel.swift
// ViewModel for guest restaurant browsing - uses anonymous auth

import Foundation
import Observation

@Observable
final class GuestBrowseViewModel {
    var restaurants: [Restaurant] = []
    var isLoading = false
    var errorMessage: String?
    
    private var guestToken: String?
    private let firestoreService = FirestoreService()
    private let client = APIClient.shared
    
    // MARK: - Load Restaurants as Guest
    func loadRestaurantsAsGuest() async {
        isLoading = true
        errorMessage = nil
        
        do {
            // Get guest token via anonymous auth
            let token = try await getGuestToken()
            
            // Load restaurants
            let docs = try await firestoreService.listDocuments(
                collection: "restaurants",
                idToken: token,
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
        let token = try await getGuestToken()
        
        // Load restaurant
        let restaurantDoc = try await firestoreService.getDocument(
            collection: "restaurants",
            id: restaurantId,
            idToken: token
        )
        let restaurant = Restaurant(from: restaurantDoc)
        
        // Load menu items (query by ownerId which is the restaurant ID)
        let menuDocs = try await firestoreService.query(
            collection: "menuItems",
            filters: [QueryFilter(field: "ownerId", op: "EQUAL", value: restaurantId)],
            idToken: token
        )
        
        var items = menuDocs.map { MenuItem(from: $0) }
        
        // Sort by category then name
        items.sort { a, b in
            if a.category != b.category { return a.category < b.category }
            return a.name < b.name
        }
        
        return (restaurant, items)
    }
    
    // MARK: - Anonymous Auth
    private func getGuestToken() async throws -> String {
        // Return cached token if available
        if let token = guestToken { return token }
        
        // Sign in anonymously using Firebase REST API
        let url = Endpoints.signInAnonymously
        let body: [String: Any] = ["returnSecureToken": true]
        let bodyData = try JSONSerialization.data(withJSONObject: body)
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = bodyData
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw APIError.serverError(message: "فشل في الحصول على صلاحية التصفح")
        }
        
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        guard let idToken = json?["idToken"] as? String else {
            throw APIError.serverError(message: "استجابة غير صالحة")
        }
        
        guestToken = idToken
        return idToken
    }
}
