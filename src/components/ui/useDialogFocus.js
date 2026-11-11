import { useEffect, useRef } from 'react';

const dialogs = [];
let previousOverflow;
const selector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useDialogFocus(active, ref, onClose) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!active || !ref.current) return;
    const element = ref.current;
    const previous = document.activeElement;
    if (!dialogs.length) { previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
    dialogs.push(element);
    const controls = () => [...element.querySelectorAll(selector)].filter(node => node.getClientRects().length && !node.closest('[inert]'));
    (controls()[0] ?? element).focus();
    const keydown = event => {
      if (dialogs.at(-1) !== element) return;
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close.current(); }
      if (event.key !== 'Tab') return;
      const items = controls();
      if (!items.length) { event.preventDefault(); element.focus(); return; }
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && (document.activeElement === first || !element.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !element.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown, true);
    return () => {
      document.removeEventListener('keydown', keydown, true);
      const wasTop = dialogs.at(-1) === element;
      const index = dialogs.indexOf(element);
      if (index >= 0) dialogs.splice(index, 1);
      if (!dialogs.length) document.body.style.overflow = previousOverflow;
      if (wasTop && previous?.isConnected) previous.focus();
    };
  }, [active, ref]);
}
