// src/pages/ManageMenu.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { db, app } from '@/firebase'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  updateDoc,
} from 'firebase/firestore'
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
} from 'firebase/storage'
import { useAuth } from '@/auth'
import { useDialog } from '@/components/ui/ConfirmDialog'

/* =======================
   Toast محلي بسيط داخل الصفحة
   ======================= */
type ToastKind = 'success' | 'error' | 'info' | 'warning'
const Toast: React.FC<{ kind: ToastKind; message: string; onClose: () => void }> = ({ kind, message, onClose }) => {
  const base =
    kind === 'success' ? 'bg-green-600' :
    kind === 'error'   ? 'bg-rose-600'  :
    kind === 'warning' ? 'bg-amber-500' : 'bg-slate-800'
  useEffect(() => {
    const t = setTimeout(onClose, 2500)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div className={`fixed bottom-4 right-4 z-50 rounded-xl px-4 py-3 text-white shadow-lg ${base}`}>
      {message}
    </div>
  )
}

/* =======================
   الأنواع والحالة
   ======================= */
type Item = {
  id?: string
  name: string
  desc?: string
  price: number           // السعر المعروض
  imageUrl?: string
  available: boolean
  categoryId?: string
  ownerId?: string
  file?: File | null
  // الخصومات
  discountPercent?: number // نسبة الخصم (0-100)
  discountExpiresAt?: Date | string // تاريخ انتهاء الخصم

  // للواجهة المتفائلة
  _tempId?: string
  _optimistic?: boolean
  _progress?: number // 0..100
}

const emptyItem = (): Item => ({
  name: '',
  desc: '',
  price: 0,
  available: true,
  file: null,
  discountPercent: 0,
  discountExpiresAt: '',
})

/** ضغط خفيف للصورة قبل الرفع (اختياري) */
async function compressImage(file: File, maxW = 900, quality = 0.8): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxW / bitmap.width)
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(bitmap, 0, 0, w, h)

    const type = file.type.includes('png') ? 'image/png' : 'image/jpeg'
    const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), type, quality))
    return blob
  } catch {
    return file
  }
}

