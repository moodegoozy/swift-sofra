# Copilot Instructions - سفرة البيت (Albyt)

## Architecture
Arabic RTL food delivery PWA: home-based restaurants (الأسر المنتجة) → couriers → customers.
**Stack**: React 18 + TypeScript + Vite + TailwindCSS + Firebase (Auth/Firestore/Storage)

## Critical Patterns

### ⚠️ Role-Based Access (ALWAYS include `developer`)
```tsx
<ProtectedRoute>
  <RoleGate allow={['owner', 'developer']}>  {/* developer = superuser */}
    <Component />
  </RoleGate>
</ProtectedRoute>
```
Roles: `customer` | `courier` | `owner` | `admin` | `developer`

### Imports - Use `@/` alias (configured in vite.config.ts + tsconfig.json)
```tsx
import { useAuth } from '@/auth'           // { user, role, userLocation, logout, refreshUserData }
import { db, storage } from '@/firebase'
import { Order, MenuItem } from '@/types'  // ALL types centralized in src/types/index.ts
import { useCart } from '@/hooks/useCart'  // localStorage-based, NOT Context
```

### Firebase Data Model
```
users/{uid}              → { role, name, email, phone, location, savedLocation }
restaurants/{ownerId}    → doc ID = owner's UID (one-to-one)
menuItems/{id}           → { ownerId, name, price, available, discountPercent? }
orders/{id}              → status flow: pending→accepted→preparing→ready→out_for_delivery→delivered
couriers/{courierId}     → courier profile data
supportTickets/{id}      → customer complaints/support
```

### Real-time vs One-time Reads
```tsx
// Real-time: orders, chat, notifications
const unsub = onSnapshot(query(collection(db, 'orders'), where(...)), (snap) => {...})
useEffect(() => unsub, [])

// One-time: restaurant profile, menu items
const doc = await getDoc(doc(db, 'restaurants', ownerId))
```

### Cart System
`useCart()` hook uses localStorage (key: `broast_cart`), NOT React Context. Each cart item includes `ownerId` for multi-restaurant support.

### Location Handling
- Customers/Admins: `savedLocation` field (persists in Firestore)
- Owners/Couriers: `location` field
- Auto-detect via `navigator.geolocation` with fallback to manual picker

## Styling Rules
- **Colors**: Sky palette only (`sky-50` to `sky-900`)
- **Icons**: `lucide-react` exclusively
- **RTL**: Default in `index.html`, no `dir` needed
- **Comments**: Arabic for domain logic, English for technical

## Commands
```bash
npm run dev    # Port 5173, HMR enabled
npm run build  # tsc -b && vite build (TypeScript errors block build!)
npm run preview # Preview production build
```

## Key Files
| File | Purpose |
|------|---------|
| [src/types/index.ts](src/types/index.ts) | ALL interfaces + `POINTS_CONFIG`, `ORDER_TIME_LIMITS` constants |
| [src/auth.tsx](src/auth.tsx) | Auth context, auto-location detection, session persistence |
| [src/routes/RoleGate.tsx](src/routes/RoleGate.tsx) | Role-based component gating |
| [src/routes/ProtectedRoute.tsx](src/routes/ProtectedRoute.tsx) | Auth required wrapper |
| [src/App.tsx](src/App.tsx) | All routes defined here with role gates |
| [firestore.rules](firestore.rules) | Security helpers: `isOwner()`, `isDeveloper()`, etc. |
| [src/hooks/useCart.ts](src/hooks/useCart.ts) | localStorage cart with `ownerId` per item |

## Adding Features
1. **New page**: Create in `src/pages/`, add route in `src/App.tsx` with `ProtectedRoute` + `RoleGate`
2. **New type**: Add to `src/types/index.ts`, import from `@/types`
3. **Real-time data**: Use `onSnapshot` for orders/chat, `getDoc` for one-time reads
4. **Firestore rules**: Update [firestore.rules](firestore.rules) if new collection

## Business Logic Notes
- **Points System**: Restaurants/couriers start at 100 points, deductions for complaints, suspension at <30
- **Order Flow**: Customer creates → Owner accepts → Prepares → Ready → Courier delivers
- **Time Limits**: `ORDER_TIME_LIMITS` in types defines prep/pickup/delivery timeouts
- **Packages**: Free vs Premium restaurant tiers (`packageType` field)
