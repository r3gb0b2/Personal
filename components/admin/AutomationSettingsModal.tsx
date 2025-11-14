import React, { useState } from 'react';
import Modal from '../modals/Modal';

const CodeBlock: React.FC<{ text: string }> = ({ text }) => {
    const [copied, setCopied] = useState(false);
    const copyToClipboard = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-gray-800 text-white p-3 rounded-md font-mono text-sm relative">
            <pre className="whitespace-pre-wrap"><code>{text}</code></pre>
            <button 
                onClick={copyToClipboard}
                className="absolute top-2 right-2 px-2 py-1 text-xs bg-gray-600 hover:bg-gray-500 rounded"
            >
                {copied ? 'Copiado!' : 'Copiar'}
            </button>
        </div>
    );
};


const AutomationSettingsModal: React.FC<{ isOpen: boolean, onClose: () => void }> = ({ isOpen, onClose }) => {
    return (
        <Modal title="Configurar Lembretes Automáticos" isOpen={isOpen} onClose={onClose} size="xl">
            <div className="space-y-6 text-gray-700">
                <p>Para que os e-mails de lembrete sejam enviados automaticamente, você precisa ativar uma <strong>Função de Nuvem</strong>. Siga os passos abaixo com atenção.</p>

                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-brand-dark border-b pb-2">Passo 1: Verificação dos Arquivos</h3>
                    <p>Os arquivos necessários para a função (`functions/src/index.ts` e `functions/package.json`) já estão incluídos no projeto e corrigidos para evitar erros comuns.</p>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-brand-dark border-b pb-2">Passo 2: Permissões no Google Cloud (Obrigatório)</h3>
                    <p>Funções agendadas precisam de uma permissão especial para rodar. Este passo é crucial.</p>
                    <ol className="list-decimal list-inside space-y-2 pl-4">
                        <li>Acesse o painel de permissões do seu projeto clicando aqui: <a href="https://console.cloud.google.com/iam-admin/iam" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Painel do Google Cloud IAM</a>.</li>
                        <li>Confirme que o projeto selecionado no topo da página é o mesmo do seu Firebase.</li>
                        <li>Clique no botão <strong className="font-semibold">"+ CONCEDER ACESSO"</strong>.</li>
                        <li>No campo "Novos principais", cole o e-mail de serviço do Pub/Sub do seu projeto. Você precisa obter o <strong className="font-semibold">Número do Projeto</strong> nas configurações do Firebase e colá-lo no modelo abaixo.</li>
                         <CodeBlock text="service-NUMERO_DO_SEU_PROJETO@gcp-sa-pubsub.iam.gserviceaccount.com" />
                        <li>No campo "Selecionar um papel", procure e selecione <strong className="font-semibold">"Agente de Serviço do Cloud Scheduler"</strong>.</li>
                        <li>Clique em <strong className="font-semibold">"Salvar"</strong>.</li>
                    </ol>
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-bold text-brand-dark border-b pb-2">Passo 3: Fazer o Deploy da Função</h3>
                    <p>Agora, vamos enviar a função para a nuvem. Abra o terminal na **pasta raiz do seu projeto** (a pasta principal, não a pasta `functions`) e execute o seguinte comando:</p>
                    <CodeBlock text="firebase deploy --only functions" />
                    <p>O processo pode levar alguns minutos. Aguarde a mensagem de "Deploy complete!". Se tudo correu bem, seus lembretes automáticos estão ativos!</p>
                </div>

                <div className="space-y-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <h3 className="text-lg font-bold text-yellow-800">Solução de Problemas Comuns</h3>
                    <div className="space-y-3">
                        <div>
                            <h4 className="font-semibold text-yellow-900">Se o erro diz: `Error: spawn npm ... ENOENT`</h4>
                            <p className="text-sm">Isso significa que o comando `npm` não foi encontrado. Garanta que o <strong className="font-semibold">Node.js</strong> está instalado corretamente no seu computador e que o terminal que você está usando foi reiniciado após a instalação.</p>
                        </div>
                        <div>
                            <h4 className="font-semibold text-yellow-900">Se o erro diz: `functions predeploy error: Command terminated with non-zero exit code`</h4>
                            <p className="text-sm">Isso geralmente indica um erro de formatação ou de tipo no código (`lint` ou `tsc`). As versões mais recentes do código já corrigem isso, mas se o erro persistir, copie o log completo do terminal e procure ajuda.</p>
                        </div>
                         <div>
                            <h4 className="font-semibold text-yellow-900">Se o erro diz: `HTTP Error: 403, The caller does not have permission`</h4>
                            <p className="text-sm">Este erro quase sempre significa que o <strong className="font-semibold">Passo 2 (Permissões no Google Cloud)</strong> não foi feito ou foi feito incorretamente. Revise cada item do passo 2 com atenção.</p>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default AutomationSettingsModal;