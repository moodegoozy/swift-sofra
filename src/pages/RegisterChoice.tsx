/**
 * صفحة اختيار نوع الحساب
 * تظهر 3 خيارات: عميل، مندوب، أسرة منتجة
 */

import React, { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ShoppingBag, Truck, ChefHat, ArrowRight, Smartphone } from 'lucide-react'
import { useAuth } from '@/auth'

type AccountType = {
  id: string
  title: string
  subtitle: string
  emoji: string
  icon: React.ReactNode
  color: string
  shadowColor: string
  href: string
  features: string[]
}

const roleRedirectMap: Record<string, string> = {
  owner: '/owner', admin: '/admin', developer: '/developer',
  courier: '/courier', supervisor: '/supervisor',
  social_media: '/social-media', support: '/support',
  accountant: '/accounting', customer: '/'
}

const accountTypes: AccountType[] = [
  {
    id: 'customer',
    title: 'عميل',
    subtitle: 'أبغى أطلب أكل',
    emoji: '🛒',
    icon: <ShoppingBag className="w-8 h-8" />,
    color: 'from-green-500 to-emerald-600',
    shadowColor: 'shadow-green-500/30',
    href: '/register/form?type=customer',
    features: ['تصفح المتاجر', 'اطلب أكل بيتي', 'تابع طلباتك']
  },
  {
    id: 'courier',
    title: 'مندوب توصيل',
    subtitle: 'أبغى أوصل طلبات',
    emoji: '🚗',
    icon: <Truck className="w-8 h-8" />,
    color: 'from-sky-500 to-blue-600',
    shadowColor: 'shadow-sky-500/30',
    href: '/register/form?type=courier',
    features: ['استلم طلبات', 'اكسب فلوس', 'اشتغل بوقتك']
  },
  {
    id: 'owner',
    title: 'أسرة منتجة',
    subtitle: 'عندي أكل بيتي أبيعه',
    emoji: '👩‍🍳',
    icon: <ChefHat className="w-8 h-8" />,
    color: 'from-amber-500 to-orange-600',
    shadowColor: 'shadow-orange-500/30',
    href: '/register-owner',
    features: ['سجّل متجرك', 'أضف أصنافك', 'استقبل طلبات']
  },
  {
    id: 'restaurant',
    title: 'مطعم',
    subtitle: 'عندي مطعم وأبغى أوصل للعملاء',
    emoji: '🍽️',
    icon: <ChefHat className="w-8 h-8" />,
    color: 'from-rose-500 to-red-600',
    shadowColor: 'shadow-rose-500/30',
    href: '/register-owner?type=restaurant',
    features: ['سجّل مطعمك', 'قائمة طعام كاملة', 'توصيل سريع']
  }
]

export const RegisterChoice: React.FC = () => {
  const { user, role: currentRole, loading: authLoading } = useAuth()
  const nav = useNavigate()

  // إذا المستخدم مسجل دخول، يتم توجيهه تلقائياً
  useEffect(() => {
    if (!authLoading && user && currentRole) {
      nav(roleRedirectMap[currentRole] || '/', { replace: true })
    }
  }, [authLoading, user, currentRole, nav])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 px-4 py-8">
      <div className="max-w-md mx-auto">
        
        {/* الهيدر */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-pink-500 
            rounded-3xl flex items-center justify-center shadow-2xl shadow-purple-500/30">
            <span className="text-4xl">✨</span>
          </div>
          <h1 className="text-3xl font-black text-gray-800 mb-2">
            سجّل حساب جديد
          </h1>
          <p className="text-gray-500">
            اختر نوع حسابك
          </p>
        </div>

        {/* 📱 تسجيل/دخول سريع برقم الجوال */}
        <Link
          to="/customer-login"
          className="block bg-gradient-to-r from-emerald-500 to-green-600 text-white 
            rounded-2xl p-5 mb-6 shadow-xl shadow-emerald-500/30
            active:scale-[0.98] transition-all duration-200 border-2 border-emerald-300"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl 
              flex items-center justify-center flex-shrink-0">
              <Smartphone className="w-8 h-8" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold">📱 دخول سريع بالجوال</h3>
              <p className="text-white/80 text-sm">سجّل أو ادخل برقم جوالك فقط</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">بدون إيميل</span>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">بدون كلمة مرور</span>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">سريع وآمن</span>
              </div>
            </div>
            <ArrowRight className="w-6 h-6 flex-shrink-0" />
          </div>
        </Link>

        {/* فاصل */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-gray-200"></div>
          <span className="text-gray-400 text-sm">أو اختر نوع حسابك</span>
          <div className="flex-1 h-px bg-gray-200"></div>
        </div>

        {/* الخيارات */}
        <div className="space-y-4">
          {accountTypes.map((type) => (
            <Link
              key={type.id}
              to={type.href}
              className={`block bg-gradient-to-r ${type.color} text-white 
                rounded-2xl p-5 shadow-xl ${type.shadowColor}
                active:scale-[0.98] transition-all duration-200`}
            >
              <div className="flex items-center gap-4">
                {/* الأيقونة */}
                <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl 
                  flex items-center justify-center flex-shrink-0">
                  <span className="text-4xl">{type.emoji}</span>
                </div>
                
                {/* المحتوى */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-bold">{type.title}</h3>
                  <p className="text-white/80 text-sm">{type.subtitle}</p>
                  
                  {/* المميزات */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {type.features.map((feature, i) => (
                      <span 
                        key={i}
                        className="text-xs bg-white/20 px-2 py-0.5 rounded-full"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* السهم */}
                <ArrowRight className="w-6 h-6 flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>

        {/* رابط تسجيل الدخول */}
        <div className="text-center mt-8">
          <p className="text-gray-500">
            عندك حساب؟{' '}
            <Link to="/login" className="text-purple-600 font-bold hover:underline">
              سجّل دخول
            </Link>
          </p>
        </div>

        {/* رابط الرجوع */}
        <Link 
          to="/"
          className="block text-center mt-4 text-gray-400 text-sm hover:text-gray-600"
        >
          ← الرجوع للرئيسية
        </Link>

      </div>
    </div>
  )
}

export default RegisterChoice
