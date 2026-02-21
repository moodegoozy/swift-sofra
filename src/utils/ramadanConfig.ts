/**
 * 🌙 تكوين رمضان - Ramadan Configuration
 * نظام للتحقق من وقت رمضان وإدارة العروض والتصميم الرمضاني
 */

// تواريخ رمضان (يمكن تحديثها سنوياً)
// عروض رمضانية: من 17 فبراير حتى 27 رمضان (15 مارس 2026)
export const RAMADAN_CONFIG = {
  // تاريخ بداية العروض الرمضانية (أول رمضان)
  startDate: new Date('2026-02-17T00:00:00'),
  // تاريخ نهاية العروض (27 رمضان = 15 مارس 2026 تقريباً)
  endDate: new Date('2026-03-15T23:59:59'),
  // أوقات الإفطار حسب المدن السعودية (تقريبية)
  iftarTimes: {
    'الرياض': { hour: 18, minute: 5 },
    'جدة': { hour: 18, minute: 25 },
    'مكة المكرمة': { hour: 18, minute: 25 },
    'المدينة المنورة': { hour: 18, minute: 15 },
    'الدمام': { hour: 17, minute: 50 },
    'الخبر': { hour: 17, minute: 50 },
    'الطائف': { hour: 18, minute: 20 },
    'تبوك': { hour: 18, minute: 25 },
    'بريدة': { hour: 18, minute: 5 },
    'حائل': { hour: 18, minute: 10 },
    'أبها': { hour: 18, minute: 15 },
    'نجران': { hour: 18, minute: 10 },
    'جازان': { hour: 18, minute: 20 },
    'الأحساء': { hour: 17, minute: 55 },
    'default': { hour: 18, minute: 10 }
  },
  // أوقات السحور (قبل الفجر بـ 30 دقيقة تقريباً)
  suhoorTimes: {
    'الرياض': { hour: 4, minute: 50 },
    'جدة': { hour: 5, minute: 10 },
    'مكة المكرمة': { hour: 5, minute: 10 },
    'المدينة المنورة': { hour: 5, minute: 0 },
    'الدمام': { hour: 4, minute: 35 },
    'default': { hour: 4, minute: 50 }
  }
}

// ألوان رمضان
export const RAMADAN_COLORS = {
  // بنفسجي غامق
  purple: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7c3aed',
    800: '#6b21a8',
    900: '#581c87',
  },
  // ذهبي
  gold: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  // أخضر داكن
  emerald: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  }
}

/**
 * التحقق من أننا في رمضان
 */
export const isRamadan = (): boolean => {
  const now = new Date()
  return now >= RAMADAN_CONFIG.startDate && now <= RAMADAN_CONFIG.endDate
}

/**
 * الحصول على عدد الأيام المتبقية لرمضان
 */
export const getDaysUntilRamadan = (): number => {
  const now = new Date()
  if (isRamadan()) return 0
  const diff = RAMADAN_CONFIG.startDate.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/**
 * الحصول على رقم يوم رمضان الحالي
 */
export const getRamadanDay = (): number => {
  if (!isRamadan()) return 0
  const now = new Date()
  const diff = now.getTime() - RAMADAN_CONFIG.startDate.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/**
 * الحصول على وقت الإفطار حسب المدينة
 */
export const getIftarTime = (city: string = 'default'): { hour: number; minute: number } => {
  return RAMADAN_CONFIG.iftarTimes[city as keyof typeof RAMADAN_CONFIG.iftarTimes] 
    || RAMADAN_CONFIG.iftarTimes.default
}

/**
 * الحصول على الوقت المتبقي للإفطار بالثواني
 */
export const getSecondsUntilIftar = (city: string = 'default'): number => {
  const now = new Date()
  const iftarTime = getIftarTime(city)
  
  const iftar = new Date(now)
  iftar.setHours(iftarTime.hour, iftarTime.minute, 0, 0)
  
  // إذا فات وقت الإفطار اليوم، احسب لليوم التالي
  if (now > iftar) {
    return 0 // انتهى وقت الإفطار
  }
  
  return Math.floor((iftar.getTime() - now.getTime()) / 1000)
}

/**
 * تنسيق الوقت المتبقي
 */
export const formatTimeRemaining = (seconds: number): { hours: string; minutes: string; seconds: string } => {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  
  return {
    hours: h.toString().padStart(2, '0'),
    minutes: m.toString().padStart(2, '0'),
    seconds: s.toString().padStart(2, '0')
  }
}

/**
 * أنواع عروض رمضان
 */
export type RamadanOfferType = 'discount' | 'iftar_package' | 'suhoor_package' | 'family_bundle'

export interface RamadanOffer {
  id: string
  ownerId: string
  restaurantName?: string
  title: string
  description: string
  offerType: RamadanOfferType
  discountPercent?: number
  originalPrice?: number
  offerPrice?: number
  imageUrl?: string
  startDate: Date
  endDate: Date
  isActive: boolean
  createdAt: Date
}

/**
 * تسميات أنواع العروض
 */
export const OFFER_TYPE_LABELS: Record<RamadanOfferType, { label: string; emoji: string; color: string }> = {
  discount: { label: 'خصم خاص', emoji: '🏷️', color: 'from-rose-500 to-pink-600' },
  iftar_package: { label: 'باقة إفطار', emoji: '🍽️', color: 'from-amber-500 to-orange-600' },
  suhoor_package: { label: 'باقة سحور', emoji: '🌙', color: 'from-indigo-500 to-purple-600' },
  family_bundle: { label: 'عرض عائلي', emoji: '👨‍👩‍👧‍👦', color: 'from-emerald-500 to-teal-600' }
}
