# سفرة البيت — iOS Native App (Swift + SwiftUI)

Native iOS rebuild of the **سفرة البيت (Albyt Sofra)** Arabic RTL food-delivery PWA.

## Architecture

| Layer | Technology | Notes |
|---|---|---|
| **UI** | SwiftUI (iOS 16+) | RTL-first, Dynamic Type, dark-mode ready |
| **State** | `@Observable` / `ObservableObject` | MVVM per feature module |
| **Networking** | `URLSession` + `async/await` | Firebase REST APIs only — **zero third-party SDKs** |
| **Auth** | Firebase Identity Toolkit REST | Sign-in, sign-up, token refresh via Keychain |
| **Database** | Firestore REST v1 | Full CRUD + structured queries |
| **Storage** | `UserDefaults` (cart), `Keychain` (tokens) | Matches web `localStorage` patterns |
| **Design** | Custom Design System | Sky-centric palette from Tailwind config |

### Why No Firebase SDK?

The web app uses Firebase JS SDK directly. For iOS, rather than pulling in the heavy Firebase iOS SDK (~50+ MB), we use the lightweight Firebase REST APIs via native `URLSession`. This gives us:
- Zero CocoaPods/SPM dependencies
- Faster build times
- Smaller binary size
- Full control over networking and token management

## Project Structure

```
swift-sofra/
├── project.yml                    # XcodeGen project definition
├── README.md                      # This file
└── SofraApp/
    ├── Resources/
    │   ├── Info.plist
    │   └── Assets.xcassets/
    └── Sources/
        ├── App/                   # App entry, root state, navigation
        │   ├── SofraApp.swift     # @main entry point
        │   ├── AppState.swift     # Auth lifecycle, session management
        │   └── ContentView.swift  # Root view (splash/login/main switch)
        ├── Networking/            # Firebase REST API layer
        │   ├── APIClient.swift    # Generic URLSession wrapper (actor)
        │   ├── APIError.swift     # Typed errors with Arabic messages
        │   ├── Endpoints.swift    # Firebase project config + URLs
        │   ├── FirebaseAuthService.swift  # Auth REST (login/register/refresh)
        │   ├── FirestoreService.swift     # Firestore CRUD + queries
        │   └── DTOs/
        │       ├── FirestoreDocument.swift # Firestore value type parser
        │       ├── UserDTO.swift          # AppUser model
        │       ├── RestaurantDTO.swift    # Restaurant model
        │       ├── MenuItemDTO.swift      # MenuItem model
        │       └── OrderDTO.swift         # Order + OrderItem + OrderStatus
        ├── DesignSystem/          # Reusable UI components
        │   ├── SofraColors.swift  # Sky palette (matches Tailwind)
        │   ├── SofraTypography.swift
        │   ├── SofraSpacing.swift
        │   └── Components/
        │       ├── SofraButton.swift      # 4 styles + haptics
        │       ├── SofraCard.swift
        │       ├── SofraTextField.swift   # With validation
        │       ├── SkeletonView.swift     # Loading shimmer
        │       ├── EmptyStateView.swift
        │       ├── ErrorStateView.swift   # With async retry
        │       └── StatusBadge.swift
        ├── Features/              # Feature modules (MVVM)
        │   ├── Auth/
        │   │   ├── Views/         # LoginView, RegisterView, RegisterChoiceView
        │   │   └── ViewModels/    # AuthViewModel
        │   ├── Home/
        │   │   ├── Views/         # MainTabView (role-aware), HomeView
        │   │   └── ViewModels/    # HomeViewModel
        │   ├── Restaurants/
        │   │   ├── Views/         # RestaurantsListView, RestaurantCard
        │   │   └── ViewModels/    # RestaurantsViewModel
        │   ├── Menu/
        │   │   ├── Views/         # MenuView, MenuItemCard
        │   │   └── ViewModels/    # MenuViewModel
        │   ├── Cart/
        │   │   ├── Views/         # CartView, CheckoutView
        │   │   └── ViewModels/    # CartViewModel (persistent)
        │   ├── Orders/
        │   │   ├── Views/         # OrdersView, OrderDetailView (timeline)
        │   │   └── ViewModels/    # OrdersViewModel
        │   ├── Profile/
        │   │   ├── Views/         # ProfileView (edit + settings)
        │   │   └── ViewModels/    # ProfileViewModel
        │   ├── Notifications/
        │   │   ├── Views/         # NotificationsView
        │   │   └── ViewModels/    # NotificationsViewModel
        │   ├── Owner/
        │   │   ├── Views/         # OwnerDashboardView (4-tab)
        │   │   └── ViewModels/    # OwnerDashboardViewModel
        │   └── Courier/
        │       ├── Views/         # CourierDashboardView (5-tab)
        │       └── ViewModels/    # CourierDashboardViewModel
        └── Utilities/
            ├── KeychainHelper.swift
            ├── Logger.swift
            └── Extensions/
                ├── View+Extensions.swift
                └── Date+Extensions.swift
```

## Route Mapping (Web → iOS)

