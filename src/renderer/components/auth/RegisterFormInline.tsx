import React, { useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface RegisterFormInlineProps {
  onSuccess?: () => void;
  onLoginClick?: () => void;
}

export function RegisterFormInline({ onSuccess, onLoginClick }: RegisterFormInlineProps) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState('');

  const { register, isLoading, error, clearError } = useAuthStore();

  const validateForm = (): boolean => {
    if (!email || !email.includes('@')) {
      setValidationError('Please enter a valid email address');
      return false;
    }
    if (!displayName || displayName.trim().length === 0) {
      setValidationError('Please enter a display name');
      return false;
    }
    if (!password || password.length < 6) {
      setValidationError('Password must be at least 6 characters');
      return false;
    }
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
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

    const success = await register({
      email,
      password,
      display_name: displayName,
    });

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
        <label htmlFor="displayName" className="text-sm font-medium">
          Display Name
        </label>
        <Input
          id="displayName"
          type="text"
          placeholder="Your name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          disabled={isLoading}
          autoComplete="name"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <Input
          id="password"
          type="password"
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          autoComplete="new-password"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="confirmPassword" className="text-sm font-medium">
          Confirm Password
        </label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="Re-enter your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isLoading}
          autoComplete="new-password"
        />
      </div>

      {(validationError || error) && (
        <div className="text-sm text-red-500 bg-red-50 p-3 rounded-md">
          {validationError || (typeof error === 'string' ? error : JSON.stringify(error))}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Creating account...' : 'Register'}
      </Button>

      {onLoginClick && (
        <div className="text-center text-sm">
          <span className="text-slate-500">Already have an account? </span>
          <button
            type="button"
            onClick={onLoginClick}
            className="text-slate-900 hover:underline font-medium"
            disabled={isLoading}
          >
            Login
          </button>
        </div>
      )}
    </form>
  );
}
