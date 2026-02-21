// src/components/LocationRequired.tsx
// مكون يظهر عندما يكون تحديد الموقع إلزامياً

import React, { useState, useEffect, useCallback } from 'react'
import { MapPin, Navigation, Loader2, AlertTriangle, CheckCircle } from 'lucide-react'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuth } from '@/auth'

type Location = { lat: number; lng: number }

type Props = {
  onLocationSaved: () => void
}

export const LocationRequired: React.FC<Props> = ({ onLocationSaved }) => {
  const { user, role } = useAuth()
  const [location, setLocation] = useState<Location | null>(null)
  const [loading, setLoading] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [saving, setSaving] = useState(false)

  // موقع افتراضي (الرياض)
  const defaultLocation: Location = { lat: 24.7136, lng: 46.6753 }

  // تحديد الموقع عبر GPS
  const getGPSLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('المتصفح لا يدعم تحديد الموقع')
      return
    }

    setGpsLoading(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setLocation(newLoc)
        setGpsLoading(false)
        
        // تحديث الخريطة
        if ((window as any).locationRequiredMap) {
          (window as any).locationRequiredMap.setView([newLoc.lat, newLoc.lng], 17)
          if ((window as any).locationRequiredMarker) {
            (window as any).locationRequiredMarker.setLatLng([newLoc.lat, newLoc.lng])
          }
        }
      },
      (err) => {
        setGpsLoading(false)
        if (err.code === 1) {
          setError('تم رفض إذن الموقع. فعّل الموقع من إعدادات المتصفح')
        } else if (err.code === 2) {
          setError('تعذر تحديد الموقع. تأكد من تفعيل GPS')
        } else {
          setError('انتهت مهلة تحديد الموقع. حاول مرة أخرى')
        }
      },
      { 
        enableHighAccuracy: true, 
        timeout: 15000,
        maximumAge: 0 
      }
    )
  }, [])

  // تحميل Leaflet
  useEffect(() => {
    // تحميل CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }

    // تحميل JS
    if (!(window as any).L) {
      const script = document.createElement('script')
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = () => setMapReady(true)
      document.body.appendChild(script)
    } else {
      setMapReady(true)
    }
  }, [])

  // إنشاء الخريطة
  useEffect(() => {
    if (!mapReady || !(window as any).L) return

    const L = (window as any).L
    const container = document.getElementById('location-required-map')
    if (!container) return

    // إزالة خريطة قديمة إن وجدت
    if ((window as any).locationRequiredMap) {
      (window as any).locationRequiredMap.remove()
    }

    const startLoc = location || defaultLocation

    // إنشاء الخريطة
    const map = L.map('location-required-map', {
      zoomControl: true,
      attributionControl: false,
    }).setView([startLoc.lat, startLoc.lng], 12)

    // إضافة طبقة الخريطة
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map)

    // أيقونة مخصصة للماركر
    const customIcon = L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          width: 50px; 
          height: 50px; 
          background: linear-gradient(135deg, #0EA5E9, #0284C7);
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 20px rgba(14, 165, 233, 0.5);
          border: 3px solid white;
        ">
          <div style="transform: rotate(45deg); color: white; font-size: 20px;">📍</div>
        </div>
      `,
      iconSize: [50, 50],
      iconAnchor: [25, 50],
    })

    // إضافة الماركر
    const marker = L.marker([startLoc.lat, startLoc.lng], { 
      icon: customIcon,
      draggable: true 
    }).addTo(map)

    // تحديث الموقع عند سحب الماركر
    marker.on('dragend', () => {
      const pos = marker.getLatLng()
      setLocation({ lat: pos.lat, lng: pos.lng })
    })

    // تحديث الموقع عند النقر على الخريطة
    map.on('click', (e: any) => {
      const { lat, lng } = e.latlng
      setLocation({ lat, lng })
      marker.setLatLng([lat, lng])
    })

    // حفظ المراجع
    ;(window as any).locationRequiredMap = map
    ;(window as any).locationRequiredMarker = marker

    return () => {
      if ((window as any).locationRequiredMap) {
        (window as any).locationRequiredMap.remove()
        ;(window as any).locationRequiredMap = null
        ;(window as any).locationRequiredMarker = null
      }
    }
  }, [mapReady])

  // حفظ الموقع
  const saveLocation = async () => {
    if (!location || !user) return

    setSaving(true)
    try {
      // حفظ في مستند المستخدم
      await updateDoc(doc(db, 'users', user.uid), {
        location: location,
        locationUpdatedAt: new Date()
      })

      // إذا كان صاحب مطعم، حفظ في مستند المطعم أيضاً
      if (role === 'owner') {
        try {
          await updateDoc(doc(db, 'restaurants', user.uid), {
            geoLocation: location,
            locationUpdatedAt: new Date()
          })
        } catch (err) {
          console.warn('تعذر تحديث موقع المطعم:', err)
        }
      }

      onLocationSaved()
    } catch (err) {
      setError('فشل في حفظ الموقع. حاول مرة أخرى')
    } finally {
      setSaving(false)
    }
  }

  const getRoleText = () => {
    switch (role) {
      case 'owner': return 'مطعمك'
      case 'courier': return 'موقعك الحالي'
      default: return 'موقعك'
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-sky-50 via-white to-sky-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* الهيدر */}
        <div className="bg-gradient-to-r from-sky-500 to-sky-600 p-6 text-white text-center">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold mb-2">حدد موقع {getRoleText()}</h1>
          <p className="text-sky-100 text-sm">
            {role === 'owner' 
              ? 'لعرض مطعمك للعملاء القريبين منك'
              : 'لنعرض لك المطاعم القريبة منك (15 كم)'}
          </p>
        </div>

        {/* المحتوى */}
        <div className="p-6 space-y-4">
          {/* رسالة الخطأ */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3 text-red-700">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* زر تحديد الموقع GPS */}
          <button
            onClick={getGPSLocation}
            disabled={gpsLoading}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold p-4 rounded-xl shadow-lg transition disabled:opacity-50"
          >
            {gpsLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                جارِ تحديد موقعك...
              </>
            ) : (
              <>
                <Navigation className="w-5 h-5" />
                📍 حدد موقعي تلقائياً
              </>
            )}
          </button>

          {/* الخريطة */}
          <div className="relative">
            <p className="text-sm text-gray-500 mb-2 text-center">
              أو اضغط على الخريطة لتحديد الموقع يدوياً
            </p>
            <div 
              id="location-required-map" 
              className="h-64 rounded-xl overflow-hidden border-2 border-gray-200"
              style={{ background: '#f0f9ff' }}
            />
            {!mapReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-sky-50">
                <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
              </div>
            )}
          </div>

          {/* حالة الموقع */}
          {location && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-3 text-green-700">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-semibold">تم تحديد الموقع ✓</p>
                <p className="text-xs text-green-600">
                  {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </p>
              </div>
            </div>
          )}

          {/* زر الحفظ */}
          <button
            onClick={saveLocation}
            disabled={!location || saving}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-bold p-4 rounded-xl shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                جارِ الحفظ...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                تأكيد الموقع والمتابعة
              </>
            )}
          </button>

          <p className="text-xs text-gray-400 text-center">
            💡 يمكنك تغيير موقعك لاحقاً من صفحة البروفايل
          </p>
        </div>
      </div>
    </div>
  )
}
