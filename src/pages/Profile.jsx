import { handleFirebaseError } from '../utils/errorHandler';
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile, getStudentTickets, getAllTickets, createTicket, updateTicketStatus, getTicketMessages, addTicketMessage } from '../services/firestore';
import { formatSafely } from '../utils/dateUtils';
import { withRetry } from '../utils/errorHandler';
import { toast } from 'react-hot-toast';
import Card from '../components/ui/Card';
import { FiUser, FiMail, FiHash, FiShield, FiLock, FiCamera, FiEdit3, FiX, FiCheck } from 'react-icons/fi';

export default function Profile() {
  const { userData, currentUser, resetPassword } = useAuth();
  const isAdminOrStaff = userData?.role === 'admin' || userData?.role === 'staff';
  const [isEditing, setIsEditing] = useState(false);
  const [resetCooldown, setResetCooldown] = useState(0);
  const [avatarPreview, setAvatarPreview] = useState('');
  const fileInputRef = useRef(null);

    const [tickets, setTickets] = useState([]);
  const [activeTab, setActiveTab] = useState('profile');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [editTicketStatus, setEditTicketStatus] = useState("");
  const [messages, setMessages] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [ticketFormOpen, setTicketFormOpen] = useState(false);
  const { register: registerTicket, handleSubmit: handleTicketSubmit, reset: resetTicket, formState: { isSubmitting: ticketSubmitting, errors: ticketErrors } } = useForm();
  
  const loadTickets = async () => {
    try {
      if (isAdminOrStaff) {
        const data = await withRetry(getAllTickets);
        setTickets(data);
      } else {
        const data = await withRetry(() => getStudentTickets(currentUser.uid));
        setTickets(data);
      }
    } catch (error) {
      toast.error(handleFirebaseError(error));
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadTickets();
    }
  }, [currentUser, isAdminOrStaff]);

  const onTicketSubmit = async (data) => {
    try {
      const payload = {
        subject: data.subject,
        category: data.category,
        message: data.message,
        studentUid: currentUser.uid,
        userId: currentUser.uid,
        studentName: `${userData.firstName} ${userData.lastName}`,
        studentId: userData.studentId || '-'
      };
      await createTicket(payload);
      toast.success('تیکت با موفقیت ثبت شد');
      setTicketFormOpen(false);
      resetTicket();
      loadTickets();
    } catch (error) {
      toast.error(handleFirebaseError(error));
    }
  };

  const handleOpenTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setEditTicketStatus(ticket.status);
    try {
      const msgs = await withRetry(() => getTicketMessages(ticket.id));
      setMessages(msgs);
    } catch (error) {
      toast.error('خطا در دریافت پیام‌ها');
    }
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setReplySubmitting(true);
    try {
      const payload = {
        senderUid: currentUser.uid,
        senderName: isAdminOrStaff ? `${userData.firstName} ${userData.lastName} (پشتیبانی)` : `${userData.firstName} ${userData.lastName}`,
        senderRole: userData.role,
        message: replyText
      };
      await addTicketMessage(selectedTicket.id, payload);
      setReplyText('');
      const msgs = await withRetry(() => getTicketMessages(selectedTicket.id));
      setMessages(msgs);
    } catch (error) {
      toast.error('خطا در ارسال پیام');
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleUpdateTicketStatus = async (id, status) => {
    try {
      await updateTicketStatus(id, status);
      toast.success('وضعیت تیکت تغییر کرد');
      loadTickets();
    } catch (error) {
      toast.error(handleFirebaseError(error));
    }
  };

  const { register, handleSubmit, reset, formState: { errors, isSubmitting, dirtyFields } } = useForm({
    defaultValues: {
      email: '',
      phone: '',
      address: '',
    }
  });

  useEffect(() => {
    if (userData) {
      reset({
        email: userData.email || currentUser?.email || '',
        phone: userData.phone || '',
        address: userData.address || '',
      });
      setAvatarPreview(userData.avatar || '');
    }
  }, [userData, currentUser, reset]);

  useEffect(() => {
    let timer;
    if (resetCooldown > 0) {
      timer = setInterval(() => {
        setResetCooldown(c => c - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resetCooldown]);

  const onSubmit = async (data) => {
    try {
      const modifiedData = {};
      Object.keys(dirtyFields).forEach(key => {
        modifiedData[key] = data[key];
      });
      
      if (avatarPreview !== (userData?.avatar || '')) {
        modifiedData.avatar = avatarPreview;
      }

      if (Object.keys(modifiedData).length === 0) {
        toast('تغییری برای ذخیره وجود ندارد', { icon: 'ℹ️' });
        setIsEditing(false);
        return;
      }

      await updateUserProfile(currentUser.uid, modifiedData, userData?.role || 'student');
      
      // Manually trigger an update if necessary, but context usually handles the Firestore snapshot or we assume the reload happens
      // Alternatively, context might not listen actively to document changes unless we use onSnapshot. 
      // Assuming context fetches on mount, let's just show success.
      toast.success('اطلاعات با موفقیت بروزرسانی شد');
      setIsEditing(false);
    } catch (error) {
      toast.error(handleFirebaseError(error));
    }
  };

  const handleCancel = () => {
    reset();
    setAvatarPreview(userData?.avatar || '');
    setIsEditing(false);
  };

  const handlePasswordReset = async () => {
    if (resetCooldown > 0) return;
    
    try {
      if (currentUser?.email) {
        await resetPassword(currentUser.email);
        toast.success('لینک تغییر رمز عبور به ایمیل شما ارسال شد');
        setResetCooldown(300000 / 1000);
      }
    } catch (error) {
      toast.error(handleFirebaseError(error));
    }
  };

  const handleAvatarClick = () => {
    if (!isEditing) {
      toast('برای تغییر عکس، ابتدا دکمه ویرایش اطلاعات را بزنید', { icon: 'ℹ️' });
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // 1MB limit for base64
        toast.error('حجم عکس باید کمتر از ۱ مگابایت باشد');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const InfoItemReadOnly = ({ label, value }) => (
    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col justify-center">
      <span className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase  mb-1">{label}</span>
      <span className="text-slate-900 dark:text-slate-50 text-sm font-mono truncate">{value || '-'}</span>
    </div>
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-700 mb-8">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-4 px-2 font-bold transition-colors ${activeTab === 'profile' ? 'text-slate-900 dark:text-slate-50 border-b-2 border-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-50'}`}
        >
          پروفایل کاربری
        </button>
        <button
          onClick={() => setActiveTab('support')}
          className={`pb-4 px-2 font-bold transition-colors ${activeTab === 'support' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-[#9D72FF]' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-slate-50'}`}
        >
          پشتیبانی و تیکت‌ها
        </button>
      </div>
      
      {activeTab === 'profile' && (
        <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between border-b-2 border-slate-200 dark:border-slate-700 pb-6 gap-4">
        <div>
          <span className="text-indigo-600 dark:text-indigo-400 font-mono text-sm tracking-[0.3em] uppercase mb-2 block">تنظیمات و امنیت</span>
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-slate-50  leading-none">پروفایل کاربری</h1>
        </div>
        {!isEditing ? (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-50 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-sm font-bold shrink-0"
          >
            <FiEdit3 />
            ویرایش اطلاعات
          </button>
        ) : (
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleCancel}
              className="flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-sm font-bold cursor-pointer"
            >
              <FiX />
              انصراف
            </button>
            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors focus:ring-2 focus:ring-[#9D72FF] focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 cursor-pointer"
            >
              <FiCheck />
              {isSubmitting ? 'در حال ثبت...' : 'ذخیره'}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <Card className="flex flex-col items-center text-center">
            <div className="relative mb-6 group">
              <div 
                className={`w-32 h-32 rounded-full overflow-hidden border-2 ${isEditing ? 'border-[#9D72FF] cursor-pointer' : 'border-slate-200 dark:border-slate-700'} bg-slate-200 flex items-center justify-center`}
                onClick={handleAvatarClick}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <FiUser className="text-4xl text-slate-500 dark:text-slate-400" />
                )}
                {isEditing && (
                  <div className="absolute inset-0 bg-white dark:bg-slate-800/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <FiCamera className="text-slate-900 dark:text-slate-50 text-2xl" />
                  </div>
                )}
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
            
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-2">
              {userData?.firstName || '-'} {userData?.lastName || '-'}
            </h2>
            
            <div className="flex items-center gap-2 justify-center mb-6">
              <span className="text-sm font-mono  text-indigo-600 dark:text-indigo-400 uppercase px-3 py-1 bg-indigo-50 rounded border border-indigo-200">
                دانشجو
              </span>
            </div>

            <div className="w-full space-y-3 text-sm text-slate-600 dark:text-slate-400 font-mono text-right mb-6 border-y border-slate-200 dark:border-slate-700 py-4">
              <div className="flex items-center gap-3">
                <FiMail className="shrink-0 text-indigo-600 dark:text-indigo-400" />
                <span className="truncate">{userData?.email || currentUser?.email || '-'}</span>
              </div>
              <div className="flex items-center gap-3">
                <FiHash className="shrink-0 text-indigo-600 dark:text-indigo-400" />
                <span>{userData?.studentId || '-'}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePasswordReset}
              disabled={resetCooldown > 0}
              className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-50 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-sm font-mono uppercase  disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiLock className="text-slate-600 dark:text-slate-400" /> 
              {resetCooldown > 0 ? `ارسال مجدد (${Math.ceil(resetCooldown / 60)} دقیقه)` : 'تغییر رمز عبور'}
            </button>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex justify-between items-center mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                <FiShield className="text-indigo-600 dark:text-indigo-400" />
                اطلاعات هویتی و تحصیلی
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <InfoItemReadOnly label="نام" value={userData?.firstName} />
              <InfoItemReadOnly label="نام خانوادگی" value={userData?.lastName} />
              <InfoItemReadOnly label="شماره دانشجویی" value={userData?.studentId} />
              <InfoItemReadOnly label="کد ملی" value={userData?.nationalId} />
              <InfoItemReadOnly label="دانشکده" value={userData?.faculty} />
              <InfoItemReadOnly label="رشته تحصیلی" value={userData?.major} />
              <InfoItemReadOnly label="سال ورود" value={userData?.entranceYear} />
            </div>
          </Card>

          <Card>
            <div className="flex justify-between items-center mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-50 flex items-center gap-2">
                <FiUser className="text-indigo-600 dark:text-indigo-400" />
                اطلاعات شخصی و تماس
              </h3>
            </div>
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase  mb-2">ایمیل</label>
                  <input
                    type="email"
                    dir="ltr"
                    disabled={!isEditing}
                    className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-1 focus:ring-[#9D72FF] focus:border-[#9D72FF] transition-all font-mono text-sm placeholder:text-slate-400 disabled:opacity-70 text-right md:text-left"
                    {...register('email', { 
                      required: 'این فیلد الزامی است',
                      pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'ایمیل نامعتبر است' }
                    })}
                  />
                  {errors.email && <span className="text-red-500 dark:text-red-400 text-sm mt-1 block">{errors.email.message}</span>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase  mb-2">شماره موبایل</label>
                  <input
                    type="tel"
                    dir="ltr"
                    disabled={!isEditing}
                    className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-1 focus:ring-[#9D72FF] focus:border-[#9D72FF] transition-all font-mono text-sm placeholder:text-slate-400 disabled:opacity-70 text-right md:text-left"
                    {...register('phone', { 
                      required: 'این فیلد الزامی است',
                      pattern: { value: /^09\d{9}$/, message: 'شماره موبایل باید با 09 شروع شود و 11 رقم باشد' }
                    })}
                  />
                  {errors.phone && <span className="text-red-500 dark:text-red-400 text-sm mt-1 block">{errors.phone.message}</span>}
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase  mb-2">آدرس محل سکونت</label>
                <textarea
                  rows="3"
                  disabled={!isEditing}
                  className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:ring-1 focus:ring-[#9D72FF] focus:border-[#9D72FF] transition-all text-sm placeholder:text-slate-400 resize-none disabled:opacity-70"
                  {...register('address', { required: 'این فیلد الزامی است' })}
                ></textarea>
                {errors.address && <span className="text-red-500 dark:text-red-400 text-sm mt-1 block">{errors.address.message}</span>}
              </div>
            </form>
          </Card>
        </div>
      </div>
      </div>
      )}
      
      {activeTab === 'support' && (
        <div className="space-y-8">
          <Card className="border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 mb-6">اطلاعات تماس دانشگاه</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-4 p-4 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center">
                  <FiMail className="text-xl" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mb-1">ایمیل پشتیبانی</p>
                  <p className="text-slate-900 dark:text-slate-50 font-mono">support@university.ac.ir</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="w-12 h-12 bg-green-500/10 text-green-400 rounded-full flex items-center justify-center">
                  <FiHash className="text-xl" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mb-1">تلفن تماس</p>
                  <p className="text-slate-900 dark:text-slate-50 font-mono" dir="ltr">021-12345678</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">تیکت‌های پشتیبانی</h2>
              {!isAdminOrStaff && !selectedTicket && (
                <button
                  onClick={() => setTicketFormOpen(!ticketFormOpen)}
                  className="px-4 py-2 bg-indigo-50 text-indigo-600 dark:text-indigo-400 rounded-lg font-bold text-sm hover:bg-indigo-600/20 transition-colors"
                >
                  {ticketFormOpen ? 'انصراف' : 'ثبت تیکت جدید'}
                </button>
              )}
            </div>

            {!isAdminOrStaff && ticketFormOpen && (
              <form onSubmit={handleTicketSubmit(onTicketSubmit)} className="space-y-4 mb-8 bg-white dark:bg-slate-800 p-6 rounded-xl border border-indigo-200">
                <div>
                  <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-2">موضوع</label>
                  <input
                    type="text"
                    {...registerTicket('subject', { required: 'الزامی است' })}
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:border-[#9D72FF]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-2">دسته‌بندی</label>
                  <select
                    {...registerTicket('category', { required: 'الزامی است' })}
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:border-[#9D72FF]"
                  >
                    <option value="">انتخاب کنید...</option>
                    <option value="مشکل فنی">مشکل فنی</option>
                    <option value="گزارش باگ">گزارش باگ</option>
                    <option value="مشکل آموزشی">مشکل آموزشی</option>
                    <option value="مشکل حساب کاربری">مشکل حساب کاربری</option>
                    <option value="سایر">سایر</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 mb-2">متن پیام</label>
                  <textarea
                    {...registerTicket('message', { required: 'الزامی است' })}
                    className="w-full px-4 py-2 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:border-[#9D72FF] min-h-[100px]"
                  ></textarea>
                </div>
                <div className="flex justify-end pt-2">
                  <button type="submit" disabled={ticketSubmitting} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold cursor-pointer">
                    ثبت تیکت
                  </button>
                </div>
              </form>
            )}

            {!selectedTicket ? (
              <div className="space-y-4">
                {tickets.length === 0 ? (
                  <p className="text-slate-500 dark:text-slate-400 text-center py-8">تیکتی برای نمایش وجود ندارد.</p>
                ) : (
                  tickets.map(ticket => (
                    <div key={ticket.id} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" onClick={() => handleOpenTicket(ticket)}>
                      <div className="flex justify-between items-start mb-3 gap-4">
                        <div className="flex-1 min-w-0">
                          <span className="text-sm bg-blue-50 text-slate-900 dark:text-slate-700 px-2 py-1 rounded inline-block mb-2">{ticket.category}</span>
                          <h3 className="text-slate-900 dark:text-slate-50 font-bold truncate">{ticket.subject}</h3>
                          {isAdminOrStaff && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{ticket.studentName} - {ticket.studentId}</p>}
                        </div>
                        
                          <span className={`text-sm font-bold px-2 py-1 rounded border inline-block                            ${ticket.status === 'باز' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :                              ticket.status === 'در حال بررسی' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :                              'bg-green-500/10 text-green-400 border-green-500/20'                            }`}                          >                            {ticket.status}                          </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-sm line-clamp-2">{ticket.message}</p>
                      <div className="text-sm text-slate-400 font-mono mt-3 text-left">
                        {formatSafely(ticket.createdAt)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-6">
                
                <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-700 pb-4">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedTicket(null)} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:text-slate-50 px-3 py-1 rounded bg-slate-50 dark:bg-slate-900">بازگشت</button>
                    <h3 className="font-bold text-lg text-slate-900 dark:text-slate-50">{selectedTicket.subject}</h3>
                  </div>
                  {isAdminOrStaff && (
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={editTicketStatus}
                        onChange={(e) => setEditTicketStatus(e.target.value)}
                        className={`text-sm font-bold px-3 py-1.5 rounded-lg border outline-none
                          ${editTicketStatus === 'باز' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                            editTicketStatus === 'در حال بررسی' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                            'bg-green-500/10 text-green-400 border-green-500/20'
                          }`}
                      >
                        <option value="باز" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50">باز</option>
                        <option value="در حال بررسی" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50">در حال بررسی</option>
                        <option value="بسته شده" className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50">بسته شده</option>
                      </select>
                      {editTicketStatus !== selectedTicket.status && (
                        <>
                          <button
                            onClick={() => {
                              handleUpdateTicketStatus(selectedTicket.id, editTicketStatus);
                              setSelectedTicket({ ...selectedTicket, status: editTicketStatus });
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors"
                            title="ذخیره تغییرات"
                          >
                            <FiCheck /> ذخیره تغییرات
                          </button>
                          <button
                            onClick={() => setEditTicketStatus(selectedTicket.status)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                            title="انصراف"
                          >
                            <FiX /> انصراف
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  {!isAdminOrStaff && (
                    <span className={`text-sm font-bold px-2 py-1 rounded border inline-block
                      ${selectedTicket.status === 'باز' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                        selectedTicket.status === 'در حال بررسی' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        'bg-green-500/10 text-green-400 border-green-500/20'
                      }`}
                    >
                      {selectedTicket.status}
                    </span>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="bg-slate-100 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-sm text-indigo-600 dark:text-indigo-400">{selectedTicket.studentName}</span>
                      <span className="text-sm text-slate-500 dark:text-slate-400">{formatSafely(selectedTicket.createdAt)}</span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedTicket.message}</p>
                  </div>
                  
                  {messages.map(msg => (
                    <div key={msg.id} className={`p-4 rounded-xl border border-slate-200 dark:border-slate-700 ${msg.senderUid === currentUser.uid ? 'bg-slate-100 dark:bg-slate-950' : 'bg-blue-900/10 border-blue-500/20'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className={`font-bold text-sm ${msg.senderUid === currentUser.uid ? 'text-indigo-600 dark:text-indigo-400' : 'text-blue-400'}`}>{msg.senderName}</span>
                        <span className="text-sm text-slate-500 dark:text-slate-400">{formatSafely(msg.createdAt)}</span>
                      </div>
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  ))}
                </div>

                {selectedTicket.status !== 'بسته شده' ? (
                  <form onSubmit={handleReplySubmit} className="mt-4 border-t border-slate-200 dark:border-slate-700 pt-4">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="پیام خود را بنویسید..."
                      className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-50 focus:outline-none focus:border-[#9D72FF] min-h-[100px] text-sm resize-y"
                    ></textarea>
                    <div className="flex justify-end mt-2">
                      <button type="submit" disabled={replySubmitting || !replyText.trim()} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm disabled:opacity-50 hover:bg-indigo-700 transition-colors cursor-pointer">
                        {replySubmitting ? 'در حال ارسال...' : 'ارسال پیام'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="mt-4 border-t border-slate-200 dark:border-slate-700 pt-4 text-center text-slate-500 dark:text-slate-400 text-sm">
                    این تیکت بسته شده است و امکان ارسال پیام جدید وجود ندارد.
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
