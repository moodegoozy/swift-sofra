/**
 * 🌙 مكونات رمضان - Ramadan Decorations & Components
 * زخارف وعناصر رمضانية تضيف أجواء مميزة للتطبيق
 */

import React, { useState, useEffect } from 'react'
import { isRamadan, getSecondsUntilIftar, formatTimeRemaining } from '@/utils/ramadanConfig'
import { Moon, Star, X } from 'lucide-react'

/**
 * 🏮 فانوس رمضان متحرك
 */
export const Lantern: React.FC<{ className?: string; delay?: number }> = ({ className = '', delay = 0 }) => (
  <div 
    className={`absolute pointer-events-none ${className}`}
    style={{ animationDelay: `${delay}s` }}
  >
    <div className="animate-swing">
      <svg width="40" height="60" viewBox="0 0 40 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* خيط الفانوس */}
        <line x1="20" y1="0" x2="20" y2="10" stroke="#d97706" strokeWidth="2"/>
        {/* المقبض */}
        <ellipse cx="20" cy="12" rx="6" ry="3" fill="#f59e0b"/>
        {/* جسم الفانوس */}
        <path d="M10 15 L8 45 L12 50 L28 50 L32 45 L30 15 Z" fill="url(#lanternGradient)" opacity="0.9"/>
        {/* زخارف الفانوس */}
        <path d="M12 20 L28 20 M12 30 L28 30 M12 40 L28 40" stroke="#fcd34d" strokeWidth="1" opacity="0.7"/>
        {/* ضوء الفانوس */}
        <ellipse cx="20" cy="32" rx="6" ry="8" fill="#fef3c7" opacity="0.6">
          <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite"/>
        </ellipse>
        {/* القاعدة */}
        <ellipse cx="20" cy="52" rx="10" ry="4" fill="#b45309"/>
        <defs>
          <linearGradient id="lanternGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fcd34d"/>
            <stop offset="50%" stopColor="#f59e0b"/>
            <stop offset="100%" stopColor="#d97706"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
  </div>
)

/**
 * 🌙 هلال رمضان
 */
export const Crescent: React.FC<{ className?: string; size?: number }> = ({ className = '', size = 60 }) => (
  <div className={`absolute pointer-events-none ${className}`}>
    <svg width={size} height={size} viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="crescentGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef3c7"/>
          <stop offset="50%" stopColor="#fcd34d"/>
          <stop offset="100%" stopColor="#f59e0b"/>
        </linearGradient>
        <filter id="crescentGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <path 
        d="M45 30c0-12-8-22-20-25 15 3 25 15 25 25s-10 22-25 25c12-3 20-13 20-25z" 
        fill="url(#crescentGold)"
        filter="url(#crescentGlow)"
      />
      {/* نجمة صغيرة */}
      <path 
        d="M25 20l1.5 3 3.5.5-2.5 2.5.5 3.5-3-1.5-3 1.5.5-3.5-2.5-2.5 3.5-.5z" 
        fill="#fef3c7"
        opacity="0.9"
      >
        <animate attributeName="opacity" values="0.6;1;0.6" dur="3s" repeatCount="indefinite"/>
      </path>
    </svg>
  </div>
)

/**
 * ⭐ نجوم متلألئة
 */
export const TwinklingStar: React.FC<{ className?: string; size?: number; delay?: number }> = ({ 
  className = '', 
  size = 12,
  delay = 0 
}) => (
  <div 
    className={`absolute pointer-events-none ${className}`}
    style={{ animationDelay: `${delay}s` }}
  >
    <Star 
      className="text-amber-300 fill-amber-200 animate-pulse" 
      style={{ 
        width: size, 
        height: size,
        filter: 'drop-shadow(0 0 4px rgba(251, 191, 36, 0.6))'
      }} 
    />
  </div>
)

/**
 * 🎆 خلفية رمضانية متحركة
 */
export const RamadanBackground: React.FC = () => {
  if (!isRamadan()) return null
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* خلفية التدرج الرمضاني */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-950/20 via-transparent to-emerald-950/10" />
      
      {/* الهلال الكبير */}
      <Crescent className="top-8 left-8 animate-float" size={80} />
      
      {/* فوانيس */}
      <Lantern className="top-0 right-[10%]" delay={0} />
      <Lantern className="top-0 right-[30%]" delay={0.5} />
      <Lantern className="top-0 left-[15%]" delay={1} />
      
      {/* نجوم متفرقة */}
      <TwinklingStar className="top-[15%] right-[20%]" size={10} delay={0} />
      <TwinklingStar className="top-[25%] left-[25%]" size={8} delay={0.3} />
      <TwinklingStar className="top-[10%] right-[45%]" size={12} delay={0.6} />
      <TwinklingStar className="top-[30%] right-[60%]" size={6} delay={0.9} />
      <TwinklingStar className="top-[20%] left-[40%]" size={10} delay={1.2} />
      <TwinklingStar className="top-[35%] left-[10%]" size={8} delay={1.5} />
      
      {/* زخرفة سفلية */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-emerald-900/10 to-transparent" />
    </div>
  )
}

/**
 * 🎉 بانر رمضان الترحيبي
 */
