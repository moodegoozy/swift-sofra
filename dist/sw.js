// Service Worker for Push Notifications + Caching - سفرة البيت
// يعمل في الخلفية لاستقبال الإشعارات وتخزين الملفات

const CACHE_NAME = 'sofra-albait-v3'
const APP_NAME = 'سفرة البيت'

// ملفات أساسية للتخزين المسبق
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/landing.png',
]

// استقبال الإشعارات
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received')
  
  let data = {
    title: APP_NAME,
    body: 'لديك إشعار جديد',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'default',
    data: {}
  }
  
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() }
    } catch (e) {
      data.body = event.data.text()
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    tag: data.tag || 'notification-' + Date.now(),
    data: data.data || {},
    vibrate: [200, 100, 200],
    requireInteraction: true,
    dir: 'rtl',
    lang: 'ar',
    actions: data.actions || []
  }

  event.waitUntil(
    // إرسال رسالة للصفحة لتشغيل الصوت
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        client.postMessage({ type: 'PLAY_NOTIFICATION_SOUND' })
      }
    }).then(() => {
      // عرض الإشعار
      return self.registration.showNotification(data.title || APP_NAME, options)
    })
  )
})

// عند الضغط على الإشعار
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked')
  event.notification.close()

  const urlToOpen = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
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
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})

// تثبيت الـ Service Worker - تخزين الملفات الأساسية
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker')
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching app shell')
      return cache.addAll(PRECACHE_URLS)
    }).then(() => self.skipWaiting())
  )
})

// تفعيل الـ Service Worker - حذف الكاش القديم
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name)
            return caches.delete(name)
          })
      )
    }).then(() => clients.claim())
  )
})

// استراتيجية الشبكة: Network first لـ API، Cache first للملفات الثابتة
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // تجاهل طلبات غير HTTP
  if (!event.request.url.startsWith('http')) return

  // طلبات Firebase API دائماً من الشبكة
  if (url.hostname.includes('googleapis.com') || 
      url.hostname.includes('firebaseapp.com') ||
      url.hostname.includes('firebasestorage.app')) {
    return
  }

  // الملفات الثابتة (JS, CSS, images) - Cache first
  if (event.request.destination === 'script' || 
      event.request.destination === 'style' || 
      event.request.destination === 'image' ||
      url.pathname.match(/\.(js|css|png|jpg|svg|woff2?)$/)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // صفحات HTML - Network first مع fallback للكاش
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then((response) => {
        const clone = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        return response
      }).catch(() => caches.match('/index.html'))
    )
    return
  }
})

// استقبال رسائل من التطبيق
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data)
  
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon, tag, data } = event.data
    
    self.registration.showNotification(title || APP_NAME, {
      body: body || 'إشعار جديد',
      icon: icon || '/icon-192.png',
      badge: '/icon-192.png',
      tag: tag || 'app-notification',
      data: data || {},
      vibrate: [200, 100, 200],
      requireInteraction: true,
      dir: 'rtl',
      lang: 'ar'
    })
  }
})
