// HomeViewModel.swift
// Loads featured restaurants for the home screen

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

            // Sort: open first
            let hasUserLocation = userLat != 0 || userLng != 0
            if hasUserLocation {
                // Sort by distance
                restaurants.sort { a, b in
                    let distA = a.distanceKm(fromLat: userLat, fromLng: userLng) ?? Double.greatestFiniteMagnitude
                    let distB = b.distanceKm(fromLat: userLat, fromLng: userLng) ?? Double.greatestFiniteMagnitude
                    if a.isOpen != b.isOpen { return a.isOpen && !b.isOpen }
                    return distA < distB
                }
            } else {
                restaurants.sort {
                    if $0.isOpen != $1.isOpen { return $0.isOpen && !$1.isOpen }
                    return ($0.totalOrders ?? 0) > ($1.totalOrders ?? 0)
                }
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
