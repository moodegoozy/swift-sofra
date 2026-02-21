import React, { useEffect, useState } from 'react'
import { useAuth } from '@/auth'
import { db } from '@/firebase'
import { 
  collection, query, where, orderBy, onSnapshot, 
  updateDoc, deleteDoc, doc, Timestamp 
} from 'firebase/firestore'
import { 
  Bell, Check, Trash2, AlertCircle, RefreshCw, ArrowRight,
  Package, Truck, Tag, MapPin, Sparkles, CheckCircle
} from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { useNavigate } from 'react-router-dom'
import { SmartNotificationType } from '@/utils/notificationService'

type Notification = {
  id: string
  type: SmartNotificationType | string
  recipientId: string
  recipientType: string
  restaurantId?: string
  restaurantName?: string
  title: string
  message: string
  read: boolean
  actionUrl?: string
  actionType?: 'order' | 'restaurant' | 'menu_item'
  priority?: 'high' | 'normal' | 'low'
  createdAt: Timestamp
}

// أيقونات وألوان حسب نوع الإشعار
const notificationStyles: Record<string, { icon: React.ReactNode; bgColor: string; textColor: string }> = {
  order_ready: { 
    icon: <Package className="w-5 h-5" />, 
    bgColor: 'bg-green-100', 
    textColor: 'text-green-600' 
  },
  order_delivered: { 
    icon: <CheckCircle className="w-5 h-5" />, 
    bgColor: 'bg-emerald-100', 
    textColor: 'text-emerald-600' 
  },
  order_accepted: { 
    icon: <Check className="w-5 h-5" />, 
    bgColor: 'bg-blue-100', 
    textColor: 'text-blue-600' 
  },
  courier_assigned: { 
    icon: <Truck className="w-5 h-5" />, 
    bgColor: 'bg-sky-100', 
    textColor: 'text-sky-600' 
  },
  nearby_offer: { 
    icon: <MapPin className="w-5 h-5" />, 
    bgColor: 'bg-purple-100', 
    textColor: 'text-purple-600' 
  },
  discount: { 
    icon: <Tag className="w-5 h-5" />, 
    bgColor: 'bg-rose-100', 
    textColor: 'text-rose-600' 
  },
  new_menu_item: { 
    icon: <Sparkles className="w-5 h-5" />, 
    bgColor: 'bg-amber-100', 
    textColor: 'text-amber-600' 
  },
  default: { 
    icon: <Bell className="w-5 h-5" />, 
    bgColor: 'bg-gray-100', 
    textColor: 'text-gray-600' 
  },
}

export const NotificationsPage: React.FC = () => {
  const { user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', user.uid),
      orderBy('createdAt', 'desc')
    )

    const unsub = onSnapshot(q, (snap) => {
      const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Notification[]
      setNotifications(notifs)
      setLoading(false)
    }, (err) => {
      console.error('Error fetching notifications:', err)
      setLoading(false)
    })

    return () => unsub()
  }, [user])

  const markAsRead = async (notifId: string) => {
    try {
      await updateDoc(doc(db, 'notifications', notifId), { read: true })
    } catch (err) {
      console.error('Error marking as read:', err)
    }
  }

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.read)
    try {
      await Promise.all(unread.map(n => 
        updateDoc(doc(db, 'notifications', n.id), { read: true })
      ))
      toast.success('تم تحديد الكل كمقروء')
    } catch (err) {
      toast.error('فشل تحديث الإشعارات')
    }
  }

  const deleteNotification = async (notifId: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', notifId))
      toast.success('تم حذف الإشعار')
    } catch (err) {
      toast.error('فشل حذف الإشعار')
    }
  }

  const formatDate = (timestamp: Timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate()
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'الآن'
    if (minutes < 60) return `منذ ${minutes} دقيقة`
    if (hours < 24) return `منذ ${hours} ساعة`
    if (days < 7) return `منذ ${days} يوم`
    return date.toLocaleDateString('ar-SA')
  }

  const unreadCount = notifications.filter(n => !n.read).length

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-200 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-sky-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-200 to-slate-100">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowRight className="w-5 h-5" />
              رجوع
            </button>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Bell className="w-6 h-6 text-sky-500" />
              الإشعارات
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </h1>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-sky-600 hover:text-sky-800"
              >
                قراءة الكل
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {notifications.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">لا توجد إشعارات</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(notif => {
              const style = notificationStyles[notif.type] || notificationStyles.default
              
              return (
                <div
                  key={notif.id}
                  className={`bg-white rounded-2xl p-4 shadow-sm border transition hover:shadow-md cursor-pointer ${
                    !notif.read ? 'border-sky-200 bg-sky-50/50' : 'border-gray-100'
                  }`}
                  onClick={() => {
                    if (!notif.read) markAsRead(notif.id)
                    // الانتقال للصفحة المرتبطة
                    if (notif.actionUrl) navigate(notif.actionUrl)
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-xl ${style.bgColor} ${style.textColor}`}>
                      {style.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-600">{notif.message}</p>
                        {!notif.read && (
                          <span className="text-xs bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full">
                            جديد
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {formatDate(notif.createdAt)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1">
                      {!notif.read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            markAsRead(notif.id)
                          }}
                          className="p-1.5 text-gray-400 hover:text-green-500 transition"
                          title="تحديد كمقروء"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteNotification(notif.id)
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default NotificationsPage
