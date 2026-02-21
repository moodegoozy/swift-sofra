import React, { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signOut, User } from 'firebase/auth'
import { auth, db } from './firebase'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { initializePushNotifications, saveFCMToken } from './utils/pushNotifications'

type Role = 'owner' | 'courier' | 'customer' | 'admin' | 'developer' | 'supervisor' | 'social_media' | 'support' | 'accountant'
type GeoLocation = { lat: number; lng: number }

// مفتاح للتحقق من تحديد الموقع في هذه الجلسة
const SESSION_LOCATION_KEY = 'broast_session_location'

type AuthContextType = {
  user: User | null,
  role: Role | null,
  loading: boolean,
  logout: () => Promise<void>,
  userLocation: GeoLocation | null,
  locationRequired: boolean,
  refreshUserData: () => Promise<void>,
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  logout: async () => {},
  userLocation: null,
  locationRequired: false,
  refreshUserData: async () => {},
})

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)
  const [userLocation, setUserLocation] = useState<GeoLocation | null>(null)
  const [locationRequired, setLocationRequired] = useState(false)

  // دالة لتحديث بيانات المستخدم (تُستدعى بعد حفظ الموقع)
  const refreshUserData = async () => {
    if (!user) return
    const snap = await getDoc(doc(db, 'users', user.uid))
    if (snap.exists()) {
      const data = snap.data()
      const r = data?.role as Role | undefined
      const loc = data?.location as GeoLocation | undefined
      const customerSavedLoc = data?.savedLocation as { lat: number; lng: number; address: string } | undefined
      
      // للعميل: استخدام savedLocation، لغيرهم: location
      if (r === 'customer' || r === 'admin') {
        const customerLoc = customerSavedLoc 
          ? { lat: customerSavedLoc.lat, lng: customerSavedLoc.lng }
          : loc || null
        setUserLocation(customerLoc)
        if (customerLoc) {
          sessionStorage.setItem(SESSION_LOCATION_KEY, JSON.stringify(customerLoc))
        }
      } else {
        setUserLocation(loc || null)
        if (loc) {
          sessionStorage.setItem(SESSION_LOCATION_KEY, JSON.stringify(loc))
        }
      }
      setLocationRequired(false)
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        const snap = await getDoc(doc(db, 'users', u.uid))
        const data = snap.data()
        const r = snap.exists() ? (data?.role as Role) : null
        setRole(r)
        
        // التحقق من الموقع - للعميل نستخدم savedLocation، لغيرهم location
        const savedLoc = data?.location as GeoLocation | undefined
        const customerSavedLoc = data?.savedLocation as { lat: number; lng: number; address: string } | undefined
        
        // التحقق من موقع الجلسة الحالية
        const sessionLocStr = sessionStorage.getItem(SESSION_LOCATION_KEY)
        const sessionLoc = sessionLocStr ? JSON.parse(sessionLocStr) as GeoLocation : null
        
        // للعميل: استخدام savedLocation المحفوظ في الملف الشخصي
        // لغيرهم: استخدام location العادي
        let currentLoc: GeoLocation | null = null
        if (r === 'customer' || r === 'admin') {
          // العميل/المشرف: الأولوية للموقع المحفوظ في الحساب
          currentLoc = customerSavedLoc 
            ? { lat: customerSavedLoc.lat, lng: customerSavedLoc.lng }
            : sessionLoc || savedLoc || null
        } else {
          currentLoc = sessionLoc || savedLoc || null
        }
        setUserLocation(currentLoc)
        
        // تحديد ما إذا كان الموقع مطلوباً
        if (r === 'customer' || r === 'admin') {
          // العميل/المشرف: لا يُطلب الموقع إذا كان محفوظاً في حسابه أو في الجلسة
          const hasLocation = !!customerSavedLoc || !!sessionLoc
          
          // 📍 إذا لم يكن هناك موقع، نحاول تحديده تلقائياً
          if (!hasLocation && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              async (pos) => {
                const autoLocation = {
                  lat: pos.coords.latitude,
                  lng: pos.coords.longitude,
                  address: 'موقعي الحالي (تلقائي)'
                }
                // حفظ الموقع في الحساب
                try {
                  await updateDoc(doc(db, 'users', u.uid), {
                    savedLocation: autoLocation,
                    location: { lat: autoLocation.lat, lng: autoLocation.lng }
                  })
                  // تحديث الحالة المحلية
                  setUserLocation({ lat: autoLocation.lat, lng: autoLocation.lng })
                  sessionStorage.setItem(SESSION_LOCATION_KEY, JSON.stringify({ lat: autoLocation.lat, lng: autoLocation.lng }))
                  setLocationRequired(false)
                } catch (err) {
                  console.warn('تعذر حفظ الموقع التلقائي:', err)
                }
              },
              (err) => {
                console.warn('تعذر تحديد الموقع تلقائياً:', err)
                // لم نتمكن من تحديد الموقع، نطلبه يدوياً
                setLocationRequired(true)
              },
              { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            )
          } else {
            setLocationRequired(!hasLocation)
          }
          
          // إذا كان عنده موقع محفوظ، نحفظه في sessionStorage للاستخدام السريع
          if (customerSavedLoc && !sessionLoc) {
            sessionStorage.setItem(SESSION_LOCATION_KEY, JSON.stringify({ lat: customerSavedLoc.lat, lng: customerSavedLoc.lng }))
          }
        } else if (r === 'owner' || r === 'courier') {
          // المندوب وصاحب المطعم: يطلب الموقع فقط إذا لم يحفظ من قبل
          setLocationRequired(!savedLoc)
        } else {
          setLocationRequired(false)
        }

        // تأكد من وجود مستند المطعم لأصحاب المطاعم
        if (r === 'owner') {
          try {
            const restRef = doc(db, 'restaurants', u.uid)
            const restSnap = await getDoc(restRef)
            if (!restSnap.exists()) {
              await setDoc(restRef, {
                name: data?.restaurantName || data?.name || 'مطعم جديد',
                ownerId: u.uid,
                email: data?.email || u.email || '',
                phone: '',
                city: '',
                location: '',
                logoUrl: '',
              }, { merge: true })
            }
          } catch (err) {
            console.warn('تعذر إنشاء مستند المطعم للمالك', err)
          }
        }

        // 🔔 تفعيل الإشعارات الفورية عند تسجيل الدخول
        try {
          await initializePushNotifications()
          // 📲 حفظ FCM token للمستخدم
          await saveFCMToken(u.uid)
          console.log('✅ تم تفعيل الإشعارات وحفظ FCM token')
        } catch (notifError) {
          console.warn('⚠️ تعذر تفعيل الإشعارات:', notifError)
        }
      } else {
        setRole(null)
        setUserLocation(null)
        setLocationRequired(false)
      }
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const logout = async () => { await signOut(auth) }

  return (
    <AuthContext.Provider value={{ user, role, loading, logout, userLocation, locationRequired, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
