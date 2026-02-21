// src/utils/distance.ts
// دالة حساب المسافة بين نقطتين باستخدام صيغة Haversine

export type GeoLocation = {
  lat: number
  lng: number
}

/**
 * حساب المسافة بين نقطتين بالكيلومتر
 * @param point1 النقطة الأولى
 * @param point2 النقطة الثانية
 * @returns المسافة بالكيلومتر
 */
export function calculateDistance(point1: GeoLocation, point2: GeoLocation): number {
  const R = 6371 // نصف قطر الأرض بالكيلومتر
  
  const dLat = toRad(point2.lat - point1.lat)
  const dLng = toRad(point2.lng - point1.lng)
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.lat)) * Math.cos(toRad(point2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  
  return R * c
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

/**
 * التحقق من أن المسافة ضمن النطاق المحدد
 * @param point1 النقطة الأولى
 * @param point2 النقطة الثانية
 * @param maxDistance أقصى مسافة بالكيلومتر
 * @returns true إذا كانت المسافة ضمن النطاق
 */
export function isWithinDistance(point1: GeoLocation, point2: GeoLocation, maxDistance: number): boolean {
  return calculateDistance(point1, point2) <= maxDistance
}

// أقصى مسافة للتوصيل (15 كيلو)
export const MAX_DELIVERY_DISTANCE = 15
