
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
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg shadow-sm">
                  <div className="flex items-start">
                      <div className="flex-shrink-0">
                          <ExclamationCircleIcon className="h-6 w-6 text-red-500" />
                      </div>
                      <div className="ml-3 w-full">
                          <h3 className="text-base font-bold text-red-800">Erro de Acesso</h3>
                           {error === "CONNECTION_ERROR" ? (
                                <div className="mt-2 text-sm text-red-700 space-y-2">
                                    <p className="font-semibold">Não foi possível conectar ao banco de dados. Por favor, verifique os seguintes pontos:</p>
                                    <ol className="list-decimal list-inside space-y-1 pl-2">
                                        <li>
                                            <strong>Arquivo `firebase.ts`:</strong> Confirme se as credenciais estão corretas.
                                        </li>
                                        <li>
                                            <strong>Regras de Segurança:</strong> No Firebase Console, vá para <strong>Firestore Database &gt; Rules</strong> e certifique-se de que as regras permitem leitura (ex: `allow read, write: if true;`).
                                        </li>
                                        <li>
                                            <strong>Banco de Dados Ativado:</strong> Confirme se o serviço Firestore foi criado no seu projeto.
                                        </li>
                                    </ol>
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
