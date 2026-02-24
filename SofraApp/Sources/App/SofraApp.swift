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
                .tint(SofraColors.gold400)
                .onAppear {
                    Task {
                        // Setup notifications
                        NotificationService.shared.registerCategories()
                        await NotificationService.shared.requestPermission()
                        // Restore session
                        await appState.restoreSession()
                    }
                    // Set global appearance
                    configureAppearance()
                }
        }
    }

    private func configureAppearance() {
        // Dynamic colors that adapt to dark/light
        let bgColor = UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(Color(hex: "0A0E22"))
                : UIColor(Color(hex: "F5EDE0"))
        }
        let titleColor = UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(Color(hex: "FFD966"))
                : UIColor(Color(hex: "B8860B"))
        }
        let tintColor = UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(Color(hex: "FFCC33"))
                : UIColor(Color(hex: "D4A017"))
        }
        let mutedColor = UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(Color(hex: "6B7196"))
                : UIColor(Color(hex: "8690B5"))
        }

        // Navigation bar
        let navAppearance = UINavigationBarAppearance()
        navAppearance.configureWithOpaqueBackground()
        navAppearance.backgroundColor = bgColor
        navAppearance.titleTextAttributes = [.foregroundColor: titleColor]
        navAppearance.largeTitleTextAttributes = [.foregroundColor: titleColor]
        UINavigationBar.appearance().standardAppearance = navAppearance
        UINavigationBar.appearance().scrollEdgeAppearance = navAppearance
        UINavigationBar.appearance().tintColor = tintColor

        // Tab bar
        let tabAppearance = UITabBarAppearance()
        tabAppearance.configureWithOpaqueBackground()
        tabAppearance.backgroundColor = bgColor
        UITabBar.appearance().standardAppearance = tabAppearance
        UITabBar.appearance().scrollEdgeAppearance = tabAppearance
        UITabBar.appearance().tintColor = tintColor
        UITabBar.appearance().unselectedItemTintColor = mutedColor
    }
}
