// src/hooks/useAuth.js
import { useState, useEffect, createContext, useContext } from 'react';
import { 
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updatePassword
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { useNotifications } from './useNotifications'; // <-- إضافة: استيراد hook الإشعارات

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const { sendWelcomeNotification } = useNotifications(); // <-- إضافة: استخدام hook الإشعارات

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = { id: user.uid, ...userDoc.data() };
          setUserProfile(userData);
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (phone, password) => {
    const usersQuery = query(collection(db, 'users'), where('phone', '==', phone));
    const usersSnapshot = await getDocs(usersQuery);
    
    if (usersSnapshot.empty) {
      throw new Error('رقم الهاتف غير مسجل');
    }
    
    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;
    
    if (userData.useCustomPassword && userData.customPassword) {
      if (userData.customPassword === password) {
        const email = userData.email || `${phone}@livecourses.com`;
        const defaultPassword = 'DefaultPass@2024';
        
        try {
          const result = await signInWithEmailAndPassword(auth, email, defaultPassword);
          return result;
        } catch (error) {
          if (error.code === 'auth/user-not-found') {
            const result = await createUserWithEmailAndPassword(auth, email, defaultPassword);
            return result;
          } else if (error.code === 'auth/wrong-password') {
            throw new Error('يرجى التواصل مع الإدارة لتفعيل حسابك');
          }
          throw error;
        }
      } else {
        throw new Error('كلمة المرور غير صحيحة');
      }
    }
    
    if (userData.tempPassword && userData.tempPassword === password) {
      const email = userData.email || `${phone}@livecourses.com`;
      const defaultPassword = 'DefaultPass@2024';
      
      try {
        const result = await signInWithEmailAndPassword(auth, email, defaultPassword);
        return result;
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          const result = await createUserWithEmailAndPassword(auth, email, defaultPassword);
          return result;
        }
        throw new Error('يرجى التواصل مع الإدارة لتفعيل حسابك');
      }
    }
    
    const email = userData.email || `${phone}@livecourses.com`;
    
    try {
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      if (error.code === 'auth/invalid-credential' || 
          error.code === 'auth/wrong-password' || 
          error.code === 'auth/user-not-found') {
        throw new Error('كلمة المرور غير صحيحة');
      }
      throw error;
    }
  };

  const register = async (userData) => {
    const { phone, email, password, parentPhone, ...profileData } = userData;
    
    const phoneQuery = query(collection(db, 'users'), where('phone', '==', phone));
    const phoneSnapshot = await getDocs(phoneQuery);
    
    if (!phoneSnapshot.empty) {
      throw new Error('رقم الهاتف مسجل بالفعل');
    }
    
    const userEmail = email || `${phone}@livecourses.com`;
    
    const userCredential = await createUserWithEmailAndPassword(auth, userEmail, password);
    
    const userProfileData = {
      ...profileData,
      phone,
      email: userEmail,
      role: 'student',
      createdAt: new Date()
    };

    if (parentPhone) {
      userProfileData.parentPhone = parentPhone;
    }

    await setDoc(doc(db, 'users', userCredential.user.uid), userProfileData);
    
    // <-- إضافة: إرسال إشعار ترحيبي -->
    sendWelcomeNotification(userCredential.user.uid, profileData.firstName);
    
    return userCredential;
  };

  const logout = () => signOut(auth);

  const value = {
    currentUser,
    userProfile,
    login,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};