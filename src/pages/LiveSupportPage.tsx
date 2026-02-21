// src/pages/LiveSupportPage.tsx
// نظام الدعم الفني المباشر - محادثة في الوقت الفعلي
import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  collection, addDoc, query, where, orderBy, 
  onSnapshot, serverTimestamp, doc, updateDoc, limit, getDocs, increment
} from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuth } from '@/auth'
import { useToast } from '@/components/ui/Toast'
import { 
  Headphones, Send, ChevronRight, Loader2, 
  MessageCircle, Clock, CheckCircle, Bot,
  User, Paperclip, Image, AlertTriangle,
  Sparkles, HelpCircle, Phone, X
} from 'lucide-react'

// أنواع الرسائل
type MessageType = 'user' | 'support' | 'system' | 'bot'

interface SupportMessage {
  id?: string
  chatId: string
  senderId: string
  senderName: string
  senderRole: 'user' | 'support' | 'bot'
  message: string
  type: MessageType
  createdAt: any
  read?: boolean
  imageUrl?: string
}

interface SupportChat {
  id?: string
  userId: string
  userName: string
  userRole: string
  userPhone?: string
  status: 'active' | 'waiting' | 'resolved' | 'closed'
  subject?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assignedTo?: string
  lastMessage?: string
  lastMessageAt?: any
  createdAt: any
  updatedAt: any
  unreadByUser?: number
  unreadBySupport?: number
}

// الردود الآلية السريعة
const AUTO_REPLIES = [
  {
    keywords: ['مرحبا', 'السلام', 'هلا', 'اهلا'],
    reply: 'أهلاً وسهلاً! 👋 كيف يمكنني مساعدتك اليوم؟'
  },
  {
    keywords: ['طلب', 'متأخر', 'تأخر', 'وين الطلب'],
    reply: 'نعتذر عن التأخير! هل يمكنك إخباري برقم الطلب لمتابعته؟'
  },
  {
    keywords: ['الغاء', 'الغي', 'ألغي', 'رجع فلوسي'],
    reply: 'سأساعدك في إلغاء الطلب. ما رقم الطلب؟ وما سبب الإلغاء؟'
  },
  {
    keywords: ['شكرا', 'مشكور', 'تسلم'],
    reply: 'العفو! سعيدين بخدمتك 🌟 هل تحتاج أي مساعدة أخرى؟'
  }
]

// الأسئلة الشائعة
const FAQ_ITEMS = [
  { q: 'كيف ألغي طلبي؟', icon: '❌' },
  { q: 'أين طلبي الآن؟', icon: '📍' },
  { q: 'مشكلة في الدفع', icon: '💳' },
  { q: 'شكوى على الأسرة', icon: '🏠' },
  { q: 'شكوى على المندوب', icon: '🚗' },
  { q: 'أخرى', icon: '💬' },
]

