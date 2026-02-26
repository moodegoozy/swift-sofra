// RestaurantsViewModel.swift
// Loads and manages restaurant list data with 20km distance filter

import Foundation
import Observation

@Observable
final class RestaurantsViewModel {
    var restaurants: [Restaurant] = []
    var isLoading = false
    var errorMessage: String?

    /// Maximum distance in km to show restaurants
    static let maxDistanceKm: Double = 20.0

    private let firestoreService = FirestoreService()

    func loadRestaurants(token: String?, userLat: Double = 0, userLng: Double = 0, showAll: Bool = false) async {
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

            if !showAll {
                // Filter out incomplete restaurants (missing name, phone, or no menu items)
                allRestaurants = allRestaurants.filter { restaurant in
                    let hasName = !restaurant.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                        && restaurant.name != "مطعم"
                    let hasPhone = !(restaurant.phone ?? "").trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
                    let hasMenuItems = (restaurant.menuItemCount ?? 0) > 0
                    return hasName && hasPhone && hasMenuItems
                }
            }

            // Skip distance filter when showAll is true (for owner dashboard)
            if showAll {
                allRestaurants.sort { ($0.isOpen ? 1 : 0) > ($1.isOpen ? 1 : 0) }
            } else {
                // Filter by distance (20km) if user has location
                let hasUserLocation = userLat != 0 || userLng != 0
                if hasUserLocation {
                    allRestaurants = allRestaurants.filter { restaurant in
                        guard let km = restaurant.distanceKm(fromLat: userLat, fromLng: userLng) else {
                            return true
                        }
                        return km <= Self.maxDistanceKm
                    }
                    allRestaurants.sort { a, b in
                        let distA = a.distanceKm(fromLat: userLat, fromLng: userLng) ?? Double.greatestFiniteMagnitude
                        let distB = b.distanceKm(fromLat: userLat, fromLng: userLng) ?? Double.greatestFiniteMagnitude
                        if a.isOpen != b.isOpen { return a.isOpen && !b.isOpen }
                        return distA < distB
                    }
                } else {
                    allRestaurants.sort { ($0.isOpen ? 1 : 0) > ($1.isOpen ? 1 : 0) }
                }
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
