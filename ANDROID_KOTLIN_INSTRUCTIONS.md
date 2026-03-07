# 📱 سفرة البيت — Android Native (Kotlin + Jetpack Compose)
## دليل شامل لتحويل تطبيق iOS إلى Android

> **الهدف:** إنشاء نسخة Android مطابقة 100% لتطبيق iOS الحالي باستخدام Kotlin وJetpack Compose

---

## 📋 فهرس المحتويات
1. [نظرة عامة على المشروع](#1-نظرة-عامة-على-المشروع)
2. [المعمارية (Architecture)](#2-المعمارية-architecture)
3. [إعداد المشروع](#3-إعداد-المشروع)
4. [الألوان والتصميم (Design System)](#4-الألوان-والتصميم-design-system)
5. [الخطوط (Typography)](#5-الخطوط-typography)
6. [المسافات والأحجام (Spacing)](#6-المسافات-والأحجام-spacing)
7. [المكونات (Components)](#7-المكونات-components)
8. [Firebase REST API](#8-firebase-rest-api)
9. [نماذج البيانات (Data Models)](#9-نماذج-البيانات-data-models)
10. [نظام الأدوار (Roles System)](#10-نظام-الأدوار-roles-system)
11. [الشاشات (Screens)](#11-الشاشات-screens)
12. [ViewModels](#12-viewmodels)
13. [Networking Layer](#13-networking-layer)
14. [التخزين المحلي](#14-التخزين-المحلي)
15. [رسائل الخطأ (Arabic)](#15-رسائل-الخطأ-arabic)
16. [قواعد Firestore](#16-قواعد-firestore)
17. [Collections Reference](#17-collections-reference)
18. [ملاحظات RTL](#18-ملاحظات-rtl)

---

## 1. نظرة عامة على المشروع

### معلومات أساسية
| الخاصية | القيمة |
|---------|--------|
| **اسم التطبيق** | سفرة البيت (Albyt Sofra) |
| **Package Name** | `com.albayt.sofra` |
| **Min SDK** | 26 (Android 8.0) |
| **Target SDK** | 34 (Android 14) |
| **اللغة** | Kotlin |
| **UI Framework** | Jetpack Compose |
| **اتجاه التطبيق** | RTL (من اليمين لليسار) |
| **اللغة الافتراضية** | العربية |
| **الثيم** | رمضاني فخم (Dark Navy + Gold) |

### Firebase Project
| الخاصية | القيمة |
|---------|--------|
| **Project ID** | `albayt-sofra` |
| **API Key** | `AIzaSyC1iM3g3gGfu23GKLpDRQplBuHidPniFIk` |
| **Auth Domain** | `albayt-sofra.firebaseapp.com` |
| **Storage Bucket** | `albayt-sofra.firebasestorage.app` |

### ⚠️ مهم جداً: لا SDK!
- **لا نستخدم Firebase SDK** - جميع العمليات عبر REST API
- **لا dependencies خارجية** للـ Firebase
- نستخدم Retrofit/Ktor للـ HTTP requests
- هذا يعطينا: APK أصغر، build أسرع، تحكم كامل

---

## 2. المعمارية (Architecture)

### MVVM + Clean Architecture
```
app/
├── src/main/
│   ├── java/com/albayt/sofra/
│   │   ├── App.kt                          # Application class
│   │   ├── MainActivity.kt                 # Entry point
│   │   │
│   │   ├── data/                           # Data Layer
│   │   │   ├── remote/                     # API
│   │   │   │   ├── ApiClient.kt            # Retrofit/Ktor client
│   │   │   │   ├── Endpoints.kt            # URL constants
│   │   │   │   ├── FirebaseAuthService.kt  # Auth REST
│   │   │   │   ├── FirestoreService.kt     # Firestore REST
│   │   │   │   └── StorageService.kt       # Storage REST
│   │   │   ├── dto/                        # Data Transfer Objects
│   │   │   │   ├── UserDto.kt
│   │   │   │   ├── RestaurantDto.kt
│   │   │   │   ├── MenuItemDto.kt
│   │   │   │   ├── OrderDto.kt
│   │   │   │   ├── ChatMessageDto.kt
│   │   │   │   ├── CourierApplicationDto.kt
│   │   │   │   └── FirestoreDocument.kt
│   │   │   └── local/                      # Local Storage
│   │   │       ├── CartStorage.kt          # SharedPreferences
│   │   │       └── TokenStorage.kt         # EncryptedSharedPreferences
│   │   │
│   │   ├── domain/                         # Domain Layer
│   │   │   ├── model/                      # Domain Models
│   │   │   │   ├── User.kt
│   │   │   │   ├── Restaurant.kt
│   │   │   │   ├── MenuItem.kt
│   │   │   │   ├── Order.kt
│   │   │   │   ├── CartItem.kt
│   │   │   │   └── UserRole.kt
│   │   │   └── repository/                 # Repository Interfaces
│   │   │       ├── AuthRepository.kt
│   │   │       ├── RestaurantRepository.kt
│   │   │       └── OrderRepository.kt
│   │   │
│   │   ├── ui/                             # Presentation Layer
│   │   │   ├── theme/                      # Design System
│   │   │   │   ├── Color.kt                # SofraColors
│   │   │   │   ├── Type.kt                 # SofraTypography
│   │   │   │   ├── Spacing.kt              # SofraSpacing
│   │   │   │   └── Theme.kt                # SofraTheme
│   │   │   ├── components/                 # Reusable Components
│   │   │   │   ├── SofraButton.kt
│   │   │   │   ├── SofraTextField.kt
│   │   │   │   ├── SofraCard.kt
│   │   │   │   ├── StatusBadge.kt
│   │   │   │   ├── SkeletonView.kt
│   │   │   │   ├── EmptyStateView.kt
│   │   │   │   ├── ErrorStateView.kt
│   │   │   │   ├── RamadanDecorations.kt
│   │   │   │   ├── CachedAsyncImage.kt
│   │   │   │   └── LocationPickerView.kt
│   │   │   ├── navigation/                 # Navigation
│   │   │   │   ├── NavGraph.kt
│   │   │   │   └── Screen.kt
│   │   │   └── screens/                    # Feature Screens
│   │   │       ├── auth/
│   │   │       ├── home/
│   │   │       ├── restaurants/
│   │   │       ├── menu/
│   │   │       ├── cart/
│   │   │       ├── orders/
│   │   │       ├── profile/
│   │   │       ├── notifications/
│   │   │       ├── owner/
│   │   │       ├── courier/
│   │   │       ├── supervisor/
│   │   │       └── developer/
│   │   │
│   │   └── util/                           # Utilities
│   │       ├── Extensions.kt
│   │       ├── Logger.kt
│   │       └── ServiceFee.kt
│   │
│   └── res/
│       ├── values/
│       │   ├── strings.xml                 # Arabic strings
│       │   └── colors.xml
│       └── values-ar/
│           └── strings.xml
```

### Data Flow
```
┌─────────────┐     ┌──────────────────┐     ┌───────────────────┐
│  Compose    │────▶│   ViewModel      │────▶│  Repository       │
│  Screen     │◀────│  (StateFlow)     │◀────│  (Firestore REST) │
└─────────────┘     └──────────────────┘     └───────────────────┘
                           │                          │
                    ┌──────▼──────┐            ┌──────▼──────┐
                    │  AppState   │            │  ApiClient  │
                    │  (Auth)     │            │  (OkHttp)   │
                    └─────────────┘            └─────────────┘
                           │                          │
                    ┌──────▼──────┐            ┌──────▼──────┐
                    │  Encrypted  │            │  Firebase   │
                    │  Prefs      │            │  REST APIs  │
                    └─────────────┘            └─────────────┘
```

---

## 3. إعداد المشروع

### build.gradle.kts (Module: app)
```kotlin
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.serialization")
}

android {
    namespace = "com.albayt.sofra"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.albayt.sofra"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0"

        // Firebase config
        buildConfigField("String", "FIREBASE_API_KEY", "\"AIzaSyC1iM3g3gGfu23GKLpDRQplBuHidPniFIk\"")
        buildConfigField("String", "FIREBASE_PROJECT_ID", "\"albayt-sofra\"")
        buildConfigField("String", "FIREBASE_STORAGE_BUCKET", "\"albayt-sofra.firebasestorage.app\"")
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.8"
    }
}

dependencies {
    // Compose BOM
    implementation(platform("androidx.compose:compose-bom:2024.02.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    
    // Navigation
    implementation("androidx.navigation:navigation-compose:2.7.7")
    
    // Lifecycle
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.7.0")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.7.0")
    
    // Networking (no Firebase SDK!)
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-kotlinx-serialization:2.9.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")
    
    // Serialization
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.2")
    
    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    
    // Image Loading
    implementation("io.coil-kt:coil-compose:2.5.0")
    
    // Encrypted SharedPreferences
    implementation("androidx.security:security-crypto:1.1.0-alpha06")
    
    // Location
    implementation("com.google.android.gms:play-services-location:21.1.0")
    implementation("com.google.android.gms:play-services-maps:18.2.0")
    implementation("com.google.maps.android:maps-compose:4.3.0")
    
    // Debug
    debugImplementation("androidx.compose.ui:ui-tooling")
}
```

### AndroidManifest.xml
```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />

    <application
        android:name=".App"
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.Sofra">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:windowSoftInputMode="adjustResize">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <!-- Google Maps API Key -->
        <meta-data
            android:name="com.google.android.geo.API_KEY"
            android:value="YOUR_GOOGLE_MAPS_API_KEY" />
    </application>
</manifest>
```

---

## 4. الألوان والتصميم (Design System)

### Color.kt — الألوان الكاملة
```kotlin
package com.albayt.sofra.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color

/**
 * 🌙 تصميم فخم بطابع رمضاني — ألوان ذهبية ونيلية غنية
 * Luxurious Ramadan-themed color palette: deep navy, rich gold, emerald accents
 */
object SofraColors {

    // ==================== 🌙 Ramadan Deep Navy Palette ====================
    val Navy50 = Color(0xFFEEF0F8)
    val Navy100 = Color(0xFFD4D8EC)
    val Navy200 = Color(0xFFA9B1D9)
    val Navy300 = Color(0xFF7E8AC6)
    val Navy400 = Color(0xFF5363B3)
    val Navy500 = Color(0xFF2D3A8C)
    val Navy600 = Color(0xFF232E70)
    val Navy700 = Color(0xFF1A2354)
    val Navy800 = Color(0xFF111738)
    val Navy900 = Color(0xFF0A0E22)

    // ==================== ✨ Ramadan Gold Palette ====================
    val Gold50 = Color(0xFFFFF9E6)
    val Gold100 = Color(0xFFFFF0BF)
    val Gold200 = Color(0xFFFFE699)
    val Gold300 = Color(0xFFFFD966)
    val Gold400 = Color(0xFFFFCC33)
    val Gold500 = Color(0xFFD4A017)
    val Gold600 = Color(0xFFB8860B)
    val Gold700 = Color(0xFF8B6914)
    val Gold800 = Color(0xFF705618)
    val Gold900 = Color(0xFF4A3A10)

    // ==================== 🌿 Emerald Accents ====================
    val Emerald400 = Color(0xFF34D399)
    val Emerald500 = Color(0xFF10B981)
    val Emerald600 = Color(0xFF059669)

    // ==================== ⭐ Status Colors ====================
    val Success = Color(0xFF10B981)
    val Warning = Color(0xFFF59E0B)
    val Error = Color(0xFFEF4444)
    val Info = Color(0xFF6366F1)

    // ==================== 🌙 Ramadan Special ====================
    val MoonGlow = Color(0xFFFFFDE7).copy(alpha = 0.15f)
    val LanternOrange = Color(0xFFFF8C00)
    val LanternGlow = Color(0xFFFFB347).copy(alpha = 0.3f)
    val StarGold = Color(0xFFFFD700)

    // ==================== 🎨 Semantic Colors (Adaptive) ====================
    
    val Primary = Gold500
    val PrimaryLight = Gold400
    val PrimaryDark = Gold700
    val Accent = Gold400

    // Dark mode colors
    private val BackgroundDark = Color(0xFF0A0E22)
    private val BackgroundLight = Color(0xFFF5EDE0)
    private val CardBackgroundDark = Color(0xFF141A3D)
    private val CardBackgroundLight = Color(0xFFFFFBF5)
    private val SecondaryBgDark = Color(0xFF111738)
    private val SecondaryBgLight = Color(0xFFEDE5D8)
    private val SurfaceElevatedDark = Color(0xFF1C2347)
    private val SurfaceElevatedLight = Color(0xFFF0E8DA)
    private val TextPrimaryDark = Color(0xFFF5F0E1)
    private val TextPrimaryLight = Color(0xFF1A2354)
    private val TextSecondaryDark = Color(0xFF9CA3C4)
    private val TextSecondaryLight = Color(0xFF5363B3)
    private val TextMutedDark = Color(0xFF6B7196)
    private val TextMutedLight = Color(0xFF8690B5)
    private val TextGoldDark = Color(0xFFFFCC33)
    private val TextGoldLight = Color(0xFFB8860B)

    @Composable
    fun background() = if (isSystemInDarkTheme()) BackgroundDark else BackgroundLight

    @Composable
    fun cardBackground() = if (isSystemInDarkTheme()) CardBackgroundDark else CardBackgroundLight

    @Composable
    fun secondaryBg() = if (isSystemInDarkTheme()) SecondaryBgDark else SecondaryBgLight

    @Composable
    fun surfaceElevated() = if (isSystemInDarkTheme()) SurfaceElevatedDark else SurfaceElevatedLight

    @Composable
    fun textPrimary() = if (isSystemInDarkTheme()) TextPrimaryDark else TextPrimaryLight

    @Composable
    fun textSecondary() = if (isSystemInDarkTheme()) TextSecondaryDark else TextSecondaryLight

    @Composable
    fun textMuted() = if (isSystemInDarkTheme()) TextMutedDark else TextMutedLight

    @Composable
    fun textGold() = if (isSystemInDarkTheme()) TextGoldDark else TextGoldLight

    // ==================== 🔮 Gradients ====================
    val GoldGradient = Brush.linearGradient(
        colors = listOf(Gold400, Gold600)
    )

    @Composable
    fun navyGradient() = Brush.verticalGradient(
        colors = if (isSystemInDarkTheme()) {
            listOf(Navy700, Navy900)
        } else {
            listOf(SecondaryBgLight, BackgroundLight)
        }
    )

    @Composable
    fun premiumGradient() = Brush.linearGradient(
        colors = if (isSystemInDarkTheme()) {
            listOf(Color(0xFF1A1F4B), Color(0xFF0D1126))
        } else {
            listOf(SurfaceElevatedLight, BackgroundLight)
        }
    )

    // ==================== Order Status Colors ====================
    fun orderStatusColor(status: String): Color {
        return when (status) {
            "pending" -> Warning
            "accepted" -> Info
            "preparing" -> Gold500
            "ready" -> Color(0xFF8B5CF6)
            "out_for_delivery" -> Color(0xFF3B82F6)
            "delivered" -> Success
            "cancelled" -> Error
            else -> TextMutedDark
        }
    }
}
```

---

## 5. الخطوط (Typography)

### Type.kt
```kotlin
package com.albayt.sofra.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.albayt.sofra.R

/**
 * 🌙 خطوط فخمة بطابع رمضاني
 * Premium typography with Arabic-friendly styling
 */
object SofraTypography {

    // Large Title - للعناوين الرئيسية
    val LargeTitle = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 34.sp,
        lineHeight = 41.sp
    )

    // Title - عناوين
    val Title = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 28.sp,
        lineHeight = 34.sp
    )

    val Title2 = TextStyle(
        fontWeight = FontWeight.SemiBold,
        fontSize = 22.sp,
        lineHeight = 28.sp
    )

    val Title3 = TextStyle(
        fontWeight = FontWeight.SemiBold,
        fontSize = 20.sp,
        lineHeight = 25.sp
    )

    // Headline
    val Headline = TextStyle(
        fontWeight = FontWeight.SemiBold,
        fontSize = 17.sp,
        lineHeight = 22.sp
    )

    // Body
    val Body = TextStyle(
        fontWeight = FontWeight.Normal,
        fontSize = 17.sp,
        lineHeight = 22.sp
    )

    val BodyBold = TextStyle(
        fontWeight = FontWeight.SemiBold,
        fontSize = 17.sp,
        lineHeight = 22.sp
    )

    // Callout
    val Callout = TextStyle(
        fontWeight = FontWeight.Normal,
        fontSize = 16.sp,
        lineHeight = 21.sp
    )

    val CalloutSemibold = TextStyle(
        fontWeight = FontWeight.SemiBold,
        fontSize = 16.sp,
        lineHeight = 21.sp
    )

    // Subheadline
    val Subheadline = TextStyle(
        fontWeight = FontWeight.Normal,
        fontSize = 15.sp,
        lineHeight = 20.sp
    )

    // Footnote
    val Footnote = TextStyle(
        fontWeight = FontWeight.Normal,
        fontSize = 13.sp,
        lineHeight = 18.sp
    )

    // Caption
    val Caption = TextStyle(
        fontWeight = FontWeight.Normal,
        fontSize = 12.sp,
        lineHeight = 16.sp
    )

    val Caption2 = TextStyle(
        fontWeight = FontWeight.Normal,
        fontSize = 11.sp,
        lineHeight = 13.sp
    )

    // Price / Numbers (Monospaced for alignment)
    val Price = TextStyle(
        fontWeight = FontWeight.Bold,
        fontSize = 22.sp,
        lineHeight = 28.sp,
        fontFamily = FontFamily.Monospace
    )

    val PriceSmall = TextStyle(
        fontWeight = FontWeight.SemiBold,
        fontSize = 17.sp,
        lineHeight = 22.sp,
        fontFamily = FontFamily.Monospace
    )

    // 🌙 Ramadan Decorative
    val RamadanTitle = TextStyle(
        fontWeight = FontWeight.Black,
        fontSize = 28.sp,
        lineHeight = 34.sp
    )

    val RamadanSubtitle = TextStyle(
        fontWeight = FontWeight.Medium,
        fontSize = 20.sp,
        lineHeight = 25.sp
    )
}

// Material3 Typography adapter
val SofraM3Typography = Typography(
    displayLarge = SofraTypography.LargeTitle,
    displayMedium = SofraTypography.Title,
    displaySmall = SofraTypography.Title2,
    headlineLarge = SofraTypography.Title3,
    headlineMedium = SofraTypography.Headline,
    headlineSmall = SofraTypography.Subheadline,
    titleLarge = SofraTypography.Title3,
    titleMedium = SofraTypography.Headline,
    titleSmall = SofraTypography.Subheadline,
    bodyLarge = SofraTypography.Body,
    bodyMedium = SofraTypography.Callout,
    bodySmall = SofraTypography.Footnote,
    labelLarge = SofraTypography.CalloutSemibold,
    labelMedium = SofraTypography.Caption,
    labelSmall = SofraTypography.Caption2
)
```

---

## 6. المسافات والأحجام (Spacing)

### Spacing.kt
```kotlin
package com.albayt.sofra.ui.theme

import androidx.compose.ui.unit.dp

/**
 * 🌙 مسافات وأحجام فخمة — Premium Spacing Tokens
 */
object SofraSpacing {
    // Base Spacing
    val XXS = 2.dp
    val XS = 4.dp
    val SM = 8.dp
    val MD = 12.dp
    val LG = 16.dp
    val XL = 24.dp
    val XXL = 32.dp
    val XXXL = 48.dp

    // Screen
    val ScreenHorizontal = 16.dp
    val ScreenVertical = 16.dp

    // Card (larger radius for premium feel)
    val CardPadding = 18.dp
    val CardRadius = 20.dp
    val CardSpacing = 12.dp

    // Button
    val ButtonHeight = 52.dp
    val ButtonRadius = 16.dp
    val ButtonHPadding = 24.dp

    // Input
    val InputHeight = 52.dp
    val InputRadius = 14.dp
    val InputHPadding = 16.dp

    // Avatars
    val AvatarSmall = 36.dp
    val AvatarMedium = 48.dp
    val AvatarLarge = 72.dp

    // Aliases
    val Small = SM
    val Medium = MD
    val Large = LG
    val ExtraLarge = XL
}
```

---

## 7. المكونات (Components)

### SofraButton.kt
```kotlin
package com.albayt.sofra.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.unit.dp
import com.albayt.sofra.ui.theme.*

enum class SofraButtonStyle {
    PRIMARY, SECONDARY, DESTRUCTIVE, GHOST
}

@Composable
fun SofraButton(
    title: String,
    modifier: Modifier = Modifier,
    icon: @Composable (() -> Unit)? = null,
    style: SofraButtonStyle = SofraButtonStyle.PRIMARY,
    isLoading: Boolean = false,
    isDisabled: Boolean = false,
    onClick: () -> Unit
) {
    val haptic = LocalHapticFeedback.current
    
    val backgroundColor = when (style) {
        SofraButtonStyle.PRIMARY -> SofraColors.GoldGradient
        SofraButtonStyle.SECONDARY -> Brush.linearGradient(
            listOf(SofraColors.surfaceElevated().copy(alpha = 0.8f), 
                   SofraColors.surfaceElevated().copy(alpha = 0.8f))
        )
        SofraButtonStyle.DESTRUCTIVE -> Brush.linearGradient(
            listOf(SofraColors.Error, SofraColors.Error.copy(alpha = 0.8f))
        )
        SofraButtonStyle.GHOST -> Brush.linearGradient(listOf(Color.Transparent, Color.Transparent))
    }
    
    val textColor = when (style) {
        SofraButtonStyle.PRIMARY -> SofraColors.Navy900
        SofraButtonStyle.SECONDARY -> SofraColors.Gold400
        SofraButtonStyle.DESTRUCTIVE -> Color.White
        SofraButtonStyle.GHOST -> SofraColors.Gold400
    }
    
    val shadowColor = when (style) {
        SofraButtonStyle.PRIMARY -> SofraColors.Gold500.copy(alpha = 0.3f)
        SofraButtonStyle.DESTRUCTIVE -> SofraColors.Error.copy(alpha = 0.3f)
        else -> Color.Transparent
    }

    Button(
        onClick = {
            haptic.performHapticFeedback(HapticFeedbackType.LongPress)
            onClick()
        },
        enabled = !isLoading && !isDisabled,
        modifier = modifier
            .fillMaxWidth()
            .height(SofraSpacing.ButtonHeight)
            .shadow(
                elevation = if (shadowColor != Color.Transparent) 10.dp else 0.dp,
                spotColor = shadowColor,
                shape = RoundedCornerShape(SofraSpacing.ButtonRadius)
            ),
        shape = RoundedCornerShape(SofraSpacing.ButtonRadius),
        colors = ButtonDefaults.buttonColors(
            containerColor = Color.Transparent,
            disabledContainerColor = Color.Transparent
        ),
        contentPadding = PaddingValues(0.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(backgroundColor, RoundedCornerShape(SofraSpacing.ButtonRadius))
                .then(
                    if (style == SofraButtonStyle.GHOST || style == SofraButtonStyle.SECONDARY) {
                        Modifier // Add border for ghost/secondary
                    } else Modifier
                ),
            contentAlignment = Alignment.Center
        ) {
            if (isLoading) {
                CircularProgressIndicator(
                    color = textColor,
                    modifier = Modifier.size(24.dp),
                    strokeWidth = 2.dp
                )
            } else {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(SofraSpacing.SM),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    icon?.invoke()
                    Text(
                        text = title,
                        style = SofraTypography.Headline,
                        color = textColor
                    )
                }
            }
        }
    }
}
```

### SofraTextField.kt
```kotlin
package com.albayt.sofra.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.albayt.sofra.ui.theme.*

@Composable
fun SofraTextField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    modifier: Modifier = Modifier,
    icon: @Composable (() -> Unit)? = null,
    placeholder: String = "",
    isSecure: Boolean = false,
    keyboardType: KeyboardType = KeyboardType.Text,
    errorMessage: String? = null,
    singleLine: Boolean = true
) {
    var isFocused by remember { mutableStateOf(false) }
    
    val borderColor = when {
        errorMessage != null -> SofraColors.Error
        isFocused -> SofraColors.Gold400
        else -> SofraColors.Gold500.copy(alpha = 0.15f)
    }
    
    val labelColor = if (isFocused) SofraColors.Gold400 else SofraColors.textSecondary()

    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.End,
        verticalArrangement = Arrangement.spacedBy(SofraSpacing.XS)
    ) {
        // Label
        Text(
            text = label,
            style = SofraTypography.Subheadline,
            color = labelColor
        )
        
        // Input field
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(SofraSpacing.InputHeight)
                .shadow(
                    elevation = if (isFocused) 8.dp else 0.dp,
                    spotColor = SofraColors.Gold500.copy(alpha = 0.15f),
                    shape = RoundedCornerShape(SofraSpacing.InputRadius)
                )
                .clip(RoundedCornerShape(SofraSpacing.InputRadius))
                .background(SofraColors.surfaceElevated().copy(alpha = 0.6f))
                .border(
                    width = if (isFocused) 1.5.dp else 0.8.dp,
                    color = borderColor,
                    shape = RoundedCornerShape(SofraSpacing.InputRadius)
                )
                .padding(horizontal = SofraSpacing.InputHPadding),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(SofraSpacing.SM)
        ) {
            icon?.invoke()
            
            TextField(
                value = value,
                onValueChange = onValueChange,
                modifier = Modifier
                    .weight(1f)
                    .onFocusChanged { isFocused = it.isFocused },
                placeholder = {
                    Text(
                        text = placeholder,
                        style = SofraTypography.Body,
                        color = SofraColors.textMuted(),
                        textAlign = TextAlign.End,
                        modifier = Modifier.fillMaxWidth()
                    )
                },
                textStyle = SofraTypography.Body.copy(
                    color = SofraColors.textPrimary(),
                    textAlign = TextAlign.End
                ),
                visualTransformation = if (isSecure) PasswordVisualTransformation() else VisualTransformation.None,
                keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
                singleLine = singleLine,
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = Color.Transparent,
                    unfocusedContainerColor = Color.Transparent,
                    focusedIndicatorColor = Color.Transparent,
                    unfocusedIndicatorColor = Color.Transparent
                )
            )
        }
        
        // Error message
        if (errorMessage != null) {
            Text(
                text = errorMessage,
                style = SofraTypography.Caption,
                color = SofraColors.Error
            )
        }
    }
}
```

### SofraCard.kt
```kotlin
package com.albayt.sofra.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.albayt.sofra.ui.theme.*

@Composable
fun SofraCard(
    modifier: Modifier = Modifier,
    padding: androidx.compose.ui.unit.Dp = SofraSpacing.CardPadding,
    showBorder: Boolean = true,
    content: @Composable ColumnScope.() -> Unit
) {
    val borderGradient = Brush.linearGradient(
        colors = listOf(
            SofraColors.Gold500.copy(alpha = 0.25f),
            SofraColors.Gold400.copy(alpha = 0.08f),
            SofraColors.Gold500.copy(alpha = 0.15f)
        )
    )

    Column(
        modifier = modifier
            .fillMaxWidth()
            .shadow(
                elevation = 12.dp,
                spotColor = Color.Black.copy(alpha = 0.2f),
                shape = RoundedCornerShape(SofraSpacing.CardRadius)
            )
            .clip(RoundedCornerShape(SofraSpacing.CardRadius))
            .background(SofraColors.cardBackground())
            .then(
                if (showBorder) {
                    Modifier.border(
                        width = 0.8.dp,
                        brush = borderGradient,
                        shape = RoundedCornerShape(SofraSpacing.CardRadius)
                    )
                } else Modifier
            )
            .padding(padding),
        horizontalAlignment = Alignment.End,
        verticalArrangement = Arrangement.spacedBy(SofraSpacing.CardSpacing),
        content = content
    )
}
```

### StatusBadge.kt
```kotlin
package com.albayt.sofra.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.albayt.sofra.ui.theme.*

@Composable
fun StatusBadge(
    text: String,
    color: Color,
    modifier: Modifier = Modifier
) {
    Text(
        text = text,
        style = SofraTypography.Caption.copy(fontWeight = androidx.compose.ui.text.font.FontWeight.SemiBold),
        color = Color.White,
        modifier = modifier
            .shadow(
                elevation = 6.dp,
                spotColor = color.copy(alpha = 0.3f),
                shape = CircleShape
            )
            .clip(CircleShape)
            .background(color.copy(alpha = 0.85f))
            .border(
                width = 0.5.dp,
                color = color.copy(alpha = 0.4f),
                shape = CircleShape
            )
            .padding(horizontal = SofraSpacing.MD, vertical = SofraSpacing.XS + 2.dp)
    )
}

@Composable
fun StatusBadge(status: String, modifier: Modifier = Modifier) {
    val (text, color) = when (status) {
        "pending" -> "بانتظار القبول" to SofraColors.Warning
        "accepted" -> "تم القبول" to SofraColors.Info
        "preparing" -> "قيد التحضير" to SofraColors.Gold500
        "ready" -> "جاهز" to Color(0xFF8B5CF6)
        "out_for_delivery" -> "في الطريق" to Color(0xFF3B82F6)
        "delivered" -> "تم التوصيل" to SofraColors.Success
        "cancelled" -> "ملغي" to SofraColors.Error
        else -> status to SofraColors.textMuted()
    }
    
    StatusBadge(text = text, color = color, modifier = modifier)
}
```

### SkeletonView.kt
```kotlin
package com.albayt.sofra.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.albayt.sofra.ui.theme.*

@Composable
fun SkeletonView(
    modifier: Modifier = Modifier,
    width: Dp? = null,
    height: Dp = 16.dp,
    radius: Dp = 8.dp
) {
    val infiniteTransition = rememberInfiniteTransition(label = "shimmer")
    val translateAnimation by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1000f,
        animationSpec = infiniteRepeatable(
            animation = tween(
                durationMillis = 1500,
                easing = LinearEasing
            ),
            repeatMode = RepeatMode.Restart
        ),
        label = "shimmer"
    )

    val shimmerColors = listOf(
        SofraColors.surfaceElevated(),
        SofraColors.Gold500.copy(alpha = 0.08f),
        SofraColors.Gold400.copy(alpha = 0.15f),
        SofraColors.Gold500.copy(alpha = 0.08f),
        SofraColors.surfaceElevated()
    )

    val brush = Brush.linearGradient(
        colors = shimmerColors,
        start = Offset(translateAnimation - 500f, 0f),
        end = Offset(translateAnimation, 0f)
    )

    Box(
        modifier = modifier
            .then(if (width != null) Modifier.width(width) else Modifier)
            .height(height)
            .clip(RoundedCornerShape(radius))
            .background(brush)
    )
}

@Composable
fun SkeletonCard(modifier: Modifier = Modifier) {
    SofraCard(modifier = modifier) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(SofraSpacing.MD)
        ) {
            SkeletonView(width = 64.dp, height = 64.dp, radius = 12.dp)
            Column(
                verticalArrangement = Arrangement.spacedBy(SofraSpacing.SM)
            ) {
                SkeletonView(width = 140.dp, height = 18.dp)
                SkeletonView(width = 200.dp, height = 14.dp)
                SkeletonView(width = 80.dp, height = 14.dp)
            }
        }
    }
}
```

### EmptyStateView.kt
```kotlin
package com.albayt.sofra.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.albayt.sofra.ui.theme.*

@Composable
fun EmptyStateView(
    icon: ImageVector,
    title: String,
    message: String,
    modifier: Modifier = Modifier,
    actionTitle: String? = null,
    onAction: (() -> Unit)? = null
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(vertical = SofraSpacing.XXXL),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(SofraSpacing.LG)
    ) {
        Box(
            modifier = Modifier
                .size(100.dp)
                .clip(CircleShape)
                .background(SofraColors.Gold500.copy(alpha = 0.08f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                modifier = Modifier.size(44.dp),
                tint = SofraColors.Gold500
            )
        }
        
        Text(
            text = title,
            style = SofraTypography.Title3,
            color = SofraColors.textPrimary()
        )
        
        Text(
            text = message,
            style = SofraTypography.Body,
            color = SofraColors.textSecondary(),
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(horizontal = SofraSpacing.XXL)
        )
        
        if (actionTitle != null && onAction != null) {
            SofraButton(
                title = actionTitle,
                onClick = onAction,
                modifier = Modifier.padding(horizontal = SofraSpacing.XXXL)
            )
        }
    }
}
```

### RamadanDecorations.kt
```kotlin
package com.albayt.sofra.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DarkMode
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.albayt.sofra.ui.theme.*
import kotlin.random.Random

/**
 * ✨ Floating Stars Background
 */
@Composable
fun FloatingStarsView(
    count: Int = 20,
    modifier: Modifier = Modifier
) {
    val infiniteTransition = rememberInfiniteTransition(label = "stars")
    val alpha by infiniteTransition.animateFloat(
        initialValue = 0.2f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(2000, easing = EaseInOut),
            repeatMode = RepeatMode.Reverse
        ),
        label = "starAlpha"
    )

    Canvas(modifier = modifier.fillMaxSize()) {
        val random = Random(42) // Fixed seed for consistent positions
        repeat(count) {
            val x = random.nextFloat() * size.width
            val y = random.nextFloat() * size.height
            val starSize = random.nextFloat() * 4 + 2
            val starAlpha = random.nextFloat() * 0.3f + 0.2f
            
            drawCircle(
                color = SofraColors.Gold300.copy(alpha = starAlpha * alpha),
                radius = starSize,
                center = Offset(x, y)
            )
        }
    }
}

/**
 * 🌙 Crescent Moon
 */
@Composable
fun CrescentMoonView(
    size: Int = 60,
    glowRadius: Int = 20,
    modifier: Modifier = Modifier
) {
    val infiniteTransition = rememberInfiniteTransition(label = "moon")
    val glowAlpha by infiniteTransition.animateFloat(
        initialValue = 0.3f,
        targetValue = 0.6f,
        animationSpec = infiniteRepeatable(
            animation = tween(3000, easing = EaseInOut),
            repeatMode = RepeatMode.Reverse
        ),
        label = "glow"
    )

    Box(modifier = modifier, contentAlignment = Alignment.Center) {
        // Glow
        Icon(
            imageVector = Icons.Filled.DarkMode,
            contentDescription = null,
            modifier = Modifier
                .size(size.dp)
                .blur(glowRadius.dp),
            tint = SofraColors.Gold300.copy(alpha = glowAlpha)
        )
        
        // Moon
        Icon(
            imageVector = Icons.Filled.DarkMode,
            contentDescription = "Moon",
            modifier = Modifier
                .size(size.dp)
                .shadow(10.dp, spotColor = SofraColors.Gold400.copy(alpha = 0.5f)),
            tint = SofraColors.Gold400
        )
    }
}

/**
 * 🌙 Ramadan Banner Header
 */
@Composable
fun RamadanBannerView(modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(120.dp)
            .clip(RoundedCornerShape(20.dp))
            .background(SofraColors.premiumGradient())
    ) {
        FloatingStarsView(count = 15)
        
        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(SofraSpacing.LG),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            CrescentMoonView(size = 36, glowRadius = 12)
            
            Column(
                horizontalAlignment = Alignment.End,
                verticalArrangement = Arrangement.spacedBy(SofraSpacing.XS)
            ) {
                Text(
                    text = "رمضان كريم 🌙",
                    style = SofraTypography.RamadanTitle,
                    color = SofraColors.Gold300
                )
                Text(
                    text = "أطيب الأكلات من أسر منتجة",
                    style = SofraTypography.Subheadline,
                    color = SofraColors.textSecondary()
                )
            }
        }
    }
}
```

---

## 8. Firebase REST API

### Endpoints.kt
```kotlin
package com.albayt.sofra.data.remote

import com.albayt.sofra.BuildConfig

/**
 * Firebase REST API endpoint configuration
 */
object Endpoints {
    // Firebase Project Config
    const val API_KEY = BuildConfig.FIREBASE_API_KEY
    const val PROJECT_ID = BuildConfig.FIREBASE_PROJECT_ID
    const val STORAGE_BUCKET = BuildConfig.FIREBASE_STORAGE_BUCKET

    // Auth (Firebase Identity Toolkit REST API)
    private const val AUTH_BASE = "https://identitytoolkit.googleapis.com/v1"
    private const val TOKEN_BASE = "https://securetoken.googleapis.com/v1"

    val SIGN_IN = "$AUTH_BASE/accounts:signInWithPassword?key=$API_KEY"
    val SIGN_UP = "$AUTH_BASE/accounts:signUp?key=$API_KEY"
    val REFRESH_TOKEN = "$TOKEN_BASE/token?key=$API_KEY"
    val GET_USER_DATA = "$AUTH_BASE/accounts:lookup?key=$API_KEY"
    val DELETE_ACCOUNT = "$AUTH_BASE/accounts:delete?key=$API_KEY"
    val SEND_PHONE_VERIFICATION = "$AUTH_BASE/accounts:sendVerificationCode?key=$API_KEY"
    val SIGN_IN_WITH_PHONE = "$AUTH_BASE/accounts:signInWithPhoneNumber?key=$API_KEY"

    // Firestore REST API
    private const val FIRESTORE_BASE = "https://firestore.googleapis.com/v1/projects/$PROJECT_ID/databases/(default)/documents"

    fun collection(name: String) = "$FIRESTORE_BASE/$name"
    fun document(collection: String, id: String) = "$FIRESTORE_BASE/$collection/$id"
    const val RUN_QUERY = "$FIRESTORE_BASE:runQuery"

    // Storage
    fun storageDownload(path: String): String {
        val encoded = path.replace("/", "%2F")
        return "https://firebasestorage.googleapis.com/v0/b/$STORAGE_BUCKET/o/$encoded?alt=media"
    }

    fun storageUpload(path: String): String {
        val encoded = path.replace("/", "%2F")
        return "https://firebasestorage.googleapis.com/v0/b/$STORAGE_BUCKET/o/$encoded"
    }
}
```

### ApiClient.kt
```kotlin
package com.albayt.sofra.data.remote

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.logging.HttpLoggingInterceptor
import java.util.concurrent.TimeUnit

/**
 * Central HTTP client wrapping OkHttp with auth token injection
 */
object ApiClient {
    
    private val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        isLenient = true
    }
    
    private val client: OkHttpClient by lazy {
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }
        
        OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .addInterceptor(logging)
            .build()
    }

    suspend inline fun <reified T> request(
        url: String,
        method: String = "GET",
        body: String? = null,
        token: String? = null
    ): Result<T> = withContext(Dispatchers.IO) {
        try {
            val requestBuilder = Request.Builder()
                .url(url)
                .addHeader("Content-Type", "application/json")
            
            token?.let {
                requestBuilder.addHeader("Authorization", "Bearer $it")
            }
            
            when (method) {
                "POST" -> {
                    val requestBody = (body ?: "").toRequestBody("application/json".toMediaType())
                    requestBuilder.post(requestBody)
                }
                "PATCH" -> {
                    val requestBody = (body ?: "").toRequestBody("application/json".toMediaType())
                    requestBuilder.patch(requestBody)
                }
                "DELETE" -> requestBuilder.delete()
            }
            
            val response = client.newCall(requestBuilder.build()).execute()
            val responseBody = response.body?.string() ?: ""
            
            when (response.code) {
                in 200..299 -> {
                    val result = json.decodeFromString<T>(responseBody)
                    Result.success(result)
                }
                401 -> Result.failure(ApiError.Unauthorized)
                403 -> Result.failure(ApiError.Forbidden)
                404 -> Result.failure(ApiError.NotFound)
                else -> {
                    // Try to parse Firebase error
                    try {
                        val errorResponse = json.decodeFromString<FirebaseErrorResponse>(responseBody)
                        Result.failure(ApiError.FirebaseError(errorResponse.error.message))
                    } catch (e: Exception) {
                        Result.failure(ApiError.ServerError(response.code))
                    }
                }
            }
        } catch (e: Exception) {
            Result.failure(ApiError.NetworkError(e))
        }
    }

    suspend fun send(
        url: String,
        method: String,
        body: String? = null,
        token: String? = null
    ): Result<Unit> = withContext(Dispatchers.IO) {
        try {
            val requestBuilder = Request.Builder()
                .url(url)
                .addHeader("Content-Type", "application/json")
            
            token?.let {
                requestBuilder.addHeader("Authorization", "Bearer $it")
            }
            
            when (method) {
                "POST" -> {
                    val requestBody = (body ?: "").toRequestBody("application/json".toMediaType())
                    requestBuilder.post(requestBody)
                }
                "PATCH" -> {
                    val requestBody = (body ?: "").toRequestBody("application/json".toMediaType())
                    requestBuilder.patch(requestBody)
                }
                "DELETE" -> requestBuilder.delete()
            }
            
            val response = client.newCall(requestBuilder.build()).execute()
            
            if (response.code in 200..299) {
                Result.success(Unit)
            } else {
                Result.failure(ApiError.ServerError(response.code))
            }
        } catch (e: Exception) {
            Result.failure(ApiError.NetworkError(e))
        }
    }
}
```

### ApiError.kt
```kotlin
package com.albayt.sofra.data.remote

/**
 * Typed error handling for all network operations
 * رسائل الخطأ بالعربية
 */
sealed class ApiError : Exception() {
    object Unauthorized : ApiError() {
        override val message = "انتهت الجلسة. يرجى تسجيل الدخول مجدداً"
    }
    
    object Forbidden : ApiError() {
        override val message = "ليس لديك صلاحية الوصول"
    }
    
    object NotFound : ApiError() {
        override val message = "البيانات المطلوبة غير موجودة"
    }
    
    data class ServerError(val code: Int) : ApiError() {
        override val message = "خطأ في الخادم ($code)"
    }
    
    data class NetworkError(val cause: Throwable) : ApiError() {
        override val message = "تعذر الاتصال. تحقق من الإنترنت"
    }
    
    data class DecodingError(val cause: Throwable) : ApiError() {
        override val message = "خطأ في معالجة البيانات"
    }
    
    data class FirebaseError(override val message: String) : ApiError()
    
    data class Unknown(override val message: String) : ApiError()
}
```

---

## 9. نماذج البيانات (Data Models)

### UserRole.kt
```kotlin
package com.albayt.sofra.domain.model

enum class UserRole(val value: String) {
    CUSTOMER("customer"),
    OWNER("owner"),
    COURIER("courier"),
    ADMIN("admin"),
    DEVELOPER("developer"),
    SUPERVISOR("supervisor"),
    SOCIAL_MEDIA("social_media"),
    SUPPORT("support"),
    ACCOUNTANT("accountant");

    companion object {
        fun fromString(value: String): UserRole {
            return entries.find { it.value == value } ?: CUSTOMER
        }
    }
}
```

### User.kt
```kotlin
package com.albayt.sofra.domain.model

import java.util.Date

data class User(
    val uid: String,
    val email: String,
    val name: String? = null,
    val phone: String? = null,
    val city: String? = null,
    val address: String? = null,
    val role: UserRole = UserRole.CUSTOMER,
    val savedLocation: SavedLocation? = null,
    val location: GeoLocation? = null,
    val createdAt: Date? = null
) {
    val displayName: String
        get() = name ?: email.substringBefore("@").ifEmpty { "مستخدم" }

    val isCustomerProfileComplete: Boolean
        get() {
            val hasName = !name.isNullOrBlank()
            val hasPhone = !phone.isNullOrBlank()
            val hasLocation = savedLocation != null && savedLocation.lat != 0.0
            return hasName && hasPhone && hasLocation
        }

    val missingProfileFields: List<String>
        get() {
            val missing = mutableListOf<String>()
            if (name.isNullOrBlank()) missing.add("الاسم")
            if (phone.isNullOrBlank()) missing.add("رقم الجوال")
            if (savedLocation == null || savedLocation.lat == 0.0) missing.add("الموقع")
            return missing
        }
}

data class SavedLocation(
    val lat: Double,
    val lng: Double,
    val address: String
)

data class GeoLocation(
    val lat: Double,
    val lng: Double
)
```

### Restaurant.kt
```kotlin
package com.albayt.sofra.domain.model

import java.util.Date
import kotlin.math.*

data class Restaurant(
    val id: String,
    val name: String,
    val ownerId: String,
    val email: String? = null,
    val phone: String? = null,
    val city: String? = null,
    val location: String? = null,
    val logoUrl: String? = null,
    val coverUrl: String? = null,
    val isOpen: Boolean = true,
    val allowDelivery: Boolean = true,
    val allowPickup: Boolean = false,
    val packageType: PackageType = PackageType.FREE,
    val isVerified: Boolean = false,
    val sellerTier: SellerTier = SellerTier.BRONZE,
    val averageRating: Double? = null,
    val totalOrders: Int? = null,
    val announcement: String? = null,
    val isHiring: Boolean = false,
    val hiringDescription: String? = null,
    val commissionRate: Double = 15.0,
    val supervisorId: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val menuItemCount: Int? = null,
    val licenseExpiryDate: Date? = null,
    val licenseUrl: String? = null
) {
    enum class PackageType { FREE, PREMIUM }
    enum class SellerTier { BRONZE, SILVER, GOLD }

    val tierIcon: String
        get() = when (sellerTier) {
            SellerTier.BRONZE -> "medal"
            SellerTier.SILVER -> "medal_fill"
            SellerTier.GOLD -> "crown_fill"
        }

    val ratingText: String
        get() = averageRating?.let { String.format("%.1f", it) } ?: "جديد"

    val hasCoordinates: Boolean
        get() = latitude != null && longitude != null

    fun distanceKm(fromLat: Double, fromLng: Double): Double? {
        val lat = latitude ?: return null
        val lng = longitude ?: return null
        val earthRadius = 6371.0 // km
        val dLat = Math.toRadians(lat - fromLat)
        val dLng = Math.toRadians(lng - fromLng)
        val a = sin(dLat / 2).pow(2) +
                cos(Math.toRadians(fromLat)) * cos(Math.toRadians(lat)) *
                sin(dLng / 2).pow(2)
        val c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return earthRadius * c
    }

    fun distanceText(fromLat: Double, fromLng: Double): String? {
        val km = distanceKm(fromLat, fromLng) ?: return null
        return if (km < 1) {
            "${(km * 1000).toInt()} م"
        } else {
            String.format("%.1f كم", km)
        }
    }
}
```

### MenuItem.kt
```kotlin
package com.albayt.sofra.domain.model

import com.albayt.sofra.util.ServiceFee

data class MenuItem(
    val id: String,
    val name: String,
    val description: String? = null,
    val price: Double,
    val imageUrl: String? = null,
    val available: Boolean = true,
    val category: String? = null,
    val ownerId: String,
    val discountPercent: Double? = null,
    val orderCount: Int? = null
) {
    /** Final price after discount (owner's price) */
    val finalPrice: Double
        get() {
            val discount = discountPercent ?: return price
            return if (discount > 0) price * (1 - discount / 100) else price
        }

    /** Price + service fee (before VAT) */
    val priceWithServiceFee: Double
        get() = finalPrice + ServiceFee.PER_ITEM

    /** VAT amount on this item */
    val vatAmount: Double
        get() = priceWithServiceFee * ServiceFee.VAT_RATE

    /** Customer-facing price: finalPrice + service fee + VAT (15%) */
    val customerPrice: Double
        get() = priceWithServiceFee + vatAmount

    /** Has active discount */
    val hasDiscount: Boolean
        get() = (discountPercent ?: 0.0) > 0
}
```

### Order.kt
```kotlin
package com.albayt.sofra.domain.model

import java.util.Date

data class Order(
    val id: String,
    val customerId: String,
    val items: List<OrderItem> = emptyList(),
    val subtotal: Double = 0.0,
    val deliveryFee: Double = 0.0,
    val total: Double = 0.0,
    val status: OrderStatus = OrderStatus.PENDING,
    val address: String? = null,
    val deliveryType: String? = null,
    val courierId: String? = null,
    val notes: String? = null,
    val restaurantName: String? = null,
    val restaurantId: String? = null,
    val customerName: String? = null,
    val commissionRate: Double = 0.0,
    val commissionAmount: Double = 0.0,
    val netAmount: Double = 0.0,
    val serviceFeePerItem: Double = 1.75,
    val serviceFeeTotal: Double = 0.0,
    val platformFee: Double = 0.0,
    val supervisorFee: Double = 0.0,
    val supervisorId: String? = null,
    val deliveryLocation: DeliveryLocation? = null,
    val createdAt: Date? = null,
    val updatedAt: Date? = null,
    val acceptedAt: Date? = null,
    val readyAt: Date? = null,
    val pickedUpAt: Date? = null,
    val deliveredAt: Date? = null
) {
    val statusIcon: String
        get() = when (status) {
            OrderStatus.PENDING -> "schedule"
            OrderStatus.ACCEPTED -> "check_circle"
            OrderStatus.PREPARING -> "local_fire_department"
            OrderStatus.READY -> "shopping_bag"
            OrderStatus.OUT_FOR_DELIVERY -> "local_shipping"
            OrderStatus.DELIVERED -> "verified"
            OrderStatus.CANCELLED -> "cancel"
        }
}

data class OrderItem(
    val id: String,
    val name: String,
    val price: Double,
    val qty: Int,
    val ownerId: String? = null
) {
    val lineTotal: Double get() = price * qty
}

data class DeliveryLocation(
    val lat: Double,
    val lng: Double
)

enum class OrderStatus(val value: String, val arabicLabel: String) {
    PENDING("pending", "بانتظار القبول"),
    ACCEPTED("accepted", "تم القبول"),
    PREPARING("preparing", "قيد التحضير"),
    READY("ready", "جاهز"),
    OUT_FOR_DELIVERY("out_for_delivery", "في الطريق"),
    DELIVERED("delivered", "تم التوصيل"),
    CANCELLED("cancelled", "ملغي");

    companion object {
        fun fromString(value: String): OrderStatus {
            return entries.find { it.value == value } ?: PENDING
        }
    }

    val notificationTitle: String
        get() = when (this) {
            PENDING -> "🔔 طلب جديد"
            ACCEPTED -> "✅ تم قبول طلبك"
            PREPARING -> "🍳 طلبك قيد التحضير"
            READY -> "📦 طلبك جاهز"
            OUT_FOR_DELIVERY -> "🚛 طلبك في الطريق"
            DELIVERED -> "✅ تم التوصيل"
            CANCELLED -> "❌ تم إلغاء الطلب"
        }
}
```

### CartItem.kt
```kotlin
package com.albayt.sofra.domain.model

import kotlinx.serialization.Serializable

@Serializable
data class CartItem(
    val id: String,
    val name: String,
    val price: Double,
    val qty: Int,
    val ownerId: String
) {
    val lineTotal: Double get() = price * qty
}
```

---

## 10. نظام الأدوار (Roles System)

### 9 أدوار:
| الدور | الوصف | الوصول |
|-------|-------|--------|
| `customer` | العميل العادي | الرئيسية، المطاعم، السلة، الطلبات، الحساب |
| `owner` | صاحب مطعم/أسرة منتجة | لوحة تحكم، المنتجات، الطلبات، المحفظة |
| `courier` | سائق توصيل | التوصيل، الطلبات المتاحة، الأرباح |
| `admin` | مدير النظام | كل شيء |
| `developer` | مطور (superuser) | كل الشاشات للاختبار |
| `supervisor` | مشرف منطقة | إدارة المطاعم، الموافقات |
| `social_media` | مسؤول التواصل | (مستقبلي) |
| `support` | دعم فني | (مستقبلي) |
| `accountant` | محاسب | (مستقبلي) |

### MainNavigation (مهم جداً):
⚠️ **كل دور له Navigation منفصل** — لا تستخدم `if` داخل BottomNavigation

```kotlin
@Composable
fun MainNavigation(appState: AppState) {
    when (appState.role) {
        UserRole.DEVELOPER -> DeveloperNavigation()
        UserRole.SUPERVISOR, UserRole.ADMIN -> SupervisorNavigation()
        UserRole.OWNER -> OwnerNavigation()
        UserRole.COURIER -> CourierNavigation()
        else -> CustomerNavigation()
    }
}
```

---

## 11. الشاشات (Screens)

### قائمة كاملة بجميع الشاشات:

#### Auth Feature
| الشاشة | الملف | الوصف |
|--------|-------|-------|
| LoginScreen | `auth/LoginScreen.kt` | تسجيل الدخول (بريد/جوال) |
| PhoneLoginScreen | `auth/PhoneLoginScreen.kt` | تسجيل بالجوال + OTP |
| RegisterChoiceScreen | `auth/RegisterChoiceScreen.kt` | اختيار نوع الحساب |
| RegisterScreen | `auth/RegisterScreen.kt` | نموذج التسجيل |
| GuestBrowseScreen | `auth/GuestBrowseScreen.kt` | تصفح كزائر |

#### Home Feature
| الشاشة | الملف | الوصف |
|--------|-------|-------|
| HomeScreen | `home/HomeScreen.kt` | الرئيسية + بانر رمضاني |

#### Restaurants Feature
| الشاشة | الملف | الوصف |
|--------|-------|-------|
| RestaurantsListScreen | `restaurants/RestaurantsListScreen.kt` | قائمة المطاعم |
| RestaurantCard | `restaurants/RestaurantCard.kt` | بطاقة مطعم |

#### Menu Feature
| الشاشة | الملف | الوصف |
|--------|-------|-------|
| MenuScreen | `menu/MenuScreen.kt` | قائمة الأصناف |
| MenuItemCard | `menu/MenuItemCard.kt` | بطاقة صنف |

#### Cart Feature
| الشاشة | الملف | الوصف |
|--------|-------|-------|
| CartScreen | `cart/CartScreen.kt` | عرض السلة |
| CheckoutScreen | `cart/CheckoutScreen.kt` | إتمام الطلب |

#### Orders Feature
| الشاشة | الملف | الوصف |
|--------|-------|-------|
| OrdersScreen | `orders/OrdersScreen.kt` | قائمة الطلبات |
| OrderDetailScreen | `orders/OrderDetailScreen.kt` | تفاصيل الطلب + Timeline |

#### Profile Feature
| الشاشة | الملف | الوصف |
|--------|-------|-------|
| ProfileScreen | `profile/ProfileScreen.kt` | الملف الشخصي + الإعدادات |

#### Notifications Feature
| الشاشة | الملف | الوصف |
|--------|-------|-------|
| NotificationsScreen | `notifications/NotificationsScreen.kt` | الإشعارات |

#### Owner Feature
| الشاشة | الملف | الوصف |
|--------|-------|-------|
| OwnerDashboardScreen | `owner/OwnerDashboardScreen.kt` | لوحة تحكم المالك |
| OwnerProductsScreen | `owner/OwnerProductsScreen.kt` | إدارة المنتجات |
| AddMenuItemScreen | `owner/AddMenuItemScreen.kt` | إضافة صنف |
| EditMenuItemScreen | `owner/EditMenuItemScreen.kt` | تعديل صنف |
| OwnerOrdersTabScreen | `owner/OwnerOrdersTabScreen.kt` | طلبات المالك |
| WalletScreen | `owner/WalletScreen.kt` | المحفظة |
| PackagesScreen | `owner/PackagesScreen.kt` | الباقات |

#### Courier Feature
| الشاشة | الملف | الوصف |
|--------|-------|-------|
| CourierDashboardScreen | `courier/CourierDashboardScreen.kt` | لوحة السائق |
| CourierApplyScreen | `courier/CourierApplyScreen.kt` | التقدم للعمل |

#### Supervisor Feature
| الشاشة | الملف | الوصف |
|--------|-------|-------|
| SupervisorDashboardScreen | `supervisor/SupervisorDashboardScreen.kt` | لوحة المشرف |

#### Developer Feature
| الشاشة | الملف | الوصف |
|--------|-------|-------|
| DeveloperDashboardScreen | `developer/DeveloperDashboardScreen.kt` | لوحة المطور |
| DeveloperOrdersScreen | `developer/DeveloperOrdersScreen.kt` | كل الطلبات |

---

## 12. ViewModels

### AuthViewModel.kt
```kotlin
package com.albayt.sofra.ui.screens.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class AuthUiState(
    val loginEmail: String = "",
    val loginPassword: String = "",
    val registerEmail: String = "",
    val registerPassword: String = "",
    val registerName: String = "",
    val registerPhone: String = "",
    val registerCity: String = "",
    val selectedRole: UserRole = UserRole.CUSTOMER,
    val isLoading: Boolean = false,
    val errorMessage: String? = null
)

class AuthViewModel : ViewModel() {
    private val _uiState = MutableStateFlow(AuthUiState())
    val uiState = _uiState.asStateFlow()

    fun updateLoginEmail(email: String) {
        _uiState.value = _uiState.value.copy(loginEmail = email)
    }

    fun updateLoginPassword(password: String) {
        _uiState.value = _uiState.value.copy(loginPassword = password)
    }

    fun login(appState: AppState) {
        viewModelScope.launch {
            if (!validateLogin()) return@launch
            
            _uiState.value = _uiState.value.copy(isLoading = true, errorMessage = null)
            
            try {
                appState.login(_uiState.value.loginEmail.trim(), _uiState.value.loginPassword)
            } catch (e: ApiError) {
                _uiState.value = _uiState.value.copy(
                    errorMessage = handleFirebaseError(e),
                    isLoading = false
                )
            }
        }
    }

    private fun validateLogin(): Boolean {
        val email = _uiState.value.loginEmail.trim()
        val password = _uiState.value.loginPassword

        if (!android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            _uiState.value = _uiState.value.copy(errorMessage = "يرجى إدخال بريد إلكتروني صحيح")
            return false
        }
        if (password.isEmpty()) {
            _uiState.value = _uiState.value.copy(errorMessage = "يرجى إدخال كلمة المرور")
            return false
        }
        return true
    }

    private fun handleFirebaseError(error: ApiError): String {
        return when (error) {
            is ApiError.FirebaseError -> {
                when {
                    error.message.contains("EMAIL_NOT_FOUND") -> "البريد الإلكتروني غير مسجل"
                    error.message.contains("INVALID_PASSWORD") || 
                    error.message.contains("INVALID_LOGIN_CREDENTIALS") -> "كلمة المرور غير صحيحة"
                    error.message.contains("EMAIL_EXISTS") -> "البريد الإلكتروني مسجل مسبقاً"
                    error.message.contains("WEAK_PASSWORD") -> "كلمة المرور ضعيفة جداً"
                    error.message.contains("TOO_MANY_ATTEMPTS") -> "محاولات كثيرة. حاول لاحقاً"
                    else -> error.message
                }
            }
            else -> error.message ?: "حدث خطأ غير متوقع"
        }
    }
}
```

---

## 13. Networking Layer

### FirestoreService.kt
```kotlin
package com.albayt.sofra.data.remote

import kotlinx.serialization.json.*

class FirestoreService {
    private val json = Json { ignoreUnknownKeys = true }

    suspend fun getDocument(collection: String, id: String, idToken: String): Result<FirestoreDocumentResponse> {
        return ApiClient.request(
            url = Endpoints.document(collection, id),
            token = idToken
        )
    }

    suspend fun listDocuments(
        collection: String,
        idToken: String,
        pageSize: Int = 100,
        orderBy: String? = null
    ): Result<List<FirestoreDocumentResponse>> {
        var url = "${Endpoints.collection(collection)}?pageSize=$pageSize"
        orderBy?.let { url += "&orderBy=$it" }
        
        return ApiClient.request<FirestoreListResponse>(url, token = idToken)
            .map { it.documents ?: emptyList() }
    }

    suspend fun createDocument(
        collection: String,
        id: String,
        fields: Map<String, Any>,
        idToken: String
    ): Result<Unit> {
        val url = "${Endpoints.collection(collection)}?documentId=$id"
        val body = FirestoreEncoder.encodeDocument(fields)
        return ApiClient.send(url, "POST", body, idToken)
    }

    suspend fun updateDocument(
        collection: String,
        id: String,
        fields: Map<String, Any>,
        idToken: String
    ): Result<Unit> {
        val fieldMask = fields.keys.joinToString("&") { "updateMask.fieldPaths=$it" }
        val url = "${Endpoints.document(collection, id)}?$fieldMask"
        val body = FirestoreEncoder.encodeDocument(fields)
        return ApiClient.send(url, "PATCH", body, idToken)
    }

    suspend fun deleteDocument(collection: String, id: String, idToken: String): Result<Unit> {
        return ApiClient.send(Endpoints.document(collection, id), "DELETE", token = idToken)
    }

    suspend fun query(
        collection: String,
        filters: List<QueryFilter> = emptyList(),
        orderBy: String? = null,
        descending: Boolean = false,
        limit: Int? = null,
        idToken: String
    ): Result<List<FirestoreDocumentResponse>> {
        val structuredQuery = buildJsonObject {
            putJsonArray("from") {
                addJsonObject { put("collectionId", collection) }
            }
            
            if (filters.isNotEmpty()) {
                put("where", if (filters.size == 1) {
                    filters.first().toJson()
                } else {
                    buildJsonObject {
                        putJsonObject("compositeFilter") {
                            put("op", "AND")
                            putJsonArray("filters") {
                                filters.forEach { add(it.toJson()) }
                            }
                        }
                    }
                })
            }
            
            orderBy?.let {
                putJsonArray("orderBy") {
                    addJsonObject {
                        putJsonObject("field") { put("fieldPath", it) }
                        put("direction", if (descending) "DESCENDING" else "ASCENDING")
                    }
                }
            }
            
            limit?.let { put("limit", it) }
        }
        
        val body = buildJsonObject {
            put("structuredQuery", structuredQuery)
        }.toString()
        
        return ApiClient.request<List<FirestoreQueryResult>>(
            url = Endpoints.RUN_QUERY,
            method = "POST",
            body = body,
            token = idToken
        ).map { results ->
            results.mapNotNull { it.document }
        }
    }
}

data class QueryFilter(
    val field: String,
    val op: String,
    val value: Any
) {
    fun toJson(): JsonObject = buildJsonObject {
        putJsonObject("fieldFilter") {
            putJsonObject("field") { put("fieldPath", field) }
            put("op", op)
            put("value", FirestoreEncoder.encodeValue(value))
        }
    }
}
```

---

## 14. التخزين المحلي

### TokenStorage.kt (EncryptedSharedPreferences)
```kotlin
package com.albayt.sofra.data.local

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

class TokenStorage(context: Context) {
    
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
        .build()
    
    private val prefs = EncryptedSharedPreferences.create(
        context,
        "sofra_secure_prefs",
        masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    companion object {
        private const val KEY_ID_TOKEN = "id_token"
        private const val KEY_REFRESH_TOKEN = "refresh_token"
    }

    var idToken: String?
        get() = prefs.getString(KEY_ID_TOKEN, null)
        set(value) = prefs.edit().putString(KEY_ID_TOKEN, value).apply()

    var refreshToken: String?
        get() = prefs.getString(KEY_REFRESH_TOKEN, null)
        set(value) = prefs.edit().putString(KEY_REFRESH_TOKEN, value).apply()

    fun clear() {
        prefs.edit().clear().apply()
    }
}
```

### CartStorage.kt (SharedPreferences)
```kotlin
package com.albayt.sofra.data.local

import android.content.Context
import com.albayt.sofra.domain.model.CartItem
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class CartStorage(context: Context) {
    
    private val prefs = context.getSharedPreferences("broast_cart", Context.MODE_PRIVATE)
    private val json = Json { ignoreUnknownKeys = true }

    companion object {
        private const val KEY_CART_ITEMS = "cart_items"
        private const val KEY_RESTAURANT_NAME = "restaurant_name"
    }

    fun saveCart(items: List<CartItem>, restaurantName: String) {
        prefs.edit()
            .putString(KEY_CART_ITEMS, json.encodeToString(items))
            .putString(KEY_RESTAURANT_NAME, restaurantName)
            .apply()
    }

    fun loadCart(): Pair<List<CartItem>, String> {
        val itemsJson = prefs.getString(KEY_CART_ITEMS, null)
        val restaurantName = prefs.getString(KEY_RESTAURANT_NAME, "") ?: ""
        
        val items = if (itemsJson != null) {
            try {
                json.decodeFromString<List<CartItem>>(itemsJson)
            } catch (e: Exception) {
                emptyList()
            }
        } else {
            emptyList()
        }
        
        return items to restaurantName
    }

    fun clear() {
        prefs.edit().clear().apply()
    }
}
```

---

## 15. رسائل الخطأ (Arabic)

### strings.xml
```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">سفرة البيت</string>
    
    <!-- Auth -->
    <string name="login">تسجيل الدخول</string>
    <string name="register">إنشاء حساب</string>
    <string name="email">البريد الإلكتروني</string>
    <string name="password">كلمة المرور</string>
    <string name="phone">رقم الجوال</string>
    <string name="name">الاسم</string>
    <string name="city">المدينة</string>
    <string name="logout">تسجيل الخروج</string>
    <string name="browse_as_guest">تصفح كزائر</string>
    
    <!-- Errors -->
    <string name="error_session_expired">انتهت الجلسة. يرجى تسجيل الدخول مجدداً</string>
    <string name="error_forbidden">ليس لديك صلاحية الوصول</string>
    <string name="error_not_found">البيانات المطلوبة غير موجودة</string>
    <string name="error_server">خطأ في الخادم (%d)</string>
    <string name="error_network">تعذر الاتصال. تحقق من الإنترنت</string>
    <string name="error_decoding">خطأ في معالجة البيانات</string>
    <string name="error_email_invalid">يرجى إدخال بريد إلكتروني صحيح</string>
    <string name="error_password_empty">يرجى إدخال كلمة المرور</string>
    <string name="error_password_short">كلمة المرور يجب أن تكون 6 أحرف على الأقل</string>
    <string name="error_password_weak">كلمة المرور يجب أن تحتوي على أحرف وأرقام</string>
    <string name="error_name_empty">يرجى إدخال الاسم</string>
    <string name="error_name_short">الاسم يجب أن يكون حرفين على الأقل</string>
    <string name="error_email_not_found">البريد الإلكتروني غير مسجل</string>
    <string name="error_wrong_password">كلمة المرور غير صحيحة</string>
    <string name="error_email_exists">البريد الإلكتروني مسجل مسبقاً</string>
    <string name="error_too_many_attempts">محاولات كثيرة. حاول لاحقاً</string>
    
    <!-- Navigation -->
    <string name="home">الرئيسية</string>
    <string name="restaurants">المطاعم</string>
    <string name="cart">السلة</string>
    <string name="orders">الطلبات</string>
    <string name="profile">حسابي</string>
    <string name="notifications">الإشعارات</string>
    <string name="dashboard">لوحة التحكم</string>
    <string name="products">المنتجات</string>
    <string name="delivery">التوصيل</string>
    
    <!-- Order Status -->
    <string name="status_pending">بانتظار القبول</string>
    <string name="status_accepted">تم القبول</string>
    <string name="status_preparing">قيد التحضير</string>
    <string name="status_ready">جاهز</string>
    <string name="status_out_for_delivery">في الطريق</string>
    <string name="status_delivered">تم التوصيل</string>
    <string name="status_cancelled">ملغي</string>
    
    <!-- Actions -->
    <string name="confirm">تأكيد</string>
    <string name="cancel">إلغاء</string>
    <string name="ok">حسناً</string>
    <string name="save">حفظ</string>
    <string name="delete">حذف</string>
    <string name="edit">تعديل</string>
    <string name="add">إضافة</string>
    <string name="retry">إعادة المحاولة</string>
    
    <!-- Empty States -->
    <string name="no_restaurants">لا توجد مطاعم</string>
    <string name="no_orders">لا توجد طلبات</string>
    <string name="cart_empty">السلة فارغة</string>
    <string name="no_notifications">لا توجد إشعارات</string>
    
    <!-- Ramadan -->
    <string name="ramadan_kareem">رمضان كريم 🌙</string>
    <string name="ramadan_subtitle">أطيب الأكلات من أسر منتجة</string>
    
    <!-- Checkout -->
    <string name="checkout">إتمام الطلب</string>
    <string name="subtotal">سعر المنتجات</string>
    <string name="service_fee">رسوم الخدمة</string>
    <string name="vat">ضريبة القيمة المضافة</string>
    <string name="total">الإجمالي</string>
    <string name="delivery_address">عنوان التوصيل</string>
    <string name="payment_method">طريقة الدفع</string>
    <string name="cash_on_delivery">الدفع عند الاستلام</string>
    <string name="notes">ملاحظات (اختياري)</string>
    <string name="confirm_order">تأكيد الطلب</string>
    <string name="order_success">تم إنشاء الطلب بنجاح! 🎉</string>
</resources>
```

---

## 16. قواعد Firestore

```javascript
// firestore.rules (نفس الموجودة في iOS)
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return request.auth != null && request.auth.uid == userId;
    }

    function getUserRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }

    function isAdmin() {
      return isAuthenticated() && getUserRole() in ['admin', 'developer'];
    }

    function isStaff() {
      return isAuthenticated() && getUserRole() in ['admin', 'developer', 'supervisor', 'support', 'accountant', 'social_media'];
    }

    // Users
    match /users/{userId} {
      allow read: if isOwner(userId) || isStaff();
      allow create: if isOwner(userId);
      allow update: if isOwner(userId) || isAdmin();
      allow delete: if isAdmin();
    }

    // Restaurants
    match /restaurants/{restaurantId} {
      allow read: if true;
      allow create: if isOwner(restaurantId);
      allow update: if isOwner(restaurantId) || isAdmin();
      allow delete: if isAdmin();
    }

    // Menu Items
    match /menuItems/{itemId} {
      allow read: if true;
      allow create, update, delete: if isAuthenticated();
    }

    // Orders
    match /orders/{orderId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update: if isAuthenticated();
      allow delete: if isAdmin();
    }

    // Notifications
    match /notifications/{notifId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
      allow update, delete: if isAuthenticated();
    }
  }
}
```

---

## 17. Collections Reference

| Collection | وصف | الحقول الرئيسية |
|------------|-----|-----------------|
| `users` | المستخدمون | uid, email, name, phone, role, savedLocation |
| `restaurants` | المطاعم | id, name, ownerId, isOpen, latitude, longitude |
| `menuItems` | الأصناف | id, name, price, ownerId, available, category |
| `orders` | الطلبات | id, customerId, restaurantId, items[], status, total |
| `notifications` | الإشعارات | id, userId, title, body, read, type |
| `courierApplications` | طلبات السائقين | id, courierId, restaurantId, status |
| `chatMessages` | رسائل الدردشة | id, orderId, senderId, text |

---

## 18. ملاحظات RTL

### مهم جداً للعربية:
1. **الاتجاه الافتراضي**: `android:supportsRtl="true"` في Manifest
2. **Compose RTL**:
   ```kotlin
   CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
       // Your content
   }
   ```
3. **محاذاة النص**: دائماً `TextAlign.End` للنص العربي
4. **الأيقونات**: بعضها يحتاج انعكاس (arrows, chevrons)
5. **القوائم**: تبدأ من اليمين
6. **الأرقام**: تبقى LTR (لا تنعكس)

### Theme.kt
```kotlin
@Composable
fun SofraTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) darkColorScheme(...) else lightColorScheme(...)
    
    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = SofraM3Typography,
            content = content
        )
    }
}
```

---

## 19. ServiceFee.kt

```kotlin
package com.albayt.sofra.util

/**
 * رسوم الخدمة — نظام الرسوم الثابتة لكل صنف
 */
object ServiceFee {
    /** رسوم لكل صنف (ريال سعودي) */
    const val PER_ITEM = 1.75

    /** حصة المشرف لكل صنف */
    const val SUPERVISOR_SHARE = 1.00

    /** حصة المنصة مع مشرف */
    const val PLATFORM_SHARE_WITH_SUPERVISOR = 0.75

    /** حصة المنصة بدون مشرف */
    const val PLATFORM_SHARE_NO_SUPERVISOR = 1.75

    /** نسبة ضريبة القيمة المضافة */
    const val VAT_RATE = 0.15

    /** حساب إجمالي رسوم الخدمة */
    fun totalFee(itemCount: Int): Double = PER_ITEM * itemCount

    /** حساب رسوم المنصة */
    fun platformFee(itemCount: Int, hasSupervisor: Boolean): Double {
        val share = if (hasSupervisor) PLATFORM_SHARE_WITH_SUPERVISOR else PLATFORM_SHARE_NO_SUPERVISOR
        return share * itemCount
    }

    /** حساب رسوم المشرف */
    fun supervisorFee(itemCount: Int, hasSupervisor: Boolean): Double {
        return if (hasSupervisor) SUPERVISOR_SHARE * itemCount else 0.0
    }

    /** حساب ضريبة القيمة المضافة */
    fun calculateVAT(subtotal: Double): Double = subtotal * VAT_RATE

    /** سعر العميل النهائي */
    fun customerPrice(basePrice: Double): Double {
        val priceWithFee = basePrice + PER_ITEM
        val vat = priceWithFee * VAT_RATE
        return priceWithFee + vat
    }
}
```

---

## 20. ملخص التنفيذ

### أولويات التنفيذ:
1. ✅ إعداد المشروع + Gradle
2. ✅ Design System (ألوان، خطوط، مسافات)
3. ✅ Components أساسية
4. ✅ Networking Layer (REST API)
5. ✅ Auth Flow (تسجيل دخول/إنشاء حساب)
6. ⬜ Home Screen + Navigation
7. ⬜ Restaurants + Menu
8. ⬜ Cart + Checkout
9. ⬜ Orders
10. ⬜ Owner Features
11. ⬜ Courier Features
12. ⬜ Profile + Settings

### نصائح للمطور:
- 🔴 **لا تستخدم Firebase SDK** — REST فقط
- 🔴 **RTL أولاً** — كل شيء من اليمين لليسار
- 🔴 **نفس الألوان بالضبط** — استخدم Hex codes المذكورة
- 🔴 **نفس المسافات** — اتبع SofraSpacing
- 🔴 **رسائل بالعربي** — كل النصوص عربية

---

## الخلاصة

هذا الملف يحتوي على **كل** ما تحتاجه لإنشاء نسخة Android مطابقة لتطبيق iOS:
- ✅ كل الألوان (Hex codes)
- ✅ كل المكونات (Components)
- ✅ كل الشاشات
- ✅ كل الـ DTOs
- ✅ كل الـ API endpoints
- ✅ كل رسائل الخطأ
- ✅ نظام الأدوار
- ✅ قواعد Firestore

**ابدأ الآن!** 🚀
