import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiAlertTriangle } from 'react-icons/fi';

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = 'تأیید', cancelText = 'انصراف' }) {
  const [show, setShow] = useState(false);
  const [render, setRender] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRender(true);
      setTimeout(() => setShow(true), 10);
    } else {
      setShow(false);
      const timer = setTimeout(() => setRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!render) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 cursor-pointer" onClick={onClose} dir="rtl">
      <div className={`fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${show ? 'opacity-100' : 'opacity-0'}`}></div>
      <div 
        className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl w-full max-w-sm p-6 md:p-8 shadow-2xl dark:shadow-none relative overflow-hidden transition-all duration-300 ease-in-out transform ${show ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-5 rotate-3 hover:rotate-0 transition-transform">
            <FiAlertTriangle className="text-3xl" />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-slate-50 mb-3 ">{title}</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed px-2">
            {message}
          </p>
          <div className="flex flex-col-reverse sm:flex-row items-center justify-center gap-3 w-full">
            <button 
              onClick={onClose}
              className="w-full sm:w-auto flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-50 transition-colors text-sm cursor-pointer"
            >
              {cancelText}
            </button>
            <button 
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="w-full sm:w-auto flex-1 py-3 px-4 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-600 transition-colors text-sm shadow-sm dark:shadow-none shadow-rose-500/20"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
