/**
 * Type definitions for the Broast Al-Qaryah application
 * Centralized types to avoid redundant definitions and ensure consistency
 */

/**
 * Support Ticket - تذكرة دعم فني أو شكوى
 */
export interface SupportTicket {
  id: string;
  ticketNumber: string; // رقم التذكرة (مثل: TKT-2024-001)
  type: 'complaint' | 'support' | 'suggestion' | 'refund'; // نوع التذكرة
  subject: string; // عنوان الشكوى
  description: string; // وصف المشكلة
  // بيانات صاحب التذكرة
  userId: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  userRole: 'customer' | 'owner' | 'courier' | 'admin';
  // بيانات الطلب المرتبط (إن وجد)
  orderId?: string;
  orderNumber?: string;
  // بيانات الأسرة المشتكى عليها (إن وجد)
  againstRestaurantId?: string;
  againstRestaurantName?: string;
  // بيانات المندوب المشتكى عليه (إن وجد)
  againstCourierId?: string;
  againstCourierName?: string;
  // حالة التذكرة
  status: TicketStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  // المرفقات (صور الإثبات)
  attachments?: string[];
  // الرد والحل
  adminResponse?: string;
  adminId?: string;
  adminName?: string;
  resolution?: string; // كيف تم حل المشكلة
  // التواريخ
  createdAt?: Date;
  updatedAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
}

/**
 * حالات تذكرة الدعم
 */
export type TicketStatus = 
  | 'open'              // جديدة
  | 'in_progress'       // قيد المعالجة
  | 'waiting_customer'  // بانتظار رد العميل
  | 'waiting_restaurant'// بانتظار رد الأسرة
  | 'resolved'          // تم الحل
  | 'closed';           // مغلقة

/**
 * نظام النقاط - للأسر والمندوبين
 * كل مستخدم يبدأ بـ 100 نقطة
 * الشكوى المؤكدة = خصم نقاط
 * أقل من 30 نقطة = إيقاف تلقائي
 */
export interface PointsSystem {
  currentPoints: number; // النقاط الحالية (تبدأ من 100)
  totalDeductions: number; // إجمالي النقاط المخصومة
  suspendedAt?: Date; // تاريخ الإيقاف (إن وجد)
  suspendedReason?: string; // سبب الإيقاف
  isSuspended: boolean; // هل الحساب موقوف؟
  warningCount: number; // عدد التنبيهات
  lastWarningAt?: Date; // تاريخ آخر تنبيه
  pointsHistory: PointsHistoryItem[]; // سجل النقاط
}

/**
 * سجل تاريخ النقاط
 */
export interface PointsHistoryItem {
  id: string;
  type: 'deduction' | 'bonus' | 'reset'; // نوع العملية
  amount: number; // عدد النقاط (سالب للخصم، موجب للمكافأة)
  reason: string; // سبب الخصم/المكافأة
  orderId?: string; // رقم الطلب المرتبط
  ticketId?: string; // رقم التذكرة المرتبطة
  adminId?: string; // المسؤول الذي أجرى العملية
  createdAt: Date;
}

/**
 * إعدادات نظام النقاط
 */
export const POINTS_CONFIG = {
  STARTING_POINTS: 100, // نقاط البداية
  SUSPENSION_THRESHOLD: 30, // الحد الأدنى للإيقاف
  WARNING_THRESHOLD: 50, // حد التنبيه
  // خصومات الشكاوى حسب النوع
  DEDUCTIONS: {
    FOOD_QUALITY: 15, // جودة الطعام
    LATE_DELIVERY: 10, // تأخير التسليم
    BAD_SERVICE: 10, // سوء الخدمة
    WRONG_ORDER: 12, // طلب خاطئ
    PACKAGING: 8, // سوء التغليف
    HYGIENE: 20, // نظافة
    NO_SHOW: 15, // عدم الحضور (للمندوب)
    RUDE_BEHAVIOR: 15, // سوء التعامل
    LOW_RATING: 5, // تقييم منخفض متكرر
  },
  // مكافآت
  BONUSES: {
    MONTHLY_EXCELLENT: 10, // أداء ممتاز شهري
    NO_COMPLAINTS_WEEK: 5, // أسبوع بدون شكاوى
  }
};

