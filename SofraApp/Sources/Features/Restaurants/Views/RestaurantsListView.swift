// RestaurantsListView.swift
// Full restaurant listing — filtered by 20km distance from user

import SwiftUI

struct RestaurantsListView: View {
    @Environment(AppState.self) var appState
    @State private var vm = RestaurantsViewModel()
    @State private var searchText = ""

    var body: some View {
        ScrollView {
            LazyVStack(spacing: SofraSpacing.md) {
                // Distance info banner
                if appState.hasConfirmedLocation {
                    HStack(spacing: SofraSpacing.xs) {
                        Text("يتم عرض المطاعم ضمن \(Int(RestaurantsViewModel.maxDistanceKm)) كم من موقعك")
                            .font(SofraTypography.caption)
                            .foregroundStyle(SofraColors.textMuted)
                        Spacer()
                        Image(systemName: "location.fill")
                            .font(.caption2)
                            .foregroundStyle(SofraColors.success)
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                }

                if vm.isLoading && vm.restaurants.isEmpty {
                    ForEach(0..<5, id: \.self) { _ in
                        SkeletonCard()
                    }
                } else if let error = vm.errorMessage {
                    ErrorStateView(message: error) {
                        await loadRestaurants()
                    }
                } else if filteredRestaurants.isEmpty {
                    EmptyStateView(
                        icon: "magnifyingglass",
                        title: "لا توجد نتائج",
                        message: searchText.isEmpty
                            ? (appState.hasConfirmedLocation
                                ? "لا توجد مطاعم قريبة منك ضمن \(Int(RestaurantsViewModel.maxDistanceKm)) كم"
                                : "لا توجد مطاعم مسجلة حالياً")
                            : "لم نجد مطاعم تطابق '\(searchText)'"
                    )
                } else {
                    ForEach(filteredRestaurants) { restaurant in
                        NavigationLink(value: restaurant.id) {
                            VStack(spacing: 0) {
                                RestaurantCard(restaurant: restaurant)

                                // Show distance if available
                                if appState.hasConfirmedLocation,
                                   let distText = restaurant.distanceText(
                                    fromLat: appState.userLatitude,
                                    fromLng: appState.userLongitude
                                   ) {
                                    HStack {
                                        Spacer()
                                        HStack(spacing: SofraSpacing.xxs) {
                                            Text(distText)
                                                .font(SofraTypography.caption2)
                                                .foregroundStyle(SofraColors.textMuted)
                                            Image(systemName: "location")
                                                .font(.system(size: 10))
                                                .foregroundStyle(SofraColors.textMuted)
                                        }
                                    }
                                    .padding(.horizontal, SofraSpacing.md)
                                    .padding(.top, SofraSpacing.xxs)
                                }
                            }
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
            await loadRestaurants()
        }
        .task {
            if vm.restaurants.isEmpty {
                await loadRestaurants()
            }
        }
        .navigationTitle("المطاعم")
        .navigationBarTitleDisplayMode(.large)
        .navigationDestination(for: String.self) { restaurantId in
            MenuView(restaurantId: restaurantId)
        }
    }

    private func loadRestaurants() async {
        await vm.loadRestaurants(
            token: try? await appState.validToken(),
            userLat: appState.userLatitude,
            userLng: appState.userLongitude
        )
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
