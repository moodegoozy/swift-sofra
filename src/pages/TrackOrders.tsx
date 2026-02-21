// src/pages/TrackOrders.tsx
import React, { useEffect, useState } from 'react'
import { collection, getDocs, onSnapshot, orderBy, query, where, limit, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuth } from '@/auth'
import { useCart } from '@/hooks/useCart'
import { Order, Rating } from '@/types'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, Package, MapPin, Truck, CheckCircle, Clock, ChefHat, XCircle, Store, CreditCard, Building2, Copy, X, Headphones, Star, RefreshCw } from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { RatingModal } from '@/components/RatingModal'
import { OrderTimer } from '@/components/OrderTimer'

export const TrackOrders: React.FC = () => {
  const { user } = useAuth()
  const nav = useNavigate()
  const toast = useToast()
  const { clear, add } = useCart() // سلة المشتريات لإعادة الطلب
  const [err, setErr] = useState<string | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [diag, setDiag] = useState<{ uid: string; fallbackCount: number; sample: any[] } | null>(null)
  
  // حالة عرض بيانات البنك
  const [showPaymentModal, setShowPaymentModal] = useState<string | null>(null) // orderId
  const [bankInfo, setBankInfo] = useState<{ bankName?: string; bankAccountName?: string; bankAccountNumber?: string } | null>(null)
  const [loadingBank, setLoadingBank] = useState(false)

  // حالة التقييم
  const [ratingModal, setRatingModal] = useState<{
    isOpen: boolean;
    orderId: string;
    type: 'restaurant' | 'courier';
    targetName: string;
  } | null>(null)

  // جلب بيانات البنك للمطعم من subcollection المحمي
  const fetchBankInfo = async (restaurantId: string, orderId: string) => {
    setLoadingBank(true)
    setShowPaymentModal(orderId)
    try {
      // محاولة جلب من subcollection المحمي أولاً
      const bankSnap = await getDoc(doc(db, 'restaurants', restaurantId, 'private', 'bankInfo'))
      if (bankSnap.exists()) {
        const data = bankSnap.data() as any
        setBankInfo({
          bankName: data.bankName || '',
          bankAccountName: data.bankAccountName || '',
          bankAccountNumber: data.bankAccountNumber || '',
        })
      } else {
        // fallback للبيانات القديمة في document المطعم (للتوافق مع البيانات السابقة)
        const rSnap = await getDoc(doc(db, 'restaurants', restaurantId))
        if (rSnap.exists()) {
          const data = rSnap.data() as any
          setBankInfo({
            bankName: data.bankName || '',
            bankAccountName: data.bankAccountName || '',
            bankAccountNumber: data.bankAccountNumber || '',
          })
        } else {
          setBankInfo(null)
        }
      }
    } catch (e) {
      toast.error('تعذر جلب بيانات الدفع')
      setBankInfo(null)
    } finally {
      setLoadingBank(false)
    }
  }

  // نسخ رقم الحساب
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('تم نسخ رقم الحساب! 📋')
  }

  useEffect(() => {
    if (!user) return
    setErr(null)
    setDiag(null)

    // الاستعلام الأساسي: customerId + orderBy(createdAt)
    const q1 = query(
      collection(db, 'orders'),
      where('customerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    )

    // نحاول الاشتراك.. لو صار خطأ فهرس، نطيح على فولبّاك
    const unsub = onSnapshot(
      q1,
      snap => {
        setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)))
        setErr(null)
      },
      async (e) => {
        console.error('TrackOrders onSnapshot error:', e)
        setErr('⚠️ احتمال تحتاج Composite Index لـ customerId + createdAt. بنعرض البيانات بدون ترتيب مؤقتًا.')

        // فولبّاك بدون orderBy (ما يحتاج فهرس مركب)
        const q2 = query(
          collection(db, 'orders'),
          where('customerId', '==', user.uid)
        )
        const s2 = await getDocs(q2)
        const list = s2.docs.map(d => ({ id: d.id, ...d.data() } as Order))

        // تشخيص سريع: نعرض عينة من أحدث 5 طلبات عامة
        const q3 = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(5))
        let sample: any[] = []
        try {
          const s3 = await getDocs(q3)
          sample = s3.docs.map(d => {
            const data = d.data() as any
            return {
              id: d.id,
              customerId: data.customerId,
              restaurantId: data.restaurantId,
              createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
            }
          })
        } catch {}

        setDiag({
          uid: user.uid,
          fallbackCount: list.length,
          sample,
        })
        setOrders(list)
      }
    )

    return () => unsub()
  }, [user])

  // 🔄 إعادة الطلب - نسخ العناصر للسلة والانتقال للمتجر
  const reorder = (order: Order) => {
    // مسح السلة الحالية
    clear()
    
    // إضافة كل عناصر الطلب السابق للسلة
    order.items?.forEach(item => {
      add({
        id: item.id,
        name: item.name,
        price: item.price,
        ownerId: item.ownerId || order.restaurantId
      }, item.qty)
    })
    
    toast.success('تمت إضافة العناصر للسلة! 🛒')
    
    // الانتقال لصفحة قائمة المطعم للتعديل إن أراد
    if (order.restaurantId) {
      nav(`/menu?restaurant=${order.restaurantId}`)
    } else {
      nav('/cart')
    }
  }

  // ❌ إلغاء الطلب من قِبل العميل (فقط قبل القبول)
  const [cancellingOrder, setCancellingOrder] = useState<string | null>(null)
  
  const cancelOrder = async (order: Order) => {
    if (order.status !== 'pending') {
      toast.error('لا يمكن إلغاء الطلب بعد قبوله')
      return
    }
    
    const confirmed = window.confirm('هل أنت متأكد من إلغاء الطلب؟')
    if (!confirmed) return
    
    setCancellingOrder(order.id)
    
    try {
      // تحديث حالة الطلب للإلغاء
      await updateDoc(doc(db, 'orders', order.id), {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
        cancelledBy: 'customer',
        updatedAt: serverTimestamp()
      })
      
      // استرداد المبالغ تلقائياً
      const { processOrderRefund, notifyRefundParties } = await import('@/utils/refundService')
      const refundResult = await processOrderRefund({
        id: order.id,
        customerId: order.customerId,
        restaurantId: order.restaurantId || '',
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
        restaurantId: order.restaurantId || '',
        subtotal: order.subtotal,
        total: order.total,
      }, refundResult, 'customer')
      
      if (refundResult.details.customerRefunded > 0) {
        toast.success(`تم إلغاء الطلب واسترداد ${refundResult.details.customerRefunded.toFixed(2)} ر.س لمحفظتك ✅`)
      } else {
        toast.success('تم إلغاء الطلب بنجاح ✅')
      }
    } catch (err) {
      console.error('خطأ في إلغاء الطلب:', err)
      toast.error('فشل في إلغاء الطلب')
    } finally {
      setCancellingOrder(null)
    }
  }

  const badge = (s: string) => {
    const map: Record<string, { text: string; emoji: string; color: string; icon: any }> = {
      pending: { text: 'قيد المراجعة', emoji: '⏳', color: 'bg-yellow-500', icon: Clock },
      accepted: { text: 'تم القبول', emoji: '✅', color: 'bg-blue-500', icon: CheckCircle },
      preparing: { text: 'قيد التحضير', emoji: '👨‍🍳', color: 'bg-orange-500', icon: ChefHat },
      ready: { text: 'جاهز للتسليم', emoji: '📦', color: 'bg-purple-500', icon: Package },
      out_for_delivery: { text: 'في الطريق', emoji: '🚗', color: 'bg-sky-500', icon: Truck },
      delivered: { text: 'تم التسليم', emoji: '🎉', color: 'bg-green-500', icon: CheckCircle },
      cancelled: { text: 'ملغي', emoji: '❌', color: 'bg-red-500', icon: XCircle },
    }
    return map[s] || { text: s, emoji: '📦', color: 'bg-gray-500', icon: Package }
  }

  // التحقق إذا كان الطلب يسمح بالمحادثة
  // 1. مع المندوب: إذا كان الطلب في الطريق ويوجد مندوب
  // 2. مع المطعم: إذا كان الطلب قيد التحضير أو جاهز ولا يوجد مندوب
  const canChatWithCourier = (order: Order) => {
    return order.courierId && order.status === 'out_for_delivery'
  }
  
  const canChatWithRestaurant = (order: Order) => {
    const activeStatuses = ['pending', 'accepted', 'preparing', 'ready']
    return !order.courierId && order.restaurantId && activeStatuses.includes(order.status)
  }
  
  const canChat = (order: Order) => {
    return canChatWithCourier(order) || canChatWithRestaurant(order)
  }

  // التحقق إذا كان الطلب يحتاج دفع (pending أو accepted)
  const needsPayment = (order: Order) => {
    return ['pending', 'accepted'].includes(order.status)
  }

  // التحقق إذا كان الطلب يحتاج تقييم
  const needsRating = (order: Order) => {
    if (order.status !== 'delivered') return false
    // التحقق من عدم وجود تقييم مسبق
    const hasRatedRestaurant = order.ratings?.customerToRestaurant?.stars
    const hasRatedCourier = order.ratings?.customerToCourier?.stars
    // إذا يوجد مندوب، يجب تقييم كلاهما
    if (order.courierId) {
      return !hasRatedRestaurant || !hasRatedCourier
    }
    // إذا لا يوجد مندوب، يجب تقييم المطعم فقط
    return !hasRatedRestaurant
  }

  // التحقق من التقييم المطلوب التالي
  const getNextRatingNeeded = (order: Order): 'restaurant' | 'courier' | null => {
    if (order.status !== 'delivered') return null
    if (!order.ratings?.customerToRestaurant?.stars) return 'restaurant'
    if (order.courierId && !order.ratings?.customerToCourier?.stars) return 'courier'
    return null
  }

  // إرسال التقييم
  const submitRating = async (orderId: string, type: 'restaurant' | 'courier', rating: { stars: number; comment: string }) => {
    const order = orders.find(o => o.id === orderId)
    if (!order) return

    const ratingData: Rating = {
      stars: rating.stars,
      comment: rating.comment || undefined,
      createdAt: new Date()
    }

    const fieldPath = type === 'restaurant' ? 'ratings.customerToRestaurant' : 'ratings.customerToCourier'
    
    // تحديث الطلب بالتقييم
    const updateData: any = {
      [fieldPath]: ratingData,
      updatedAt: serverTimestamp()
    }

    // التحقق إذا اكتمل التقييم
    const currentRatings = order.ratings || {}
    if (type === 'restaurant') {
      currentRatings.customerToRestaurant = ratingData
    } else {
      currentRatings.customerToCourier = ratingData
    }

    // التحقق من اكتمال كل التقييمات المطلوبة
    const hasRatedRestaurant = currentRatings.customerToRestaurant?.stars
    const hasRatedCourier = currentRatings.customerToCourier?.stars
    
    if (order.courierId) {
      // يوجد مندوب، يجب تقييم كلاهما
      if (hasRatedRestaurant && hasRatedCourier) {
        updateData.ratingCompleted = true
      }
    } else {
      // لا يوجد مندوب، يكفي تقييم المطعم
      if (hasRatedRestaurant) {
        updateData.ratingCompleted = true
      }
    }

    await updateDoc(doc(db, 'orders', orderId), updateData)

    // تحديث متوسط تقييم المطعم
    if (type === 'restaurant' && order.restaurantId) {
      await updateRestaurantRating(order.restaurantId, rating.stars)
    }

    toast.success('شكراً لتقييمك! ⭐')
  }

  // تحديث متوسط تقييم المطعم
  const updateRestaurantRating = async (restaurantId: string, newRating: number) => {
    try {
      const restDoc = await getDoc(doc(db, 'restaurants', restaurantId))
      if (restDoc.exists()) {
        const data = restDoc.data()
        const currentRating = data.averageRating || 0
        const totalRatings = data.totalRatings || 0 // عدد التقييمات (وليس الطلبات)
        
        // حساب المتوسط الجديد بشكل صحيح
        const newAverage = totalRatings > 0
          ? ((currentRating * totalRatings) + newRating) / (totalRatings + 1)
          : newRating

        await updateDoc(doc(db, 'restaurants', restaurantId), {
          averageRating: Math.round(newAverage * 10) / 10,
          totalRatings: totalRatings + 1, // زيادة عدد التقييمات
          updatedAt: serverTimestamp()
        })
      }
    } catch (err) {
      console.error('Error updating restaurant rating:', err)
    }
  }

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">طلباتي</h1>

      {/* نافذة التقييم */}
      {ratingModal && (
        <RatingModal
          isOpen={ratingModal.isOpen}
          onClose={() => setRatingModal(null)}
          onSubmit={async (rating) => {
            await submitRating(ratingModal.orderId, ratingModal.type, rating)
            setRatingModal(null)
          }}
          type={ratingModal.type}
          targetName={ratingModal.targetName}
          orderId={ratingModal.orderId}
        />
      )}

      {/* نافذة بيانات الدفع */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPaymentModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* رأس النافذة */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-6 h-6" />
                  <h2 className="text-lg font-bold">إتمام الدفع</h2>
                </div>
                <button onClick={() => setShowPaymentModal(null)} className="p-1 hover:bg-white/20 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5">
              {loadingBank ? (
                <div className="text-center py-8">
                  <div className="w-10 h-10 border-3 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-gray-500">جارِ التحميل...</p>
                </div>
              ) : bankInfo && bankInfo.bankName && bankInfo.bankAccountNumber ? (
                <div className="space-y-4">
                  <p className="text-sm text-gray-600 bg-amber-50 p-3 rounded-xl">
                    💰 حوّل المبلغ على الحساب البنكي التالي ثم أبلغ صاحب المطعم
                  </p>

                  {/* بيانات البنك */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-xs text-gray-500">البنك</p>
                        <p className="font-bold text-gray-800">{bankInfo.bankName}</p>
                      </div>
                    </div>

                    <div className="border-t pt-3">
                      <p className="text-xs text-gray-500">اسم صاحب الحساب</p>
                      <p className="font-bold text-gray-800">{bankInfo.bankAccountName}</p>
                    </div>

                    <div className="border-t pt-3">
                      <p className="text-xs text-gray-500">رقم الآيبان / الحساب</p>
                      <div className="flex items-center gap-2">
                        <p className="font-mono font-bold text-gray-800 flex-1 text-left" dir="ltr">
                          {bankInfo.bankAccountNumber}
                        </p>
                        <button
                          onClick={() => copyToClipboard(bankInfo.bankAccountNumber || '')}
                          className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* المبلغ المطلوب */}
                  {orders.find(o => o.id === showPaymentModal) && (
                    <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-center">
                      <p className="text-sm text-green-600 mb-1">المبلغ المطلوب تحويله</p>
                      <p className="text-3xl font-black text-green-700">
                        {orders.find(o => o.id === showPaymentModal)?.total?.toFixed(2)} ر.س
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 text-center">
                    ⚠️ بعد التحويل، تواصل مع المطعم لتأكيد الدفع
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Building2 className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 font-semibold mb-2">لم يتم إضافة بيانات الحساب البنكي</p>
                  <p className="text-sm text-gray-500">يرجى التواصل مع المطعم مباشرة لمعرفة طريقة الدفع</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {err && (
        <div className="text-xs bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-xl p-3">
          {err}
          {diag && (
            <div className="mt-1">
              <div>UID: <b>{diag.uid}</b></div>
              <div>عدد نتائج الفولبّاك: <b>{diag.fallbackCount}</b></div>
              {Array.isArray(diag.sample) && diag.sample.length > 0 && (
                <div className="mt-1">
                  <div className="font-semibold">عينة (أحدث 5):</div>
                  {diag.sample.map((x) => (
                    <div key={x.id} className="truncate">
                      #{x.id} • customerId: {String(x.customerId)} • restaurantId: {String(x.restaurantId)} • createdAt: {x.createdAt || '—'}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {orders.map((o) => (
        <div key={o.id} className="bg-white rounded-2xl shadow-card overflow-hidden hover:shadow-lg transition-shadow">
          {/* رأس الطلب مع الحالة */}
          <div className={`${badge(o.status).color} px-4 py-3 flex items-center justify-between`}>
            <div className="flex items-center gap-2 text-white">
              <span className="text-xl">{badge(o.status).emoji}</span>
              <span className="font-bold">{badge(o.status).text}</span>
            </div>
            <div className="text-white/80 text-sm font-medium">
              #{o.id.slice(-6)}
            </div>
          </div>

          <div className="p-4">
            {o.restaurantName && (
              <div className="flex items-center gap-2 text-primary font-semibold mb-2">
                <span>🍽️</span>
                <span>{String(o.restaurantName)}</span>
              </div>
            )}

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
            {o.status === 'out_for_delivery' && (
              <div className="mb-3">
                <OrderTimer order={o} type="delivery" />
              </div>
            )}

            <div className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 mb-3">
              {o.items?.map((i) => `${i.name}×${i.qty}`).join(' • ')}
            </div>

            {/* تفاصيل التوصيل */}
            <div className="text-sm text-gray-600 space-y-2">
              {o.deliveryType === 'pickup' ? (
                <div className="flex items-center gap-2 text-green-600 font-medium bg-green-50 rounded-xl p-3">
                  <MapPin className="w-4 h-4" />
                  <span>استلام من المطعم</span>
                </div>
              ) : (
                <div className="space-y-1 bg-gray-50 rounded-xl p-3">
                  <div className="flex justify-between">
                    <span>المبلغ الأساسي:</span>
                    <span>{o.subtotal?.toFixed?.(2) || '—'} ر.س</span>
                  </div>
                  <div className="flex justify-between">
                    <span>رسوم التوصيل:</span>
                    {o.deliveryFee !== undefined && o.deliveryFee > 0 ? (
                      <span className="font-medium">{o.deliveryFee?.toFixed?.(2)} ر.س</span>
                    ) : (
                      <span className="text-amber-600">بانتظار تحديد المطعم</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 pt-3 border-t space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-bold text-lg text-primary">
                  الإجمالي: {o.total?.toFixed?.(2)} ر.س
                </div>
              </div>

              {/* زر إتمام الدفع - يظهر للطلبات الجديدة */}
              {needsPayment(o) && o.restaurantId && (
                <button
                  onClick={() => fetchBankInfo(o.restaurantId!, o.id)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 
                             text-white rounded-xl font-bold shadow-lg hover:shadow-xl 
                             hover:scale-[1.02] transition-all duration-200"
                >
                  <CreditCard className="w-5 h-5" />
                  <span>إتمام الدفع 💳</span>
                </button>
              )}

              {/* ❌ زر إلغاء الطلب - يظهر فقط للطلبات قيد المراجعة */}
              {o.status === 'pending' && (
                <button
                  onClick={() => cancelOrder(o)}
                  disabled={cancellingOrder === o.id}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 
                             text-white rounded-xl font-bold shadow-lg hover:shadow-xl 
                             hover:scale-[1.02] transition-all duration-200 disabled:opacity-50"
                >
                  {cancellingOrder === o.id ? (
                    <>
                      <Clock className="w-5 h-5 animate-spin" />
                      <span>جاري الإلغاء...</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-5 h-5" />
                      <span>إلغاء الطلب ❌</span>
                    </>
                  )}
                </button>
              )}

              {/* نظام التقييم الإجباري - يظهر للطلبات المكتملة التي تحتاج تقييم */}
              {needsRating(o) && (
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                    <span className="font-bold text-amber-800">قيّم تجربتك ⭐</span>
                  </div>
                  <p className="text-sm text-amber-700 mb-4">
                    ساعدنا في تحسين الخدمة بتقييمك
                  </p>
                  
                  <div className="space-y-2">
                    {/* تقييم الأسرة */}
                    {!o.ratings?.customerToRestaurant?.stars && (
                      <button
                        onClick={() => setRatingModal({
                          isOpen: true,
                          orderId: o.id,
                          type: 'restaurant',
                          targetName: o.restaurantName || 'الأسرة المنتجة'
                        })}
                        className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-amber-300 
                                   rounded-xl hover:bg-amber-50 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <Store className="w-5 h-5 text-amber-600" />
                          <span className="font-medium text-gray-800">قيّم الأسرة المنتجة</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {[1,2,3,4,5].map(n => (
                            <Star key={n} className="w-4 h-4 text-gray-300 group-hover:text-amber-400 transition" />
                          ))}
                        </div>
                      </button>
                    )}

                    {/* تقييم المندوب (إذا كان موجود) */}
                    {o.courierId && !o.ratings?.customerToCourier?.stars && (
                      <button
                        onClick={() => setRatingModal({
                          isOpen: true,
                          orderId: o.id,
                          type: 'courier',
                          targetName: 'المندوب'
                        })}
                        className="w-full flex items-center justify-between px-4 py-3 bg-white border-2 border-emerald-300 
                                   rounded-xl hover:bg-emerald-50 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <Truck className="w-5 h-5 text-emerald-600" />
                          <span className="font-medium text-gray-800">قيّم المندوب</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {[1,2,3,4,5].map(n => (
                            <Star key={n} className="w-4 h-4 text-gray-300 group-hover:text-emerald-400 transition" />
                          ))}
                        </div>
                      </button>
                    )}
                  </div>

                  {/* عرض التقييمات المكتملة */}
                  {(o.ratings?.customerToRestaurant?.stars || o.ratings?.customerToCourier?.stars) && (
                    <div className="mt-3 pt-3 border-t border-amber-200 space-y-2">
                      {o.ratings?.customerToRestaurant?.stars && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">تقييم الأسرة:</span>
                          <div className="flex items-center gap-1">
                            {[1,2,3,4,5].map(n => (
                              <Star key={n} className={`w-4 h-4 ${n <= o.ratings!.customerToRestaurant!.stars ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
                            ))}
                          </div>
                        </div>
                      )}
                      {o.ratings?.customerToCourier?.stars && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">تقييم المندوب:</span>
                          <div className="flex items-center gap-1">
                            {[1,2,3,4,5].map(n => (
                              <Star key={n} className={`w-4 h-4 ${n <= o.ratings!.customerToCourier!.stars ? 'text-emerald-400 fill-emerald-400' : 'text-gray-300'}`} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* عرض التقييم المكتمل للطلبات السابقة */}
              {o.status === 'delivered' && o.ratingCompleted && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">تم تقييم الطلب ✅</span>
                  </div>
                </div>
              )}

              {/* 🔄 زر إعادة الطلب - للطلبات المكتملة أو الملغية */}
              {(o.status === 'delivered' || o.status === 'cancelled') && o.items && o.items.length > 0 && (
                <button
                  onClick={() => reorder(o)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 
                             bg-gradient-to-r from-sky-500 to-sky-600 
                             text-white rounded-xl font-bold shadow-lg 
                             hover:shadow-xl hover:scale-[1.02] 
                             transition-all duration-200"
                >
                  <RefreshCw className="w-5 h-5" />
                  <span>🔄 إعادة الطلب</span>
                </button>
              )}

              <div className="flex gap-2">
                {/* زر المحادثة مع المندوب */}
                {canChatWithCourier(o) && (
                  <button
                    onClick={() => nav(`/chat?orderId=${o.id}`)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-accent 
                               text-white rounded-full font-medium shadow-lg hover:shadow-xl 
                               hover:scale-105 transition-all duration-200 animate-pulse"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>تواصل مع المندوب 🚗</span>
                  </button>
                )}
                
                {/* زر المحادثة مع المطعم (إذا لم يكن هناك مندوب) */}
                {canChatWithRestaurant(o) && (
                  <button
                    onClick={() => nav(`/chat?orderId=${o.id}`)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 
                               text-white rounded-full font-medium shadow-lg hover:shadow-xl 
                               hover:scale-105 transition-all duration-200"
                  >
                    <Store className="w-5 h-5" />
                    <span>تواصل مع المطعم 🍽️</span>
                  </button>
                )}

                {/* زر الشكوى / الدعم الفني */}
                <button
                  onClick={() => nav(`/support?orderId=${o.id}`)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 
                             text-white rounded-full font-medium shadow-lg hover:shadow-xl 
                             hover:scale-105 transition-all duration-200"
                  title="تقديم شكوى أو طلب دعم"
                >
                  <Headphones className="w-5 h-5" />
                  <span>شكوى</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {orders.length === 0 && !err && (
        <div className="text-gray-600">لا توجد طلبات حتى الآن.</div>
      )}
    </div>
  )
}
