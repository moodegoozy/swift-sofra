// src/pages/SupportPage.tsx
import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  collection, addDoc, query, where, orderBy, 
  onSnapshot, serverTimestamp, doc, getDoc 
} from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuth } from '@/auth'
import { useToast } from '@/components/ui/Toast'
import { SupportTicket, Order } from '@/types'
import { 
  Headphones, Send, AlertTriangle, MessageSquare, 
  Lightbulb, RefreshCw, ChevronLeft, Clock, CheckCircle,
  XCircle, Loader2, Package, Store, Truck, Plus,
  Phone, Mail, FileText, Camera
} from 'lucide-react'

// أنواع التذاكر
const TICKET_TYPES = [
  { value: 'complaint', label: 'شكوى', icon: AlertTriangle, color: 'red', activeClass: 'border-red-500 bg-red-50 text-red-700' },
  { value: 'support', label: 'دعم فني', icon: Headphones, color: 'blue', activeClass: 'border-blue-500 bg-blue-50 text-blue-700' },
  { value: 'suggestion', label: 'اقتراح', icon: Lightbulb, color: 'amber', activeClass: 'border-amber-500 bg-amber-50 text-amber-700' },
  { value: 'refund', label: 'طلب استرداد', icon: RefreshCw, color: 'green', activeClass: 'border-green-500 bg-green-50 text-green-700' },
]

// حالات التذاكر
const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  open: { label: 'جديدة', color: 'blue', icon: Clock },
  in_progress: { label: 'قيد المعالجة', color: 'amber', icon: Loader2 },
  waiting_customer: { label: 'بانتظار ردك', color: 'purple', icon: MessageSquare },
  waiting_restaurant: { label: 'بانتظار رد الأسرة', color: 'orange', icon: Store },
  resolved: { label: 'تم الحل', color: 'green', icon: CheckCircle },
  closed: { label: 'مغلقة', color: 'gray', icon: XCircle },
}

