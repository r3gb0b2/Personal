
import React, { useState } from 'react';

interface StudentLoginProps {
  onLogin: (email: string) => Promise<boolean>;
  onBackToTrainerLogin: () => void;
  isLoading: boolean;
}

const StudentLogin: React.FC<StudentLoginProps> = ({ onLogin, onBackToTrainerLogin, isLoading }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email) {
        setError('Por favor, insira seu email.');
        return;
    }
    const success = await onLogin(email);
    if (!success) {
      setError('Nenhum aluno encontrado com este email. Verifique o email digitado.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-brand-secondary">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-2xl">
        <div>
          <h2 className="text-3xl font-extrabold text-center text-brand-dark">
            Portal do Aluno
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Consulte suas aulas e pagamentos
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">Email</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-brand-accent focus:border-brand-accent focus:z-10 sm:text-sm"
                placeholder="Seu email de cadastro"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-accent transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Carregando...' : 'Acessar'}
            </button>
          </div>
        </form>
         <div className="text-center">
            <button onClick={onBackToTrainerLogin} className="font-medium text-sm text-brand-primary hover:text-brand-accent">
                Voltar para o login do personal
            </button>
        </div>
      </div>
    </div>
  );
};

export default StudentLogin;
