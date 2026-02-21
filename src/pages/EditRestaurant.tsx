// src/pages/EditRestaurant.tsx
import React, { useEffect, useMemo, useState, useRef } from "react"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { db, storage } from "@/firebase"
import { useAuth } from "@/auth"
import { useToast } from "@/components/ui/Toast"
import { SAUDI_CITIES } from "@/utils/cities"
import { MapPin, FileText, ShieldCheck, AlertCircle, CheckCircle, Clock, Store, Building2, Briefcase, Lock } from "lucide-react"

type RestaurantForm = {
  name: string
  phone: string
  city: string
  location: string
  logoUrl?: string
  isOpen?: boolean // هل المتجر مفتوح للطلبات
  allowDelivery?: boolean // السماح بالتوصيل
  allowPickup?: boolean // السماح بالاستلام من المطعم
  cuisineType?: string // نوع المطبخ
  announcement?: string // ملاحظة قصيرة للعملاء
  commercialLicenseUrl?: string
  licenseStatus?: 'pending' | 'approved' | 'rejected'
  licenseNotes?: string
  // بيانات الحساب البنكي
  bankName?: string
  bankAccountName?: string
  bankAccountNumber?: string
  // بيانات التوظيف
  isHiring?: boolean
  hiringDescription?: string
  hiringContact?: string
}

// أنواع المطابخ
const CUISINE_TYPES = [
  { value: '', label: 'اختر نوع المطبخ' },
  { value: 'traditional', label: '🍚 أكلات شعبية' },
  { value: 'sweets', label: '🍰 حلويات' },
  { value: 'pastries', label: '🥧 معجنات' },
  { value: 'grills', label: '🍖 مشويات' },
  { value: 'healthy', label: '🥗 أكل صحي' },
  { value: 'international', label: '🌍 أكلات عالمية' },
]

