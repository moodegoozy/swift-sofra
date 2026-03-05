// TermsPrivacySheetView.swift
// صفحة منبثقة للشروط والأحكام وسياسة الخصوصية

import SwiftUI

struct TermsPrivacySheetView: View {
    @Environment(\.dismiss) var dismiss
    @State private var selectedTab = 0
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Tab selector
                Picker("", selection: $selectedTab) {
                    Text("الشروط والأحكام").tag(0)
                    Text("سياسة الخصوصية").tag(1)
                }
                .pickerStyle(.segmented)
                .padding(.horizontal, SofraSpacing.screenHorizontal)
                .padding(.vertical, SofraSpacing.md)
                
                TabView(selection: $selectedTab) {
                    termsContent
                        .tag(0)
                    
                    privacyContent
                        .tag(1)
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
            }
            .ramadanBackground()
            .navigationTitle(selectedTab == 0 ? "الشروط والأحكام" : "سياسة الخصوصية")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("إغلاق") { dismiss() }
                        .foregroundStyle(SofraColors.gold400)
                }
            }
        }
    }
    
    // MARK: - Terms Content
    private var termsContent: some View {
        ScrollView {
            VStack(alignment: .trailing, spacing: SofraSpacing.lg) {
                // Important warning banner
                VStack(spacing: SofraSpacing.sm) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.title)
                        .foregroundStyle(SofraColors.warning)
                    
                    Text("تنبيه مهم")
                        .font(SofraTypography.headline)
                        .foregroundStyle(SofraColors.warning)
                    
                    Text("سفرة البيت منصة وسيطة فقط تربط بين العملاء والمطاعم والمندوبين. نحن لا نقوم بإعداد الطعام ولا نتحكم في جودته أو نظافته أو مكوناته. المسؤولية الكاملة عن جودة الطعام وسلامته تقع على عاتق المطعم المُعد له.")
                        .font(SofraTypography.body)
                        .foregroundStyle(SofraColors.textPrimary)
                        .multilineTextAlignment(.center)
                }
                .padding(SofraSpacing.lg)
                .frame(maxWidth: .infinity)
                .background(SofraColors.warning.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .strokeBorder(SofraColors.warning.opacity(0.3), lineWidth: 1)
                )
                
                termSection(
                    title: "طبيعة المنصة",
                    content: """
                    • سفرة البيت هي سوق إلكتروني يربط بين المطاعم المنزلية (الأسر المنتجة) والعملاء
                    • نحن لسنا مطعماً ولا نقوم بإعداد أي طعام
                    • دورنا يقتصر على تسهيل عملية الطلب والتوصيل
                    • كل مطعم مسؤول بشكل كامل عن منتجاته
                    """
                )
                
                termSection(
                    title: "إخلاء المسؤولية",
                    content: """
                    سفرة البيت غير مسؤولة عن:
                    • جودة الطعام أو طعمه أو مظهره
                    • سلامة الغذاء والنظافة
                    • المكونات أو المواد المسببة للحساسية
                    • أي ضرر صحي ناتج عن استهلاك الطعام
                    • تأخر التوصيل بسبب ظروف خارجة عن إرادتنا
                    
                    بطلبك عبر المنصة، فإنك تقر بفهمك وموافقتك على هذا الإخلاء.
                    """
                )
                
                termSection(
                    title: "الرسوم والأسعار",
                    content: """
                    • أسعار الأصناف يحددها كل مطعم
                    • رسوم الخدمة: 1.75 ريال لكل صنف
                    • ضريبة القيمة المضافة: 15% على رسوم الخدمة
                    • رسوم التوصيل تحدد حسب المسافة
                    • جميع الأسعار معروضة بالريال السعودي
                    """
                )
                
                Text("آخر تحديث: 5 مارس 2026")
                    .font(SofraTypography.caption)
                    .foregroundStyle(SofraColors.textMuted)
                    .frame(maxWidth: .infinity, alignment: .center)
            }
            .padding(SofraSpacing.screenHorizontal)
        }
    }
    
    // MARK: - Privacy Content
    private var privacyContent: some View {
        ScrollView {
            VStack(alignment: .trailing, spacing: SofraSpacing.lg) {
                policySection(
                    title: "من نحن",
                    content: "سفرة البيت منصة إلكترونية وسيطة تربط بين العملاء والمطاعم المنزلية. نحن لا نقوم بإعداد الطعام، والمسؤولية عن جودته وسلامته تقع على المطعم."
                )
                
                policySection(
                    title: "البيانات التي نجمعها",
                    content: """
                    • الاسم ورقم الهاتف والبريد الإلكتروني
                    • عنوان التوصيل والموقع الجغرافي
                    • سجل الطلبات والتفضيلات
                    • بيانات الجهاز لأغراض تقنية
                    """
                )
                
                policySection(
                    title: "كيف نستخدم بياناتك",
                    content: """
                    • معالجة وتوصيل الطلبات
                    • التواصل معك بخصوص طلباتك
                    • تحسين خدماتنا وتجربة المستخدم
                    • إرسال إشعارات مهمة
                    """
                )
                
                policySection(
                    title: "مشاركة البيانات",
                    content: """
                    نشارك بياناتك فقط مع:
                    • المطاعم لتنفيذ طلباتك
                    • مندوبي التوصيل لإيصال الطلبات
                    • مزودي الخدمات التقنية
                    
                    لا نبيع بياناتك لأي طرف ثالث.
                    """
                )
                
                policySection(
                    title: "حقوقك",
                    content: """
                    • طلب حذف حسابك وبياناتك
                    • تعديل بياناتك الشخصية
                    • إلغاء الاشتراك في الإشعارات
                    • طلب نسخة من بياناتك
                    """
                )
                
                Text("آخر تحديث: 5 مارس 2026")
                    .font(SofraTypography.caption)
                    .foregroundStyle(SofraColors.textMuted)
                    .frame(maxWidth: .infinity, alignment: .center)
            }
            .padding(SofraSpacing.screenHorizontal)
        }
    }
    
    // MARK: - Helpers
    private func termSection(title: String, content: String) -> some View {
        VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
            Text(title)
                .font(SofraTypography.headline)
                .foregroundStyle(SofraColors.gold400)
            Text(content)
                .font(SofraTypography.body)
                .foregroundStyle(SofraColors.textSecondary)
                .multilineTextAlignment(.trailing)
                .lineSpacing(6)
        }
    }
    
    private func policySection(title: String, content: String) -> some View {
        VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
            Text(title)
                .font(SofraTypography.headline)
                .foregroundStyle(SofraColors.gold400)
            Text(content)
                .font(SofraTypography.body)
                .foregroundStyle(SofraColors.textSecondary)
                .multilineTextAlignment(.trailing)
                .lineSpacing(6)
        }
    }
}

#Preview {
    TermsPrivacySheetView()
}
