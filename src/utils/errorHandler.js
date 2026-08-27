import { toast } from 'react-hot-toast';

export const handleFirebaseError = (error) => {
  console.error("Firebase Error:", error);
  let message = 'خطای ناشناخته در سیستم رخ داده است';
  
  if (!error) return message;

  const code = error.code || '';
  const msg = error.message || '';

  if (code === 'unavailable' || code === 'failed-precondition' || code === 'network-request-failed') {
    message = 'ارتباط با سرویس دانشگاه موقتاً برقرار نیست. لطفاً اتصال اینترنت خود را بررسی کنید.';
  } else if (code === 'permission-denied') {
    message = 'شما دسترسی لازم برای این عملیات را ندارید.';
  } else if (code === 'unauthenticated' || msg.includes('شما وارد حساب')) {
    message = 'لطفاً ابتدا وارد حساب کاربری خود شوید.';
  } else if (code.startsWith('auth/')) {
    if (code === 'auth/wrong-password' || code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
      message = 'ایمیل یا رمز عبور اشتباه است.';
    } else if (code === 'auth/email-already-in-use') {
      message = 'این ایمیل قبلاً در سیستم ثبت شده است.';
    } else if (code === 'auth/weak-password') {
      message = 'رمز عبور بسیار ضعیف است. لطفاً رمز عبور قوی‌تری انتخاب کنید.';
    } else if (code === 'auth/too-many-requests') {
      message = 'تعداد درخواست‌های ناموفق بیش از حد مجاز است. لطفاً کمی بعد تلاش کنید.';
    } else if (code === 'auth/invalid-email') {
      message = 'فرمت ایمیل نامعتبر است.';
    } else {
      message = 'خطا در احراز هویت.';
    }
  } else if (msg && !msg.includes('Firebase')) {
    // If it's one of our custom errors
    message = msg;
  }

  return message;
};

export const withRetry = async (fn, retries = 1, delay = 2000) => {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries) {
        throw error;
      }
      
      const code = error.code || '';
      if (code === 'unavailable' || code === 'network-request-failed' || error.message?.includes('offline')) {
        toast.error('ارتباط با سرویس دانشگاه موقتاً برقرار نیست. در حال تلاش مجدد...');
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error; // Don't retry auth or permission errors
      }
    }
  }
};
