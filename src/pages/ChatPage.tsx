// src/pages/ChatPage.tsx
import React, { useEffect, useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { 
  collection, doc, getDoc, addDoc, onSnapshot, 
  query, orderBy, serverTimestamp, Timestamp 
} from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuth } from '@/auth'
import { useToast } from '@/components/ui/Toast'
import { 
  MessageCircle, Send, ArrowRight, Package, 
  MapPin, Clock, CheckCheck, Sparkles, Heart,
  Smile, ThumbsUp, Star, Zap, Coffee, Pizza, Store
} from 'lucide-react'

// رسائل سريعة للعميل
const QUICK_MESSAGES_CUSTOMER = [
  { text: 'أين وصلت؟ 📍', emoji: '📍' },
  { text: 'شكراً لك! 💙', emoji: '💙' },
  { text: 'خذ راحتك 😊', emoji: '😊' },
  { text: 'أنا بالانتظار ⏳', emoji: '⏳' },
  { text: 'تمام 👍', emoji: '👍' },
  { text: 'ممتاز! ⭐', emoji: '⭐' },
]

// رسائل سريعة للعميل مع المطعم
const QUICK_MESSAGES_CUSTOMER_TO_RESTAURANT = [
  { text: 'كم المدة المتوقعة؟ ⏱️', emoji: '⏱️' },
  { text: 'شكراً لكم! 💙', emoji: '💙' },
  { text: 'هل الطلب جاهز؟ 📦', emoji: '📦' },
  { text: 'أحتاج تعديل على الطلب 📝', emoji: '📝' },
  { text: 'ممتاز! ⭐', emoji: '⭐' },
  { text: 'تمام 👍', emoji: '👍' },
]

// رسائل سريعة للمندوب
const QUICK_MESSAGES_COURIER = [
  { text: 'في الطريق إليك! 🚗', emoji: '🚗' },
  { text: 'وصلت! 📍', emoji: '📍' },
  { text: 'دقائق وأوصل ⏱️', emoji: '⏱️' },
  { text: 'أحتاج تحديد الموقع 📌', emoji: '📌' },
  { text: 'اتصل بي 📞', emoji: '📞' },
  { text: 'شكراً لطلبك! 🙏', emoji: '🙏' },
]

// رسائل سريعة للمطعم
const QUICK_MESSAGES_RESTAURANT = [
  { text: 'طلبك قيد التحضير 👨‍🍳', emoji: '👨‍🍳' },
  { text: 'الطلب جاهز! 📦', emoji: '📦' },
  { text: 'المندوب في الطريق 🚗', emoji: '🚗' },
  { text: 'شكراً لطلبك! 🙏', emoji: '🙏' },
  { text: 'نعتذر عن التأخير ⏳', emoji: '⏳' },
  { text: 'تم استلام الطلب ✅', emoji: '✅' },
]

// إيموجيات للإرسال السريع
const EMOJI_PICKER = ['😊', '👍', '❤️', '🔥', '⭐', '🙏', '💪', '🎉', '☕', '🍕', '🚗', '📍']

type Message = {
  id: string
  text: string
  senderId: string
  senderRole: 'customer' | 'courier' | 'owner'
  createdAt: Timestamp | null
}

type OrderInfo = {
  id: string
  status: string
  address: string
  total: number
  customerId: string
  courierId?: string
  restaurantId?: string
  restaurantName?: string
}

