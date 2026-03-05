// TermsConditionsView.swift
// الشروط والأحكام

import SwiftUI

struct TermsConditionsView: View {
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .trailing, spacing: SofraSpacing.lg) {
                    // مقدمة مهمة
                    VStack(alignment: .trailing, spacing: SofraSpacing.sm) {
                        HStack {
                            Spacer()
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundStyle(SofraColors.warning)
                            Text("تنبيه هام")
                                .font(SofraTypography.title3)
                                .foregroundStyle(SofraColors.warning)
                        }
                        Text("سفرة البيت منصة وسيطة فقط تربط بين العملاء والمطاعم والمندوبين. نحن لا نقوم بإعداد الطعام ولا نتحكم في جودته أو نظافته أو مكوناته. المسؤولية الكاملة عن جودة الطعام وسلامته تقع على عاتق المطعم المُعد له.")
                            .font(SofraTypography.body)
                            .foregroundStyle(SofraColors.textPrimary)
                            .multilineTextAlignment(.trailing)
                            .lineSpacing(6)
                    }
                    .padding(SofraSpacing.cardPadding)
                    .background(SofraColors.warning.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    
                    termsSection(
                        title: "القبول بالشروط",
                        content: "باستخدامك تطبيق سفرة البيت، فإنك توافق على الالتزام بهذه الشروط والأحكام. يرجى قراءتها بعناية قبل استخدام التطبيق. استمرارك في استخدام التطبيق يعني موافقتك الكاملة على جميع الشروط."
                    )
                    
                    termsSection(
                        title: "طبيعة المنصة",
                        content: """
                        • سفرة البيت منصة إلكترونية وسيطة تربط بين العملاء والمطاعم المنزلية
                        • نحن لسنا مطعماً ولا نقوم بإعداد أو تحضير الطعام
                        • دورنا يقتصر على تسهيل عملية الطلب والدفع والتوصيل
                        • لا نتحمل مسؤولية جودة الطعام أو نظافته أو مكوناته
                        • المطعم هو المسؤول الوحيد عن جودة وسلامة الغذاء المقدم
                        """
                    )

                    termsSection(
                        title: "حسابات المستخدمين",
                        content: """
                        • يجب أن تكون المعلومات المقدمة صحيحة ودقيقة
                        • أنت مسؤول عن الحفاظ على سرية حسابك وكلمة مرورك
                        • يحق لنا تعليق أو إلغاء الحسابات المخالفة دون إنذار مسبق
                        • يمنع إنشاء أكثر من حساب لنفس الشخص
                        • يجب أن يكون عمر المستخدم 18 سنة فأكثر
                        """
                    )

                    termsSection(
                        title: "الطلبات والدفع",
                        content: """
                        • الأسعار المعروضة تشمل رسوم الخدمة وضريبة القيمة المضافة (15%)
                        • رسوم التوصيل تُحسب حسب المسافة ويحددها المندوب
                        • يمكن إلغاء الطلب قبل بدء التحضير فقط
                        • في حال وجود مشكلة بالطلب، يتم التعامل معها مباشرة مع المطعم
                        • الدفع يتم نقداً عند الاستلام
                        """
                    )
                    
                    termsSection(
                        title: "إخلاء المسؤولية",
                        content: """
                        • سفرة البيت غير مسؤولة عن جودة الطعام أو طعمه أو نظافته
                        • المطعم هو المسؤول الوحيد عن سلامة الغذاء والتزامه بالاشتراطات الصحية
                        • لا نضمن دقة المعلومات المقدمة من المطاعم عن المكونات أو الحساسية
                        • لا نتحمل مسؤولية أي أضرار صحية ناتجة عن تناول الطعام
                        • المستخدم يتحمل مسؤولية التأكد من مناسبة الطعام لظروفه الصحية
                        """
                    )

                    termsSection(
                        title: "أصحاب المطاعم",
                        content: """
                        • يجب الالتزام بمعايير جودة الطعام والنظافة والسلامة الغذائية
                        • المطعم مسؤول مسؤولية كاملة عن جميع منتجاته
                        • يجب الإفصاح عن المكونات والمواد المسببة للحساسية
                        • الأسعار المعروضة يجب أن تكون دقيقة ومحدّثة
                        • يجب الاستجابة للطلبات في الوقت المحدد
                        • يحق لنا إزالة المطاعم المخالفة لشروطنا فوراً
                        """
                    )

                    termsSection(
                        title: "سائقو التوصيل",
                        content: """
                        • يجب الالتزام بأنظمة المرور والسلامة
                        • الحفاظ على جودة الطلب أثناء التوصيل
                        • التعامل بأدب واحترام مع العملاء والمطاعم
                        • الالتزام بأوقات التوصيل المحددة
                        • المندوب مسؤول عن سلامة الطلب أثناء النقل
                        """
                    )
                    
                    termsSection(
                        title: "الرسوم والعمولات",
                        content: """
                        • رسوم الخدمة: 1.75 ريال لكل منتج
                        • ضريبة القيمة المضافة: 15% على إجمالي الفاتورة
                        • رسوم التوصيل: يحددها المندوب حسب المسافة
                        • جميع الرسوم تظهر بشكل واضح قبل إتمام الطلب
                        """
                    )

                    termsSection(
                        title: "التعديلات والإنهاء",
                        content: """
                        • يحق لنا تعديل هذه الشروط في أي وقت
                        • سيتم إشعار المستخدمين بالتغييرات الجوهرية عبر الإشعارات
                        • يحق لنا إيقاف الخدمة أو إنهاء الحسابات لأي سبب
                        • يمكنك حذف حسابك في أي وقت من إعدادات الملف الشخصي
                        """
                    )
                    
                    termsSection(
                        title: "القانون الساري",
                        content: "تخضع هذه الشروط والأحكام لأنظمة المملكة العربية السعودية. أي نزاع ينشأ عن استخدام التطبيق يتم حله وفقاً للأنظمة المعمول بها في المملكة."
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
            .navigationTitle("الشروط والأحكام")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("إغلاق") { dismiss() }
                        .foregroundStyle(SofraColors.gold400)
                }
            }
        }
    }

    private func termsSection(title: String, content: String) -> some View {
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
