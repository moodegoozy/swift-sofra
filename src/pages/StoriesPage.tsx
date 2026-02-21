// src/pages/StoriesPage.tsx
// صفحة إدارة الستوريات للأسرة المنتجة
import React, { useEffect, useState, useRef } from 'react'
import { db, storage } from '@/firebase'
import { collection, addDoc, deleteDoc, doc, query, where, getDocs, serverTimestamp, getDoc, Timestamp } from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { useAuth } from '@/auth'
import { Story, MenuItem } from '@/types'
import { useToast } from '@/components/ui/Toast'
import { 
  Camera, Video, Type, Plus, Trash2, Eye, Clock, 
  X, Upload, Loader2, Image, Link2, Sparkles, 
  ChefHat, ShoppingBag
} from 'lucide-react'

// مدة الستوري بالساعات
const STORY_DURATION_HOURS = 24

export const StoriesPage: React.FC = () => {
  const { user } = useAuth()
  const toast = useToast()
  const [stories, setStories] = useState<Story[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [restaurant, setRestaurant] = useState<{ name?: string; logoUrl?: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    type: 'image' as 'image' | 'video' | 'text',
    mediaFile: null as File | null,
    mediaPreview: '',
    caption: '',
    backgroundColor: '#0ea5e9', // sky-500
    textColor: '#ffffff',
    menuItemId: '',
  })

  // تحميل البيانات
  useEffect(() => {
    if (!user) return
    loadData()
  }, [user])

  const loadData = async () => {
    if (!user) return
    try {
      // جلب بيانات المطعم
      const restSnap = await getDoc(doc(db, 'restaurants', user.uid))
      if (restSnap.exists()) {
        setRestaurant(restSnap.data() as any)
      }

      // جلب الستوريات النشطة
      const q = query(
        collection(db, 'stories'),
        where('ownerId', '==', user.uid)
      )
      const snap = await getDocs(q)
      const now = new Date()
      const data = snap.docs
        .map(d => ({
          id: d.id,
          ...d.data(),
          expiresAt: d.data().expiresAt?.toDate?.(),
          createdAt: d.data().createdAt?.toDate?.(),
        } as Story))
        .filter(s => s.expiresAt && new Date(s.expiresAt) > now)
        .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      setStories(data)

      // جلب الأصناف للربط
      const itemsQuery = query(
        collection(db, 'menuItems'),
        where('ownerId', '==', user.uid)
      )
      const itemsSnap = await getDocs(itemsQuery)
      setMenuItems(itemsSnap.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem)))
    } catch (err) {
      console.error('Error loading data:', err)
      toast.error('حدث خطأ في تحميل البيانات')
    } finally {
      setLoading(false)
    }
  }

  // اختيار ملف
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')

    if (!isImage && !isVideo) {
      toast.warning('يرجى اختيار صورة أو فيديو')
      return
    }

    // حد الحجم: 10MB للصور، 30MB للفيديو
    const maxSize = isVideo ? 30 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxSize) {
      toast.warning(isVideo ? 'حجم الفيديو يجب أن يكون أقل من 30 ميجا' : 'حجم الصورة يجب أن يكون أقل من 10 ميجا')
      return
    }

    setForm({
      ...form,
      type: isVideo ? 'video' : 'image',
      mediaFile: file,
      mediaPreview: URL.createObjectURL(file),
    })
  }

  // رفع الستوري
  const handleSubmit = async () => {
    if (!user) return

    // التحقق من المحتوى
    if (form.type !== 'text' && !form.mediaFile) {
      toast.warning('يرجى اختيار صورة أو فيديو')
      return
    }
    if (form.type === 'text' && !form.caption.trim()) {
      toast.warning('يرجى كتابة نص الستوري')
      return
    }

    setUploading(true)
    try {
      let mediaUrl = ''

      // رفع الملف إذا كان موجود
      if (form.mediaFile) {
        const ext = form.mediaFile.name.split('.').pop()
        const fileName = `stories/${user.uid}/${Date.now()}.${ext}`
        const storageRef = ref(storage, fileName)
        
        const uploadTask = uploadBytesResumable(storageRef, form.mediaFile)
        
        await new Promise<void>((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
              setUploadProgress(progress)
            },
            reject,
            async () => {
              mediaUrl = await getDownloadURL(uploadTask.snapshot.ref)
              resolve()
            }
          )
        })
      }

      // إنشاء الستوري
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + STORY_DURATION_HOURS)

      const menuItem = menuItems.find(m => m.id === form.menuItemId)

      const storyData: Partial<Story> = {
        ownerId: user.uid,
        restaurantId: user.uid,
        restaurantName: restaurant?.name,
        restaurantLogo: restaurant?.logoUrl,
        type: form.type,
        mediaUrl: mediaUrl || undefined,
        caption: form.caption.trim() || undefined,
        backgroundColor: form.type === 'text' ? form.backgroundColor : undefined,
        textColor: form.type === 'text' ? form.textColor : undefined,
        menuItemId: form.menuItemId || undefined,
        menuItemName: menuItem?.name,
        viewsCount: 0,
        viewedBy: [],
        expiresAt: Timestamp.fromDate(expiresAt) as any,
        createdAt: serverTimestamp() as any,
      }

      const newDoc = await addDoc(collection(db, 'stories'), storyData)
      
      console.log('✅ Story created successfully:', newDoc.id)
      
      setStories(prev => [{
        id: newDoc.id,
        ...storyData,
        expiresAt,
        createdAt: new Date(),
      } as Story, ...prev])

      toast.success('تم نشر الستوري! 🎉')
      setShowForm(false)
      resetForm()
    } catch (err: any) {
      console.error('❌ Error uploading story:', err)
      console.error('Error code:', err?.code)
      console.error('Error message:', err?.message)
      toast.error(`حدث خطأ: ${err?.message || 'غير معروف'}`)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  // حذف ستوري
  const deleteStory = async (id: string) => {
    if (!confirm('هل تريد حذف هذا الستوري؟')) return
    try {
      await deleteDoc(doc(db, 'stories', id))
      setStories(prev => prev.filter(s => s.id !== id))
      toast.success('تم حذف الستوري')
    } catch (err) {
      toast.error('حدث خطأ')
    }
  }

  // إعادة تعيين النموذج
  const resetForm = () => {
    setForm({
      type: 'image',
      mediaFile: null,
      mediaPreview: '',
      caption: '',
      backgroundColor: '#0ea5e9',
      textColor: '#ffffff',
      menuItemId: '',
    })
    if (fileRef.current) fileRef.current.value = ''
  }

  // حساب الوقت المتبقي
  const getTimeRemaining = (expiresAt: Date) => {
    const now = new Date()
    const diff = new Date(expiresAt).getTime() - now.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    if (hours > 0) return `${hours} ساعة`
    return `${minutes} دقيقة`
  }

  // ألوان الخلفية المتاحة
  const bgColors = [
    '#0ea5e9', // sky
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#f97316', // orange
    '#22c55e', // green
    '#1f2937', // gray-800
    '#dc2626', // red
    '#0891b2', // cyan
  ]

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-sky-700">📸 ستوري الأسرة</h1>
          <p className="text-gray-500 text-sm mt-1">شارك طبخ اليوم وعروضك مع العملاء</p>
        </div>
        <button
          onClick={() => { setShowForm(true); resetForm() }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-bold shadow-lg hover:scale-105 transition"
        >
          <Plus className="w-5 h-5" />
          ستوري جديد
        </button>
      </div>

      {/* معلومات */}
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-4 border border-pink-200">
        <div className="flex items-center gap-2 text-pink-700">
          <Sparkles className="w-5 h-5" />
          <span className="font-bold">ستوري مجاني!</span>
        </div>
        <p className="text-sm text-pink-600 mt-1">
          شارك صور الطبخ والعروض مع عملائك. الستوري يظهر لـ 24 ساعة ثم يختفي تلقائياً.
        </p>
      </div>

      {/* نموذج إضافة ستوري */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* رأس النموذج */}
            <div className="bg-gradient-to-r from-pink-500 to-purple-500 p-4 text-white sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold">📸 ستوري جديد</h2>
                <button onClick={() => setShowForm(false)} className="p-1 hover:bg-white/20 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* نوع الستوري */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">نوع الستوري</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setForm({ ...form, type: 'image', mediaFile: null, mediaPreview: '' })}
                    className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition ${
                      form.type === 'image' ? 'border-pink-500 bg-pink-50' : 'border-gray-200'
                    }`}
                  >
                    <Image className={`w-6 h-6 ${form.type === 'image' ? 'text-pink-600' : 'text-gray-400'}`} />
                    <span className="text-xs font-medium">صورة</span>
                  </button>
                  <button
                    onClick={() => setForm({ ...form, type: 'video', mediaFile: null, mediaPreview: '' })}
                    className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition ${
                      form.type === 'video' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
                    }`}
                  >
                    <Video className={`w-6 h-6 ${form.type === 'video' ? 'text-purple-600' : 'text-gray-400'}`} />
                    <span className="text-xs font-medium">فيديو</span>
                  </button>
                  <button
                    onClick={() => setForm({ ...form, type: 'text', mediaFile: null, mediaPreview: '' })}
                    className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition ${
                      form.type === 'text' ? 'border-sky-500 bg-sky-50' : 'border-gray-200'
                    }`}
                  >
                    <Type className={`w-6 h-6 ${form.type === 'text' ? 'text-sky-600' : 'text-gray-400'}`} />
                    <span className="text-xs font-medium">نص</span>
                  </button>
                </div>
              </div>

              {/* رفع الوسائط */}
              {(form.type === 'image' || form.type === 'video') && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    {form.type === 'image' ? '📷 اختر صورة' : '🎬 اختر فيديو'}
                  </label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept={form.type === 'video' ? 'video/*' : 'image/*'}
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  {form.mediaPreview ? (
                    <div className="relative rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-[300px]">
                      {form.type === 'video' ? (
                        <video src={form.mediaPreview} className="w-full h-full object-contain" controls />
                      ) : (
                        <img src={form.mediaPreview} alt="Preview" className="w-full h-full object-contain" />
                      )}
                      <button
                        onClick={() => { setForm({ ...form, mediaFile: null, mediaPreview: '' }); if (fileRef.current) fileRef.current.value = '' }}
                        className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="w-full aspect-[9/16] max-h-[200px] border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-pink-400 hover:bg-pink-50 transition"
                    >
                      <Upload className="w-10 h-10 text-gray-400" />
                      <span className="text-gray-500 font-medium">اضغط للرفع</span>
                      <span className="text-xs text-gray-400">
                        {form.type === 'video' ? 'حد 30 ميجا' : 'حد 10 ميجا'}
                      </span>
                    </button>
                  )}
                </div>
              )}

              {/* ستوري نص */}
              {form.type === 'text' && (
                <div className="space-y-4">
                  {/* معاينة */}
                  <div 
                    className="aspect-[9/16] max-h-[250px] rounded-xl flex items-center justify-center p-6"
                    style={{ backgroundColor: form.backgroundColor }}
                  >
                    <p 
                      className="text-center text-xl font-bold leading-relaxed"
                      style={{ color: form.textColor }}
                    >
                      {form.caption || 'اكتب نص الستوري...'}
                    </p>
                  </div>

                  {/* ألوان الخلفية */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">لون الخلفية</label>
                    <div className="flex gap-2 flex-wrap">
                      {bgColors.map(color => (
                        <button
                          key={color}
                          onClick={() => setForm({ ...form, backgroundColor: color })}
                          className={`w-10 h-10 rounded-full transition-transform ${
                            form.backgroundColor === color ? 'ring-4 ring-pink-300 scale-110' : ''
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* النص المصاحب */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  {form.type === 'text' ? 'نص الستوري *' : 'نص مصاحب (اختياري)'}
                </label>
                <textarea
                  value={form.caption}
                  onChange={e => setForm({ ...form, caption: e.target.value })}
                  placeholder={form.type === 'text' ? 'اكتب نص الستوري...' : 'مثال: طبخ اليوم 🍚'}
                  rows={3}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-pink-500 focus:outline-none resize-none"
                />
              </div>

              {/* ربط بصنف */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  <ShoppingBag className="w-4 h-4 inline ml-1" />
                  ربط بصنف (اختياري)
                </label>
                <select
                  value={form.menuItemId}
                  onChange={e => setForm({ ...form, menuItemId: e.target.value })}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-pink-500 focus:outline-none"
                >
                  <option value="">بدون ربط</option>
                  {menuItems.filter(m => m.available !== false).map(item => (
                    <option key={item.id} value={item.id}>{item.name} - {item.price} ر.س</option>
                  ))}
                </select>
              </div>

              {/* شريط التقدم */}
              {uploading && (
                <div className="bg-pink-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Loader2 className="w-5 h-5 text-pink-500 animate-spin" />
                    <span className="text-pink-700 font-medium">جارِ الرفع...</span>
                  </div>
                  <div className="h-2 bg-pink-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* أزرار */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSubmit}
                  disabled={uploading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-bold shadow-lg hover:scale-[1.02] transition disabled:opacity-50"
                >
                  <Camera className="w-5 h-5" />
                  نشر الستوري
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

      {/* قائمة الستوريات */}
      {stories.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl">
          <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Camera className="w-10 h-10 text-pink-500" />
          </div>
          <p className="text-gray-600 font-semibold mb-2">لا توجد ستوريات</p>
          <p className="text-gray-400 text-sm">شارك طبخ اليوم مع عملائك!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {stories.map(story => (
            <div key={story.id} className="relative group">
              {/* معاينة الستوري */}
              <div className="aspect-[9/16] rounded-2xl overflow-hidden shadow-lg">
                {story.type === 'text' ? (
                  <div 
                    className="w-full h-full flex items-center justify-center p-4"
                    style={{ backgroundColor: story.backgroundColor }}
                  >
                    <p 
                      className="text-center text-sm font-bold leading-relaxed line-clamp-6"
                      style={{ color: story.textColor }}
                    >
                      {story.caption}
                    </p>
                  </div>
                ) : story.type === 'video' ? (
                  <video src={story.mediaUrl} className="w-full h-full object-cover" />
                ) : (
                  <img src={story.mediaUrl} alt="" className="w-full h-full object-cover" />
                )}
                
                {/* overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                
                {/* الوقت المتبقي */}
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/50 text-white text-xs font-medium px-2 py-1 rounded-full">
                  <Clock className="w-3 h-3" />
                  {getTimeRemaining(story.expiresAt)}
                </div>

                {/* المشاهدات */}
                <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/50 text-white text-xs font-medium px-2 py-1 rounded-full">
                  <Eye className="w-3 h-3" />
                  {story.viewsCount}
                </div>

                {/* زر الحذف */}
                <button
                  onClick={() => deleteStory(story.id)}
                  className="absolute top-2 left-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                {/* الصنف المربوط */}
                {story.menuItemName && (
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    <ChefHat className="w-3 h-3" />
                    {story.menuItemName}
                  </div>
                )}
              </div>

              {/* النص */}
              {story.caption && story.type !== 'text' && (
                <p className="mt-2 text-sm text-gray-600 line-clamp-2">{story.caption}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default StoriesPage