export const ChatPage: React.FC = () => {
  const [params] = useSearchParams()
  const orderId = params.get('orderId')
  const nav = useNavigate()
  const { user, role } = useAuth()
  const toast = useToast()
  
  const [order, setOrder] = useState<OrderInfo | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [partnerName, setPartnerName] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const isCourier = role === 'courier'
  const isOwner = role === 'owner'
  const isCustomer = role === 'customer' || role === 'admin'
  
  // تحديد إذا كانت المحادثة مع المطعم (لا يوجد مندوب)
  const isChatWithRestaurant = order && !order.courierId && order.restaurantId
  
  // تحديد الرسائل السريعة حسب الدور ونوع المحادثة
  const getQuickMessages = () => {
    if (isCourier) return QUICK_MESSAGES_COURIER
    if (isOwner) return QUICK_MESSAGES_RESTAURANT
    if (isCustomer && isChatWithRestaurant) return QUICK_MESSAGES_CUSTOMER_TO_RESTAURANT
    return QUICK_MESSAGES_CUSTOMER
  }
  
  const quickMessages = getQuickMessages()

  // تحميل بيانات الطلب
  useEffect(() => {
    if (!orderId) return
    
    const unsub = onSnapshot(doc(db, 'orders', orderId), (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        setOrder({
          id: snap.id,
          status: data.status,
          address: data.address,
          total: data.total,
          customerId: data.customerId,
          courierId: data.courierId,
          restaurantId: data.restaurantId,
          restaurantName: data.restaurantName,
        })
      }
    })
    
    return () => unsub()
  }, [orderId])

  // تحميل اسم الطرف الآخر
  useEffect(() => {
    if (!order) return
    
    // تحديد الشريك في المحادثة
    let partnerId: string | undefined
    let partnerType: 'courier' | 'restaurant' | 'customer' = 'customer'
    
    if (isCourier) {
      // المندوب يتحدث مع العميل
      partnerId = order.customerId
      partnerType = 'customer'
    } else if (isOwner) {
      // المطعم يتحدث مع العميل
      partnerId = order.customerId
      partnerType = 'customer'
    } else if (isCustomer) {
      // العميل يتحدث مع المندوب أو المطعم
      if (order.courierId) {
        partnerId = order.courierId
        partnerType = 'courier'
      } else if (order.restaurantId) {
        partnerId = order.restaurantId
        partnerType = 'restaurant'
      }
    }
    
    if (!partnerId) {
      setPartnerName(isChatWithRestaurant ? (order.restaurantName || 'المطعم') : 'غير محدد')
      return
    }
    
    if (partnerType === 'restaurant') {
      // جلب اسم المطعم
      getDoc(doc(db, 'restaurants', partnerId)).then(snap => {
        if (snap.exists()) {
          setPartnerName(snap.data()?.name || 'المطعم')
        } else {
          setPartnerName(order.restaurantName || 'المطعم')
        }
      })
    } else {
      // جلب اسم المستخدم
      getDoc(doc(db, 'users', partnerId)).then(snap => {
        if (snap.exists()) {
          const defaultName = partnerType === 'courier' ? 'المندوب' : 'العميل'
          setPartnerName(snap.data()?.name || defaultName)
        }
      })
    }
  }, [order, isCourier, isOwner, isCustomer, isChatWithRestaurant])

  // الاستماع للرسائل
  useEffect(() => {
    if (!orderId) return
    
    const q = query(
      collection(db, 'orders', orderId, 'messages'),
      orderBy('createdAt', 'asc')
    )
    
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as Message)))
    })
    
    return () => unsub()
  }, [orderId])

  // التمرير للأسفل عند وصول رسائل جديدة
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // إرسال رسالة
  const sendMessage = async (text: string) => {
    if (!text.trim() || !user || !orderId) return
    
    setSending(true)
    try {
      // تحديد دور المرسل
      let senderRole: 'customer' | 'courier' | 'owner' = 'customer'
      if (isCourier) senderRole = 'courier'
      else if (isOwner) senderRole = 'owner'
      
      await addDoc(collection(db, 'orders', orderId, 'messages'), {
        text: text.trim(),
        senderId: user.uid,
        senderRole,
        createdAt: serverTimestamp(),
      })
      
      // 🔔 إرسال إشعار للطرف الآخر
      try {
        const { notifyNewMessage } = await import('@/utils/notificationService')
        
        // تحديد المستلم
        let recipientId: string | undefined
        let recipientType: 'customer' | 'owner' | 'courier' = 'customer'
        
        if (isCourier || isOwner) {
          // المندوب أو المطعم يرسل للعميل
          recipientId = order?.customerId
          recipientType = 'customer'
        } else if (isCustomer && order) {
          // العميل يرسل للمندوب أو المطعم
          if (order.courierId) {
            recipientId = order.courierId
            recipientType = 'courier'
          } else if (order.restaurantId) {
            recipientId = order.restaurantId
            recipientType = 'owner'
          }
        }
        
        if (recipientId) {
          const senderName = isOwner ? 'المطعم' : (isCourier ? 'المندوب' : 'العميل')
          await notifyNewMessage(
            recipientId,
            recipientType,
            senderName,
            orderId,
            text.trim()
          )
        }
      } catch (notifErr) {
        console.warn('⚠️ فشل إرسال إشعار الرسالة:', notifErr)
      }
      
      setNewMsg('')
      setShowEmoji(false)
    } catch (err) {
      toast.error('فشل إرسال الرسالة')
    }
    setSending(false)
  }

  // إضافة إيموجي للرسالة
  const addEmoji = (emoji: string) => {
    setNewMsg(prev => prev + emoji)
  }

  // تنسيق الوقت
  const formatTime = (ts: Timestamp | null) => {
    if (!ts) return ''
    const date = ts.toDate()
    return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
  }

  // حالة الطلب
  const getStatusInfo = (status: string) => {
    const map: Record<string, { text: string; color: string; emoji: string }> = {
      'pending': { text: 'قيد المراجعة', color: 'bg-yellow-500', emoji: '⏳' },
      'accepted': { text: 'تم القبول', color: 'bg-blue-500', emoji: '✅' },
      'preparing': { text: 'قيد التحضير', color: 'bg-orange-500', emoji: '👨‍🍳' },
      'ready': { text: 'جاهز', color: 'bg-purple-500', emoji: '📦' },
      'out_for_delivery': { text: 'في الطريق', color: 'bg-sky-500', emoji: '🚗' },
      'delivered': { text: 'تم التسليم', color: 'bg-green-500', emoji: '✅' },
    }
    return map[status] || { text: status, color: 'bg-gray-500', emoji: '📦' }
  }
  
  // تحديد أيقونة الشريك
  const getPartnerIcon = () => {
    if (isCourier || isOwner) return '👤' // العميل
    if (isChatWithRestaurant) return '🍽️' // المطعم
    return '🚗' // المندوب
  }

  if (!orderId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <MessageCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">لم يتم تحديد الطلب</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">جارِ التحميل...</p>
        </div>
      </div>
    )
  }

  // التحقق من الصلاحية (العميل أو المندوب أو صاحب المطعم)
  const hasAccess = user?.uid === order.customerId || 
                    user?.uid === order.courierId || 
                    user?.uid === order.restaurantId
  
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <p className="text-gray-500">ليس لديك صلاحية الوصول لهذه المحادثة</p>
        </div>
      </div>
    )
  }

  const statusInfo = getStatusInfo(order.status)

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-w-2xl mx-auto">
      {/* رأس المحادثة الفخم */}
      <div className={`bg-gradient-to-r ${isChatWithRestaurant ? 'from-orange-500 via-amber-500 to-yellow-500' : 'from-primary via-sky-500 to-accent'} rounded-t-3xl p-4 shadow-luxury`}>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => nav(-1)}
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-all"
          >
            <ArrowRight className="w-5 h-5 text-white" />
          </button>
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                <span className="text-2xl">{getPartnerIcon()}</span>
              </div>
              <div>
                <h2 className="font-bold text-white text-lg">
                  {partnerName || (isChatWithRestaurant ? 'المطعم' : (isCourier || isOwner ? 'العميل' : 'المندوب'))}
                </h2>
                <div className="flex items-center gap-1 text-white/80 text-sm">
                  <span className={`w-2 h-2 rounded-full ${order.status === 'delivered' ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
                  <span>{statusInfo.emoji} {statusInfo.text}</span>
                </div>
              </div>
            </div>
          </div>
          
          {isChatWithRestaurant ? (
            <Store className="w-6 h-6 text-white animate-pulse" />
          ) : (
            <Sparkles className="w-6 h-6 text-yellow-300 animate-pulse" />
          )}
        </div>
        
        {/* معلومات الطلب المختصرة */}
        <div className="mt-3 flex items-center gap-4 text-white/90 text-sm">
          <div className="flex items-center gap-1">
            <Package className="w-4 h-4" />
            <span>#{order.id.slice(-6)}</span>
          </div>
          {order.restaurantName && (
            <div className="flex items-center gap-1">
              <Store className="w-4 h-4" />
              <span>{order.restaurantName}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            <span className="truncate max-w-[150px]">{order.address}</span>
          </div>
        </div>
      </div>

      {/* منطقة الرسائل */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-sky-50 to-white p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-10">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-gray-500">ابدأ المحادثة الآن!</p>
            <p className="text-gray-400 text-sm mt-1">أرسل رسالة للتواصل</p>
          </div>
        )}
        
        {messages.map((msg, idx) => {
          const isMe = msg.senderId === user?.uid
          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`
                  max-w-[80%] rounded-2xl px-4 py-3 shadow-md
                  ${isMe 
                    ? 'bg-gradient-to-br from-primary to-sky-600 text-white rounded-bl-sm' 
                    : 'bg-white text-gray-800 rounded-br-sm border border-gray-100'
                  }
                  transform transition-all duration-300 hover:scale-[1.02]
                `}
              >
                <p className="text-base leading-relaxed">{msg.text}</p>
                <div className={`flex items-center gap-1 mt-1 text-xs ${isMe ? 'text-white/70' : 'text-gray-400'}`}>
                  <Clock className="w-3 h-3" />
                  <span>{formatTime(msg.createdAt)}</span>
                  {isMe && <CheckCheck className="w-3 h-3 mr-1" />}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* رسائل سريعة */}
      <div className="bg-white border-t border-gray-100 px-3 py-2">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {quickMessages.map((qm, idx) => (
            <button
              key={idx}
              onClick={() => sendMessage(qm.text)}
              className="flex-shrink-0 px-4 py-2 bg-gradient-to-r from-sky-50 to-blue-50 
                         rounded-full text-sm text-primary font-medium border border-sky-100
                         hover:from-sky-100 hover:to-blue-100 hover:shadow-md 
                         transition-all duration-200 active:scale-95"
            >
              {qm.text}
            </button>
          ))}
        </div>
      </div>

      {/* لوحة الإيموجي */}
      {showEmoji && (
        <div className="bg-white border-t border-gray-100 px-4 py-3">
          <div className="flex flex-wrap gap-2 justify-center">
            {EMOJI_PICKER.map((emoji, idx) => (
              <button
                key={idx}
                onClick={() => addEmoji(emoji)}
                className="w-10 h-10 text-2xl hover:bg-gray-100 rounded-full 
                           transition-all duration-200 hover:scale-125 active:scale-95"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* حقل الإدخال الفخم */}
      <div className="bg-white border-t border-gray-200 p-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEmoji(!showEmoji)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all
                       ${showEmoji ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <Smile className="w-5 h-5" />
          </button>
          
          <div className="flex-1 relative">
            <input
              type="text"
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage(newMsg)}
              placeholder="اكتب رسالتك..."
              className="w-full px-5 py-3 bg-gray-100 rounded-full text-gray-800 
                         placeholder-gray-400 focus:outline-none focus:ring-2 
                         focus:ring-primary/50 focus:bg-white transition-all"
            />
          </div>
          
          <button
            onClick={() => sendMessage(newMsg)}
            disabled={!newMsg.trim() || sending}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all
                       ${newMsg.trim() 
                         ? 'bg-gradient-to-r from-primary to-accent text-white shadow-lg hover:shadow-xl hover:scale-105' 
                         : 'bg-gray-200 text-gray-400'
                       }
                       disabled:opacity-50 active:scale-95`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* تم التسليم */}
      {order.status === 'delivered' && (
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-white">
            <CheckCheck className="w-6 h-6" />
            <span className="font-bold">تم تسليم الطلب بنجاح! 🎉</span>
            <Heart className="w-5 h-5 text-red-300 animate-pulse" />
          </div>
          <p className="text-white/80 text-sm mt-1">شكراً لاستخدامك تطبيقنا ⭐</p>
        </div>
      )}
    </div>
  )
}