export const ManageMenu: React.FC = () => {
  const { user } = useAuth()
  const confirmDialog = useDialog()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<Item>(emptyItem())
  const [saving, setSaving] = useState(false)
  
  // ✅ حالة التعديل
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Item>(emptyItem())
  const [editSaving, setEditSaving] = useState(false)
  const editFileRef = useRef<HTMLInputElement | null>(null)

  // Toast state
  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(null)
  const notify = (kind: ToastKind, message: string) => setToast({ kind, message })

  // ⚠️ استخدم البكت الافتراضي للمشروع (بدون URL يدوي)
  const storage = getStorage(app)
  const fileRef = useRef<HTMLInputElement | null>(null)

  // ✅ تحميل أصناف مالك الحساب فقط
  const load = async () => {
    if (!user) return
    setLoading(true)
    const q = query(collection(db, 'menuItems'), where('ownerId', '==', user.uid))
    const snap = await getDocs(q)
    setItems(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })))
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  // ✅ إضافة متفائلة + شريط تقدّم + ضغط صورة
  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      notify('warning', '⚠️ لازم تسجل دخول أول')
      return
    }

    const price = Number(form.price || 0)
    if (!form.name.trim()) {
      notify('warning', '⚠️ اكتب اسم الصنف')
      return
    }
    if (!Number.isFinite(price) || price <= 0) {
      notify('warning', '⚠️ أدخل سعر صالح')
      return
    }

    setSaving(true)

    // 1) أضف بطاقة محلية فورية (Optimistic)
    const tempId = 'temp_' + Date.now()
    const localPreview = form.file ? URL.createObjectURL(form.file) : undefined

    const optimistic: Item = {
      _tempId: tempId,
      _optimistic: true,
      _progress: form.file ? 1 : 100,
      name: form.name,
      desc: form.desc || '',
      price,
      imageUrl: localPreview,
      available: form.available ?? true,
      ownerId: user.uid,
    }
    setItems(prev => [optimistic, ...prev])

    try {
      // 2) ارفع الصورة إن وُجدت (مع تقدم)
      let imageUrl: string | undefined
      if (form.file) {
        const blob = await compressImage(form.file)
        const safeName = form.file.name.replace(/\s+/g, '_').slice(-60)
        const path = `menuImages/${user.uid}_${Date.now()}_${safeName}`
        const storageRef = ref(storage, path)
        const task = uploadBytesResumable(storageRef, blob, {
          contentType: form.file.type || 'image/jpeg',
        })

        await new Promise<void>((resolve, reject) => {
          task.on(
            'state_changed',
            snap => {
              const p = Math.round((snap.bytesTransferred / snap.totalBytes) * 100)
              setItems(prev => prev.map(i => i._tempId === tempId ? { ...i, _progress: p } : i))
            },
            reject,
            async () => {
              const url = await getDownloadURL(task.snapshot.ref)
              // bust cache فورياً
              imageUrl = `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`
              resolve()
            }
          )
        })
      }

      // 3) أنشئ الوثيقة في فايرستور
      const payload: any = {
        name: optimistic.name,
        desc: optimistic.desc,
        price,
        imageUrl: imageUrl || '',
        available: optimistic.available,
        ownerId: user.uid,
        ...(optimistic.categoryId ? { categoryId: optimistic.categoryId } : {}),
        // حقول الخصم
        ...(form.discountPercent && form.discountPercent > 0 ? { discountPercent: form.discountPercent } : {}),
        ...(form.discountExpiresAt ? { discountExpiresAt: new Date(form.discountExpiresAt) } : {}),
      }
      const created = await addDoc(collection(db, 'menuItems'), payload)

      // 4) بدّل البطاقة المؤقتة بالحقيقية
      setItems(prev =>
        prev.map(i =>
          i._tempId === tempId
            ? { ...i, id: created.id, imageUrl: imageUrl || i.imageUrl, _optimistic: false, _progress: 100 }
            : i
        )
      )

      notify('success', '✅ تم حفظ الصنف بنجاح')
    } catch (err: any) {
      // رجوع عن الإضافة لو فشل
      setItems(prev => prev.filter(i => i._tempId !== tempId))
      notify('error', `❌ فشل حفظ الصنف: ${err?.message || err}`)
    } finally {
      setSaving(false)
      // تنظيف النموذج
      setForm(emptyItem())
      if (fileRef.current) fileRef.current.value = ''
      // حرر الـ blob لو فيه
      if (localPreview) URL.revokeObjectURL(localPreview)
    }
  }

  // ✅ تفعيل/تعطيل متفائل
  const toggle = async (id?: string, avail?: boolean) => {
    if (!id) return
    setItems(prev => prev.map(i => (i.id === id ? { ...i, available: !avail } : i)))
    try {
      await updateDoc(doc(db, 'menuItems', id), { available: !avail })
      notify('success', 'تم تحديث الحالة')
    } catch {
      setItems(prev => prev.map(i => (i.id === id ? { ...i, available: !!avail } : i)))
      notify('error', 'لم يتم التغيير. أعد المحاولة.')
    }
  }

  // ✅ حذف متفائل
  const remove = async (id?: string) => {
    if (!id) return
    const confirmed = await confirmDialog.confirm('هل أنت متأكد من حذف هذا الصنف نهائيًا؟', { dangerous: true, title: 'حذف الصنف' })
    if (!confirmed) return
    const prev = items
    setItems(p => p.filter(x => x.id !== id))
    try {
      await deleteDoc(doc(db, 'menuItems', id))
      notify('success', 'تم الحذف')
    } catch {
      setItems(prev)
      notify('error', 'لم يتم الحذف. أعد المحاولة.')
    }
  }

  // ✅ بدء التعديل
  const startEdit = (item: Item) => {
    setEditingId(item.id || null)
    setEditForm({ ...item, file: null })
  }

  // ✅ إلغاء التعديل
  const cancelEdit = () => {
    setEditingId(null)
    setEditForm(emptyItem())
    if (editFileRef.current) editFileRef.current.value = ''
  }

  // ✅ حفظ التعديل
  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !editingId) return

    const price = Number(editForm.price || 0)
    if (!editForm.name.trim()) {
      notify('warning', '⚠️ اكتب اسم الصنف')
      return
    }
    if (!Number.isFinite(price) || price <= 0) {
      notify('warning', '⚠️ أدخل سعر صالح')
      return
    }

    setEditSaving(true)
    const prevItems = items

    // تحديث متفائل للـ UI
    setItems(prev => prev.map(i => 
      i.id === editingId 
        ? { ...i, name: editForm.name, desc: editForm.desc, price, available: editForm.available }
        : i
    ))

    try {
      let imageUrl = editForm.imageUrl

      // رفع صورة جديدة إن وُجدت
      if (editForm.file) {
        const blob = await compressImage(editForm.file)
        const safeName = editForm.file.name.replace(/\s+/g, '_').slice(-60)
        const path = `menuImages/${user.uid}_${Date.now()}_${safeName}`
        const storageRef = ref(storage, path)
        const task = uploadBytesResumable(storageRef, blob, {
          contentType: editForm.file.type || 'image/jpeg',
        })

        await new Promise<void>((resolve, reject) => {
          task.on('state_changed', null, reject, async () => {
            const url = await getDownloadURL(task.snapshot.ref)
            imageUrl = `${url}${url.includes('?') ? '&' : '?'}v=${Date.now()}`
            resolve()
          })
        })
      }

      // تحديث الوثيقة في Firestore
      await updateDoc(doc(db, 'menuItems', editingId), {
        name: editForm.name,
        desc: editForm.desc || '',
        price,
        available: editForm.available,
        ...(imageUrl ? { imageUrl } : {}),
        // تحديث حقول الخصم
        discountPercent: editForm.discountPercent || 0,
        ...(editForm.discountExpiresAt ? { discountExpiresAt: new Date(editForm.discountExpiresAt) } : { discountExpiresAt: null }),
      })

      // تحديث الـ UI بالصورة الجديدة
      if (imageUrl) {
        setItems(prev => prev.map(i => i.id === editingId ? { ...i, imageUrl } : i))
      }

      notify('success', '✅ تم تحديث الصنف بنجاح')
      cancelEdit()
    } catch (err: any) {
      // رجوع عن التغييرات لو فشل
      setItems(prevItems)
      notify('error', `❌ فشل التحديث: ${err?.message || err}`)
    } finally {
      setEditSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow p-6 space-y-3">
          <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
          <div className="h-24 w-full bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-full bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-2xl shadow p-4 flex items-center gap-4">
              <div className="w-20 h-20 bg-gray-200 rounded-xl animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-64 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      {toast && <Toast kind={toast.kind} message={toast.message} onClose={() => setToast(null)} />}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 📝 فورم الإضافة السريعة */}
        <form onSubmit={save} className="bg-white rounded-2xl shadow p-6 space-y-3">
          <h2 className="text-lg font-bold">إضافة صنف</h2>

          <input
            className="w-full border rounded-xl p-3"
            placeholder="اسم الصنف"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
          />

          <textarea
            className="w-full border rounded-xl p-3"
            placeholder="الوصف (اختياري)"
            value={form.desc}
            onChange={e => setForm({ ...form, desc: e.target.value })}
          />

          <input
            className="w-full border rounded-xl p-3"
            placeholder="السعر"
            type="number"
            min={0}
            step={0.5}
            inputMode="decimal"
            value={Number.isFinite(form.price) ? form.price : 0}
            onChange={e => setForm({ ...form, price: Number(e.target.value) })}
          />

          {/* قسم الخصم */}
          <div className="border border-dashed border-amber-300 rounded-xl p-4 bg-amber-50/50 space-y-3">
            <h3 className="text-sm font-bold text-amber-700 flex items-center gap-2">
              🏷️ إضافة خصم (اختياري)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-600 mb-1 block">نسبة الخصم %</label>
                <input
                  className="w-full border rounded-xl p-3"
                  placeholder="مثال: 20"
                  type="number"
                  min={0}
                  max={100}
                  value={form.discountPercent || ''}
                  onChange={e => setForm({ ...form, discountPercent: Number(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 mb-1 block">ينتهي في</label>
                <input
                  className="w-full border rounded-xl p-3"
                  type="date"
                  value={form.discountExpiresAt ? (typeof form.discountExpiresAt === 'string' ? form.discountExpiresAt : new Date(form.discountExpiresAt).toISOString().split('T')[0]) : ''}
                  onChange={e => setForm({ ...form, discountExpiresAt: e.target.value })}
                />
              </div>
            </div>
            {form.discountPercent && form.discountPercent > 0 && (
              <div className="text-sm bg-green-100 text-green-700 p-2 rounded-lg">
                السعر بعد الخصم: <strong>{(form.price - (form.price * (form.discountPercent / 100))).toFixed(2)} ر.س</strong>
                <span className="line-through text-gray-400 mr-2">{form.price.toFixed(2)} ر.س</span>
              </div>
            )}
          </div>

          <input
            ref={fileRef}
            className="w-full border rounded-xl p-3"
            type="file"
            accept="image/*"
            onChange={e => setForm({ ...form, file: e.target.files?.[0] || null })}
          />

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.available}
              onChange={e => setForm({ ...form, available: e.target.checked })}
            />
            متاح
          </label>

          <button
            className="px-4 py-2 rounded-xl bg-gray-900 text-white disabled:opacity-60"
            disabled={saving}
          >
            {saving ? 'جارِ الحفظ…' : 'حفظ'}
          </button>
        </form>

        {/* 🛒 عرض الأصناف */}
        <div className="space-y-3">
          {items.map(it => (
            <div key={it.id || it._tempId} className="bg-white rounded-2xl shadow p-4">
              {/* وضع التعديل */}
              {editingId === it.id ? (
                <form onSubmit={saveEdit} className="space-y-3">
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={editForm.file ? URL.createObjectURL(editForm.file) : (editForm.imageUrl || '')}
                      className="w-20 h-20 object-cover rounded-xl bg-gray-100"
                      onError={(e: any) => { e.currentTarget.style.display = 'none' }}
                    />
                    <div className="flex-1">
                      <label className="text-sm text-gray-600 block mb-1">تغيير الصورة</label>
                      <input
                        ref={editFileRef}
                        type="file"
                        accept="image/*"
                        className="w-full text-sm border rounded-lg p-2"
                        onChange={e => setEditForm({ ...editForm, file: e.target.files?.[0] || null })}
                      />
                    </div>
                  </div>

                  <input
                    className="w-full border rounded-xl p-3"
                    placeholder="اسم الصنف"
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  />

                  <textarea
                    className="w-full border rounded-xl p-3"
                    placeholder="الوصف (اختياري)"
                    value={editForm.desc || ''}
                    onChange={e => setEditForm({ ...editForm, desc: e.target.value })}
                  />

                  <input
                    className="w-full border rounded-xl p-3"
                    placeholder="السعر"
                    type="number"
                    min={0}
                    step={0.5}
                    inputMode="decimal"
                    value={Number.isFinite(editForm.price) ? editForm.price : 0}
                    onChange={e => setEditForm({ ...editForm, price: Number(e.target.value) })}
                  />

                  {/* قسم الخصم في التعديل */}
                  <div className="border border-dashed border-amber-300 rounded-xl p-4 bg-amber-50/50 space-y-3">
                    <h3 className="text-sm font-bold text-amber-700 flex items-center gap-2">
                      🏷️ الخصم
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-gray-600 mb-1 block">نسبة الخصم %</label>
                        <input
                          className="w-full border rounded-xl p-3"
                          placeholder="مثال: 20"
                          type="number"
                          min={0}
                          max={100}
                          value={editForm.discountPercent || ''}
                          onChange={e => setEditForm({ ...editForm, discountPercent: Number(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-600 mb-1 block">ينتهي في</label>
                        <input
                          className="w-full border rounded-xl p-3"
                          type="date"
                          value={editForm.discountExpiresAt ? (typeof editForm.discountExpiresAt === 'string' ? editForm.discountExpiresAt : new Date(editForm.discountExpiresAt).toISOString().split('T')[0]) : ''}
                          onChange={e => setEditForm({ ...editForm, discountExpiresAt: e.target.value })}
                        />
                      </div>
                    </div>
                    {editForm.discountPercent && editForm.discountPercent > 0 && (
                      <div className="text-sm bg-green-100 text-green-700 p-2 rounded-lg">
                        السعر بعد الخصم: <strong>{(editForm.price - (editForm.price * (editForm.discountPercent / 100))).toFixed(2)} ر.س</strong>
                        <span className="line-through text-gray-400 mr-2">{editForm.price.toFixed(2)} ر.س</span>
                      </div>
                    )}
                    {editForm.discountPercent && editForm.discountPercent > 0 && (
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, discountPercent: 0, discountExpiresAt: '' })}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        ❌ إزالة الخصم
                      </button>
                    )}
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editForm.available}
                      onChange={e => setEditForm({ ...editForm, available: e.target.checked })}
                    />
                    متاح
                  </label>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={editSaving}
                      className="flex-1 px-4 py-2 rounded-xl bg-green-600 text-white disabled:opacity-60"
                    >
                      {editSaving ? 'جارِ الحفظ…' : '💾 حفظ التعديلات'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={editSaving}
                      className="px-4 py-2 rounded-xl bg-gray-400 text-white disabled:opacity-60"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              ) : (
                /* وضع العرض العادي */
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={it.imageUrl || ''}
                      className="w-20 h-20 object-cover rounded-xl bg-gray-100"
                      onError={(e: any) => { e.currentTarget.style.display = 'none' }}
                    />
                    {it._optimistic && (
                      <div className="absolute -bottom-2 left-0 right-0">
                        <div className="h-1 w-20 rounded bg-gray-200 overflow-hidden">
                          <div
                            className="h-full bg-yellow-500 transition-[width]"
                            style={{ width: `${it._progress || 1}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="font-bold">{it.name}</div>
                    {it.desc && <div className="text-sm text-gray-600">{it.desc}</div>}
                    {/* عرض السعر مع الخصم */}
                    {(() => {
                      const hasDiscount = it.discountPercent && it.discountPercent > 0
                      const expiryDate = (it.discountExpiresAt as any)?.toDate?.() || (it.discountExpiresAt ? new Date(it.discountExpiresAt as string) : null)
                      const isValid = !expiryDate || expiryDate > new Date()
                      
                      if (hasDiscount && isValid) {
                        return (
                          <div className="mt-1 flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-green-600">{(it.price - (it.price * ((it.discountPercent || 0) / 100))).toFixed(2)} ر.س</span>
                            <span className="text-sm text-gray-400 line-through">{it.price?.toFixed?.(2)} ر.س</span>
                            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">خصم {it.discountPercent}%</span>
                          </div>
                        )
                      }
                      return <div className="font-semibold mt-1">{it.price?.toFixed?.(2)} ر.س</div>
                    })()}
                    {it._optimistic && <div className="text-xs text-yellow-600 mt-1">يتم الحفظ…</div>}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => startEdit(it)}
                      disabled={!!it._optimistic}
                      className="px-3 py-2 rounded-xl text-sm bg-amber-500 text-white disabled:opacity-50"
                    >
                      ✏️ تعديل
                    </button>
                    <button
                      onClick={() => toggle(it.id, it.available)}
                      disabled={!!it._optimistic}
                      className="px-3 py-2 rounded-xl text-sm bg-blue-600 text-white disabled:opacity-50"
                    >
                      {it.available ? 'تعطيل' : 'تفعيل'}
                    </button>
                    <button
                      onClick={() => remove(it.id)}
                      disabled={!!it._optimistic}
                      className="px-3 py-2 rounded-xl text-sm bg-red-600 text-white disabled:opacity-50"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {items.length === 0 && <div className="text-gray-600">لا توجد أصناف بعد.</div>}
        </div>
      </div>
    </>
  )
}

export default ManageMenu
