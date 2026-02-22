//  ContentView.swift
//  sfrh
//

import SwiftUI
import WebKit
import UIKit
import UniformTypeIdentifiers
import CoreLocation
import UserNotifications

// MARK: - App Delegate for Push
class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {

        UNUserNotificationCenter.current().delegate = self

        requestPushPermission()

        return true
    }

    func requestPushPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
            if granted {
                DispatchQueue.main.async {
                    UIApplication.shared.registerForRemoteNotifications()
                }
            }
        }
    }

    // عند استلام التوكن
    func application(_ application: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {

        let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        print("📲 APNs Token:", token)
    }

    func application(_ application: UIApplication,
                     didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("❌ Push registration failed:", error)
    }
}


// MARK: - Main App
@main
struct sfrhApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}



// MARK: - WebView
struct WebView: UIViewRepresentable {
    let url: URL
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    func makeUIView(context: Context) -> WKWebView {
        
        let config = WKWebViewConfiguration()
        config.preferences.javaScriptEnabled = true
        
        let prefs = WKWebpagePreferences()
        prefs.allowsContentJavaScript = true
        config.defaultWebpagePreferences = prefs
        
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        config.websiteDataStore = .default()
        
        let webView = WKWebView(frame: .zero, configuration: config)
        
        webView.navigationDelegate = context.coordinator
        webView.uiDelegate = context.coordinator
        
        NotificationCenter.default.addObserver(
            forName: Notification.Name("ClearCacheAndReload"),
            object: nil,
            queue: .main
        ) { _ in
            WKWebsiteDataStore.default().removeData(
                ofTypes: WKWebsiteDataStore.allWebsiteDataTypes(),
                modifiedSince: Date(timeIntervalSince1970: 0)
            ) {
                let request = URLRequest(
                    url: url,
                    cachePolicy: .reloadIgnoringLocalCacheData,
                    timeoutInterval: 15
                )
                webView.load(request)
            }
        }
        
        let request = URLRequest(
            url: url,
            cachePolicy: .useProtocolCachePolicy,
            timeoutInterval: 15
        )
        
        webView.load(request)
        return webView
    }
    
    func updateUIView(_ uiView: WKWebView, context: Context) {}
    
    
    // MARK: - Coordinator
    class Coordinator: NSObject,
                       WKUIDelegate,
                       WKNavigationDelegate,
                       UIDocumentPickerDelegate,
                       UINavigationControllerDelegate,
                       UIImagePickerControllerDelegate,
                       CLLocationManagerDelegate {
        
        var parent: WebView
        var completionHandler: (([URL]?) -> Void)?
        let locationManager = CLLocationManager()
        
        init(_ parent: WebView) {
            self.parent = parent
            super.init()
            locationManager.delegate = self
        }
        
        @available(iOS 15.0, *)
        func webView(_ webView: WKWebView,
                     requestMediaCapturePermissionFor origin: WKSecurityOrigin,
                     initiatedByFrame frame: WKFrameInfo,
                     type: WKMediaCaptureType,
                     decisionHandler: @escaping (WKPermissionDecision) -> Void) {
            
            switch type {
            case .microphone, .cameraAndMicrophone:
                decisionHandler(.deny)
            case .camera:
                decisionHandler(.grant)
            @unknown default:
                decisionHandler(.deny)
            }
        }
        
        @available(iOS 14.0, *)
        func webView(_ webView: WKWebView,
                     runOpenPanelWith parameters: Any,
                     initiatedByFrame frame: WKFrameInfo,
                     completionHandler: @escaping ([URL]?) -> Void) {
            
            self.completionHandler = completionHandler
            
            let alert = UIAlertController(title: "اختيار الوسيلة", message: nil, preferredStyle: .actionSheet)
            
            alert.addAction(UIAlertAction(title: "📸 الكاميرا", style: .default) { _ in
                self.openCamera()
            })
            
            alert.addAction(UIAlertAction(title: "📁 الملفات", style: .default) { _ in
                self.openDocumentPicker()
            })
            
            alert.addAction(UIAlertAction(title: "إلغاء", style: .cancel))
            
            UIApplication.shared.windows.first?.rootViewController?
                .present(alert, animated: true)
        }
        
        func openDocumentPicker() {
            let picker = UIDocumentPickerViewController(
                forOpeningContentTypes: [.item, .image, .pdf],
                asCopy: true
            )
            picker.delegate = self
            picker.allowsMultipleSelection = false
            
            UIApplication.shared.windows.first?.rootViewController?
                .present(picker, animated: true)
        }
        
        func documentPicker(_ controller: UIDocumentPickerViewController,
                            didPickDocumentsAt urls: [URL]) {
            completionHandler?(urls)
        }
        
        func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
            completionHandler?(nil)
        }
        
        func openCamera() {
            guard UIImagePickerController.isSourceTypeAvailable(.camera) else {
                completionHandler?(nil)
                return
            }
            
            let picker = UIImagePickerController()
            picker.sourceType = .camera
            picker.delegate = self
            
            UIApplication.shared.windows.first?.rootViewController?
                .present(picker, animated: true)
        }
        
        func imagePickerController(_ picker: UIImagePickerController,
                                   didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey : Any]) {
            
            picker.dismiss(animated: true)
            
            guard let image = info[.originalImage] as? UIImage else {
                completionHandler?(nil)
                return
            }
            
            let tempURL = FileManager.default.temporaryDirectory
                .appendingPathComponent("\(UUID().uuidString).jpg")
            
            if let data = image.jpegData(compressionQuality: 0.9) {
                try? data.write(to: tempURL)
                completionHandler?([tempURL])
            } else {
                completionHandler?(nil)
            }
        }
        
        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            picker.dismiss(animated: true)
            completionHandler?(nil)
        }
        
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            locationManager.requestWhenInUseAuthorization()
        }
        
        func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {}
    }
}


// MARK: - ContentView
struct ContentView: View {
    var body: some View {
        WebView(url: URL(string: "https://albayt-sofra.web.app")!)
            .ignoresSafeArea()
    }
}