| Web Route | iOS Screen | Guard |
|---|---|---|
| `/` | `HomeView` | — |
| `/login` | `LoginView` | Unauthenticated |
| `/register` | `RegisterChoiceView` → `RegisterView` | Unauthenticated |
| `/restaurants` | `RestaurantsListView` | Authenticated |
| `/menu?id={x}` | `MenuView(restaurantId:)` | Authenticated |
| `/cart` | `CartView` | Authenticated |
| `/checkout` | `CheckoutView` | Authenticated |
| `/orders` | `OrdersView` | Customer |
| `/orders/{id}` | `OrderDetailView(order:)` | Customer |
| `/profile` | `ProfileView` | Authenticated |
| `/notifications` | `NotificationsView` | Authenticated |
| `/owner` | `OwnerDashboardView` | Owner/Developer |
| `/courier` | `CourierDashboardView` | Courier/Developer |

## Roles

Same 9-role system as web app:

| Role | iOS Access |
|---|---|
| `customer` | Home, Restaurants, Menu, Cart, Orders, Profile |
| `owner` | Owner Dashboard (orders, menu, settings, wallet) |
| `courier` | Courier Dashboard (deliveries, earnings, availability) |
| `admin` | — (future) |
| `developer` | All screens (superuser) |
| `supervisor` | — (future) |
| `social_media` | — (future) |
| `support` | — (future) |
| `accountant` | — (future) |

## Firebase Configuration

The app connects to the same Firebase project as the web app:

| Key | Value |
|---|---|
| Project ID | `albayt-sofra` |
| API Key | Set in `Endpoints.swift` |
| Auth Domain | `albayt-sofra.firebaseapp.com` |
| Firestore | `firestore.googleapis.com/v1` |

## Setup & Build

### Option 1: XcodeGen (Recommended)

```bash
# Install XcodeGen
brew install xcodegen

# Generate .xcodeproj
cd swift-sofra/
xcodegen generate

# Open in Xcode
open SofraApp.xcodeproj
```

### Option 2: Manual Xcode Setup

1. Open Xcode → **File → New → Project → iOS App**
2. Product Name: `SofraApp`, Language: Swift, Interface: SwiftUI
3. Set deployment target to **iOS 16.0**
4. Drag the `SofraApp/Sources/` folder into the project navigator
5. Drag the `SofraApp/Resources/` folder into the project
6. Build & Run

### Configuration

1. Set your **Development Team** in project settings
2. Bundle ID: `com.albayt.sofra`
3. No SPM/CocoaPods dependencies needed!

## Data Flow

```
┌─────────────┐     ┌──────────────────┐     ┌───────────────────┐
│  SwiftUI    │────▶│   ViewModel      │────▶│  FirestoreService │
│  View       │◀────│  @Observable     │◀────│  (REST API)       │
└─────────────┘     └──────────────────┘     └───────────────────┘
                           │                          │
                    ┌──────▼──────┐            ┌──────▼──────┐
                    │  AppState   │            │  APIClient  │
                    │  (Auth)     │            │  (URLSession)│
                    └─────────────┘            └─────────────┘
                           │                          │
                    ┌──────▼──────┐            ┌──────▼──────┐
                    │  Keychain   │            │  Firebase   │
                    │  (Tokens)   │            │  REST APIs  │
                    └─────────────┘            └─────────────┘
```

## Order Status Flow

Same as web app: `pending → accepted → preparing → ready → out_for_delivery → delivered` (+ `cancelled`)

Each status has:
- Arabic label
- SF Symbol icon
- Themed color from design system

## Design System

Sky-centric color palette matching the web app's Tailwind config:

- **Primary**: Sky-500 `#0ea5e9`
- **Primary Dark**: Sky-700 `#0369a1`
- **Background**: Sky-50 `#f0f9ff`
- **Cards**: White
- **Text**: Slate-900 / Slate-500 / Slate-400

Typography uses SF Pro Rounded with Dynamic Type support for accessibility.

## Key Differences from Web

| Aspect | Web (React) | iOS (SwiftUI) |
|---|---|---|
| Firebase | JS SDK (direct) | REST API (URLSession) |
| State | React Context + hooks | @Observable + EnvironmentObject |
| Auth tokens | In-memory | iOS Keychain (persistent) |
| Cart storage | `localStorage` | `UserDefaults` |
| Navigation | React Router | NavigationStack |
| Styling | Tailwind CSS | SwiftUI + Custom Design System |
| RTL | `dir="rtl"` on HTML | `.environment(\.layoutDirection, .rightToLeft)` |
| Realtime | `onSnapshot` | Polling / pull-to-refresh (REST limitation) |

## Future Enhancements

- [ ] Push notifications via APNs + Firebase Cloud Messaging
- [ ] Firestore real-time via SSE (Server-Sent Events REST endpoint)
- [ ] Apple Pay integration
- [ ] Offline mode with local caching
- [ ] Admin dashboard screens
- [ ] Chat/support screens
- [ ] Image upload for menu items and profile photos
- [ ] Deep linking for order tracking
- [ ] Widget for active order status
- [ ] Apple Watch companion app

## License

Private — Part of the سفرة البيت (Albyt Sofra) platform.
