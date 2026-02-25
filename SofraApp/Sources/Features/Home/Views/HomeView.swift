// HomeView.swift
// 🌙 الشاشة الرئيسية — تصميم رمضاني فخم
// Luxurious Ramadan-themed home screen

import SwiftUI

struct HomeView: View {
    @Environment(AppState.self) var appState
    @State private var vm = HomeViewModel()

    var body: some View {
        ScrollView {
            LazyVStack(spacing: SofraSpacing.xl) {
                // MARK: - Ramadan Banner
                RamadanBannerView()
                    .padding(.horizontal, SofraSpacing.screenHorizontal)

                // MARK: - Welcome Header
                welcomeHeader

                // MARK: - Quick Actions
                quickActions

                // MARK: - Featured Restaurants
                if vm.isLoading {
                    ForEach(0..<3, id: \.self) { _ in
                        SkeletonCard()
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                } else if let error = vm.errorMessage {
                    ErrorStateView(message: error) {
                        await vm.loadData(token: try? await appState.validToken())
                    }
                } else if vm.featuredRestaurants.isEmpty {
                    EmptyStateView(
                        icon: "storefront",
                        title: "لا توجد مطاعم",
                        message: "لم يتم تسجيل أي أسرة منتجة بعد"
                    )
                } else {
                    restaurantsList
                }

                Spacer(minLength: SofraSpacing.xxxl)
            }
        }
        .ramadanBackground()
        .refreshable {
            await vm.loadData(
                token: try? await appState.validToken(),
                userLat: appState.userLatitude,
                userLng: appState.userLongitude
            )
        }
        .task {
            if vm.featuredRestaurants.isEmpty {
                await vm.loadData(
                    token: try? await appState.validToken(),
                    userLat: appState.userLatitude,
                    userLng: appState.userLongitude
                )
            }
        }
        .navigationTitle("سفرة البيت")
        .navigationBarTitleDisplayMode(.large)
        .toolbarColorScheme(.dark, for: .navigationBar)
        .navigationDestination(for: String.self) { restaurantId in
            MenuView(restaurantId: restaurantId)
        }
    }

    // MARK: - Welcome Header
    private var welcomeHeader: some View {
        VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
            HStack {
                Spacer()
                VStack(alignment: .trailing, spacing: SofraSpacing.xxs) {
                    Text("مرحباً \(appState.currentUser?.displayName ?? "")! 🌙")
                        .font(SofraTypography.title3)
                        .foregroundStyle(SofraColors.textPrimary)

                    Text("اكتشف أشهى الوجبات من الأسر المنتجة")
                        .font(SofraTypography.subheadline)
                        .foregroundStyle(SofraColors.textSecondary)
                }
            }
        }
        .padding(.horizontal, SofraSpacing.screenHorizontal)
    }

    // MARK: - Quick Action Buttons
    private var quickActions: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: SofraSpacing.md) {
                QuickActionCard(icon: "storefront.fill", title: "المطاعم", color: SofraColors.gold500) {
                    appState.selectedMainTab = 1
                }
                if appState.role != .owner {
                    QuickActionCard(icon: "cart.fill", title: "السلة", color: SofraColors.lanternOrange) {
                        appState.selectedMainTab = 2
                    }
                    QuickActionCard(icon: "bag.fill", title: "طلباتي", color: SofraColors.emerald500) {
                        appState.selectedMainTab = 3
                    }
                } else {
                    QuickActionCard(icon: "chart.bar.fill", title: "لوحة التحكم", color: SofraColors.lanternOrange) {
                        appState.selectedMainTab = 2
                    }
                }
                QuickActionCard(icon: "person.fill", title: "حسابي", color: SofraColors.info) {
                    appState.selectedMainTab = 9
                }
            }
            .padding(.horizontal, SofraSpacing.screenHorizontal)
        }
    }

    // MARK: - Restaurants List
    private var restaurantsList: some View {
        VStack(alignment: .trailing, spacing: SofraSpacing.md) {
            HStack {
                Spacer()
                Image(systemName: "moon.stars")
                    .foregroundStyle(SofraColors.gold400)
                Text("المطاعم القريبة")
                    .font(SofraTypography.title3)
                    .foregroundStyle(SofraColors.textPrimary)
            }
            .padding(.horizontal, SofraSpacing.screenHorizontal)

            ForEach(vm.featuredRestaurants) { restaurant in
                NavigationLink(value: restaurant.id) {
                    RestaurantCard(restaurant: restaurant)
                }
                .buttonStyle(.plain)
                .padding(.horizontal, SofraSpacing.screenHorizontal)
            }
        }
    }
}

// MARK: - 🌙 Quick Action Card — Ramadan Style
struct QuickActionCard: View {
    let icon: String
    let title: String
    let color: Color
    var action: (() -> Void)? = nil

    var body: some View {
        Button {
            action?()
        } label: {
            VStack(spacing: SofraSpacing.sm) {
                ZStack {
                    // Glow behind icon
                    Circle()
                        .fill(color.opacity(0.15))
                        .frame(width: 64, height: 64)

                    Image(systemName: icon)
                        .font(.title2)
                        .foregroundStyle(color)
                        .frame(width: 56, height: 56)
                        .background(
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .fill(SofraColors.surfaceElevated)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                                        .strokeBorder(color.opacity(0.2), lineWidth: 0.8)
                                )
                        )
                        .shadow(color: color.opacity(0.2), radius: 8, y: 3)
                }

                Text(title)
                    .font(SofraTypography.caption)
                    .foregroundStyle(SofraColors.textSecondary)
            }
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    NavigationStack {
        HomeView()
            .environment(AppState())
            .environment(CartViewModel())
    }
}
