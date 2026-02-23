// SofraTextField.swift
// 🌙 حقل إدخال فخم بطابع رمضاني — Premium Dark Input

import SwiftUI

struct SofraTextField: View {
    let label: String
    @Binding var text: String
    var icon: String?
    var placeholder: String = ""
    var isSecure: Bool = false
    var keyboardType: UIKeyboardType = .default
    var errorMessage: String?

    @FocusState private var isFocused: Bool

    var body: some View {
        VStack(alignment: .trailing, spacing: SofraSpacing.xs) {
            // Label
            Text(label)
                .font(SofraTypography.subheadline)
                .foregroundStyle(isFocused ? SofraColors.gold400 : SofraColors.textSecondary)

            // Input row
            HStack(spacing: SofraSpacing.sm) {
                if let icon {
                    Image(systemName: icon)
                        .foregroundStyle(isFocused ? SofraColors.gold400 : SofraColors.textMuted)
                        .frame(width: 20)
                }

                Group {
                    if isSecure {
                        SecureField(placeholder, text: $text)
                    } else {
                        TextField(placeholder, text: $text)
                            .keyboardType(keyboardType)
                    }
                }
                .multilineTextAlignment(.trailing)
                .focused($isFocused)
                .foregroundStyle(SofraColors.textPrimary)
            }
            .padding(.horizontal, SofraSpacing.inputHPadding)
            .frame(height: SofraSpacing.inputHeight)
            .background(SofraColors.surfaceElevated.opacity(0.6))
            .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.inputRadius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: SofraSpacing.inputRadius, style: .continuous)
                    .strokeBorder(
                        errorMessage != nil ? SofraColors.error :
                            isFocused ? SofraColors.gold400 : SofraColors.gold500.opacity(0.15),
                        lineWidth: isFocused ? 1.5 : 0.8
                    )
            )
            .shadow(color: isFocused ? SofraColors.gold500.opacity(0.15) : .clear, radius: 8)

            // Error
            if let errorMessage {
                Text(errorMessage)
                    .font(SofraTypography.caption)
                    .foregroundStyle(SofraColors.error)
            }
        }
    }
}

#Preview {
    VStack(spacing: 20) {
        SofraTextField(label: "البريد الإلكتروني", text: .constant(""), icon: "envelope", placeholder: "example@email.com", keyboardType: .emailAddress)
        SofraTextField(label: "كلمة المرور", text: .constant(""), icon: "lock", placeholder: "••••••••", isSecure: true, errorMessage: "كلمة المرور قصيرة جداً")
    }
    .padding()
    .background(SofraColors.background)
}
