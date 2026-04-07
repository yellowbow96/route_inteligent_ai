import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState(null);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      if (isLogin) {
        await login(username, password);
      } else {
        await register(username, password, fullName);
      }
      navigate('/profile');
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen relative overflow-hidden backdrop-blur-md">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-neonBlue/20 rounded-full blur-[100px] -translate-y-1/2" />
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-neonOrange/20 rounded-full blur-[100px]" />
      
      <div className="relative z-10 w-full max-w-md p-8 bg-gray-800/80 border border-gray-700/50 rounded-2xl shadow-2xl backdrop-blur-xl">
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-black font-mono tracking-tighter text-white mb-2">
            RIDER<span className="text-neonBlue">INTEL</span>
          </h1>
          <div className="h-1 w-20 bg-gradient-to-r from-neonBlue to-neonOrange mx-auto rounded-full"></div>
          <p className="text-gray-400 text-xs mt-4 font-bold tracking-[0.3em] uppercase">V3 Intelligent Systems</p>
        </div>

        <h2 className="text-xl font-bold text-center mb-8 text-gray-300">
          {isLogin ? 'MISSION CONTROL LOGIN' : 'RECRUIT NEW RIDER'}
        </h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 text-red-200 rounded-lg text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-neonBlue focus:ring-1 focus:ring-neonBlue transition-all"
                required
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-neonBlue focus:ring-1 focus:ring-neonBlue transition-all"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-neonBlue focus:ring-1 focus:ring-neonBlue transition-all"
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-neonBlue hover:bg-neonBlue/80 text-gray-900 font-bold py-3 rounded-lg transition-transform hover:scale-[1.02] active:scale-95 shadow-[0_0_15px_rgba(0,243,255,0.4)]"
          >
            {isLogin ? 'IGNITION' : 'CREATE ACCOUNT'}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-400 text-sm">
          {isLogin ? "New rider?" : "Already have an account?"}{' '}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-neonOrange hover:text-neonOrange/80 font-semibold transition-colors"
          >
            {isLogin ? 'Register here' : 'Login here'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;
