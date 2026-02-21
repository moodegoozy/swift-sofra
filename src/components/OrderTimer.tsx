// src/components/OrderTimer.tsx
// مكون عداد الوقت للطلبات - يعرض الوقت المتبقي مع تنبيهات تلقائية
import React, { useEffect, useState } from 'react'
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react'
import { ORDER_TIME_LIMITS, TimerStatus, Order } from '@/types'

interface OrderTimerProps {
  order: Order;
  type: 'preparation' | 'pickup' | 'delivery';
  showLabel?: boolean;
  compact?: boolean;
}

// حساب الوقت المنقضي والمتبقي
const calculateTime = (startTime: Date | undefined, limitMinutes: number) => {
  if (!startTime) return { elapsed: 0, remaining: limitMinutes, percentage: 0 }
  
  // معالجة Firestore Timestamp
  const start = (startTime as any)?.toDate?.() 
    ? (startTime as any).toDate() 
    : (startTime instanceof Date ? startTime : new Date(startTime))
  
  if (isNaN(start.getTime())) return { elapsed: 0, remaining: limitMinutes, percentage: 0 }
  
  const now = new Date()
  const elapsedMs = now.getTime() - start.getTime()
  const elapsedMinutes = Math.floor(elapsedMs / 60000)
  const remaining = limitMinutes - elapsedMinutes
  const percentage = Math.min((elapsedMinutes / limitMinutes) * 100, 100)
  
  return { elapsed: elapsedMinutes, remaining, percentage }
}

// تحديد حالة العداد
const getTimerStatus = (percentage: number): TimerStatus => {
  if (percentage >= 100) return 'exceeded'
  if (percentage >= ORDER_TIME_LIMITS.WARNING_THRESHOLD * 100) return 'warning'
  return 'normal'
}

// تحويل الدقائق إلى نص
const formatTime = (minutes: number): string => {
  const absMinutes = Math.abs(minutes)
  if (absMinutes < 60) {
    return `${absMinutes} دقيقة`
  }
  const hours = Math.floor(absMinutes / 60)
  const mins = absMinutes % 60
  return `${hours}س ${mins}د`
}

// الحصول على اسم المرحلة
const getStageLabel = (type: 'preparation' | 'pickup' | 'delivery'): string => {
  switch (type) {
    case 'preparation': return 'التجهيز'
    case 'pickup': return 'الاستلام'
    case 'delivery': return 'التوصيل'
  }
}

// الحصول على الوقت المحدد لكل مرحلة
const getTimeLimit = (type: 'preparation' | 'pickup' | 'delivery'): number => {
  switch (type) {
    case 'preparation': return ORDER_TIME_LIMITS.PREPARATION_TIME
    case 'pickup': return ORDER_TIME_LIMITS.COURIER_PICKUP_TIME
    case 'delivery': return ORDER_TIME_LIMITS.DELIVERY_TIME
  }
}

// الحصول على وقت بداية المرحلة
const getStartTime = (order: Order, type: 'preparation' | 'pickup' | 'delivery'): Date | undefined => {
  if (!order.timestamps) return undefined
  switch (type) {
    case 'preparation': return order.timestamps.acceptedAt
    case 'pickup': return order.timestamps.readyAt
    case 'delivery': return order.timestamps.pickedUpAt
  }
}

// التحقق من اكتمال المرحلة
const isStageComplete = (order: Order, type: 'preparation' | 'pickup' | 'delivery'): boolean => {
  switch (type) {
    case 'preparation':
      return order.status === 'ready' || order.status === 'out_for_delivery' || order.status === 'delivered'
    case 'pickup':
      return order.status === 'out_for_delivery' || order.status === 'delivered'
    case 'delivery':
      return order.status === 'delivered'
  }
}

// التحقق من نشاط المرحلة
const isStageActive = (order: Order, type: 'preparation' | 'pickup' | 'delivery'): boolean => {
  switch (type) {
    case 'preparation':
      return order.status === 'accepted' || order.status === 'preparing'
    case 'pickup':
      return order.status === 'ready'
    case 'delivery':
      return order.status === 'out_for_delivery'
  }
}

