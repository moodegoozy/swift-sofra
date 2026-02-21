// src/pages/CourierWalletPage.tsx
// صفحة محفظة المندوب - تعرض فقط أرباحه من التوصيل
import React, { useEffect, useState } from 'react'
import { db } from '@/firebase'
import { collection, query, where, getDocs, orderBy, doc, getDoc, limit } from 'firebase/firestore'
import { useAuth } from '@/auth'
import { useToast } from '@/components/ui/Toast'
import { 
  Wallet, TrendingUp, Truck, Calendar,
  ChevronLeft, ChevronRight, RefreshCw, Package,
  Banknote, CreditCard, Clock, CheckCircle,
  ArrowUpRight, ArrowDownRight, DollarSign, MapPin,
  Download, AlertCircle
} from 'lucide-react'
import { CourierWallet, WalletTransaction } from '@/types'

// رسوم المنصة على كل طلب توصيل
const COURIER_PLATFORM_FEE = 3.75

type DeliveryStats = {
  todayDeliveries: number
  todayEarnings: number
  todayFees: number
  weekDeliveries: number
  weekEarnings: number
  weekFees: number
  monthDeliveries: number
  monthEarnings: number
  monthFees: number
  totalDeliveries: number
  totalEarnings: number
  totalFees: number
  netEarnings: number
  availableBalance: number
}

type DeliverySummary = {
  id: string
  deliveryFee: number
  platformFee: number
  status: string
  createdAt: any
  restaurantName?: string
}

