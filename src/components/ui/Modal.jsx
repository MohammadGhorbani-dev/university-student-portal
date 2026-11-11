import { useEffect, useState, useRef, useId } from 'react';
import { useDialogFocus } from './useDialogFocus';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';

export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-2xl', closeClassName }) {
  const [show, setShow] = useState(false);
  const [render, setRender] = useState(false);
  const dialogRef = useRef(null);
  const titleId = useId();
  useDialogFocus(isOpen && render, dialogRef, onClose);

  useEffect(() => {
    if (isOpen) {
      setRender(true);
      // Small delay to allow CSS transition to run
      const timer = setTimeout(() => setShow(true), 10);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
      const timer = setTimeout(() => setRender(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!render) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6" dir="rtl" aria-hidden={!isOpen}>
      <div
        className={`fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${show ? 'opacity-100' : 'opacity-0'} cursor-pointer`}
        onClick={onClose}
      ></div>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} inert={!isOpen}
        className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full ${maxWidth} relative z-10 shadow-2xl dark:shadow-black/60 flex flex-col max-h-[90vh] transition-all duration-300 ease-in-out transform ${show ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'}`}
      >
        <div className="flex items-center justify-between p-5 md:p-6 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/80 rounded-t-2xl">
          <h2 id={titleId} className="text-lg md:text-xl font-black text-slate-900 dark:text-slate-100">{title}</h2>
          <button 
            onClick={onClose}
            className={closeClassName || "text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors p-2 rounded-xl"}
            aria-label="بستن"
          >
            <FiX className="text-xl" />
          </button>
        </div>
        <div className="p-5 md:p-6 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
