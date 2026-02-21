import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth'
import { RoleGate } from '@/routes/RoleGate'
import { 
  Trash2, Users, Settings, RefreshCw, Database, Shield, Server, 
  Edit3, Save, X, ChevronDown, ChevronUp, Building2, Wallet, Package, Truck, UserPlus, Plus,
  FileCheck, AlertCircle, CheckCircle, Clock, ExternalLink, Search, Filter, SortAsc, SortDesc,
  Calendar, TrendingUp, TrendingDown, Activity, Zap, Crown, Star, Eye, BarChart3, PieChart,
  ArrowUpRight, ArrowDownRight, Sparkles, Bell, Target, Award, Flame, Globe, Layers, Store,
  KeyRound, Mail, History
} from 'lucide-react'
import { useToast } from '@/components/ui/Toast'
import { useDialog } from '@/components/ui/ConfirmDialog'
import { db, app, auth } from '@/firebase'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth'
import { 
  collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, 
  serverTimestamp, addDoc, query, where, orderBy, limit 
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, getStorage } from 'firebase/storage'
import { addAuditLog, getUserLoginHistory, type LoginAttempt } from '@/utils/authService'

// Firebase config للعرض
const firebaseConfig = {
  projectId: app.options.projectId,
  authDomain: app.options.authDomain,
  storageBucket: app.options.storageBucket,
  messagingSenderId: app.options.messagingSenderId,
  appId: app.options.appId,
}

type Stats = {
  users: number
  restaurants: number
  menuItems: number
  orders: number
  pendingOrders: number
  deliveredOrders: number
  admins: number
  couriers: number
  customers: number
  owners: number
  totalAppEarnings: number
}

type AppSettings = {
  deliveryFee?: number
  minOrderAmount?: number
  maxDeliveryDistance?: number
  workingHours?: { open: string; close: string }
  maintenanceMode?: boolean
  appVersion?: string
  platformFee?: number
  adminCommissionRate?: number
}

type User = {
  uid: string
  email: string
  name?: string
  role: string
  phone?: string
  createdAt?: any
  // معلومات الأمان وآخر تسجيل دخول
  security?: {
    lastLogin?: any
    failedAttempts?: number
    isDeactivated?: boolean
    lockedUntil?: any
  }
  isActive?: boolean
}

type Restaurant = {
  id: string
  name: string
  ownerId: string
  email?: string
  phone?: string
  city?: string
  location?: string
  logoUrl?: string
  referredBy?: string
  referrerType?: string
  supervisorId?: string
  isVerified?: boolean
  verifiedAt?: any
  createdAt?: any
}

type Order = {
  id: string
  customerId: string
  restaurantId?: string
  restaurantName?: string
  items: any[]
  subtotal: number
  deliveryFee: number
  total: number
  status: string
  address: string
  courierId?: string
  platformFee?: number
  adminCommission?: number
  courierPlatformFee?: number
  referredBy?: string
  createdAt?: any
}

type Admin = {
  uid: string
  email: string
  name?: string
  walletBalance: number
  totalEarnings: number
  restaurantsCount: number
  restaurants: Restaurant[]
}

// نوع المهمة
type Task = {
  id: string
  title: string
  description: string
  assignedTo: string // UID المشرف
  assignedToName?: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high'
  dueDate?: any
  createdBy: string
  createdAt?: any
  updatedAt?: any
  completedAt?: any
  notes?: string
}

// نوع سجل العمليات
type ActivityLog = {
  id: string
  action: 'activate' | 'deactivate' | 'delete' | 'update' | 'create' | 'package_activate' | 'package_cancel' | 'role_change'
  targetType: 'user' | 'restaurant' | 'order' | 'package' | 'settings'
  targetId: string
  targetName?: string
  performedBy: string
  performedByName?: string
  details?: string
  oldValue?: any
  newValue?: any
  createdAt?: any
}

// تبويبات اللوحة
type Tab = 'overview' | 'restaurants' | 'orders' | 'users' | 'couriers' | 'admins' | 'employees' | 'settings' | 'finance' | 'tools' | 'tasks' | 'licenses' | 'packages' | 'storeAnalytics' | 'packageSettings' | 'activityLog'

// أدوار الموظفين
type EmployeeRole = 'supervisor' | 'support' | 'social_media' | 'admin' | 'accountant'

// نوع الموظف
type Employee = {
  uid: string
  email: string
  name?: string
  phone?: string
  role: EmployeeRole
  isActive: boolean
  permissions?: string[]
  createdAt?: any
  createdBy?: string
  updatedAt?: any
}

// نوع طلب الباقة
type PackageRequest = {
  id: string
  restaurantId: string
  restaurantName: string
  ownerName?: string
  ownerPhone?: string
  status: 'pending' | 'bank_sent' | 'payment_sent' | 'approved' | 'rejected' | 'expired'
  bankAccountImageUrl?: string
  paymentProofImageUrl?: string
  subscriptionAmount: number
  subscriptionDuration: number
  developerNotes?: string
  ownerNotes?: string
  requestedAt?: any
  bankSentAt?: any
  paymentSentAt?: any
  approvedAt?: any
  rejectedAt?: any
  expiresAt?: any
  createdAt?: any
  updatedAt?: any
}


