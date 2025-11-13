
import React, { useState } from 'react';
import { ExclamationCircleIcon } from '../icons';

interface StudentLoginProps {
  onLogin: (email: string) => Promise<{ success: boolean; message?: string }>;
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
    const result = await onLogin(email);
    if (!result.success) {
      setError(result.message || 'Ocorreu um erro desconhecido. Tente novamente.');
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
        
        {error && (
             <div className="m-4 sm:m-2 lg:m-2 bg-red-50 border border-red-200 p-4 rounded-lg shadow-sm">
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        <ExclamationCircleIcon className="h-8 w-8 text-red-500" />
                    </div>
                    <div className="ml-3 flex-1">
                        <h3 className="text-lg font-bold text-red-800">Erro de Acesso</h3>
                         {error === "CONNECTION_ERROR" ? (
                             <div className="mt-2 text-sm text-red-700 space-y-3">
                                <p>A aplicação não pôde se conectar ao banco de dados. Para diagnosticar, siga os passos abaixo:</p>
                                
                                <div className="p-2 bg-red-100 rounded-md border border-red-300">
                                    <h4 className="font-bold text-red-900">Diagnóstico Avançado</h4>
                                    <ol className="list-decimal list-inside space-y-1 mt-1 text-red-800">
                                        <li>Pressione <strong className="font-mono bg-white text-red-900 px-1 py-0.5 rounded">F12</strong> para abrir o "Console do Desenvolvedor".</li>
                                        <li>Procure por um erro em vermelho começando com <strong className="font-mono">"Firebase Connection Error Details:"</strong>.</li>
                                        <li>O erro exato (ex: <strong className="font-mono">permission-denied</strong>) irá indicar a causa real do problema.</li>
                                    </ol>
                                </div>
                                <p>Com o erro em mãos, verifique sua configuração no arquivo <strong>`firebase.ts`</strong> e as <strong>Regras de Segurança</strong> no Firebase Console.</p>
                            </div>
                        ) : (
                            <div className="mt-2 text-sm text-red-700">
                               <p>{error}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
          )}
          
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