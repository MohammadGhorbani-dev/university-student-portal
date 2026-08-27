import { handleFirebaseError } from '../utils/errorHandler';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { toast } from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';
import { FiSun, FiMoon, FiEye, FiEyeOff } from 'react-icons/fi';
import { useState } from 'react';
import HelpSection from '../components/ui/HelpSection';

export default function Login() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (data) => {
    try {
      await login(data.email, data.password);
      toast.success('با موفقیت وارد شدید');
      navigate('/');
    } catch (error) {
      toast.error(handleFirebaseError(error));
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative overflow-y-auto" dir="rtl">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#61DAFB]/5 via-[#080808] to-[#080808]"></div>
      
      <button 
        onClick={toggleTheme} 
        className="absolute top-6 left-6 p-2.5 rounded-full bg-slate-200/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors z-20 backdrop-blur-sm cursor-pointer"
        aria-label="تغییر تم"
      >
        {theme === 'dark' ? <FiSun className="text-xl" /> : <FiMoon className="text-xl" />}
      </button>

      <div className="w-full max-w-md flex flex-col gap-6 relative z-10 my-8">
      <div className="bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-2xl shadow-2xl dark:shadow-none border border-slate-200 dark:border-slate-700 w-full relative z-10">
        <div className="text-center mb-10">
          <span className="text-blue-600 font-mono text-sm tracking-[0.3em] uppercase mb-2 block">احراز هویت</span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-slate-50 mb-2 leading-tight">پورتال دانشجویی</h1>
          <p className="text-sm mt-2 text-slate-500 dark:text-slate-400">برای ورود، اطلاعات خود را وارد کنید.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              ایمیل (نام کاربری)
            </label>
            <input
              type="email"
              dir="ltr"
              placeholder="student@university.ac.ir"
              className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 rounded-lg border ${errors.email ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500'} text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 transition-all text-sm placeholder:text-slate-400`}
              {...register('email', { 
                required: 'لطفاً ایمیل خود را وارد کنید.',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "لطفاً یک ایمیل معتبر وارد کنید."
                }
              })}
            />
            {errors.email && (
              <p className="text-rose-500 text-xs font-bold mt-2">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              رمز عبور
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                dir="ltr"
                placeholder="••••••••"
                className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 rounded-lg border ${errors.password ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500'} text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 transition-all text-sm placeholder:text-slate-400 pr-10`}
                {...register('password', { 
                required: 'لطفاً رمز عبور خود را وارد کنید.',
                minLength: {
                  value: 6,
                  message: 'رمز عبور باید حداقل ۶ کاراکتر باشد.'
                }
              })}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'مخفی کردن رمز عبور' : 'نمایش رمز عبور'}
              >
                {showPassword ? <FiEyeOff className="text-lg" /> : <FiEye className="text-lg" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-rose-500 text-xs font-bold mt-2">{errors.password.message}</p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm pt-2">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" className="rounded bg-white dark:bg-slate-900 border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-white dark:focus:ring-offset-slate-900" />
              <span className="text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:text-slate-50 transition-colors">مرا به خاطر بسپار</span>
            </label>
            <Link to="/forgot-password" className="text-blue-600 hover:text-blue-700 dark:hover:text-blue-400 font-bold transition-colors cursor-pointer">
              فراموشی رمز عبور؟
            </Link>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6 flex justify-center items-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>در حال ورود...</span>
              </>
            ) : 'ورود به پورتال'}
          </button>
          
          <div className="text-center mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              حساب کاربری ندارید؟ <Link to="/register" className="text-blue-600 font-bold hover:text-blue-700 dark:hover:text-blue-400 transition-colors cursor-pointer">ثبت‌نام کنید</Link>
            </p>
          </div>
        </form>
      </div>
      <HelpSection />
    </div>
    </div>
  );
}
