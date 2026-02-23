// MainTabView.swift
// Role-aware tab bar — shows different tabs based on user role

import SwiftUI

struct MainTabView: View {
    @Environment(AppState.self) var appState
    @Environment(CartViewModel.self) var cartVM

    var body: some View {
        @Bindable var appState = appState
        TabView(selection: $appState.selectedMainTab) {
            // Common tabs visible to all roles
            NavigationStack {
                HomeView()
            }
            .tabItem {
                Label("الرئيسية", systemImage: "house.fill")
            }
            .tag(0)

            NavigationStack {
                RestaurantsListView()
            }
            .tabItem {
                Label("المطاعم", systemImage: "storefront.fill")
            }
            .tag(1)

            // Cart tab — visible to all authenticated users
            NavigationStack {
                CartView()
            }
            .tabItem {
                Label("السلة", systemImage: "cart.fill")
            }
            .badge(cartVM.items.count)
            .tag(2)

            // Orders tab — visible to all (personal orders)
            NavigationStack {
                OrdersView()
            }
            .tabItem {
                Label("طلباتي", systemImage: "bag.fill")
            }
            .tag(3)

            // Owner tab
            if appState.role == .owner || appState.role == .developer {
                NavigationStack {
                    OwnerDashboardView()
                }
                .tabItem {
                    Label("لوحة التحكم", systemImage: "chart.bar.fill")
                }
                .tag(4)
            }

            // Courier tab
            if appState.role == .courier || appState.role == .developer {
                NavigationStack {
                    CourierDashboardView()
                }
                .tabItem {
                    Label("التوصيل", systemImage: "car.fill")
                }
                .tag(5)
            }

            // Profile — always last
            NavigationStack {
                ProfileView()
            }
            .tabItem {
                Label("حسابي", systemImage: "person.fill")
            }
            .tag(9)
        }
        .tint(SofraColors.gold400)
        .preferredColorScheme(.dark)
    }


}

#Preview {
    MainTabView()
        .environment(AppState())
        .environment(CartViewModel())
}
