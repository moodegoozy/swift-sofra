/**
 * خدمة استرداد المبالغ تلقائياً
 * عند إلغاء الطلب، يتم:
 * ✔ استرداد المبلغ من محفظة المطعم
 * ✔ استرداد عمولة المشرف (إذا وجد)
 * ✔ استرداد رسوم المنصة
 * ✔ إرجاع المبلغ للعميل (إذا الدفع بالمحفظة)
 */

import { doc, getDoc, updateDoc, increment, serverTimestamp, arrayUnion } from 'firebase/firestore'
import { db } from '@/firebase'

// نوع بيانات الطلب المطلوبة للاسترداد
interface OrderRefundData {
  id: string
  customerId: string
  restaurantId: string
  subtotal: number
  total: number
  restaurantEarnings?: number
  platformFee?: number
  adminCommission?: number
  appEarnings?: number
  referredBy?: string
  paymentMethod?: 'cod' | 'paypal' | 'wallet'
  paymentStatus?: string
}

// نتيجة عملية الاسترداد
interface RefundResult {
  success: boolean
  refundedAmount: number
  details: {
    restaurantRefunded: number
    adminRefunded: number
    appRefunded: number
    customerRefunded: number
  }
  error?: string
}

/**
 * استرداد المبالغ تلقائياً عند إلغاء الطلب
 */
export async function processOrderRefund(order: OrderRefundData): Promise<RefundResult> {
  const result: RefundResult = {
    success: false,
    refundedAmount: 0,
    details: {
      restaurantRefunded: 0,
      adminRefunded: 0,
      appRefunded: 0,
      customerRefunded: 0
    }
  }

  try {
    const {
      customerId,
      restaurantId,
      restaurantEarnings = 0,
      adminCommission = 0,
      appEarnings = 0,
      referredBy,
      paymentMethod,
      total
    } = order

    // 1️⃣ استرداد المبلغ من محفظة المطعم
    if (restaurantEarnings > 0 && restaurantId) {
      try {
        const restaurantWalletRef = doc(db, 'wallets', restaurantId)
        const walletSnap = await getDoc(restaurantWalletRef)
        
        if (walletSnap.exists()) {
          const currentBalance = walletSnap.data()?.balance || 0
          const refundAmount = Math.min(restaurantEarnings, currentBalance) // لا نسحب أكثر من الرصيد
          
          if (refundAmount > 0) {
            await updateDoc(restaurantWalletRef, {
              balance: increment(-refundAmount),
              totalRefunded: increment(refundAmount),
              updatedAt: serverTimestamp(),
              transactions: arrayUnion({
                id: `refund_${order.id}_${Date.now()}`,
                type: 'refund',
                amount: -refundAmount,
                description: `استرداد طلب #${order.id.slice(-6)} (إلغاء)`,
                orderId: order.id,
                createdAt: new Date()
              })
            })
            result.details.restaurantRefunded = refundAmount
          }
        }
      } catch (err) {
        console.warn('⚠️ فشل استرداد المبلغ من محفظة المطعم:', err)
      }
    }

    // 2️⃣ استرداد عمولة المشرف (إذا وجد)
    if (adminCommission > 0 && referredBy) {
      try {
        const adminWalletRef = doc(db, 'wallets', referredBy)
        const walletSnap = await getDoc(adminWalletRef)
        
        if (walletSnap.exists()) {
          const currentBalance = walletSnap.data()?.balance || 0
          const refundAmount = Math.min(adminCommission, currentBalance)
          
          if (refundAmount > 0) {
            await updateDoc(adminWalletRef, {
              balance: increment(-refundAmount),
              totalRefunded: increment(refundAmount),
              updatedAt: serverTimestamp(),
              transactions: arrayUnion({
                id: `refund_${order.id}_${Date.now()}`,
                type: 'refund',
                amount: -refundAmount,
                description: `استرداد عمولة طلب #${order.id.slice(-6)} (إلغاء)`,
                orderId: order.id,
                createdAt: new Date()
              })
            })
            result.details.adminRefunded = refundAmount
          }
        }
      } catch (err) {
        console.warn('⚠️ فشل استرداد عمولة المشرف:', err)
      }
    }

    // 3️⃣ استرداد رسوم المنصة
    if (appEarnings > 0) {
      try {
        const appWalletRef = doc(db, 'wallets', 'app_earnings')
        const walletSnap = await getDoc(appWalletRef)
        
        if (walletSnap.exists()) {
          const currentBalance = walletSnap.data()?.balance || 0
          const refundAmount = Math.min(appEarnings, currentBalance)
          
          if (refundAmount > 0) {
            await updateDoc(appWalletRef, {
              balance: increment(-refundAmount),
              totalRefunded: increment(refundAmount),
              updatedAt: serverTimestamp(),
              transactions: arrayUnion({
                id: `refund_${order.id}_${Date.now()}`,
                type: 'refund',
                amount: -refundAmount,
                description: `استرداد رسوم طلب #${order.id.slice(-6)} (إلغاء)`,
                orderId: order.id,
                createdAt: new Date()
              })
            })
            result.details.appRefunded = refundAmount
          }
        }
      } catch (err) {
        console.warn('⚠️ فشل استرداد رسوم المنصة:', err)
      }
    }

    // 4️⃣ إرجاع المبلغ للعميل (إذا الدفع بالمحفظة)
    if (paymentMethod === 'wallet' && total > 0 && customerId) {
      try {
        const customerWalletRef = doc(db, 'wallets', customerId)
        const walletSnap = await getDoc(customerWalletRef)
        
        if (walletSnap.exists()) {
          await updateDoc(customerWalletRef, {
            balance: increment(total),
            totalRefunded: increment(total),
            updatedAt: serverTimestamp(),
            transactions: arrayUnion({
              id: `refund_${order.id}_${Date.now()}`,
              type: 'credit',
              amount: total,
              description: `استرداد طلب #${order.id.slice(-6)} (إلغاء)`,
              orderId: order.id,
              createdAt: new Date()
            })
          })
          result.details.customerRefunded = total
        }
      } catch (err) {
        console.warn('⚠️ فشل إرجاع المبلغ للعميل:', err)
      }
    }

    // حساب إجمالي المسترد
    result.refundedAmount = 
      result.details.restaurantRefunded + 
      result.details.adminRefunded + 
      result.details.appRefunded

    result.success = true
    console.log('✅ تم استرداد المبالغ بنجاح:', result)

  } catch (error) {
    console.error('❌ فشل عملية الاسترداد:', error)
    result.error = String(error)
  }

  return result
}

