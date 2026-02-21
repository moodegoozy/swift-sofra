import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "@/firebase";
import { deleteUser } from "firebase/auth";
import { doc, deleteDoc } from "firebase/firestore";
import { useAuth } from "@/auth";
import { Heart, Shield, Trash2, Code2, AlertTriangle } from "lucide-react";
import { useDialog } from "@/components/ui/ConfirmDialog";

export const Footer: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dialog = useDialog();

  const handleDeleteAccount = async () => {
    if (!user) return;

    const confirmDelete = await dialog.confirm(
      'هذا الإجراء لا يمكن التراجع عنه. سيتم حذف جميع بياناتك نهائيًا.',
      { title: 'حذف الحساب نهائيًا؟', dangerous: true, confirmText: 'نعم، احذف حسابي', cancelText: 'إلغاء' }
    );
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "users", user.uid));
      await deleteUser(auth.currentUser!);

      dialog.success('تم حذف حسابك بنجاح');
      navigate("/account-deleted");
    } catch (error: any) {
      console.error("Error deleting account:", error);
      dialog.error('حدث خطأ أثناء حذف الحساب. يرجى المحاولة لاحقًا.');
    }
  };

  return (
    <footer className="bg-gradient-to-b from-sky-600 to-sky-700 text-white text-center py-8 sm:py-10 mt-12 sm:mt-16 shadow-[0_-10px_40px_rgba(14,165,233,0.2)]">
      <div className="max-w-4xl mx-auto flex flex-col items-center gap-4 sm:gap-6 px-4">
        
        {/* الشعار */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-2xl sm:text-3xl">🍗</span>
          </div>
          <span className="text-xl sm:text-2xl font-black">سفرة البيت</span>
        </div>

        {/* النص الرئيسي */}
        <p className="text-xs sm:text-sm md:text-base font-medium text-sky-100 flex items-center gap-2">
          صنع بـ <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-red-400 fill-red-400" /> في السعودية © {new Date().getFullYear()}
        </p>

        {/* الأزرار */}
        <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-3">
          {/* سياسة الخصوصية */}
          <Link
            to="/privacy-policy"
            className="flex items-center gap-1.5 sm:gap-2 bg-white/20 backdrop-blur-sm text-white font-semibold px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl hover:bg-white/30 hover:scale-105 transition-all duration-300 text-xs sm:text-sm"
          >
            <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
            الخصوصية
          </Link>

          {/* الإبلاغ عن مشكلة */}
          {user && (
            <Link
              to="/report-problem"
              className="flex items-center gap-1.5 sm:gap-2 bg-amber-500/80 backdrop-blur-sm text-white font-semibold px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl hover:bg-amber-500 hover:scale-105 transition-all duration-300 text-xs sm:text-sm"
            >
              <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" />
              إبلاغ عن مشكلة
            </Link>
          )}

          {/* المطور */}
          <Link
            to="/developer"
            className="flex items-center gap-1.5 sm:gap-2 bg-white/20 backdrop-blur-sm text-white font-semibold px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl hover:bg-white/30 hover:scale-105 transition-all duration-300 text-xs sm:text-sm"
          >
            <Code2 className="w-3 h-3 sm:w-4 sm:h-4" />
            المطور
          </Link>

          {/* حذف الحساب */}
          {user && (
            <button
              onClick={handleDeleteAccount}
              className="flex items-center gap-1.5 sm:gap-2 bg-red-500/80 backdrop-blur-sm text-white font-semibold px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl hover:bg-red-500 hover:scale-105 transition-all duration-300 text-xs sm:text-sm"
            >
              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
              حذف حسابي
            </button>
          )}
        </div>

        {/* خط فاصل */}
        <div className="w-24 sm:w-32 h-1 bg-white/20 rounded-full"></div>

        {/* حقوق النشر */}
        <p className="text-[10px] sm:text-xs text-sky-200">
          جميع الحقوق محفوظة لـ سفرة البيت
        </p>
      </div>
    </footer>
  );
};