export const RamadanBanner: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const [isVisible, setIsVisible] = useState(true)
  
  if (!isRamadan() || !isVisible) return null
  
  const handleClose = () => {
    setIsVisible(false)
    onClose?.()
  }
  
  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-purple-800 via-purple-700 to-emerald-800 rounded-2xl p-5 mb-6 shadow-xl shadow-purple-900/30">
      {/* زخارف خلفية */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-2 right-4">🌙</div>
        <div className="absolute top-3 left-8">✨</div>
        <div className="absolute bottom-2 right-12">⭐</div>
        <div className="absolute bottom-3 left-4">🏮</div>
      </div>
      
      {/* زر الإغلاق */}
      <button 
        onClick={handleClose}
        className="absolute top-2 left-2 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
      >
        <X className="w-4 h-4 text-white/80" />
      </button>
      
      {/* المحتوى */}
      <div className="relative text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-3xl">🌙</span>
          <h2 className="text-2xl font-black text-amber-300">عروض رمضان</h2>
          <span className="text-3xl">✨</span>
        </div>
        <p className="text-white/90 text-sm leading-relaxed">
          استمتع بأشهى أطباق الأسر المنتجة بعروض خاصة
        </p>
        <div className="mt-3 inline-flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-1.5 rounded-full">
          <Moon className="w-4 h-4 text-amber-300" />
          <span className="text-amber-200 text-sm font-medium">باقات إفطار وسحور</span>
        </div>
      </div>
    </div>
  )
}

/**
 * ⏱️ عداد الإفطار التنازلي
 */
export const IftarCountdown: React.FC<{ city?: string }> = ({ city = 'الرياض' }) => {
  const [timeRemaining, setTimeRemaining] = useState(getSecondsUntilIftar(city))
  
  useEffect(() => {
    if (!isRamadan()) return
    
    const timer = setInterval(() => {
      const remaining = getSecondsUntilIftar(city)
      setTimeRemaining(remaining)
    }, 1000)
    
    return () => clearInterval(timer)
  }, [city])
  
  if (!isRamadan() || timeRemaining <= 0) return null
  
  const { hours, minutes, seconds } = formatTimeRemaining(timeRemaining)
  
  return (
    <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 rounded-2xl p-4 mb-4 shadow-lg shadow-amber-500/30">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-xl">🕌</span>
          <span className="text-white/90 text-sm font-medium">الوقت المتبقي للإفطار</span>
        </div>
        
        <div className="flex items-center justify-center gap-3">
          {/* الساعات */}
          <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-2 min-w-[70px]">
            <div className="text-3xl font-black text-white">{hours}</div>
            <div className="text-white/70 text-xs">ساعة</div>
          </div>
          <span className="text-2xl text-white/80 font-bold">:</span>
          {/* الدقائق */}
          <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-2 min-w-[70px]">
            <div className="text-3xl font-black text-white">{minutes}</div>
            <div className="text-white/70 text-xs">دقيقة</div>
          </div>
          <span className="text-2xl text-white/80 font-bold">:</span>
          {/* الثواني */}
          <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-2 min-w-[70px]">
            <div className="text-3xl font-black text-white animate-pulse">{seconds}</div>
            <div className="text-white/70 text-xs">ثانية</div>
          </div>
        </div>
        
        <p className="text-white/60 text-xs mt-2">📍 {city}</p>
      </div>
    </div>
  )
}

/**
 * 🏷️ قسم عروض رمضان
 */
export const RamadanOffersSection: React.FC<{ 
  children?: React.ReactNode
  onViewAll?: () => void 
}> = ({ children, onViewAll }) => {
  if (!isRamadan()) return null
  
  return (
    <div className="mb-6">
      {/* عنوان القسم */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-amber-500 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-xl">🏮</span>
          </div>
          <div>
            <h2 className="text-lg font-black text-purple-800">عروض رمضان</h2>
            <p className="text-purple-600/60 text-xs">عروض حصرية للشهر الكريم</p>
          </div>
        </div>
        {onViewAll && (
          <button 
            onClick={onViewAll}
            className="text-purple-600 text-sm font-medium hover:text-purple-800 transition-colors"
          >
            عرض الكل ←
          </button>
        )}
      </div>
      
      {/* المحتوى */}
      <div className="space-y-3">
        {children || (
          <div className="bg-gradient-to-r from-purple-100 to-amber-100 rounded-xl p-4 text-center border border-purple-200">
            <span className="text-4xl mb-2 block">🌙</span>
            <p className="text-purple-700 font-medium">ترقبوا عروض رمضان المميزة!</p>
            <p className="text-purple-500 text-sm">سيتم عرض عروض الأسر المنتجة هنا</p>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * CSS للأنيميشن
 * يجب إضافته لملف index.css
 */
export const RAMADAN_CSS = `
/* أنيميشن تأرجح الفانوس */
@keyframes swing {
  0%, 100% { transform: rotate(-5deg); }
  50% { transform: rotate(5deg); }
}
.animate-swing {
  animation: swing 3s ease-in-out infinite;
  transform-origin: top center;
}

/* أنيميشن الطفو */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
.animate-float {
  animation: float 4s ease-in-out infinite;
}
`
