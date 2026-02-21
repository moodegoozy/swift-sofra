// src/pages/CourierApp.tsx
import React, { useEffect, useState } from 'react'
import { 
  collection, doc, onSnapshot, orderBy, query, updateDoc, where, 
  serverTimestamp, limit, getDoc, setDoc, getDocs, runTransaction
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/firebase'
import { useAuth } from '@/auth'
import { Order, Rating, POINTS_CONFIG, ORDER_TIME_LIMITS } from '@/types'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/ui/Toast'
import { useDialog } from '@/components/ui/ConfirmDialog'
import { RatingModal } from '@/components/RatingModal'
import { OrderTimer } from '@/components/OrderTimer'
import { notifyCourierAssigned, notifyOrderDelivered } from '@/utils/notificationService'
import { 
  MessageCircle, Package, MapPin, Truck, CheckCircle, 
  Clock, Navigation, Phone, DollarSign, Sparkles, AlertCircle,
  User, Settings, Wallet, FileText, Camera, Building2, 
  Power, PowerOff, History, TrendingUp, Calendar,
  ChevronLeft, Shield, Car, CreditCard, Info, X, Eye,
  MapPinned, Star, Target, Award, Briefcase, BarChart3, RefreshCw, MinusCircle
} from 'lucide-react'

// رسوم المنصة على كل طلب توصيل (تُخصم من المندوب)
const COURIER_PLATFORM_FEE = 3.75

type CourierProfile = {
  name: string
  phone: string
  city: string
  photoUrl?: string
  // المستندات
  idCardUrl?: string
  driverLicenseUrl?: string
  vehicleRegistrationUrl?: string
  documentsStatus?: 'pending' | 'approved' | 'rejected'
  documentsNotes?: string
  // الحساب البنكي
  bankName?: string
  bankAccountName?: string
  bankAccountNumber?: string
  // حالة التوفر
  isAvailable?: boolean
  // إعدادات الطاقة الاستيعابية
  maxActiveOrders?: number // الحد الأقصى للطلبات النشطة (افتراضي: 3)
  // إحصائيات
  totalDeliveries?: number
  rating?: number
  joinedAt?: any
  // نظام النقاط
  points?: {
    currentPoints: number
    isSuspended: boolean
    warningCount: number
  }
}

// الحد الأقصى الافتراضي للطلبات النشطة للمندوب
const DEFAULT_MAX_ACTIVE_ORDERS = 3

type TabType = 'dashboard' | 'orders' | 'history' | 'earnings' | 'profile'

export const CourierApp: React.FC = () => {
  const { user } = useAuth()
  const nav = useNavigate()
  const toast = useToast()
  const dialog = useDialog()
  
  // الحالة الرئيسية
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [ready, setReady] = useState<Order[]>([])
  const [mine, setMine] = useState<Order[]>([])
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [deliveryFees, setDeliveryFees] = useState<Record<string, string>>({})
  const [savingFee, setSavingFee] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  
  // قائمة الأسر التي وافقت على توظيف المندوب
  const [acceptedRestaurants, setAcceptedRestaurants] = useState<string[]>([])
  
  // بيانات المندوب
  const [profile, setProfile] = useState<CourierProfile | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  
  // إحصائيات
  const [stats, setStats] = useState({
    todayDeliveries: 0,
    todayEarnings: 0,
    weekDeliveries: 0,
    weekEarnings: 0,
    monthDeliveries: 0,
    monthEarnings: 0,
    totalDeliveries: 0,
    totalEarnings: 0,
    totalPlatformFees: 0,
    netEarnings: 0,
    pendingOrders: 0,
    activeOrders: 0,
  })
  
  // رفع الملفات
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null)
  
  // تعديل الملف الشخصي
  const [editingProfile, setEditingProfile] = useState(false)
  const [tempProfile, setTempProfile] = useState<Partial<CourierProfile>>({})
  
  // نظام تقييم العميل
  const [ratingModal, setRatingModal] = useState<{
    isOpen: boolean
    orderId: string
  }>({ isOpen: false, orderId: '' })

  // تحميل بيانات المندوب
  useEffect(() => {
    if (!user?.uid) return
    
    const loadProfile = async () => {
      const docRef = doc(db, 'couriers', user.uid)
      const snap = await getDoc(docRef)
      
      if (snap.exists()) {
        setProfile(snap.data() as CourierProfile)
      } else {
        // إنشاء ملف شخصي جديد
        const newProfile: CourierProfile = {
          name: user.displayName || '',
          phone: '',
          city: '',
          isAvailable: true,
          totalDeliveries: 0,
          rating: 5.0,
          joinedAt: serverTimestamp()
        }
        await setDoc(docRef, newProfile)
        setProfile(newProfile)
      }
      setLoadingProfile(false)
    }
    
    // تحميل الأسر التي وافقت على توظيف المندوب
    const loadAcceptedRestaurants = async () => {
      const { getDocs } = await import('firebase/firestore')
      const hiringQuery = query(
        collection(db, 'hiringRequests'),
        where('courierId', '==', user.uid),
        where('status', '==', 'accepted')
      )
      const hiringSnap = await getDocs(hiringQuery)
      const restaurantIds = hiringSnap.docs.map(d => d.data().restaurantId)
      setAcceptedRestaurants(restaurantIds)
    }
    
    loadProfile()
    loadAcceptedRestaurants()
  }, [user?.uid])

  // تحميل الطلبات
  useEffect(() => {
    if (!user?.uid) return
    
    // الطلبات الجاهزة للتوصيل (من الأسر التي وافقت على المندوب فقط)
    const q1 = query(
      collection(db, 'orders'), 
      where('status', 'in', ['ready']), 
      orderBy('createdAt', 'desc'),
      limit(50)
    )
    const u1 = onSnapshot(q1, (snap) => {
      const allReadyOrders = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order))
      // تصفية الطلبات: فقط من الأسر التي وافقت على توظيف المندوب
      if (acceptedRestaurants.length > 0) {
        const filtered = allReadyOrders.filter(order => {
          const restaurantId = order.restaurantId || order.items?.[0]?.ownerId || ''
          return acceptedRestaurants.includes(restaurantId)
        })
        setReady(filtered)
      } else {
        // إذا لم يتم قبول المندوب في أي أسرة، لا يرى طلبات
        setReady([])
      }
    })
    
    // طلباتي الحالية
    const q2 = query(
      collection(db, 'orders'), 
      where('courierId', '==', user.uid), 
      orderBy('createdAt', 'desc'),
      limit(50)
    )
    const u2 = onSnapshot(q2, (snap) => {
      const orders = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order))
      setMine(orders)
      setAllOrders(orders)
      calculateStats(orders)
    })
    
    return () => { u1(); u2() }
  }, [user?.uid, acceptedRestaurants])

  // حساب الإحصائيات
  const calculateStats = (orders: Order[]) => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekStart = new Date(todayStart)
    weekStart.setDate(weekStart.getDate() - 7)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    let todayDeliveries = 0, todayEarnings = 0
    let weekDeliveries = 0, weekEarnings = 0
    let monthDeliveries = 0, monthEarnings = 0
    let totalDeliveries = 0, totalEarnings = 0
    let totalPlatformFees = 0
    let activeOrders = 0

    orders.forEach(order => {
      const createdAt = (order.createdAt as any)?.toDate?.() || new Date(order.createdAt as any)
      const fee = order.deliveryFee || 0
      const platformFee = order.courierPlatformFee || COURIER_PLATFORM_FEE

      if (order.status === 'out_for_delivery') {
        activeOrders++
      }

      if (order.status === 'delivered') {
        totalDeliveries++
        totalEarnings += fee
        totalPlatformFees += platformFee

        if (createdAt >= todayStart) {
          todayDeliveries++
          todayEarnings += fee
        }
        if (createdAt >= weekStart) {
          weekDeliveries++
          weekEarnings += fee
        }
        if (createdAt >= monthStart) {
          monthDeliveries++
          monthEarnings += fee
        }
      }
    })

    setStats({
      todayDeliveries,
      todayEarnings,
      weekDeliveries,
      weekEarnings,
      monthDeliveries,
      monthEarnings,
      totalDeliveries,
      totalEarnings,
      totalPlatformFees,
      netEarnings: totalEarnings - totalPlatformFees,
      pendingOrders: ready.length,
      activeOrders,
    })
  }

  // تحديث البيانات
  const handleRefresh = async () => {
    if (!user?.uid) return
    setRefreshing(true)
    try {
      // إعادة تحميل ملف المندوب
      const profileSnap = await getDoc(doc(db, 'couriers', user.uid))
      if (profileSnap.exists()) {
        setProfile(profileSnap.data() as any)
      }
      // إعادة تحميل المطاعم المقبولة
      const hiringQuery = query(
        collection(db, 'hiringRequests'),
        where('courierId', '==', user.uid),
        where('status', '==', 'accepted')
      )
      const hiringSnap = await getDocs(hiringQuery)
      const restaurantIds = hiringSnap.docs.map(d => d.data().restaurantId)
      setAcceptedRestaurants(restaurantIds)
      toast.success('تم التحديث')
    } catch (err) {
      toast.error('حدث خطأ أثناء التحديث')
    } finally {
      setRefreshing(false)
    }
  }

  // تبديل حالة التوفر
  const toggleAvailability = async () => {
    if (!user?.uid || !profile) return
    
    const newStatus = !profile.isAvailable
    await updateDoc(doc(db, 'couriers', user.uid), { 
      isAvailable: newStatus,
      updatedAt: serverTimestamp()
    })
    setProfile({ ...profile, isAvailable: newStatus })
    toast.success(newStatus ? '🟢 أنت الآن متاح للطلبات' : '🔴 أنت الآن غير متاح')
  }

  // استلام الطلب (مع transaction لمنع race condition)
  const takeOrder = async (id: string, order: Order) => {
    if (!user) return
    
    if (!profile?.isAvailable) {
      toast.error('فعّل حالة التوفر أولاً')
      return
    }
    
    // 🚫 التحقق من عدم تجاوز الحد الأقصى للطلبات النشطة
    const maxOrders = profile?.maxActiveOrders || DEFAULT_MAX_ACTIVE_ORDERS
    const activeOrdersCount = mine.filter(o => 
      o.status === 'out_for_delivery' || o.status === 'accepted'
    ).length
    
    if (activeOrdersCount >= maxOrders) {
      dialog.warning(
        `لديك ${activeOrdersCount} طلب نشط حالياً. الحد الأقصى هو ${maxOrders} طلبات.\n\nأكمل التوصيلات الحالية قبل استلام طلبات جديدة.`,
        { title: '⚠️ تجاوزت الحد الأقصى للطلبات' }
      )
      return
    }
    
    const feeStr = deliveryFees[id]
    const fee = order.deliveryFeeSetBy ? (order.deliveryFee || 0) : parseFloat(feeStr)
    
    if (!order.deliveryFeeSetBy && (isNaN(fee) || fee < 0)) {
      toast.error('حدد رسوم التوصيل أولاً')
      return
    }

    // ✅ الخطوة الأولى: التأكيد الأولي
    const confirmStep1 = await dialog.confirm(
      `هل تريد استلام هذا الطلب؟\n\n📍 ${order.address}\n💰 رسوم التوصيل: ${order.deliveryFeeSetBy ? order.deliveryFee : fee} ر.س`,
      { 
        title: '🚗 تأكيد استلام الطلب',
        confirmText: 'نعم، متابعة',
        cancelText: 'إلغاء'
      }
    )
    if (!confirmStep1) return

    // ✅ الخطوة الثانية: التأكيد النهائي
    const confirmStep2 = await dialog.confirm(
      `⚠️ تأكيد نهائي:\n\nباستلامك لهذا الطلب، أنت ملتزم بتوصيله في الوقت المحدد.\n\n• رسوم المنصة: ${COURIER_PLATFORM_FEE} ر.س ستُخصم من أرباحك\n• لديك حالياً ${activeOrdersCount + 1} من ${maxOrders} طلبات نشطة`,
      { 
        title: '⚡ التزام نهائي',
        confirmText: '✓ أستلم الطلب الآن',
        cancelText: 'تراجع',
        dangerous: false
      }
    )
    if (!confirmStep2) return

    setSavingFee(id)
    
    try {
      // استخدام transaction لمنع مندوبين من استلام نفس الطلب
      await runTransaction(db, async (transaction) => {
        const orderRef = doc(db, 'orders', id)
        const orderSnap = await transaction.get(orderRef)
        
        if (!orderSnap.exists()) {
          throw new Error('الطلب غير موجود')
        }
        
        const currentData = orderSnap.data()
        
        // التحقق من أن الطلب لا يزال متاحاً
        if (currentData.courierId) {
          throw new Error('تم استلام هذا الطلب من قبل مندوب آخر')
        }
        
        if (currentData.status !== 'ready') {
          throw new Error('هذا الطلب لم يعد متاحاً للاستلام')
        }
        
        const currentTotal = order.total || order.subtotal
        const newTotal = currentTotal + fee
        const updateData: Record<string, any> = {
          courierId: user.uid,
          status: 'out_for_delivery',
          courierPlatformFee: COURIER_PLATFORM_FEE,
          'timestamps.pickedUpAt': serverTimestamp(),
          updatedAt: serverTimestamp()
        }
        
        // إضافة رسوم التوصيل إذا لم تكن محددة مسبقاً
        if (!order.deliveryFeeSetBy) {
          updateData.deliveryFee = fee
          updateData.deliveryFeeSetBy = 'courier'
          updateData.deliveryFeeSetAt = serverTimestamp()
          updateData.total = newTotal
        }
        
        transaction.update(orderRef, updateData)
      })
      
      // 🔔 إشعار للعميل: مندوب في الطريق
      const orderData = allOrders.find((o: Order) => o.id === id) || ready.find((o: Order) => o.id === id)
      if (orderData) {
        notifyCourierAssigned(orderData.customerId, id, profile?.name || 'المندوب')
      }
      
      toast.success(order.deliveryFeeSetBy 
        ? 'تم استلام الطلب!' 
        : `تم استلام الطلب! رسوم التوصيل: ${fee} ر.س`
      )
    } catch (err: any) {
      console.error('خطأ في استلام الطلب:', err)
      toast.error(err.message || 'حدث خطأ أثناء استلام الطلب')
    } finally {
      setSavingFee(null)
    }
  }

  // تأكيد التسليم
  const confirmDelivery = async (id: string) => {
    const confirmed = await dialog.confirm(
      'هل تم تسليم الطلب بنجاح؟',
      { title: 'تأكيد التسليم', confirmText: 'نعم، تم التسليم', cancelText: 'إلغاء' }
    )
    if (!confirmed) return
    
    // جلب بيانات الطلب للإشعار
    const orderData = mine.find(o => o.id === id)
    
    await updateDoc(doc(db, 'orders', id), { 
      status: 'delivered', 
      deliveredAt: serverTimestamp(),
      'timestamps.deliveredAt': serverTimestamp(),
      updatedAt: serverTimestamp() 
    })
    
    // 🔔 إشعار للعميل: تم توصيل طلبك
    if (orderData) {
      notifyOrderDelivered(orderData.customerId, id, orderData.restaurantName || 'المطعم')
      
      // 🔔 إشعار للإدارة: طلب ناجح
      try {
        const { notifyAdminSuccessfulOrder } = await import('@/utils/notificationService')
        await notifyAdminSuccessfulOrder(
          id,
          orderData.restaurantName || 'المطعم',
          'العميل',
          orderData.total || 0,
          orderData.platformFee || 0
        )
      } catch (adminNotifErr) {
        console.warn('⚠️ تعذر إشعار الإدارة:', adminNotifErr)
      }
    }
    
    toast.success('تم تسليم الطلب بنجاح! ✅')
  }
  
  // هل الطلب يحتاج تقييم من المندوب؟
  const needsCustomerRating = (order: Order): boolean => {
    if (order.status !== 'delivered') return false
    return !order.ratings?.courierToCustomer?.stars
  }
  
  // إرسال تقييم العميل
  const submitCustomerRating = async (orderId: string, rating: Rating) => {
    try {
      const orderRef = doc(db, 'orders', orderId)
      const orderSnap = await getDoc(orderRef)
      if (!orderSnap.exists()) return
      
      const orderData = orderSnap.data()
      const currentRatings = orderData.ratings || {}
      
      // تحديث تقييم المندوب للعميل
      const updatedRatings = {
        ...currentRatings,
        courierToCustomer: rating
      }
      
      // التحقق من اكتمال جميع التقييمات
      const allRatingsComplete = 
        updatedRatings.customerToRestaurant?.stars &&
        updatedRatings.customerToCourier?.stars &&
        updatedRatings.restaurantToCustomer?.stars &&
        updatedRatings.courierToCustomer?.stars
      
      await updateDoc(orderRef, {
        ratings: updatedRatings,
        ratingCompleted: allRatingsComplete,
        updatedAt: serverTimestamp()
      })
      
      toast.success('شكراً على تقييمك! ⭐')
      setRatingModal({ isOpen: false, orderId: '' })
    } catch (error) {
      toast.error('حدث خطأ في إرسال التقييم')
    }
  }

  // حفظ الملف الشخصي
  const saveProfile = async (updates: Partial<CourierProfile>) => {
    if (!user?.uid) return
    setSavingProfile(true)
    
    try {
      await updateDoc(doc(db, 'couriers', user.uid), {
        ...updates,
        updatedAt: serverTimestamp()
      })
      setProfile(prev => prev ? { ...prev, ...updates } : null)
      toast.success('تم حفظ البيانات')
    } catch (error) {
      toast.error('حدث خطأ')
    }
    
    setSavingProfile(false)
  }

  // رفع مستند
  const uploadDocument = async (type: 'idCard' | 'driverLicense' | 'vehicleRegistration', file: File) => {
    if (!user?.uid) return
    setUploadingDoc(type)
    
    try {
      const storageRef = ref(storage, `couriers/${user.uid}/${type}_${Date.now()}`)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      
      const fieldName = `${type}Url` as keyof CourierProfile
      const updates: Partial<CourierProfile> = {
        [fieldName]: url,
        documentsStatus: 'pending'
      }
      
      await saveProfile(updates)
      toast.success('تم رفع المستند بنجاح')
    } catch (error) {
      toast.error('فشل رفع المستند')
    }
    
    setUploadingDoc(null)
  }

  // بدء تعديل الملف الشخصي
  const startEditingProfile = () => {
    setTempProfile({
      name: profile?.name || '',
      phone: profile?.phone || '',
      city: profile?.city || '',
      bankName: profile?.bankName || '',
      bankAccountName: profile?.bankAccountName || '',
      bankAccountNumber: profile?.bankAccountNumber || '',
      maxActiveOrders: profile?.maxActiveOrders || DEFAULT_MAX_ACTIVE_ORDERS,
    })
    setEditingProfile(true)
  }

  // عرض شاشة التحميل
  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">جارِ التحميل...</p>
        </div>
      </div>
    )
  }

  // ===== التبويبات =====
  const tabs = [
    { id: 'dashboard' as TabType, label: 'الرئيسية', icon: Target },
    { id: 'orders' as TabType, label: 'الطلبات', icon: Package },
    { id: 'history' as TabType, label: 'السجل', icon: History },
    { id: 'earnings' as TabType, label: 'الأرباح', icon: Wallet },
    { id: 'profile' as TabType, label: 'حسابي', icon: User },
  ]

  // ===== عرض طلب جاهز =====
  const renderReadyOrder = (order: Order) => (
    <div key={order.id} className="bg-white rounded-2xl shadow-card overflow-hidden hover:shadow-lg transition-all border border-gray-100">
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 flex items-center justify-between">
        <span className="text-white font-bold">#{order.id.slice(-6)}</span>
        <span className="text-white/90 text-sm">{order.restaurantName || 'مطعم'}</span>
      </div>
      <div className="p-4">
        {/* عداد وقت انتظار الاستلام */}
        <div className="mb-3">
          <OrderTimer order={order} type="pickup" compact />
        </div>
        
        <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
          <MapPin className="w-4 h-4" />
          <span className="truncate">{order.address}</span>
        </div>
        
        <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">سعر المنتجات</span>
            <span className="font-semibold">{order.subtotal?.toFixed(2)} ر.س</span>
          </div>
          {order.deliveryFeeSetBy ? (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">رسوم التوصيل</span>
              <span className="font-semibold text-green-600">{order.deliveryFee?.toFixed(2)} ر.س</span>
            </div>
          ) : (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">رسوم التوصيل</span>
              <span className="text-amber-600 text-xs">تحددها أنت</span>
            </div>
          )}
        </div>

        {/* تحديد رسوم التوصيل */}
        {!order.deliveryFeeSetBy && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="font-semibold text-amber-800 text-sm">حدد رسوم التوصيل</span>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="0.5"
                placeholder="مثال: 10"
                value={deliveryFees[order.id] || ''}
                onChange={(e) => setDeliveryFees(prev => ({ ...prev, [order.id]: e.target.value }))}
                className="flex-1 px-3 py-2 rounded-lg border border-amber-200 focus:border-amber-400 focus:outline-none text-sm"
              />
              <span className="flex items-center text-gray-500 text-sm">ر.س</span>
            </div>
            <p className="text-xs text-amber-700 mt-2">
              ⚠️ رسوم المنصة: {COURIER_PLATFORM_FEE} ر.س لكل طلب
            </p>
          </div>
        )}

        <button 
          onClick={() => takeOrder(order.id, order)}
          disabled={savingFee === order.id || !profile?.isAvailable}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-gray-800 to-gray-900 
                     text-white font-bold flex items-center justify-center gap-2
                     hover:from-gray-900 hover:to-black transition-all shadow-lg disabled:opacity-50"
        >
          {savingFee === order.id ? (
            <span>جارِ الحفظ...</span>
          ) : (
            <>
              <Truck className="w-5 h-5" />
              <span>استلام الطلب 🚗</span>
            </>
          )}
        </button>
      </div>
    </div>
  )

  // ===== عرض طلب نشط =====
  const renderActiveOrder = (order: Order) => (
    <div key={order.id} className="bg-white rounded-2xl shadow-card overflow-hidden border-2 border-sky-200">
      <div className="bg-gradient-to-r from-sky-500 to-blue-500 px-4 py-2 flex items-center justify-between">
        <span className="text-white font-bold">#{order.id.slice(-6)}</span>
        <div className="flex items-center gap-1 text-white/90 text-sm">
          <Clock className="w-3 h-3" />
          <span>في الطريق</span>
        </div>
      </div>
      <div className="p-4">
        {/* عداد وقت التوصيل */}
        <div className="mb-3">
          <OrderTimer order={order} type="delivery" />
        </div>
        
        <div className="flex items-center gap-2 text-gray-600 text-sm mb-2">
          <MapPin className="w-4 h-4" />
          <span className="truncate">{order.address}</span>
        </div>
        <div className="flex items-center gap-2 text-green-600 font-bold text-lg mb-3">
          <DollarSign className="w-5 h-5" />
          <span>{order.total?.toFixed?.(2)} ر.س</span>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => nav(`/chat?orderId=${order.id}`)}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary to-accent 
                       text-white font-bold flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-5 h-5" />
            <span>محادثة 💬</span>
          </button>
          <button 
            onClick={() => confirmDelivery(order.id)} 
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 
                       text-white font-bold flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            <span>تم التسليم ✅</span>
          </button>
        </div>
      </div>
    </div>
  )

  // ===== الصفحة الرئيسية =====
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* ⛔ تنبيه الإيقاف */}
      {profile?.points?.isSuspended && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
              <MinusCircle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-red-700">⛔ حسابك موقوف!</h3>
              <p className="text-sm text-red-600">لن تستطيع استلام طلبات جديدة. تواصل مع الدعم الفني.</p>
            </div>
          </div>
          <button
            onClick={() => nav('/support')}
            className="w-full mt-3 py-2 bg-red-500 text-white rounded-xl font-bold"
          >
            تواصل مع الدعم ←
          </button>
        </div>
      )}

      {/* نظام النقاط */}
      {profile?.points && !profile.points.isSuspended && (
        <div className={`rounded-2xl p-4 border-2 ${
          profile.points.currentPoints < POINTS_CONFIG.WARNING_THRESHOLD
            ? 'bg-amber-50 border-amber-300'
            : 'bg-sky-50 border-sky-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className={`w-6 h-6 ${
                profile.points.currentPoints < POINTS_CONFIG.WARNING_THRESHOLD
                  ? 'text-amber-500' : 'text-sky-500'
              }`} />
              <span className="font-bold text-gray-700">رصيد النقاط</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${
                profile.points.currentPoints < POINTS_CONFIG.WARNING_THRESHOLD
                  ? 'text-amber-600' : 'text-sky-600'
              }`}>{profile.points.currentPoints}</span>
              <span className="text-gray-400">/ {POINTS_CONFIG.STARTING_POINTS}</span>
            </div>
          </div>
          {profile.points.currentPoints < POINTS_CONFIG.WARNING_THRESHOLD && (
            <p className="text-sm text-amber-600 mt-2">
              ⚠️ نقاطك منخفضة! حافظ على جودة الخدمة.
            </p>
          )}
        </div>
      )}

      {/* بيان العمل المستقل */}
      <div className="bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-blue-800">🚗 أنت مندوب مستقل (عمل حر)</h3>
            <p className="text-sm text-blue-600 mt-1">
              تعمل بحرية كاملة بدون دوام أو التزامات وظيفية. استلم الطلبات التي تناسبك واحتفظ بأرباحك.
            </p>
          </div>
        </div>
      </div>

      {/* زر التوفر */}
      <button
        onClick={toggleAvailability}
        className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-lg ${
          profile?.isAvailable 
            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700' 
            : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white hover:from-gray-500 hover:to-gray-600'
        }`}
      >
        {profile?.isAvailable ? (
          <>
            <Power className="w-6 h-6" />
            <span>🟢 متاح للطلبات</span>
          </>
        ) : (
          <>
            <PowerOff className="w-6 h-6" />
            <span>🔴 غير متاح</span>
          </>
        )}
      </button>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-5 h-5 opacity-80" />
            <span className="text-sm opacity-90">طلبات جاهزة</span>
          </div>
          <div className="text-3xl font-bold">{ready.length}</div>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="w-5 h-5 opacity-80" />
            <span className="text-sm opacity-90">قيد التوصيل</span>
          </div>
          <div className="text-3xl font-bold">{stats.activeOrders}</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 opacity-80" />
            <span className="text-sm opacity-90">أرباح اليوم</span>
          </div>
          <div className="text-3xl font-bold">{stats.todayEarnings.toFixed(0)}<span className="text-lg"> ر.س</span></div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-4 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 opacity-80" />
            <span className="text-sm opacity-90">تسليمات اليوم</span>
          </div>
          <div className="text-3xl font-bold">{stats.todayDeliveries}</div>
        </div>
      </div>

      {/* تنبيه المستندات */}
      {profile?.documentsStatus !== 'approved' && (
        <div className={`rounded-2xl p-4 ${
          profile?.documentsStatus === 'rejected' 
            ? 'bg-red-50 border border-red-200' 
            : 'bg-amber-50 border border-amber-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              profile?.documentsStatus === 'rejected' ? 'bg-red-500' : 'bg-amber-500'
            }`}>
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              {profile?.documentsStatus === 'rejected' ? (
                <>
                  <h4 className="font-bold text-red-700">❌ تم رفض المستندات</h4>
                  <p className="text-sm text-red-600">{profile.documentsNotes || 'يرجى رفع مستندات صالحة'}</p>
                </>
              ) : profile?.documentsStatus === 'pending' ? (
                <>
                  <h4 className="font-bold text-amber-700">⏳ المستندات قيد المراجعة</h4>
                  <p className="text-sm text-amber-600">سيتم إشعارك بالنتيجة قريباً</p>
                </>
              ) : (
                <>
                  <h4 className="font-bold text-amber-700">📄 ارفع مستنداتك</h4>
                  <p className="text-sm text-amber-600">لتوثيق حسابك وزيادة الموثوقية</p>
                </>
              )}
            </div>
            <button
              onClick={() => setActiveTab('profile')}
              className="text-sm font-bold text-amber-700 underline"
            >
              رفع
            </button>
          </div>
        </div>
      )}

      {/* الطلبات النشطة */}
      {mine.filter(o => o.status === 'out_for_delivery').length > 0 && (
        <div>
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Navigation className="w-5 h-5 text-sky-500" />
            طلباتي النشطة
          </h3>
          <div className="space-y-3">
            {mine.filter(o => o.status === 'out_for_delivery').map(renderActiveOrder)}
          </div>
        </div>
      )}

      {/* طلبات جاهزة للاستلام */}
      {profile?.isAvailable && ready.length > 0 && (
        <div>
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Package className="w-5 h-5 text-purple-500" />
            طلبات جاهزة للتوصيل ({ready.length})
          </h3>
          <div className="space-y-3">
            {ready.slice(0, 3).map(renderReadyOrder)}
            {ready.length > 3 && (
              <button
                onClick={() => setActiveTab('orders')}
                className="w-full py-3 bg-gray-100 rounded-xl text-gray-600 font-semibold hover:bg-gray-200 transition"
              >
                عرض الكل ({ready.length}) ←
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )

  // ===== صفحة الطلبات =====
  const renderOrders = () => (
    <div className="space-y-6">
      {/* الطلبات النشطة */}
      <div>
        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Navigation className="w-5 h-5 text-sky-500" />
          طلباتي النشطة ({mine.filter(o => o.status === 'out_for_delivery').length})
        </h3>
        {mine.filter(o => o.status === 'out_for_delivery').length > 0 ? (
          <div className="space-y-3">
            {mine.filter(o => o.status === 'out_for_delivery').map(renderActiveOrder)}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-2xl">
            <Truck className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">لا توجد طلبات نشطة</p>
          </div>
        )}
      </div>

      {/* الطلبات الجاهزة */}
      <div>
        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Package className="w-5 h-5 text-purple-500" />
          طلبات جاهزة للتوصيل ({ready.length})
        </h3>
        {ready.length > 0 ? (
          <div className="space-y-3">
            {ready.map(renderReadyOrder)}
          </div>
        ) : acceptedRestaurants.length === 0 ? (
          <div className="text-center py-8 bg-amber-50 rounded-2xl border border-amber-200">
            <Briefcase className="w-12 h-12 text-amber-400 mx-auto mb-2" />
            <p className="text-amber-700 font-medium">لا توجد أسر منتجة قبلت طلب توظيفك</p>
            <p className="text-amber-600 text-sm mt-1">تقدم لطلبات توظيف من صفحة "طلبات التوظيف"</p>
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-2xl">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">لا توجد طلبات جاهزة حالياً</p>
          </div>
        )}
      </div>
    </div>
  )

  // ===== صفحة السجل =====
  const renderHistory = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-800 flex items-center gap-2">
          <History className="w-5 h-5 text-gray-500" />
          سجل الطلبات
        </h3>
        <span className="text-sm text-gray-500">{allOrders.filter(o => o.status === 'delivered').length} طلب</span>
      </div>

      {allOrders.filter(o => o.status === 'delivered').length > 0 ? (
        <div className="space-y-3">
          {allOrders.filter(o => o.status === 'delivered').map(order => (
            <div key={order.id} className="bg-white rounded-xl shadow p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-gray-800">#{order.id.slice(-6)}</span>
                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-bold">
                  ✅ تم التسليم
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-2">
                <MapPin className="w-4 h-4" />
                <span className="truncate">{order.address}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div className="text-sm text-gray-500">
                  {(order.createdAt as any)?.toDate?.().toLocaleDateString('ar-SA') || ''}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-green-600 font-bold">{order.deliveryFee?.toFixed(2)} ر.س</span>
                  <span className="text-red-500 text-sm">-{COURIER_PLATFORM_FEE} رسوم</span>
                </div>
              </div>
              
              {/* نظام تقييم العميل */}
              {needsCustomerRating(order) && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => setRatingModal({ isOpen: true, orderId: order.id })}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-sky-50 to-blue-50 
                               border-2 border-sky-200 rounded-xl hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-sky-600" />
                      <span className="font-medium text-gray-800">قيّم العميل ⭐</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map(n => (
                        <Star key={n} className="w-4 h-4 text-gray-300 group-hover:text-sky-400 transition" />
                      ))}
                    </div>
                  </button>
                </div>
              )}
              
              {/* عرض التقييم المكتمل */}
              {order.ratings?.courierToCustomer?.stars && (
                <div className="mt-3 pt-3 border-t border-gray-100 bg-green-50 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-green-700 font-medium">تقييمك للعميل:</span>
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map(n => (
                        <Star key={n} className={`w-4 h-4 ${n <= (order.ratings?.courierToCustomer?.stars || 0) ? 'text-sky-400 fill-sky-400' : 'text-gray-300'}`} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-2xl">
          <History className="w-16 h-16 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">لا توجد طلبات سابقة</p>
        </div>
      )}
    </div>
  )

  // ===== صفحة الأرباح =====
  const renderEarnings = () => (
    <div className="space-y-6">
      {/* ملخص الأرباح */}
      <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="w-6 h-6" />
          <h3 className="font-bold text-lg">💰 ملخص الأرباح</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-white/70 text-sm mb-1">اليوم</p>
            <p className="text-2xl font-bold">{stats.todayEarnings.toFixed(0)} <span className="text-sm">ر.س</span></p>
            <p className="text-white/60 text-xs">{stats.todayDeliveries} توصيل</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-white/70 text-sm mb-1">الأسبوع</p>
            <p className="text-2xl font-bold">{stats.weekEarnings.toFixed(0)} <span className="text-sm">ر.س</span></p>
            <p className="text-white/60 text-xs">{stats.weekDeliveries} توصيل</p>
          </div>
          <div className="bg-white/10 rounded-xl p-4">
            <p className="text-white/70 text-sm mb-1">الشهر</p>
            <p className="text-2xl font-bold">{stats.monthEarnings.toFixed(0)} <span className="text-sm">ر.س</span></p>
            <p className="text-white/60 text-xs">{stats.monthDeliveries} توصيل</p>
          </div>
          <div className="bg-white/20 rounded-xl p-4 ring-2 ring-white/30">
            <p className="text-white/70 text-sm mb-1">الإجمالي</p>
            <p className="text-2xl font-bold">{stats.totalEarnings.toFixed(0)} <span className="text-sm">ر.س</span></p>
            <p className="text-white/60 text-xs">{stats.totalDeliveries} توصيل</p>
          </div>
        </div>
      </div>

      {/* تقرير الأرباح */}
      <div className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-gray-800">📊 تفاصيل الأرباح</h3>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">إجمالي رسوم التوصيل</span>
            <span className="font-bold text-gray-900">{stats.totalEarnings.toFixed(2)} ر.س</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-100">
            <div>
              <span className="text-gray-600">رسوم المنصة</span>
              <p className="text-xs text-gray-400">({stats.totalDeliveries} طلب × {COURIER_PLATFORM_FEE} ر.س)</p>
            </div>
            <span className="font-bold text-red-600">- {stats.totalPlatformFees.toFixed(2)} ر.س</span>
          </div>
          <div className="flex items-center justify-between py-3 bg-green-50 rounded-xl px-3">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-green-800">صافي أرباحك</span>
            </div>
            <span className="text-2xl font-bold text-green-600">{stats.netEarnings.toFixed(2)} ر.س</span>
          </div>
        </div>
      </div>

      {/* الحساب البنكي */}
      <div className="bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-blue-800">🏦 حسابك البنكي</h3>
        </div>
        {profile?.bankName ? (
          <div className="bg-white rounded-xl p-3 space-y-2">
            <p className="text-sm"><span className="text-gray-500">البنك:</span> <span className="font-semibold">{profile.bankName}</span></p>
            <p className="text-sm"><span className="text-gray-500">الاسم:</span> <span className="font-semibold">{profile.bankAccountName}</span></p>
            <p className="text-sm"><span className="text-gray-500">الآيبان:</span> <span className="font-semibold">{profile.bankAccountNumber}</span></p>
          </div>
        ) : (
          <button
            onClick={() => setActiveTab('profile')}
            className="w-full py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition"
          >
            أضف حسابك البنكي
          </button>
        )}
        <p className="text-xs text-blue-600 mt-2">
          💡 يتم تحويل أرباحك أسبوعياً إلى حسابك البنكي
        </p>
      </div>

      {/* رابط المحفظة التفصيلية */}
      <button
        onClick={() => nav('/courier/wallet')}
        className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-2xl font-bold hover:from-orange-600 hover:to-orange-700 transition flex items-center justify-center gap-2"
      >
        <Wallet className="w-5 h-5" />
        عرض المحفظة التفصيلية
      </button>
    </div>
  )

  // ===== صفحة الملف الشخصي =====
  const renderProfile = () => (
    <div className="space-y-6">
      {/* بطاقة الملف الشخصي */}
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500 rounded-full -translate-y-1/2 translate-x-1/2" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center overflow-hidden">
              {profile?.photoUrl ? (
                <img src={profile.photoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <User className="w-10 h-10 text-white/60" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold">{profile?.name || 'مندوب'}</h2>
              <p className="text-white/70 text-sm">{profile?.phone || 'لم يُحدد'}</p>
              <p className="text-white/50 text-sm">{profile?.city || 'المدينة'}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/20">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.totalDeliveries}</p>
              <p className="text-white/60 text-xs">توصيل</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold flex items-center justify-center gap-1">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                {profile?.rating?.toFixed(1) || '5.0'}
              </p>
              <p className="text-white/60 text-xs">تقييم</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.netEarnings.toFixed(0)}</p>
              <p className="text-white/60 text-xs">ر.س أرباح</p>
            </div>
          </div>
        </div>
      </div>

      {/* حالة التوثيق */}
      <div className={`rounded-2xl p-4 ${
        profile?.documentsStatus === 'approved' ? 'bg-green-50 border border-green-200' :
        profile?.documentsStatus === 'rejected' ? 'bg-red-50 border border-red-200' :
        'bg-amber-50 border border-amber-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            profile?.documentsStatus === 'approved' ? 'bg-green-500' :
            profile?.documentsStatus === 'rejected' ? 'bg-red-500' :
            'bg-amber-500'
          }`}>
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className={`font-bold ${
              profile?.documentsStatus === 'approved' ? 'text-green-700' :
              profile?.documentsStatus === 'rejected' ? 'text-red-700' :
              'text-amber-700'
            }`}>
              {profile?.documentsStatus === 'approved' && '✅ حساب موثق'}
              {profile?.documentsStatus === 'rejected' && '❌ المستندات مرفوضة'}
              {(!profile?.documentsStatus || profile?.documentsStatus === 'pending') && '⏳ قيد التوثيق'}
            </h3>
            {profile?.documentsStatus === 'rejected' && profile.documentsNotes && (
              <p className="text-sm text-red-600">{profile.documentsNotes}</p>
            )}
          </div>
        </div>
      </div>

      {/* تعديل البيانات */}
      {editingProfile ? (
        <div className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-4">تعديل البيانات</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">الاسم</label>
              <input
                type="text"
                value={tempProfile.name || ''}
                onChange={(e) => setTempProfile({ ...tempProfile, name: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">رقم الجوال</label>
              <input
                type="tel"
                value={tempProfile.phone || ''}
                onChange={(e) => setTempProfile({ ...tempProfile, phone: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">المدينة</label>
              <input
                type="text"
                value={tempProfile.city || ''}
                onChange={(e) => setTempProfile({ ...tempProfile, city: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />
            </div>
            
            {/* إعدادات الطاقة الاستيعابية */}
            <div className="border-t pt-4">
              <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                <Package className="w-4 h-4 text-orange-500" />
                الطاقة الاستيعابية
              </h4>
              <div className="space-y-2">
                <label className="text-sm text-gray-600">الحد الأقصى للطلبات النشطة</label>
                <select
                  value={tempProfile.maxActiveOrders || DEFAULT_MAX_ACTIVE_ORDERS}
                  onChange={(e) => setTempProfile({ ...tempProfile, maxActiveOrders: parseInt(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sky-400"
                >
                  <option value={1}>طلب واحد</option>
                  <option value={2}>طلبان</option>
                  <option value={3}>3 طلبات (افتراضي)</option>
                  <option value={4}>4 طلبات</option>
                  <option value={5}>5 طلبات</option>
                </select>
                <p className="text-xs text-gray-500">
                  لن تتمكن من استلام طلبات جديدة حتى تنهي الطلبات النشطة
                </p>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-green-500" />
                الحساب البنكي
              </h4>
              <div className="space-y-3">
                <select
                  value={tempProfile.bankName || ''}
                  onChange={(e) => setTempProfile({ ...tempProfile, bankName: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-sky-400"
                >
                  <option value="">اختر البنك</option>
                  <option value="الراجحي">بنك الراجحي</option>
                  <option value="الأهلي">البنك الأهلي</option>
                  <option value="الإنماء">مصرف الإنماء</option>
                  <option value="الرياض">بنك الرياض</option>
                  <option value="البلاد">بنك البلاد</option>
                </select>
                <input
                  type="text"
                  placeholder="اسم صاحب الحساب"
                  value={tempProfile.bankAccountName || ''}
                  onChange={(e) => setTempProfile({ ...tempProfile, bankAccountName: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200"
                />
                <input
                  type="text"
                  placeholder="رقم الآيبان (IBAN)"
                  value={tempProfile.bankAccountNumber || ''}
                  onChange={(e) => setTempProfile({ ...tempProfile, bankAccountNumber: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  saveProfile(tempProfile)
                  setEditingProfile(false)
                }}
                disabled={savingProfile}
                className="flex-1 py-3 bg-sky-500 text-white rounded-xl font-bold hover:bg-sky-600 transition disabled:opacity-50"
              >
                {savingProfile ? 'جارِ الحفظ...' : 'حفظ'}
              </button>
              <button
                onClick={() => setEditingProfile(false)}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={startEditingProfile}
          className="w-full py-3 bg-sky-500 text-white rounded-xl font-bold hover:bg-sky-600 transition flex items-center justify-center gap-2"
        >
          <Settings className="w-5 h-5" />
          تعديل البيانات
        </button>
      )}

      {/* رفع المستندات */}
      <div className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-gray-500" />
          المستندات المطلوبة
        </h3>
        
        <div className="space-y-4">
          {/* الهوية */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-gray-500" />
              <span className="font-medium">صورة الهوية</span>
            </div>
            {profile?.idCardUrl ? (
              <div className="flex items-center gap-2">
                <a href={profile.idCardUrl} target="_blank" rel="noopener noreferrer" className="text-sky-600 text-sm">عرض</a>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
            ) : (
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadDocument('idCard', e.target.files[0])}
                />
                <span className="text-sky-600 text-sm font-bold">
                  {uploadingDoc === 'idCard' ? 'جارِ الرفع...' : 'رفع'}
                </span>
              </label>
            )}
          </div>

          {/* رخصة القيادة */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <Car className="w-5 h-5 text-gray-500" />
              <span className="font-medium">رخصة القيادة</span>
            </div>
            {profile?.driverLicenseUrl ? (
              <div className="flex items-center gap-2">
                <a href={profile.driverLicenseUrl} target="_blank" rel="noopener noreferrer" className="text-sky-600 text-sm">عرض</a>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
            ) : (
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadDocument('driverLicense', e.target.files[0])}
                />
                <span className="text-sky-600 text-sm font-bold">
                  {uploadingDoc === 'driverLicense' ? 'جارِ الرفع...' : 'رفع'}
                </span>
              </label>
            )}
          </div>

          {/* استمارة السيارة */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-gray-500" />
              <span className="font-medium">استمارة السيارة</span>
            </div>
            {profile?.vehicleRegistrationUrl ? (
              <div className="flex items-center gap-2">
                <a href={profile.vehicleRegistrationUrl} target="_blank" rel="noopener noreferrer" className="text-sky-600 text-sm">عرض</a>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
            ) : (
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadDocument('vehicleRegistration', e.target.files[0])}
                />
                <span className="text-sky-600 text-sm font-bold">
                  {uploadingDoc === 'vehicleRegistration' ? 'جارِ الرفع...' : 'رفع'}
                </span>
              </label>
            )}
          </div>
        </div>
      </div>

      {/* بيان العمل المستقل */}
      <div className="bg-gradient-to-r from-gray-100 to-gray-50 border border-gray-200 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-600 space-y-2">
            <p><strong>📋 بيان العمل المستقل:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-gray-500">
              <li>أنت تعمل كمندوب مستقل (Freelancer) وليس موظفاً</li>
              <li>لا يوجد دوام ثابت أو ساعات عمل محددة</li>
              <li>حرية كاملة في قبول أو رفض الطلبات</li>
              <li>رسوم المنصة: {COURIER_PLATFORM_FEE} ر.س لكل طلب</li>
              <li>التواصل مع العملاء يتم عبر التطبيق فقط</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )

  // ===== العرض الرئيسي =====
  return (
    <div className="space-y-4 pb-24">
      {/* الهيدر */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Truck className="w-6 h-6 text-sky-500" />
          لوحة المندوب
        </h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition"
        >
          <RefreshCw className={`w-5 h-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* التبويبات */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold whitespace-nowrap transition ${
                activeTab === tab.id
                  ? 'bg-sky-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* المحتوى */}
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'orders' && renderOrders()}
      {activeTab === 'history' && renderHistory()}
      {activeTab === 'earnings' && renderEarnings()}
      {activeTab === 'profile' && renderProfile()}
      
      {/* نافذة التقييم */}
      <RatingModal
        isOpen={ratingModal.isOpen}
        onClose={() => setRatingModal({ isOpen: false, orderId: '' })}
        onSubmit={(rating) => submitCustomerRating(ratingModal.orderId, rating)}
        type="customer"
        orderId={ratingModal.orderId}
      />
    </div>
  )
}

export default CourierApp
