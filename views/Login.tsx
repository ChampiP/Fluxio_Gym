import React, { useState } from 'react';
import { Dumbbell, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../services/supabase';

interface LoginProps {
  onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;
      
      if (data.user) {
        onLogin();
      }
    } catch (error: any) {
      setError(error.message || 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4 transition-colors duration-200">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700">

        <div className="p-8 w-full">
          <div className="flex justify-center mb-6 text-blue-600 dark:text-blue-400">
            <div className="p-3 bg-blue-50 dark:bg-slate-700 rounded-full border border-blue-100 dark:border-slate-600">
              <Dumbbell size={40} />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-slate-900 dark:text-white mb-2">
            Iniciar Sesión
          </h2>
          <p className="text-center text-slate-500 dark:text-slate-400 mb-8 font-medium">GymFlex Pro</p>

          <form onSubmit={handleSignIn} className="space-y-5">

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                <span className="flex items-center gap-2">
                  <Mail size={16} />
                  <span>Email</span>
                </span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-all duration-200 text-sm"
                placeholder="tu@email.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                <span className="flex items-center gap-2">
                  <Lock size={16} />
                  <span>Contraseña</span>
                </span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-all duration-200 text-sm"
                  placeholder="Tu contraseña"
                  required
                  minLength={6}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-red-700 bg-red-50 border border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800 text-sm p-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-xl transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 text-sm disabled:cursor-not-allowed"
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};