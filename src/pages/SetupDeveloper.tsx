// src/pages/SetupDeveloper.tsx
// صفحة مخفية لإنشاء حساب المطور الرئيسي
import React, { useState } from 'react'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/firebase'
import { useNavigate } from 'react-router-dom'
import { Shield, Sparkles, Lock, Mail, Key, CheckCircle } from 'lucide-react'

// البريد الإلكتروني المسموح به فقط
const ALLOWED_EMAIL = 'afrtalbyt2026@gmail.com'

export const SetupDeveloper: React.FC = () => {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    // التحقق من البريد المسموح
    if (email.trim().toLowerCase() !== ALLOWED_EMAIL) {
      setError('❌ هذا البريد غير مسموح له بإنشاء حساب مطور')
      return
    }
    
    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      return
    }
    
    setLoading(true)
    
    try {
      // إنشاء الحساب في Firebase Auth
      const userCred = await createUserWithEmailAndPassword(auth, email.trim(), password)
      const uid = userCred.user.uid
      
      // إضافة بيانات المطور في Firestore
      await setDoc(doc(db, 'users', uid), {
        email: email.trim(),
        name: 'المطور الرئيسي',
        role: 'developer',
        createdAt: serverTimestamp(),
      })
      
      setSuccess(true)
      
      // الانتقال للوحة المطور بعد 2 ثانية
      setTimeout(() => {
        nav('/developer')
      }, 2000)
      
    } catch (err: any) {
      console.error('Setup error:', err)
      if (err.code === 'auth/email-already-in-use') {
        setError('هذا الحساب موجود مسبقاً، جرب تسجيل الدخول')
      } else if (err.code === 'auth/invalid-email') {
        setError('البريد الإلكتروني غير صالح')
      } else if (err.code === 'auth/weak-password') {
        setError('كلمة المرور ضعيفة جداً')
      } else {
        setError('حدث خطأ: ' + (err.message || 'غير معروف'))
      }
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center bg-gradient-to-br from-green-500 to-emerald-600 text-white p-10 rounded-3xl shadow-2xl">
          <CheckCircle className="w-20 h-20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">🎉 تم إنشاء الحساب بنجاح!</h1>
          <p>جاري تحويلك للوحة المطور...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl shadow-2xl overflow-hidden">
          {/* الرأس */}
          <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 p-6 text-center">
            <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6" />
              إعداد حساب المطور
              <Sparkles className="w-6 h-6" />
            </h1>
            <p className="text-white/80 text-sm mt-2">🔐 للاستخدام المحدود فقط</p>
          </div>
          
          {/* النموذج */}
          <form onSubmit={handleSetup} className="p-6 space-y-5">
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-400 rounded-xl p-3 text-sm text-center">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-gray-400 text-sm mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="أدخل البريد المخصص"
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-400 text-sm mb-2 flex items-center gap-2">
                <Key className="w-4 h-4" />
                كلمة المرور
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور"
                className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  جاري الإنشاء...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  إنشاء حساب المطور
                </>
              )}
            </button>
            
            <p className="text-gray-500 text-xs text-center">
              ⚠️ هذه الصفحة محدودة للبريد المحدد فقط
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
