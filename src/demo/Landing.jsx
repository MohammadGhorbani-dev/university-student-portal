import { roles, selectRole } from './store';

export default function Landing() {
  return <main dir="rtl" className="min-h-[80vh] bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-6 grid place-items-center">
    <section className="max-w-2xl space-y-6">
      <p className="text-blue-600 font-bold">نمونه‌کار محمد قربانی</p>
      <h1 className="text-4xl font-black">پورتال دانشگاه؛ تجربهٔ نمایشی</h1>
      <p className="leading-8">با نقش دانشجو انتخاب واحد، رزرو، درخواست و تیکت را امتحان کنید؛ سپس با نقش مسئول پاسخ بدهید. داده‌ها ساختگی‌اند و این نسخه به حساب یا دیتابیس واقعی متصل نیست.</p>
      <div className="flex flex-wrap gap-3">{Object.entries(roles).map(([role, title]) => <button key={role} type="button" onClick={() => selectRole(role)} className="rounded-xl bg-blue-700 text-white px-5 py-3">ورود به نقش {title}</button>)}</div>
      <p className="text-sm text-slate-500">با «بازنشانی دمو» سناریو از ابتدا شروع می‌شود. دادهٔ شخصی واقعی وارد نکنید.</p>
      <a className="text-blue-600 underline" href="https://github.com/MohammadGhorbani-dev/university-student-portal">کد و توضیحات پروژه در GitHub</a>
    </section>
  </main>;
}
