// Firebase Cloud Messaging Service Worker - سفرة البيت v2
// يعمل في الخلفية لاستقبال الإشعارات حتى لو التطبيق مغلق

// استيراد Firebase scripts (أحدث نسخة)
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.0/firebase-messaging-compat.js')

// إعدادات Firebase - يجب أن تتطابق مع src/firebase.ts
firebase.initializeApp({
  apiKey: "AIzaSyC1iM3g3gGfu23GKLpDRQplBuHidPniFIk",
  authDomain: "albayt-sofra.firebaseapp.com",
  projectId: "albayt-sofra",
  storageBucket: "albayt-sofra.firebasestorage.app",
  messagingSenderId: "895117143740",
  appId: "1:895117143740:web:239cfccc93d101c1f36ab9",
})

const messaging = firebase.messaging()

const APP_NAME = 'سفرة البيت'

// 🔔 استقبال الإشعارات في الخلفية
messaging.onBackgroundMessage((payload) => {
  console.log('[FCM SW] 🔔 Background message received:', JSON.stringify(payload))
  
  const notificationTitle = payload.notification?.title || payload.data?.title || APP_NAME
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'لديك إشعار جديد',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.data?.tag || 'fcm-' + Date.now(),
    data: payload.data || {},
    vibrate: [300, 100, 300, 100, 300],
    requireInteraction: true,
    dir: 'rtl',
    lang: 'ar',
    renotify: true,
    silent: false,
    actions: [
      { action: 'open', title: 'فتح' },
      { action: 'close', title: 'إغلاق' }
    ]
  }

  // إرسال رسالة للصفحة لتشغيل الصوت (إذا كانت مفتوحة)
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
    console.log('[FCM SW] عدد النوافذ المفتوحة:', clientList.length)
    for (const client of clientList) {
      client.postMessage({ 
        type: 'FCM_NOTIFICATION',
        payload: payload
      })
    }
  })

  return self.registration.showNotification(notificationTitle, notificationOptions)
})

// عند الضغط على الإشعار
self.addEventListener('notificationclick', (event) => {
  console.log('[FCM SW] Notification clicked:', event.action)
  event.notification.close()

  const action = event.action
  const data = event.notification.data || {}
  let urlToOpen = '/'

  // تحديد الرابط حسب نوع الإشعار
  if (data.type === 'new_order' || data.type === 'order_new') {
    urlToOpen = '/owner/orders'
  } else if (data.type === 'order_ready') {
    urlToOpen = '/courier'
  } else if (data.type === 'order_update' || data.type === 'order_accepted' || data.type === 'order_delivered') {
    urlToOpen = '/orders'
  } else if (data.url || data.click_action) {
    urlToOpen = data.url || data.click_action
  }

  if (action === 'close') {
    return
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // إذا التطبيق مفتوح، ننتقل للصفحة
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus()
          if (client.navigate) {
            client.navigate(urlToOpen)
          }
          return
        }
      }
      // إذا مغلق، نفتح نافذة جديدة
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen)
      }
    })
  )
})

// Install event - skip waiting to activate immediately
self.addEventListener('install', (event) => {
  console.log('[FCM SW] ✅ Installed')
  self.skipWaiting()
})

// Activate event - claim all clients
self.addEventListener('activate', (event) => {
  console.log('[FCM SW] ✅ Activated')
  event.waitUntil(self.clients.claim())
})

console.log('[FCM SW] ✅ Firebase Messaging Service Worker loaded v2')