export const LiveSupportPage: React.FC = () => {
  const nav = useNavigate()
  const { user, role } = useAuth()
  const toast = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // الحالات
  const [chat, setChat] = useState<SupportChat | null>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [inputText, setInputText] = useState('')
  const [showFAQ, setShowFAQ] = useState(true)
  const [typing, setTyping] = useState(false)

  // جلب أو إنشاء المحادثة
  useEffect(() => {
    if (!user?.uid) return

    const initChat = async () => {
      // البحث عن محادثة نشطة
      const q = query(
        collection(db, 'supportChats'),
        where('userId', '==', user.uid),
        where('status', 'in', ['active', 'waiting']),
        limit(1)
      )

      const snap = await getDocs(q)
      
      if (!snap.empty) {
        // محادثة موجودة
        const chatData = { id: snap.docs[0].id, ...snap.docs[0].data() } as SupportChat
        setChat(chatData)
        setShowFAQ(false)
      }
      
      setLoading(false)
    }

    initChat()
  }, [user?.uid])

  // الاستماع للرسائل
  useEffect(() => {
    if (!chat?.id) return

    const q = query(
      collection(db, 'supportChats', chat.id, 'messages'),
      orderBy('createdAt', 'asc')
    )

    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as SupportMessage))
      setMessages(msgs)
      
      // تحديث القراءة
      if (msgs.some(m => !m.read && m.senderRole === 'support')) {
        updateDoc(doc(db, 'supportChats', chat.id!), {
          unreadByUser: 0
        })
      }
    })

    return () => unsub()
  }, [chat?.id])

  // التمرير للأسفل عند الرسائل الجديدة
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  // إنشاء محادثة جديدة
  const startNewChat = async (subject?: string) => {
    if (!user?.uid) return

    try {
      const chatData: Partial<SupportChat> = {
        userId: user.uid,
        userName: user.displayName || 'مستخدم',
        userRole: role || 'customer',
        status: 'waiting',
        subject: subject || 'استفسار عام',
        priority: 'medium',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        unreadByUser: 0,
        unreadBySupport: 1,
      }

      const docRef = await addDoc(collection(db, 'supportChats'), chatData)
      const newChat = { id: docRef.id, ...chatData } as SupportChat
      setChat(newChat)
      setShowFAQ(false)

      // إرسال رسالة ترحيبية
      await addDoc(collection(db, 'supportChats', docRef.id, 'messages'), {
        chatId: docRef.id,
        senderId: 'bot',
        senderName: 'مساعد سفرة البيت',
        senderRole: 'bot',
        message: `مرحباً ${user.displayName || 'عزيزي العميل'}! 👋\n\nأنا مساعدك الآلي. أخبرني بمشكلتك وسأحاول مساعدتك، أو سيتواصل معك فريق الدعم خلال دقائق.\n\n${subject ? `موضوع الاستفسار: ${subject}` : ''}`,
        type: 'bot',
        createdAt: serverTimestamp(),
        read: false,
      })

      // تركيز حقل الإدخال
      setTimeout(() => inputRef.current?.focus(), 100)

    } catch (err) {
      console.error('Error starting chat:', err)
      toast.error('حدث خطأ، حاول مرة أخرى')
    }
  }

  // إرسال رسالة
  const sendMessage = async (text?: string) => {
    const messageText = text || inputText.trim()
    if (!messageText || !chat?.id || sending) return

    setSending(true)
    setInputText('')

    try {
      // إضافة رسالة المستخدم
      await addDoc(collection(db, 'supportChats', chat.id, 'messages'), {
        chatId: chat.id,
        senderId: user?.uid,
        senderName: user?.displayName || 'مستخدم',
        senderRole: 'user',
        message: messageText,
        type: 'user',
        createdAt: serverTimestamp(),
        read: false,
      })

      // تحديث المحادثة
      await updateDoc(doc(db, 'supportChats', chat.id), {
        lastMessage: messageText,
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        unreadBySupport: increment(1),
      })

      // رد آلي ذكي
      setTimeout(async () => {
        setTyping(true)
        
        // البحث عن رد مناسب
        const autoReply = AUTO_REPLIES.find(ar => 
          ar.keywords.some(k => messageText.toLowerCase().includes(k))
        )

        await new Promise(r => setTimeout(r, 1500)) // تأخير طبيعي

        if (autoReply) {
          await addDoc(collection(db, 'supportChats', chat.id!, 'messages'), {
            chatId: chat.id,
            senderId: 'bot',
            senderName: 'مساعد سفرة البيت',
            senderRole: 'bot',
            message: autoReply.reply,
            type: 'bot',
            createdAt: serverTimestamp(),
            read: false,
          })
        }

        setTyping(false)
      }, 500)

    } catch (err) {
      console.error('Error sending message:', err)
      toast.error('فشل إرسال الرسالة')
    } finally {
      setSending(false)
    }
  }

  // إغلاق المحادثة
  const closeChat = async () => {
    if (!chat?.id) return
    
    await updateDoc(doc(db, 'supportChats', chat.id), {
      status: 'closed',
      updatedAt: serverTimestamp()
    })

    setChat(null)
    setMessages([])
    setShowFAQ(true)
    toast.success('تم إغلاق المحادثة')
  }

  // التحميل
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-sky-500 mx-auto mb-3" />
          <p className="text-gray-500">جاري التحميل...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto h-[calc(100vh-120px)] flex flex-col">
      {/* الهيدر */}
      <div className="bg-gradient-to-r from-sky-600 via-sky-500 to-blue-500 rounded-t-2xl p-4 text-white flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Headphones className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold">الدعم الفني</h1>
              <p className="text-sky-100 text-sm flex items-center gap-1">
                {chat?.status === 'active' ? (
                  <>
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    متصل الآن
                  </>
                ) : chat?.status === 'waiting' ? (
                  <>
                    <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
                    بانتظار الدعم
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                    متاح للمساعدة
                  </>
                )}
              </p>
            </div>
          </div>
          
          {chat && (
            <button
              onClick={closeChat}
              className="p-2 hover:bg-white/20 rounded-full transition"
              title="إغلاق المحادثة"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* منطقة المحادثة */}
      <div className="flex-1 bg-gradient-to-b from-gray-50 to-white overflow-y-auto p-4 space-y-4">
        
        {/* شاشة البداية - الأسئلة الشائعة */}
        {showFAQ && !chat && (
          <div className="space-y-6 py-4">
            {/* رسالة ترحيبية */}
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">كيف يمكننا مساعدتك؟</h2>
              <p className="text-gray-500 text-sm">اختر موضوعاً أو ابدأ محادثة مباشرة</p>
            </div>

            {/* الأسئلة الشائعة */}
            <div className="grid grid-cols-2 gap-3">
              {FAQ_ITEMS.map((item, i) => (
                <button
                  key={i}
                  onClick={() => startNewChat(item.q)}
                  className="flex items-center gap-3 p-4 bg-white rounded-xl border-2 border-gray-100 
                             hover:border-sky-300 hover:shadow-md transition-all text-right"
                >
                  <span className="text-2xl">{item.icon}</span>
                  <span className="font-medium text-gray-700 text-sm">{item.q}</span>
                </button>
              ))}
            </div>

            {/* زر البدء المباشر */}
            <button
              onClick={() => startNewChat()}
              className="w-full flex items-center justify-center gap-3 py-4 px-6 
                         bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700
                         text-white rounded-2xl font-bold shadow-lg transition-all"
            >
              <MessageCircle className="w-6 h-6" />
              <span>ابدأ محادثة مع الدعم</span>
            </button>

            {/* معلومات إضافية */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <p className="text-amber-800 text-sm">
                ⏰ فريق الدعم متاح على مدار الساعة
              </p>
              <p className="text-amber-600 text-xs mt-1">
                متوسط وقت الرد: أقل من 5 دقائق
              </p>
            </div>
          </div>
        )}

        {/* الرسائل */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.senderRole === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] ${msg.senderRole === 'user' ? 'order-1' : 'order-2'}`}>
              {/* أفاتار للدعم/البوت */}
              {msg.senderRole !== 'user' && (
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    msg.senderRole === 'bot' ? 'bg-purple-100' : 'bg-sky-100'
                  }`}>
                    {msg.senderRole === 'bot' ? (
                      <Bot className="w-4 h-4 text-purple-600" />
                    ) : (
                      <Headphones className="w-4 h-4 text-sky-600" />
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{msg.senderName}</span>
                </div>
              )}
              
              {/* الرسالة */}
              <div
                className={`rounded-2xl px-4 py-3 ${
                  msg.senderRole === 'user'
                    ? 'bg-gradient-to-r from-sky-500 to-blue-500 text-white rounded-br-md'
                    : msg.senderRole === 'bot'
                    ? 'bg-purple-50 text-gray-800 border border-purple-100 rounded-bl-md'
                    : 'bg-white text-gray-800 border border-gray-200 shadow-sm rounded-bl-md'
                }`}
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.message}</p>
              </div>
              
              {/* الوقت */}
              <p className={`text-xs text-gray-400 mt-1 ${msg.senderRole === 'user' ? 'text-left' : 'text-right'}`}>
                {msg.createdAt?.toDate?.().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) || ''}
              </p>
            </div>
          </div>
        ))}

        {/* مؤشر الكتابة */}
        {typing && (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4 text-purple-600" />
            </div>
            <div className="bg-gray-100 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* حقل الإدخال */}
      {chat && (
        <div className="bg-white border-t border-gray-200 p-4 rounded-b-2xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="اكتب رسالتك هنا..."
              className="flex-1 px-4 py-3 bg-gray-100 rounded-xl border-2 border-transparent 
                       focus:border-sky-300 focus:bg-white focus:outline-none transition"
              disabled={sending}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!inputText.trim() || sending}
              className="w-12 h-12 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-700
                       text-white rounded-xl flex items-center justify-center transition-all
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          
          {/* رسائل سريعة */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {['أين طلبي؟', 'أريد إلغاء الطلب', 'تحدث مع موظف'].map((quick, i) => (
              <button
                key={i}
                onClick={() => sendMessage(quick)}
                disabled={sending}
                className="flex-shrink-0 px-3 py-1.5 bg-gray-100 hover:bg-sky-100 
                         text-gray-600 hover:text-sky-700 rounded-full text-sm transition"
              >
                {quick}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default LiveSupportPage
