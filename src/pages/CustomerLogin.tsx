// src/pages/CustomerLogin.tsx
import React, { useState, useEffect, useRef } from 'react'
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth'
import { auth, db } from '@/firebase'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { Link, useNavigate } from 'react-router-dom'
import { Phone, KeyRound, LogIn, ArrowRight, RefreshCw } from 'lucide-react'
import { useDialog } from '@/components/ui/ConfirmDialog'
import { useAuth } from '@/auth'

// تنسيق رقم الجوال السعودي
const formatPhoneNumber = (phone: string): string => {
  // إزالة كل شيء غير الأرقام
  let cleaned = phone.replace(/\D/g, '')
  
  // إذا بدأ بـ 0 نزيله
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1)
  }
  
  // إذا بدأ بـ 966 نتركه، وإلا نضيفه
  if (!cleaned.startsWith('966')) {
    cleaned = '966' + cleaned
  }
  
  return '+' + cleaned
}

export const CustomerLogin: React.FC = () => {
  const { user, role: currentRole, loading: authLoading } = useAuth()
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [step, setStep] = useState<'phone' | 'otp'>('phone')
  const [loading, setLoading] = useState(false)
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
  const [countdown, setCountdown] = useState(0)
  const recaptchaRef = useRef<HTMLDivElement>(null)
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null)
  const nav = useNavigate()
  const dialog = useDialog()

  // إذا المستخدم مسجل دخول، يتم توجيهه تلقائياً
  useEffect(() => {
    if (!authLoading && user && currentRole) {
      const redirectMap: Record<string, string> = {
        owner: '/owner', admin: '/admin', developer: '/developer',
        courier: '/courier', supervisor: '/supervisor'
      }
      nav(redirectMap[currentRole] || '/', { replace: true })
    }
  }, [authLoading, user, currentRole, nav])

  // تهيئة reCAPTCHA
  useEffect(() => {
    if (recaptchaRef.current && !recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaRef.current, {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved
        },
        'expired-callback': () => {
          // reCAPTCHA expired
          recaptchaVerifierRef.current = null
        }
      })
    }

    return () => {
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear()
        recaptchaVerifierRef.current = null
      }
    }
  }, [])

  // العد التنازلي لإعادة الإرسال
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // إرسال رمز التحقق
  const sendOTP = async () => {
    if (!phone || phone.length < 9) {
      dialog.warning('أدخل رقم جوال صحيح')
      return
    }

    const formattedPhone = formatPhoneNumber(phone)

    setLoading(true)
    try {
      // إعادة تهيئة reCAPTCHA إذا لزم الأمر
      if (!recaptchaVerifierRef.current && recaptchaRef.current) {
        recaptchaVerifierRef.current = new RecaptchaVerifier(auth, recaptchaRef.current, {
          size: 'invisible',
        })
      }

      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifierRef.current!)
      setConfirmationResult(confirmation)
      setStep('otp')
      setCountdown(60) // 60 ثانية للإعادة
      dialog.success('تم إرسال رمز التحقق إلى جوالك')
    } catch (err: any) {
      console.error('OTP Error:', err)
      
      // إعادة تعيين reCAPTCHA
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear()
        recaptchaVerifierRef.current = null
      }
      
      if (err.code === 'auth/invalid-phone-number') {
        dialog.error('رقم الجوال غير صحيح')
      } else if (err.code === 'auth/too-many-requests') {
        dialog.error('محاولات كثيرة، حاول لاحقاً')
      } else if (err.code === 'auth/quota-exceeded') {
        dialog.error('تم تجاوز الحد اليومي، حاول غداً')
      } else {
        dialog.error(err.message || 'فشل إرسال الرمز')
      }
    } finally {
      setLoading(false)
    }
  }

  // التحقق من الرمز
  const verifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      dialog.warning('أدخل رمز التحقق المكون من 6 أرقام')
      return
    }

    if (!confirmationResult) {
      dialog.error('حدث خطأ، أعد إرسال الرمز')
      setStep('phone')
      return
    }

    setLoading(true)
    try {
      const userCred = await confirmationResult.confirm(otp)
      const uid = userCred.user.uid
      const userPhone = userCred.user.phoneNumber

      // التحقق من وجود المستخدم
      const userDoc = await getDoc(doc(db, 'users', uid))
      
      let isNewUser = false
      if (!userDoc.exists()) {
        isNewUser = true
        // إنشاء حساب جديد للعميل
        await setDoc(doc(db, 'users', uid), {
          phone: userPhone,
          role: 'customer',
          name: '',
          createdAt: serverTimestamp(),
        })
        dialog.success('تم إنشاء حسابك بنجاح! 🎉')
      } else {
        dialog.success('أهلاً بعودتك! 👋')
      }

      // 📍 تحديد الموقع تلقائياً وحفظه
      const userData = userDoc.exists() ? userDoc.data() : { role: 'customer' }
      const hasLocation = userData?.savedLocation || userData?.location
      
      // إذا لم يكن عنده موقع محفوظ، نحاول تحديده تلقائياً
      if (!hasLocation && (userData.role === 'customer' || isNewUser)) {
        try {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              async (pos) => {
                const autoLocation = {
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
                  address: 'موقعي الحالي'
                }
                // حفظ الموقع في الحساب
                await updateDoc(doc(db, 'users', uid), {
                  savedLocation: autoLocation,
                  location: { lat: autoLocation.lat, lng: autoLocation.lng }
                })
                // حفظ في sessionStorage
                sessionStorage.setItem('broast_session_location', JSON.stringify({ lat: autoLocation.lat, lng: autoLocation.lng }))
              },
              (err) => {
                console.warn('تعذر تحديد الموقع تلقائياً:', err)
              },
              { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            )
          }
        } catch (locErr) {
          console.warn('خطأ في تحديد الموقع:', locErr)
        }
      }

      // التوجيه حسب الدور
      if (userData.role === 'owner') {
        nav('/owner')
      } else if (userData.role === 'admin') {
        nav('/admin')
      } else if (userData.role === 'developer') {
        nav('/developer')
      } else if (userData.role === 'courier') {
        nav('/courier')
      } else {
        nav('/')
      }
    } catch (err: any) {
      console.error('Verify Error:', err)
      if (err.code === 'auth/invalid-verification-code') {
        dialog.error('رمز التحقق غير صحيح')
      } else if (err.code === 'auth/code-expired') {
        dialog.error('انتهت صلاحية الرمز، أعد الإرسال')
        setStep('phone')
      } else {
        dialog.error(err.message || 'فشل التحقق')
      }
    } finally {
      setLoading(false)
    }
  }

  // إعادة إرسال الرمز
  const resendOTP = () => {
    if (countdown > 0) return
    setStep('phone')
    setOtp('')
    setConfirmationResult(null)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 px-4">
      {/* خلفية زخرفية */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-sky-300/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-sky-400/20 rounded-full blur-3xl"></div>
      
      {/* reCAPTCHA Container */}
      <div ref={recaptchaRef} id="recaptcha-container"></div>
      
      <div className="relative bg-white/80 backdrop-blur-xl border border-sky-100 rounded-[2rem] shadow-2xl shadow-sky-200/50 w-full max-w-md p-8">
        
        {/* شعار */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-sky-500 to-sky-600 rounded-2xl flex items-center justify-center shadow-xl shadow-sky-300/50 mb-4">
            <span className="text-4xl">🍝</span>
          </div>
          <h1 className="text-3xl font-black text-sky-600">سفرة البيت</h1>
          <p className="text-sky-500 mt-1">
            {step === 'phone' ? 'تسجيل الدخول' : 'أدخل رمز التحقق'}
          </p>
        </div>

        {/* خطوة إدخال رقم الجوال */}
        {step === 'phone' && (
          <div className="space-y-4">
            <div className="relative">
              <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sky-400" />
              <input
                type="tel"
                placeholder="05xxxxxxxx"
                dir="ltr"
                className="w-full rounded-2xl p-4 pr-12 bg-sky-50 text-sky-900 border-2 border-sky-100 
                           focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all text-center text-lg tracking-wider"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                maxLength={10}
              />
            </div>

            <p className="text-sm text-gray-500 text-center">
              سنرسل لك رمز تحقق عبر SMS
            </p>

            <button
              onClick={sendOTP}
              disabled={loading || phone.length < 9}
              className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-bold p-4 rounded-2xl 
                         shadow-xl shadow-sky-300/50 transition-all hover:scale-[1.02] hover:shadow-sky-400/50 disabled:opacity-50 disabled:hover:scale-100"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <ArrowRight className="w-5 h-5" />
                  إرسال رمز التحقق
                </>
              )}
            </button>
          </div>
        )}

        {/* خطوة إدخال رمز التحقق */}
        {step === 'otp' && (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-gray-600">أرسلنا رمز التحقق إلى</p>
              <p className="font-bold text-sky-600 text-lg" dir="ltr">{formatPhoneNumber(phone)}</p>
            </div>

            <div className="relative">
              <KeyRound className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sky-400" />
              <input
                type="text"
                inputMode="numeric"
                placeholder="000000"
                dir="ltr"
                className="w-full rounded-2xl p-4 pr-12 bg-sky-50 text-sky-900 border-2 border-sky-100 
                           focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all text-center text-2xl tracking-[0.5em] font-bold"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                maxLength={6}
                autoFocus
              />
            </div>

            <button
              onClick={verifyOTP}
              disabled={loading || otp.length !== 6}
              className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold p-4 rounded-2xl 
                         shadow-xl shadow-green-300/50 transition-all hover:scale-[1.02] hover:shadow-green-400/50 disabled:opacity-50 disabled:hover:scale-100"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  جاري التحقق...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  تأكيد ودخول
                </>
              )}
            </button>

            {/* إعادة إرسال الرمز */}
            <div className="text-center">
              {countdown > 0 ? (
                <p className="text-gray-500 text-sm">
                  إعادة الإرسال بعد <span className="font-bold text-sky-600">{countdown}</span> ثانية
                </p>
              ) : (
                <button
                  onClick={resendOTP}
                  className="text-sky-600 hover:text-sky-700 font-semibold text-sm"
                >
                  لم يصلك الرمز؟ أعد الإرسال
                </button>
              )}
            </div>

            {/* تغيير الرقم */}
            <button
              onClick={() => { setStep('phone'); setOtp(''); }}
              className="w-full text-gray-500 hover:text-gray-700 text-sm"
            >
              ← تغيير رقم الجوال
            </button>
          </div>
        )}

        {/* رابط للأدوار الأخرى */}
        <div className="mt-8 pt-6 border-t border-sky-100">
          <p className="text-center text-sm text-gray-500 mb-3">
            صاحب مطعم أو مندوب؟
          </p>
          <Link 
            to="/login"
            className="block text-center text-sky-600 hover:text-sky-700 font-semibold"
          >
            تسجيل دخول بالإيميل →
          </Link>
        </div>
      </div>
    </div>
  )
}