export const EditRestaurant: React.FC = () => {
  const { user } = useAuth()
  const toast = useToast()

  const [form, setForm] = useState<RestaurantForm>({
    name: "",
    phone: "",
    city: "",
    location: "",
    logoUrl: "",
    isOpen: true, // المتجر مفتوح افتراضياً
    allowDelivery: true, // التوصيل مفعل افتراضياً
    allowPickup: false,
    cuisineType: "",
    announcement: "",
    commercialLicenseUrl: "",
    licenseStatus: undefined,
    licenseNotes: "",
    bankName: "",
    bankAccountName: "",
    bankAccountNumber: "",
    isHiring: false,
    hiringDescription: "",
    hiringContact: "",
  })

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>("")
  const [commercialFile, setCommercialFile] = useState<File | null>(null)
  const [commercialPreview, setCommercialPreview] = useState<string>("") // معاينة صورة الترخيص
  const licenseInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [saving, setSaving] = useState<boolean>(false)
  const canSave = useMemo(() => !saving && !!user, [saving, user])

  // ====== Load current data ======
  useEffect(() => {
    if (!user) return
    ;(async () => {
      try {
        // جلب بيانات المطعم الأساسية
        const snap = await getDoc(doc(db, "restaurants", user.uid))
        if (snap.exists()) {
          const data = snap.data() as RestaurantForm
          
          // جلب بيانات البنك من subcollection منفصل (محمي)
          let bankData = { bankName: "", bankAccountName: "", bankAccountNumber: "" }
          try {
            const bankSnap = await getDoc(doc(db, "restaurants", user.uid, "private", "bankInfo"))
            if (bankSnap.exists()) {
              const bd = bankSnap.data()
              bankData = {
                bankName: bd.bankName ?? "",
                bankAccountName: bd.bankAccountName ?? "",
                bankAccountNumber: bd.bankAccountNumber ?? "",
              }
            }
          } catch (e) {
            // بيانات البنك غير موجودة - هذا طبيعي
          }
          
          setForm({
            name: data.name ?? "",
            phone: data.phone ?? "",
            city: data.city ?? "",
            location: data.location ?? "",
            logoUrl: data.logoUrl ?? "",
            isOpen: (data as any).isOpen ?? true,
            allowDelivery: (data as any).allowDelivery ?? true,
            allowPickup: (data as any).allowPickup ?? false,
            cuisineType: (data as any).cuisineType ?? "",
            announcement: (data as any).announcement ?? "",
            commercialLicenseUrl: (data as any).commercialLicenseUrl ?? "",
            licenseStatus: (data as any).licenseStatus,
            licenseNotes: (data as any).licenseNotes ?? "",
            bankName: bankData.bankName,
            bankAccountName: bankData.bankAccountName,
            bankAccountNumber: bankData.bankAccountNumber,
            isHiring: (data as any).isHiring ?? false,
            hiringDescription: (data as any).hiringDescription ?? "",
            hiringContact: (data as any).hiringContact ?? "",
          })
        }
      } catch (e: any) {
        toast.error("تعذّرت قراءة بيانات المطعم")
        // console.error(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [user, toast])

  // نظافة معاينة blob
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview)
    }
  }, [preview])

  // نظافة معاينة الترخيص blob
  useEffect(() => {
    return () => {
      if (commercialPreview) URL.revokeObjectURL(commercialPreview)
    }
  }, [commercialPreview])

  // ====== Handlers ======
  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: value }))
  }

  const onPickLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null
    setFile(f)
    if (f) {
      const url = URL.createObjectURL(f)
      setPreview(url)
    } else {
      setPreview("")
    }
  }

  // 📱 معالج محسّن لاختيار صورة الترخيص (متوافق مع الجوال)
  const onPickLicense = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const f = e.target.files?.[0]
      if (!f) {
        setCommercialFile(null)
        setCommercialPreview("")
        return
      }

      // التحقق من نوع الملف
      const isValidType = /^(image\/|application\/pdf)/.test(f.type)
      if (!isValidType) {
        toast.warning("📄 الملف يجب أن يكون صورة أو PDF")
        if (licenseInputRef.current) licenseInputRef.current.value = ""
        return
      }

      // التحقق من حجم الملف (5MB max)
      const MAX_SIZE = 5 * 1024 * 1024
      if (f.size > MAX_SIZE) {
        toast.warning("📁 حجم الملف كبير، يرجى اختيار ملف أقل من 5MB")
        if (licenseInputRef.current) licenseInputRef.current.value = ""
        return
      }

      setCommercialFile(f)

      // إنشاء معاينة للصور فقط
      if (f.type.startsWith('image/')) {
        const url = URL.createObjectURL(f)
        setCommercialPreview(url)
      } else {
        setCommercialPreview("")
      }

      toast.success("✅ تم اختيار الملف بنجاح")
    } catch (err) {
      console.error('❌ خطأ في اختيار الملف:', err)
      toast.error("حدث خطأ أثناء اختيار الملف")
    }
  }

  const uploadLogoIfNeeded = async (): Promise<string | undefined> => {
    if (!user || !file) return undefined

    // فحص خفيف: نوع/حجم
    const isImage = /^image\//.test(file.type)
    if (!isImage) {
      toast.warning("الملف المختار ليس صورة")
      return undefined
    }
    const MAX = 3 * 1024 * 1024 // 3MB
    if (file.size > MAX) {
      toast.warning("حجم الصورة كبير، يرجى اختيار صورة أقل من 3MB")
      return undefined
    }

    // اسم ملف فريد + امتداد صحيح
    const cleanName = file.name.replace(/\s+/g, "_")
    const path = `restaurants/${user.uid}/logo_${Date.now()}_${cleanName}`
    const r = ref(storage, path)
    const metadata = {
      contentType: file.type || "image/jpeg",
      cacheControl: "public,max-age=31536000,immutable",
    }

    // رفع
    await uploadBytes(r, file, metadata)
    const url = await getDownloadURL(r)

    // كسر الكاش على واجهة العميل عند التبديل مباشرة
    const busted = `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`
    return busted
  }

  // رفع ملف الترخيص
  const uploadLicenseFile = async (licenseFile: File, type: 'commercial' | 'health'): Promise<string | undefined> => {
    if (!user || !licenseFile) return undefined

    const isValidType = /^(image\/|application\/pdf)/.test(licenseFile.type)
    if (!isValidType) {
      toast.warning("الملف يجب أن يكون صورة أو PDF")
      return undefined
    }
    const MAX = 5 * 1024 * 1024 // 5MB
    if (licenseFile.size > MAX) {
      toast.warning("حجم الملف كبير، يرجى اختيار ملف أقل من 5MB")
      return undefined
    }

    const cleanName = licenseFile.name.replace(/\s+/g, "_")
    const path = `restaurants/${user.uid}/licenses/${type}_${Date.now()}_${cleanName}`
    const r = ref(storage, path)
    const metadata = {
      contentType: licenseFile.type,
      cacheControl: "public,max-age=31536000,immutable",
    }

    await uploadBytes(r, licenseFile, metadata)
    return await getDownloadURL(r)
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      toast.warning("⚠️ يجب تسجيل الدخول أولاً")
      return
    }
    if (!form.name.trim()) {
      toast.warning("اكتب اسم المطعم")
      return
    }

    setSaving(true)
    try {
      let logoUrl = form.logoUrl
      let commercialLicenseUrl = form.commercialLicenseUrl
      let licenseStatus = form.licenseStatus

      if (file) {
        toast.info("⏳ جاري رفع الشعار …")
        const uploaded = await uploadLogoIfNeeded()
        if (uploaded) logoUrl = uploaded
      }

      // رفع الرخصة التجارية
      if (commercialFile) {
        toast.info("⏳ جاري رفع الرخصة التجارية …")
        const uploaded = await uploadLicenseFile(commercialFile, 'commercial')
        if (uploaded) {
          commercialLicenseUrl = uploaded
          licenseStatus = 'pending' // إعادة المراجعة عند تحديث الترخيص
        }
      }

      // حفظ بيانات المطعم الأساسية (اسم البنك فقط للعرض، باقي البيانات الحساسة في subcollection)
      const { bankAccountName, bankAccountNumber, ...publicData } = form
      
      await setDoc(
        doc(db, "restaurants", user.uid),
        { 
          ...publicData, 
          logoUrl,
          commercialLicenseUrl,
          licenseStatus,
        },
        { merge: true }
      )

      // حفظ بيانات البنك في subcollection محمي منفصل
      if (form.bankName || bankAccountName || bankAccountNumber) {
        await setDoc(
          doc(db, "restaurants", user.uid, "private", "bankInfo"),
          {
            bankName: form.bankName || "",
            bankAccountName: bankAccountName || "",
            bankAccountNumber: bankAccountNumber || "",
          },
          { merge: true }
        )
      }

      // تنظيف الملفات
      if (preview) URL.revokeObjectURL(preview)
      if (commercialPreview) URL.revokeObjectURL(commercialPreview)
      setPreview("")
      setCommercialPreview("")
      setFile(null)
      setCommercialFile(null)

      toast.success("تم حفظ التعديلات بنجاح 🎉", { title: "تعديل المطعم" })
    } catch (err: any) {
      // أمور شائعة: App Check، قواعد Storage/Firestore، صلاحيات المستخدم
      toast.error(`فشل الحفظ: ${err?.message || "خطأ غير معروف"}`)
      // console.error("Save error:", err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-6 text-center">جارِ التحميل…</div>

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-2xl shadow-lg mt-8 text-gray-900">
      <h1 className="text-2xl font-bold text-center mb-6">تعديل بيانات المطعم</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Logo picker + tiny preview */}
        <div className="space-y-2">
          <label className="block font-semibold">شعار المطعم</label>

          <div className="flex items-center gap-3">
            {/* أيقونة معاينة صغيرة */}
            <div className="w-14 h-14 rounded-full overflow-hidden border bg-gray-100 shrink-0">
              {/* الأولوية: المعاينة • بعدها الشعار المحفوظ */}
              {(preview || form.logoUrl) ? (
                <img
                  src={preview || form.logoUrl}
                  className="w-full h-full object-cover"
                  onError={(e: any) => (e.currentTarget.style.display = "none")}
                  alt="logo"
                />
              ) : null}
            </div>

            <input type="file" accept="image/*" onChange={onPickLogo} />
          </div>

          {file && (
            <div className="text-xs text-gray-600">
              سيتم رفع: <span className="font-semibold">{file.name}</span>
            </div>
          )}
        </div>

        <input
          name="name"
          placeholder="اسم المطعم"
          value={form.name}
          onChange={onChange}
          className="w-full border p-3 rounded-xl"
        />
        <input
          name="phone"
          placeholder="رقم الجوال"
          value={form.phone}
          onChange={onChange}
          className="w-full border p-3 rounded-xl"
        />
        <div className="relative">
          <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-sky-400 pointer-events-none" />
          <select
            name="city"
            value={form.city}
            onChange={(e) => setForm(p => ({ ...p, city: e.target.value }))}
            className="w-full border p-3 pr-10 rounded-xl bg-white appearance-none cursor-pointer focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          >
            <option value="">اختر المدينة</option>
            {SAUDI_CITIES.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>
        <input
          name="location"
          placeholder="الموقع"
          value={form.location}
          onChange={onChange}
          className="w-full border p-3 rounded-xl"
        />

        {/* نوع المطبخ */}
        <div className="relative">
          <select
            name="cuisineType"
            value={form.cuisineType || ''}
            onChange={(e) => setForm(p => ({ ...p, cuisineType: e.target.value }))}
            className="w-full border p-3 rounded-xl bg-white appearance-none cursor-pointer focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
          >
            {CUISINE_TYPES.map(cuisine => (
              <option key={cuisine.value} value={cuisine.value}>{cuisine.label}</option>
            ))}
          </select>
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
            نوع المطبخ
          </span>
        </div>

        {/* ملاحظة قصيرة للعملاء */}
        <div className="space-y-2">
          <label className="block font-semibold text-gray-700 flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-500" />
            ملاحظة قصيرة للعملاء
          </label>
          <textarea
            name="announcement"
            placeholder="اكتب ملاحظة قصيرة تظهر للعملاء عند زيارة متجرك... مثلاً: نستقبل الطلبات من الساعة 4 عصراً"
            value={form.announcement || ''}
            onChange={onChange}
            maxLength={150}
            rows={2}
            className="w-full border p-3 rounded-xl resize-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
          />
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <span>{form.announcement?.length || 0}/150</span>
            حرف
          </p>
        </div>

        {/* قسم خيارات التوصيل والاستلام */}
        <div className="border-t pt-4 mt-4">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Store className="w-5 h-5 text-green-500" />
            خيارات الطلب
          </h2>
          
          {/* زر حالة المتجر: متاح/مغلق */}
          <div className={`flex items-center justify-between p-4 rounded-xl mb-3 ${form.isOpen ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${form.isOpen ? 'bg-green-500' : 'bg-red-500'}`}>
                {form.isOpen ? (
                  <Store className="w-5 h-5 text-white" />
                ) : (
                  <Lock className="w-5 h-5 text-white" />
                )}
              </div>
              <div>
                <p className={`font-semibold ${form.isOpen ? 'text-green-800' : 'text-red-800'}`}>
                  {form.isOpen ? '✓ المتجر متاح' : '✕ المتجر مغلق'}
                </p>
                <p className="text-sm text-gray-500">
                  {form.isOpen ? 'العملاء يمكنهم الطلب الآن' : 'الطلبات معطلة مؤقتاً'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setForm(p => ({ ...p, isOpen: !p.isOpen }))}
              className={`relative w-14 h-8 rounded-full transition-colors ${form.isOpen ? 'bg-green-500' : 'bg-red-400'}`}
            >
              <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${form.isOpen ? 'right-1' : 'left-1'}`} />
            </button>
          </div>
          {!form.isOpen && (
            <p className="mb-3 text-sm text-red-600 bg-red-50 p-2 rounded-lg">
              ⚠️ المتجر مغلق - العملاء لن يتمكنوا من إضافة أصناف للسلة
            </p>
          )}

          {/* زر تفعيل التوصيل */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${form.allowDelivery ? 'bg-sky-500' : 'bg-gray-300'}`}>
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-800">التوصيل للعملاء</p>
                <p className="text-sm text-gray-500">توصيل الطلبات لموقع العميل</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setForm(p => ({ ...p, allowDelivery: !p.allowDelivery }))}
              className={`relative w-14 h-8 rounded-full transition-colors ${form.allowDelivery ? 'bg-sky-500' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${form.allowDelivery ? 'right-1' : 'left-1'}`} />
            </button>
          </div>
          {form.allowDelivery && (
            <p className="mb-3 text-sm text-sky-600 bg-sky-50 p-2 rounded-lg">
              🚗 التوصيل مفعّل - ستظهر علامة "توصيل" بجانب مطعمك للعملاء
            </p>
          )}
          
          {/* زر تفعيل الاستلام من المطعم */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${form.allowPickup ? 'bg-green-500' : 'bg-gray-300'}`}>
                <Store className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-800">الاستلام من المطعم</p>
                <p className="text-sm text-gray-500">السماح للعملاء باستلام طلباتهم من موقع المطعم</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setForm(p => ({ ...p, allowPickup: !p.allowPickup }))}
              className={`relative w-14 h-8 rounded-full transition-colors ${form.allowPickup ? 'bg-green-500' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${form.allowPickup ? 'right-1' : 'left-1'}`} />
            </button>
          </div>
          {form.allowPickup && (
            <p className="mt-2 text-sm text-green-600 bg-green-50 p-2 rounded-lg">
              ✓ العملاء يمكنهم اختيار استلام طلباتهم من موقع المطعم (بدون رسوم توصيل)
            </p>
          )}
        </div>

        {/* قسم التراخيص */}
        <div className="border-t pt-4 mt-4">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-500" />
            التراخيص والشهادات
          </h2>

          {/* حالة التراخيص */}
          {form.licenseStatus && (
            <div className={`mb-4 p-3 rounded-xl flex items-center gap-2 ${
              form.licenseStatus === 'approved' ? 'bg-green-50 text-green-700' :
              form.licenseStatus === 'rejected' ? 'bg-red-50 text-red-700' :
              'bg-yellow-50 text-yellow-700'
            }`}>
              {form.licenseStatus === 'approved' && <CheckCircle className="w-5 h-5" />}
              {form.licenseStatus === 'rejected' && <AlertCircle className="w-5 h-5" />}
              {form.licenseStatus === 'pending' && <Clock className="w-5 h-5" />}
              <span className="font-semibold">
                {form.licenseStatus === 'approved' && 'التراخيص موافق عليها ✓'}
                {form.licenseStatus === 'rejected' && 'التراخيص مرفوضة'}
                {form.licenseStatus === 'pending' && 'التراخيص قيد المراجعة...'}
              </span>
            </div>
          )}
          {form.licenseNotes && form.licenseStatus === 'rejected' && (
            <div className="mb-4 p-3 bg-red-50 rounded-xl text-red-600 text-sm">
              <strong>ملاحظات:</strong> {form.licenseNotes}
            </div>
          )}

          {/* الرخصة التجارية */}
          <div className="space-y-2 mb-4">
            <label className="block font-semibold text-gray-700 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-orange-500" />
              الرخصة التجارية
            </label>
            {/* عرض الترخيص الحالي أو المعاينة */}
            <div className="flex flex-wrap items-center gap-3 mb-2">
              {commercialPreview && (
                <div className="w-20 h-20 rounded-lg overflow-hidden border bg-gray-100">
                  <img
                    src={commercialPreview}
                    alt="معاينة الترخيص"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              {form.commercialLicenseUrl && !commercialPreview && (
                <a 
                  href={form.commercialLicenseUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-sky-50 text-sky-600 px-3 py-2 rounded-lg text-sm hover:bg-sky-100"
                >
                  <FileText className="w-4 h-4" />
                  عرض الملف الحالي
                </a>
              )}
            </div>

            {/* زر اختيار الملف - محسّن للجوال */}
            <div className="flex flex-col gap-2">
              <label className="relative cursor-pointer">
                <input 
                  ref={licenseInputRef}
                  type="file" 
                  accept="image/*,application/pdf"
                  capture="environment"
                  onChange={onPickLicense}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex items-center justify-center gap-2 bg-sky-100 hover:bg-sky-200 text-sky-700 px-4 py-3 rounded-xl text-sm font-medium transition-colors">
                  <FileText className="w-5 h-5" />
                  {commercialFile ? 'تغيير الملف' : 'اختر صورة الترخيص'}
                </div>
              </label>
              <p className="text-xs text-gray-500">📷 يمكنك التقاط صورة أو اختيار ملف (صورة أو PDF بحد أقصى 5MB)</p>
            </div>

            {commercialFile && (
              <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-2 rounded-lg text-sm mt-2">
                <CheckCircle className="w-4 h-4" />
                سيتم رفع: <span className="font-semibold">{commercialFile.name}</span>
              </div>
            )}
          </div>

        </div>

        {/* قسم بيانات الحساب البنكي */}
        <div className="border-t pt-4 mt-4">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-green-500" />
            بيانات الحساب البنكي
          </h2>
          <p className="text-sm text-gray-500 mb-4 bg-green-50 p-3 rounded-xl">
            💰 أدخل بيانات حسابك البنكي ليتمكن العملاء من تحويل مبلغ الطلب مباشرة
          </p>

          <div className="space-y-3">
            <div className="relative">
              <select
                name="bankName"
                value={form.bankName || ""}
                onChange={(e) => setForm(p => ({ ...p, bankName: e.target.value }))}
                className="w-full border p-3 rounded-xl bg-white appearance-none cursor-pointer focus:border-green-400 focus:ring-2 focus:ring-green-100"
              >
                <option value="">اختر البنك</option>
                <option value="الراجحي">بنك الراجحي</option>
                <option value="الأهلي">البنك الأهلي السعودي</option>
                <option value="الإنماء">مصرف الإنماء</option>
                <option value="الرياض">بنك الرياض</option>
                <option value="البلاد">بنك البلاد</option>
                <option value="الجزيرة">بنك الجزيرة</option>
                <option value="العربي">البنك العربي الوطني</option>
                <option value="السعودي الفرنسي">البنك السعودي الفرنسي</option>
                <option value="ساب">بنك ساب</option>
                <option value="stc pay">STC Pay</option>
                <option value="أخرى">أخرى</option>
              </select>
            </div>

            <input
              name="bankAccountName"
              placeholder="اسم صاحب الحساب"
              value={form.bankAccountName || ""}
              onChange={onChange}
              className="w-full border p-3 rounded-xl focus:border-green-400 focus:ring-2 focus:ring-green-100"
            />

            <input
              name="bankAccountNumber"
              placeholder="رقم الآيبان أو الحساب"
              value={form.bankAccountNumber || ""}
              onChange={onChange}
              className="w-full border p-3 rounded-xl focus:border-green-400 focus:ring-2 focus:ring-green-100 font-mono text-left"
              dir="ltr"
            />

            {form.bankName && form.bankAccountName && form.bankAccountNumber && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-green-700 text-sm">
                ✅ بيانات البنك مكتملة - سيتمكن العملاء من رؤيتها عند الطلب
              </div>
            )}
          </div>
        </div>

        {/* قسم التوظيف */}
        <div className="border-t pt-4 mt-4">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-purple-500" />
            توظيف عاملات للطبخ
          </h2>
          <p className="text-sm text-gray-500 mb-4 bg-purple-50 p-3 rounded-xl">
            👩‍🍳 فعّل هذا الخيار إذا كنت تبحث عن عاملات للمساعدة في الطبخ
          </p>

          {/* زر تفعيل التوظيف */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${form.isHiring ? 'bg-purple-500' : 'bg-gray-300'}`}>
                <Briefcase className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-gray-800">البحث عن موظفات</p>
                <p className="text-sm text-gray-500">عرض إعلان توظيف في صفحتك</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setForm(p => ({ ...p, isHiring: !p.isHiring }))}
              className={`relative w-14 h-8 rounded-full transition-colors ${form.isHiring ? 'bg-purple-500' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-transform ${form.isHiring ? 'right-1' : 'left-1'}`} />
            </button>
          </div>

          {form.isHiring && (
            <div className="space-y-3 bg-purple-50 p-4 rounded-xl">
              <textarea
                name="hiringDescription"
                placeholder="وصف الوظيفة المطلوبة (مثال: نبحث عن طباخة ماهرة للعمل بدوام جزئي...)"
                value={form.hiringDescription || ""}
                onChange={(e) => setForm(p => ({ ...p, hiringDescription: e.target.value }))}
                className="w-full border p-3 rounded-xl focus:border-purple-400 focus:ring-2 focus:ring-purple-100 min-h-[100px]"
                rows={3}
              />

              <input
                name="hiringContact"
                placeholder="رقم التواصل للتوظيف (واتساب)"
                value={form.hiringContact || ""}
                onChange={onChange}
                className="w-full border p-3 rounded-xl focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
              />

              {form.hiringDescription && form.hiringContact && (
                <div className="bg-purple-100 border border-purple-200 rounded-xl p-3 text-purple-700 text-sm">
                  ✅ إعلان التوظيف جاهز للعرض في صفحتك
                </div>
              )}
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSave}
          className="w-full bg-gray-900 hover:bg-gray-800 text-white py-3 rounded-xl font-semibold transition disabled:opacity-60"
        >
          {saving ? "جارٍ الحفظ…" : "حفظ"}
        </button>
      </form>
    </div>
  )
}

export default EditRestaurant
