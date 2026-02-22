// MainTabView.swift
// Role-aware tab bar — shows different tabs based on user role

import SwiftUI

struct MainTabView: View {
    @Environment(AppState.self) var appState
    @Environment(CartViewModel.self) var cartVM
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
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

            // Cart tab — customer/admin/developer
            if showCartTab {
                NavigationStack {
                    CartView()
                }
                .tabItem {
                    Label("السلة", systemImage: "cart.fill")
                }
                .badge(cartVM.items.count)
                .tag(2)
            }

            // Orders tab — customer
            if appState.role == .customer || appState.role == .developer {
                NavigationStack {
                    OrdersView()
                }
                .tabItem {
                    Label("طلباتي", systemImage: "bag.fill")
                }
                .tag(3)
            }

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
        .tint(SofraColors.primary)
    }

    private var showCartTab: Bool {
        guard let role = appState.role else { return false }
        return [.customer, .admin, .developer].contains(role)
    }
}

#Preview {
    MainTabView()
        .environment(AppState())
        .environment(CartViewModel())
}
