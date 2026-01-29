# 🔄 Migração do Sistema WhatsApp - Suporte a Múltiplos Clients

## 📋 Resumo da Refatoração

Foi realizada uma refatoração completa do sistema de integração com WhatsApp Web JS, transformando uma estrutura monolítica que suportava apenas um client em um sistema modular que permite gerenciar múltiplos clients simultaneamente.

## 🎯 Objetivos Alcançados

✅ **Estrutura Modular**: Código organizado em módulos separados por responsabilidade
✅ **Múltiplos Clients**: Suporte a quantos clients forem necessários
✅ **Compatibilidade**: Sistema retrocompatível com código anterior
✅ **Banco de Dados**: Nova tabela `Clients` para gerenciar conexões
✅ **API Atualizada**: Rotas adaptadas para suportar clientId
✅ **FlowEngine Integrado**: Motor de fluxos adaptado para múltiplos clients

## 📁 Estrutura Criada

### Novo Diretório: `server/src/zap/`

```
zap/
├── index.js           # Exporta todas as funções e gerencia eventos
├── client.js          # Gerenciamento de clients (242 linhas)
├── message.js         # Envio e processamento de mensagens (432 linhas)
├── chats.js           # Gerenciamento de chats (271 linhas)
├── utils.js           # Funções utilitárias (152 linhas)
└── README.md          # Documentação completa
```

### Arquivo Original

- `server/src/utils/zap.js` → **Renomeado para** `zap.js.backup`

## 🗄️ Banco de Dados

### Nova Tabela: `Clients`

```sql
CREATE TABLE Clients (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    status ENUM('connected', 'disconnected', 'connecting', 'qr_ready') DEFAULT 'disconnected',
    qr_code TEXT NULL,
    session_data TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_connected_at TIMESTAMP NULL,
    INDEX idx_status (status),
    INDEX idx_phone (phone)
);
```

### Client Padrão

Foi criado um client padrão com ID `'default'` para manter compatibilidade com o sistema anterior.

```sql
INSERT INTO Clients (id, name, status) 
VALUES ('default', 'Client Principal', 'disconnected');
```

## 🔧 Arquivos Modificados

### 1. `server/src/routes/zap-route.js` (Reescrito)

**Alterações principais:**
- Importa funções do novo módulo `../zap`
- Função `getClientId()` para extrair clientId de requisições
- Novas rotas para gerenciamento de clients:
  - `GET /clients/list` - Lista todos os clients
  - `POST /clients/create` - Cria novo client
  - `DELETE /clients/delete/:clientId` - Remove client
  - `GET /disconnect` - Desconecta client
- Todas as rotas existentes agora suportam `clientId` via query ou body

**Exemplo de mudança:**
```javascript
// Antes
await sendZapMessage(number, message);

// Depois
const clientId = getClientId(req);
await sendZapMessage(clientId, number, message);
```

### 2. `server/src/utils/flowEngine.js` (Adaptado)

**Alterações principais:**
- Função `getZapFunctions()` atualizada para importar do novo módulo
- Wrappers de compatibilidade criados:
  ```javascript
  // Suporta chamadas antigas (2 params) e novas (3 params)
  sendZapMessage = async (phoneOrClientId, messageOrPhone, messageOptional) => {
      if (messageOptional !== undefined) {
          // 3 parâmetros: clientId, phone, message
          return await zap.sendZapMessage(phoneOrClientId, messageOrPhone, messageOptional);
      }
      // 2 parâmetros: phone, message (usa 'default')
      return await zap.sendZapMessage('default', phoneOrClientId, messageOrPhone);
  };
  ```
- Função `handleIncomingMessage()` agora recebe `clientId`
- Função `startFlow()` agora recebe e armazena `clientId` no contexto
- Todas as chamadas de `startFlow()` foram atualizadas para incluir `clientId`

### 3. `server/src/index.js` (Atualizado)

**Adicionado:**
```javascript
//WhatsApp - Novo sistema modular
const { initDefaultClient } = require('./zap');
initDefaultClient();
```

Inicializa automaticamente o client padrão se estiver configurado para auto-conectar.

### 4. `server/src/zap/index.js` (Novo - Arquivo Principal)

