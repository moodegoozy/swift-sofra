// src/pages/ReportsAdmin.tsx
// لوحة إدارة البلاغات - للمطور والمشرف فقط
import React, { useState, useEffect } from 'react'
import { 
  collection, query, orderBy, onSnapshot, 
  doc, updateDoc, serverTimestamp 
} from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuth } from '@/auth'
import { useToast } from '@/components/ui/Toast'
import { ProblemReport, ProblemType } from '@/types'
import { 
  AlertTriangle, Package, Truck, CreditCard, User, Lightbulb,
  Clock, CheckCircle, Eye, Filter, Search, Loader2,
  ChevronDown, ChevronUp, Calendar, UserCircle
} from 'lucide-react'

// تسميات أنواع المشاكل
const PROBLEM_TYPE_LABELS: Record<ProblemType, { label: string; icon: React.ElementType; color: string; bgClass: string; textClass: string }> = {
  orders: { label: 'طلبات', icon: Package, color: 'blue', bgClass: 'bg-blue-100', textClass: 'text-blue-600' },
  delivery: { label: 'توصيل', icon: Truck, color: 'orange', bgClass: 'bg-orange-100', textClass: 'text-orange-600' },
  payment: { label: 'دفع', icon: CreditCard, color: 'green', bgClass: 'bg-green-100', textClass: 'text-green-600' },
  account: { label: 'حساب', icon: User, color: 'purple', bgClass: 'bg-purple-100', textClass: 'text-purple-600' },
  suggestion: { label: 'اقتراح', icon: Lightbulb, color: 'amber', bgClass: 'bg-amber-100', textClass: 'text-amber-600' },
}

// تسميات أدوار المستخدمين
const ROLE_LABELS: Record<string, { label: string; color: string; bgClass: string; textClass: string }> = {
  customer: { label: 'عميل', color: 'blue', bgClass: 'bg-blue-50', textClass: 'text-blue-700' },
  owner: { label: 'أسرة منتجة', color: 'green', bgClass: 'bg-green-50', textClass: 'text-green-700' },
  courier: { label: 'مندوب', color: 'orange', bgClass: 'bg-orange-50', textClass: 'text-orange-700' },
}

// تسميات حالات البلاغ
const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ElementType; bgClass: string; textClass: string }> = {
  pending: { label: 'جديد', color: 'yellow', icon: Clock, bgClass: 'bg-yellow-100', textClass: 'text-yellow-700' },
  reviewed: { label: 'تمت المراجعة', color: 'blue', icon: Eye, bgClass: 'bg-blue-100', textClass: 'text-blue-700' },
  resolved: { label: 'تم الحل', color: 'green', icon: CheckCircle, bgClass: 'bg-green-100', textClass: 'text-green-700' },
}

