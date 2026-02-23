// OwnerDashboardView.swift
// Owner dashboard matching web /owner (OwnerDashboard.tsx)

import SwiftUI
import PhotosUI

struct OwnerDashboardView: View {
    @Environment(AppState.self) var appState
    @State private var vm = OwnerDashboardViewModel()
    @State private var selectedTab = 0
    @State private var showWallet = false
    @State private var showAddMenuItem = false
    // Photo upload
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var restaurantImage: UIImage?
    // Chat
    @State private var chatOrder: Order?

    var body: some View {
        VStack(spacing: 0) {
                // Tab Bar
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: SofraSpacing.sm) {
                        tabButton("لوحة التحكم", icon: "chart.bar.fill", tag: 0)
                        tabButton("الطلبات", icon: "list.clipboard.fill", tag: 1)
                        tabButton("القائمة", icon: "menucard.fill", tag: 2)
                        tabButton("الإعدادات", icon: "gearshape.fill", tag: 3)
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                    .padding(.vertical, SofraSpacing.sm)
                }
                .background(SofraColors.cardBackground)

                TabView(selection: $selectedTab) {
                    ownerOverview.tag(0)
                    ownerOrders.tag(1)
                    ownerMenu.tag(2)
                    ownerSettings.tag(3)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
            }
            .ramadanBackground()
            .navigationTitle("لوحة المطعم")
            .navigationBarTitleDisplayMode(.inline)
            .task {
                guard let uid = appState.currentUser?.uid else { return }
                await vm.loadDashboard(ownerId: uid, token: try? await appState.validToken())
            }
            .sheet(isPresented: $showWallet) {
                WalletView(
                    orders: vm.orders,
                    restaurantName: vm.restaurant?.name ?? "المطعم"
                )
            }
            .sheet(isPresented: $showAddMenuItem) {
                AddMenuItemView(vm: vm)
            }
            .sheet(item: $chatOrder) { order in
                OrderChatView(
                    orderId: order.id,
                    restaurantName: vm.restaurant?.name ?? "المطعم",
                    orderStatus: order.status
                )
            }
    }

    // MARK: - Tab Button
    private func tabButton(_ title: String, icon: String, tag: Int) -> some View {
        Button {
            withAnimation { selectedTab = tag }
        } label: {
            HStack(spacing: SofraSpacing.xs) {
                Text(title)
                    .font(SofraTypography.calloutSemibold)
                Image(systemName: icon)
            }
            .padding(.horizontal, SofraSpacing.md)
            .padding(.vertical, SofraSpacing.sm)
            .background(selectedTab == tag ? SofraColors.primary : SofraColors.sky100)
            .foregroundStyle(selectedTab == tag ? .white : SofraColors.textSecondary)
            .clipShape(Capsule())
        }
    }

