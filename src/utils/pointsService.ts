// src/utils/pointsService.ts
// خدمة إدارة نظام النقاط للأسر والمندوبين
import { doc, getDoc, updateDoc, serverTimestamp, arrayUnion } from 'firebase/firestore'
import { db } from '@/firebase'
import { POINTS_CONFIG, PointsHistoryItem } from '@/types'

/**
 * الحصول على نقاط مستخدم (أسرة أو مندوب)
 */
export async function getUserPoints(
  userId: string, 
  userType: 'restaurant' | 'courier'
): Promise<number> {
  const collection = userType === 'restaurant' ? 'restaurants' : 'couriers'
  const docRef = doc(db, collection, userId)
  const snap = await getDoc(docRef)
  
  if (!snap.exists()) return POINTS_CONFIG.STARTING_POINTS
  
  const data = snap.data()
  return data.points?.currentPoints ?? POINTS_CONFIG.STARTING_POINTS
}

/**
 * التحقق إذا كان المستخدم موقوفاً
 */
export async function isUserSuspended(
  userId: string, 
  userType: 'restaurant' | 'courier'
): Promise<boolean> {
  const collection = userType === 'restaurant' ? 'restaurants' : 'couriers'
  const docRef = doc(db, collection, userId)
  const snap = await getDoc(docRef)
  
  if (!snap.exists()) return false
  
  const data = snap.data()
  return data.points?.isSuspended === true
}

/**
 * خصم نقاط من مستخدم
 */
export async function deductPoints(
  userId: string,
  userType: 'restaurant' | 'courier',
  amount: number,
  reason: string,
  options?: {
    orderId?: string
    ticketId?: string
    adminId?: string
  }
): Promise<{
  success: boolean
  newPoints: number
  isSuspended: boolean
  isWarning: boolean
  message: string
}> {
  const collection = userType === 'restaurant' ? 'restaurants' : 'couriers'
  const docRef = doc(db, collection, userId)
  const snap = await getDoc(docRef)
  
  if (!snap.exists()) {
    return {
      success: false,
      newPoints: 0,
      isSuspended: false,
      isWarning: false,
      message: 'المستخدم غير موجود'
    }
  }
  
  const data = snap.data()
  const currentPoints = data.points?.currentPoints ?? POINTS_CONFIG.STARTING_POINTS
  const totalDeductions = data.points?.totalDeductions ?? 0
  const warningCount = data.points?.warningCount ?? 0
  const pointsHistory = data.points?.pointsHistory ?? []
  
  // حساب النقاط الجديدة
  const newPoints = Math.max(0, currentPoints - amount)
  
  // إنشاء سجل الخصم
  const historyItem: PointsHistoryItem = {
    id: `deduct_${Date.now()}`,
    type: 'deduction',
    amount: -amount,
    reason,
    orderId: options?.orderId,
    ticketId: options?.ticketId,
    adminId: options?.adminId,
    createdAt: new Date()
  }
  
  // التحقق من الإيقاف
  const shouldSuspend = newPoints < POINTS_CONFIG.SUSPENSION_THRESHOLD
  
  // التحقق من التنبيه
  const shouldWarn = !shouldSuspend && newPoints < POINTS_CONFIG.WARNING_THRESHOLD
  
  // تحديث البيانات
  const updates: any = {
    'points.currentPoints': newPoints,
    'points.totalDeductions': totalDeductions + amount,
    'points.pointsHistory': [...pointsHistory, historyItem],
    updatedAt: serverTimestamp()
  }
  
  if (shouldSuspend) {
    updates['points.isSuspended'] = true
    updates['points.suspendedAt'] = serverTimestamp()
    updates['points.suspendedReason'] = `إيقاف تلقائي - النقاط أقل من ${POINTS_CONFIG.SUSPENSION_THRESHOLD}`
    updates['isOpen'] = false // إغلاق المتجر
    updates['isAvailable'] = false // للمندوب
  }
  
  if (shouldWarn) {
    updates['points.warningCount'] = warningCount + 1
    updates['points.lastWarningAt'] = serverTimestamp()
  }
  
  await updateDoc(docRef, updates)
  
  let message = `تم خصم ${amount} نقطة. النقاط الحالية: ${newPoints}`
  if (shouldSuspend) {
    message = `⛔ تم إيقاف الحساب تلقائياً! النقاط وصلت إلى ${newPoints}`
  } else if (shouldWarn) {
    message = `⚠️ تنبيه! النقاط منخفضة: ${newPoints}. قد يتم الإيقاف عند ${POINTS_CONFIG.SUSPENSION_THRESHOLD}`
  }
  
  return {
    success: true,
    newPoints,
    isSuspended: shouldSuspend,
    isWarning: shouldWarn,
    message
  }
}

