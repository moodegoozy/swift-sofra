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

    func loadData(token: String?) async {
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
                pageSize: 20
            )
            featuredRestaurants = docs.map { Restaurant(from: $0) }
                .filter { $0.isOpen }  // Only show open restaurants
                .sorted { ($0.totalOrders ?? 0) > ($1.totalOrders ?? 0) }
        } catch {
            Logger.log("Failed to load restaurants: \(error)", level: .error)
            errorMessage = "تعذر تحميل المطاعم. اسحب للأسفل لإعادة المحاولة"
        }

        isLoading = false
    }
}
