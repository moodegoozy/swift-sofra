import React, { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react'

// أنواع الحوارات
type DialogType = 'confirm' | 'alert' | 'info' | 'success' | 'error' | 'warning'

type DialogOptions = {
  title?: string
  message: string
  type?: DialogType
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void | Promise<void>
  onCancel?: () => void
  dangerous?: boolean // للإجراءات الخطيرة مثل الحذف
}

type DialogState = DialogOptions & {
  isOpen: boolean
  resolve?: (value: boolean) => void
}

type DialogContextType = {
  confirm: (message: string, options?: Partial<DialogOptions>) => Promise<boolean>
  alert: (message: string, options?: Partial<DialogOptions>) => Promise<void>
  success: (message: string, options?: Partial<DialogOptions>) => Promise<void>
  error: (message: string, options?: Partial<DialogOptions>) => Promise<void>
  warning: (message: string, options?: Partial<DialogOptions>) => Promise<void>
  info: (message: string, options?: Partial<DialogOptions>) => Promise<void>
}

const DialogContext = createContext<DialogContextType | null>(null)

export const useDialog = () => {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('useDialog must be used within DialogProvider')
  return ctx
}

export const DialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [dialog, setDialog] = useState<DialogState>({
    isOpen: false,
    message: '',
    type: 'confirm',
  })

  const openDialog = useCallback((options: DialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialog({
        ...options,
        isOpen: true,
        resolve,
      })
    })
  }, [])

  const closeDialog = useCallback((result: boolean) => {
    if (dialog.resolve) {
      dialog.resolve(result)
    }
    setDialog(prev => ({ ...prev, isOpen: false }))
  }, [dialog.resolve])

  const handleConfirm = useCallback(async () => {
    if (dialog.onConfirm) {
      await dialog.onConfirm()
    }
    closeDialog(true)
  }, [dialog.onConfirm, closeDialog])

  const handleCancel = useCallback(() => {
    if (dialog.onCancel) {
      dialog.onCancel()
    }
    closeDialog(false)
  }, [dialog.onCancel, closeDialog])

  const api: DialogContextType = useMemo(() => ({
    confirm: (message, options = {}) => openDialog({
      message,
      type: 'confirm',
      title: options.title || 'تأكيد',
      confirmText: options.confirmText || 'تأكيد',
      cancelText: options.cancelText || 'إلغاء',
      ...options,
    }),
    alert: (message, options = {}) => openDialog({
      message,
      type: 'alert',
      title: options.title || 'تنبيه',
      confirmText: options.confirmText || 'حسناً',
      ...options,
    }).then(() => {}),
    success: (message, options = {}) => openDialog({
      message,
      type: 'success',
      title: options.title || 'تم بنجاح',
      confirmText: options.confirmText || 'حسناً',
      ...options,
    }).then(() => {}),
    error: (message, options = {}) => openDialog({
      message,
      type: 'error',
      title: options.title || 'خطأ',
      confirmText: options.confirmText || 'حسناً',
      ...options,
    }).then(() => {}),
    warning: (message, options = {}) => openDialog({
      message,
      type: 'warning',
      title: options.title || 'تحذير',
      confirmText: options.confirmText || 'حسناً',
      ...options,
    }).then(() => {}),
    info: (message, options = {}) => openDialog({
      message,
      type: 'info',
      title: options.title || 'معلومة',
      confirmText: options.confirmText || 'حسناً',
      ...options,
    }).then(() => {}),
  }), [openDialog])

  return (
    <DialogContext.Provider value={api}>
      {children}
      <DialogModal 
        {...dialog} 
        onConfirm={handleConfirm} 
        onCancel={handleCancel}
      />
    </DialogContext.Provider>
  )
}

// ===== مكون الحوار =====
type DialogModalProps = DialogState & {
  onConfirm: () => void
  onCancel: () => void
}

const DialogModal: React.FC<DialogModalProps> = ({
  isOpen,
  title,
  message,
  type = 'confirm',
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  dangerous,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null

  // ألوان وأيقونات حسب النوع
  const config = {
    confirm: {
      icon: <Info className="w-8 h-8" />,
      iconBg: 'bg-sky-100',
      iconColor: 'text-sky-600',
      buttonColor: dangerous ? 'bg-red-600 hover:bg-red-700' : 'bg-sky-600 hover:bg-sky-700',
    },
    alert: {
      icon: <AlertTriangle className="w-8 h-8" />,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      buttonColor: 'bg-amber-600 hover:bg-amber-700',
    },
    success: {
      icon: <CheckCircle className="w-8 h-8" />,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      buttonColor: 'bg-green-600 hover:bg-green-700',
    },
    error: {
      icon: <XCircle className="w-8 h-8" />,
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      buttonColor: 'bg-red-600 hover:bg-red-700',
    },
    warning: {
      icon: <AlertTriangle className="w-8 h-8" />,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      buttonColor: 'bg-orange-600 hover:bg-orange-700',
    },
    info: {
      icon: <Info className="w-8 h-8" />,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      buttonColor: 'bg-blue-600 hover:bg-blue-700',
    },
  }

  const c = config[type]
  const showCancel = type === 'confirm'

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998] animate-fadeIn"
        onClick={onCancel}
      />
      
      {/* Dialog */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
        <div 
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm pointer-events-auto animate-scaleIn overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative p-6 pb-0">
            {/* زر الإغلاق */}
            <button
              onClick={onCancel}
              className="absolute top-4 left-4 p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
            
            {/* الأيقونة */}
            <div className="flex justify-center mb-4">
              <div className={`w-16 h-16 rounded-full ${c.iconBg} ${c.iconColor} flex items-center justify-center`}>
                {c.icon}
              </div>
            </div>
            
            {/* العنوان */}
            <h3 className="text-xl font-bold text-center text-gray-900">
              {title}
            </h3>
          </div>
          
          {/* المحتوى */}
          <div className="p-6 pt-3">
            <p className="text-center text-gray-600 leading-relaxed">
              {message}
            </p>
          </div>
          
          {/* الأزرار */}
          <div className={`p-4 pt-0 flex gap-3 ${showCancel ? 'flex-row-reverse' : 'justify-center'}`}>
            <button
              onClick={onConfirm}
              className={`flex-1 py-3 px-6 rounded-xl font-bold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${c.buttonColor}`}
            >
              {confirmText}
            </button>
            
            {showCancel && (
              <button
                onClick={onCancel}
                className="flex-1 py-3 px-6 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                {cancelText}
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* أنيميشن */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .animate-scaleIn {
          animation: scaleIn 0.2s ease-out;
        }
      `}</style>
    </>
  )
}

export default DialogProvider
