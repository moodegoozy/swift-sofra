/**
 * 🎯 تجربة طلب بسيطة جداً
 * حتى الطفل يعرف يطلب!
 * 
 * 3 خطوات فقط:
 * 1. اختر الأكل 🍽️
 * 2. أضف للسلة ➕
 * 3. اطلب! ✅
 */

import React from 'react'
import { useCart } from '@/hooks/useCart'
import { useNavigate } from 'react-router-dom'
import { ShoppingBag, Plus, Minus, ArrowLeft, Check } from 'lucide-react'

// ═══════════════════════════════════════════════════════════
// 🛒 زر السلة العائم - واضح وكبير
// ═══════════════════════════════════════════════════════════
export const FloatingCartButton: React.FC = () => {
  const { items, subtotal } = useCart()
  const nav = useNavigate()
  
  if (items.length === 0) return null
  
  const totalQty = items.reduce((sum, i) => sum + i.qty, 0)
  
  return (
    <button
      onClick={() => nav('/cart')}
      className="fixed bottom-20 left-4 right-4 mx-auto max-w-md z-50 
        bg-gradient-to-r from-green-500 to-green-600 text-white 
        rounded-2xl shadow-2xl shadow-green-500/30
        px-6 py-4 flex items-center justify-between
        active:scale-95 transition-all duration-200"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <ShoppingBag className="w-8 h-8" />
          <span className="absolute -top-2 -right-2 bg-white text-green-600 
            w-6 h-6 rounded-full text-sm font-bold flex items-center justify-center">
            {totalQty}
          </span>
        </div>
        <span className="text-lg font-bold">عرض السلة</span>
      </div>
      <span className="text-xl font-bold">{subtotal.toFixed(0)} ر.س</span>
    </button>
  )
}

// ═══════════════════════════════════════════════════════════
// ➕ زر إضافة بسيط وكبير
// ═══════════════════════════════════════════════════════════
interface SimpleAddButtonProps {
  item: {
    id: string
    name: string
    price: number
    ownerId?: string
  }
}

