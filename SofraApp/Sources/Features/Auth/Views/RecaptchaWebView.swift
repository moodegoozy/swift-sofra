// RecaptchaWebView.swift
// عرض reCAPTCHA في WebView للحصول على توكن حقيقي لتسجيل الدخول بالجوال

import SwiftUI
import WebKit

/// Fetches the reCAPTCHA site key from Firebase, then presents an invisible
/// reCAPTCHA challenge. Returns the token via the completion handler.
struct RecaptchaWebView: UIViewRepresentable {
    let siteKey: String
    let onToken: (String) -> Void
    let onError: (String) -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(onToken: onToken, onError: onError)
    }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        let controller = WKUserContentController()
        controller.add(context.coordinator, name: "recaptchaCallback")
        controller.add(context.coordinator, name: "recaptchaError")
        config.userContentController = controller

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.backgroundColor = .clear

        let html = generateHTML(siteKey: siteKey)
        webView.loadHTMLString(html, baseURL: URL(string: "https://albayt-sofra.firebaseapp.com"))

        return webView
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    private func generateHTML(siteKey: String) -> String {
        """
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    margin: 0;
                    padding: 20px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                    background: transparent;
                    font-family: -apple-system, sans-serif;
                    direction: rtl;
                }
                #status {
                    color: #999;
                    font-size: 14px;
                    text-align: center;
                    padding: 20px;
                }
                .g-recaptcha {
                    display: flex;
                    justify-content: center;
                }
            </style>
            <script src="https://www.google.com/recaptcha/api.js?hl=ar" async defer></script>
            <script>
                function onRecaptchaSuccess(token) {
                    document.getElementById('status').innerText = 'تم التحقق ✓';
                    window.webkit.messageHandlers.recaptchaCallback.postMessage(token);
                }
                function onRecaptchaExpired() {
                    document.getElementById('status').innerText = 'انتهت الصلاحية. أعد المحاولة';
                    grecaptcha.reset();
                }
                function onRecaptchaError() {
                    window.webkit.messageHandlers.recaptchaError.postMessage('reCAPTCHA load failed');
                }
            </script>
        </head>
        <body>
            <div>
                <div class="g-recaptcha"
                     data-sitekey="\(siteKey)"
                     data-callback="onRecaptchaSuccess"
                     data-expired-callback="onRecaptchaExpired"
                     data-error-callback="onRecaptchaError"
                     data-size="normal">
                </div>
                <p id="status">اضغط للتحقق الأمني</p>
            </div>
        </body>
        </html>
        """
    }

    // MARK: - Coordinator
    class Coordinator: NSObject, WKScriptMessageHandler, WKNavigationDelegate {
        let onToken: (String) -> Void
        let onError: (String) -> Void

        init(onToken: @escaping (String) -> Void, onError: @escaping (String) -> Void) {
            self.onToken = onToken
            self.onError = onError
        }

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            if message.name == "recaptchaCallback", let token = message.body as? String {
                onToken(token)
            } else if message.name == "recaptchaError", let error = message.body as? String {
                onError(error)
            }
        }

        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            onError(error.localizedDescription)
        }

        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            onError(error.localizedDescription)
        }
    }
}

// MARK: - reCAPTCHA Helper
enum RecaptchaHelper {
    /// Fetch the reCAPTCHA site key from Firebase project config
    static func fetchSiteKey() async throws -> String {
        let url = URL(string: "https://identitytoolkit.googleapis.com/v1/recaptchaParams?key=\(Endpoints.apiKey)")!
        let (data, response) = try await URLSession.shared.data(from: url)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.networkError(URLError(.badServerResponse))
        }

        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let siteKey = json["recaptchaSiteKey"] as? String else {
            throw APIError.firebaseError("تعذر الحصول على مفتاح reCAPTCHA")
        }

        return siteKey
    }
}
