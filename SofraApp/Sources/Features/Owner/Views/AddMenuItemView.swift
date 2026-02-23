// AddMenuItemView.swift
// Form for adding a new menu item with optional photo

import SwiftUI
import PhotosUI

struct AddMenuItemView: View {
    @Environment(AppState.self) var appState
    @Environment(\.dismiss) var dismiss
    @Bindable var vm: OwnerDashboardViewModel

    @State private var name = ""
    @State private var description = ""
    @State private var priceText = ""
    @State private var category = ""
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var selectedImageData: Data?
    @State private var previewImage: UIImage?
    @State private var isSaving = false

    private let categories = ["رئيسي", "مقبلات", "مشروبات", "حلويات", "سلطات", "عام"]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: SofraSpacing.lg) {
                    // Photo Picker
                    PhotosPicker(selection: $selectedPhoto, matching: .images) {
                        ZStack {
                            if let previewImage {
                                Image(uiImage: previewImage)
                                    .resizable()
                                    .aspectRatio(contentMode: .fill)
                            } else {
                                VStack(spacing: SofraSpacing.sm) {
                                    Image(systemName: "camera.fill")
                                        .font(.largeTitle)
                                        .foregroundStyle(SofraColors.primary)
                                    Text("إضافة صورة")
                                        .font(SofraTypography.calloutSemibold)
                                        .foregroundStyle(SofraColors.textSecondary)
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
                                selectedImageData = data
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
                        title: isSaving ? "جاري الحفظ..." : "إضافة الصنف",
                        icon: "plus.circle.fill",
                        isLoading: isSaving
                    ) {
                        Task { await saveItem() }
                    }
                    .disabled(name.isEmpty || priceText.isEmpty || isSaving)
                    .opacity(name.isEmpty || priceText.isEmpty ? 0.5 : 1)
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)
                .padding(.top, SofraSpacing.md)
            }
            .ramadanBackground()
            .navigationTitle("إضافة صنف جديد")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("إلغاء") { dismiss() }
                }
            }
        }
    }

    private func saveItem() async {
        guard let price = Double(priceText), price > 0 else { return }
        guard let uid = appState.currentUser?.uid else { return }

        isSaving = true

        // Compress image if provided
        var compressedData: Data? = nil
        if let img = previewImage {
            compressedData = img.jpegData(compressionQuality: 0.7)
        }

        await vm.addMenuItem(
            name: name,
            description: description,
            price: price,
            category: category.isEmpty ? "عام" : category,
            imageData: compressedData,
            ownerId: uid,
            token: try? await appState.validToken()
        )

        isSaving = false
        dismiss()
    }
}
