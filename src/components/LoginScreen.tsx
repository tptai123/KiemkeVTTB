import React, { useState } from 'react';
import {
  Boxes,
  Lock,
  Mail,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { signIn } from '../services/authService';
import { UserInfo } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: UserInfo) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLoginSuccess,
  onShowToast,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Field validation errors
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let hasError = false;
    if (!email.trim()) {
      setEmailError('Vui lòng nhập EMAIL');
      hasError = true;
    } else {
      setEmailError(null);
    }

    if (!password) {
      setPasswordError('Vui lòng nhập mật khẩu');
      hasError = true;
    } else {
      setPasswordError(null);
    }

    if (hasError) return;

    setIsLoading(true);

    try {
      const user = await signIn(email, password);
      onLoginSuccess(user);
    } catch (err: unknown) {
      console.warn('Login attempt failed:', err);
      const msg =
        err && typeof err === 'object' && 'message' in err && (err as { message: unknown }).message
          ? String((err as { message: unknown }).message)
          : 'Tài khoản hoặc mật khẩu không đúng';
      onShowToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full relative flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans selection:bg-blue-600 selection:text-white bg-slate-900 bg-cover bg-center bg-no-repeat overflow-x-hidden"
      style={{
        backgroundImage: `url('https://izangkbanoxeivphmwyc.supabase.co/storage/v1/object/public/File%20all/backgroud_webapp.png')`,
      }}
    >
      {/* Soft overlay to ensure high contrast and readability */}
      <div className="absolute inset-0 bg-slate-950/30 pointer-events-none" />

      {/* Login Card - Centered on screen */}
      <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/40 p-6 sm:p-8 z-10 animate-fade-in relative mx-auto">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-linear-to-tr from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/30 mb-3">
            <Boxes className="w-8 h-8" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
            Quản lý kiểm kê
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
            Đăng nhập hệ thống quản lý & kiểm kê VTTB
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              EMAIL
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                placeholder="Nhập địa chỉ email..."
                className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 transition-all font-medium ${
                  emailError
                    ? 'border-red-400 focus:ring-red-400 focus:border-red-400 bg-red-50/20'
                    : 'border-slate-200 focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
            </div>
            {/* Cảnh báo chữ đỏ tại dòng trường trống */}
            {emailError && (
              <p className="mt-1 text-xs text-red-600 font-semibold flex items-center gap-1 animate-fade-in">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{emailError}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Mật khẩu
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError(null);
                }}
                placeholder="Nhập mật khẩu..."
                className={`w-full pl-10 pr-10 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 transition-all font-medium ${
                  passwordError
                    ? 'border-red-400 focus:ring-red-400 focus:border-red-400 bg-red-50/20'
                    : 'border-slate-200 focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-hidden cursor-pointer"
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {/* Cảnh báo chữ đỏ tại dòng trường trống */}
            {passwordError && (
              <p className="mt-1 text-xs text-red-600 font-semibold flex items-center gap-1 animate-fade-in">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{passwordError}</span>
              </p>
            )}
          </div>

          {/* Remember me */}
          <div className="flex items-center text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-600 font-medium">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
              />
              <span>Ghi nhớ đăng nhập</span>
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-3 py-3 px-4 bg-linear-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-[0.99] disabled:opacity-60 text-sm cursor-pointer"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Đăng nhập hệ thống</span>
              </>
            )}
          </button>
        </form>

        {/* Security badge footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-center flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Bảo mật dữ liệu với Supabase Authentication</span>
        </div>
      </div>
    </div>
  );
};
