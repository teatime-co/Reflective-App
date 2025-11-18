import React, { useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface LoginFormInlineProps {
  onSuccess?: () => void;
  onRegisterClick?: () => void;
}

export function LoginFormInline({ onSuccess, onRegisterClick }: LoginFormInlineProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const { login, isLoading, error, clearError } = useAuthStore();

  const validateForm = (): boolean => {
    if (!email || !email.includes('@')) {
      setValidationError('Please enter a valid email address');
      return false;
    }
    if (!password || password.length < 6) {
      setValidationError('Password must be at least 6 characters');
      return false;
    }
    setValidationError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!validateForm()) {
      return;
    }

    const success = await login({ email, password });
    if (success && onSuccess) {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          autoComplete="email"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <Input
          id="password"
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          autoComplete="current-password"
        />
      </div>

      {(validationError || error) && (
        <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md">
          {validationError || (typeof error === 'string' ? error : JSON.stringify(error))}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </Button>

      {onRegisterClick && (
        <div className="text-center text-sm">
          <span className="text-slate-500">Don't have an account? </span>
          <button
            type="button"
            onClick={onRegisterClick}
            className="text-slate-900 hover:underline font-medium"
            disabled={isLoading}
          >
            Register
          </button>
        </div>
      )}
    </form>
  );
}
