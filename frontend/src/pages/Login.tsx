import { useState } from 'react';
import { MStripe } from '@/components/ui/MStripe';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

/**
 * Login — Canvas preto puro, logo centralizado + M-stripe + formulário.
 */
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoggingIn, loginError } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login({ email, password });
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-md">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-xl">
          <h1 className="text-display-lg text-ink uppercase tracking-tight leading-none">
            MEGA
            <span className="text-muted ml-2 font-light">CRM</span>
          </h1>
          <MStripe className="mt-md mx-auto max-w-[200px]" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-md" id="login-form">
          <div className="space-y-xs">
            <label
              htmlFor="login-email"
              className="text-label text-muted block"
            >
              Email
            </label>
            <Input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              autoComplete="email"
              required
              autoFocus
            />
          </div>

          <div className="space-y-xs">
            <label
              htmlFor="login-password"
              className="text-label text-muted block"
            >
              Senha
            </label>
            <Input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          {/* Error */}
          {loginError && (
            <p className="text-body-sm text-m-red">
              Credenciais inválidas. Tente novamente.
            </p>
          )}

          {/* Submit */}
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={isLoggingIn}
            id="login-submit"
          >
            {isLoggingIn ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        {/* Footer */}
        <p className="text-caption text-muted text-center mt-xl">
          Mega CRM — Lucas Borges Studio © 2026
        </p>
      </div>
    </div>
  );
}
