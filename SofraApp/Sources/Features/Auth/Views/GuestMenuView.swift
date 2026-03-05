// GuestMenuView.swift
// Menu view for guest browsing - shows items but prompts to register on add

import SwiftUI

struct GuestMenuView: View {
    let restaurantId: String
    @Environment(\.dismiss) var dismiss
    @State private var vm = GuestBrowseViewModel()
    @State private var restaurant: Restaurant?
    @State private var menuItems: [MenuItem] = []
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var showRegisterPrompt = false
    @State private var selectedItem: MenuItem?
    
    var body: some View {
        ScrollView {
            LazyVStack(spacing: SofraSpacing.lg) {
                // Restaurant Header
                if let restaurant {
                    restaurantHeader(restaurant)
                }
                
                // Menu Items
                if isLoading {
                    ForEach(0..<4, id: \.self) { _ in
                        SkeletonCard()
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                } else if let err = errorMessage {
                    ErrorStateView(message: err) {
                        await loadMenu()
                    }
                } else if menuItems.isEmpty {
                    EmptyStateView(
                        icon: "menucard",
                        title: "القائمة فارغة",
                        message: "لم يضف هذا المطعم أصنافاً بعد"
                    )
                } else {
                    ForEach(groupedItems, id: \.category) { group in
                        VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
                            Text(group.category)
                                .font(SofraTypography.title3)
                                .foregroundStyle(SofraColors.textPrimary)
                                .padding(.horizontal, SofraSpacing.screenHorizontal)
                            
                            ForEach(group.items) { item in
                                GuestMenuItemCard(item: item) {
                                    selectedItem = item
                                    showRegisterPrompt = true
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
        .navigationTitle(restaurant?.name ?? "القائمة")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await loadMenu()
        }
        .sheet(isPresented: $showRegisterPrompt) {
            RegisterPromptSheet(itemName: selectedItem?.name)
        }
    }
    
    // MARK: - Load Menu
    private func loadMenu() async {
        isLoading = true
        errorMessage = nil
        
        do {
            let (rest, items) = try await vm.loadMenuItems(restaurantId: restaurantId)
            restaurant = rest
            menuItems = items
        } catch {
            Logger.log("Guest menu error: \(error)", level: .error)
            errorMessage = "تعذر تحميل القائمة"
        }
        
        isLoading = false
    }
    
    // MARK: - Grouped Items
    private var groupedItems: [(category: String, items: [MenuItem])] {
        let grouped = Dictionary(grouping: menuItems, by: { $0.category ?? "أخرى" })
        return grouped.map { (category: $0.key, items: $0.value) }
            .sorted { $0.category < $1.category }
    }
    
    // MARK: - Restaurant Header
    @ViewBuilder
    private func restaurantHeader(_ restaurant: Restaurant) -> some View {
        VStack(spacing: SofraSpacing.md) {
            // Cover / Logo
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
                .frame(height: 160)
                .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
                
                // Guest badge
                HStack(spacing: SofraSpacing.xxs) {
                    Image(systemName: "eye.fill")
                    Text("وضع التصفح")
                        .font(SofraTypography.caption2.bold())
                }
                .foregroundStyle(SofraColors.gold400)
                .padding(.horizontal, SofraSpacing.sm)
                .padding(.vertical, SofraSpacing.xxs)
                .background(.ultraThinMaterial)
                .clipShape(Capsule())
                .padding(SofraSpacing.sm)
            }
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
                
                // Register hint
                HStack(spacing: SofraSpacing.xs) {
                    Image(systemName: "info.circle.fill")
                    Text("سجّل دخولك لإضافة أصناف إلى السلة")
                }
                .font(SofraTypography.caption)
                .foregroundStyle(SofraColors.gold400)
                .padding(.top, SofraSpacing.xs)
            }
            .padding(.horizontal, SofraSpacing.screenHorizontal)
        }
    }
}

// MARK: - Guest Menu Item Card
struct GuestMenuItemCard: View {
    let item: MenuItem
    let onTryAdd: () -> Void
    
    var body: some View {
        HStack(spacing: SofraSpacing.md) {
            // Info (RTL: right side)
            VStack(alignment: .trailing, spacing: SofraSpacing.xs) {
                Text(item.name)
                    .font(SofraTypography.headline)
                    .foregroundStyle(SofraColors.textPrimary)
                    .lineLimit(2)
                
                if let desc = item.description, !desc.isEmpty {
                    Text(desc)
                        .font(SofraTypography.caption)
                        .foregroundStyle(SofraColors.textSecondary)
                        .lineLimit(2)
                }
                
                HStack(spacing: SofraSpacing.sm) {
                    // Add button (shows register prompt)
                    Button(action: onTryAdd) {
                        HStack(spacing: 4) {
                            Image(systemName: "plus.circle.fill")
                                .font(.body)
                            Text("أضف")
                                .font(SofraTypography.caption.bold())
                        }
                        .foregroundStyle(.white)
                        .padding(.horizontal, SofraSpacing.sm)
                        .padding(.vertical, 6)
                        .background(SofraColors.gold500)
                        .clipShape(Capsule())
                    }
                    
                    Spacer()
                    
                    // Price
                    if item.hasDiscount {
                        VStack(alignment: .trailing, spacing: 0) {
                            Text("\(item.customerOriginalPrice, specifier: "%.0f") ر.س")
                                .font(SofraTypography.caption2)
                                .strikethrough()
                                .foregroundStyle(SofraColors.textMuted)
                            Text("\(item.customerPrice, specifier: "%.0f") ر.س")
                                .font(SofraTypography.priceSmall)
                                .foregroundStyle(SofraColors.success)
                        }
                    } else {
                        Text("\(item.customerPrice, specifier: "%.0f") ر.س")
                            .font(SofraTypography.priceSmall)
                            .foregroundStyle(SofraColors.primaryDark)
                    }
                }
            }
            
            // Image
            CachedPhaseImage(url: URL(string: item.imageUrl ?? "")) { phase in
                switch phase {
                case .success(let img):
                    img.resizable().aspectRatio(contentMode: .fill)
                case .failure:
                    ZStack {
                        SofraColors.sky100
                        Image(systemName: "fork.knife")
                            .foregroundStyle(SofraColors.sky300)
                    }
                default:
                    SkeletonView(width: 80, height: 80, radius: 12)
                }
            }
            .frame(width: 80, height: 80)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
        .padding(SofraSpacing.cardPadding)
        .background(SofraColors.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
        .shadow(color: .black.opacity(0.04), radius: 6, y: 3)
        .overlay(alignment: .topLeading) {
            // Discount badge
            if item.hasDiscount, let d = item.discountPercent {
                Text("-\(Int(d))%")
                    .font(SofraTypography.caption2)
                    .fontWeight(.bold)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 3)
                    .background(SofraColors.error)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
                    .offset(x: 8, y: 8)
            }
        }
    }
}

// MARK: - Register Prompt Sheet
struct RegisterPromptSheet: View {
    @Environment(\.dismiss) var dismiss
    var itemName: String?
    
    var body: some View {
        VStack(spacing: SofraSpacing.xl) {
            Spacer()
            
            // Icon
            ZStack {
                Circle()
                    .fill(SofraColors.gold400.opacity(0.15))
                    .frame(width: 100, height: 100)
                
                Image(systemName: "person.badge.plus")
                    .font(.system(size: 44))
                    .foregroundStyle(SofraColors.gold400)
            }
            
            // Title
            Text("سجّل دخولك للطلب")
                .font(SofraTypography.title2)
                .foregroundStyle(SofraColors.textPrimary)
            
            // Message
            VStack(spacing: SofraSpacing.sm) {
                if let itemName {
                    Text("لإضافة \"\(itemName)\" إلى سلتك")
                        .font(SofraTypography.body)
                        .foregroundStyle(SofraColors.textSecondary)
                }
                
                Text("أنشئ حساباً مجانياً أو سجّل دخولك للاستمتاع بخدماتنا")
                    .font(SofraTypography.body)
                    .foregroundStyle(SofraColors.textSecondary)
                    .multilineTextAlignment(.center)
            }
            
            // Benefits
            VStack(alignment: .trailing, spacing: SofraSpacing.md) {
                benefitRow(icon: "cart.fill", text: "أضف الأصناف إلى سلتك")
                benefitRow(icon: "shippingbox.fill", text: "تابع حالة طلباتك")
                benefitRow(icon: "bell.fill", text: "احصل على إشعارات العروض")
                benefitRow(icon: "heart.fill", text: "احفظ مطاعمك المفضلة")
            }
            .padding(SofraSpacing.lg)
            .background(SofraColors.gold400.opacity(0.08))
            .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius))
            
            Spacer()
            
            // Action buttons
            VStack(spacing: SofraSpacing.md) {
                Button {
                    // Dismiss sheet and the guest browse view
                    dismiss()
                } label: {
                    HStack(spacing: SofraSpacing.sm) {
                        Text("تسجيل الدخول / إنشاء حساب")
                            .font(SofraTypography.headline)
                        Image(systemName: "arrow.left.circle.fill")
                    }
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: SofraSpacing.buttonHeight)
                    .background(
                        LinearGradient(
                            colors: [SofraColors.gold400, SofraColors.gold500],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.buttonRadius))
                }
                
                Button {
                    dismiss()
                } label: {
                    Text("متابعة التصفح")
                        .font(SofraTypography.callout)
                        .foregroundStyle(SofraColors.textMuted)
                }
            }
            .padding(.horizontal, SofraSpacing.screenHorizontal)
            .padding(.bottom, SofraSpacing.lg)
        }
        .padding(SofraSpacing.screenHorizontal)
        .ramadanBackground()
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }
    
    private func benefitRow(icon: String, text: String) -> some View {
        HStack(spacing: SofraSpacing.sm) {
            Text(text)
                .font(SofraTypography.callout)
                .foregroundStyle(SofraColors.textPrimary)
            
            Image(systemName: icon)
                .foregroundStyle(SofraColors.gold400)
                .frame(width: 24)
        }
        .frame(maxWidth: .infinity, alignment: .trailing)
    }
}

#Preview("Guest Menu") {
    NavigationStack {
        GuestMenuView(restaurantId: "test")
    }
}

#Preview("Register Prompt") {
    RegisterPromptSheet(itemName: "برست دجاج مقرمش")
}
