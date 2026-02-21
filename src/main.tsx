// src/main.tsx أو src/index.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { AuthProvider } from './auth'
import { CartProvider } from './context/CartContext'   // ✅ استيراد مزود السلة
import { ToastProvider } from './components/ui/Toast'
import { DialogProvider } from './components/ui/ConfirmDialog' // ✅ نظام الحوارات

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <DialogProvider>
          <AuthProvider>
            <CartProvider>   {/* ✅ لف التطبيق بالسلة */}
              <App />
            </CartProvider>
          </AuthProvider>
        </DialogProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
