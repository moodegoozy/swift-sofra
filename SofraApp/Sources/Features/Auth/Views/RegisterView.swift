// RegisterView.swift
// Registration form matching web app /register/form

import SwiftUI

struct RegisterView: View {
    let selectedRole: UserRole
    @Environment(AppState.self) var appState
    @State private var vm = AuthViewModel()
    @State private var showLocationPicker = false
    @State private var selectedLat: Double = 0
    @State private var selectedLng: Double = 0
    @State private var selectedAddress = ""
    @State private var agreedToTerms = false
    @State private var showTermsSheet = false

    var body: some View {
        ScrollView {
            VStack(spacing: SofraSpacing.xl) {
                // Header
                VStack(spacing: SofraSpacing.sm) {
                    Image(systemName: roleIcon)
                        .font(.system(size: 48))
                        .foregroundStyle(SofraColors.gold400)

                    Text(roleTitle)
                        .font(SofraTypography.title2)
                        .foregroundStyle(SofraColors.gold300)
                }
                .padding(.top, SofraSpacing.lg)

                // Form
                VStack(spacing: SofraSpacing.lg) {
                    SofraTextField(
                        label: "الاسم الكامل",
                        text: $vm.registerName,
                        icon: "person",
                        placeholder: "أدخل اسمك"
                    )
                    .textContentType(.name)

                    SofraTextField(
                        label: "البريد الإلكتروني",
                        text: $vm.registerEmail,
                        icon: "envelope",
                        placeholder: "example@email.com",
                        keyboardType: .emailAddress
                    )
                    .textContentType(.emailAddress)
                    .autocapitalization(.none)

                    SofraTextField(
                        label: "رقم الجوال",
                        text: $vm.registerPhone,
                        icon: "phone",
                        placeholder: "05xxxxxxxx",
                        keyboardType: .phonePad
                    )
                    .textContentType(.telephoneNumber)

                    // Location via Map
                    Button {
                        showLocationPicker = true
                    } label: {
                        HStack {
                            Image(systemName: "chevron.left")
                                .foregroundStyle(SofraColors.textMuted)
                            Spacer()
                            VStack(alignment: .trailing, spacing: SofraSpacing.xxs) {
                                Text("الموقع على الخريطة")
                                    .font(SofraTypography.callout)
                                    .foregroundStyle(SofraColors.textPrimary)
                                Text(selectedAddress.isEmpty ? "اضغط لتحديد موقعك" : selectedAddress)
                                    .font(SofraTypography.caption)
                                    .foregroundStyle(selectedAddress.isEmpty ? SofraColors.textMuted : SofraColors.success)
                                    .lineLimit(1)
                            }
                            Image(systemName: "map.fill")
                                .foregroundStyle(SofraColors.gold400)
                                .frame(width: 28)
                        }
                        .padding(SofraSpacing.md)
                        .background(SofraColors.cardBackground)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .strokeBorder(SofraColors.gold500.opacity(0.15), lineWidth: 0.5)
                        )
                    }

                    SofraTextField(
                        label: "كلمة المرور",
                        text: $vm.registerPassword,
                        icon: "lock",
                        placeholder: "6 أحرف على الأقل",
                        isSecure: true
                    )
                    .textContentType(.newPassword)
                    
                    // Terms agreement checkbox
                    HStack(alignment: .top, spacing: SofraSpacing.sm) {
                        Button {
                            agreedToTerms.toggle()
                        } label: {
                            Image(systemName: agreedToTerms ? "checkmark.square.fill" : "square")
                                .font(.title2)
                                .foregroundStyle(agreedToTerms ? SofraColors.gold400 : SofraColors.textMuted)
                        }
                        
                        VStack(alignment: .trailing, spacing: 4) {
                            Text("أوافق على ")
                                .font(SofraTypography.callout)
                                .foregroundStyle(SofraColors.textSecondary)
                            + Text("الشروط والأحكام")
                                .font(SofraTypography.callout)
                                .foregroundStyle(SofraColors.gold400)
                                .underline()
                            + Text(" و ")
                                .font(SofraTypography.callout)
                                .foregroundStyle(SofraColors.textSecondary)
                            + Text("سياسة الخصوصية")
                                .font(SofraTypography.callout)
                                .foregroundStyle(SofraColors.gold400)
                                .underline()
                        }
                        .multilineTextAlignment(.trailing)
                        .onTapGesture {
                            showTermsSheet = true
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .trailing)
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)

                // Submit
                SofraButton(
                    title: "إنشاء الحساب",
                    icon: "person.badge.plus",
                    isLoading: vm.isLoading,
                    isDisabled: !agreedToTerms
                ) {
                    vm.selectedRole = selectedRole
                    vm.registerLat = selectedLat
                    vm.registerLng = selectedLng
                    vm.registerLocationAddress = selectedAddress
                    Task { await vm.register(appState: appState) }
                }
                .padding(.horizontal, SofraSpacing.screenHorizontal)
                
                if !agreedToTerms {
                    Text("يجب الموافقة على الشروط والأحكام للمتابعة")
                        .font(SofraTypography.caption)
                        .foregroundStyle(SofraColors.warning)
                }

                Spacer(minLength: SofraSpacing.xxxl)
            }
        }
        .ramadanBackground()
        .navigationTitle("تسجيل جديد")
        .navigationBarTitleDisplayMode(.inline)
        .alert("خطأ", isPresented: $vm.showError) {
            Button("حسناً", role: .cancel) {}
        } message: {
            Text(vm.errorMessage ?? "")
        }
        .sheet(isPresented: $showLocationPicker) {
            LocationPickerView(
                title: "حدد موقعك",
                subtitle: "اختر موقعك على الخريطة"
            ) { lat, lng, addr in
                selectedLat = lat
                selectedLng = lng
                selectedAddress = addr
            }
        }
        .sheet(isPresented: $showTermsSheet) {
            TermsPrivacySheetView()
        }
    }

    // MARK: - Role-specific UI
    private var roleIcon: String {
        switch selectedRole {
        case .customer: return "bag.fill"
        case .owner:    return "storefront.fill"
        case .courier:  return "car.fill"
        default:        return "person.fill"
        }
    }

    private var roleTitle: String {
        switch selectedRole {
        case .customer: return "حساب عميل جديد"
        case .owner:    return "تسجيل أسرة منتجة"
        case .courier:  return "تسجيل مندوب"
        default:        return "تسجيل جديد"
        }
    }
}

#Preview {
    NavigationStack {
        RegisterView(selectedRole: .customer)
            .environment(AppState())
    }
}
