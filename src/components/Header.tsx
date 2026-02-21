// src/components/Header.tsx
import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth";
import { Menu, X, Home, ShoppingCart, Package, Store, Truck, Shield, Code2, ArrowRight, User, Bell, Headphones } from "lucide-react";
import { db } from "@/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

const NavLink: React.FC<{ to: string; label: string; icon?: React.ReactNode; onClick?: () => void }> = ({
  to,
  label,
  icon,
  onClick,
}) => {
  const { pathname } = useLocation();
  const active = pathname === to;
  return (
    <Link
      to={to}
      onClick={onClick}
      className={
        "flex items-center gap-2 px-4 py-3 sm:py-2.5 rounded-2xl text-sm font-bold transition-all duration-300 " +
        (active
          ? "bg-white text-sky-600 shadow-lg shadow-sky-200/50 scale-105"
          : "text-white/90 hover:text-white hover:bg-white/20")
      }
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
};

export const Header: React.FC = () => {
  const { user, role, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();

  // هل نحن في الصفحة الرئيسية؟
  const isHome = location.pathname === '/';

  // إغلاق القائمة عند تغيير الصفحة
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // منع التمرير عند فتح القائمة
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // مراقبة عدد الإشعارات غير المقروءة
  useEffect(() => {
    if (!user?.uid) {
      setUnreadCount(0);
      return;
    }

    const q = query(
      collection(db, 'notifications'),
      where('recipientId', '==', user.uid),
      where('read', '==', false)
    );

    const unsub = onSnapshot(q, (snap) => {
      setUnreadCount(snap.size);
    }, (error) => {
      console.warn('Notifications listener error:', error);
      setUnreadCount(0);
    });

    return () => unsub();
  }, [user?.uid]); // ✅ استخدم user.uid بدلاً من user object

  return (
    <header className="bg-gradient-to-r from-sky-600 via-sky-500 to-sky-600 shadow-xl shadow-sky-200/30 relative z-30">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
        {/* زر الرجوع + شعار */}
        <div className="flex items-center gap-2">
          {/* زر الرجوع - يظهر فقط إذا لم نكن في الصفحة الرئيسية */}
          {!isHome && (
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 sm:w-10 sm:h-10 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center text-white transition-all"
              aria-label="رجوع"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
          
          <button
            onClick={() => window.location.href = '/'}
            className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 sm:gap-3 hover:scale-105 transition-transform drop-shadow-lg"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-xl sm:text-2xl">🍗</span>
            </div>
            <span className="text-lg sm:text-2xl">سفرة البيت</span>
          </button>
        </div>

        {/* أزرار الديسكتوب */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2">
          <NavLink to="/restaurants" label="المطاعم" icon={<Store className="w-4 h-4" />} />

          {/* 👤 العميل فقط */}
          {role === "customer" && (
            <>
              <NavLink to="/cart" label="🛒 السلة" />
              <NavLink to="/orders" label="طلباتي" />
              <NavLink to="/profile" label="بياناتي" icon={<User className="w-4 h-4" />} />
            </>
          )}

          {/* 👨‍🍳 صاحب المطعم */}
          {role === "owner" && (
            <>
              <NavLink to="/owner" label="لوحة المطعم" />
              <NavLink to="/owner/orders" label="طلبات المطعم" />
              <NavLink to="/owner/courier-requests" label="المندوبين" />
            </>
          )}

          {/* 🚚 المندوب */}
          {role === "courier" && (
            <>
              <NavLink to="/courier" label="واجهة المندوب" />
              <NavLink to="/courier/hiring" label="التوظيف" />
            </>
          )}

          {/* 🔐 الإدمن */}
          {role === "admin" && (
            <NavLink to="/admin" label="لوحة الإدارة" />
          )}

          {/* 👨‍💻 المطور */}
          {role === "developer" && (
            <NavLink to="/developer" label="لوحة المطور" />
          )}

          {/* 🔔 زر الإشعارات */}
          {user && (
            <Link
              to="/notifications"
              className="relative p-2.5 rounded-xl bg-white/20 hover:bg-white/30 transition text-white"
              title="الإشعارات"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          )}

          {/* 🎧 زر الدعم الفني */}
          {user && (
            <Link
              to="/support"
              className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 transition text-white"
              title="الدعم الفني / شكوى"
            >
              <Headphones className="w-5 h-5" />
            </Link>
          )}

          {/* دخول/خروج */}
          {user ? (
            <button
              onClick={logout}
              className="px-5 py-2.5 rounded-2xl text-sm font-bold text-sky-600 bg-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              خروج
            </button>
          ) : (
            <NavLink to="/login" label="دخول" />
          )}
        </nav>

        {/* زر المينيو للجوال */}
        <button
          className="md:hidden p-2.5 rounded-2xl bg-white text-sky-600 shadow-lg hover:shadow-xl transition"
          onClick={() => setOpen(!open)}
        >
          {open ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* overlay خلفية */}
      {open && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* قائمة الجوال المنزلقة */}
      <div className={`
        fixed top-0 right-0 h-full w-72 max-w-[80vw] z-50 md:hidden transform transition-transform duration-300 ease-out shadow-2xl
        ${open ? 'translate-x-0' : 'translate-x-full'}
      `}
      style={{ background: 'linear-gradient(to bottom, #0ea5e9, #0369a1)' }}
      >
        {/* رأس القائمة */}
        <div className="flex items-center justify-between p-4 border-b border-white/20">
          <span className="text-white font-bold text-lg">القائمة</span>
          <button 
            onClick={() => setOpen(false)}
            className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* روابط القائمة */}
        <div className="p-4 flex flex-col gap-2 overflow-y-auto max-h-[calc(100vh-80px)]">
          <NavLink
            to="/restaurants"
            label="المطاعم"
            icon={<Store className="w-5 h-5" />}
            onClick={() => setOpen(false)}
          />

          {/* 👤 العميل فقط */}
          {role === "customer" && (
            <>
              <NavLink
                to="/cart"
                label="السلة"
                icon={<ShoppingCart className="w-5 h-5" />}
                onClick={() => setOpen(false)}
              />
              <NavLink
                to="/orders"
                label="طلباتي"
                icon={<Package className="w-5 h-5" />}
                onClick={() => setOpen(false)}
              />
              <NavLink
                to="/profile"
                label="بياناتي"
                icon={<User className="w-5 h-5" />}
                onClick={() => setOpen(false)}
              />
            </>
          )}

          {/* 👨‍🍳 صاحب المطعم */}
          {role === "owner" && (
            <>
              <NavLink
                to="/owner"
                label="لوحة المطعم"
                icon={<Home className="w-5 h-5" />}
                onClick={() => setOpen(false)}
              />
              <NavLink
                to="/owner/orders"
                label="طلبات المطعم"
                icon={<Package className="w-5 h-5" />}
                onClick={() => setOpen(false)}
              />
              <NavLink
                to="/owner/courier-requests"
                label="المندوبين"
                icon={<Truck className="w-5 h-5" />}
                onClick={() => setOpen(false)}
              />
            </>
          )}

          {/* 🚚 المندوب */}
          {role === "courier" && (
            <>
              <NavLink
                to="/courier"
                label="واجهة المندوب"
                icon={<Truck className="w-5 h-5" />}
                onClick={() => setOpen(false)}
              />
              <NavLink
                to="/courier/hiring"
                label="التوظيف"
                icon={<Package className="w-5 h-5" />}
                onClick={() => setOpen(false)}
              />
            </>
          )}

          {/* 🔐 الإدمن */}
          {role === "admin" && (
            <NavLink 
              to="/admin" 
              label="لوحة الإدارة" 
              icon={<Shield className="w-5 h-5" />}
              onClick={() => setOpen(false)} 
            />
          )}

          {/* 👨‍💻 المطور */}
          {role === "developer" && (
            <NavLink 
              to="/developer" 
              label="لوحة المطور" 
              icon={<Code2 className="w-5 h-5" />}
              onClick={() => setOpen(false)} 
            />
          )}

          {/* 🔔 الإشعارات */}
          {user && (
            <NavLink 
              to="/notifications" 
              label={`الإشعارات ${unreadCount > 0 ? `(${unreadCount})` : ''}`}
              icon={<Bell className="w-5 h-5" />}
              onClick={() => setOpen(false)} 
            />
          )}

          {/* 🎧 الدعم الفني */}
          {user && (
            <NavLink 
              to="/support" 
              label="الدعم الفني / شكوى"
              icon={<Headphones className="w-5 h-5" />}
              onClick={() => setOpen(false)} 
            />
          )}

          {/* فاصل */}
          <div className="h-px bg-white/20 my-2"></div>

          {user ? (
            <button
              onClick={() => {
                logout();
                setOpen(false);
              }}
              className="w-full mt-2 px-5 py-3 rounded-2xl text-sm font-bold text-sky-600 bg-white shadow-lg hover:scale-105 transition-all duration-300 text-center"
            >
              🚪 تسجيل الخروج
            </button>
          ) : (
            <NavLink
              to="/login"
              label="تسجيل الدخول"
              icon={<Home className="w-5 h-5" />}
              onClick={() => setOpen(false)}
            />
          )}
        </div>
      </div>
    </header>
  );
};