export const Developer: React.FC = () => {
  const { user } = useAuth()
  const toast = useToast()
  const dialog = useDialog()
  const storage = getStorage(app)
  
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  
  // البيانات
  const [stats, setStats] = useState<Stats>({
    users: 0, restaurants: 0, menuItems: 0, orders: 0, 
    pendingOrders: 0, deliveredOrders: 0, admins: 0, couriers: 0, 
    customers: 0, owners: 0, totalAppEarnings: 0
  })
  const [settings, setSettings] = useState<AppSettings>({})
  const [users, setUsers] = useState<User[]>([])
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [admins, setAdmins] = useState<Admin[]>([])
  
  // حالات التحرير
  const [editingSettings, setEditingSettings] = useState(false)
  const [settingsForm, setSettingsForm] = useState<AppSettings>({})
  const [editingRestaurant, setEditingRestaurant] = useState<string | null>(null)
  const [restaurantForm, setRestaurantForm] = useState<Partial<Restaurant>>({})
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [userForm, setUserForm] = useState<Partial<User>>({})
  
  // فلاتر (نقلت للأسفل مع الفلاتر المتقدمة)
  const [expandedAdmin, setExpandedAdmin] = useState<string | null>(null)
  
  // إضافة مشرف جديد
  const [showAddAdmin, setShowAddAdmin] = useState(false)
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [newAdminName, setNewAdminName] = useState('')
  const [newAdminPassword, setNewAdminPassword] = useState('')
  const [newAdminPhone, setNewAdminPhone] = useState('')
  const [creatingAdmin, setCreatingAdmin] = useState(false)

  // إضافة مندوب جديد
  const [showAddCourier, setShowAddCourier] = useState(false)
  const [newCourierEmail, setNewCourierEmail] = useState('')
  const [newCourierName, setNewCourierName] = useState('')
  const [newCourierPassword, setNewCourierPassword] = useState('')
  const [newCourierPhone, setNewCourierPhone] = useState('')
  const [creatingCourier, setCreatingCourier] = useState(false)

  // إضافة مطعم جديد
  const [showAddRestaurant, setShowAddRestaurant] = useState(false)
  const [newRestaurantName, setNewRestaurantName] = useState('')
  const [newRestaurantCity, setNewRestaurantCity] = useState('')
  const [newRestaurantPhone, setNewRestaurantPhone] = useState('')
  const [newRestaurantEmail, setNewRestaurantEmail] = useState('')
  const [newRestaurantOwnerEmail, setNewRestaurantOwnerEmail] = useState('')
  const [newRestaurantOwnerPassword, setNewRestaurantOwnerPassword] = useState('')
  const [newRestaurantSupervisorId, setNewRestaurantSupervisorId] = useState('')
  const [creatingRestaurant, setCreatingRestaurant] = useState(false)

  // المهام
  const [tasks, setTasks] = useState<Task[]>([])
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDescription, setNewTaskDescription] = useState('')
  const [newTaskAssignedTo, setNewTaskAssignedTo] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [newTaskDueDate, setNewTaskDueDate] = useState('')
  const [creatingTask, setCreatingTask] = useState(false)
  const [taskFilter, setTaskFilter] = useState<string>('all')

  // طلبات الباقات
  const [packageRequests, setPackageRequests] = useState<PackageRequest[]>([])
  const [packageFilter, setPackageFilter] = useState<string>('all')
  const [uploadingBankImage, setUploadingBankImage] = useState<string | null>(null)
  const [bankImageFile, setBankImageFile] = useState<File | null>(null)
  const [subscriptionAmount, setSubscriptionAmount] = useState<number>(99)
  const [subscriptionDuration, setSubscriptionDuration] = useState<number>(30)
  
  // سجل العمليات
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [logFilter, setLogFilter] = useState<string>('all')

  // إدارة الموظفين
  const [employees, setEmployees] = useState<Employee[]>([])
  const [showAddEmployee, setShowAddEmployee] = useState(false)
  const [newEmployeeEmail, setNewEmployeeEmail] = useState('')
  const [newEmployeeName, setNewEmployeeName] = useState('')
  const [newEmployeePassword, setNewEmployeePassword] = useState('')
  const [newEmployeePhone, setNewEmployeePhone] = useState('')
  const [newEmployeeRole, setNewEmployeeRole] = useState<EmployeeRole>('support')
  const [creatingEmployee, setCreatingEmployee] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<string | null>(null)
  const [selectedNewRole, setSelectedNewRole] = useState<EmployeeRole>('support')
  const [employeeFilter, setEmployeeFilter] = useState<string>('all')

  // ===== فلاتر وبحث متقدم =====
  const [searchQuery, setSearchQuery] = useState('')
  const [restaurantFilter, setRestaurantFilter] = useState<'all' | 'premium' | 'free' | 'verified' | 'unverified'>('all')
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'delivered' | 'cancelled'>('all')
  const [userFilter, setUserFilter] = useState<'all' | 'customer' | 'owner' | 'courier' | 'admin' | 'supervisor' | 'social_media' | 'support' | 'accountant'>('all')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'name' | 'revenue'>('newest')
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('all')
  
  // حفظ بيانات المطور الحالي لإعادة تسجيل الدخول
  const currentDeveloperEmail = user?.email || ''

  // ===== دوال الفلترة =====
  const getFilteredRestaurants = () => {
    let filtered = [...restaurants]
    
    // فلتر البحث
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(r => 
        r.name?.toLowerCase().includes(query) ||
        r.email?.toLowerCase().includes(query) ||
        r.phone?.includes(query) ||
        r.city?.toLowerCase().includes(query)
      )
    }
    
    // فلتر الباقة
    if (restaurantFilter === 'premium') {
      filtered = filtered.filter(r => (r as any).packageType === 'premium')
    } else if (restaurantFilter === 'free') {
      filtered = filtered.filter(r => !(r as any).packageType || (r as any).packageType === 'free')
    } else if (restaurantFilter === 'verified') {
      filtered = filtered.filter(r => r.isVerified)
    } else if (restaurantFilter === 'unverified') {
      filtered = filtered.filter(r => !r.isVerified)
    }
    
    // الترتيب
    if (sortOrder === 'newest') {
      filtered.sort((a, b) => (b.createdAt?.toDate?.()?.getTime() || 0) - (a.createdAt?.toDate?.()?.getTime() || 0))
    } else if (sortOrder === 'oldest') {
      filtered.sort((a, b) => (a.createdAt?.toDate?.()?.getTime() || 0) - (b.createdAt?.toDate?.()?.getTime() || 0))
    } else if (sortOrder === 'name') {
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'))
    }
    
    return filtered
  }

  const getFilteredOrders = () => {
    let filtered = [...orders]
    
    // فلتر البحث
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(o => 
        o.id?.toLowerCase().includes(query) ||
        o.restaurantName?.toLowerCase().includes(query) ||
        o.address?.toLowerCase().includes(query)
      )
    }
    
    // فلتر الحالة
    if (orderFilter === 'pending') {
      filtered = filtered.filter(o => ['pending', 'accepted', 'preparing', 'ready'].includes(o.status))
    } else if (orderFilter === 'delivered') {
      filtered = filtered.filter(o => o.status === 'delivered')
    } else if (orderFilter === 'cancelled') {
      filtered = filtered.filter(o => o.status === 'cancelled')
    }
    
    // فلتر التاريخ
    if (dateRange !== 'all') {
      const now = new Date()
      const startDate = new Date()
      if (dateRange === 'today') {
        startDate.setHours(0, 0, 0, 0)
      } else if (dateRange === 'week') {
        startDate.setDate(now.getDate() - 7)
      } else if (dateRange === 'month') {
        startDate.setMonth(now.getMonth() - 1)
      }
      filtered = filtered.filter(o => {
        const orderDate = o.createdAt?.toDate?.() || new Date(o.createdAt)
        return orderDate >= startDate
      })
    }
    
    // الترتيب
    if (sortOrder === 'newest') {
      filtered.sort((a, b) => (b.createdAt?.toDate?.()?.getTime() || 0) - (a.createdAt?.toDate?.()?.getTime() || 0))
    } else if (sortOrder === 'oldest') {
      filtered.sort((a, b) => (a.createdAt?.toDate?.()?.getTime() || 0) - (b.createdAt?.toDate?.()?.getTime() || 0))
    }
    
    return filtered
  }

  const getFilteredUsers = () => {
    let filtered = [...users]
    
    // فلتر البحث
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(u => 
        u.name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query) ||
        u.phone?.includes(query)
      )
    }
    
    // فلتر الدور
    if (userFilter !== 'all') {
      filtered = filtered.filter(u => u.role === userFilter)
    }
    
    // الترتيب
    if (sortOrder === 'newest') {
      filtered.sort((a, b) => (b.createdAt?.toDate?.()?.getTime() || 0) - (a.createdAt?.toDate?.()?.getTime() || 0))
    } else if (sortOrder === 'oldest') {
      filtered.sort((a, b) => (a.createdAt?.toDate?.()?.getTime() || 0) - (b.createdAt?.toDate?.()?.getTime() || 0))
    } else if (sortOrder === 'name') {
      filtered.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'))
    }
    
    return filtered
  }

  // ===== تسجيل عملية في السجل =====
  const logActivity = async (
    action: ActivityLog['action'],
    targetType: ActivityLog['targetType'],
    targetId: string,
    targetName: string,
    details?: string,
    oldValue?: any,
    newValue?: any
  ) => {
    try {
      await addDoc(collection(db, 'activityLogs'), {
        action,
        targetType,
        targetId,
        targetName,
        performedBy: user?.uid || '',
        performedByName: user?.email || 'مطور',
        details,
        oldValue,
        newValue,
        createdAt: serverTimestamp(),
      })
    } catch (err) {
      console.warn('فشل تسجيل العملية:', err)
    }
  }

  // ===== تفعيل/إيقاف حساب =====
  const handleToggleUserStatus = async (targetUser: User, isActive: boolean) => {
    const action = isActive ? 'تعليق' : 'تفعيل'
    const confirmed = await dialog.confirm(
      `هل أنت متأكد من ${action} حساب "${targetUser.name || targetUser.email}"؟`,
      { title: `${action} الحساب`, dangerous: !isActive }
    )
    if (!confirmed) return

    try {
      await updateDoc(doc(db, 'users', targetUser.uid), {
        isActive: !isActive,
        updatedAt: serverTimestamp(),
      })
      
      await logActivity(
        isActive ? 'deactivate' : 'activate',
        'user',
        targetUser.uid,
        targetUser.name || targetUser.email,
        `تم ${action} الحساب`
      )
      
      toast.success(`تم ${action} الحساب بنجاح ✅`)
      loadData()
    } catch (err) {
      console.error('خطأ:', err)
      toast.error(`فشل ${action} الحساب`)
    }
  }

  // ===== إعادة تعيين كلمة المرور =====
  const handleResetPassword = async (targetUser: User) => {
    const confirmed = await dialog.confirm(
      `سيتم إرسال رابط إعادة تعيين كلمة المرور إلى: ${targetUser.email}`,
      { title: '🔑 إعادة تعيين كلمة المرور' }
    )
    if (!confirmed) return

    try {
      await sendPasswordResetEmail(auth, targetUser.email)
      
      // تسجيل في Audit Log
      await addAuditLog({
        action: 'password_reset_requested',
        performedBy: user?.uid || '',
        performedByName: user?.email || 'مطور',
        targetUserId: targetUser.uid,
        targetUserName: targetUser.name || targetUser.email,
        details: 'تم إرسال رابط إعادة تعيين كلمة المرور من لوحة المطور'
      })
      
      await logActivity(
        'update',
        'user',
        targetUser.uid,
        targetUser.name || targetUser.email,
        'تم إرسال رابط إعادة تعيين كلمة المرور'
      )
      
      toast.success('تم إرسال رابط إعادة تعيين كلمة المرور بنجاح 📧')
    } catch (err: any) {
      console.error('خطأ:', err)
      if (err.code === 'auth/user-not-found') {
        toast.error('لا يوجد حساب بهذا البريد الإلكتروني')
      } else {
        toast.error('فشل إرسال رابط إعادة التعيين')
      }
    }
  }

  // ===== عرض سجل تسجيل الدخول =====
  const [loginHistoryModal, setLoginHistoryModal] = useState<{
    isOpen: boolean
    userId: string
    userName: string
    history: LoginAttempt[]
    loading: boolean
  }>({ isOpen: false, userId: '', userName: '', history: [], loading: false })

  const handleViewLoginHistory = async (targetUser: User) => {
    setLoginHistoryModal({
      isOpen: true,
      userId: targetUser.uid,
      userName: targetUser.name || targetUser.email,
      history: [],
      loading: true
    })
    
    try {
      const history = await getUserLoginHistory(targetUser.uid, 20)
      setLoginHistoryModal(prev => ({ ...prev, history, loading: false }))
    } catch (err) {
      console.error('خطأ في جلب سجل الدخول:', err)
      setLoginHistoryModal(prev => ({ ...prev, loading: false }))
      toast.error('فشل جلب سجل الدخول')
    }
  }

  // ===== تفعيل باقة التميز يدوياً =====
  const handleActivatePremium = async (restaurant: Restaurant, days: number = 30) => {
    const confirmed = await dialog.confirm(
      `سيتم تفعيل باقة التميز لـ "${restaurant.name}" لمدة ${days} يوم`,
      { title: '✨ تفعيل باقة التميز' }
    )
    if (!confirmed) return

    try {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + days)

      await updateDoc(doc(db, 'restaurants', restaurant.id), {
        packageType: 'premium',
        packageSubscribedAt: serverTimestamp(),
        packageExpiresAt: expiresAt,
        packageRequest: null,
        updatedAt: serverTimestamp(),
      })

      await logActivity(
        'package_activate',
        'restaurant',
        restaurant.id,
        restaurant.name,
        `تفعيل باقة التميز لمدة ${days} يوم`
      )

      toast.success(`تم تفعيل باقة التميز لـ ${restaurant.name} ✨`)
      loadData()
    } catch (err) {
      console.error('خطأ:', err)
      toast.error('فشل تفعيل الباقة')
    }
  }

  // ===== إلغاء باقة التميز =====
  const handleCancelPremium = async (restaurant: Restaurant) => {
    const confirmed = await dialog.confirm(
      `هل أنت متأكد من إلغاء باقة التميز لـ "${restaurant.name}"؟`,
      { title: '⚠️ إلغاء باقة التميز', dangerous: true }
    )
    if (!confirmed) return

    try {
      await updateDoc(doc(db, 'restaurants', restaurant.id), {
        packageType: 'free',
        packageExpiresAt: null,
        updatedAt: serverTimestamp(),
      })

      await logActivity(
        'package_cancel',
        'restaurant',
        restaurant.id,
        restaurant.name,
        'إلغاء باقة التميز'
      )

      toast.success(`تم إلغاء باقة التميز لـ ${restaurant.name}`)
      loadData()
    } catch (err) {
      console.error('خطأ:', err)
      toast.error('فشل إلغاء الباقة')
    }
  }

  // ===== تحميل سجل العمليات =====
  const loadActivityLogs = async () => {
    setLoadingLogs(true)
    try {
      const q = query(
        collection(db, 'activityLogs'),
        orderBy('createdAt', 'desc'),
        limit(100)
      )
      const snap = await getDocs(q)
      const logs = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() || null,
      })) as ActivityLog[]
      setActivityLogs(logs)
    } catch (err) {
      console.warn('فشل تحميل سجل العمليات:', err)
    } finally {
      setLoadingLogs(false)
    }
  }

  // ===== تحميل الموظفين =====
  const loadEmployees = async () => {
    try {
      const employeeRoles = ['supervisor', 'support', 'social_media', 'admin', 'accountant']
      const allEmployees: Employee[] = []
      
      for (const u of users) {
        if (employeeRoles.includes(u.role)) {
          allEmployees.push({
            uid: u.uid,
            email: u.email,
            name: u.name,
            phone: u.phone,
            role: u.role as EmployeeRole,
            isActive: u.isActive !== false && !u.security?.isDeactivated,
            createdAt: u.createdAt,
          })
        }
      }
      setEmployees(allEmployees)
    } catch (err) {
      console.warn('خطأ في تحميل الموظفين:', err)
    }
  }

  // تحميل الموظفين عند تغيير المستخدمين
  useEffect(() => {
    if (users.length > 0) {
      loadEmployees()
    }
  }, [users])

  // ===== إنشاء موظف جديد =====
  const handleCreateEmployee = async () => {
    if (!newEmployeeEmail.trim() || !newEmployeePassword.trim()) {
      toast.warning('أدخل البريد الإلكتروني وكلمة المرور')
      return
    }
    if (newEmployeePassword.length < 6) {
      toast.warning('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      return
    }

    const roleLabels: Record<EmployeeRole, string> = {
      supervisor: 'مشرف',
      support: 'دعم فني',
      social_media: 'سوشيال ميديا',
      admin: 'إدارة',
      accountant: 'محاسب'
    }

    const confirmed = await dialog.confirm(
      `سيتم إنشاء حساب موظف جديد:\n\n📧 ${newEmployeeEmail}\n👤 ${newEmployeeName || 'بدون اسم'}\n🎭 ${roleLabels[newEmployeeRole]}\n\nملاحظة: سيتم تسجيل خروجك مؤقتاً.`,
      { title: 'إنشاء موظف جديد' }
    )
    if (!confirmed) return

    setCreatingEmployee(true)
    try {
      const userCred = await createUserWithEmailAndPassword(auth, newEmployeeEmail.trim(), newEmployeePassword)
      const newUid = userCred.user.uid

      await setDoc(doc(db, 'users', newUid), {
        email: newEmployeeEmail.trim(),
        name: newEmployeeName.trim() || 'موظف جديد',
        phone: newEmployeePhone.trim() || '',
        role: newEmployeeRole,
        isActive: true,
        createdAt: serverTimestamp(),
        createdBy: user?.uid,
      })

      // إنشاء محفظة للموظف
      if (['supervisor', 'admin', 'accountant'].includes(newEmployeeRole)) {
        await setDoc(doc(db, 'wallets', newUid), {
          balance: 0,
          totalEarnings: 0,
          totalWithdrawn: 0,
          transactions: [],
          updatedAt: serverTimestamp(),
        })
      }

      // تسجيل العملية
      await addDoc(collection(db, 'activityLogs'), {
        action: 'create',
        targetType: 'user',
        targetId: newUid,
        targetName: newEmployeeName.trim() || newEmployeeEmail,
        performedBy: user?.uid,
        performedByName: user?.email,
        details: `إنشاء موظف جديد - ${roleLabels[newEmployeeRole]}`,
        createdAt: serverTimestamp(),
      })

      toast.success('تم إنشاء حساب الموظف بنجاح ✅')
      toast.info('⚠️ تم تسجيل خروجك، يرجى تسجيل الدخول مرة أخرى')
      
      setNewEmployeeEmail('')
      setNewEmployeeName('')
      setNewEmployeePassword('')
      setNewEmployeePhone('')
      setNewEmployeeRole('support')
      setShowAddEmployee(false)
      
    } catch (err: any) {
      console.error('خطأ في إنشاء الموظف:', err)
      if (err.code === 'auth/email-already-in-use') {
        toast.error('البريد الإلكتروني مستخدم مسبقاً')
      } else if (err.code === 'auth/invalid-email') {
        toast.error('البريد الإلكتروني غير صالح')
      } else {
        toast.error('فشل إنشاء الموظف')
      }
    } finally {
      setCreatingEmployee(false)
    }
  }

  // ===== تغيير دور الموظف =====
  const handleChangeEmployeeRole = async (employeeUid: string, newRole: EmployeeRole) => {
    const employee = employees.find(e => e.uid === employeeUid)
    if (!employee) return

    const roleLabels: Record<EmployeeRole, string> = {
      supervisor: 'مشرف',
      support: 'دعم فني',
      social_media: 'سوشيال ميديا',
      admin: 'إدارة',
      accountant: 'محاسب'
    }

    try {
      await updateDoc(doc(db, 'users', employeeUid), {
        role: newRole,
        updatedAt: serverTimestamp(),
      })

      await addDoc(collection(db, 'activityLogs'), {
        action: 'role_change',
        targetType: 'user',
        targetId: employeeUid,
        targetName: employee.name || employee.email,
        performedBy: user?.uid,
        performedByName: user?.email,
        oldValue: employee.role,
        newValue: newRole,
        details: `تغيير الدور من ${roleLabels[employee.role]} إلى ${roleLabels[newRole]}`,
        createdAt: serverTimestamp(),
      })

      setEmployees(prev => prev.map(e => 
        e.uid === employeeUid ? { ...e, role: newRole } : e
      ))
      setEditingEmployee(null)
      toast.success('تم تغيير الدور بنجاح ✅')
    } catch (err) {
      console.error('خطأ:', err)
      toast.error('فشل تغيير الدور')
    }
  }

  // ===== تفعيل/إيقاف الموظف =====
  const handleToggleEmployeeStatus = async (employeeUid: string) => {
    const employee = employees.find(e => e.uid === employeeUid)
    if (!employee) return

    const newStatus = !employee.isActive
    const action = newStatus ? 'تفعيل' : 'إيقاف'

    const confirmed = await dialog.confirm(
      `هل تريد ${action} حساب ${employee.name || employee.email}؟`,
      { title: `${action} الحساب` }
    )
    if (!confirmed) return

    try {
      await updateDoc(doc(db, 'users', employeeUid), {
        isActive: newStatus,
        'security.isDeactivated': !newStatus,
        updatedAt: serverTimestamp(),
      })

      await addDoc(collection(db, 'activityLogs'), {
        action: newStatus ? 'activate' : 'deactivate',
        targetType: 'user',
        targetId: employeeUid,
        targetName: employee.name || employee.email,
        performedBy: user?.uid,
        performedByName: user?.email,
        details: `${action} حساب الموظف`,
        createdAt: serverTimestamp(),
      })

      setEmployees(prev => prev.map(e => 
        e.uid === employeeUid ? { ...e, isActive: newStatus } : e
      ))
      toast.success(`تم ${action} الحساب بنجاح ✅`)
    } catch (err) {
      console.error('خطأ:', err)
      toast.error(`فشل ${action} الحساب`)
    }
  }

  // ===== إنشاء مشرف جديد =====
  const handleCreateNewAdmin = async () => {
    if (!newAdminEmail.trim() || !newAdminPassword.trim()) {
      toast.warning('أدخل البريد الإلكتروني وكلمة المرور')
      return
    }
    if (newAdminPassword.length < 6) {
      toast.warning('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      return
    }

    const confirmed = await dialog.confirm(
      `سيتم إنشاء حساب مشرف جديد:\n\n📧 ${newAdminEmail}\n👤 ${newAdminName || 'بدون اسم'}\n\nملاحظة: سيتم تسجيل خروجك مؤقتاً، قم بتسجيل الدخول مرة أخرى.`,
      { title: 'إنشاء مشرف جديد' }
    )
    if (!confirmed) return

    setCreatingAdmin(true)
    try {
      // إنشاء المستخدم الجديد في Firebase Auth
      const userCred = await createUserWithEmailAndPassword(auth, newAdminEmail.trim(), newAdminPassword)
      const newUid = userCred.user.uid

      // إنشاء مستند المستخدم في Firestore
      await setDoc(doc(db, 'users', newUid), {
        email: newAdminEmail.trim(),
        name: newAdminName.trim() || 'مشرف جديد',
        phone: newAdminPhone.trim() || '',
        role: 'admin',
        createdAt: serverTimestamp(),
      })

      // إنشاء محفظة للمشرف الجديد
      await setDoc(doc(db, 'wallets', newUid), {
        balance: 0,
        totalEarnings: 0,
        totalWithdrawn: 0,
        transactions: [],
        updatedAt: serverTimestamp(),
      })

      toast.success('تم إنشاء حساب المشرف بنجاح ✅')
      toast.info('⚠️ تم تسجيل خروجك، يرجى تسجيل الدخول مرة أخرى')
      
      // إعادة تعيين النموذج
      setNewAdminEmail('')
      setNewAdminName('')
      setNewAdminPassword('')
      setNewAdminPhone('')
      setShowAddAdmin(false)
      
    } catch (err: any) {
      console.error('خطأ في إنشاء المشرف:', err)
      if (err.code === 'auth/email-already-in-use') {
        toast.error('البريد الإلكتروني مستخدم مسبقاً')
      } else if (err.code === 'auth/invalid-email') {
        toast.error('البريد الإلكتروني غير صالح')
      } else if (err.code === 'auth/weak-password') {
        toast.error('كلمة المرور ضعيفة جداً')
      } else {
        toast.error('فشل إنشاء المشرف: ' + (err.message || 'خطأ غير معروف'))
      }
    } finally {
      setCreatingAdmin(false)
    }
  }

  // ===== إنشاء مندوب جديد =====
  const handleCreateNewCourier = async () => {
    if (!newCourierEmail.trim() || !newCourierPassword.trim()) {
      toast.warning('أدخل البريد الإلكتروني وكلمة المرور')
      return
    }
    if (newCourierPassword.length < 6) {
      toast.warning('كلمة المرور يجب أن تكون 6 أحرف على الأقل')
      return
    }

    const confirmed = await dialog.confirm(
      `سيتم إنشاء حساب مندوب جديد:\n\n📧 ${newCourierEmail}\n👤 ${newCourierName || 'بدون اسم'}\n📱 ${newCourierPhone || 'بدون رقم'}`,
      { title: 'إنشاء مندوب جديد' }
    )
    if (!confirmed) return

    setCreatingCourier(true)
    try {
      const userCred = await createUserWithEmailAndPassword(auth, newCourierEmail.trim(), newCourierPassword)
      const newUid = userCred.user.uid

      await setDoc(doc(db, 'users', newUid), {
        email: newCourierEmail.trim(),
        name: newCourierName.trim() || 'مندوب جديد',
        phone: newCourierPhone.trim() || '',
        role: 'courier',
        createdAt: serverTimestamp(),
      })

      toast.success('تم إنشاء حساب المندوب بنجاح ✅')
      toast.info('⚠️ تم تسجيل خروجك، يرجى تسجيل الدخول مرة أخرى')
      
      setNewCourierEmail('')
      setNewCourierName('')
      setNewCourierPassword('')
      setNewCourierPhone('')
      setShowAddCourier(false)
      
    } catch (err: any) {
      console.error('خطأ في إنشاء المندوب:', err)
      if (err.code === 'auth/email-already-in-use') {
        toast.error('البريد الإلكتروني مستخدم مسبقاً')
      } else {
        toast.error('فشل إنشاء المندوب: ' + (err.message || 'خطأ غير معروف'))
      }
    } finally {
      setCreatingCourier(false)
    }
  }

  // ===== إنشاء مطعم جديد =====
  const handleCreateNewRestaurant = async () => {
    if (!newRestaurantName.trim()) {
      toast.warning('أدخل اسم المطعم')
      return
    }
    if (!newRestaurantOwnerEmail.trim() || !newRestaurantOwnerPassword.trim()) {
      toast.warning('أدخل بيانات صاحب المطعم')
      return
    }

    const confirmed = await dialog.confirm(
      `سيتم إنشاء مطعم جديد:\n\n🏪 ${newRestaurantName}\n📍 ${newRestaurantCity || 'بدون مدينة'}\n👤 صاحب المطعم: ${newRestaurantOwnerEmail}`,
      { title: 'إنشاء مطعم جديد' }
    )
    if (!confirmed) return

    setCreatingRestaurant(true)
    try {
      // إنشاء حساب صاحب المطعم
      const userCred = await createUserWithEmailAndPassword(auth, newRestaurantOwnerEmail.trim(), newRestaurantOwnerPassword)
      const newOwnerId = userCred.user.uid

      // إنشاء مستند صاحب المطعم
      await setDoc(doc(db, 'users', newOwnerId), {
        email: newRestaurantOwnerEmail.trim(),
        name: newRestaurantName.trim() + ' - مالك',
        role: 'owner',
        createdAt: serverTimestamp(),
      })

      // إنشاء مستند المطعم
      await setDoc(doc(db, 'restaurants', newOwnerId), {
        name: newRestaurantName.trim(),
        ownerId: newOwnerId,
        email: newRestaurantEmail.trim() || newRestaurantOwnerEmail.trim(),
        phone: newRestaurantPhone.trim() || '',
        city: newRestaurantCity.trim() || '',
        referredBy: user?.uid, // المطور هو من أضاف المطعم
        referrerType: 'developer',
        ...(newRestaurantSupervisorId ? { supervisorId: newRestaurantSupervisorId } : {}),
        createdAt: serverTimestamp(),
      })

      toast.success('تم إنشاء المطعم وحساب المالك بنجاح ✅')
      toast.info('⚠️ تم تسجيل خروجك، يرجى تسجيل الدخول مرة أخرى')
      
      setNewRestaurantName('')
      setNewRestaurantCity('')
      setNewRestaurantPhone('')
      setNewRestaurantEmail('')
      setNewRestaurantOwnerEmail('')
      setNewRestaurantOwnerPassword('')
      setNewRestaurantSupervisorId('')
      setShowAddRestaurant(false)
      
    } catch (err: any) {
      console.error('خطأ في إنشاء المطعم:', err)
      if (err.code === 'auth/email-already-in-use') {
        toast.error('البريد الإلكتروني مستخدم مسبقاً')
      } else {
        toast.error('فشل إنشاء المطعم: ' + (err.message || 'خطأ غير معروف'))
      }
    } finally {
      setCreatingRestaurant(false)
    }
  }

  // ===== حساب الإحصائيات المالية =====
  const getFinanceStats = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

    const todayOrders = orders.filter(o => {
      const orderDate = o.createdAt?.toDate?.() || new Date(0)
      return orderDate >= today && o.status !== 'cancelled'
    })

    const weekOrders = orders.filter(o => {
      const orderDate = o.createdAt?.toDate?.() || new Date(0)
      return orderDate >= weekAgo && o.status !== 'cancelled'
    })

    const monthOrders = orders.filter(o => {
      const orderDate = o.createdAt?.toDate?.() || new Date(0)
      return orderDate >= monthAgo && o.status !== 'cancelled'
    })

    const deliveredOrders = orders.filter(o => o.status === 'delivered')

    return {
      todayRevenue: todayOrders.reduce((sum, o) => sum + (o.total || 0), 0),
      todayOrders: todayOrders.length,
      todayPlatformFee: todayOrders.reduce((sum, o) => sum + (o.platformFee || 0), 0),
      weekRevenue: weekOrders.reduce((sum, o) => sum + (o.total || 0), 0),
      weekOrders: weekOrders.length,
      weekPlatformFee: weekOrders.reduce((sum, o) => sum + (o.platformFee || 0), 0),
      monthRevenue: monthOrders.reduce((sum, o) => sum + (o.total || 0), 0),
      monthOrders: monthOrders.length,
      monthPlatformFee: monthOrders.reduce((sum, o) => sum + (o.platformFee || 0), 0),
      totalRevenue: deliveredOrders.reduce((sum, o) => sum + (o.total || 0), 0),
      totalPlatformFee: deliveredOrders.reduce((sum, o) => sum + (o.platformFee || 0), 0),
      totalAdminCommission: deliveredOrders.reduce((sum, o) => sum + (o.adminCommission || 0), 0),
    }
  }

  // ===== تحميل البيانات =====
  const loadData = async () => {
    try {
      // جلب جميع البيانات بالتوازي
      const [usersSnap, restaurantsSnap, menuSnap, ordersSnap, walletsSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'restaurants')),
        getDocs(collection(db, 'menuItems')),
        getDocs(collection(db, 'orders')),
        getDocs(collection(db, 'wallets')),
      ])

      // جلب المهام بشكل منفصل (قد لا تكون موجودة)
      let tasksSnap: any = { docs: [] }
      try {
        tasksSnap = await getDocs(collection(db, 'tasks'))
      } catch (err) {
        // لا توجد مهام بعد
      }

      // جلب طلبات الباقات
      let packageRequestsSnap: any = { docs: [] }
      try {
        packageRequestsSnap = await getDocs(collection(db, 'packageRequests'))
      } catch (err) {
        // لا توجد طلبات باقات بعد
      }

      // المستخدمين
      const usersData = usersSnap.docs.map(d => ({ uid: d.id, ...d.data() } as User))
      setUsers(usersData)
      
      // المطاعم
      const restaurantsData = restaurantsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Restaurant))
      setRestaurants(restaurantsData)
      
      // الطلبات
      const ordersData = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order))
      setOrders(ordersData)

      // المهام
      const tasksData: Task[] = tasksSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as Task))
      setTasks(tasksData.sort((a: Task, b: Task) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)))

      // طلبات الباقات
      const packageRequestsData: PackageRequest[] = packageRequestsSnap.docs.map((d: any) => ({ id: d.id, ...d.data() } as PackageRequest))
      setPackageRequests(packageRequestsData.sort((a: PackageRequest, b: PackageRequest) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)))
      
      // المحافظ
      const walletsData: Record<string, any> = {}
      walletsSnap.docs.forEach(d => {
        walletsData[d.id] = d.data()
      })
      
      // أرباح التطبيق
      const appWallet = walletsData['app_earnings'] || { balance: 0, totalEarnings: 0 }
      
      // حساب الإحصائيات
      const adminsData = usersData.filter(u => u.role === 'admin')
      const couriersData = usersData.filter(u => u.role === 'courier')
      const customersData = usersData.filter(u => u.role === 'customer')
      const ownersData = usersData.filter(u => u.role === 'owner')
      
      // بناء بيانات المشرفين مع المطاعم التابعة لهم
      const adminsWithRestaurants: Admin[] = adminsData.map(admin => {
        const adminRestaurants = restaurantsData.filter(r => r.referredBy === admin.uid)
        const wallet = walletsData[admin.uid] || { balance: 0, totalEarnings: 0 }
        return {
          uid: admin.uid,
          email: admin.email,
          name: admin.name,
          walletBalance: wallet.balance || 0,
          totalEarnings: wallet.totalEarnings || 0,
          restaurantsCount: adminRestaurants.length,
          restaurants: adminRestaurants,
        }
      })
      setAdmins(adminsWithRestaurants)
      
      setStats({
        users: usersData.length,
        restaurants: restaurantsData.length,
        menuItems: menuSnap.size,
        orders: ordersData.length,
        pendingOrders: ordersData.filter(o => o.status === 'pending').length,
        deliveredOrders: ordersData.filter(o => o.status === 'delivered').length,
        admins: adminsData.length,
        couriers: couriersData.length,
        customers: customersData.length,
        owners: ownersData.length,
        totalAppEarnings: appWallet.totalEarnings || 0,
      })

      // جلب الإعدادات
      const settingsSnap = await getDoc(doc(db, 'settings', 'general'))
      if (settingsSnap.exists()) {
        const data = settingsSnap.data() as AppSettings
        setSettings(data)
        setSettingsForm(data)
      } else {
        const defaultSettings: AppSettings = {
          deliveryFee: 7,
          minOrderAmount: 20,
          maxDeliveryDistance: 15,
          workingHours: { open: '09:00', close: '23:00' },
          maintenanceMode: false,
          appVersion: '1.0.0',
          platformFee: 1.0, // 1 ريال للتطبيق لكل منتج
          adminCommissionRate: 0.75, // 75 هللة للمشرف لكل منتج
        }
        setSettings(defaultSettings)
        setSettingsForm(defaultSettings)
      }
    } catch (err) {
      console.error('خطأ في تحميل البيانات:', err)
      toast.error('فشل تحميل البيانات')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleRefresh = () => {
    setRefreshing(true)
    loadData()
    toast.info('جاري تحديث البيانات...')
  }

  // ===== حفظ الإعدادات =====
  const handleSaveSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', 'general'), settingsForm, { merge: true })
      setSettings(settingsForm)
      setEditingSettings(false)
      toast.success('تم حفظ الإعدادات بنجاح ✅')
    } catch (err) {
      console.error('خطأ في حفظ الإعدادات:', err)
      toast.error('فشل حفظ الإعدادات')
    }
  }

  // ===== تحديث المطعم =====
  const handleUpdateRestaurant = async (id: string) => {
    try {
      await updateDoc(doc(db, 'restaurants', id), {
        ...restaurantForm,
        updatedAt: serverTimestamp(),
      })
      setEditingRestaurant(null)
      toast.success('تم تحديث المطعم بنجاح ✅')
      loadData()
    } catch (err) {
      console.error('خطأ في تحديث المطعم:', err)
      toast.error('فشل تحديث المطعم')
    }
  }

  // ===== رفع شعار المطعم =====
  const handleUploadLogo = async (id: string, file: File) => {
    try {
      // التحقق من نوع الملف
      if (!file.type.startsWith('image/')) {
        toast.warning('يرجى اختيار صورة فقط')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.warning('حجم الصورة كبير، يرجى اختيار صورة أقل من 5MB')
        return
      }
      setUploadingLogo(true)
      const cleanName = file.name.replace(/\s+/g, '_')
      const path = `restaurants/${id}/logo_${Date.now()}_${cleanName}`
      const storageRef = ref(storage, path)
      const metadata = {
        contentType: file.type || 'image/jpeg',
        cacheControl: 'public,max-age=31536000,immutable',
      }
      await uploadBytes(storageRef, file, metadata)
      const url = await getDownloadURL(storageRef)
      
      await updateDoc(doc(db, 'restaurants', id), {
        logoUrl: url,
        updatedAt: serverTimestamp(),
      })
      
      toast.success('تم رفع الشعار بنجاح ✅')
      loadData()
    } catch (err) {
      console.error('خطأ في رفع الشعار:', err)
      toast.error('فشل رفع الشعار')
    } finally {
      setUploadingLogo(false)
    }
  }

  // ===== حذف مطعم =====
  const handleDeleteRestaurant = async (id: string) => {
    const confirmed = await dialog.confirm('هل أنت متأكد من حذف هذا المطعم؟ لا يمكن التراجع!', { 
      title: 'حذف المطعم',
      dangerous: true 
    })
    if (!confirmed) return
    try {
      await deleteDoc(doc(db, 'restaurants', id))
      toast.success('تم حذف المطعم بنجاح')
      loadData()
    } catch (err) {
      console.error('خطأ في حذف المطعم:', err)
      toast.error('فشل حذف المطعم')
    }
  }

  // ===== تحديث المستخدم =====
  const handleUpdateUser = async (uid: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        ...userForm,
        updatedAt: serverTimestamp(),
      })
      setEditingUser(null)
      toast.success('تم تحديث المستخدم بنجاح ✅')
      loadData()
    } catch (err) {
      console.error('خطأ في تحديث المستخدم:', err)
      toast.error('فشل تحديث المستخدم')
    }
  }

  // ===== حذف مستخدم =====
  const handleDeleteUser = async (uid: string) => {
    const confirmed = await dialog.confirm('هل أنت متأكد من حذف هذا المستخدم؟ لا يمكن التراجع!', {
      title: 'حذف المستخدم',
      dangerous: true
    })
    if (!confirmed) return
    try {
      await deleteDoc(doc(db, 'users', uid))
      toast.success('تم حذف المستخدم من قاعدة البيانات')
      toast.warning('ملاحظة: يجب حذف المستخدم يدوياً من Firebase Auth')
      loadData()
    } catch (err) {
      console.error('خطأ في حذف المستخدم:', err)
      toast.error('فشل حذف المستخدم')
    }
  }

  // ===== تحديث حالة الطلب =====
  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      })
      toast.success('تم تحديث حالة الطلب ✅')
      loadData()
    } catch (err) {
      console.error('خطأ في تحديث الطلب:', err)
      toast.error('فشل تحديث الطلب')
    }
  }

  // ===== أسماء الأدوار =====
  const roleLabel = (role: string) => {
    switch (role) {
      case 'customer': return '👤 عميل'
      case 'owner': return '🏪 صاحب مطعم'
      case 'courier': return '🚗 مندوب'
      case 'admin': return '👑 مشرف'
      case 'developer': return '👨‍💻 مطور'
      case 'supervisor': return '👩‍💼 مشرفة مطاعم'
      case 'social_media': return '📱 سوشيال ميديا'
      case 'support': return '🎧 دعم فني'
      case 'accountant': return '💰 محاسب'
      default: return role
    }
  }

  // ===== أسماء حالات الطلب =====
  const statusLabel = (status: string) => {
    switch (status) {
      case 'pending': return '⏳ قيد المراجعة'
      case 'accepted': return '✅ مقبول'
      case 'preparing': return '👨‍🍳 قيد التحضير'
      case 'ready': return '📦 جاهز'
      case 'out_for_delivery': return '🚗 في الطريق'
      case 'delivered': return '✔️ تم التسليم'
      case 'cancelled': return '❌ ملغي'
      default: return status
    }
  }

  if (loading) {
    return (
      <RoleGate allow={['developer']}>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <RefreshCw className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <p className="text-lg text-gray-600">جاري تحميل لوحة المطور...</p>
          </div>
        </div>
      </RoleGate>
    )
  }

  return (
    <RoleGate allow={['developer']}>
      <div className="space-y-6 pb-8">
        {/* ===== رأس الصفحة الفاخر ===== */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-8 text-white shadow-2xl">
          {/* خلفية متحركة */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-sky-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
          </div>
          
          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-14 h-14 bg-gradient-to-br from-sky-400 to-sky-600 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/30">
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-black tracking-tight">مركز التحكم</h1>
                  <p className="text-sky-300/80 text-sm">Developer Console • سفرة البيت</p>
                </div>
              </div>
              <p className="text-slate-400 mt-3 max-w-xl">
                إدارة شاملة لجميع عمليات التطبيق، المستخدمين، المطاعم، الطلبات والمالية
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* زر التحديث */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm px-5 py-3 rounded-xl font-semibold transition border border-white/10 disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                تحديث البيانات
              </button>
              
              {/* زر المحاسبة */}
              <a
                href="/accounting"
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 px-5 py-3 rounded-xl font-semibold transition shadow-lg shadow-emerald-500/30"
              >
                <BarChart3 className="w-5 h-5" />
                المحاسبة
              </a>
            </div>
          </div>
          
          {/* إحصائيات سريعة في الهيدر */}
          <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-8">
            <QuickStat icon={<Users className="w-5 h-5" />} value={stats.users} label="المستخدمين" color="sky" />
            <QuickStat icon={<Building2 className="w-5 h-5" />} value={stats.restaurants} label="المطاعم" color="emerald" />
            <QuickStat icon={<Package className="w-5 h-5" />} value={stats.orders} label="الطلبات" color="purple" />
            <QuickStat icon={<Truck className="w-5 h-5" />} value={stats.couriers} label="المناديب" color="orange" />
            <QuickStat icon={<Crown className="w-5 h-5" />} value={stats.admins} label="المشرفين" color="amber" />
            <QuickStat icon={<Wallet className="w-5 h-5" />} value={`${stats.totalAppEarnings.toFixed(0)} ر.س`} label="الأرباح" color="green" />
          </div>
        </div>

        {/* ===== التبويبات الفاخرة ===== */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-2">
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'overview', label: 'نظرة عامة', icon: <Activity className="w-4 h-4" /> },
              { id: 'finance', label: 'المالية', icon: <Wallet className="w-4 h-4" /> },
              { id: 'restaurants', label: 'المطاعم', icon: <Building2 className="w-4 h-4" /> },
              { id: 'storeAnalytics', label: 'تحليلات', icon: <PieChart className="w-4 h-4" /> },
              { id: 'packages', label: 'الباقات', icon: <Crown className="w-4 h-4" />, badge: packageRequests.filter(r => ['pending', 'payment_sent'].includes(r.status)).length },
              { id: 'packageSettings', label: 'أسعار الباقات', icon: <Sparkles className="w-4 h-4" /> },
              { id: 'licenses', label: 'التراخيص', icon: <FileCheck className="w-4 h-4" /> },
              { id: 'orders', label: 'الطلبات', icon: <Package className="w-4 h-4" /> },
              { id: 'users', label: 'المستخدمين', icon: <Users className="w-4 h-4" /> },
              { id: 'couriers', label: 'المناديب', icon: <Truck className="w-4 h-4" /> },
              { id: 'admins', label: 'المشرفين', icon: <Crown className="w-4 h-4" /> },
              { id: 'employees', label: 'الموظفين', icon: <UserPlus className="w-4 h-4" /> },
              { id: 'tasks', label: 'المهام', icon: <Target className="w-4 h-4" /> },
              { id: 'activityLog', label: 'السجل', icon: <Clock className="w-4 h-4" /> },
              { id: 'settings', label: 'الإعدادات', icon: <Settings className="w-4 h-4" /> },
              { id: 'tools', label: 'الأدوات', icon: <Zap className="w-4 h-4" /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as Tab)
                  if (tab.id === 'activityLog') loadActivityLogs()
                }}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                  activeTab === tab.id 
                    ? 'bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-lg shadow-sky-500/30' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.badge && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ===== نظرة عامة ===== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* تنبيهات هامة */}
            {packageRequests.filter(r => ['pending', 'payment_sent'].includes(r.status)).length > 0 && (
              <div className="relative overflow-hidden bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-2xl p-6 text-white shadow-xl">
                <div className="absolute inset-0 bg-black/10" />
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10 flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                      <Bell className="w-7 h-7 animate-bounce" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">طلبات تحتاج انتباهك!</h3>
                      <p className="text-white/80">
                        {packageRequests.filter(r => r.status === 'pending').length > 0 && (
                          <span className="mr-3">⏳ {packageRequests.filter(r => r.status === 'pending').length} طلب جديد</span>
                        )}
                        {packageRequests.filter(r => r.status === 'payment_sent').length > 0 && (
                          <span>💳 {packageRequests.filter(r => r.status === 'payment_sent').length} بانتظار التأكيد</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('packages')}
                    className="bg-white text-orange-600 px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transition transform hover:scale-105"
                  >
                    عرض الطلبات ←
                  </button>
                </div>
              </div>
            )}

            {/* بطاقات الإحصائيات المتقدمة */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="المبيعات اليوم"
                value={`${orders.filter(o => {
                  const d = o.createdAt?.toDate?.() || new Date(o.createdAt)
                  const today = new Date()
                  return d.toDateString() === today.toDateString() && o.status === 'delivered'
                }).reduce((s, o) => s + (o.total || 0), 0).toFixed(0)} ر.س`}
                change={12.5}
                icon={<TrendingUp className="w-5 h-5" />}
                color="emerald"
              />
              <StatCard
                title="طلبات اليوم"
                value={orders.filter(o => {
                  const d = o.createdAt?.toDate?.() || new Date(o.createdAt)
                  const today = new Date()
                  return d.toDateString() === today.toDateString()
                }).length.toString()}
                change={8.3}
                icon={<Package className="w-5 h-5" />}
                color="sky"
              />
              <StatCard
                title="مشتركين التميز"
                value={restaurants.filter((r: any) => r.packageType === 'premium').length.toString()}
                subtitle={`من ${restaurants.length} مطعم`}
                icon={<Crown className="w-5 h-5" />}
                color="amber"
              />
              <StatCard
                title="معدل التوصيل"
                value={`${stats.orders > 0 ? ((stats.deliveredOrders / stats.orders) * 100).toFixed(0) : 0}%`}
                subtitle="نسبة الإتمام"
                icon={<Target className="w-5 h-5" />}
                color="purple"
              />
            </div>

            {/* إحصائيات الحسابات */}
            <div className="grid md:grid-cols-4 gap-4">
              <MiniStatCard
                icon={<CheckCircle className="w-5 h-5 text-emerald-500" />}
                value={users.filter((u: any) => u.isActive !== false).length}
                label="حسابات نشطة"
                bgColor="bg-emerald-50"
              />
              <MiniStatCard
                icon={<AlertCircle className="w-5 h-5 text-red-500" />}
                value={users.filter((u: any) => u.isActive === false).length}
                label="حسابات موقوفة"
                bgColor="bg-red-50"
              />
              <MiniStatCard
                icon={<Sparkles className="w-5 h-5 text-amber-500" />}
                value={restaurants.filter((r: any) => r.packageType === 'premium').length}
                label="باقة تميز"
                bgColor="bg-amber-50"
              />
              <MiniStatCard
                icon={<Package className="w-5 h-5 text-slate-500" />}
                value={restaurants.filter((r: any) => !r.packageType || r.packageType === 'free').length}
                label="باقة مجانية"
                bgColor="bg-slate-50"
              />
            </div>

            {/* إعدادات Firebase */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Server className="w-6 h-6 text-orange-500" />
                <h2 className="text-xl font-bold">إعدادات Firebase</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Project ID</p>
                  <p className="font-mono text-sm">{firebaseConfig.projectId}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Storage Bucket</p>
                  <p className="font-mono text-sm">{firebaseConfig.storageBucket}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/overview`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm bg-orange-100 hover:bg-orange-200 text-orange-700 px-3 py-1 rounded-lg"
                >
                  🔥 Console
                </a>
                <a
                  href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-lg"
                >
                  📊 Firestore
                </a>
                <a
                  href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded-lg"
                >
                  🔐 Auth
                </a>
                <a
                  href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/storage`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1 rounded-lg"
                >
                  📁 Storage
                </a>
              </div>
            </div>

            {/* توزيع المستخدمين */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4">📊 توزيع المستخدمين</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <p className="text-2xl font-bold text-blue-600">{stats.customers}</p>
                  <p className="text-sm text-gray-600">عملاء</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-xl">
                  <p className="text-2xl font-bold text-green-600">{stats.owners}</p>
                  <p className="text-sm text-gray-600">أصحاب مطاعم</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-xl">
                  <p className="text-2xl font-bold text-yellow-600">{stats.couriers}</p>
                  <p className="text-sm text-gray-600">مناديب</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-xl">
                  <p className="text-2xl font-bold text-purple-600">{stats.admins}</p>
                  <p className="text-sm text-gray-600">مشرفين</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-xl">
                  <p className="text-2xl font-bold text-red-600">1</p>
                  <p className="text-sm text-gray-600">مطور</p>
                </div>
              </div>
            </div>

            {/* روابط سريعة */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4">🔗 روابط سريعة</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link
                  to="/reports-admin"
                  className="flex items-center gap-3 bg-amber-50 hover:bg-amber-100 text-amber-800 p-4 rounded-xl transition"
                >
                  <span className="text-2xl">⚠️</span>
                  <div className="text-right">
                    <p className="font-bold">إدارة البلاغات</p>
                    <p className="text-xs opacity-75">مشاكل المستخدمين</p>
                  </div>
                </Link>
                <Link
                  to="/accounting"
                  className="flex items-center gap-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 p-4 rounded-xl transition"
                >
                  <span className="text-2xl">💰</span>
                  <div className="text-right">
                    <p className="font-bold">لوحة المحاسبة</p>
                    <p className="text-xs opacity-75">التقارير المالية</p>
                  </div>
                </Link>
                <Link
                  to="/support-admin"
                  className="flex items-center gap-3 bg-blue-50 hover:bg-blue-100 text-blue-800 p-4 rounded-xl transition"
                >
                  <span className="text-2xl">🎧</span>
                  <div className="text-right">
                    <p className="font-bold">إدارة الدعم</p>
                    <p className="text-xs opacity-75">تذاكر الدعم الفني</p>
                  </div>
                </Link>
                <Link
                  to="/problems-admin"
                  className="flex items-center gap-3 bg-red-50 hover:bg-red-100 text-red-800 p-4 rounded-xl transition"
                >
                  <span className="text-2xl">🚨</span>
                  <div className="text-right">
                    <p className="font-bold">مراقبة المشاكل</p>
                    <p className="text-xs opacity-75">مشاكل النظام</p>
                  </div>
                </Link>
              </div>
            </div>

            {/* أوقات الذروة */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-500" />
                أوقات الذروة
              </h2>
              <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                {Array.from({ length: 24 }, (_, hour) => {
                  const hourOrders = orders.filter(o => {
                    const d = o.createdAt?.toDate?.() || new Date(o.createdAt)
                    return d.getHours() === hour
                  }).length
                  const maxOrders = Math.max(...Array.from({ length: 24 }, (_, h) => 
                    orders.filter(o => {
                      const d = o.createdAt?.toDate?.() || new Date(o.createdAt)
                      return d.getHours() === h
                    }).length
                  ), 1)
                  const intensity = hourOrders / maxOrders
                  return (
                    <div 
                      key={hour}
                      className="text-center"
                      title={`${hour}:00 - ${hourOrders} طلب`}
                    >
                      <div
                        className={`h-16 rounded-lg mb-1 ${
                          intensity > 0.8 ? 'bg-red-500' :
                          intensity > 0.6 ? 'bg-orange-500' :
                          intensity > 0.4 ? 'bg-yellow-500' :
                          intensity > 0.2 ? 'bg-green-400' :
                          intensity > 0 ? 'bg-green-200' : 'bg-gray-100'
                        }`}
                        style={{ opacity: Math.max(0.3, intensity) }}
                      />
                      <span className="text-xs text-gray-500">{hour}</span>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center justify-center gap-4 mt-4 text-sm">
                <span className="flex items-center gap-1"><div className="w-4 h-4 bg-red-500 rounded" /> ذروة عالية</span>
                <span className="flex items-center gap-1"><div className="w-4 h-4 bg-orange-500 rounded" /> نشاط مرتفع</span>
                <span className="flex items-center gap-1"><div className="w-4 h-4 bg-yellow-500 rounded" /> متوسط</span>
                <span className="flex items-center gap-1"><div className="w-4 h-4 bg-green-400 rounded" /> منخفض</span>
              </div>
            </div>

            {/* أفضل المطاعم */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-500" />
                أفضل 5 مطاعم (حسب الطلبات)
              </h2>
              <div className="space-y-3">
                {restaurants
                  .map(r => ({
                    ...r,
                    orderCount: orders.filter(o => o.restaurantId === r.id && o.status === 'delivered').length,
                    revenue: orders.filter(o => o.restaurantId === r.id && o.status === 'delivered')
                      .reduce((sum, o) => sum + (o.subtotal || 0), 0)
                  }))
                  .sort((a, b) => b.orderCount - a.orderCount)
                  .slice(0, 5)
                  .map((r, idx) => (
                    <div key={r.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                        idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-amber-700' : 'bg-gray-300'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold">{r.name}</p>
                        <p className="text-sm text-gray-500">{r.city || 'غير محدد'}</p>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-emerald-600">{r.orderCount} طلب</p>
                        <p className="text-xs text-gray-500">{r.revenue.toFixed(0)} ر.س</p>
                      </div>
                    </div>
                  ))
                }
                {restaurants.length === 0 && (
                  <p className="text-center text-gray-500 py-4">لا توجد بيانات كافية</p>
                )}
              </div>
            </div>

            {/* إحصائيات المناديب */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Truck className="w-5 h-5 text-cyan-500" />
                أفضل 5 مناديب (حسب التوصيلات)
              </h2>
              <div className="space-y-3">
                {(() => {
                  // حساب توصيلات كل مندوب
                  const courierStats = orders
                    .filter(o => o.courierId && o.status === 'delivered')
                    .reduce((acc, o) => {
                      if (!acc[o.courierId!]) {
                        acc[o.courierId!] = { deliveries: 0, earnings: 0 }
                      }
                      acc[o.courierId!].deliveries++
                      acc[o.courierId!].earnings += (o.deliveryFee || 0) - (o.courierPlatformFee || 0)
                      return acc
                    }, {} as Record<string, { deliveries: number, earnings: number }>)

                  const courierList = users
                    .filter(u => u.role === 'courier' && courierStats[u.uid])
                    .map(u => ({
                      ...u,
                      ...courierStats[u.uid]
                    }))
                    .sort((a, b) => b.deliveries - a.deliveries)
                    .slice(0, 5)

                  if (courierList.length === 0) {
                    return <p className="text-center text-gray-500 py-4">لا توجد بيانات كافية</p>
                  }

                  return courierList.map((c, idx) => (
                    <div key={c.uid} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                        idx === 0 ? 'bg-cyan-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-cyan-700' : 'bg-gray-300'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold">{c.name || 'مندوب'}</p>
                        <p className="text-sm text-gray-500">{c.phone || c.email}</p>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-cyan-600">{c.deliveries} توصيلة</p>
                        <p className="text-xs text-gray-500">{c.earnings.toFixed(0)} ر.س</p>
                      </div>
                    </div>
                  ))
                })()}
              </div>
            </div>
          </div>
        )}

        {/* ===== المالية ===== */}
        {activeTab === 'finance' && (
          <div className="space-y-6">
            {/* رابط لوحة المحاسبة الكاملة */}
            <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold mb-1">📊 لوحة المحاسبة التفصيلية</h3>
                <p className="text-white/80 text-sm">عرض تقارير مفصلة، محافظ الأسر والمناديب، والإحصائيات الشهرية</p>
              </div>
              <a
                href="/accounting"
                className="bg-white text-emerald-600 px-6 py-3 rounded-xl font-bold hover:bg-emerald-50 transition flex items-center gap-2"
              >
                <Wallet className="w-5 h-5" />
                فتح المحاسبة
              </a>
            </div>

            {(() => {
              const financeStats = getFinanceStats()
              return (
                <>
                  {/* ملخص مالي */}
                  <div className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-2xl shadow-lg p-6 text-white">
                    <h2 className="text-2xl font-bold mb-4">💰 الملخص المالي</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white/20 rounded-xl p-4 text-center">
                        <p className="text-3xl font-bold">{financeStats.totalRevenue.toFixed(0)}</p>
                        <p className="text-sm opacity-90">إجمالي المبيعات (ر.س)</p>
                      </div>
                      <div className="bg-white/20 rounded-xl p-4 text-center">
                        <p className="text-3xl font-bold">{financeStats.totalPlatformFee.toFixed(2)}</p>
                        <p className="text-sm opacity-90">رسوم التطبيق (ر.س)</p>
                      </div>
                      <div className="bg-white/20 rounded-xl p-4 text-center">
                        <p className="text-3xl font-bold">{financeStats.totalAdminCommission.toFixed(2)}</p>
                        <p className="text-sm opacity-90">عمولات المشرفين (ر.س)</p>
                      </div>
                      <div className="bg-white/20 rounded-xl p-4 text-center">
                        <p className="text-3xl font-bold">{(financeStats.totalPlatformFee + financeStats.totalAdminCommission).toFixed(2)}</p>
                        <p className="text-sm opacity-90">إجمالي الأرباح (ر.س)</p>
                      </div>
                    </div>
                  </div>

                  {/* إحصائيات زمنية */}
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* اليوم */}
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                      <h3 className="text-lg font-bold text-blue-600 mb-4">📅 اليوم</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">الطلبات:</span>
                          <span className="font-bold">{financeStats.todayOrders}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">المبيعات:</span>
                          <span className="font-bold">{financeStats.todayRevenue.toFixed(2)} ر.س</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">رسوم التطبيق:</span>
                          <span className="font-bold text-green-600">{financeStats.todayPlatformFee.toFixed(2)} ر.س</span>
                        </div>
                      </div>
                    </div>

                    {/* الأسبوع */}
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                      <h3 className="text-lg font-bold text-purple-600 mb-4">📅 آخر 7 أيام</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">الطلبات:</span>
                          <span className="font-bold">{financeStats.weekOrders}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">المبيعات:</span>
                          <span className="font-bold">{financeStats.weekRevenue.toFixed(2)} ر.س</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">رسوم التطبيق:</span>
                          <span className="font-bold text-green-600">{financeStats.weekPlatformFee.toFixed(2)} ر.س</span>
                        </div>
                      </div>
                    </div>

                    {/* الشهر */}
                    <div className="bg-white rounded-2xl shadow-lg p-6">
                      <h3 className="text-lg font-bold text-orange-600 mb-4">📅 آخر 30 يوم</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600">الطلبات:</span>
                          <span className="font-bold">{financeStats.monthOrders}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">المبيعات:</span>
                          <span className="font-bold">{financeStats.monthRevenue.toFixed(2)} ر.س</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">رسوم التطبيق:</span>
                          <span className="font-bold text-green-600">{financeStats.monthPlatformFee.toFixed(2)} ر.س</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* أعلى المطاعم أداءً */}
                  <div className="bg-white rounded-2xl shadow-lg p-6">
                    <h3 className="text-lg font-bold mb-4">🏆 أعلى المطاعم أداءً</h3>
                    <div className="space-y-3">
                      {restaurants
                        .map(r => ({
                          ...r,
                          ordersCount: orders.filter(o => o.restaurantId === r.id && o.status === 'delivered').length,
                          revenue: orders.filter(o => o.restaurantId === r.id && o.status === 'delivered').reduce((sum, o) => sum + (o.total || 0), 0),
                        }))
                        .sort((a, b) => b.revenue - a.revenue)
                        .slice(0, 5)
                        .map((r, i) => (
                          <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
                              <div>
                                <p className="font-bold">{r.name}</p>
                                <p className="text-sm text-gray-500">{r.ordersCount} طلب</p>
                              </div>
                            </div>
                            <p className="font-bold text-green-600">{r.revenue.toFixed(2)} ر.س</p>
                          </div>
                        ))}
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        )}

        {/* ===== المطاعم ===== */}
        {activeTab === 'restaurants' && (
          <div className="space-y-6">
            {/* ===== شريط البحث والفلاتر الفاخر ===== */}
            <div className="bg-gradient-to-br from-white via-sky-50/30 to-emerald-50/30 rounded-3xl p-6 border border-sky-100 shadow-lg shadow-sky-100/50">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
                    <Store className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                      إدارة المطاعم
                    </h2>
                    <p className="text-sm text-gray-500">
                      {getFilteredRestaurants().length} من {restaurants.length} مطعم
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddRestaurant(!showAddRestaurant)}
                  className="group flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white px-5 py-3 rounded-2xl font-bold shadow-lg shadow-emerald-200 transition-all duration-300 hover:scale-105"
                >
                  {showAddRestaurant ? (
                    <>
                      <X className="w-5 h-5" />
                      إلغاء
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                      إضافة مطعم جديد
                    </>
                  )}
                </button>
              </div>

              {/* شريط البحث */}
              <div className="relative mb-4">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="ابحث بالاسم، الإيميل، الهاتف، أو المدينة..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pr-12 pl-4 py-4 border-2 border-sky-100 rounded-2xl focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition-all bg-white/80 backdrop-blur text-lg"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* فلاتر متقدمة */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Filter className="w-4 h-4" />
                  <span className="font-medium">فلتر:</span>
                </div>
                {[
                  { value: 'all', label: 'الكل', icon: '🏪' },
                  { value: 'premium', label: 'بريميوم', icon: '👑' },
                  { value: 'free', label: 'مجاني', icon: '🆓' },
                  { value: 'verified', label: 'موثق', icon: '✅' },
                  { value: 'unverified', label: 'غير موثق', icon: '⏳' }
                ].map(filter => (
                  <button
                    key={filter.value}
                    onClick={() => setRestaurantFilter(filter.value as any)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      restaurantFilter === filter.value
                        ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-200'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-emerald-300 hover:bg-emerald-50'
                    }`}
                  >
                    {filter.icon} {filter.label}
                  </button>
                ))}

                <div className="h-6 w-px bg-gray-200 mx-2 hidden sm:block" />

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <SortAsc className="w-4 h-4" />
                  <span className="font-medium">ترتيب:</span>
                </div>
                <select
                  value={sortOrder}
                  onChange={e => setSortOrder(e.target.value as any)}
                  className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                >
                  <option value="newest">الأحدث أولاً</option>
                  <option value="oldest">الأقدم أولاً</option>
                  <option value="name">الاسم (أ-ي)</option>
                </select>
              </div>
            </div>

            {/* نموذج إضافة مطعم */}
            {showAddRestaurant && (
              <div className="bg-green-50 rounded-2xl p-6 border-2 border-green-200">
                <h3 className="text-lg font-bold text-green-800 mb-4">🏪 إضافة مطعم جديد</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">اسم المطعم *</label>
                    <input
                      type="text"
                      placeholder="مثال: مطعم الشام"
                      value={newRestaurantName}
                      onChange={e => setNewRestaurantName(e.target.value)}
                      className="w-full border rounded-xl p-3"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">المدينة</label>
                    <input
                      type="text"
                      placeholder="مثال: الرياض"
                      value={newRestaurantCity}
                      onChange={e => setNewRestaurantCity(e.target.value)}
                      className="w-full border rounded-xl p-3"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">هاتف المطعم</label>
                    <input
                      type="tel"
                      placeholder="05xxxxxxxx"
                      value={newRestaurantPhone}
                      onChange={e => setNewRestaurantPhone(e.target.value)}
                      className="w-full border rounded-xl p-3"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">إيميل المطعم</label>
                    <input
                      type="email"
                      placeholder="restaurant@example.com"
                      value={newRestaurantEmail}
                      onChange={e => setNewRestaurantEmail(e.target.value)}
                      className="w-full border rounded-xl p-3"
                    />
                  </div>
                </div>
                
                <div className="border-t mt-4 pt-4">
                  <h4 className="font-bold text-green-800 mb-3">�‍💼 تعيين مشرف على المطعم</h4>
                  <select
                    value={newRestaurantSupervisorId}
                    onChange={e => setNewRestaurantSupervisorId(e.target.value)}
                    className="w-full border rounded-xl p-3"
                  >
                    <option value="">-- بدون مشرف --</option>
                    {users
                      .filter(u => u.role === 'supervisor')
                      .map(sup => (
                        <option key={sup.uid} value={sup.uid}>
                          👩‍💼 {sup.name || sup.email}
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">المشرف يتابع المطعم ويديره من لوحة تحكم المشرفين</p>
                </div>

                <div className="border-t mt-4 pt-4">
                  <h4 className="font-bold text-green-800 mb-3">�👤 بيانات صاحب المطعم (لتسجيل الدخول)</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600 block mb-1">إيميل صاحب المطعم *</label>
                      <input
                        type="email"
                        placeholder="owner@example.com"
                        value={newRestaurantOwnerEmail}
                        onChange={e => setNewRestaurantOwnerEmail(e.target.value)}
                        className="w-full border rounded-xl p-3"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 block mb-1">كلمة المرور *</label>
                      <input
                        type="password"
                        placeholder="6 أحرف على الأقل"
                        value={newRestaurantOwnerPassword}
                        onChange={e => setNewRestaurantOwnerPassword(e.target.value)}
                        className="w-full border rounded-xl p-3"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCreateNewRestaurant}
                  disabled={creatingRestaurant || !newRestaurantName.trim() || !newRestaurantOwnerEmail.trim() || !newRestaurantOwnerPassword.trim()}
                  className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creatingRestaurant ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      جاري الإنشاء...
                    </>
                  ) : (
                    '🏪 إنشاء المطعم'
                  )}
                </button>
              </div>
            )}
            
            {/* قائمة المطاعم المفلترة */}
            <div className="space-y-4">
              {getFilteredRestaurants().length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <Search className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-600 mb-2">لا توجد نتائج</h3>
                  <p className="text-gray-500">جرب تغيير الفلاتر أو كلمة البحث</p>
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setRestaurantFilter('all')
                    }}
                    className="mt-4 px-6 py-2 bg-sky-100 text-sky-600 rounded-xl font-medium hover:bg-sky-200 transition-colors"
                  >
                    إعادة تعيين الفلاتر
                  </button>
                </div>
              ) : (
                getFilteredRestaurants().map(restaurant => (
                <div key={restaurant.id} className="bg-white rounded-2xl shadow-lg shadow-gray-100 border border-gray-100 p-5 hover:shadow-xl transition-all duration-300">
                  {editingRestaurant === restaurant.id ? (
                    // وضع التحرير
                    <div className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm text-gray-600">اسم المطعم</label>
                          <input
                            type="text"
                            value={restaurantForm.name || ''}
                            onChange={e => setRestaurantForm({ ...restaurantForm, name: e.target.value })}
                            className="w-full border rounded-xl p-2 mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-gray-600">رقم الهاتف</label>
                          <input
                            type="text"
                            value={restaurantForm.phone || ''}
                            onChange={e => setRestaurantForm({ ...restaurantForm, phone: e.target.value })}
                            className="w-full border rounded-xl p-2 mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-gray-600">البريد الإلكتروني</label>
                          <input
                            type="email"
                            value={restaurantForm.email || ''}
                            onChange={e => setRestaurantForm({ ...restaurantForm, email: e.target.value })}
                            className="w-full border rounded-xl p-2 mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-sm text-gray-600">المدينة</label>
                          <input
                            type="text"
                            value={restaurantForm.city || ''}
                            onChange={e => setRestaurantForm({ ...restaurantForm, city: e.target.value })}
                            className="w-full border rounded-xl p-2 mt-1"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-sm text-gray-600">العنوان</label>
                          <input
                            type="text"
                            value={restaurantForm.location || ''}
                            onChange={e => setRestaurantForm({ ...restaurantForm, location: e.target.value })}
                            className="w-full border rounded-xl p-2 mt-1"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-sm text-gray-600">ربط بمشرف عمولة (admin)</label>
                          <select
                            value={restaurantForm.referredBy || ''}
                            onChange={e => setRestaurantForm({ ...restaurantForm, referredBy: e.target.value })}
                            className="w-full border rounded-xl p-2 mt-1"
                          >
                            <option value="">-- بدون مشرف عمولة --</option>
                            {users
                              .filter(u => u.role === 'admin')
                              .map(admin => (
                                <option key={admin.uid} value={admin.uid}>
                                  👑 {admin.name || admin.email}
                                </option>
                              ))}
                          </select>
                          <p className="text-xs text-gray-500 mt-1">
                            المشرف المرتبط يحصل على عمولة من طلبات هذا المطعم
                          </p>
                        </div>
                        <div className="md:col-span-2">
                          <label className="text-sm text-gray-600">👩‍💼 تعيين مشرف (supervisor)</label>
                          <select
                            value={restaurantForm.supervisorId || ''}
                            onChange={e => setRestaurantForm({ ...restaurantForm, supervisorId: e.target.value || undefined })}
                            className="w-full border rounded-xl p-2 mt-1"
                          >
                            <option value="">-- بدون مشرف --</option>
                            {users
                              .filter(u => u.role === 'supervisor')
                              .map(sup => (
                                <option key={sup.uid} value={sup.uid}>
                                  👩‍💼 {sup.name || sup.email}
                                </option>
                              ))}
                          </select>
                          <p className="text-xs text-gray-500 mt-1">
                            المشرف يتابع المطعم ويديره من لوحة تحكم المشرفين
                          </p>
                        </div>
                      </div>
                      
                      {/* رفع الشعار */}
                      <div>
                        <label className="text-sm text-gray-600">شعار المطعم</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => {
                            const file = e.target.files?.[0]
                            if (file) handleUploadLogo(restaurant.id, file)
                          }}
                          className="w-full border rounded-xl p-2 mt-1"
                          disabled={uploadingLogo}
                        />
                        {uploadingLogo && <p className="text-sm text-gray-500 mt-1">جاري الرفع...</p>}
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateRestaurant(restaurant.id)}
                          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl"
                        >
                          <Save className="w-4 h-4" /> حفظ
                        </button>
                        <button
                          onClick={() => setEditingRestaurant(null)}
                          className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-xl"
                        >
                          <X className="w-4 h-4" /> إلغاء
                        </button>
                      </div>
                    </div>
                  ) : (
                    // وضع العرض
                    <div className="flex items-start gap-4">
                      {/* الشعار */}
                      <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                        {restaurant.logoUrl ? (
                          <img src={restaurant.logoUrl} alt={restaurant.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">🏪</div>
                        )}
                      </div>
                      
                      {/* التفاصيل */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg">{restaurant.name}</h3>
                          {restaurant.isVerified && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                              <CheckCircle className="w-3 h-3" /> موثقة
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 space-y-1 mt-1">
                          {restaurant.phone && <p>📱 {restaurant.phone}</p>}
                          {restaurant.email && <p>📧 {restaurant.email}</p>}
                          {restaurant.city && <p>📍 {restaurant.city}</p>}
                          {restaurant.referredBy && (
                            <p className="text-purple-600">
                              👑 مضاف من: {admins.find(a => a.uid === restaurant.referredBy)?.name || restaurant.referredBy.slice(0, 8)}
                            </p>
                          )}
                          {restaurant.supervisorId && (
                            <p className="text-indigo-600">
                              👩‍💼 المشرف: {users.find(u => u.uid === restaurant.supervisorId)?.name || restaurant.supervisorId.slice(0, 8)}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* الأزرار */}
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          {/* زر التوثيق */}
                          <button
                            onClick={async () => {
                              const newStatus = !restaurant.isVerified
                              const confirmed = await dialog.confirm(
                                newStatus 
                                  ? `هل تريد توثيق أسرة "${restaurant.name}"؟ ستظهر علامة التوثيق للعملاء.`
                                  : `هل تريد إلغاء توثيق أسرة "${restaurant.name}"؟`,
                                { 
                                  title: newStatus ? '✅ توثيق الأسرة' : '❌ إلغاء التوثيق',
                                  confirmText: newStatus ? 'نعم، وثّق' : 'نعم، ألغِ التوثيق',
                                }
                              )
                              if (!confirmed) return
                              try {
                                await updateDoc(doc(db, 'restaurants', restaurant.id), {
                                  isVerified: newStatus,
                                  verifiedAt: newStatus ? serverTimestamp() : null,
                                  updatedAt: serverTimestamp(),
                                })
                                toast.success(newStatus ? 'تم توثيق الأسرة ✅' : 'تم إلغاء التوثيق')
                                loadData()
                              } catch (err) {
                                toast.error('حدث خطأ')
                                console.error(err)
                              }
                            }}
                            className={`p-2 rounded-xl ${restaurant.isVerified ? 'bg-green-100 hover:bg-green-200 text-green-600' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
                            title={restaurant.isVerified ? 'إلغاء التوثيق' : 'توثيق الأسرة'}
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingRestaurant(restaurant.id)
                              setRestaurantForm(restaurant)
                            }}
                            className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-xl"
                            title="تحرير"
                          >
                            <Edit3 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRestaurant(restaurant.id)}
                            className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl"
                            title="حذف"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                        {/* أزرار الباقة */}
                        <div className="flex gap-2 items-center">
                          {(restaurant as any).packageType === 'premium' ? (
                            <>
                              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full flex items-center gap-1">
                                ✨ باقة التميز
                              </span>
                              <button
                                onClick={() => handleCancelPremium(restaurant)}
                                className="text-xs bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1 rounded-lg"
                              >
                                إلغاء الباقة
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleActivatePremium(restaurant)}
                              className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 px-3 py-1 rounded-lg flex items-center gap-1"
                            >
                              ✨ تفعيل باقة التميز
                            </button>
                          )}
                        </div>
                        {/* ربط سريع بمشرف عمولة */}
                        <select
                          value={restaurant.referredBy || ''}
                          onChange={async (e) => {
                            const newAdminId = e.target.value
                            try {
                              await updateDoc(doc(db, 'restaurants', restaurant.id), {
                                referredBy: newAdminId || null,
                                updatedAt: serverTimestamp()
                              })
                              toast.success(newAdminId ? 'تم ربط المطعم بمشرف العمولة' : 'تم إلغاء ربط مشرف العمولة')
                              loadData()
                            } catch (err) {
                              toast.error('فشل في تحديث الربط')
                            }
                          }}
                          className="text-xs border rounded-lg p-1"
                          title="ربط بمشرف عمولة"
                        >
                          <option value="">👑 بدون مشرف عمولة</option>
                          {users
                            .filter(u => u.role === 'admin')
                            .map(admin => (
                              <option key={admin.uid} value={admin.uid}>
                                👑 {admin.name || admin.email}
                              </option>
                            ))}
                        </select>
                        {/* تعيين مشرف (supervisor) */}
                        <select
                          value={restaurant.supervisorId || ''}
                          onChange={async (e) => {
                            const newSupId = e.target.value
                            try {
                              await updateDoc(doc(db, 'restaurants', restaurant.id), {
                                supervisorId: newSupId || null,
                                updatedAt: serverTimestamp()
                              })
                              toast.success(newSupId ? 'تم تعيين المشرف للمطعم ✅' : 'تم إلغاء تعيين المشرف')
                              loadData()
                            } catch (err) {
                              toast.error('فشل في تعيين المشرف')
                            }
                          }}
                          className="text-xs border rounded-lg p-1"
                          title="تعيين مشرف"
                        >
                          <option value="">👩‍💼 بدون مشرف</option>
                          {users
                            .filter(u => u.role === 'supervisor')
                            .map(sup => (
                              <option key={sup.uid} value={sup.uid}>
                                👩‍💼 {sup.name || sup.email}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              ))
              )}
            </div>
          </div>
        )}

        {/* ===== الطلبات ===== */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* ===== شريط البحث والفلاتر الفاخر للطلبات ===== */}
            <div className="bg-gradient-to-br from-white via-amber-50/30 to-orange-50/30 rounded-3xl p-6 border border-amber-100 shadow-lg shadow-amber-100/50">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                      إدارة الطلبات
                    </h2>
                    <p className="text-sm text-gray-500">
                      {getFilteredOrders().length} من {orders.length} طلب
                    </p>
                  </div>
                </div>
              </div>

              {/* شريط البحث */}
              <div className="relative mb-4">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="ابحث برقم الطلب، اسم المطعم، أو العنوان..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pr-12 pl-4 py-4 border-2 border-amber-100 rounded-2xl focus:border-amber-400 focus:ring-4 focus:ring-amber-100 transition-all bg-white/80 backdrop-blur text-lg"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* فلاتر متقدمة */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Filter className="w-4 h-4" />
                  <span className="font-medium">الحالة:</span>
                </div>
                {[
                  { value: 'all', label: 'الكل', icon: '📦' },
                  { value: 'pending', label: 'جاري', icon: '⏳' },
                  { value: 'delivered', label: 'مكتمل', icon: '✅' },
                  { value: 'cancelled', label: 'ملغي', icon: '❌' }
                ].map(filter => (
                  <button
                    key={filter.value}
                    onClick={() => setOrderFilter(filter.value as any)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      orderFilter === filter.value
                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-200'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-amber-300 hover:bg-amber-50'
                    }`}
                  >
                    {filter.icon} {filter.label}
                  </button>
                ))}

                <div className="h-6 w-px bg-gray-200 mx-2 hidden sm:block" />

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">الفترة:</span>
                </div>
                {[
                  { value: 'all', label: 'الكل' },
                  { value: 'today', label: 'اليوم' },
                  { value: 'week', label: 'الأسبوع' },
                  { value: 'month', label: 'الشهر' }
                ].map(range => (
                  <button
                    key={range.value}
                    onClick={() => setDateRange(range.value as any)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      dateRange === range.value
                        ? 'bg-amber-100 text-amber-700'
                        : 'text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}

                <div className="h-6 w-px bg-gray-200 mx-2 hidden sm:block" />

                <select
                  value={sortOrder}
                  onChange={e => setSortOrder(e.target.value as any)}
                  className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                >
                  <option value="newest">الأحدث أولاً</option>
                  <option value="oldest">الأقدم أولاً</option>
                </select>
              </div>
            </div>

            {/* قائمة الطلبات */}
            
            <div className="space-y-4">
              {getFilteredOrders().length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <Package className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-600 mb-2">لا توجد طلبات</h3>
                  <p className="text-gray-500">جرب تغيير الفلاتر أو الفترة الزمنية</p>
                  <button
                    onClick={() => {
                      setSearchQuery('')
                      setOrderFilter('all')
                      setDateRange('all')
                    }}
                    className="mt-4 px-6 py-2 bg-amber-100 text-amber-600 rounded-xl font-medium hover:bg-amber-200 transition-colors"
                  >
                    إعادة تعيين الفلاتر
                  </button>
                </div>
              ) : (
              getFilteredOrders().map(order => (
                  <div key={order.id} className="bg-white rounded-2xl shadow-lg shadow-gray-100 border border-gray-100 p-5 hover:shadow-xl transition-all duration-300">
                    <div className="flex items-start justify-between flex-wrap gap-4">
                      <div>
                        <h3 className="font-bold text-lg">طلب #{order.id.slice(-8)}</h3>
                        <p className="text-sm text-gray-600">🏪 {order.restaurantName || 'مطعم'}</p>
                        <p className="text-sm text-gray-600">📍 {order.address}</p>
                        <p className="text-sm text-gray-600">💰 {order.total?.toFixed(2)} ر.س</p>
                        {order.platformFee && (
                          <p className="text-xs text-green-600">
                            رسوم التطبيق: {order.platformFee} ر.س 
                            {order.adminCommission ? ` | عمولة المشرف: ${order.adminCommission} ر.س` : ''}
                          </p>
                        )}
                      </div>
                      
                      <div className="text-left">
                        <span className={`inline-block px-3 py-1.5 rounded-xl text-sm font-bold ${
                          order.status === 'delivered' ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700' :
                          order.status === 'cancelled' ? 'bg-gradient-to-r from-red-100 to-pink-100 text-red-700' :
                          order.status === 'pending' ? 'bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-700' :
                          'bg-gradient-to-r from-blue-100 to-sky-100 text-blue-700'
                        }`}>
                          {statusLabel(order.status)}
                        </span>
                        
                        {/* تغيير الحالة */}
                        <select
                          value={order.status}
                          onChange={e => handleUpdateOrderStatus(order.id, e.target.value)}
                          className="mt-2 w-full border rounded-lg p-1 text-sm"
                        >
                          <option value="pending">قيد المراجعة</option>
                          <option value="accepted">مقبول</option>
                          <option value="preparing">قيد التحضير</option>
                          <option value="ready">جاهز</option>
                          <option value="out_for_delivery">في الطريق</option>
                          <option value="delivered">تم التسليم</option>
                          <option value="cancelled">ملغي</option>
                        </select>
                      </div>
                    </div>
                    
                    {/* الأصناف */}
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-gray-500 mb-1">الأصناف:</p>
                      <div className="flex flex-wrap gap-2">
                        {order.items?.map((item, i) => (
                          <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded-lg">
                            {item.name} × {item.qty}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ===== المستخدمين ===== */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* ===== شريط البحث والفلاتر الفاخر للمستخدمين ===== */}
            <div className="bg-gradient-to-br from-white via-violet-50/30 to-purple-50/30 rounded-3xl p-6 border border-violet-100 shadow-lg shadow-violet-100/50">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-200">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                      إدارة المستخدمين
                    </h2>
                    <p className="text-sm text-gray-500">
                      {getFilteredUsers().length} من {users.length} مستخدم
                    </p>
                  </div>
                </div>
              </div>

              {/* شريط البحث */}
              <div className="relative mb-4">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="ابحث بالاسم، الإيميل، أو رقم الهاتف..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pr-12 pl-4 py-4 border-2 border-violet-100 rounded-2xl focus:border-violet-400 focus:ring-4 focus:ring-violet-100 transition-all bg-white/80 backdrop-blur text-lg"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* فلاتر متقدمة */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Filter className="w-4 h-4" />
                  <span className="font-medium">الدور:</span>
                </div>
                {[
                  { value: 'all', label: 'الكل', icon: '👥', color: 'violet' },
                  { value: 'customer', label: 'عميل', icon: '🛒' },
                  { value: 'owner', label: 'مطعم', icon: '🏪' },
                  { value: 'courier', label: 'مندوب', icon: '🚗' },
                  { value: 'admin', label: 'مشرف', icon: '👑' },
                  { value: 'supervisor', label: 'مشرفة مطاعم', icon: '👩‍💼' },
                  { value: 'social_media', label: 'سوشيال ميديا', icon: '📱' },
                  { value: 'support', label: 'دعم فني', icon: '🎧' },
                  { value: 'accountant', label: 'محاسب', icon: '💰' }
                ].map(filter => (
                  <button
                    key={filter.value}
                    onClick={() => setUserFilter(filter.value as any)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      userFilter === filter.value
                        ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-200'
                        : 'bg-white border border-gray-200 text-gray-600 hover:border-violet-300 hover:bg-violet-50'
                    }`}
                  >
                    {filter.icon} {filter.label}
                  </button>
                ))}

                <div className="h-6 w-px bg-gray-200 mx-2 hidden sm:block" />

                <select
                  value={sortOrder}
                  onChange={e => setSortOrder(e.target.value as any)}
                  className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                >
                  <option value="newest">الأحدث أولاً</option>
                  <option value="oldest">الأقدم أولاً</option>
                  <option value="name">الاسم (أ-ي)</option>
                </select>
              </div>
            </div>

            {/* قائمة المستخدمين */}
            {getFilteredUsers().length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm">
                <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <Users className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-600 mb-2">لا توجد نتائج</h3>
                <p className="text-gray-500">جرب تغيير الفلاتر أو كلمة البحث</p>
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setUserFilter('all')
                  }}
                  className="mt-4 px-6 py-2 bg-violet-100 text-violet-600 rounded-xl font-medium hover:bg-violet-200 transition-colors"
                >
                  إعادة تعيين الفلاتر
                </button>
              </div>
            ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {getFilteredUsers().map(u => (
                  <div key={u.uid} className="bg-white rounded-2xl shadow-lg shadow-gray-100 border border-gray-100 p-5 hover:shadow-xl transition-all duration-300">
                    {editingUser === u.uid ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          placeholder="الاسم"
                          value={userForm.name || ''}
                          onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                          className="w-full border rounded-xl p-2"
                        />
                        <input
                          type="text"
                          placeholder="الهاتف"
                          value={userForm.phone || ''}
                          onChange={e => setUserForm({ ...userForm, phone: e.target.value })}
                          className="w-full border rounded-xl p-2"
                        />
                        <select
                          value={userForm.role || 'customer'}
                          onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                          className="w-full border rounded-xl p-2"
                        >
                          <option value="customer">عميل</option>
                          <option value="owner">صاحب مطعم</option>
                          <option value="courier">مندوب</option>
                          <option value="admin">مشرف</option>
                          <option value="supervisor">مشرفة مطاعم</option>
                          <option value="social_media">مسؤولة سوشيال ميديا</option>
                          <option value="support">دعم فني</option>
                          <option value="accountant">محاسب</option>
                          <option value="developer">مطور</option>
                        </select>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateUser(u.uid)}
                            className="flex-1 bg-green-600 text-white py-2 rounded-xl"
                          >
                            حفظ
                          </button>
                          <button
                            onClick={() => setEditingUser(null)}
                            className="flex-1 bg-gray-500 text-white py-2 rounded-xl"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold">{u.name || 'بدون اسم'}</h3>
                              {(u as any).isActive === false && (
                                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">موقوف</span>
                              )}
                              {u.security?.isDeactivated && (
                                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">🔒 محظور</span>
                              )}
                              {u.security?.lockedUntil && new Date(u.security.lockedUntil.toDate?.() || u.security.lockedUntil) > new Date() && (
                                <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">⏱️ مقفل مؤقتاً</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">{u.email}</p>
                            {u.phone && <p className="text-xs text-gray-500">📱 {u.phone}</p>}
                            <p className="text-xs mt-1">{roleLabel(u.role)}</p>
                            {/* عرض آخر تسجيل دخول */}
                            {u.security?.lastLogin && (
                              <p className="text-xs text-gray-400 mt-1">
                                🕐 آخر دخول: {new Date(u.security.lastLogin.toDate?.() || u.security.lastLogin).toLocaleString('ar-SA')}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            <div className="flex gap-1">
                              {/* زر تفعيل/إيقاف */}
                              <button
                                onClick={() => handleToggleUserStatus(u, (u as any).isActive !== false)}
                                className={`p-1.5 rounded-lg ${
                                  (u as any).isActive === false 
                                    ? 'bg-green-100 text-green-600' 
                                    : 'bg-orange-100 text-orange-600'
                                }`}
                                title={(u as any).isActive === false ? 'تفعيل الحساب' : 'تعليق الحساب'}
                              >
                                {(u as any).isActive === false ? (
                                  <CheckCircle className="w-4 h-4" />
                                ) : (
                                  <AlertCircle className="w-4 h-4" />
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingUser(u.uid)
                                  setUserForm(u)
                                }}
                                className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"
                                title="تعديل"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.uid)}
                                className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                                title="حذف"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="flex gap-1">
                              {/* زر إعادة تعيين كلمة المرور */}
                              <button
                                onClick={() => handleResetPassword(u)}
                                className="p-1.5 bg-amber-100 text-amber-600 rounded-lg hover:bg-amber-200 transition-colors"
                                title="إعادة تعيين كلمة المرور"
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>
                              {/* زر عرض سجل الدخول */}
                              <button
                                onClick={() => handleViewLoginHistory(u)}
                                className="p-1.5 bg-violet-100 text-violet-600 rounded-lg hover:bg-violet-200 transition-colors"
                                title="سجل تسجيل الدخول"
                              >
                                <History className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))
              }
            </div>
            )}

            {/* نافذة سجل تسجيل الدخول */}
            {loginHistoryModal.isOpen && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
                  <div className="p-6 bg-gradient-to-r from-violet-500 to-purple-600 text-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <History className="w-6 h-6" />
                        <div>
                          <h2 className="text-xl font-bold">سجل تسجيل الدخول</h2>
                          <p className="text-sm text-violet-100">{loginHistoryModal.userName}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setLoginHistoryModal(prev => ({ ...prev, isOpen: false }))}
                        className="p-2 hover:bg-white/20 rounded-xl transition"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="p-6 overflow-y-auto max-h-[60vh]">
                    {loginHistoryModal.loading ? (
                      <div className="text-center py-8">
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-violet-500 mb-2" />
                        <p className="text-gray-500">جارٍ التحميل...</p>
                      </div>
                    ) : loginHistoryModal.history.length === 0 ? (
                      <div className="text-center py-8">
                        <History className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                        <p className="text-gray-500">لا توجد سجلات دخول</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {loginHistoryModal.history.map((entry, idx) => (
                          <div 
                            key={entry.id || idx}
                            className={`p-4 rounded-2xl border ${
                              entry.status === 'success' 
                                ? 'bg-green-50 border-green-200' 
                                : entry.status === 'blocked'
                                ? 'bg-red-50 border-red-200'
                                : 'bg-orange-50 border-orange-200'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {entry.status === 'success' ? (
                                  <CheckCircle className="w-5 h-5 text-green-600" />
                                ) : entry.status === 'blocked' ? (
                                  <Shield className="w-5 h-5 text-red-600" />
                                ) : (
                                  <AlertCircle className="w-5 h-5 text-orange-600" />
                                )}
                                <span className={`font-medium ${
                                  entry.status === 'success' 
                                    ? 'text-green-700' 
                                    : entry.status === 'blocked'
                                    ? 'text-red-700'
                                    : 'text-orange-700'
                                }`}>
                                  {entry.status === 'success' ? 'دخول ناجح' : entry.status === 'blocked' ? 'محظور' : 'محاولة فاشلة'}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {entry.timestamp ? new Date(entry.timestamp).toLocaleString('ar-SA') : '-'}
                              </span>
                            </div>
                            {entry.errorMessage && (
                              <p className="text-sm text-gray-600 mt-2">{entry.errorMessage}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== المناديب ===== */}
        {activeTab === 'couriers' && (
          <div className="space-y-6">
            {/* ===== شريط عنوان فاخر للمناديب ===== */}
            <div className="bg-gradient-to-br from-white via-cyan-50/30 to-teal-50/30 rounded-3xl p-6 border border-cyan-100 shadow-lg shadow-cyan-100/50">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg shadow-cyan-200">
                    <Truck className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent">
                      إدارة المناديب
                    </h2>
                    <p className="text-sm text-gray-500">
                      {stats.couriers} مندوب مسجل
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddCourier(!showAddCourier)}
                  className="group flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-white px-5 py-3 rounded-2xl font-bold shadow-lg shadow-cyan-200 transition-all duration-300 hover:scale-105"
                >
                  {showAddCourier ? (
                    <>
                      <X className="w-5 h-5" />
                      إلغاء
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                      إضافة مندوب جديد
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* نموذج إضافة مندوب */}
            {showAddCourier && (
              <div className="bg-cyan-50 rounded-2xl p-6 border-2 border-cyan-200">
                <h3 className="text-lg font-bold text-cyan-800 mb-4">🚗 إضافة مندوب جديد</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">البريد الإلكتروني *</label>
                    <input
                      type="email"
                      placeholder="courier@example.com"
                      value={newCourierEmail}
                      onChange={e => setNewCourierEmail(e.target.value)}
                      className="w-full border rounded-xl p-3"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">كلمة المرور *</label>
                    <input
                      type="password"
                      placeholder="6 أحرف على الأقل"
                      value={newCourierPassword}
                      onChange={e => setNewCourierPassword(e.target.value)}
                      className="w-full border rounded-xl p-3"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">الاسم</label>
                    <input
                      type="text"
                      placeholder="اسم المندوب"
                      value={newCourierName}
                      onChange={e => setNewCourierName(e.target.value)}
                      className="w-full border rounded-xl p-3"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-600 block mb-1">رقم الهاتف</label>
                    <input
                      type="tel"
                      placeholder="05xxxxxxxx"
                      value={newCourierPhone}
                      onChange={e => setNewCourierPhone(e.target.value)}
                      className="w-full border rounded-xl p-3"
                    />
                  </div>
                </div>
                <button
                  onClick={handleCreateNewCourier}
                  disabled={creatingCourier || !newCourierEmail.trim() || !newCourierPassword.trim()}
                  className="mt-4 w-full bg-cyan-600 hover:bg-cyan-700 text-white py-3 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {creatingCourier ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      جاري الإنشاء...
                    </>
                  ) : (
                    '🚗 إنشاء حساب المندوب'
                  )}
                </button>
              </div>
            )}
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.filter(u => u.role === 'courier').map(courier => (
                <div key={courier.uid} className="bg-white rounded-2xl shadow p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center text-2xl">
                      🚗
                    </div>
                    <div>
                      <h3 className="font-bold">{courier.name || 'بدون اسم'}</h3>
                      <p className="text-sm text-gray-600">{courier.email}</p>
                      {courier.phone && <p className="text-sm text-gray-600">📱 {courier.phone}</p>}
                    </div>
                  </div>
                  
                  {/* إحصائيات المندوب */}
                  <div className="mt-4 pt-3 border-t">
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div className="bg-green-50 rounded-lg p-2">
                        <p className="text-lg font-bold text-green-600">
                          {orders.filter(o => o.courierId === courier.uid && o.status === 'delivered').length}
                        </p>
                        <p className="text-xs text-gray-600">طلبات مسلمة</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-2">
                        <p className="text-lg font-bold text-blue-600">
                          {orders.filter(o => o.courierId === courier.uid && o.status === 'out_for_delivery').length}
                        </p>
                        <p className="text-xs text-gray-600">في الطريق</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {stats.couriers === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500">
                  لا يوجد مناديب مسجلين
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== المشرفين ===== */}
        {activeTab === 'admins' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h2 className="text-xl font-bold">👑 المشرفين وعمولاتهم ({admins.length})</h2>
              <button
                onClick={() => setShowAddAdmin(!showAddAdmin)}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-semibold transition"
              >
                <UserPlus className="w-5 h-5" />
                {showAddAdmin ? 'إلغاء' : 'إضافة مشرف'}
              </button>
            </div>
            
            {/* نموذج إضافة مشرف */}
            {showAddAdmin && (
              <div className="bg-purple-50 rounded-2xl p-6 border-2 border-purple-200">
                <h3 className="text-lg font-bold text-purple-800 mb-4">👑 ترقية مستخدم إلى مشرف</h3>
                <p className="text-sm text-purple-600 mb-4">اختر مستخدم موجود لترقيته إلى دور المشرف، أو أدخل بيانات مستخدم جديد</p>
                
                {/* قائمة المستخدمين الموجودين */}
                <div className="mb-4">
                  <label className="text-sm font-semibold text-gray-700 block mb-2">ترقية مستخدم موجود:</label>
                  <div className="grid gap-2 max-h-48 overflow-y-auto">
                    {users.filter(u => u.role === 'customer').slice(0, 10).map(u => (
                      <div key={u.uid} className="flex items-center justify-between bg-white p-3 rounded-xl">
                        <div>
                          <p className="font-semibold">{u.name || 'بدون اسم'}</p>
                          <p className="text-sm text-gray-500">{u.email}</p>
                        </div>
                        <button
                          onClick={async () => {
                            const confirmed = await dialog.confirm(`هل تريد ترقية ${u.name || u.email} إلى مشرف؟`, {
                              title: 'ترقية إلى مشرف'
                            })
                            if (!confirmed) return
                            try {
                              await updateDoc(doc(db, 'users', u.uid), { role: 'admin' })
                              toast.success('تم ترقية المستخدم إلى مشرف ✅')
                              setShowAddAdmin(false)
                              loadData()
                            } catch (err) {
                              toast.error('فشل ترقية المستخدم')
                            }
                          }}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded-lg text-sm"
                        >
                          ترقية 👑
                        </button>
                      </div>
                    ))}
                    {users.filter(u => u.role === 'customer').length === 0 && (
                      <p className="text-gray-500 text-center py-4">لا يوجد عملاء يمكن ترقيتهم</p>
                    )}
                  </div>
                </div>
                
                {/* نموذج إنشاء مشرف جديد */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-md font-bold text-purple-800 mb-3">✨ أو إنشاء حساب مشرف جديد:</h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-600 block mb-1">البريد الإلكتروني *</label>
                      <input
                        type="email"
                        placeholder="admin@example.com"
                        value={newAdminEmail}
                        onChange={e => setNewAdminEmail(e.target.value)}
                        className="w-full border rounded-xl p-3 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 block mb-1">كلمة المرور *</label>
                      <input
                        type="password"
                        placeholder="كلمة المرور (6 أحرف على الأقل)"
                        value={newAdminPassword}
                        onChange={e => setNewAdminPassword(e.target.value)}
                        className="w-full border rounded-xl p-3 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 block mb-1">الاسم</label>
                      <input
                        type="text"
                        placeholder="اسم المشرف"
                        value={newAdminName}
                        onChange={e => setNewAdminName(e.target.value)}
                        className="w-full border rounded-xl p-3 text-gray-900"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 block mb-1">رقم الهاتف</label>
                      <input
                        type="tel"
                        placeholder="05xxxxxxxx"
                        value={newAdminPhone}
                        onChange={e => setNewAdminPhone(e.target.value)}
                        className="w-full border rounded-xl p-3 text-gray-900"
                      />
                    </div>
                  </div>
                  
                  <button
                    onClick={handleCreateNewAdmin}
                    disabled={creatingAdmin || !newAdminEmail.trim() || !newAdminPassword.trim()}
                    className="mt-4 w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white py-3 rounded-xl font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {creatingAdmin ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        جاري الإنشاء...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-5 h-5" />
                        إنشاء حساب المشرف
                      </>
                    )}
                  </button>
                  
                  <p className="text-xs text-orange-600 mt-2">
                    ⚠️ تنبيه: بعد إنشاء المشرف الجديد، سيتم تسجيل خروجك تلقائياً. يرجى تسجيل الدخول مرة أخرى.
                  </p>
                </div>
                
                <div className="border-t pt-4 mt-4">
                  <p className="text-xs text-gray-500">💡 يمكنك أيضاً تغيير دور أي مستخدم من تبويب "المستخدمين"</p>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              {admins.map(admin => (
                <div key={admin.uid} className="bg-white rounded-2xl shadow overflow-hidden">
                  {/* رأس المشرف */}
                  <div 
                    className="p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedAdmin(expandedAdmin === admin.uid ? null : admin.uid)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-2xl">
                          👑
                        </div>
                        <div>
                          <h3 className="font-bold">{admin.name || 'بدون اسم'}</h3>
                          <p className="text-sm text-gray-600">{admin.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {/* الإحصائيات */}
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-green-600" />
                            <span className="font-bold text-green-600">{admin.walletBalance.toFixed(2)} ر.س</span>
                          </div>
                          <p className="text-xs text-gray-500">
                            إجمالي: {admin.totalEarnings.toFixed(2)} ر.س | {admin.restaurantsCount} مطعم
                          </p>
                        </div>
                        
                        {expandedAdmin === admin.uid ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* المطاعم التابعة */}
                  {expandedAdmin === admin.uid && (
                    <div className="border-t bg-gray-50 p-4">
                      <h4 className="font-semibold text-sm text-gray-700 mb-3">
                        🏪 المطاعم المضافة بواسطة هذا المشرف ({admin.restaurants.length}):
                      </h4>
                      
                      {admin.restaurants.length > 0 ? (
                        <div className="grid md:grid-cols-2 gap-3">
                          {admin.restaurants.map(r => (
                            <div key={r.id} className="bg-white rounded-xl p-3 flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden">
                                {r.logoUrl ? (
                                  <img src={r.logoUrl} alt={r.name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">🏪</div>
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-sm">{r.name}</p>
                                <p className="text-xs text-gray-500">{r.city || 'بدون مدينة'}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">لم يضف أي مطاعم بعد</p>
                      )}
                      
                      {/* ملخص العمولات */}
                      <div className="mt-4 pt-3 border-t">
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div className="bg-green-100 rounded-lg p-2">
                            <p className="font-bold text-green-700">{admin.walletBalance.toFixed(2)}</p>
                            <p className="text-xs text-gray-600">الرصيد الحالي</p>
                          </div>
                          <div className="bg-blue-100 rounded-lg p-2">
                            <p className="font-bold text-blue-700">{admin.totalEarnings.toFixed(2)}</p>
                            <p className="text-xs text-gray-600">إجمالي الأرباح</p>
                          </div>
                          <div className="bg-purple-100 rounded-lg p-2">
                            <p className="font-bold text-purple-700">
                              {orders.filter(o => o.referredBy === admin.uid).length}
                            </p>
                            <p className="text-xs text-gray-600">طلبات من مطاعمه</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {admins.length === 0 && (
                <div className="text-center py-12 text-gray-500 bg-white rounded-2xl">
                  لا يوجد مشرفين مسجلين
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== الإعدادات ===== */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">⚙️ إعدادات التطبيق</h2>
              {!editingSettings ? (
                <button
                  onClick={() => setEditingSettings(true)}
                  className="bg-primary hover:bg-sky-600 text-white px-4 py-2 rounded-xl"
                >
                  ✏️ تعديل
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditingSettings(false); setSettingsForm(settings) }}
                    className="bg-gray-500 text-white px-4 py-2 rounded-xl"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleSaveSettings}
                    className="bg-green-600 text-white px-4 py-2 rounded-xl"
                  >
                    💾 حفظ
                  </button>
                </div>
              )}
            </div>
            
            <div className="bg-white rounded-2xl shadow p-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* رسوم التوصيل */}
                <div>
                  <label className="text-sm text-gray-600 block mb-1">💰 رسوم التوصيل (ر.س)</label>
                  {editingSettings ? (
                    <input
                      type="number"
                      value={settingsForm.deliveryFee || 0}
                      onChange={e => setSettingsForm({ ...settingsForm, deliveryFee: Number(e.target.value) })}
                      className="w-full border rounded-xl p-3"
                    />
                  ) : (
                    <p className="text-2xl font-bold">{settings.deliveryFee || 7} ر.س</p>
                  )}
                </div>

                {/* رسوم التطبيق */}
                <div>
                  <label className="text-sm text-gray-600 block mb-1">💵 رسوم التطبيق / منتج (ر.س)</label>
                  {editingSettings ? (
                    <input
                      type="number"
                      step="0.1"
                      value={settingsForm.platformFee || 1.0}
                      onChange={e => setSettingsForm({ ...settingsForm, platformFee: Number(e.target.value) })}
                      className="w-full border rounded-xl p-3"
                    />
                  ) : (
                    <p className="text-2xl font-bold">{settings.platformFee || 1.0} ر.س/منتج</p>
                  )}
                </div>

                {/* عمولة المشرف */}
                <div>
                  <label className="text-sm text-gray-600 block mb-1">👑 عمولة المشرف / منتج (ر.س)</label>
                  {editingSettings ? (
                    <input
                      type="number"
                      step="0.05"
                      value={settingsForm.adminCommissionRate || 0.75}
                      onChange={e => setSettingsForm({ ...settingsForm, adminCommissionRate: Number(e.target.value) })}
                      className="w-full border rounded-xl p-3"
                    />
                  ) : (
                    <p className="text-2xl font-bold">{settings.adminCommissionRate || 0.75} ر.س/منتج</p>
                  )}
                </div>

                {/* الحد الأدنى للطلب */}
                <div>
                  <label className="text-sm text-gray-600 block mb-1">🛒 الحد الأدنى للطلب</label>
                  {editingSettings ? (
                    <input
                      type="number"
                      value={settingsForm.minOrderAmount || 0}
                      onChange={e => setSettingsForm({ ...settingsForm, minOrderAmount: Number(e.target.value) })}
                      className="w-full border rounded-xl p-3"
                    />
                  ) : (
                    <p className="text-2xl font-bold">{settings.minOrderAmount || 20} ر.س</p>
                  )}
                </div>

                {/* ساعات العمل */}
                <div>
                  <label className="text-sm text-gray-600 block mb-1">🕐 ساعات العمل</label>
                  {editingSettings ? (
                    <div className="flex gap-2">
                      <input
                        type="time"
                        value={settingsForm.workingHours?.open || '09:00'}
                        onChange={e => setSettingsForm({ ...settingsForm, workingHours: { ...settingsForm.workingHours!, open: e.target.value } })}
                        className="flex-1 border rounded-xl p-3"
                      />
                      <input
                        type="time"
                        value={settingsForm.workingHours?.close || '23:00'}
                        onChange={e => setSettingsForm({ ...settingsForm, workingHours: { ...settingsForm.workingHours!, close: e.target.value } })}
                        className="flex-1 border rounded-xl p-3"
                      />
                    </div>
                  ) : (
                    <p className="text-2xl font-bold">
                      {settings.workingHours?.open || '09:00'} - {settings.workingHours?.close || '23:00'}
                    </p>
                  )}
                </div>

                {/* وضع الصيانة */}
                <div>
                  <label className="text-sm text-gray-600 block mb-1">🔧 وضع الصيانة</label>
                  {editingSettings ? (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settingsForm.maintenanceMode || false}
                        onChange={e => setSettingsForm({ ...settingsForm, maintenanceMode: e.target.checked })}
                        className="w-6 h-6"
                      />
                      <span className="text-lg">{settingsForm.maintenanceMode ? 'مفعّل' : 'معطّل'}</span>
                    </label>
                  ) : (
                    <p className={`text-2xl font-bold ${settings.maintenanceMode ? 'text-red-600' : 'text-green-600'}`}>
                      {settings.maintenanceMode ? '🔴 مفعّل' : '🟢 معطّل'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* شرح نظام العمولات */}
            <div className="bg-sky-50 border-l-4 border-sky-500 rounded-lg p-6">
              <h3 className="font-bold text-sky-900 mb-3">💰 نظام العمولات (لكل منتج = 1.75 ر.س):</h3>
              <div className="text-sky-800 space-y-2">
                <p>• <strong>رسوم التطبيق:</strong> {settings.platformFee || 1.0} ر.س × عدد المنتجات</p>
                <p>• <strong>عمولة المشرف:</strong> {settings.adminCommissionRate || 0.75} ر.س × عدد المنتجات</p>
                <div className="bg-white rounded-xl p-4 mt-3">
                  <p className="font-bold mb-2">📝 مثال: طلب فيه 5 منتجات</p>
                  <p>• <strong>إذا المطعم مضاف من مشرف:</strong></p>
                  <ul className="mr-6 list-disc text-sm">
                    <li>المشرف يحصل على: 5 × {settings.adminCommissionRate || 0.75} = <strong>{(5 * (settings.adminCommissionRate || 0.75)).toFixed(2)} ر.س</strong></li>
                    <li>التطبيق يحصل على: 5 × {settings.platformFee || 1.0} = <strong>{(5 * (settings.platformFee || 1.0)).toFixed(2)} ر.س</strong></li>
                    <li className="text-green-700">المجموع: <strong>{(5 * 1.75).toFixed(2)} ر.س</strong></li>
                  </ul>
                  <p className="mt-2">• <strong>إذا المطعم مضاف من المطور:</strong></p>
                  <ul className="mr-6 list-disc text-sm">
                    <li>التطبيق يحصل على كل شيء: 5 × 1.75 = <strong>{(5 * 1.75).toFixed(2)} ر.س</strong></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== الموظفين ===== */}
        {activeTab === 'employees' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h2 className="text-xl font-bold">👥 إدارة الموظفين ({employees.length})</h2>
              <button
                onClick={() => setShowAddEmployee(!showAddEmployee)}
                className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-5 py-2.5 rounded-xl font-semibold transition shadow-lg"
              >
                <UserPlus className="w-5 h-5" />
                {showAddEmployee ? 'إلغاء' : 'إضافة موظف'}
              </button>
            </div>

            {/* نموذج إضافة موظف */}
            {showAddEmployee && (
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border-2 border-indigo-200 shadow-lg">
                <h3 className="text-lg font-bold text-indigo-800 mb-4 flex items-center gap-2">
                  <UserPlus className="w-6 h-6" />
                  إنشاء حساب موظف جديد
                </h3>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-1">البريد الإلكتروني *</label>
                    <input
                      type="email"
                      placeholder="employee@example.com"
                      value={newEmployeeEmail}
                      onChange={e => setNewEmployeeEmail(e.target.value)}
                      className="w-full border-2 border-indigo-200 rounded-xl p-3 text-gray-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-1">كلمة المرور *</label>
                    <input
                      type="password"
                      placeholder="6 أحرف على الأقل"
                      value={newEmployeePassword}
                      onChange={e => setNewEmployeePassword(e.target.value)}
                      className="w-full border-2 border-indigo-200 rounded-xl p-3 text-gray-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-1">الاسم</label>
                    <input
                      type="text"
                      placeholder="اسم الموظف"
                      value={newEmployeeName}
                      onChange={e => setNewEmployeeName(e.target.value)}
                      className="w-full border-2 border-indigo-200 rounded-xl p-3 text-gray-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-1">رقم الهاتف</label>
                    <input
                      type="tel"
                      placeholder="05xxxxxxxx"
                      value={newEmployeePhone}
                      onChange={e => setNewEmployeePhone(e.target.value)}
                      className="w-full border-2 border-indigo-200 rounded-xl p-3 text-gray-900 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-semibold text-gray-700 block mb-2">الدور الوظيفي *</label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {[
                        { id: 'supervisor', label: '👤 مشرف', color: 'amber' },
                        { id: 'support', label: '🎧 دعم فني', color: 'blue' },
                        { id: 'social_media', label: '📱 سوشيال', color: 'pink' },
                        { id: 'admin', label: '🔧 إدارة', color: 'purple' },
                        { id: 'accountant', label: '💰 محاسب', color: 'green' },
                      ].map(role => (
                        <button
                          key={role.id}
                          onClick={() => setNewEmployeeRole(role.id as EmployeeRole)}
                          className={`px-4 py-2.5 rounded-xl font-medium transition-all ${
                            newEmployeeRole === role.id
                              ? `bg-${role.color}-500 text-white shadow-lg`
                              : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-indigo-300'
                          }`}
                        >
                          {role.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCreateEmployee}
                  disabled={creatingEmployee || !newEmployeeEmail.trim() || !newEmployeePassword.trim()}
                  className="mt-6 w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3.5 rounded-xl font-bold transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
                >
                  {creatingEmployee ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      جاري الإنشاء...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      إنشاء الحساب
                    </>
                  )}
                </button>
                
                <p className="text-xs text-orange-600 mt-3 bg-orange-50 p-2 rounded-lg">
                  ⚠️ تنبيه: بعد إنشاء الموظف، سيتم تسجيل خروجك مؤقتاً. يرجى تسجيل الدخول مرة أخرى.
                </p>
              </div>
            )}

            {/* فلتر الموظفين */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'all', label: 'الكل' },
                { id: 'supervisor', label: '👤 مشرفين' },
                { id: 'support', label: '🎧 دعم فني' },
                { id: 'social_media', label: '📱 سوشيال' },
                { id: 'admin', label: '🔧 إدارة' },
                { id: 'accountant', label: '💰 محاسبين' },
                { id: 'active', label: '✅ نشط' },
                { id: 'inactive', label: '⛔ متوقف' },
              ].map(filter => (
                <button
                  key={filter.id}
                  onClick={() => setEmployeeFilter(filter.id)}
                  className={`px-4 py-2 rounded-xl font-medium transition ${
                    employeeFilter === filter.id
                      ? 'bg-indigo-500 text-white shadow'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            {/* قائمة الموظفين */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {employees
                .filter(e => {
                  if (employeeFilter === 'all') return true
                  if (employeeFilter === 'active') return e.isActive
                  if (employeeFilter === 'inactive') return !e.isActive
                  return e.role === employeeFilter
                })
                .map(employee => {
                  const roleInfo: Record<EmployeeRole, { label: string; emoji: string; color: string }> = {
                    supervisor: { label: 'مشرف', emoji: '👤', color: 'amber' },
                    support: { label: 'دعم فني', emoji: '🎧', color: 'blue' },
                    social_media: { label: 'سوشيال ميديا', emoji: '📱', color: 'pink' },
                    admin: { label: 'إدارة', emoji: '🔧', color: 'purple' },
                    accountant: { label: 'محاسب', emoji: '💰', color: 'green' },
                  }
                  const info = roleInfo[employee.role] || { label: employee.role, emoji: '👤', color: 'gray' }

                  return (
                    <div 
                      key={employee.uid}
                      className={`bg-white rounded-2xl shadow-lg overflow-hidden border-2 transition-all ${
                        employee.isActive ? 'border-gray-100 hover:border-indigo-200' : 'border-red-200 bg-red-50/50'
                      }`}
                    >
                      {/* الهيدر */}
                      <div className={`bg-gradient-to-r from-${info.color}-500 to-${info.color}-600 px-4 py-3 text-white`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{info.emoji}</span>
                            <span className="font-bold">{info.label}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            employee.isActive ? 'bg-white/20' : 'bg-red-100 text-red-700'
                          }`}>
                            {employee.isActive ? '✅ نشط' : '⛔ متوقف'}
                          </span>
                        </div>
                      </div>

                      {/* المحتوى */}
                      <div className="p-4">
                        <h3 className="font-bold text-lg text-gray-900">{employee.name || 'بدون اسم'}</h3>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" />
                          {employee.email}
                        </p>
                        {employee.phone && (
                          <p className="text-sm text-gray-500 mt-1">📱 {employee.phone}</p>
                        )}

                        {/* تغيير الدور */}
                        {editingEmployee === employee.uid ? (
                          <div className="mt-4 space-y-2">
                            <label className="text-xs font-semibold text-gray-600">تغيير الدور:</label>
                            <select
                              value={selectedNewRole}
                              onChange={e => setSelectedNewRole(e.target.value as EmployeeRole)}
                              className="w-full border-2 border-indigo-200 rounded-xl p-2.5 text-gray-900 focus:border-indigo-400"
                            >
                              <option value="supervisor">👤 مشرف</option>
                              <option value="support">🎧 دعم فني</option>
                              <option value="social_media">📱 سوشيال ميديا</option>
                              <option value="admin">🔧 إدارة</option>
                              <option value="accountant">💰 محاسب</option>
                            </select>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleChangeEmployeeRole(employee.uid, selectedNewRole)}
                                disabled={selectedNewRole === employee.role}
                                className={`flex-1 py-2 rounded-xl text-sm font-bold transition ${
                                  selectedNewRole === employee.role
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-green-500 hover:bg-green-600 text-white'
                                }`}
                              >
                                ✅ حفظ
                              </button>
                              <button
                                onClick={() => setEditingEmployee(null)}
                                className="flex-1 py-2 rounded-xl text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-600 transition"
                              >
                                ❌ إلغاء
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 flex gap-2">
                            <button
                              onClick={() => { setEditingEmployee(employee.uid); setSelectedNewRole(employee.role); }}
                              className="flex-1 flex items-center justify-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 py-2 rounded-xl text-sm font-medium transition"
                            >
                              <Edit3 className="w-4 h-4" />
                              تغيير الدور
                            </button>
                            <button
                              onClick={() => handleToggleEmployeeStatus(employee.uid)}
                              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-sm font-medium transition ${
                                employee.isActive
                                  ? 'bg-red-50 hover:bg-red-100 text-red-600'
                                  : 'bg-green-50 hover:bg-green-100 text-green-600'
                              }`}
                            >
                              {employee.isActive ? (
                                <>
                                  <X className="w-4 h-4" />
                                  إيقاف
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4" />
                                  تفعيل
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
            </div>

            {employees.length === 0 && (
              <div className="text-center py-16 bg-white rounded-2xl shadow">
                <UserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">لا يوجد موظفين حالياً</p>
                <p className="text-gray-400 text-sm mt-2">ابدأ بإضافة موظف جديد</p>
              </div>
            )}

            {/* شرح الصلاحيات */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
              <h3 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                صلاحيات كل دور
              </h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">👤</span>
                    <span className="font-bold text-amber-700">مشرف</span>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>✓ إدارة المطاعم التابعة</li>
                    <li>✓ متابعة الطلبات</li>
                    <li>✓ عمولات على كل طلب</li>
                    <li>✓ تقارير الأداء</li>
                  </ul>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">🎧</span>
                    <span className="font-bold text-blue-700">دعم فني</span>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>✓ الرد على الشكاوى</li>
                    <li>✓ دعم العملاء</li>
                    <li>✓ حل المشاكل</li>
                    <li>✗ لا يرى المالية</li>
                  </ul>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">📱</span>
                    <span className="font-bold text-pink-700">سوشيال ميديا</span>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>✓ إدارة المحتوى</li>
                    <li>✓ إحصائيات التفاعل</li>
                    <li>✓ الحملات الإعلانية</li>
                    <li>✗ لا يرى الطلبات</li>
                  </ul>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">🔧</span>
                    <span className="font-bold text-purple-700">إدارة</span>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>✓ جميع صلاحيات المشرف</li>
                    <li>✓ إدارة المستخدمين</li>
                    <li>✓ التقارير الشاملة</li>
                    <li>✗ لا يغير الإعدادات</li>
                  </ul>
                </div>
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">💰</span>
                    <span className="font-bold text-green-700">محاسب</span>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>✓ التقارير المالية</li>
                    <li>✓ العمولات والأرباح</li>
                    <li>✓ طلبات السحب</li>
                    <li>✗ لا يدير المستخدمين</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== المهام ===== */}
        {activeTab === 'tasks' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">📋 إدارة المهام اليومية</h2>
              <button
                onClick={() => setShowAddTask(true)}
                className="flex items-center gap-2 bg-primary hover:bg-sky-600 text-white px-4 py-2 rounded-xl font-semibold transition"
              >
                <Plus className="w-5 h-5" />
                مهمة جديدة
              </button>
            </div>

            {/* فلترة المهام */}
            <div className="flex flex-wrap gap-2">
              {(['all', 'pending', 'in_progress', 'completed', 'cancelled'] as const).map(filter => (
                <button
                  key={filter}
                  onClick={() => setTaskFilter(filter)}
                  className={`px-4 py-2 rounded-xl font-semibold transition ${
                    taskFilter === filter
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {filter === 'all' && '📋 الكل'}
                  {filter === 'pending' && '⏳ قيد الانتظار'}
                  {filter === 'in_progress' && '🔄 جاري التنفيذ'}
                  {filter === 'completed' && '✅ مكتملة'}
                  {filter === 'cancelled' && '❌ ملغاة'}
                </button>
              ))}
            </div>

            {/* إحصائيات المهام */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-yellow-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {tasks.filter(t => t.status === 'pending').length}
                </p>
                <p className="text-sm text-yellow-700">قيد الانتظار</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {tasks.filter(t => t.status === 'in_progress').length}
                </p>
                <p className="text-sm text-blue-700">جاري التنفيذ</p>
              </div>
              <div className="bg-green-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {tasks.filter(t => t.status === 'completed').length}
                </p>
                <p className="text-sm text-green-700">مكتملة</p>
              </div>
              <div className="bg-red-50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-red-600">
                  {tasks.filter(t => t.status === 'cancelled').length}
                </p>
                <p className="text-sm text-red-700">ملغاة</p>
              </div>
            </div>

            {/* قائمة المهام */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              {tasks
                .filter(t => taskFilter === 'all' || t.status === taskFilter)
                .length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p className="text-4xl mb-2">📋</p>
                  <p>لا توجد مهام {taskFilter !== 'all' && 'في هذه الفئة'}</p>
                </div>
              ) : (
                <div className="divide-y">
                  {tasks
                    .filter(t => taskFilter === 'all' || t.status === taskFilter)
                    .map(task => {
                      const admin = users.find(u => u.uid === task.assignedTo)
                      return (
                        <div key={task.id} className="p-4 hover:bg-gray-50">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                  task.priority === 'high' ? 'bg-red-100 text-red-700' :
                                  task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {task.priority === 'high' ? '🔴 عالية' : task.priority === 'medium' ? '🟡 متوسطة' : '⚪ منخفضة'}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                  task.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                  task.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                  task.status === 'completed' ? 'bg-green-100 text-green-700' :
                                  'bg-red-100 text-red-700'
                                }`}>
                                  {task.status === 'pending' && '⏳ قيد الانتظار'}
                                  {task.status === 'in_progress' && '🔄 جاري التنفيذ'}
                                  {task.status === 'completed' && '✅ مكتملة'}
                                  {task.status === 'cancelled' && '❌ ملغاة'}
                                </span>
                              </div>
                              <h3 className="font-bold text-gray-800">{task.title}</h3>
                              {task.description && (
                                <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                              )}
                              <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                                <span>👤 {admin?.name || task.assignedToName || 'غير محدد'}</span>
                                {task.dueDate && (
                                  <span>📅 {new Date(task.dueDate).toLocaleDateString('ar-SA')}</span>
                                )}
                                <span>🕐 {task.createdAt?.toDate?.()?.toLocaleDateString('ar-SA') || 'غير محدد'}</span>
                              </div>
                              {task.notes && (
                                <p className="text-sm text-gray-500 mt-2 bg-gray-50 p-2 rounded">💬 {task.notes}</p>
                              )}
                            </div>
                            <div className="flex flex-col gap-2">
                              {task.status === 'pending' && (
                                <button
                                  onClick={async () => {
                                    try {
                                      await updateDoc(doc(db, 'tasks', task.id), {
                                        status: 'in_progress',
                                        updatedAt: serverTimestamp()
                                      })
                                      toast.success('تم بدء المهمة')
                                      loadData()
                                    } catch (err) {
                                      toast.error('فشل في تحديث المهمة')
                                    }
                                  }}
                                  className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition"
                                  title="بدء المهمة"
                                >
                                  ▶️
                                </button>
                              )}
                              {(task.status === 'pending' || task.status === 'in_progress') && (
                                <>
                                  <button
                                    onClick={async () => {
                                      try {
                                        await updateDoc(doc(db, 'tasks', task.id), {
                                          status: 'completed',
                                          completedAt: serverTimestamp(),
                                          updatedAt: serverTimestamp()
                                        })
                                        toast.success('تم إكمال المهمة')
                                        loadData()
                                      } catch (err) {
                                        toast.error('فشل في تحديث المهمة')
                                      }
                                    }}
                                    className="text-green-600 hover:bg-green-50 p-2 rounded-lg transition"
                                    title="إكمال المهمة"
                                  >
                                    ✅
                                  </button>
                                  <button
                                    onClick={async () => {
                                      const confirmed = await dialog.confirm('هل تريد إلغاء هذه المهمة؟', { dangerous: true })
                                      if (!confirmed) return
                                      try {
                                        await updateDoc(doc(db, 'tasks', task.id), {
                                          status: 'cancelled',
                                          updatedAt: serverTimestamp()
                                        })
                                        toast.success('تم إلغاء المهمة')
                                        loadData()
                                      } catch (err) {
                                        toast.error('فشل في إلغاء المهمة')
                                      }
                                    }}
                                    className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition"
                                    title="إلغاء المهمة"
                                  >
                                    ❌
                                  </button>
                                </>
                              )}
                              <button
                                onClick={async () => {
                                  const confirmed = await dialog.confirm('هل تريد حذف هذه المهمة نهائياً؟', { dangerous: true })
                                  if (!confirmed) return
                                  try {
                                    await deleteDoc(doc(db, 'tasks', task.id))
                                    toast.success('تم حذف المهمة')
                                    loadData()
                                  } catch (err) {
                                    toast.error('فشل في حذف المهمة')
                                  }
                                }}
                                className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition"
                                title="حذف المهمة"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>

            {/* نموذج إضافة مهمة */}
            {showAddTask && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl w-full max-w-lg p-6">
                  <h3 className="text-xl font-bold mb-4">📋 إضافة مهمة جديدة</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold mb-1">عنوان المهمة *</label>
                      <input
                        type="text"
                        value={newTaskTitle}
                        onChange={e => setNewTaskTitle(e.target.value)}
                        className="w-full border rounded-xl px-4 py-2"
                        placeholder="مثال: متابعة طلبات المطعم الجديد"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">الوصف</label>
                      <textarea
                        value={newTaskDescription}
                        onChange={e => setNewTaskDescription(e.target.value)}
                        className="w-full border rounded-xl px-4 py-2 h-24"
                        placeholder="تفاصيل المهمة..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-1">تعيين إلى *</label>
                      <select
                        value={newTaskAssignedTo}
                        onChange={e => setNewTaskAssignedTo(e.target.value)}
                        className="w-full border rounded-xl px-4 py-2"
                      >
                        <option value="">-- اختر مشرف --</option>
                        {users
                          .filter(u => u.role === 'admin')
                          .map(admin => (
                            <option key={admin.uid} value={admin.uid}>
                              {admin.name || admin.email}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold mb-1">الأولوية</label>
                        <select
                          value={newTaskPriority}
                          onChange={e => setNewTaskPriority(e.target.value as 'low' | 'medium' | 'high')}
                          className="w-full border rounded-xl px-4 py-2"
                        >
                          <option value="low">⚪ منخفضة</option>
                          <option value="medium">🟡 متوسطة</option>
                          <option value="high">🔴 عالية</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold mb-1">تاريخ الاستحقاق</label>
                        <input
                          type="date"
                          value={newTaskDueDate}
                          onChange={e => setNewTaskDueDate(e.target.value)}
                          className="w-full border rounded-xl px-4 py-2"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => {
                        setShowAddTask(false)
                        setNewTaskTitle('')
                        setNewTaskDescription('')
                        setNewTaskAssignedTo('')
                        setNewTaskPriority('medium')
                        setNewTaskDueDate('')
                      }}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-xl font-semibold transition"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={async () => {
                        if (!newTaskTitle.trim() || !newTaskAssignedTo) {
                          toast.error('يرجى ملء الحقول المطلوبة')
                          return
                        }
                        setCreatingTask(true)
                        try {
                          const assignedAdmin = users.find(u => u.uid === newTaskAssignedTo)
                          await addDoc(collection(db, 'tasks'), {
                            title: newTaskTitle.trim(),
                            description: newTaskDescription.trim(),
                            assignedTo: newTaskAssignedTo,
                            assignedToName: assignedAdmin?.name || assignedAdmin?.email || '',
                            status: 'pending',
                            priority: newTaskPriority,
                            dueDate: newTaskDueDate || null,
                            createdBy: user?.uid,
                            createdAt: serverTimestamp(),
                            updatedAt: serverTimestamp(),
                            completedAt: null,
                            notes: ''
                          })
                          toast.success('تم إنشاء المهمة بنجاح')
                          setShowAddTask(false)
                          setNewTaskTitle('')
                          setNewTaskDescription('')
                          setNewTaskAssignedTo('')
                          setNewTaskPriority('medium')
                          setNewTaskDueDate('')
                          loadData()
                        } catch (err) {
                          console.error(err)
                          toast.error('فشل في إنشاء المهمة')
                        } finally {
                          setCreatingTask(false)
                        }
                      }}
                      disabled={creatingTask}
                      className="flex-1 bg-primary hover:bg-sky-600 text-white py-2 rounded-xl font-semibold transition disabled:opacity-50"
                    >
                      {creatingTask ? 'جارِ الإنشاء...' : 'إنشاء المهمة'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===== الأدوات ===== */}
        {activeTab === 'tools' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">🛠️ أدوات النظام</h2>

            {/* أدوات إدارة البيانات */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold mb-4">📊 إدارة البيانات</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* تصدير البيانات */}
                <button
                  onClick={() => {
                    const data = {
                      exportDate: new Date().toISOString(),
                      users: users.length,
                      restaurants: restaurants.length,
                      orders: orders.length,
                      admins: admins.length,
                      stats,
                      settings,
                    }
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `app-data-${new Date().toISOString().split('T')[0]}.json`
                    a.click()
                    toast.success('تم تصدير البيانات بنجاح')
                  }}
                  className="flex items-center gap-3 bg-blue-100 hover:bg-blue-200 text-blue-800 p-4 rounded-xl transition"
                >
                  <span className="text-2xl">📥</span>
                  <div className="text-right">
                    <p className="font-bold">تصدير البيانات</p>
                    <p className="text-xs opacity-75">تحميل ملخص JSON</p>
                  </div>
                </button>

                {/* تصدير الطلبات */}
                <button
                  onClick={() => {
                    const csv = [
                      ['رقم الطلب', 'المطعم', 'المبلغ', 'الحالة', 'التاريخ'].join(','),
                      ...orders.map(o => [
                        o.id.slice(-8),
                        o.restaurantName || 'غير محدد',
                        o.total,
                        o.status,
                        o.createdAt?.toDate?.()?.toLocaleDateString('ar-SA') || ''
                      ].join(','))
                    ].join('\n')
                    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`
                    a.click()
                    toast.success('تم تصدير الطلبات بنجاح')
                  }}
                  className="flex items-center gap-3 bg-green-100 hover:bg-green-200 text-green-800 p-4 rounded-xl transition"
                >
                  <span className="text-2xl">📋</span>
                  <div className="text-right">
                    <p className="font-bold">تصدير الطلبات</p>
                    <p className="text-xs opacity-75">ملف CSV للإكسل</p>
                  </div>
                </button>

                {/* تصدير المستخدمين */}
                <button
                  onClick={() => {
                    const csv = [
                      ['الاسم', 'الإيميل', 'الدور', 'الهاتف'].join(','),
                      ...users.map(u => [
                        u.name || 'بدون اسم',
                        u.email,
                        u.role,
                        u.phone || ''
                      ].join(','))
                    ].join('\n')
                    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`
                    a.click()
                    toast.success('تم تصدير المستخدمين بنجاح')
                  }}
                  className="flex items-center gap-3 bg-purple-100 hover:bg-purple-200 text-purple-800 p-4 rounded-xl transition"
                >
                  <span className="text-2xl">👥</span>
                  <div className="text-right">
                    <p className="font-bold">تصدير المستخدمين</p>
                    <p className="text-xs opacity-75">ملف CSV للإكسل</p>
                  </div>
                </button>
              </div>
            </div>

            {/* أدوات الصيانة */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold mb-4">🔧 أدوات الصيانة</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {/* إلغاء جميع الطلبات المعلقة */}
                <button
                  onClick={async () => {
                    const pendingOrders = orders.filter(o => o.status === 'pending')
                    if (pendingOrders.length === 0) {
                      toast.info('لا توجد طلبات معلقة')
                      return
                    }
                    const confirmed = await dialog.confirm(
                      `سيتم إلغاء ${pendingOrders.length} طلب معلق. هل أنت متأكد؟`,
                      { title: 'إلغاء الطلبات المعلقة', dangerous: true }
                    )
                    if (!confirmed) return
                    try {
                      await Promise.all(pendingOrders.map(o => 
                        updateDoc(doc(db, 'orders', o.id), { status: 'cancelled', updatedAt: serverTimestamp() })
                      ))
                      toast.success(`تم إلغاء ${pendingOrders.length} طلب`)
                      loadData()
                    } catch (err) {
                      toast.error('فشل في إلغاء الطلبات')
                    }
                  }}
                  className="flex items-center gap-3 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 p-4 rounded-xl transition"
                >
                  <span className="text-2xl">⏳</span>
                  <div className="text-right">
                    <p className="font-bold">إلغاء الطلبات المعلقة</p>
                    <p className="text-xs opacity-75">{orders.filter(o => o.status === 'pending').length} طلب معلق</p>
                  </div>
                </button>

                {/* تنظيف الطلبات القديمة */}
                <button
                  onClick={async () => {
                    const oldDate = new Date()
                    oldDate.setMonth(oldDate.getMonth() - 3)
                    const oldOrders = orders.filter(o => {
                      const orderDate = o.createdAt?.toDate?.() || new Date()
                      return orderDate < oldDate && (o.status === 'delivered' || o.status === 'cancelled')
                    })
                    if (oldOrders.length === 0) {
                      toast.info('لا توجد طلبات قديمة')
                      return
                    }
                    const confirmed = await dialog.confirm(
                      `سيتم حذف ${oldOrders.length} طلب قديم (أكثر من 3 أشهر). هل أنت متأكد؟`,
                      { title: 'حذف الطلبات القديمة', dangerous: true }
                    )
                    if (!confirmed) return
                    try {
                      await Promise.all(oldOrders.map(o => deleteDoc(doc(db, 'orders', o.id))))
                      toast.success(`تم حذف ${oldOrders.length} طلب قديم`)
                      loadData()
                    } catch (err) {
                      toast.error('فشل في حذف الطلبات')
                    }
                  }}
                  className="flex items-center gap-3 bg-orange-100 hover:bg-orange-200 text-orange-800 p-4 rounded-xl transition"
                >
                  <span className="text-2xl">🗑️</span>
                  <div className="text-right">
                    <p className="font-bold">تنظيف الطلبات القديمة</p>
                    <p className="text-xs opacity-75">حذف أقدم من 3 أشهر</p>
                  </div>
                </button>
              </div>
            </div>

            {/* روابط سريعة */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-bold mb-4">🔗 روابط سريعة</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <a
                  href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/firestore`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-blue-50 hover:bg-blue-100 text-blue-800 p-4 rounded-xl transition"
                >
                  <span className="text-2xl">📊</span>
                  <span className="font-semibold">Firestore</span>
                </a>
                <a
                  href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/users`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-green-50 hover:bg-green-100 text-green-800 p-4 rounded-xl transition"
                >
                  <span className="text-2xl">🔐</span>
                  <span className="font-semibold">Authentication</span>
                </a>
                <a
                  href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/storage`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-purple-50 hover:bg-purple-100 text-purple-800 p-4 rounded-xl transition"
                >
                  <span className="text-2xl">📁</span>
                  <span className="font-semibold">Storage</span>
                </a>
                <a
                  href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/hosting`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-orange-50 hover:bg-orange-100 text-orange-800 p-4 rounded-xl transition"
                >
                  <span className="text-2xl">🌐</span>
                  <span className="font-semibold">Hosting</span>
                </a>
              </div>
            </div>

            {/* معلومات النظام */}
            <div className="bg-gray-50 rounded-2xl p-6">
              <h3 className="text-lg font-bold mb-4">ℹ️ معلومات النظام</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Project ID</p>
                  <p className="font-mono">{firebaseConfig.projectId}</p>
                </div>
                <div>
                  <p className="text-gray-500">Storage Bucket</p>
                  <p className="font-mono">{firebaseConfig.storageBucket}</p>
                </div>
                <div>
                  <p className="text-gray-500">إصدار التطبيق</p>
                  <p className="font-bold">{settings.appVersion || '1.0.0'}</p>
                </div>
                <div>
                  <p className="text-gray-500">وضع الصيانة</p>
                  <p className={`font-bold ${settings.maintenanceMode ? 'text-red-600' : 'text-green-600'}`}>
                    {settings.maintenanceMode ? '🔴 مفعّل' : '🟢 معطّل'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== مراجعة التراخيص ===== */}
        {activeTab === 'licenses' && (
          <LicensesReviewSection 
            restaurants={restaurants} 
            onUpdate={handleRefresh}
            toast={toast}
            dialog={dialog}
          />
        )}

        {/* ===== طلبات الباقات ===== */}
        {activeTab === 'packages' && (
          <PackageRequestsSection
            packageRequests={packageRequests}
            onUpdate={handleRefresh}
            toast={toast}
            dialog={dialog}
            storage={storage}
          />
        )}

        {/* ===== إعدادات أسعار الباقات ===== */}
        {activeTab === 'packageSettings' && (
          <PackageSettingsSection
            toast={toast}
            dialog={dialog}
          />
        )}

        {/* ===== مراقبة المتاجر ===== */}
        {activeTab === 'storeAnalytics' && (
          <StoreAnalyticsSection
            restaurants={restaurants}
            orders={orders}
            toast={toast}
          />
        )}

        {/* ===== سجل العمليات ===== */}
        {activeTab === 'activityLog' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                📜 سجل العمليات
                <span className="text-sm bg-gray-200 px-3 py-1 rounded-full">
                  {activityLogs.length} عملية
                </span>
              </h2>
              <div className="flex gap-2">
                <select
                  value={logFilter}
                  onChange={e => setLogFilter(e.target.value)}
                  className="border rounded-xl px-4 py-2"
                >
                  <option value="all">جميع العمليات</option>
                  <option value="activate">تفعيل</option>
                  <option value="deactivate">إيقاف</option>
                  <option value="create">إنشاء</option>
                  <option value="update">تحديث</option>
                  <option value="delete">حذف</option>
                  <option value="package_activate">تفعيل باقة</option>
                  <option value="package_cancel">إلغاء باقة</option>
                  <option value="role_change">تغيير دور</option>
                </select>
                <button
                  onClick={loadActivityLogs}
                  disabled={loadingLogs}
                  className="bg-primary hover:bg-sky-600 text-white px-4 py-2 rounded-xl"
                >
                  {loadingLogs ? '⏳' : '🔄'} تحديث
                </button>
              </div>
            </div>

            {loadingLogs ? (
              <div className="text-center py-12">
                <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500">جارِ تحميل السجل...</p>
              </div>
            ) : activityLogs.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-2xl">
                <p className="text-gray-500 text-lg">📭 لا توجد عمليات مسجلة بعد</p>
                <p className="text-gray-400 text-sm mt-2">سيتم تسجيل جميع عمليات التفعيل والإيقاف والتعديل هنا</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activityLogs
                  .filter(log => logFilter === 'all' || log.action === logFilter)
                  .map(log => (
                    <div key={log.id} className={`bg-white rounded-xl shadow p-4 border-r-4 ${
                      log.action === 'activate' || log.action === 'package_activate' ? 'border-green-500' :
                      log.action === 'deactivate' || log.action === 'package_cancel' || log.action === 'delete' ? 'border-red-500' :
                      log.action === 'create' ? 'border-blue-500' :
                      'border-gray-300'
                    }`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              log.action === 'activate' ? 'bg-green-100 text-green-700' :
                              log.action === 'deactivate' ? 'bg-red-100 text-red-700' :
                              log.action === 'create' ? 'bg-blue-100 text-blue-700' :
                              log.action === 'update' ? 'bg-yellow-100 text-yellow-700' :
                              log.action === 'delete' ? 'bg-red-100 text-red-700' :
                              log.action === 'package_activate' ? 'bg-amber-100 text-amber-700' :
                              log.action === 'package_cancel' ? 'bg-orange-100 text-orange-700' :
                              log.action === 'role_change' ? 'bg-purple-100 text-purple-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {log.action === 'activate' && '✅ تفعيل'}
                              {log.action === 'deactivate' && '⏸️ إيقاف'}
                              {log.action === 'create' && '➕ إنشاء'}
                              {log.action === 'update' && '✏️ تحديث'}
                              {log.action === 'delete' && '🗑️ حذف'}
                              {log.action === 'package_activate' && '✨ تفعيل باقة'}
                              {log.action === 'package_cancel' && '📦 إلغاء باقة'}
                              {log.action === 'role_change' && '🔄 تغيير دور'}
                            </span>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                              {log.targetType === 'user' && '👤 مستخدم'}
                              {log.targetType === 'restaurant' && '🏪 مطعم'}
                              {log.targetType === 'order' && '📦 طلب'}
                              {log.targetType === 'package' && '💎 باقة'}
                              {log.targetType === 'settings' && '⚙️ إعدادات'}
                            </span>
                          </div>
                          <p className="font-bold text-gray-800">{log.targetName || log.targetId}</p>
                          {log.details && <p className="text-sm text-gray-600 mt-1">{log.details}</p>}
                          <p className="text-xs text-gray-400 mt-2">
                            بواسطة: {log.performedByName || 'غير معروف'}
                          </p>
                        </div>
                        <div className="text-left text-xs text-gray-400 whitespace-nowrap">
                          {log.createdAt ? new Date(log.createdAt).toLocaleDateString('ar-SA', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          }) : '-'}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* معلومات النظام */}
        <div className="bg-gray-100 rounded-2xl p-4 text-sm">
          <div className="flex flex-wrap gap-4 text-gray-600">
            <span>📧 {user?.email}</span>
            <span>🆔 {user?.uid.slice(0, 12)}...</span>
            <span>📅 {new Date().toLocaleDateString('ar-SA')}</span>
          </div>
        </div>
      </div>
    </RoleGate>
  )
}

export default Developer

// ===== مكون مراجعة التراخيص =====
type LicenseRestaurant = {
  id: string
  name: string
  ownerId: string
  email?: string
  phone?: string
  city?: string
  commercialLicenseUrl?: string
  licenseStatus?: 'pending' | 'approved' | 'rejected'
  licenseNotes?: string
}

const LicensesReviewSection: React.FC<{
  restaurants: any[]
  onUpdate: () => void
  toast: any
  dialog: any
}> = ({ restaurants, onUpdate, toast, dialog }) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'missing' | 'sent_messages'>('pending')
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({})
  const [updating, setUpdating] = useState<string | null>(null)
  const [messageText, setMessageText] = useState('')
  const [sendingTo, setSendingTo] = useState<string | null>(null)
  const [selectedMissing, setSelectedMissing] = useState<Set<string>>(new Set())
  const [bulkMessage, setBulkMessage] = useState('')
  
  // سجل الرسائل المرسلة
  const [sentMessages, setSentMessages] = useState<any[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sendingBulk, setSendingBulk] = useState(false)

  // تحميل الرسائل المرسلة عند اختيار التبويب
  useEffect(() => {
    if (filter === 'sent_messages' && sentMessages.length === 0) {
      loadSentMessages()
    }
  }, [filter])

  const loadSentMessages = async () => {
    setLoadingMessages(true)
    try {
      const q = query(
        collection(db, 'notifications'),
        where('type', '==', 'license_reminder'),
        orderBy('createdAt', 'desc'),
        limit(100)
      )
      const snap = await getDocs(q)
      const messages = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        createdAt: d.data().createdAt?.toDate?.() || null,
      }))
      setSentMessages(messages)
    } catch (err: any) {
      console.error('خطأ في تحميل الرسائل:', err)
      // قد يكون الفهرس غير موجود
      toast.warning('تحتاج لإنشاء فهرس مركب لـ notifications (type + createdAt)')
    } finally {
      setLoadingMessages(false)
    }
  }

  // المطاعم التي لديها تراخيص
  const restaurantsWithLicenses = restaurants.filter(
    (r: LicenseRestaurant) => r.commercialLicenseUrl
  ) as LicenseRestaurant[]

  // المطاعم التي لم ترفع التراخيص
  const restaurantsWithoutLicenses = restaurants.filter(
    (r: LicenseRestaurant) => !r.commercialLicenseUrl
  ) as LicenseRestaurant[]

  // فلترة حسب الحالة
  const filteredRestaurants = restaurantsWithLicenses.filter((r: LicenseRestaurant) => {
    if (filter === 'all') return true
    if (filter === 'missing') return false // يتم عرضها في قسم منفصل
    if (filter === 'sent_messages') return false // قسم الرسائل منفصل
    return r.licenseStatus === filter || (!r.licenseStatus && filter === 'pending')
  })

  // عدد كل حالة
  const counts = {
    all: restaurantsWithLicenses.length,
    pending: restaurantsWithLicenses.filter(r => !r.licenseStatus || r.licenseStatus === 'pending').length,
    approved: restaurantsWithLicenses.filter(r => r.licenseStatus === 'approved').length,
    rejected: restaurantsWithLicenses.filter(r => r.licenseStatus === 'rejected').length,
    missing: restaurantsWithoutLicenses.length,
    sent_messages: sentMessages.length,
  }

  // إرسال رسالة لمطعم واحد
  const sendMessageToRestaurant = async (restaurant: LicenseRestaurant, message: string) => {
    if (!message.trim()) {
      toast.warning('يرجى كتابة الرسالة')
      return
    }

    setSendingTo(restaurant.id)
    try {
      await addDoc(collection(db, 'notifications'), {
        type: 'license_reminder',
        recipientId: restaurant.ownerId,
        recipientType: 'owner',
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        title: '⚠️ تذكير: رفع الترخيص التجاري',
        message: message,
        read: false,
        createdAt: serverTimestamp(),
      })
      toast.success(`تم إرسال الرسالة لـ ${restaurant.name}`)
      setMessageText('')
    } catch (err: any) {
      toast.error('فشل إرسال الرسالة: ' + (err.message || 'خطأ غير معروف'))
    } finally {
      setSendingTo(null)
    }
  }

  // إرسال رسالة جماعية
  const sendBulkMessage = async () => {
    if (!bulkMessage.trim()) {
      toast.warning('يرجى كتابة الرسالة')
      return
    }
    
    const targets = selectedMissing.size > 0 
      ? restaurantsWithoutLicenses.filter(r => selectedMissing.has(r.id))
      : restaurantsWithoutLicenses

    if (targets.length === 0) {
      toast.warning('لا توجد مطاعم لإرسال الرسالة')
      return
    }

    const confirmed = await dialog.confirm(
      `هل أنت متأكد من إرسال الرسالة لـ ${targets.length} مطعم؟`,
      { title: 'إرسال رسالة جماعية' }
    )
    if (!confirmed) return

    setSendingBulk(true)
    try {
      const promises = targets.map(restaurant => 
        addDoc(collection(db, 'notifications'), {
          type: 'license_reminder',
          recipientId: restaurant.ownerId,
          recipientType: 'owner',
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          title: '⚠️ تذكير: رفع الترخيص التجاري',
          message: bulkMessage,
          read: false,
          createdAt: serverTimestamp(),
        })
      )
      await Promise.all(promises)
      toast.success(`تم إرسال الرسالة لـ ${targets.length} مطعم بنجاح ✓`)
      setBulkMessage('')
      setSelectedMissing(new Set())
    } catch (err: any) {
      toast.error('فشل إرسال بعض الرسائل: ' + (err.message || 'خطأ غير معروف'))
    } finally {
      setSendingBulk(false)
    }
  }

  // تحديد/إلغاء تحديد الكل
  const toggleSelectAll = () => {
    if (selectedMissing.size === restaurantsWithoutLicenses.length) {
      setSelectedMissing(new Set())
    } else {
      setSelectedMissing(new Set(restaurantsWithoutLicenses.map(r => r.id)))
    }
  }

  // تبديل تحديد مطعم
  const toggleSelectRestaurant = (id: string) => {
    const newSet = new Set(selectedMissing)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedMissing(newSet)
  }

  // تحديث حالة الترخيص
  const updateLicenseStatus = async (restaurantId: string, status: 'approved' | 'rejected') => {
    const notes = reviewNotes[restaurantId] || ''
    
    if (status === 'rejected' && !notes.trim()) {
      toast.warning('يرجى كتابة سبب الرفض')
      return
    }

    const actionText = status === 'approved' ? 'الموافقة على' : 'رفض'
    const confirmed = await dialog.confirm(
      `هل أنت متأكد من ${actionText} تراخيص هذا المطعم؟`,
      { title: `${actionText} التراخيص` }
    )
    if (!confirmed) return

    setUpdating(restaurantId)
    try {
      await updateDoc(doc(db, 'restaurants', restaurantId), {
        licenseStatus: status,
        licenseNotes: status === 'rejected' ? notes : '',
        updatedAt: serverTimestamp(),
      })
      toast.success(status === 'approved' ? 'تمت الموافقة على التراخيص ✓' : 'تم رفض التراخيص')
      setReviewNotes(prev => ({ ...prev, [restaurantId]: '' }))
      onUpdate()
    } catch (err: any) {
      toast.error('فشل التحديث: ' + (err.message || 'خطأ غير معروف'))
    } finally {
      setUpdating(null)
    }
  }

  // حذف الترخيص بالكامل وإرسال رسالة لإعادة الرفع
  const deleteLicenseAndNotify = async (restaurant: LicenseRestaurant, licenseType: 'commercial') => {
    const licenseText = 'السجل التجاري'
    
    const confirmed = await dialog.confirm(
      `هل أنت متأكد من حذف ${licenseText} لـ "${restaurant.name}"؟\nسيتم إرسال إشعار للمطعم لإعادة رفع الترخيص.`,
      { title: `🗑️ حذف ${licenseText}` }
    )
    if (!confirmed) return

    setUpdating(restaurant.id)
    try {
      // تحديد الحقول المراد حذفها
      const updateData: any = {
        licenseStatus: null,
        licenseNotes: '',
        updatedAt: serverTimestamp(),
        commercialLicenseUrl: null
      }

      // حذف الترخيص من قاعدة البيانات
      await updateDoc(doc(db, 'restaurants', restaurant.id), updateData)

      // إرسال إشعار للمطعم
      await addDoc(collection(db, 'notifications'), {
        type: 'license_deleted',
        recipientId: restaurant.ownerId,
        recipientType: 'owner',
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        title: `⚠️ تم حذف ${licenseText}`,
        message: `تم حذف ${licenseText} الخاصة بمطعمك. يرجى إعادة رفع الترخيص الصحيح من صفحة إعدادات المطعم.`,
        read: false,
        createdAt: serverTimestamp(),
      })

      toast.success(`تم حذف ${licenseText} وإرسال إشعار للمطعم ✓`)
      onUpdate()
    } catch (err: any) {
      toast.error('فشل حذف الترخيص: ' + (err.message || 'خطأ غير معروف'))
    } finally {
      setUpdating(null)
    }
  }

  const statusBadge = (status?: string) => {
    switch (status) {
      case 'approved':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold"><CheckCircle className="w-3 h-3" /> موافق</span>
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold"><AlertCircle className="w-3 h-3" /> مرفوض</span>
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold"><Clock className="w-3 h-3" /> قيد المراجعة</span>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <FileCheck className="w-6 h-6 text-sky-500" />
          مراجعة التراخيص
        </h2>
        <div className="flex gap-2 flex-wrap">
          {(['pending', 'approved', 'rejected', 'all', 'missing', 'sent_messages'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                filter === f
                  ? f === 'missing' ? 'bg-orange-500 text-white' 
                    : f === 'sent_messages' ? 'bg-purple-500 text-white'
                    : 'bg-sky-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f === 'all' && `الكل (${counts.all})`}
              {f === 'pending' && `قيد المراجعة (${counts.pending})`}
              {f === 'approved' && `موافق (${counts.approved})`}
              {f === 'rejected' && `مرفوض (${counts.rejected})`}
              {f === 'missing' && `⚠️ لم يرفع (${counts.missing})`}
              {f === 'sent_messages' && `📨 الرسائل المرسلة`}
            </button>
          ))}
        </div>
      </div>

      {/* ===== قسم الرسائل المرسلة ===== */}
      {filter === 'sent_messages' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-purple-700 flex items-center gap-2">
              📨 سجل الرسائل المرسلة للمطاعم
            </h3>
            <button
              onClick={loadSentMessages}
              disabled={loadingMessages}
              className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-xl font-medium transition disabled:opacity-50"
            >
              {loadingMessages ? '⏳ جارِ التحميل...' : '🔄 تحديث'}
            </button>
          </div>

          {loadingMessages ? (
            <div className="text-center py-12">
              <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-500">جارِ تحميل الرسائل...</p>
            </div>
          ) : sentMessages.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-2xl">
              <p className="text-gray-500">لا توجد رسائل مرسلة بعد</p>
              <p className="text-gray-400 text-sm mt-2">الرسائل التي ترسلها للمطاعم ستظهر هنا</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sentMessages.map((msg: any) => (
                <div key={msg.id} className="bg-white rounded-xl shadow p-4 border-r-4 border-purple-500">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-bold text-gray-800">{msg.restaurantName || 'مطعم'}</span>
                        {msg.read ? (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">✓ مقروءة</span>
                        ) : (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">⏳ لم تُقرأ</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 font-semibold mb-1">{msg.title}</p>
                      <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded-lg">{msg.message}</p>
                    </div>
                    <div className="text-left text-xs text-gray-400 whitespace-nowrap">
                      {msg.createdAt ? new Date(msg.createdAt).toLocaleDateString('ar-SA', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }) : '-'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* قسم المطاعم التي لم ترفع التراخيص */}
      {filter === 'missing' && (
        <div className="space-y-4">
          {restaurantsWithoutLicenses.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400" />
              <p className="text-green-600 font-semibold">جميع المطاعم رفعت تراخيصها ✓</p>
            </div>
          ) : (
            <>
              {/* رسالة جماعية */}
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-5">
                <h3 className="font-bold text-orange-800 mb-3 flex items-center gap-2">
                  📢 إرسال رسالة جماعية
                </h3>
                <div className="flex items-center gap-3 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedMissing.size === restaurantsWithoutLicenses.length}
                      onChange={toggleSelectAll}
                      className="w-5 h-5 rounded border-orange-300 text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-sm text-orange-700">
                      تحديد الكل ({restaurantsWithoutLicenses.length})
                    </span>
                  </label>
                  {selectedMissing.size > 0 && (
                    <span className="text-sm bg-orange-200 text-orange-800 px-2 py-1 rounded-full">
                      محدد: {selectedMissing.size}
                    </span>
                  )}
                </div>
                <textarea
                  placeholder="اكتب الرسالة التي سترسل للمطاعم المحددة (أو جميعها إذا لم تحدد)..."
                  value={bulkMessage}
                  onChange={(e) => setBulkMessage(e.target.value)}
                  className="w-full border border-orange-200 rounded-xl p-3 text-sm resize-none h-24 focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                />
                <button
                  onClick={sendBulkMessage}
                  disabled={sendingBulk || !bulkMessage.trim()}
                  className="mt-3 w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingBulk ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      جارِ الإرسال...
                    </>
                  ) : (
                    <>
                      📤 إرسال لـ {selectedMissing.size > 0 ? selectedMissing.size : restaurantsWithoutLicenses.length} مطعم
                    </>
                  )}
                </button>
              </div>

              {/* قائمة المطاعم */}
              <div className="grid gap-3">
                {restaurantsWithoutLicenses.map((r: LicenseRestaurant) => (
                  <div key={r.id} className="bg-white border rounded-2xl p-4 shadow-sm hover:shadow-md transition">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedMissing.has(r.id)}
                        onChange={() => toggleSelectRestaurant(r.id)}
                        className="w-5 h-5 mt-1 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <h3 className="font-bold text-gray-800">{r.name}</h3>
                            <p className="text-sm text-gray-500">{r.city || 'بدون مدينة'}</p>
                          </div>
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">
                            <AlertCircle className="w-3 h-3" />
                            لم يرفع الترخيص
                          </span>
                        </div>
                        
                        {/* معلومات الاتصال */}
                        <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-3">
                          {r.email && <span>📧 {r.email}</span>}
                          {r.phone && <span>📱 {r.phone}</span>}
                        </div>

                        {/* إرسال رسالة فردية */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="رسالة سريعة..."
                            value={sendingTo === r.id ? messageText : ''}
                            onChange={(e) => {
                              setSendingTo(r.id)
                              setMessageText(e.target.value)
                            }}
                            onFocus={() => setSendingTo(r.id)}
                            className="flex-1 border rounded-lg px-3 py-2 text-sm"
                          />
                          <button
                            onClick={() => sendMessageToRestaurant(r, messageText)}
                            disabled={sendingTo === r.id && !messageText.trim()}
                            className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                          >
                            إرسال
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {filter !== 'missing' && filteredRestaurants.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FileCheck className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>لا توجد تراخيص {filter === 'pending' ? 'قيد المراجعة' : filter === 'approved' ? 'موافق عليها' : filter === 'rejected' ? 'مرفوضة' : ''}</p>
        </div>
      ) : filter !== 'missing' && (
        <div className="grid gap-4">
          {filteredRestaurants.map((r: LicenseRestaurant) => (
            <div key={r.id} className="bg-white border rounded-2xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-bold text-lg">{r.name}</h3>
                  <p className="text-sm text-gray-500">{r.city || 'بدون مدينة'} • {r.email || 'بدون بريد'}</p>
                </div>
                {statusBadge(r.licenseStatus)}
              </div>

              {/* عرض التراخيص */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {r.commercialLicenseUrl && (
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-gray-700">📜 الرخصة التجارية</p>
                      <button
                        onClick={() => deleteLicenseAndNotify(r, 'commercial')}
                        disabled={updating === r.id}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="حذف الرخصة التجارية"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <a
                      href={r.commercialLicenseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-800 text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      عرض الملف
                    </a>
                  </div>
                )}
              </div>

              {/* زر حذف السجل التجاري */}
              {r.commercialLicenseUrl && (
                <button
                  onClick={() => deleteLicenseAndNotify(r, 'commercial')}
                  disabled={updating === r.id}
                  className="w-full flex items-center justify-center gap-2 mb-4 py-2 px-4 border-2 border-dashed border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 rounded-xl text-sm font-medium transition"
                >
                  <Trash2 className="w-4 h-4" />
                  حذف السجل التجاري وإعادة الطلب
                </button>
              )}

              {/* ملاحظات الرفض السابقة */}
              {r.licenseStatus === 'rejected' && r.licenseNotes && (
                <div className="bg-red-50 text-red-700 rounded-xl p-3 mb-4 text-sm">
                  <strong>سبب الرفض:</strong> {r.licenseNotes}
                </div>
              )}

              {/* أزرار المراجعة */}
              {r.licenseStatus !== 'approved' && (
                <div className="space-y-3">
                  <textarea
                    placeholder="ملاحظات (مطلوبة للرفض)..."
                    value={reviewNotes[r.id] || ''}
                    onChange={(e) => setReviewNotes(prev => ({ ...prev, [r.id]: e.target.value }))}
                    className="w-full border rounded-xl p-3 text-sm resize-none h-20"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => updateLicenseStatus(r.id, 'approved')}
                      disabled={updating === r.id}
                      className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl font-semibold transition disabled:opacity-50"
                    >
                      <CheckCircle className="w-5 h-5" />
                      موافقة
                    </button>
                    <button
                      onClick={() => updateLicenseStatus(r.id, 'rejected')}
                      disabled={updating === r.id}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl font-semibold transition disabled:opacity-50"
                    >
                      <AlertCircle className="w-5 h-5" />
                      رفض
                    </button>
                  </div>
                </div>
              )}

{/* أزرار التحكم للتراخيص الموافق عليها */}
              {r.licenseStatus === 'approved' && (
                <div className="space-y-3">
                  <textarea
                    placeholder="سبب إلغاء الموافقة..."
                    value={reviewNotes[r.id] || ''}
                    onChange={(e) => setReviewNotes(prev => ({ ...prev, [r.id]: e.target.value }))}
                    className="w-full border border-yellow-200 rounded-xl p-3 text-sm resize-none h-20 focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => updateLicenseStatus(r.id, 'rejected')}
                      disabled={updating === r.id}
                      className="flex-1 flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-600 text-white py-2.5 rounded-xl font-semibold transition disabled:opacity-50"
                    >
                      <AlertCircle className="w-5 h-5" />
                      إلغاء الموافقة
                    </button>
                    <button
                      onClick={() => deleteLicenseAndNotify(r, 'commercial')}
                      disabled={updating === r.id}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl font-semibold transition disabled:opacity-50"
                    >
                      <Trash2 className="w-5 h-5" />
                      حذف وإعادة الطلب
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ===== مكون إدارة طلبات الباقات =====
type PackageRequestItem = {
  id: string
  restaurantId: string
  restaurantName: string
  ownerName?: string
  ownerPhone?: string
  status: 'pending' | 'bank_sent' | 'payment_sent' | 'approved' | 'rejected' | 'expired'
  bankAccountImageUrl?: string
  paymentProofImageUrl?: string
  subscriptionAmount: number
  subscriptionDuration: number
  developerNotes?: string
  ownerNotes?: string
  requestedAt?: any
  bankSentAt?: any
  paymentSentAt?: any
  approvedAt?: any
  rejectedAt?: any
  expiresAt?: any
  createdAt?: any
}

// ===== مكون مراقبة المتاجر =====
const StoreAnalyticsSection: React.FC<{
  restaurants: Restaurant[]
  orders: Order[]
  toast: any
}> = ({ restaurants, orders, toast }) => {
  const [selectedStore, setSelectedStore] = useState<string | null>(null)
  const [storeStats, setStoreStats] = useState<Record<string, any>>({})
  const [loadingStats, setLoadingStats] = useState(false)

  // جلب إحصائيات متجر معين
  const loadStoreStats = async (restaurantId: string) => {
    setLoadingStats(true)
    try {
      // جلب إحصائيات الزيارات
      const statsDoc = await getDoc(doc(db, 'restaurantStats', restaurantId))
      const visitStats = statsDoc.exists() ? statsDoc.data() : null

      // جلب الطلبات الخاصة بهذا المتجر
      const storeOrders = orders.filter(o => o.restaurantId === restaurantId)
      const deliveredOrders = storeOrders.filter(o => o.status === 'delivered')

      // جلب عدد الأصناف
      const menuQuery = query(collection(db, 'menuItems'), where('ownerId', '==', restaurantId))
      const menuSnap = await getDocs(menuQuery)

      // جلب تسجيلات العملاء
      let registrations = 0
      try {
        const regQuery = query(collection(db, 'customerRegistrations'), where('restaurantId', '==', restaurantId))
        const regSnap = await getDocs(regQuery)
        registrations = regSnap.size
      } catch {}

      // حساب الإيرادات
      const totalRevenue = deliveredOrders.reduce((sum, o) => sum + (o.total || 0), 0)
      
      // حساب زيارات اليوم
      const todayKey = new Date().toISOString().split('T')[0]
      const todayViews = visitStats?.dailyViews?.[todayKey] || 0

      setStoreStats(prev => ({
        ...prev,
        [restaurantId]: {
          totalOrders: storeOrders.length,
          deliveredOrders: deliveredOrders.length,
          totalRevenue,
          menuItemsCount: menuSnap.size,
          profileViews: visitStats?.totalProfileViews || 0,
          menuViews: visitStats?.totalMenuViews || 0,
          itemViews: visitStats?.totalItemViews || 0,
          shareClicks: visitStats?.totalShareClicks || 0,
          whatsappShares: visitStats?.whatsappShareCount || 0,
          registeredCustomers: registrations,
          todayViews,
          dailyViews: visitStats?.dailyViews || {}
        }
      }))
    } catch (err) {
      console.error('خطأ في جلب إحصائيات المتجر:', err)
      toast.error('خطأ في جلب البيانات')
    } finally {
      setLoadingStats(false)
    }
  }

  // فتح تفاصيل متجر
  const handleSelectStore = (restaurantId: string) => {
    setSelectedStore(restaurantId)
    if (!storeStats[restaurantId]) {
      loadStoreStats(restaurantId)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">📈 مراقبة إحصائيات المتاجر</h2>
        <span className="text-gray-500">{restaurants.length} متجر</span>
      </div>

      {/* قائمة المتاجر */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {restaurants.map(r => {
          const rStats = storeStats[r.id]
          return (
            <div
              key={r.id}
              onClick={() => handleSelectStore(r.id)}
              className={`bg-white rounded-2xl shadow p-4 cursor-pointer transition hover:shadow-lg ${
                selectedStore === r.id ? 'ring-2 ring-sky-500' : ''
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                {r.logoUrl ? (
                  <img src={r.logoUrl} alt={r.name} className="w-12 h-12 rounded-xl object-cover" />
                ) : (
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                    🏪
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900">{r.name}</h3>
                  <p className="text-xs text-gray-500">{r.city || 'غير محدد'}</p>
                </div>
              </div>

              {rStats && (
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-blue-50 rounded-lg p-2">
                    <p className="font-bold text-blue-700">{rStats.profileViews}</p>
                    <p className="text-blue-600">زيارة</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2">
                    <p className="font-bold text-green-700">{rStats.deliveredOrders}</p>
                    <p className="text-green-600">طلب</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-2">
                    <p className="font-bold text-purple-700">{rStats.whatsappShares}</p>
                    <p className="text-purple-600">مشاركة</p>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* تفاصيل المتجر المحدد */}
      {selectedStore && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {loadingStats ? (
            <div className="text-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-sky-500" />
              <p className="text-gray-500 mt-2">جاري تحميل البيانات...</p>
            </div>
          ) : storeStats[selectedStore] ? (
            <div className="space-y-6">
              {/* عنوان */}
              <div className="flex items-center justify-between border-b pb-4">
                <div className="flex items-center gap-3">
                  {restaurants.find(r => r.id === selectedStore)?.logoUrl ? (
                    <img 
                      src={restaurants.find(r => r.id === selectedStore)?.logoUrl} 
                      alt="" 
                      className="w-16 h-16 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center text-2xl">🏪</div>
                  )}
                  <div>
                    <h3 className="text-xl font-bold">
                      {restaurants.find(r => r.id === selectedStore)?.name}
                    </h3>
                    <p className="text-gray-500">
                      {restaurants.find(r => r.id === selectedStore)?.city}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => loadStoreStats(selectedStore)}
                  className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>

              {/* الإحصائيات */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                  <p className="text-3xl font-bold text-blue-700">{storeStats[selectedStore].profileViews}</p>
                  <p className="text-sm text-blue-600">مشاهدة الصفحة</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
                  <p className="text-3xl font-bold text-green-700">{storeStats[selectedStore].todayViews}</p>
                  <p className="text-sm text-green-600">زيارات اليوم</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4">
                  <p className="text-3xl font-bold text-purple-700">{storeStats[selectedStore].whatsappShares}</p>
                  <p className="text-sm text-purple-600">مشاركة واتساب</p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4">
                  <p className="text-3xl font-bold text-amber-700">{storeStats[selectedStore].shareClicks}</p>
                  <p className="text-sm text-amber-600">إجمالي المشاركات</p>
                </div>
              </div>

              {/* إحصائيات الطلبات والإيرادات */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
                  <p className="text-2xl font-bold">{storeStats[selectedStore].totalOrders}</p>
                  <p className="text-sm text-gray-600">إجمالي الطلبات</p>
                </div>
                <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
                  <p className="text-2xl font-bold">{storeStats[selectedStore].deliveredOrders}</p>
                  <p className="text-sm text-gray-600">طلبات مكتملة</p>
                </div>
                <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
                  <p className="text-2xl font-bold text-green-600">{storeStats[selectedStore].totalRevenue.toFixed(0)}</p>
                  <p className="text-sm text-gray-600">الإيرادات (ر.س)</p>
                </div>
                <div className="bg-white border-2 border-gray-200 rounded-xl p-4">
                  <p className="text-2xl font-bold">{storeStats[selectedStore].menuItemsCount}</p>
                  <p className="text-sm text-gray-600">عدد الأصناف</p>
                </div>
              </div>

              {/* التسجيلات عبر الرابط */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4">
                <h4 className="font-bold text-indigo-800 mb-2">👥 التسجيلات عبر رابط الأسرة</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-indigo-600">{storeStats[selectedStore].registeredCustomers}</p>
                    <p className="text-xs text-indigo-500">عميل سجل عبر الرابط</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-purple-600">{storeStats[selectedStore].itemViews}</p>
                    <p className="text-xs text-purple-500">مشاهدات الأصناف</p>
                  </div>
                </div>
              </div>

              {/* رسم بياني للزيارات اليومية */}
              {Object.keys(storeStats[selectedStore].dailyViews || {}).length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-bold text-gray-800 mb-3">📊 الزيارات اليومية (آخر 7 أيام)</h4>
                  <div className="flex items-end gap-2 h-32">
                    {(() => {
                      const dailyViews = storeStats[selectedStore].dailyViews || {}
                      const last7Days = []
                      for (let i = 6; i >= 0; i--) {
                        const d = new Date()
                        d.setDate(d.getDate() - i)
                        const key = d.toISOString().split('T')[0]
                        last7Days.push({ date: key, views: dailyViews[key] || 0 })
                      }
                      const maxViews = Math.max(...last7Days.map(d => d.views), 1)
                      
                      return last7Days.map((day, i) => (
                        <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                          <div 
                            className="w-full bg-sky-500 rounded-t"
                            style={{ height: `${(day.views / maxViews) * 100}%`, minHeight: day.views > 0 ? '4px' : '0' }}
                          />
                          <span className="text-xs text-gray-500">
                            {new Date(day.date).toLocaleDateString('ar-SA', { weekday: 'short' })}
                          </span>
                          <span className="text-xs font-bold">{day.views}</span>
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">اضغط على متجر لعرض إحصائياته</p>
          )}
        </div>
      )}
    </div>
  )
}

const PackageRequestsSection: React.FC<{
  packageRequests: PackageRequestItem[]
  onUpdate: () => void
  toast: any
  dialog: any
  storage: any
}> = ({ packageRequests, onUpdate, toast, dialog, storage }) => {
  const [filter, setFilter] = useState<string>('all')
  const [updating, setUpdating] = useState<string | null>(null)
  const [bankImageFile, setBankImageFile] = useState<File | null>(null)
  const [subscriptionAmount, setSubscriptionAmount] = useState<number>(99)
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [sendingNotification, setSendingNotification] = useState<string | null>(null)
  const [customMessage, setCustomMessage] = useState<string>('')
  const [showMessageInput, setShowMessageInput] = useState<string | null>(null)

  // إرسال رسالة/إشعار للمطعم
  const sendNotificationToRestaurant = async (request: PackageRequestItem, message: string) => {
    if (!message.trim()) {
      toast.warning('يرجى كتابة الرسالة')
      return
    }
    
    setSendingNotification(request.id)
    try {
      await addDoc(collection(db, 'notifications'), {
        recipientId: request.restaurantId,
        title: '📬 رسالة من الإدارة',
        message: message.trim(),
        type: 'admin_message',
        read: false,
        data: { requestId: request.id },
        createdAt: serverTimestamp(),
      })
      
      toast.success('تم إرسال الرسالة بنجاح! 📬')
      setShowMessageInput(null)
      setCustomMessage('')
    } catch (err: any) {
      toast.error(`فشل الإرسال: ${err.message}`)
    } finally {
      setSendingNotification(null)
    }
  }

  // فلترة الطلبات
  const filteredRequests = packageRequests.filter(r => {
    if (filter === 'all') return true
    return r.status === filter
  })

  // عدد الطلبات حسب الحالة
  const pendingCount = packageRequests.filter(r => r.status === 'pending').length
  const bankSentCount = packageRequests.filter(r => r.status === 'bank_sent').length
  const paymentSentCount = packageRequests.filter(r => r.status === 'payment_sent').length
  const approvedCount = packageRequests.filter(r => r.status === 'approved').length

  // ترجمة الحالة
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return { label: 'طلب جديد', color: 'bg-yellow-100 text-yellow-700', icon: '⏳' }
      case 'bank_sent': return { label: 'بانتظار التحويل', color: 'bg-blue-100 text-blue-700', icon: '🏦' }
      case 'payment_sent': return { label: 'بانتظار التأكيد', color: 'bg-purple-100 text-purple-700', icon: '💳' }
      case 'approved': return { label: 'مفعّل', color: 'bg-green-100 text-green-700', icon: '✅' }
      case 'rejected': return { label: 'مرفوض', color: 'bg-red-100 text-red-700', icon: '❌' }
      case 'expired': return { label: 'منتهي', color: 'bg-gray-100 text-gray-700', icon: '⏰' }
      default: return { label: status, color: 'bg-gray-100', icon: '📦' }
    }
  }

  // إرسال صورة الحساب البنكي
  const handleSendBankAccount = async (requestId: string) => {
    if (!bankImageFile) {
      toast.warning('يرجى اختيار صورة الحساب البنكي')
      return
    }

    setUpdating(requestId)
    try {
      // رفع الصورة
      const path = `bankAccounts/${Date.now()}_${bankImageFile.name}`
      const storageRef = ref(storage, path)
      await uploadBytes(storageRef, bankImageFile)
      const imageUrl = await getDownloadURL(storageRef)

      // تحديث الطلب
      await updateDoc(doc(db, 'packageRequests', requestId), {
        status: 'bank_sent',
        bankAccountImageUrl: imageUrl,
        subscriptionAmount,
        bankSentAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      // إرسال إشعار للأسرة
      const request = packageRequests.find(r => r.id === requestId)
      if (request) {
        await addDoc(collection(db, 'notifications'), {
          recipientId: request.restaurantId,
          title: '🏦 تم إرسال بيانات الحساب البنكي',
          message: `يرجى تحويل مبلغ ${subscriptionAmount} ريال ثم رفع صورة إثبات التحويل`,
          type: 'package_bank_sent',
          read: false,
          data: { requestId, amount: subscriptionAmount },
          createdAt: serverTimestamp(),
        })
      }

      toast.success('تم إرسال بيانات الحساب البنكي بنجاح')
      setBankImageFile(null)
      setSelectedRequestId(null)
      onUpdate()
    } catch (err: any) {
      toast.error(`فشل الإرسال: ${err.message}`)
    } finally {
      setUpdating(null)
    }
  }

  // تأكيد الدفع وتفعيل الباقة
  const handleApprovePayment = async (request: PackageRequestItem) => {
    const confirmed = await dialog.confirm(
      `هل تأكد من استلام مبلغ ${request.subscriptionAmount} ريال وتفعيل باقة التميز لـ "${request.restaurantName}"؟`,
      { title: '✅ تأكيد الدفع وتفعيل الباقة', confirmText: 'نعم، فعّل الباقة' }
    )
    if (!confirmed) return

    setUpdating(request.id)
    try {
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + (request.subscriptionDuration || 30))

      // تحديث طلب الباقة
      await updateDoc(doc(db, 'packageRequests', request.id), {
        status: 'approved',
        approvedAt: serverTimestamp(),
        expiresAt,
        updatedAt: serverTimestamp(),
      })

      // تفعيل الباقة في المطعم
      await updateDoc(doc(db, 'restaurants', request.restaurantId), {
        packageType: 'premium',
        packageSubscribedAt: serverTimestamp(),
        packageExpiresAt: expiresAt,
        packageRequest: null,
        updatedAt: serverTimestamp(),
      })

      // إرسال إشعار للأسرة
      await addDoc(collection(db, 'notifications'), {
        recipientId: request.restaurantId,
        title: '🎉 تم تفعيل باقة التميز!',
        message: `مبروك! تم تفعيل باقة التميز حتى ${expiresAt.toLocaleDateString('ar-SA')}`,
        type: 'package_approved',
        read: false,
        data: { requestId: request.id },
        createdAt: serverTimestamp(),
      })

      toast.success('تم تفعيل الباقة بنجاح! 🎉')
      onUpdate()
    } catch (err: any) {
      toast.error(`فشل التفعيل: ${err.message}`)
    } finally {
      setUpdating(null)
    }
  }

  // رفض الطلب
  const handleRejectRequest = async (request: PackageRequestItem) => {
    const confirmed = await dialog.confirm(
      `هل تريد رفض طلب "${request.restaurantName}"؟`,
      { title: '❌ رفض الطلب', confirmText: 'نعم، ارفض', dangerous: true }
    )
    if (!confirmed) return

    setUpdating(request.id)
    try {
      await updateDoc(doc(db, 'packageRequests', request.id), {
        status: 'rejected',
        rejectedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      // إرسال إشعار
      await addDoc(collection(db, 'notifications'), {
        recipientId: request.restaurantId,
        title: '❌ تم رفض طلب الاشتراك',
        message: 'للأسف تم رفض طلب اشتراكك في باقة التميز. يمكنك التواصل معنا لمعرفة السبب.',
        type: 'package_rejected',
        read: false,
        createdAt: serverTimestamp(),
      })

      toast.success('تم رفض الطلب')
      onUpdate()
    } catch (err: any) {
      toast.error(`فشل الرفض: ${err.message}`)
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Package className="w-8 h-8 text-amber-500" />
          <div>
            <h2 className="text-2xl font-bold">طلبات الاشتراك في الباقات</h2>
            <p className="text-gray-600">إدارة طلبات الأسر المنتجة للاشتراك في باقة التميز</p>
          </div>
        </div>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-yellow-50 rounded-xl p-4 text-center border border-yellow-200">
          <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
          <p className="text-sm text-yellow-700">⏳ طلب جديد</p>
        </div>
        <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-200">
          <p className="text-3xl font-bold text-blue-600">{bankSentCount}</p>
          <p className="text-sm text-blue-700">🏦 بانتظار التحويل</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 text-center border border-purple-200">
          <p className="text-3xl font-bold text-purple-600">{paymentSentCount}</p>
          <p className="text-sm text-purple-700">💳 بانتظار التأكيد</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 text-center border border-green-200">
          <p className="text-3xl font-bold text-green-600">{approvedCount}</p>
          <p className="text-sm text-green-700">✅ مفعّل</p>
        </div>
      </div>

      {/* فلتر الحالة */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'all', label: 'الكل' },
          { id: 'pending', label: '⏳ طلبات جديدة' },
          { id: 'bank_sent', label: '🏦 بانتظار التحويل' },
          { id: 'payment_sent', label: '💳 بانتظار التأكيد' },
          { id: 'approved', label: '✅ مفعّلة' },
          { id: 'rejected', label: '❌ مرفوضة' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-xl font-semibold transition ${
              filter === f.id
                ? 'bg-amber-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* قائمة الطلبات */}
      {filteredRequests.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">لا توجد طلبات {filter !== 'all' && 'بهذه الحالة'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map(request => {
            const statusInfo = getStatusLabel(request.status)
            return (
              <div key={request.id} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                {/* رأس البطاقة */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4 text-white">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
                        👨‍🍳
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{request.restaurantName}</h3>
                        <p className="text-white/80 text-sm">
                          {request.ownerName || 'صاحب الأسرة'} • {request.ownerPhone || 'بدون رقم'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* زر التواصل واتساب */}
                      {request.ownerPhone && (
                        <a
                          href={`https://wa.me/${request.ownerPhone.replace(/[^0-9]/g, '').replace(/^0/, '966')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-xl text-sm font-semibold transition"
                        >
                          📱 واتساب
                        </a>
                      )}
                      <div className={`px-4 py-2 rounded-full text-sm font-bold ${statusInfo.color}`}>
                        {statusInfo.icon} {statusInfo.label}
                      </div>
                    </div>
                  </div>
                </div>

                {/* محتوى البطاقة */}
                <div className="p-4 space-y-4">
                  {/* تفاصيل الطلب */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">تاريخ الطلب</p>
                      <p className="font-semibold">
                        {request.requestedAt?.toDate?.()?.toLocaleDateString('ar-SA') || 
                         request.createdAt?.toDate?.()?.toLocaleDateString('ar-SA') || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">المبلغ</p>
                      <p className="font-semibold text-green-600">{request.subscriptionAmount || 99} ر.س</p>
                    </div>
                    <div>
                      <p className="text-gray-500">المدة</p>
                      <p className="font-semibold">{request.subscriptionDuration || 30} يوم</p>
                    </div>
                    <div>
                      <p className="text-gray-500">معرف الأسرة</p>
                      <p className="font-mono text-xs">{request.restaurantId.slice(0, 12)}...</p>
                    </div>
                  </div>

                  {/* === أزرار التواصل === */}
                  <div className="border-t pt-4">
                    {showMessageInput === request.id ? (
                      <div className="space-y-3 bg-sky-50 p-4 rounded-xl">
                        <h4 className="font-bold text-sky-600">📬 إرسال رسالة للأسرة</h4>
                        <textarea
                          value={customMessage}
                          onChange={(e) => setCustomMessage(e.target.value)}
                          placeholder="اكتب رسالتك هنا..."
                          className="w-full border rounded-lg p-3 resize-none"
                          rows={3}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => sendNotificationToRestaurant(request, customMessage)}
                            disabled={sendingNotification === request.id || !customMessage.trim()}
                            className="flex-1 bg-sky-500 hover:bg-sky-600 text-white py-2 rounded-xl font-semibold disabled:opacity-50"
                          >
                            {sendingNotification === request.id ? 'جارِ الإرسال...' : '📬 إرسال الرسالة'}
                          </button>
                          <button
                            onClick={() => {
                              setShowMessageInput(null)
                              setCustomMessage('')
                            }}
                            className="px-4 bg-gray-200 hover:bg-gray-300 rounded-xl"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setShowMessageInput(request.id)}
                          className="flex items-center gap-2 bg-sky-100 hover:bg-sky-200 text-sky-700 px-4 py-2 rounded-xl font-semibold transition"
                        >
                          📬 إرسال رسالة
                        </button>
                        {request.ownerPhone && (
                          <a
                            href={`https://wa.me/${request.ownerPhone.replace(/[^0-9]/g, '').replace(/^0/, '966')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-green-100 hover:bg-green-200 text-green-700 px-4 py-2 rounded-xl font-semibold transition"
                          >
                            📱 واتساب
                          </a>
                        )}
                        {!request.ownerPhone && (
                          <span className="text-gray-400 text-sm self-center">⚠️ لا يوجد رقم هاتف</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* === حالة: طلب جديد - إرسال صورة البنك === */}
                  {request.status === 'pending' && (
                    <div className="border-t pt-4 space-y-3">
                      <h4 className="font-bold text-amber-600">📤 إرسال بيانات الحساب البنكي</h4>
                      
                      {selectedRequestId === request.id ? (
                        <div className="space-y-3 bg-amber-50 p-4 rounded-xl">
                          <div>
                            <label className="block text-sm font-semibold mb-1">صورة الحساب البنكي (IBAN)</label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => setBankImageFile(e.target.files?.[0] || null)}
                              className="w-full border rounded-lg p-2"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-semibold mb-1">مبلغ الاشتراك (ريال)</label>
                            <input
                              type="number"
                              value={subscriptionAmount}
                              onChange={(e) => setSubscriptionAmount(Number(e.target.value))}
                              className="w-full border rounded-lg p-2"
                              min={1}
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSendBankAccount(request.id)}
                              disabled={updating === request.id || !bankImageFile}
                              className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-xl font-semibold disabled:opacity-50"
                            >
                              {updating === request.id ? 'جارِ الإرسال...' : '📤 إرسال للأسرة'}
                            </button>
                            <button
                              onClick={() => {
                                setSelectedRequestId(null)
                                setBankImageFile(null)
                              }}
                              className="px-4 bg-gray-200 hover:bg-gray-300 rounded-xl"
                            >
                              إلغاء
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedRequestId(request.id)}
                            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-3 rounded-xl font-semibold"
                          >
                            🏦 إرسال بيانات البنك
                          </button>
                          <button
                            onClick={() => handleRejectRequest(request)}
                            disabled={updating === request.id}
                            className="px-6 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-semibold"
                          >
                            ❌ رفض
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* === حالة: بانتظار التحويل === */}
                  {request.status === 'bank_sent' && (
                    <div className="border-t pt-4">
                      <div className="bg-blue-50 p-4 rounded-xl">
                        <p className="text-blue-700 font-semibold mb-2">🏦 تم إرسال بيانات الحساب البنكي</p>
                        <p className="text-blue-600 text-sm">بانتظار تحويل مبلغ {request.subscriptionAmount} ريال من الأسرة</p>
                        {request.bankAccountImageUrl && (
                          <a
                            href={request.bankAccountImageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 hover:underline mt-2 text-sm"
                          >
                            <ExternalLink className="w-4 h-4" />
                            عرض صورة البنك المرسلة
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* === حالة: بانتظار التأكيد (الأسرة حولت) === */}
                  {request.status === 'payment_sent' && (
                    <div className="border-t pt-4 space-y-3">
                      <div className="bg-purple-50 p-4 rounded-xl">
                        <p className="text-purple-700 font-semibold mb-2">💳 الأسرة أرسلت إثبات التحويل</p>
                        {request.paymentProofImageUrl && (
                          <a
                            href={request.paymentProofImageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-lg text-purple-600 hover:bg-purple-100 transition"
                          >
                            <ExternalLink className="w-5 h-5" />
                            عرض صورة إثبات التحويل
                          </a>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprovePayment(request)}
                          disabled={updating === request.id}
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold disabled:opacity-50"
                        >
                          {updating === request.id ? 'جارِ التفعيل...' : '✅ تأكيد الدفع وتفعيل الباقة'}
                        </button>
                        <button
                          onClick={() => handleRejectRequest(request)}
                          disabled={updating === request.id}
                          className="px-6 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl font-semibold"
                        >
                          ❌ رفض
                        </button>
                      </div>
                    </div>
                  )}

                  {/* === حالة: مفعّل === */}
                  {request.status === 'approved' && (
                    <div className="border-t pt-4">
                      <div className="bg-green-50 p-4 rounded-xl flex items-center gap-3">
                        <CheckCircle className="w-8 h-8 text-green-500" />
                        <div>
                          <p className="text-green-700 font-semibold">✅ الباقة مفعّلة</p>
                          <p className="text-green-600 text-sm">
                            تنتهي في: {request.expiresAt?.toDate?.()?.toLocaleDateString('ar-SA') || '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* === حالة: مرفوض === */}
                  {request.status === 'rejected' && (
                    <div className="border-t pt-4">
                      <div className="bg-red-50 p-4 rounded-xl">
                        <p className="text-red-700 font-semibold">❌ تم رفض الطلب</p>
                        <p className="text-red-600 text-sm">
                          بتاريخ: {request.rejectedAt?.toDate?.()?.toLocaleDateString('ar-SA') || '-'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ===== مكون إعدادات أسعار الباقات =====
import { PackageSettings, PackageConfig, PackageDiscount } from '@/types'

const defaultPackageSettings: PackageSettings = {
  premium: {
    displayName: 'باقة التميز',
    description: 'احصل على مزايا حصرية وإحصائيات متقدمة',
    isEnabled: true,
    originalPrice: 99,
    currentPrice: 99,
    durationDays: 30,
    discount: {
      isActive: false,
      type: 'percentage',
      value: 0,
    },
  },
  free: {
    displayName: 'الباقة المجانية',
    description: 'المميزات الأساسية مجاناً',
    isEnabled: true,
    originalPrice: 0,
    currentPrice: 0,
    durationDays: 0,
    discount: {
      isActive: false,
      type: 'percentage',
      value: 0,
    },
  },
  defaultPackage: 'free',
}

const PackageSettingsSection: React.FC<{
  toast: any
  dialog: any
}> = ({ toast, dialog }) => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [packageSettings, setPackageSettings] = useState<PackageSettings>(defaultPackageSettings)
  const [editingPackage, setEditingPackage] = useState<'premium' | 'free' | null>(null)

  // تحميل الإعدادات
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const snap = await getDoc(doc(db, 'settings', 'packages'))
      if (snap.exists()) {
        const data = snap.data() as PackageSettings
        setPackageSettings({
          ...defaultPackageSettings,
          ...data,
          premium: { ...defaultPackageSettings.premium, ...data.premium },
          free: { ...defaultPackageSettings.free, ...data.free },
        })
      }
    } catch (err) {
      console.error('خطأ في تحميل إعدادات الباقات:', err)
      toast.error('فشل تحميل إعدادات الباقات')
    } finally {
      setLoading(false)
    }
  }

  // حفظ الإعدادات
  const saveSettings = async () => {
    setSaving(true)
    try {
      // حساب السعر الحالي بناء على الخصم
      const updatedSettings = { ...packageSettings }
      
      // حساب سعر باقة التميز
      if (updatedSettings.premium.discount?.isActive && updatedSettings.premium.discount.value > 0) {
        const discount = updatedSettings.premium.discount
        if (discount.type === 'percentage') {
          updatedSettings.premium.currentPrice = 
            updatedSettings.premium.originalPrice - (updatedSettings.premium.originalPrice * discount.value / 100)
        } else {
          updatedSettings.premium.currentPrice = 
            Math.max(0, updatedSettings.premium.originalPrice - discount.value)
        }
      } else {
        updatedSettings.premium.currentPrice = updatedSettings.premium.originalPrice
      }

      await setDoc(doc(db, 'settings', 'packages'), {
        ...updatedSettings,
        updatedAt: serverTimestamp(),
      })
      
      setPackageSettings(updatedSettings)
      toast.success('تم حفظ إعدادات الباقات بنجاح ✅')
    } catch (err: any) {
      console.error('خطأ في حفظ الإعدادات:', err)
      toast.error(`فشل الحفظ: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // تحديث إعدادات باقة معينة
  const updatePackageConfig = (pkg: 'premium' | 'free', field: keyof PackageConfig, value: any) => {
    setPackageSettings(prev => ({
      ...prev,
      [pkg]: {
        ...prev[pkg],
        [field]: value,
      },
    }))
  }

  // تحديث إعدادات الخصم
  const updateDiscount = (pkg: 'premium' | 'free', field: keyof PackageDiscount, value: any) => {
    setPackageSettings(prev => ({
      ...prev,
      [pkg]: {
        ...prev[pkg],
        discount: {
          ...prev[pkg].discount,
          [field]: value,
        },
      },
    }))
  }

  // جعل الباقة مجانية
  const makeFree = async () => {
    const confirmed = await dialog.confirm(
      'سيتم جعل باقة التميز مجانية (0 ريال). هل أنت متأكد؟',
      { title: '🎁 جعل الباقة مجانية' }
    )
    if (!confirmed) return

    setPackageSettings(prev => ({
      ...prev,
      premium: {
        ...prev.premium,
        originalPrice: 0,
        currentPrice: 0,
        discount: {
          isActive: false,
          type: 'percentage',
          value: 0,
        },
      },
    }))
    toast.success('تم تعيين السعر على 0 ريال. اضغط حفظ لتطبيق التغييرات.')
  }

  // التحقق من صلاحية الخصم
  const isDiscountValid = (discount?: PackageDiscount): boolean => {
    if (!discount?.isActive) return false
    
    const now = new Date()
    const startDate = discount.startDate?.toDate?.() || (discount.startDate ? new Date(discount.startDate) : null)
    const endDate = discount.endDate?.toDate?.() || (discount.endDate ? new Date(discount.endDate) : null)
    
    if (startDate && now < startDate) return false
    if (endDate && now > endDate) return false
    
    return true
  }

  // حساب السعر بعد الخصم
  const calculateDiscountedPrice = (config: PackageConfig): number => {
    if (!isDiscountValid(config.discount)) {
      return config.originalPrice
    }
    
    const discount = config.discount!
    if (discount.type === 'percentage') {
      return config.originalPrice - (config.originalPrice * discount.value / 100)
    } else {
      return Math.max(0, config.originalPrice - discount.value)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">جارِ تحميل إعدادات الباقات...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* العنوان */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">إعدادات أسعار الباقات</h2>
            <p className="text-gray-600">تحكم في أسعار الباقات والخصومات من هنا</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={makeFree}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-5 py-3 rounded-xl font-bold shadow-lg transition flex items-center gap-2"
          >
            🎁 جعلها مجانية
          </button>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? '⏳ جارِ الحفظ...' : '💾 حفظ التغييرات'}
          </button>
        </div>
      </div>

      {/* إعدادات باقة التميز */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8" />
              <div>
                <h3 className="text-xl font-bold">👑 باقة التميز (Premium)</h3>
                <p className="text-white/80 text-sm">الباقة المدفوعة مع مزايا حصرية</p>
              </div>
            </div>
            <label className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={packageSettings.premium.isEnabled}
                onChange={(e) => updatePackageConfig('premium', 'isEnabled', e.target.checked)}
                className="w-5 h-5 rounded"
              />
              <span className="font-semibold">{packageSettings.premium.isEnabled ? '✅ مفعّلة' : '❌ موقوفة'}</span>
            </label>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* السعر الأصلي والمدة */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">💰 السعر الأصلي (ريال)</label>
              <input
                type="number"
                min="0"
                step="1"
                value={packageSettings.premium.originalPrice}
                onChange={(e) => updatePackageConfig('premium', 'originalPrice', Number(e.target.value))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-xl font-bold text-center"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">📅 مدة الاشتراك (يوم)</label>
              <input
                type="number"
                min="1"
                value={packageSettings.premium.durationDays}
                onChange={(e) => updatePackageConfig('premium', 'durationDays', Number(e.target.value))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-xl font-bold text-center"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">💵 السعر الحالي</label>
              <div className="w-full px-4 py-3 bg-green-50 border-2 border-green-300 rounded-xl text-xl font-bold text-center text-green-700">
                {calculateDiscountedPrice(packageSettings.premium).toFixed(0)} ريال
                {isDiscountValid(packageSettings.premium.discount) && (
                  <span className="text-sm text-green-600 block">بعد الخصم</span>
                )}
              </div>
            </div>
          </div>

          {/* الوصف */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">📝 وصف الباقة</label>
            <textarea
              value={packageSettings.premium.description || ''}
              onChange={(e) => updatePackageConfig('premium', 'description', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              rows={2}
              placeholder="وصف قصير للباقة..."
            />
          </div>

          {/* إعدادات الخصم */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏷️</span>
                <h4 className="text-lg font-bold text-red-700">إعدادات الخصم</h4>
              </div>
              <label className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl cursor-pointer shadow">
                <input
                  type="checkbox"
                  checked={packageSettings.premium.discount?.isActive || false}
                  onChange={(e) => updateDiscount('premium', 'isActive', e.target.checked)}
                  className="w-5 h-5 rounded accent-red-500"
                />
                <span className="font-semibold text-red-700">
                  {packageSettings.premium.discount?.isActive ? '✅ الخصم مفعّل' : '⏸️ الخصم موقوف'}
                </span>
              </label>
            </div>

            {packageSettings.premium.discount?.isActive && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">نوع الخصم</label>
                    <select
                      value={packageSettings.premium.discount?.type || 'percentage'}
                      onChange={(e) => updateDiscount('premium', 'type', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500"
                    >
                      <option value="percentage">نسبة مئوية (%)</option>
                      <option value="fixed">مبلغ ثابت (ريال)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      قيمة الخصم {packageSettings.premium.discount?.type === 'percentage' ? '(%)' : '(ريال)'}
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={packageSettings.premium.discount?.type === 'percentage' ? 100 : packageSettings.premium.originalPrice}
                      value={packageSettings.premium.discount?.value || 0}
                      onChange={(e) => updateDiscount('premium', 'value', Number(e.target.value))}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500 text-lg font-bold text-center"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">📅 تاريخ بداية الخصم</label>
                    <input
                      type="date"
                      value={
                        packageSettings.premium.discount?.startDate
                          ? (typeof packageSettings.premium.discount.startDate === 'string'
                              ? packageSettings.premium.discount.startDate
                              : packageSettings.premium.discount.startDate.toDate?.()?.toISOString().split('T')[0] || '')
                          : ''
                      }
                      onChange={(e) => updateDiscount('premium', 'startDate', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">📅 تاريخ نهاية الخصم</label>
                    <input
                      type="date"
                      value={
                        packageSettings.premium.discount?.endDate
                          ? (typeof packageSettings.premium.discount.endDate === 'string'
                              ? packageSettings.premium.discount.endDate
                              : packageSettings.premium.discount.endDate.toDate?.()?.toISOString().split('T')[0] || '')
                          : ''
                      }
                      onChange={(e) => updateDiscount('premium', 'endDate', e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">🏷️ وسم/سبب الخصم (اختياري)</label>
                  <input
                    type="text"
                    value={packageSettings.premium.discount?.label || ''}
                    onChange={(e) => updateDiscount('premium', 'label', e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-red-500"
                    placeholder="مثال: عرض الإطلاق، خصم رمضان..."
                  />
                </div>

                {/* معاينة الخصم */}
                <div className="bg-white rounded-xl p-4 border-2 border-dashed border-red-300">
                  <p className="text-center text-lg">
                    <span className="text-gray-500 line-through">{packageSettings.premium.originalPrice} ريال</span>
                    <span className="mx-3">→</span>
                    <span className="text-2xl font-bold text-green-600">{calculateDiscountedPrice(packageSettings.premium).toFixed(0)} ريال</span>
                    {packageSettings.premium.discount?.label && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full mr-2">
                        {packageSettings.premium.discount.label}
                      </span>
                    )}
                  </p>
                  <p className="text-center text-sm text-gray-500 mt-2">
                    {isDiscountValid(packageSettings.premium.discount) ? '✅ الخصم نشط حالياً' : '⏸️ الخصم غير نشط (تحقق من التواريخ)'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* إعدادات الباقة المجانية */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-gray-600 to-gray-700 p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8" />
              <div>
                <h3 className="text-xl font-bold">📦 الباقة المجانية (Free)</h3>
                <p className="text-white/80 text-sm">المميزات الأساسية بدون رسوم</p>
              </div>
            </div>
            <label className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={packageSettings.free.isEnabled}
                onChange={(e) => updatePackageConfig('free', 'isEnabled', e.target.checked)}
                className="w-5 h-5 rounded"
              />
              <span className="font-semibold">{packageSettings.free.isEnabled ? '✅ مفعّلة' : '❌ موقوفة'}</span>
            </label>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4 text-center">
            <p className="text-green-700 font-bold text-lg">✅ هذه الباقة مجانية دائماً</p>
            <p className="text-green-600 text-sm">لا يتطلب دفع أي رسوم</p>
          </div>
        </div>
      </div>

      {/* ملخص الأسعار */}
      <div className="bg-gradient-to-r from-sky-50 to-blue-50 rounded-2xl p-6 border-2 border-sky-200">
        <h3 className="text-lg font-bold text-sky-800 mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          ملخص الأسعار الحالية
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl p-4 shadow">
            <div className="flex items-center justify-between">
              <span className="font-semibold">👑 باقة التميز</span>
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${packageSettings.premium.isEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {packageSettings.premium.isEnabled ? 'مفعّلة' : 'موقوفة'}
              </span>
            </div>
            <p className="text-3xl font-bold text-amber-600 mt-2">
              {calculateDiscountedPrice(packageSettings.premium).toFixed(0)} ريال
              {isDiscountValid(packageSettings.premium.discount) && (
                <span className="text-sm text-red-500 mr-2 bg-red-50 px-2 py-1 rounded-full">خصم!</span>
              )}
            </p>
            <p className="text-gray-500 text-sm">لمدة {packageSettings.premium.durationDays} يوم</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow">
            <div className="flex items-center justify-between">
              <span className="font-semibold">📦 الباقة المجانية</span>
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${packageSettings.free.isEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {packageSettings.free.isEnabled ? 'مفعّلة' : 'موقوفة'}
              </span>
            </div>
            <p className="text-3xl font-bold text-green-600 mt-2">مجاناً</p>
            <p className="text-gray-500 text-sm">بدون رسوم</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ===== مكونات مساعدة للواجهة الفاخرة =====

// إحصائية سريعة في الهيدر
type QuickStatProps = {
  icon: React.ReactNode
  value: string | number
  label: string
  color: 'sky' | 'emerald' | 'purple' | 'orange' | 'amber' | 'green'
}

const QuickStat: React.FC<QuickStatProps> = ({ icon, value, label, color }) => {
  const colors = {
    sky: 'bg-sky-500/20 text-sky-300',
    emerald: 'bg-emerald-500/20 text-emerald-300',
    purple: 'bg-purple-500/20 text-purple-300',
    orange: 'bg-orange-500/20 text-orange-300',
    amber: 'bg-amber-500/20 text-amber-300',
    green: 'bg-green-500/20 text-green-300',
  }

  return (
    <div className={`${colors[color]} rounded-xl p-3 backdrop-blur-sm`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xl font-bold text-white">{value}</span>
      </div>
      <p className="text-xs text-white/60 mt-1">{label}</p>
    </div>
  )
}

// بطاقة إحصائية كبيرة
type StatCardProps = {
  title: string
  value: string
  change?: number
  subtitle?: string
  icon: React.ReactNode
  color: 'emerald' | 'sky' | 'amber' | 'purple' | 'red'
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, subtitle, icon, color }) => {
  const gradients = {
    emerald: 'from-emerald-500 to-teal-600',
    sky: 'from-sky-500 to-blue-600',
    amber: 'from-amber-500 to-orange-600',
    purple: 'from-purple-500 to-indigo-600',
    red: 'from-red-500 to-rose-600',
  }

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${gradients[color]} rounded-2xl p-5 text-white shadow-lg`}>
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            {icon}
          </div>
          {change !== undefined && (
            <div className={`flex items-center gap-1 text-sm ${change >= 0 ? 'text-green-200' : 'text-red-200'}`}>
              {change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {Math.abs(change)}%
            </div>
          )}
        </div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-white/70 text-sm mt-1">{subtitle || title}</p>
      </div>
    </div>
  )
}

// بطاقة إحصائية صغيرة
type MiniStatCardProps = {
  icon: React.ReactNode
  value: number
  label: string
  bgColor: string
}

const MiniStatCard: React.FC<MiniStatCardProps> = ({ icon, value, label, bgColor }) => {
  return (
    <div className={`${bgColor} rounded-xl p-4 flex items-center gap-3`}>
      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  )
}

// شريط الفلاتر
type FilterBarProps = {
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder: string
  filters?: {
    label: string
    value: string
    options: { value: string; label: string }[]
    onChange: (value: string) => void
  }[]
  sortOptions?: {
    value: string
    options: { value: string; label: string }[]
    onChange: (value: string) => void
  }
  actionButton?: {
    label: string
    icon: React.ReactNode
    onClick: () => void
    color?: 'primary' | 'success' | 'warning'
  }
}

const FilterBar: React.FC<FilterBarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  filters,
  sortOptions,
  actionButton,
}) => {
  const buttonColors = {
    primary: 'bg-sky-500 hover:bg-sky-600 text-white',
    success: 'bg-emerald-500 hover:bg-emerald-600 text-white',
    warning: 'bg-amber-500 hover:bg-amber-600 text-white',
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* حقل البحث */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
          />
        </div>

        {/* الفلاتر */}
        {filters?.map((filter, index) => (
          <div key={index} className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filter.value}
              onChange={(e) => filter.onChange(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            >
              {filter.options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        ))}

        {/* الترتيب */}
        {sortOptions && (
          <div className="flex items-center gap-2">
            <SortAsc className="w-4 h-4 text-slate-400" />
            <select
              value={sortOptions.value}
              onChange={(e) => sortOptions.onChange(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            >
              {sortOptions.options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* زر الإجراء */}
        {actionButton && (
          <button
            onClick={actionButton.onClick}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition ${buttonColors[actionButton.color || 'primary']}`}
          >
            {actionButton.icon}
            {actionButton.label}
          </button>
        )}
      </div>
    </div>
  )
}