export const SupportPage: React.FC = () => {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const orderId = params.get('orderId')
  const { user, role } = useAuth()
  const toast = useToast()

  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [submitting, setSubmitting] = useState(false)

  // نموذج التذكرة الجديدة
  const [form, setForm] = useState({
    type: 'complaint' as 'complaint' | 'support' | 'suggestion' | 'refund',
    subject: '',
    description: '',
    orderId: orderId || '',
    againstType: '' as '' | 'restaurant' | 'courier',
  })

  // جلب التذاكر السابقة
  useEffect(() => {
    if (!user?.uid) return

    const q = query(
      collection(db, 'supportTickets'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    )

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as SupportTicket))
      setTickets(data)
      setLoading(false)
    }, (err) => {
      console.error('Error fetching tickets:', err)
      setLoading(false)
    })

    return () => unsub()
  }, [user?.uid])

  // جلب الطلبات السابقة للعميل
  useEffect(() => {
    if (!user?.uid || role !== 'customer') return

    const q = query(
      collection(db, 'orders'),
      where('customerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    )

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order))
      setOrders(data)
      
      // إذا تم تمرير orderId في الرابط، نجلب تفاصيله
      if (orderId) {
        const order = data.find(o => o.id === orderId)
        if (order) setSelectedOrder(order)
      }
    })

    return () => unsub()
  }, [user?.uid, role, orderId])

  // إنشاء رقم تذكرة فريد
  const generateTicketNumber = () => {
    const year = new Date().getFullYear()
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    return `TKT-${year}-${random}`
  }

  // إرسال التذكرة
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.uid) return

    if (!form.subject.trim()) {
      toast.error('الرجاء كتابة عنوان للشكوى')
      return
    }
    if (!form.description.trim()) {
      toast.error('الرجاء كتابة تفاصيل المشكلة')
      return
    }

    setSubmitting(true)

    try {
      // جلب بيانات المستخدم
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      const userData = userDoc.data()

      const ticketData: Partial<SupportTicket> = {
        ticketNumber: generateTicketNumber(),
        type: form.type,
        subject: form.subject.trim(),
        description: form.description.trim(),
        userId: user.uid,
        userName: userData?.name || user.displayName || 'مستخدم',
        userEmail: userData?.email || user.email || '',
        userPhone: userData?.phone || '',
        userRole: (role as any) || 'customer',
        status: 'open',
        priority: form.type === 'complaint' ? 'high' : 'medium',
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
      }

      // إضافة بيانات الطلب إن وجد
      if (selectedOrder) {
        ticketData.orderId = selectedOrder.id
        ticketData.orderNumber = selectedOrder.id.slice(-6).toUpperCase()
        ticketData.againstRestaurantId = selectedOrder.restaurantId
        ticketData.againstRestaurantName = selectedOrder.restaurantName
        if (selectedOrder.courierId) {
          ticketData.againstCourierId = selectedOrder.courierId
        }
      }

      await addDoc(collection(db, 'supportTickets'), ticketData)

      toast.success('تم إرسال الشكوى بنجاح! سنتواصل معك قريباً')
      setForm({ type: 'complaint', subject: '', description: '', orderId: '', againstType: '' })
      setSelectedOrder(null)
      setShowForm(false)
    } catch (err) {
      console.error('Error submitting ticket:', err)
      toast.error('حدث خطأ، حاول مرة أخرى')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* الهيدر */}
      <div className="bg-gradient-to-r from-sky-600 to-sky-500 rounded-2xl p-6 mb-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
            <Headphones className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">الدعم الفني</h1>
            <p className="text-sky-100 text-sm">نحن هنا لمساعدتك</p>
          </div>
        </div>

        {/* معلومات التواصل */}
        <div className="bg-white/10 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4" />
            <span>afrtalbyt2026@gmail.com</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Phone className="w-4 h-4" />
            <span dir="ltr">0535534208</span>
          </div>
        </div>
      </div>

      {/* زر إنشاء تذكرة جديدة */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full mb-6 flex items-center justify-center gap-3 py-4 px-6 
                     bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600
                     text-white rounded-2xl font-bold shadow-lg transition-all"
        >
          <Plus className="w-6 h-6" />
          <span>تقديم شكوى / طلب دعم</span>
        </button>
      )}

      {/* نموذج إنشاء تذكرة */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-800">تذكرة جديدة</h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          {/* نوع التذكرة */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">نوع الطلب</label>
            <div className="grid grid-cols-2 gap-2">
              {TICKET_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm({ ...form, type: t.value as any })}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    form.type === t.value 
                      ? t.activeClass
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <t.icon className="w-5 h-5" />
                  <span className="font-medium">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* اختيار الطلب (للعملاء فقط) */}
          {role === 'customer' && orders.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                هل الشكوى متعلقة بطلب معين؟
              </label>
              <select
                value={selectedOrder?.id || ''}
                onChange={(e) => {
                  const order = orders.find(o => o.id === e.target.value)
                  setSelectedOrder(order || null)
                }}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500"
              >
                <option value="">-- اختر الطلب --</option>
                {orders.slice(0, 10).map((o) => (
                  <option key={o.id} value={o.id}>
                    طلب #{o.id.slice(-6).toUpperCase()} - {o.restaurantName} - {o.total} ر.س
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* تفاصيل الطلب المختار */}
          {selectedOrder && (
            <div className="mb-4 p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-5 h-5 text-sky-500" />
                <span className="font-bold">تفاصيل الطلب</span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p>🏠 الأسرة: {selectedOrder.restaurantName}</p>
                <p>💰 المبلغ: {selectedOrder.total} ر.س</p>
                <p>📊 الحالة: {selectedOrder.status}</p>
              </div>
            </div>
          )}

          {/* عنوان الشكوى */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              عنوان الشكوى / المشكلة *
            </label>
            <input
              type="text"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="مثال: تأخر في التوصيل"
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500"
              required
            />
          </div>

          {/* تفاصيل المشكلة */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              تفاصيل المشكلة *
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="اشرح المشكلة بالتفصيل..."
              rows={5}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-sky-500 resize-none"
              required
            />
          </div>

          {/* تنبيه */}
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-bold mb-1">ملاحظة مهمة:</p>
                <p>سيقوم فريق الدعم بمراجعة شكواك والتواصل مع الطرف المعني لحل المشكلة. نحن الوسيط الرسمي بينكم.</p>
              </div>
            </div>
          </div>

          {/* أزرار الإرسال */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-6 
                         bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700
                         text-white rounded-xl font-bold transition-all disabled:opacity-50"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>إرسال</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}

      {/* قائمة التذاكر السابقة */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-500" />
            تذاكري السابقة
          </h2>
        </div>

        {tickets.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Headphones className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>لا توجد تذاكر سابقة</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {tickets.map((ticket) => {
              const status = STATUS_LABELS[ticket.status] || STATUS_LABELS.open
              const StatusIcon = status.icon
              
              return (
                <div key={ticket.id} className="p-4 hover:bg-gray-50 transition">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-xs text-gray-400 font-mono">{ticket.ticketNumber}</span>
                      <h3 className="font-bold text-gray-800">{ticket.subject}</h3>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                      ${status.color === 'blue' ? 'bg-blue-100 text-blue-700' : ''}
                      ${status.color === 'amber' ? 'bg-amber-100 text-amber-700' : ''}
                      ${status.color === 'green' ? 'bg-green-100 text-green-700' : ''}
                      ${status.color === 'gray' ? 'bg-gray-100 text-gray-700' : ''}
                      ${status.color === 'purple' ? 'bg-purple-100 text-purple-700' : ''}
                      ${status.color === 'orange' ? 'bg-orange-100 text-orange-700' : ''}
                    `}>
                      <StatusIcon className="w-3 h-3" />
                      {status.label}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">{ticket.description}</p>
                  
                  {ticket.adminResponse && (
                    <div className="mt-2 p-3 bg-sky-50 rounded-lg">
                      <p className="text-xs text-sky-600 font-bold mb-1">رد الإدارة:</p>
                      <p className="text-sm text-sky-800">{ticket.adminResponse}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                    <span>
                      {ticket.createdAt && new Date((ticket.createdAt as any).toDate?.() || ticket.createdAt).toLocaleDateString('ar-SA')}
                    </span>
                    {ticket.orderId && (
                      <span className="flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        طلب #{ticket.orderId.slice(-6).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ملاحظة أسفل الصفحة */}
      <div className="mt-6 p-4 bg-gray-50 rounded-xl text-center text-sm text-gray-600">
        <p>💡 جميع الشكاوى تتم مراجعتها من قبل فريق الإدارة</p>
        <p>نحن الوسيط الرسمي بين العملاء والأسر المنتجة</p>
      </div>
    </div>
  )
}

export default SupportPage