**Funções exportadas:**
- **Client Management**: `initClient`, `disconnectClient`, `getClientById`, `isClientConnected`, `createClient`, `deleteClient`, `getAllClients`
- **Messages**: `sendZapMessage`, `sendZapMessageImage`, `sendMessageChat`, `actionsMsg`, `mapearMsg`
- **Chats**: `getAllChats`, `getChatById`, `actionsChat`, `getAllContacts`
- **Utils**: `formatarMensagemHTML`, `formatHtmlMensagem`, `cleanNumber`, `formatPhoneNumber`, `resolveChatId`, `checkNameContato`
- **Listeners**: `setupClientListeners`, `removeClientListeners`
- **Init**: `initDefaultClient`

**Gerenciamento de Eventos:**
Configura automaticamente listeners para cada client:
- `message_create` → Processa mensagens recebidas
- `message_ack` → Atualiza status de entrega
- `message_edit` → Processa edições de mensagens

## 🔄 Mudanças na API

### Compatibilidade com Sistema Anterior

O sistema mantém compatibilidade total. Se não fornecer `clientId`, usa `'default'` automaticamente:

```javascript
// ✅ Funciona (usa client default)
POST /zap/send-message
{
    "number": "5511999999999",
    "message": "Olá!"
}

// ✅ Funciona (usa client específico)
POST /zap/send-message
{
    "clientId": "empresa-1",
    "number": "5511999999999",
    "message": "Olá!"
}
```

### Novas Rotas

#### Gerenciamento de Clients

```
GET    /zap/clients/list                    # Lista todos os clients
POST   /zap/clients/create                  # Cria novo client
DELETE /zap/clients/delete/:clientId        # Remove client
GET    /zap/disconnect?clientId=xxx         # Desconecta client
```

#### Rotas Existentes (Agora com suporte a clientId)

```
GET    /zap/connect?clientId=xxx
GET    /zap/check-conn?clientId=xxx
POST   /zap/send-message (body: { clientId, number, message })
POST   /zap/send-image (body: { clientId, number, message, imagePath })
GET    /zap/allChats?clientId=xxx
GET    /zap/getChat/:id?clientId=xxx
```

## 📡 Eventos Socket.IO

### Eventos Globais (Compatibilidade)
- `qr` - Inclui clientId no payload
- `autentica-zap` - Inclui clientId no payload
- `desconectado-zap` - Inclui clientId no payload
- `nova-mensagem` - Inclui clientId no payload

### Eventos Específicos por Client (Novo)
- `qr-{clientId}`
- `autentica-zap-{clientId}`
- `desconectado-zap-{clientId}`
- `nova-mensagem-{clientId}`

## 🔐 Sessões

Cada client tem sua própria sessão isolada:

```
server/session-zap/
├── default/              # Sessão do client padrão
├── empresa-1/            # Sessão da empresa 1
└── empresa-2/            # Sessão da empresa 2
```

## 🚀 Como Usar o Novo Sistema

### 1. Criar um Novo Client

```javascript
// Via API
POST /zap/clients/create
{
    "clientId": "empresa-abc",
    "name": "Empresa ABC"
}

// Via código
const { createClient } = require('./zap');
await createClient('empresa-abc', 'Empresa ABC');
```

### 2. Conectar Client

```javascript
// Via API
GET /zap/connect?clientId=empresa-abc

// Via código
const { initClient } = require('./zap');
await initClient('empresa-abc');
```

### 3. Enviar Mensagem

```javascript
// Via API
POST /zap/send-message
{
    "clientId": "empresa-abc",
    "number": "5511999999999",
    "message": "Olá!"
}

// Via código
const { sendZapMessage } = require('./zap');
await sendZapMessage('empresa-abc', '5511999999999', 'Olá!');
```

### 4. Verificar Conexão

```javascript
// Via API
GET /zap/check-conn?clientId=empresa-abc

// Via código
const { isClientConnected } = require('./zap');
const connected = await isClientConnected('empresa-abc');
```

## 🧪 Testes Recomendados

### Pré-requisitos
1. ✅ Tabela `Clients` criada no banco
2. ✅ Client `default` inserido
3. ✅ Servidor reiniciado

### Testes Básicos

