// src/pages/ReportProblem.tsx
// صفحة الإبلاغ عن مشكلة - متاحة للعملاء والأسر والمندوبين
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuth } from '@/auth'
import { useToast } from '@/components/ui/Toast'
import { ProblemType } from '@/types'
import { 
  AlertTriangle, Send, ChevronRight, Loader2,
  Package, Truck, CreditCard, User, Lightbulb,
  CheckCircle
} from 'lucide-react'

// أنواع المشاكل مع الأيقونات والألوان
const PROBLEM_TYPES: { value: ProblemType; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'orders', label: 'مشكلة في الطلبات', icon: Package, color: 'blue' },
  { value: 'delivery', label: 'مشكلة في التوصيل', icon: Truck, color: 'orange' },
  { value: 'payment', label: 'مشكلة في الدفع', icon: CreditCard, color: 'green' },
  { value: 'account', label: 'مشكلة في الحساب', icon: User, color: 'purple' },
  { value: 'suggestion', label: 'اقتراح للتحسين', icon: Lightbulb, color: 'amber' },
]

export const ReportProblem: React.FC = () => {
  const nav = useNavigate()
  const { user, role } = useAuth()
  const toast = useToast()

  // حالة النموذج
  const [selectedType, setSelectedType] = useState<ProblemType | null>(null)
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // إرسال البلاغ
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedType) {
      toast.error('الرجاء اختيار نوع المشكلة')
      return
    }

    if (!description.trim()) {
      toast.error('الرجاء كتابة وصف للمشكلة')
      return
    }

    if (description.trim().length < 10) {
      toast.error('الرجاء كتابة وصف أكثر تفصيلاً (10 أحرف على الأقل)')
      return
    }

    if (!user?.uid) {
      toast.error('يرجى تسجيل الدخول أولاً')
      return
    }

    setSubmitting(true)

    try {
      await addDoc(collection(db, 'problemReports'), {
        userId: user.uid,
        userName: user.displayName || '',
        userEmail: user.email || '',
        userRole: role,
        problemType: selectedType,
        description: description.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
      })

      setSubmitted(true)
      toast.success('تم إرسال البلاغ بنجاح')
      
      // إعادة تعيين النموذج
      setSelectedType(null)
      setDescription('')
    } catch (err) {
      console.error('Error submitting report:', err)
      toast.error('حدث خطأ أثناء إرسال البلاغ')
    } finally {
      setSubmitting(false)
    }
  }

  // شاشة النجاح
  if (submitted) {
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-sky-900 mb-3">
            تم إرسال البلاغ
          </h2>
          <p className="text-sky-600 mb-6">
            شكراً لك! سيتم مراجعة بلاغك من قبل فريق الدعم
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setSubmitted(false)}
              className="px-6 py-3 bg-sky-100 text-sky-700 rounded-xl font-medium hover:bg-sky-200 transition-colors"
            >
              إرسال بلاغ آخر
            </button>
            <button
              onClick={() => nav('/')}
              className="px-6 py-3 bg-sky-600 text-white rounded-xl font-medium hover:bg-sky-700 transition-colors"
            >
              العودة للرئيسية
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* العنوان */}
      <div className="mb-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-sky-100 rounded-2xl flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-sky-600" />
        </div>
        <h1 className="text-2xl font-bold text-sky-900 mb-2">
          الإبلاغ عن مشكلة
        </h1>
        <p className="text-sky-600">
          أخبرنا عن أي مشكلة تواجهك أو شاركنا اقتراحاتك لتحسين التطبيق
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* اختيار نوع المشكلة */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h3 className="font-semibold text-sky-900 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-sky-600 text-white rounded-full flex items-center justify-center text-sm">1</span>
            اختر نوع المشكلة
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PROBLEM_TYPES.map((type) => {
              const Icon = type.icon
              const isSelected = selectedType === type.value
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setSelectedType(type.value)}
                  className={`p-4 rounded-xl border-2 transition-all text-right flex items-center gap-3 ${
                    isSelected
                      ? 'border-sky-500 bg-sky-50'
                      : 'border-gray-200 hover:border-sky-300 hover:bg-sky-50/50'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isSelected ? 'bg-sky-500 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`font-medium ${isSelected ? 'text-sky-700' : 'text-gray-700'}`}>
                    {type.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* وصف المشكلة */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h3 className="font-semibold text-sky-900 mb-4 flex items-center gap-2">
            <span className="w-6 h-6 bg-sky-600 text-white rounded-full flex items-center justify-center text-sm">2</span>
            اشرح المشكلة
          </h3>
          
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="اكتب تفاصيل المشكلة أو الاقتراح هنا..."
            rows={5}
            maxLength={500}
            className="w-full p-4 border-2 border-gray-200 rounded-xl resize-none focus:outline-none focus:border-sky-500 transition-colors"
            disabled={submitting}
          />
          
          <p className="text-sm text-gray-500 mt-2">
            {description.length}/500 حرف
          </p>
        </div>

        {/* زر الإرسال */}
        <button
          type="submit"
          disabled={submitting || !selectedType || !description.trim()}
          className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
            submitting || !selectedType || !description.trim()
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-sky-600 text-white hover:bg-sky-700 shadow-lg hover:shadow-xl'
          }`}
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              جاري الإرسال...
            </>
          ) : (
            <>
              <Send className="w-5 h-5" />
              إرسال البلاغ
            </>
          )}
        </button>

        {/* ملاحظة */}
        <p className="text-center text-sm text-gray-500 mt-4">
          سيتم مراجعة بلاغك من قبل فريق الدعم لتحسين تجربتك
        </p>
      </form>
    </div>
  )
}

export default ReportProblem
