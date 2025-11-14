# 🚀 Configurando Lembretes Automáticos com Funções de Nuvem

Olá! Para que os e-mails de lembrete de poucas aulas sejam enviados automaticamente, precisamos configurar uma **Função de Nuvem Agendada**. Este guia foi revisado para tornar o processo o mais simples e livre de erros possível.

## O que esta função faz?

- **Roda Sozinha:** Uma vez por dia, às 9h da manhã, a função é ativada automaticamente.
- **É Inteligente:** Ela procura por alunos com 3 ou menos aulas restantes.
- **Comunica-se:** Envia um e-mail amigável para o aluno, avisando que o plano está no fim.
- **Evita Spam:** Marca o aluno para não enviar o mesmo lembrete duas vezes.

---

### Passo 1: Preparar os Arquivos da Função

Garanta que os dois arquivos dentro da sua pasta `functions` (`functions/package.json` e `functions/src/index.ts`) tenham o conteúdo exato que foi fornecido na atualização. Eles já estão corrigidos e formatados para evitar os erros de deploy anteriores.

---

### Passo 2: Configurar as Variáveis de Ambiente (Se Necessário)

A função usará as mesmas variáveis de ambiente seguras que configuramos para o envio de e-mail manual. Se você já fez isso, pode pular este passo. Caso contrário, execute os comandos abaixo no terminal, na pasta raiz do seu projeto, substituindo os valores de exemplo:

```bash
# Substitua SUA_CHAVE_API_DA_BREVO pela sua chave real
firebase functions:config:set brevo.key="SUA_CHAVE_API_DA_BREVO"

# Substitua contato@suaacademia.com pelo seu e-mail remetente
firebase functions:config:set brevo.sender="contato@suaacademia.com"
```

---

### Passo 3: Permissões do Google Cloud (MUITO IMPORTANTE)

Funções agendadas precisam de uma permissão especial para rodar. Este é um passo **obrigatório**.

1.  **Encontre o Número do seu Projeto:**
    - Vá para o [Console do Firebase](https://console.firebase.google.com/).
    - Clique na engrenagem (Configurações do Projeto).
    - O **Número do projeto** estará visível (ex: `123456789012`). Copie este número.

2.  **Acesse o IAM no Google Cloud:**
    - Abra este link: [https://console.cloud.google.com/iam-admin/iam](https://console.cloud.google.com/iam-admin/iam)
    - Verifique se o projeto selecionado no topo da página é o mesmo do Firebase.

3.  **Adicione a Permissão:**
    - Clique no botão **"+ CONCEDER ACESSO"**.
    - No campo **"Novos principais"**, cole o seguinte, substituindo `NUMERO_DO_SEU_PROJETO` pelo número que você copiou:
      ```
      service-NUMERO_DO_SEU_PROJETO@gcp-sa-pubsub.iam.gserviceaccount.com
      ```
    - No campo **"Selecionar um papel"**, procure e selecione **"Agente de Serviço do Cloud Scheduler"** (`Cloud Scheduler Service Agent`).
    - Clique em **"Salvar"**.



---

### Passo 4: Fazer Deploy da Função

Agora que tudo está configurado, vamos enviar a função para a nuvem.

1.  No terminal, na **pasta raiz do seu projeto**, execute:
    ```bash
    firebase deploy --only functions
    ```
2.  Este processo pode levar alguns minutos. Aguarde a mensagem de "Deploy complete!".

**Pronto!** A partir de agora, seu sistema de lembretes automáticos está ativo e cuidará de avisar seus alunos por você. Você não precisa fazer mais nada.