#### 1. Verificar client padrão
```bash
curl https://app.oregonservicos.com.br:3005/zap/clients/list
```

#### 2. Conectar client padrão
```bash
curl https://app.oregonservicos.com.br:3005/zap/connect
```

#### 3. Verificar status
```bash
curl https://app.oregonservicos.com.br:3005/zap/check-conn
```

#### 4. Listar chats
```bash
curl https://app.oregonservicos.com.br:3005/zap/allChats
```

#### 5. Enviar mensagem
```bash
curl -X POST https://app.oregonservicos.com.br:3005/zap/send-message \
  -H "Content-Type: application/json" \
  -d '{"number": "5511999999999", "message": "Teste!"}'
```

### Testes com Múltiplos Clients

#### 1. Criar novo client
```bash
curl -X POST https://app.oregonservicos.com.br:3005/zap/clients/create \
  -H "Content-Type: application/json" \
  -d '{"clientId": "test-client", "name": "Client Teste"}'
```

#### 2. Conectar novo client
```bash
curl https://app.oregonservicos.com.br:3005/zap/connect?clientId=test-client
```

#### 3. Enviar mensagem pelo novo client
```bash
curl -X POST https://app.oregonservicos.com.br:3005/zap/send-message \
  -H "Content-Type: application/json" \
  -d '{"clientId": "test-client", "number": "5511999999999", "message": "Teste!"}'
```

## 🐛 Troubleshooting

### Erro: "Client não encontrado"

**Causa**: Client não existe no banco de dados

**Solução**:
```sql
INSERT INTO Clients (id, name) VALUES ('seu-client-id', 'Nome do Client');
```

### Erro: "WhatsApp desconectado"

**Causa**: Client não está conectado

**Solução**:
```bash
curl https://app.oregonservicos.com.br:3005/zap/connect?clientId=seu-client-id
```

### QR Code não aparece no frontend

**Causa**: Frontend não está escutando evento correto

**Solução no Frontend**:
```javascript
// Adicionar listener para evento específico do client
socket.on(`qr-${clientId}`, (qr) => {
    // Exibir QR Code
});
```

### Mensagens não são enviadas

**Verificar**:
1. Client está conectado: `GET /zap/check-conn?clientId=xxx`
2. Modo dev está ativo: `SELECT * FROM Options WHERE type = 'modo_dev'`
3. Número está correto e registrado no WhatsApp
4. Logs do servidor para erros específicos

## 📊 Comparação Antes/Depois

### Antes
- ❌ Apenas 1 client WhatsApp
- ❌ Código monolítico (1109 linhas)
- ❌ Difícil manutenção
- ❌ Sem separação de responsabilidades
- ❌ Status armazenado na tabela Options

### Depois
- ✅ Infinitos clients WhatsApp
- ✅ Código modular (5 arquivos separados)
- ✅ Fácil manutenção
- ✅ Separação clara de responsabilidades
- ✅ Tabela dedicada para clients
- ✅ API robusta de gerenciamento
- ✅ Retrocompatível

## 📚 Documentação Adicional

Para mais detalhes sobre como usar o sistema, consulte:
- `server/src/zap/README.md` - Documentação completa do módulo
- `CURSOR.md` - Documentação do projeto

## ✅ Status da Migração

**Todas as tarefas foram concluídas com sucesso!**

- ✅ Estrutura modular criada
- ✅ Tabela Clients criada no banco
- ✅ Client padrão inserido
- ✅ Funções refatoradas e organizadas
- ✅ API atualizada
- ✅ FlowEngine adaptado
- ✅ Sistema de eventos configurado
- ✅ Documentação completa
- ✅ Retrocompatibilidade mantida
- ✅ Zero erros de linting

## 🎉 Próximos Passos

1. **Frontend**: Adaptar componentes Vue para suportar seleção de clientId
2. **Admin Panel**: Criar interface para gerenciar múltiplos clients
3. **Monitoramento**: Adicionar dashboard de status dos clients
4. **Notificações**: Expandir sistema de notificações para múltiplos clients

---

**Data da Migração**: 14/11/2025
**Status**: ✅ Concluído
**Breaking Changes**: ❌ Nenhum (Retrocompatível)

