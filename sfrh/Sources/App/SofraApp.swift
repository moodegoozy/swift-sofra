// SofraApp.swift
// 🌙 سفرة البيت — تطبيق iOS بتصميم رمضاني فخم
// App entry point using SwiftUI App protocol

import SwiftUI

@main
struct SofraApp: App {
    @State private var appState = AppState()
    @State private var cartVM = CartViewModel()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(appState)
                .environment(cartVM)
                .environment(\.layoutDirection, .rightToLeft)
                .preferredColorScheme(.dark)
                .tint(SofraColors.gold400)
                .onAppear {
                    Task { await appState.restoreSession() }
                    // Set global appearance
                    configureAppearance()
                }
        }
    }

    private func configureAppearance() {
        // Navigation bar
        let navAppearance = UINavigationBarAppearance()
        navAppearance.configureWithOpaqueBackground()
        navAppearance.backgroundColor = UIColor(SofraColors.navy900)
        navAppearance.titleTextAttributes = [
            .foregroundColor: UIColor(SofraColors.gold300)
        ]
        navAppearance.largeTitleTextAttributes = [
            .foregroundColor: UIColor(SofraColors.gold300)
        ]
        UINavigationBar.appearance().standardAppearance = navAppearance
        UINavigationBar.appearance().scrollEdgeAppearance = navAppearance
        UINavigationBar.appearance().tintColor = UIColor(SofraColors.gold400)

        // Tab bar
        let tabAppearance = UITabBarAppearance()
        tabAppearance.configureWithOpaqueBackground()
        tabAppearance.backgroundColor = UIColor(SofraColors.navy900)
        UITabBar.appearance().standardAppearance = tabAppearance
        UITabBar.appearance().scrollEdgeAppearance = tabAppearance
        UITabBar.appearance().tintColor = UIColor(SofraColors.gold400)
        UITabBar.appearance().unselectedItemTintColor = UIColor(SofraColors.textMuted)
    }
}
