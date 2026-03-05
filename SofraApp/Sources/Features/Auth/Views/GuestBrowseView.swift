// GuestBrowseView.swift
// تصفح المطاعم كزائر - Guest restaurant browsing

import SwiftUI

struct GuestBrowseView: View {
    @Environment(\.dismiss) var dismiss
    @State private var vm = GuestBrowseViewModel()
    @State private var searchText = ""
    @State private var selectedRestaurantId: String?
    @State private var showRegisterPrompt = false
    
    var body: some View {
        NavigationStack {
            ZStack {
                if vm.isLoading && vm.restaurants.isEmpty {
                    loadingView
                } else if let error = vm.errorMessage {
                    errorView(error)
                } else {
                    restaurantsContent
                }
            }
            .ramadanBackground()
            .navigationTitle("تصفح المطاعم")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        dismiss()
                    } label: {
                        HStack(spacing: SofraSpacing.xxs) {
                            Image(systemName: "xmark.circle.fill")
                            Text("إغلاق")
                        }
                        .foregroundStyle(SofraColors.gold400)
                    }
                }
                
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        dismiss()
                    } label: {
                        HStack(spacing: SofraSpacing.xxs) {
                            Text("تسجيل الدخول")
                            Image(systemName: "arrow.right.circle.fill")
                        }
                        .font(SofraTypography.callout.bold())
                        .foregroundStyle(SofraColors.navy700)
                        .padding(.horizontal, SofraSpacing.md)
                        .padding(.vertical, SofraSpacing.sm)
                        .background(SofraColors.gold400)
                        .clipShape(Capsule())
                    }
                }
            }
            .searchable(text: $searchText, prompt: "ابحث عن مطعم...")
            .navigationDestination(for: String.self) { restaurantId in
                GuestMenuView(restaurantId: restaurantId)
            }
            .task {
                await vm.loadRestaurantsAsGuest()
            }
        }
    }
    
    // MARK: - Loading View
    private var loadingView: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.md) {
                // Header skeleton
                HStack {
                    Spacer()
                    VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
                        SkeletonView()
                            .frame(width: 200, height: 24)
                        SkeletonView()
                            .frame(width: 150, height: 16)
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)
                .padding(.top, SofraSpacing.lg)
                
                ForEach(0..<6, id: \.self) { _ in
                    SkeletonCard()
                }
            }
            .padding(.horizontal, SofraSpacing.screenHorizontal)
        }
    }
    
    // MARK: - Error View
    private func errorView(_ message: String) -> some View {
        VStack(spacing: SofraSpacing.lg) {
            Image(systemName: "wifi.exclamationmark")
                .font(.system(size: 60))
                .foregroundStyle(SofraColors.textMuted)
            
            Text("تعذر تحميل المطاعم")
                .font(SofraTypography.title3)
                .foregroundStyle(SofraColors.textPrimary)
            
            Text(message)
                .font(SofraTypography.body)
                .foregroundStyle(SofraColors.textSecondary)
                .multilineTextAlignment(.center)
            
            SofraButton(title: "إعادة المحاولة", icon: "arrow.clockwise") {
                Task { await vm.loadRestaurantsAsGuest() }
            }
            .frame(width: 200)
        }
        .padding(SofraSpacing.screenHorizontal)
    }
    
    // MARK: - Restaurants Content
    private var restaurantsContent: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.lg) {
                // Welcome Header
                guestWelcomeHeader
                
                // Restaurants Grid
                if filteredRestaurants.isEmpty {
                    EmptyStateView(
                        icon: "magnifyingglass",
                        title: "لا توجد نتائج",
                        message: searchText.isEmpty
                            ? "لا توجد مطاعم مسجلة حالياً"
                            : "لم نجد مطاعم تطابق '\(searchText)'"
                    )
                    .padding(.top, SofraSpacing.xxxl)
                } else {
                    LazyVStack(spacing: SofraSpacing.md) {
                        ForEach(filteredRestaurants) { restaurant in
                            NavigationLink(value: restaurant.id) {
                                GuestRestaurantCard(restaurant: restaurant)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                }
                
                Spacer(minLength: SofraSpacing.xxxl)
            }
        }
        .refreshable {
            await vm.loadRestaurantsAsGuest()
        }
    }
    
    // MARK: - Welcome Header
    private var guestWelcomeHeader: some View {
        VStack(spacing: SofraSpacing.md) {
            // Guest badge
            HStack(spacing: SofraSpacing.xs) {
                Image(systemName: "eye.fill")
                    .foregroundStyle(SofraColors.gold400)
                Text("وضع التصفح")
                    .font(SofraTypography.caption.bold())
                    .foregroundStyle(SofraColors.gold400)
            }
            .padding(.horizontal, SofraSpacing.md)
            .padding(.vertical, SofraSpacing.xs)
            .background(SofraColors.gold400.opacity(0.15))
            .clipShape(Capsule())
            
            Text("اكتشف أشهى الأطباق المنزلية")
                .font(SofraTypography.title3)
                .foregroundStyle(SofraColors.textPrimary)
            
            Text("تصفح قوائم المطاعم واكتشف الأصناف المتاحة. سجّل دخولك لبدء الطلب!")
                .font(SofraTypography.body)
                .foregroundStyle(SofraColors.textSecondary)
                .multilineTextAlignment(.center)
            
            // Restaurant count
            Text("\(filteredRestaurants.count) مطعم متاح")
                .font(SofraTypography.caption)
                .foregroundStyle(SofraColors.textMuted)
        }
        .padding(SofraSpacing.lg)
        .frame(maxWidth: .infinity)
        .background(
            RoundedRectangle(cornerRadius: SofraSpacing.cardRadius)
                .fill(SofraColors.cardBackground)
                .shadow(color: .black.opacity(0.05), radius: 8, y: 4)
        )
        .padding(.horizontal, SofraSpacing.screenHorizontal)
        .padding(.top, SofraSpacing.md)
    }
    
    private var filteredRestaurants: [Restaurant] {
        if searchText.isEmpty { return vm.restaurants }
        return vm.restaurants.filter {
            $0.name.localizedCaseInsensitiveContains(searchText) ||
            ($0.city?.localizedCaseInsensitiveContains(searchText) ?? false)
        }
    }
}

