// src/pages/RestaurantsPage.tsx
import React, { useEffect, useState, useMemo } from 'react'
import { db } from '@/firebase'
import { collection, getDocs, query, where, updateDoc, doc, increment, setDoc, addDoc, serverTimestamp, getDoc } from 'firebase/firestore'
import { Link, useSearchParams } from 'react-router-dom'
import { SAUDI_CITIES } from '@/utils/cities'
import { MapPin, Filter, X, Navigation, AlertCircle, CheckCircle, Crown, Medal, Award, Megaphone, ChevronLeft, ChevronRight, Play, Eye, Star, ShoppingBag, Utensils, Truck, Store, Clock, Search, SlidersHorizontal, StarHalf, Flame, Gift, Percent, Tag, Package, Plus } from 'lucide-react'
import { useAuth } from '@/auth'
import { calculateDistance, MAX_DELIVERY_DISTANCE } from '@/utils/distance'
import { Promotion, MenuItem, SpecialOffer, Story, StoryGroup } from '@/types'
import { StoryViewer } from '@/components/StoryViewer'
import { OptimizedImage, OptimizedAvatar } from '@/components/OptimizedImage'
import { isRamadan, OFFER_TYPE_LABELS, RamadanOfferType } from '@/utils/ramadanConfig'
import { RamadanBanner, IftarCountdown } from '@/components/RamadanDecorations'

// أنواع المطابخ
const CUISINE_TYPES = [
  { value: '', label: 'الكل' },
  { value: 'traditional', label: '🍚 أكلات شعبية' },
  { value: 'sweets', label: '🍰 حلويات' },
  { value: 'pastries', label: '🥧 معجنات' },
  { value: 'grills', label: '🍖 مشويات' },
  { value: 'healthy', label: '🥗 أكل صحي' },
  { value: 'international', label: '🌍 أكلات عالمية' },
]

type GeoLocation = { lat: number; lng: number }

type Restaurant = {
  id: string
  name: string
  logoUrl?: string
  city?: string
  geoLocation?: GeoLocation
  isVerified?: boolean
  licenseStatus?: 'pending' | 'approved' | 'rejected'
  sellerTier?: 'bronze' | 'silver' | 'gold'
  packageType?: 'free' | 'premium'
  allowDelivery?: boolean
  allowPickup?: boolean
  cuisineType?: string // نوع المطبخ
  // إحصائيات للعرض في الباقة المميزة
  totalOrders?: number
  averageRating?: number
  menuItemsCount?: number
}

type RestaurantWithDistance = Restaurant & {
  distance?: number
}

// نوع المنتج الأكثر طلبًا مع معلومات المطعم
type TopMenuItem = MenuItem & {
  restaurantName?: string
  restaurantLogo?: string
}

// دالة تسجيل الزيارة
const logVisit = async (restaurantId: string, userId?: string, source?: string) => {
  try {
    // تسجيل الزيارة في سجلات الزيارات
    await addDoc(collection(db, 'visitLogs'), {
      restaurantId,
      visitorId: userId || null,
      visitorType: userId ? 'customer' : 'anonymous',
      source: source || 'direct',
      page: 'menu',
      createdAt: serverTimestamp()
    })

    // تحديث إحصائيات المطعم
    const statsRef = doc(db, 'restaurantStats', restaurantId)
    const statsSnap = await getDoc(statsRef)
    
    const today = new Date().toISOString().split('T')[0]
    
    if (statsSnap.exists()) {
      const data = statsSnap.data()
      const dailyViews = data.dailyViews || {}
      dailyViews[today] = (dailyViews[today] || 0) + 1
      
      await updateDoc(statsRef, {
        totalProfileViews: increment(1),
        dailyViews,
        updatedAt: serverTimestamp()
      })
    } else {
      await setDoc(statsRef, {
        totalProfileViews: 1,
        totalMenuViews: 0,
        totalItemViews: 0,
        totalShareClicks: 0,
        whatsappShareCount: 0,
        registeredCustomers: 0,
        appDownloads: 0,
        dailyViews: { [today]: 1 },
        updatedAt: serverTimestamp()
      })
    }
  } catch (err) {
    console.warn('خطأ في تسجيل الزيارة:', err)
  }
}

