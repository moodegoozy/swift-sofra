// ContentView.swift
// Root view: shows splash → auth or main tab based on state

import SwiftUI

struct ContentView: View {
    @Environment(AppState.self) var appState
    @State private var pollingStarted = false
    private let appearance = AppearanceManager.shared

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
        .animation(.easeInOut(duration: 0.4), value: appState.isAuthenticated)
        .animation(.easeInOut(duration: 0.4), value: appState.isLoading)
        .preferredColorScheme(appearance.colorScheme)
        .onChange(of: appState.isAuthenticated) { _, isAuth in
            if isAuth {
                startOrderPolling()
            } else {
                pollingStarted = false
                OrderPollingService.shared.stopAll()
            }
        }
        .task {
            // Start polling if already authenticated on launch
            if appState.isAuthenticated {
                startOrderPolling()
            }
        }
    }

    private func startOrderPolling() {
        guard !pollingStarted else { return }
        guard let uid = appState.currentUser?.uid else { return }
        pollingStarted = true
        let role = appState.role

        // Always start customer polling — any user can place orders
        OrderPollingService.shared.startCustomerPolling(userId: uid) {
            try? await appState.validToken()
        }

        // Owner/developer/supervisor also gets owner polling for incoming restaurant orders
        if role == .owner || role == .developer || role == .supervisor {
            OrderPollingService.shared.startOwnerPolling(ownerId: uid) {
                try? await appState.validToken()
            }
        }
    }
}

// MARK: - 🌙 Splash Screen — Premium Ramadan
struct SplashView: View {
    @State private var scale: CGFloat = 0.7
    @State private var opacity: Double = 0
    @State private var moonRotation: Double = -30

    var body: some View {
        ZStack {
            // Deep navy background with pattern
            SofraColors.background
                .ignoresSafeArea()

            IslamicPatternOverlay(opacity: 0.04)
                .ignoresSafeArea()

            FloatingStarsView(count: 25)
                .ignoresSafeArea()

            VStack(spacing: SofraSpacing.xl) {
                // Crescent moon with glow
                ZStack {
                    // Outer glow
                    Image(systemName: "moon.stars.fill")
                        .font(.system(size: 100))
                        .foregroundStyle(SofraColors.gold400)
                        .blur(radius: 25)
                        .opacity(0.4)

                    // Moon icon
                    Image(systemName: "moon.stars.fill")
                        .font(.system(size: 80))
                        .foregroundStyle(
                            .linearGradient(
                                colors: [SofraColors.gold300, SofraColors.gold600],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .rotationEffect(.degrees(moonRotation))
                        .shadow(color: SofraColors.gold500.opacity(0.5), radius: 20)
                }
                .scaleEffect(scale)
                .opacity(opacity)

                VStack(spacing: SofraSpacing.sm) {
                    Text("سفرة البيت")
                        .font(SofraTypography.ramadanTitle)
                        .foregroundStyle(SofraColors.gold300)
                        .shadow(color: SofraColors.gold500.opacity(0.3), radius: 8)

                    Text("رمضان كريم 🌙")
                        .font(SofraTypography.subheadline)
                        .foregroundStyle(SofraColors.textSecondary)
                }
                .opacity(opacity)

                ProgressView()
                    .tint(SofraColors.gold400)
                    .scaleEffect(1.1)
            }
        }
        .onAppear {
            withAnimation(.spring(response: 0.8, dampingFraction: 0.6)) {
                scale = 1.0
                opacity = 1.0
            }
            withAnimation(.easeInOut(duration: 1.2)) {
                moonRotation = 0
            }
        }
    }
}

#Preview {
    ContentView()
        .environment(AppState())
        .environment(CartViewModel())
}
