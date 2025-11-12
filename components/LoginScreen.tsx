
import React, { useState } from 'react';

interface LoginScreenProps {
  onLogin: (password: string) => boolean;
  onShowStudentLogin: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onShowStudentLogin }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = onLogin(password);
    if (!success) {
      setError('Senha incorreta. Tente novamente.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-brand-secondary">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-2xl">
        <div>
          <h2 className="text-3xl font-extrabold text-center text-brand-dark">
            Acesso Restrito
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Painel do Personal Trainer
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="password-input" className="sr-only">Password</label>
              <input
                id="password-input"
                name="password"
                type="password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-brand-accent focus:border-brand-accent focus:z-10 sm:text-sm"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent transition-colors"
            >
              Entrar
            </button>
          </div>
        </form>
         <div className="text-center">
            <button onClick={onShowStudentLogin} className="font-medium text-sm text-brand-primary hover:text-brand-accent">
                Acessar portal do aluno
            </button>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
