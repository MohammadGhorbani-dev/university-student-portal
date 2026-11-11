import { createContext, useContext, useSyncExternalStore } from 'react';
import { snapshot, subscribe, roles, uidFor, selectRole, resetDemo } from './store';

const Context = createContext(null);
export const useAuth = () => useContext(Context);
const unsupported = async () => { throw new Error('در نسخهٔ نمایشی، نقش را از نوار بالای صفحه انتخاب کنید؛ حساب واقعی ساخته یا بازیابی نمی‌شود.'); };
export function AuthProvider({ children }) {
  const state = useSyncExternalStore(subscribe, snapshot);
  const uid = state.role ? uidFor(state.role) : null;
  const value = {
    currentUser: uid ? { uid, email: state.users[uid].email } : null,
    userData: uid ? state.users[uid] : null, loading: false,
    login: unsupported, register: unsupported, resetPassword: unsupported,
    logout: async () => selectRole(null),
  };
  return <Context.Provider value={value}><div className="demo-shell">
    <aside dir="rtl" aria-label="کنترل نسخه نمایشی" className="bg-blue-950 text-white px-4 py-3 relative z-[60]">
      <div className="max-w-7xl mx-auto flex flex-wrap gap-3 items-center justify-between">
        <p className="text-sm">نسخهٔ نمایشی • داده‌های ساختگی • تغییرات فقط در همین زبانهٔ مرورگر</p>
        <div className="flex flex-wrap gap-2 items-center">
          <label htmlFor="demo-role">نقش:</label>
          <select id="demo-role" value={state.role ?? ''} onChange={e => selectRole(e.target.value || null)} className="bg-blue-900 rounded p-2">
            <option value="">انتخاب نقش</option>
            {Object.entries(roles).map(([role, name]) => <option key={role} value={role}>{name}</option>)}
          </select>
          <button type="button" onClick={resetDemo} className="border border-white/50 rounded px-3 py-2">بازنشانی دمو</button>
        </div>
      </div>
    </aside>
    <div className="demo-content" key={`${state.role}:${state.generation ?? 0}`}>{children}</div>
  </div></Context.Provider>;
}
