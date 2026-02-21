// src/pages/SupportAdmin.tsx
// لوحة تحكم الدعم الفني للمطور/الإدمن
import React, { useState, useEffect, useRef } from 'react'
import { 
  collection, query, orderBy, onSnapshot, 
  doc, updateDoc, serverTimestamp, addDoc, where, getDoc, increment
} from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuth } from '@/auth'
import { useToast } from '@/components/ui/Toast'
import { deductPoints } from '@/utils/pointsService'
import { POINTS_CONFIG } from '@/types'
import { 
  Headphones, Send, Loader2, MessageCircle, Clock, 
  CheckCircle, User, AlertTriangle, ChevronRight,
  Search, Filter, Bot, XCircle, RefreshCw, MinusCircle,
  Store, Truck, Shield
} from 'lucide-react'

interface SupportChat {
  id: string
  userId: string
  userName: string
  userRole: string
  status: 'active' | 'waiting' | 'resolved' | 'closed'
  subject?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  lastMessage?: string
  lastMessageAt?: any
  createdAt: any
  unreadBySupport?: number
}

interface SupportMessage {
  id: string
  chatId: string
  senderId: string
  senderName: string
  senderRole: 'user' | 'support' | 'bot'
  message: string
  createdAt: any
}

const STATUS_CONFIG = {
  waiting: { label: 'جديدة', color: 'amber', icon: Clock },
  active: { label: 'نشطة', color: 'green', icon: MessageCircle },
  resolved: { label: 'محلولة', color: 'blue', icon: CheckCircle },
  closed: { label: 'مغلقة', color: 'gray', icon: XCircle },
}

const PRIORITY_CONFIG = {
  urgent: { label: 'عاجل', color: 'red' },
  high: { label: 'مرتفع', color: 'orange' },
  medium: { label: 'متوسط', color: 'amber' },
  low: { label: 'منخفض', color: 'green' },
}

