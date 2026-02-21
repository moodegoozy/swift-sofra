// src/pages/CourierRequests.tsx
import React, { useEffect, useState } from 'react'
import { db } from '@/firebase'
import { collection, query, where, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore'
import { useAuth } from '@/auth'
import { useDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { UserX, UserCheck, UserMinus, Clock, CheckCircle, XCircle, Trash2 } from 'lucide-react'

export const CourierRequests: React.FC = () => {
  const { user } = useAuth()
  const dialog = useDialog()
  const toast = useToast()
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    (async () => {
      const q = query(collection(db, 'hiringRequests'), where('restaurantId', '==', user.uid))
      const snap = await getDocs(q)
      setRequests(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })))
      setLoading(false)
    })()
  }, [user])

  const handleAction = async (id: string, status: 'accepted' | 'rejected') => {
    await updateDoc(doc(db, 'hiringRequests', id), { status })
    setRequests(reqs => reqs.map(r => r.id === id ? { ...r, status } : r))
    toast.success(status === 'accepted' ? 'تم قبول المندوب ✅' : 'تم رفض الطلب')
  }

  // فصل المندوب (تغيير حالته إلى terminated)
  const handleTerminate = async (request: any) => {
    const confirmed = await dialog.confirm(
      `هل تريد فصل المندوب "${request.courierName}"؟`,
      {
        title: 'فصل المندوب',
        confirmText: 'نعم، فصل',
        cancelText: 'إلغاء',
        dangerous: true
      }
    )
    
    if (!confirmed) return
    
    await updateDoc(doc(db, 'hiringRequests', request.id), { status: 'terminated' })
    setRequests(reqs => reqs.map(r => r.id === request.id ? { ...r, status: 'terminated' } : r))
    toast.success('تم فصل المندوب')
  }

  // حذف الطلب نهائياً
  const handleDelete = async (request: any) => {
    const confirmed = await dialog.confirm(
      `هل تريد حذف طلب "${request.courierName}" نهائياً؟`,
      {
        title: 'حذف الطلب',
        confirmText: 'نعم، حذف',
        cancelText: 'إلغاء',
        dangerous: true
      }
    )
    
    if (!confirmed) return
    
    await deleteDoc(doc(db, 'hiringRequests', request.id))
    setRequests(reqs => reqs.filter(r => r.id !== request.id))
    toast.success('تم حذف الطلب')
  }

  // إعادة تفعيل المندوب
  const handleReactivate = async (request: any) => {
    await updateDoc(doc(db, 'hiringRequests', request.id), { status: 'accepted' })
    setRequests(reqs => reqs.map(r => r.id === request.id ? { ...r, status: 'accepted' } : r))
    toast.success('تم إعادة تفعيل المندوب ✅')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return { text: 'بانتظار الرد', color: 'bg-yellow-100 text-yellow-700', icon: Clock }
      case 'accepted':
        return { text: 'مقبول ✅', color: 'bg-green-100 text-green-700', icon: CheckCircle }
      case 'rejected':
        return { text: 'مرفوض', color: 'bg-red-100 text-red-700', icon: XCircle }
      case 'terminated':
        return { text: 'مفصول', color: 'bg-gray-100 text-gray-700', icon: UserX }
      default:
        return { text: status, color: 'bg-gray-100 text-gray-700', icon: Clock }
    }
  }

  if (loading) return <div className="text-center py-10">⏳ جارِ التحميل...</div>

  // تقسيم الطلبات حسب الحالة
  const activeCouriers = requests.filter(r => r.status === 'accepted')
  const pendingRequests = requests.filter(r => r.status === 'pending')
  const terminatedCouriers = requests.filter(r => r.status === 'terminated')
  const rejectedRequests = requests.filter(r => r.status === 'rejected')

  return (
    <div className="py-6 space-y-8">
      <h1 className="text-2xl font-bold text-primary text-center mb-6">👥 إدارة المناديب</h1>
      
      {requests.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">👥</div>
          <p className="text-gray-500 text-lg">لا توجد طلبات توظيف</p>
          <p className="text-gray-400 text-sm mt-2">سيظهر هنا طلبات المناديب للانضمام لمطعمك</p>
        </div>
      ) : (
        <>
          {/* المناديب النشطين */}
          {activeCouriers.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-green-600 mb-3 flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                المناديب النشطين ({activeCouriers.length})
              </h2>
              <div className="space-y-3">
                {activeCouriers.map(r => {
                  const badge = getStatusBadge(r.status)
                  return (
                    <div key={r.id} className="bg-white rounded-2xl shadow-card p-4 border-r-4 border-green-500">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-2xl">
                            🚗
                          </div>
                          <div>
                            <div className="font-bold text-gray-800">{r.courierName}</div>
                            <div className={`text-xs px-2 py-1 rounded-full inline-flex items-center gap-1 ${badge.color}`}>
                              <badge.icon className="w-3 h-3" />
                              {badge.text}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleTerminate(r)}
                          className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl 
                                     hover:bg-red-100 transition-all font-medium"
                        >
                          <UserMinus className="w-4 h-4" />
                          فصل
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* طلبات بانتظار الرد */}
          {pendingRequests.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-yellow-600 mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                طلبات جديدة ({pendingRequests.length})
              </h2>
              <div className="space-y-3">
                {pendingRequests.map(r => (
                  <div key={r.id} className="bg-white rounded-2xl shadow-card p-4 border-r-4 border-yellow-500">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center text-2xl">
                          👤
                        </div>
                        <div>
                          <div className="font-bold text-gray-800">{r.courierName}</div>
                          <div className="text-xs text-yellow-600">بانتظار الرد ⏳</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleAction(r.id, 'accepted')} 
                          className="flex items-center gap-1 px-4 py-2 rounded-xl bg-green-500 text-white hover:bg-green-600 transition-all font-medium"
                        >
                          <UserCheck className="w-4 h-4" />
                          قبول
                        </button>
                        <button 
                          onClick={() => handleAction(r.id, 'rejected')} 
                          className="flex items-center gap-1 px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600 transition-all font-medium"
                        >
                          <XCircle className="w-4 h-4" />
                          رفض
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* المناديب المفصولين */}
          {terminatedCouriers.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-gray-500 mb-3 flex items-center gap-2">
                <UserX className="w-5 h-5" />
                المفصولين ({terminatedCouriers.length})
              </h2>
              <div className="space-y-3">
                {terminatedCouriers.map(r => (
                  <div key={r.id} className="bg-gray-50 rounded-2xl shadow p-4 border-r-4 border-gray-400 opacity-75">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-2xl">
                          👤
                        </div>
                        <div>
                          <div className="font-bold text-gray-600">{r.courierName}</div>
                          <div className="text-xs text-gray-500">مفصول</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReactivate(r)}
                          className="flex items-center gap-1 px-3 py-2 bg-green-100 text-green-600 rounded-xl 
                                     hover:bg-green-200 transition-all text-sm font-medium"
                        >
                          <UserCheck className="w-4 h-4" />
                          إعادة تفعيل
                        </button>
                        <button
                          onClick={() => handleDelete(r)}
                          className="flex items-center gap-1 px-3 py-2 bg-red-100 text-red-600 rounded-xl 
                                     hover:bg-red-200 transition-all text-sm font-medium"
                        >
                          <Trash2 className="w-4 h-4" />
                          حذف
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* الطلبات المرفوضة */}
          {rejectedRequests.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-red-500 mb-3 flex items-center gap-2">
                <XCircle className="w-5 h-5" />
                مرفوضين ({rejectedRequests.length})
              </h2>
              <div className="space-y-3">
                {rejectedRequests.map(r => (
                  <div key={r.id} className="bg-red-50 rounded-2xl shadow p-4 border-r-4 border-red-400 opacity-75">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-2xl">
                          👤
                        </div>
                        <div>
                          <div className="font-bold text-gray-600">{r.courierName}</div>
                          <div className="text-xs text-red-500">مرفوض</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(r)}
                        className="flex items-center gap-1 px-3 py-2 bg-red-100 text-red-600 rounded-xl 
                                   hover:bg-red-200 transition-all text-sm font-medium"
                      >
                        <Trash2 className="w-4 h-4" />
                        حذف
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
