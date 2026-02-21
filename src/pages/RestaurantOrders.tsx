// src/pages/RestaurantOrders.tsx
import React, { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query, where, updateDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuth } from '@/auth'
import { Order, Rating, ORDER_TIME_LIMITS } from '@/types'
import { useToast } from '@/components/ui/Toast'
import { OrderTimer } from '@/components/OrderTimer'
import { RatingModal } from '@/components/RatingModal'
import { Package, MapPin, Truck, DollarSign, Check, Clock, X, AlertCircle, Store, Star, User } from 'lucide-react'
import { notifyOrderAccepted, notifyOrderReady } from '@/utils/notificationService'
import { playNotificationWithVibrate, initNotificationSound } from '@/utils/notificationSound'

// رسوم المنصة على المندوب
const COURIER_PLATFORM_FEE = 3.75

// ترجمة حالات الطلب
const statusLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'بانتظار القبول', color: 'bg-amber-100 text-amber-700', icon: <Clock className="w-4 h-4" /> },
  accepted: { label: 'مقبول', color: 'bg-blue-100 text-blue-700', icon: <Check className="w-4 h-4" /> },
  preparing: { label: 'قيد التحضير', color: 'bg-purple-100 text-purple-700', icon: <Package className="w-4 h-4" /> },
  ready: { label: 'جاهز للتسليم', color: 'bg-green-100 text-green-700', icon: <Store className="w-4 h-4" /> },
  out_for_delivery: { label: 'في الطريق', color: 'bg-sky-100 text-sky-700', icon: <Truck className="w-4 h-4" /> },
  delivered: { label: 'تم التسليم', color: 'bg-green-500 text-white', icon: <Check className="w-4 h-4" /> },
  cancelled: { label: 'ملغي', color: 'bg-red-100 text-red-700', icon: <X className="w-4 h-4" /> },
}

