// MenuItemCard.swift
// Individual menu item card with add-to-cart

import SwiftUI

struct MenuItemCard: View {
    let item: MenuItem
    let onAdd: () -> Void

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
                    // Add button
                    Button(action: onAdd) {
                        Image(systemName: "plus.circle.fill")
                            .font(.title2)
                            .foregroundStyle(SofraColors.primary)
                    }

                    Spacer()

                    // Price
                    if item.hasDiscount {
                        VStack(alignment: .trailing, spacing: 0) {
                            Text("\(item.price, specifier: "%.0f") ر.س")
                                .font(SofraTypography.caption2)
                                .strikethrough()
                                .foregroundStyle(SofraColors.textMuted)
                            Text("\(item.finalPrice, specifier: "%.0f") ر.س")
                                .font(SofraTypography.priceSmall)
                                .foregroundStyle(SofraColors.success)
                        }
                    } else {
                        Text("\(item.price, specifier: "%.0f") ر.س")
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

#Preview {
    MenuItemCard(
        item: MenuItem(id: "1", name: "برست دجاج مقرمش", price: 25, ownerId: "o1")
    ) {}
    .padding()
}
