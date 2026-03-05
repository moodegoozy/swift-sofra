// EditMenuItemView.swift
// Form for editing an existing menu item

import SwiftUI
import PhotosUI

struct EditMenuItemView: View {
    @Environment(AppState.self) var appState
    @Environment(\.dismiss) var dismiss
    @Bindable var vm: OwnerDashboardViewModel
    let item: MenuItem

    @State private var name: String
    @State private var description: String
    @State private var priceText: String
    @State private var category: String
    @State private var discountText: String
    @State private var hasDiscount: Bool
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var previewImage: UIImage?
    @State private var isSaving = false

    private let categories = ["رئيسي", "مقبلات", "مشروبات", "حلويات", "سلطات", "عام"]

    init(vm: OwnerDashboardViewModel, item: MenuItem) {
        self.vm = vm
        self.item = item
        _name = State(initialValue: item.name)
        _description = State(initialValue: item.description ?? "")
        _priceText = State(initialValue: item.price == 0 ? "" : String(format: "%.0f", item.price))
        _category = State(initialValue: item.category ?? "عام")
        _discountText = State(initialValue: item.discountPercent == nil ? "" : String(format: "%.0f", item.discountPercent ?? 0))
        _hasDiscount = State(initialValue: (item.discountPercent ?? 0) > 0)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: SofraSpacing.lg) {
                    // Photo
                    PhotosPicker(selection: $selectedPhoto, matching: .images) {
                        ZStack {
                            if let previewImage {
                                Image(uiImage: previewImage)
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                            } else {
                                CachedPhaseImage(url: URL(string: item.imageUrl ?? "")) { phase in
                                    switch phase {
                                    case .success(let img):
                                        img.resizable().aspectRatio(contentMode: .fill)
                                    default:
                                        VStack(spacing: SofraSpacing.sm) {
                                            Image(systemName: "camera.fill")
                                                .font(.largeTitle)
                                                .foregroundStyle(SofraColors.primary)
                                            Text("تغيير الصورة")
                                                .font(SofraTypography.calloutSemibold)
                                                .foregroundStyle(SofraColors.textSecondary)
                                        }
                                    }
                                }
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 180)
                        .background(SofraColors.sky100)
                        .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
                    }
                    .onChange(of: selectedPhoto) { _, newItem in
                        Task {
                            if let data = try? await newItem?.loadTransferable(type: Data.self) {
                                previewImage = UIImage(data: data)
                            }
                        }
                    }

                    // Name
                    SofraTextField(
                        label: "اسم الصنف",
                        text: $name,
                        icon: "fork.knife",
                        placeholder: "مثال: برست دجاج"
                    )

                    // Description
                    SofraTextField(
                        label: "الوصف (اختياري)",
                        text: $description,
                        icon: "text.alignright",
                        placeholder: "وصف مختصر للصنف"
                    )

                    // Price
                    SofraTextField(
                        label: "السعر (ر.س)",
                        text: $priceText,
                        icon: "banknote",
                        placeholder: "25",
                        keyboardType: .decimalPad
                    )

                    // Discount Section
                    VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
                        HStack {
                            Toggle("", isOn: $hasDiscount)
                                .tint(SofraColors.success)
                                .labelsHidden()
                            
                            Spacer()
                            
                            HStack(spacing: SofraSpacing.xs) {
                                Image(systemName: "percent")
                                    .foregroundStyle(SofraColors.warning)
                                Text("خصم على هذا المنتج")
                                    .font(SofraTypography.calloutSemibold)
                            }
                        }
                        
                        if hasDiscount {
                            HStack(spacing: SofraSpacing.md) {
                                // Quick discount buttons
                                ForEach([10, 20, 30, 50], id: \.self) { percent in
                                    Button {
                                        discountText = "\(percent)"
                                    } label: {
                                        Text("\(percent)%")
                                            .font(SofraTypography.caption)
                                            .padding(.horizontal, SofraSpacing.sm)
                                            .padding(.vertical, SofraSpacing.xs)
                                            .background(discountText == "\(percent)" ? SofraColors.warning : SofraColors.sky100)
                                            .foregroundStyle(discountText == "\(percent)" ? .white : SofraColors.textSecondary)
                                            .clipShape(Capsule())
                                    }
                                }
                                
                                Spacer()
                            }
                            
                            SofraTextField(
                                label: "نسبة الخصم (%)",
                                text: $discountText,
                                icon: "tag.fill",
                                placeholder: "10",
                                keyboardType: .numberPad
                            )
                            
                            // Preview discounted price
                            if let price = Double(priceText), let discount = Double(discountText), discount > 0 && discount <= 100 {
                                HStack {
                                    Text("\(String(format: "%.0f", price * (1 - discount/100))) ر.س")
                                        .font(SofraTypography.headline)
                                        .foregroundStyle(SofraColors.success)
                                    
                                    Spacer()
                                    
                                    Text("السعر بعد الخصم:")
                                        .font(SofraTypography.caption)
                                        .foregroundStyle(SofraColors.textMuted)
                                }
                                .padding(SofraSpacing.sm)
                                .background(SofraColors.success.opacity(0.1))
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                            }
                        }
                    }
                    .padding(SofraSpacing.md)
                    .background(SofraColors.cardBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 12))

                    // Category
                    VStack(alignment: .trailing, spacing: SofraSpacing.xs) {
                        Text("التصنيف")
                            .font(SofraTypography.calloutSemibold)
                            .foregroundStyle(SofraColors.textPrimary)

                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: SofraSpacing.sm) {
                                ForEach(categories, id: \.self) { cat in
                                    Button {
                                        category = cat
                                    } label: {
                                        Text(cat)
                                            .font(SofraTypography.calloutSemibold)
                                            .padding(.horizontal, SofraSpacing.md)
                                            .padding(.vertical, SofraSpacing.sm)
                                            .background(category == cat ? SofraColors.primary : SofraColors.sky100)
                                            .foregroundStyle(category == cat ? .white : SofraColors.textSecondary)
                                            .clipShape(Capsule())
                                    }
                                }
                            }
                        }
                    }

                    // Save Button
                    SofraButton(
                        title: isSaving ? "جاري الحفظ..." : "حفظ التعديلات",
                        icon: "checkmark.circle.fill",
                        isLoading: isSaving
                    ) {
                        Task { await saveChanges() }
                    }
                    .disabled(name.isEmpty || priceText.isEmpty || isSaving)
                    .opacity(name.isEmpty || priceText.isEmpty ? 0.5 : 1)
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)
                .padding(.top, SofraSpacing.md)
            }
            .ramadanBackground()
            .navigationTitle("تعديل الصنف")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("إلغاء") { dismiss() }
                }
            }
        }
    }

    private func saveChanges() async {
        guard let price = Double(priceText), price > 0 else { return }
        guard let uid = appState.currentUser?.uid else { return }

        isSaving = true

        var compressedData: Data? = nil
        if let img = previewImage {
            compressedData = img.jpegData(compressionQuality: 0.7)
        }
        
        // Calculate discount
        var discount: Double? = nil
        if hasDiscount, let d = Double(discountText), d > 0 && d <= 100 {
            discount = d
        }

        let ok = await vm.updateMenuItem(
            itemId: item.id,
            name: name,
            description: description,
            price: price,
            category: category.isEmpty ? "عام" : category,
            discountPercent: discount,
            imageData: compressedData,
            ownerId: uid,
            token: try? await appState.validToken()
        )

        isSaving = false
        if ok { dismiss() }
    }
}
