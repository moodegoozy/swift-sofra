// MainTabView.swift
// Role-aware tab bar — shows different tabs based on user role
// IMPORTANT: No `if` inside TabView — SwiftUI breaks tab identity with conditionals

import SwiftUI

struct MainTabView: View {
    @Environment(AppState.self) var appState
    @Environment(CartViewModel.self) var cartVM

    private var isOwner: Bool {
        appState.role == .owner
    }

    private var isCourier: Bool {
        appState.role == .courier
    }

    private var isSupervisor: Bool {
        appState.role == .supervisor || appState.role == .admin
    }

    private var isDeveloper: Bool {
        appState.role == .developer
    }

    var body: some View {
        // Each role gets its own TabView — no conditionals INSIDE TabView
        if isDeveloper {
            developerTabs
        } else if isSupervisor {
            supervisorTabs
        } else if isOwner {
            ownerTabs
        } else if isCourier {
            courierTabs
        } else {
            customerTabs
        }
    }

    // MARK: - Owner Tabs (6 tabs)
    private var ownerTabs: some View {
        @Bindable var appState = appState
        return TabView(selection: $appState.selectedMainTab) {
            NavigationStack { HomeView() }
                .tabItem { Label("الرئيسية", systemImage: "house.fill") }
                .tag(0)

            NavigationStack { RestaurantsListView() }
                .tabItem { Label("المطاعم", systemImage: "storefront.fill") }
                .tag(1)

            NavigationStack { OwnerDashboardView() }
                .tabItem { Label("لوحة التحكم", systemImage: "chart.bar.fill") }
                .tag(2)

            NavigationStack { CartView() }
                .tabItem { Label("السلة", systemImage: "cart.fill") }
                .badge(cartVM.items.count)
                .tag(7)

            NavigationStack { OrdersView() }
                .tabItem { Label("طلباتي", systemImage: "bag.fill") }
                .tag(3)

            NavigationStack { ProfileView() }
                .tabItem { Label("حسابي", systemImage: "person.fill") }
                .tag(9)
        }
        .tint(SofraColors.gold400)
        
    }

    // MARK: - Courier Tabs (5 tabs)
    private var courierTabs: some View {
        @Bindable var appState = appState
        return TabView(selection: $appState.selectedMainTab) {
            NavigationStack { HomeView() }
                .tabItem { Label("الرئيسية", systemImage: "house.fill") }
                .tag(0)

            NavigationStack { RestaurantsListView() }
                .tabItem { Label("المطاعم", systemImage: "storefront.fill") }
                .tag(1)

            NavigationStack { CourierDashboardView() }
                .tabItem { Label("التوصيل", systemImage: "car.fill") }
                .tag(2)

            NavigationStack { OrdersView() }
                .tabItem { Label("طلباتي", systemImage: "bag.fill") }
                .tag(3)

            NavigationStack { ProfileView() }
                .tabItem { Label("حسابي", systemImage: "person.fill") }
                .tag(9)
        }
        .tint(SofraColors.gold400)
        
    }

    // MARK: - Customer Tabs (5 tabs)
    private var customerTabs: some View {
        @Bindable var appState = appState
        return TabView(selection: $appState.selectedMainTab) {
            NavigationStack { HomeView() }
                .tabItem { Label("الرئيسية", systemImage: "house.fill") }
                .tag(0)

            NavigationStack { RestaurantsListView() }
                .tabItem { Label("المطاعم", systemImage: "storefront.fill") }
                .tag(1)

            NavigationStack { CartView() }
                .tabItem { Label("السلة", systemImage: "cart.fill") }
                .badge(cartVM.items.count)
                .tag(2)

            NavigationStack { OrdersView() }
                .tabItem { Label("طلباتي", systemImage: "bag.fill") }
                .tag(3)

            NavigationStack { ProfileView() }
                .tabItem { Label("حسابي", systemImage: "person.fill") }
                .tag(9)
        }
        .tint(SofraColors.gold400)
        
    }

    // MARK: - Supervisor Tabs (5 tabs)
    private var supervisorTabs: some View {
        @Bindable var appState = appState
        return TabView(selection: $appState.selectedMainTab) {
            NavigationStack { SupervisorDashboardView() }
                .tabItem { Label("الإشراف", systemImage: "shield.fill") }
                .tag(0)

            NavigationStack { RestaurantsListView() }
                .tabItem { Label("المطاعم", systemImage: "storefront.fill") }
                .tag(1)

            NavigationStack { OrdersView() }
                .tabItem { Label("طلباتي", systemImage: "bag.fill") }
                .tag(3)

            NavigationStack { CartView() }
                .tabItem { Label("السلة", systemImage: "cart.fill") }
                .badge(cartVM.items.count)
                .tag(7)

            NavigationStack { ProfileView() }
                .tabItem { Label("حسابي", systemImage: "person.fill") }
                .tag(9)
        }
        .tint(SofraColors.gold400)
        
    }

    // MARK: - Developer Tabs (6 tabs — full access)
    private var developerTabs: some View {
        @Bindable var appState = appState
        return TabView(selection: $appState.selectedMainTab) {
            NavigationStack { DeveloperDashboardView() }
                .tabItem { Label("المطور", systemImage: "wrench.and.screwdriver.fill") }
                .tag(0)

            NavigationStack { OwnerDashboardView() }
                .tabItem { Label("المطعم", systemImage: "chart.bar.fill") }
                .tag(2)

            NavigationStack { RestaurantsListView() }
                .tabItem { Label("المطاعم", systemImage: "storefront.fill") }
                .tag(1)

            NavigationStack { OrdersView() }
                .tabItem { Label("طلباتي", systemImage: "bag.fill") }
                .tag(3)

            NavigationStack { ProfileView() }
                .tabItem { Label("حسابي", systemImage: "person.fill") }
                .tag(9)
        }
        .tint(SofraColors.gold400)
        
    }
}

#Preview {
    MainTabView()
        .environment(AppState())
        .environment(CartViewModel())
}
