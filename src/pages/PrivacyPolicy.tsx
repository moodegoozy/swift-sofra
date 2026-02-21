// src/pages/PrivacyPolicy.tsx
import React from "react";
import { Link } from "react-router-dom";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-slate-200 text-gray-800 px-4 py-10 leading-relaxed">
      <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-2xl p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-sky-600 mb-4 text-center">
          سياسة الخصوصية وإخلاء المسؤولية
        </h1>
        <p className="text-center text-gray-600 mb-8">
          🏠 منصة سفرة البيت
        </p>

        {/* مقدمة */}
        <section className="mb-6">
          <p className="bg-sky-50 border border-sky-200 rounded-lg p-4 text-gray-800">
            نحن في تطبيق <strong>سفرة البيت</strong> نحترم خصوصية المستخدمين ونسعى
            لتقديم منصة آمنة وسهلة تربط بين مقدمي الخدمات الغذائية والعملاء.
          </p>
        </section>

        {/* 1. طبيعة دور التطبيق */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3 border-r-4 border-sky-500 pr-3">
            1. طبيعة دور التطبيق
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>
              تطبيق سفرة البيت يعمل كـ<strong className="text-sky-600">منصة وسيطة فقط</strong> لربط
              العملاء بالأسر المنتجة والمطاعم ومقدمي خدمات التوصيل.
            </li>
            <li>
              التطبيق <strong className="text-red-600">لا يقوم</strong> بإعداد الطعام، ولا بتغليفه،
              ولا بتخزينه، ولا بتوصيله بشكل مباشر.
            </li>
          </ul>
        </section>

        {/* 2. المسؤولية عن جودة الطعام */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3 border-r-4 border-red-500 pr-3">
            2. المسؤولية عن جودة الطعام
          </h2>
          <p className="mb-3 text-gray-700">
            جميع الأطعمة والمشروبات المعروضة داخل التطبيق يتم إعدادها وتجهيزها من
            قبل <strong>مقدمي الخدمة أنفسهم</strong>. وعليه:
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="font-bold text-red-700 mb-3">التطبيق غير مسؤول عن:</p>
            <ul className="list-disc list-inside space-y-2 text-red-700 mr-4">
              <li>جودة الطعام</li>
              <li>سلامة المكونات</li>
              <li>سوء التخزين</li>
              <li>التسمم الغذائي</li>
              <li>أي أضرار صحية أو حساسية غذائية</li>
              <li>النظافة أو التغليف</li>
            </ul>
            <p className="mt-4 font-bold text-gray-800 bg-amber-100 p-2 rounded">
              ⚠️ المسؤولية الكاملة تقع على مقدم الخدمة (الأسرة / المطعم)
            </p>
          </div>
        </section>

        {/* 3. الحساسية الغذائية */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3 border-r-4 border-amber-500 pr-3">
            3. الحساسية الغذائية والتغذية
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>
              يتحمل <strong>العميل</strong> مسؤولية التحقق من المكونات قبل الطلب،
              خاصة في حالات الحساسية أو الأنظمة الغذائية الخاصة.
            </li>
            <li>
              التطبيق <strong className="text-red-600">لا يضمن</strong> دقة
              المعلومات الغذائية المقدمة من مقدمي الخدمة.
            </li>
          </ul>
        </section>

        {/* 4. مسؤولية التوصيل */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3 border-r-4 border-emerald-500 pr-3">
            4. مسؤولية التوصيل
          </h2>
          <p className="mb-3 text-gray-700">
            خدمة التوصيل يتم تنفيذها بواسطة <strong>طرف ثالث مستقل</strong>.
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="font-bold text-gray-700 mb-2">التطبيق غير مسؤول عن:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600 mr-4">
              <li>تأخير الطلب</li>
              <li>تلف الطلب أثناء النقل</li>
              <li>سوء التعامل من المندوب</li>
            </ul>
          </div>
        </section>

        {/* 5. استخدام البيانات */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3 border-r-4 border-sky-500 pr-3">
            5. استخدام البيانات
          </h2>
          <p className="mb-3 text-gray-700">قد نقوم بجمع بيانات أساسية مثل:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-700 mr-4 mb-3">
            <li>الاسم</li>
            <li>رقم الهاتف</li>
            <li>الموقع الجغرافي</li>
            <li>تفاصيل الطلب</li>
          </ul>
          <div className="bg-sky-50 border border-sky-200 rounded-lg p-4">
            <p className="text-gray-700">
              وذلك <strong>فقط</strong> لغرض تشغيل الخدمة وتحسين تجربة المستخدم.
            </p>
            <p className="text-sky-700 font-bold mt-2">
              ✅ لا يتم بيع البيانات لأي طرف خارجي
            </p>
          </div>
        </section>

        {/* 6. النزاعات */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3 border-r-4 border-purple-500 pr-3">
            6. النزاعات
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>
              أي نزاع يتعلق بالطعام أو الخدمة يتم حله <strong>مباشرة</strong> بين
              العميل ومقدم الخدمة.
            </li>
            <li>
              دور التطبيق يقتصر على <strong className="text-sky-600">الوساطة التقنية فقط</strong>.
            </li>
          </ul>
        </section>

        {/* 7. الموافقة */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3 border-r-4 border-green-500 pr-3">
            7. الموافقة
          </h2>
          <div className="bg-green-50 border border-green-300 rounded-lg p-4">
            <p className="text-green-800">
              باستخدام التطبيق، فإنك <strong>توافق</strong> على هذه الشروط وتقر بأن
              التطبيق <strong>وسيط تقني فقط</strong> ولا يتحمل أي مسؤولية عن
              المنتجات المعروضة.
            </p>
          </div>
        </section>

        {/* التواصل */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3 border-r-4 border-sky-500 pr-3">
            8. تواصل معنا
          </h2>
          <div className="bg-sky-50 rounded-lg p-4">
            <p className="mb-2">📧 البريد الإلكتروني: <strong>afrtalbyt2026@gmail.com</strong></p>
            <p className="mb-2">📞 الجوال: <strong dir="ltr">0535534208</strong></p>
            <p>📱 التطبيق: قسم الدعم والمساعدة</p>
          </div>
        </section>

        {/* الموافقة النهائية */}
        <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-4 mt-8 text-center">
          <p className="text-amber-800 font-bold text-lg">
            ⚠️ إقرار مهم
          </p>
          <p className="text-amber-700 mt-2">
            بالضغط على "موافق" أو باستخدام التطبيق، أنت تقر بأنك قرأت وفهمت سياسة
            الخصوصية وإخلاء المسؤولية وتوافق عليها بالكامل.
          </p>
        </div>

        <p className="mt-6 text-sm text-gray-500 text-center">
          تم آخر تحديث لهذه السياسة بتاريخ {new Date().toLocaleDateString("ar-SA")}
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/terms"
            className="text-white bg-sky-500 hover:bg-sky-600 px-6 py-3 rounded-lg inline-block transition-colors text-center font-bold"
          >
            📋 الشروط والأحكام
          </Link>
          <Link
            to="/"
            className="text-sky-600 bg-sky-100 hover:bg-sky-200 px-6 py-3 rounded-lg inline-block transition-colors text-center"
          >
            الرجوع إلى الصفحة الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
