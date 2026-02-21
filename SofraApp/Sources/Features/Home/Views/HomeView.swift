// HomeView.swift
// Landing/home screen matching web / route (Landing.tsx)
// Shows featured restaurants, daily specials, quick actions

import SwiftUI

struct HomeView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var vm = HomeViewModel()

    var body: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.xl) {
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
        .background(SofraColors.background.ignoresSafeArea())
        .refreshable {
            await vm.loadData(token: try? await appState.validToken())
        }
        .task {
            if vm.featuredRestaurants.isEmpty {
                await vm.loadData(token: try? await appState.validToken())
            }
        }
        .navigationTitle("سفرة البيت")
        .navigationBarTitleDisplayMode(.large)
    }

    // MARK: - Welcome Header
    private var welcomeHeader: some View {
        VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
            HStack {
                Spacer()
                VStack(alignment: .trailing, spacing: SofraSpacing.xxs) {
                    Text("مرحباً \(appState.currentUser?.displayName ?? "")! 👋")
                        .font(SofraTypography.title3)
                        .foregroundStyle(SofraColors.textPrimary)

                    Text("اكتشف أشهى الوجبات من الأسر المنتجة")
                        .font(SofraTypography.subheadline)
                        .foregroundStyle(SofraColors.textSecondary)
                }
            }
        }
        .padding(.horizontal, SofraSpacing.screenHorizontal)
        .padding(.top, SofraSpacing.md)
    }

    // MARK: - Quick Action Buttons
    private var quickActions: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: SofraSpacing.md) {
                QuickActionCard(icon: "storefront.fill", title: "المطاعم", color: SofraColors.primary)
                QuickActionCard(icon: "flame.fill", title: "الأكثر طلباً", color: SofraColors.warning)
                QuickActionCard(icon: "tag.fill", title: "العروض", color: SofraColors.success)
                QuickActionCard(icon: "clock.fill", title: "آخر الطلبات", color: SofraColors.sky700)
            }
            .padding(.horizontal, SofraSpacing.screenHorizontal)
        }
    }

    // MARK: - Restaurants List
    private var restaurantsList: some View {
        VStack(alignment: .trailing, spacing: SofraSpacing.md) {
            Text("المطاعم القريبة")
                .font(SofraTypography.title3)
                .foregroundStyle(SofraColors.textPrimary)
                .padding(.horizontal, SofraSpacing.screenHorizontal)

            ForEach(vm.featuredRestaurants) { restaurant in
                NavigationLink(value: restaurant.id) {
                    RestaurantCard(restaurant: restaurant)
                }
                .buttonStyle(.plain)
                .padding(.horizontal, SofraSpacing.screenHorizontal)
            }
        }
        .navigationDestination(for: String.self) { restaurantId in
            MenuView(restaurantId: restaurantId)
        }
    }
}

// MARK: - Quick Action Card
struct QuickActionCard: View {
    let icon: String
    let title: String
    let color: Color

    var body: some View {
        VStack(spacing: SofraSpacing.sm) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(.white)
                .frame(width: 56, height: 56)
                .background(color.gradient)
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

            Text(title)
                .font(SofraTypography.caption)
                .foregroundStyle(SofraColors.textSecondary)
        }
    }
}

#Preview {
    NavigationStack {
        HomeView()
            .environmentObject(AppState())
            .environmentObject(CartViewModel())
    }
}
