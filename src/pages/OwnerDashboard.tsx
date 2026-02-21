// src/pages/OwnerDashboard.tsx
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth'
import { db } from '@/firebase'
import { 
  collection, query, where, getDocs, doc, getDoc, orderBy, updateDoc, increment, setDoc, serverTimestamp
} from 'firebase/firestore'
import { 
  Utensils, ClipboardList, Settings, Crown, Sparkles, Megaphone, Building2,
  TrendingUp, ShoppingBag, Star, Truck, Wallet, Package, 
  ChefHat, Clock, CheckCircle, AlertCircle, RefreshCw, Phone, MapPin,
  Briefcase, Eye, MessageCircle, Plus, Edit3, BarChart3, 
  Users, Gift, Zap, Shield, Camera, Globe, Bell, ArrowRight,
  Store, Layers, PieChart, Target, Award, Flame, Heart, Share2, Copy, Link2,
  UserPlus, Download, ExternalLink, MinusCircle
} from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { POINTS_CONFIG, Story } from '@/types'
import { isRamadan } from '@/utils/ramadanConfig'

type Restaurant = {
  name: string
  logoUrl?: string
  phone?: string
  city?: string
  location?: string
  description?: string
  packageType?: 'free' | 'premium'
  packageExpiresAt?: any
  packageSubscribedAt?: any
  isVerified?: boolean
  rating?: number
  deliveryRate?: number
  totalOrders?: number
  bankName?: string
  bankAccountName?: string
  bankAccountNumber?: string
  isHiring?: boolean
  hiringDescription?: string
  hiringContact?: string
  sellerTier?: string
  commercialLicenseUrl?: string
  licenseStatus?: 'pending' | 'approved' | 'rejected'
  licenseNotes?: string
  isOpen?: boolean
  // نظام النقاط
  points?: {
    currentPoints: number
    isSuspended: boolean
    warningCount: number
  }
}

type Order = {
  id: string
  status: string
  total: number
  subtotal: number
  deliveryFee: number
  createdAt?: any
  items: any[]
}

type MenuItem = {
  id: string
  name: string
  price: number
  available: boolean
}

type Promotion = {
  id: string
  isActive: boolean
  viewsCount?: number
  expiresAt?: any
}

type Stats = {
  todayOrders: number
  todayRevenue: number
  weekOrders: number
  weekRevenue: number
  monthOrders: number
  monthRevenue: number
  totalOrders: number
  totalRevenue: number
  pendingOrders: number
  preparingOrders: number
  deliveredOrders: number
  cancelledOrders: number
  menuItems: number
  availableItems: number
  averageRating: number
  deliveryRate: number
  activePromotions: number
  totalViews: number
  uniqueCustomers: number
  // إحصائيات الزيارات الجديدة
  profileViews: number
  menuViews: number
  itemViews: number
  shareClicks: number
  whatsappShares: number
  registeredViaLink: number
  todayViews: number
  followersCount: number
}

type RestaurantStats = {
  totalProfileViews: number
  totalMenuViews: number
  totalItemViews: number
  totalShareClicks: number
  whatsappShareCount: number
  registeredCustomers: number
  appDownloads: number
  followersCount: number
  dailyViews: Record<string, number>
}

