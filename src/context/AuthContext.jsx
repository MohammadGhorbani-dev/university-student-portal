import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, deleteUser } from 'firebase/auth';
import { auth, db, isConfigured } from '../firebase/config';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import LoadingSpinner from '../components/LoadingSpinner';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = (email, password) => {
    if (!isConfigured) {
      toast.error('Firebase is not configured. Check .env variables.');
      return Promise.reject(new Error('Firebase not configured'));
    }
    return signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (email, password, studentData, secretCode = '') => {
    if (!isConfigured) {
      toast.error('Firebase is not configured. Check .env variables.');
      return Promise.reject(new Error('Firebase not configured'));
    }
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    let role = 'student';
    if (secretCode === 'ADMIN_SECRET') {
      role = 'admin';
    } else if (secretCode === 'STAFF_SECRET') {
      role = 'staff';
    }

    try {
      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        ...studentData,
        email,
        role: role,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      // Rollback: delete the auth user if Firestore creation fails
      try {
        await deleteUser(user);
      } catch (deleteError) {
        console.error("Failed to delete user after Firestore error:", deleteError);
      }
      throw error;
    }
    
    return userCredential;
  };

  const logout = () => {
    if (!isConfigured) return Promise.resolve();
    return signOut(auth);
  };

  const resetPassword = (email) => {
    if (!isConfigured) {
      toast.error('Firebase is not configured. Check .env variables.');
      return Promise.reject(new Error('Firebase not configured'));
    }
    return sendPasswordResetEmail(auth, email);
  };

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    let unsubscribeDoc = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        unsubscribeDoc = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching user data:", error);
          toast.error("خطا در ارتباط با سرور. لطفاً اتصال اینترنت خود را بررسی کنید.", { id: 'network-error' });
          setLoading(false);
        });
      } else {
        setUserData(null);
        if (unsubscribeDoc) {
          unsubscribeDoc();
          unsubscribeDoc = null;
        }
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) {
        unsubscribeDoc();
      }
    };
  }, []);

  const value = {
    currentUser,
    userData,
    loading,
    login,
    register,
    logout,
    resetPassword
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? <LoadingSpinner /> : children}
    </AuthContext.Provider>
  );
};
