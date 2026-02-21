// src/hooks/useIdleTimeout.ts
// تسجيل خروج تلقائي بعد فترة خمول
import { useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/auth'
import { useToast } from '@/components/ui/Toast'

// مدة الخمول قبل تسجيل الخروج (بالمللي ثانية)
// 30 دقيقة للمستخدمين العاديين، 60 دقيقة للمطورين والمشرفين
const IDLE_TIMEOUT_USER = 30 * 60 * 1000 // 30 دقيقة
const IDLE_TIMEOUT_ADMIN = 60 * 60 * 1000 // ساعة واحدة
// التحذير قبل تسجيل الخروج بـ 5 دقائق
const WARNING_BEFORE = 5 * 60 * 1000

type UseIdleTimeoutOptions = {
  // تخطي تتبع الخمول لصفحات معينة
  disabled?: boolean
}

export const useIdleTimeout = (options: UseIdleTimeoutOptions = {}) => {
  const { user, role, logout } = useAuth()
  const toast = useToast()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const warningRef = useRef<NodeJS.Timeout | null>(null)
  const warningShownRef = useRef(false)

  // تحديد مدة الخمول حسب الدور
  const getIdleTimeout = useCallback(() => {
    if (role === 'developer' || role === 'admin' || role === 'supervisor' || role === 'social_media') {
      return IDLE_TIMEOUT_ADMIN
    }
    return IDLE_TIMEOUT_USER
  }, [role])

  // عرض تحذير قبل تسجيل الخروج
  const showWarning = useCallback(() => {
    if (!warningShownRef.current) {
      warningShownRef.current = true
      toast.warning('سيتم تسجيل خروجك تلقائياً خلال 5 دقائق بسبب عدم النشاط. حرّك الفأرة للبقاء متصلاً.', {
        duration: 10000
      })
    }
  }, [toast])

  // إعادة ضبط عداد الخمول
  const resetTimer = useCallback(() => {
    if (!user || options.disabled) return

    warningShownRef.current = false

    // مسح المؤقتات السابقة
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current)
    }

    const idleTimeout = getIdleTimeout()

    // مؤقت التحذير
    warningRef.current = setTimeout(() => {
      showWarning()
    }, idleTimeout - WARNING_BEFORE)

    // مؤقت تسجيل الخروج
    timeoutRef.current = setTimeout(async () => {
      toast.info('تم تسجيل خروجك تلقائياً بسبب عدم النشاط 👋')
      await logout()
    }, idleTimeout)

    // حفظ وقت آخر نشاط في localStorage
    localStorage.setItem('broast_last_activity', Date.now().toString())
  }, [user, options.disabled, getIdleTimeout, showWarning, toast, logout])

  // التحقق من النشاط عند التحميل
  const checkLastActivity = useCallback(() => {
    const lastActivity = localStorage.getItem('broast_last_activity')
    if (lastActivity) {
      const elapsed = Date.now() - parseInt(lastActivity, 10)
      const idleTimeout = getIdleTimeout()
      
      // إذا تجاوز الوقت المسموح، تسجيل الخروج
      if (elapsed > idleTimeout) {
        toast.info('تم تسجيل خروجك تلقائياً بسبب عدم النشاط')
        logout()
        return false
      }
    }
    return true
  }, [getIdleTimeout, toast, logout])

  useEffect(() => {
    if (!user || options.disabled) return

    // التحقق من النشاط السابق
    if (!checkLastActivity()) return

    // الأحداث التي تعتبر نشاطاً
    const events = [
      'mousedown',
      'mousemove',
      'keydown',
      'scroll',
      'touchstart',
      'click',
      'focus'
    ]

    // تسجيل المستمعين
    events.forEach(event => {
      document.addEventListener(event, resetTimer, { passive: true })
    })

    // بدء العداد
    resetTimer()

    // التنظيف عند الخروج
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetTimer)
      })
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      if (warningRef.current) {
        clearTimeout(warningRef.current)
      }
    }
  }, [user, options.disabled, resetTimer, checkLastActivity])

  return {
    resetTimer,
    // للتعرض الخارجي إذا لزم الأمر
    isActive: !!user && !options.disabled
  }
}
