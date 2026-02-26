// OwnerProductsView.swift
// صفحة إدارة المنتجات المستقلة — تستخدم في الشريط السفلي للمالك

import SwiftUI

struct OwnerProductsView: View {
    @Environment(AppState.self) var appState
    @State private var vm = OwnerDashboardViewModel()
    @State private var showAddMenuItem = false
    @State private var editingItem: MenuItem?
    @State private var deletingItem: MenuItem?

    var body: some View {
        VStack(spacing: 0) {
            // Header bar
            HStack {
                Button {
                    showAddMenuItem = true
                } label: {
                    HStack(spacing: SofraSpacing.xs) {
                        Text("إضافة منتج")
                            .font(SofraTypography.calloutSemibold)
                        Image(systemName: "plus")
                            .font(.system(size: 14, weight: .bold))
                    }
                    .padding(.horizontal, SofraSpacing.md)
                    .padding(.vertical, 10)
                    .background(SofraColors.success)
                    .foregroundStyle(.white)
                    .clipShape(Capsule())
                }

                Spacer()

                VStack(alignment: .trailing) {
                    Text("إدارة المنتجات")
                        .font(SofraTypography.title3)
                        .foregroundStyle(SofraColors.textPrimary)
                    Text("\(vm.menuItemsCount) منتج")
                        .font(SofraTypography.caption)
                        .foregroundStyle(SofraColors.textSecondary)
                }
            }
            .padding(.horizontal, SofraSpacing.screenHorizontal)
            .padding(.vertical, SofraSpacing.sm)

            ScrollView {
                if vm.isLoading && vm.menuItems.isEmpty {
                    ForEach(0..<4, id: \.self) { _ in
                        SkeletonCard()
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                } else if vm.menuItems.isEmpty {
                    VStack(spacing: SofraSpacing.lg) {
                        Spacer(minLength: SofraSpacing.xxxl)
                        EmptyStateView(
                            icon: "menucard",
                            title: "لا يوجد منتجات",
                            message: "أضف منتجاتك لبدء استقبال الطلبات"
                        )
                        SofraButton(title: "إضافة أول منتج", icon: "plus.circle.fill") {
                            showAddMenuItem = true
                        }
                        .padding(.horizontal, SofraSpacing.screenHorizontal)
                    }
                } else {
                    LazyVStack(spacing: SofraSpacing.md) {
                        ForEach(vm.menuItems) { item in
                            productCard(item)
                        }
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)
                    .padding(.top, SofraSpacing.xs)
                    .padding(.bottom, SofraSpacing.xxxl)
                }
            }
            .refreshable {
                guard let uid = appState.currentUser?.uid else { return }
                await vm.loadDashboard(ownerId: uid, token: try? await appState.validToken())
            }
        }
        .ramadanBackground()
        .navigationTitle("المنتجات")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            guard let uid = appState.currentUser?.uid else { return }
            await vm.loadDashboard(ownerId: uid, token: try? await appState.validToken())
        }
        .sheet(isPresented: $showAddMenuItem) {
            AddMenuItemView(vm: vm)
        }
        .sheet(item: $editingItem) { item in
            EditMenuItemView(vm: vm, item: item)
        }
        .alert("حذف الصنف", isPresented: .init(
            get: { deletingItem != nil },
            set: { if !$0 { deletingItem = nil } }
        )) {
            Button("حذف", role: .destructive) {
                if let item = deletingItem {
                    Task {
                        await vm.deleteMenuItem(
                            itemId: item.id,
                            ownerId: appState.currentUser?.uid ?? "",
                            token: try? await appState.validToken()
                        )
                    }
                    deletingItem = nil
                }
            }
            Button("إلغاء", role: .cancel) { deletingItem = nil }
        } message: {
            Text("هل أنت متأكد من حذف «\(deletingItem?.name ?? "")»؟ لا يمكن التراجع.")
        }
    }

    // MARK: - Product Card
    private func productCard(_ item: MenuItem) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: SofraSpacing.md) {
                VStack(alignment: .trailing, spacing: SofraSpacing.xs) {
                    HStack(spacing: SofraSpacing.xs) {
                        if !item.available {
                            Text("متوقف")
                                .font(.caption2.bold())
                                .foregroundStyle(.white)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(SofraColors.error)
                                .clipShape(Capsule())
                        }
                        Text(item.name)
                            .font(SofraTypography.headline)
                            .foregroundStyle(item.available ? SofraColors.textPrimary : SofraColors.textMuted)
                            .lineLimit(1)
                    }

                    if let desc = item.description, !desc.isEmpty {
                        Text(desc)
                            .font(SofraTypography.caption)
                            .foregroundStyle(SofraColors.textSecondary)
                            .lineLimit(2)
                            .multilineTextAlignment(.trailing)
                    }

                    HStack(spacing: SofraSpacing.sm) {
                        if let cat = item.category {
                            Text(cat)
                                .font(.caption2)
                                .foregroundStyle(SofraColors.textMuted)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(SofraColors.sky100)
                                .clipShape(Capsule())
                        }
                        Spacer()
                        VStack(alignment: .trailing, spacing: 2) {
                            Text("\(item.price, specifier: "%.0f") ر.س")
                                .font(SofraTypography.priceSmall)
                                .foregroundStyle(SofraColors.primaryDark)
                            Text("+ رسوم الخدمة \(ServiceFee.perItem, specifier: "%.2f") ر.س")
                                .font(.caption2)
                                .foregroundStyle(SofraColors.textMuted)
                        }
                    }
                }

                CachedPhaseImage(url: URL(string: item.imageUrl ?? "")) { phase in
                    switch phase {
                    case .success(let img):
                        img.resizable().aspectRatio(contentMode: .fill)
                    default:
                        ZStack {
                            SofraColors.sky100
                            Image(systemName: "fork.knife")
                                .foregroundStyle(SofraColors.sky300)
                        }
                    }
                }
                .frame(width: 72, height: 72)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
            }
            .padding(SofraSpacing.cardPadding)

            Divider()
                .padding(.horizontal, SofraSpacing.sm)

            // Actions: Toggle + Edit + Delete
            HStack(spacing: SofraSpacing.lg) {
                Button {
                    deletingItem = item
                } label: {
                    HStack(spacing: 4) {
                        Text("حذف")
                            .font(.caption)
                        Image(systemName: "trash")
                            .font(.caption)
                    }
                    .foregroundStyle(SofraColors.error)
                }

                Button {
                    editingItem = item
                } label: {
                    HStack(spacing: 4) {
                        Text("تعديل")
                            .font(.caption)
                        Image(systemName: "pencil")
                            .font(.caption)
                    }
                    .foregroundStyle(SofraColors.info)
                }

                Spacer()

                HStack(spacing: SofraSpacing.xs) {
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
                    .labelsHidden()

                    Text(item.available ? "متوفر" : "إيقاف مؤقت")
                        .font(.caption)
                        .foregroundStyle(item.available ? SofraColors.success : SofraColors.error)
                }
            }
            .padding(.horizontal, SofraSpacing.cardPadding)
            .padding(.vertical, SofraSpacing.sm)
        }
        .background(SofraColors.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
        .shadow(color: .black.opacity(0.04), radius: 6, y: 3)
        .opacity(item.available ? 1 : 0.7)
    }
}
