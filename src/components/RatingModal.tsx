// src/components/RatingModal.tsx
import React, { useState } from 'react'
import { Star, X, Send, Loader2, Store, Truck, User } from 'lucide-react'

type RatingType = 'restaurant' | 'courier' | 'customer'

interface RatingModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (rating: { stars: number; comment: string }) => Promise<void>
  type: RatingType
  targetName?: string
  orderId?: string
}

const TYPE_CONFIG: Record<RatingType, { title: string; icon: React.ElementType; color: string; placeholder: string; headerClass: string; btnClass: string; btnHoverClass: string }> = {
  restaurant: {
    title: 'قيّم الأسرة المنتجة',
    icon: Store,
    color: 'amber',
    placeholder: 'كيف كانت جودة الطعام والخدمة؟',
    headerClass: 'from-amber-500 to-amber-600',
    btnClass: 'from-amber-500 to-amber-600',
    btnHoverClass: 'hover:from-amber-600 hover:to-amber-700',
  },
  courier: {
    title: 'قيّم المندوب',
    icon: Truck,
    color: 'emerald',
    placeholder: 'كيف كان أداء المندوب؟',
    headerClass: 'from-emerald-500 to-emerald-600',
    btnClass: 'from-emerald-500 to-emerald-600',
    btnHoverClass: 'hover:from-emerald-600 hover:to-emerald-700',
  },
  customer: {
    title: 'قيّم العميل',
    icon: User,
    color: 'sky',
    placeholder: 'كيف كان تعامل العميل؟',
    headerClass: 'from-sky-500 to-sky-600',
    btnClass: 'from-sky-500 to-sky-600',
    btnHoverClass: 'hover:from-sky-600 hover:to-sky-700',
  }
}

export const RatingModal: React.FC<RatingModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  type,
  targetName,
  orderId
}) => {
  const [stars, setStars] = useState(0)
  const [hoverStars, setHoverStars] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const config = TYPE_CONFIG[type]
  const Icon = config.icon

  const handleSubmit = async () => {
    if (stars === 0) {
      setError('الرجاء اختيار عدد النجوم')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      await onSubmit({ stars, comment: comment.trim() })
      // إعادة تعيين الحالة
      setStars(0)
      setComment('')
      onClose()
    } catch (err) {
      setError('حدث خطأ، حاول مرة أخرى')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  // إعادة تعيين الحالة عند فتح مودال جديد
  const resetState = () => {
    setStars(0)
    setHoverStars(0)
    setComment('')
    setError('')
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* الهيدر */}
        <div className={`bg-gradient-to-r ${config.headerClass} p-6 text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{config.title}</h2>
                {targetName && <p className="text-white/80 text-sm">{targetName}</p>}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* المحتوى */}
        <div className="p-6">
          {/* النجوم */}
          <div className="text-center mb-6">
            <p className="text-gray-600 mb-4">كم تقييمك؟</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setStars(n)}
                  onMouseEnter={() => setHoverStars(n)}
                  onMouseLeave={() => setHoverStars(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-10 h-10 transition-colors ${
                      n <= (hoverStars || stars)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
            {stars > 0 && (
              <p className="mt-2 text-lg font-bold text-gray-800">
                {stars === 1 && 'سيء 😞'}
                {stars === 2 && 'مقبول 😐'}
                {stars === 3 && 'جيد 🙂'}
                {stars === 4 && 'جيد جداً 😊'}
                {stars === 5 && 'ممتاز! 🌟'}
              </p>
            )}
          </div>

          {/* التعليق */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              تعليق (اختياري)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={config.placeholder}
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500 resize-none"
            />
          </div>

          {/* رسالة الخطأ */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center">
              {error}
            </div>
          )}

          {/* أزرار */}
          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={submitting || stars === 0}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 
                         bg-gradient-to-r ${config.btnClass} 
                         ${config.btnHoverClass}
                         text-white rounded-xl font-bold transition-all disabled:opacity-50`}
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>إرسال التقييم</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * مكون النجوم للعرض فقط
 */
export const StarRating: React.FC<{ rating: number; size?: 'sm' | 'md' | 'lg' }> = ({ 
  rating, 
  size = 'md' 
}) => {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'
  
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${sizeClass} ${
            n <= rating
              ? 'text-yellow-400 fill-yellow-400'
              : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  )
}

export default RatingModal