export const SupportAdmin: React.FC = () => {
  const { user } = useAuth()
  const toast = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [chats, setChats] = useState<SupportChat[]>([])
  const [selectedChat, setSelectedChat] = useState<SupportChat | null>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [inputText, setInputText] = useState('')
  const [filter, setFilter] = useState<'all' | 'waiting' | 'active'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // جلب جميع المحادثات
  useEffect(() => {
    const q = query(
      collection(db, 'supportChats'),
      orderBy('lastMessageAt', 'desc')
    )

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as SupportChat))
      setChats(data)
      setLoading(false)
    })

    return () => unsub()
  }, [])

  // جلب رسائل المحادثة المحددة
  useEffect(() => {
    if (!selectedChat?.id) return

    const q = query(
      collection(db, 'supportChats', selectedChat.id, 'messages'),
      orderBy('createdAt', 'asc')
    )

    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as SupportMessage))
      setMessages(msgs)
      
      // تحديث القراءة
      if (selectedChat.unreadBySupport && selectedChat.unreadBySupport > 0) {
        updateDoc(doc(db, 'supportChats', selectedChat.id), {
          unreadBySupport: 0
        })
      }
    })

    setTimeout(() => inputRef.current?.focus(), 100)
    return () => unsub()
  }, [selectedChat?.id])

  // التمرير للأسفل
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // إرسال رد
  const sendReply = async () => {
    if (!inputText.trim() || !selectedChat?.id || sending) return

    setSending(true)

    try {
      await addDoc(collection(db, 'supportChats', selectedChat.id, 'messages'), {
        chatId: selectedChat.id,
        senderId: user?.uid,
        senderName: 'فريق الدعم',
        senderRole: 'support',
        message: inputText.trim(),
        createdAt: serverTimestamp(),
      })

      await updateDoc(doc(db, 'supportChats', selectedChat.id), {
        status: 'active',
        lastMessage: inputText.trim(),
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        unreadByUser: increment(1),
      })

      setInputText('')
      toast.success('تم إرسال الرد')
    } catch (err) {
      toast.error('فشل إرسال الرد')
    } finally {
      setSending(false)
    }
  }

  // تغيير حالة المحادثة
  const updateChatStatus = async (status: 'active' | 'resolved' | 'closed') => {
    if (!selectedChat?.id) return

    await updateDoc(doc(db, 'supportChats', selectedChat.id), {
      status,
      updatedAt: serverTimestamp()
    })

    setSelectedChat({ ...selectedChat, status })
    toast.success('تم تحديث الحالة')
  }

  // نافذة خصم النقاط
  const [showPenaltyModal, setShowPenaltyModal] = useState(false)
  const [penaltyTarget, setPenaltyTarget] = useState<'restaurant' | 'courier'>('restaurant')
  const [penaltyTargetId, setPenaltyTargetId] = useState('')
  const [penaltyTargetName, setPenaltyTargetName] = useState('')
  const [penaltyAmount, setPenaltyAmount] = useState(10)
  const [penaltyReason, setPenaltyReason] = useState('')
  const [processingPenalty, setProcessingPenalty] = useState(false)

  // تأكيد الشكوى وخصم النقاط
  const confirmComplaintAndDeduct = async () => {
    if (!penaltyTargetId || !penaltyReason || penaltyAmount <= 0) {
      toast.error('يرجى ملء جميع البيانات')
      return
    }

    setProcessingPenalty(true)

    try {
      const result = await deductPoints(
        penaltyTargetId,
        penaltyTarget,
        penaltyAmount,
        penaltyReason,
        {
          ticketId: selectedChat?.id,
          adminId: user?.uid
        }
      )

      if (result.success) {
        // إرسال رسالة في المحادثة
        if (selectedChat?.id) {
          await addDoc(collection(db, 'supportChats', selectedChat.id, 'messages'), {
            chatId: selectedChat.id,
            senderId: 'system',
            senderName: 'النظام',
            senderRole: 'bot',
            message: `✅ تم تأكيد الشكوى وخصم ${penaltyAmount} نقطة من ${penaltyTarget === 'restaurant' ? 'الأسرة' : 'المندوب'}.\n\n${result.isSuspended ? '⛔ تم إيقاف الحساب تلقائياً!' : result.isWarning ? '⚠️ تنبيه: النقاط منخفضة!' : ''}`,
            createdAt: serverTimestamp(),
          })
        }

        toast.success(result.message)
        
        if (result.isSuspended) {
          toast.error('⛔ تم إيقاف الحساب تلقائياً!')
        }

        setShowPenaltyModal(false)
        setPenaltyReason('')
        setPenaltyAmount(10)
      } else {
        toast.error(result.message)
      }
    } catch (err) {
      toast.error('حدث خطأ في خصم النقاط')
    } finally {
      setProcessingPenalty(false)
    }
  }

  // تصفية المحادثات
  const filteredChats = chats.filter(chat => {
    if (filter === 'waiting' && chat.status !== 'waiting') return false
    if (filter === 'active' && chat.status !== 'active') return false
    if (searchQuery && !chat.userName.includes(searchQuery) && !chat.subject?.includes(searchQuery)) return false
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
        <Headphones className="w-8 h-8 text-sky-500" />
        إدارة الدعم الفني
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* قائمة المحادثات */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* البحث والفلترة */}
          <div className="p-4 border-b border-gray-100 space-y-3">
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث..."
                className="w-full pr-10 pl-4 py-2 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
            </div>
            <div className="flex gap-2">
              {(['all', 'waiting', 'active'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                    filter === f ? 'bg-sky-100 text-sky-700' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {f === 'all' ? 'الكل' : f === 'waiting' ? 'جديدة' : 'نشطة'}
                  {f === 'waiting' && (
                    <span className="mr-1 px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-xs">
                      {chats.filter(c => c.status === 'waiting').length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* قائمة المحادثات */}
          <div className="max-h-[500px] overflow-y-auto divide-y divide-gray-100">
            {filteredChats.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>لا توجد محادثات</p>
              </div>
            ) : (
              filteredChats.map((chat) => {
                const statusConfig = STATUS_CONFIG[chat.status]
                const StatusIcon = statusConfig.icon
                
                return (
                  <button
                    key={chat.id}
                    onClick={() => setSelectedChat(chat)}
                    className={`w-full p-4 text-right hover:bg-gray-50 transition ${
                      selectedChat?.id === chat.id ? 'bg-sky-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User className="w-5 h-5 text-gray-400" />
                        <span className="font-bold text-gray-800">{chat.userName}</span>
                      </div>
                      {chat.unreadBySupport ? (
                        <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                          {chat.unreadBySupport}
                        </span>
                      ) : null}
                    </div>
                    
                    <p className="text-sm text-gray-500 truncate mb-2">{chat.lastMessage || chat.subject}</p>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                        ${statusConfig.color === 'amber' ? 'bg-amber-100 text-amber-700' : ''}
                        ${statusConfig.color === 'green' ? 'bg-green-100 text-green-700' : ''}
                        ${statusConfig.color === 'blue' ? 'bg-blue-100 text-blue-700' : ''}
                        ${statusConfig.color === 'gray' ? 'bg-gray-100 text-gray-700' : ''}
                      `}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </span>
                      <span className="text-gray-400">
                        {chat.lastMessageAt?.toDate?.().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) || ''}
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* منطقة المحادثة */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg overflow-hidden flex flex-col" style={{ minHeight: '600px' }}>
          {!selectedChat ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>اختر محادثة للرد عليها</p>
              </div>
            </div>
          ) : (
            <>
              {/* هيدر المحادثة */}
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                      <User className="w-5 h-5" />
                      {selectedChat.userName}
                    </h3>
                    <p className="text-sm text-gray-500">{selectedChat.subject}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateChatStatus('resolved')}
                      className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition"
                    >
                      ✅ تم الحل
                    </button>
                    <button
                      onClick={() => updateChatStatus('closed')}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition"
                    >
                      إغلاق
                    </button>
                  </div>
                </div>
                
                {/* أزرار خصم النقاط */}
                <div className="flex gap-2 pt-3 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setPenaltyTarget('restaurant')
                      setPenaltyTargetName('الأسرة')
                      setShowPenaltyModal(true)
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition"
                  >
                    <Store className="w-4 h-4" />
                    خصم من الأسرة ⛔
                  </button>
                  <button
                    onClick={() => {
                      setPenaltyTarget('courier')
                      setPenaltyTargetName('المندوب')
                      setShowPenaltyModal(true)
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-orange-100 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-200 transition"
                  >
                    <Truck className="w-4 h-4" />
                    خصم من المندوب ⛔
                  </button>
                </div>
              </div>

              {/* الرسائل */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.senderRole === 'support' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%]`}>
                      {msg.senderRole !== 'support' && (
                        <div className="flex items-center gap-2 mb-1">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            msg.senderRole === 'bot' ? 'bg-purple-100' : 'bg-gray-200'
                          }`}>
                            {msg.senderRole === 'bot' ? (
                              <Bot className="w-4 h-4 text-purple-600" />
                            ) : (
                              <User className="w-4 h-4 text-gray-600" />
                            )}
                          </div>
                          <span className="text-xs text-gray-500">{msg.senderName}</span>
                        </div>
                      )}
                      
                      <div
                        className={`rounded-2xl px-4 py-3 ${
                          msg.senderRole === 'support'
                            ? 'bg-sky-500 text-white rounded-bl-md'
                            : msg.senderRole === 'bot'
                            ? 'bg-purple-50 text-gray-800 border border-purple-100 rounded-br-md'
                            : 'bg-white text-gray-800 border border-gray-200 rounded-br-md'
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm">{msg.message}</p>
                      </div>
                      
                      <p className={`text-xs text-gray-400 mt-1 ${msg.senderRole === 'support' ? 'text-left' : 'text-right'}`}>
                        {msg.createdAt?.toDate?.().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) || ''}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* حقل الإدخال */}
              <div className="p-4 border-t border-gray-100">
                <div className="flex gap-3">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendReply()}
                    placeholder="اكتب ردك هنا..."
                    className="flex-1 px-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300"
                    disabled={sending}
                  />
                  <button
                    onClick={sendReply}
                    disabled={!inputText.trim() || sending}
                    className="px-6 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl font-medium transition disabled:opacity-50"
                  >
                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
                
                {/* ردود سريعة */}
                <div className="flex gap-2 mt-3 flex-wrap">
                  {[
                    'شكراً لتواصلك معنا',
                    'سنتحقق من الموضوع',
                    'تم حل المشكلة',
                    'يرجى مشاركة المزيد من التفاصيل',
                  ].map((quick, i) => (
                    <button
                      key={i}
                      onClick={() => setInputText(quick)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-sky-100 text-gray-600 hover:text-sky-700 rounded-full text-sm transition"
                    >
                      {quick}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* إحصائيات سريعة */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-amber-50 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-amber-600">{chats.filter(c => c.status === 'waiting').length}</p>
          <p className="text-sm text-amber-700">بانتظار الرد</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{chats.filter(c => c.status === 'active').length}</p>
          <p className="text-sm text-green-700">نشطة</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{chats.filter(c => c.status === 'resolved').length}</p>
          <p className="text-sm text-blue-700">محلولة</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-gray-600">{chats.length}</p>
          <p className="text-sm text-gray-700">إجمالي</p>
        </div>
      </div>

      {/* نافذة خصم النقاط */}
      {showPenaltyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <MinusCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">تأكيد الشكوى وخصم النقاط</h3>
                <p className="text-sm text-gray-500">خصم نقاط من {penaltyTargetName}</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* معرف الهدف */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  معرف {penaltyTargetName} (UID)
                </label>
                <input
                  type="text"
                  value={penaltyTargetId}
                  onChange={(e) => setPenaltyTargetId(e.target.value)}
                  placeholder="أدخل UID..."
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-400 focus:outline-none"
                />
              </div>

              {/* عدد النقاط */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  عدد النقاط المخصومة
                </label>
                <div className="flex gap-2">
                  {[5, 10, 15, 20].map((n) => (
                    <button
                      key={n}
                      onClick={() => setPenaltyAmount(n)}
                      className={`flex-1 py-2 rounded-lg font-bold transition ${
                        penaltyAmount === n 
                          ? 'bg-red-500 text-white' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      -{n}
                    </button>
                  ))}
                </div>
              </div>

              {/* سبب الخصم */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  سبب الخصم
                </label>
                <select
                  value={penaltyReason}
                  onChange={(e) => setPenaltyReason(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-400 focus:outline-none"
                >
                  <option value="">اختر السبب...</option>
                  <option value="جودة الطعام سيئة">جودة الطعام سيئة</option>
                  <option value="تأخير في التسليم">تأخير في التسليم</option>
                  <option value="سوء الخدمة">سوء الخدمة</option>
                  <option value="طلب خاطئ">طلب خاطئ</option>
                  <option value="سوء التغليف">سوء التغليف</option>
                  <option value="مشكلة نظافة">مشكلة نظافة</option>
                  <option value="عدم الحضور">عدم الحضور</option>
                  <option value="سوء التعامل">سوء التعامل</option>
                  <option value="شكوى أخرى">شكوى أخرى</option>
                </select>
              </div>

              {/* تحذير */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-sm text-amber-800">
                  ⚠️ <strong>تنبيه:</strong> إذا وصلت النقاط أقل من {POINTS_CONFIG.SUSPENSION_THRESHOLD} سيتم إيقاف الحساب تلقائياً!
                </p>
              </div>

              {/* الأزرار */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={confirmComplaintAndDeduct}
                  disabled={processingPenalty || !penaltyTargetId || !penaltyReason}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {processingPenalty ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <MinusCircle className="w-5 h-5" />
                      تأكيد وخصم النقاط
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowPenaltyModal(false)}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SupportAdmin
