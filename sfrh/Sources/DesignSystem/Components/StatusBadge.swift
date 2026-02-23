// StatusBadge.swift
// 🌙 شارة حالة فخمة بتوهج ذهبي — Premium Glowing Status Badge

import SwiftUI

struct StatusBadge: View {
    let text: String
    let color: Color

    init(text: String, color: Color) {
        self.text = text
        self.color = color
    }

    init(status: String) {
        self.color = SofraColors.orderStatusColor(status)
        switch status {
        case "pending":          self.text = "بانتظار القبول"
        case "accepted":         self.text = "تم القبول"
        case "preparing":        self.text = "قيد التحضير"
        case "ready":            self.text = "جاهز"
        case "out_for_delivery": self.text = "في الطريق"
        case "delivered":        self.text = "تم التوصيل"
        case "cancelled":        self.text = "ملغي"
        default:                 self.text = status
        }
    }

    var body: some View {
        Text(text)
            .font(SofraTypography.caption)
            .fontWeight(.semibold)
            .padding(.horizontal, SofraSpacing.md)
            .padding(.vertical, SofraSpacing.xs + 2)
            .foregroundStyle(.white)
            .background(
                Capsule()
                    .fill(color.opacity(0.85))
                    .overlay(
                        Capsule()
                            .strokeBorder(color.opacity(0.4), lineWidth: 0.5)
                    )
            )
            .shadow(color: color.opacity(0.3), radius: 6, y: 2)
    }
}

#Preview {
    VStack(spacing: 12) {
        StatusBadge(status: "pending")
        StatusBadge(status: "preparing")
        StatusBadge(text: "مميز", color: SofraColors.gold500)
        StatusBadge(status: "delivered")
        StatusBadge(status: "cancelled")
    }
    .padding()
    .background(SofraColors.background)
}
