
import React, { useState } from 'react';

interface LoginScreenProps {
  onLogin: (username: string, password: string) => Promise<{ success: boolean; message?: string; }>;
  onShowStudentLogin: () => void;
  onShowTrainerRegistration: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onShowStudentLogin, onShowTrainerRegistration }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const result = await onLogin(username, password);
    if (!result.success) {
      setError(result.message || 'Ocorreu um erro desconhecido.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-brand-secondary">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-2xl">
        <div>
          <h2 className="text-3xl font-extrabold text-center text-brand-dark">
            Acesso ao Painel
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Login de Admin ou Personal Trainer
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="username-input" className="sr-only">Usuário</label>
              <input
                id="username-input"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm"
                placeholder="Usuário"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password-input" className="sr-only">Senha</label>
              <input
                id="password-input"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-brand-accent focus:border-brand-accent sm:text-sm"
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
         <div className="text-center text-sm">
            <button onClick={onShowStudentLogin} className="font-medium text-brand-primary hover:text-brand-accent">
                Acessar portal do aluno
            </button>
             <span className="text-gray-400 mx-2">|</span>
             <button onClick={onShowTrainerRegistration} className="font-medium text-brand-primary hover:text-brand-accent">
                Não tem uma conta? Cadastre-se
            </button>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;