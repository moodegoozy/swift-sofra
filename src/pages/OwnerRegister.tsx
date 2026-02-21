/**
 * 🏠 صفحة تسجيل الأسر المنتجة
 * تسجيل سهل وبسيط على 3 خطوات فقط!
 * 
 * الخطوة 1: اسم الأسرة + المدينة
 * الخطوة 2: رقم الجوال + كلمة المرور
 * الخطوة 3: الموافقة + انطلق!
 */

import React, { useState } from 'react'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth, db } from '@/firebase'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { useNavigate, Link } from 'react-router-dom'
import { 
  ChefHat, ArrowLeft, ArrowRight, Check, Mail, Lock, 
  MapPin, Store, Sparkles, CheckCircle, Circle
} from 'lucide-react'
import { SAUDI_CITIES } from '@/utils/cities'

// الخطوات
type Step = 1 | 2 | 3

export const OwnerRegister: React.FC = () => {
  const nav = useNavigate()
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // بيانات النموذج
  const [restaurantName, setRestaurantName] = useState('')
  const [city, setCity] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  // التحقق من صحة الخطوة الحالية
  const isStepValid = (): boolean => {
    switch (step) {
      case 1:
        return restaurantName.trim().length >= 2 && city !== ''
      case 2:
        return email.includes('@') && email.length >= 5 && password.length >= 6
      case 3:
        return acceptedTerms
      default:
        return false
    }
  }

  // الانتقال للخطوة التالية
  const nextStep = () => {
    if (isStepValid() && step < 3) {
      setStep((step + 1) as Step)
      setError('')
    }
  }

  // الرجوع للخطوة السابقة
  const prevStep = () => {
    if (step > 1) {
      setStep((step - 1) as Step)
      setError('')
    }
  }

  // إرسال التسجيل
  const submit = async () => {
    if (!isStepValid()) return
    
    setLoading(true)
    setError('')
    
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      
      // إنشاء المستخدم
      await setDoc(doc(db, 'users', cred.user.uid), {
        name: restaurantName,
        email,
        role: 'owner',
        city,
        createdAt: serverTimestamp()
      })
      
      // إنشاء المطعم
      await setDoc(doc(db, 'restaurants', cred.user.uid), {
        name: restaurantName,
        ownerId: cred.user.uid,
        email,
        city,
        isOpen: true,
        packageType: 'free',
        licenseStatus: 'pending',
        createdAt: serverTimestamp()
      })
      
      // نجاح! الانتقال للصفحة الرئيسية
      nav('/owner')
    } catch (e: any) {
      console.error('Registration error:', e)
      if (e.code === 'auth/email-already-in-use') {
        setError('البريد الإلكتروني مسجل مسبقاً. جرب تسجيل الدخول')
      } else if (e.code === 'auth/weak-password') {
        setError('كلمة المرور ضعيفة. استخدم 6 أحرف أو أكثر')
      } else {
        setError('حدث خطأ. حاول مرة أخرى')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 px-4 py-8">
      <div className="max-w-md mx-auto">
        
        {/* ═══════════════════════════════════════════════════ */}
        {/* الهيدر */}
        {/* ═══════════════════════════════════════════════════ */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-amber-500 to-orange-500 
            rounded-3xl flex items-center justify-center shadow-2xl shadow-orange-500/30">
            <ChefHat className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-gray-800 mb-2">
            سجّل أسرتك المنتجة
          </h1>
          <p className="text-gray-500">
            ابدأ البيع في دقائق! 🚀
          </p>
        </div>

        {/* ═══════════════════════════════════════════════════ */}
        {/* مؤشر الخطوات */}
        {/* ═══════════════════════════════════════════════════ */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                transition-all duration-300 ${
                step > s 
                  ? 'bg-green-500 text-white' 
                  : step === s 
                    ? 'bg-amber-500 text-white shadow-lg scale-110' 
                    : 'bg-gray-200 text-gray-400'
              }`}>
                {step > s ? <Check className="w-5 h-5" /> : s}
              </div>
              {s < 3 && (
                <div className={`w-8 h-1 mx-1 rounded transition-all duration-300 ${
                  step > s ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════ */}
        {/* محتوى الخطوات */}
        {/* ═══════════════════════════════════════════════════ */}
        <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
          
          {/* ═══ الخطوة 1: اسم الأسرة والمدينة ═══ */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <span className="text-5xl">🏠</span>
                <h2 className="text-xl font-bold text-gray-800 mt-2">
                  عرّفنا بأسرتك
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  ايش اسم مطبخك؟
                </p>
              </div>
              
              {/* اسم الأسرة */}
              <div>
                <label className="block text-gray-700 font-bold mb-2 text-lg">
                  اسم الأسرة المنتجة
                </label>
                <div className="relative">
                  <Store className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-amber-500" />
                  <input
                    type="text"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    placeholder="مثال: مطبخ أم سارة"
                    className="w-full p-4 pr-14 text-lg rounded-2xl border-2 border-gray-200 
                      focus:border-amber-500 focus:ring-4 focus:ring-amber-100 transition-all
                      placeholder:text-gray-400"
                  />
                </div>
                <p className="text-gray-400 text-sm mt-2">
                  💡 اختر اسم يعبر عن هويتك
                </p>
              </div>
              
              {/* المدينة */}
              <div>
                <label className="block text-gray-700 font-bold mb-2 text-lg">
                  المدينة
                </label>
                <div className="relative">
                  <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-amber-500 pointer-events-none" />
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full p-4 pr-14 text-lg rounded-2xl border-2 border-gray-200 
                      focus:border-amber-500 focus:ring-4 focus:ring-amber-100 transition-all
                      appearance-none cursor-pointer bg-white"
                  >
                    <option value="">اختر مدينتك</option>
                    {SAUDI_CITIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ═══ الخطوة 2: الإيميل وكلمة المرور ═══ */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <span className="text-5xl">📧</span>
                <h2 className="text-xl font-bold text-gray-800 mt-2">
                  بيانات الدخول
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  لتقدر تدخل حسابك لاحقاً
                </p>
              </div>
              
              {/* البريد الإلكتروني */}
              <div>
                <label className="block text-gray-700 font-bold mb-2 text-lg">
                  البريد الإلكتروني
                </label>
                <div className="relative">
                  <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-amber-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="w-full p-4 pr-14 text-lg rounded-2xl border-2 border-gray-200 
                      focus:border-amber-500 focus:ring-4 focus:ring-amber-100 transition-all
                      placeholder:text-gray-400 text-left"
                    dir="ltr"
                  />
                </div>
                <p className="text-gray-400 text-sm mt-2">
                  📧 لتسجيل الدخول واستلام الإشعارات
                </p>
              </div>
              
              {/* كلمة المرور */}
              <div>
                <label className="block text-gray-700 font-bold mb-2 text-lg">
                  كلمة المرور
                </label>
                <div className="relative">
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 text-amber-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="6 أحرف أو أكثر"
                    className="w-full p-4 pr-14 text-lg rounded-2xl border-2 border-gray-200 
                      focus:border-amber-500 focus:ring-4 focus:ring-amber-100 transition-all
                      placeholder:text-gray-400"
                  />
                </div>
                <p className="text-gray-400 text-sm mt-2">
                  🔒 احفظها في مكان آمن
                </p>
              </div>
            </div>
          )}

          {/* ═══ الخطوة 3: الموافقة ═══ */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <span className="text-5xl">✨</span>
                <h2 className="text-xl font-bold text-gray-800 mt-2">
                  جاهز للانطلاق!
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  خطوة أخيرة فقط
                </p>
              </div>
              
              {/* ملخص البيانات */}
              <div className="bg-amber-50 rounded-2xl p-4 space-y-3">
                <h3 className="font-bold text-amber-800 mb-3">📋 ملخص بياناتك:</h3>
                <div className="flex justify-between">
                  <span className="text-gray-600">اسم الأسرة:</span>
                  <span className="font-bold text-gray-800">{restaurantName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">المدينة:</span>
                  <span className="font-bold text-gray-800">{city}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">البريد الإلكتروني:</span>
                  <span className="font-bold text-gray-800" dir="ltr">{email}</span>
                </div>
              </div>
              
              {/* الموافقة على الشروط */}
              <button
                onClick={() => setAcceptedTerms(!acceptedTerms)}
                className={`w-full p-4 rounded-2xl border-2 flex items-center gap-4 transition-all ${
                  acceptedTerms 
                    ? 'bg-green-50 border-green-500' 
                    : 'bg-white border-gray-200 hover:border-amber-300'
                }`}
              >
                {acceptedTerms ? (
                  <CheckCircle className="w-8 h-8 text-green-500 flex-shrink-0" />
                ) : (
                  <Circle className="w-8 h-8 text-gray-300 flex-shrink-0" />
                )}
                <div className="text-right">
                  <span className={`font-bold ${acceptedTerms ? 'text-green-700' : 'text-gray-700'}`}>
                    أوافق على الشروط والأحكام
                  </span>
                  <p className="text-sm text-gray-500 mt-1">
                    <Link to="/terms" target="_blank" className="text-amber-600 underline">
                      اقرأ الشروط
                    </Link>
                  </p>
                </div>
              </button>
              
              {/* رسالة تشجيعية */}
              <div className="bg-gradient-to-r from-amber-100 to-orange-100 rounded-2xl p-4 text-center">
                <p className="text-amber-800 font-bold">
                  🎉 مبروك! بعد التسجيل تقدر تضيف أصنافك وتبدأ تستقبل طلبات
                </p>
              </div>
            </div>
          )}

          {/* رسالة الخطأ */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-2xl text-red-700 text-center">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════ */}
        {/* أزرار التنقل */}
        {/* ═══════════════════════════════════════════════════ */}
        <div className="flex gap-3">
          {/* زر الرجوع */}
          {step > 1 && (
            <button
              onClick={prevStep}
              className="flex-1 py-4 px-6 rounded-2xl bg-white border-2 border-gray-200 
                text-gray-600 font-bold text-lg flex items-center justify-center gap-2
                active:scale-95 transition-all"
            >
              <ArrowRight className="w-5 h-5" />
              رجوع
            </button>
          )}
          
          {/* زر التالي / تسجيل */}
          <button
            onClick={step === 3 ? submit : nextStep}
            disabled={!isStepValid() || loading}
            className={`flex-1 py-4 px-6 rounded-2xl font-bold text-lg 
              flex items-center justify-center gap-2 transition-all
              ${isStepValid() && !loading
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xl shadow-orange-500/30 active:scale-95'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                جارٍ التسجيل...
              </>
            ) : step === 3 ? (
              <>
                <Sparkles className="w-5 h-5" />
                ابدأ الآن!
              </>
            ) : (
              <>
                التالي
                <ArrowLeft className="w-5 h-5" />
              </>
            )}
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════ */}
        {/* رابط تسجيل الدخول */}
        {/* ═══════════════════════════════════════════════════ */}
        <p className="text-center text-gray-500 mt-6">
          عندك حساب؟{' '}
          <Link to="/login" className="text-amber-600 font-bold hover:underline">
            سجّل دخول
          </Link>
        </p>

      </div>
    </div>
  )
}

export default OwnerRegister
