// RegisterChoiceView.swift
// Matches web /register (RegisterChoice) — pick role before registering

import SwiftUI

struct RegisterChoiceView: View {
    @State private var selectedRole: UserRole?
    @State private var navigateToForm = false

    private let roleOptions: [(role: UserRole, icon: String, title: String, subtitle: String)] = [
        (.customer, "bag.fill", "عميل", "اطلب وجباتك المفضلة من الأسر المنتجة"),
        (.owner, "storefront.fill", "أسرة منتجة", "سجّل مطعمك وابدأ البيع"),
        (.courier, "car.fill", "مندوب توصيل", "انضم كمندوب واكسب دخلاً إضافياً"),
    ]

    var body: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.xl) {
                // Header
                VStack(spacing: SofraSpacing.sm) {
                    Text("إنشاء حساب")
                        .font(SofraTypography.title)
                        .foregroundStyle(SofraColors.primaryDark)

                    Text("اختر نوع حسابك")
                        .font(SofraTypography.body)
                        .foregroundStyle(SofraColors.textSecondary)
                }
                .padding(.top, SofraSpacing.xl)

                // Role Cards
                VStack(spacing: SofraSpacing.md) {
                    ForEach(roleOptions, id: \.role) { option in
                        Button {
                            withAnimation(.spring(response: 0.3)) {
                                selectedRole = option.role
                            }
                            let impact = UIImpactFeedbackGenerator(style: .light)
                            impact.impactOccurred()
                        } label: {
                            HStack(spacing: SofraSpacing.lg) {
                                Image(systemName: option.icon)
                                    .font(.title2)
                                    .foregroundStyle(selectedRole == option.role ? .white : SofraColors.primary)
                                    .frame(width: 48, height: 48)
                                    .background(
                                        selectedRole == option.role ? SofraColors.primary : SofraColors.sky100
                                    )
                                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

                                VStack(alignment: .trailing, spacing: SofraSpacing.xxs) {
                                    Text(option.title)
                                        .font(SofraTypography.headline)
                                        .foregroundStyle(SofraColors.textPrimary)

                                    Text(option.subtitle)
                                        .font(SofraTypography.caption)
                                        .foregroundStyle(SofraColors.textSecondary)
                                        .multilineTextAlignment(.trailing)
                                }

                                Spacer()

                                Image(systemName: selectedRole == option.role ? "checkmark.circle.fill" : "circle")
                                    .font(.title3)
                                    .foregroundStyle(selectedRole == option.role ? SofraColors.primary : SofraColors.sky200)
                            }
                            .padding(SofraSpacing.lg)
                            .background(SofraColors.cardBackground)
                            .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
                            .overlay(
                                RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous)
                                    .strokeBorder(
                                        selectedRole == option.role ? SofraColors.primary : Color.clear,
                                        lineWidth: 2
                                    )
                            )
                            .shadow(color: .black.opacity(0.04), radius: 8, y: 4)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                // Continue Button
                SofraButton(
                    title: "متابعة",
                    icon: "arrow.left.circle.fill",
                    isDisabled: selectedRole == nil
                ) {
                    navigateToForm = true
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)
                .padding(.top, SofraSpacing.md)
            }
        }
        .background(SofraColors.background.ignoresSafeArea())
        .navigationTitle("نوع الحساب")
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(isPresented: $navigateToForm) {
            if let role = selectedRole {
                RegisterView(selectedRole: role)
            }
        }
    }
}

#Preview {
    NavigationStack {
        RegisterChoiceView()
    }
}
