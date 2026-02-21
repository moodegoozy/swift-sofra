// SkeletonView.swift
// Skeleton loading placeholders for premium feel

import SwiftUI

struct SkeletonView: View {
    var width: CGFloat? = nil
    var height: CGFloat = 16
    var radius: CGFloat = 8

    @State private var phase: CGFloat = 0

    var body: some View {
        RoundedRectangle(cornerRadius: radius, style: .continuous)
            .fill(SofraColors.sky100)
            .frame(width: width, height: height)
            .overlay(
                GeometryReader { geo in
                    LinearGradient(
                        colors: [.clear, SofraColors.sky50.opacity(0.6), .clear],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                    .frame(width: geo.size.width * 0.5)
                    .offset(x: phase * geo.size.width * 1.5 - geo.size.width * 0.25)
                }
                .clipped()
            )
            .clipShape(RoundedRectangle(cornerRadius: radius, style: .continuous))
            .onAppear {
                withAnimation(.linear(duration: 1.3).repeatForever(autoreverses: false)) {
                    phase = 1
                }
            }
    }
}

// MARK: - Skeleton Card (for list loading)
struct SkeletonCard: View {
    var body: some View {
        SofraCard {
            HStack(spacing: SofraSpacing.md) {
                SkeletonView(width: 64, height: 64, radius: 12)
                VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
                    SkeletonView(width: 140, height: 18)
                    SkeletonView(width: 200, height: 14)
                    SkeletonView(width: 80, height: 14)
                }
            }
        }
    }
}

#Preview {
    VStack(spacing: 16) {
        SkeletonCard()
        SkeletonCard()
        SkeletonCard()
    }
    .padding()
    .background(SofraColors.background)
}
