// src/pages/TermsPage.tsx
import React from "react";
import { Link } from "react-router-dom";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-200 text-gray-800 px-4 py-10 leading-relaxed">
      <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-2xl p-6 sm:p-8">
        <h1 className="text-2xl font-bold text-sky-600 mb-6 text-center">
          الشروط والأحكام - 🏠 سفرة البيت
        </h1>

        {/* 1. التعريف */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3 border-r-4 border-sky-500 pr-3">
            1. التعريف
          </h2>
          <p>
            منصة سفرة البيت هي منصة إلكترونية تهدف إلى عرض وتسويق منتجات الأسر
            المنتجة وربطها بالعملاء عبر التطبيق.
          </p>
        </section>

        {/* 2. التسجيل */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3 border-r-4 border-sky-500 pr-3">
            2. التسجيل
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>التسجيل في منصة سفرة البيت مجاني بالكامل.</li>
            <li>لا يتم فرض أي رسوم تسجيل على الأسر المنتجة.</li>
          </ul>
        </section>

        {/* 3. تسعير المنتجات ورسوم تشغيل المنصة */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3 border-r-4 border-sky-500 pr-3">
            3. تسعير المنتجات ورسوم تشغيل المنصة
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>تقوم الأسرة بإدخال السعر الأساسي للمنتج.</li>
            <li>
              توافق الأسرة على قيام المنصة بإضافة رسوم تشغيل قدرها{" "}
              <strong className="text-sky-600">1.75 ريال</strong> على كل منتج.
            </li>
            <li>
              بالنسبة للمنتجات التي يكون سعرها 1 ريال أو 2 ريال، يتم إضافة{" "}
              <strong className="text-sky-600">0.25 ريال</strong> فقط.
            </li>
            <li>
              يظهر السعر النهائي للمنتج للعميل داخل التطبيق على أنه سعر المنتج.
            </li>
            <li>
              لا يتم خصم أي مبالغ من دخل الأسرة، وجميع رسوم تشغيل المنصة تُحمّل
              على العميل.
            </li>
          </ul>
        </section>

        {/* 4. الطلب والدفع */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3 border-r-4 border-sky-500 pr-3">
            4. الطلب والدفع
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>
              يتم عرض السعر النهائي للمنتج داخل التطبيق بعد إضافة رسوم تشغيل
              المنصة.
            </li>
            <li>
              قد يتم احتساب رسوم أخرى مثل:
              <ul className="list-disc list-inside mr-6 mt-2 space-y-1">
                <li>رسوم التوصيل</li>
                <li>ضريبة القيمة المضافة حسب الأنظمة المعمول بها</li>
              </ul>
            </li>
            <li>
              تحتفظ المنصة بحق تحديث أو إضافة خدمات أو رسوم مستقبلية عند الحاجة،
              مع إشعار المستخدمين بذلك.
            </li>
          </ul>
        </section>

        {/* 5. مسؤولية الأسرة المنتجة */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3 border-r-4 border-sky-500 pr-3">
            5. مسؤولية الأسرة المنتجة
          </h2>
          <p className="mb-3">تتحمل الأسرة المنتجة كامل المسؤولية عن:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mr-4">
            <li>جودة المنتجات</li>
            <li>سلامة الأصناف</li>
            <li>نظافة وتحضير الطعام</li>
            <li>التغليف والتعبئة</li>
            <li>الالتزام بالاشتراطات الصحية المعمول بها</li>
          </ul>
          <p className="mt-3">
            تلتزم الأسرة بتسليم الطلب بالحالة المناسبة والمتفق عليها مع العميل.
          </p>
        </section>

        {/* 6. التوصيل والمندوبين */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3 border-r-4 border-sky-500 pr-3">
            6. التوصيل والمندوبين
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>تعمل منصة سفرة البيت كوسيط تقني لربط الأطراف.</li>
            <li>
              لا تتحمل المنصة أي مسؤولية عن:
              <ul className="list-disc list-inside mr-6 mt-2 space-y-1">
                <li>تصرفات المندوب</li>
                <li>تأخير التوصيل</li>
                <li>سوء التعامل أثناء التسليم</li>
                <li>تلف الطلب بعد خروجه من الأسرة</li>
              </ul>
            </li>
            <li>
              أي ملاحظات متعلقة بالتوصيل يتم التعامل معها حسب سياسة مزود التوصيل
              المعتمد.
            </li>
          </ul>
        </section>

        {/* 7. الخدمات الإعلانية */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3 border-r-4 border-sky-500 pr-3">
            7. الخدمات الإعلانية (اختيارية)
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>
              تتيح المنصة خدمات إعلانية أو ترويجية داخل التطبيق مقابل رسوم.
            </li>
            <li>
              هذه الخدمات اختيارية بالكامل ولا تؤثر على استمرار عرض منتجات الأسرة
              في حال عدم الاشتراك.
            </li>
            <li>
              الإعلانات تهدف إلى زيادة الظهور ولا تضمن عددًا معينًا من الطلبات أو
              المبيعات.
            </li>
          </ul>
        </section>

        {/* 8. حدود مسؤولية المنصة */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3 border-r-4 border-sky-500 pr-3">
            8. حدود مسؤولية المنصة
          </h2>
          <p className="mb-3">منصة سفرة البيت غير مسؤولة عن:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mr-4">
            <li>محتوى المنتجات أو صورها</li>
            <li>اختلاف التوقعات الشخصية للعميل</li>
            <li>أي أضرار ناتجة عن استخدام المنتج</li>
          </ul>
          <p className="mt-3">يقتصر دور المنصة على:</p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 mr-4 mt-2">
            <li>عرض المنتجات</li>
            <li>تسهيل الطلب</li>
            <li>ربط الأطراف عبر النظام التقني</li>
          </ul>
        </section>

        {/* 9. التعديل */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3 border-r-4 border-sky-500 pr-3">
            9. التعديل
          </h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700">
            <li>
              يحق للمنصة تعديل هذه الشروط عند الحاجة بما يتوافق مع الأنظمة.
            </li>
            <li>يتم إشعار المستخدمين بأي تحديثات.</li>
          </ul>
        </section>

        {/* 10. الموافقة */}
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3 border-r-4 border-sky-500 pr-3">
            10. الموافقة
          </h2>
          <p className="bg-sky-50 border border-sky-200 rounded-lg p-4 text-gray-800">
            باستخدامك للتطبيق، فإنك تقر بقراءة وفهم والموافقة على جميع الشروط
            والأحكام أعلاه.
          </p>
        </section>

        {/* سياسة الخصوصية */}
        <div className="border-t-2 border-gray-200 pt-6 mt-8">
          <h1 className="text-2xl font-bold text-sky-600 mb-6 text-center">
            سياسة الخصوصية
          </h1>

          <ul className="list-disc list-inside space-y-3 text-gray-700">
            <li>تحترم منصة سفرة البيت خصوصية جميع المستخدمين.</li>
            <li>
              يتم جمع البيانات فقط لغرض:
              <ul className="list-disc list-inside mr-6 mt-2 space-y-1">
                <li>تشغيل التطبيق</li>
                <li>تنفيذ الطلبات</li>
                <li>التواصل مع المستخدمين</li>
                <li>تحسين جودة الخدمة</li>
              </ul>
            </li>
            <li>
              لا يتم مشاركة بيانات المستخدمين مع أي طرف ثالث إلا عند الضرورة
              لتقديم الخدمة أو وفق الأنظمة المعمول بها.
            </li>
            <li>
              تحتفظ المنصة بحق استخدام بيانات المشاهدات والتفاعل داخل التطبيق
              لأغراض تشغيلية وتحليلية وتحسينية.
            </li>
          </ul>
        </div>

        {/* الموافقة النهائية */}
        <div className="bg-green-50 border border-green-300 rounded-lg p-4 mt-8 text-center">
          <p className="text-green-800 font-medium">
            ☑️ بالموافقة، أنت تقر بقراءة وفهم الشروط والأحكام وسياسة الخصوصية
          </p>
        </div>

        <p className="mt-6 text-sm text-gray-500 text-center">
          تم آخر تحديث لهذه الشروط بتاريخ {new Date().toLocaleDateString("ar-SA")}
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/register"
            className="text-white bg-sky-500 hover:bg-sky-600 px-6 py-3 rounded-lg inline-block transition-colors text-center font-bold"
          >
            ✅ موافق - العودة للتسجيل
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