export const RestaurantsPage: React.FC = () => {
  const { userLocation, role, user } = useAuth()
  const [searchParams] = useSearchParams()
  const refSource = searchParams.get('ref') // مصدر الإحالة (whatsapp, social, etc)
  const [restaurants, setRestaurants] = useState<RestaurantWithDistance[]>([])
  const [promotions, setPromotions] = useState<(Promotion & { restaurantName?: string })[]>([])
  const [topItems, setTopItems] = useState<TopMenuItem[]>([]) // ⭐ الأكثر طلبًا اليوم
  const [specialOffers, setSpecialOffers] = useState<SpecialOffer[]>([]) // 🎁 العروض الخاصة
  // 📸 الستوريات
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([])
  const [showStoryViewer, setShowStoryViewer] = useState(false)
  const [selectedStoryGroupIndex, setSelectedStoryGroupIndex] = useState(0)
  const [currentPromoIndex, setCurrentPromoIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedCity, setSelectedCity] = useState<string>('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  // 🔍 فلاتر البحث المتقدم
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCuisine, setSelectedCuisine] = useState('')
  const [minRating, setMinRating] = useState<number>(0)
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy] = useState<'distance' | 'rating' | 'orders'>('distance')

  useEffect(() => {
    (async () => {
      // جلب المطاعم
      const snap = await getDocs(collection(db, 'restaurants'))
      const rawRestaurants = snap.docs.map(d => ({ id: d.id, ...d.data() } as Restaurant))
      
      // جلب كل المنتجات لفلترة المطاعم المكتملة
      const menuSnap = await getDocs(collection(db, 'menuItems'))
      const allMenuItems = menuSnap.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem))
      
      // تجميع المنتجات حسب المطعم (ownerId)
      const menuItemsByRestaurant = new Map<string, number>()
      allMenuItems.forEach(item => {
        if (item.available !== false) {
          const count = menuItemsByRestaurant.get(item.ownerId) || 0
          menuItemsByRestaurant.set(item.ownerId, count + 1)
        }
      })
      
      // 🔒 فلترة المطاعم المكتملة فقط (للعملاء والزوار)
      // الشروط: شعار + موقع + منتج واحد على الأقل
      const allRestaurants = rawRestaurants.filter(r => {
        // يجب أن يكون لديه منتج واحد على الأقل للظهور
        const hasMenuItems = (menuItemsByRestaurant.get(r.id) || 0) > 0
        
        // إذا لا يوجد منتجات، لا يظهر لأحد
        if (!hasMenuItems) {
          return false
        }
        
        // المطور والمسؤول والمالك يرون المطاعم التي لديها منتجات
        if (role === 'developer' || role === 'admin' || role === 'owner') {
          return true
        }
        // للعملاء والمناديب: يجب أن يكون المطعم مكتمل (شعار + موقع + منتجات)
        const hasLogo = !!r.logoUrl
        const hasLocation = !!r.geoLocation
        return hasLogo && hasLocation
      })
      
      // ⭐ جلب المنتجات الأكثر طلبًا اليوم (أعلى 6 منتجات)
      try {
        const topMenuItems = allMenuItems
          .filter(item => item.available !== false && (item.orderCount || 0) > 0)
          .sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0))
          .slice(0, 6)
          .map(item => {
            const restaurant = allRestaurants.find(r => r.id === item.ownerId)
            return {
              ...item,
              restaurantName: restaurant?.name,
              restaurantLogo: restaurant?.logoUrl
            } as TopMenuItem
          })
        setTopItems(topMenuItems)
      } catch (err) {
        console.warn('Error loading top items:', err)
      }
      
      // جلب الإعلانات النشطة
      try {
        const promoQuery = query(
          collection(db, 'promotions'),
          where('isActive', '==', true)
        )
        const promoSnap = await getDocs(promoQuery)
        const now = new Date()
        const activePromos = promoSnap.docs
          .map(d => ({
            id: d.id,
            ...d.data(),
            expiresAt: d.data().expiresAt?.toDate?.(),
          } as Promotion))
          .filter(p => !p.expiresAt || new Date(p.expiresAt) > now)
          .map(p => {
            // إضافة اسم المطعم
            const restaurant = allRestaurants.find(r => r.id === p.ownerId)
            return { ...p, restaurantName: restaurant?.name }
          })
        setPromotions(activePromos)
      } catch (err) {
        console.warn('Error loading promotions:', err)
      }
      
      // 🎁 جلب العروض الخاصة النشطة
      try {
        const offersQuery = query(
          collection(db, 'offers'),
          where('isActive', '==', true)
        )
        const offersSnap = await getDocs(offersQuery)
        const now = new Date()
        const activeOffers = offersSnap.docs
          .map(d => ({
            id: d.id,
            ...d.data(),
            expiresAt: d.data().expiresAt?.toDate?.(),
          } as SpecialOffer))
          .filter(o => !o.expiresAt || new Date(o.expiresAt) > now)
          .slice(0, 8) // أظهر 8 عروض كحد أقصى
        setSpecialOffers(activeOffers)
      } catch (err) {
        console.warn('Error loading special offers:', err)
      }

      // 📸 جلب الستوريات النشطة (لم تنتهِ بعد)
      try {
        const storiesSnap = await getDocs(collection(db, 'stories'))
        const now = new Date()
        const activeStories = storiesSnap.docs
          .map(d => ({
            id: d.id,
            ...d.data(),
            expiresAt: d.data().expiresAt?.toDate?.(),
            createdAt: d.data().createdAt?.toDate?.(),
          } as Story))
          .filter(s => s.expiresAt && new Date(s.expiresAt) > now)
          .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))

        // تجميع الستوريات حسب صاحب الأسرة
        const groupsMap = new Map<string, StoryGroup>()
        activeStories.forEach(story => {
          const existing = groupsMap.get(story.ownerId)
          const restaurant = allRestaurants.find(r => r.id === story.ownerId)
          const hasUnviewed = !user?.uid || !story.viewedBy?.includes(user.uid)
          
          if (existing) {
            existing.stories.push(story)
            if (hasUnviewed) existing.hasUnviewed = true
          } else {
            groupsMap.set(story.ownerId, {
              ownerId: story.ownerId,
              restaurantName: story.restaurantName || restaurant?.name,
              restaurantLogo: story.restaurantLogo || restaurant?.logoUrl,
              stories: [story],
              hasUnviewed
            })
          }
        })
        
        // ترتيب المجموعات: الغير مشاهدة أولاً
        const groups = Array.from(groupsMap.values())
          .sort((a, b) => (b.hasUnviewed ? 1 : 0) - (a.hasUnviewed ? 1 : 0))
        setStoryGroups(groups)
      } catch (err) {
        console.warn('Error loading stories:', err)
      }
      
      // حساب المسافة وفلترة المطاعم
      let processedRestaurants: RestaurantWithDistance[] = []
      
      if (userLocation) {
        // حساب المسافة لكل مطعم
        processedRestaurants = allRestaurants.map(r => {
          if (r.geoLocation) {
            const distance = calculateDistance(userLocation, r.geoLocation)
            return { ...r, distance }
          }
          return { ...r, distance: undefined }
        })
        
        // فلترة المطاعم ضمن 15 كم فقط (للعملاء والمناديب)
        if (role === 'customer' || role === 'courier') {
          processedRestaurants = processedRestaurants.filter(r => {
            // إذا المطعم ما عنده موقع، نخفيه
            if (!r.geoLocation || r.distance === undefined) return false
            return r.distance <= MAX_DELIVERY_DISTANCE
          })
        }
        
        // ترتيب ذكي: Premium + Gold أولاً، ثم حسب المسافة
        processedRestaurants.sort((a, b) => {
          // Premium يظهر أولاً
          const aPremium = a.packageType === 'premium' ? 1 : 0
          const bPremium = b.packageType === 'premium' ? 1 : 0
          if (bPremium !== aPremium) return bPremium - aPremium
          
          // Gold ثم Silver ثم Bronze
          const tierOrder = { gold: 3, silver: 2, bronze: 1 }
          const aTier = tierOrder[a.sellerTier || 'bronze'] || 0
          const bTier = tierOrder[b.sellerTier || 'bronze'] || 0
          if (bTier !== aTier) return bTier - aTier
          
          // الموثقة تظهر قبل غير الموثقة
          const aVerified = a.isVerified ? 1 : 0
          const bVerified = b.isVerified ? 1 : 0
          if (bVerified !== aVerified) return bVerified - aVerified
          
          // ثم الترتيب حسب المسافة
          return (a.distance || 999) - (b.distance || 999)
        })
      } else {
        // إذا ما عند المستخدم موقع، نعرض كل المطاعم مرتبة
        processedRestaurants = allRestaurants.sort((a, b) => {
          const tierOrder = { gold: 3, silver: 2, bronze: 1 }
          const aTier = tierOrder[a.sellerTier || 'bronze'] || 0
          const bTier = tierOrder[b.sellerTier || 'bronze'] || 0
          if (bTier !== aTier) return bTier - aTier
          const aVerified = a.isVerified ? 1 : 0
          const bVerified = b.isVerified ? 1 : 0
          return bVerified - aVerified
        })
      }
      
      setRestaurants(processedRestaurants)
      setLoading(false)
    })()
  }, [userLocation, role])

  // المدن المتاحة (فقط التي لديها مطاعم)
  const availableCities = useMemo(() => {
    const cities = new Set(restaurants.map(r => r.city).filter(Boolean))
    return SAUDI_CITIES.filter(c => cities.has(c))
  }, [restaurants])

  // المطاعم المفلترة حسب المدينة
  const filteredRestaurants = useMemo(() => {
    let result = restaurants
    
    // فلتر المدينة
    if (selectedCity) {
      result = result.filter(r => r.city === selectedCity)
    }
    
    // فلتر البحث بالاسم
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase()
      result = result.filter(r => 
        r.name.toLowerCase().includes(query) ||
        r.city?.toLowerCase().includes(query)
      )
    }
    
    // فلتر نوع المطبخ
    if (selectedCuisine) {
      result = result.filter(r => r.cuisineType === selectedCuisine)
    }
    
    // فلتر التقييم الأدنى
    if (minRating > 0) {
      result = result.filter(r => (r.averageRating || 0) >= minRating)
    }
    
    // الترتيب
    if (sortBy === 'rating') {
      result = [...result].sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
    } else if (sortBy === 'orders') {
      result = [...result].sort((a, b) => (b.totalOrders || 0) - (a.totalOrders || 0))
    }
    // sortBy === 'distance' هو الافتراضي (مرتب مسبقاً)
    
    return result
  }, [restaurants, selectedCity, searchQuery, selectedCuisine, minRating, sortBy])

  // عدد الفلاتر النشطة
  const activeFiltersCount = [selectedCity, searchQuery, selectedCuisine, minRating > 0].filter(Boolean).length

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mb-4"></div>
        <p className="text-sky-600 font-semibold">جارِ تحميل الأسر المنتجة...</p>
      </div>
    )
  }

  return (
    <div className="pb-8">
      {/* العنوان */}
      <h1 className="text-2xl font-bold text-center mb-6 text-sky-700">
        🍴 الأسر المنتجة
      </h1>

      {/* � شريط الستوريات (مثل إنستغرام) */}
      {storyGroups.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3 px-2">
            <Play className="w-5 h-5 text-pink-500" />
            <h2 className="text-lg font-bold text-sky-700">📸 ستوري الأسر</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 px-2 scrollbar-hide">
            {storyGroups.map((group, index) => (
              <button
                key={group.ownerId}
                onClick={() => {
                  setSelectedStoryGroupIndex(index)
                  setShowStoryViewer(true)
                }}
                className="flex-shrink-0 flex flex-col items-center gap-1 group"
              >
                {/* الدائرة مع تأثير الجريدينت للستوري غير المشاهد */}
                <div className={`relative p-[3px] rounded-full ${
                  group.hasUnviewed 
                    ? 'bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600' 
                    : 'bg-gray-300'
                }`}>
                  <div className="w-16 h-16 rounded-full bg-white p-[2px]">
                    {group.restaurantLogo ? (
                      <img
                        src={group.restaurantLogo}
                        alt={group.restaurantName || 'Restaurant'}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-sky-100 flex items-center justify-center">
                        <Store className="w-7 h-7 text-sky-400" />
                      </div>
                    )}
                  </div>
                  {/* عدد الستوريات */}
                  {group.stories.length > 1 && (
                    <span className="absolute -bottom-1 -left-1 w-5 h-5 bg-pink-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                      {group.stories.length}
                    </span>
                  )}
                </div>
                {/* اسم الأسرة */}
                <span className="text-[11px] text-gray-600 font-medium text-center line-clamp-1 max-w-[70px]">
                  {group.restaurantName || 'أسرة'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* عارض الستوريات */}
      {showStoryViewer && storyGroups.length > 0 && (
        <StoryViewer
          storyGroups={storyGroups}
          initialGroupIndex={selectedStoryGroupIndex}
          currentUserId={user?.uid}
          onClose={() => setShowStoryViewer(false)}
        />
      )}

      {/* 🔍 شريط البحث */}
      <div className="mb-5 px-1">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="ابحث عن أسرة أو منطقة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border-2 border-sky-200 rounded-xl py-3 pr-10 pl-12 text-gray-800 placeholder:text-gray-400 focus:border-sky-500 focus:outline-none shadow-sm transition"
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition ${
              showFilters || activeFiltersCount > 0
                ? 'bg-sky-500 text-white'
                : 'bg-sky-100 text-sky-600 hover:bg-sky-200'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4" />
            {activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
        
        {/* 🎚️ الفلاتر المتقدمة */}
        {showFilters && (
          <div className="mt-3 bg-white rounded-xl p-4 border border-sky-100 shadow-sm space-y-4">
            {/* الترتيب */}
            <div>
              <label className="text-sm font-semibold text-gray-600 mb-2 block">ترتيب حسب</label>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setSortBy('distance')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    sortBy === 'distance' ? 'bg-sky-500 text-white' : 'bg-sky-50 text-sky-700'
                  }`}
                >
                  <Navigation className="w-3 h-3 inline ml-1" />
                  الأقرب
                </button>
                <button
                  onClick={() => setSortBy('rating')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    sortBy === 'rating' ? 'bg-sky-500 text-white' : 'bg-sky-50 text-sky-700'
                  }`}
                >
                  <Star className="w-3 h-3 inline ml-1" />
                  الأعلى تقييماً
                </button>
                <button
                  onClick={() => setSortBy('orders')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    sortBy === 'orders' ? 'bg-sky-500 text-white' : 'bg-sky-50 text-sky-700'
                  }`}
                >
                  <ShoppingBag className="w-3 h-3 inline ml-1" />
                  الأكثر طلباً
                </button>
              </div>
            </div>

            {/* نوع المطبخ */}
            <div>
              <label className="text-sm font-semibold text-gray-600 mb-2 block">نوع المطبخ</label>
              <div className="flex gap-2 flex-wrap">
                {CUISINE_TYPES.map(cuisine => (
                  <button
                    key={cuisine.value}
                    onClick={() => setSelectedCuisine(cuisine.value)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                      selectedCuisine === cuisine.value ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {cuisine.label}
                  </button>
                ))}
              </div>
            </div>

            {/* التقييم الأدنى */}
            <div>
              <label className="text-sm font-semibold text-gray-600 mb-2 block">
                الحد الأدنى للتقييم: {minRating > 0 ? `${minRating}+ ⭐` : 'الكل'}
              </label>
              <div className="flex gap-2 flex-wrap">
                {[0, 3, 3.5, 4, 4.5].map(rating => (
                  <button
                    key={rating}
                    onClick={() => setMinRating(rating)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1 ${
                      minRating === rating ? 'bg-yellow-500 text-white' : 'bg-yellow-50 text-yellow-700'
                    }`}
                  >
                    {rating === 0 ? 'الكل' : (
                      <>
                        <Star className="w-3 h-3 fill-current" />
                        {rating}+
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* زر إعادة تعيين الفلاتر */}
            {activeFiltersCount > 0 && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSelectedCity('')
                  setSelectedCuisine('')
                  setMinRating(0)
                  setSortBy('distance')
                }}
                className="w-full py-2 bg-red-50 text-red-500 rounded-lg font-medium hover:bg-red-100 transition flex items-center justify-center gap-2"
              >
                <X className="w-4 h-4" />
                إعادة تعيين ({activeFiltersCount})
              </button>
            )}
          </div>
        )}
      </div>

      {/* 🌙 قسم عروض رمضان */}
      {isRamadan() && (
        <div className="mb-8">
          {/* بانر رمضان */}
          <div className="mb-6">
            <RamadanBanner />
          </div>

          {/* عداد الإفطار */}
          <div className="mb-6">
            <IftarCountdown city="الرياض" />
          </div>

          {/* عروض رمضان الخاصة */}
          <div className="bg-gradient-to-r from-purple-900 via-purple-800 to-emerald-900 rounded-3xl p-6 mb-6 relative overflow-hidden">
            {/* زخارف خلفية */}
            <div className="absolute top-2 right-4 text-4xl opacity-30 animate-pulse">🌙</div>
            <div className="absolute bottom-2 left-4 text-3xl opacity-20">✨</div>
            <div className="absolute top-1/2 right-1/4 text-2xl opacity-20">🏮</div>
            
            <div className="relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-4xl">🏝️</span>
                  <div>
                    <h2 className="text-xl font-black text-white">عروض رمضان</h2>
                    <p className="text-purple-200 text-sm">باقات إفطار وسحور مميزة</p>
                  </div>
                </div>
                <div className="bg-amber-400 text-purple-900 text-xs font-bold px-3 py-1.5 rounded-full">
                  🌙 عروض حصرية
                </div>
              </div>
              
              {/* أنواع العروض */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(['iftar_package', 'suhoor_package', 'family_bundle', 'discount'] as RamadanOfferType[]).map(type => {
                  const info = OFFER_TYPE_LABELS[type]
                  return (
                    <Link
                      key={type}
                      to={`/restaurants?offer_type=${type}`}
                      className="bg-white/10 backdrop-blur rounded-xl p-4 text-center hover:bg-white/20 transition-all group"
                    >
                      <span className="text-3xl block mb-2 group-hover:scale-110 transition-transform">{info.emoji}</span>
                      <span className="text-white font-bold text-sm">{info.label}</span>
                    </Link>
                  )
                })}
              </div>
              
              {/* رسالة للأسر */}
              <div className="mt-4 bg-amber-400/20 rounded-xl p-3 flex items-center gap-3">
                <span className="text-2xl">👨‍🍳</span>
                <p className="text-amber-200 text-sm flex-1">
                  هل أنت أسرة منتجة؟ أضف عروضك الرمضانية واستقبل طلبات أكثر!
                </p>
                <Link to="/owner/offers?type=ramadan" className="bg-amber-400 text-purple-900 px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap hover:bg-amber-300 transition">
                  أضف عرضك
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ⭐ المنتجات الأكثر طلبًا اليوم */}
      {topItems.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame className="w-6 h-6 text-orange-500" />
              <h2 className="text-xl font-bold text-sky-700">🔥 الأكثر طلبًا اليوم</h2>
            </div>
            <span className="text-sm text-gray-400">{topItems.length} أصناف</span>
          </div>
          
          <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {topItems.map(item => (
              <Link
                key={item.id}
                to={`/menu?restaurant=${item.ownerId}`}
                className="group bg-white border border-sky-100 rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              >
                {/* صورة المنتج */}
                <div className="relative aspect-square bg-sky-50">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Utensils className="w-10 h-10 text-sky-300" />
                    </div>
                  )}
                  {/* شارة الأكثر طلبًا */}
                  <div className="absolute top-2 right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow flex items-center gap-1">
                    <Flame className="w-3 h-3" />
                    {item.orderCount}+ طلب
                  </div>
                </div>
                
                {/* تفاصيل المنتج */}
                <div className="p-3">
                  <h3 className="font-bold text-sm text-gray-800 line-clamp-1">{item.name}</h3>
                  <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{item.restaurantName}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-bold text-sky-600 text-sm">{item.price} ر.س</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 🎁 قسم العروض الخاصة */}
      {specialOffers.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Gift className="w-6 h-6 text-pink-500" />
              <h2 className="text-xl font-bold text-sky-700">🎁 عروض الأسر</h2>
            </div>
            <span className="text-sm text-gray-400">{specialOffers.length} عرض</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {specialOffers.map(offer => {
              const OfferIcon = offer.offerType === 'percent_discount' ? Percent :
                               offer.offerType === 'fixed_discount' ? Tag :
                               offer.offerType === 'bundle_meal' ? Package : Gift
              const bgColor = offer.offerType === 'percent_discount' ? 'from-amber-500 to-orange-500' :
                             offer.offerType === 'fixed_discount' ? 'from-green-500 to-emerald-500' :
                             offer.offerType === 'bundle_meal' ? 'from-purple-500 to-violet-500' :
                             'from-pink-500 to-rose-500'
              
              return (
                <Link
                  key={offer.id}
                  to={`/menu?restaurant=${offer.ownerId}`}
                  onClick={async () => {
                    // زيادة عداد المشاهدات
                    try {
                      await updateDoc(doc(db, 'offers', offer.id), {
                        viewsCount: increment(1)
                      })
                    } catch {}
                  }}
                  className="group bg-white rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden border border-gray-100"
                >
                  {/* رأس العرض الملون */}
                  <div className={`bg-gradient-to-r ${bgColor} p-4 text-white relative`}>
                    <div className="flex items-center gap-2 mb-1">
                      <OfferIcon className="w-5 h-5" />
                      <span className="text-xs font-medium opacity-90">
                        {offer.offerType === 'percent_discount' && 'خصم نسبة'}
                        {offer.offerType === 'fixed_discount' && 'خصم مبلغ'}
                        {offer.offerType === 'bundle_meal' && 'وجبة خاصة'}
                        {offer.offerType === 'buy_x_get_y' && 'اشترِ واحصل'}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg leading-tight line-clamp-1">{offer.title}</h3>
                    
                    {/* تفاصيل العرض */}
                    <div className="mt-2 text-sm font-bold">
                      {offer.offerType === 'percent_discount' && (
                        <span className="text-2xl">{offer.discountPercent}% خصم</span>
                      )}
                      {offer.offerType === 'fixed_discount' && (
                        <span className="text-2xl">وفّر {offer.discountAmount} ر.س</span>
                      )}
                      {offer.offerType === 'bundle_meal' && (
                        <div>
                          <span className="text-2xl">{offer.bundlePrice} ر.س</span>
                          <span className="text-sm opacity-75 line-through mr-2">{offer.bundleOriginalPrice} ر.س</span>
                        </div>
                      )}
                      {offer.offerType === 'buy_x_get_y' && (
                        <span className="text-xl">اشترِ {offer.buyQuantity} واحصل على {offer.getQuantity} مجاناً</span>
                      )}
                    </div>
                  </div>
                  
                  {/* معلومات الأسرة */}
                  <div className="p-3 flex items-center gap-3">
                    <OptimizedAvatar
                      src={offer.restaurantLogo}
                      alt={offer.restaurantName || 'أسرة'}
                      size="md"
                      fallbackText={offer.restaurantName}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{offer.restaurantName || 'أسرة منتجة'}</p>
                      {offer.description && (
                        <p className="text-xs text-gray-500 line-clamp-1">{offer.description}</p>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* 📢 شريط الإعلانات الممولة */}
      {promotions.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Megaphone className="w-5 h-5 text-purple-500" />
            <span className="font-bold text-purple-600">إعلانات مميزة</span>
          </div>
          
          <div className="relative">
            {/* الإعلان الحالي */}
            <Link
              to={`/menu?restaurant=${promotions[currentPromoIndex]?.ownerId}`}
              onClick={async () => {
                // زيادة عداد المشاهدات
                try {
                  await updateDoc(doc(db, 'promotions', promotions[currentPromoIndex].id), {
                    viewsCount: increment(1)
                  })
                } catch {}
              }}
              className="block bg-gradient-to-r from-purple-900 via-purple-800 to-pink-900 rounded-2xl shadow-xl overflow-hidden"
            >
              {/* شارة الإعلان */}
              <div className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full shadow">
                <Megaphone className="w-3 h-3" />
                إعلان
              </div>

              {/* الوسائط */}
              {promotions[currentPromoIndex]?.mediaUrl && (
                <div className="relative h-48">
                  {promotions[currentPromoIndex].type === 'video' ? (
                    <>
                      <video
                        src={promotions[currentPromoIndex].mediaUrl}
                        className="w-full h-full object-cover"
                        muted
                        loop
                        autoPlay
                        playsInline
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                          <Play className="w-6 h-6 text-white fill-white" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <img
                      src={promotions[currentPromoIndex].mediaUrl}
                      alt={promotions[currentPromoIndex].title}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              )}

              {/* المحتوى */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  {promotions[currentPromoIndex]?.restaurantName && (
                    <span className="text-xs bg-white/20 text-white px-2 py-1 rounded-full">
                      {promotions[currentPromoIndex].restaurantName}
                    </span>
                  )}
                </div>
                {promotions[currentPromoIndex]?.title && (
                  <h3 className="text-lg font-bold text-white">{promotions[currentPromoIndex].title}</h3>
                )}
                {promotions[currentPromoIndex]?.description && (
                  <p className="text-purple-100 text-sm mt-1 line-clamp-2">{promotions[currentPromoIndex].description}</p>
                )}
              </div>
            </Link>

            {/* أزرار التنقل */}
            {promotions.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    setCurrentPromoIndex((prev) => (prev === 0 ? promotions.length - 1 : prev - 1))
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg transition z-10"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-800" />
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    setCurrentPromoIndex((prev) => (prev === promotions.length - 1 ? 0 : prev + 1))
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white/80 hover:bg-white rounded-full shadow-lg transition z-10"
                >
                  <ChevronRight className="w-5 h-5 text-gray-800" />
                </button>
              </>
            )}

            {/* مؤشرات الصفحات */}
            {promotions.length > 1 && (
              <div className="flex justify-center gap-2 mt-3">
                {promotions.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentPromoIndex(idx)}
                    className={`w-2 h-2 rounded-full transition ${
                      idx === currentPromoIndex ? 'bg-purple-500 w-4' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* فلتر المدن */}
      {availableCities.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
          <div className="flex items-center gap-2 text-sky-600">
            <Filter className="w-5 h-5" />
            <span className="font-semibold">المدينة:</span>
          </div>
          <button
            onClick={() => setSelectedCity('')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              !selectedCity
                ? 'bg-sky-500 text-white shadow-lg'
                : 'bg-sky-100 text-sky-700 hover:bg-sky-200'
            }`}
          >
            الكل
          </button>
          {availableCities.map(city => (
            <button
              key={city}
              onClick={() => setSelectedCity(city)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1 ${
                selectedCity === city
                  ? 'bg-sky-500 text-white shadow-lg'
                  : 'bg-sky-100 text-sky-700 hover:bg-sky-200'
              }`}
            >
              <MapPin className="w-4 h-4" />
              {city}
            </button>
          ))}
          {selectedCity && (
            <button
              onClick={() => setSelectedCity('')}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              title="إزالة الفلتر"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {filteredRestaurants.length === 0 && (
        <div className="text-center py-10">
          <div className="w-20 h-20 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-10 h-10 text-sky-500" />
          </div>
          {userLocation ? (
            <>
              <p className="text-gray-600 text-lg font-semibold">😔 لا توجد مطاعم قريبة منك</p>
              <p className="text-gray-400 text-sm mt-2">نعرض المطاعم ضمن {MAX_DELIVERY_DISTANCE} كم فقط</p>
            </>
          ) : (
            <>
              <p className="text-gray-600 text-lg font-semibold">
                {selectedCity ? `😔 لا توجد مطاعم في ${selectedCity}` : '😔 لا توجد مطاعم حالياً'}
              </p>
            </>
          )}
        </div>
      )}

      {/* رسالة توضيحية للمسافة */}
      {userLocation && filteredRestaurants.length > 0 && (role === 'customer' || role === 'courier') && (
        <div className="mb-6 bg-sky-50 border border-sky-200 rounded-xl p-4 flex items-center gap-3">
          <Navigation className="w-6 h-6 text-sky-500 flex-shrink-0" />
          <div>
            <p className="text-sky-700 font-semibold">نعرض لك المطاعم القريبة فقط</p>
            <p className="text-sky-600 text-sm">المسافة القصوى للتوصيل: {MAX_DELIVERY_DISTANCE} كم</p>
          </div>
        </div>
      )}

      {/* === الأسر المميزة (Premium) - عرض مميز بمربعات === */}
      {filteredRestaurants.filter(r => r.packageType === 'premium').length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Crown className="w-6 h-6 text-amber-500" />
              <h2 className="text-xl font-bold text-amber-400">⭐ الأسر المميزة</h2>
            </div>
            <span className="text-sm text-gray-400">{filteredRestaurants.filter(r => r.packageType === 'premium').length} أسرة</span>
          </div>
          
          <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filteredRestaurants.filter(r => r.packageType === 'premium').map(r => (
              <Link
                key={r.id}
                to={`/menu?restaurant=${r.id}${refSource ? `&ref=${refSource}` : ''}`}
                onClick={() => logVisit(r.id, user?.uid, refSource || 'direct')}
                className="group bg-[#1E293B] border border-amber-500/30 rounded-[16px] shadow-lg shadow-amber-500/10 hover:shadow-xl hover:shadow-amber-500/20 hover:-translate-y-2 transform transition-all duration-300 p-3 sm:p-4 flex flex-col items-center text-center relative overflow-hidden active:scale-[0.98]"
              >
                {/* خلفية متوهجة */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                
                {/* شارة مميزة */}
                <div className="absolute top-2 right-2">
                  <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    مميزة
                  </div>
                </div>

                {/* شارة المسافة */}
                {r.distance !== undefined && (
                  <div className="absolute top-2 left-2 bg-sky-500/90 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                    <Navigation className="w-2.5 h-2.5" />
                    {r.distance < 1 ? `${Math.round(r.distance * 1000)}م` : `${r.distance.toFixed(1)}كم`}
                  </div>
                )}
                
                {/* الشعار في دائرة */}
                <div className="relative mt-6 mb-3">
                  {r.logoUrl ? (
                    <img
                      src={r.logoUrl}
                      alt={r.name}
                      className="w-20 h-20 object-cover rounded-full border-4 border-amber-400 shadow-lg group-hover:scale-110 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-20 h-20 flex items-center justify-center rounded-full bg-slate-700 border-4 border-amber-400 shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Utensils className="w-8 h-8 text-amber-400" />
                    </div>
                  )}
                  {/* علامة الموثق بجانب الشعار */}
                  {(r.isVerified || r.licenseStatus === 'approved') && (
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-sky-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
                
                {/* اسم الأسرة */}
                <h3 className="font-bold text-sm text-white line-clamp-1">{r.name}</h3>
                
                {/* المدينة */}
                {r.city && (
                  <p className="text-xs text-gray-400 flex items-center gap-0.5 mt-1 mb-2">
                    <MapPin className="w-3 h-3" />
                    {r.city}
                  </p>
                )}

                {/* شارة التوثيق - تظهر فقط للأسر التي لديها تراخيص */}
                {(r.isVerified || r.licenseStatus === 'approved') ? (
                  <div className="bg-sky-500/20 border border-sky-500/50 text-sky-400 text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1 mb-2">
                    <CheckCircle className="w-3 h-3" />
                    ✔ موثقة
                  </div>
                ) : r.licenseStatus === 'pending' ? (
                  <div className="bg-amber-500/20 border border-amber-500/50 text-amber-400 text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1 mb-2">
                    <Clock className="w-3 h-3" />
                    ⏳ قيد المراجعة
                  </div>
                ) : null}

                {/* إحصائيات سريعة */}
                <div className="flex items-center justify-center gap-3 text-[10px] text-gray-400">
                  {r.averageRating !== undefined && r.averageRating > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      {r.averageRating.toFixed(1)}
                    </span>
                  )}
                  {r.totalOrders !== undefined && r.totalOrders > 0 && (
                    <span className="flex items-center gap-0.5">
                      <ShoppingBag className="w-3 h-3" />
                      {r.totalOrders}
                    </span>
                  )}
                </div>

                {/* شارات التصنيف */}
                <div className="flex gap-1 mt-2">
                  {r.sellerTier === 'gold' && (
                    <span className="bg-gradient-to-r from-amber-400 to-yellow-400 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">👑 Gold</span>
                  )}
                  {r.sellerTier === 'silver' && (
                    <span className="bg-gradient-to-r from-gray-400 to-gray-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">🥈 Silver</span>
                  )}
                </div>

                {/* شارات التوصيل والاستلام */}
                <div className="flex flex-wrap gap-1 mt-1.5 justify-center">
                  {(r.allowDelivery !== false) && (
                    <span className="inline-flex items-center gap-0.5 bg-sky-500/20 text-sky-400 text-[9px] font-medium px-1.5 py-0.5 rounded-full">
                      <Truck className="w-2.5 h-2.5" />
                      توصيل
                    </span>
                  )}
                  {r.allowPickup && (
                    <span className="inline-flex items-center gap-0.5 bg-green-500/20 text-green-400 text-[9px] font-medium px-1.5 py-0.5 rounded-full">
                      <Store className="w-2.5 h-2.5" />
                      استلام
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* === باقي الأسر (المجانية) - العرض العادي === */}
      {filteredRestaurants.filter(r => r.packageType !== 'premium').length > 0 && (
        <div>
          {filteredRestaurants.filter(r => r.packageType === 'premium').length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <Utensils className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-bold text-gray-300">جميع الأسر</h2>
            </div>
          )}
          
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-6">
            {filteredRestaurants.filter(r => r.packageType !== 'premium').map(r => (
              <Link
                key={r.id}
                to={`/menu?restaurant=${r.id}${refSource ? `&ref=${refSource}` : ''}`}
                onClick={() => logVisit(r.id, user?.uid, refSource || 'direct')}
                className="group bg-[#1E293B] rounded-[16px] shadow-lg shadow-black/20 hover:shadow-xl hover:shadow-black/30 hover:-translate-y-1 transform transition-all duration-300 p-4 sm:p-6 flex flex-col items-center text-center relative overflow-hidden active:scale-[0.98]"
              >
                {/* شارة المسافة */}
                {r.distance !== undefined && (
                  <div className="absolute top-3 left-3 bg-sky-500/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <Navigation className="w-3 h-3" />
                    {r.distance < 1 ? `${Math.round(r.distance * 1000)} م` : `${r.distance.toFixed(1)} كم`}
                  </div>
                )}

                {/* شارات التصنيف في الأعلى */}
                <div className="absolute top-3 right-3 flex flex-col gap-1.5">
                  {r.sellerTier === 'gold' && (
                    <div className="bg-gradient-to-r from-amber-400 to-yellow-500 text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg">
                      <Crown className="w-3 h-3" />
                      Gold
                    </div>
                  )}
                  {r.sellerTier === 'silver' && (
                    <div className="bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-lg">
                      <Medal className="w-3 h-3" />
                      Silver
                    </div>
                  )}
                </div>
                
                {/* الشعار في دائرة */}
                <div className="relative mt-2 mb-4">
                  {r.logoUrl ? (
                    <img
                      src={r.logoUrl}
                      alt={r.name}
                      className={`w-24 h-24 object-cover rounded-full border-4 shadow-lg group-hover:scale-105 transition-transform duration-300 ${
                        r.sellerTier === 'gold' 
                          ? 'border-amber-400 ring-4 ring-amber-400/30' 
                          : r.sellerTier === 'silver'
                          ? 'border-gray-300 ring-4 ring-gray-300/30'
                          : 'border-slate-500'
                      }`}
                    />
                  ) : (
                    <div className={`w-24 h-24 flex items-center justify-center rounded-full text-4xl border-4 shadow-lg group-hover:scale-105 transition-transform duration-300 ${
                      r.sellerTier === 'gold' 
                        ? 'bg-amber-900/50 border-amber-400' 
                        : r.sellerTier === 'silver'
                        ? 'bg-gray-700 border-gray-300'
                        : 'bg-slate-700 border-slate-500'
                    }`}>
                      🍴
                    </div>
                  )}
                  {/* علامة الموثق بجانب الشعار */}
                  {(r.isVerified || r.licenseStatus === 'approved') && (
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-sky-500 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>
                
                {/* اسم الأسرة */}
                <h3 className="font-bold text-xl text-white mb-1">{r.name}</h3>
                
                {/* الموقع */}
                {r.city && (
                  <p className="text-sm text-gray-400 flex items-center justify-center gap-1 mb-3">
                    <MapPin className="w-4 h-4" />
                    {r.city}
                  </p>
                )}

                {/* شارة التوثيق - تظهر فقط للأسر التي لديها تراخيص */}
                {(r.isVerified || r.licenseStatus === 'approved') ? (
                  <div className="bg-sky-500/20 border border-sky-500/50 text-sky-400 text-sm font-bold px-4 py-1.5 rounded-full flex items-center gap-2 mb-3">
                    <CheckCircle className="w-4 h-4" />
                    ✔ موثقة
                  </div>
                ) : r.licenseStatus === 'pending' ? (
                  <div className="bg-amber-500/20 border border-amber-500/50 text-amber-400 text-sm font-bold px-4 py-1.5 rounded-full flex items-center gap-2 mb-3">
                    <Clock className="w-4 h-4" />
                    ⏳ قيد المراجعة
                  </div>
                ) : null}
                
                {/* شارات التوصيل والاستلام */}
                <div className="flex items-center justify-center gap-2">
                  {(r.allowDelivery === undefined || r.allowDelivery === true) && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-sky-500/20 text-sky-400 text-xs font-semibold rounded-full">
                      <Truck className="w-3 h-3" />
                      توصيل
                    </span>
                  )}
                  {r.allowPickup && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded-full">
                      <Store className="w-3 h-3" />
                      استلام
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