/**
 * إعدادات عداد الوقت للطلبات (بالدقائق)
 * تجاوز الوقت = تنبيه تلقائي
 */
export const ORDER_TIME_LIMITS = {
  // وقت تجهيز الأسرة (من القبول حتى الجاهزية)
  PREPARATION_TIME: 30, // 30 دقيقة
  // وقت استلام المندوب (من الجاهزية حتى الاستلام)
  COURIER_PICKUP_TIME: 15, // 15 دقيقة
  // وقت التوصيل (من الاستلام حتى التسليم)
  DELIVERY_TIME: 30, // 30 دقيقة
  // ألوان التحذير
  WARNING_THRESHOLD: 0.75, // تحذير عند 75% من الوقت
};

/**
 * حالة عداد الوقت
 */
export type TimerStatus = 'normal' | 'warning' | 'exceeded';

/**
 * أوقات الطلب - timestamps لكل مرحلة
 */
export interface OrderTimestamps {
  acceptedAt?: Date; // وقت قبول الطلب (بداية التجهيز)
  readyAt?: Date; // وقت جهوزية الطلب (بداية انتظار المندوب)
  pickedUpAt?: Date; // وقت استلام المندوب (بداية التوصيل)
  deliveredAt?: Date; // وقت التسليم (النهاية)
}

/**
 * تنبيهات تجاوز الوقت
 */
export interface TimeAlert {
  id: string;
  orderId: string;
  orderNumber?: string;
  type: 'preparation' | 'pickup' | 'delivery';
  exceededBy: number; // كم دقيقة تجاوز
  targetId: string; // UID الأسرة أو المندوب
  targetType: 'restaurant' | 'courier';
  createdAt?: Date;
  acknowledged?: boolean; // هل تم التنبيه؟
}

/**
 * TicketMessage - رسالة في تذكرة الدعم
 */
export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName?: string;
  senderRole: 'user' | 'admin' | 'system';
  message: string;
  attachments?: string[];
  createdAt?: Date;
}

/**
 * Menu Item - Product sold by a restaurant
 */
