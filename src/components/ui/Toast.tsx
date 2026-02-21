import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

type ToastType = "success" | "error" | "info" | "warning"

export type ToastItem = {
  id: string
  type: ToastType
  title?: string
  message: string
  duration?: number // ms
}

type ToastCtx = {
  show: (msg: string, opts?: Partial<Omit<ToastItem, "id" | "message">>) => void
  success: (msg: string, opts?: Partial<Omit<ToastItem, "id" | "message">>) => void
  error: (msg: string, opts?: Partial<Omit<ToastItem, "id" | "message">>) => void
  info: (msg: string, opts?: Partial<Omit<ToastItem, "id" | "message">>) => void
  warning: (msg: string, opts?: Partial<Omit<ToastItem, "id" | "message">>) => void
}

const ToastContext = createContext<ToastCtx | null>(null)

export const useToast = () => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within ToastProvider")
  return ctx
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ToastItem[]>([])

  const remove = useCallback((id: string) => {
    setItems(prev => prev.filter(t => t.id !== id))
  }, [])

  const push = useCallback((message: string, type: ToastType, opts?: Partial<Omit<ToastItem, "id" | "message">>) => {
    const id = Math.random().toString(36).slice(2)
    const item: ToastItem = {
      id,
      message,
      type,
      title: opts?.title,
      duration: opts?.duration ?? 3000,
    }
    setItems(prev => [...prev, item])
    if (item.duration && item.duration > 0) {
      setTimeout(() => remove(id), item.duration)
    }
  }, [remove])

  const api: ToastCtx = useMemo(() => ({
    show: (m, o) => push(m, o?.type ?? "info", o),
    success: (m, o) => push(m, "success", o),
    error: (m, o) => push(m, "error", o),
    info: (m, o) => push(m, "info", o),
    warning: (m, o) => push(m, "warning", o),
  }), [push])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastContainer items={items} onClose={remove} />
    </ToastContext.Provider>
  )
}

const typeStyles: Record<ToastType, string> = {
  success: "bg-green-600 text-white",
  error: "bg-red-600 text-white",
  info: "bg-slate-800 text-white",
  warning: "bg-yellow-500 text-black",
}

const typeIcon: Record<ToastType, string> = {
  success: "✔",
  error: "✖",
  info: "ℹ",
  warning: "⚠",
}

const ToastContainer: React.FC<{ items: ToastItem[]; onClose: (id: string) => void }> = ({ items, onClose }) => {
  // يمنع تداخل لوحة الجوال مع أزرار أسفل الشاشة
  useEffect(() => {
    // اختياري
  }, [])
  return (
    <div className="fixed z-[9999] inset-0 pointer-events-none flex flex-col items-center sm:items-end gap-2 p-4 sm:p-6">
      <div className="mt-auto w-full sm:w-auto flex flex-col gap-2">
        {items.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto ${typeStyles[t.type]} rounded-2xl shadow-lg px-4 py-3 sm:min-w-[320px] animate-[toastIn_.2s_ease]`}
          >
            <div className="flex items-start gap-3">
              <div className="text-xl leading-none">{typeIcon[t.type]}</div>
              <div className="flex-1">
                {t.title && <div className="font-bold">{t.title}</div>}
                <div className="text-sm">{t.message}</div>
              </div>
              <button
                onClick={() => onClose(t.id)}
                className="opacity-80 hover:opacity-100 transition"
                aria-label="Close"
              >×</button>
            </div>
          </div>
        ))}
      </div>

      {/* حركات بسيطة */}
      <style>
        {`@keyframes toastIn{from{transform:translateY(8px);opacity:0}to{transform:translateY(0);opacity:1}}`}
      </style>
    </div>
  )
}
