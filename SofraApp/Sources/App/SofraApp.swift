// SofraApp.swift
// سفرة البيت - iOS Native App
// App entry point using SwiftUI App protocol

import SwiftUI

@main
struct SofraApp: App {
    @StateObject private var appState = AppState()
    @StateObject private var cartVM = CartViewModel()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .environmentObject(cartVM)
                .environment(\.layoutDirection, .rightToLeft)
                .onAppear {
                    Task { await appState.restoreSession() }
                }
        }
    }
}