export const OwnerDashboard: React.FC = () => {
  const { user } = useAuth()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'menu' | 'marketing' | 'settings'>('overview')
  const [stats, setStats] = useState<Stats>({
    todayOrders: 0, todayRevenue: 0,
    weekOrders: 0, weekRevenue: 0,
    monthOrders: 0, monthRevenue: 0,
    totalOrders: 0, totalRevenue: 0,
    pendingOrders: 0, preparingOrders: 0,
    deliveredOrders: 0, cancelledOrders: 0,
    menuItems: 0, availableItems: 0,
    averageRating: 0, deliveryRate: 0,
    activePromotions: 0, totalViews: 0,
    uniqueCustomers: 0,
    // إحصائيات الزيارات الجديدة
    profileViews: 0, menuViews: 0, itemViews: 0,
    shareClicks: 0, whatsappShares: 0,
    registeredViaLink: 0, todayViews: 0, followersCount: 0
  })
  const [copied, setCopied] = useState(false)
  const [restaurantStats, setRestaurantStats] = useState<RestaurantStats | null>(null)

  // رابط المتجر مع كود الإحالة
  const getStoreLink = (source?: string) => {
    const baseUrl = `${window.location.origin}/menu?restaurant=${user?.uid}`
    return source ? `${baseUrl}&ref=${source}` : baseUrl
  }

  // تسجيل المشاركة وتحديث الإحصائيات
  const trackShare = async (type: 'copy' | 'whatsapp' | 'social') => {
    if (!user?.uid) return
    try {
      const statsRef = doc(db, 'restaurantStats', user.uid)
      const updates: Record<string, any> = {
        totalShareClicks: increment(1),
        updatedAt: serverTimestamp()
      }
      if (type === 'whatsapp') {
        updates.whatsappShareCount = increment(1)
      }
      await updateDoc(statsRef, updates).catch(async () => {
        // إنشاء المستند إذا لم يكن موجود
        await setDoc(statsRef, {
          totalProfileViews: 0,
          totalMenuViews: 0,
          totalItemViews: 0,
          totalShareClicks: 1,
          whatsappShareCount: type === 'whatsapp' ? 1 : 0,
          registeredCustomers: 0,
          appDownloads: 0,
          dailyViews: {},
          updatedAt: serverTimestamp()
        })
      })
    } catch (err) {
      console.warn('خطأ في تسجيل المشاركة:', err)
    }
  }

  // نسخ رابط المتجر
  const copyStoreLink = async () => {
    const link = getStoreLink('copy')
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('تم نسخ الرابط! 📋')
    trackShare('copy')
  }

  // مشاركة عبر الواتساب
  const shareToWhatsapp = () => {
    const link = getStoreLink('whatsapp')
    const text = encodeURIComponent(`🍽️ تفضل بزيارة متجر ${restaurant?.name || 'متجري'} على سفرة البيت!\n\n${link}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
    toast.success('جاري فتح الواتساب... 📱')
    trackShare('whatsapp')
  }

  // مشاركة المتجر (عامة)
  const shareStore = async () => {
    const link = getStoreLink('social')
    if (navigator.share) {
      try {
        await navigator.share({
          title: restaurant?.name || 'متجري',
          text: `تفضل بزيارة ${restaurant?.name} على سفرة البيت`,
          url: link
        })
        trackShare('social')
      } catch (err) {
        copyStoreLink()
      }
    } else {
      copyStoreLink()
    }
  }
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [topItems, setTopItems] = useState<{ name: string; count: number }[]>([])
  const [stories, setStories] = useState<Story[]>([])

  // تحميل البيانات
  const loadData = async () => {
    if (!user?.uid) return

    try {
      // جلب بيانات المطعم
      const restaurantDoc = await getDoc(doc(db, 'restaurants', user.uid))
      if (restaurantDoc.exists()) {
        setRestaurant(restaurantDoc.data() as Restaurant)
      }

      // جلب الأصناف
      const menuQuery = query(
        collection(db, 'menuItems'),
        where('ownerId', '==', user.uid)
      )
      const menuSnap = await getDocs(menuQuery)
      const menuItems = menuSnap.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem))

      // جلب الطلبات
      const ordersQuery = query(
        collection(db, 'orders'),
        where('ownerId', '==', user.uid),
        orderBy('createdAt', 'desc')
      )
      const ordersSnap = await getDocs(ordersQuery)
      const orders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order))

      // جلب الإعلانات
      let activePromotions = 0
      let totalViews = 0
      try {
        const promoQuery = query(
          collection(db, 'promotions'),
          where('ownerId', '==', user.uid)
        )
        const promoSnap = await getDocs(promoQuery)
        promoSnap.docs.forEach(d => {
          const data = d.data() as Promotion
          if (data.isActive) activePromotions++
          totalViews += data.viewsCount || 0
        })
      } catch (e) {}

      // حساب الإحصائيات الزمنية
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

      const todayOrders = orders.filter(o => {
        const orderDate = o.createdAt?.toDate?.() || new Date(0)
        return orderDate >= today && o.status !== 'cancelled'
      })

      const weekOrders = orders.filter(o => {
        const orderDate = o.createdAt?.toDate?.() || new Date(0)
        return orderDate >= weekAgo && o.status !== 'cancelled'
      })

      const monthOrders = orders.filter(o => {
        const orderDate = o.createdAt?.toDate?.() || new Date(0)
        return orderDate >= monthAgo && o.status !== 'cancelled'
      })

      const deliveredOrders = orders.filter(o => o.status === 'delivered')
      const pendingOrders = orders.filter(o => o.status === 'pending')
      const preparingOrders = orders.filter(o => ['accepted', 'preparing'].includes(o.status))
      const cancelledOrders = orders.filter(o => o.status === 'cancelled')

      // حساب عدد العملاء الفريدين
      const uniqueCustomerIds = new Set(orders.map((o: any) => o.customerId).filter(Boolean))

      // حساب أكثر الأصناف مبيعاً
      const itemCounts: Record<string, number> = {}
      deliveredOrders.forEach(order => {
        order.items?.forEach((item: any) => {
          const name = item.name || 'غير معروف'
          itemCounts[name] = (itemCounts[name] || 0) + (item.qty || 1)
        })
      })
      const sortedItems = Object.entries(itemCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }))

      setTopItems(sortedItems)
      setRecentOrders(orders.slice(0, 5))
      
      // جلب إحصائيات الزيارات
      let profileViews = 0, menuViews = 0, itemViews = 0
      let shareClicks = 0, whatsappShares = 0, registeredViaLink = 0, todayViewsCount = 0, followersCount = 0
      try {
        const statsDoc = await getDoc(doc(db, 'restaurantStats', user.uid))
        if (statsDoc.exists()) {
          const statsData = statsDoc.data() as RestaurantStats
          setRestaurantStats(statsData)
          profileViews = statsData.totalProfileViews || 0
          menuViews = statsData.totalMenuViews || 0
          itemViews = statsData.totalItemViews || 0
          shareClicks = statsData.totalShareClicks || 0
          whatsappShares = statsData.whatsappShareCount || 0
          registeredViaLink = statsData.registeredCustomers || 0
          followersCount = statsData.followersCount || 0
          
          // حساب زيارات اليوم
          const todayKey = new Date().toISOString().split('T')[0]
          todayViewsCount = statsData.dailyViews?.[todayKey] || 0
        }
      } catch (e) {
        console.warn('خطأ في جلب إحصائيات الزيارات:', e)
      }

      // جلب عدد العملاء المسجلين عبر رابط الأسرة
      try {
        const registrationsQuery = query(
          collection(db, 'customerRegistrations'),
          where('restaurantId', '==', user.uid)
        )
        const registrationsSnap = await getDocs(registrationsQuery)
        registeredViaLink = registrationsSnap.size
      } catch (e) {}

      // جلب عدد المتابعين
      try {
        const followersQuery = query(
          collection(db, 'storeFollowers'),
          where('restaurantId', '==', user.uid)
        )
        const followersSnap = await getDocs(followersQuery)
        followersCount = followersSnap.size
      } catch (e) {}

      // جلب الستوري النشطة
      try {
        const storiesQuery = query(
          collection(db, 'stories'),
          where('ownerId', '==', user.uid)
        )
        const storiesSnap = await getDocs(storiesQuery)
        const storiesData = storiesSnap.docs
          .map(d => ({
            id: d.id,
            ...d.data(),
            expiresAt: d.data().expiresAt?.toDate?.(),
            createdAt: d.data().createdAt?.toDate?.(),
          } as Story))
          .filter(s => s.expiresAt && new Date(s.expiresAt) > now)
          .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
        setStories(storiesData)
      } catch (e) {
        console.warn('خطأ في جلب الستوري:', e)
      }
      
      setStats({
        todayOrders: todayOrders.length,
        todayRevenue: todayOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0),
        weekOrders: weekOrders.length,
        weekRevenue: weekOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0),
        monthOrders: monthOrders.length,
        monthRevenue: monthOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0),
        totalOrders: orders.filter(o => o.status !== 'cancelled').length,
        totalRevenue: deliveredOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0),
        pendingOrders: pendingOrders.length,
        preparingOrders: preparingOrders.length,
        deliveredOrders: deliveredOrders.length,
        cancelledOrders: cancelledOrders.length,
        menuItems: menuItems.length,
        availableItems: menuItems.filter(m => m.available).length,
        averageRating: restaurantDoc.data()?.rating || 0,
        deliveryRate: restaurantDoc.data()?.deliveryRate || 0,
        activePromotions,
        totalViews,
        uniqueCustomers: uniqueCustomerIds.size,
        // إحصائيات الزيارات الجديدة
        profileViews,
        menuViews,
        itemViews,
        shareClicks,
        whatsappShares,
        registeredViaLink,
        todayViews: todayViewsCount,
        followersCount
      })

    } catch (err) {
      console.error('خطأ في تحميل البيانات:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [user?.uid])

  const handleRefresh = () => {
    setRefreshing(true)
    loadData()
  }

  // حالة الطلب
  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; icon: any }> = {
      pending: { label: 'بانتظار القبول', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
      accepted: { label: 'مقبول', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
      preparing: { label: 'جاري التحضير', color: 'bg-orange-100 text-orange-700', icon: ChefHat },
      ready: { label: 'جاهز للتوصيل', color: 'bg-purple-100 text-purple-700', icon: Package },
      out_for_delivery: { label: 'في الطريق', color: 'bg-indigo-100 text-indigo-700', icon: Truck },
      delivered: { label: 'تم التوصيل', color: 'bg-green-100 text-green-700', icon: CheckCircle },
      cancelled: { label: 'ملغي', color: 'bg-red-100 text-red-700', icon: AlertCircle },
    }
    return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-700', icon: Clock }
  }

  const getTierInfo = (tier?: string) => {
    switch (tier) {
      case 'gold': return { label: 'ذهبي', color: 'from-yellow-400 to-amber-500', icon: '👑' }
      case 'silver': return { label: 'فضي', color: 'from-gray-300 to-gray-400', icon: '🥈' }
      default: return { label: 'برونزي', color: 'from-orange-500 to-orange-600', icon: '🥉' }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جارِ التحميل...</p>
        </div>
      </div>
    )
  }

  // التحقق من الاشتراك في الباقة المميزة
  const isPremium = restaurant?.packageType === 'premium'
  const tier = getTierInfo(restaurant?.sellerTier)

  // حساب الأيام المتبقية للاشتراك
  const getDaysRemaining = () => {
    if (!restaurant?.packageExpiresAt) return null
    const expiresAt = restaurant.packageExpiresAt?.toDate?.() || new Date(restaurant.packageExpiresAt)
    const now = new Date()
    const diff = expiresAt.getTime() - now.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }
  const daysRemaining = getDaysRemaining()
  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 7 && daysRemaining > 0
  const isExpired = daysRemaining !== null && daysRemaining <= 0

  // حساب صافي الأرباح
  const calculateNetProfit = () => {
    const grossRevenue = stats.totalRevenue
    const platformFee = stats.deliveredOrders * 3.75 // رسوم المنصة الثابتة
    return grossRevenue - platformFee
  }
  const netProfit = calculateNetProfit()

  // ===== صفحة الباقة المجانية (البسيطة) =====
  if (!isPremium) {
    return (
      <div className="space-y-6 pb-20">
        {/* ========== بطاقة حالة الاشتراك ========== */}
        <div className="bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl p-4 border-2 border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-300 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-700">📦 الباقة المجانية</h3>
                <p className="text-sm text-gray-500">المميزات الأساسية</p>
              </div>
            </div>
            <Link
              to="/owner/packages"
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:shadow-lg transition"
            >
              ترقية ✨
            </Link>
          </div>
        </div>

        {/* ========== بطاقة حالة الترخيص ========== */}
        {restaurant?.commercialLicenseUrl ? (
          <div className={`rounded-2xl p-4 border-2 ${
            restaurant.licenseStatus === 'approved' ? 'bg-green-50 border-green-200' :
            restaurant.licenseStatus === 'rejected' ? 'bg-red-50 border-red-200' :
            'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                restaurant.licenseStatus === 'approved' ? 'bg-green-500' :
                restaurant.licenseStatus === 'rejected' ? 'bg-red-500' :
                'bg-yellow-500'
              }`}>
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className={`font-bold ${
                  restaurant.licenseStatus === 'approved' ? 'text-green-700' :
                  restaurant.licenseStatus === 'rejected' ? 'text-red-700' :
                  'text-yellow-700'
                }`}>
                  {restaurant.licenseStatus === 'approved' && '✅ الترخيص مُعتمد'}
                  {restaurant.licenseStatus === 'rejected' && '❌ الترخيص مرفوض'}
                  {(!restaurant.licenseStatus || restaurant.licenseStatus === 'pending') && '⏳ الترخيص قيد المراجعة'}
                </h3>
                {restaurant.licenseStatus === 'rejected' && restaurant.licenseNotes && (
                  <p className="text-sm text-red-600">{restaurant.licenseNotes}</p>
                )}
              </div>
              {restaurant.licenseStatus === 'rejected' && (
                <Link to="/owner/edit" className="text-red-600 text-sm font-bold underline">
                  إعادة الرفع
                </Link>
              )}
            </div>
          </div>
        ) : (
          <Link 
            to="/owner/edit"
            className="block bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-2xl p-4 hover:shadow-lg transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-orange-700">📄 ارفع ترخيصك التجاري</h3>
                <p className="text-sm text-orange-600">لتفعيل متجرك بالكامل</p>
              </div>
            </div>
          </Link>
        )}

        {/* ========== نظام النقاط والتقييم ========== */}
        {restaurant?.points && (
          <div className={`rounded-2xl p-4 border-2 ${
            restaurant.points.isSuspended 
              ? 'bg-red-50 border-red-300' 
              : restaurant.points.currentPoints < POINTS_CONFIG.WARNING_THRESHOLD
              ? 'bg-amber-50 border-amber-300'
              : 'bg-sky-50 border-sky-200'
          }`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                restaurant.points.isSuspended 
                  ? 'bg-red-500' 
                  : restaurant.points.currentPoints < POINTS_CONFIG.WARNING_THRESHOLD
                  ? 'bg-amber-500'
                  : 'bg-sky-500'
              }`}>
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className={`font-bold ${
                  restaurant.points.isSuspended 
                    ? 'text-red-700' 
                    : restaurant.points.currentPoints < POINTS_CONFIG.WARNING_THRESHOLD
                    ? 'text-amber-700'
                    : 'text-sky-700'
                }`}>
                  {restaurant.points.isSuspended ? '⛔ حسابك موقوف!' : '🛡️ رصيد النقاط'}
                </h3>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`text-3xl font-bold ${
                  restaurant.points.isSuspended 
                    ? 'text-red-600' 
                    : restaurant.points.currentPoints < POINTS_CONFIG.WARNING_THRESHOLD
                    ? 'text-amber-600'
                    : 'text-sky-600'
                }`}>
                  {restaurant.points.currentPoints}
                </div>
                <div className="text-sm text-gray-500">
                  / {POINTS_CONFIG.STARTING_POINTS} نقطة
                </div>
              </div>
              
              {/* شريط التقدم */}
              <div className="flex-1 max-w-[150px] mr-4">
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all ${
                      restaurant.points.isSuspended 
                        ? 'bg-red-500' 
                        : restaurant.points.currentPoints < POINTS_CONFIG.WARNING_THRESHOLD
                        ? 'bg-amber-500'
                        : 'bg-sky-500'
                    }`}
                    style={{ width: `${Math.min(100, restaurant.points.currentPoints)}%` }}
                  />
                </div>
              </div>
            </div>
            
            {restaurant.points.isSuspended && (
              <div className="mt-3 bg-red-100 rounded-xl p-3">
                <p className="text-sm text-red-700">
                  ⛔ حسابك موقوف بسبب انخفاض النقاط. تواصل مع الدعم الفني لإعادة تفعيله.
                </p>
                <Link 
                  to="/support" 
                  className="inline-block mt-2 text-red-600 font-bold underline text-sm"
                >
                  تواصل مع الدعم ←
                </Link>
              </div>
            )}
            
            {!restaurant.points.isSuspended && restaurant.points.currentPoints < POINTS_CONFIG.WARNING_THRESHOLD && (
              <div className="mt-3 bg-amber-100 rounded-xl p-3">
                <p className="text-sm text-amber-700">
                  ⚠️ تنبيه: نقاطك منخفضة! حافظ على جودة الخدمة لتجنب الإيقاف.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ========== ملخص الأرباح ========== */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-4 border-2 border-green-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-bold text-green-700">💰 ملخص الأرباح</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.totalRevenue.toFixed(0)}</p>
              <p className="text-xs text-gray-500">إجمالي المبيعات (ر.س)</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-emerald-600">{netProfit.toFixed(0)}</p>
              <p className="text-xs text-gray-500">صافي الأرباح (ر.س)</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 text-center mt-2">
            * بعد خصم رسوم المنصة (3.75 ر.س لكل طلب)
          </p>
        </div>

        {/* دعوة للاشتراك في الباقة */}
        <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 rounded-3xl shadow-2xl p-6 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
          </div>
          
          <div className="relative z-10 text-center py-6">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Crown className="w-10 h-10 text-yellow-300" />
            </div>
            <h2 className="text-2xl font-bold mb-2">🌟 اشترك في الباقة المميزة</h2>
            <p className="text-white/80 mb-4">
              احصل على لوحة تحكم احترافية مع إحصائيات مفصّلة ومزايا حصرية!
            </p>
            <Link
              to="/owner/packages"
              className="inline-flex items-center gap-2 bg-white text-amber-600 font-bold px-6 py-3 rounded-xl hover:bg-yellow-50 transition shadow-lg"
            >
              <Sparkles className="w-5 h-5" />
              اكتشف الباقات الآن
            </Link>
          </div>
        </div>

        {/* تنبيه الحساب البنكي */}
        {!restaurant?.bankName && (
          <Link 
            to="/owner/edit#bank"
            className="block bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-4 hover:shadow-lg transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-red-700">⚠️ أضف حسابك البنكي!</h3>
                <p className="text-sm text-red-600">لتتمكن من استلام التحويلات من العملاء</p>
              </div>
            </div>
          </Link>
        )}

        {/* تنبيه الطلبات الجديدة */}
        {stats.pendingOrders > 0 && (
          <Link 
            to="/owner/orders"
            className="block bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-2xl p-4 hover:shadow-lg transition animate-pulse"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-yellow-700">🔔 لديك {stats.pendingOrders} طلب بانتظار القبول!</h3>
                <p className="text-sm text-yellow-600">اضغط للذهاب إلى الطلبات</p>
              </div>
            </div>
          </Link>
        )}

        {/* الروابط الأساسية */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            to="/owner/packages"
            className="rounded-2xl shadow-lg hover:shadow-2xl transition transform hover:-translate-y-1 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 p-5 ring-2 ring-amber-300 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-amber-500 via-yellow-400 to-orange-500 py-1.5 text-center">
              <div className="flex items-center justify-center gap-2 text-white text-sm font-bold">
                <Sparkles className="w-4 h-4" />
                <span>اكتشف الباقات</span>
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="h-6" />
            <div className="flex items-center gap-3 mb-3">
              <Crown className="w-8 h-8 text-amber-500" />
              <h3 className="text-lg font-extrabold text-gray-900">باقات سفرة البيت</h3>
            </div>
            <p className="text-sm text-gray-600">اختر الباقة المناسبة واحصل على مزايا حصرية!</p>
          </Link>

          <Link to="/owner/menu" className="rounded-2xl shadow-lg hover:shadow-2xl transition transform hover:-translate-y-1 bg-gradient-to-br from-yellow-50 to-white p-5">
            <div className="flex items-center gap-3 mb-3">
              <Utensils className="w-8 h-8 text-yellow-500" />
              <h3 className="text-lg font-extrabold text-gray-900">إدارة القائمة</h3>
            </div>
            <p className="text-sm text-gray-600">إضافة وتعديل الأصناف والوجبات.</p>
          </Link>

          <Link to="/owner/orders" className="rounded-2xl shadow-lg hover:shadow-2xl transition transform hover:-translate-y-1 bg-gradient-to-br from-green-50 to-white p-5">
            <div className="flex items-center gap-3 mb-3">
              <ClipboardList className="w-8 h-8 text-green-500" />
              <h3 className="text-lg font-extrabold text-gray-900">إدارة الطلبات</h3>
            </div>
            <p className="text-sm text-gray-600">قبول الطلبات وتعيين المندوب.</p>
            {stats.pendingOrders > 0 && (
              <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold mt-2 inline-block">
                {stats.pendingOrders} جديد!
              </span>
            )}
          </Link>

          <Link to="/owner/edit" className="rounded-2xl shadow-lg hover:shadow-2xl transition transform hover:-translate-y-1 bg-gradient-to-br from-blue-50 to-white p-5">
            <div className="flex items-center gap-3 mb-3">
              <Settings className="w-8 h-8 text-blue-500" />
              <h3 className="text-lg font-extrabold text-gray-900">الإعدادات</h3>
            </div>
            <p className="text-sm text-gray-600">تعديل بيانات المتجر.</p>
          </Link>

          <Link to="/owner/wallet" className="rounded-2xl shadow-lg hover:shadow-2xl transition transform hover:-translate-y-1 bg-gradient-to-br from-emerald-50 to-white p-5">
            <div className="flex items-center gap-3 mb-3">
              <Wallet className="w-8 h-8 text-emerald-500" />
              <h3 className="text-lg font-extrabold text-gray-900">محفظتي</h3>
            </div>
            <p className="text-sm text-gray-600">عرض المبيعات والأرباح.</p>
          </Link>

          <Link to="/owner/offers" className="rounded-2xl shadow-lg hover:shadow-2xl transition transform hover:-translate-y-1 bg-gradient-to-br from-pink-50 to-white p-5 relative overflow-hidden">
            <div className="absolute -top-1 -left-1 bg-gradient-to-r from-pink-500 to-red-500 text-white text-xs font-bold px-3 py-1 rounded-br-xl">
              جديد ✨
            </div>
            <div className="flex items-center gap-3 mb-3">
              <Gift className="w-8 h-8 text-pink-500" />
              <h3 className="text-lg font-extrabold text-gray-900">العروض الخاصة</h3>
            </div>
            <p className="text-sm text-gray-600">أضف خصومات وعروض لجذب العملاء.</p>
          </Link>

          {/* قسم عروض رمضان */}
          {isRamadan() && (
            <Link to="/owner/offers?type=ramadan" className="rounded-2xl shadow-lg hover:shadow-2xl transition transform hover:-translate-y-1 bg-gradient-to-br from-purple-900 via-purple-800 to-emerald-900 p-5 relative overflow-hidden">
              <div className="absolute -top-1 -left-1 bg-gradient-to-r from-amber-400 to-amber-500 text-purple-900 text-xs font-bold px-3 py-1 rounded-br-xl">
                🌙 رمضان
              </div>
              <div className="absolute top-2 right-2 text-2xl animate-pulse">🌙</div>
              <div className="absolute bottom-2 left-2 text-xl opacity-50">✨</div>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">🏘️</span>
                <h3 className="text-lg font-extrabold text-white">عروض رمضان</h3>
              </div>
              <p className="text-sm text-purple-200">أضف باقات إفطار وسحور وعروض خاصة</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="bg-amber-400/20 text-amber-300 text-xs px-2 py-1 rounded-full">باقة إفطار</span>
                <span className="bg-purple-400/20 text-purple-300 text-xs px-2 py-1 rounded-full">باقة سحور</span>
                <span className="bg-emerald-400/20 text-emerald-300 text-xs px-2 py-1 rounded-full">عرض عائلي</span>
              </div>
            </Link>
          )}

          <Link to="/owner/stories" className="rounded-2xl shadow-lg hover:shadow-2xl transition transform hover:-translate-y-1 bg-gradient-to-br from-purple-50 to-white p-5 relative overflow-hidden">
            <div className="absolute -top-1 -left-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-br-xl">
              جديد ✨
            </div>
            <div className="flex items-center gap-3 mb-3">
              <Camera className="w-8 h-8 text-purple-500" />
              <h3 className="text-lg font-extrabold text-gray-900">ستوري الأسرة</h3>
            </div>
            <p className="text-sm text-gray-600">شارك طبخ اليوم وعروضك مع العملاء.</p>
          </Link>
        </div>

        {/* مزايا الباقة المميزة */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-2 mb-4">
            <Crown className="w-6 h-6 text-amber-400" />
            <h3 className="text-lg font-bold">🚀 مزايا الباقة المميزة</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="flex items-center gap-2 text-gray-300 text-sm">
              <BarChart3 className="w-4 h-4 text-green-400" />
              <span>إحصائيات مالية مفصّلة</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300 text-sm">
              <Star className="w-4 h-4 text-yellow-400" />
              <span>أكثر الأصناف مبيعاً</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300 text-sm">
              <Megaphone className="w-4 h-4 text-purple-400" />
              <span>إعلانات ممولة مجانية</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300 text-sm">
              <Shield className="w-4 h-4 text-blue-400" />
              <span>شارة التوثيق المميزة</span>
            </div>
          </div>

          <Link
            to="/owner/packages"
            className="block w-full text-center bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-3 rounded-xl hover:from-amber-600 hover:to-orange-600 transition"
          >
            🚀 اشترك الآن
          </Link>
        </div>
      </div>
    )
  }

  // ===== صفحة الباقة المميزة (المتجر الاحترافي الكامل) =====
  return (
    <div className="space-y-6 pb-24 -mx-4 -mt-4">
      
      {/* ========== الهيدر الاحترافي ========== */}
      <div className="relative">
        {/* الغلاف */}
        <div className="h-40 sm:h-48 bg-gradient-to-br from-gray-900 via-gray-800 to-black relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          </div>
          
          {/* زر التحديث */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="absolute top-4 left-4 p-2 bg-white/10 hover:bg-white/20 rounded-xl transition z-10"
          >
            <RefreshCw className={`w-5 h-5 text-white ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* شارة الباقة */}
          <div className="absolute top-4 right-4 z-10">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-1.5 rounded-full flex items-center gap-2 shadow-lg">
              <Crown className="w-4 h-4 text-white" />
              <span className="text-white font-bold text-sm">باقة مميزة</span>
            </div>
          </div>
        </div>

        {/* معلومات المتجر */}
        <div className="relative px-4 -mt-16">
          <div className="bg-white rounded-3xl shadow-xl p-5">
            <div className="flex items-start gap-4">
              {/* الشعار */}
              <div className="relative -mt-12">
                <div className="w-24 h-24 rounded-2xl bg-white shadow-xl overflow-hidden border-4 border-white">
                  {restaurant?.logoUrl ? (
                    <img src={restaurant.logoUrl} alt={restaurant.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                      <Store className="w-10 h-10 text-amber-500" />
                    </div>
                  )}
                </div>
                {restaurant?.isVerified && (
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white">
                    <CheckCircle className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>

              {/* المعلومات */}
              <div className="flex-1 pt-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-gray-900">{restaurant?.name || 'متجري'}</h1>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold text-white bg-gradient-to-r ${tier.color}`}>
                    {tier.icon} {tier.label}
                  </span>
                </div>
                
                {restaurant?.city && (
                  <p className="text-gray-500 text-sm flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" />
                    {restaurant.city}
                  </p>
                )}

                {/* إحصائيات سريعة */}
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                    <span className="font-bold">{stats.averageRating.toFixed(1)}</span>
                  </div>
                  <div className="text-gray-300">|</div>
                  <div className="text-sm text-gray-600">
                    <span className="font-bold text-gray-900">{stats.totalOrders}</span> طلب
                  </div>
                  <div className="text-gray-300">|</div>
                  <div className="text-sm text-gray-600">
                    <span className="font-bold text-gray-900">{stats.menuItems}</span> صنف
                  </div>
                </div>
              </div>
            </div>

            {/* أزرار سريعة */}
            <div className="flex gap-2 mt-4 overflow-x-auto pb-2 -mx-2 px-2">
              <Link to={`/menu?restaurant=${user?.uid}`} className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap">
                <Eye className="w-4 h-4" />
                معاينة المتجر
              </Link>
              <Link to="/owner/edit" className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap">
                <Edit3 className="w-4 h-4" />
                تعديل
              </Link>
              <Link to="/owner/promotion" className="flex items-center gap-2 bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap">
                <Megaphone className="w-4 h-4" />
                إعلان جديد
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ========== التنبيهات ========== */}
      <div className="px-4 space-y-3">
        {/* تنبيه انتهاء الاشتراك */}
        {(isExpired || isExpiringSoon) && (
          <Link 
            to="/owner/packages"
            className={`block rounded-2xl p-4 shadow-lg ${
              isExpired 
                ? 'bg-gradient-to-r from-red-600 to-red-500 text-white' 
                : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Crown className="w-6 h-6" />
              </div>
              <div className="flex-1">
                {isExpired ? (
                  <>
                    <h3 className="font-bold text-lg">⚠️ انتهت صلاحية اشتراكك!</h3>
                    <p className="text-white/80 text-sm">جدّد الآن للحفاظ على المزايا</p>
                  </>
                ) : (
                  <>
                    <h3 className="font-bold text-lg">⏰ باقي {daysRemaining} يوم على انتهاء اشتراكك</h3>
                    <p className="text-white/80 text-sm">جدّد مبكراً واستمتع بالمزايا</p>
                  </>
                )}
              </div>
              <ArrowRight className="w-6 h-6" />
            </div>
          </Link>
        )}

        {/* حالة الترخيص */}
        {restaurant?.commercialLicenseUrl && restaurant.licenseStatus !== 'approved' && (
          <div className={`rounded-2xl p-4 ${
            restaurant.licenseStatus === 'rejected' 
              ? 'bg-red-50 border border-red-200' 
              : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                restaurant.licenseStatus === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'
              }`}>
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                {restaurant.licenseStatus === 'rejected' ? (
                  <>
                    <h3 className="font-bold text-red-700">❌ تم رفض الترخيص</h3>
                    <p className="text-sm text-red-600">{restaurant.licenseNotes || 'يرجى رفع ترخيص صالح'}</p>
                  </>
                ) : (
                  <>
                    <h3 className="font-bold text-yellow-700">⏳ الترخيص قيد المراجعة</h3>
                    <p className="text-sm text-yellow-600">سيتم إشعارك بالنتيجة قريباً</p>
                  </>
                )}
              </div>
              {restaurant.licenseStatus === 'rejected' && (
                <Link to="/owner/edit" className="text-red-600 text-sm font-bold underline">
                  إعادة الرفع
                </Link>
              )}
            </div>
          </div>
        )}

        {/* تنبيه الطلبات الجديدة */}
        {stats.pendingOrders > 0 && (
          <Link 
            to="/owner/orders"
            className="block bg-gradient-to-r from-red-500 to-orange-500 rounded-2xl p-4 text-white shadow-lg animate-pulse"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Bell className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">🔔 {stats.pendingOrders} طلب جديد!</h3>
                <p className="text-white/80 text-sm">اضغط للقبول الآن</p>
              </div>
              <ArrowRight className="w-6 h-6" />
            </div>
          </Link>
        )}

        {/* تنبيه الحساب البنكي */}
        {!restaurant?.bankName && (
          <Link 
            to="/owner/edit#bank"
            className="block bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-amber-700">أضف حسابك البنكي</h3>
                <p className="text-sm text-amber-600">لاستلام التحويلات من العملاء</p>
              </div>
            </div>
          </Link>
        )}
      </div>

      {/* ========== انشري متجرك ========== */}
      <div className="px-4">
        <div className="bg-gradient-to-br from-purple-600 via-pink-600 to-rose-500 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden">
          {/* خلفية زخرفية */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Share2 className="w-6 h-6" />
              <h2 className="text-lg font-bold">📢 انشري متجرك!</h2>
            </div>
            
            <p className="text-white/80 text-sm mb-4">
              شاركي رابط متجرك مع العملاء عبر واتساب، تويتر، انستقرام أو أي منصة!
            </p>

            {/* رابط المتجر */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 mb-4">
              <p className="text-white/60 text-xs mb-1">رابط متجرك الخاص:</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white/10 rounded-lg p-2 text-sm font-mono truncate" dir="ltr">
                  {window.location.origin}/menu?restaurant={user?.uid}
                </div>
                <button
                  onClick={copyStoreLink}
                  className={`p-2 rounded-lg transition ${copied ? 'bg-green-500' : 'bg-white/20 hover:bg-white/30'}`}
                >
                  {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* أزرار المشاركة */}
            <div className="flex gap-2">
              {/* زر واتساب */}
              <button
                onClick={shareToWhatsapp}
                className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                واتساب
              </button>
              <button
                onClick={shareStore}
                className="flex-1 flex items-center justify-center gap-2 bg-white text-purple-600 font-bold py-3 rounded-xl hover:bg-purple-50 transition"
              >
                <Share2 className="w-5 h-5" />
                مشاركة
              </button>
              <Link
                to={`/menu?restaurant=${user?.uid}`}
                className="flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-3 rounded-xl transition"
              >
                <Eye className="w-5 h-5" />
                معاينة
              </Link>
            </div>

            {/* إحصائيات المشاركة والزيارات */}
            <div className="grid grid-cols-5 gap-2 mt-4 pt-4 border-t border-white/20">
              <div className="text-center">
                <p className="text-xl font-bold">{stats.followersCount}</p>
                <p className="text-white/70 text-[10px]">متابع 💜</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold">{stats.todayViews}</p>
                <p className="text-white/70 text-[10px]">زيارات اليوم</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold">{stats.profileViews}</p>
                <p className="text-white/70 text-[10px]">مشاهدة صفحة</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold">{stats.whatsappShares}</p>
                <p className="text-white/70 text-[10px]">مشاركة واتس</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold">{stats.registeredViaLink}</p>
                <p className="text-white/70 text-[10px]">تسجيل عبرك</p>
              </div>
            </div>

            {/* إحصائيات إضافية */}
            <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-white/20">
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.uniqueCustomers}</p>
                <p className="text-white/70 text-xs">عميل</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.totalViews}</p>
                <p className="text-white/70 text-xs">مشاهدة</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{stats.totalOrders}</p>
                <p className="text-white/70 text-xs">طلب</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========== ستوري الأسرة ========== */}
      <div className="px-4">
        <div className="bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-600 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden">
          {/* خلفية زخرفية */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 right-0 w-20 h-20 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Camera className="w-6 h-6" />
                <h2 className="text-lg font-bold">📸 ستوري الأسرة</h2>
              </div>
              <Link 
                to="/owner/stories" 
                className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm font-bold transition"
              >
                + أضف ستوري
              </Link>
            </div>
            
            <p className="text-white/80 text-sm mb-4">
              شاركي قصتك مع عملائك! صور أكلاتك، مطبخك، وأجواء التحضير 🍳
            </p>

            {/* عرض الستوري الحالية */}
            {stories.length === 0 ? (
              <Link 
                to="/owner/stories"
                className="block bg-white/10 backdrop-blur rounded-xl p-6 text-center hover:bg-white/20 transition"
              >
                <div className="w-16 h-16 mx-auto mb-3 bg-white/20 rounded-full flex items-center justify-center">
                  <Plus className="w-8 h-8" />
                </div>
                <p className="font-bold">أضيفي أول ستوري!</p>
                <p className="text-white/70 text-sm mt-1">اجذبي عملاء جدد بصور لذيذة</p>
              </Link>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2">
                {/* زر إضافة ستوري */}
                <Link 
                  to="/owner/stories"
                  className="flex-shrink-0 w-20 h-28 bg-white/20 rounded-xl flex flex-col items-center justify-center hover:bg-white/30 transition"
                >
                  <div className="w-10 h-10 bg-white/30 rounded-full flex items-center justify-center mb-1">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="text-xs">جديد</span>
                </Link>
                
                {/* الستوري الموجودة */}
                {stories.slice(0, 4).map((story) => (
                  <Link
                    key={story.id}
                    to="/owner/stories"
                    className="flex-shrink-0 w-20 h-28 rounded-xl overflow-hidden relative group"
                  >
                    {story.type === 'text' ? (
                      <div 
                        className="w-full h-full flex items-center justify-center p-2"
                        style={{ backgroundColor: story.backgroundColor || '#0ea5e9' }}
                      >
                        <p className="text-[10px] text-center line-clamp-3" style={{ color: story.textColor || '#fff' }}>
                          {story.caption}
                        </p>
                      </div>
                    ) : (
                      <img 
                        src={story.mediaUrl} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-1 left-1 right-1">
                      <div className="flex items-center gap-1 text-[10px]">
                        <Eye className="w-3 h-3" />
                        {story.viewsCount || 0}
                      </div>
                    </div>
                  </Link>
                ))}
                
                {stories.length > 4 && (
                  <Link 
                    to="/owner/stories"
                    className="flex-shrink-0 w-20 h-28 bg-white/20 rounded-xl flex flex-col items-center justify-center"
                  >
                    <span className="text-2xl font-bold">+{stories.length - 4}</span>
                    <span className="text-xs">المزيد</span>
                  </Link>
                )}
              </div>
            )}

            {/* إحصائيات الستوري */}
            {stories.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/20">
                <div className="text-center">
                  <p className="text-xl font-bold">{stories.length}</p>
                  <p className="text-white/70 text-xs">ستوري نشطة</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold">{stories.reduce((sum, s) => sum + (s.viewsCount || 0), 0)}</p>
                  <p className="text-white/70 text-xs">إجمالي المشاهدات</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold">24 س</p>
                  <p className="text-white/70 text-xs">مدة الستوري</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========== الإحصائيات المالية ========== */}
      <div className="px-4">
        <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl p-5 text-white shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-6 h-6" />
              <h2 className="text-lg font-bold">💰 الإيرادات</h2>
            </div>
            <Link to="/owner/orders" className="text-white/80 text-sm hover:text-white">
              عرض التفاصيل ←
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <p className="text-white/70 text-sm mb-1">اليوم</p>
              <p className="text-2xl font-bold">{stats.todayRevenue.toFixed(0)} <span className="text-sm">ر.س</span></p>
              <p className="text-white/60 text-xs mt-1">{stats.todayOrders} طلب</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <p className="text-white/70 text-sm mb-1">الأسبوع</p>
              <p className="text-2xl font-bold">{stats.weekRevenue.toFixed(0)} <span className="text-sm">ر.س</span></p>
              <p className="text-white/60 text-xs mt-1">{stats.weekOrders} طلب</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4">
              <p className="text-white/70 text-sm mb-1">الشهر</p>
              <p className="text-2xl font-bold">{stats.monthRevenue.toFixed(0)} <span className="text-sm">ر.س</span></p>
              <p className="text-white/60 text-xs mt-1">{stats.monthOrders} طلب</p>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-xl p-4 ring-2 ring-white/30">
              <p className="text-white/70 text-sm mb-1">الإجمالي</p>
              <p className="text-2xl font-bold">{stats.totalRevenue.toFixed(0)} <span className="text-sm">ر.س</span></p>
              <p className="text-white/60 text-xs mt-1">{stats.deliveredOrders} مكتمل</p>
            </div>
          </div>
        </div>
      </div>

      {/* ========== تقرير صافي الأرباح ========== */}
      <div className="px-4">
        <div className="bg-white rounded-2xl shadow-xl p-5 border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-6 h-6 text-green-600" />
            <h2 className="text-lg font-bold text-gray-900">📊 تقرير صافي الأرباح</h2>
          </div>

          <div className="space-y-3">
            {/* إجمالي المبيعات */}
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-gray-600">إجمالي المبيعات</span>
              <span className="font-bold text-gray-900">{stats.totalRevenue.toFixed(2)} ر.س</span>
            </div>

            {/* رسوم المنصة */}
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div>
                <span className="text-gray-600">رسوم المنصة</span>
                <p className="text-xs text-gray-400">({stats.deliveredOrders} طلب × 3.75 ر.س)</p>
              </div>
              <span className="font-bold text-red-600">- {(stats.deliveredOrders * 3.75).toFixed(2)} ر.س</span>
            </div>

            {/* صافي الأرباح */}
            <div className="flex items-center justify-between py-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl px-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-green-800">صافي الأرباح</span>
              </div>
              <span className="text-2xl font-bold text-green-600">{netProfit.toFixed(2)} ر.س</span>
            </div>
          </div>

          {/* نسبة الربح */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">نسبة صافي الربح</span>
              <span className={`font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.totalRevenue > 0 ? ((netProfit / stats.totalRevenue) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${stats.totalRevenue > 0 ? Math.max(0, (netProfit / stats.totalRevenue) * 100) : 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ========== لوحة التحكم السريعة ========== */}
      <div className="px-4">
        <h2 className="text-lg font-bold text-gray-900 mb-3">⚡ تحكم سريع</h2>
        <div className="grid grid-cols-2 gap-3">
          {/* إدارة الطلبات */}
          <Link 
            to="/owner/orders"
            className="bg-white rounded-2xl shadow-lg p-4 hover:shadow-xl transition border border-gray-100"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-3">
              <ClipboardList className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold text-gray-900">الطلبات</h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-bold">
                {stats.pendingOrders} جديد
              </span>
              <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-bold">
                {stats.preparingOrders} تحضير
              </span>
            </div>
          </Link>

          {/* إدارة القائمة */}
          <Link 
            to="/owner/menu"
            className="bg-white rounded-2xl shadow-lg p-4 hover:shadow-xl transition border border-gray-100"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center mb-3">
              <Utensils className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold text-gray-900">القائمة</h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-bold">
                {stats.availableItems} متاح
              </span>
              <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs font-bold">
                {stats.menuItems} إجمالي
              </span>
            </div>
          </Link>

          {/* الإعلانات */}
          <Link 
            to="/owner/promotion"
            className="bg-white rounded-2xl shadow-lg p-4 hover:shadow-xl transition border border-gray-100"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-3">
              <Megaphone className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold text-gray-900">الإعلانات</h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-bold">
                {stats.activePromotions} نشط
              </span>
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {stats.totalViews}
              </span>
            </div>
          </Link>

          {/* الإعدادات */}
          <Link 
            to="/owner/edit"
            className="bg-white rounded-2xl shadow-lg p-4 hover:shadow-xl transition border border-gray-100"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-gray-600 to-gray-700 rounded-xl flex items-center justify-center mb-3">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-bold text-gray-900">الإعدادات</h3>
            <p className="text-gray-500 text-xs mt-2">تعديل بيانات المتجر</p>
          </Link>

        </div>
      </div>

      {/* ========== حالة الطلبات ========== */}
      <div className="px-4">
        <h2 className="text-lg font-bold text-gray-900 mb-3">📊 حالة الطلبات</h2>
        <div className="bg-white rounded-2xl shadow-lg p-4 border border-gray-100">
          <div className="grid grid-cols-4 gap-2">
            <Link to="/owner/orders?status=pending" className="text-center p-3 bg-yellow-50 rounded-xl hover:bg-yellow-100 transition">
              <Clock className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-yellow-700">{stats.pendingOrders}</p>
              <p className="text-xs text-yellow-600">جديد</p>
            </Link>
            <Link to="/owner/orders?status=preparing" className="text-center p-3 bg-orange-50 rounded-xl hover:bg-orange-100 transition">
              <ChefHat className="w-6 h-6 text-orange-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-orange-700">{stats.preparingOrders}</p>
              <p className="text-xs text-orange-600">تحضير</p>
            </Link>
            <Link to="/owner/orders?status=delivered" className="text-center p-3 bg-green-50 rounded-xl hover:bg-green-100 transition">
              <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-green-700">{stats.deliveredOrders}</p>
              <p className="text-xs text-green-600">مكتمل</p>
            </Link>
            <Link to="/owner/orders?status=cancelled" className="text-center p-3 bg-red-50 rounded-xl hover:bg-red-100 transition">
              <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-red-700">{stats.cancelledOrders}</p>
              <p className="text-xs text-red-600">ملغي</p>
            </Link>
          </div>
        </div>
      </div>

      {/* ========== أكثر الأصناف مبيعاً ========== */}
      {topItems.length > 0 && (
        <div className="px-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">🏆 الأكثر مبيعاً</h2>
            <Link to="/owner/menu" className="text-amber-600 text-sm font-semibold">عرض الكل ←</Link>
          </div>
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
            {topItems.map((item, i) => (
              <div key={i} className={`flex items-center gap-3 p-4 ${i !== topItems.length - 1 ? 'border-b' : ''}`}>
                <span className="text-2xl w-8">
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{item.name}</p>
                </div>
                <div className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm font-bold">
                  {item.count} مبيعات
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========== آخر الطلبات ========== */}
      {recentOrders.length > 0 && (
        <div className="px-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900">📦 آخر الطلبات</h2>
            <Link to="/owner/orders" className="text-blue-600 text-sm font-semibold">عرض الكل ←</Link>
          </div>
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
            {recentOrders.map((order, i) => {
              const statusInfo = getStatusInfo(order.status)
              const StatusIcon = statusInfo.icon
              return (
                <Link
                  key={order.id}
                  to="/owner/orders"
                  className={`flex items-center gap-3 p-4 hover:bg-gray-50 transition ${i !== recentOrders.length - 1 ? 'border-b' : ''}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${statusInfo.color}`}>
                    <StatusIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{order.items?.length || 0} أصناف</p>
                    <p className="text-xs text-gray-500">
                      {order.createdAt?.toDate?.().toLocaleDateString('ar-SA') || ''}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-green-600">{order.subtotal?.toFixed(0)} ر.س</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* ========== أدوات إضافية ========== */}
      <div className="px-4">
        <h2 className="text-lg font-bold text-gray-900 mb-3">🛠️ أدوات إضافية</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* توظيف عاملات */}
          <Link 
            to="/owner/edit#hiring"
            className={`flex items-center gap-3 bg-white rounded-2xl shadow p-4 border ${restaurant?.isHiring ? 'border-purple-300 bg-purple-50' : 'border-gray-100'}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${restaurant?.isHiring ? 'bg-purple-500' : 'bg-gray-200'}`}>
              <Briefcase className={`w-5 h-5 ${restaurant?.isHiring ? 'text-white' : 'text-gray-500'}`} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">توظيف عاملات</p>
              <p className="text-xs text-gray-500">
                {restaurant?.isHiring ? '✓ إعلان التوظيف مفعّل' : 'ابحث عن مساعدة في الطبخ'}
              </p>
            </div>
          </Link>

          {/* الحساب البنكي */}
          <Link 
            to="/owner/edit#bank"
            className={`flex items-center gap-3 bg-white rounded-2xl shadow p-4 border ${restaurant?.bankName ? 'border-green-300 bg-green-50' : 'border-gray-100'}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${restaurant?.bankName ? 'bg-green-500' : 'bg-gray-200'}`}>
              <Building2 className={`w-5 h-5 ${restaurant?.bankName ? 'text-white' : 'text-gray-500'}`} />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">الحساب البنكي</p>
              <p className="text-xs text-gray-500">
                {restaurant?.bankName ? `✓ ${restaurant.bankName}` : 'أضف بيانات الحساب'}
              </p>
            </div>
          </Link>

          {/* الباقات */}
          <Link 
            to="/owner/packages"
            className="flex items-center gap-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl shadow p-4 border border-amber-200"
          >
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-amber-700">باقتك الحالية</p>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-amber-600">👑 الباقة المميزة</span>
                {daysRemaining !== null && (
                  <span className={`px-2 py-0.5 rounded-full ${
                    isExpired ? 'bg-red-100 text-red-600' :
                    isExpiringSoon ? 'bg-yellow-100 text-yellow-600' :
                    'bg-green-100 text-green-600'
                  }`}>
                    {isExpired ? 'منتهية' : `${daysRemaining} يوم`}
                  </span>
                )}
              </div>
            </div>
          </Link>

          {/* معاينة المتجر */}
          <Link 
            to={`/menu?restaurant=${user?.uid}`}
            className="flex items-center gap-3 bg-white rounded-2xl shadow p-4 border border-gray-100"
          >
            <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900">معاينة المتجر</p>
              <p className="text-xs text-gray-500">شاهد متجرك كما يراه العملاء</p>
            </div>
          </Link>
        </div>
      </div>

      {/* ========== حالة الاشتراك التفصيلية ========== */}
      <div className="px-4">
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-amber-800">📋 تفاصيل الاشتراك</h3>
          </div>
          
          <div className="bg-white rounded-xl p-4 space-y-3">
            {/* نوع الباقة */}
            <div className="flex items-center justify-between">
              <span className="text-gray-600">نوع الباقة</span>
              <span className="bg-amber-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                <Crown className="w-4 h-4" />
                مميزة
              </span>
            </div>

            {/* تاريخ الاشتراك */}
            {restaurant?.packageSubscribedAt && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">تاريخ الاشتراك</span>
                <span className="text-gray-900 font-medium">
                  {restaurant.packageSubscribedAt?.toDate?.()?.toLocaleDateString('ar-SA') || '-'}
                </span>
              </div>
            )}

            {/* تاريخ الانتهاء */}
            {restaurant?.packageExpiresAt && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">تاريخ الانتهاء</span>
                <span className={`font-medium ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-yellow-600' : 'text-gray-900'}`}>
                  {restaurant.packageExpiresAt?.toDate?.()?.toLocaleDateString('ar-SA') || '-'}
                </span>
              </div>
            )}

            {/* الأيام المتبقية */}
            {daysRemaining !== null && (
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-gray-600">الأيام المتبقية</span>
                <span className={`text-lg font-bold ${
                  isExpired ? 'text-red-600' :
                  isExpiringSoon ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {isExpired ? 'منتهية' : `${daysRemaining} يوم`}
                </span>
              </div>
            )}
          </div>

          {/* زر التجديد */}
          {(isExpired || isExpiringSoon) && (
            <Link 
              to="/owner/packages"
              className="mt-4 block w-full text-center bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-3 rounded-xl hover:from-amber-600 hover:to-orange-600 transition"
            >
              🔄 تجديد الاشتراك الآن
            </Link>
          )}
        </div>
      </div>

      {/* ========== معلومات الحساب البنكي (للمميزين فقط) ========== */}
      {restaurant?.bankName && (
        <div className="px-4">
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="w-5 h-5 text-green-600" />
              <h3 className="font-bold text-green-800">✅ الحساب البنكي مفعّل</h3>
            </div>
            <div className="bg-white rounded-xl p-3 space-y-2">
              <p className="text-sm text-gray-600">
                <span className="font-semibold">البنك:</span> {restaurant.bankName}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-semibold">اسم الحساب:</span> {restaurant.bankAccountName}
              </p>
              <p className="text-sm text-gray-600">
                <span className="font-semibold">رقم الآيبان:</span> {restaurant.bankAccountNumber}
              </p>
            </div>
            <p className="text-xs text-green-600 mt-2">
              💡 يظهر للعملاء عند اختيار التحويل البنكي
            </p>
          </div>
        </div>
      )}

    </div>
  )
}

export default OwnerDashboard
