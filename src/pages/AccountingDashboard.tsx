// src/pages/AccountingDashboard.tsx
// لوحة المحاسبة الرئيسية - للمطور فقط
import React, { useEffect, useState } from 'react'
import { db } from '@/firebase'
import { collection, query, where, getDocs, orderBy, doc, getDoc, limit } from 'firebase/firestore'
import { useAuth } from '@/auth'
import { useToast } from '@/components/ui/Toast'
import { 
  Wallet, TrendingUp, TrendingDown, DollarSign, Calendar,
  Building2, Truck, Users, Package, BarChart3, PieChart,
  ChevronLeft, ChevronRight, Download, RefreshCw, Eye,
  ArrowUpRight, ArrowDownRight, Banknote, CreditCard, Receipt
} from 'lucide-react'
import { AppAccounting, DailyStats } from '@/types'

// رسوم المنصة الثابتة
const PLATFORM_FEE = 3.75
const ADMIN_COMMISSION = 0.75 // نفس القيمة في CheckoutPage

type MonthlyStats = {
  totalOrders: number
  totalOrdersValue: number
  totalDeliveries: number
  totalDeliveryFees: number
  platformFees: number
  adminCommissions: number
  subscriptions: number
  promotions: number
  grossRevenue: number
  netRevenue: number
}

type WalletSummary = {
  restaurants: { count: number; totalBalance: number; totalSales: number }
  couriers: { count: number; totalBalance: number; totalEarnings: number; totalFees: number }
  admins: { count: number; totalBalance: number; totalCommissions: number }
  app: { balance: number; totalEarnings: number }
}

