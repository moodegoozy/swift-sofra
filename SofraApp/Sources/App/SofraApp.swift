// SofraApp.swift
// سفرة البيت - iOS Native App
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
                .onAppear {
                    Task { await appState.restoreSession() }
                }
        }
    }
}
