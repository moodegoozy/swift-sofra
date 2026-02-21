// SofraTextField.swift
// Styled text input with icon, label, validation states

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
                .foregroundStyle(SofraColors.textSecondary)

            // Input row
            HStack(spacing: SofraSpacing.sm) {
                if let icon {
                    Image(systemName: icon)
                        .foregroundStyle(isFocused ? SofraColors.primary : SofraColors.textMuted)
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
            }
            .padding(.horizontal, SofraSpacing.inputHPadding)
            .frame(height: SofraSpacing.inputHeight)
            .background(SofraColors.sky50)
            .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.inputRadius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: SofraSpacing.inputRadius, style: .continuous)
                    .strokeBorder(
                        errorMessage != nil ? SofraColors.error :
                            isFocused ? SofraColors.primary : SofraColors.sky200,
                        lineWidth: 1.5
                    )
            )

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
}
