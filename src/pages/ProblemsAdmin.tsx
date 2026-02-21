// src/pages/ProblemsAdmin.tsx
// لوحة تحكم لمراقبة المشاكل والشكاوى
import React, { useState, useEffect } from 'react'
import { 
  collection, query, orderBy, onSnapshot, getDocs, where
} from 'firebase/firestore'
import { db } from '@/firebase'
import { 
  AlertTriangle, Store, Truck, User, Star, TrendingDown,
  Loader2, ChevronRight, Filter, RefreshCw, BarChart3
} from 'lucide-react'

interface RestaurantStats {
  id: string
  name: string
  totalOrders: number
  complaintsCount: number
  avgRating: number
  lowRatings: number
}

interface CourierStats {
  id: string
  name: string
  totalDeliveries: number
  complaintsCount: number
  avgRating: number
  lowRatings: number
}

interface CustomerStats {
  id: string
  name: string
  totalOrders: number
  complaintsFiledCount: number
  avgRatingGiven: number
}

export const ProblemsAdmin: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [restaurants, setRestaurants] = useState<RestaurantStats[]>([])
  const [couriers, setCouriers] = useState<CourierStats[]>([])
  const [customers, setCustomers] = useState<CustomerStats[]>([])
  const [activeTab, setActiveTab] = useState<'restaurants' | 'couriers' | 'customers'>('restaurants')
  const [timeFilter, setTimeFilter] = useState<'week' | 'month' | 'all'>('month')

  useEffect(() => {
    loadStats()
  }, [timeFilter])

  const loadStats = async () => {
    setLoading(true)
    
    try {
      // جلب جميع الطلبات
      const ordersSnap = await getDocs(collection(db, 'orders'))
      const orders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }))

      // تصفية حسب الوقت
      const now = new Date()
      const filteredOrders = orders.filter((o: any) => {
        if (timeFilter === 'all') return true
        const orderDate = o.createdAt?.toDate?.() || new Date(0)
        const diffDays = (now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24)
        if (timeFilter === 'week') return diffDays <= 7
        if (timeFilter === 'month') return diffDays <= 30
        return true
      })

      // إحصائيات الأسر
      const restaurantMap = new Map<string, RestaurantStats>()
      filteredOrders.forEach((o: any) => {
        const rId = o.restaurantId
        if (!rId) return
        
        if (!restaurantMap.has(rId)) {
          restaurantMap.set(rId, {
            id: rId,
            name: o.restaurantName || 'غير معروف',
            totalOrders: 0,
            complaintsCount: 0,
            avgRating: 0,
            lowRatings: 0
          })
        }
        
        const stats = restaurantMap.get(rId)!
        stats.totalOrders++
        
        // حساب التقييمات
        const rating = o.ratings?.customerToRestaurant?.stars
        if (rating) {
          if (rating <= 2) stats.lowRatings++
        }
      })

      // جلب الشكاوى
      const complaintsSnap = await getDocs(collection(db, 'supportChats'))
      const complaints = complaintsSnap.docs.map(d => d.data())

      // حساب عدد الشكاوى لكل أسرة
      complaints.forEach((c: any) => {
        // يمكن ربط الشكوى بالأسرة عبر الطلب
      })

      // ترتيب الأسر حسب المشاكل
      const sortedRestaurants = Array.from(restaurantMap.values())
        .sort((a, b) => b.lowRatings - a.lowRatings)

      setRestaurants(sortedRestaurants)

      // إحصائيات المندوبين
      const courierMap = new Map<string, CourierStats>()
      filteredOrders.forEach((o: any) => {
        const cId = o.courierId
        if (!cId) return
        
        if (!courierMap.has(cId)) {
          courierMap.set(cId, {
            id: cId,
            name: o.courierName || 'مندوب',
            totalDeliveries: 0,
            complaintsCount: 0,
            avgRating: 0,
            lowRatings: 0
          })
        }
        
        const stats = courierMap.get(cId)!
        stats.totalDeliveries++
        
        const rating = o.ratings?.customerToCourier?.stars
        if (rating) {
          if (rating <= 2) stats.lowRatings++
        }
      })

      const sortedCouriers = Array.from(courierMap.values())
        .sort((a, b) => b.lowRatings - a.lowRatings)

      setCouriers(sortedCouriers)

      // إحصائيات العملاء
      const customerMap = new Map<string, CustomerStats>()
      filteredOrders.forEach((o: any) => {
        const cId = o.customerId
        if (!cId) return
        
        if (!customerMap.has(cId)) {
          customerMap.set(cId, {
            id: cId,
            name: o.customerName || 'عميل',
            totalOrders: 0,
            complaintsFiledCount: 0,
            avgRatingGiven: 0
          })
        }
        
        const stats = customerMap.get(cId)!
        stats.totalOrders++
      })

      // حساب عدد الشكاوى المرفوعة من كل عميل
      complaints.forEach((c: any) => {
        const cId = c.userId
        if (customerMap.has(cId)) {
          customerMap.get(cId)!.complaintsFiledCount++
        }
      })

      const sortedCustomers = Array.from(customerMap.values())
        .sort((a, b) => b.complaintsFiledCount - a.complaintsFiledCount)

      setCustomers(sortedCustomers)

    } catch (error) {
      console.error('Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-red-500" />
          مركز مراقبة المشاكل
        </h1>
        <button
          onClick={loadStats}
          className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition"
        >
          <RefreshCw className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* ملخص سريع */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Store className="w-6 h-6" />
            <span className="font-bold">أسر بمشاكل</span>
          </div>
          <p className="text-3xl font-bold">{restaurants.filter(r => r.lowRatings > 0).length}</p>
          <p className="text-white/70 text-sm">من أصل {restaurants.length} أسرة</p>
        </div>
        
        <div className="bg-gradient-to-br from-amber-500 to-yellow-500 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-3 mb-2">
            <Truck className="w-6 h-6" />
            <span className="font-bold">مندوبين بمشاكل</span>
          </div>
          <p className="text-3xl font-bold">{couriers.filter(c => c.lowRatings > 0).length}</p>
          <p className="text-white/70 text-sm">من أصل {couriers.length} مندوب</p>
        </div>
        
        <div className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl p-5 text-white">
          <div className="flex items-center gap-3 mb-2">
            <User className="w-6 h-6" />
            <span className="font-bold">عملاء كثيري الشكاوى</span>
          </div>
          <p className="text-3xl font-bold">{customers.filter(c => c.complaintsFiledCount > 2).length}</p>
          <p className="text-white/70 text-sm">أكثر من شكويتين</p>
        </div>
      </div>

      {/* فلتر الوقت */}
      <div className="flex gap-2 mb-6">
        {(['week', 'month', 'all'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTimeFilter(t)}
            className={`px-4 py-2 rounded-xl font-medium transition ${
              timeFilter === t 
                ? 'bg-sky-500 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t === 'week' ? 'آخر أسبوع' : t === 'month' ? 'آخر شهر' : 'الكل'}
          </button>
        ))}
      </div>

      {/* التبويبات */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('restaurants')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition ${
            activeTab === 'restaurants' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          <Store className="w-4 h-4" />
          الأسر المنتجة
        </button>
        <button
          onClick={() => setActiveTab('couriers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition ${
            activeTab === 'couriers' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          <Truck className="w-4 h-4" />
          المندوبين
        </button>
        <button
          onClick={() => setActiveTab('customers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition ${
            activeTab === 'customers' ? 'bg-purple-500 text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          <User className="w-4 h-4" />
          العملاء
        </button>
      </div>

      {/* قائمة الأسر */}
      {activeTab === 'restaurants' && (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-4 bg-red-50 border-b border-red-100">
            <h2 className="font-bold text-red-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              الأسر الأكثر مشاكل (تقييمات منخفضة)
            </h2>
          </div>
          
          {restaurants.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              لا توجد بيانات
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {restaurants.slice(0, 20).map((r, i) => (
                <div key={r.id} className={`p-4 flex items-center justify-between ${r.lowRatings > 0 ? 'bg-red-50' : ''}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      r.lowRatings > 2 ? 'bg-red-500 text-white' : 
                      r.lowRatings > 0 ? 'bg-amber-500 text-white' : 
                      'bg-gray-200 text-gray-600'
                    }`}>
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{r.name}</p>
                      <p className="text-sm text-gray-500">{r.totalOrders} طلب</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {r.lowRatings > 0 && (
                      <div className="flex items-center gap-1 text-red-600">
                        <TrendingDown className="w-4 h-4" />
                        <span className="font-bold">{r.lowRatings}</span>
                        <span className="text-xs">تقييم سيء</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* قائمة المندوبين */}
      {activeTab === 'couriers' && (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-4 bg-amber-50 border-b border-amber-100">
            <h2 className="font-bold text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              المندوبين الأكثر مشاكل
            </h2>
          </div>
          
          {couriers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              لا توجد بيانات
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {couriers.slice(0, 20).map((c, i) => (
                <div key={c.id} className={`p-4 flex items-center justify-between ${c.lowRatings > 0 ? 'bg-amber-50' : ''}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      c.lowRatings > 2 ? 'bg-red-500 text-white' : 
                      c.lowRatings > 0 ? 'bg-amber-500 text-white' : 
                      'bg-gray-200 text-gray-600'
                    }`}>
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{c.name}</p>
                      <p className="text-sm text-gray-500">{c.totalDeliveries} توصيل</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {c.lowRatings > 0 && (
                      <div className="flex items-center gap-1 text-amber-600">
                        <TrendingDown className="w-4 h-4" />
                        <span className="font-bold">{c.lowRatings}</span>
                        <span className="text-xs">تقييم سيء</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* قائمة العملاء */}
      {activeTab === 'customers' && (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="p-4 bg-purple-50 border-b border-purple-100">
            <h2 className="font-bold text-purple-800 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              العملاء كثيري الشكاوى
            </h2>
          </div>
          
          {customers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              لا توجد بيانات
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {customers.filter(c => c.complaintsFiledCount > 0).slice(0, 20).map((c, i) => (
                <div key={c.id} className={`p-4 flex items-center justify-between ${c.complaintsFiledCount > 2 ? 'bg-purple-50' : ''}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      c.complaintsFiledCount > 3 ? 'bg-red-500 text-white' : 
                      c.complaintsFiledCount > 1 ? 'bg-amber-500 text-white' : 
                      'bg-gray-200 text-gray-600'
                    }`}>
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{c.name}</p>
                      <p className="text-sm text-gray-500">{c.totalOrders} طلب</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-purple-600">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="font-bold">{c.complaintsFiledCount}</span>
                      <span className="text-xs">شكوى</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* تنبيه */}
      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
        <p className="text-amber-800">
          💡 <strong>نصيحة:</strong> راقب هذه الصفحة بشكل دوري لاكتشاف المشاكل مبكراً
        </p>
      </div>
    </div>
  )
}

export default ProblemsAdmin
