import React, { useState } from 'react';
import { Dumbbell } from 'lucide-react';

interface LoginProps {
  onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulated auth
    if (username === 'admin' && password === 'admin') {
      onLogin();
    } else {
      setError('Credenciales incorrectas (Prueba: admin / admin)');
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
          <h2 className="text-2xl font-bold text-center text-slate-900 dark:text-white mb-2">Bienvenido</h2>
          <p className="text-center text-slate-500 dark:text-slate-400 mb-8 font-medium">Gym Management System</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Usuario</label>
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-900 dark:text-white font-medium placeholder-slate-400 dark:placeholder-slate-500"
                placeholder="admin"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Contraseña</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-white dark:bg-slate-700 border-2 border-slate-300 dark:border-slate-600 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-900 dark:text-white font-medium placeholder-slate-400 dark:placeholder-slate-500"
                placeholder="••••••"
              />
            </div>

            {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-sm text-center font-medium border border-red-100 dark:border-red-800">{error}</div>}

            <button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold py-3.5 rounded-lg transition-colors shadow-md text-lg mt-2"
            >
              Iniciar Sesión
            </button>
          </form>
          <div className="mt-8 text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
             &copy; 2024 GymFlex System
          </div>
        </div>
      </div>
    </div>
  );
};