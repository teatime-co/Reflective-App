import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const navigate = useNavigate();

  const handleSuccess = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-slate-900">Reflective</h1>
          <p className="text-slate-500">Your private journaling companion</p>
        </div>

        {mode === 'login' ? (
          <LoginForm onSuccess={handleSuccess} onRegisterClick={() => setMode('register')} />
        ) : (
          <RegisterForm onSuccess={handleSuccess} onLoginClick={() => setMode('login')} />
        )}
      </div>
    </div>
  );
}
