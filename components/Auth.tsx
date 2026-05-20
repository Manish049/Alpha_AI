import React, { useState, useMemo } from 'react';
import { User } from '../types';

interface AuthProps {
  onLogin: (user: User) => void;
  onSignup: (newUser: User) => void;
  onResetPassword: (username: string, newPass: string) => void;
  users: User[];
}

const RobotIcon = () => (
  <svg width="100" height="100" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-cyan-600 dark:text-cyan-400 drop-shadow-[0_0_15px_rgba(0,240,255,0.4)] dark:drop-shadow-[0_0_15px_rgba(0,240,255,0.7)] animate-float">
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

type AuthMode = 'login' | 'signup' | 'forgot_password';
type ForgotStage = 'search' | 'reset' | 'not_found';

const Auth: React.FC<AuthProps> = ({ onLogin, onSignup, onResetPassword, users }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  
  // Login State
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  // Signup State
  const [signupData, setSignupData] = useState<User>({
      fullName: '',
      email: '',
      phone: '',
      username: '',
      password: '',
      isActive: true
  });
  
  // Forgot Password State
  const [forgotStage, setForgotStage] = useState<ForgotStage>('search');
  const [forgotUsername, setForgotUsername] = useState('');
  const [resetPass, setResetPass] = useState('');
  const [resetPassConfirm, setResetPassConfirm] = useState('');

  const passwordStrengthInfo = useMemo(() => {
    const pass = signupData.password;
    if (!pass) return { score: 0, label: '', color: '', text: 'text-gray-400' };
    
    let criteria = 0;
    if (pass.length >= 6) criteria++;
    if (pass.length >= 10) criteria++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) criteria++;
    if (/[0-9]/.test(pass)) criteria++;
    if (/[^A-Za-z0-9]/.test(pass)) criteria++;

    // Normalize to 0-4 range for 4 bars
    // 0 criteria (but has text) -> score 0 (too short)
    // 1-2 criteria -> score 1-2
    // 3 criteria -> score 3
    // 4-5 criteria -> score 4

    let level = 0;
    if (pass.length < 6) {
        level = 0;
    } else {
        if (criteria === 1) level = 1;
        else if (criteria === 2) level = 2;
        else if (criteria === 3) level = 3;
        else if (criteria >= 4) level = 4;
    }

    const configs = [
        { label: 'Too Short', color: 'bg-red-300', text: 'text-red-300' }, // 0
        { label: 'Weak', color: 'bg-red-500', text: 'text-red-500' }, // 1
        { label: 'Fair', color: 'bg-yellow-400', text: 'text-yellow-400' }, // 2
        { label: 'Good', color: 'bg-cyan-400', text: 'text-cyan-400' }, // 3
        { label: 'Strong', color: 'bg-green-500', text: 'text-green-500' }, // 4
    ];

    return { 
        score: level, 
        config: configs[level] 
    };
  }, [signupData.password]);

  const handleLogin = (e: React.FormEvent) => {
      e.preventDefault();
      const user = users.find(u => (u.username === loginUser || u.email === loginUser) && u.password === loginPass);
      
      if (user) {
          if (user.isActive === false) {
              setLoginError("Account is inactive. Contact admin.");
          } else {
              onLogin(user);
          }
      } else {
          setLoginError("Invalid username or password");
      }
  };

  const handleSignup = (e: React.FormEvent) => {
      e.preventDefault();
      if (users.find(u => u.username === signupData.username)) {
          alert("Username already exists");
          return;
      }
      onSignup(signupData);
  };
  
  const handleForgotSearch = (e: React.FormEvent) => {
      e.preventDefault();
      const user = users.find(u => u.username === forgotUsername);
      if (user) {
          setForgotStage('reset');
      } else {
          setForgotStage('not_found');
      }
  };

  const handlePasswordReset = (e: React.FormEvent) => {
      e.preventDefault();
      if (resetPass !== resetPassConfirm) {
          alert("Passwords do not match");
          return;
      }
      onResetPassword(forgotUsername, resetPass);
      alert("Password reset successful. Please login.");
      setMode('login');
      setForgotStage('search');
      setForgotUsername('');
      setResetPass('');
      setResetPassConfirm('');
  };

  return (
    <div className="w-full max-w-md animate-spring-up">
      <div className="glass-panel p-8 rounded-[32px] shadow-2xl relative overflow-hidden border-t border-white/20">
         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50"></div>
         
         <div className="flex justify-center mb-8">
            <RobotIcon />
         </div>

         <h2 className="text-3xl font-bold text-center mb-2 text-gray-900 dark:text-white tracking-tight">
            {mode === 'login' && 'AI Helpdesk'}
            {mode === 'signup' && 'Create Account'}
            {mode === 'forgot_password' && 'Reset Password'}
         </h2>
         <p className="text-center text-gray-500 dark:text-gray-400 mb-8 text-sm">
            {mode === 'login' && 'Sign in to access your dashboard'}
            {mode === 'signup' && 'Get started with Roboto Ai'}
            {mode === 'forgot_password' && 'Recover your account access'}
         </p>

         {mode === 'login' && (
             <form onSubmit={handleLogin} className="space-y-5">
                 <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Username or Email</label>
                    <input 
                        type="text" 
                        value={loginUser} 
                        onChange={e => setLoginUser(e.target.value)} 
                        className="w-full p-4 glass-input rounded-2xl focus:outline-none text-gray-900 dark:text-white transition-all placeholder-gray-400"
                        placeholder="Enter your username or email"
                        required
                    />
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Password</label>
                    <input 
                        type="password" 
                        value={loginPass} 
                        onChange={e => setLoginPass(e.target.value)} 
                        className="w-full p-4 glass-input rounded-2xl focus:outline-none text-gray-900 dark:text-white transition-all placeholder-gray-400"
                        placeholder="••••••••"
                        required
                    />
                 </div>
                 
                 {loginError && <p className="text-red-500 text-sm text-center font-medium bg-red-100 dark:bg-red-500/10 py-2 rounded-lg">{loginError}</p>}

                 <button type="submit" className="w-full bg-cyan-400 hover:bg-cyan-300 text-black font-bold py-4 rounded-2xl shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:shadow-[0_0_30px_rgba(0,240,255,0.5)] transition-all active:scale-95 text-lg">
                    Sign In
                 </button>

                 <div className="flex flex-wrap items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-white/10 gap-2">
                    <button 
                        type="button" 
                        onClick={() => setMode('forgot_password')}
                        className="text-sm text-gray-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                    >
                        Forgot Password?
                    </button>
                    <button 
                        type="button" 
                        onClick={() => setMode('signup')}
                        className="text-sm font-bold text-cyan-600 dark:text-cyan-400 hover:text-cyan-500 transition-colors"
                    >
                        Create an account
                    </button>
                 </div>
             </form>
         )}

         {mode === 'signup' && (
             <form onSubmit={handleSignup} className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Full Name</label>
                        <input 
                            className="w-full p-3 glass-input rounded-xl focus:outline-none text-gray-900 dark:text-white"
                            placeholder="John Doe"
                            value={signupData.fullName}
                            onChange={e => setSignupData({...signupData, fullName: e.target.value})}
                            required
                        />
                     </div>
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase ml-1">Username</label>
                        <input 
                            className="w-full p-3 glass-input rounded-xl focus:outline-none text-gray-900 dark:text-white"
                            placeholder="johndoe"
                            value={signupData.username}
                            onChange={e => setSignupData({...signupData, username: e.target.value})}
                            required
                        />
                     </div>
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Email</label>
                    <input 
                        type="email"
                        className="w-full p-3 glass-input rounded-xl focus:outline-none text-gray-900 dark:text-white"
                        placeholder="john@example.com"
                        value={signupData.email}
                        onChange={e => setSignupData({...signupData, email: e.target.value})}
                        required
                    />
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Phone</label>
                    <input 
                        className="w-full p-3 glass-input rounded-xl focus:outline-none text-gray-900 dark:text-white"
                        placeholder="+1 (555) 000-0000"
                        value={signupData.phone}
                        onChange={e => setSignupData({...signupData, phone: e.target.value})}
                        required
                    />
                 </div>
                 <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase ml-1">Password</label>
                    <input 
                        type="password"
                        className="w-full p-3 glass-input rounded-xl focus:outline-none text-gray-900 dark:text-white"
                        placeholder="Create a password"
                        value={signupData.password}
                        onChange={e => setSignupData({...signupData, password: e.target.value})}
                        required
                    />
                    {signupData.password && (
                        <div className="mt-2 animate-spring-up">
                            <div className="flex gap-1 h-1.5">
                                {[1, 2, 3, 4].map((level) => (
                                    <div 
                                        key={level}
                                        className={`flex-1 rounded-full transition-colors duration-300 ${
                                            level <= passwordStrengthInfo.score 
                                                ? passwordStrengthInfo.config.color 
                                                : 'bg-gray-200 dark:bg-white/10'
                                        }`}
                                    />
                                ))}
                            </div>
                            <p className={`text-xs mt-1 text-right font-bold transition-colors duration-300 ${passwordStrengthInfo.config.text}`}>
                                {passwordStrengthInfo.config.label}
                            </p>
                        </div>
                    )}
                 </div>

                 <button type="submit" className="w-full bg-cyan-400 hover:bg-cyan-300 text-black font-bold py-3.5 rounded-xl shadow-lg transition-all active:scale-95 mt-2">
                    Sign Up
                 </button>

                 <div className="text-center mt-4">
                    <button 
                        type="button" 
                        onClick={() => setMode('login')}
                        className="text-sm text-gray-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                    >
                        Already have an account? Sign in
                    </button>
                 </div>
             </form>
         )}

         {mode === 'forgot_password' && (
             <div className="space-y-5">
                 {forgotStage === 'search' && (
                     <form onSubmit={handleForgotSearch} className="space-y-5">
                         <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Username</label>
                            <input 
                                type="text" 
                                value={forgotUsername} 
                                onChange={e => setForgotUsername(e.target.value)} 
                                className="w-full p-4 glass-input rounded-2xl focus:outline-none text-gray-900 dark:text-white"
                                placeholder="Enter your username"
                                required
                            />
                         </div>
                         <button type="submit" className="w-full bg-cyan-400 hover:bg-cyan-300 text-black font-bold py-3.5 rounded-xl shadow-lg transition-all active:scale-95">
                            Find Account
                         </button>
                     </form>
                 )}

                 {forgotStage === 'not_found' && (
                     <div className="text-center py-4">
                         <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                            </svg>
                         </div>
                         <p className="text-gray-900 dark:text-white font-bold mb-2">Account Not Found</p>
                         <p className="text-gray-500 text-sm mb-6">We couldn't find a user with that username.</p>
                         <button onClick={() => setForgotStage('search')} className="text-cyan-600 font-bold hover:underline">Try Again</button>
                     </div>
                 )}

                 {forgotStage === 'reset' && (
                     <form onSubmit={handlePasswordReset} className="space-y-4">
                         <div className="p-3 bg-cyan-50 dark:bg-cyan-900/10 rounded-xl mb-2 border border-cyan-100 dark:border-cyan-500/10 flex items-center">
                             <CheckIcon className="text-cyan-500 mr-2" />
                             <span className="text-sm text-cyan-800 dark:text-cyan-200">Account found for <strong>@{forgotUsername}</strong></span>
                         </div>
                         <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1">New Password</label>
                            <input 
                                type="password" 
                                value={resetPass} 
                                onChange={e => setResetPass(e.target.value)} 
                                className="w-full p-3 glass-input rounded-xl focus:outline-none text-gray-900 dark:text-white"
                                placeholder="New password"
                                required
                            />
                         </div>
                         <div className="space-y-1">
                            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Confirm Password</label>
                            <input 
                                type="password" 
                                value={resetPassConfirm} 
                                onChange={e => setResetPassConfirm(e.target.value)} 
                                className="w-full p-3 glass-input rounded-xl focus:outline-none text-gray-900 dark:text-white"
                                placeholder="Confirm new password"
                                required
                            />
                         </div>
                         <button type="submit" className="w-full bg-cyan-400 hover:bg-cyan-300 text-black font-bold py-3.5 rounded-xl shadow-lg transition-all active:scale-95">
                            Reset Password
                         </button>
                     </form>
                 )}

                 <div className="text-center mt-4 pt-4 border-t border-gray-200 dark:border-white/10">
                    <button 
                        type="button" 
                        onClick={() => {
                            setMode('login');
                            setForgotStage('search');
                            setForgotUsername('');
                        }}
                        className="text-sm text-gray-500 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                    >
                        Back to Sign In
                    </button>
                 </div>
             </div>
         )}
      </div>
    </div>
  );
};

export default Auth;