/**
 * إضافة نقاط مكافأة
 */
export async function addBonusPoints(
  userId: string,
  userType: 'restaurant' | 'courier',
  amount: number,
  reason: string,
  adminId?: string
): Promise<{ success: boolean; newPoints: number; message: string }> {
  const collection = userType === 'restaurant' ? 'restaurants' : 'couriers'
  const docRef = doc(db, collection, userId)
  const snap = await getDoc(docRef)
  
  if (!snap.exists()) {
    return { success: false, newPoints: 0, message: 'المستخدم غير موجود' }
  }
  
  const data = snap.data()
  const currentPoints = data.points?.currentPoints ?? POINTS_CONFIG.STARTING_POINTS
  const pointsHistory = data.points?.pointsHistory ?? []
  
  const newPoints = Math.min(100, currentPoints + amount) // الحد الأقصى 100
  
  const historyItem: PointsHistoryItem = {
    id: `bonus_${Date.now()}`,
    type: 'bonus',
    amount: amount,
    reason,
    adminId,
    createdAt: new Date()
  }
  
  await updateDoc(docRef, {
    'points.currentPoints': newPoints,
    'points.pointsHistory': [...pointsHistory, historyItem],
    updatedAt: serverTimestamp()
  })
  
  return {
    success: true,
    newPoints,
    message: `تم إضافة ${amount} نقطة. النقاط الحالية: ${newPoints}`
  }
}

/**
 * إعادة تعيين النقاط (بعد المراجعة)
 */
export async function resetPoints(
  userId: string,
  userType: 'restaurant' | 'courier',
  reason: string,
  adminId: string
): Promise<{ success: boolean; message: string }> {
  const collection = userType === 'restaurant' ? 'restaurants' : 'couriers'
  const docRef = doc(db, collection, userId)
  const snap = await getDoc(docRef)
  
  if (!snap.exists()) {
    return { success: false, message: 'المستخدم غير موجود' }
  }
  
  const data = snap.data()
  const pointsHistory = data.points?.pointsHistory ?? []
  
  const historyItem: PointsHistoryItem = {
    id: `reset_${Date.now()}`,
    type: 'reset',
    amount: POINTS_CONFIG.STARTING_POINTS,
    reason,
    adminId,
    createdAt: new Date()
  }
  
  await updateDoc(docRef, {
    'points.currentPoints': POINTS_CONFIG.STARTING_POINTS,
    'points.isSuspended': false,
    'points.suspendedAt': null,
    'points.suspendedReason': null,
    'points.warningCount': 0,
    'points.pointsHistory': [...pointsHistory, historyItem],
    'isOpen': true, // إعادة فتح المتجر
    'isAvailable': true, // للمندوب
    updatedAt: serverTimestamp()
  })
  
  return {
    success: true,
    message: `تم إعادة تعيين النقاط إلى ${POINTS_CONFIG.STARTING_POINTS}`
  }
}

/**
 * الحصول على سجل النقاط
 */
export async function getPointsHistory(
  userId: string,
  userType: 'restaurant' | 'courier'
): Promise<PointsHistoryItem[]> {
  const collection = userType === 'restaurant' ? 'restaurants' : 'couriers'
  const docRef = doc(db, collection, userId)
  const snap = await getDoc(docRef)
  
  if (!snap.exists()) return []
  
  const data = snap.data()
  return data.points?.pointsHistory ?? []
}

/**
 * تهيئة نظام النقاط لمستخدم جديد
 */
export async function initializePoints(
  userId: string,
  userType: 'restaurant' | 'courier'
): Promise<void> {
  const collection = userType === 'restaurant' ? 'restaurants' : 'couriers'
  const docRef = doc(db, collection, userId)
  
  await updateDoc(docRef, {
    points: {
      currentPoints: POINTS_CONFIG.STARTING_POINTS,
      totalDeductions: 0,
      isSuspended: false,
      warningCount: 0,
      pointsHistory: []
    }
  })
}
