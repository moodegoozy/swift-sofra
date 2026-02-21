// src/pages/CourierTermsPage.tsx
import React from "react";
import { Link } from "react-router-dom";

export default function CourierTermsPage() {
  return (
    <div className="min-h-screen bg-slate-200 text-gray-800 px-4 py-10 leading-relaxed">
      <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-2xl p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-emerald-600 mb-6 text-center">
          الشروط والأحكام - تسجيل المندوب 🚗
        </h1>
        <p className="text-center text-gray-600 mb-8">منصة سفرة البيت</p>

        {/* 1. التعريف */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3 border-r-4 border-emerald-500 pr-3">
            1. التعريف
          </h2>
          <p>
            منصة سفرة البيت هي منصة إلكترونية تعمل كوسيط تقني لربط الأسر المنتجة
            والمطاعم بالعملاء والمندوبين عبر التطبيق.
          </p>
        </section>

        {/* 2. طبيعة العلاقة */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3 border-r-4 border-emerald-500 pr-3">
            2. طبيعة العلاقة
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>
              يقر المندوب بأن علاقته مع منصة سفرة البيت هي{" "}
              <strong className="text-emerald-600">
                علاقة استخدام منصة تقنية فقط
              </strong>
              .
            </li>
            <li>
              لا تُعد هذه العلاقة:
              <ul className="list-disc list-inside mr-6 mt-2 space-y-1">
                <li>علاقة عمل</li>
                <li>أو توظيف</li>
                <li>أو كفالة</li>
              </ul>
            </li>
            <li>
              يعمل المندوب بصفته{" "}
              <strong className="text-emerald-600">مستقلاً</strong> ويتحمل كامل
              مسؤوليته النظامية.
            </li>
          </ul>
        </section>

        {/* 3. التسجيل */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3 border-r-4 border-emerald-500 pr-3">
            3. التسجيل
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>التسجيل في منصة سفرة البيت مجاني.</li>
            <li>لا تلتزم المنصة بتوفير عدد معين من الطلبات للمندوب.</li>
          </ul>
        </section>

        {/* 4. رسوم استخدام المنصة */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3 border-r-4 border-emerald-500 pr-3">
            4. رسوم استخدام المنصة
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>
              يوافق المندوب على دفع رسوم استخدام المنصة مقابل كل طلب يتم تنفيذه
              عبر التطبيق.
            </li>
            <li>
              يتم خصم:{" "}
              <strong className="text-emerald-600">2 إلى 3 ريال</strong> عن كل
              طلب
              <br />
              <span className="text-sm text-gray-500 mr-4">
                (يتم تحديدها من قبل المنصة حسب نوع الخدمة أو المنطقة)
              </span>
            </li>
            <li>يتم الخصم تلقائيًا من مستحقات المندوب داخل التطبيق.</li>
          </ul>
        </section>

        {/* 5. مسؤوليات المندوب */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3 border-r-4 border-emerald-500 pr-3">
            5. مسؤوليات المندوب
          </h2>
          <p className="mb-3">يتحمل المندوب كامل المسؤولية عن:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mr-4">
            <li>استلام الطلب وتسليمه للعميل</li>
            <li>الالتزام بالوقت المحدد</li>
            <li>حسن التعامل مع الأسرة والعميل</li>
            <li>سلامة الطلب أثناء التوصيل</li>
            <li>الالتزام بالأنظمة المرورية والنظامية المعمول بها</li>
          </ul>
        </section>

        {/* 6. حدود مسؤولية المنصة */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3 border-r-4 border-emerald-500 pr-3">
            6. حدود مسؤولية المنصة
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>تعمل منصة سفرة البيت كوسيط تقني فقط.</li>
            <li>
              لا تتحمل المنصة أي مسؤولية عن:
              <ul className="list-disc list-inside mr-6 mt-2 space-y-1">
                <li>تصرفات المندوب</li>
                <li>الحوادث المرورية</li>
                <li>التأخير في التوصيل</li>
                <li>فقدان أو تلف الطلب أثناء التوصيل</li>
                <li>أي مخالفات نظامية أو مرورية</li>
              </ul>
            </li>
            <li>
              يتحمل المندوب وحده أي مطالبات أو أضرار ناتجة عن تنفيذ الطلب.
            </li>
          </ul>
        </section>

        {/* 7. المستحقات المالية */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3 border-r-4 border-emerald-500 pr-3">
            7. المستحقات المالية
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>يتم احتساب مستحقات المندوب بناءً على الطلبات المنفذة.</li>
            <li>يحق للمنصة خصم رسوم الاستخدام قبل تحويل المستحقات.</li>
            <li>
              تحتفظ المنصة بحق تعديل آلية الاحتساب أو الرسوم مستقبلًا مع إشعار
              المندوب بذلك.
            </li>
          </ul>
        </section>

        {/* 8. إيقاف الحساب */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3 border-r-4 border-emerald-500 pr-3">
            8. إيقاف الحساب
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>
              يحق للمنصة إيقاف أو تعليق حساب المندوب في حال:
              <ul className="list-disc list-inside mr-6 mt-2 space-y-1">
                <li>تكرار الشكاوى</li>
                <li>سوء التعامل</li>
                <li>مخالفة الشروط</li>
                <li>الإضرار بسمعة المنصة</li>
              </ul>
            </li>
            <li>دون تحمل أي التزامات مالية مستقبلية.</li>
          </ul>
        </section>

        {/* 9. التعديل */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3 border-r-4 border-emerald-500 pr-3">
            9. التعديل
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>
              يحق للمنصة تعديل هذه الشروط عند الحاجة بما يتوافق مع الأنظمة.
            </li>
            <li>يتم إشعار المندوب بأي تحديثات.</li>
          </ul>
        </section>

        {/* 10. الموافقة */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3 border-r-4 border-emerald-500 pr-3">
            10. الموافقة
          </h2>
          <p className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-gray-800">
            بالتسجيل كمندوب في منصة سفرة البيت، فإنك تقر بقراءة وفهم والموافقة
            على جميع الشروط والأحكام أعلاه.
          </p>
        </section>

        {/* الموافقة النهائية */}
        <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-4 mt-8 text-center">
          <p className="text-emerald-800 font-medium">
            ☑️ أوافق على الشروط والأحكام وأتحمل كامل المسؤولية كمندوب مستقل
          </p>
        </div>

        <p className="mt-6 text-sm text-gray-500 text-center">
          تم آخر تحديث لهذه الشروط بتاريخ{" "}
          {new Date().toLocaleDateString("ar-SA")}
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/register"
            className="text-white bg-emerald-500 hover:bg-emerald-600 px-6 py-3 rounded-lg inline-block transition-colors text-center font-bold"
          >
            ✅ موافق - العودة للتسجيل
          </Link>
          <Link
            to="/"
            className="text-emerald-600 bg-emerald-100 hover:bg-emerald-200 px-6 py-3 rounded-lg inline-block transition-colors text-center"
          >
            الرجوع إلى الصفحة الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
