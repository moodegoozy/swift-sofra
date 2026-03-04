# Copilot Instructions — سفرة البيت iOS

## Architecture Overview

**MVVM + Feature Modules** — SwiftUI app (iOS 18+) using `@Observable` for ViewModels. Zero third-party dependencies; all Firebase operations via REST API.

```
SofraApp/Sources/
├── App/          # AppState (auth singleton), ContentView, SofraApp entry
├── Networking/   # APIClient (actor), FirestoreService, DTOs
├── DesignSystem/ # SofraColors, SofraTypography, Components/
├── Features/     # Auth/, Home/, Cart/, Orders/, Owner/, Courier/, etc.
└── Utilities/    # Keychain, Logger, Extensions
```

## Data Flow

**Views → ViewModel (@Observable) → Service (FirestoreService) → APIClient (actor) → Firebase REST**

- `AppState`: Global auth state, current user, role, tokens. Access via `@Environment(AppState.self)`.
- `CartViewModel`: Persisted in UserDefaults (key: `broast_cart`). Passed via `@Environment`.
- Tokens stored in Keychain via `KeychainHelper.shared`.

## Firebase REST API (No SDK)

All Firebase access uses REST endpoints in [Endpoints.swift](SofraApp/Sources/Networking/Endpoints.swift). Key patterns:

```swift
// Firestore query with filters
let docs = try await firestoreService.query(
    collection: "orders",
    filters: [QueryFilter(field: "customerId", op: "EQUAL", value: userId)],
    idToken: token
)

// DTOs parse FirestoreValue enum (handles stringValue, integerValue, etc.)
let user = AppUser(from: doc)  // See DTOs/UserDTO.swift
```

## Role System

9 roles: `customer`, `owner`, `courier`, `admin`, `developer`, `supervisor`, `social_media`, `support`, `accountant`.

- `MainTabView` renders **separate TabViews per role** (no conditionals inside TabView — breaks SwiftUI tab identity).
- `developer` role sees all screens; use for superuser testing.

## Design System — Ramadan Theme

Navy + Gold palette with adaptive colors. Use semantic colors from [SofraColors.swift](SofraApp/Sources/DesignSystem/SofraColors.swift):

```swift
SofraColors.primary       // Gold-500
SofraColors.background    // Adaptive navy/parchment
SofraColors.textPrimary   // Adaptive
SofraColors.cardBackground
```

**Components**: `SofraButton(title:style:action:)`, `SofraTextField`, `SofraCard`, `SkeletonView`, `StatusBadge`

**View modifiers**: `.sofraCard()`, `.sofraHPadding()`, `.ramadanBackground()`, `.shimmer(isActive:)`

## RTL & Arabic

- App is RTL-first. All text is Arabic.
- Error messages in `APIError.swift` are Arabic strings.
- Use `.environment(\.layoutDirection, .rightToLeft)` when previewing.

## Build & Run

```bash
# Generate Xcode project (XcodeGen required)
xcodegen generate
open SofraApp.xcodeproj
```

No CocoaPods/SPM. Deployment target: iOS 18.0.

## Key Patterns

**ViewModel pattern** — Use `@Observable`, not `ObservableObject`:
```swift
@Observable
final class MyViewModel {
    var items: [Item] = []
    var isLoading = false
    // Call services in async methods
}
```

**Firestore DTOs** — Models init from `FirestoreDocumentResponse`:
```swift
init(from doc: FirestoreDocumentResponse) {
    let f = doc.fields ?? [:]
    self.name = f["name"]?.stringVal ?? ""
    self.price = f["price"]?.doubleVal ?? 0
}
```

**Error handling** — Catch `APIError` for typed Firebase errors:
```swift
do {
    try await appState.login(email: email, password: password)
} catch let error as APIError {
    // error.errorDescription returns Arabic message
}
```

## Collections (Firestore)

- `users` — User profiles (id = auth uid)
- `restaurants` — Restaurant info (id = owner uid)
- `menuItems` — Menu items with `restaurantId`, `ownerId`
- `orders` — Orders with `customerId`, `restaurantId`, `courierId`
- `notifications` — User notifications

## Testing Roles

Switch roles by changing user document `role` field in Firestore. Developer role bypasses all guards.
