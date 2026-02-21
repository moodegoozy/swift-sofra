// src/pages/OwnerWalletPage.tsx
// صفحة محفظة الأسرة المنتجة - تعرض فقط مبيعاتها الخاصة
import React, { useEffect, useState } from 'react'
import { db } from '@/firebase'
import { collection, query, where, getDocs, orderBy, doc, getDoc, limit } from 'firebase/firestore'
import { useAuth } from '@/auth'
import { useToast } from '@/components/ui/Toast'
import { 
  Wallet, TrendingUp, ShoppingBag, Calendar,
  ChevronLeft, ChevronRight, RefreshCw, Package,
  Banknote, CreditCard, Clock, CheckCircle, XCircle,
  Download, Eye, ArrowUpRight, DollarSign
} from 'lucide-react'
import { OwnerWallet, WalletTransaction } from '@/types'

type SalesStats = {
  todaySales: number
  todayOrders: number
  weekSales: number
  weekOrders: number
  monthSales: number
  monthOrders: number
  totalSales: number
  totalOrders: number
  pendingAmount: number
  availableBalance: number
}

type OrderSummary = {
  id: string
  total: number
  subtotal: number
  status: string
  createdAt: any
  customerName?: string
}

export const OwnerWalletPage: React.FC = () => {
  const { user, role } = useAuth()
  const toast = useToast()

  // الشهر المحدد
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  
  // البيانات
  const [loading, setLoading] = useState(true)
  const [wallet, setWallet] = useState<OwnerWallet | null>(null)
  const [stats, setStats] = useState<SalesStats>({
    todaySales: 0,
    todayOrders: 0,
    weekSales: 0,
    weekOrders: 0,
    monthSales: 0,
    monthOrders: 0,
    totalSales: 0,
    totalOrders: 0,
    pendingAmount: 0,
    availableBalance: 0,
  })
  const [recentOrders, setRecentOrders] = useState<OrderSummary[]>([])
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [restaurantName, setRestaurantName] = useState('')

  // تحميل البيانات
  useEffect(() => {
    if (user?.uid && (role === 'owner' || role === 'developer')) {
      loadData()
    }
  }, [user?.uid, selectedYear, selectedMonth, role])

  // التحقق من الصلاحية (بعد كل الـ hooks)
  if (role !== 'owner' && role !== 'developer') {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">ليس لديك صلاحية الوصول لهذه الصفحة</p>
      </div>
    )
  }

  const loadData = async () => {
    if (!user?.uid) return
    
    setLoading(true)
    try {
      // جلب بيانات المطعم
      const restaurantSnap = await getDoc(doc(db, 'restaurants', user.uid))
      if (restaurantSnap.exists()) {
        setRestaurantName(restaurantSnap.data().name || 'أسرتي')
      }

      // جلب بيانات المحفظة
      const walletSnap = await getDoc(doc(db, 'wallets', user.uid))
      if (walletSnap.exists()) {
        const walletData = walletSnap.data() as OwnerWallet
        setWallet(walletData)
      } else {
        // إنشاء محفظة افتراضية
        setWallet({
          id: user.uid,
          ownerType: 'restaurant',
          balance: 0,
          totalSales: 0,
          totalWithdrawn: 0,
          pendingBalance: 0,
        })
      }

      // جلب الطلبات للإحصائيات
      const ordersQuery = query(
        collection(db, 'orders'),
        where('restaurantId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(200)
      )
      const ordersSnap = await getDocs(ordersQuery)
      const orders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }))

      // حساب الإحصائيات
      const now = new Date()
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const weekStart = new Date(todayStart)
      weekStart.setDate(weekStart.getDate() - 7)
      const monthStart = new Date(selectedYear, selectedMonth - 1, 1)
      const monthEnd = new Date(selectedYear, selectedMonth, 0, 23, 59, 59)

      let todaySales = 0, todayOrders = 0
      let weekSales = 0, weekOrders = 0
      let monthSales = 0, monthOrders = 0
      let totalSales = 0, totalOrders = 0
      let pendingAmount = 0

      const recentOrdersList: OrderSummary[] = []

      orders.forEach((order: any) => {
        const createdAt = order.createdAt?.toDate?.() || new Date(order.createdAt)
        const orderTotal = order.restaurantEarnings || order.subtotal || 0 // نستخدم أرباح المطعم الفعلية
        
        // الطلبات الأخيرة للعرض
        if (recentOrdersList.length < 20) {
          recentOrdersList.push({
            id: order.id,
            total: order.total,
            subtotal: order.subtotal,
            status: order.status,
            createdAt: order.createdAt,
          })
        }

        // الطلبات المعلقة (لم تكتمل بعد)
        if (!['delivered', 'cancelled'].includes(order.status)) {
          pendingAmount += orderTotal
        }

        // الطلبات المكتملة فقط
        if (order.status === 'delivered') {
          totalOrders++
          totalSales += orderTotal

          if (createdAt >= todayStart) {
            todayOrders++
            todaySales += orderTotal
          }
          if (createdAt >= weekStart) {
            weekOrders++
            weekSales += orderTotal
          }
          if (createdAt >= monthStart && createdAt <= monthEnd) {
            monthOrders++
            monthSales += orderTotal
          }
        }
      })

      setStats({
        todaySales,
        todayOrders,
        weekSales,
        weekOrders,
        monthSales,
        monthOrders,
        totalSales,
        totalOrders,
        pendingAmount,
        availableBalance: wallet?.balance || 0,
      })

      setRecentOrders(recentOrdersList)

      // جلب سجل المعاملات
      await loadTransactions()

    } catch (error) {
      console.error('Error loading wallet data:', error)
      toast.error('حدث خطأ في تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  const loadTransactions = async () => {
    if (!user?.uid) return
    
    try {
      const txQuery = query(
        collection(db, 'wallets', user.uid, 'transactions'),
        orderBy('createdAt', 'desc'),
        limit(50)
      )
      const snap = await getDocs(txQuery)
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as WalletTransaction)))
    } catch (error) {
      // قد لا يوجد جدول transactions بعد
      setTransactions([])
    }
  }

  const navigateMonth = (delta: number) => {
    let newMonth = selectedMonth + delta
    let newYear = selectedYear

    if (newMonth > 12) {
      newMonth = 1
      newYear++
    } else if (newMonth < 1) {
      newMonth = 12
      newYear--
    }

    setSelectedMonth(newMonth)
    setSelectedYear(newYear)
  }

  const getMonthName = (month: number) => {
    const months = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ]
    return months[month - 1]
  }

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(2)} ر.س`
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, { text: string; color: string }> = {
      pending: { text: 'بانتظار القبول', color: 'text-amber-600 bg-amber-50' },
      accepted: { text: 'مقبول', color: 'text-blue-600 bg-blue-50' },
      preparing: { text: 'قيد التحضير', color: 'text-purple-600 bg-purple-50' },
      ready: { text: 'جاهز', color: 'text-sky-600 bg-sky-50' },
      out_for_delivery: { text: 'في الطريق', color: 'text-orange-600 bg-orange-50' },
      delivered: { text: 'تم التسليم', color: 'text-emerald-600 bg-emerald-50' },
      cancelled: { text: 'ملغي', color: 'text-red-600 bg-red-50' },
    }
    return labels[status] || { text: status, color: 'text-gray-600 bg-gray-50' }
  }

  const formatDate = (date: any) => {
    if (!date) return '-'
    const d = date?.toDate?.() || new Date(date)
    return d.toLocaleDateString('ar-SA', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      {/* العنوان */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-sky-900 flex items-center gap-2">
            <Wallet className="w-7 h-7" />
            محفظتي
          </h1>
          <p className="text-sky-600 mt-1">{restaurantName}</p>
        </div>

        <div className="flex items-center gap-2 bg-white rounded-xl p-2 shadow-sm border border-sky-100">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-2 hover:bg-sky-50 rounded-lg transition"
          >
            <ChevronRight className="w-5 h-5 text-sky-600" />
          </button>
          <div className="px-4 py-2 font-semibold text-sky-900 min-w-[140px] text-center">
            {getMonthName(selectedMonth)} {selectedYear}
          </div>
          <button
            onClick={() => navigateMonth(1)}
            className="p-2 hover:bg-sky-50 rounded-lg transition"
          >
            <ChevronLeft className="w-5 h-5 text-sky-600" />
          </button>
          <button
            onClick={loadData}
            className="p-2 hover:bg-sky-50 rounded-lg transition mr-2"
            title="تحديث"
          >
            <RefreshCw className={`w-5 h-5 text-sky-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-sky-500 mx-auto mb-3" />
          <p className="text-sky-600">جارِ تحميل البيانات...</p>
        </div>
      ) : (
        <>
          {/* بطاقة الرصيد الرئيسية */}
          <div className="bg-gradient-to-br from-sky-500 to-sky-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sky-100 flex items-center gap-2">
                <Banknote className="w-5 h-5" />
                الرصيد المتاح
              </span>
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                محفظة الأسرة
              </span>
            </div>
            <p className="text-4xl font-bold mb-2">{formatCurrency(stats.availableBalance)}</p>
            <div className="flex gap-6 mt-4 text-sm">
              <div>
                <span className="text-sky-200">إجمالي المبيعات</span>
                <p className="font-semibold">{formatCurrency(stats.totalSales)}</p>
              </div>
              <div>
                <span className="text-sky-200">معلق</span>
                <p className="font-semibold">{formatCurrency(stats.pendingAmount)}</p>
              </div>
              <div>
                <span className="text-sky-200">الطلبات</span>
                <p className="font-semibold">{stats.totalOrders}</p>
              </div>
            </div>
          </div>

          {/* بطاقات الإحصائيات */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="مبيعات اليوم"
              value={formatCurrency(stats.todaySales)}
              subtitle={`${stats.todayOrders} طلب`}
              icon={<ShoppingBag className="w-5 h-5" />}
              color="emerald"
            />
            <StatCard
              title="مبيعات الأسبوع"
              value={formatCurrency(stats.weekSales)}
              subtitle={`${stats.weekOrders} طلب`}
              icon={<TrendingUp className="w-5 h-5" />}
              color="sky"
            />
            <StatCard
              title="مبيعات الشهر"
              value={formatCurrency(stats.monthSales)}
              subtitle={`${stats.monthOrders} طلب`}
              icon={<Calendar className="w-5 h-5" />}
              color="purple"
            />
            <StatCard
              title="إجمالي المبيعات"
              value={formatCurrency(stats.totalSales)}
              subtitle={`${stats.totalOrders} طلب`}
              icon={<DollarSign className="w-5 h-5" />}
              color="amber"
            />
          </div>

          {/* آخر الطلبات */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-sky-100">
            <h2 className="text-lg font-bold text-sky-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" />
              آخر الطلبات
            </h2>
            {recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.slice(0, 10).map((order) => {
                  const statusInfo = getStatusLabel(order.status)
                  return (
                    <div 
                      key={order.id} 
                      className="flex items-center justify-between p-3 bg-sky-50/50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center">
                          <Package className="w-5 h-5 text-sky-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sky-900 text-sm">
                            طلب #{order.id.slice(-6)}
                          </p>
                          <p className="text-xs text-sky-500">{formatDate(order.createdAt)}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-sky-900">{formatCurrency(order.subtotal)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusInfo.color}`}>
                          {statusInfo.text}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-center text-sky-500 py-8">لا توجد طلبات بعد</p>
            )}
          </div>

          {/* سجل المعاملات */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-sky-100">
            <h2 className="text-lg font-bold text-sky-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              سجل المعاملات
            </h2>
            {transactions.length > 0 ? (
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div 
                    key={tx.id} 
                    className="flex items-center justify-between p-3 border-b border-sky-50 last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        tx.type === 'credit' ? 'bg-emerald-100' : 'bg-red-100'
                      }`}>
                        {tx.type === 'credit' ? (
                          <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <Download className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sky-900 text-sm">{tx.description}</p>
                        <p className="text-xs text-sky-500">
                          {(tx.createdAt as any)?.toDate?.()?.toLocaleDateString('ar-SA') || (tx.createdAt instanceof Date ? tx.createdAt.toLocaleDateString('ar-SA') : '-')}
                        </p>
                      </div>
                    </div>
                    <span className={`font-bold ${
                      tx.type === 'credit' ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sky-500 py-8">لا توجد معاملات بعد</p>
            )}
          </div>

          {/* ملاحظة */}
          <div className="bg-sky-50 rounded-xl p-4 border border-sky-100">
            <p className="text-sm text-sky-700 text-center">
              💡 يتم تحويل المبالغ المستحقة إلى حسابك البنكي خلال 3-5 أيام عمل بعد إتمام الطلب
            </p>
          </div>
        </>
      )}
    </div>
  )
}

// مكون بطاقة الإحصائيات
type StatCardProps = {
  title: string
  value: string
  subtitle: string
  icon: React.ReactNode
  color: 'sky' | 'emerald' | 'purple' | 'amber'
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color }) => {
  const colorClasses = {
    sky: 'bg-sky-50 text-sky-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-sky-100">
      <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-sm text-sky-600 mb-1">{title}</p>
      <p className="text-xl font-bold text-sky-900">{value}</p>
      <p className="text-xs text-sky-500 mt-1">{subtitle}</p>
    </div>
  )
}

export default OwnerWalletPage
