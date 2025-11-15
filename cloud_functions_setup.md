# Configurando Lembretes Automáticos com Cloud Functions

Para que os e-mails de lembrete de poucas aulas restantes sejam enviados automaticamente, você precisa ativar e implantar uma **Função de Nuvem (Cloud Function)** no Firebase.

Este guia detalha o processo. Siga os passos com atenção.

---

### Passo 1: Pré-requisitos (Firebase CLI)

Antes de começar, você precisa ter as ferramentas de linha de comando do Firebase instaladas. Se você já fez o deploy de algum projeto Firebase antes, provavelmente já tem isso configurado.

- **Instalação (se necessário):** Se você nunca instalou, abra seu terminal (Prompt de Comando, PowerShell, ou Terminal do macOS/Linux) e execute o comando:
  ```bash
  npm install -g firebase-tools
  ```
- **Login:** Autentique-se com sua conta do Google associada ao Firebase:
  ```bash
  firebase login
  ```

---

### Passo 2: Verificação dos Arquivos do Projeto

Os arquivos necessários para a função já estão na pasta `functions` do seu projeto. Você não precisa alterá-los.

- `functions/src/index.ts`: Contém o código da função que verifica os alunos e envia os e-mails.
- `functions/package.json`: Lista as dependências necessárias para a função rodar.

---

### Passo 3: Permissões no Google Cloud (Obrigatório)

Funções agendadas (`.schedule()`) precisam de uma permissão especial para serem executadas. **Este passo é crucial e a principal causa de falhas no deploy.**

1.  **Acesse o painel IAM do Google Cloud:**
    - Abra este link: [**Painel do Google Cloud IAM**](https://console.cloud.google.com/iam-admin/iam).
    - No topo da página, verifique se o projeto selecionado é o mesmo que você está usando no Firebase.

2.  **Conceda a permissão necessária:**
    - Clique no botão **"+ CONCEDER ACESSO"**.
    - No campo **"Novos principais"**, você precisa colar o e-mail de uma conta de serviço específica. O formato é:
      ```
      service-NUMERO_DO_SEU_PROJETO@gcp-sa-pubsub.iam.gserviceaccount.com
      ```
    - Para encontrar o `NUMERO_DO_SEU_PROJETO`:
        - Vá para o [Console do Firebase](https://console.firebase.google.com/).
        - Clique no ícone de engrenagem (Configurações do projeto).
        - O **Número do projeto** estará listado na aba "Geral".
        - Copie esse número e substitua no modelo de e-mail acima.
    - No campo **"Selecionar um papel"**, procure e selecione o papel:
      > **Agente de Serviço do Cloud Scheduler**
    - Clique em **"Salvar"**.

---

### Passo 4: Fazer o Deploy (Implantação) da Função

Agora que as permissões estão corretas, você pode enviar a função para a nuvem.

1.  **Abra o terminal na pasta raiz do seu projeto** (a pasta principal, que contém a pasta `functions`, mas não dentro dela).
2.  Execute o seguinte comando:
    ```bash
    firebase deploy --only functions
    ```
3.  Aguarde o processo terminar. Pode levar alguns minutos. Uma mensagem de **"Deploy complete!"** aparecerá no final.

Se tudo correu bem, seus lembretes automáticos estão ativos e rodarão todos os dias às 9h da manhã (horário de São Paulo).

---

### Solução de Problemas Comuns

- **ERRO: `Error: spawn npm ... ENOENT`**
  - **Causa:** O Node.js e/ou o `npm` não estão instalados ou o terminal não os encontrou.
  - **Solução:**
    1. Instale a versão LTS do Node.js a partir do site oficial: [https://nodejs.org/](https://nodejs.org/).
    2. **Reinicie seu computador** ou, no mínimo, feche e abra novamente todos os terminais.

- **ERRO: `HTTP Error: 403, The caller does not have permission`**
  - **Causa:** O **Passo 3 (Permissões no Google Cloud)** foi pulado ou feito incorretamente.
  - **Solução:** Refaça o Passo 3 com atenção, garantindo que o número do projeto está correto e o papel "Agente de Serviço do Cloud Scheduler" foi concedido.

- **ERRO: `functions predeploy error...` com erros de `lint`**
  - **Causa:** Erros de formatação ou sintaxe no código da função.
  - **Solução:** Garanta que você não alterou os arquivos na pasta `functions` e que está usando as versões mais recentes fornecidas.