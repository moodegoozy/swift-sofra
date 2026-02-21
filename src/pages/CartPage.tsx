// src/pages/CartPage.tsx
import React, { useMemo } from "react"
import { useCart } from "@/hooks/useCart"
import { Link } from "react-router-dom"
import { Trash2, ShoppingBag, ArrowLeft, Minus, Plus } from "lucide-react"

// رسوم التطبيق: 1.57 هللة على المنتجات التي سعرها 5 ريال أو أكثر
const APP_FEE_PER_ITEM = 0.0157  // 1.57 هللة = 0.0157 ريال
const APP_FEE_MIN_PRICE = 5      // الحد الأدنى للسعر لتطبيق الرسوم

export const CartPage: React.FC = () => {
  const { items, subtotal, remove, clear, changeQty } = useCart()
  
  // 💰 حساب رسوم التطبيق
  const appFee = useMemo(() => {
    return items.reduce((fee, item) => {
      if (item.price >= APP_FEE_MIN_PRICE) {
        return fee + (APP_FEE_PER_ITEM * item.qty)
      }
      return fee
    }, 0)
  }, [items])
  
  const total = subtotal + appFee

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 flex flex-col items-center justify-center py-20 px-4">
        <div className="w-24 h-24 bg-white/80 backdrop-blur rounded-full flex items-center justify-center mb-6 shadow-lg">
          <ShoppingBag className="w-12 h-12 text-sky-400" />
        </div>
        <h2 className="text-xl font-bold text-sky-800 mb-2">السلة فارغة</h2>
        <p className="text-sky-600/70 mb-6">أضف بعض الأصناف اللذيذة!</p>
        <Link 
          to="/restaurants" 
          className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-sky-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-sky-200/50 hover:shadow-xl transition"
        >
          <ArrowLeft className="w-5 h-5" />
          تصفح المطاعم
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 py-6">
      <div className="max-w-3xl mx-auto space-y-4 px-2 sm:px-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <ShoppingBag className="w-6 h-6 text-primary" />
          سلة المشتريات
          <span className="text-sm bg-primary text-white px-2 py-0.5 rounded-full">{items.length}</span>
        </h1>
      </div>

      {/* قائمة الأصناف */}
      <div className="space-y-3">
        {items.map((i) => (
          <div
            key={i.id}
            className="flex items-center gap-3 glass-card p-3 sm:p-4 rounded-xl"
          >
            {/* صورة الصنف (افتراضية) */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-3xl">🍟</span>
            </div>
            
            {/* تفاصيل الصنف */}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-sm sm:text-base truncate">{i.name}</h3>
              <p className="text-primary font-bold text-sm">{i.price.toFixed(2)} ر.س</p>
              
              {/* أزرار الكمية */}
              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => i.qty > 1 ? changeQty(i.id, i.qty - 1) : remove(i.id)}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="font-bold text-lg w-8 text-center">{i.qty}</span>
                <button
                  onClick={() => changeQty(i.id, i.qty + 1)}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-primary text-white hover:bg-sky-600 flex items-center justify-center transition"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* السعر الإجمالي + حذف */}
            <div className="flex flex-col items-end gap-2">
              <span className="font-bold text-lg text-gray-900">{(i.price * i.qty).toFixed(2)} ر.س</span>
              <button
                onClick={() => remove(i.id)}
                className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ملخص السلة */}
      <div className="glass-card rounded-xl p-4 space-y-3">
        <div className="flex justify-between text-sky-700">
          <span>المجموع الفرعي</span>
          <span className="font-bold">{subtotal.toFixed(2)} ر.س</span>
        </div>
        {appFee > 0 && (
          <div className="flex justify-between text-gray-500">
            <span>رسوم التطبيق</span>
            <span className="font-semibold">{appFee.toFixed(2)} ر.س</span>
          </div>
        )}
        <div className="flex justify-between text-amber-600">
          <span>رسوم التوصيل</span>
          <span className="font-semibold text-sm">تُحدد عند قبول الطلب</span>
        </div>
        <div className="h-px bg-sky-200/50"></div>
        <div className="flex justify-between">
          <span className="font-bold text-lg text-sky-900">الإجمالي</span>
          <span className="font-bold text-xl text-sky-600">{total.toFixed(2)} ر.س</span>
        </div>
        <p className="text-xs text-gray-500 text-center">
          💡 رسوم التوصيل يحددها المندوب أو الأسرة حسب موقعك
        </p>
      </div>

      {/* أزرار الإجراءات */}
      <div className="flex flex-col sm:flex-row gap-3 pb-6">
        <button
          onClick={clear}
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl glass-light text-sky-700 font-semibold hover:bg-white/70 transition"
        >
          <Trash2 className="w-5 h-5" />
          تفريغ السلة
        </button>
        <Link
          to="/checkout"
          className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white font-bold shadow-lg shadow-green-200/50 hover:shadow-xl hover:scale-[1.02] transition"
        >
          ✅ إتمام الطلب
        </Link>
      </div>
      </div>
    </div>
  )
}