export const OrderTimer: React.FC<OrderTimerProps> = ({ 
  order, 
  type, 
  showLabel = true,
  compact = false 
}) => {
  const [timeInfo, setTimeInfo] = useState({ elapsed: 0, remaining: 0, percentage: 0 })
  const [status, setStatus] = useState<TimerStatus>('normal')

  const limit = getTimeLimit(type)
  const startTime = getStartTime(order, type)
  const isComplete = isStageComplete(order, type)
  const isActive = isStageActive(order, type)

  useEffect(() => {
    if (!isActive || isComplete || !startTime) return

    const updateTimer = () => {
      const info = calculateTime(startTime, limit)
      setTimeInfo(info)
      setStatus(getTimerStatus(info.percentage))
    }

    updateTimer()
    const interval = setInterval(updateTimer, 10000) // تحديث كل 10 ثوانٍ

    return () => clearInterval(interval)
  }, [startTime, limit, isActive, isComplete])

  // لا تعرض شيء إذا المرحلة لم تبدأ
  if (!startTime && !isComplete) return null

  // المرحلة مكتملة
  if (isComplete) {
    if (compact) {
      return (
        <div className="flex items-center gap-1 text-green-600">
          <CheckCircle className="w-4 h-4" />
          <span className="text-xs">✓</span>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
        <CheckCircle className="w-4 h-4" />
        <span className="text-sm font-medium">{getStageLabel(type)} ✓</span>
      </div>
    )
  }

  // المرحلة غير نشطة
  if (!isActive) return null

  // ألوان حسب الحالة
  const colors = {
    normal: {
      bg: 'bg-sky-50',
      border: 'border-sky-200',
      text: 'text-sky-700',
      bar: 'bg-sky-500',
      icon: 'text-sky-500'
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-300',
      text: 'text-amber-700',
      bar: 'bg-amber-500',
      icon: 'text-amber-500'
    },
    exceeded: {
      bg: 'bg-red-50',
      border: 'border-red-300',
      text: 'text-red-700',
      bar: 'bg-red-500',
      icon: 'text-red-500'
    }
  }

  const c = colors[status]

  if (compact) {
    return (
      <div className={`flex items-center gap-1 ${c.text}`}>
        {status === 'exceeded' ? (
          <AlertTriangle className="w-4 h-4 animate-pulse" />
        ) : (
          <Clock className={`w-4 h-4 ${c.icon}`} />
        )}
        <span className="text-xs font-bold">
          {timeInfo.remaining > 0 ? formatTime(timeInfo.remaining) : `+${formatTime(Math.abs(timeInfo.remaining))}`}
        </span>
      </div>
    )
  }

  return (
    <div className={`${c.bg} ${c.border} border rounded-xl p-3 space-y-2`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {status === 'exceeded' ? (
            <AlertTriangle className={`w-5 h-5 ${c.icon} animate-pulse`} />
          ) : (
            <Clock className={`w-5 h-5 ${c.icon}`} />
          )}
          {showLabel && (
            <span className={`text-sm font-bold ${c.text}`}>
              {getStageLabel(type)}
            </span>
          )}
        </div>
        <div className={`text-lg font-bold ${c.text}`}>
          {timeInfo.remaining > 0 ? (
            <span>{formatTime(timeInfo.remaining)}</span>
          ) : (
            <span className="flex items-center gap-1">
              <span>+{formatTime(Math.abs(timeInfo.remaining))}</span>
              <span className="text-xs">⚠️</span>
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${c.bar} transition-all duration-500`}
          style={{ width: `${Math.min(timeInfo.percentage, 100)}%` }}
        />
      </div>

      {/* تنبيه التجاوز */}
      {status === 'exceeded' && (
        <div className="text-xs text-red-600 font-medium animate-pulse">
          ⚠️ تجاوز الوقت المحدد! يرجى الإسراع.
        </div>
      )}

      {/* تحذير قبل الانتهاء */}
      {status === 'warning' && (
        <div className="text-xs text-amber-600 font-medium">
          ⏰ الوقت ينفد! باقي {formatTime(timeInfo.remaining)} فقط.
        </div>
      )}
    </div>
  )
}

/**
 * مكون ملخص الأوقات - يعرض جميع المراحل
 */
export const OrderTimerSummary: React.FC<{ order: Order }> = ({ order }) => {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-bold text-gray-700 flex items-center gap-2">
        <Clock className="w-4 h-4" />
        عداد الوقت
      </h4>
      <div className="grid grid-cols-3 gap-2">
        <OrderTimer order={order} type="preparation" compact showLabel />
        <OrderTimer order={order} type="pickup" compact showLabel />
        <OrderTimer order={order} type="delivery" compact showLabel />
      </div>
    </div>
  )
}

export default OrderTimer
