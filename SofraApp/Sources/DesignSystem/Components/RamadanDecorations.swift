// RamadanDecorations.swift
// 🌙 زخارف رمضانية فخمة — هلال، فوانيس، نجوم، أنماط إسلامية
// Luxurious animated Ramadan decorations

import SwiftUI

// MARK: - ✨ Floating Stars Background
struct FloatingStarsView: View {
    @State private var animate = false
    let starCount: Int

    init(count: Int = 20) {
        self.starCount = count
    }

    var body: some View {
        GeometryReader { geo in
            ZStack {
                ForEach(0..<starCount, id: \.self) { i in
                    let seed = Double(i)
                    let x = CGFloat.random(in: 0...geo.size.width)
                    let y = CGFloat.random(in: 0...geo.size.height)
                    let size = CGFloat.random(in: 2...6)
                    let delay = Double.random(in: 0...3)

                    Circle()
                        .fill(SofraColors.gold300.opacity(Double.random(in: 0.15...0.5)))
                        .frame(width: size, height: size)
                        .position(x: x, y: y)
                        .opacity(animate ? 1 : 0.2)
                        .scaleEffect(animate ? 1.2 : 0.6)
                        .animation(
                            .easeInOut(duration: 2 + seed.truncatingRemainder(dividingBy: 2))
                            .repeatForever(autoreverses: true)
                            .delay(delay),
                            value: animate
                        )
                }
            }
        }
        .onAppear { animate = true }
        .allowsHitTesting(false)
    }
}

// MARK: - 🌙 Crescent Moon
struct CrescentMoonView: View {
    var size: CGFloat = 60
    var glowRadius: CGFloat = 20
    @State private var glowing = false

