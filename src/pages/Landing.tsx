// src/pages/Landing.tsx
// 🏠 الصفحة الرئيسية - تصميم بسيط ومحسّن للجوال
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth";
import { db } from "@/firebase";
import { collection, getDocs, query, where, doc, getDoc } from "firebase/firestore";
import { calculateDistance, MAX_DELIVERY_DISTANCE } from "@/utils/distance";
import { SpecialOffer, MenuItem } from "@/types";
import { OptimizedImage, OptimizedAvatar, ProductImage } from "@/components/OptimizedImage";
import { 
  Store, ShoppingCart, Package, User, Truck, Shield, Code2, 
  ChefHat, LogIn, UserPlus, Loader2, Star, Heart, ArrowLeft, 
  Utensils, MapPin, Flame, Gift, Percent, Tag, Building2,
  Clock, Phone, Navigation, Users, Megaphone
} from "lucide-react";

type Restaurant = {
  id: string
  name: string
  logoUrl?: string
  city?: string
  geoLocation?: { lat: number; lng: number }
  isVerified?: boolean
  packageType?: 'free' | 'premium'
  averageRating?: number
  totalOrders?: number
  isOpen?: boolean
}

type RestaurantWithDistance = Restaurant & { distance?: number }

export const Landing: React.FC = () => {
  const { user, role, loading, logout, userLocation } = useAuth();
  const navigate = useNavigate();
  
  // البيانات
  const [offers, setOffers] = useState<SpecialOffer[]>([]);
  const [restaurants, setRestaurants] = useState<RestaurantWithDistance[]>([]);
  const [topItems, setTopItems] = useState<(MenuItem & { restaurantName?: string })[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // جلب العروض والأسر للعميل
  useEffect(() => {
    if (loading) return;
    
    const loadData = async () => {
      try {
        // 1. جلب الأسر المنتجة
        const restaurantsSnap = await getDocs(collection(db, 'restaurants'));
        const allRestaurants = restaurantsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Restaurant));
        
        // 2. جلب المنتجات لفلترة الأسر المكتملة
        const menuSnap = await getDocs(collection(db, 'menuItems'));
        const menuItems = menuSnap.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem));
        
        // تجميع المنتجات حسب الأسرة
        const menuByRestaurant = new Map<string, number>();
        menuItems.forEach(item => {
          if (item.available !== false) {
            menuByRestaurant.set(item.ownerId, (menuByRestaurant.get(item.ownerId) || 0) + 1);
          }
        });
        
        // فلترة الأسر المكتملة (شعار + موقع + منتجات)
        let filteredRestaurants = allRestaurants.filter(r => 
          !!r.logoUrl && !!r.geoLocation && (menuByRestaurant.get(r.id) || 0) > 0
        );
        
        // حساب المسافة وفلترة القريبة
        if (userLocation) {
          filteredRestaurants = filteredRestaurants
            .map(r => ({
              ...r,
              distance: r.geoLocation ? calculateDistance(userLocation, r.geoLocation) : undefined
            }))
            .filter(r => r.distance !== undefined && r.distance <= MAX_DELIVERY_DISTANCE)
            .sort((a, b) => {
              // Premium أولاً
              if (a.packageType === 'premium' && b.packageType !== 'premium') return -1;
              if (b.packageType === 'premium' && a.packageType !== 'premium') return 1;
              // ثم حسب المسافة
              return (a.distance || 999) - (b.distance || 999);
            });
        }
        
        setRestaurants(filteredRestaurants.slice(0, 6)); // أول 6 أسر
        
        // 3. جلب العروض النشطة
        const offersQuery = query(collection(db, 'offers'), where('isActive', '==', true));
        const offersSnap = await getDocs(offersQuery);
        const now = new Date();
        const activeOffers = offersSnap.docs
          .map(d => ({ id: d.id, ...d.data(), expiresAt: d.data().expiresAt?.toDate?.() } as SpecialOffer))
          .filter(o => !o.expiresAt || new Date(o.expiresAt) > now)
          .slice(0, 4);
        setOffers(activeOffers);
        
        // 4. المنتجات الأكثر طلباً
        const topMenuItems = menuItems
          .filter(item => item.available !== false && (item.orderCount || 0) > 0)
          .sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0))
          .slice(0, 4)
          .map(item => {
            const restaurant = allRestaurants.find(r => r.id === item.ownerId);
            return { ...item, restaurantName: restaurant?.name };
          });
        setTopItems(topMenuItems);
        
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setDataLoading(false);
      }
    };
    
    loadData();
  }, [loading, userLocation]);

  // شاشة التحميل
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200">
        <div className="relative">
          <div className="w-20 h-20 mb-4 bg-gradient-to-br from-sky-400 to-sky-600 rounded-3xl flex items-center justify-center shadow-xl shadow-sky-500/30 animate-pulse">
            <span className="text-4xl">🍽️</span>
          </div>
        </div>
        <Loader2 className="w-6 h-6 text-sky-500 animate-spin mb-2" />
        <p className="text-sky-600 font-semibold">جارِ التحميل...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 pb-24">
      {/* الخلفية */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-sky-200/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-sky-300/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="relative px-4 py-6 max-w-lg mx-auto">
        
        {/* الشعار والترحيب */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 mx-auto mb-3 bg-gradient-to-br from-sky-400 to-sky-600 rounded-3xl flex items-center justify-center shadow-xl shadow-sky-500/30">
            <span className="text-4xl">🍽️</span>
          </div>
          <h1 className="text-2xl font-black text-sky-700">سفرة البيت</h1>
          <p className="text-sky-600/70 text-sm">أشهى الأكلات البيتية توصلك 🚗</p>
          
          {user && (
            <div className="mt-3 inline-flex items-center gap-2 bg-white/80 px-4 py-2 rounded-full shadow-sm">
              <span className="text-sky-600">أهلاً</span>
              <span className="font-bold text-gray-800">{user.displayName || user.email?.split('@')[0]}</span>
              <span>👋</span>
            </div>
          )}
        </div>

        {/* ========== قسم الزائر ========== */}
        {!user && (
          <div className="space-y-4">
            {/* زر تصفح المتاجر الرئيسي */}
            <Link
              to="/restaurants"
              className="block bg-gradient-to-r from-sky-500 to-sky-600 rounded-2xl p-5 shadow-xl shadow-sky-500/30 active:scale-[0.98] transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                    <span className="text-3xl">🏪</span>
                  </div>
                  <div className="text-white text-right">
                    <h2 className="text-xl font-bold">تصفح الأسر المنتجة</h2>
                    <p className="text-white/80 text-sm">اكتشف أشهى الأكلات</p>
                  </div>
                </div>
                <ArrowLeft className="w-6 h-6 text-white/80" />
              </div>
            </Link>

            {/* أزرار تسجيل الدخول */}
            <div className="grid grid-cols-2 gap-3">
              <Link to="/login" className="bg-white rounded-xl p-4 shadow-md text-center active:scale-95 transition-all">
                <span className="text-2xl block mb-2">🔑</span>
                <span className="font-bold text-gray-800 text-sm">دخول</span>
              </Link>
              <Link to="/register" className="bg-white rounded-xl p-4 shadow-md text-center active:scale-95 transition-all">
                <span className="text-2xl block mb-2">✨</span>
                <span className="font-bold text-gray-800 text-sm">تسجيل جديد</span>
              </Link>
            </div>
          </div>
        )}

        {/* ========== قسم العميل ========== */}
        {role === "customer" && (
          <div className="space-y-5">
            {/* زر الطلب الرئيسي */}
            <Link
              to="/restaurants"
              className="block bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-6 shadow-xl shadow-emerald-500/30 active:scale-[0.98] transition-all"
            >
              <div className="text-center">
                <span className="text-5xl block mb-2">🍴</span>
                <h2 className="text-2xl font-black text-white">اطلب الآن!</h2>
                <p className="text-white/80 text-sm">من أشهى الأسر المنتجة القريبة منك</p>
              </div>
            </Link>

            {/* أزرار سريعة */}
            <div className="grid grid-cols-3 gap-3">
              <Link to="/cart" className="bg-white rounded-xl p-3 shadow-md text-center active:scale-95 transition-all">
                <span className="text-2xl block mb-1">🛒</span>
                <span className="text-xs font-bold text-gray-700">السلة</span>
              </Link>
              <Link to="/orders" className="bg-white rounded-xl p-3 shadow-md text-center active:scale-95 transition-all">
                <span className="text-2xl block mb-1">📦</span>
                <span className="text-xs font-bold text-gray-700">طلباتي</span>
              </Link>
              <Link to="/profile" className="bg-white rounded-xl p-3 shadow-md text-center active:scale-95 transition-all">
                <span className="text-2xl block mb-1">👤</span>
                <span className="text-xs font-bold text-gray-700">حسابي</span>
              </Link>
            </div>
          </div>
        )}

        {/* ========== العروض الخاصة ========== */}
        {offers.length > 0 && (!user || role === 'customer') && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-pink-500" />
                <h2 className="text-lg font-bold text-sky-700">🎁 عروض الأسر</h2>
              </div>
              <Link to="/restaurants" className="text-sky-500 text-sm font-semibold">
                المزيد ←
              </Link>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {offers.map(offer => {
                const bgColor = offer.offerType === 'percent_discount' ? 'from-amber-400 to-orange-500' :
                               offer.offerType === 'fixed_discount' ? 'from-green-400 to-emerald-500' :
                               offer.offerType === 'bundle_meal' ? 'from-purple-400 to-violet-500' :
                               'from-pink-400 to-rose-500';
                
                return (
                  <Link
                    key={offer.id}
                    to={`/menu?restaurant=${offer.ownerId}`}
                    className="bg-white rounded-xl shadow-md overflow-hidden active:scale-95 transition-all"
                  >
                    <div className={`bg-gradient-to-r ${bgColor} p-3 text-white`}>
                      <p className="font-bold text-sm line-clamp-1">{offer.title}</p>
                      <p className="text-xl font-black">
                        {offer.offerType === 'percent_discount' && `${offer.discountPercent}% خصم`}
                        {offer.offerType === 'fixed_discount' && `وفّر ${offer.discountAmount} ر.س`}
                        {offer.offerType === 'bundle_meal' && `${offer.bundlePrice} ر.س`}
                        {offer.offerType === 'buy_x_get_y' && `${offer.buyQuantity}+${offer.getQuantity} مجاناً`}
                      </p>
                    </div>
                    <div className="p-2 flex items-center gap-2">
                      <OptimizedAvatar 
                        src={offer.restaurantLogo} 
                        alt={offer.restaurantName || 'أسرة'} 
                        size="sm" 
                        fallbackText={offer.restaurantName}
                      />
                      <span className="text-xs font-semibold text-gray-700 truncate">{offer.restaurantName || 'أسرة منتجة'}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ========== الأسر المنتجة القريبة ========== */}
        {restaurants.length > 0 && (!user || role === 'customer') && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Store className="w-5 h-5 text-sky-500" />
                <h2 className="text-lg font-bold text-sky-700">🏠 الأسر القريبة منك</h2>
              </div>
              <Link to="/restaurants" className="text-sky-500 text-sm font-semibold">
                عرض الكل ←
              </Link>
            </div>
            
            <div className="space-y-3">
              {restaurants.map(r => (
                <Link
                  key={r.id}
                  to={`/menu?restaurant=${r.id}`}
                  className="flex items-center gap-3 bg-white rounded-xl p-3 shadow-md active:scale-[0.98] transition-all"
                >
                  {/* شعار الأسرة */}
                  <OptimizedImage
                    src={r.logoUrl}
                    alt={r.name}
                    className="w-14 h-14 rounded-xl"
                    fallback={
                      <div className="w-14 h-14 rounded-xl bg-sky-100 flex items-center justify-center">
                        <Store className="w-7 h-7 text-sky-400" />
                      </div>
                    }
                  />
                  
                  {/* المعلومات */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-800 truncate">{r.name}</h3>
                      {r.packageType === 'premium' && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">⭐</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                      {r.distance !== undefined && (
                        <span className="flex items-center gap-1">
                          <Navigation className="w-3 h-3" />
                          {r.distance.toFixed(1)} كم
                        </span>
                      )}
                      {r.averageRating && (
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          {r.averageRating.toFixed(1)}
                        </span>
                      )}
                      {r.city && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {r.city}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <ArrowLeft className="w-5 h-5 text-gray-400" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ========== الأكثر طلباً ========== */}
        {topItems.length > 0 && (!user || role === 'customer') && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-5 h-5 text-orange-500" />
              <h2 className="text-lg font-bold text-sky-700">🔥 الأكثر طلباً</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {topItems.map(item => (
                <Link
                  key={item.id}
                  to={`/menu?restaurant=${item.ownerId}`}
                  className="bg-white rounded-xl shadow-md overflow-hidden active:scale-95 transition-all"
                >
                  <div className="relative aspect-square bg-sky-50">
                    <ProductImage
                      src={item.imageUrl}
                      alt={item.name}
                      className="rounded-none"
                    />
                    <span className="absolute top-2 right-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Flame className="w-3 h-3" />
                      {item.orderCount}+
                    </span>
                  </div>
                  <div className="p-2">
                    <h3 className="font-bold text-sm text-gray-800 line-clamp-1">{item.name}</h3>
                    <p className="text-xs text-gray-500 line-clamp-1">{item.restaurantName}</p>
                    <p className="font-bold text-sky-600 text-sm mt-1">{item.price} ر.س</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ========== أقسام صاحب المطعم ========== */}
        {role === "owner" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Link to="/owner" className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 shadow-lg text-white active:scale-95 transition-all">
                <span className="text-2xl block mb-2">📊</span>
                <h3 className="font-bold text-sm">لوحة التحكم</h3>
              </Link>
              <Link to="/owner/orders" className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 shadow-lg text-white active:scale-95 transition-all">
                <span className="text-2xl block mb-2">📋</span>
                <h3 className="font-bold text-sm">الطلبات</h3>
              </Link>
              <Link to="/owner/menu" className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl p-4 shadow-lg text-white active:scale-95 transition-all">
                <span className="text-2xl block mb-2">🍽️</span>
                <h3 className="font-bold text-sm">القائمة</h3>
              </Link>
              <Link to="/owner/edit" className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl p-4 shadow-lg text-white active:scale-95 transition-all">
                <span className="text-2xl block mb-2">⚙️</span>
                <h3 className="font-bold text-sm">الإعدادات</h3>
              </Link>
            </div>
            <button onClick={logout} className="w-full py-3 rounded-xl bg-white/70 text-gray-600 font-medium active:scale-[0.98] transition-all">
              🚪 تسجيل خروج
            </button>
          </div>
        )}

        {/* ========== أقسام المندوب ========== */}
        {role === "courier" && (
          <div className="space-y-3">
            <Link to="/courier" className="block bg-gradient-to-r from-sky-500 to-blue-600 rounded-xl p-5 shadow-lg text-white active:scale-[0.98] transition-all">
              <div className="flex items-center gap-3">
                <span className="text-4xl">🚗</span>
                <div>
                  <h2 className="text-xl font-bold">طلبات التوصيل</h2>
                  <p className="text-white/80 text-sm">استلم واوصل طلبات</p>
                </div>
              </div>
            </Link>
            <div className="grid grid-cols-2 gap-3">
              <Link to="/courier/wallet" className="bg-white rounded-xl p-4 shadow-md text-center active:scale-95 transition-all">
                <span className="text-2xl block mb-1">💰</span>
                <span className="font-bold text-gray-700 text-sm">محفظتي</span>
              </Link>
              <Link to="/profile" className="bg-white rounded-xl p-4 shadow-md text-center active:scale-95 transition-all">
                <span className="text-2xl block mb-1">👤</span>
                <span className="font-bold text-gray-700 text-sm">حسابي</span>
              </Link>
            </div>
            <button onClick={logout} className="w-full py-3 rounded-xl bg-white/70 text-gray-600 font-medium active:scale-[0.98] transition-all">
              🚪 تسجيل خروج
            </button>
          </div>
        )}

        {/* ========== أقسام الأدمن ========== */}
        {role === "admin" && (
          <div className="space-y-3">
            <Link to="/admin" className="block bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl p-5 shadow-lg text-white active:scale-[0.98] transition-all">
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8" />
                <div>
                  <h2 className="text-xl font-bold">لوحة الإدارة</h2>
                  <p className="text-white/80 text-sm">إدارة التطبيق</p>
                </div>
              </div>
            </Link>
            <button onClick={logout} className="w-full py-3 rounded-xl bg-white/70 text-gray-600 font-medium active:scale-[0.98] transition-all">
              🚪 تسجيل خروج
            </button>
          </div>
        )}

        {/* ========== أقسام المطور ========== */}
        {role === "developer" && (
          <div className="space-y-3">
            <Link to="/developer" className="block bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-5 shadow-lg text-white active:scale-[0.98] transition-all">
              <div className="flex items-center gap-3">
                <Code2 className="w-8 h-8" />
                <div>
                  <h2 className="text-xl font-bold">لوحة المطور</h2>
                  <p className="text-white/60 text-sm">تحكم كامل</p>
                </div>
              </div>
            </Link>
            <button onClick={logout} className="w-full py-3 rounded-xl bg-white/70 text-gray-600 font-medium active:scale-[0.98] transition-all">
              🚪 تسجيل خروج
            </button>
          </div>
        )}

        {/* ========== أقسام المشرفة ========== */}
        {role === "supervisor" && (
          <div className="space-y-3">
            <Link to="/supervisor" className="block bg-gradient-to-r from-amber-500 to-amber-700 rounded-xl p-5 shadow-lg text-white active:scale-[0.98] transition-all">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8" />
                <div>
                  <h2 className="text-xl font-bold">لوحة المشرفة</h2>
                  <p className="text-white/80 text-sm">إدارة المطاعم والطلبات</p>
                </div>
              </div>
            </Link>
            <button onClick={logout} className="w-full py-3 rounded-xl bg-white/70 text-gray-600 font-medium active:scale-[0.98] transition-all">
              🚪 تسجيل خروج
            </button>
          </div>
        )}

        {/* ========== أقسام السوشيال ميديا ========== */}
        {role === "social_media" && (
          <div className="space-y-3">
            <Link to="/social-media" className="block bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-5 shadow-lg text-white active:scale-[0.98] transition-all">
              <div className="flex items-center gap-3">
                <Megaphone className="w-8 h-8" />
                <div>
                  <h2 className="text-xl font-bold">لوحة السوشيال ميديا</h2>
                  <p className="text-white/80 text-sm">إدارة المحتوى والتسويق</p>
                </div>
              </div>
            </Link>
            <button onClick={logout} className="w-full py-3 rounded-xl bg-white/70 text-gray-600 font-medium active:scale-[0.98] transition-all">
              🚪 تسجيل خروج
            </button>
          </div>
        )}

        {/* الفوتر */}
        <div className="mt-8 text-center">
          <p className="text-sky-500/50 text-xs">صُنع بـ ❤️ في السعودية</p>
        </div>
      </div>
    </div>
  );
};

export default Landing;
