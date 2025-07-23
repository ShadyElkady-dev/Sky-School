// src/components/Auth/Login.js
import React, { useState, useEffect } from 'react';
import { Phone, Lock, GraduationCap, Eye, EyeOff, Loader } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const Login = ({ onSwitchToRegister }) => {
  const { login } = useAuth();
  const [loginData, setLoginData] = useState({ phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  // تأثير الظهور التدريجي
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await login(loginData.phone, loginData.password);
      setLoginData({ phone: '', password: '' });
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* تأثيرات الخلفية المتحركة */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      <div className={`
        relative z-10 bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 w-full max-w-md 
        border border-white/20 transition-all duration-1000 transform
        ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}
      `}>
        {/* اللوجو مع أنيميشن */}
        <div className="text-center mb-8">
          <div className={`
            w-24 h-24 bg-gradient-to-br from-white/20 to-white/10 rounded-full 
            flex items-center justify-center mx-auto mb-4 shadow-lg
            transition-all duration-1000 transform hover:scale-110 hover:rotate-12
            ${mounted ? 'scale-100 rotate-0' : 'scale-50 rotate-180'}
          `}>
            <GraduationCap className="text-white animate-bounce" size={36} />
          </div>
          <h1 className={`
            text-3xl font-bold bg-gradient-to-r from-white via-purple-200 to-blue-200 
            bg-clip-text text-transparent mb-2 transition-all duration-1000
            ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'}
          `}>
            SKY SCHOOL
          </h1>
          <p className={`
            text-white/70 text-sm transition-all duration-1000 delay-200
            ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'}
          `}>
            طريقك نحو التميز
          </p>
        </div>
        
        <h2 className={`
          text-2xl font-bold text-white text-center mb-8 transition-all duration-1000 delay-300
          ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'}
        `}>
          تسجيل الدخول
        </h2>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-white p-4 rounded-xl mb-6 backdrop-blur-sm animate-shake">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
              {error}
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* حقل رقم الهاتف */}
          <div className={`
            relative transition-all duration-700 delay-400 transform
            ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'}
          `}>
            <Phone className="absolute right-4 top-4 text-white/60 transition-colors duration-300" size={20} />
            <input
              type="tel"
              placeholder="رقم الهاتف"
              value={loginData.phone}
              onChange={(e) => setLoginData({...loginData, phone: e.target.value})}
              className="
                w-full bg-white/10 border border-white/20 rounded-xl pr-12 pl-4 py-4 
                text-white placeholder-white/60 focus:outline-none focus:border-white/40 
                focus:bg-white/15 transition-all duration-300 hover:bg-white/12
                focus:scale-105 focus:shadow-lg backdrop-blur-sm h-14
              "
              required
              disabled={loading}
              dir="ltr"
            />
          </div>
          
          {/* حقل كلمة المرور */}
          <div className={`
            relative transition-all duration-700 delay-500 transform
            ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'}
          `}>
            <Lock className="absolute right-4 top-4 text-white/60 transition-colors duration-300" size={20} />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="كلمة المرور"
              value={loginData.password}
              onChange={(e) => setLoginData({...loginData, password: e.target.value})}
              className="
                w-full bg-white/10 border border-white/20 rounded-xl pr-12 pl-12 py-4 
                text-white placeholder-white/60 focus:outline-none focus:border-white/40 
                focus:bg-white/15 transition-all duration-300 hover:bg-white/12
                focus:scale-105 focus:shadow-lg backdrop-blur-sm h-14
              "
              required
              disabled={loading}
              dir="ltr"
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="
                absolute left-4 top-4 text-white/60 hover:text-white/80 
                transition-all duration-300 hover:scale-110
              "
              disabled={loading}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          
          {/* زر تسجيل الدخول */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl py-4 font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-700 transform hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none focus:ring-4 focus:ring-white/20 h-14 ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'} ${loading ? 'animate-pulse' : ''}`}

          >
            <div className="flex items-center justify-center gap-2">
              {loading && <Loader className="animate-spin" size={20} />}
              {loading ? 'جاري الدخول...' : 'دخول'}
            </div>
          </button>
          
          {/* رابط التسجيل */}
          <p className={`
            text-center text-white/80 transition-all duration-700 delay-700
            ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-5 opacity-0'}
          `}>
            ليس لديك حساب؟{' '}
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="
                text-white font-semibold hover:underline transition-all duration-300 
                hover:text-purple-200 hover:scale-105 inline-block
              "
              disabled={loading}
            >
              سجل الآن
            </button>
          </p>
        </form>

        {/* مؤشرات بصرية إضافية */}
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full animate-ping opacity-20"></div>
      </div>

      {/* أنيميشن CSS إضافي */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default Login