// MenuView.swift
// Restaurant menu screen matching web /menu route

import SwiftUI

struct MenuView: View {
    let restaurantId: String
    @Environment(AppState.self) var appState
    @Environment(CartViewModel.self) var cartVM
    @State private var vm = MenuViewModel()

    var body: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.lg) {
                // Restaurant Header
                if let restaurant = vm.restaurant {
                    restaurantHeader(restaurant)
                }

                // Menu Items
                if vm.isLoading {
                    ForEach(0..<4, id: \.self) { _ in
                        SkeletonCard()
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                } else if let err = vm.errorMessage {
                    ErrorStateView(message: err) {
                        await vm.loadMenu(restaurantId: restaurantId, token: try? await appState.validToken())
                    }
                } else if vm.menuItems.isEmpty {
                    EmptyStateView(
                        icon: "menucard",
                        title: "القائمة فارغة",
                        message: "لم يضف هذا المطعم أصنافاً بعد"
                    )
                } else {
                    ForEach(vm.groupedItems, id: \.category) { group in
                        VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
                            Text(group.category)
                                .font(SofraTypography.title3)
                                .foregroundStyle(SofraColors.textPrimary)
                                .padding(.horizontal, SofraSpacing.screenHorizontal)

                            ForEach(group.items) { item in
                                MenuItemCard(item: item) {
                                    cartVM.addItem(item, restaurantName: vm.restaurant?.name)
                                    let impact = UINotificationFeedbackGenerator()
                                    impact.notificationOccurred(.success)
                                }
                                .padding(.horizontal, SofraSpacing.screenHorizontal)
                            }
                        }
                    }
                }

                Spacer(minLength: 80)
            }
        }
        .ramadanBackground()
        .navigationTitle(vm.restaurant?.name ?? "القائمة")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await vm.loadMenu(restaurantId: restaurantId, token: try? await appState.validToken())
        }
        .alert("تغيير المطعم", isPresented: Binding(
            get: { cartVM.showRestaurantChangeAlert },
            set: { cartVM.showRestaurantChangeAlert = $0 }
        )) {
            Button("تغيير", role: .destructive) {
                cartVM.confirmRestaurantChange()
            }
            Button("إلغاء", role: .cancel) {
                cartVM.cancelRestaurantChange()
            }
        } message: {
            Text("سلتك تحتوي على أصناف من مطعم آخر. هل تريد إفراغ السلة والإضافة من هذا المطعم؟")
        }
        .overlay(alignment: .bottom) {
            if !cartVM.items.isEmpty {
                cartFloatingBar
            }
        }
    }

    // MARK: - Restaurant Header
    @ViewBuilder
    private func restaurantHeader(_ restaurant: Restaurant) -> some View {
        VStack(spacing: SofraSpacing.md) {
            // Cover / Logo
            AsyncImage(url: URL(string: restaurant.coverUrl ?? restaurant.logoUrl ?? "")) { phase in
                switch phase {
                case .success(let img):
                    img.resizable().aspectRatio(contentMode: .fill)
                default:
                    SofraColors.sky100
                }
            }
            .frame(height: 160)
            .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
            .padding(.horizontal, SofraSpacing.screenHorizontal)

            // Info
            VStack(alignment: .trailing, spacing: SofraSpacing.xs) {
                HStack(spacing: SofraSpacing.xs) {
                    if restaurant.isVerified {
                        Image(systemName: "checkmark.seal.fill")
                            .foregroundStyle(SofraColors.primary)
                    }
                    Text(restaurant.name)
                        .font(SofraTypography.title2)
                }

                if let announcement = restaurant.announcement, !announcement.isEmpty {
                    Text(announcement)
                        .font(SofraTypography.callout)
                        .foregroundStyle(SofraColors.textSecondary)
                }

                HStack(spacing: SofraSpacing.md) {
                    if restaurant.allowDelivery {
                        Label("توصيل", systemImage: "car.fill")
                            .font(SofraTypography.caption)
                    }
                    if restaurant.allowPickup {
                        Label("استلام", systemImage: "bag.fill")
                            .font(SofraTypography.caption)
                    }
                }
                .foregroundStyle(SofraColors.textMuted)
            }
            .padding(.horizontal, SofraSpacing.screenHorizontal)
        }
    }

    // MARK: - Floating Cart Bar
    private var cartFloatingBar: some View {
        NavigationLink {
            CartView()
        } label: {
            HStack {
                Text("\(cartVM.subtotal, specifier: "%.2f") ر.س")
                    .font(SofraTypography.headline)
                    .foregroundStyle(.white)

                Spacer()

                HStack(spacing: SofraSpacing.xs) {
                    Text("عرض السلة")
                        .font(SofraTypography.headline)
                    Image(systemName: "cart.fill")
                }
                .foregroundStyle(.white)

                Text("\(cartVM.items.count)")
                    .font(SofraTypography.caption)
                    .fontWeight(.bold)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(.white.opacity(0.3))
                    .clipShape(Capsule())
                    .foregroundStyle(.white)
            }
            .padding(.horizontal, SofraSpacing.lg)
            .padding(.vertical, SofraSpacing.md)
            .background(SofraColors.primary.gradient)
            .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.buttonRadius, style: .continuous))
            .shadow(color: SofraColors.primary.opacity(0.3), radius: 12, y: 6)
            .padding(.horizontal, SofraSpacing.screenHorizontal)
            .padding(.bottom, SofraSpacing.sm)
        }
    }
}

#Preview {
    NavigationStack {
        MenuView(restaurantId: "test")
            .environment(AppState())
            .environment(CartViewModel())
    }
}
