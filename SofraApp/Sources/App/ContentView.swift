// ContentView.swift
// Root view: shows splash → auth or main tab based on state

import SwiftUI

struct ContentView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        Group {
            if appState.isLoading {
                SplashView()
            } else if appState.isAuthenticated {
                MainTabView()
            } else {
                NavigationStack {
                    LoginView()
                }
            }
        }
        .animation(.easeInOut(duration: 0.3), value: appState.isAuthenticated)
        .animation(.easeInOut(duration: 0.3), value: appState.isLoading)
    }
}

// MARK: - Splash Screen
struct SplashView: View {
    @State private var scale: CGFloat = 0.8
    @State private var opacity: Double = 0.5

    var body: some View {
        ZStack {
            SofraColors.background
                .ignoresSafeArea()

            VStack(spacing: SofraSpacing.lg) {
                Image(systemName: "fork.knife.circle.fill")
                    .font(.system(size: 80))
                    .foregroundStyle(SofraColors.primary)
                    .scaleEffect(scale)
                    .opacity(opacity)

                Text("سفرة البيت")
                    .font(SofraTypography.title)
                    .foregroundStyle(SofraColors.primaryDark)

                ProgressView()
                    .tint(SofraColors.primary)
            }
        }
        .onAppear {
            withAnimation(.easeOut(duration: 0.6)) {
                scale = 1.0
                opacity = 1.0
            }
        }
    }
}

#Preview {
    ContentView()
        .environmentObject(AppState())
        .environmentObject(CartViewModel())
}