export const AccountingDashboard: React.FC = () => {
  const { role } = useAuth()
  const toast = useToast()

  // الشهر المحدد
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  
  // البيانات
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<MonthlyStats>({
    totalOrders: 0,
    totalOrdersValue: 0,
    totalDeliveries: 0,
    totalDeliveryFees: 0,
    platformFees: 0,
    adminCommissions: 0,
    subscriptions: 0,
    promotions: 0,
    grossRevenue: 0,
    netRevenue: 0,
  })
  const [dailyData, setDailyData] = useState<DailyStats[]>([])
  const [walletSummary, setWalletSummary] = useState<WalletSummary>({
    restaurants: { count: 0, totalBalance: 0, totalSales: 0 },
    couriers: { count: 0, totalBalance: 0, totalEarnings: 0, totalFees: 0 },
    admins: { count: 0, totalBalance: 0, totalCommissions: 0 },
    app: { balance: 0, totalEarnings: 0 },
  })
  const [recentTransactions, setRecentTransactions] = useState<any[]>([])

  // تحميل البيانات
  useEffect(() => {
    if (role === 'developer') {
      loadData()
    }
  }, [selectedYear, selectedMonth, role])

  // التحقق من الصلاحية (بعد كل الـ hooks)
  if (role !== 'developer') {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">ليس لديك صلاحية الوصول لهذه الصفحة</p>
      </div>
    )
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const yearMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`
      const startDate = new Date(selectedYear, selectedMonth - 1, 1)
      const endDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59)

      // جلب الطلبات للشهر المحدد
      const ordersQuery = query(
        collection(db, 'orders'),
        where('createdAt', '>=', startDate),
        where('createdAt', '<=', endDate),
        orderBy('createdAt', 'desc')
      )
      const ordersSnap = await getDocs(ordersQuery)
      const orders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }))

      // حساب الإحصائيات
      let totalOrders = 0
      let totalOrdersValue = 0
      let totalDeliveries = 0
      let totalDeliveryFees = 0
      let platformFees = 0
      let adminCommissions = 0
      const dailyMap: Record<string, DailyStats> = {}

      orders.forEach((order: any) => {
        totalOrders++
        totalOrdersValue += order.total || 0
        
        if (order.status === 'delivered') {
          totalDeliveries++
          totalDeliveryFees += order.deliveryFee || 0
          platformFees += order.courierPlatformFee ?? PLATFORM_FEE
          if (order.adminCommission) {
            adminCommissions += order.adminCommission
          }
        }

        // تجميع يومي
        const orderDate = order.createdAt?.toDate?.() || new Date(order.createdAt)
        const dateKey = orderDate.toISOString().split('T')[0]
        if (!dailyMap[dateKey]) {
          dailyMap[dateKey] = {
            date: dateKey,
            orders: 0,
            ordersValue: 0,
            deliveries: 0,
            deliveryFees: 0,
            platformFees: 0,
            adminCommissions: 0,
          }
        }
        dailyMap[dateKey].orders++
        dailyMap[dateKey].ordersValue += order.total || 0
        if (order.status === 'delivered') {
          dailyMap[dateKey].deliveries++
          dailyMap[dateKey].deliveryFees += order.deliveryFee || 0
          dailyMap[dateKey].platformFees += order.courierPlatformFee || PLATFORM_FEE
          dailyMap[dateKey].adminCommissions += order.adminCommission || 0
        }
      })

      // جلب إيرادات الاشتراكات والإعلانات
      // (يمكن إضافة جداول منفصلة لها لاحقاً)
      const subscriptions = 0 // TODO: من جدول الاشتراكات
      const promotions = 0 // TODO: من جدول الإعلانات

      const grossRevenue = platformFees + adminCommissions + subscriptions + promotions
      const netRevenue = grossRevenue // يمكن خصم مصاريف التشغيل لاحقاً

      setStats({
        totalOrders,
        totalOrdersValue,
        totalDeliveries,
        totalDeliveryFees,
        platformFees,
        adminCommissions,
        subscriptions,
        promotions,
        grossRevenue,
        netRevenue,
      })

      // ترتيب البيانات اليومية
      const sortedDaily = Object.values(dailyMap).sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      setDailyData(sortedDaily)

      // جلب ملخص المحافظ
      await loadWalletSummary()

      // جلب آخر المعاملات
      await loadRecentTransactions()

    } catch (error) {
      console.error('Error loading accounting data:', error)
      toast.error('حدث خطأ في تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  const loadWalletSummary = async () => {
    try {
      const walletsSnap = await getDocs(collection(db, 'wallets'))
      
      let restaurants = { count: 0, totalBalance: 0, totalSales: 0 }
      let couriers = { count: 0, totalBalance: 0, totalEarnings: 0, totalFees: 0 }
      let admins = { count: 0, totalBalance: 0, totalCommissions: 0 }
      let app = { balance: 0, totalEarnings: 0 }

      walletsSnap.docs.forEach(doc => {
        const data = doc.data()
        const id = doc.id

        if (id === 'app_earnings') {
          app = { balance: data.balance || 0, totalEarnings: data.totalEarnings || 0 }
        } else if (data.ownerType === 'restaurant') {
          restaurants.count++
          restaurants.totalBalance += data.balance || 0
          restaurants.totalSales += data.totalSales || 0
        } else if (data.ownerType === 'courier') {
          couriers.count++
          couriers.totalBalance += data.balance || 0
          couriers.totalEarnings += data.totalEarnings || 0
          couriers.totalFees += data.totalPlatformFees || 0
        } else {
          // admin wallet
          admins.count++
          admins.totalBalance += data.balance || 0
          admins.totalCommissions += data.totalEarnings || 0
        }
      })

      setWalletSummary({ restaurants, couriers, admins, app })
    } catch (error) {
      console.error('Error loading wallet summary:', error)
    }
  }

  const loadRecentTransactions = async () => {
    try {
      const txQuery = query(
        collection(db, 'transactions'),
        orderBy('createdAt', 'desc'),
        limit(20)
      )
      const snap = await getDocs(txQuery)
      setRecentTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (error) {
      // قد لا يوجد جدول transactions بعد
      setRecentTransactions([])
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

  return (
    <div className="space-y-6">
      {/* العنوان والتنقل بين الأشهر */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-sky-900 flex items-center gap-2">
            <BarChart3 className="w-7 h-7" />
            لوحة المحاسبة
          </h1>
          <p className="text-sky-600 mt-1">إدارة ومراقبة إيرادات التطبيق</p>
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
          {/* بطاقات الإحصائيات الرئيسية */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              title="صافي الإيرادات"
              value={formatCurrency(stats.netRevenue)}
              icon={<Wallet className="w-6 h-6" />}
              color="emerald"
              subtitle="هذا الشهر"
            />
            <StatCard
              title="رسوم المنصة"
              value={formatCurrency(stats.platformFees)}
              icon={<Receipt className="w-6 h-6" />}
              color="sky"
              subtitle={`من ${stats.totalDeliveries} توصيلة`}
            />
            <StatCard
              title="عمولات المشرفين"
              value={formatCurrency(stats.adminCommissions)}
              icon={<Users className="w-6 h-6" />}
              color="purple"
              subtitle="إجمالي العمولات"
            />
            <StatCard
              title="إجمالي الطلبات"
              value={stats.totalOrders.toString()}
              icon={<Package className="w-6 h-6" />}
              color="amber"
              subtitle={formatCurrency(stats.totalOrdersValue)}
            />
          </div>

          {/* ملخص المحافظ */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-sky-100">
            <h2 className="text-lg font-bold text-sky-900 mb-4 flex items-center gap-2">
              <Banknote className="w-5 h-5" />
              ملخص المحافظ
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <WalletCard
                title="محفظة التطبيق"
                balance={walletSummary.app.balance}
                total={walletSummary.app.totalEarnings}
                icon={<DollarSign className="w-5 h-5" />}
                color="emerald"
              />
              <WalletCard
                title="الأسر المنتجة"
                balance={walletSummary.restaurants.totalBalance}
                total={walletSummary.restaurants.totalSales}
                count={walletSummary.restaurants.count}
                icon={<Building2 className="w-5 h-5" />}
                color="sky"
              />
              <WalletCard
                title="المناديب"
                balance={walletSummary.couriers.totalBalance}
                total={walletSummary.couriers.totalEarnings}
                count={walletSummary.couriers.count}
                icon={<Truck className="w-5 h-5" />}
                color="orange"
              />
              <WalletCard
                title="المشرفون"
                balance={walletSummary.admins.totalBalance}
                total={walletSummary.admins.totalCommissions}
                count={walletSummary.admins.count}
                icon={<Users className="w-5 h-5" />}
                color="purple"
              />
            </div>
          </div>

          {/* الإحصائيات اليومية */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-sky-100">
            <h2 className="text-lg font-bold text-sky-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              الإحصائيات اليومية
            </h2>
            {dailyData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-sky-100">
                      <th className="text-right py-3 px-2 font-semibold text-sky-700">التاريخ</th>
                      <th className="text-right py-3 px-2 font-semibold text-sky-700">الطلبات</th>
                      <th className="text-right py-3 px-2 font-semibold text-sky-700">قيمة الطلبات</th>
                      <th className="text-right py-3 px-2 font-semibold text-sky-700">التوصيلات</th>
                      <th className="text-right py-3 px-2 font-semibold text-sky-700">رسوم المنصة</th>
                      <th className="text-right py-3 px-2 font-semibold text-sky-700">عمولات المشرفين</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailyData.map((day) => (
                      <tr key={day.date} className="border-b border-sky-50 hover:bg-sky-25">
                        <td className="py-3 px-2 font-medium">{day.date}</td>
                        <td className="py-3 px-2">{day.orders}</td>
                        <td className="py-3 px-2">{formatCurrency(day.ordersValue)}</td>
                        <td className="py-3 px-2">{day.deliveries}</td>
                        <td className="py-3 px-2 text-emerald-600">{formatCurrency(day.platformFees)}</td>
                        <td className="py-3 px-2 text-purple-600">{formatCurrency(day.adminCommissions)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-sky-500 py-8">لا توجد بيانات لهذا الشهر</p>
            )}
          </div>

          {/* تفاصيل الإيرادات */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-sky-100">
              <h2 className="text-lg font-bold text-sky-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                مصادر الإيرادات
              </h2>
              <div className="space-y-4">
                <RevenueItem
                  label="رسوم المنصة (من المناديب)"
                  value={stats.platformFees}
                  percentage={(stats.platformFees / (stats.grossRevenue || 1)) * 100}
                  color="sky"
                />
                <RevenueItem
                  label="عمولات المشرفين"
                  value={stats.adminCommissions}
                  percentage={(stats.adminCommissions / (stats.grossRevenue || 1)) * 100}
                  color="purple"
                />
                <RevenueItem
                  label="اشتراكات الباقات"
                  value={stats.subscriptions}
                  percentage={(stats.subscriptions / (stats.grossRevenue || 1)) * 100}
                  color="amber"
                />
                <RevenueItem
                  label="الإعلانات الممولة"
                  value={stats.promotions}
                  percentage={(stats.promotions / (stats.grossRevenue || 1)) * 100}
                  color="emerald"
                />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-sky-100">
              <h2 className="text-lg font-bold text-sky-900 mb-4 flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                ملخص الشهر
              </h2>
              <div className="space-y-4">
                <SummaryItem label="إجمالي الطلبات" value={stats.totalOrders.toString()} />
                <SummaryItem label="قيمة الطلبات" value={formatCurrency(stats.totalOrdersValue)} />
                <SummaryItem label="الطلبات المكتملة" value={stats.totalDeliveries.toString()} />
                <SummaryItem label="إجمالي رسوم التوصيل" value={formatCurrency(stats.totalDeliveryFees)} />
                <div className="border-t border-sky-100 pt-4 mt-4">
                  <SummaryItem 
                    label="إجمالي الإيرادات" 
                    value={formatCurrency(stats.grossRevenue)} 
                    highlight 
                  />
                  <SummaryItem 
                    label="صافي الإيرادات" 
                    value={formatCurrency(stats.netRevenue)} 
                    highlight 
                    color="emerald"
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// مكونات مساعدة

type StatCardProps = {
  title: string
  value: string
  icon: React.ReactNode
  color: 'sky' | 'emerald' | 'purple' | 'amber' | 'orange'
  subtitle?: string
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, subtitle }) => {
  const colorClasses = {
    sky: 'bg-sky-50 text-sky-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
    orange: 'bg-orange-50 text-orange-600',
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-sky-100">
      <div className={`w-12 h-12 rounded-xl ${colorClasses[color]} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-sm text-sky-600 mb-1">{title}</p>
      <p className="text-xl font-bold text-sky-900">{value}</p>
      {subtitle && <p className="text-xs text-sky-500 mt-1">{subtitle}</p>}
    </div>
  )
}

