import React, { useState } from "react";
import { api } from "../api.js";

export default function LoginScreen({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        if (!username || !email || !password) {
          throw new Error("يرجى تعبئة جميع الحقول المطلوبة");
        }
        const res = await api.register(username, email, password);
        if (res.success && res.user) {
          onLogin(res.user);
        }
      } else {
        if (!username || !password) {
          throw new Error("يرجى إدخال اسم المستخدم/البريد وكلمة المرور");
        }
        const res = await api.login(username, password);
        if (res.success && res.user) {
          onLogin(res.user);
        }
      }
    } catch (err) {
      setError(err.message || "حدث خطأ غير متوقع");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-slate-900 to-black flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl w-full max-w-md p-8 border border-white/20">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl mx-auto flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-indigo-500/30 mb-4">
            🎙️
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isRegister ? "إنشاء حساب جديد" : "تسجيل الدخول إلى الاستوديو"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {isRegister
              ? "أنشئ حسابك الخاص لحفظ الفيديوهات والتفريغات بشكل دائم"
              : "أدخل بيانات حسابك للوصول إلى تفريغاتك وجلساتك"}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl font-medium animate-shake">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              {isRegister ? "اسم المستخدم" : "اسم المستخدم أو البريد الإلكتروني"}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={isRegister ? "مثال: hamzakarmi" : "أدخل اسم المستخدم أو البريد"}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm outline-none transition"
              required
            />
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm outline-none transition"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              كلمة المرور
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm outline-none transition"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition duration-200 disabled:opacity-50 text-sm"
          >
            {loading ? "جاري المعالجة..." : isRegister ? "إنشاء الحساب" : "تسجيل الدخول"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError("");
            }}
            className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition"
          >
            {isRegister
              ? "لديك حساب بالفعل؟ تسجيل الدخول"
              : "ليس لديك حساب؟ إنشاء حساب جديد"}
          </button>
        </div>
      </div>
    </div>
  );
}
