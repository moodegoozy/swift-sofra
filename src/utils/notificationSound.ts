/**
 * خدمة صوت الإشعارات - سفرة البيت
 * صوت مشابه لواتساب يعمل عند وصول طلب جديد للأسرة/المطعم
 * 🍎 محسّن للعمل على iOS - يفعّل تلقائياً عند أول تفاعل
 */

// مسار ملف الصوت
const NOTIFICATION_SOUND_URL = '/notification.mp3'

// حالة الصوت
let notificationAudio: HTMLAudioElement | null = null
let audioContext: AudioContext | null = null
let audioBuffer: AudioBuffer | null = null
let audioInitialized = false
let userInteracted = false
let autoEnableListenerAdded = false

/**
 * الكشف عن iOS
 */
function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

/**
 * تفعيل الصوت تلقائياً - يُستدعى من أي تفاعل
 */
async function autoEnableSound(): Promise<void> {
  if (userInteracted) return
  userInteracted = true
  
  try {
    // إنشاء AudioContext
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    
    // استئناف AudioContext
    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }
    
    // تحميل الصوت
    if (!audioBuffer) {
      const response = await fetch(NOTIFICATION_SOUND_URL)
      const arrayBuffer = await response.arrayBuffer()
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
    }
    
    // تهيئة Audio element
    if (!notificationAudio) {
      notificationAudio = new Audio(NOTIFICATION_SOUND_URL)
      notificationAudio.volume = 0.8
      notificationAudio.preload = 'auto'
      notificationAudio.muted = true
      await notificationAudio.play().catch(() => {})
      notificationAudio.pause()
      notificationAudio.muted = false
      notificationAudio.currentTime = 0
    }
    
    audioInitialized = true
    console.log('🔊 ✅ تم تفعيل الصوت تلقائياً')
  } catch (error) {
    console.warn('⚠️ فشل تفعيل الصوت التلقائي:', error)
  }
}

/**
 * إضافة مستمع للتفعيل التلقائي عند أول تفاعل
 */
function setupAutoEnable(): void {
  if (autoEnableListenerAdded) return
  autoEnableListenerAdded = true
  
  const events = ['click', 'touchstart', 'touchend', 'keydown', 'scroll']
  
  const handleInteraction = () => {
    autoEnableSound()
    // إزالة المستمعين بعد أول تفاعل
    events.forEach(event => {
      document.removeEventListener(event, handleInteraction, true)
    })
  }
  
  events.forEach(event => {
    document.addEventListener(event, handleInteraction, { capture: true, passive: true, once: true })
  })
}

/**
 * تفعيل الصوت يدوياً (للاستخدام من زر إذا لزم)
 */
export async function enableSoundForIOS(): Promise<boolean> {
  await autoEnableSound()
  return userInteracted && audioInitialized
}

/**
 * تهيئة صوت الإشعارات - تُستدعى عند تحميل التطبيق
 */
export function initNotificationSound(): void {
  if (audioInitialized && !isIOS()) return
  
  try {
    notificationAudio = new Audio(NOTIFICATION_SOUND_URL)
    notificationAudio.volume = 0.8
    notificationAudio.preload = 'auto'
    
    // إعداد التفعيل التلقائي عند أول تفاعل
    setupAutoEnable()
    
    if (!isIOS()) {
      audioInitialized = true
      userInteracted = true
    }
    console.log('🔊 تم تهيئة صوت الإشعارات')
  } catch (error) {
    console.error('❌ فشل تهيئة صوت الإشعارات:', error)
  }
}

/**
 * تشغيل صوت الإشعار
 */
export async function playNotificationSound(): Promise<void> {
  try {
    // محاولة استخدام AudioContext أولاً
    if (audioContext && audioBuffer && audioContext.state === 'running') {
      const source = audioContext.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContext.destination)
      source.start(0)
      console.log('🔔 تم تشغيل صوت الإشعار')
      return
    }
    
    // Fallback: Audio element
    if (!notificationAudio) {
      notificationAudio = new Audio(NOTIFICATION_SOUND_URL)
      notificationAudio.volume = 0.8
    }

    notificationAudio.currentTime = 0
    await notificationAudio.play()
    console.log('🔔 تم تشغيل صوت الإشعار')
  } catch (error) {
    console.warn('⚠️ تعذر تشغيل الصوت:', error)
  }
}

/**
 * تشغيل صوت الإشعار مع اهتزاز (للجوال)
 */
export async function playNotificationWithVibrate(): Promise<void> {
  // تشغيل الصوت
  await playNotificationSound()
  
  // اهتزاز الجوال (إذا مدعوم)
  if ('vibrate' in navigator) {
    navigator.vibrate([200, 100, 200]) // نمط اهتزاز مثل واتساب
  }
}

/**
 * إيقاف صوت الإشعار
 */
export function stopNotificationSound(): void {
  if (notificationAudio) {
    notificationAudio.pause()
    notificationAudio.currentTime = 0
  }
}

/**
 * تغيير مستوى الصوت (0-1)
 */
export function setNotificationVolume(volume: number): void {
  if (notificationAudio) {
    notificationAudio.volume = Math.max(0, Math.min(1, volume))
  }
}

/**
 * التحقق من دعم الصوت
 */
export function isSoundSupported(): boolean {
  return typeof Audio !== 'undefined'
}

// تهيئة تلقائية عند استيراد الملف
if (typeof window !== 'undefined') {
  // ننتظر تفاعل المستخدم لتهيئة الصوت (مطلوب في المتصفحات الحديثة)
  const initOnInteraction = () => {
    initNotificationSound()
    document.removeEventListener('click', initOnInteraction)
    document.removeEventListener('touchstart', initOnInteraction)
  }
  document.addEventListener('click', initOnInteraction, { once: true })
  document.addEventListener('touchstart', initOnInteraction, { once: true })
}
