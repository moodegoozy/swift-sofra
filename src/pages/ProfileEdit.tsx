// src/pages/ProfileEdit.tsx
import React, { useEffect, useState, useRef } from "react"
import { db, storage } from "@/firebase"
import { useAuth } from "@/auth"
import { doc, getDoc, updateDoc, setDoc, serverTimestamp, arrayUnion } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { useDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { LocationPicker } from '@/components/LocationPicker'
import { User, MapPin, Phone, Building2, Home, Save, RefreshCw, Navigation, Trash2, Plus, Star, Check, Camera, Upload, X, History, ShoppingBag, Heart, Bell, Wallet, CreditCard, ArrowDownCircle, ArrowUpCircle, Copy, CheckCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js'
import { PAYPAL_CONFIG, getPayPalOptions } from '@/utils/paypal'

type SavedLocation = { lat: number; lng: number; address: string; label?: string }

export const ProfileEdit: React.FC = () => {
  const { user, role } = useAuth()
  const dialog = useDialog()
  const toast = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    name: "",
    phone: "",
    city: "",
    address: "",
    restaurantName: ""
  })
  // صورة البروفايل
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  // إحصائيات العميل
  const [stats, setStats] = useState({
    totalOrders: 0,
    favoriteRestaurants: 0,
    pendingOrders: 0
  })
  // 💰 المحفظة
  const [walletBalance, setWalletBalance] = useState(0)
  const [walletTransactions, setWalletTransactions] = useState<any[]>([])
  const [showRechargeModal, setShowRechargeModal] = useState(false)
  const [rechargeAmount, setRechargeAmount] = useState('')
  const [recharging, setRecharging] = useState(false)
  const [paypalReady, setPaypalReady] = useState(false)

  // دعم عناوين متعددة
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([])
  const [defaultLocationIndex, setDefaultLocationIndex] = useState<number>(0)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [editingLocationIndex, setEditingLocationIndex] = useState<number | null>(null)
  const [newLocationLabel, setNewLocationLabel] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // تحميل البيانات الحالية
  useEffect(() => {
    if (!user) return
    const load = async () => {
      const snap = await getDoc(doc(db, "users", user.uid))
      if (snap.exists()) {
        const data = snap.data()
        setForm({
          name: data.name || "",
          phone: data.phone || user.phoneNumber || "",
          city: data.city || "",
          address: data.address || "",
          restaurantName: data.restaurantName || ""
        })
        setPhotoUrl(data.photoUrl || null)
        // تحميل العناوين المحفوظة (دعم التنسيق القديم والجديد)
        if (data.savedLocations && Array.isArray(data.savedLocations)) {
          setSavedLocations(data.savedLocations)
          setDefaultLocationIndex(data.defaultLocationIndex || 0)
        } else if (data.savedLocation) {
          // تحويل التنسيق القديم (عنوان واحد) للجديد (قائمة عناوين)
          setSavedLocations([{ ...data.savedLocation, label: 'المنزل' }])
          setDefaultLocationIndex(0)
        }
      }
      
      // جلب محفظة العميل
      if (role === 'customer') {
        try {
          const walletSnap = await getDoc(doc(db, 'wallets', user.uid))
          if (walletSnap.exists()) {
            const walletData = walletSnap.data()
            setWalletBalance(walletData?.balance || 0)
            setWalletTransactions(walletData?.transactions || [])
          }
        } catch (err) {
          console.warn('Error loading wallet:', err)
        }
      }

      // جلب إحصائيات العميل
      if (role === 'customer') {
        try {
          const { collection, query, where, getDocs } = await import('firebase/firestore')
          // عدد الطلبات الكلي
          const ordersQuery = query(collection(db, 'orders'), where('customerId', '==', user.uid))
          const ordersSnap = await getDocs(ordersQuery)
          const pendingOrders = ordersSnap.docs.filter(d => ['pending', 'accepted', 'preparing', 'ready', 'out_for_delivery'].includes(d.data().status)).length
          
          // عدد المتاجر المتابَعة
          const followsQuery = query(collection(db, 'storeFollowers'), where('followerId', '==', user.uid))
          const followsSnap = await getDocs(followsQuery)
          
          setStats({
            totalOrders: ordersSnap.size,
            favoriteRestaurants: followsSnap.size,
            pendingOrders
          })
        } catch (err) {
          console.warn('Error loading stats:', err)
        }
      }
      
      setLoading(false)
    }
    load()
  }, [user, role])

  // حفظ التعديلات
  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    
    setSaving(true)
    try {
      // حفظ العنوان الافتراضي كـ savedLocation للتوافق مع auth.tsx
      const defaultLoc = savedLocations[defaultLocationIndex] || null
      
      await updateDoc(doc(db, "users", user.uid), {
        name: form.name,
        phone: form.phone,
        city: form.city,
        address: form.address,
        photoUrl: photoUrl,
        savedLocation: defaultLoc, // العنوان الافتراضي للتوافق
        savedLocations: savedLocations, // قائمة كل العناوين
        defaultLocationIndex: defaultLocationIndex,
        ...(role === 'owner' && { restaurantName: form.restaurantName })
      })
      dialog.success('تم تحديث بياناتك بنجاح! ✅')
    } catch (err) {
      dialog.error('فشل في حفظ البيانات')
    } finally {
      setSaving(false)
    }
  }

  // رفع صورة البروفايل
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    
    // التحقق من نوع الملف
    if (!file.type.startsWith('image/')) {
      toast.error('الرجاء اختيار صورة صالحة')
      return
    }
    
    // التحقق من حجم الملف (أقصى 5 MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة يجب أن يكون أقل من 5 ميجابايت')
      return
    }
    
    setUploadingPhoto(true)
    try {
      const fileRef = ref(storage, `users/${user.uid}/profile.${file.name.split('.').pop()}`)
      await uploadBytes(fileRef, file)
      const url = await getDownloadURL(fileRef)
      setPhotoUrl(url)
      toast.success('تم رفع الصورة! اضغط حفظ لتأكيد التغييرات')
    } catch (err) {
      console.error('Error uploading photo:', err)
      toast.error('فشل في رفع الصورة')
    } finally {
      setUploadingPhoto(false)
    }
  }

  // حذف صورة البروفايل
  const handleRemovePhoto = () => {
    setPhotoUrl(null)
    toast.info('تم حذف الصورة! اضغط حفظ لتأكيد التغييرات')
  }

  // 💰 معالجة نجاح الدفع بـ PayPal
  const handlePayPalSuccess = async (details: any) => {
    if (!user) return
    
    const amount = parseFloat(rechargeAmount)
    setRecharging(true)
    
    try {
      const { collection, addDoc } = await import('firebase/firestore')
      
      // حفظ سجل المعاملة
      await addDoc(collection(db, 'rechargeRequests'), {
        userId: user.uid,
        userName: form.name || user.email,
        userPhone: form.phone,
        amount: amount,
        paymentMethod: 'paypal',
        paypalOrderId: details.id,
        paypalPayerId: details.payer?.payer_id,
        paypalEmail: details.payer?.email_address,
        status: 'approved', // موافق تلقائياً لأن PayPal أكد الدفع
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      
      // تحديث رصيد المحفظة
      const walletRef = doc(db, 'wallets', user.uid)
      const walletSnap = await getDoc(walletRef)
      
      const newTransaction = {
        id: details.id,
        type: 'credit',
        amount: amount,
        description: 'شحن عبر PayPal',
        paypalOrderId: details.id,
        createdAt: new Date()
      }
      
      if (walletSnap.exists()) {
        const currentBalance = walletSnap.data()?.balance || 0
        await updateDoc(walletRef, {
          balance: currentBalance + amount,
          transactions: arrayUnion(newTransaction),
          updatedAt: serverTimestamp()
        })
        setWalletBalance(currentBalance + amount)
      } else {
        await setDoc(walletRef, {
          id: user.uid,
          balance: amount,
          totalEarnings: amount,
          totalWithdrawn: 0,
          transactions: [newTransaction],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })
        setWalletBalance(amount)
      }
      
      // تحديث قائمة المعاملات
      setWalletTransactions(prev => [newTransaction, ...prev])
      
      dialog.success(`تم شحن ${amount} ريال بنجاح! ✅`)
      setRechargeAmount('')
      setShowRechargeModal(false)
    } catch (err) {
      console.error('Error processing PayPal payment:', err)
      dialog.error('فشل في معالجة الدفع')
    } finally {
      setRecharging(false)
    }
  }

  // إضافة عنوان جديد
  const handleAddLocation = (loc: { lat: number; lng: number }, addr: string) => {
    const newLoc: SavedLocation = {
      lat: loc.lat,
      lng: loc.lng,
      address: addr,
      label: newLocationLabel || `عنوان ${savedLocations.length + 1}`
    }
    setSavedLocations([...savedLocations, newLoc])
    setNewLocationLabel('')
    setShowLocationPicker(false)
    toast.success('تم إضافة العنوان! اضغط حفظ لتأكيد التغييرات')
  }

  // تعديل عنوان موجود
  const handleEditLocation = (loc: { lat: number; lng: number }, addr: string) => {
    if (editingLocationIndex === null) return
    const updated = [...savedLocations]
    updated[editingLocationIndex] = {
      ...updated[editingLocationIndex],
      lat: loc.lat,
      lng: loc.lng,
      address: addr
    }
    setSavedLocations(updated)
    setEditingLocationIndex(null)
    setShowLocationPicker(false)
    toast.success('تم تحديث العنوان! اضغط حفظ لتأكيد التغييرات')
  }

  // حذف عنوان
  const handleDeleteLocation = async (index: number) => {
    const confirmed = await dialog.confirm('هل تريد حذف هذا العنوان؟')
    if (!confirmed) return
    
    const updated = savedLocations.filter((_, i) => i !== index)
    setSavedLocations(updated)
    
    // تحديث الفهرس الافتراضي
    if (defaultLocationIndex >= updated.length) {
      setDefaultLocationIndex(Math.max(0, updated.length - 1))
    } else if (defaultLocationIndex > index) {
      setDefaultLocationIndex(defaultLocationIndex - 1)
    }
    
    toast.info('تم حذف العنوان')
  }

  // تعيين عنوان كافتراضي
  const handleSetDefault = (index: number) => {
    setDefaultLocationIndex(index)
    toast.success('تم تعيين العنوان كافتراضي')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-lg">
        <RefreshCw className="w-6 h-6 animate-spin ml-2" />
        جارِ تحميل البيانات...
      </div>
    )
  }

  // تحديد العنوان حسب الدور
  const getTitle = () => {
    if (role === 'owner') return 'تعديل بيانات المطعم'
    if (role === 'courier') return 'تعديل بيانات المندوب'
    if (role === 'admin') return 'تعديل بيانات المشرف'
    return 'تعديل بياناتي'
  }

  return (
    <div className="max-w-md mx-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow-xl p-6">
        {/* العنوان مع صورة البروفايل */}
        <div className="flex flex-col items-center gap-4 mb-6">
          {/* صورة البروفايل */}
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-sky-100 border-4 border-sky-200 shadow-lg">
              {photoUrl ? (
                <img src={photoUrl} alt="صورتي" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-12 h-12 text-sky-400" />
                </div>
              )}
            </div>
            
            {/* زر تغيير الصورة */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="absolute bottom-0 right-0 w-8 h-8 bg-sky-500 hover:bg-sky-600 text-white rounded-full shadow-lg flex items-center justify-center transition disabled:opacity-50"
            >
              {uploadingPhoto ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
            
            {/* زر حذف الصورة */}
            {photoUrl && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="absolute top-0 right-0 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg flex items-center justify-center transition opacity-0 group-hover:opacity-100"
              >
                <X className="w-3 h-3" />
              </button>
            )}
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>
          
          <div className="text-center">
            <h1 className="text-xl font-bold text-gray-800">{getTitle()}</h1>
            <p className="text-sm text-gray-500">{user?.email || user?.phoneNumber}</p>
          </div>
        </div>

        {/* 📊 إحصائيات سريعة للعميل */}
        {role === 'customer' && (
          <div className="grid grid-cols-3 gap-3 mb-6">
            <Link 
              to="/orders"
              className="bg-sky-50 rounded-xl p-3 text-center hover:bg-sky-100 transition"
            >
              <ShoppingBag className="w-6 h-6 text-sky-500 mx-auto mb-1" />
              <p className="text-2xl font-black text-sky-600">{stats.totalOrders}</p>
              <p className="text-xs text-gray-500">طلباتي</p>
            </Link>
            
            <div className="bg-pink-50 rounded-xl p-3 text-center">
              <Heart className="w-6 h-6 text-pink-500 mx-auto mb-1" />
              <p className="text-2xl font-black text-pink-600">{stats.favoriteRestaurants}</p>
              <p className="text-xs text-gray-500">متابَع</p>
            </div>
            
            <Link 
              to="/orders"
              className="bg-amber-50 rounded-xl p-3 text-center hover:bg-amber-100 transition"
            >
              <History className="w-6 h-6 text-amber-500 mx-auto mb-1" />
              <p className="text-2xl font-black text-amber-600">{stats.pendingOrders}</p>
              <p className="text-xs text-gray-500">قيد التنفيذ</p>
            </Link>
          </div>
        )}

        {/* � محفظة العميل */}
        {role === 'customer' && (
          <div className="mb-6">
            <div className="bg-gradient-to-br from-sky-500 via-sky-600 to-sky-700 rounded-2xl p-5 text-white shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <span className="font-bold">محفظتي</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRechargeModal(true)}
                  className="px-4 py-2 bg-white text-sky-600 rounded-xl font-bold text-sm hover:bg-sky-50 transition flex items-center gap-1"
                >
                  <ArrowDownCircle className="w-4 h-4" />
                  شحن
                </button>
              </div>
              
              <div className="text-center py-3">
                <p className="text-sky-100 text-sm mb-1">الرصيد الحالي</p>
                <p className="text-4xl font-black">{walletBalance.toFixed(2)} <span className="text-lg">ر.س</span></p>
              </div>
              
              {walletTransactions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/20">
                  <p className="text-xs text-sky-100 mb-2">آخر المعاملات</p>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {walletTransactions.slice(-3).reverse().map((tx: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-sm bg-white/10 rounded-lg p-2">
                        <div className="flex items-center gap-2">
                          {tx.type === 'credit' ? (
                            <ArrowDownCircle className="w-4 h-4 text-green-300" />
                          ) : (
                            <ArrowUpCircle className="w-4 h-4 text-red-300" />
                          )}
                          <span className="text-xs">{tx.description || (tx.type === 'credit' ? 'شحن' : 'خصم')}</span>
                        </div>
                        <span className={tx.type === 'credit' ? 'text-green-300 font-bold' : 'text-red-300 font-bold'}>
                          {tx.type === 'credit' ? '+' : '-'}{tx.amount} ر.س
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* �🔔 روابط سريعة للعميل */}
        {role === 'customer' && (
          <div className="flex gap-2 mb-6">
            <Link
              to="/notifications"
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition text-gray-700 font-medium"
            >
              <Bell className="w-5 h-5" />
              الإشعارات
            </Link>
            <Link
              to="/orders"
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition text-gray-700 font-medium"
            >
              <ShoppingBag className="w-5 h-5" />
              طلباتي
            </Link>
          </div>
        )}

        <form onSubmit={save} className="space-y-4">
          {/* الاسم */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              <User className="w-4 h-4 inline ml-1" />
              الاسم الكامل
            </label>
            <input
              className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-sky-400 focus:outline-none transition"
              placeholder="أدخل اسمك"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          {/* رقم الجوال */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              <Phone className="w-4 h-4 inline ml-1" />
              رقم الجوال
            </label>
            <input
              className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-sky-400 focus:outline-none transition"
              placeholder="05xxxxxxxx"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              dir="ltr"
            />
          </div>

          {/* المدينة */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              <Building2 className="w-4 h-4 inline ml-1" />
              المدينة
            </label>
            <input
              className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-sky-400 focus:outline-none transition"
              placeholder="مثال: الرياض"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </div>

          {/* العنوان / الموقع */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              <MapPin className="w-4 h-4 inline ml-1" />
              العنوان التفصيلي
            </label>
            <textarea
              className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-sky-400 focus:outline-none transition h-24"
              placeholder="الحي، الشارع، رقم المبنى، معلومات إضافية..."
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          {/* 📍 العناوين المحفوظة للتوصيل - للعملاء والمشرفين فقط */}
          {(role === 'customer' || role === 'admin') && (
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-1">
                  <Navigation className="w-4 h-4" />
                  عناوين التوصيل المحفوظة
                </label>
                <span className="text-xs text-gray-400">{savedLocations.length}/5</span>
              </div>
              
              {/* قائمة العناوين */}
              {savedLocations.length > 0 && (
                <div className="space-y-3 mb-4">
                  {savedLocations.map((loc, index) => (
                    <div 
                      key={index}
                      className={`rounded-xl p-3 border-2 transition ${
                        index === defaultLocationIndex 
                          ? 'bg-green-50 border-green-300' 
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          index === defaultLocationIndex ? 'bg-green-500' : 'bg-gray-400'
                        }`}>
                          <MapPin className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-gray-800">{loc.label || `عنوان ${index + 1}`}</p>
                            {index === defaultLocationIndex && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full">
                                <Star className="w-3 h-3" /> افتراضي
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">{loc.address}</p>
                        </div>
                      </div>
                      
                      {/* أزرار الإجراءات */}
                      <div className="flex gap-2 mt-3">
                        {index !== defaultLocationIndex && (
                          <button
                            type="button"
                            onClick={() => handleSetDefault(index)}
                            className="flex-1 py-2 px-3 rounded-lg border border-green-200 text-green-600 text-xs font-medium hover:bg-green-50 transition flex items-center justify-center gap-1"
                          >
                            <Check className="w-3 h-3" /> تعيين كافتراضي
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingLocationIndex(index)
                            setShowLocationPicker(true)
                          }}
                          className="flex-1 py-2 px-3 rounded-lg border border-sky-200 text-sky-600 text-xs font-medium hover:bg-sky-50 transition"
                        >
                          تعديل
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLocation(index)}
                          className="py-2 px-3 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* زر إضافة عنوان جديد */}
              {savedLocations.length < 5 && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newLocationLabel}
                    onChange={(e) => setNewLocationLabel(e.target.value)}
                    placeholder="اسم العنوان (مثال: المنزل، العمل...)"
                    className="w-full border-2 border-gray-200 rounded-xl p-3 text-sm focus:border-sky-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLocationIndex(null)
                      setShowLocationPicker(true)
                    }}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-sky-100 to-sky-50 border-2 border-dashed border-sky-300 text-sky-600 font-semibold hover:border-sky-400 transition flex items-center justify-center gap-3"
                  >
                    <Plus className="w-5 h-5" />
                    <span>إضافة عنوان جديد</span>
                  </button>
                </div>
              )}

              {savedLocations.length === 0 && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  💡 أضف عناوينك المفضلة لتسهيل الطلب
                </p>
              )}
            </div>
          )}

          {/* اسم المطعم - لصاحب المطعم فقط */}
          {role === 'owner' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                <Home className="w-4 h-4 inline ml-1" />
                اسم المطعم
              </label>
              <input
                className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-sky-400 focus:outline-none transition"
                placeholder="اسم المطعم"
                value={form.restaurantName}
                onChange={(e) => setForm({ ...form, restaurantName: e.target.value })}
              />
            </div>
          )}

          {/* زر الحفظ */}
          <button 
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-bold p-4 rounded-xl shadow-lg transition disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                جارِ الحفظ...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                حفظ التعديلات
              </>
            )}
          </button>
        </form>

        {/* معلومات إضافية */}
        <div className="mt-6 pt-4 border-t text-center text-sm text-gray-500">
          <p>💡 يمكنك تعديل بياناتك في أي وقت</p>
          {(role === 'customer' || role === 'admin') && (
            <p className="mt-1">📍 يمكنك حفظ حتى 5 عناوين مختلفة</p>
          )}
        </div>
      </div>

      {/* 💰 نافذة شحن المحفظة بـ PayPal */}
      {showRechargeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-sky-500" />
                شحن المحفظة
              </h3>
              <button
                onClick={() => setShowRechargeModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-5 space-y-4">
              {/* رصيد حالي */}
              <div className="bg-gradient-to-br from-sky-500 to-sky-600 rounded-xl p-4 text-center text-white">
                <p className="text-sm text-sky-100 mb-1">رصيدك الحالي</p>
                <p className="text-3xl font-black">{walletBalance.toFixed(2)} ر.س</p>
              </div>
              
              {/* مبلغ الشحن */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  اختر مبلغ الشحن (ريال)
                </label>
                <input
                  type="number"
                  value={rechargeAmount}
                  onChange={(e) => setRechargeAmount(e.target.value)}
                  placeholder="أدخل المبلغ (10 - 1000)"
                  className="w-full border-2 border-gray-200 rounded-xl p-4 text-lg font-bold text-center focus:border-sky-400 focus:outline-none"
                  min="10"
                  max="1000"
                  dir="ltr"
                />
              </div>
              
              {/* اختيار سريع */}
              <div className="grid grid-cols-4 gap-2">
                {[20, 50, 100, 200].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setRechargeAmount(amt.toString())}
                    className={`py-3 rounded-xl font-bold text-sm transition ${
                      rechargeAmount === amt.toString()
                        ? 'bg-sky-500 text-white shadow-lg scale-105'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {amt} ر.س
                  </button>
                ))}
              </div>
              
              {/* زر PayPal */}
              {rechargeAmount && parseFloat(rechargeAmount) >= 10 && parseFloat(rechargeAmount) <= 1000 && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-center text-gray-600 mb-3">
                    💳 ادفع <span className="font-bold text-sky-600">{rechargeAmount} ر.س</span> 
                    <span className="text-gray-400 text-xs mr-1">(≈ ${PAYPAL_CONFIG.sarToUsd(parseFloat(rechargeAmount))})</span>
                    عبر PayPal
                  </p>
                  
                  <PayPalScriptProvider options={getPayPalOptions()}>
                    <PayPalButtons
                      style={{
                        layout: 'vertical',
                        shape: 'pill',
                        color: 'blue',
                        label: 'pay',
                        height: 50
                      }}
                      disabled={recharging}
                      createOrder={(_data, actions) => {
                        const usdAmount = PAYPAL_CONFIG.sarToUsd(parseFloat(rechargeAmount))
                        return actions.order.create({
                          intent: 'CAPTURE',
                          purchase_units: [{
                            amount: {
                              currency_code: 'USD',
                              value: usdAmount.toString()
                            },
                            description: `شحن محفظة سفرة البيت - ${rechargeAmount} ر.س`
                          }]
                        })
                      }}
                      onApprove={async (_data, actions) => {
                        if (actions.order) {
                          const details = await actions.order.capture()
                          handlePayPalSuccess(details)
                        }
                      }}
                      onError={(err) => {
                        console.error('PayPal Error:', err)
                        toast.error('حدث خطأ في عملية الدفع')
                      }}
                      onCancel={() => {
                        toast.info('تم إلغاء عملية الدفع')
                      }}
                    />
                  </PayPalScriptProvider>
                  
                  {recharging && (
                    <div className="flex items-center justify-center gap-2 mt-3 text-sky-600">
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      <span>جارِ معالجة الدفع...</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* رسالة توضيحية */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-blue-800">الدفع الآمن عبر PayPal</p>
                    <p className="text-xs text-blue-700 mt-1">
                      يتم إضافة الرصيد فوراً بعد إتمام الدفع. يمكنك استخدام بطاقة Visa/Mastercard أو حساب PayPal.
                    </p>
                  </div>
                </div>
              </div>
              
              <p className="text-xs text-center text-gray-400">
                🔒 جميع المعاملات مشفرة وآمنة
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Location Picker Modal */}
      <LocationPicker
        isOpen={showLocationPicker}
        onClose={() => {
          setShowLocationPicker(false)
          setEditingLocationIndex(null)
        }}
        onConfirm={(loc, addr) => {
          if (editingLocationIndex !== null) {
            handleEditLocation(loc, addr)
          } else {
            handleAddLocation(loc, addr)
          }
        }}
        initialLocation={
          editingLocationIndex !== null && savedLocations[editingLocationIndex]
            ? { lat: savedLocations[editingLocationIndex].lat, lng: savedLocations[editingLocationIndex].lng }
            : null
        }
      />
    </div>
  )
}
