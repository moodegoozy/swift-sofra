/**
 * خدمة الإشعارات الذكية
 * إشعارات فورية لجميع المستخدمين:
 * ✔ طلب جديد (للأسرة)
 * ✔ تم قبول الطلب (للعميل)
 * ✔ طلب جاهز (للعميل والمندوب)
 * ✔ مندوب في الطريق (للعميل)
 * ✔ تم التسليم (للعميل)
 * ✔ إشعار للإدارة عند كل طلب ناجح
 */

import { addDoc, collection, serverTimestamp, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import { showPushNotification } from './pushNotifications'

// معرف المطور للإشعارات (يتلقى كل الإشعارات المهمة)
const DEVELOPER_UID = 'DEVELOPER_UID' // سيتم استبداله بالـ UID الفعلي

// أنواع الإشعارات
export type SmartNotificationType = 
  | 'order_new'          // طلب جديد (للأسرة)
  | 'order_ready'        // طلبك جاهز للاستلام
  | 'order_delivered'    // تم توصيل طلبك
  | 'order_accepted'     // تم قبول طلبك
  | 'order_preparing'    // جاري تجهيز طلبك
  | 'nearby_offer'       // عرض قريب منك
  | 'discount'           // خصم على مطعم/صنف
  | 'new_menu_item'      // صنف جديد من مطعم متابَع
  | 'courier_assigned'   // تم تعيين مندوب لطلبك
  | 'admin_new_order'    // إشعار للإدارة: طلب جديد ناجح

// إعدادات الإشعارات - كل الإشعارات مفعّلة
export const NOTIFICATION_SETTINGS = {
  // إشعارات الطلبات (مهمة - ترسل دائماً)
  ORDER_NOTIFICATIONS: {
    new_order: true,      // طلب جديد للأسرة
    accepted: true,       // تم القبول
    preparing: true,      // جاري التجهيز
    ready: true,         // جاهز
    courier_assigned: true, // مندوب في الطريق
    delivered: true,     // تم التسليم
  },
  // إشعارات الإدارة (إلزامية)
  ADMIN_NOTIFICATIONS: {
    new_successful_order: true, // كل طلب ناجح
  },
  // إشعارات العروض
  OFFER_NOTIFICATIONS: {
    nearby_radius_km: 10,
    discount_threshold: 10,
  },
  // لا يوجد أوقات عدم إزعاج - الإشعارات تعمل 24/7
  QUIET_HOURS: {
    enabled: false,
  }
}

// بيانات الإشعار
interface NotificationData {
  type: SmartNotificationType
  recipientId: string
  recipientType: 'customer' | 'owner' | 'courier' | 'admin'
  title: string
  message: string
  // بيانات إضافية حسب النوع
  orderId?: string
  orderNumber?: string
  restaurantId?: string
  restaurantName?: string
  menuItemId?: string
  menuItemName?: string
  discountPercent?: number
  // رابط للانتقال عند الضغط
  actionUrl?: string
  actionType?: 'order' | 'restaurant' | 'menu_item'
  // أولوية الإشعار
  priority?: 'high' | 'normal' | 'low'
}

/**
 * إرسال إشعار ذكي
 * يحفظ في Firestore + يرسل Push Notification فوري
 */
export async function sendSmartNotification(data: NotificationData): Promise<string | null> {
  try {
    // حفظ الإشعار في قاعدة البيانات
    const notification = {
      ...data,
      read: false,
      createdAt: serverTimestamp(),
    }

    const docRef = await addDoc(collection(db, 'notifications'), notification)
    console.log('🔔 تم حفظ إشعار:', data.type, '→', data.recipientId)

    // إرسال Push Notification فوري
    try {
      await showPushNotification(data.title, data.message, {
        icon: '/icon-192.png',
        tag: data.type + '-' + (data.orderId || Date.now()),
        url: data.actionUrl || '/'
      })
      console.log('📱 تم إرسال Push Notification')
    } catch (pushError) {
      console.warn('⚠️ Push Notification غير متاح:', pushError)
    }

    return docRef.id
  } catch (error) {
    console.error('❌ فشل إرسال الإشعار:', error)
    return null
  }
}

// ═══════════════════════════════════════════════════════════
// إشعارات الطلبات
// ═══════════════════════════════════════════════════════════

/**
 * إشعار: تم قبول طلبك ✅
 */
export async function notifyOrderAccepted(
  customerId: string,
  orderId: string,
  restaurantName: string
): Promise<void> {
  await sendSmartNotification({
    type: 'order_accepted',
    recipientId: customerId,
    recipientType: 'customer',
    title: 'تم قبول طلبك ✅',
    message: `${restaurantName} بدأت بتجهيز طلبك`,
    orderId,
    restaurantName,
    actionType: 'order',
    actionUrl: `/track-orders`,
    priority: 'high',
  })
}

/**
 * إشعار: طلبك جاهز 🎉
 */
export async function notifyOrderReady(
  customerId: string,
  orderId: string,
  restaurantName: string,
  deliveryType: 'delivery' | 'pickup'
): Promise<void> {
  const message = deliveryType === 'pickup'
    ? `طلبك من ${restaurantName} جاهز للاستلام! تعال استلمه 🏃`
    : `طلبك من ${restaurantName} جاهز، المندوب في الطريق إليك 🚗`

  await sendSmartNotification({
    type: 'order_ready',
    recipientId: customerId,
    recipientType: 'customer',
    title: 'طلبك جاهز! 🎉',
    message,
    orderId,
    restaurantName,
    actionType: 'order',
    actionUrl: `/track-orders`,
    priority: 'high',
  })
}

/**
 * إشعار: تم تعيين مندوب 🚗
 */
export async function notifyCourierAssigned(
  customerId: string,
  orderId: string,
  courierName: string
): Promise<void> {
  await sendSmartNotification({
    type: 'courier_assigned',
    recipientId: customerId,
    recipientType: 'customer',
    title: 'مندوب في الطريق 🚗',
    message: `${courierName} استلم طلبك وفي الطريق إليك`,
    orderId,
    actionType: 'order',
    actionUrl: `/track-orders`,
    priority: 'normal',
  })
}

/**
 * إشعار: تم توصيل طلبك 📦
 */
export async function notifyOrderDelivered(
  customerId: string,
  orderId: string,
  restaurantName: string
): Promise<void> {
  await sendSmartNotification({
    type: 'order_delivered',
    recipientId: customerId,
    recipientType: 'customer',
    title: 'وصل طلبك! 📦',
    message: `تم توصيل طلبك من ${restaurantName}. بالعافية! 🍽️`,
    orderId,
    restaurantName,
    actionType: 'order',
    actionUrl: `/track-orders`,
    priority: 'normal',
  })
}

// ═══════════════════════════════════════════════════════════
// إشعارات العروض والخصومات
// ═══════════════════════════════════════════════════════════

/**
 * إشعار: خصم على مطعم 🏷️
 */
export async function notifyDiscount(
  customerId: string,
  restaurantId: string,
  restaurantName: string,
  discountPercent: number,
  menuItemName?: string
): Promise<void> {
  // لا نرسل إذا الخصم أقل من الحد الأدنى
  if (discountPercent < NOTIFICATION_SETTINGS.OFFER_NOTIFICATIONS.discount_threshold) {
    return
  }

  const title = menuItemName
    ? `خصم ${discountPercent}% على ${menuItemName}! 🏷️`
    : `خصم ${discountPercent}% في ${restaurantName}! 🏷️`

  const message = menuItemName
    ? `${restaurantName} عاملين خصم على ${menuItemName}`
    : `لا تفوت العرض! خصومات حصرية في ${restaurantName}`

  await sendSmartNotification({
    type: 'discount',
    recipientId: customerId,
    recipientType: 'customer',
    title,
    message,
    restaurantId,
    restaurantName,
    menuItemName,
    discountPercent,
    actionType: 'restaurant',
    actionUrl: `/menu?restaurant=${restaurantId}`,
    priority: 'normal',
  })
}

/**
 * إشعار: عرض قريب منك 📍
 */
export async function notifyNearbyOffer(
  customerId: string,
  restaurantId: string,
  restaurantName: string,
  offerDescription: string,
  distanceKm: number
): Promise<void> {
  await sendSmartNotification({
    type: 'nearby_offer',
    recipientId: customerId,
    recipientType: 'customer',
    title: `عرض على بعد ${distanceKm.toFixed(1)} كم 📍`,
    message: `${restaurantName}: ${offerDescription}`,
    restaurantId,
    restaurantName,
    actionType: 'restaurant',
    actionUrl: `/menu?restaurant=${restaurantId}`,
    priority: 'low',
  })
}

/**
 * إشعار: صنف جديد من مطعم متابَع 🆕
 */
export async function notifyNewMenuItem(
  customerId: string,
  restaurantId: string,
  restaurantName: string,
  menuItemId: string,
  menuItemName: string
): Promise<void> {
  await sendSmartNotification({
    type: 'new_menu_item',
    recipientId: customerId,
    recipientType: 'customer',
    title: `جديد من ${restaurantName}! 🆕`,
    message: `جربوا ${menuItemName} الجديد`,
    restaurantId,
    restaurantName,
    menuItemId,
    menuItemName,
    actionType: 'menu_item',
    actionUrl: `/menu?restaurant=${restaurantId}`,
    priority: 'low',
  })
}

// ═══════════════════════════════════════════════════════════
// إشعارات للأسر المنتجة
// ═══════════════════════════════════════════════════════════

/**
 * إشعار للأسرة: طلب جديد 🛎️
 */
export async function notifyOwnerNewOrder(
  ownerId: string,
  orderId: string,
  customerName: string,
  totalAmount: number
): Promise<void> {
  await sendSmartNotification({
    type: 'order_accepted', // نستخدم نفس النوع للتبسيط
    recipientId: ownerId,
    recipientType: 'owner',
    title: 'طلب جديد! 🛎️',
    message: `${customerName} طلب بقيمة ${totalAmount.toFixed(2)} ر.س`,
    orderId,
    actionType: 'order',
    actionUrl: `/orders`,
    priority: 'high',
  })
}

// ═══════════════════════════════════════════════════════════
// إشعارات للمناديب
// ═══════════════════════════════════════════════════════════

/**
 * إشعار للمندوب: طلب جاهز للتوصيل 📦
 */
export async function notifyCourierOrderReady(
  courierId: string,
  orderId: string,
  restaurantName: string,
  customerAddress: string
): Promise<void> {
  await sendSmartNotification({
    type: 'order_ready',
    recipientId: courierId,
    recipientType: 'courier',
    title: 'طلب جاهز للتوصيل 📦',
    message: `من ${restaurantName} إلى ${customerAddress}`,
    orderId,
    restaurantName,
    actionType: 'order',
    actionUrl: `/courier`,
    priority: 'high',
  })
}

// ═══════════════════════════════════════════════════════════
// إشعارات الخصومات للعملاء السابقين
// ═══════════════════════════════════════════════════════════

/**
 * إشعار العملاء السابقين بخصم جديد
 * يُرسل فقط للعملاء الذين طلبوا من هذا المطعم سابقاً
 */
export async function notifyPreviousCustomersAboutDiscount(
  restaurantId: string,
  restaurantName: string,
  menuItemName: string,
  discountPercent: number
): Promise<number> {
  // لا نرسل إذا الخصم أقل من الحد الأدنى
  if (discountPercent < NOTIFICATION_SETTINGS.OFFER_NOTIFICATIONS.discount_threshold) {
    console.log('⏭️ الخصم أقل من الحد الأدنى، لن يتم إرسال إشعارات')
    return 0
  }

  try {
    // جلب العملاء الذين طلبوا من هذا المطعم (آخر 100 طلب)
    const ordersQuery = query(
      collection(db, 'orders'),
      where('restaurantId', '==', restaurantId),
      where('status', '==', 'delivered')
    )
    
    const ordersSnap = await getDocs(ordersQuery)
    
    // استخراج العملاء الفريدين
    const customerIds = new Set<string>()
    ordersSnap.docs.forEach(doc => {
      const data = doc.data()
      if (data.customerId) {
        customerIds.add(data.customerId)
      }
    })

    // إرسال إشعار لكل عميل (حد أقصى 50 عميل لتجنب الإغراق)
    const customersToNotify = Array.from(customerIds).slice(0, 50)
    
    for (const customerId of customersToNotify) {
      await notifyDiscount(customerId, restaurantId, restaurantName, discountPercent, menuItemName)
    }

    console.log(`🔔 تم إرسال ${customersToNotify.length} إشعار خصم للعملاء السابقين`)
    return customersToNotify.length
  } catch (error) {
    console.error('❌ فشل إرسال إشعارات الخصم:', error)
    return 0
  }
}

// ═══════════════════════════════════════════════════════════
// إشعارات للإدارة والمطور
// ═══════════════════════════════════════════════════════════

/**
 * إشعار للإدارة/المطور: طلب ناجح جديد 💰
 * يُرسل عند كل طلب يتم توصيله بنجاح
 */
export async function notifyAdminSuccessfulOrder(
  orderId: string,
  restaurantName: string,
  customerName: string,
  totalAmount: number,
  platformFee: number
): Promise<void> {
  // جلب جميع المطورين والمشرفين
  try {
    const usersQuery = query(
      collection(db, 'users'),
      where('role', 'in', ['developer', 'admin'])
    )
    const usersSnap = await getDocs(usersQuery)
    
    for (const userDoc of usersSnap.docs) {
      await sendSmartNotification({
        type: 'admin_new_order',
        recipientId: userDoc.id,
        recipientType: 'admin',
        title: '💰 طلب ناجح!',
        message: `${restaurantName} → ${customerName} | ${totalAmount.toFixed(2)} ر.س (رسوم: ${platformFee.toFixed(2)})`,
        orderId,
        restaurantName,
        actionType: 'order',
        actionUrl: `/admin/orders`,
        priority: 'normal',
      })
    }
    console.log('📊 تم إرسال إشعار للإدارة عن الطلب الناجح')
  } catch (error) {
    console.error('❌ فشل إرسال إشعار الإدارة:', error)
  }
}

/**
 * إشعار للعميل: جاري تجهيز طلبك 👨‍🍳
 */
export async function notifyOrderPreparing(
  customerId: string,
  orderId: string,
  restaurantName: string
): Promise<void> {
  await sendSmartNotification({
    type: 'order_preparing',
    recipientId: customerId,
    recipientType: 'customer',
    title: 'جاري تجهيز طلبك 👨‍🍳',
    message: `${restaurantName} بدأت بتجهيز طلبك`,
    orderId,
    restaurantName,
    actionType: 'order',
    actionUrl: `/orders`,
    priority: 'normal',
  })
}

/**
 * إشعار للعميل: تم إنشاء طلبك ✅
 */
export async function notifyOrderCreated(
  customerId: string,
  orderId: string,
  restaurantName: string,
  totalAmount: number
): Promise<void> {
  await sendSmartNotification({
    type: 'order_new',
    recipientId: customerId,
    recipientType: 'customer',
    title: 'تم استلام طلبك ✅',
    message: `طلبك من ${restaurantName} بقيمة ${totalAmount.toFixed(2)} ر.س في انتظار القبول`,
    orderId,
    restaurantName,
    actionType: 'order',
    actionUrl: `/orders`,
    priority: 'high',
  })
}

/**
 * 🔔 إشعار للمطعم: طلب جديد 📦
 * يُرسل عند إنشاء طلب جديد من عميل
 */
export async function notifyRestaurantNewOrder(
  restaurantId: string,
  orderId: string,
  customerName: string,
  totalAmount: number,
  itemsCount: number
): Promise<void> {
  await sendSmartNotification({
    type: 'order_new',
    recipientId: restaurantId,
    recipientType: 'owner',
    title: '🔔 طلب جديد!',
    message: `${customerName} طلب ${itemsCount} منتج بقيمة ${totalAmount.toFixed(2)} ر.س`,
    orderId,
    actionType: 'order',
    actionUrl: `/restaurant/orders`,
    priority: 'high',
  })
}

/**
 * 💬 إشعار: رسالة جديدة في المحادثة
 */
export async function notifyNewMessage(
  recipientId: string,
  recipientType: 'customer' | 'owner' | 'courier',
  senderName: string,
  orderId: string,
  messagePreview: string
): Promise<void> {
  await sendSmartNotification({
    type: 'order_new', // نستخدم نفس النوع للرسائل
    recipientId,
    recipientType,
    title: `💬 رسالة من ${senderName}`,
    message: messagePreview.length > 50 ? messagePreview.substring(0, 50) + '...' : messagePreview,
    orderId,
    actionType: 'order',
    actionUrl: `/chat?orderId=${orderId}`,
    priority: 'high',
  })
}
