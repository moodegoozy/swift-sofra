// RestaurantsViewModel.swift
// Loads and manages restaurant list data

import Foundation
import Observation

@Observable
final class RestaurantsViewModel {
    var restaurants: [Restaurant] = []
    var isLoading = false
    var errorMessage: String?

    /// Maximum distance in km for "nearby" filter
    static let maxDistanceKm: Double = 25.0

    private let firestoreService = FirestoreService()

    func loadRestaurants(token: String?, userLat: Double = 0, userLng: Double = 0, showAll: Bool = false, nearbyOnly: Bool = false) async {
        guard let token else {
            errorMessage = "يرجى تسجيل الدخول"
            return
        }

        isLoading = true
        errorMessage = nil

        do {
            let docs = try await firestoreService.listDocuments(
                collection: "restaurants",
                idToken: token,
                pageSize: 100
            )
            var allRestaurants = docs.map { Restaurant(from: $0) }

            // For owner dashboard (showAll), skip all client filters
            if showAll {
                allRestaurants.sort { ($0.isOpen ? 1 : 0) > ($1.isOpen ? 1 : 0) }
                restaurants = allRestaurants
                isLoading = false
                return
            }

            // Sort: open first, then by distance or popularity
            let hasUserLocation = userLat != 0 || userLng != 0

            // Nearby filter: only show restaurants within 25km
            if nearbyOnly && hasUserLocation {
                allRestaurants = allRestaurants.filter { restaurant in
                    guard let km = restaurant.distanceKm(fromLat: userLat, fromLng: userLng) else {
                        return true // show restaurants without coordinates
                    }
                    return km <= Self.maxDistanceKm
                }
            }

            if hasUserLocation {
                allRestaurants.sort { a, b in
                    let distA = a.distanceKm(fromLat: userLat, fromLng: userLng) ?? Double.greatestFiniteMagnitude
                    let distB = b.distanceKm(fromLat: userLat, fromLng: userLng) ?? Double.greatestFiniteMagnitude
                    if a.isOpen != b.isOpen { return a.isOpen && !b.isOpen }
                    return distA < distB
                }
            } else {
                allRestaurants.sort { ($0.isOpen ? 1 : 0) > ($1.isOpen ? 1 : 0) }
            }

            restaurants = allRestaurants

            // Prefetch restaurant logos
            let imageURLs = allRestaurants.compactMap { $0.logoUrl ?? $0.coverUrl }.compactMap { URL(string: $0) }
            ImageCache.shared.prefetch(imageURLs)
        } catch {
            Logger.log("Failed to load restaurants: \(error)", level: .error)
            errorMessage = "تعذر تحميل قائمة المطاعم"
        }

        isLoading = false
    }
}
