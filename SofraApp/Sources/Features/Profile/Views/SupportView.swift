// SupportView.swift
// الدعم الفني

import SwiftUI

struct SupportView: View {
    @Environment(\.dismiss) var dismiss
    @Environment(AppState.self) var appState

    @State private var subject = ""
    @State private var message = ""
    @State private var isSending = false
    @State private var showSuccess = false
    @State private var errorMessage: String?

    private let firestoreService = FirestoreService()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .trailing, spacing: SofraSpacing.lg) {
                    // Header
                    VStack(spacing: SofraSpacing.sm) {
                        Image(systemName: "headphones")
                            .font(.system(size: 48))
                            .foregroundStyle(SofraColors.gold400)

                        Text("كيف نقدر نساعدك؟")
                            .font(SofraTypography.title2)
                            .foregroundStyle(SofraColors.textPrimary)

                        Text("اكتب لنا رسالتك وبنرد عليك بأسرع وقت")
                            .font(SofraTypography.body)
                            .foregroundStyle(SofraColors.textSecondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, SofraSpacing.md)

                    // Quick Contact Options
                    SofraCard {
                        VStack(spacing: SofraSpacing.md) {
                            supportOption(
                                icon: "phone.fill",
                                title: "اتصل بنا",
                                subtitle: "متاح من 9 صباحاً حتى 11 مساءً",
                                action: { callSupport() }
                            )

                            Divider()

                            supportOption(
                                icon: "envelope.fill",
                                title: "البريد الإلكتروني",
                                subtitle: "afrtalbyt2026@gmail.com",
                                action: { emailSupport() }
                            )
                        }
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)

                    // Send Message Form
                    VStack(alignment: .trailing, spacing: SofraSpacing.md) {
                        Text("أرسل رسالة")
                            .font(SofraTypography.headline)
                            .foregroundStyle(SofraColors.gold400)

                        SofraTextField(label: "الموضوع", text: $subject, icon: "tag")

                        VStack(alignment: .trailing, spacing: SofraSpacing.xs) {
                            Text("الرسالة")
                                .font(SofraTypography.caption)
                                .foregroundStyle(SofraColors.textSecondary)
                            TextEditor(text: $message)
                                .frame(minHeight: 120)
                                .padding(SofraSpacing.sm)
                                .background(SofraColors.surfaceElevated.opacity(0.6))
                                .clipShape(RoundedRectangle(cornerRadius: SofraSpacing.inputRadius, style: .continuous))
                                .overlay(
                                    RoundedRectangle(cornerRadius: SofraSpacing.inputRadius, style: .continuous)
                                        .strokeBorder(SofraColors.gold500.opacity(0.2), lineWidth: 0.5)
                                )
                                .scrollContentBackground(.hidden)
                                .foregroundStyle(SofraColors.textPrimary)
                        }

                        if let error = errorMessage {
                            Text(error)
                                .font(SofraTypography.caption)
                                .foregroundStyle(SofraColors.error)
                        }

                        SofraButton(
                            title: "إرسال",
                            icon: "paperplane.fill",
                            isLoading: isSending
                        ) {
                            Task { await sendMessage() }
                        }
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)

                    // FAQ
                    SofraCard {
                        VStack(alignment: .trailing, spacing: SofraSpacing.md) {
                            Text("أسئلة شائعة")
                                .font(SofraTypography.headline)
                                .foregroundStyle(SofraColors.gold400)

                            faqItem(
                                question: "كيف أتابع طلبي؟",
                                answer: "من صفحة الطلبات يمكنك متابعة حالة طلبك لحظة بلحظة"
                            )
                            faqItem(
                                question: "كيف ألغي طلبي؟",
                                answer: "يمكنك إلغاء الطلب قبل بدء التحضير من تفاصيل الطلب"
                            )
                            faqItem(
                                question: "متى أسترد مبلغي؟",
                                answer: "المبالغ المستردة تُعالج خلال 3-7 أيام عمل"
                            )
                            faqItem(
                                question: "كيف أتواصل مع المطعم؟",
                                answer: "من تفاصيل الطلب يمكنك التواصل مباشرة مع المطعم"
                            )
                        }
                    }
                    .padding(.horizontal, SofraSpacing.screenHorizontal)

                    Spacer(minLength: SofraSpacing.xxxl)
                }
            }
            .ramadanBackground()
            .navigationTitle("الدعم الفني")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("إغلاق") { dismiss() }
                        .foregroundStyle(SofraColors.gold400)
                }
            }
            .alert("تم الإرسال", isPresented: $showSuccess) {
                Button("حسناً") { dismiss() }
            } message: {
                Text("تم استلام رسالتك وسنرد عليك بأسرع وقت ممكن")
            }
        }
    }

    // MARK: - Components
    private func supportOption(icon: String, title: String, subtitle: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack {
                Image(systemName: "chevron.left")
                    .foregroundStyle(SofraColors.textMuted)
                Spacer()
                VStack(alignment: .trailing, spacing: 2) {
                    Text(title)
                        .font(SofraTypography.body)
                        .foregroundStyle(SofraColors.textPrimary)
                    Text(subtitle)
                        .font(SofraTypography.caption)
                        .foregroundStyle(SofraColors.textSecondary)
                }
                Image(systemName: icon)
                    .foregroundStyle(SofraColors.gold400)
                    .frame(width: 28)
            }
        }
    }

    private func faqItem(question: String, answer: String) -> some View {
        VStack(alignment: .trailing, spacing: SofraSpacing.xs) {
            Text(question)
                .font(SofraTypography.subheadline)
                .foregroundStyle(SofraColors.textPrimary)
            Text(answer)
                .font(SofraTypography.caption)
                .foregroundStyle(SofraColors.textSecondary)
                .multilineTextAlignment(.trailing)
        }
    }

    // MARK: - Actions
    private func sendMessage() async {
        guard !subject.isEmpty, !message.isEmpty else {
            errorMessage = "يرجى تعبئة الموضوع والرسالة"
            return
        }

        isSending = true
        errorMessage = nil

        do {
            let token = try await appState.validToken()
            let fields: [String: Any] = [
                "userId": appState.currentUser?.uid ?? "",
                "userName": appState.currentUser?.name ?? "",
                "email": appState.currentUser?.email ?? "",
                "subject": subject,
                "message": message,
                "status": "new",
                "createdAt": ISO8601DateFormatter().string(from: Date())
            ]
            try await firestoreService.createDocument(
                collection: "supportTickets",
                id: UUID().uuidString,
                fields: fields,
                idToken: token
            )
            showSuccess = true
        } catch {
            errorMessage = "تعذر إرسال الرسالة. حاول مرة أخرى"
        }

        isSending = false
    }

    private func callSupport() {
        if let url = URL(string: "tel://0535534208") {
            UIApplication.shared.open(url)
        }
    }

    private func emailSupport() {
        if let url = URL(string: "mailto:afrtalbyt2026@gmail.com") {
            UIApplication.shared.open(url)
        }
    }
}
