import React, { useEffect, useState, useRef } from 'react'
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, query, where } from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL, getStorage } from 'firebase/storage'
import { db, app } from '@/firebase'
import { useAuth } from '@/auth'
import { RoleGate } from '@/routes/RoleGate'
import { useToast } from '@/components/ui/Toast'
import { useDialog } from '@/components/ui/ConfirmDialog'
import { Restaurant } from '@/types'
import { Trash2, Plus, UserCheck, Upload, Image, Shield, Award, Medal, Crown, CheckCircle, XCircle, ChevronDown, Edit, X, Store, Phone, MapPin, Building2 } from 'lucide-react'

export const AdminRestaurants: React.FC = () => {
  const { user, role } = useAuth()
  const toast = useToast()
  const dialog = useDialog()
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const editFileRef = useRef<HTMLInputElement>(null)
  const storage = getStorage(app)
  
  // حالة التعديل
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null)
  const [editFormData, setEditFormData] = useState({
    name: '',
    phone: '',
    city: '',
    location: '',
    isOpen: true,
    allowDelivery: true,
    allowPickup: false,
    logoFile: null as File | null,
    logoPreview: '',
  })
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    city: '',
    location: '',
    logoFile: null as File | null,
    logoPreview: '',
  })

  // تحميل المطاعم
  useEffect(() => {
    if (user) {
      loadRestaurants()
    }
  }, [user])

  const loadRestaurants = async () => {
    if (!user) return
    
    try {
      // المشرف يرى فقط المطاعم المسجلة بواسطته
      // المطور يرى كل المطاعم
      let data: Restaurant[] = []
      
      if (role === 'developer') {
        // المطور يرى كل المطاعم
        const snap = await getDocs(collection(db, 'restaurants'))
        data = snap.docs.map(d => ({
          id: d.id,
          ...d.data(),
        } as Restaurant))
      } else {
        // المشرف يرى فقط المطاعم التابعة له
        const myRestaurantsQuery = query(
          collection(db, 'restaurants'),
          where('referredBy', '==', user.uid)
        )
        const snap = await getDocs(myRestaurantsQuery)
        data = snap.docs.map(d => ({
          id: d.id,
          ...d.data(),
        } as Restaurant))
      }
      
      setRestaurants(data)
    } catch (err) {
      toast.error('خطأ في تحميل المطاعم')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddRestaurant = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.warning('أدخل اسم المطعم')
      return
    }

    try {
      setUploading(true)
      
      // رفع الشعار إذا وُجد
      let logoUrl = ''
      if (formData.logoFile) {
        const safeName = formData.logoFile.name.replace(/\s+/g, '_').slice(-60)
        const path = `uploads/restaurant_${Date.now()}_${safeName}`
        const storageRef = ref(storage, path)
        
        const task = uploadBytesResumable(storageRef, formData.logoFile, {
          contentType: formData.logoFile.type || 'image/jpeg',
        })
        
        await new Promise<void>((resolve, reject) => {
          task.on(
            'state_changed',
            (snap) => {
              const progress = Math.round((snap.bytesTransferred / snap.totalBytes) * 100)
              setUploadProgress(progress)
            },
            reject,
            async () => {
              logoUrl = await getDownloadURL(task.snapshot.ref)
              resolve()
            }
          )
        })
      }
      
      // 💰 تحديد نوع المُضيف ومعلومات الإحالة
      const isAdmin = role === 'admin'
      const isDev = role === 'developer'
      
      await addDoc(collection(db, 'restaurants'), {
        name: formData.name,
        phone: formData.phone,
        city: formData.city,
        location: formData.location,
        ownerId: 'admin_' + Date.now(),
        email: user?.email || '',
        logoUrl: logoUrl,
        createdAt: new Date(),
        // 💰 نظام العمولات - حفظ من أضاف المطعم
        referredBy: isAdmin ? user?.uid : null,
        referrerType: isAdmin ? 'admin' : (isDev ? 'developer' : null),
      })

      toast.success('تم إضافة المطعم بنجاح ✅')
      if (isAdmin) {
        toast.info('💰 ستحصل على 75 هللة من كل منتج يُطلب من هذا المطعم')
      }
      setFormData({ name: '', phone: '', city: '', location: '', logoFile: null, logoPreview: '' })
      setShowForm(false)
      setUploadProgress(0)
      loadRestaurants()
    } catch (err) {
      toast.error('خطأ في إضافة المطعم')
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  // بدء تعديل المطعم
  const handleStartEdit = (restaurant: Restaurant) => {
    setEditingRestaurant(restaurant)
    setEditFormData({
      name: restaurant.name || '',
      phone: restaurant.phone || '',
      city: restaurant.city || '',
      location: restaurant.location || '',
      isOpen: restaurant.isOpen !== false,
      allowDelivery: restaurant.allowDelivery !== false,
      allowPickup: restaurant.allowPickup === true,
      logoFile: null,
      logoPreview: restaurant.logoUrl || '',
    })
  }

  // إلغاء التعديل
  const handleCancelEdit = () => {
    setEditingRestaurant(null)
    setEditFormData({
      name: '',
      phone: '',
      city: '',
      location: '',
      isOpen: true,
      allowDelivery: true,
      allowPickup: false,
      logoFile: null,
      logoPreview: '',
    })
  }

  // حفظ التعديلات
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRestaurant) return

    if (!editFormData.name.trim()) {
      toast.warning('أدخل اسم المطعم')
      return
    }

    try {
      setUploading(true)
      
      // رفع الشعار الجديد إذا وُجد
      let logoUrl = editFormData.logoPreview
      if (editFormData.logoFile) {
        const safeName = editFormData.logoFile.name.replace(/\s+/g, '_').slice(-60)
        const path = `uploads/restaurant_${Date.now()}_${safeName}`
        const storageRef = ref(storage, path)
        
        const task = uploadBytesResumable(storageRef, editFormData.logoFile, {
          contentType: editFormData.logoFile.type || 'image/jpeg',
        })
        
        await new Promise<void>((resolve, reject) => {
          task.on(
            'state_changed',
            (snap) => {
              const progress = Math.round((snap.bytesTransferred / snap.totalBytes) * 100)
              setUploadProgress(progress)
            },
            reject,
            async () => {
              logoUrl = await getDownloadURL(task.snapshot.ref)
              resolve()
            }
          )
        })
      }
      
      // تحديث بيانات المطعم
      await updateDoc(doc(db, 'restaurants', editingRestaurant.id), {
        name: editFormData.name,
        phone: editFormData.phone,
        city: editFormData.city,
        location: editFormData.location,
        isOpen: editFormData.isOpen,
        allowDelivery: editFormData.allowDelivery,
        allowPickup: editFormData.allowPickup,
        logoUrl: logoUrl,
        updatedAt: serverTimestamp(),
      })

      toast.success('تم تحديث المطعم بنجاح ✅')
      handleCancelEdit()
      setUploadProgress(0)
      loadRestaurants()
    } catch (err) {
      toast.error('خطأ في تحديث المطعم')
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    const confirmed = await dialog.confirm('هل أنت متأكد من حذف هذا المطعم؟', { dangerous: true, title: 'حذف المطعم' })
    if (!confirmed) return

    try {
      await deleteDoc(doc(db, 'restaurants', id))
      toast.success('تم حذف المطعم بنجاح')
      loadRestaurants()
    } catch (err) {
      toast.error('خطأ في حذف المطعم')
      console.error(err)
    }
  }

  // تحديث حالة التوثيق
  const handleToggleVerified = async (restaurant: Restaurant) => {
    const newStatus = !restaurant.isVerified
    const confirmed = await dialog.confirm(
      newStatus 
        ? `هل تريد توثيق أسرة "${restaurant.name}"؟` 
        : `هل تريد إلغاء توثيق أسرة "${restaurant.name}"؟`,
      { 
        title: newStatus ? '✅ توثيق الأسرة' : '❌ إلغاء التوثيق',
        confirmText: newStatus ? 'نعم، وثّق' : 'نعم، ألغِ التوثيق',
      }
    )
    if (!confirmed) return

    try {
      await updateDoc(doc(db, 'restaurants', restaurant.id), {
        isVerified: newStatus,
        verifiedAt: newStatus ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
      })
      toast.success(newStatus ? 'تم توثيق الأسرة ✅' : 'تم إلغاء التوثيق')
      loadRestaurants()
    } catch (err) {
      toast.error('حدث خطأ')
      console.error(err)
    }
  }

  // تحديث تصنيف البائع
  const handleUpdateTier = async (restaurant: Restaurant, tier: 'bronze' | 'silver' | 'gold') => {
    try {
      await updateDoc(doc(db, 'restaurants', restaurant.id), {
        sellerTier: tier,
        tierUpdatedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      const tierNames = { bronze: 'برونزي', silver: 'فضي', gold: 'ذهبي' }
      toast.success(`تم تحديث التصنيف إلى ${tierNames[tier]} 🏆`)
      loadRestaurants()
    } catch (err) {
      toast.error('حدث خطأ')
      console.error(err)
    }
  }

  // مكون شارة التصنيف
  const TierBadge: React.FC<{ tier?: string }> = ({ tier }) => {
    switch (tier) {
      case 'gold':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-400 to-yellow-400 text-white text-xs font-bold rounded-full shadow">
            <Crown className="w-3 h-3" /> Gold
          </span>
        )
      case 'silver':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800 text-xs font-bold rounded-full shadow">
            <Medal className="w-3 h-3" /> Silver
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-xs font-bold rounded-full shadow">
            <Award className="w-3 h-3" /> Bronze
          </span>
        )
    }
  }

  if (loading) {
    return (
      <RoleGate allow={['admin', 'developer']}>
        <div className="flex items-center justify-center h-96">جارِ التحميل...</div>
      </RoleGate>
    )
  }

  return (
    <RoleGate allow={['admin', 'developer']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-primary">المطاعم المضافة</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-primary hover:bg-red-900 text-white px-6 py-3 rounded-xl font-semibold transition"
          >
            <Plus className="w-5 h-5" /> مطعم جديد
          </button>
        </div>

        {/* نموذج الإضافة */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-xl font-bold mb-4">إضافة مطعم جديد</h2>
            <form onSubmit={handleAddRestaurant} className="space-y-4">
              {/* شعار المطعم */}
              <div className="space-y-2">
                <label className="block font-semibold text-gray-700">شعار المطعم</label>
                <div className="flex items-center gap-4">
                  {formData.logoPreview ? (
                    <img 
                      src={formData.logoPreview} 
                      alt="معاينة الشعار" 
                      className="w-20 h-20 rounded-xl object-cover border-2 border-sky-200"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                      <Image className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setFormData({
                            ...formData,
                            logoFile: file,
                            logoPreview: URL.createObjectURL(file)
                          })
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2 bg-sky-100 hover:bg-sky-200 text-sky-700 rounded-xl font-semibold transition"
                    >
                      <Upload className="w-4 h-4" />
                      {formData.logoFile ? 'تغيير الصورة' : 'رفع شعار'}
                    </button>
                    {formData.logoFile && (
                      <p className="text-xs text-gray-500 mt-1">{formData.logoFile.name}</p>
                    )}
                  </div>
                </div>
                {uploading && uploadProgress > 0 && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-sky-500 h-2 rounded-full transition-all" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </div>
              
              <input
                type="text"
                placeholder="اسم المطعم"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full border rounded-xl p-3 text-gray-900"
              />
              <input
                type="text"
                placeholder="رقم الهاتف"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full border rounded-xl p-3 text-gray-900"
              />
              <input
                type="text"
                placeholder="المدينة"
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
                className="w-full border rounded-xl p-3 text-gray-900"
              />
              <textarea
                placeholder="الموقع / العنوان"
                value={formData.location}
                onChange={e => setFormData({ ...formData, location: e.target.value })}
                className="w-full border rounded-xl p-3 text-gray-900"
              />
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 bg-primary hover:bg-red-900 text-white rounded-xl p-3 font-semibold transition disabled:opacity-50"
                >
                  {uploading ? `جارٍ الرفع... ${uploadProgress}%` : '✅ حفظ'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl p-3 font-semibold transition"
                >
                  ❌ إلغاء
                </button>
              </div>
            </form>
          </div>
        )}

        {/* نموذج تعديل المطعم (Modal) */}
        {editingRestaurant && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-xl font-bold text-primary">تعديل المطعم</h2>
                <button
                  onClick={handleCancelEdit}
                  className="p-2 hover:bg-gray-100 rounded-xl transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
                {/* شعار المطعم */}
                <div className="space-y-2">
                  <label className="block font-semibold text-gray-700">شعار المطعم</label>
                  <div className="flex items-center gap-4">
                    {editFormData.logoPreview ? (
                      <img 
                        src={editFormData.logoPreview} 
                        alt="معاينة الشعار" 
                        className="w-20 h-20 rounded-xl object-cover border-2 border-sky-200"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                        <Image className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <input
                        ref={editFileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            setEditFormData({
                              ...editFormData,
                              logoFile: file,
                              logoPreview: URL.createObjectURL(file)
                            })
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => editFileRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-sky-100 hover:bg-sky-200 text-sky-700 rounded-xl font-semibold transition"
                      >
                        <Upload className="w-4 h-4" />
                        {editFormData.logoFile ? 'تغيير الصورة' : 'رفع شعار جديد'}
                      </button>
                    </div>
                  </div>
                  {uploading && uploadProgress > 0 && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-sky-500 h-2 rounded-full transition-all" 
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
                
                {/* اسم المطعم */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    <Store className="w-4 h-4 inline ml-1" />
                    اسم المطعم
                  </label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full border rounded-xl p-3 text-gray-900"
                    placeholder="اسم المطعم"
                  />
                </div>
                
                {/* رقم الهاتف */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    <Phone className="w-4 h-4 inline ml-1" />
                    رقم الهاتف
                  </label>
                  <input
                    type="text"
                    value={editFormData.phone}
                    onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full border rounded-xl p-3 text-gray-900"
                    placeholder="05xxxxxxxx"
                  />
                </div>
                
                {/* المدينة */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    <Building2 className="w-4 h-4 inline ml-1" />
                    المدينة
                  </label>
                  <input
                    type="text"
                    value={editFormData.city}
                    onChange={e => setEditFormData({ ...editFormData, city: e.target.value })}
                    className="w-full border rounded-xl p-3 text-gray-900"
                    placeholder="المدينة"
                  />
                </div>
                
                {/* الموقع */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    <MapPin className="w-4 h-4 inline ml-1" />
                    الموقع / العنوان
                  </label>
                  <textarea
                    value={editFormData.location}
                    onChange={e => setEditFormData({ ...editFormData, location: e.target.value })}
                    className="w-full border rounded-xl p-3 text-gray-900"
                    placeholder="العنوان التفصيلي"
                    rows={2}
                  />
                </div>
                
                {/* خيارات المتجر */}
                <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
                  <h3 className="font-semibold text-gray-800">إعدادات المتجر</h3>
                  
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormData.isOpen}
                      onChange={e => setEditFormData({ ...editFormData, isOpen: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                    />
                    <span className="text-gray-700">المتجر مفتوح ويستقبل طلبات</span>
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormData.allowDelivery}
                      onChange={e => setEditFormData({ ...editFormData, allowDelivery: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                    />
                    <span className="text-gray-700">يدعم التوصيل</span>
                  </label>
                  
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editFormData.allowPickup}
                      onChange={e => setEditFormData({ ...editFormData, allowPickup: e.target.checked })}
                      className="w-5 h-5 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                    />
                    <span className="text-gray-700">يدعم الاستلام من المطعم</span>
                  </label>
                </div>
                
                {/* أزرار الحفظ والإلغاء */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex-1 bg-sky-600 hover:bg-sky-700 text-white rounded-xl p-3 font-semibold transition disabled:opacity-50"
                  >
                    {uploading ? `جارٍ الرفع... ${uploadProgress}%` : '✅ حفظ التعديلات'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl p-3 font-semibold transition"
                  >
                    ❌ إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* قائمة المطاعم */}
        <div className="grid gap-4">
          {restaurants.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              لا توجد مطاعم مسجلة حالياً
            </div>
          ) : (
            restaurants.map(restaurant => (
              <div
                key={restaurant.id}
                className="bg-white rounded-2xl shadow p-6 hover:shadow-lg transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    {/* شعار المطعم */}
                    {restaurant.logoUrl ? (
                      <img 
                        src={restaurant.logoUrl} 
                        alt={restaurant.name}
                        className="w-16 h-16 rounded-xl object-cover border-2 border-sky-100"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-sky-100 flex items-center justify-center">
                        <span className="text-2xl">🍽️</span>
                      </div>
                    )}
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xl font-bold text-primary">{restaurant.name}</h3>
                        {/* شارة التوثيق */}
                        {restaurant.isVerified && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                            <CheckCircle className="w-3 h-3" /> موثقة
                          </span>
                        )}
                        {/* شارة التصنيف */}
                        <TierBadge tier={restaurant.sellerTier} />
                      </div>
                      {restaurant.city && (
                        <p className="text-gray-600 text-sm">📍 {restaurant.city}</p>
                      )}
                      {restaurant.phone && (
                        <p className="text-gray-600 text-sm">📞 {restaurant.phone}</p>
                      )}
                      {restaurant.location && (
                        <p className="text-gray-600 text-sm">🏢 {restaurant.location}</p>
                      )}
                    </div>
                  </div>
                  
                  {/* أزرار الإجراءات */}
                  <div className="flex items-center gap-2">
                    {/* زر التوثيق */}
                    <button
                      onClick={() => handleToggleVerified(restaurant)}
                      className={`p-2.5 rounded-xl transition flex items-center gap-1 text-sm font-semibold ${
                        restaurant.isVerified 
                          ? 'bg-green-100 hover:bg-green-200 text-green-700' 
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                      }`}
                      title={restaurant.isVerified ? 'إلغاء التوثيق' : 'توثيق الأسرة'}
                    >
                      <Shield className="w-4 h-4" />
                      {restaurant.isVerified ? 'موثقة' : 'توثيق'}
                    </button>
                    
                    {/* قائمة التصنيف */}
                    <div className="relative group">
                      <button
                        className="p-2.5 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-700 transition flex items-center gap-1 text-sm font-semibold"
                      >
                        <Award className="w-4 h-4" />
                        التصنيف
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      <div className="absolute left-0 top-full mt-1 bg-white rounded-xl shadow-xl border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 min-w-[140px]">
                        <button
                          onClick={() => handleUpdateTier(restaurant, 'bronze')}
                          className={`w-full px-4 py-2.5 text-right hover:bg-amber-50 transition flex items-center gap-2 first:rounded-t-xl ${restaurant.sellerTier === 'bronze' || !restaurant.sellerTier ? 'bg-amber-50' : ''}`}
                        >
                          <Award className="w-4 h-4 text-amber-600" />
                          <span className="font-semibold">Bronze</span>
                        </button>
                        <button
                          onClick={() => handleUpdateTier(restaurant, 'silver')}
                          className={`w-full px-4 py-2.5 text-right hover:bg-gray-50 transition flex items-center gap-2 ${restaurant.sellerTier === 'silver' ? 'bg-gray-100' : ''}`}
                        >
                          <Medal className="w-4 h-4 text-gray-500" />
                          <span className="font-semibold">Silver</span>
                        </button>
                        <button
                          onClick={() => handleUpdateTier(restaurant, 'gold')}
                          className={`w-full px-4 py-2.5 text-right hover:bg-yellow-50 transition flex items-center gap-2 last:rounded-b-xl ${restaurant.sellerTier === 'gold' ? 'bg-yellow-50' : ''}`}
                        >
                          <Crown className="w-4 h-4 text-amber-500" />
                          <span className="font-semibold">Gold</span>
                        </button>
                      </div>
                    </div>
                    
                    {/* زر التعديل */}
                    <button
                      onClick={() => handleStartEdit(restaurant)}
                      className="p-2.5 bg-sky-100 hover:bg-sky-200 text-sky-600 rounded-xl transition"
                      title="تعديل المطعم"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    
                    {/* زر الحذف - للمطور فقط */}
                    {role === 'developer' && (
                      <button
                        onClick={() => handleDelete(restaurant.id)}
                        className="p-2.5 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl transition"
                        title="حذف المطعم"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </RoleGate>
  )
}

export default AdminRestaurants
