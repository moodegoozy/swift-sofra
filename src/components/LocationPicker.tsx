// src/components/LocationPicker.tsx
import React, { useState, useEffect, useCallback } from 'react'
import { MapPin, Navigation, Check, X, Loader2, Target, Smartphone, Search, PenLine, Map } from 'lucide-react'

type Location = { lat: number; lng: number }

type SearchResult = {
  display_name: string
  lat: string
  lon: string
}

type Props = {
  isOpen: boolean
  onClose: () => void
  onConfirm: (location: Location, address: string) => void
  initialLocation?: Location | null
}

export const LocationPicker: React.FC<Props> = ({ isOpen, onClose, onConfirm, initialLocation }) => {
  const [location, setLocation] = useState<Location | null>(initialLocation || null)
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  // وضع الإدخال: الخريطة أو يدوي
  const [inputMode, setInputMode] = useState<'map' | 'manual'>('map')

  // 🎯 موقع افتراضي (الرياض)
  const defaultLocation: Location = { lat: 24.7136, lng: 46.6753 }

  // � البحث عن المناطق
  const searchPlaces = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    setSearchLoading(true)
    try {
      // إضافة "السعودية" للبحث لتحسين النتائج
      const searchTerm = query.includes('السعودية') ? query : `${query}, السعودية`
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchTerm)}&limit=5&accept-language=ar`,
        {
          headers: {
            'Accept': 'application/json',
          }
        }
      )
      const data = await response.json()
      setSearchResults(data)
      setShowResults(data.length > 0)
    } catch (err) {
      console.error('خطأ في البحث:', err)
      setSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }, [])

  // 📍 اختيار نتيجة بحث
  const selectSearchResult = useCallback((result: SearchResult) => {
    const newLoc = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) }
    setLocation(newLoc)
    setSearchQuery('')
    setSearchResults([])
    setShowResults(false)
    
    // تحريك الخريطة للموقع المختار
    if ((window as any).leafletMap) {
      (window as any).leafletMap.setView([newLoc.lat, newLoc.lng], 16, {
        animate: true,
        duration: 0.5
      })
      if ((window as any).leafletMarker) {
        (window as any).leafletMarker.setLatLng([newLoc.lat, newLoc.lng])
      }
    }
    
    // استخدام اسم المكان كجزء من العنوان
    const shortName = result.display_name.split(',').slice(0, 3).join('،')
    setAddress(shortName)
  }, [])

  // �📍 تحديد الموقع عبر GPS
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
        if ((window as any).leafletMap) {
          (window as any).leafletMap.setView([newLoc.lat, newLoc.lng], 17)
          if ((window as any).leafletMarker) {
            (window as any).leafletMarker.setLatLng([newLoc.lat, newLoc.lng])
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

  // 🗺️ تحميل Leaflet
  useEffect(() => {
    if (!isOpen) return

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
  }, [isOpen])

  // 🗺️ إنشاء الخريطة
  useEffect(() => {
    if (!isOpen || !mapReady || !(window as any).L) return

    const L = (window as any).L
    const container = document.getElementById('location-map')
    if (!container) return

    // إزالة خريطة قديمة إن وجدت
    if ((window as any).leafletMap) {
      (window as any).leafletMap.remove()
    }

    const startLoc = location || defaultLocation

    // إنشاء الخريطة
    const map = L.map('location-map', {
      zoomControl: false,
      attributionControl: false,
    }).setView([startLoc.lat, startLoc.lng], location ? 17 : 12)

    // إضافة طبقة الخريطة (OpenStreetMap خفيف وسريع)
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
      marker.setLatLng([lat, lng])
      setLocation({ lat, lng })
    })

    // حفظ المراجع
    ;(window as any).leafletMap = map
    ;(window as any).leafletMarker = marker

    // تحديث الموقع إذا كان موجود
    if (location) {
      setLocation(location)
    }

    return () => {
      if ((window as any).leafletMap) {
        (window as any).leafletMap.remove()
        ;(window as any).leafletMap = null
        ;(window as any).leafletMarker = null
      }
    }
  }, [isOpen, mapReady])

  // 📍 تمركز على الموقع الحالي
  const centerOnLocation = () => {
    if (location && (window as any).leafletMap) {
      (window as any).leafletMap.setView([location.lat, location.lng], 17, {
        animate: true,
        duration: 0.5
      })
    }
  }

  // إحداثيات تقريبية للمدن السعودية
  const cityCoordinates: Record<string, { lat: number; lng: number }> = {
    'الرياض': { lat: 24.7136, lng: 46.6753 },
    'جدة': { lat: 21.4858, lng: 39.1925 },
    'مكة المكرمة': { lat: 21.3891, lng: 39.8579 },
    'المدينة المنورة': { lat: 24.5247, lng: 39.5692 },
    'الدمام': { lat: 26.4207, lng: 50.0888 },
    'الخبر': { lat: 26.2172, lng: 50.1971 },
    'الأحساء': { lat: 25.3548, lng: 49.5886 },
    'الطائف': { lat: 21.2703, lng: 40.4158 },
    'تبوك': { lat: 28.3838, lng: 36.5550 },
    'بريدة': { lat: 26.3260, lng: 43.9750 },
    'خميس مشيط': { lat: 18.3066, lng: 42.7283 },
    'أبها': { lat: 18.2164, lng: 42.5053 },
    'القطيف': { lat: 26.5196, lng: 50.0115 },
    'نجران': { lat: 17.4924, lng: 44.1277 },
    'جازان': { lat: 16.8892, lng: 42.5611 },
    'ينبع': { lat: 24.0895, lng: 38.0618 },
    'حائل': { lat: 27.5114, lng: 41.7208 },
  }

  // ✅ تأكيد الموقع
  const handleConfirm = () => {
    // في الوضع اليدوي، نستخدم إحداثيات المدينة المختارة
    if (inputMode === 'manual') {
      if (!address.trim()) {
        setError('أدخل العنوان التفصيلي')
        return
      }
      // استخراج اسم المدينة من أول جزء في العنوان
      const cityName = address.split('،')[0]?.trim()
      const coords = cityCoordinates[cityName] || { lat: 24.7136, lng: 46.6753 }
      onConfirm(coords, address)
      return
    }
    
    // في وضع الخريطة
    if (!location) {
      setError('حدد موقعك أولاً')
      return
    }
    if (!address.trim()) {
      setError('أدخل وصف العنوان')
      return
    }
    onConfirm(location, address)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* خلفية معتمة */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* المحتوى الرئيسي */}
      <div className="relative w-full h-full sm:w-[95%] sm:h-[90%] sm:max-w-2xl sm:rounded-3xl overflow-hidden bg-white shadow-2xl flex flex-col">
        
        {/* الهيدر */}
        <div className="bg-gradient-to-r from-sky-500 to-sky-600 text-white p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-lg">تحديد موقع التوصيل</h2>
                <p className="text-sm text-white/80">
                  {inputMode === 'map' ? 'ابحث أو اسحب الدبوس' : 'اكتب عنوانك يدوياً'}
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* 🔄 تبديل الوضع: خريطة / يدوي */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setInputMode('map')}
              className={`flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition ${
                inputMode === 'map' 
                  ? 'bg-white text-sky-600' 
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <Map className="w-4 h-4" />
              الخريطة
            </button>
            <button
              onClick={() => setInputMode('manual')}
              className={`flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition ${
                inputMode === 'manual' 
                  ? 'bg-white text-sky-600' 
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <PenLine className="w-4 h-4" />
              إدخال يدوي
            </button>
          </div>
          
          {/* 🔍 حقل البحث - فقط في وضع الخريطة */}
          {inputMode === 'map' && (
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  searchPlaces(e.target.value)
                }}
                onFocus={() => searchResults.length > 0 && setShowResults(true)}
                placeholder="ابحث عن حي، شارع، أو مكان..."
                className="w-full bg-white/95 text-gray-800 rounded-xl p-3 pr-10 pl-10 focus:outline-none focus:ring-2 focus:ring-white/50 transition placeholder:text-gray-400"
              />
              {searchLoading && (
                <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-sky-500 animate-spin" />
              )}
              
              {/* نتائج البحث */}
              {showResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl overflow-hidden z-[1001] max-h-60 overflow-y-auto">
                  {searchResults.map((result, index) => (
                    <button
                      key={index}
                      onClick={() => selectSearchResult(result)}
                      className="w-full p-3 text-right hover:bg-sky-50 border-b border-gray-100 last:border-0 transition flex items-start gap-3"
                    >
                      <MapPin className="w-5 h-5 text-sky-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 text-sm leading-relaxed">
                        {result.display_name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* الخريطة - فقط في وضع الخريطة */}
        {inputMode === 'map' && (
          <div className="flex-1 relative">
            {!mapReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-sky-50">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 text-sky-500 animate-spin mx-auto mb-3" />
                  <p className="text-sky-600 font-medium">جارِ تحميل الخريطة...</p>
                </div>
              </div>
            )}
            <div id="location-map" className="w-full h-full" />

            {/* أزرار التحكم */}
            <div className="absolute left-4 top-4 flex flex-col gap-2 z-[1000]">
              {/* زر GPS */}
              <button
                onClick={getGPSLocation}
                disabled={gpsLoading}
                className="w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center hover:bg-sky-50 transition disabled:opacity-50"
                title="موقعي الحالي"
              >
                {gpsLoading ? (
                  <Loader2 className="w-5 h-5 text-sky-500 animate-spin" />
                ) : (
                  <Navigation className="w-5 h-5 text-sky-500" />
                )}
              </button>

              {/* زر التمركز */}
              {location && (
                <button
                  onClick={centerOnLocation}
                  className="w-12 h-12 bg-white rounded-xl shadow-lg flex items-center justify-center hover:bg-sky-50 transition"
                  title="تمركز"
                >
                  <Target className="w-5 h-5 text-gray-600" />
                </button>
              )}
            </div>

            {/* مؤشر الموقع */}
            {location && (
              <div className="absolute right-4 top-4 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-3 z-[1000] max-w-[200px]">
                <div className="flex items-center gap-2 text-green-600 mb-1">
                  <Check className="w-4 h-4" />
                  <span className="text-sm font-medium">تم تحديد الموقع</span>
                </div>
                <p className="text-xs text-gray-500 font-mono">
                  {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                </p>
              </div>
            )}
          </div>
        )}

        {/* محتوى الإدخال اليدوي */}
        {inputMode === 'manual' && (
          <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
            <div className="max-w-md mx-auto space-y-4">
              {/* أيقونة */}
              <div className="text-center py-4">
                <div className="w-20 h-20 bg-sky-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <PenLine className="w-10 h-10 text-sky-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-800">أدخل عنوانك يدوياً</h3>
                <p className="text-sm text-gray-500 mt-1">اكتب تفاصيل العنوان بدقة ليصلك الطلب</p>
              </div>

              {/* المدينة */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">المدينة</label>
                <select
                  className="w-full border-2 border-gray-200 rounded-xl p-3 bg-white focus:border-sky-400 focus:outline-none"
                  onChange={(e) => setAddress(prev => {
                    const parts = prev.split('،').slice(1)
                    return e.target.value + (parts.length ? '،' + parts.join('،') : '')
                  })}
                >
                  <option value="">اختر المدينة</option>
                  <option value="الرياض">الرياض</option>
                  <option value="جدة">جدة</option>
                  <option value="مكة المكرمة">مكة المكرمة</option>
                  <option value="المدينة المنورة">المدينة المنورة</option>
                  <option value="الدمام">الدمام</option>
                  <option value="الخبر">الخبر</option>
                  <option value="الأحساء">الأحساء</option>
                  <option value="الطائف">الطائف</option>
                  <option value="تبوك">تبوك</option>
                  <option value="بريدة">بريدة</option>
                  <option value="خميس مشيط">خميس مشيط</option>
                  <option value="أبها">أبها</option>
                  <option value="القطيف">القطيف</option>
                  <option value="نجران">نجران</option>
                  <option value="جازان">جازان</option>
                  <option value="ينبع">ينبع</option>
                  <option value="حائل">حائل</option>
                </select>
              </div>

              {/* الحي */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">الحي</label>
                <input
                  type="text"
                  placeholder="مثال: حي النرجس"
                  className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-sky-400 focus:outline-none"
                  onChange={(e) => setAddress(prev => {
                    const city = prev.split('،')[0] || ''
                    return city + (e.target.value ? '، ' + e.target.value : '')
                  })}
                />
              </div>

              {/* الشارع */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">الشارع</label>
                <input
                  type="text"
                  placeholder="مثال: شارع الملك عبدالعزيز"
                  className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-sky-400 focus:outline-none"
                  onChange={(e) => setAddress(prev => {
                    const parts = prev.split('،').slice(0, 2)
                    return parts.join('،') + (e.target.value ? '، ' + e.target.value : '')
                  })}
                />
              </div>

              {/* تفاصيل إضافية */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">تفاصيل إضافية</label>
                <textarea
                  placeholder="رقم المبنى، الدور، علامة مميزة..."
                  rows={3}
                  className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-sky-400 focus:outline-none resize-none"
                  onChange={(e) => setAddress(prev => {
                    const parts = prev.split('،').slice(0, 3)
                    return parts.join('،') + (e.target.value ? '، ' + e.target.value : '')
                  })}
                />
              </div>

              {/* العنوان النهائي */}
              {address && (
                <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-green-600 mb-2">
                    <Check className="w-5 h-5" />
                    <span className="font-semibold">العنوان:</span>
                  </div>
                  <p className="text-gray-700">{address}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* قسم العنوان والتأكيد */}
        <div className="bg-white border-t p-4 space-y-3">
          {/* رسالة الخطأ */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-sm flex items-center gap-2">
              <X className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* حقل العنوان - فقط في وضع الخريطة */}
          {inputMode === 'map' && (
            <>
              <div className="relative">
                <Smartphone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="وصف العنوان (مثال: حي النرجس، شارع الملك عبدالعزيز، بجانب مسجد...)"
                  className="w-full border-2 border-gray-200 rounded-xl p-3 pr-10 focus:border-sky-400 focus:outline-none transition text-gray-800"
                />
              </div>

              {/* نصيحة */}
              <p className="text-xs text-gray-500 text-center">
                💡 أضف تفاصيل واضحة ليصلك الطلب بسرعة
              </p>
            </>
          )}

          {/* أزرار */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition"
            >
              إلغاء
            </button>
            <button
              onClick={handleConfirm}
              disabled={inputMode === 'map' && !location}
              className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white font-bold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              تأكيد الموقع
            </button>
          </div>
        </div>
      </div>

      {/* أنماط CSS للماركر */}
      <style>{`
        .custom-marker {
          background: transparent !important;
          border: none !important;
        }
        .leaflet-container {
          font-family: inherit;
        }
        .leaflet-control-zoom {
          display: none;
        }
        #location-map {
          background: #f0f9ff;
        }
      `}</style>
    </div>
  )
}
