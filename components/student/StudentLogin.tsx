
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
                             <div className="mt-2 text-sm text-red-700 space-y-4">
                                <p>A aplicação não conseguiu se conectar ou ler os dados do seu banco de dados Firebase. A causa exata está no console do seu navegador.</p>
                                
                                <div className="p-3 bg-red-100 rounded-md border border-red-300">
                                    <h4 className="font-bold text-red-900">Como Diagnosticar o Erro Exato</h4>
                                    <ol className="list-decimal list-inside space-y-1 mt-1 text-red-800">
                                        <li>Pressione a tecla <strong className="font-mono bg-white text-red-900 px-1 py-0.5 rounded">F12</strong> no seu teclado para abrir o "Console do Desenvolvedor".</li>
                                        <li>Recarregue a página e tente fazer o login novamente.</li>
                                        <li>Procure por uma mensagem de erro em vermelho que começa com <strong className="font-mono">"Firebase Connection Error Details:"</strong>. O texto que se segue é o erro real.</li>
                                    </ol>
                                </div>
                                
                                <div>
                                    <h4 className="font-bold">Soluções Para Erros Comuns</h4>
                                    <p className="mb-2">Com base no erro que você encontrou no console, aqui estão as soluções:</p>
                                    <div className="space-y-3 pl-2">
                                        
                                        <div className="border-l-4 border-red-300 pl-3">
                                            <p className="font-semibold text-red-800">SE O ERRO DIZ: <strong className="font-mono">"The query requires an index"</strong></p>
                                            <p className="mt-1">Este é o erro mais comum após a configuração inicial. Significa que o banco de dados precisa de um "índice" para buscar os dados de forma eficiente.</p>
                                            <ol className="list-decimal list-inside space-y-1 mt-2 text-red-800">
                                                <li>A própria mensagem de erro no console contém um <strong>link longo</strong>.</li>
                                                <li><strong>Clique nesse link.</strong> Ele o levará diretamente ao Firebase Console.</li>
                                                <li>Uma janela aparecerá para criar o índice. Apenas clique em <strong>"Criar"</strong>.</li>
                                                <li>A criação do índice pode levar alguns minutos. Aguarde e depois atualize a aplicação. O problema estará resolvido.</li>
                                            </ol>
                                        </div>

                                        <div className="border-l-4 border-red-300 pl-3 pt-2">
                                            <p className="font-semibold text-red-800">SE O ERRO DIZ: <strong className="font-mono">"permission-denied"</strong></p>
                                            <p className="mt-1">Isto significa que suas <strong>Regras de Segurança</strong> do Firestore estão bloqueando o acesso. Para desenvolvimento, você pode usar regras abertas.</p>
                                            <p className="mt-1">Vá para a seção <strong>Firestore Database &gt; Rules</strong> no seu Firebase Console e cole as seguintes regras:</p>
                                            <pre className="mt-1 p-2 bg-red-100 text-red-900 rounded text-xs whitespace-pre-wrap font-mono">
                                                {`rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} {\n      allow read, write: if true;\n    }\n  }\n}`}
                                            </pre>
                                        </div>

                                        <div className="border-l-4 border-red-300 pl-3 pt-2">
                                            <p className="font-semibold text-red-800">OUTROS ERROS (ex: <strong className="font-mono">invalid-api-key</strong>, <strong className="font-mono">NOT_FOUND</strong>)</p>
                                            <p className="mt-1">Estes erros geralmente indicam um problema de configuração no arquivo <strong>`firebase.ts`</strong>. Verifique se você copiou e colou <strong>exatamente</strong> as credenciais do seu projeto Firebase.</p>
                                        </div>
                                        
                                    </div>
                                </div>
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