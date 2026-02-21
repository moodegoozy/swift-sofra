// src/routes/RoleGate.tsx
import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/auth'

// وحّد نوع الدور مع كل الأدوار المستخدمة في التطبيق
export type Role = 'owner' | 'courier' | 'customer' | 'admin' | 'developer' | 'supervisor' | 'social_media' | 'support' | 'accountant'

type Props = {
  allow: Role[]
  children: React.ReactNode
}

export const RoleGate: React.FC<Props> = ({ allow, children }) => {
  const { role, loading } = useAuth()

  if (loading) {
    return <div className="p-8 text-center">جارِ التحميل...</div>
  }

  if (!role || !allow.includes(role)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

export default RoleGate
