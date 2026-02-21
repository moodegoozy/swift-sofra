/**
 * App Configuration & Utilities
 * Centralized place for app-level settings and configuration
 */

import { db } from '@/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { AppSettings } from '@/types'

const DEFAULT_DELIVERY_FEE = 7
const SETTINGS_DOC_ID = 'general'

/**
 * Get delivery fee from app settings, with fallback to default
 * Should be cached or called once during app initialization
 */
export async function getDeliveryFee(): Promise<number> {
  try {
    const snap = await getDoc(doc(db, 'settings', SETTINGS_DOC_ID))
    if (snap.exists()) {
      const data = snap.data() as AppSettings
      return data.deliveryFee ?? DEFAULT_DELIVERY_FEE
    }
  } catch (err) {
    console.warn('Failed to fetch delivery fee from settings:', err)
  }
  return DEFAULT_DELIVERY_FEE
}

/**
 * Get all app settings with fallbacks
 */
export async function getAppSettings(): Promise<AppSettings> {
  try {
    const snap = await getDoc(doc(db, 'settings', SETTINGS_DOC_ID))
    if (snap.exists()) {
      return snap.data() as AppSettings
    }
  } catch (err) {
    console.warn('Failed to fetch app settings:', err)
  }
  return {
    deliveryFee: DEFAULT_DELIVERY_FEE,
  }
}
