// src/pages/OrdersAdmin.tsx
import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { collection, doc, onSnapshot, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '@/firebase'
import { useAuth } from '@/auth'
import { useNavigate } from 'react-router-dom'
import { MessageCircle, Star, User, Camera, Loader2, CheckCircle, Image, Volume2, VolumeX, ShoppingBag, Store, Package } from 'lucide-react'
import { RatingModal } from '@/components/RatingModal'
import { useToast } from '@/components/ui/Toast'
import { Rating } from '@/types'
import { playNotificationWithVibrate, initNotificationSound } from '@/utils/notificationSound'

type Order = any

// ✅ ترجمة الحالات
const badge = (s: string) => {
  const map: Record<string, string> = {
    pending: '⏳ قيد المراجعة',
    accepted: '✅ تم القبول',
    preparing: '👨‍🍳 قيد التحضير',
    ready: '📦 جاهز',
    out_for_delivery: '🚚 في الطريق',
    delivered: '🎉 تم التسليم',
    cancelled: '❌ ملغي',
  }
  return map[s] || s
}

// ✅ ألوان الحالات
const statusColor = (s: string) => {
  switch (s) {
    case 'pending': return 'bg-gray-200 text-gray-800'
    case 'accepted': return 'bg-blue-200 text-blue-800'
    case 'preparing': return 'bg-yellow-200 text-yellow-800'
    case 'ready': return 'bg-purple-200 text-purple-800'
    case 'out_for_delivery': return 'bg-indigo-200 text-indigo-800'
    case 'delivered': return 'bg-green-200 text-green-800'
    case 'cancelled': return 'bg-red-200 text-red-800'
    default: return 'bg-gray-100 text-gray-700'
  }
}

export const OrdersAdmin: React.FC = () => {
  const { user } = useAuth()
  const nav = useNavigate()
  const toast = useToast()
  const [orders, setOrders] = useState<Order[]>([]) // طلبات العملاء الواردة
  const [myOrders, setMyOrders] = useState<Order[]>([]) // طلباتي كعميل
  const [activeTab, setActiveTab] = useState<'incoming' | 'my_orders'>('incoming') // التبويب النشط
  const [error, setError] = useState<string | null>(null)
  const [deliveryFees, setDeliveryFees] = useState<Record<string, number>>({})
  
  // حالة التقييم
  const [ratingModal, setRatingModal] = useState<{
    isOpen: boolean;
    orderId: string;
    customerName: string;
  } | null>(null)
  
  // حالة رفع صورة الطلب
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // 🔊 صوت الإشعارات
  const [soundEnabled, setSoundEnabled] = useState(true)
  const previousOrderIdsRef = useRef<Set<string>>(new Set())
  const isFirstLoadRef = useRef(true)

  const restaurantUid = useMemo(() => user?.uid ?? null, [user])
  
  // تهيئة صوت الإشعارات
  useEffect(() => {
    initNotificationSound()
  }, [])

  useEffect(() => {
    if (!restaurantUid) return
    setError(null)

    const unsub = onSnapshot(
      collection(db, 'orders'),
      (snap) => {
        const all = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
        const mine = all.filter((o: any) => {
          const r1 = o.restaurantId === restaurantUid
          const r2 = o?.items?.[0]?.ownerId === restaurantUid
          return r1 || r2
        })

        mine.sort((a: any, b: any) => {
          const ta = a.createdAt?.toMillis?.() ?? 0
          const tb = b.createdAt?.toMillis?.() ?? 0
          return tb - ta
        })
        
        // 🔊 اكتشاف الطلبات الجديدة وتشغيل الصوت
        if (!isFirstLoadRef.current && soundEnabled) {
          const currentIds = new Set(mine.map((o: any) => o.id))
          const previousIds = previousOrderIdsRef.current
          
          // البحث عن طلبات جديدة (pending)
          for (const order of mine) {
            if (!previousIds.has(order.id) && order.status === 'pending') {
              console.log('🔔 طلب جديد!', order.id)
              playNotificationWithVibrate()
              toast.success('🔔 طلب جديد!')
              break // صوت واحد فقط حتى لو وصل أكثر من طلب
            }
          }
        }
        
        // تحديث قائمة IDs السابقة
        previousOrderIdsRef.current = new Set(mine.map((o: any) => o.id))
        isFirstLoadRef.current = false

        setOrders(mine)
        setError(null)
      },
      (err) => {
        console.error('Firestore error:', err)
        setError('حدثت مشكلة في جلب الطلبات.')
      }
    )

    return () => unsub()
  }, [restaurantUid, soundEnabled, toast])

  // 📦 جلب طلباتي كعميل (من مطاعم أخرى)
  useEffect(() => {
    if (!restaurantUid) return

    const unsub = onSnapshot(
      collection(db, 'orders'),
      (snap) => {
        const all = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
        // طلباتي كعميل = حيث أنا الـ customerId
        const myCustomerOrders = all.filter((o: any) => o.customerId === restaurantUid)

        myCustomerOrders.sort((a: any, b: any) => {
          const ta = a.createdAt?.toMillis?.() ?? 0
          const tb = b.createdAt?.toMillis?.() ?? 0
          return tb - ta
        })

        setMyOrders(myCustomerOrders)
      },
      (err) => {
        console.error('Firestore error (my orders):', err)
      }
    )

    return () => unsub()
  }, [restaurantUid])

  const updateStatus = async (id: string, status: string, order?: any) => {
    const updates: any = { 
      status, 
      updatedAt: serverTimestamp()
    }
    
    // عند القبول، نضيف رسوم التوصيل ونحدث الإجمالي
    if (status === 'accepted' && order?.deliveryType === 'delivery') {
      const fee = deliveryFees[id] || 0
      updates.deliveryFee = fee
      updates.total = (order.subtotal || 0) + fee
    }
    
    // عند الإلغاء، نسجل الوقت ومن ألغى
    if (status === 'cancelled') {
      updates.cancelledAt = serverTimestamp()
      updates.cancelledBy = 'owner'
    }
    
    await updateDoc(doc(db, 'orders', id), updates)

    // 💰 استرداد تلقائي عند الإلغاء
    if (status === 'cancelled' && order) {
      try {
        const { processOrderRefund, notifyRefundParties } = await import('@/utils/refundService')
        const refundResult = await processOrderRefund({
          id: order.id || id,
          customerId: order.customerId,
          restaurantId: order.restaurantId || restaurantUid || '',
          subtotal: order.subtotal,
          total: order.total,
          restaurantEarnings: order.restaurantEarnings,
          platformFee: order.platformFee,
          adminCommission: order.adminCommission,
          appEarnings: order.appEarnings,
          referredBy: order.referredBy,
          paymentMethod: order.paymentMethod,
        })
        
        // إشعار الأطراف
        await notifyRefundParties({
          id: order.id || id,
          customerId: order.customerId,
          restaurantId: order.restaurantId || restaurantUid || '',
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

    // 🔔 إرسال إشعارات حسب الحالة الجديدة
    try {
      const { 
        notifyOrderAccepted, 
        notifyOrderPreparing, 
        notifyOrderReady,
        notifyCourierOrderReady 
      } = await import('@/utils/notificationService')
      
      const customerId = order?.customerId
      const restaurantName = order?.restaurantName || 'المطعم'
      
      if (customerId) {
        if (status === 'accepted') {
          await notifyOrderAccepted(customerId, id, restaurantName)
        } else if (status === 'preparing') {
          await notifyOrderPreparing(customerId, id, restaurantName)
        } else if (status === 'ready') {
          await notifyOrderReady(customerId, id, restaurantName, order?.deliveryType || 'delivery')
          
          // ✅ إشعار المناديب المعتمدين عند جاهزية الطلب للتوصيل
          if (order?.deliveryType === 'delivery' && restaurantUid) {
            const { collection, query, where, getDocs } = await import('firebase/firestore')
            const hiringQuery = query(
              collection(db, 'hiringRequests'),
              where('restaurantId', '==', restaurantUid),
              where('status', '==', 'accepted')
            )
            const hiringSnap = await getDocs(hiringQuery)
            const customerAddress = order?.address || 'العميل'
            
            for (const docSnap of hiringSnap.docs) {
              const courierId = docSnap.data().courierId
              if (courierId) {
                await notifyCourierOrderReady(courierId, id, restaurantName, customerAddress)
              }
            }
          }
        }
      }
    } catch (notifErr) {
      console.warn('⚠️ تعذر إرسال الإشعار:', notifErr)
    }
  }

  // إرسال تقييم العميل من الأسرة
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

    toast.success('تم تقييم العميل بنجاح! ⭐')
  }

  // التحقق إذا كان الطلب يحتاج تقييم للعميل
  const needsCustomerRating = (order: any) => {
    return order.status === 'delivered' && !order.ratings?.restaurantToCustomer?.stars
  }

  // رفع صورة الطلب الجاهز
  const uploadOrderPhoto = async (orderId: string, file: File) => {
    if (!file) return
    
    setUploadingPhoto(orderId)
    
    try {
      // رفع الصورة إلى Firebase Storage
      const storageRef = ref(storage, `orders/${orderId}/ready_${Date.now()}.jpg`)
      await uploadBytes(storageRef, file)
      const photoUrl = await getDownloadURL(storageRef)
      
      // تحديث الطلب بالصورة
      await updateDoc(doc(db, 'orders', orderId), {
        readyPhotoUrl: photoUrl,
        readyPhotoAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      
      toast.success('تم رفع صورة الطلب بنجاح! 📸')
    } catch (error) {
      console.error('Error uploading photo:', error)
      toast.error('حدث خطأ في رفع الصورة')
    } finally {
      setUploadingPhoto(null)
    }
  }

  // معالجة اختيار الصورة
  const handlePhotoSelect = (orderId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      uploadOrderPhoto(orderId, file)
    }
  }

  return (
    <div className="space-y-6">
      {/* العنوان مع زر التحكم بالصوت */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-yellow-500">📋 إدارة الطلبات</h1>
        
        {/* 🔊 زر التحكم بصوت الإشعارات */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
            soundEnabled 
              ? 'bg-sky-100 text-sky-700 hover:bg-sky-200' 
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
          title={soundEnabled ? 'إيقاف صوت الإشعارات' : 'تفعيل صوت الإشعارات'}
        >
          {soundEnabled ? (
            <>
              <Volume2 className="w-5 h-5" />
              <span className="text-sm hidden sm:inline">الصوت مفعّل</span>
            </>
          ) : (
            <>
              <VolumeX className="w-5 h-5" />
              <span className="text-sm hidden sm:inline">الصوت مغلق</span>
            </>
          )}
        </button>
      </div>

      {/* 📑 التبويبات */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('incoming')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold transition-all ${
            activeTab === 'incoming'
              ? 'bg-white text-sky-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Store className="w-5 h-5" />
          <span>طلبات العملاء</span>
          {orders.filter(o => o.status === 'pending').length > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full animate-pulse">
              {orders.filter(o => o.status === 'pending').length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('my_orders')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold transition-all ${
            activeTab === 'my_orders'
              ? 'bg-white text-amber-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <ShoppingBag className="w-5 h-5" />
          <span>طلباتي</span>
          {myOrders.length > 0 && (
            <span className="bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
              {myOrders.length}
            </span>
          )}
        </button>
      </div>

      {/* نافذة التقييم */}
      {ratingModal && (
        <RatingModal
          isOpen={ratingModal.isOpen}
          onClose={() => setRatingModal(null)}
          onSubmit={async (rating) => {
            await submitCustomerRating(ratingModal.orderId, rating)
            setRatingModal(null)
          }}
          type="customer"
          targetName={ratingModal.customerName}
          orderId={ratingModal.orderId}
        />
      )}

      {error && <div className="text-red-500 text-sm mb-2">{error}</div>}

      {/* ========== تبويب: طلبات العملاء ========== */}
      {activeTab === 'incoming' && (
        <>
          {orders.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow">
              <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-semibold">لا توجد طلبات من العملاء حالياً</p>
            </div>
          ) : (
            orders.map((o: any) => (
        <div 
          key={o.id} 
          className="bg-white rounded-2xl shadow-xl p-5 text-gray-900 space-y-4 transition hover:shadow-2xl"
        >
          {/* 🧾 رأس الطلب */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="font-bold text-lg">
              طلب #{o.id.slice(-6)} 
              <span className="text-gray-500 text-sm ml-2">
                {o.items?.map((i:any)=>`${i.name}×${i.qty}`).join(' • ')}
              </span>
            </div>
            <div className="font-extrabold text-xl text-green-600">{o.total?.toFixed?.(2)} ر.س</div>
          </div>

          {/* 📌 الحالة الحالية */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">الحالة:</span>
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${statusColor(o.status)}`}>
              {badge(o.status || 'pending')}
            </span>
          </div>

          {/* 🏠 العنوان */}
          <div className="text-sm text-gray-700">
            <span className="font-semibold">العنوان:</span> {o.address}
          </div>

          {/* 🗺️ موقع العميل على الخريطة */}
          {o.location && (
            <div className="mt-3">
              <h3 className="font-semibold text-sm text-gray-800 mb-2">📍 موقع العميل:</h3>
              <iframe
                title={`map-${o.id}`}
                width="100%"
                height="250"
                style={{ borderRadius: '12px' }}
                loading="lazy"
                allowFullScreen
                src={`https://www.google.com/maps?q=${o.location.lat},${o.location.lng}&hl=ar&z=15&output=embed`}
              ></iframe>
            </div>
          )}

          {/* � إدخال رسوم التوصيل للطلبات الجديدة */}
          {o.status === 'pending' && o.deliveryType === 'delivery' && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <label className="block text-sm font-bold text-amber-800 mb-2">
                💵 حدد رسوم التوصيل قبل القبول:
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="مثال: 10"
                  value={deliveryFees[o.id] || ''}
                  onChange={(e) => setDeliveryFees(prev => ({ ...prev, [o.id]: parseFloat(e.target.value) || 0 }))}
                  className="flex-1 px-4 py-3 border-2 border-amber-300 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-lg font-bold text-center"
                />
                <span className="text-amber-700 font-bold">ر.س</span>
              </div>
              <p className="text-xs text-amber-600 mt-2">سيتم إضافتها للإجمالي عند قبول الطلب</p>
            </div>
          )}

          {/* عرض رسوم التوصيل المحددة */}
          {o.deliveryFee !== undefined && o.deliveryFee > 0 && (
            <div className="text-sm text-gray-700">
              <span className="font-semibold">رسوم التوصيل:</span> {o.deliveryFee?.toFixed?.(2)} ر.س
            </div>
          )}

          {/* 📸 رفع صورة الطلب الجاهز - للطلبات قيد التحضير أو الجاهزة */}
          {['preparing', 'ready'].includes(o.status) && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Camera className="w-5 h-5 text-purple-600" />
                <span className="font-bold text-purple-800">📸 صورة الطلب الجاهز</span>
              </div>
              
              {o.readyPhotoUrl ? (
                <div className="space-y-3">
                  <div className="relative">
                    <img 
                      src={o.readyPhotoUrl} 
                      alt="صورة الطلب" 
                      className="w-full h-48 object-cover rounded-xl border-2 border-purple-300"
                    />
                    <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      تم الرفع
                    </div>
                  </div>
                  <p className="text-xs text-purple-600 text-center">
                    ✅ تم رفع صورة الطلب - يمكن للمندوب استلامه الآن
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-purple-700">
                    ⚠️ يُرجى رفع صورة الطلب قبل تسليمه للمندوب
                  </p>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handlePhotoSelect(o.id, e)}
                    className="hidden"
                    id={`photo-${o.id}`}
                  />
                  <label
                    htmlFor={`photo-${o.id}`}
                    className={`flex items-center justify-center gap-3 w-full py-4 rounded-xl cursor-pointer transition-all ${
                      uploadingPhoto === o.id 
                        ? 'bg-purple-200 cursor-wait' 
                        : 'bg-purple-500 hover:bg-purple-600 text-white'
                    }`}
                  >
                    {uploadingPhoto === o.id ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>جاري الرفع...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-5 h-5" />
                        <span className="font-bold">📸 التقط صورة الطلب</span>
                      </>
                    )}
                  </label>
                </div>
              )}
            </div>
          )}

          {/* عرض صورة الطلب للطلبات المكتملة */}
          {o.readyPhotoUrl && !['preparing', 'ready'].includes(o.status) && (
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Image className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">صورة الطلب:</span>
              </div>
              <img 
                src={o.readyPhotoUrl} 
                alt="صورة الطلب" 
                className="w-full h-32 object-cover rounded-lg"
              />
            </div>
          )}

          {/* 🔘 أزرار تغيير الحالة */}
          <div className="mt-3 grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            {/* زر المحادثة مع العميل */}
            {!o.courierId && ['pending', 'accepted', 'preparing', 'ready'].includes(o.status) && (
              <button
                onClick={() => nav(`/chat?orderId=${o.id}`)}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:shadow-lg transition flex items-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                محادثة العميل 💬
              </button>
            )}
            
            {['accepted','preparing','ready','out_for_delivery','delivered','cancelled'].map(s => {
              // منع القبول بدون تحديد رسوم التوصيل
              const needsFee = s === 'accepted' && o.status === 'pending' && o.deliveryType === 'delivery'
              const hasFee = deliveryFees[o.id] !== undefined && deliveryFees[o.id] >= 0
              const disabled = needsFee && !hasFee
              
              return (
                <button 
                  key={s} 
                  onClick={()=>updateStatus(o.id, s, o)} 
                  disabled={disabled}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${disabled ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-100 hover:bg-gray-200'}`}
                  title={disabled ? 'حدد رسوم التوصيل أولاً' : ''}
                >
                  {badge(s)}
                </button>
              )
            })}
          </div>

          {/* نظام تقييم العميل - للطلبات المكتملة */}
          {needsCustomerRating(o) && (
            <div className="mt-4 bg-gradient-to-r from-sky-50 to-blue-50 border-2 border-sky-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-5 h-5 text-sky-500 fill-sky-500" />
                <span className="font-bold text-sky-800">قيّم العميل ⭐</span>
              </div>
              <button
                onClick={() => setRatingModal({
                  isOpen: true,
                  orderId: o.id,
                  customerName: 'العميل'
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
            <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <span className="text-green-700 font-medium">تقييمك للعميل:</span>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(n => (
                    <Star key={n} className={`w-4 h-4 ${n <= o.ratings.restaurantToCustomer.stars ? 'text-sky-400 fill-sky-400' : 'text-gray-300'}`} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
            ))
          )}
        </>
      )}

      {/* ========== تبويب: طلباتي كعميل ========== */}
      {activeTab === 'my_orders' && (
        <>
          {myOrders.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl shadow">
              <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-semibold">لم تطلب من أي مطعم بعد</p>
              <p className="text-gray-400 text-sm mt-2">يمكنك تصفح المطاعم والطلب كعميل</p>
            </div>
          ) : (
            myOrders.map((o: any) => (
              <div 
                key={o.id} 
                className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-5 text-gray-900 space-y-4"
              >
                {/* 🧾 رأس الطلب */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="font-bold text-lg">
                    <span className="text-amber-600">🛒 طلبي</span> #{o.id.slice(-6)}
                  </div>
                  <div className="font-extrabold text-xl text-amber-600">{o.total?.toFixed?.(2)} ر.س</div>
                </div>

                {/* اسم المطعم */}
                <div className="flex items-center gap-2 text-gray-600">
                  <Store className="w-4 h-4" />
                  <span className="font-medium">{o.restaurantName || 'مطعم'}</span>
                </div>

                {/* الأصناف */}
                <div className="text-sm text-gray-600">
                  {o.items?.map((i: any) => `${i.name} × ${i.qty}`).join(' • ')}
                </div>

                {/* الحالة */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">الحالة:</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${statusColor(o.status)}`}>
                    {badge(o.status || 'pending')}
                  </span>
                </div>

                {/* التاريخ */}
                <div className="text-xs text-gray-400">
                  {o.createdAt?.toDate?.()?.toLocaleString?.('ar-SA') || ''}
                </div>
              </div>
            ))
          )}
        </>
      )}
    </div>
  )
}
