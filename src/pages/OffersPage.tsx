// src/pages/OffersPage.tsx
// صفحة إدارة العروض الخاصة للأسرة المنتجة
import React, { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { db, app } from '@/firebase'
import { collection, addDoc, updateDoc, deleteDoc, doc, query, where, getDocs, serverTimestamp, getDoc } from 'firebase/firestore'
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { useAuth } from '@/auth'
import { SpecialOffer, OfferType, MenuItem, BundleItem } from '@/types'
import { useToast } from '@/components/ui/Toast'
import { 
  Tag, Percent, Package, Gift, Plus, Edit2, Trash2, 
  Eye, EyeOff, Clock, ShoppingBag, X, Save, Loader2,
  ChevronDown, CheckCircle, Camera, Moon, Sunrise, Users, Image
} from 'lucide-react'
import { isRamadan, OFFER_TYPE_LABELS, RamadanOfferType } from '@/utils/ramadanConfig'

// أنواع العروض العادية
const REGULAR_OFFER_TYPES: { value: OfferType; label: string; icon: any; desc: string }[] = [
  { value: 'percent_discount', label: 'خصم نسبة %', icon: Percent, desc: 'خصم نسبة مئوية على الطلب' },
  { value: 'fixed_discount', label: 'خصم مبلغ ثابت', icon: Tag, desc: 'خصم مبلغ محدد من الطلب' },
  { value: 'bundle_meal', label: 'وجبة مجمّعة', icon: Package, desc: 'مجموعة أصناف بسعر خاص' },
  { value: 'buy_x_get_y', label: 'اشترِ واحصل', icon: Gift, desc: 'اشترِ 2 واحصل على 1 مجاناً' },
]

// أنواع عروض رمضان
const RAMADAN_OFFER_TYPES: { value: RamadanOfferType; label: string; icon: any; desc: string; color: string }[] = [
  { value: 'iftar_package', label: 'باقة إفطار', icon: Sunrise, desc: 'وجبة إفطار متكاملة', color: 'from-amber-500 to-orange-600' },
  { value: 'suhoor_package', label: 'باقة سحور', icon: Moon, desc: 'وجبة سحور مميزة', color: 'from-indigo-500 to-purple-600' },
  { value: 'family_bundle', label: 'عرض عائلي', icon: Users, desc: 'باقة للعائلة بسعر خاص', color: 'from-emerald-500 to-teal-600' },
  { value: 'discount', label: 'خصم رمضاني', icon: Tag, desc: 'خصم خاص بمناسبة رمضان', color: 'from-rose-500 to-pink-600' },
]

// الجمع بين النوعين للتوافق
const OFFER_TYPES = REGULAR_OFFER_TYPES

type FormData = {
  offerType: OfferType | RamadanOfferType
  title: string
  description: string
  discountPercent: number
  discountAmount: number
  minOrderAmount: number
  bundleItems: BundleItem[]
  bundlePrice: number
  buyQuantity: number
  getQuantity: number
  applicableItemIds: string[]
  expiresAt: string
  // حقول إضافية لعروض رمضان
  imageUrl: string
  originalPrice: number
  offerPrice: number
  servesCount: number // عدد الأشخاص
}

const initialForm: FormData = {
  offerType: 'percent_discount',
  title: '',
  description: '',
  discountPercent: 10,
  discountAmount: 5,
  minOrderAmount: 0,
  bundleItems: [],
  bundlePrice: 0,
  buyQuantity: 2,
  getQuantity: 1,
  applicableItemIds: [],
  expiresAt: '',
  // القيم الافتراضية لعروض رمضان
  imageUrl: '',
  originalPrice: 0,
  offerPrice: 0,
  servesCount: 4,
}

export const OffersPage: React.FC = () => {
  const { user } = useAuth()
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const isRamadanMode = searchParams.get('type') === 'ramadan' && isRamadan()
  
  const [offers, setOffers] = useState<SpecialOffer[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>({
    ...initialForm,
    offerType: isRamadanMode ? 'iftar_package' : 'percent_discount'
  })
  const [restaurant, setRestaurant] = useState<{ name?: string; logoUrl?: string } | null>(null)
  
  // حالة رفع الصور
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // جلب العروض والأصناف
  useEffect(() => {
    if (!user) return
    
    const fetchData = async () => {
      try {
        // جلب بيانات المطعم
        const restSnap = await getDoc(doc(db, 'restaurants', user.uid))
        if (restSnap.exists()) {
          setRestaurant(restSnap.data() as any)
        }
        
        // جلب العروض العادية
        const offersQuery = query(
          collection(db, 'offers'),
          where('ownerId', '==', user.uid)
        )
        const offersSnap = await getDocs(offersQuery)
        const regularOffers = offersSnap.docs.map(d => ({ id: d.id, ...d.data() } as SpecialOffer))
        
        // جلب عروض رمضان
        const ramadanQuery = query(
          collection(db, 'ramadanOffers'),
          where('ownerId', '==', user.uid)
        )
        const ramadanSnap = await getDocs(ramadanQuery)
        const ramadanOffers = ramadanSnap.docs.map(d => ({ 
          id: d.id, 
          ...d.data(),
          isRamadanOffer: true 
        } as unknown as SpecialOffer))
        
        // دمج العروض حسب الوضع
        if (isRamadanMode) {
          setOffers(ramadanOffers)
        } else {
          setOffers(regularOffers)
        }
        
        // جلب الأصناف
        const itemsQuery = query(
          collection(db, 'menuItems'),
          where('ownerId', '==', user.uid)
        )
        const itemsSnap = await getDocs(itemsQuery)
        setMenuItems(itemsSnap.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem)))
      } catch (err) {
        console.error('Error fetching data:', err)
        toast.error('حدث خطأ في تحميل البيانات')
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [user, isRamadanMode])

  // رفع صورة العرض
  const handleImageUpload = async (file: File) => {
    if (!user) return
    
    setUploading(true)
    setUploadProgress(0)
    
    try {
      const storage = getStorage(app)
      const fileName = `ramadan_offers/${user.uid}/${Date.now()}_${file.name}`
      const storageRef = ref(storage, fileName)
      
      const uploadTask = uploadBytesResumable(storageRef, file)
      
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          setUploadProgress(progress)
        },
        (error) => {
          console.error('Upload error:', error)
          toast.error('فشل رفع الصورة')
          setUploading(false)
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref)
          setForm(prev => ({ ...prev, imageUrl: downloadURL }))
          setPreviewImage(downloadURL)
          setUploading(false)
          toast.success('تم رفع الصورة ✅')
        }
      )
    } catch (err) {
      console.error('Error uploading image:', err)
      toast.error('حدث خطأ في رفع الصورة')
      setUploading(false)
    }
  }

  // معالجة اختيار الملف
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('حجم الصورة يجب أن يكون أقل من 5MB')
        return
      }
      // عرض المعاينة المحلية
      const reader = new FileReader()
      reader.onload = (ev) => {
        setPreviewImage(ev.target?.result as string)
      }
      reader.readAsDataURL(file)
      handleImageUpload(file)
    }
  }

  // التحقق من نوع العرض الرمضاني
  const isRamadanOfferType = (type: string): type is RamadanOfferType => {
    return ['iftar_package', 'suhoor_package', 'family_bundle', 'discount'].includes(type)
  }

  // إضافة/تعديل عرض
  const handleSubmit = async () => {
    if (!user) return
    if (!form.title.trim()) {
      toast.error('الرجاء إدخال عنوان العرض')
      return
    }
    
    // التحقق من حقول عروض رمضان
    if (isRamadanMode && isRamadanOfferType(form.offerType)) {
      if (form.offerType !== 'discount' && (!form.offerPrice || form.offerPrice <= 0)) {
        toast.error('الرجاء إدخال سعر العرض')
        return
      }
    }
    
    setSaving(true)
    try {
      // تحديد المجموعة حسب نوع العرض
      const collectionName = isRamadanMode ? 'ramadanOffers' : 'offers'
      
      const offerData: any = {
        ownerId: user.uid,
        restaurantId: user.uid,
        restaurantName: restaurant?.name,
        restaurantLogo: restaurant?.logoUrl,
        offerType: form.offerType,
        title: form.title.trim(),
        description: form.description.trim(),
        isActive: true,
        viewsCount: 0,
        usedCount: 0,
        updatedAt: serverTimestamp(),
      }

      // إعدادات عروض رمضان
      if (isRamadanMode && isRamadanOfferType(form.offerType)) {
        offerData.imageUrl = form.imageUrl || ''
        offerData.originalPrice = form.originalPrice || 0
        offerData.offerPrice = form.offerPrice || 0
        offerData.servesCount = form.servesCount || 4
        offerData.isRamadanOffer = true
        
        // حساب نسبة الخصم تلقائياً
        if (form.originalPrice > 0 && form.offerPrice > 0) {
          offerData.discountPercent = Math.round(
            ((form.originalPrice - form.offerPrice) / form.originalPrice) * 100
          )
        }
      }
      // إعدادات العروض العادية
      else if (form.offerType === 'percent_discount') {
        offerData.discountPercent = form.discountPercent
        offerData.minOrderAmount = form.minOrderAmount
      } else if (form.offerType === 'fixed_discount') {
        offerData.discountAmount = form.discountAmount
        offerData.minOrderAmount = form.minOrderAmount
      } else if (form.offerType === 'bundle_meal') {
        offerData.bundleItems = form.bundleItems
        offerData.bundlePrice = form.bundlePrice
        offerData.bundleOriginalPrice = form.bundleItems.reduce(
          (sum, item) => sum + item.originalPrice * item.quantity, 0
        )
      } else if (form.offerType === 'buy_x_get_y') {
        offerData.buyQuantity = form.buyQuantity
        offerData.getQuantity = form.getQuantity
        offerData.applicableItemIds = form.applicableItemIds
        offerData.applicableItemNames = menuItems
          .filter(m => form.applicableItemIds.includes(m.id))
          .map(m => m.name)
      }

      // تاريخ الانتهاء
      if (form.expiresAt) {
        offerData.expiresAt = new Date(form.expiresAt)
      }

      if (editingId) {
        await updateDoc(doc(db, collectionName, editingId), offerData)
        setOffers(prev => prev.map(o => o.id === editingId ? { ...o, ...offerData } : o))
        toast.success('تم تحديث العرض ✅')
      } else {
        offerData.createdAt = serverTimestamp()
        const newDoc = await addDoc(collection(db, collectionName), offerData)
        setOffers(prev => [{ id: newDoc.id, ...offerData } as SpecialOffer, ...prev])
        toast.success('تم إضافة العرض ✅')
      }

      setShowForm(false)
      setEditingId(null)
      setForm({
        ...initialForm,
        offerType: isRamadanMode ? 'iftar_package' : 'percent_discount'
      })
      setPreviewImage(null)
    } catch (err) {
      console.error('Error saving offer:', err)
      toast.error('حدث خطأ في حفظ العرض')
    } finally {
      setSaving(false)
    }
  }

  // تفعيل/إلغاء تفعيل عرض
  const toggleActive = async (offer: SpecialOffer) => {
    const collectionName = (offer as any).isRamadanOffer ? 'ramadanOffers' : 'offers'
    try {
      await updateDoc(doc(db, collectionName, offer.id), {
        isActive: !offer.isActive,
        updatedAt: serverTimestamp()
      })
      setOffers(prev => prev.map(o => 
        o.id === offer.id ? { ...o, isActive: !o.isActive } : o
      ))
      toast.success(offer.isActive ? 'تم إيقاف العرض' : 'تم تفعيل العرض')
    } catch (err) {
      toast.error('حدث خطأ')
    }
  }

  // حذف عرض
  const deleteOffer = async (id: string, isRamadanOffer?: boolean) => {
    if (!confirm('هل تريد حذف هذا العرض؟')) return
    const collectionName = isRamadanOffer || isRamadanMode ? 'ramadanOffers' : 'offers'
    try {
      await deleteDoc(doc(db, collectionName, id))
      setOffers(prev => prev.filter(o => o.id !== id))
      toast.success('تم حذف العرض')
    } catch (err) {
      toast.error('حدث خطأ')
    }
  }

  // فتح نموذج التعديل
  const editOffer = (offer: SpecialOffer) => {
    setEditingId(offer.id)
    setForm({
      offerType: offer.offerType as any,
      title: offer.title,
      description: offer.description || '',
      discountPercent: offer.discountPercent || 10,
      discountAmount: offer.discountAmount || 5,
      minOrderAmount: offer.minOrderAmount || 0,
      bundleItems: offer.bundleItems || [],
      bundlePrice: offer.bundlePrice || 0,
      buyQuantity: offer.buyQuantity || 2,
      getQuantity: offer.getQuantity || 1,
      applicableItemIds: offer.applicableItemIds || [],
      expiresAt: offer.expiresAt ? new Date(offer.expiresAt).toISOString().slice(0, 16) : '',
      // حقول رمضان
      imageUrl: (offer as any).imageUrl || '',
      originalPrice: (offer as any).originalPrice || 0,
      offerPrice: (offer as any).offerPrice || 0,
      servesCount: (offer as any).servesCount || 4,
    })
    setPreviewImage((offer as any).imageUrl || null)
    setShowForm(true)
  }

  // إضافة صنف للوجبة المجمّعة
  const addBundleItem = (item: MenuItem) => {
    const existing = form.bundleItems.find(b => b.itemId === item.id)
    if (existing) {
      setForm({
        ...form,
        bundleItems: form.bundleItems.map(b => 
          b.itemId === item.id ? { ...b, quantity: b.quantity + 1 } : b
        )
      })
    } else {
      setForm({
        ...form,
        bundleItems: [...form.bundleItems, {
          itemId: item.id,
          itemName: item.name,
          quantity: 1,
          originalPrice: item.price
        }]
      })
    }
  }

  // حذف صنف من الوجبة المجمّعة
  const removeBundleItem = (itemId: string) => {
    setForm({
      ...form,
      bundleItems: form.bundleItems.filter(b => b.itemId !== itemId)
    })
  }

  // السعر الأصلي للوجبة المجمّعة
  const bundleOriginalPrice = form.bundleItems.reduce(
    (sum, item) => sum + item.originalPrice * item.quantity, 0
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* رأس الصفحة */}
      <div className={`flex items-center justify-between ${isRamadanMode ? 'bg-gradient-to-r from-purple-900 to-emerald-900 -mx-4 -mt-4 p-4 rounded-b-2xl' : ''}`}>
        <div>
          <h1 className={`text-2xl font-bold ${isRamadanMode ? 'text-amber-300' : 'text-sky-700'}`}>
            {isRamadanMode ? '🌙 عروض رمضان' : '🎁 العروض الخاصة'}
          </h1>
          <p className={`text-sm mt-1 ${isRamadanMode ? 'text-purple-200' : 'text-gray-500'}`}>
            {isRamadanMode ? 'أضف باقات إفطار وسحور وعروض رمضانية مميزة' : 'أضف عروض تجذب العملاء وتزيد مبيعاتك'}
          </p>
        </div>
        <button
          onClick={() => { 
            setShowForm(true)
            setEditingId(null)
            setForm({
              ...initialForm,
              offerType: isRamadanMode ? 'iftar_package' : 'percent_discount'
            })
            setPreviewImage(null)
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold shadow-lg hover:scale-105 transition ${
            isRamadanMode 
              ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-purple-900' 
              : 'bg-gradient-to-r from-sky-500 to-sky-600 text-white'
          }`}
        >
          <Plus className="w-5 h-5" />
          {isRamadanMode ? 'عرض رمضاني' : 'عرض جديد'}
        </button>
      </div>

      {/* نموذج إضافة/تعديل عرض */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* رأس النموذج */}
            <div className={`p-4 text-white sticky top-0 z-10 ${
              isRamadanMode 
                ? 'bg-gradient-to-r from-purple-900 to-emerald-900' 
                : 'bg-gradient-to-r from-sky-500 to-sky-600'
            }`}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">
                  {editingId 
                    ? (isRamadanMode ? '✏️ تعديل عرض رمضان' : '✏️ تعديل العرض')
                    : (isRamadanMode ? '🌙 إضافة عرض رمضاني' : '➕ إضافة عرض جديد')
                  }
                </h2>
                <button onClick={() => { setShowForm(false); setPreviewImage(null) }} className="p-1 hover:bg-white/20 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* نوع العرض */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">نوع العرض</label>
                <div className="grid grid-cols-2 gap-2">
                  {(isRamadanMode ? RAMADAN_OFFER_TYPES : REGULAR_OFFER_TYPES).map(type => (
                    <button
                      key={type.value}
                      onClick={() => setForm({ ...form, offerType: type.value as any })}
                      className={`p-3 rounded-xl border-2 text-right transition ${
                        form.offerType === type.value
                          ? (isRamadanMode ? 'border-purple-500 bg-purple-50' : 'border-sky-500 bg-sky-50')
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <type.icon className={`w-5 h-5 ${form.offerType === type.value ? (isRamadanMode ? 'text-purple-600' : 'text-sky-600') : 'text-gray-400'}`} />
                        <span className="font-bold text-sm">{type.label}</span>
                      </div>
                      <p className="text-xs text-gray-500">{type.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* رفع صورة العرض - لعروض رمضان فقط */}
              {isRamadanMode && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">صورة العرض</label>
                  <div className="border-2 border-dashed border-purple-300 rounded-xl p-4 text-center bg-purple-50/50">
                    {previewImage ? (
                      <div className="relative">
                        <img src={previewImage} alt="معاينة" className="w-full h-48 object-cover rounded-xl" />
                        <button
                          onClick={() => { setPreviewImage(null); setForm({ ...form, imageUrl: '' }) }}
                          className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="cursor-pointer py-8"
                      >
                        {uploading ? (
                          <div className="space-y-2">
                            <Loader2 className="w-10 h-10 text-purple-500 animate-spin mx-auto" />
                            <p className="text-purple-600 font-bold">{Math.round(uploadProgress)}%</p>
                          </div>
                        ) : (
                          <>
                            <Camera className="w-12 h-12 text-purple-400 mx-auto mb-2" />
                            <p className="text-purple-600 font-semibold">اضغط لرفع صورة العرض</p>
                            <p className="text-xs text-gray-400 mt-1">PNG, JPG حتى 5MB</p>
                          </>
                        )}
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>
                </div>
              )}

              {/* عنوان العرض */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">عنوان العرض *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="مثال: عرض نهاية الأسبوع"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-sky-500 focus:outline-none"
                />
              </div>

              {/* الوصف */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">وصف العرض</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder={isRamadanMode ? 'وصف محتويات الباقة...' : 'وصف مختصر للعرض...'}
                  rows={2}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-sky-500 focus:outline-none resize-none"
                />
              </div>

              {/* حقول إضافية لعروض رمضان */}
              {isRamadanMode && isRamadanOfferType(form.offerType) && form.offerType !== 'discount' && (
                <div className="space-y-4 p-4 bg-gradient-to-br from-purple-50 to-amber-50 rounded-xl border-2 border-purple-200">
                  <h4 className="font-bold text-purple-800 flex items-center gap-2">
                    <Moon className="w-5 h-5" />
                    تفاصيل الباقة
                  </h4>
                  
                  {/* عدد الأشخاص */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">تكفي كم شخص؟</label>
                    <div className="flex gap-2">
                      {[2, 4, 6, 8, 10].map(num => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setForm({ ...form, servesCount: num })}
                          className={`px-4 py-2 rounded-lg font-bold transition ${
                            form.servesCount === num
                              ? 'bg-purple-600 text-white'
                              : 'bg-white border border-purple-200 text-purple-600 hover:bg-purple-50'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* الأسعار */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">السعر الأصلي (ر.س)</label>
                      <input
                        type="number"
                        value={form.originalPrice || ''}
                        onChange={e => setForm({ ...form, originalPrice: Number(e.target.value) || 0 })}
                        placeholder="150"
                        className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">سعر العرض (ر.س) *</label>
                      <input
                        type="number"
                        value={form.offerPrice || ''}
                        onChange={e => setForm({ ...form, offerPrice: Number(e.target.value) || 0 })}
                        placeholder="99"
                        className="w-full border-2 border-purple-200 rounded-xl px-4 py-3 focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  
                  {/* نسبة التوفير */}
                  {form.originalPrice > 0 && form.offerPrice > 0 && form.originalPrice > form.offerPrice && (
                    <div className="bg-green-100 text-green-700 p-3 rounded-xl text-center font-bold">
                      توفير {Math.round(((form.originalPrice - form.offerPrice) / form.originalPrice) * 100)}% 🎉
                    </div>
                  )}
                </div>
              )}

              {/* حقول خصم رمضان */}
              {isRamadanMode && form.offerType === 'discount' && (
                <div className="space-y-4 p-4 bg-rose-50 rounded-xl">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">نسبة الخصم %</label>
                    <input
                      type="number"
                      value={form.discountPercent}
                      onChange={e => setForm({ ...form, discountPercent: Number(e.target.value) })}
                      min={1}
                      max={90}
                      className="w-full border-2 border-rose-200 rounded-xl px-4 py-3 focus:border-rose-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* إعدادات خاصة بنوع العرض العادي */}
              {!isRamadanMode && form.offerType === 'percent_discount' && (
                <div className="space-y-4 p-4 bg-amber-50 rounded-xl">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">نسبة الخصم %</label>
                    <input
                      type="number"
                      value={form.discountPercent}
                      onChange={e => setForm({ ...form, discountPercent: Number(e.target.value) })}
                      min={1}
                      max={90}
                      className="w-full border-2 border-amber-200 rounded-xl px-4 py-3 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">الحد الأدنى للطلب (اختياري)</label>
                    <input
                      type="number"
                      value={form.minOrderAmount || ''}
                      onChange={e => setForm({ ...form, minOrderAmount: Number(e.target.value) || 0 })}
                      placeholder="0 = بدون حد أدنى"
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {!isRamadanMode && form.offerType === 'fixed_discount' && (
                <div className="space-y-4 p-4 bg-green-50 rounded-xl">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">مبلغ الخصم (ر.س)</label>
                    <input
                      type="number"
                      value={form.discountAmount}
                      onChange={e => setForm({ ...form, discountAmount: Number(e.target.value) })}
                      min={1}
                      className="w-full border-2 border-green-200 rounded-xl px-4 py-3 focus:border-green-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">الحد الأدنى للطلب (اختياري)</label>
                    <input
                      type="number"
                      value={form.minOrderAmount || ''}
                      onChange={e => setForm({ ...form, minOrderAmount: Number(e.target.value) || 0 })}
                      placeholder="0 = بدون حد أدنى"
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {!isRamadanMode && form.offerType === 'bundle_meal' && (
                <div className="space-y-4 p-4 bg-purple-50 rounded-xl">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">أصناف الوجبة</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {form.bundleItems.map(item => (
                        <span key={item.itemId} className="inline-flex items-center gap-1 px-3 py-1 bg-white rounded-full text-sm border">
                          {item.itemName} × {item.quantity}
                          <button onClick={() => removeBundleItem(item.itemId)} className="text-red-500 hover:text-red-700">
                            <X className="w-4 h-4" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <select
                      onChange={e => {
                        const item = menuItems.find(m => m.id === e.target.value)
                        if (item) addBundleItem(item)
                        e.target.value = ''
                      }}
                      className="w-full border-2 border-purple-200 rounded-xl px-4 py-3 focus:border-purple-500 focus:outline-none"
                    >
                      <option value="">+ أضف صنف للوجبة</option>
                      {menuItems.filter(m => m.available !== false).map(item => (
                        <option key={item.id} value={item.id}>{item.name} - {item.price} ر.س</option>
                      ))}
                    </select>
                  </div>
                  {bundleOriginalPrice > 0 && (
                    <div className="bg-white p-3 rounded-xl">
                      <p className="text-sm text-gray-600">السعر الأصلي: <span className="line-through">{bundleOriginalPrice} ر.س</span></p>
                      <div className="mt-2">
                        <label className="block text-sm font-bold text-gray-700 mb-1">سعر العرض</label>
                        <input
                          type="number"
                          value={form.bundlePrice || ''}
                          onChange={e => setForm({ ...form, bundlePrice: Number(e.target.value) })}
                          placeholder={`اقترح: ${(bundleOriginalPrice * 0.8).toFixed(0)} ر.س`}
                          className="w-full border-2 border-purple-200 rounded-xl px-4 py-3 focus:border-purple-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!isRamadanMode && form.offerType === 'buy_x_get_y' && (
                <div className="space-y-4 p-4 bg-pink-50 rounded-xl">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">اشترِ</label>
                      <input
                        type="number"
                        value={form.buyQuantity}
                        onChange={e => setForm({ ...form, buyQuantity: Number(e.target.value) })}
                        min={1}
                        className="w-full border-2 border-pink-200 rounded-xl px-4 py-3 focus:border-pink-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-2">واحصل على</label>
                      <input
                        type="number"
                        value={form.getQuantity}
                        onChange={e => setForm({ ...form, getQuantity: Number(e.target.value) })}
                        min={1}
                        className="w-full border-2 border-pink-200 rounded-xl px-4 py-3 focus:border-pink-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">الأصناف المشمولة</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {form.applicableItemIds.map(id => {
                        const item = menuItems.find(m => m.id === id)
                        return item ? (
                          <span key={id} className="inline-flex items-center gap-1 px-3 py-1 bg-white rounded-full text-sm border">
                            {item.name}
                            <button 
                              onClick={() => setForm({ ...form, applicableItemIds: form.applicableItemIds.filter(i => i !== id) })}
                              className="text-red-500"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </span>
                        ) : null
                      })}
                    </div>
                    <select
                      onChange={e => {
                        if (e.target.value && !form.applicableItemIds.includes(e.target.value)) {
                          setForm({ ...form, applicableItemIds: [...form.applicableItemIds, e.target.value] })
                        }
                        e.target.value = ''
                      }}
                      className="w-full border-2 border-pink-200 rounded-xl px-4 py-3 focus:border-pink-500 focus:outline-none"
                    >
                      <option value="">+ أضف صنف</option>
                      {menuItems.filter(m => m.available !== false && !form.applicableItemIds.includes(m.id)).map(item => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* تاريخ الانتهاء */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">تاريخ انتهاء العرض (اختياري)</label>
                <input
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={e => setForm({ ...form, expiresAt: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-sky-500 focus:outline-none"
                />
              </div>

              {/* أزرار الحفظ */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-sky-500 to-sky-600 text-white rounded-xl font-bold shadow-lg hover:scale-[1.02] transition disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {editingId ? 'حفظ التعديلات' : 'إضافة العرض'}
                </button>
                <button
                  onClick={() => setShowForm(false)}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* قائمة العروض */}
      {offers.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl">
          <div className="w-20 h-20 bg-sky-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Gift className="w-10 h-10 text-sky-500" />
          </div>
          <p className="text-gray-600 font-semibold mb-2">لا توجد عروض حالياً</p>
          <p className="text-gray-400 text-sm">أضف عروض لجذب المزيد من العملاء</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {offers.map(offer => {
            const typeInfo = OFFER_TYPES.find(t => t.value === offer.offerType)
            const TypeIcon = typeInfo?.icon || Tag
            const isExpired = offer.expiresAt && new Date(offer.expiresAt) < new Date()
            
            return (
              <div 
                key={offer.id} 
                className={`bg-white rounded-2xl shadow-md overflow-hidden border-2 transition ${
                  !offer.isActive || isExpired ? 'border-gray-200 opacity-60' : 'border-sky-100'
                }`}
              >
                <div className="flex items-stretch">
                  {/* أيقونة النوع */}
                  <div className={`w-24 flex-shrink-0 flex items-center justify-center ${
                    offer.offerType === 'percent_discount' ? 'bg-amber-100' :
                    offer.offerType === 'fixed_discount' ? 'bg-green-100' :
                    offer.offerType === 'bundle_meal' ? 'bg-purple-100' :
                    'bg-pink-100'
                  }`}>
                    <TypeIcon className={`w-10 h-10 ${
                      offer.offerType === 'percent_discount' ? 'text-amber-600' :
                      offer.offerType === 'fixed_discount' ? 'text-green-600' :
                      offer.offerType === 'bundle_meal' ? 'text-purple-600' :
                      'text-pink-600'
                    }`} />
                  </div>
                  
                  {/* محتوى العرض */}
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-gray-800">{offer.title}</h3>
                        <p className="text-sm text-gray-500">{typeInfo?.label}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {/* زر تفعيل/إيقاف */}
                        <button
                          onClick={() => toggleActive(offer)}
                          className={`p-2 rounded-lg transition ${
                            offer.isActive ? 'bg-green-100 text-green-600 hover:bg-green-200' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                          }`}
                          title={offer.isActive ? 'إيقاف العرض' : 'تفعيل العرض'}
                        >
                          {offer.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                        {/* زر التعديل */}
                        <button
                          onClick={() => editOffer(offer)}
                          className="p-2 rounded-lg bg-sky-100 text-sky-600 hover:bg-sky-200 transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {/* زر الحذف */}
                        <button
                          onClick={() => deleteOffer(offer.id)}
                          className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* تفاصيل العرض */}
                    <div className="text-sm space-y-1">
                      {offer.offerType === 'percent_discount' && (
                        <p className="text-amber-600 font-bold">خصم {offer.discountPercent}%</p>
                      )}
                      {offer.offerType === 'fixed_discount' && (
                        <p className="text-green-600 font-bold">خصم {offer.discountAmount} ر.س</p>
                      )}
                      {offer.offerType === 'bundle_meal' && (
                        <p className="text-purple-600 font-bold">
                          {offer.bundleItems?.length} أصناف بـ {offer.bundlePrice} ر.س
                          <span className="text-gray-400 line-through mr-2">{offer.bundleOriginalPrice} ر.س</span>
                        </p>
                      )}
                      {offer.offerType === 'buy_x_get_y' && (
                        <p className="text-pink-600 font-bold">
                          اشترِ {offer.buyQuantity} واحصل على {offer.getQuantity} مجاناً
                        </p>
                      )}
                    </div>
                    
                    {/* الإحصائيات والحالة */}
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" /> {offer.viewsCount || 0} مشاهدة
                      </span>
                      <span className="flex items-center gap-1">
                        <ShoppingBag className="w-3 h-3" /> {offer.usedCount || 0} استخدام
                      </span>
                      {isExpired && (
                        <span className="text-red-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> منتهي
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default OffersPage
