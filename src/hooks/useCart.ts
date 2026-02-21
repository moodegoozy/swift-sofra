import { useCallback, useEffect, useMemo, useState } from 'react'

export type CartItem = {
  id: string
  name: string
  price: number
  qty: number
  ownerId?: string   // ✅ أضفنا خاصية المطعم
}

const KEY = 'broast_cart'

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? JSON.parse(raw) : []
    } catch { 
      return [] 
    }
  })

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items))
  }, [items])

  // ✅ استخدام useCallback لمنع إعادة إنشاء الدوال في كل render
  const add = useCallback((it: Omit<CartItem, 'qty'>, qty = 1) => {
    setItems(prev => {
      const idx = prev.findIndex(p => p.id === it.id)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = { 
          ...copy[idx], 
          qty: copy[idx].qty + qty,
          ownerId: it.ownerId ?? copy[idx].ownerId  // ✅ نحافظ على ownerId
        }
        return copy
      }
      return [...prev, { ...it, qty }]
    })
  }, [])

  const remove = useCallback((id: string) => 
    setItems(prev => prev.filter(p => p.id !== id)), [])

  const changeQty = useCallback((id: string, qty: number) => {
    const safeQty = Math.max(1, qty)
    setItems(prev => prev.map(p => p.id === id ? { ...p, qty: safeQty } : p))
  }, [])

  const clear = useCallback(() => setItems([]), [])

  // ✅ استخدام useMemo لحساب المجموع فقط عند تغيير items
  const subtotal = useMemo(() => 
    items.reduce((s, it) => s + it.price * it.qty, 0), [items])

  return { items, add, remove, changeQty, clear, subtotal }
}
