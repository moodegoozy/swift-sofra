// HomeViewModel.swift
// Loads featured restaurants for the home screen — filtered by 20km

import Foundation
import Observation

@Observable
final class HomeViewModel {
    var featuredRestaurants: [Restaurant] = []
    var isLoading = false
    var errorMessage: String?

    private let firestoreService = FirestoreService()

    func loadData(token: String?, userLat: Double = 0, userLng: Double = 0) async {
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
                pageSize: 50
            )
            var restaurants = docs.map { Restaurant(from: $0) }
                .filter { $0.isOpen }

            // Filter by 20km if user has location
            let hasUserLocation = userLat != 0 || userLng != 0
            if hasUserLocation {
                restaurants = restaurants.filter { restaurant in
                    guard let km = restaurant.distanceKm(fromLat: userLat, fromLng: userLng) else {
                        return true // show restaurants without coordinates
                    }
                    return km <= RestaurantsViewModel.maxDistanceKm
                }
                // Sort by distance
                restaurants.sort { a, b in
                    let distA = a.distanceKm(fromLat: userLat, fromLng: userLng) ?? Double.greatestFiniteMagnitude
                    let distB = b.distanceKm(fromLat: userLat, fromLng: userLng) ?? Double.greatestFiniteMagnitude
                    return distA < distB
                }
            } else {
                restaurants.sort { ($0.totalOrders ?? 0) > ($1.totalOrders ?? 0) }
            }

            featuredRestaurants = restaurants

            // Prefetch restaurant logos
            let imageURLs = restaurants.compactMap { $0.logoUrl ?? $0.coverUrl }.compactMap { URL(string: $0) }
            ImageCache.shared.prefetch(imageURLs)
        } catch {
            Logger.log("Failed to load restaurants: \(error)", level: .error)
            errorMessage = "تعذر تحميل المطاعم. اسحب للأسفل لإعادة المحاولة"
        }

        isLoading = false
    }
}
