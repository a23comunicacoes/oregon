# Sistema Modular de Integração WhatsApp Web JS

Este é o novo sistema modular de integração com WhatsApp Web JS, que suporta múltiplos clients simultaneamente.

## 📁 Estrutura de Arquivos

```
zap/
├── index.js          # Ponto de entrada principal, exporta todas as funções
├── client.js         # Gerenciamento de clients (criar, conectar, desconectar)
├── message.js        # Envio e processamento de mensagens
├── chats.js          # Gerenciamento de chats (listar, obter, ações)
├── utils.js          # Funções utilitárias (formatação, limpeza, validação)
└── README.md         # Este arquivo
```

## 🗄️ Banco de Dados

### Tabela Clients

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
    last_connected_at TIMESTAMP NULL
);
```

## 🚀 Como Usar

### Inicialização do Sistema

O sistema é inicializado automaticamente no `server/src/index.js`:

```javascript
const { initDefaultClient } = require('./zap');
initDefaultClient();
```

### Importar Funções

```javascript
// Importar todas as funções
const zap = require('./zap');

// Ou importar funções específicas
const { 
    initClient, 
    sendZapMessage, 
    getAllChats 
} = require('./zap');
```

### Gerenciamento de Clients

#### Criar um novo client

```javascript
const { createClient } = require('./zap');

await createClient('client-empresa-1', 'Empresa 1');
```

#### Conectar um client

```javascript
const { initClient } = require('./zap');

await initClient('client-empresa-1');
```

#### Verificar conexão

```javascript
const { isClientConnected } = require('./zap');

const connected = await isClientConnected('client-empresa-1');
```

#### Desconectar um client

```javascript
const { disconnectClient } = require('./zap');

await disconnectClient('client-empresa-1');
```

### Envio de Mensagens

#### Enviar mensagem de texto

```javascript
const { sendZapMessage } = require('./zap');

// Usar client específico
await sendZapMessage('client-empresa-1', '5511999999999', 'Olá!');

// Usar client padrão
await sendZapMessage('default', '5511999999999', 'Olá!');
```

#### Enviar mensagem com imagem

```javascript
const { sendZapMessageImage } = require('./zap');

await sendZapMessageImage(
    'client-empresa-1',
    '5511999999999',
    'Confira esta imagem!',
    '/caminho/para/imagem.jpg'
);
```

#### Enviar mensagem em chat específico

```javascript
const { sendMessageChat } = require('./zap');

await sendMessageChat(
    'client-empresa-1',
    '5511999999999@c.us',
    'Mensagem',
    null, // replyId
    null  // midiaPath
);
```

### Gerenciamento de Chats

#### Listar todos os chats

```javascript
const { getAllChats } = require('./zap');

const chats = await getAllChats('client-empresa-1', 12, 1, null, true);
```

#### Obter chat específico

```javascript
const { getChatById } = require('./zap');

const chat = await getChatById('client-empresa-1', '5511999999999@c.us', true, 50);
```

#### Executar ações em chat

```javascript
const { actionsChat } = require('./zap');

// Marcar como lido
await actionsChat('client-empresa-1', '5511999999999@c.us', 'markAsRead');

// Fixar chat
await actionsChat('client-empresa-1', '5511999999999@c.us', 'pin');
```

## 🔄 Migração do Sistema Antigo

### Alterações nas Chamadas de Função

**Antes:**
```javascript
await sendZapMessage('5511999999999', 'Mensagem');
```

**Depois:**
```javascript
await sendZapMessage('default', '5511999999999', 'Mensagem');
```

### Client Padrão

Para manter compatibilidade com o sistema anterior, existe um client padrão com ID `'default'`. Todas as funcionalidades que não especificarem um clientId usarão este client.

### FlowEngine

O `flowEngine.js` foi atualizado para suportar múltiplos clients. O contexto dos fluxos agora inclui o `clientId`:

```javascript
const context = {
    clientId: 'default',
    phone: '5511999999999',
    cliente: {...},
    // ... outros campos
};
```

## 📡 Eventos Socket.IO

O sistema emite eventos via Socket.IO para notificar o frontend:

### Eventos Globais
- `qr`: QR Code gerado (inclui clientId)
- `autentica-zap`: Client autenticado
- `desconectado-zap`: Client desconectado
- `nova-mensagem`: Nova mensagem recebida

### Eventos Específicos do Client
- `qr-{clientId}`: QR Code para client específico
- `autentica-zap-{clientId}`: Autenticação do client
- `desconectado-zap-{clientId}`: Desconexão do client
- `nova-mensagem-{clientId}`: Mensagem no client

## 🔧 API Routes

Todas as rotas da API agora suportam o parâmetro `clientId`:

### Query Parameter
```
GET /zap/connect?clientId=client-empresa-1
```

### Body Parameter
```
POST /zap/send-message
{
    "clientId": "client-empresa-1",
    "number": "5511999999999",
    "message": "Olá!"
}
```

### Rotas de Gerenciamento

- `GET /zap/clients/list` - Lista todos os clients
- `POST /zap/clients/create` - Cria novo client
- `DELETE /zap/clients/delete/:clientId` - Remove client
- `GET /zap/connect` - Conecta client
- `GET /zap/disconnect` - Desconecta client
- `GET /zap/check-conn` - Verifica conexão

## 🛠️ Modo de Desenvolvimento

O sistema continua suportando o modo de desenvolvimento, onde mensagens são redirecionadas para números específicos configurados na tabela `Options`:

```sql
SELECT * FROM Options WHERE type = 'modo_dev';
SELECT * FROM Options WHERE type = 'numeros_dev';
```

## 📝 Notas Importantes

1. **Compatibilidade**: O sistema é retrocompatível. Código antigo continuará funcionando usando o client `'default'`.

2. **Sessions**: Cada client tem sua própria sessão armazenada em `./session-zap/{clientId}`.

3. **Auto-inicialização**: Clients com status `'connected'` são reiniciados automaticamente quando o servidor inicia.

4. **Listeners**: Os event listeners (message_create, message_ack, etc.) são configurados automaticamente para cada client.

## 🐛 Troubleshooting

### Client não conecta

1. Verifique se o client existe no banco de dados
2. Verifique os logs do servidor para erros
3. Tente deletar a sessão: `rm -rf ./session-zap/{clientId}`
4. Recrie o client

### Mensagens não são enviadas

1. Verifique se o client está conectado: `isClientConnected(clientId)`
2. Verifique se o número está no formato correto
3. Verifique o modo de desenvolvimento (numeros_dev)

### QR Code não aparece

1. Verifique se está escutando o evento correto no frontend
2. Use o evento específico do client: `qr-{clientId}`
3. Verifique se o Socket.IO está conectado

## 📚 Referências

- [whatsapp-web.js Documentation](https://docs.wwebjs.dev/)
- [Socket.IO Documentation](https://socket.io/docs/)
- CURSOR.md - Documentação do projeto

