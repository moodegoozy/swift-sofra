// src/utils/authService.ts
// خدمة المصادقة: تسجيل محاولات الدخول، Rate Limiting، وإدارة الحسابات
import { db } from '@/firebase'
import { 
  collection, doc, getDoc, setDoc, updateDoc, addDoc, 
  query, where, getDocs, serverTimestamp, increment,
  Timestamp, orderBy, limit
} from 'firebase/firestore'

// إعدادات Rate Limiting
const MAX_LOGIN_ATTEMPTS = 5 // الحد الأقصى لمحاولات الدخول
const LOCKOUT_DURATION = 15 * 60 * 1000 // مدة الحظر: 15 دقيقة
const ATTEMPT_WINDOW = 10 * 60 * 1000 // نافذة احتساب المحاولات: 10 دقائق

// أنواع سجلات الدخول
export type LoginAttemptStatus = 'success' | 'failed' | 'blocked' | 'locked'

export interface LoginAttempt {
  id?: string
  email: string
  status: LoginAttemptStatus
  ip?: string
  userAgent?: string
  errorCode?: string
  errorMessage?: string
  timestamp?: Date // يُضاف تلقائياً
  userId?: string
}

export interface UserSecurityInfo {
  failedAttempts: number
  lastFailedAttempt?: Date
  lockedUntil?: Date
  lastLogin?: Date
  lastLoginIp?: string
  lastLoginUserAgent?: string
  isDeactivated?: boolean
  deactivatedAt?: Date
  deactivatedBy?: string
  deactivationReason?: string
}

// ===== تسجيل محاولات الدخول =====

/**
 * تسجيل محاولة دخول في قاعدة البيانات
 */
export const logLoginAttempt = async (attempt: Omit<LoginAttempt, 'id'>): Promise<void> => {
  try {
    await addDoc(collection(db, 'loginAttempts'), {
      ...attempt,
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('خطأ في تسجيل محاولة الدخول:', error)
  }
}

/**
 * جلب محاولات الدخول الفاشلة الأخيرة لبريد معين
 */
export const getRecentFailedAttempts = async (email: string): Promise<number> => {
  try {
    const windowStart = new Date(Date.now() - ATTEMPT_WINDOW)
    const attemptsQuery = query(
      collection(db, 'loginAttempts'),
      where('email', '==', email.toLowerCase()),
      where('status', '==', 'failed'),
      where('timestamp', '>=', Timestamp.fromDate(windowStart))
    )
    const snapshot = await getDocs(attemptsQuery)
    return snapshot.size
  } catch (error) {
    console.error('خطأ في جلب محاولات الدخول:', error)
    return 0
  }
}

/**
 * جلب سجل دخول مستخدم
 */
export const getUserLoginHistory = async (
  userId: string, 
  limitCount: number = 10
): Promise<LoginAttempt[]> => {
  try {
    const historyQuery = query(
      collection(db, 'loginAttempts'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    )
    const snapshot = await getDocs(historyQuery)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().createdAt)
    })) as LoginAttempt[]
  } catch (error) {
    console.error('خطأ في جلب سجل الدخول:', error)
    return []
  }
}

// ===== Rate Limiting =====

/**
 * التحقق مما إذا كان المستخدم محظوراً من تسجيل الدخول
 */
export const checkRateLimitStatus = async (email: string): Promise<{
  isBlocked: boolean
  remainingAttempts: number
  blockedUntil?: Date
  message?: string
}> => {
  try {
    // جلب معلومات الأمان من مستند المستخدم
    const usersQuery = query(
      collection(db, 'users'),
      where('email', '==', email.toLowerCase())
    )
    const userSnap = await getDocs(usersQuery)
    
    if (!userSnap.empty) {
      const userData = userSnap.docs[0].data()
      const security = userData.security as UserSecurityInfo | undefined
      
      // التحقق من إيقاف الحساب
      if (security?.isDeactivated) {
        return {
          isBlocked: true,
          remainingAttempts: 0,
          message: 'هذا الحساب موقوف. تواصل مع الدعم للمساعدة.'
        }
      }
      
      // التحقق من الحظر المؤقت
      if (security?.lockedUntil) {
        const lockedUntil = security.lockedUntil instanceof Timestamp 
          ? security.lockedUntil.toDate() 
          : new Date(security.lockedUntil)
        
        if (lockedUntil > new Date()) {
          const remainingMinutes = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000)
          return {
            isBlocked: true,
            remainingAttempts: 0,
            blockedUntil: lockedUntil,
            message: `الحساب محظور مؤقتاً. حاول بعد ${remainingMinutes} دقيقة.`
          }
        }
      }
    }
    
    // حساب المحاولات الفاشلة الأخيرة
    const failedAttempts = await getRecentFailedAttempts(email)
    const remainingAttempts = Math.max(0, MAX_LOGIN_ATTEMPTS - failedAttempts)
    
    if (failedAttempts >= MAX_LOGIN_ATTEMPTS) {
      return {
        isBlocked: true,
        remainingAttempts: 0,
        message: 'تم تجاوز الحد الأقصى لمحاولات الدخول. حاول لاحقاً.'
      }
    }
    
    return {
      isBlocked: false,
      remainingAttempts
    }
  } catch (error) {
    console.error('خطأ في التحقق من حالة Rate Limit:', error)
    return { isBlocked: false, remainingAttempts: MAX_LOGIN_ATTEMPTS }
  }
}

/**
 * تحديث عداد المحاولات الفاشلة
 */