    // MARK: - Overview Tab
    private var ownerOverview: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.lg) {
                if vm.isLoading {
                    ForEach(0..<3, id: \.self) { _ in SkeletonCard() }
                        .padding(.horizontal, SofraSpacing.screenHorizontal)
                } else {
                    // Stats Cards
                    LazyVGrid(columns: [.init(.flexible()), .init(.flexible())], spacing: SofraSpacing.md) {
                        statCard("طلبات اليوم", value: "\(vm.todayOrders)", icon: "bag.fill", color: SofraColors.primary)
                        statCard("الإجمالي", value: String(format: "%.0f ر.س", vm.totalRevenue), icon: "banknote.fill", color: SofraColors.success)
                        statCard("الأصناف", value: "\(vm.menuItemsCount)", icon: "menucard.fill", color: SofraColors.info)
                        statCard("التقييم", value: String(format: "%.1f", vm.restaurant?.averageRating ?? 0), icon: "star.fill", color: SofraColors.warning)
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)

                    // Restaurant Status
                    if let rest = vm.restaurant {
                        SofraCard {
                            HStack {
                                Toggle("", isOn: Binding(
                                    get: { rest.isOpen },
                                    set: { newVal in
                                        Task {
                                            await vm.toggleOpen(ownerId: appState.currentUser?.uid ?? "", isOpen: newVal, token: try? await appState.validToken())
                                        }
                                    }
                                ))
                                .tint(SofraColors.success)

                                Spacer()

                                VStack(alignment: .trailing) {
                                    Text(rest.name)
                                        .font(SofraTypography.headline)
                                    StatusBadge(
                                        text: rest.isOpen ? "مفتوح" : "مغلق",
                                        color: rest.isOpen ? SofraColors.success : SofraColors.error
                                    )
                                }
                            }
                        }
                        .padding(.horizontal, SofraSpacing.screenHorizontal)

                        // Package Info
                        SofraCard {
                            HStack {
                                StatusBadge(
                                    text: rest.packageType == .premium ? "مميز" : "مجاني",
                                    color: rest.packageType == .premium ? SofraColors.warning : SofraColors.textMuted
                                )
                                Spacer()
                                HStack(spacing: SofraSpacing.xs) {
                                    Text("الباقة")
                                        .font(SofraTypography.headline)
                                    Image(systemName: rest.packageType == .premium ? "crown.fill" : "tag.fill")
                                        .foregroundStyle(rest.packageType == .premium ? SofraColors.warning : SofraColors.textMuted)
                                }
                            }
                        }
                        .padding(.horizontal, SofraSpacing.screenHorizontal)
                    }

                    // Quick Actions
                    SofraCard {
                        Text("إجراءات سريعة")
                            .font(SofraTypography.headline)

                        LazyVGrid(columns: [.init(.flexible()), .init(.flexible())], spacing: SofraSpacing.md) {
                            quickAction("الطلبات", icon: "list.clipboard", color: SofraColors.primary) { selectedTab = 1 }
                            quickAction("القائمة", icon: "menucard", color: SofraColors.success) { selectedTab = 2 }
                            quickAction("المحفظة", icon: "creditcard", color: SofraColors.info) {
                                showWallet = true
                            }
                            quickAction("الإعدادات", icon: "gearshape", color: SofraColors.textSecondary) { selectedTab = 3 }
                        }
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                }

                Spacer(minLength: SofraSpacing.xxxl)
            }
            .padding(.top, SofraSpacing.md)
        }
        .refreshable {
            guard let uid = appState.currentUser?.uid else { return }
            await vm.loadDashboard(ownerId: uid, token: try? await appState.validToken())
        }
    }

    // MARK: - Orders Tab
    private var ownerOrders: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.md) {
                if vm.orders.isEmpty {
                    EmptyStateView(
                        icon: "list.clipboard",
                        title: "لا توجد طلبات",
                        message: "الطلبات الواردة ستظهر هنا"
                    )
                } else {
                    ForEach(vm.orders) { order in
                        ownerOrderCard(order)
                    }
                }
            }
            .padding(.horizontal, SofraSpacing.screenHorizontal)
            .padding(.top, SofraSpacing.md)
        }
        .refreshable {
            guard let uid = appState.currentUser?.uid else { return }
            await vm.loadOrders(ownerId: uid, token: try? await appState.validToken())
        }
    }

    private func ownerOrderCard(_ order: Order) -> some View {
        VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
            HStack {
                StatusBadge(text: order.status.arabicLabel, color: order.status.uiColor)
                Spacer()
                Text("#\(order.id.prefix(8))")
                    .font(SofraTypography.headline)
            }
            Divider()
            ForEach(Array(order.items.enumerated()), id: \.offset) { _, item in
                HStack {
                    Text("\(item.price, specifier: "%.0f") × \(item.qty)")
                        .font(SofraTypography.caption)
                        .foregroundStyle(SofraColors.textMuted)
                    Spacer()
                    Text(item.name)
                        .font(SofraTypography.body)
                }
            }
            Divider()
            HStack {
                // Action buttons based on status
                if order.status == .pending {
                    Button("قبول") {
                        Task { await vm.updateOrderStatus(orderId: order.id, newStatus: .accepted, token: try? await appState.validToken()) }
                    }
                    .font(SofraTypography.calloutSemibold)
                    .foregroundStyle(SofraColors.success)
                }
                if order.status == .accepted {
                    Button("تحضير") {
                        Task { await vm.updateOrderStatus(orderId: order.id, newStatus: .preparing, token: try? await appState.validToken()) }
                    }
                    .font(SofraTypography.calloutSemibold)
                    .foregroundStyle(SofraColors.info)
                }
                if order.status == .preparing {
                    Button("جاهز") {
                        Task { await vm.updateOrderStatus(orderId: order.id, newStatus: .ready, token: try? await appState.validToken()) }
                    }
                    .font(SofraTypography.calloutSemibold)
                    .foregroundStyle(SofraColors.primary)
                }

                // Chat button (available after order is accepted)
                if order.status != .pending && order.status != .cancelled && order.status != .delivered {
                    Button {
                        chatOrder = order
                    } label: {
                        Image(systemName: "bubble.left.and.bubble.right.fill")
                            .font(SofraTypography.calloutSemibold)
                            .foregroundStyle(SofraColors.info)
                    }
                }

                Spacer()

                Text("\(order.total, specifier: "%.2f") ر.س")
                    .font(SofraTypography.priceSmall)
                    .foregroundStyle(SofraColors.primaryDark)
            }
        }
        .padding(SofraSpacing.cardPadding)
        .background(SofraColors.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
        .shadow(color: .black.opacity(0.04), radius: 6, y: 3)
    }

    // MARK: - Menu Tab
    private var ownerMenu: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.md) {
                HStack {
                    // Add menu item button
                    Button {
                        showAddMenuItem = true
                    } label: {
                        HStack(spacing: SofraSpacing.xs) {
                            Text("إضافة صنف")
                                .font(SofraTypography.calloutSemibold)
                            Image(systemName: "plus.circle.fill")
                        }
                        .padding(.horizontal, SofraSpacing.md)
                        .padding(.vertical, SofraSpacing.sm)
                        .background(SofraColors.primary)
                        .foregroundStyle(.white)
                        .clipShape(Capsule())
                    }

                    Spacer()
                    Text("أصناف القائمة")
                        .font(SofraTypography.title3)
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                if vm.menuItems.isEmpty {
                    EmptyStateView(
                        icon: "menucard",
                        title: "القائمة فارغة",
                        message: "أضف أصنافك لبدء استقبال الطلبات"
                    )
                } else {
                    ForEach(vm.menuItems) { item in
                        HStack {
                            // Toggle availability
                            Toggle("", isOn: Binding(
                                get: { item.available },
                                set: { newVal in
                                    Task {
                                        await vm.toggleItemAvailability(
                                            itemId: item.id, available: newVal,
                                            token: try? await appState.validToken()
                                        )
                                    }
                                }
                            ))
                            .tint(SofraColors.success)

                            Text("\(item.price, specifier: "%.0f") ر.س")
                                .font(SofraTypography.priceSmall)
                                .foregroundStyle(SofraColors.primaryDark)

                            Spacer()

                            VStack(alignment: .trailing) {
                                Text(item.name)
                                    .font(SofraTypography.headline)
                                StatusBadge(
                                    text: item.available ? "متوفر" : "غير متوفر",
                                    color: item.available ? SofraColors.success : SofraColors.error
                                )
                            }

                            AsyncImage(url: URL(string: item.imageUrl ?? "")) { phase in
                                switch phase {
                                case .success(let img):
                                    img.resizable().aspectRatio(contentMode: .fill)
                                default:
                                    SofraColors.sky100
                                }
                            }
                            .frame(width: 56, height: 56)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                        }
                        .padding(SofraSpacing.cardPadding)
                        .background(SofraColors.cardBackground)
                        .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
                        .contextMenu {
                            Button(role: .destructive) {
                                Task {
                                    await vm.deleteMenuItem(
                                        itemId: item.id,
                                        ownerId: appState.currentUser?.uid ?? "",
                                        token: try? await appState.validToken()
                                    )
                                }
                            } label: {
                                Label("حذف", systemImage: "trash")
                            }
                        }
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                }
            }
            .padding(.top, SofraSpacing.md)
        }
    }

    // MARK: - Settings Tab
    private var ownerSettings: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.lg) {
                if let rest = vm.restaurant {
                    // Restaurant Photo
                    SofraCard {
                        VStack(spacing: SofraSpacing.md) {
                            // Current photo or placeholder
                            ZStack {
                                if let restaurantImage {
                                    Image(uiImage: restaurantImage)
                                        .resizable()
                                        .aspectRatio(contentMode: .fill)
                                } else {
                                    AsyncImage(url: URL(string: rest.logoUrl ?? rest.coverUrl ?? "")) { phase in
                                        switch phase {
                                        case .success(let img):
                                            img.resizable().aspectRatio(contentMode: .fill)
                                        default:
                                            VStack(spacing: SofraSpacing.sm) {
                                                Image(systemName: "camera.fill")
                                                    .font(.system(size: 30))
                                                    .foregroundStyle(SofraColors.textMuted)
                                                Text("صورة المطعم")
                                                    .font(SofraTypography.caption)
                                                    .foregroundStyle(SofraColors.textMuted)
                                            }
                                        }
                                    }
                                }

                                if vm.isUploadingImage {
                                    Color.black.opacity(0.4)
                                    ProgressView()
                                        .tint(.white)
                                        .scaleEffect(1.5)
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 160)
                            .background(SofraColors.sky100)
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

                            // Photo picker button
                            PhotosPicker(selection: $selectedPhoto, matching: .images) {
                                HStack(spacing: SofraSpacing.xs) {
                                    Text(rest.logoUrl != nil ? "تغيير الصورة" : "رفع صورة المطعم")
                                        .font(SofraTypography.calloutSemibold)
                                    Image(systemName: "photo.on.rectangle.angled")
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, SofraSpacing.sm)
                                .background(SofraColors.primary.opacity(0.1))
                                .foregroundStyle(SofraColors.primary)
                                .clipShape(RoundedRectangle(cornerRadius: 10))
                            }
                            .onChange(of: selectedPhoto) { _, newItem in
                                Task {
                                    if let data = try? await newItem?.loadTransferable(type: Data.self),
                                       let uiImage = UIImage(data: data) {
                                        restaurantImage = uiImage
                                        if let jpegData = uiImage.jpegData(compressionQuality: 0.7) {
                                            await vm.uploadRestaurantPhoto(
                                                imageData: jpegData,
                                                ownerId: appState.currentUser?.uid ?? "",
                                                token: try? await appState.validToken()
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)

                    SofraCard {
                        VStack(alignment: .trailing, spacing: SofraSpacing.md) {
                            HStack(spacing: SofraSpacing.sm) {
                                if rest.isVerified {
                                    Image(systemName: "checkmark.seal.fill")
                                        .foregroundStyle(SofraColors.primary)
                                }
                                Text(rest.name)
                                    .font(SofraTypography.title3)
                            }

                            if let phone = rest.phone {
                                HStack {
                                    Spacer()
                                    Text(phone)
                                        .font(SofraTypography.body)
                                    Image(systemName: "phone.fill")
                                        .foregroundStyle(SofraColors.primary)
                                }
                            }

                            if let city = rest.city {
                                HStack {
                                    Spacer()
                                    Text(city)
                                        .font(SofraTypography.body)
                                    Image(systemName: "location.fill")
                                        .foregroundStyle(SofraColors.primary)
                                }
                            }
                        }
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                }

                SofraCard {
                    VStack(spacing: SofraSpacing.md) {
                        Button {
                            showWallet = true
                        } label: {
                            HStack {
                                Image(systemName: "chevron.left")
                                    .foregroundStyle(SofraColors.textMuted)
                                Spacer()
                                Text("المحفظة")
                                    .font(SofraTypography.body)
                                    .foregroundStyle(SofraColors.textPrimary)
                                Image(systemName: "creditcard.fill")
                                    .foregroundStyle(SofraColors.success)
                                    .frame(width: 28)
                            }
                        }
                        settingsRow(icon: "person.3.fill", label: "التوظيف", color: SofraColors.info)
                        settingsRow(icon: "megaphone.fill", label: "العروض الترويجية", color: SofraColors.warning)
                        settingsRow(icon: "chart.bar.fill", label: "التقارير", color: SofraColors.primaryDark)
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                Spacer(minLength: SofraSpacing.xxxl)
            }
            .padding(.top, SofraSpacing.md)
        }
    }

    // MARK: - Helper Views
    private func statCard(_ title: String, value: String, icon: String, color: Color) -> some View {
        VStack(spacing: SofraSpacing.sm) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(color)
            Text(value)
                .font(SofraTypography.title2)
                .foregroundStyle(SofraColors.textPrimary)
            Text(title)
                .font(SofraTypography.caption)
                .foregroundStyle(SofraColors.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(SofraSpacing.cardPadding)
        .background(SofraColors.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
        .shadow(color: .black.opacity(0.03), radius: 4, y: 2)
    }

    private func quickAction(_ title: String, icon: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: SofraSpacing.sm) {
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundStyle(color)
                Text(title)
                    .font(SofraTypography.caption)
                    .foregroundStyle(SofraColors.textPrimary)
            }
            .frame(maxWidth: .infinity)
            .padding(SofraSpacing.md)
            .background(color.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    private func settingsRow(icon: String, label: String, color: Color) -> some View {
        Button {
            // Settings rows navigate within owner settings
        } label: {
            HStack {
                Image(systemName: "chevron.left")
                    .foregroundStyle(SofraColors.textMuted)
                Spacer()
                Text(label)
                    .font(SofraTypography.body)
                    .foregroundStyle(SofraColors.textPrimary)
                Image(systemName: icon)
                    .foregroundStyle(color)
                    .frame(width: 28)
            }
        }
    }
}

#Preview {
    OwnerDashboardView()
        .environment(AppState())
        .environment(CartViewModel())
}
