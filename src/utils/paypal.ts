// src/utils/paypal.ts
// إعدادات PayPal للدفع وشحن المحفظة

// ⚠️ ملاحظة أمنية: في الإنتاج، يجب نقل هذه المفاتيح لمتغيرات البيئة
// واستخدام خادم backend للتحقق من المدفوعات

// سعر صرف الريال للدولار (تقريبي) - يجب تحديثه دورياً
const SAR_TO_USD_RATE = 0.27 // 1 ريال = 0.27 دولار تقريباً

export const PAYPAL_CONFIG = {
  // PayPal Client ID (Sandbox/Live)
  clientId: "AR7QZ7sgXORp99wUPIY75Wl9m4YLtLtVzaStB5g-q7eUT9jOLIKEeGGlxT8jlC9n1sDTcpCpD1peRxR5",
  
  // العملة المستخدمة (الدولار - لأن PayPal لا يدعم SAR)
  currency: "USD",
  
  // وضع الاختبار أو الإنتاج
  // "sandbox" للاختبار، "live" للإنتاج
  environment: "live" as const,
  
  // الحد الأدنى والأقصى للشحن (بالريال)
  minRecharge: 10,
  maxRecharge: 1000,
  
  // تحويل من ريال إلى دولار
  sarToUsd: (sarAmount: number) => {
    return Math.round(sarAmount * SAR_TO_USD_RATE * 100) / 100
  },
  
  // تحويل من دولار إلى ريال
  usdToSar: (usdAmount: number) => {
    return Math.round(usdAmount / SAR_TO_USD_RATE * 100) / 100
  },
  
  // رسوم PayPal التقريبية (2.9% + 0.30$)
  calculateFee: (usdAmount: number) => {
    return Math.round((usdAmount * 0.029 + 0.30) * 100) / 100
  }
}

// خيارات PayPal للـ Provider
export const getPayPalOptions = () => ({
  clientId: PAYPAL_CONFIG.clientId,
  currency: PAYPAL_CONFIG.currency,
  intent: "capture" as const,
  // تخصيص الواجهة
  components: "buttons",
})