    var body: some View {
        ZStack {
            // Glow
            Image(systemName: "moon.fill")
                .font(.system(size: size))
                .foregroundStyle(SofraColors.gold300)
                .blur(radius: glowRadius)
                .opacity(glowing ? 0.6 : 0.3)

            // Moon
            Image(systemName: "moon.fill")
                .font(.system(size: size))
                .foregroundStyle(
                    .linearGradient(
                        colors: [SofraColors.gold300, SofraColors.gold500],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .shadow(color: SofraColors.gold400.opacity(0.5), radius: 10)
        }
        .onAppear {
            withAnimation(.easeInOut(duration: 3).repeatForever(autoreverses: true)) {
                glowing = true
            }
        }
    }
}

// MARK: - 🏮 Lantern
struct LanternView: View {
    var size: CGFloat = 40
    @State private var swinging = false

    var body: some View {
        VStack(spacing: 0) {
            // Hook
            Rectangle()
                .fill(SofraColors.gold600)
                .frame(width: 2, height: size * 0.3)

            // Lantern body
            ZStack {
                // Glow
                RoundedRectangle(cornerRadius: size * 0.2)
                    .fill(SofraColors.lanternOrange.opacity(0.3))
                    .frame(width: size * 1.3, height: size * 1.3)
                    .blur(radius: 12)

                // Body
                Image(systemName: "lamp.desk.fill")
                    .font(.system(size: size))
                    .foregroundStyle(
                        .linearGradient(
                            colors: [SofraColors.lanternOrange, SofraColors.gold600],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .shadow(color: SofraColors.lanternOrange.opacity(0.4), radius: 8)
            }
        }
        .rotationEffect(.degrees(swinging ? 5 : -5), anchor: .top)
        .onAppear {
            withAnimation(.easeInOut(duration: 2.5).repeatForever(autoreverses: true)) {
                swinging = true
            }
        }
    }
}

// MARK: - 🌙 Ramadan Banner Header
struct RamadanBannerView: View {
    @State private var shimmer = false

    var body: some View {
        ZStack {
            // Background with stars
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(SofraColors.premiumGradient)
                .overlay(
                    FloatingStarsView(count: 15)
                        .clipShape(RoundedRectangle(cornerRadius: 20))
                )

            // Content
            HStack {
                CrescentMoonView(size: 36, glowRadius: 12)

                Spacer()

                VStack(alignment: .trailing, spacing: SofraSpacing.xs) {
                    Text("رمضان كريم 🌙")
                        .font(SofraTypography.ramadanTitle)
                        .foregroundStyle(SofraColors.gold300)

                    Text("أطيب الأكلات من أسر منتجة")
                        .font(SofraTypography.subheadline)
                        .foregroundStyle(SofraColors.textSecondary)
                }
            }
            .padding(SofraSpacing.lg)
        }
        .frame(height: 110)
    }
}

// MARK: - ✨ Gold Shimmer Effect Modifier
struct GoldShimmerModifier: ViewModifier {
    @State private var phase: CGFloat = 0

    func body(content: Content) -> some View {
        content
            .overlay(
                GeometryReader { geo in
                    LinearGradient(
                        colors: [
                            .clear,
                            SofraColors.gold300.opacity(0.3),
                            SofraColors.gold400.opacity(0.5),
                            SofraColors.gold300.opacity(0.3),
                            .clear
                        ],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                    .frame(width: geo.size.width * 0.4)
                    .offset(x: phase * geo.size.width * 1.4 - geo.size.width * 0.2)
                    .mask(content)
                }
            )
            .onAppear {
                withAnimation(.linear(duration: 2.5).repeatForever(autoreverses: false)) {
                    phase = 1
                }
            }
    }
}

// MARK: - 🕌 Islamic Pattern Overlay
struct IslamicPatternOverlay: View {
    var opacity: Double = 0.03

    var body: some View {
        GeometryReader { geo in
            let size: CGFloat = 60
            let cols = Int(geo.size.width / size) + 1
            let rows = Int(geo.size.height / size) + 1

            Canvas { ctx, _ in
                for row in 0..<rows {
                    for col in 0..<cols {
                        let x = CGFloat(col) * size + (row.isMultiple(of: 2) ? size / 2 : 0)
                        let y = CGFloat(row) * size

                        // Star pattern
                        let path = starPath(center: CGPoint(x: x, y: y), radius: 8, points: 8)
                        ctx.fill(path, with: .color(SofraColors.gold500.opacity(opacity)))
                    }
                }
            }
        }
        .allowsHitTesting(false)
    }

    private func starPath(center: CGPoint, radius: CGFloat, points: Int) -> Path {
        var path = Path()
        let angle = .pi * 2 / CGFloat(points)

        for i in 0..<points {
            let outerAngle = angle * CGFloat(i) - .pi / 2
            let innerAngle = outerAngle + angle / 2
            let outerPoint = CGPoint(
                x: center.x + cos(outerAngle) * radius,
                y: center.y + sin(outerAngle) * radius
            )
            let innerPoint = CGPoint(
                x: center.x + cos(innerAngle) * (radius * 0.4),
                y: center.y + sin(innerAngle) * (radius * 0.4)
            )

            if i == 0 {
                path.move(to: outerPoint)
            } else {
                path.addLine(to: outerPoint)
            }
            path.addLine(to: innerPoint)
        }
        path.closeSubpath()
        return path
    }
}

// MARK: - View Extensions
extension View {
    func goldShimmer() -> some View {
        modifier(GoldShimmerModifier())
    }

    func ramadanBackground() -> some View {
        self
            .background(
                ZStack {
                    SofraColors.background.ignoresSafeArea()
                    IslamicPatternOverlay()
                        .ignoresSafeArea()
                    FloatingStarsView(count: 12)
                        .ignoresSafeArea()
                }
            )
    }
}

#Preview("Ramadan Banner") {
    VStack {
        RamadanBannerView()
            .padding()

        HStack(spacing: 30) {
            LanternView(size: 30)
            CrescentMoonView(size: 40)
            LanternView(size: 30)
        }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(SofraColors.background)
}
