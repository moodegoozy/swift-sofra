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

    // MARK: - Owner Tabs (5 tabs)
    @State private var ownerOrdersVM = OrdersViewModel()
    
    private var ownerTabs: some View {
        TabView(selection: Bindable(appState).selectedMainTab) {
            Tab("الرئيسية", systemImage: "house.fill", value: 0) {
                NavigationStack { HomeView() }
            }

            Tab("المنتجات", systemImage: "menucard.fill", value: 1) {
                NavigationStack { OwnerProductsView() }
            }
            
            Tab("الطلبات", systemImage: "list.clipboard.fill", value: 3) {
                NavigationStack { OwnerOrdersTabView() }
            }
            .badge(ownerPendingOrdersCount)

            Tab("لوحة التحكم", systemImage: "chart.bar.fill", value: 2) {
                NavigationStack { OwnerDashboardView() }
            }

            Tab("حسابي", systemImage: "person.fill", value: 9) {
                NavigationStack { ProfileView() }
            }
        }
        .tint(SofraColors.gold400)
        .task {
            guard let uid = appState.currentUser?.uid else { return }
            await ownerOrdersVM.loadOrders(userId: uid, token: try? await appState.validToken())
        }
    }
    
    private var ownerPendingOrdersCount: Int {
        ownerOrdersVM.orders.filter { $0.status == .pending }.count
    }

    // MARK: - Courier Tabs (5 tabs)
    private var courierTabs: some View {
        TabView(selection: Bindable(appState).selectedMainTab) {
            Tab("الرئيسية", systemImage: "house.fill", value: 0) {
                NavigationStack { HomeView() }
            }

            Tab("المطاعم", systemImage: "storefront.fill", value: 1) {
                NavigationStack { RestaurantsListView() }
            }

            Tab("التوصيل", systemImage: "car.fill", value: 2) {
                NavigationStack { CourierDashboardView() }
            }

            Tab("طلباتي", systemImage: "bag.fill", value: 3) {
                NavigationStack { OrdersView() }
            }

            Tab("حسابي", systemImage: "person.fill", value: 9) {
                NavigationStack { ProfileView() }
            }
        }
        .tint(SofraColors.gold400)
    }

    // MARK: - Customer Tabs (5 tabs)
    private var customerTabs: some View {
        TabView(selection: Bindable(appState).selectedMainTab) {
            Tab("الرئيسية", systemImage: "house.fill", value: 0) {
                NavigationStack { HomeView() }
            }

            Tab("المطاعم", systemImage: "storefront.fill", value: 1) {
                NavigationStack { RestaurantsListView() }
            }

            Tab("السلة", systemImage: "cart.fill", value: 2) {
                NavigationStack { CartView() }
            }
            .badge(cartVM.items.count)

            Tab("طلباتي", systemImage: "bag.fill", value: 3) {
                NavigationStack { OrdersView() }
            }

            Tab("حسابي", systemImage: "person.fill", value: 9) {
                NavigationStack { ProfileView() }
            }
        }
        .tint(SofraColors.gold400)
    }

    // MARK: - Supervisor Tabs (5 tabs)
    private var supervisorTabs: some View {
        TabView(selection: Bindable(appState).selectedMainTab) {
            Tab("الإشراف", systemImage: "shield.fill", value: 0) {
                NavigationStack { SupervisorDashboardView() }
            }

            Tab("المطاعم", systemImage: "storefront.fill", value: 1) {
                NavigationStack { RestaurantsListView() }
            }

            Tab("طلباتي", systemImage: "bag.fill", value: 3) {
                NavigationStack { OrdersView() }
            }

            Tab("السلة", systemImage: "cart.fill", value: 7) {
                NavigationStack { CartView() }
            }
            .badge(cartVM.items.count)

            Tab("حسابي", systemImage: "person.fill", value: 9) {
                NavigationStack { ProfileView() }
            }
        }
        .tint(SofraColors.gold400)
    }

    // MARK: - Developer Tabs (5 tabs — full access, no restaurant)
    private var developerTabs: some View {
        TabView(selection: Bindable(appState).selectedMainTab) {
            Tab("المطور", systemImage: "wrench.and.screwdriver.fill", value: 0) {
                DeveloperDashboardView()
            }

            Tab("المطاعم", systemImage: "storefront.fill", value: 1) {
                NavigationStack { RestaurantsListView() }
            }

            Tab("طلباتي", systemImage: "bag.fill", value: 3) {
                NavigationStack { OrdersView() }
            }

            Tab("الإشعارات", systemImage: "bell.fill", value: 4) {
                NavigationStack { NotificationsView() }
            }

            Tab("حسابي", systemImage: "person.fill", value: 9) {
                NavigationStack { ProfileView() }
            }
        }
        .tint(SofraColors.gold400)
    }
}

#Preview {
    MainTabView()
        .environment(AppState())
        .environment(CartViewModel())
}
