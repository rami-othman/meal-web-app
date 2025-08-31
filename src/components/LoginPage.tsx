import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import {API_BASE} from "../lib/api";
interface LoginPageProps {
  onLogin: () => void; // يُستدعى بعد نجاح الدخول (مثلاً: توجيه للداشبورد)
}

type TokenResponse = {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  id_token?: string;
  refresh_token?: string;
};

export function LoginPage({ onLogin }: LoginPageProps) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.username || !formData.password) {
      setErrorMsg('Please enter both username and password.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/connect/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'password',
          client_id: 'MEALTeam_App',
          username: formData.username,
          password: formData.password,
          scope: 'MEALTeam openid profile email roles phone address offline_access',
        }),
      });

      if (!res.ok) {
        // حاول قراءة رسالة خطأ من السيرفر إن وجدت
        let serverMsg = 'Login failed. Check your credentials.';
        try {
          const maybeJson = await res.json();
          if (maybeJson.error_description) serverMsg = maybeJson.error_description;
          else if (maybeJson.error) serverMsg = String(maybeJson.error);
        } catch {
          // تجاهل parsing error
        }
        throw new Error(serverMsg);
      }

      const data = (await res.json()) as TokenResponse;

      // التخزين: استخدم localStorage إذا Remember me مفعّل، وإلا sessionStorage
      const store = formData.rememberMe ? window.localStorage : window.sessionStorage;
      store.setItem('access_token', data.access_token);
      if (data.refresh_token) store.setItem('refresh_token', data.refresh_token);
      if (data.id_token) store.setItem('id_token', data.id_token);
      store.setItem('token_type', data.token_type);
      store.setItem('token_expires_in', String(data.expires_in));
      store.setItem('auth_username', formData.username);

      onLogin(); // نجاح
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unexpected error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    // Placeholder - لاحقاً اربطه بمسار OIDC Authorization Code
    setErrorMsg('Google Sign-In is not configured yet.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-full mb-4">
            <span className="text-white font-bold text-lg">M</span>
          </div>
          <h1 className="text-white text-xl font-semibold mb-2">MEAL Managers</h1>
          <h2 className="text-white text-2xl font-bold mb-2">Measure. Learn. Improve.</h2>
          <p className="text-blue-200 text-sm">Sign in to manage projects, visits, and accountability.</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Welcome back</h3>
            <p className="text-gray-600 text-sm">Sign in to your MEAL Manager account</p>
          </div>

          {errorMsg && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <div className="relative">
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                  placeholder="admin"
                  required
                  disabled={submitting}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                  placeholder="••••••"
                  required
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  disabled={submitting}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">

            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`w-full text-white py-3 px-4 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors
                ${submitting ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>


          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              By continuing you agree to our{' '}
              <a href="#" className="text-blue-600 hover:text-blue-800">Terms</a>
              {' '} & {' '}
              <a href="#" className="text-blue-600 hover:text-blue-800">Privacy</a>
            </p>
          </div>
        </div>

        {/* (اختياري) تلميحات تقنية صغيرة */}
        <p className="mt-4 text-center text-xs text-blue-100">
          Having issues? Ensure CORS is allowed on the token endpoint and the URL is HTTPS.
        </p>
      </div>
    </div>
  );
}