export const RestaurantOrders: React.FC = () => {
  const { user } = useAuth()
  const toast = useToast()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [deliveryFees, setDeliveryFees] = useState<Record<string, string>>({})
  const [savingFee, setSavingFee] = useState<string | null>(null)
  const [ratingModal, setRatingModal] = useState<{
    isOpen: boolean;
    orderId: string;
    targetName: string;
  } | null>(null)
  const [prevOrderCount, setPrevOrderCount] = useState<number | null>(null)

  // تهيئة صوت الإشعار - يفعّل تلقائياً عند أول تفاعل
  useEffect(() => {
    initNotificationSound()
  }, [])

  useEffect(() => {
    if (!user) return
    // ✅ جلب الطلبات الخاصة بالمطعم حسب restaurantId
    const q = query(
      collection(db, 'orders'),
      where('restaurantId', '==', user.uid),
      orderBy('createdAt', 'desc')
    )
    const unsub = onSnapshot(q, (snap) => {
      const newOrders = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Order))
      
      // 🔊 تشغيل صوت عند وصول طلب جديد pending
      const pendingCount = newOrders.filter(o => o.status === 'pending').length
      if (prevOrderCount !== null && pendingCount > (orders.filter(o => o.status === 'pending').length)) {
        playNotificationWithVibrate().catch(() => {})
        toast?.show('🛒 طلب جديد!', { type: 'info' })
      }
      setPrevOrderCount(newOrders.length)
      
      setOrders(newOrders)
      setLoading(false)
    }, (err) => {
      console.error('خطأ في جلب الطلبات:', err)
      setLoading(false)
    })
    return () => unsub()
  }, [user])

  const updateStatus = async (id: string, status: string) => {
    // جلب بيانات الطلب لإرسال الإشعار
    const order = orders.find(o => o.id === id)
    
    // إضافة timestamps حسب الحالة
    const updateData: Record<string, any> = { 
      status, 
      updatedAt: serverTimestamp() 
    }
    
    // تسجيل وقت كل مرحلة
    if (status === 'accepted') {
      updateData['timestamps.acceptedAt'] = serverTimestamp()
    } else if (status === 'ready') {
      updateData['timestamps.readyAt'] = serverTimestamp()
    } else if (status === 'cancelled') {
      updateData.cancelledAt = serverTimestamp()
      updateData.cancelledBy = 'owner'
    }
    
    await updateDoc(doc(db, 'orders', id), updateData)
    
    // 💰 استرداد تلقائي عند الإلغاء
    if (status === 'cancelled' && order) {
      try {
        const { processOrderRefund, notifyRefundParties } = await import('@/utils/refundService')
        const refundResult = await processOrderRefund({
          id: order.id,
          customerId: order.customerId,
          restaurantId: (order as any).restaurantId || user?.uid || '',
          subtotal: order.subtotal,
          total: order.total,
          restaurantEarnings: (order as any).restaurantEarnings,
          platformFee: (order as any).platformFee,
          adminCommission: (order as any).adminCommission,
          appEarnings: (order as any).appEarnings,
          referredBy: (order as any).referredBy,
          paymentMethod: (order as any).paymentMethod,
        })
        
        // إشعار الأطراف
        await notifyRefundParties({
          id: order.id,
          customerId: order.customerId,
          restaurantId: (order as any).restaurantId || user?.uid || '',
          subtotal: order.subtotal,
          total: order.total,
        }, refundResult, 'owner')
        
        if (refundResult.success) {
          toast.success('تم إلغاء الطلب واسترداد المبالغ تلقائياً ✅')
        }
      } catch (refundErr) {
        console.warn('⚠️ تعذر الاسترداد التلقائي:', refundErr)
        toast.warning('تم الإلغاء لكن فشل الاسترداد التلقائي')
      }
      return
    }
    
    // 🔔 إرسال إشعارات ذكية للعميل
    if (order) {
      const restaurantName = order.restaurantName || 'المطعم'
      
      if (status === 'accepted') {
        // إشعار: تم قبول طلبك
        notifyOrderAccepted(order.customerId, id, restaurantName)
      } else if (status === 'ready') {
        // إشعار: طلبك جاهز
        const deliveryType = order.deliveryType || 'delivery'
        notifyOrderReady(order.customerId, id, restaurantName, deliveryType)
      }
    }
    
    toast.success('تم تحديث حالة الطلب')
  }

  // إرسال تقييم العميل
  const submitCustomerRating = async (orderId: string, rating: { stars: number; comment: string }) => {
    const ratingData: Rating = {
      stars: rating.stars,
      comment: rating.comment || undefined,
      createdAt: new Date()
    }

    await updateDoc(doc(db, 'orders', orderId), {
      'ratings.restaurantToCustomer': ratingData,
      updatedAt: serverTimestamp()
    })

    toast.success('شكراً لتقييمك للعميل! ⭐')
  }

  // تحديد رسوم التوصيل
  const setDeliveryFee = async (orderId: string) => {
    const feeStr = deliveryFees[orderId]
    const fee = parseFloat(feeStr)
    
    if (isNaN(fee) || fee < 0) {
      toast.error('أدخل مبلغ صحيح')
      return
    }

    setSavingFee(orderId)
    
    const order = orders.find(o => o.id === orderId)
    if (!order) return

    // حماية ضد إعادة تحديد رسوم التوصيل
    if ((order as any).deliveryFeeSetBy) {
      toast.error('تم تحديد رسوم التوصيل مسبقاً')
      setSavingFee(null)
      return
    }

    // حساب الإجمالي: نستخدم total الحالي (يشمل الخصومات والرسوم) + رسوم التوصيل
    const currentTotal = order.total || order.subtotal
    const newTotal = currentTotal + fee

    await updateDoc(doc(db, 'orders', orderId), {
      deliveryFee: fee,
      deliveryFeeSetBy: 'owner',
      deliveryFeeSetAt: serverTimestamp(),
      total: newTotal,
      updatedAt: serverTimestamp(),
    })

    setSavingFee(null)
    toast.success(`تم تحديد رسوم التوصيل: ${fee} ر.س`)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-sky-600">جارِ تحميل الطلبات...</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 py-6 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-sky-500 to-sky-600 rounded-xl flex items-center justify-center">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-sky-900">طلبات الأسرة</h1>
            <p className="text-sky-600 text-sm">{orders.length} طلب</p>
          </div>
        </div>

        {orders.length === 0 && (
          <div className="glass-card rounded-2xl p-10 text-center">
            <Package className="w-16 h-16 text-sky-300 mx-auto mb-4" />
            <p className="text-sky-700 font-semibold">لا توجد طلبات حالياً</p>
            <p className="text-sky-500 text-sm mt-1">ستظهر الطلبات الجديدة هنا</p>
          </div>
        )}

        {/* نافذة تقييم العميل */}
        {ratingModal && (
          <RatingModal
            isOpen={ratingModal.isOpen}
            onClose={() => setRatingModal(null)}
            onSubmit={async (rating) => {
              await submitCustomerRating(ratingModal.orderId, rating)
              setRatingModal(null)
            }}
            type="customer"
            targetName={ratingModal.targetName}
            orderId={ratingModal.orderId}
          />
        )}

        <div className="space-y-4">
          {orders.map((o) => {
            const status = statusLabels[o.status] || statusLabels.pending
            const needsDeliveryFee = o.deliveryType === 'delivery' && !o.deliveryFeeSetBy && o.status === 'pending'
            
            return (
              <div key={o.id} className="glass-card rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-sky-500 to-sky-600 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-white font-bold">#{o.id.slice(-6)}</span>
                    <span className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${status.color}`}>
                      {status.icon}
                      {status.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-white">
                    {o.deliveryType === 'pickup' ? (
                      <span className="flex items-center gap-1 text-sm bg-white/20 px-2 py-1 rounded-lg">
                        <Store className="w-4 h-4" /> استلام
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-sm bg-white/20 px-2 py-1 rounded-lg">
                        <Truck className="w-4 h-4" /> توصيل
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4">
                  {/* الأصناف */}
                  <div className="mb-3">
                    <p className="text-sm text-gray-500 mb-1">الأصناف:</p>
                    <p className="font-semibold text-sky-900">
                      {o.items.map((i) => `${i.name} × ${i.qty}`).join(' • ')}
                    </p>
                  </div>

                  {/* العنوان */}
                  <div className="flex items-start gap-2 mb-3 text-sm">
                    <MapPin className="w-4 h-4 text-sky-500 mt-0.5" />
                    <span className="text-gray-700">{o.address}</span>
                  </div>

                  {/* عداد الوقت - يظهر للطلبات النشطة */}
                  {(o.status === 'accepted' || o.status === 'preparing') && (
                    <div className="mb-3">
                      <OrderTimer order={o} type="preparation" />
                    </div>
                  )}
                  {o.status === 'ready' && o.deliveryType === 'delivery' && (
                    <div className="mb-3">
                      <OrderTimer order={o} type="pickup" />
                    </div>
                  )}

                  {/* الأسعار */}
                  <div className="bg-sky-50 rounded-xl p-3 mb-4 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">سعر المنتجات</span>
                      <span className="font-semibold">{o.subtotal?.toFixed(2)} ر.س</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">رسوم التوصيل</span>
                      {o.deliveryFeeSetBy ? (
                        <span className="font-semibold text-green-600">{o.deliveryFee?.toFixed(2)} ر.س</span>
                      ) : o.deliveryType === 'pickup' ? (
                        <span className="font-semibold text-green-600">مجاناً</span>
                      ) : (
                        <span className="text-amber-600 text-xs">لم تُحدد بعد</span>
                      )}
                    </div>
                    <div className="h-px bg-sky-200 my-2"></div>
                    <div className="flex justify-between">
                      <span className="font-bold text-sky-900">الإجمالي</span>
                      <span className="font-bold text-lg text-sky-600">{o.total?.toFixed(2)} ر.س</span>
                    </div>
                  </div>

                  {/* تحديد رسوم التوصيل - يظهر فقط للطلبات الجديدة التي تحتاج توصيل */}
                  {needsDeliveryFee && (
                    <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <AlertCircle className="w-5 h-5 text-amber-600" />
                        <span className="font-bold text-amber-800">حدد رسوم التوصيل</span>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            placeholder="مثال: 10"
                            value={deliveryFees[o.id] || ''}
                            onChange={(e) => setDeliveryFees(prev => ({ ...prev, [o.id]: e.target.value }))}
                            className="w-full px-4 py-2 rounded-xl border-2 border-amber-200 focus:border-amber-400 focus:outline-none text-gray-800"
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">ر.س</span>
                        </div>
                        <button
                          onClick={() => setDeliveryFee(o.id)}
                          disabled={savingFee === o.id}
                          className="px-4 py-2 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 transition disabled:opacity-50"
                        >
                          {savingFee === o.id ? '...' : 'تأكيد'}
                        </button>
                      </div>
                      <p className="text-xs text-amber-700 mt-2">
                        💡 سيتم إضافة {COURIER_PLATFORM_FEE} ر.س رسوم منصة على المندوب تلقائياً
                      </p>
                    </div>
                  )}

                  {/* أزرار تغيير الحالة */}
                  <div className="flex flex-wrap gap-2">
                    {o.status === 'pending' && (
                      <>
                        <button 
                          onClick={() => updateStatus(o.id, 'accepted')}
                          disabled={needsDeliveryFee}
                          className="flex-1 px-4 py-2 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          ✅ قبول
                        </button>
                        <button 
                          onClick={() => updateStatus(o.id, 'cancelled')}
                          className="px-4 py-2 rounded-xl bg-red-100 text-red-600 font-semibold hover:bg-red-200 transition"
                        >
                          رفض
                        </button>
                      </>
                    )}
                    {o.status === 'accepted' && (
                      <button 
                        onClick={() => updateStatus(o.id, 'preparing')}
                        className="flex-1 px-4 py-2 rounded-xl bg-purple-500 text-white font-bold hover:bg-purple-600 transition"
                      >
                        🍳 بدء التحضير
                      </button>
                    )}
                    {o.status === 'preparing' && (
                      <button 
                        onClick={() => updateStatus(o.id, 'ready')}
                        className="flex-1 px-4 py-2 rounded-xl bg-green-500 text-white font-bold hover:bg-green-600 transition"
                      >
                        ✅ جاهز للتسليم
                      </button>
                    )}
                    {o.status === 'ready' && o.deliveryType === 'pickup' && (
                      <button 
                        onClick={() => updateStatus(o.id, 'delivered')}
                        className="flex-1 px-4 py-2 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 transition"
                      >
                        📦 تم التسليم
                      </button>
                    )}
                  </div>

                  {/* تقييم العميل - يظهر للطلبات المكتملة فقط */}
                  {o.status === 'delivered' && !o.ratings?.restaurantToCustomer?.stars && (
                    <div className="bg-gradient-to-r from-sky-50 to-blue-50 border-2 border-sky-200 rounded-2xl p-4 mt-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Star className="w-5 h-5 text-sky-500 fill-sky-500" />
                        <span className="font-bold text-sky-800">قيّم العميل ⭐</span>
                      </div>
                      <button
                        onClick={() => setRatingModal({
                          isOpen: true,
                          orderId: o.id,
                          targetName: (o as any).customerName || 'العميل'
                        })}
                        className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-sky-300 
                                   rounded-xl hover:bg-sky-50 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <User className="w-5 h-5 text-sky-600" />
                          <span className="font-medium text-gray-800">قيّم تعامل العميل</span>
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
                  {o.ratings?.restaurantToCustomer?.stars && (
                    <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
                      <span className="text-sm text-green-700">تقييمك للعميل:</span>
                      <div className="flex items-center gap-0.5">
                        {[1,2,3,4,5].map(n => (
                          <Star key={n} className={`w-4 h-4 ${n <= (o.ratings?.restaurantToCustomer?.stars || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
