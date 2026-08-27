import { handleFirebaseError } from '../utils/errorHandler';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { toast } from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';
import { FiSun, FiMoon, FiEye, FiEyeOff } from 'react-icons/fi';
import { useState } from 'react';
import HelpSection from '../components/ui/HelpSection';

export default function Register() {
  const { register: registerForm, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm();
  const { register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSecretCode, setShowSecretCode] = useState(false);

  const password = watch('password');

  const onSubmit = async (data) => {
    try {
      const studentData = {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        studentNumber: data.studentId.trim(),
        nationalCode: data.nationalId?.trim() || '',
        phone: '',
        address: '',
        avatar: '',
        faculty: '',
        major: '',
        entryYear: '',
        semester: '',
        advisor: '',
        gpa: 0,
        creditsPassed: 0,
        status: ''
      };
      await register(data.email.trim(), data.password, studentData, data.secretCode?.trim());
      toast.success('ثبت‌نام با موفقیت انجام شد');
      navigate('/');
    } catch (error) {
      toast.error(handleFirebaseError(error));
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative overflow-y-auto py-12" dir="rtl">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#61DAFB]/5 via-[#080808] to-[#080808]"></div>
      
      <button 
        onClick={toggleTheme} 
        className="absolute top-6 left-6 p-2.5 rounded-full bg-slate-200/50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors z-20 backdrop-blur-sm cursor-pointer"
        aria-label="تغییر تم"
      >
        {theme === 'dark' ? <FiSun className="text-xl" /> : <FiMoon className="text-xl" />}
      </button>

      <div className="w-full max-w-2xl flex flex-col gap-6 relative z-10 my-8">
      <div className="bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-2xl shadow-2xl dark:shadow-none border border-slate-200 dark:border-slate-700 w-full relative z-10">
        <div className="text-center mb-10">
          <span className="text-blue-600 font-mono text-sm tracking-[0.3em] uppercase mb-2 block">ثبت‌نام</span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-slate-50 mb-2 leading-tight">ثبت‌نام دانشجو</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">برای ثبتنام، اطلاعات خود را وارد کنید.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                نام
              </label>
              <input
                type="text"
                className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 rounded-lg border ${errors.firstName ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500'} text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 transition-all text-sm placeholder:text-slate-400`}
                {...registerForm('firstName', { required: 'لطفاً نام خود را وارد کنید.' })}
              />
              {errors.firstName && <p className="text-rose-500 text-xs font-bold mt-2">{errors.firstName.message}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                نام خانوادگی
              </label>
              <input
                type="text"
                className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 rounded-lg border ${errors.lastName ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500'} text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 transition-all text-sm placeholder:text-slate-400`}
                {...registerForm('lastName', { required: 'لطفاً نام خانوادگی خود را وارد کنید.' })}
              />
              {errors.lastName && <p className="text-rose-500 text-xs font-bold mt-2">{errors.lastName.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                شماره دانشجویی
              </label>
              <input
                type="text"
                dir="ltr"
                className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 rounded-lg border ${errors.studentId ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500'} text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 transition-all text-sm placeholder:text-slate-400`}
                {...registerForm('studentId', { required: 'لطفاً شماره دانشجویی را وارد کنید.' })}
              />
              {errors.studentId && <p className="text-rose-500 text-xs font-bold mt-2">{errors.studentId.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                کد ملی (اختیاری)
              </label>
              <input
                type="text"
                dir="ltr"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm placeholder:text-slate-400"
                {...registerForm('nationalId')}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                ایمیل
              </label>
              <input
                type="email"
                dir="ltr"
                placeholder="student@university.ac.ir"
                className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 rounded-lg border ${errors.email ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500'} text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 transition-all text-sm placeholder:text-slate-400`}
                {...registerForm('email', { 
                  required: 'لطفاً ایمیل خود را وارد کنید.',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'لطفاً یک ایمیل معتبر وارد کنید.'
                  }
                })}
              />
              {errors.email && <p className="text-rose-500 text-xs font-bold mt-2">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                رمز عبور
              </label>
              <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                dir="ltr"
                className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 rounded-lg border ${errors.password ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500'} text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 transition-all text-sm placeholder:text-slate-400 pr-10`}
                {...registerForm('password', { 
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
              {errors.password && <p className="text-rose-500 text-xs font-bold mt-2">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                تکرار رمز عبور
              </label>
              <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                dir="ltr"
                className={`w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 rounded-lg border ${errors.confirmPassword ? 'border-rose-500 focus:ring-rose-500' : 'border-slate-200 dark:border-slate-700 focus:ring-blue-500'} text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 transition-all text-sm placeholder:text-slate-400 pr-10`}
                {...registerForm('confirmPassword', { 
                  required: 'لطفاً تکرار رمز عبور را وارد کنید.',
                  validate: value => value === password || 'رمز عبور و تکرار آن مطابقت ندارند.'
                })}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'مخفی کردن رمز عبور' : 'نمایش رمز عبور'}
              >
                {showConfirmPassword ? <FiEyeOff className="text-lg" /> : <FiEye className="text-lg" />}
              </button>
            </div>
              {errors.confirmPassword && <p className="text-rose-500 text-xs font-bold mt-2">{errors.confirmPassword.message}</p>}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                کد محرمانه مدیریت/کارمند (اختیاری)
              </label>
              <div className="relative">
              <input
                type={showSecretCode ? 'text' : 'password'}
                dir="ltr"
                placeholder="جهت ثبت‌نام با دسترسی ویژه"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm placeholder:text-slate-400 pr-10"
                {...registerForm('secretCode')}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                onClick={() => setShowSecretCode(!showSecretCode)}
                aria-label={showSecretCode ? 'مخفی کردن کد محرمانه' : 'نمایش کد محرمانه'}
              >
                {showSecretCode ? <FiEyeOff className="text-lg" /> : <FiEye className="text-lg" />}
              </button>
            </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-8 flex justify-center items-center gap-2 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>در حال ثبت‌نام...</span>
              </>
            ) : 'ثبت‌نام در سامانه'}
          </button>
          
          <div className="text-center mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              قبلاً ثبت‌نام کرده‌اید؟ <Link to="/login" className="text-blue-600 font-bold hover:text-blue-700 dark:hover:text-blue-400 transition-colors cursor-pointer">وارد شوید</Link>
            </p>
          </div>
        </form>
      </div>
      <HelpSection />
    </div>
    </div>
  );
}
