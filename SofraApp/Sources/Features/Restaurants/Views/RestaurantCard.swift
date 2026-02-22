// RestaurantCard.swift
// 🌙 بطاقة مطعم فخمة بطابع رمضاني — Premium Restaurant Card

import SwiftUI

struct RestaurantCard: View {
    let restaurant: Restaurant

    var body: some View {
        HStack(spacing: SofraSpacing.md) {
            // Info (RTL: info on the right)
            VStack(alignment: .trailing, spacing: SofraSpacing.xs) {
                HStack(spacing: SofraSpacing.xs) {
                    if restaurant.isVerified {
                        Image(systemName: "checkmark.seal.fill")
                            .font(.caption)
                            .foregroundStyle(SofraColors.gold400)
                    }
                    if restaurant.sellerTier != .bronze {
                        Image(systemName: restaurant.tierIcon)
                            .font(.caption)
                            .foregroundStyle(restaurant.sellerTier == .gold ? SofraColors.gold400 : SofraColors.textMuted)
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
                    HStack(spacing: 2) {
                        Circle()
                            .fill(restaurant.isOpen ? SofraColors.success : SofraColors.error)
                            .frame(width: 8, height: 8)
                        Text(restaurant.isOpen ? "مفتوح" : "مغلق")
                            .font(SofraTypography.caption2)
                            .foregroundStyle(restaurant.isOpen ? SofraColors.success : SofraColors.error)
                    }

                    HStack(spacing: 2) {
                        Text(restaurant.ratingText)
                            .font(SofraTypography.caption)
                            .foregroundStyle(SofraColors.textSecondary)
                        Image(systemName: "star.fill")
                            .font(.caption2)
                            .foregroundStyle(SofraColors.gold400)
                    }

                    if restaurant.packageType == .premium {
                        Text("مميز")
                            .font(SofraTypography.caption2)
                            .fontWeight(.semibold)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(SofraColors.gold500.opacity(0.2))
                            .foregroundStyle(SofraColors.gold400)
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
                        .foregroundStyle(SofraColors.gold400.opacity(0.5))
                default:
                    SkeletonView(width: 64, height: 64, radius: 14)
                }
            }
            .frame(width: 64, height: 64)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .strokeBorder(SofraColors.gold500.opacity(0.15), lineWidth: 0.8)
            )
            .shadow(color: SofraColors.gold500.opacity(0.1), radius: 6)
        }
        .padding(SofraSpacing.cardPadding)
        .background(
            RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous)
                .fill(.ultraThinMaterial)
                .environment(\.colorScheme, .dark)
        )
        .overlay(
            RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous)
                .strokeBorder(SofraColors.gold500.opacity(0.1), lineWidth: 0.5)
        )
        .shadow(color: Color.black.opacity(0.2), radius: 10, y: 4)
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
    .background(SofraColors.background)
}