/**
 * إشعار الأطراف بالإلغاء والاسترداد
 */
export async function notifyRefundParties(
  order: OrderRefundData,
  refundResult: RefundResult,
  cancelledBy: 'customer' | 'owner' | 'admin' | 'system'
): Promise<void> {
  try {
    const { sendSmartNotification } = await import('./notificationService')
    
    // إشعار العميل
    if (order.customerId) {
      let message = 'تم إلغاء طلبك'
      if (refundResult.details.customerRefunded > 0) {
        message += ` وتم استرداد ${refundResult.details.customerRefunded.toFixed(2)} ر.س لمحفظتك`
      }
      
      await sendSmartNotification({
        type: 'order_delivered', // نستخدم نوع موجود
        recipientId: order.customerId,
        recipientType: 'customer',
        title: 'تم إلغاء الطلب ❌',
        message,
        orderId: order.id,
        actionType: 'order',
        actionUrl: '/orders',
        priority: 'high'
      })
    }

    // إشعار صاحب المطعم
    if (order.restaurantId && cancelledBy !== 'owner') {
      await sendSmartNotification({
        type: 'order_delivered',
        recipientId: order.restaurantId,
        recipientType: 'owner',
        title: 'تم إلغاء طلب ❌',
        message: `تم إلغاء الطلب #${order.id.slice(-6)} واسترداد ${refundResult.details.restaurantRefunded.toFixed(2)} ر.س`,
        orderId: order.id,
        actionType: 'order',
        actionUrl: '/owner/orders',
        priority: 'high'
      })
    }

  } catch (error) {
    console.warn('⚠️ فشل إرسال إشعارات الاسترداد:', error)
  }
}
