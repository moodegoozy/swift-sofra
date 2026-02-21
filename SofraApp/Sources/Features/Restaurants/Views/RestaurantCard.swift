// RestaurantCard.swift
// Premium restaurant card for list views

import SwiftUI

struct RestaurantCard: View {
    let restaurant: Restaurant

    var body: some View {
        HStack(spacing: SofraSpacing.md) {
            // Info (RTL: info on the right)
            VStack(alignment: .trailing, spacing: SofraSpacing.xs) {
                HStack(spacing: SofraSpacing.xs) {
                    // Verification badge
                    if restaurant.isVerified {
                        Image(systemName: "checkmark.seal.fill")
                            .font(.caption)
                            .foregroundStyle(SofraColors.primary)
                    }
                    // Tier badge
                    if restaurant.sellerTier != .bronze {
                        Image(systemName: restaurant.tierIcon)
                            .font(.caption)
                            .foregroundStyle(restaurant.sellerTier == .gold ? .yellow : .gray)
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
                            .foregroundStyle(SofraColors.textSecondary)
                        Image(systemName: "mappin")
                            .font(.caption2)
                            .foregroundStyle(SofraColors.textMuted)
                    }
                }

                HStack(spacing: SofraSpacing.sm) {
                    // Status
                    HStack(spacing: 2) {
                        Circle()
                            .fill(restaurant.isOpen ? SofraColors.success : SofraColors.error)
                            .frame(width: 8, height: 8)
                        Text(restaurant.isOpen ? "مفتوح" : "مغلق")
                            .font(SofraTypography.caption2)
                            .foregroundStyle(restaurant.isOpen ? SofraColors.success : SofraColors.error)
                    }

                    // Rating
                    HStack(spacing: 2) {
                        Text(restaurant.ratingText)
                            .font(SofraTypography.caption)
                            .foregroundStyle(SofraColors.textSecondary)
                        Image(systemName: "star.fill")
                            .font(.caption2)
                            .foregroundStyle(.yellow)
                    }

                    // Package
                    if restaurant.packageType == .premium {
                        Text("مميز")
                            .font(SofraTypography.caption2)
                            .fontWeight(.semibold)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(SofraColors.warning.opacity(0.15))
                            .foregroundStyle(SofraColors.warning)
                            .clipShape(Capsule())
                    }
                }
            }

            Spacer()

            // Logo
            AsyncImage(url: URL(string: restaurant.logoUrl ?? "")) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                case .failure:
                    Image(systemName: "storefront.fill")
                        .font(.title2)
                        .foregroundStyle(SofraColors.sky300)
                default:
                    SkeletonView(width: 64, height: 64, radius: 14)
                }
            }
            .frame(width: 64, height: 64)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .strokeBorder(SofraColors.sky100, lineWidth: 1)
            )
        }
        .padding(SofraSpacing.cardPadding)
        .background(SofraColors.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
        .shadow(color: .black.opacity(0.04), radius: 8, y: 4)
    }
}

#Preview {
    RestaurantCard(restaurant: .init(from: FirestoreDocumentResponse(
        name: "projects/x/databases/(default)/documents/restaurants/abc",
        fields: [
            "name": .string("مطبخ أم خالد"),
            "city": .string("الرياض"),
            "isOpen": .boolean(true),
            "averageRating": .double(4.7),
            "isVerified": .boolean(true),
            "sellerTier": .string("gold"),
            "packageType": .string("premium")
        ],
        createTime: nil, updateTime: nil
    )))
    .padding()
}
