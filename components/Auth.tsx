import React, { useState, useMemo } from 'react';
import { User } from '../types';

interface AuthProps {
  onLogin: (user: User) => void;
  onSignup: (newUser: User) => void;
  users: User[];
}

const RobotIcon = () => (
  <svg width="100" height="100" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-cyan-400 drop-shadow-[0_0_15px_rgba(0,240,255,0.7)]">
    <path d="M12 2L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17 3.34155C18.9997 4.22717 20.5 6.42857 20.5 9V12C20.5 14.7614 18.2614 17 15.5 17H8.5C5.73858 17 3.5 14.7614 3.5 12V9C3.5 6.42857 5.00031 4.22717 7 3.34155" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7.5 17L7.5 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16.5 17L16.5 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="9" cy="10" r="1.5" fill="currentColor"/>
    <circle cx="15" cy="10" r="1.5" fill="currentColor"/>
  </svg>
);

const CheckIcon = ({ className }: { className: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className={`w-4 h-4 ${className}`}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
);

const Auth: React.FC<AuthProps> = ({ onLogin, onSignup, users }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    username: '',
    password: '',
  });

  const { password } = formData;
  const passLength = useMemo(() => password.length >= 8, [password]);
  const passUpper = useMemo(() => /[A-Z]/.test(password), [password]);
  const passLower = useMemo(() => /[a-z]/.test(password), [password]);
  const passNumber = useMemo(() => /[0-9]/.test(password), [password]);
  const passSpecial = useMemo(() => /[\W_]/.test(password), [password]);

  const isPasswordValid = passLength && passUpper && passLower && passNumber && passSpecial;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (isLogin) {
      // Special case for hardcoded admin user
      if (formData.username === 'admin' && formData.password === '1234') {
        onLogin({
          username: 'admin',
          password: '1234',
          fullName: 'Administrator',
          email: 'admin@system.io',
          phone: '000-000-0000',
        });
        return;
      }

      const user = users.find(u => u.username === formData.username);
      if (user && user.password === formData.password) {
        onLogin(user);
      } else {
        setError('Invalid username or password.');
      }
    } else {
      if (users.some(u => u.username === formData.username) || formData.username === 'admin') {
        setError('Username already exists.');
        return;
      }
      if (!isPasswordValid) {
        setError('Password does not meet the requirements.');
        return;
      }
      const newUser: User = { ...formData };
      onSignup(newUser);
    }
  };

  return (
    <div className="w-full max-w-md bg-black/30 backdrop-blur-2xl rounded-3xl shadow-2xl border border-cyan-300/20 flex flex-col overflow-hidden p-8">
      <div className="text-center mb-6">
        <div className="inline-block mb-4"><RobotIcon /></div>
        <h1 className="text-3xl font-bold text-cyan-300 tracking-wider">Roboto Ai Helpdesk</h1>
        <p className="text-gray-400 mt-2">{isLogin ? 'Sign in to continue' : 'Create your account'}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <>
            <input name="fullName" type="text" placeholder="Full Name" required onChange={handleChange} className="w-full p-3 bg-black/30 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:outline-none text-white placeholder-gray-500 border border-white/20" />
            <input name="email" type="email" placeholder="Email" required onChange={handleChange} className="w-full p-3 bg-black/30 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:outline-none text-white placeholder-gray-500 border border-white/20" />
            <input name="phone" type="tel" placeholder="Phone Number" required onChange={handleChange} className="w-full p-3 bg-black/30 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:outline-none text-white placeholder-gray-500 border border-white/20" />
          </>
        )}
        <input name="username" type="text" placeholder="Username" required onChange={handleChange} className="w-full p-3 bg-black/30 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:outline-none text-white placeholder-gray-500 border border-white/20" />
        <input name="password" type="password" placeholder="Password" required onChange={handleChange} className="w-full p-3 bg-black/30 rounded-lg focus:ring-2 focus:ring-cyan-400 focus:outline-none text-white placeholder-gray-500 border border-white/20" />

        {!isLogin && formData.password && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-400 pl-2">
                <div className={`flex items-center transition-colors ${passLength ? 'text-green-400' : ''}`}><CheckIcon className="mr-2"/> At least 8 characters</div>
                <div className={`flex items-center transition-colors ${passUpper ? 'text-green-400' : ''}`}><CheckIcon className="mr-2"/> One uppercase letter</div>
                <div className={`flex items-center transition-colors ${passLower ? 'text-green-400' : ''}`}><CheckIcon className="mr-2"/> One lowercase letter</div>
                <div className={`flex items-center transition-colors ${passNumber ? 'text-green-400' : ''}`}><CheckIcon className="mr-2"/> One number</div>
                <div className={`flex items-center transition-colors ${passSpecial ? 'text-green-400' : ''}`}><CheckIcon className="mr-2"/> One special character</div>
            </div>
        )}

        {error && <p className="text-red-400 text-xs text-center">{error}</p>}

        <button type="submit" className="w-full bg-cyan-400 hover:bg-cyan-300 text-black font-bold py-3 px-4 rounded-lg focus:outline-none focus:shadow-outline transition-colors disabled:opacity-50">
          {isLogin ? 'Login' : 'Sign Up'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-sm text-cyan-400 hover:text-cyan-300 hover:underline">
          {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Login"}
        </button>
      </div>
    </div>
  );
};

export default Auth;