// RestaurantsViewModel.swift
// Loads and manages restaurant list data

import Foundation
import Observation

@Observable
final class RestaurantsViewModel {
    var restaurants: [Restaurant] = []
    var isLoading = false
    var errorMessage: String?

    private let firestoreService = FirestoreService()

    func loadRestaurants(token: String?) async {
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
            restaurants = docs.map { Restaurant(from: $0) }
                .sorted { ($0.isOpen ? 1 : 0) > ($1.isOpen ? 1 : 0) }
        } catch {
            Logger.log("Failed to load restaurants: \(error)", level: .error)
            errorMessage = "تعذر تحميل قائمة المطاعم"
        }

        isLoading = false
    }
}
