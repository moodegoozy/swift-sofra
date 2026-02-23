// View+Extensions.swift
// SwiftUI View helpers used across the app

import SwiftUI

extension View {
    /// Hides the view conditionally (keeps layout space)
    @ViewBuilder
    func hidden(_ shouldHide: Bool) -> some View {
        if shouldHide { self.hidden() } else { self }
    }

    /// Applies a card-like background with shadow
    func sofraCard() -> some View {
        self
            .background(SofraColors.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.cardRadius, style: .continuous))
            .shadow(color: .black.opacity(0.06), radius: 8, x: 0, y: 4)
    }

    /// Shimmer / skeleton loading modifier
    func shimmer(isActive: Bool) -> some View {
        self.modifier(ShimmerModifier(isActive: isActive))
    }

    /// Adds standard horizontal padding
    func sofraHPadding() -> some View {
        self.padding(.horizontal, SofraSpacing.screenHorizontal)
    }

    /// Convenience for trailing alignment in RTL layout
    func rtlLeading() -> some View {
        self.frame(maxWidth: .infinity, alignment: .trailing)
    }
}

// MARK: - Shimmer Modifier
struct ShimmerModifier: ViewModifier {
    let isActive: Bool
    @State private var phase: CGFloat = 0

    func body(content: Content) -> some View {
        if isActive {
            content
                .redacted(reason: .placeholder)
                .overlay(
                    GeometryReader { geo in
                        LinearGradient(
                            colors: [.clear, .white.opacity(0.4), .clear],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                        .frame(width: geo.size.width * 0.6)
                        .offset(x: phase * geo.size.width * 1.6 - geo.size.width * 0.3)
                    }
                    .clipped()
                )
                .onAppear {
                    withAnimation(.linear(duration: 1.2).repeatForever(autoreverses: false)) {
                        phase = 1
                    }
                }
        } else {
            content
        }
    }
}