export const SimpleAddButton: React.FC<SimpleAddButtonProps> = ({ item }) => {
  const { items, add, changeQty, remove } = useCart()
  
  const cartItem = items.find(i => i.id === item.id)
  const qty = cartItem?.qty || 0
  
  // إذا مو في السلة، نعرض زر إضافة كبير
  if (qty === 0) {
    return (
      <button
        onClick={() => add({ id: item.id, name: item.name, price: item.price, ownerId: item.ownerId })}
        className="w-full bg-gradient-to-r from-sky-500 to-sky-600 text-white 
          rounded-xl py-3 px-4 font-bold text-lg
          flex items-center justify-center gap-2
          active:scale-95 transition-all duration-200
          shadow-lg shadow-sky-500/30"
      >
        <Plus className="w-6 h-6" />
        أضف للسلة
      </button>
    )
  }
  
  // إذا في السلة، نعرض أزرار الكمية
  return (
    <div className="flex items-center justify-between bg-sky-100 rounded-xl p-2">
      <button
        onClick={() => qty > 1 ? changeQty(item.id, qty - 1) : remove(item.id)}
        className="w-12 h-12 bg-white rounded-xl flex items-center justify-center
          shadow-sm active:scale-90 transition-all"
      >
        <Minus className="w-6 h-6 text-sky-600" />
      </button>
      
      <span className="text-2xl font-bold text-sky-800 w-12 text-center">{qty}</span>
      
      <button
        onClick={() => changeQty(item.id, qty + 1)}
        className="w-12 h-12 bg-sky-500 text-white rounded-xl flex items-center justify-center
          shadow-lg active:scale-90 transition-all"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// 🍽️ بطاقة صنف بسيطة
// ═══════════════════════════════════════════════════════════
interface SimpleMenuItemCardProps {
  item: {
    id: string
    name: string
    price: number
    imageUrl?: string
    description?: string
    available?: boolean
    discountPercent?: number
    ownerId?: string
  }
}

export const SimpleMenuItemCard: React.FC<SimpleMenuItemCardProps> = ({ item }) => {
  const discountedPrice = item.discountPercent 
    ? item.price * (1 - item.discountPercent / 100) 
    : item.price

  if (item.available === false) return null

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* الصورة */}
      <div className="h-40 bg-gradient-to-br from-sky-100 to-sky-50 flex items-center justify-center relative">
        {item.imageUrl ? (
          <img 
            src={item.imageUrl} 
            alt={item.name} 
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-6xl">🍽️</span>
        )}
        
        {/* شارة الخصم */}
        {item.discountPercent && item.discountPercent > 0 && (
          <span className="absolute top-2 right-2 bg-red-500 text-white 
            px-3 py-1 rounded-full text-sm font-bold">
            خصم {item.discountPercent}%
          </span>
        )}
      </div>
      
      {/* المحتوى */}
      <div className="p-4 space-y-3">
        <h3 className="font-bold text-lg text-gray-900 truncate">{item.name}</h3>
        
        {/* السعر */}
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-sky-600">
            {discountedPrice.toFixed(0)} ر.س
          </span>
          {item.discountPercent && item.discountPercent > 0 && (
            <span className="text-gray-400 line-through text-sm">
              {item.price.toFixed(0)} ر.س
            </span>
          )}
        </div>
        
        {/* زر الإضافة */}
        <SimpleAddButton item={{
          id: item.id,
          name: item.name,
          price: discountedPrice,
          ownerId: item.ownerId
        }} />
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// 🏪 بطاقة مطعم بسيطة
// ═══════════════════════════════════════════════════════════
interface SimpleRestaurantCardProps {
  restaurant: {
    id: string
    name: string
    logoUrl?: string
    isOpen?: boolean
    averageRating?: number
  }
  onClick: () => void
}

export const SimpleRestaurantCard: React.FC<SimpleRestaurantCardProps> = ({ restaurant, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl shadow-lg p-4 
        flex items-center gap-4 text-right
        active:scale-[0.98] transition-all duration-200"
    >
      {/* الشعار */}
      <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-sky-100 to-sky-50 
        flex items-center justify-center flex-shrink-0 overflow-hidden">
        {restaurant.logoUrl ? (
          <img src={restaurant.logoUrl} alt={restaurant.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-4xl">🏠</span>
        )}
      </div>
      
      {/* المعلومات */}
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-lg text-gray-900 truncate">{restaurant.name}</h3>
        
        <div className="flex items-center gap-2 mt-1">
          {/* حالة المطعم */}
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
            restaurant.isOpen !== false 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {restaurant.isOpen !== false ? '🟢 مفتوح' : '🔴 مغلق'}
          </span>
          
          {/* التقييم */}
          {restaurant.averageRating && (
            <span className="text-amber-500 text-sm font-bold">
              ⭐ {restaurant.averageRating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
      
      {/* سهم */}
      <ArrowLeft className="w-6 h-6 text-gray-400" />
    </button>
  )
}

// ═══════════════════════════════════════════════════════════
// ✅ ملخص سلة بسيط
// ═══════════════════════════════════════════════════════════
export const SimpleCartSummary: React.FC = () => {
  const { items, subtotal, remove, changeQty, clear } = useCart()
  const nav = useNavigate()
  
  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-8xl mb-4">🛒</div>
        <h2 className="text-2xl font-bold text-gray-700 mb-2">السلة فاضية!</h2>
        <p className="text-gray-500 mb-6">اختر أكل لذيذ وأضفه هنا</p>
        <button
          onClick={() => nav('/restaurants')}
          className="bg-sky-500 text-white px-8 py-3 rounded-xl font-bold text-lg
            active:scale-95 transition-all"
        >
          تصفح المطاعم 🍽️
        </button>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {/* عناصر السلة */}
      {items.map(item => (
        <div key={item.id} className="bg-white rounded-xl p-4 shadow flex items-center gap-3">
          <div className="text-4xl">🍽️</div>
          <div className="flex-1">
            <h3 className="font-bold text-lg">{item.name}</h3>
            <p className="text-sky-600 font-bold">{(item.price * item.qty).toFixed(0)} ر.س</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => item.qty > 1 ? changeQty(item.id, item.qty - 1) : remove(item.id)}
              className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"
            >
              <Minus className="w-5 h-5" />
            </button>
            <span className="w-8 text-center font-bold text-xl">{item.qty}</span>
            <button
              onClick={() => changeQty(item.id, item.qty + 1)}
              className="w-10 h-10 bg-sky-500 text-white rounded-full flex items-center justify-center"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>
      ))}
      
      {/* الإجمالي */}
      <div className="bg-gradient-to-r from-sky-500 to-sky-600 rounded-2xl p-6 text-white">
        <div className="flex justify-between items-center mb-4">
          <span className="text-lg">الإجمالي</span>
          <span className="text-3xl font-bold">{subtotal.toFixed(0)} ر.س</span>
        </div>
        <button
          onClick={() => nav('/checkout')}
          className="w-full bg-white text-sky-600 rounded-xl py-4 font-bold text-xl
            flex items-center justify-center gap-2
            active:scale-95 transition-all"
        >
          <Check className="w-6 h-6" />
          اطلب الآن!
        </button>
      </div>
      
      {/* زر مسح السلة */}
      <button
        onClick={clear}
        className="w-full text-gray-500 py-2 text-sm"
      >
        مسح السلة
      </button>
    </div>
  )
}

export default FloatingCartButton
