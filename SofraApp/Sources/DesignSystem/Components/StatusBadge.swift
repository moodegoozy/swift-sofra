// StatusBadge.swift
// Order status badge with localized Arabic labels

import SwiftUI

struct StatusBadge: View {
    let status: String

    var body: some View {
        Text(localizedStatus)
            .font(SofraTypography.caption)
            .fontWeight(.semibold)
            .padding(.horizontal, SofraSpacing.sm)
            .padding(.vertical, SofraSpacing.xs)
            .foregroundStyle(.white)
            .background(SofraColors.orderStatusColor(status))
            .clipShape(Capsule())
    }

    private var localizedStatus: String {
        switch status {
        case "pending":          return "بانتظار القبول"
        case "accepted":         return "تم القبول"
        case "preparing":        return "قيد التحضير"
        case "ready":            return "جاهز"
        case "out_for_delivery": return "في الطريق"
        case "delivered":        return "تم التوصيل"
        case "cancelled":        return "ملغي"
        default:                 return status
        }
    }
}

#Preview {
    VStack(spacing: 12) {
        StatusBadge(status: "pending")
        StatusBadge(status: "preparing")
        StatusBadge(status: "out_for_delivery")
        StatusBadge(status: "delivered")
        StatusBadge(status: "cancelled")
    }
}
