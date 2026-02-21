// src/pages/SupervisorDashboard.tsx
// لوحة تحكم المشرفات - إدارة المطاعم والطلبات والعمولات
import React, { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/auth'
import { db } from '@/firebase'
import { collection, query, where, onSnapshot, getDocs, doc, updateDoc, getDoc, orderBy, limit, Timestamp } from 'firebase/firestore'
import { useToast } from '@/components/ui/Toast'
import { 
  LayoutDashboard, 
  Store, 
  ShoppingBag, 
  FileText, 
  Wallet, 
  TrendingUp, 
  Users, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Truck, 
  DollarSign,
  Calendar,
  BarChart3,
  Star,
  ChevronDown,
  ChevronUp,
  Eye,
  RefreshCw,
  Download,
  Filter,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Coins
} from 'lucide-react'

// ====== الثوابت ======
const COMMISSION_PER_ORDER = 1 // ريال واحد لكل طلب مكتمل

// ====== الأنواع ======
interface Restaurant {
  id: string
  name: string
  phone?: string
  city?: string
  logoUrl?: string
  isOpen?: boolean
  createdAt?: Date
  ownerId?: string
  supervisorId?: string
}

interface Order {
  id: string
  restaurantId: string
  restaurantName?: string
  customerId: string
  customerName?: string
  status: string
  total: number
  createdAt: Date
  updatedAt?: Date
  items?: any[]
}

interface SupervisorWallet {
  balance: number
  totalEarnings: number
  withdrawals: WithdrawalRecord[]
}

interface WithdrawalRecord {
  id: string
  amount: number
  status: 'pending' | 'approved' | 'rejected'
  requestedAt: Date
  processedAt?: Date
  bankInfo?: {
    bankName: string
    accountNumber: string
    accountName: string
  }
}

interface DailyStats {
  date: string
  ordersCount: number
  earnings: number
  completedOrders: number
}

// ====== المكون الرئيسي ======
export const SupervisorDashboard: React.FC = () => {
  const { user } = useAuth()
  const toast = useToast()
  
  // ====== الحالات ======
  const [activeTab, setActiveTab] = useState<'dashboard' | 'restaurants' | 'orders' | 'reports'>('dashboard')
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [wallet, setWallet] = useState<SupervisorWallet>({ balance: 0, totalEarnings: 0, withdrawals: [] })
  const [loading, setLoading] = useState(true)
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)

  // ====== جلب البيانات ======
  useEffect(() => {
    if (!user?.uid) return

    setLoading(true)

    // جلب المطاعم التابعة للمشرفة
    const restaurantsQuery = query(
      collection(db, 'restaurants'),
      where('supervisorId', '==', user.uid)
    )

    const unsubRestaurants = onSnapshot(restaurantsQuery, (snap) => {
      const data = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() || new Date()
      })) as Restaurant[]
      setRestaurants(data)
    })

    // جلب محفظة المشرفة
    const walletRef = doc(db, 'supervisorWallets', user.uid)
    const unsubWallet = onSnapshot(walletRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        setWallet({
          balance: data.balance || 0,
          totalEarnings: data.totalEarnings || 0,
          withdrawals: (data.withdrawals || []).map((w: any) => ({
            ...w,
            requestedAt: w.requestedAt?.toDate?.() || new Date(),
            processedAt: w.processedAt?.toDate?.()
          }))
        })
      }
    })

    setLoading(false)

    return () => {
      unsubRestaurants()
      unsubWallet()
    }
  }, [user?.uid])

  // جلب الطلبات للمطاعم التابعة
  useEffect(() => {
    if (restaurants.length === 0) {
      setOrders([])
      return
    }

    const restaurantIds = restaurants.map(r => r.id)
    
    // نظراً لقيود Firestore، نجلب الطلبات بشكل منفصل لكل مطعم
    const unsubscribers: (() => void)[] = []
    
    restaurantIds.forEach(restId => {
      const ordersQuery = query(
        collection(db, 'orders'),
        where('restaurantId', '==', restId),
        orderBy('createdAt', 'desc'),
        limit(100)
      )
      
      const unsub = onSnapshot(ordersQuery, (snap) => {
        const newOrders = snap.docs.map(d => ({
          id: d.id,
          ...d.data(),
          createdAt: d.data().createdAt?.toDate?.() || new Date(),
          updatedAt: d.data().updatedAt?.toDate?.()
        })) as Order[]
        
        setOrders(prev => {
          // إزالة الطلبات القديمة لهذا المطعم وإضافة الجديدة
          const filtered = prev.filter(o => o.restaurantId !== restId)
          return [...filtered, ...newOrders].sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        })
      })
      
      unsubscribers.push(unsub)
    })

    return () => {
      unsubscribers.forEach(unsub => unsub())
    }
  }, [restaurants])

  // ====== الحسابات ======
  const stats = useMemo(() => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    const completedOrders = orders.filter(o => o.status === 'delivered')
    const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.status))
    const todayOrders = orders.filter(o => new Date(o.createdAt) >= today)
    const weekOrders = orders.filter(o => new Date(o.createdAt) >= weekAgo)
    const monthOrders = orders.filter(o => new Date(o.createdAt) >= monthAgo)

    const todayCompleted = todayOrders.filter(o => o.status === 'delivered').length
    const weekCompleted = weekOrders.filter(o => o.status === 'delivered').length
    const monthCompleted = monthOrders.filter(o => o.status === 'delivered').length

    return {
      totalRestaurants: restaurants.length,
      totalOrders: orders.length,
      completedOrders: completedOrders.length,
      activeOrders: activeOrders.length,
      cancelledOrders: orders.filter(o => o.status === 'cancelled').length,
      todayOrders: todayOrders.length,
      todayCompleted,
      todayEarnings: todayCompleted * COMMISSION_PER_ORDER,
      weekCompleted,
      weekEarnings: weekCompleted * COMMISSION_PER_ORDER,
      monthCompleted,
      monthEarnings: monthCompleted * COMMISSION_PER_ORDER,
      totalRevenue: completedOrders.reduce((sum, o) => sum + (o.total || 0), 0),
      totalEarnings: completedOrders.length * COMMISSION_PER_ORDER,
    }
  }, [orders, restaurants])

  // فلترة الطلبات
  const filteredOrders = useMemo(() => {
    let filtered = [...orders]

    // فلتر الحالة
    if (orderStatusFilter !== 'all') {
      filtered = filtered.filter(o => o.status === orderStatusFilter)
    }

    // فلتر التاريخ
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    if (dateFilter === 'today') {
      filtered = filtered.filter(o => new Date(o.createdAt) >= today)
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      filtered = filtered.filter(o => new Date(o.createdAt) >= weekAgo)
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
      filtered = filtered.filter(o => new Date(o.createdAt) >= monthAgo)
    }

    // البحث
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(o => 
        o.id.toLowerCase().includes(q) ||
        o.restaurantName?.toLowerCase().includes(q) ||
        o.customerName?.toLowerCase().includes(q)
      )
    }

    return filtered
  }, [orders, orderStatusFilter, dateFilter, searchQuery])

  // ====== تغيير حالة الطلب ======
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        updatedAt: new Date()
      })
      
      // إذا كان الطلب مكتمل، نضيف العمولة للمشرفة
      if (newStatus === 'delivered' && user?.uid) {
        const walletRef = doc(db, 'supervisorWallets', user.uid)
        const walletSnap = await getDoc(walletRef)
        const currentBalance = walletSnap.exists() ? (walletSnap.data().balance || 0) : 0
        const currentEarnings = walletSnap.exists() ? (walletSnap.data().totalEarnings || 0) : 0
        
        await updateDoc(walletRef, {
          balance: currentBalance + COMMISSION_PER_ORDER,
          totalEarnings: currentEarnings + COMMISSION_PER_ORDER,
          lastUpdated: new Date()
        })
      }
      
      toast.success('تم تحديث حالة الطلب')
    } catch (err) {
      toast.error('فشل تحديث حالة الطلب')
    }
  }

  // ====== تنسيق التاريخ ======
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  // ====== حالة الطلب ======
  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      accepted: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      preparing: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
      ready: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      out_for_delivery: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
      delivered: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
    }
    const labels: Record<string, string> = {
      pending: 'معلق',
      accepted: 'مقبول',
      preparing: 'قيد التحضير',
      ready: 'جاهز',
      out_for_delivery: 'قيد التوصيل',
      delivered: 'مكتمل',
      cancelled: 'ملغى',
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status] || styles.pending}`}>
        {labels[status] || status}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-amber-400 text-xl">جارٍ التحميل...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white" dir="rtl">
      {/* الهيدر - محسّن للجوال */}
      <header className="bg-slate-800/50 backdrop-blur-xl border-b border-amber-500/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          {/* الصف الأول: العنوان */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                <LayoutDashboard className="w-5 h-5 sm:w-6 sm:h-6 text-slate-900" />
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-bold bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">
                  لوحة المشرفة
                </h1>
                <p className="text-[10px] sm:text-xs text-slate-400 hidden sm:block">إدارة المطاعم والطلبات</p>
              </div>
            </div>
            
            {/* الرصيد - مصغّر على الجوال */}
            <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/10 border border-amber-500/30 rounded-xl sm:rounded-2xl px-2 sm:px-4 py-1.5 sm:py-2">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                <div className="text-right">
                  <div className="text-[9px] sm:text-xs text-amber-300/70 hidden sm:block">رصيدك</div>
                  <div className="text-sm sm:text-lg font-bold text-amber-400">{wallet.balance.toFixed(0)} <span className="text-[10px] sm:text-sm">ر.س</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* التبويبات - محسّنة للجوال */}
      <nav className="bg-slate-800/30 border-b border-slate-700/50 sticky top-[52px] sm:top-[68px] z-40">
        <div className="max-w-7xl mx-auto px-2 sm:px-4">
          <div className="flex gap-1 overflow-x-auto py-2 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
            {[
              { id: 'dashboard', label: 'الرئيسية', icon: <LayoutDashboard className="w-4 h-4" /> },
              { id: 'restaurants', label: 'المطاعم', icon: <Store className="w-4 h-4" /> },
              { id: 'orders', label: 'الطلبات', icon: <ShoppingBag className="w-4 h-4" /> },
              { id: 'reports', label: 'التقارير', icon: <BarChart3 className="w-4 h-4" /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-900 shadow-lg shadow-amber-500/20'
                    : 'text-slate-400 hover:text-amber-400 hover:bg-slate-700/50'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* المحتوى */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-20">
        {/* ====== الرئيسية ====== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4 sm:space-y-6">
            {/* معلومات العمولة */}
            <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/30 rounded-xl sm:rounded-2xl p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <Coins className="w-6 h-6 sm:w-8 sm:h-8 text-amber-400 flex-shrink-0" />
                <div>
                  <div className="text-sm sm:text-base font-bold text-amber-400">عمولتك: {COMMISSION_PER_ORDER} ريال / طلب</div>
                  <div className="text-xs sm:text-sm text-slate-400">تُضاف تلقائياً عند اكتمال الطلب</div>
                </div>
              </div>
            </div>

            {/* بطاقات الإحصائيات - محسّنة للجوال */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              {/* الرصيد الحالي */}
              <div className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 rounded-xl sm:rounded-2xl p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-1 sm:mb-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-amber-500/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                  </div>
                  <span className="text-xs sm:text-sm text-slate-400">الرصيد</span>
                </div>
                <div className="text-lg sm:text-2xl font-bold text-amber-400">{wallet.balance.toFixed(0)} <span className="text-xs sm:text-sm">ر.س</span></div>
              </div>

              {/* إجمالي الأرباح */}
              <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-xl sm:rounded-2xl p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-1 sm:mb-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-500/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                  </div>
                  <span className="text-xs sm:text-sm text-slate-400">الأرباح</span>
                </div>
                <div className="text-lg sm:text-2xl font-bold text-emerald-400">{wallet.totalEarnings.toFixed(0)} <span className="text-xs sm:text-sm">ر.س</span></div>
              </div>

              {/* الطلبات المكتملة */}
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 rounded-xl sm:rounded-2xl p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-1 sm:mb-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                  </div>
                  <span className="text-xs sm:text-sm text-slate-400">مكتملة</span>
                </div>
                <div className="text-lg sm:text-2xl font-bold text-blue-400">{stats.completedOrders}</div>
              </div>

              {/* الطلبات النشطة */}
              <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 rounded-xl sm:rounded-2xl p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-1 sm:mb-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-500/20 rounded-lg sm:rounded-xl flex items-center justify-center">
                    <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                  </div>
                  <span className="text-xs sm:text-sm text-slate-400">نشطة</span>
                </div>
                <div className="text-lg sm:text-2xl font-bold text-purple-400">{stats.activeOrders}</div>
              </div>
            </div>

            {/* إحصائيات اليوم/الأسبوع/الشهر */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl sm:rounded-2xl p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <span className="text-sm text-slate-400 font-medium">📅 اليوم</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-center flex-1">
                    <div className="text-lg sm:text-xl font-bold">{stats.todayOrders}</div>
                    <div className="text-[10px] sm:text-xs text-slate-500">طلب</div>
                  </div>
                  <div className="w-px h-8 bg-slate-700"></div>
                  <div className="text-center flex-1">
                    <div className="text-lg sm:text-xl font-bold text-emerald-400">{stats.todayCompleted}</div>
                    <div className="text-[10px] sm:text-xs text-slate-500">مكتمل</div>
                  </div>
                  <div className="w-px h-8 bg-slate-700"></div>
                  <div className="text-center flex-1">
                    <div className="text-lg sm:text-xl font-bold text-amber-400">{stats.todayEarnings}</div>
                    <div className="text-[10px] sm:text-xs text-slate-500">ر.س</div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl sm:rounded-2xl p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <span className="text-sm text-slate-400 font-medium">📈 الأسبوع</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-center flex-1">
                    <div className="text-lg sm:text-xl font-bold text-emerald-400">{stats.weekCompleted}</div>
                    <div className="text-[10px] sm:text-xs text-slate-500">مكتمل</div>
                  </div>
                  <div className="w-px h-8 bg-slate-700"></div>
                  <div className="text-center flex-1">
                    <div className="text-lg sm:text-xl font-bold text-amber-400">{stats.weekEarnings}</div>
                    <div className="text-[10px] sm:text-xs text-slate-500">ر.س</div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl sm:rounded-2xl p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <span className="text-sm text-slate-400 font-medium">🌟 الشهر</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-center flex-1">
                    <div className="text-lg sm:text-xl font-bold text-emerald-400">{stats.monthCompleted}</div>
                    <div className="text-[10px] sm:text-xs text-slate-500">مكتمل</div>
                  </div>
                  <div className="w-px h-8 bg-slate-700"></div>
                  <div className="text-center flex-1">
                    <div className="text-lg sm:text-xl font-bold text-amber-400">{stats.monthEarnings}</div>
                    <div className="text-[10px] sm:text-xs text-slate-500">ر.س</div>
                  </div>
                </div>
              </div>
            </div>

            {/* سجل عمليات السحب */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-700/50">
                <h3 className="font-bold flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-amber-400" />
                  سجل عمليات السحب
                </h3>
              </div>
              <div className="p-4">
                {wallet.withdrawals.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    لا توجد عمليات سحب سابقة
                  </div>
                ) : (
                  <div className="space-y-3">
                    {wallet.withdrawals.map((w, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-xl">
                        <div>
                          <div className="font-medium">{w.amount} ر.س</div>
                          <div className="text-xs text-slate-500">{formatDate(w.requestedAt)}</div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs ${
                          w.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                          w.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                          'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {w.status === 'approved' ? 'تمت الموافقة' : w.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ====== المطاعم ====== */}
        {activeTab === 'restaurants' && (
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base sm:text-xl font-bold">المطاعم ({restaurants.length})</h2>
            </div>

            {restaurants.length === 0 ? (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl sm:rounded-2xl p-6 sm:p-8 text-center">
                <Store className="w-12 h-12 sm:w-16 sm:h-16 text-slate-600 mx-auto mb-3 sm:mb-4" />
                <div className="text-sm sm:text-base text-slate-400">لا توجد مطاعم مسجلة تحت إشرافك</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {restaurants.map(restaurant => {
                  const restaurantOrders = orders.filter(o => o.restaurantId === restaurant.id)
                  const completedOrders = restaurantOrders.filter(o => o.status === 'delivered')
                  const revenue = completedOrders.reduce((sum, o) => sum + (o.total || 0), 0)
                  
                  return (
                    <div 
                      key={restaurant.id}
                      className="bg-slate-800/50 border border-slate-700/50 rounded-xl sm:rounded-2xl overflow-hidden hover:border-amber-500/30 transition-colors"
                    >
                      <div className="p-3 sm:p-4">
                        <div className="flex items-center gap-2.5 sm:gap-3 mb-3 sm:mb-4">
                          {restaurant.logoUrl ? (
                            <img 
                              src={restaurant.logoUrl} 
                              alt={restaurant.name}
                              className="w-11 h-11 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl object-cover"
                            />
                          ) : (
                            <div className="w-11 h-11 sm:w-14 sm:h-14 bg-slate-700 rounded-lg sm:rounded-xl flex items-center justify-center">
                              <Store className="w-5 h-5 sm:w-7 sm:h-7 text-slate-500" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-sm sm:text-base truncate">{restaurant.name}</h3>
                            <div className="text-[10px] sm:text-xs text-slate-500">{restaurant.city}</div>
                          </div>
                          <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${restaurant.isOpen ? 'bg-emerald-400' : 'bg-red-400'}`} 
                               title={restaurant.isOpen ? 'مفتوح' : 'مغلق'} />
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 sm:gap-2 text-center">
                          <div className="bg-slate-700/30 rounded-lg p-1.5 sm:p-2">
                            <div className="text-base sm:text-lg font-bold">{restaurantOrders.length}</div>
                            <div className="text-[9px] sm:text-xs text-slate-500">الطلبات</div>
                          </div>
                          <div className="bg-slate-700/30 rounded-lg p-1.5 sm:p-2">
                            <div className="text-base sm:text-lg font-bold text-emerald-400">{completedOrders.length}</div>
                            <div className="text-[9px] sm:text-xs text-slate-500">مكتمل</div>
                          </div>
                          <div className="bg-slate-700/30 rounded-lg p-1.5 sm:p-2">
                            <div className="text-base sm:text-lg font-bold text-amber-400">{revenue.toFixed(0)}</div>
                            <div className="text-[9px] sm:text-xs text-slate-500">ر.س</div>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setSelectedRestaurant(restaurant)}
                        className="w-full bg-slate-700/30 hover:bg-amber-500/20 text-slate-400 hover:text-amber-400 py-2 text-xs sm:text-sm transition-colors flex items-center justify-center gap-2"
                      >
                        <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        عرض التفاصيل
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ====== الطلبات ====== */}
        {activeTab === 'orders' && (
          <div className="space-y-3 sm:space-y-4">
            {/* الفلاتر - محسّنة للجوال */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl sm:rounded-2xl p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                {/* البحث */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      placeholder="بحث..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-lg sm:rounded-xl pr-10 pl-3 py-2 text-sm focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>

                {/* الفلاتر - صف واحد على الجوال */}
                <div className="flex gap-2">
                  {/* فلتر الحالة */}
                  <select
                    value={orderStatusFilter}
                    onChange={e => setOrderStatusFilter(e.target.value)}
                    className="flex-1 sm:flex-none bg-slate-700/50 border border-slate-600 rounded-lg sm:rounded-xl px-2 sm:px-4 py-2 text-xs sm:text-sm focus:border-amber-500 outline-none"
                  >
                    <option value="all">الكل</option>
                    <option value="pending">معلق</option>
                    <option value="accepted">مقبول</option>
                    <option value="preparing">تحضير</option>
                    <option value="ready">جاهز</option>
                    <option value="out_for_delivery">توصيل</option>
                    <option value="delivered">مكتمل</option>
                    <option value="cancelled">ملغى</option>
                  </select>

                  {/* فلتر التاريخ */}
                  <select
                    value={dateFilter}
                    onChange={e => setDateFilter(e.target.value as any)}
                    className="flex-1 sm:flex-none bg-slate-700/50 border border-slate-600 rounded-lg sm:rounded-xl px-2 sm:px-4 py-2 text-xs sm:text-sm focus:border-amber-500 outline-none"
                  >
                    <option value="all">الكل</option>
                    <option value="today">اليوم</option>
                    <option value="week">الأسبوع</option>
                    <option value="month">الشهر</option>
                  </select>
                </div>
              </div>
            </div>

            {/* قائمة الطلبات */}
            <div className="space-y-2 sm:space-y-3">
              {filteredOrders.length === 0 ? (
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl sm:rounded-2xl p-6 sm:p-8 text-center">
                  <ShoppingBag className="w-12 h-12 sm:w-16 sm:h-16 text-slate-600 mx-auto mb-3 sm:mb-4" />
                  <div className="text-sm sm:text-base text-slate-400">لا توجد طلبات</div>
                </div>
              ) : (
                filteredOrders.map(order => (
                  <div 
                    key={order.id}
                    className="bg-slate-800/50 border border-slate-700/50 rounded-xl sm:rounded-2xl overflow-hidden"
                  >
                    <div 
                      className="p-3 sm:p-4 cursor-pointer hover:bg-slate-700/20 transition-colors"
                      onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 bg-slate-700/50 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0">
                            <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium flex items-center gap-1.5 sm:gap-2 flex-wrap">
                              <span className="text-sm sm:text-base">#{order.id.slice(-6)}</span>
                              {getStatusBadge(order.status)}
                            </div>
                            <div className="text-[10px] sm:text-xs text-slate-500 truncate">
                              {order.restaurantName || restaurants.find(r => r.id === order.restaurantId)?.name}
                            </div>
                          </div>
                        </div>
                        <div className="text-left flex-shrink-0">
                          <div className="font-bold text-amber-400 text-sm sm:text-base">{order.total?.toFixed(0)} <span className="text-xs">ر.س</span></div>
                          <div className="text-[10px] sm:text-xs text-slate-500">{formatDate(order.createdAt)}</div>
                        </div>
                        {expandedOrder === order.id ? (
                          <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 flex-shrink-0" />
                        )}
                      </div>
                    </div>

                    {/* التفاصيل الموسعة */}
                    {expandedOrder === order.id && (
                      <div className="border-t border-slate-700/50 p-3 sm:p-4 bg-slate-800/30">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3 sm:mb-4">
                          <div>
                            <div className="text-[10px] sm:text-xs text-slate-500 mb-0.5 sm:mb-1">العميل</div>
                            <div className="text-sm sm:text-base">{order.customerName || 'غير محدد'}</div>
                          </div>
                          <div>
                            <div className="text-[10px] sm:text-xs text-slate-500 mb-0.5 sm:mb-1">عمولتك</div>
                            <div className={`font-bold text-sm sm:text-base ${order.status === 'delivered' ? 'text-emerald-400' : 'text-slate-500'}`}>
                              {order.status === 'delivered' ? COMMISSION_PER_ORDER + ' ر.س ✓' : 'تُستحق عند الاكتمال'}
                            </div>
                          </div>
                        </div>

                        {/* تغيير الحالة */}
                        {!['delivered', 'cancelled'].includes(order.status) && (
                          <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center">
                            <span className="text-xs sm:text-sm text-slate-400 w-full sm:w-auto mb-1 sm:mb-0">تغيير:</span>
                            {order.status === 'pending' && (
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, 'accepted')}
                                className="bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm"
                              >
                                قبول
                              </button>
                            )}
                            {order.status === 'accepted' && (
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, 'preparing')}
                                className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm"
                              >
                                تحضير
                              </button>
                            )}
                            {order.status === 'preparing' && (
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, 'ready')}
                                className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm"
                              >
                                جاهز
                              </button>
                            )}
                            {order.status === 'ready' && (
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, 'out_for_delivery')}
                                className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm"
                              >
                                توصيل
                              </button>
                            )}
                            {order.status === 'out_for_delivery' && (
                              <button
                                onClick={() => handleUpdateOrderStatus(order.id, 'delivered')}
                                className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm"
                              >
                                تم
                              </button>
                            )}
                            <button
                              onClick={() => handleUpdateOrderStatus(order.id, 'cancelled')}
                              className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm"
                            >
                              إلغاء
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ====== التقارير ====== */}
        {activeTab === 'reports' && (
          <div className="space-y-4 sm:space-y-6">
            <h2 className="text-base sm:text-xl font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
              التقارير
            </h2>

            {/* ملخص الأداء */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {/* تقرير اليوم */}
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl sm:rounded-2xl p-3 sm:p-4">
                <h3 className="font-bold text-amber-400 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                  📅 اليوم
                </h3>
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex justify-between items-center p-2 sm:p-3 bg-slate-700/30 rounded-lg sm:rounded-xl">
                    <span className="text-xs sm:text-sm text-slate-400">الطلبات</span>
                    <span className="font-bold text-sm sm:text-base">{stats.todayOrders}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 sm:p-3 bg-slate-700/30 rounded-lg sm:rounded-xl">
                    <span className="text-xs sm:text-sm text-slate-400">مكتملة</span>
                    <span className="font-bold text-sm sm:text-base text-emerald-400">{stats.todayCompleted}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 sm:p-3 bg-slate-700/30 rounded-lg sm:rounded-xl">
                    <span className="text-xs sm:text-sm text-slate-400">أرباحك</span>
                    <span className="font-bold text-sm sm:text-base text-amber-400">{stats.todayEarnings} ر.س</span>
                  </div>
                </div>
              </div>

              {/* تقرير الأسبوع */}
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl sm:rounded-2xl p-3 sm:p-4">
                <h3 className="font-bold text-amber-400 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                  📈 الأسبوع
                </h3>
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex justify-between items-center p-2 sm:p-3 bg-slate-700/30 rounded-lg sm:rounded-xl">
                    <span className="text-xs sm:text-sm text-slate-400">مكتملة</span>
                    <span className="font-bold text-sm sm:text-base text-emerald-400">{stats.weekCompleted}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 sm:p-3 bg-slate-700/30 rounded-lg sm:rounded-xl">
                    <span className="text-xs sm:text-sm text-slate-400">الأرباح</span>
                    <span className="font-bold text-sm sm:text-base text-amber-400">{stats.weekEarnings} ر.س</span>
                  </div>
                </div>
              </div>
            </div>

            {/* تقرير الشهر */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl sm:rounded-2xl p-3 sm:p-4">
              <h3 className="font-bold text-amber-400 mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                🌟 الشهر
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                <div className="text-center p-2.5 sm:p-4 bg-slate-700/30 rounded-lg sm:rounded-xl">
                  <div className="text-xl sm:text-3xl font-bold">{stats.monthCompleted}</div>
                  <div className="text-[10px] sm:text-sm text-slate-400">مكتمل</div>
                </div>
                <div className="text-center p-2.5 sm:p-4 bg-slate-700/30 rounded-lg sm:rounded-xl">
                  <div className="text-xl sm:text-3xl font-bold text-amber-400">{stats.monthEarnings}</div>
                  <div className="text-[10px] sm:text-sm text-slate-400">ر.س</div>
                </div>
                <div className="text-center p-2.5 sm:p-4 bg-slate-700/30 rounded-lg sm:rounded-xl">
                  <div className="text-xl sm:text-3xl font-bold text-blue-400">{restaurants.length}</div>
                  <div className="text-[10px] sm:text-sm text-slate-400">مطعم</div>
                </div>
                <div className="text-center p-2.5 sm:p-4 bg-slate-700/30 rounded-lg sm:rounded-xl">
                  <div className="text-xl sm:text-3xl font-bold text-emerald-400">
                    {stats.completedOrders > 0 ? ((stats.completedOrders / stats.totalOrders) * 100).toFixed(0) : 0}%
                  </div>
                  <div className="text-[10px] sm:text-sm text-slate-400">إنجاز</div>
                </div>
              </div>
            </div>

            {/* أداء المطاعم - جدول متجاوب */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl sm:rounded-2xl overflow-hidden">
              <div className="p-3 sm:p-4 border-b border-slate-700/50">
                <h3 className="font-bold flex items-center gap-2 text-sm sm:text-base">
                  <Store className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                  أداء المطاعم
                </h3>
              </div>
              
              {/* عرض الجوال - بطاقات */}
              <div className="sm:hidden p-3 space-y-2">
                {restaurants.map(restaurant => {
                  const restaurantOrders = orders.filter(o => o.restaurantId === restaurant.id)
                  const completed = restaurantOrders.filter(o => o.status === 'delivered')
                  const revenue = completed.reduce((sum, o) => sum + (o.total || 0), 0)
                  const commission = completed.length * COMMISSION_PER_ORDER
                  
                  return (
                    <div key={restaurant.id} className="bg-slate-700/30 rounded-lg p-3">
                      <div className="font-medium text-sm mb-2">{restaurant.name}</div>
                      <div className="grid grid-cols-4 gap-2 text-center text-xs">
                        <div>
                          <div className="font-bold">{restaurantOrders.length}</div>
                          <div className="text-slate-500">طلب</div>
                        </div>
                        <div>
                          <div className="font-bold text-emerald-400">{completed.length}</div>
                          <div className="text-slate-500">مكتمل</div>
                        </div>
                        <div>
                          <div className="font-bold">{revenue.toFixed(0)}</div>
                          <div className="text-slate-500">ر.س</div>
                        </div>
                        <div>
                          <div className="font-bold text-amber-400">{commission}</div>
                          <div className="text-slate-500">عمولة</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              
              {/* عرض الديسكتوب - جدول */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-700/30">
                    <tr>
                      <th className="text-right p-3">المطعم</th>
                      <th className="text-center p-3">الطلبات</th>
                      <th className="text-center p-3">المكتملة</th>
                      <th className="text-center p-3">الإيرادات</th>
                      <th className="text-center p-3">عمولتك</th>
                    </tr>
                  </thead>
                  <tbody>
                    {restaurants.map(restaurant => {
                      const restaurantOrders = orders.filter(o => o.restaurantId === restaurant.id)
                      const completed = restaurantOrders.filter(o => o.status === 'delivered')
                      const revenue = completed.reduce((sum, o) => sum + (o.total || 0), 0)
                      const commission = completed.length * COMMISSION_PER_ORDER
                      
                      return (
                        <tr key={restaurant.id} className="border-t border-slate-700/30 hover:bg-slate-700/20">
                          <td className="p-3 font-medium">{restaurant.name}</td>
                          <td className="p-3 text-center">{restaurantOrders.length}</td>
                          <td className="p-3 text-center text-emerald-400">{completed.length}</td>
                          <td className="p-3 text-center">{revenue.toFixed(2)} ر.س</td>
                          <td className="p-3 text-center text-amber-400">{commission} ر.س</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default SupervisorDashboard