export const recordFailedAttempt = async (email: string): Promise<void> => {
  try {
    // جلب مستند المستخدم
    const usersQuery = query(
      collection(db, 'users'),
      where('email', '==', email.toLowerCase())
    )
    const userSnap = await getDocs(usersQuery)
    
    if (!userSnap.empty) {
      const userDoc = userSnap.docs[0]
      const failedAttempts = await getRecentFailedAttempts(email)
      
      // إذا تجاوز الحد، حظر الحساب مؤقتاً
      if (failedAttempts + 1 >= MAX_LOGIN_ATTEMPTS) {
        await updateDoc(doc(db, 'users', userDoc.id), {
          'security.failedAttempts': increment(1),
          'security.lastFailedAttempt': serverTimestamp(),
          'security.lockedUntil': Timestamp.fromDate(new Date(Date.now() + LOCKOUT_DURATION))
        })
      } else {
        await updateDoc(doc(db, 'users', userDoc.id), {
          'security.failedAttempts': increment(1),
          'security.lastFailedAttempt': serverTimestamp()
        })
      }
    }
  } catch (error) {
    console.error('خطأ في تسجيل المحاولة الفاشلة:', error)
  }
}

/**
 * إعادة تعيين عداد المحاولات الفاشلة عند الدخول الناجح
 */
export const resetFailedAttempts = async (userId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      'security.failedAttempts': 0,
      'security.lockedUntil': null,
      'security.lastLogin': serverTimestamp()
    })
  } catch (error) {
    console.error('خطأ في إعادة تعيين المحاولات:', error)
  }
}

// ===== إدارة الحسابات =====

/**
 * تفعيل/إيقاف حساب مستخدم
 */
export const toggleAccountStatus = async (
  userId: string, 
  deactivate: boolean,
  adminId: string,
  reason?: string
): Promise<boolean> => {
  try {
    if (deactivate) {
      await updateDoc(doc(db, 'users', userId), {
        'security.isDeactivated': true,
        'security.deactivatedAt': serverTimestamp(),
        'security.deactivatedBy': adminId,
        'security.deactivationReason': reason || 'تم الإيقاف بواسطة المشرف'
      })
    } else {
      await updateDoc(doc(db, 'users', userId), {
        'security.isDeactivated': false,
        'security.deactivatedAt': null,
        'security.deactivatedBy': null,
        'security.deactivationReason': null
      })
    }
    return true
  } catch (error) {
    console.error('خطأ في تغيير حالة الحساب:', error)
    return false
  }
}

/**
 * جلب معلومات الأمان لمستخدم
 */
export const getUserSecurityInfo = async (userId: string): Promise<UserSecurityInfo | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId))
    if (userDoc.exists()) {
      const data = userDoc.data()
      return data.security as UserSecurityInfo || null
    }
    return null
  } catch (error) {
    console.error('خطأ في جلب معلومات الأمان:', error)
    return null
  }
}

/**
 * البحث عن مستخدم بالبريد أو رقم الجوال
 */
export const searchUserByEmailOrPhone = async (searchTerm: string): Promise<any[]> => {
  try {
    const results: any[] = []
    const term = searchTerm.toLowerCase().trim()
    
    // البحث بالبريد الإلكتروني
    const emailQuery = query(
      collection(db, 'users'),
      where('email', '==', term)
    )
    const emailSnap = await getDocs(emailQuery)
    emailSnap.docs.forEach(doc => {
      results.push({ uid: doc.id, ...doc.data() })
    })
    
    // البحث برقم الجوال (إذا لم نجد بالبريد)
    if (results.length === 0) {
      const phoneQuery = query(
        collection(db, 'users'),
        where('phone', '==', term)
      )
      const phoneSnap = await getDocs(phoneQuery)
      phoneSnap.docs.forEach(doc => {
        results.push({ uid: doc.id, ...doc.data() })
      })
    }
    
    return results
  } catch (error) {
    console.error('خطأ في البحث عن المستخدم:', error)
    return []
  }
}

// ===== Audit Log =====

export type AuditAction = 
  | 'login_success' 
  | 'login_failed' 
  | 'logout'
  | 'account_deactivated'
  | 'account_activated'
  | 'password_reset_requested'
  | 'password_reset_completed'
  | 'role_changed'
  | 'settings_updated'

export interface AuditLogEntry {
  id?: string
  action: AuditAction
  performedBy: string
  performedByName?: string
  targetUserId?: string
  targetUserName?: string
  details?: string
  metadata?: Record<string, any>
  ip?: string
  userAgent?: string
  timestamp: Date
}

/**
 * إضافة سجل في Audit Log
 */
export const addAuditLog = async (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> => {
  try {
    await addDoc(collection(db, 'auditLogs'), {
      ...entry,
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('خطأ في إضافة سجل Audit:', error)
  }
}

/**
 * جلب سجلات Audit
 */
export const getAuditLogs = async (
  filters?: { 
    action?: AuditAction
    performedBy?: string
    targetUserId?: string 
  },
  limitCount: number = 50
): Promise<AuditLogEntry[]> => {
  try {
    let auditQuery = query(
      collection(db, 'auditLogs'),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    )
    
    // يمكن إضافة فلاتر إضافية هنا عند الحاجة
    
    const snapshot = await getDocs(auditQuery)
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || new Date(doc.data().createdAt)
    })) as AuditLogEntry[]
  } catch (error) {
    console.error('خطأ في جلب سجلات Audit:', error)
    return []
  }
}
