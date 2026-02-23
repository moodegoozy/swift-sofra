// PrivacyPolicyView.swift
// سياسة الخصوصية

import SwiftUI

struct PrivacyPolicyView: View {
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .trailing, spacing: SofraSpacing.lg) {
                    policySection(
                        title: "مقدمة",
                        content: "نحن في سفرة البيت نحرص على حماية خصوصيتك وبياناتك الشخصية. توضح هذه السياسة كيفية جمع واستخدام وحماية معلوماتك عند استخدام تطبيقنا."
                    )

                    policySection(
                        title: "البيانات التي نجمعها",
                        content: """
                        • الاسم ورقم الهاتف والبريد الإلكتروني عند التسجيل
                        • عنوان التوصيل والموقع الجغرافي لتقديم خدمة التوصيل
                        • سجل الطلبات لتحسين تجربتك
                        • بيانات الجهاز لأغراض تقنية
                        """
                    )

                    policySection(
                        title: "كيف نستخدم بياناتك",
                        content: """
                        • معالجة وتوصيل الطلبات
                        • التواصل معك بخصوص طلباتك
                        • تحسين خدماتنا وتجربة المستخدم
                        • إرسال إشعارات مهمة عن الطلبات
                        """
                    )

                    policySection(
                        title: "حماية البيانات",
                        content: "نستخدم تقنيات تشفير متقدمة لحماية بياناتك. لا نشارك معلوماتك الشخصية مع أطراف ثالثة إلا بما يخدم تنفيذ الطلبات."
                    )

                    policySection(
                        title: "حقوقك",
                        content: """
                        • طلب حذف حسابك وبياناتك
                        • تعديل بياناتك الشخصية في أي وقت
                        • إلغاء الاشتراك في الإشعارات
                        • طلب نسخة من بياناتك
                        """
                    )

                    policySection(
                        title: "التواصل",
                        content: "لأي استفسار عن سياسة الخصوصية، تواصل معنا عبر الدعم الفني في التطبيق."
                    )
                }
                .padding(SofraSpacing.screenHorizontal)
            }
            .ramadanBackground()
            .navigationTitle("سياسة الخصوصية")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("إغلاق") { dismiss() }
                        .foregroundStyle(SofraColors.gold400)
                }
            }
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