export const CourierWalletPage: React.FC = () => {
  const { user, role } = useAuth()
  const toast = useToast()

  // الشهر المحدد
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  
  // البيانات
  const [loading, setLoading] = useState(true)
  const [wallet, setWallet] = useState<CourierWallet | null>(null)
  const [stats, setStats] = useState<DeliveryStats>({
    todayDeliveries: 0,
    todayEarnings: 0,
    todayFees: 0,
    weekDeliveries: 0,
    weekEarnings: 0,
    weekFees: 0,
    monthDeliveries: 0,
    monthEarnings: 0,
    monthFees: 0,
    totalDeliveries: 0,
    totalEarnings: 0,
    totalFees: 0,
    netEarnings: 0,
    availableBalance: 0,
  })
  const [recentDeliveries, setRecentDeliveries] = useState<DeliverySummary[]>([])
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [courierName, setCourierName] = useState('')

  // تحميل البيانات
  useEffect(() => {
    if (user?.uid && (role === 'courier' || role === 'developer')) {
      loadData()
    }
  }, [user?.uid, selectedYear, selectedMonth, role])

  // التحقق من الصلاحية (بعد كل الـ hooks)
  if (role !== 'courier' && role !== 'developer') {
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
      // جلب بيانات المندوب
      const courierSnap = await getDoc(doc(db, 'couriers', user.uid))
      if (courierSnap.exists()) {
        setCourierName(courierSnap.data().name || 'المندوب')
      }

      // جلب بيانات المحفظة
      const walletSnap = await getDoc(doc(db, 'wallets', user.uid))
      if (walletSnap.exists()) {
        const walletData = walletSnap.data() as CourierWallet
        setWallet(walletData)
      } else {
        // إنشاء محفظة افتراضية
        setWallet({
          id: user.uid,
          ownerType: 'courier',
          balance: 0,
          totalEarnings: 0,
          totalPlatformFees: 0,
          netEarnings: 0,
          totalWithdrawn: 0,
        })
      }

      // جلب التوصيلات للإحصائيات
      const ordersQuery = query(
        collection(db, 'orders'),
        where('courierId', '==', user.uid),
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

      let todayDeliveries = 0, todayEarnings = 0, todayFees = 0
      let weekDeliveries = 0, weekEarnings = 0, weekFees = 0
      let monthDeliveries = 0, monthEarnings = 0, monthFees = 0
      let totalDeliveries = 0, totalEarnings = 0, totalFees = 0

      const recentDeliveriesList: DeliverySummary[] = []

      orders.forEach((order: any) => {
        const createdAt = order.createdAt?.toDate?.() || new Date(order.createdAt)
        const deliveryFee = order.deliveryFee || 0
        const platformFee = order.courierPlatformFee || COURIER_PLATFORM_FEE
        
        // التوصيلات الأخيرة للعرض
        if (recentDeliveriesList.length < 20) {
          recentDeliveriesList.push({
            id: order.id,
            deliveryFee,
            platformFee,
            status: order.status,
            createdAt: order.createdAt,
            restaurantName: order.restaurantName,
          })
        }

        // التوصيلات المكتملة فقط
        if (order.status === 'delivered') {
          totalDeliveries++
          totalEarnings += deliveryFee
          totalFees += platformFee

          if (createdAt >= todayStart) {
            todayDeliveries++
            todayEarnings += deliveryFee
            todayFees += platformFee
          }
          if (createdAt >= weekStart) {
            weekDeliveries++
            weekEarnings += deliveryFee
            weekFees += platformFee
          }
          if (createdAt >= monthStart && createdAt <= monthEnd) {
            monthDeliveries++
            monthEarnings += deliveryFee
            monthFees += platformFee
          }
        }
      })

      const netEarnings = totalEarnings - totalFees

      setStats({
        todayDeliveries,
        todayEarnings,
        todayFees,
        weekDeliveries,
        weekEarnings,
        weekFees,
        monthDeliveries,
        monthEarnings,
        monthFees,
        totalDeliveries,
        totalEarnings,
        totalFees,
        netEarnings,
        availableBalance: wallet?.balance || netEarnings,
      })

      setRecentDeliveries(recentDeliveriesList)

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
      ready: { text: 'جاهز للاستلام', color: 'text-sky-600 bg-sky-50' },
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
          <p className="text-sky-600 mt-1">{courierName}</p>
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
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <span className="text-orange-100 flex items-center gap-2">
                <Banknote className="w-5 h-5" />
                صافي الأرباح
              </span>
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                محفظة المندوب
              </span>
            </div>
            <p className="text-4xl font-bold mb-2">{formatCurrency(stats.netEarnings)}</p>
            <div className="flex gap-6 mt-4 text-sm">
              <div>
                <span className="text-orange-200">إجمالي الأرباح</span>
                <p className="font-semibold">{formatCurrency(stats.totalEarnings)}</p>
              </div>
              <div>
                <span className="text-orange-200">رسوم المنصة</span>
                <p className="font-semibold text-orange-200">-{formatCurrency(stats.totalFees)}</p>
              </div>
              <div>
                <span className="text-orange-200">التوصيلات</span>
                <p className="font-semibold">{stats.totalDeliveries}</p>
              </div>
            </div>
          </div>

          {/* تنبيه رسوم المنصة */}
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">رسوم المنصة</p>
              <p className="text-sm text-amber-700 mt-1">
                يتم خصم {formatCurrency(COURIER_PLATFORM_FEE)} من كل طلب توصيل كرسوم للمنصة
              </p>
            </div>
          </div>

          {/* بطاقات الإحصائيات */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="أرباح اليوم"
              value={formatCurrency(stats.todayEarnings - stats.todayFees)}
              subtitle={`${stats.todayDeliveries} توصيلة`}
              icon={<Truck className="w-5 h-5" />}
              color="emerald"
            />
            <StatCard
              title="أرباح الأسبوع"
              value={formatCurrency(stats.weekEarnings - stats.weekFees)}
              subtitle={`${stats.weekDeliveries} توصيلة`}
              icon={<TrendingUp className="w-5 h-5" />}
              color="sky"
            />
            <StatCard
              title="أرباح الشهر"
              value={formatCurrency(stats.monthEarnings - stats.monthFees)}
              subtitle={`${stats.monthDeliveries} توصيلة`}
              icon={<Calendar className="w-5 h-5" />}
              color="purple"
            />
            <StatCard
              title="إجمالي الأرباح"
              value={formatCurrency(stats.totalEarnings)}
              subtitle={`${stats.totalDeliveries} توصيلة`}
              icon={<DollarSign className="w-5 h-5" />}
              color="amber"
            />
          </div>

          {/* تفاصيل الشهر */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-sky-100">
            <h2 className="text-lg font-bold text-sky-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              تفاصيل {getMonthName(selectedMonth)}
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-sky-50 rounded-xl">
                <p className="text-2xl font-bold text-sky-900">{stats.monthDeliveries}</p>
                <p className="text-sm text-sky-600">توصيلة</p>
              </div>
              <div className="text-center p-4 bg-emerald-50 rounded-xl">
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.monthEarnings)}</p>
                <p className="text-sm text-emerald-600">إجمالي</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-xl">
                <p className="text-2xl font-bold text-red-600">-{formatCurrency(stats.monthFees)}</p>
                <p className="text-sm text-red-600">رسوم</p>
              </div>
            </div>
          </div>

          {/* آخر التوصيلات */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-sky-100">
            <h2 className="text-lg font-bold text-sky-900 mb-4 flex items-center gap-2">
              <Truck className="w-5 h-5" />
              آخر التوصيلات
            </h2>
            {recentDeliveries.length > 0 ? (
              <div className="space-y-3">
                {recentDeliveries.slice(0, 10).map((delivery) => {
                  const statusInfo = getStatusLabel(delivery.status)
                  const netFee = delivery.deliveryFee - (delivery.status === 'delivered' ? delivery.platformFee : 0)
                  return (
                    <div 
                      key={delivery.id} 
                      className="flex items-center justify-between p-3 bg-sky-50/50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                          <MapPin className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sky-900 text-sm">
                            {delivery.restaurantName || `طلب #${delivery.id.slice(-6)}`}
                          </p>
                          <p className="text-xs text-sky-500">{formatDate(delivery.createdAt)}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-sky-900">
                          {formatCurrency(delivery.deliveryFee)}
                          {delivery.status === 'delivered' && (
                            <span className="text-xs text-red-500 mr-1">
                              (-{formatCurrency(delivery.platformFee)})
                            </span>
                          )}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusInfo.color}`}>
                          {statusInfo.text}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-center text-sky-500 py-8">لا توجد توصيلات بعد</p>
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
                          <ArrowDownRight className="w-5 h-5 text-red-600" />
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
              💡 يتم تحويل المبالغ المستحقة إلى حسابك البنكي خلال 3-5 أيام عمل
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

export default CourierWalletPage
