import React, { useEffect, useState } from 'react'
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuth } from '@/auth'
import { RoleGate } from '@/routes/RoleGate'
import { useToast } from '@/components/ui/Toast'
import { Order, OrderStatus, Restaurant } from '@/types'

const statusLabels: Record<OrderStatus, string> = {
  pending: '⏳ قيد المراجعة',
  accepted: '✅ مقبول',
  preparing: '👨‍🍳 قيد التحضير',
  ready: '📦 جاهز',
  out_for_delivery: '🚗 في الطريق',
  delivered: '✔️ تم التسليم',
  cancelled: '❌ ملغي',
}

export const AdminOrders: React.FC = () => {
  const { user, role } = useAuth()
  const toast = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [myRestaurantIds, setMyRestaurantIds] = useState<string[]>([])

  // تحميل المطاعم التابعة للمشرف أولاً
  useEffect(() => {
    if (!user) return
    
    const loadMyRestaurants = async () => {
      if (role === 'developer') {
        // المطور يرى كل الطلبات
        setMyRestaurantIds([])
      } else {
        // المشرف يحصل على معرفات مطاعمه
        const myRestaurantsQuery = query(
          collection(db, 'restaurants'),
          where('referredBy', '==', user.uid)
        )
        const snap = await getDocs(myRestaurantsQuery)
        const ids = snap.docs.map(d => d.id)
        setMyRestaurantIds(ids)
      }
    }
    
    loadMyRestaurants()
  }, [user, role])

  // تحميل الطلبات
  useEffect(() => {
    if (!user) return
    loadOrders()
  }, [statusFilter, user, role, myRestaurantIds])

  const loadOrders = async () => {
    try {
      let q
      if (statusFilter === 'all') {
        q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
      } else {
        q = query(
          collection(db, 'orders'),
          where('status', '==', statusFilter),
          orderBy('createdAt', 'desc')
        )
      }

      const snap = await getDocs(q)
      let data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order))
      
      // فلترة الطلبات للمشرف (فقط طلبات مطاعمه)
      if (role !== 'developer' && myRestaurantIds.length > 0) {
        data = data.filter(order => myRestaurantIds.includes(order.restaurantId || ''))
      } else if (role !== 'developer' && myRestaurantIds.length === 0) {
        // المشرف ليس لديه مطاعم
        data = []
      }
      
      setAllOrders(data)
      setOrders(data)
    } catch (err) {
      toast.error('خطأ في تحميل الطلبات')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <RoleGate allow={['admin', 'developer']}>
        <div className="flex items-center justify-center h-96">جارِ التحميل...</div>
      </RoleGate>
    )
  }

  return (
    <RoleGate allow={['admin', 'developer']}>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-primary">مراقبة الطلبات</h1>

        {/* تصفية الحالة */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-xl font-semibold transition whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-primary text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            الكل ({orders.length})
          </button>
          {(
            ['pending', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered'] as OrderStatus[]
          ).map(status => {
            const count = orders.filter(o => o.status === status).length
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-xl font-semibold transition whitespace-nowrap ${
                  statusFilter === status
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                {statusLabels[status]} ({count})
              </button>
            )
          })}
        </div>

        {/* قائمة الطلبات */}
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              لا توجد طلبات {statusFilter !== 'all' && `بحالة "${statusLabels[statusFilter as OrderStatus]}"`}
            </div>
          ) : (
            orders.map(order => (
              <div
                key={order.id}
                className="bg-white rounded-2xl shadow p-6 hover:shadow-lg transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold">طلب #{order.id.slice(-8)}</h3>
                    <p className="text-gray-600 text-sm">
                      {order.createdAt ? new Date(order.createdAt as any).toLocaleDateString('ar-SA') : '—'}
                    </p>
                  </div>
                  <span
                    className={`px-4 py-2 rounded-xl font-semibold text-white whitespace-nowrap ${
                      order.status === 'pending'
                        ? 'bg-yellow-500'
                        : order.status === 'delivered'
                        ? 'bg-green-600'
                        : order.status === 'cancelled'
                        ? 'bg-red-600'
                        : 'bg-blue-600'
                    }`}
                  >
                    {statusLabels[order.status]}
                  </span>
                </div>

                {/* التفاصيل */}
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-gray-600 text-sm">العميل ID</p>
                    <p className="font-mono text-sm text-gray-800">{order.customerId.slice(0, 12)}...</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">المطعم</p>
                    <p className="font-semibold text-gray-800">{order.restaurantName || '—'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">العنوان</p>
                    <p className="text-sm text-gray-800">{order.address}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">المجموع</p>
                    <p className="text-lg font-bold text-primary">{order.total?.toFixed(2) || 0} ر.س</p>
                  </div>
                </div>

                {/* الأصناف */}
                <div className="bg-gray-50 rounded-xl p-3 text-sm">
                  <p className="font-semibold mb-2">الأصناف:</p>
                  <div className="space-y-1">
                    {order.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-gray-700">
                        <span>{item.name} × {item.qty}</span>
                        <span>{(item.price * item.qty).toFixed(2)} ر.س</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </RoleGate>
  )
}

export default AdminOrders
