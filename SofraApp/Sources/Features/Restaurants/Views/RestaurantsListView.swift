// RestaurantsListView.swift
// Full restaurant listing matching web /restaurants route

import SwiftUI

struct RestaurantsListView: View {
    @Environment(AppState.self) var appState
    @State private var vm = RestaurantsViewModel()
    @State private var searchText = ""

    var body: some View {
        ScrollView {
            LazyVStack(spacing: SofraSpacing.md) {
                if vm.isLoading && vm.restaurants.isEmpty {
                    ForEach(0..<5, id: \.self) { _ in
                        SkeletonCard()
                    }
                } else if let error = vm.errorMessage {
                    ErrorStateView(message: error) {
                        await vm.loadRestaurants(token: try? await appState.validToken())
                    }
                } else if filteredRestaurants.isEmpty {
                    EmptyStateView(
                        icon: "magnifyingglass",
                        title: "لا توجد نتائج",
                        message: searchText.isEmpty
                            ? "لا توجد مطاعم مسجلة حالياً"
                            : "لم نجد مطاعم تطابق '\(searchText)'"
                    )
                } else {
                    ForEach(filteredRestaurants) { restaurant in
                        NavigationLink(value: restaurant.id) {
                            RestaurantCard(restaurant: restaurant)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .padding(.horizontal, SofraSpacing.screenHorizontal)
            .padding(.top, SofraSpacing.md)
        }
        .ramadanBackground()
        .searchable(text: $searchText, prompt: "ابحث عن مطعم...")
        .refreshable {
            await vm.loadRestaurants(token: try? await appState.validToken())
        }
        .task {
            if vm.restaurants.isEmpty {
                await vm.loadRestaurants(token: try? await appState.validToken())
            }
        }
        .navigationTitle("المطاعم")
        .navigationBarTitleDisplayMode(.large)
        .navigationDestination(for: String.self) { restaurantId in
            MenuView(restaurantId: restaurantId)
        }
    }

    private var filteredRestaurants: [Restaurant] {
        if searchText.isEmpty { return vm.restaurants }
        return vm.restaurants.filter {
            $0.name.localizedCaseInsensitiveContains(searchText) ||
            ($0.city?.localizedCaseInsensitiveContains(searchText) ?? false)
        }
    }
}

#Preview {
    NavigationStack {
        RestaurantsListView()
            .environment(AppState())
    }
}
