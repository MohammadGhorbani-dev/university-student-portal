import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import AppRoutes from './routes/AppRoutes';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <div className="font-sans min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 selection:bg-blue-600 selection:text-white">
            <AppRoutes />
          </div>
          <Toaster 
            position="top-center"
            toastOptions={{
              className: 'dark:bg-slate-800 dark:text-slate-50',
              style: {
                fontFamily: 'inherit',
              },
            }} 
          />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
