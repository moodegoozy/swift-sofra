// src/pages/Register.tsx
import React, { useState, useEffect } from 'react'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth, db } from '@/firebase'
import { doc, setDoc, addDoc, collection, serverTimestamp, updateDoc, increment, getDoc } from 'firebase/firestore'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { User, Mail, Lock, Store, UserPlus, Truck, ChefHat, Users, MapPin, CheckSquare, Square, X, FileText, Shield } from 'lucide-react'
import { SAUDI_CITIES } from '@/utils/cities'
import { useAuth } from '@/auth'

export const Register: React.FC = () => {
  const { user, role: currentRole, loading: authLoading } = useAuth()
  const navAuth = useNavigate()

  // إذا المستخدم مسجل دخول، يتم توجيهه تلقائياً
  useEffect(() => {
    if (!authLoading && user && currentRole) {
      const redirectMap: Record<string, string> = {
        owner: '/owner', admin: '/admin', developer: '/developer',
        courier: '/courier', supervisor: '/supervisor'
      }
      navAuth(redirectMap[currentRole] || '/', { replace: true })
    }
  }, [authLoading, user, currentRole, navAuth])
  const [searchParams] = useSearchParams()
  const referralRestaurantId = searchParams.get('ref_restaurant') // رابط الإحالة من الأسرة
  const typeParam = searchParams.get('type') // نوع الحساب من URL
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [restaurantName, setRestaurantName] = useState('')
  const [city, setCity] = useState('')
  const [role, setRole] = useState<'customer'|'courier'|'owner'|''>('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()
  
  // Modal states للشروط والأحكام
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [showCourierTermsModal, setShowCourierTermsModal] = useState(false)

  // تحديد الدور من URL parameter
  useEffect(() => {
    if (typeParam === 'customer' || typeParam === 'courier' || typeParam === 'owner') {
      setRole(typeParam)
    }
  }, [typeParam])

  // إذا جاء العميل من رابط إحالة، نحدد دوره تلقائياً كعميل
  useEffect(() => {
    if (referralRestaurantId) {
      setRole('customer')
    }
  }, [referralRestaurantId])

  // هل يتطلب هذا الدور الموافقة على الشروط؟
  const requiresTerms = role === 'owner' || role === 'courier'

  // عند تغيير الدور، نعيد تعيين الموافقة
  const handleRoleChange = (newRole: 'customer'|'courier'|'owner') => {
    setRole(newRole)
    setAcceptedTerms(false)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!role) return alert('اختر نوع الحساب')
    if (role === 'owner' && !restaurantName) return alert('أدخل اسم المطعم')
    if (requiresTerms && !acceptedTerms) return alert('يجب الموافقة على الشروط والأحكام')

    setLoading(true)
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await setDoc(doc(db, 'users', cred.user.uid), {
        name,
        email,
        role,
        restaurantName: role === 'owner' ? restaurantName : null,
        referredBy: referralRestaurantId || null, // حفظ رابط الإحالة
        createdAt: serverTimestamp()
      })

      if (role === 'owner') {
        await setDoc(doc(db, 'restaurants', cred.user.uid), {
          name: restaurantName || name || 'مطعم جديد',
          ownerId: cred.user.uid,
          email,
          phone: '',
          city: city || '',
          location: '',
          logoUrl: '',
        }, { merge: true })
      }

      // إذا كان التسجيل عبر رابط إحالة، نسجل ذلك ونرسل إشعار للأسرة
      if (referralRestaurantId && role === 'customer') {
        try {
          // تسجيل في جدول تسجيلات العملاء
          await addDoc(collection(db, 'customerRegistrations'), {
            customerId: cred.user.uid,
            customerName: name,
            customerEmail: email,
            restaurantId: referralRestaurantId,
            registrationType: 'website',
            createdAt: serverTimestamp()
          })

          // تحديث إحصائيات المطعم
          const statsRef = doc(db, 'restaurantStats', referralRestaurantId)
          const statsSnap = await getDoc(statsRef)
          if (statsSnap.exists()) {
            await updateDoc(statsRef, {
              registeredCustomers: increment(1),
              updatedAt: serverTimestamp()
            })
          } else {
            await setDoc(statsRef, {
              totalProfileViews: 0,
              totalMenuViews: 0,
              totalItemViews: 0,
              totalShareClicks: 0,
              whatsappShareCount: 0,
              registeredCustomers: 1,
              appDownloads: 0,
              dailyViews: {},
              updatedAt: serverTimestamp()
            })
          }

          // إرسال إشعار للأسرة المنتجة
          await addDoc(collection(db, 'notifications'), {
            recipientId: referralRestaurantId,
            title: '🎉 عميل جديد سجل عبر رابطك!',
            message: `العميل "${name}" سجل في التطبيق عبر رابط الإحالة الخاص بك`,
            type: 'new_customer_registration',
            read: false,
            createdAt: serverTimestamp()
          })
        } catch (err) {
          console.warn('خطأ في تسجيل الإحالة:', err)
        }
      }

      nav('/')
    } catch (e: any) {
      alert(e.message)
    } finally { setLoading(false) }
  }

  const roleOptions = [
    { value: 'customer', label: 'عميل', icon: Users, color: 'sky' },
    { value: 'courier', label: 'مندوب', icon: Truck, color: 'emerald' },
    { value: 'owner', label: 'صاحب مطعم', icon: ChefHat, color: 'orange' },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 px-4 py-8">
      {/* 🔹 Modal الشروط والأحكام */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b bg-sky-50">
              <div className="flex items-center gap-2 text-sky-600">
                <FileText className="w-5 h-5" />
                <h2 className="font-bold text-lg">الشروط والأحكام</h2>
              </div>
              <button onClick={() => setShowTermsModal(false)} className="p-2 hover:bg-sky-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 text-sm leading-relaxed space-y-4">
              <h3 className="font-bold text-sky-600">1. التعريف</h3>
              <p>منصة سفرة البيت هي منصة إلكترونية تهدف إلى عرض وتسويق منتجات الأسر المنتجة وربطها بالعملاء عبر التطبيق.</p>
              
              <h3 className="font-bold text-sky-600">2. التسجيل</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>التسجيل في منصة سفرة البيت مجاني بالكامل.</li>
                <li>لا يتم فرض أي رسوم تسجيل على الأسر المنتجة.</li>
              </ul>
              
              <h3 className="font-bold text-sky-600">3. تسعير المنتجات ورسوم تشغيل المنصة</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>تقوم الأسرة بإدخال السعر الأساسي للمنتج.</li>
                <li>توافق الأسرة على قيام المنصة بإضافة رسوم تشغيل قدرها <strong className="text-sky-600">1.75 ريال</strong> على كل منتج.</li>
                <li>للمنتجات بسعر 1 أو 2 ريال، يتم إضافة <strong className="text-sky-600">0.25 ريال</strong> فقط.</li>
                <li>يظهر السعر النهائي للمنتج للعميل داخل التطبيق على أنه سعر المنتج.</li>
                <li>لا يتم خصم أي مبالغ من دخل الأسرة، وجميع رسوم تشغيل المنصة تُحمّل على العميل.</li>
              </ul>
              
              <h3 className="font-bold text-sky-600">4. الطلب والدفع</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>يتم عرض السعر النهائي للمنتج داخل التطبيق بعد إضافة رسوم تشغيل المنصة.</li>
                <li>قد يتم احتساب رسوم أخرى مثل رسوم التوصيل وضريبة القيمة المضافة.</li>
                <li>تحتفظ المنصة بحق تحديث أو إضافة خدمات أو رسوم مستقبلية عند الحاجة.</li>
              </ul>
              
              <h3 className="font-bold text-sky-600">5. مسؤولية الأسرة المنتجة</h3>
              <p>تتحمل الأسرة المنتجة كامل المسؤولية عن:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>جودة المنتجات وسلامة الأصناف</li>
                <li>نظافة وتحضير الطعام والتغليف</li>
                <li>الالتزام بالاشتراطات الصحية المعمول بها</li>
              </ul>
              
              <h3 className="font-bold text-sky-600">6. مسؤولية المنصة</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>توفير منصة تقنية للتواصل بين الأسر والعملاء</li>
                <li>المنصة ليست طرفاً في أي عقد بين الأسرة والعميل</li>
                <li>المنصة غير مسؤولة عن جودة المنتجات أو موثوقيتها</li>
              </ul>
              
              <h3 className="font-bold text-sky-600">7. إنهاء الحساب</h3>
              <p>تحتفظ المنصة بحق تعليق أو إنهاء أي حساب يخالف الشروط أو يضر بسمعة المنصة أو المستخدمين الآخرين.</p>
            </div>
            <div className="p-4 border-t bg-gray-50">
              <button 
                onClick={() => setShowTermsModal(false)}
                className="w-full py-3 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600 transition"
              >
                فهمت ✓
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 🔹 Modal سياسة الخصوصية */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b bg-sky-50">
              <div className="flex items-center gap-2 text-sky-600">
                <Shield className="w-5 h-5" />
                <h2 className="font-bold text-lg">سياسة الخصوصية</h2>
              </div>
              <button onClick={() => setShowPrivacyModal(false)} className="p-2 hover:bg-sky-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 text-sm leading-relaxed space-y-4">
              <h3 className="font-bold text-sky-600">1. جمع البيانات</h3>
              <p>نجمع البيانات التالية لتقديم خدماتنا:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>الاسم والبريد الإلكتروني ورقم الجوال</li>
                <li>الموقع الجغرافي (عند الموافقة)</li>
                <li>معلومات الطلبات والمعاملات</li>
              </ul>
              
              <h3 className="font-bold text-sky-600">2. استخدام البيانات</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>تقديم الخدمات وتنفيذ الطلبات</li>
                <li>التواصل معك بشأن طلباتك</li>
                <li>تحسين تجربة المستخدم</li>
                <li>إرسال إشعارات مهمة</li>
              </ul>
              
              <h3 className="font-bold text-sky-600">3. حماية البيانات</h3>
              <p>نستخدم تقنيات أمان متقدمة لحماية بياناتك الشخصية ولا نشاركها مع أطراف ثالثة إلا عند الضرورة لتقديم الخدمة.</p>
              
              <h3 className="font-bold text-sky-600">4. حقوقك</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>حق الوصول إلى بياناتك</li>
                <li>حق تصحيح البيانات غير الدقيقة</li>
                <li>حق طلب حذف حسابك وبياناتك</li>
              </ul>
              
              <h3 className="font-bold text-sky-600">5. التواصل</h3>
              <p>للاستفسارات حول سياسة الخصوصية، تواصل معنا عبر التطبيق أو البريد الإلكتروني.</p>
            </div>
            <div className="p-4 border-t bg-gray-50">
              <button 
                onClick={() => setShowPrivacyModal(false)}
                className="w-full py-3 bg-sky-500 text-white font-bold rounded-xl hover:bg-sky-600 transition"
              >
                فهمت ✓
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 🔹 Modal شروط المندوب */}
      {showCourierTermsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b bg-emerald-50">
              <div className="flex items-center gap-2 text-emerald-600">
                <Truck className="w-5 h-5" />
                <h2 className="font-bold text-lg">شروط وأحكام المندوب</h2>
              </div>
              <button onClick={() => setShowCourierTermsModal(false)} className="p-2 hover:bg-emerald-100 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 text-sm leading-relaxed space-y-4">
              <h3 className="font-bold text-emerald-600">1. صفة المندوب</h3>
              <p>يعمل المندوب كمقاول مستقل وليس موظفاً لدى المنصة. يتحمل المندوب كامل المسؤولية القانونية عن تصرفاته.</p>
              
              <h3 className="font-bold text-emerald-600">2. المتطلبات</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>العمر 18 سنة فما فوق</li>
                <li>رخصة قيادة سارية المفعول</li>
                <li>مركبة مناسبة للتوصيل</li>
                <li>هاتف ذكي مع اتصال بالإنترنت</li>
              </ul>
              
              <h3 className="font-bold text-emerald-600">3. المسؤوليات</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>توصيل الطلبات في الوقت المحدد</li>
                <li>الحفاظ على سلامة الطلبات أثناء التوصيل</li>
                <li>التعامل بلطف مع العملاء والأسر</li>
                <li>الالتزام بقوانين المرور</li>
              </ul>
              
              <h3 className="font-bold text-emerald-600">4. الأرباح والرسوم</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>رسوم التوصيل يحددها المندوب أو الأسرة</li>
                <li>رسوم المنصة: <strong>3.75 ريال</strong> لكل طلب توصيل</li>
                <li>الأرباح تُضاف للمحفظة فوراً بعد التسليم</li>
              </ul>
              
              <h3 className="font-bold text-emerald-600">5. نظام النقاط</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>يبدأ المندوب بـ 100 نقطة</li>
                <li>تُخصم نقاط عند الشكاوى أو التأخير</li>
                <li>يُوقف الحساب عند وصول النقاط لـ 30 أو أقل</li>
              </ul>
              
              <h3 className="font-bold text-emerald-600">6. إنهاء الحساب</h3>
              <p>يحق للمنصة إيقاف حساب المندوب في حالات مخالفة الشروط أو تلقي شكاوى متكررة أو التحقق من صحة البيانات.</p>
            </div>
            <div className="p-4 border-t bg-gray-50">
              <button 
                onClick={() => setShowCourierTermsModal(false)}
                className="w-full py-3 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition"
              >
                فهمت ✓
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* خلفية زخرفية */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-sky-300/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-sky-400/20 rounded-full blur-3xl"></div>

      <div className="relative bg-white/80 backdrop-blur-xl border border-sky-100 rounded-[2rem] shadow-2xl shadow-sky-200/50 w-full max-w-md p-8">
        
        {/* شعار */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-sky-500 to-sky-600 rounded-2xl flex items-center justify-center shadow-xl shadow-sky-300/50 mb-3">
            <UserPlus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-sky-600">إنشاء حساب جديد</h1>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {/* الاسم */}
          <div className="relative">
            <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sky-400" />
            <input 
              className="w-full rounded-2xl p-4 pr-12 bg-sky-50 text-sky-900 border-2 border-sky-100 focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all" 
              placeholder="الاسم" 
              value={name} 
              onChange={e=>setName(e.target.value)} 
            />
          </div>

          {/* الإيميل */}
          <div className="relative">
            <Mail className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sky-400" />
            <input 
              className="w-full rounded-2xl p-4 pr-12 bg-sky-50 text-sky-900 border-2 border-sky-100 focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all" 
              placeholder="الإيميل" 
              type="email"
              value={email} 
              onChange={e=>setEmail(e.target.value)} 
            />
          </div>

          {/* كلمة المرور */}
          <div className="relative">
            <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-sky-400" />
            <input 
              className="w-full rounded-2xl p-4 pr-12 bg-sky-50 text-sky-900 border-2 border-sky-100 focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 transition-all" 
              placeholder="كلمة المرور" 
              type="password" 
              value={password} 
              onChange={e=>setPassword(e.target.value)} 
            />
          </div>

          {/* اختيار نوع الحساب */}
          <div className="grid grid-cols-3 gap-3">
            {roleOptions.map(opt => {
              const Icon = opt.icon
              const isSelected = role === opt.value
              return (
                <label 
                  key={opt.value}
                  className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl cursor-pointer transition-all duration-300 ${
                    isSelected 
                      ? 'bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-lg shadow-sky-300/50 scale-105' 
                      : 'bg-sky-50 text-sky-600 hover:bg-sky-100 border-2 border-sky-100'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="role" 
                    value={opt.value} 
                    className="hidden" 
                    onChange={()=>handleRoleChange(opt.value as any)} 
                  />
                  <Icon className="w-6 h-6" />
                  <span className="text-sm font-bold">{opt.label}</span>
                </label>
              )
            })}
          </div>

          {/* حقل اسم المطعم والمدينة */}
          {role === 'owner' && (
            <>
              <div className="relative">
                <Store className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400" />
                <input 
                  className="w-full rounded-2xl p-4 pr-12 bg-orange-50 text-orange-900 border-2 border-orange-200 focus:outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all" 
                  placeholder="اسم المطعم" 
                  value={restaurantName} 
                  onChange={e=>setRestaurantName(e.target.value)} 
                />
              </div>
              <div className="relative">
                <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400 pointer-events-none" />
                <select
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="w-full rounded-2xl p-4 pr-12 bg-orange-50 text-orange-900 border-2 border-orange-200 focus:outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100 transition-all appearance-none cursor-pointer"
                >
                  <option value="">اختر المدينة</option>
                  {SAUDI_CITIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* الموافقة على الشروط والأحكام */}
              <div 
                onClick={() => setAcceptedTerms(!acceptedTerms)}
                className={`flex items-start gap-3 p-4 rounded-2xl cursor-pointer transition-all border-2 ${
                  acceptedTerms 
                    ? 'bg-green-50 border-green-400' 
                    : 'bg-orange-50 border-orange-200 hover:border-orange-300'
                }`}
              >
                {acceptedTerms ? (
                  <CheckSquare className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <Square className="w-6 h-6 text-orange-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="text-sm leading-relaxed">
                  <span className={acceptedTerms ? 'text-green-700' : 'text-orange-700'}>
                    أوافق على{' '}
                  </span>
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowTermsModal(true) }}
                    className="text-sky-600 hover:text-sky-800 font-bold underline"
                  >
                    الشروط والأحكام
                  </button>
                  <span className={acceptedTerms ? 'text-green-700' : 'text-orange-700'}>
                    {' '}و{' '}
                  </span>
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowPrivacyModal(true) }}
                    className="text-sky-600 hover:text-sky-800 font-bold underline"
                  >
                    سياسة الخصوصية
                  </button>
                  <span className={acceptedTerms ? 'text-green-700' : 'text-orange-700'}>
                    {' '}الخاصة بمنصة سفرة البيت
                  </span>
                </div>
              </div>
            </>
          )}

          {/* شروط وأحكام المندوب */}
          {role === 'courier' && (
            <div 
              onClick={() => setAcceptedTerms(!acceptedTerms)}
              className={`flex items-start gap-3 p-4 rounded-2xl cursor-pointer transition-all border-2 ${
                acceptedTerms 
                  ? 'bg-green-50 border-green-400' 
                  : 'bg-emerald-50 border-emerald-200 hover:border-emerald-300'
              }`}
            >
              {acceptedTerms ? (
                <CheckSquare className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
              ) : (
                <Square className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="text-sm leading-relaxed">
                <span className={acceptedTerms ? 'text-green-700' : 'text-emerald-700'}>
                  أوافق على{' '}
                </span>
                <button 
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowCourierTermsModal(true) }}
                  className="text-emerald-600 hover:text-emerald-800 font-bold underline"
                >
                  شروط وأحكام المندوب
                </button>
                <span className={acceptedTerms ? 'text-green-700' : 'text-emerald-700'}>
                  {' '}وأتحمل كامل المسؤولية كمندوب مستقل
                </span>
              </div>
            </div>
          )}

          <button 
            disabled={loading || (requiresTerms && !acceptedTerms)} 
            className={`w-full flex items-center justify-center gap-3 text-white font-bold p-4 rounded-2xl shadow-xl transition-all ${
              requiresTerms && !acceptedTerms
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 shadow-sky-300/50 hover:scale-[1.02]'
            }`}
          >
            {loading ? 'جارٍ التسجيل...' : (
              <>
                <UserPlus className="w-5 h-5" />
                تسجيل
              </>
            )}
          </button>

          {/* تنبيه للموافقة على الشروط */}
          {requiresTerms && !acceptedTerms && (
            <p className={`text-center text-sm p-3 rounded-xl ${
              role === 'courier' 
                ? 'text-emerald-600 bg-emerald-50' 
                : 'text-orange-600 bg-orange-50'
            }`}>
              ⚠️ يجب الموافقة على الشروط والأحكام لإكمال التسجيل
            </p>
          )}
        </form>

        {/* رابط تسجيل الدخول */}
        <p className="mt-6 text-center text-sky-600">
          عندك حساب؟{' '}
          <Link className="text-sky-500 hover:text-sky-700 font-bold" to="/login">
            سجّل دخول ✨
          </Link>
        </p>
      </div>
    </div>
  )
}
