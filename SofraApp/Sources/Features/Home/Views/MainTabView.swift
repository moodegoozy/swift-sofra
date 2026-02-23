// MainTabView.swift
// Role-aware tab bar — shows different tabs based on user role

import SwiftUI

struct MainTabView: View {
    @Environment(AppState.self) var appState
    @Environment(CartViewModel.self) var cartVM

    private var isOwner: Bool {
        appState.role == .owner || appState.role == .developer
    }

    private var isCourier: Bool {
        appState.role == .courier || appState.role == .developer
    }

    var body: some View {
        @Bindable var appState = appState
        TabView(selection: $appState.selectedMainTab) {
            // Tab 0: الرئيسية — always visible
            NavigationStack {
                HomeView()
            }
            .tabItem {
                Label("الرئيسية", systemImage: "house.fill")
            }
            .tag(0)

            // Tab 1: المطاعم — always visible
            NavigationStack {
                RestaurantsListView()
            }
            .tabItem {
                Label("المطاعم", systemImage: "storefront.fill")
            }
            .tag(1)

            // Tab 2: role-specific middle tab
            // Owner  → لوحة التحكم
            // Courier → التوصيل
            // Customer → السلة
            if isOwner {
                NavigationStack {
                    OwnerDashboardView()
                }
                .tabItem {
                    Label("لوحة التحكم", systemImage: "chart.bar.fill")
                }
                .tag(2)
            } else if isCourier {
                NavigationStack {
                    CourierDashboardView()
                }
                .tabItem {
                    Label("التوصيل", systemImage: "car.fill")
                }
                .tag(2)
            } else {
                NavigationStack {
                    CartView()
                }
                .tabItem {
                    Label("السلة", systemImage: "cart.fill")
                }
                .badge(cartVM.items.count)
                .tag(2)
            }

            // Tab 3: طلباتي — always visible
            NavigationStack {
                OrdersView()
            }
            .tabItem {
                Label("طلباتي", systemImage: "bag.fill")
            }
            .tag(3)

            // Tab 4: حسابي — always last
            NavigationStack {
                ProfileView()
            }
            .tabItem {
                Label("حسابي", systemImage: "person.fill")
            }
            .tag(4)
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