export interface MenuItem {
  id: string;
  name: string;
  desc?: string;
  description?: string; // وصف الصنف
  price: number;
  imageUrl?: string;
  available: boolean;
  categoryId?: string;
  category?: string; // اسم التصنيف
  ownerId: string; // Links to restaurants/{ownerId}
  // نظام الخصومات
  discountPercent?: number; // نسبة الخصم (مثال: 20 تعني 20%)
  discountExpiresAt?: Date | any; // تاريخ انتهاء الخصم
  // إحصائيات
  orderCount?: number; // عدد مرات الطلب
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Restaurant - Owner's restaurant profile
 */
export interface Restaurant {
  id: string; // doc ID = ownerId
  name: string;
  ownerId: string;
  email?: string;
  phone?: string;
  city?: string;
  location?: string; // Address or description
  logoUrl?: string;
  coverUrl?: string; // صورة الغلاف
  // حالة المتجر
  isOpen?: boolean; // هل المتجر مفتوح للطلبات؟ (true = متاح، false = مغلق)
  // خيارات التوصيل والاستلام
  allowDelivery?: boolean; // السماح بالتوصيل للعملاء
  allowPickup?: boolean; // السماح بالاستلام من موقع المطعم
  // التراخيص
  commercialLicenseUrl?: string; // صورة الرخصة التجارية / السجل التجاري
  licenseStatus?: 'pending' | 'approved' | 'rejected'; // حالة مراجعة التراخيص
  licenseNotes?: string; // ملاحظات المراجعة
  referredBy?: string; // UID المشرف الذي أضاف المطعم (admin) - إذا كان فارغ = مسجل من المطور
  referrerType?: 'admin' | 'developer'; // نوع من أضاف المطعم
  // باقات سفرة البيت
  packageType?: 'free' | 'premium'; // نوع الباقة الحالية
  packageRequest?: 'premium'; // طلب ترقية للباقة
  packageRequestedAt?: Date; // تاريخ طلب الترقية
  packageSubscribedAt?: Date; // تاريخ الاشتراك في الباقة المدفوعة
  packageExpiresAt?: Date; // تاريخ انتهاء الباقة المدفوعة
  // نظام التوثيق والتصنيف
  isVerified?: boolean; // هل الأسرة موثقة؟
  verifiedAt?: Date; // تاريخ التوثيق
  sellerTier?: 'bronze' | 'silver' | 'gold'; // تصنيف البائع
  tierUpdatedAt?: Date; // تاريخ آخر تحديث للتصنيف
  // إحصائيات للتصنيف
  totalOrders?: number; // إجمالي الطلبات
  averageRating?: number; // متوسط التقييم
  onTimeDeliveryRate?: number; // نسبة الالتزام بالوقت
  complaintsCount?: number; // عدد الشكاوى
  // ملاحظة قصيرة تظهر للعملاء
  announcement?: string; // ملاحظة أو إعلان قصير يظهر للعملاء عند زيارة المتجر
  // بيانات الحساب البنكي للتحويل
  bankName?: string; // اسم البنك
  bankAccountName?: string; // اسم صاحب الحساب
  bankAccountNumber?: string; // رقم الآيبان أو الحساب
  // بيانات التوظيف
  isHiring?: boolean; // هل الأسرة تبحث عن موظفات؟
  hiringDescription?: string; // وصف الوظيفة المطلوبة
  hiringContact?: string; // رقم التواصل للتوظيف
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Seller Tier Levels
 * Bronze: المستوى الأساسي (افتراضي)
 * Silver: أداء جيد (تقييم 4+، التزام 85%+، شكاوى أقل من 5)
 * Gold: أداء ممتاز (تقييم 4.5+، التزام 95%+، شكاوى أقل من 2)
 */
export type SellerTier = 'bronze' | 'silver' | 'gold';

/**
 * Order - Customer purchase record
 */
export interface Order {
  id: string;
  customerId: string; // Links to users/{customerId}
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number; // رسوم التوصيل (يحددها المندوب أو الأسرة)
  deliveryFeeSetBy?: 'owner' | 'courier'; // من حدد رسوم التوصيل
  deliveryFeeSetAt?: Date; // متى تم تحديد رسوم التوصيل
  total: number;
  status: OrderStatus;
  address: string;
  deliveryType?: 'delivery' | 'pickup'; // نوع التسليم: توصيل أو استلام من المطعم
  courierId?: string; // Links to users/{courierId} if assigned
  notes?: string;
  restaurantName?: string; // Denormalized for display convenience
  restaurantId?: string; // Links to restaurants/{id}
  branchId?: string; // Links to restaurants/{ownerId}/branches/{branchId} if order is from a branch
  // نظام العمولات والرسوم
  platformFee?: number; // رسوم المنصة الثابتة (3.75 ريال لكل طلب) - على المندوب
  adminCommission?: number; // عمولة المشرف (0.5 ريال إذا المطعم مسجل عن طريقه)
  courierPlatformFee?: number; // رسوم المنصة المخصومة من المندوب (3.75 ريال)
  referredBy?: string; // UID المشرف الذي أضاف المطعم
  // نظام التقييم الإجباري
  ratings?: OrderRatings; // التقييمات للطلب
  ratingCompleted?: boolean; // هل اكتمل التقييم؟
  // عداد الوقت - timestamps لكل مرحلة
  timestamps?: OrderTimestamps;
  // تنبيهات تجاوز الوقت
  timeAlerts?: {
    preparationExceeded?: boolean;
    pickupExceeded?: boolean;
    deliveryExceeded?: boolean;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * OrderRatings - تقييمات الطلب
 */
export interface OrderRatings {
  // تقييم العميل للأسرة
  customerToRestaurant?: Rating;
  // تقييم العميل للمندوب
  customerToCourier?: Rating;
  // تقييم الأسرة للعميل
  restaurantToCustomer?: Rating;
  // تقييم المندوب للعميل
  courierToCustomer?: Rating;
}

/**
 * Rating - تقييم فردي
 */
export interface Rating {
  stars: number; // 1-5 نجوم
  comment?: string; // تعليق اختياري
  createdAt?: Date;
}

/**
 * Order Item - Line item in an order
 */
export interface OrderItem {
  id: string; // menuItems/{id}
  name: string;
  price: number;
  qty: number;
  ownerId?: string; // Restaurant ID for multi-restaurant support
}

/**
 * Order Status - Lifecycle states of an order
 */
export type OrderStatus = 
  | 'pending'           // Just created, awaiting owner acceptance
  | 'accepted'          // Owner accepted the order
  | 'preparing'         // Kitchen is preparing
  | 'ready'             // Ready for pickup/delivery
  | 'out_for_delivery'  // Courier is delivering
  | 'delivered'         // Successfully delivered
  | 'cancelled';        // Order cancelled

/**
 * User - Application user record
 */
export interface User {
  uid: string;
  email: string;
  name?: string;
  phone?: string;
  city?: string;
  address?: string;
  role: UserRole;
  // الموقع المحفوظ للتوصيل
  savedLocation?: {
    lat: number;
    lng: number;
    address: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * User Role - Authorization levels in the app
 */
export type UserRole = 'customer' | 'courier' | 'owner' | 'admin' | 'developer';

/**
 * Admin Role (المشرف):
 * - إضافة/إدارة المطاعم
 * - مراقبة الطلبات للمطاعم المضافة (بدون تعديل)
 * - إدارة المحفظة والمكافآت
 * - يمكنه الطلب كعميل
 */

/**
 * Developer Role (المطور):
 * - جميع الصلاحيات الكاملة
 * - إدارة المستخدمين (إضافة/حذف)
 * - إدارة المطاعم (إضافة/حذف/تعديل)
 * - إدارة الطلبات
 * - إدارة الإعدادات العامة
 */

/**
 * Settings - Global app configuration
 */
export interface AppSettings {
  deliveryFee?: number;
  minOrderAmount?: number;
  operatingHours?: {
    open: string;
    close: string;
  };
  platformFee?: number; // رسوم التطبيق الثابتة (1.5 ريال)
  adminCommissionRate?: number; // نسبة المشرف (0.5 ريال)
  [key: string]: any;
}

/**
 * Wallet - محفظة المشرف أو المطور
 */
export interface Wallet {
  id: string; // = user UID
  balance: number; // الرصيد الحالي
  totalEarnings: number; // إجمالي الأرباح
  totalWithdrawn: number; // إجمالي المسحوب
  transactions: WalletTransaction[];
  updatedAt?: Date;
}

/**
 * WalletTransaction - معاملة في المحفظة
 */
export interface WalletTransaction {
  id: string;
  type: 'credit' | 'debit'; // إيداع أو سحب
  amount: number;
  description: string;
  orderId?: string; // رقم الطلب المرتبط
  restaurantId?: string;
  courierId?: string; // معرف المندوب (للمعاملات المتعلقة بالتوصيل)
  customerId?: string; // معرف العميل
  createdAt: Date;
}

/**
 * OwnerWallet - محفظة الأسرة المنتجة (صاحب المطعم)
 * تُخزن في: wallets/{ownerId}
 */
export interface OwnerWallet {
  id: string; // = ownerId (معرف صاحب المطعم)
  ownerType: 'restaurant'; // نوع المحفظة
  balance: number; // الرصيد الحالي (المتاح للسحب)
  totalSales: number; // إجمالي المبيعات (قبل الخصومات)
  totalWithdrawn: number; // إجمالي المسحوب
  pendingBalance: number; // رصيد معلق (طلبات لم تكتمل بعد)
  updatedAt?: Date;
}

/**
 * CourierWallet - محفظة المندوب
 * تُخزن في: wallets/{courierId}
 */
export interface CourierWallet {
  id: string; // = courierId (معرف المندوب)
  ownerType: 'courier'; // نوع المحفظة
  balance: number; // الرصيد الحالي (المتاح للسحب)
  totalEarnings: number; // إجمالي الأرباح من التوصيل
  totalPlatformFees: number; // إجمالي رسوم المنصة المخصومة
  netEarnings: number; // صافي الأرباح (الأرباح - الرسوم)
  totalWithdrawn: number; // إجمالي المسحوب
  updatedAt?: Date;
}

/**
 * AppAccounting - محاسبة التطبيق الشهرية (للمطور فقط)
 * تُخزن في: accounting/{yearMonth} مثال: accounting/2026-02
 */
export interface AppAccounting {
  id: string; // = yearMonth (مثل: 2026-02)
  year: number;
  month: number;
  // إيرادات المنصة
  totalPlatformFees: number; // إجمالي رسوم المنصة من المناديب
  totalAdminCommissions: number; // إجمالي عمولات المشرفين
  totalSubscriptions: number; // إجمالي اشتراكات الباقات
  totalPromotions: number; // إجمالي إيرادات الإعلانات
  // إحصائيات
  totalOrders: number; // إجمالي الطلبات
  totalOrdersValue: number; // إجمالي قيمة الطلبات
  totalDeliveries: number; // إجمالي التوصيلات
  totalDeliveryFees: number; // إجمالي رسوم التوصيل
  // صافي الدخل
  grossRevenue: number; // إجمالي الإيرادات
  netRevenue: number; // صافي الإيرادات (بعد الخصومات)
  // تفاصيل يومية
  dailyStats: Record<string, DailyStats>; // { "2026-02-01": {...} }
  updatedAt?: Date;
}

/**
 * DailyStats - إحصائيات يومية للمحاسبة
 */
export interface DailyStats {
  date: string; // تاريخ اليوم (YYYY-MM-DD)
  orders: number;
  ordersValue: number;
  deliveries: number;
  deliveryFees: number;
  platformFees: number;
  adminCommissions: number;
}

/**
 * Promotion - الإعلان الممول للأسرة المنتجة (حالة/ستوري)
 */
export interface Promotion {
  id: string;
  ownerId: string; // صاحب الأسرة
  restaurantId: string; // المطعم/الأسرة
  type: 'text' | 'image' | 'video'; // نوع الإعلان
  title?: string; // عنوان الإعلان
  description?: string; // الوصف أو الشرح
  mediaUrl?: string; // رابط الصورة أو الفيديو
  isActive: boolean; // هل الإعلان نشط؟
  isPaid: boolean; // هل تم الدفع؟
  price: number; // سعر الإعلان
  duration: number; // مدة الإعلان بالساعات (24 ساعة افتراضي)
  viewsCount: number; // عدد المشاهدات
  expiresAt?: Date; // تاريخ انتهاء الإعلان
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Story - ستوري الأسرة المنتجة (مثل إنستغرام)
 * تُخزن في: stories/{storyId}
 * تنتهي بعد 24 ساعة تلقائياً
 */
export interface Story {
  id: string;
  ownerId: string; // معرف صاحب الأسرة
  restaurantId: string; // = ownerId
  restaurantName?: string; // اسم الأسرة
  restaurantLogo?: string; // شعار الأسرة
  // نوع الستوري
  type: 'image' | 'video' | 'text';
  // المحتوى
  mediaUrl?: string; // رابط الصورة أو الفيديو
  caption?: string; // النص المصاحب
  backgroundColor?: string; // لون الخلفية (للنص فقط)
  textColor?: string; // لون النص
  // روابط
  linkUrl?: string; // رابط خارجي (اختياري)
  linkLabel?: string; // نص الرابط (مثل: "اطلب الآن")
  menuItemId?: string; // ربط بصنف معين
  menuItemName?: string; // اسم الصنف
  // الإحصائيات
  viewsCount: number;
  viewedBy: string[]; // قائمة معرفات المشاهدين
  // التوقيت
  expiresAt: Date; // تنتهي بعد 24 ساعة
  createdAt?: Date;
}

/**
 * StoryGroup - مجموعة ستوريات الأسرة للعرض
 */
export interface StoryGroup {
  ownerId: string;
  restaurantName?: string;
  restaurantLogo?: string;
  stories: Story[];
  hasUnviewed: boolean; // هل يوجد ستوري لم يشاهده المستخدم
}

/**
 * PackageSubscriptionRequest - طلب اشتراك في باقة التميز
 */
export interface PackageSubscriptionRequest {
  id: string;
  restaurantId: string; // معرف المطعم/الأسرة
  restaurantName: string; // اسم الأسرة
  ownerName?: string; // اسم صاحب الأسرة
  ownerPhone?: string; // رقم الجوال
  status: PackageRequestStatus;
  // بيانات الدفع
  bankAccountImageUrl?: string; // صورة الحساب البنكي من المطور
  paymentProofImageUrl?: string; // صورة إثبات التحويل من الأسرة
  subscriptionAmount: number; // مبلغ الاشتراك
  subscriptionDuration: number; // مدة الاشتراك بالأيام (30 يوم مثلاً)
  // ملاحظات
  developerNotes?: string; // ملاحظات المطور
  ownerNotes?: string; // ملاحظات الأسرة
  // تواريخ
  requestedAt?: Date;
  bankSentAt?: Date; // تاريخ إرسال صورة البنك
  paymentSentAt?: Date; // تاريخ إرسال إثبات التحويل
  approvedAt?: Date;
  rejectedAt?: Date;
  expiresAt?: Date; // تاريخ انتهاء الاشتراك
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * حالات طلب الاشتراك في الباقة
 */
export type PackageRequestStatus = 
  | 'pending'           // طلب جديد بانتظار المطور
  | 'bank_sent'         // المطور أرسل صورة الحساب البنكي
  | 'payment_sent'      // الأسرة أرسلت إثبات التحويل
  | 'approved'          // تم القبول وتفعيل الباقة
  | 'rejected'          // مرفوض
  | 'expired';          // منتهي الصلاحية

/**
 * RestaurantStats - إحصائيات المطعم/الأسرة المنتجة
 */
export interface RestaurantStats {
  id: string; // = restaurant ID
  // إحصائيات الزيارات
  totalProfileViews: number; // عدد مشاهدات الملف التعريفي
  totalMenuViews: number; // عدد مشاهدات صفحة القائمة
  totalItemViews: number; // عدد مشاهدات الأصناف
  // إحصائيات المشاركة
  totalShareClicks: number; // عدد مرات الضغط على زر المشاركة
  whatsappShareCount: number; // عدد مرات المشاركة عبر واتساب
  // إحصائيات التسجيل
  registeredCustomers: number; // عدد العملاء المسجلين عبر رابط الأسرة
  appDownloads: number; // عدد تحميلات التطبيق عبر رابط الأسرة
  followersCount: number; // عدد متابعي المتجر
  // تفاصيل الزيارات
  dailyViews: Record<string, number>; // عدد الزيارات اليومية { "2024-01-22": 50 }
  // آخر تحديث
  updatedAt?: Date;
}

/**
 * VisitLog - سجل زيارة لتتبع زيارات العملاء
 */
export interface VisitLog {
  id: string;
  restaurantId: string; // معرف المطعم
  visitorId?: string; // معرف الزائر (إذا مسجل)
  visitorType: 'anonymous' | 'customer' | 'registered_via_link';
  source: 'direct' | 'whatsapp_share' | 'social_share' | 'referral';
  page: 'menu' | 'profile' | 'item';
  itemId?: string; // معرف الصنف (إذا كانت زيارة صنف)
  referralCode?: string; // كود الإحالة
  createdAt?: Date;
}

/**
 * CustomerRegistration - تسجيل عميل عبر رابط الأسرة
 */
export interface CustomerRegistration {
  id: string;
  customerId: string; // معرف العميل
  restaurantId: string; // معرف الأسرة التي سجل عبرها
  registrationType: 'website' | 'app';
  referralCode?: string;
  createdAt?: Date;
}

/**
 * StoreFollower - متابع للمتجر
 */
export interface StoreFollower {
  id: string;
  followerId: string; // معرف العميل المتابع
  followerName?: string; // اسم المتابع
  restaurantId: string; // معرف المتجر المتابَع
  createdAt?: Date;
}

/**
 * PackageSettings - إعدادات الباقات (تُخزن في settings/packages)
 */
export interface PackageSettings {
  // إعدادات باقة التميز (Premium)
  premium: PackageConfig;
  // إعدادات الباقة المجانية
  free: PackageConfig;
  // الباقة النشطة افتراضياً للمطاعم الجديدة
  defaultPackage: 'free' | 'premium';
  // آخر تحديث
  updatedAt?: Date;
}

/**
 * PackageConfig - إعدادات باقة واحدة
 */
export interface PackageConfig {
  // الاسم المعروض للباقة
  displayName: string;
  // الوصف
  description?: string;
  // هل الباقة مفعّلة (يمكن للأسر الاشتراك فيها)
  isEnabled: boolean;
  // السعر الأصلي بالريال
  originalPrice: number;
  // السعر الحالي بالريال (بعد الخصم إن وجد)
  currentPrice: number;
  // مدة الاشتراك بالأيام
  durationDays: number;
  // إعدادات الخصم
  discount?: PackageDiscount;
}

/**
 * PackageDiscount - خصم على الباقة
 */
export interface PackageDiscount {
  // هل الخصم مفعّل
  isActive: boolean;
  // نوع الخصم: نسبة مئوية أو مبلغ ثابت
  type: 'percentage' | 'fixed';
  // قيمة الخصم (نسبة أو مبلغ)
  value: number;
  // تاريخ بداية الخصم
  startDate?: Date | any;
  // تاريخ نهاية الخصم
  endDate?: Date | any;
  // سبب أو وصف الخصم (للعرض)
  label?: string;
}

/**
 * SpecialOffer - عرض خاص للأسرة المنتجة
 * تُخزن في: offers/{offerId}
 */
export interface SpecialOffer {
  id: string;
  ownerId: string; // معرف صاحب الأسرة
  restaurantId: string; // = ownerId
  restaurantName?: string; // اسم الأسرة (denormalized)
  restaurantLogo?: string; // شعار الأسرة
  // نوع العرض
  offerType: OfferType;
  // تفاصيل العرض
  title: string; // عنوان العرض (مثل: "عرض نهاية الأسبوع")
  description?: string; // وصف العرض
  imageUrl?: string; // صورة العرض
  // إعدادات العرض حسب النوع
  discountPercent?: number; // نسبة الخصم (للنوع percent_discount)
  discountAmount?: number; // مبلغ الخصم الثابت
  minOrderAmount?: number; // الحد الأدنى للطلب للاستفادة من العرض
  // عرض الوجبة المجمّعة
  bundleItems?: BundleItem[]; // عناصر الوجبة
  bundlePrice?: number; // سعر الوجبة الخاص
  bundleOriginalPrice?: number; // السعر الأصلي للمقارنة
  // عرض اشترِ X واحصل على Y
  buyQuantity?: number; // اشترِ كم (مثلاً 2)
  getQuantity?: number; // واحصل على كم مجاناً (مثلاً 1)
  applicableItemIds?: string[]; // الأصناف المشمولة بالعرض
  applicableItemNames?: string[]; // أسماء الأصناف (denormalized)
  // الحالة والتوقيت
  isActive: boolean;
  startsAt?: Date | any;
  expiresAt?: Date | any;
  // إحصائيات
  viewsCount: number;
  usedCount: number; // عدد مرات الاستخدام
  // تواريخ
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * أنواع العروض المتاحة
 */
export type OfferType = 
  | 'percent_discount'    // خصم نسبة مئوية
  | 'fixed_discount'      // خصم مبلغ ثابت
  | 'bundle_meal'         // وجبة مجمّعة بسعر خاص
  | 'buy_x_get_y';        // اشترِ X واحصل على Y مجاناً

/**
 * BundleItem - عنصر في الوجبة المجمّعة
 */
export interface BundleItem {
  itemId: string; // معرف الصنف
  itemName: string; // اسم الصنف
  quantity: number; // الكمية
  originalPrice: number; // السعر الأصلي
}

/**
 * بلاغ مشكلة - للعملاء والأسر والمندوبين
 * يُحفظ في مجموعة problemReports ويظهر للإدارة فقط
 */
export interface ProblemReport {
  id: string;
  // بيانات المُبلِّغ
  userId: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  userRole: 'customer' | 'owner' | 'courier';
  // نوع المشكلة
  problemType: ProblemType;
  // وصف المشكلة
  description: string;
  // الحالة
  status: 'pending' | 'reviewed' | 'resolved';
  // ملاحظات الإدارة (اختياري)
  adminNotes?: string;
  adminId?: string;
  // التواريخ
  createdAt?: Date | any;
  reviewedAt?: Date | any;
}

/**
 * أنواع المشاكل المتاحة للإبلاغ
 */
export type ProblemType = 
  | 'orders'     // مشاكل الطلبات
  | 'delivery'   // مشاكل التوصيل
  | 'payment'    // مشاكل الدفع
  | 'account'    // مشاكل الحساب
  | 'suggestion'; // اقتراحات
