import React, { useState } from "react";
import LoginScreen from "./components/LoginScreen.jsx";
import UploadScreen from "./components/UploadScreen.jsx";
import TranscriptScreen from "./components/TranscriptScreen.jsx";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-xl mx-auto mt-20 bg-red-50 border border-red-200 rounded-2xl text-red-700 space-y-4 shadow-lg" dir="rtl">
          <h2 className="text-lg font-bold">حدث خطأ في عرض الصفحة</h2>
          <pre className="text-xs bg-white p-3 rounded border border-red-200 overflow-auto text-red-600">
            {String(this.state.error && this.state.error.message)}
          </pre>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
          >
            إعادة تحميل الصفحة
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem("stt_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [session, setSession] = useState(null);

  const handleLogin = (u) => {
    setUser(u);
    localStorage.setItem("stt_user", JSON.stringify(u));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("stt_user");
    setSession(null);
  };

  if (!user) {
    return (
      <ErrorBoundary>
        <LoginScreen onLogin={handleLogin} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="absolute top-4 left-4 z-50 flex items-center gap-3 bg-white px-4 py-2 rounded-xl shadow-md border border-gray-100 text-sm" dir="rtl">
        <span className="font-bold text-gray-800">👤 {user.username}</span>
        <button
          onClick={handleLogout}
          className="text-red-600 hover:text-red-700 font-medium text-xs bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition"
        >
          تسجيل الخروج
        </button>
      </div>
      {session ? (
        <TranscriptScreen
          key={session.id}
          initialSession={session}
          onBack={() => setSession(null)}
        />
      ) : (
        <UploadScreen onComplete={setSession} />
      )}
    </ErrorBoundary>
  );
}