type WalletCardProps = {
  title: string
  balance: number
  total: number
  count?: number
  icon: React.ReactNode
  color: 'sky' | 'emerald' | 'purple' | 'orange'
}

const WalletCard: React.FC<WalletCardProps> = ({ title, balance, total, count, icon, color }) => {
  const colorClasses = {
    sky: 'border-sky-200 bg-sky-50',
    emerald: 'border-emerald-200 bg-emerald-50',
    purple: 'border-purple-200 bg-purple-50',
    orange: 'border-orange-200 bg-orange-50',
  }
  const textClasses = {
    sky: 'text-sky-600',
    emerald: 'text-emerald-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600',
  }

  return (
    <div className={`rounded-xl p-4 border ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={textClasses[color]}>{icon}</span>
        <span className="font-semibold text-sky-900 text-sm">{title}</span>
        {count !== undefined && (
          <span className="text-xs bg-white px-2 py-0.5 rounded-full text-sky-600">{count}</span>
        )}
      </div>
      <p className={`text-lg font-bold ${textClasses[color]}`}>{balance.toFixed(2)} ر.س</p>
      <p className="text-xs text-sky-500 mt-1">إجمالي: {total.toFixed(2)} ر.س</p>
    </div>
  )
}

type RevenueItemProps = {
  label: string
  value: number
  percentage: number
  color: 'sky' | 'emerald' | 'purple' | 'amber'
}

const RevenueItem: React.FC<RevenueItemProps> = ({ label, value, percentage, color }) => {
  const bgClasses = {
    sky: 'bg-sky-500',
    emerald: 'bg-emerald-500',
    purple: 'bg-purple-500',
    amber: 'bg-amber-500',
  }

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-sky-700">{label}</span>
        <span className="font-semibold text-sky-900">{value.toFixed(2)} ر.س</span>
      </div>
      <div className="h-2 bg-sky-100 rounded-full overflow-hidden">
        <div 
          className={`h-full ${bgClasses[color]} rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  )
}

type SummaryItemProps = {
  label: string
  value: string
  highlight?: boolean
  color?: 'sky' | 'emerald'
}

const SummaryItem: React.FC<SummaryItemProps> = ({ label, value, highlight, color = 'sky' }) => {
  return (
    <div className="flex justify-between items-center py-2">
      <span className={highlight ? 'font-semibold text-sky-900' : 'text-sky-600'}>{label}</span>
      <span className={`font-bold ${color === 'emerald' ? 'text-emerald-600' : 'text-sky-900'}`}>
        {value}
      </span>
    </div>
  )
}

export default AccountingDashboard
