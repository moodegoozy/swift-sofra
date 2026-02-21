// StatusBadge.swift
// Flexible status badge — accepts text + color OR raw status string

import SwiftUI

struct StatusBadge: View {
    let text: String
    let color: Color

    /// Init with custom text and color
    init(text: String, color: Color) {
        self.text = text
        self.color = color
    }

    /// Init from raw order status string (auto-localized + colored)
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
            .padding(.horizontal, SofraSpacing.sm)
            .padding(.vertical, SofraSpacing.xs)
            .foregroundStyle(.white)
            .background(color)
            .clipShape(Capsule())
    }
}

#Preview {
    VStack(spacing: 12) {
        StatusBadge(status: "pending")
        StatusBadge(status: "preparing")
        StatusBadge(text: "مخصص", color: .purple)
        StatusBadge(status: "delivered")
        StatusBadge(status: "cancelled")
    }
}
