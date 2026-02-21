// src/pages/PromotionPage.tsx
import React, { useEffect, useState, useRef } from 'react'
import { db, storage } from '@/firebase'
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { useAuth } from '@/auth'
import { useToast } from '@/components/ui/Toast'
import { useDialog } from '@/components/ui/ConfirmDialog'
import { Promotion } from '@/types'
import { 
  Megaphone, Image, Video, FileText, Plus, Trash2, Eye, 
  Clock, CheckCircle, XCircle, Upload, Sparkles, RefreshCw,
  ArrowRight
} from 'lucide-react'
import { Link } from 'react-router-dom'

// سعر الإعلان الرمزي (5 ريال لـ 24 ساعة)
const PROMOTION_PRICE = 5
const PROMOTION_DURATION_HOURS = 24

export const PromotionPage: React.FC = () => {
  const { user } = useAuth()
  const toast = useToast()
  const dialog = useDialog()
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    type: 'text' as 'text' | 'image' | 'video',
    title: '',
    description: '',
    mediaFile: null as File | null,
    mediaPreview: '',
  })

  // تحميل الإعلانات
  useEffect(() => {
    if (!user) return
    loadPromotions()
  }, [user])

  const loadPromotions = async () => {
    if (!user) return
    try {
      const q = query(collection(db, 'promotions'), where('ownerId', '==', user.uid))
      const snap = await getDocs(q)
      const data = snap.docs.map(d => ({
        id: d.id,
        ...d.data(),
        expiresAt: d.data().expiresAt?.toDate?.(),
        createdAt: d.data().createdAt?.toDate?.(),
      } as Promotion))
      // ترتيب حسب الأحدث
      data.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      setPromotions(data)
    } catch (err) {
      toast.error('خطأ في تحميل الإعلانات')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // التحقق من انتهاء الإعلان
  const isExpired = (promo: Promotion) => {
    if (!promo.expiresAt) return false
    return new Date() > new Date(promo.expiresAt)
  }

  // اختيار ملف الوسائط
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // التحقق من نوع الملف
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')

    if (!isImage && !isVideo) {
      toast.warning('يرجى اختيار صورة أو فيديو')
      return
    }

    // التحقق من حجم الملف (10 ميجا للصور، 50 ميجا للفيديو)
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxSize) {
      toast.warning(isVideo ? 'حجم الفيديو يجب أن يكون أقل من 50 ميجا' : 'حجم الصورة يجب أن يكون أقل من 10 ميجا')
      return
    }

    setForm({
      ...form,
      type: isVideo ? 'video' : 'image',
      mediaFile: file,
      mediaPreview: URL.createObjectURL(file),
    })
  }

  // إضافة إعلان جديد
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (form.type !== 'text' && !form.mediaFile) {
      toast.warning('يرجى اختيار صورة أو فيديو')
      return
    }

    if (!form.title.trim() && !form.description.trim() && !form.mediaFile) {
      toast.warning('يرجى إضافة محتوى للإعلان')
      return
    }

    try {
      setUploading(true)
      let mediaUrl = ''

      // رفع الوسائط
      if (form.mediaFile) {
        const safeName = form.mediaFile.name.replace(/\s+/g, '_').slice(-60)
        const path = `promotions/${user.uid}_${Date.now()}_${safeName}`
        const storageRef = ref(storage, path)

        const task = uploadBytesResumable(storageRef, form.mediaFile)

        await new Promise<void>((resolve, reject) => {
          task.on(
            'state_changed',
            (snap) => {
              const progress = Math.round((snap.bytesTransferred / snap.totalBytes) * 100)
              setUploadProgress(progress)
            },
            reject,
            async () => {
              mediaUrl = await getDownloadURL(task.snapshot.ref)
              resolve()
            }
          )
        })
      }

      // حساب تاريخ الانتهاء
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + PROMOTION_DURATION_HOURS)

      await addDoc(collection(db, 'promotions'), {
        ownerId: user.uid,
        restaurantId: user.uid, // نفس الـ UID للأسرة
        type: form.type,
        title: form.title.trim(),
        description: form.description.trim(),
        mediaUrl,
        isActive: true,
        isPaid: true, // مؤقتاً نفترض الدفع تم (يمكن إضافة بوابة دفع لاحقاً)
        price: PROMOTION_PRICE,
        duration: PROMOTION_DURATION_HOURS,
        viewsCount: 0,
        expiresAt: Timestamp.fromDate(expiresAt),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      toast.success(`تم نشر إعلانك! ✨ سيظهر لمدة ${PROMOTION_DURATION_HOURS} ساعة`)
      setForm({ type: 'text', title: '', description: '', mediaFile: null, mediaPreview: '' })
      setShowForm(false)
      setUploadProgress(0)
      loadPromotions()
    } catch (err) {
      toast.error('حدث خطأ في نشر الإعلان')
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  // حذف إعلان
  const handleDelete = async (id: string) => {
    const confirmed = await dialog.confirm('هل تريد حذف هذا الإعلان؟', { dangerous: true })
    if (!confirmed) return

    try {
      await deleteDoc(doc(db, 'promotions', id))
      toast.success('تم حذف الإعلان')
      loadPromotions()
    } catch (err) {
      toast.error('حدث خطأ')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-6 h-6 animate-spin ml-2" />
        جارِ التحميل...
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      {/* العنوان */}
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Megaphone className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800">الإعلانات الممولة</h1>
        <p className="text-gray-500 mt-2">أنشئ إعلانك وسيظهر للعملاء في صفحة أسرتك</p>
      </div>

      {/* سعر الإعلان */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-4 text-center">
        <div className="flex items-center justify-center gap-3">
          <Sparkles className="w-5 h-5 text-purple-500" />
          <span className="text-lg font-bold text-purple-700">
            {PROMOTION_PRICE} ر.س فقط لمدة {PROMOTION_DURATION_HOURS} ساعة
          </span>
          <Sparkles className="w-5 h-5 text-purple-500" />
        </div>
        <p className="text-sm text-purple-600 mt-1">أضف صورة أو فيديو أو نص ترويجي لأسرتك</p>
      </div>

      {/* زر إضافة إعلان */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold shadow-lg hover:shadow-xl transition flex items-center justify-center gap-3"
        >
          <Plus className="w-6 h-6" />
          إنشاء إعلان جديد
        </button>
      )}

      {/* نموذج الإعلان */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 space-y-4">
          <h2 className="font-bold text-lg text-gray-800 mb-4">إنشاء إعلان جديد</h2>

          {/* نوع الإعلان */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">نوع الإعلان</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, type: 'text', mediaFile: null, mediaPreview: '' })}
                className={`p-3 rounded-xl border-2 transition flex flex-col items-center gap-1 ${
                  form.type === 'text' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
                }`}
              >
                <FileText className="w-5 h-5" />
                <span className="text-sm">نص</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm({ ...form, type: 'image' })
                  fileRef.current?.click()
                }}
                className={`p-3 rounded-xl border-2 transition flex flex-col items-center gap-1 ${
                  form.type === 'image' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
                }`}
              >
                <Image className="w-5 h-5" />
                <span className="text-sm">صورة</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm({ ...form, type: 'video' })
                  fileRef.current?.click()
                }}
                className={`p-3 rounded-xl border-2 transition flex flex-col items-center gap-1 ${
                  form.type === 'video' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
                }`}
              >
                <Video className="w-5 h-5" />
                <span className="text-sm">فيديو</span>
              </button>
            </div>
          </div>

          {/* رفع الوسائط */}
          <input
            type="file"
            ref={fileRef}
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* معاينة الوسائط */}
          {form.mediaPreview && (
            <div className="relative">
              {form.type === 'video' ? (
                <video
                  src={form.mediaPreview}
                  controls
                  className="w-full h-48 object-cover rounded-xl"
                />
              ) : (
                <img
                  src={form.mediaPreview}
                  alt="معاينة"
                  className="w-full h-48 object-cover rounded-xl"
                />
              )}
              <button
                type="button"
                onClick={() => setForm({ ...form, mediaFile: null, mediaPreview: '', type: 'text' })}
                className="absolute top-2 left-2 p-2 bg-red-500 text-white rounded-full"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* زر اختيار ملف */}
          {form.type !== 'text' && !form.mediaPreview && (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-purple-400 transition flex items-center justify-center gap-2"
            >
              <Upload className="w-5 h-5" />
              اختر {form.type === 'video' ? 'فيديو' : 'صورة'}
            </button>
          )}

          {/* العنوان */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">العنوان (اختياري)</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="مثال: عرض خاص اليوم!"
              className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-purple-400 focus:outline-none"
            />
          </div>

          {/* الوصف */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">الشرح أو الوصف</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="اكتب تفاصيل إعلانك هنا..."
              rows={3}
              className="w-full border-2 border-gray-200 rounded-xl p-3 focus:border-purple-400 focus:outline-none"
            />
          </div>

          {/* شريط التقدم */}
          {uploading && uploadProgress > 0 && (
            <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-purple-500 h-full transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          {/* أزرار */}
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  جارِ النشر...
                </>
              ) : (
                <>
                  <Megaphone className="w-5 h-5" />
                  نشر الإعلان ({PROMOTION_PRICE} ر.س)
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setForm({ type: 'text', title: '', description: '', mediaFile: null, mediaPreview: '' })
              }}
              className="px-4 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-medium"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}

      {/* قائمة الإعلانات */}
      <div className="space-y-4">
        <h2 className="font-bold text-lg text-gray-800">إعلاناتك</h2>

        {promotions.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>لم تنشئ أي إعلانات بعد</p>
          </div>
        ) : (
          promotions.map(promo => (
            <div
              key={promo.id}
              className={`bg-white rounded-2xl shadow-lg overflow-hidden ${
                isExpired(promo) ? 'opacity-60' : ''
              }`}
            >
              {/* الوسائط */}
              {promo.mediaUrl && (
                promo.type === 'video' ? (
                  <video
                    src={promo.mediaUrl}
                    controls
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <img
                    src={promo.mediaUrl}
                    alt={promo.title}
                    className="w-full h-48 object-cover"
                  />
                )
              )}

              <div className="p-4">
                {/* الحالة */}
                <div className="flex items-center gap-2 mb-2">
                  {isExpired(promo) ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-500 text-xs font-medium rounded-full">
                      <XCircle className="w-3 h-3" /> منتهي
                    </span>
                  ) : promo.isActive ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-600 text-xs font-medium rounded-full">
                      <CheckCircle className="w-3 h-3" /> نشط
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-600 text-xs font-medium rounded-full">
                      <Clock className="w-3 h-3" /> في الانتظار
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-600 text-xs font-medium rounded-full">
                    <Eye className="w-3 h-3" /> {promo.viewsCount} مشاهدة
                  </span>
                </div>

                {/* المحتوى */}
                {promo.title && <h3 className="font-bold text-gray-800">{promo.title}</h3>}
                {promo.description && <p className="text-gray-600 text-sm mt-1">{promo.description}</p>}

                {/* التوقيت */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <span className="text-xs text-gray-400">
                    {promo.expiresAt && !isExpired(promo) && (
                      <>ينتهي: {new Date(promo.expiresAt).toLocaleString('ar-SA')}</>
                    )}
                    {isExpired(promo) && 'انتهت صلاحية الإعلان'}
                  </span>
                  <button
                    onClick={() => handleDelete(promo.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* رابط العودة */}
      <Link
        to="/owner"
        className="flex items-center justify-center gap-2 text-sky-600 hover:text-sky-700 py-4"
      >
        <ArrowRight className="w-5 h-5" />
        العودة للوحة التحكم
      </Link>
    </div>
  )
}
