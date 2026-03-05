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
                        content: "نحن في سفرة البيت نحرص على حماية خصوصيتك وبياناتك الشخصية. سفرة البيت منصة إلكترونية وسيطة تربط بين العملاء والمطاعم المنزلية، ونلتزم بحماية معلوماتك وفقاً لأنظمة حماية البيانات في المملكة العربية السعودية."
                    )
                    
                    policySection(
                        title: "من نحن",
                        content: """
                        سفرة البيت هي منصة إلكترونية وسيطة تهدف إلى:
                        • ربط العملاء بالمطاعم المنزلية
                        • تسهيل عملية الطلب والتوصيل
                        • توفير تجربة طلب طعام سهلة وآمنة
                        
                        نحن لا نقوم بإعداد الطعام ولا نتحكم في جودته. المسؤولية الكاملة عن جودة الطعام وسلامته تقع على المطعم.
                        """
                    )

                    policySection(
                        title: "البيانات التي نجمعها",
                        content: """
                        • الاسم ورقم الهاتف والبريد الإلكتروني عند التسجيل
                        • عنوان التوصيل والموقع الجغرافي لتقديم خدمة التوصيل
                        • سجل الطلبات والتفضيلات لتحسين تجربتك
                        • بيانات الجهاز ومعرّفات الإعلانات لأغراض تقنية
                        • معلومات الدفع (لا نخزن بيانات البطاقات)
                        """
                    )

                    policySection(
                        title: "كيف نستخدم بياناتك",
                        content: """
                        • معالجة وتوصيل الطلبات
                        • التواصل معك بخصوص طلباتك وتحديثاتها
                        • تحسين خدماتنا وتجربة المستخدم
                        • إرسال إشعارات مهمة عن الطلبات والعروض
                        • تحليل البيانات لتطوير التطبيق (بشكل مجهول)
                        • الامتثال للمتطلبات القانونية
                        """
                    )

                    policySection(
                        title: "مشاركة البيانات",
                        content: """
                        نشارك بياناتك فقط مع:
                        • المطاعم لتنفيذ طلباتك (الاسم، العنوان، رقم الهاتف)
                        • مندوبي التوصيل لإيصال الطلبات (الاسم، العنوان، رقم الهاتف)
                        • مزودي الخدمات التقنية (Firebase, Google Cloud)
                        • الجهات الحكومية عند الطلب القانوني
                        
                        لا نبيع بياناتك لأي طرف ثالث لأغراض تسويقية.
                        """
                    )

                    policySection(
                        title: "حماية البيانات",
                        content: """
                        • نستخدم تشفير SSL/TLS لحماية البيانات أثناء النقل
                        • البيانات مخزنة في خوادم آمنة (Google Cloud)
                        • نطبق سياسات صارمة للوصول للبيانات
                        • نحذف البيانات عند حذف الحساب
                        • نراجع إجراءات الأمان بشكل دوري
                        """
                    )

                    policySection(
                        title: "حقوقك",
                        content: """
                        لديك الحق في:
                        • الوصول إلى بياناتك الشخصية
                        • تصحيح بياناتك إذا كانت غير دقيقة
                        • طلب حذف حسابك وجميع بياناتك
                        • إلغاء الاشتراك في الإشعارات التسويقية
                        • طلب نسخة من بياناتك
                        • الاعتراض على معالجة بياناتك
                        """
                    )
                    
                    policySection(
                        title: "ملفات تعريف الارتباط (Cookies)",
                        content: "نستخدم ملفات تعريف الارتباط والتقنيات المشابهة لتحسين تجربتك وتذكر تفضيلاتك. يمكنك التحكم في هذه الملفات من إعدادات جهازك."
                    )
                    
                    policySection(
                        title: "الاحتفاظ بالبيانات",
                        content: """
                        • نحتفظ ببياناتك طوال فترة نشاط حسابك
                        • سجل الطلبات يُحفظ لمدة 3 سنوات للأغراض المحاسبية
                        • عند حذف الحساب، نحذف جميع بياناتك خلال 30 يوماً
                        """
                    )

                    policySection(
                        title: "التواصل معنا",
                        content: """
                        لأي استفسار عن سياسة الخصوصية أو لممارسة حقوقك:
                        • تواصل معنا عبر الدعم الفني في التطبيق
                        • البريد الإلكتروني: privacy@sofra.sa
                        """
                    )
                    
                    // تاريخ آخر تحديث
                    Text("آخر تحديث: 5 مارس 2026")
                        .font(SofraTypography.caption)
                        .foregroundStyle(SofraColors.textMuted)
                        .frame(maxWidth: .infinity, alignment: .center)
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
                .lineSpacing(6)
        }
    }
}