export const ReportsAdmin: React.FC = () => {
  const { user } = useAuth()
  const toast = useToast()

  // الحالات
  const [reports, setReports] = useState<ProblemReport[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  
  // الفلاتر
  const [filterType, setFilterType] = useState<ProblemType | 'all'>('all')
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'reviewed' | 'resolved'>('all')
  const [filterRole, setFilterRole] = useState<'all' | 'customer' | 'owner' | 'courier'>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // جلب البلاغات
  useEffect(() => {
    const q = query(
      collection(db, 'problemReports'),
      orderBy('createdAt', 'desc')
    )

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ 
        id: d.id, 
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() || new Date()
      } as ProblemReport))
      setReports(data)
      setLoading(false)
    }, (err) => {
      console.error('Error fetching reports:', err)
      toast.error('خطأ في جلب البلاغات')
      setLoading(false)
    })

    return () => unsub()
  }, [])

  // تحديث حالة البلاغ
  const updateStatus = async (reportId: string, newStatus: 'reviewed' | 'resolved') => {
    try {
      await updateDoc(doc(db, 'problemReports', reportId), {
        status: newStatus,
        adminId: user?.uid,
        reviewedAt: serverTimestamp(),
      })
      toast.success(`تم تغيير الحالة إلى: ${STATUS_LABELS[newStatus].label}`)
    } catch (err) {
      console.error('Error updating status:', err)
      toast.error('خطأ في تحديث الحالة')
    }
  }

  // تصفية البلاغات
  const filteredReports = reports.filter(report => {
    if (filterType !== 'all' && report.problemType !== filterType) return false
    if (filterStatus !== 'all' && report.status !== filterStatus) return false
    if (filterRole !== 'all' && report.userRole !== filterRole) return false
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      return (
        report.description.toLowerCase().includes(search) ||
        report.userName?.toLowerCase().includes(search) ||
        report.userEmail?.toLowerCase().includes(search)
      )
    }
    return true
  })

  // إحصائيات سريعة
  const stats = {
    total: reports.length,
    pending: reports.filter(r => r.status === 'pending').length,
    reviewed: reports.filter(r => r.status === 'reviewed').length,
    resolved: reports.filter(r => r.status === 'resolved').length,
  }

  // تنسيق التاريخ
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('ar-SA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-sky-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* العنوان */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-sky-900 flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-sky-600" />
          إدارة البلاغات
        </h1>
        <p className="text-sky-600 mt-1">
          مراجعة ومتابعة بلاغات المستخدمين
        </p>
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-3xl font-bold text-sky-900">{stats.total}</div>
          <div className="text-sm text-gray-500">إجمالي البلاغات</div>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 shadow-sm border border-yellow-100">
          <div className="text-3xl font-bold text-yellow-700">{stats.pending}</div>
          <div className="text-sm text-yellow-600">جديد</div>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 shadow-sm border border-blue-100">
          <div className="text-3xl font-bold text-blue-700">{stats.reviewed}</div>
          <div className="text-sm text-blue-600">تمت المراجعة</div>
        </div>
        <div className="bg-green-50 rounded-xl p-4 shadow-sm border border-green-100">
          <div className="text-3xl font-bold text-green-700">{stats.resolved}</div>
          <div className="text-sm text-green-600">تم الحل</div>
        </div>
      </div>

      {/* الفلاتر */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-3 text-sky-700">
          <Filter className="w-5 h-5" />
          <span className="font-medium">تصفية البلاغات</span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* البحث */}
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="بحث..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* فلتر النوع */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as ProblemType | 'all')}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="all">جميع الأنواع</option>
            {Object.entries(PROBLEM_TYPE_LABELS).map(([value, { label }]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          {/* فلتر الحالة */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="all">جميع الحالات</option>
            {Object.entries(STATUS_LABELS).map(([value, { label }]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          {/* فلتر الدور */}
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as any)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="all">جميع المستخدمين</option>
            {Object.entries(ROLE_LABELS).map(([value, { label }]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* قائمة البلاغات */}
      {filteredReports.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm">
          <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">لا توجد بلاغات</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => {
            const typeInfo = PROBLEM_TYPE_LABELS[report.problemType]
            const roleInfo = ROLE_LABELS[report.userRole]
            const statusInfo = STATUS_LABELS[report.status]
            const TypeIcon = typeInfo.icon
            const StatusIcon = statusInfo.icon
            const isExpanded = expandedId === report.id

            return (
              <div 
                key={report.id} 
                className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100"
              >
                {/* رأس البلاغ */}
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : report.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {/* أيقونة النوع */}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${typeInfo.bgClass}`}>
                        <TypeIcon className={`w-5 h-5 ${typeInfo.textClass}`} />
                      </div>
                      
                      <div>
                        {/* نوع المشكلة والحالة */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sky-900">{typeInfo.label}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.bgClass} ${statusInfo.textClass}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                        
                        {/* معلومات المستخدم */}
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span className={`px-2 py-0.5 rounded ${roleInfo.bgClass} ${roleInfo.textClass}`}>
                            {roleInfo.label}
                          </span>
                          {report.userName && (
                            <span className="flex items-center gap-1">
                              <UserCircle className="w-4 h-4" />
                              {report.userName}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(report.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* زر التوسيع */}
                    <div className="text-gray-400">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* تفاصيل البلاغ */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50">
                    {/* نص المشكلة */}
                    <div className="bg-white rounded-lg p-4 mb-4">
                      <h4 className="font-medium text-sky-900 mb-2">وصف المشكلة:</h4>
                      <p className="text-gray-700 whitespace-pre-wrap">{report.description}</p>
                    </div>

                    {/* معلومات إضافية */}
                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                      {report.userEmail && (
                        <div>
                          <span className="text-gray-500">البريد:</span>
                          <span className="mr-2 text-sky-700">{report.userEmail}</span>
                        </div>
                      )}
                      {report.userPhone && (
                        <div>
                          <span className="text-gray-500">الهاتف:</span>
                          <span className="mr-2 text-sky-700">{report.userPhone}</span>
                        </div>
                      )}
                    </div>

                    {/* أزرار الإجراءات */}
                    {report.status !== 'resolved' && (
                      <div className="flex gap-2">
                        {report.status === 'pending' && (
                          <button
                            onClick={() => updateStatus(report.id, 'reviewed')}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                          >
                            <Eye className="w-4 h-4" />
                            تمت المراجعة
                          </button>
                        )}
                        <button
                          onClick={() => updateStatus(report.id, 'resolved')}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          تم الحل
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ReportsAdmin
