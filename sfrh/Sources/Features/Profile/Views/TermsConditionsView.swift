// TermsConditionsView.swift
// الشروط والأحكام

import SwiftUI

struct TermsConditionsView: View {
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .trailing, spacing: SofraSpacing.lg) {
                    termsSection(
                        title: "القبول بالشروط",
                        content: "باستخدامك تطبيق سفرة البيت، فإنك توافق على الالتزام بهذه الشروط والأحكام. يرجى قراءتها بعناية قبل استخدام التطبيق."
                    )

                    termsSection(
                        title: "حسابات المستخدمين",
                        content: """
                        • يجب أن تكون المعلومات المقدمة صحيحة ودقيقة
                        • أنت مسؤول عن الحفاظ على سرية حسابك
                        • يحق لنا تعليق أو إلغاء الحسابات المخالفة
                        • يمنع إنشاء أكثر من حساب لنفس الشخص
                        """
                    )

                    termsSection(
                        title: "الطلبات والدفع",
                        content: """
                        • الأسعار المعروضة تشمل القيمة الأساسية للمنتج
                        • رسوم التوصيل تُحسب حسب المسافة
                        • يمكن إلغاء الطلب قبل بدء التحضير فقط
                        • تُعالج المبالغ المستردة خلال 3-7 أيام عمل
                        """
                    )

                    termsSection(
                        title: "أصحاب المطاعم",
                        content: """
                        • يجب الالتزام بمعايير جودة الطعام والنظافة
                        • الأسعار المعروضة يجب أن تكون دقيقة ومحدّثة
                        • يجب الاستجابة للطلبات في الوقت المحدد
                        • يحق لنا إزالة المطاعم المخالفة لشروطنا
                        """
                    )

                    termsSection(
                        title: "سائقو التوصيل",
                        content: """
                        • يجب الالتزام بأنظمة المرور والسلامة
                        • الحفاظ على جودة الطلب أثناء التوصيل
                        • التعامل بأدب واحترام مع العملاء
                        • الالتزام بأوقات التوصيل المحددة
                        """
                    )

                    termsSection(
                        title: "المسؤولية",
                        content: "سفرة البيت منصة وسيطة بين المطاعم والعملاء. لسنا مسؤولين عن جودة الطعام المقدم من المطاعم بشكل مباشر، لكننا نسعى لضمان أفضل تجربة ممكنة."
                    )

                    termsSection(
                        title: "التعديلات",
                        content: "يحق لنا تعديل هذه الشروط في أي وقت. سيتم إشعار المستخدمين بالتغييرات الجوهرية عبر الإشعارات."
                    )
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