// MARK: - Guest Restaurant Card
struct GuestRestaurantCard: View {
    let restaurant: Restaurant
    
    var body: some View {
        VStack(alignment: .trailing, spacing: 0) {
            // Cover Image
            ZStack(alignment: .bottomTrailing) {
                CachedPhaseImage(url: URL(string: restaurant.coverUrl ?? restaurant.logoUrl ?? "")) { phase in
                    switch phase {
                    case .success(let img):
                        img.resizable().aspectRatio(contentMode: .fill)
                    default:
                        LinearGradient(
                            colors: [SofraColors.navy600, SofraColors.navy700],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                        .overlay {
                            Image(systemName: "storefront.fill")
                                .font(.system(size: 40))
                                .foregroundStyle(SofraColors.gold400.opacity(0.5))
                        }
                    }
                }
                .frame(height: 140)
                .clipShape(
                    .rect(topLeadingRadius: SofraSpacing.cardRadius, topTrailingRadius: SofraSpacing.cardRadius)
                )
                
                // Status badge
                HStack(spacing: SofraSpacing.xxs) {
                    Circle()
                        .fill(restaurant.isOpen ? SofraColors.success : SofraColors.textMuted)
                        .frame(width: 8, height: 8)
                    Text(restaurant.isOpen ? "مفتوح" : "مغلق")
                        .font(SofraTypography.caption2.bold())
                        .foregroundStyle(restaurant.isOpen ? SofraColors.success : SofraColors.textMuted)
                }
                .padding(.horizontal, SofraSpacing.sm)
                .padding(.vertical, SofraSpacing.xxs)
                .background(.ultraThinMaterial)
                .clipShape(Capsule())
                .padding(SofraSpacing.sm)
            }
            
            // Info
            VStack(alignment: .trailing, spacing: SofraSpacing.xs) {
                HStack(spacing: SofraSpacing.xs) {
                    if restaurant.isVerified {
                        Image(systemName: "checkmark.seal.fill")
                            .foregroundStyle(SofraColors.gold400)
                            .font(.caption)
                    }
                    Text(restaurant.name)
                        .font(SofraTypography.headline)
                        .foregroundStyle(SofraColors.textPrimary)
                        .lineLimit(1)
                }
                
                if let city = restaurant.city, !city.isEmpty {
                    HStack(spacing: SofraSpacing.xxs) {
                        Text(city)
                            .font(SofraTypography.caption)
                            .foregroundStyle(SofraColors.textMuted)
                        Image(systemName: "location.fill")
                            .font(.system(size: 10))
                            .foregroundStyle(SofraColors.textMuted)
                    }
                }
                
                // Delivery options
                HStack(spacing: SofraSpacing.md) {
                    if restaurant.allowDelivery {
                        HStack(spacing: 4) {
                            Text("توصيل")
                                .font(SofraTypography.caption2)
                            Image(systemName: "car.fill")
                                .font(.system(size: 10))
                        }
                        .foregroundStyle(SofraColors.success)
                    }
                    if restaurant.allowPickup {
                        HStack(spacing: 4) {
                            Text("استلام")
                                .font(SofraTypography.caption2)
                            Image(systemName: "bag.fill")
                                .font(.system(size: 10))
                        }
                        .foregroundStyle(SofraColors.info)
                    }
                }
                
                // View menu hint
                HStack {
                    Image(systemName: "chevron.left")
                        .font(.caption2)
                    Text("اضغط لعرض القائمة")
                        .font(SofraTypography.caption2)
                }
                .foregroundStyle(SofraColors.gold400)
                .padding(.top, SofraSpacing.xxs)
            }
            .padding(SofraSpacing.md)
        }
        .background(SofraColors.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius))
        .shadow(color: .black.opacity(0.08), radius: 8, y: 4)
    }
}

#Preview {
    GuestBrowseView()
}
