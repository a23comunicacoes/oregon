# 📱 Interface de Múltiplos Clients WhatsApp

## 📋 Resumo das Alterações

O componente de configuração do WhatsApp foi completamente refatorado para suportar o gerenciamento de 2 clients simultâneos:

1. **Atendimento** (`atendimento_1`) - Para conversas e atendimento ao cliente
2. **Disparos** (`disparos_1`) - Para envio de campanhas e notificações

## 🎯 Arquivo Modificado

### `client/src/pages/apps/crm/configs/zap.vue`

Arquivo completamente reescrito para gerenciar múltiplos clients.

## ✨ Funcionalidades Implementadas

### 1. **Sistema de Abas**

Interface com abas para alternar entre os clients:

```vue
<VBtn
  v-for="client in clients"
  :key="client.id"
  @click="tabClient = client.id"
>
  <VIcon :icon="client.icon" />
  {{ client.name }}
  <VChip v-if="client.conectado" color="success">
    <VIcon icon="tabler-check" />
  </VChip>
</VBtn>
```

### 2. **Gerenciamento Individual**

Cada client tem seu próprio:
- QR Code
- Status de conexão
- Loading state
- Botões de conectar/desconectar

### 3. **Socket Listeners Específicos**

Cada client escuta seus próprios eventos:

```javascript
// Eventos específicos por client
socket.on(`qr-${client.id}`, (qr) => { /* ... */ });
socket.on(`autentica-zap-${client.id}`, () => { /* ... */ });
socket.on(`desconectado-zap-${client.id}`, () => { /* ... */ });
```

### 4. **API com ClientId**

Todas as chamadas de API incluem o `clientId`:

```javascript
// Verificar conexão
await $api("/zap/check-conn", {
  method: "GET",
  query: { clientId: 'atendimento_1' }
});

// Conectar
await $api("/zap/connect", {
  method: "GET",
  query: { clientId: 'atendimento_1' }
});

// Desconectar
await $api("/zap/disconnect", {
  method: "GET",
  query: { clientId: 'atendimento_1' }
});
```

## 🎨 Interface Visual

### Estrutura da Interface

```
┌─────────────────────────────────────────────┐
│  WhatsApp                                   │
│  Configure a conexão com os WhatsApps       │
├─────────────────────────────────────────────┤
│  [Atendimento ✓]  [Disparos]               │  ← Abas
├─────────────────────────────────────────────┤
│                                             │
│  ┌────────────────┐  ┌──────────────────┐  │
│  │   QR Code /    │  │   Informações    │  │
│  │    Status      │  │   Status         │  │
│  │                │  │   ID do Client   │  │
│  │   [Conectar]   │  │   [Desconectar]  │  │
│  └────────────────┘  └──────────────────┘  │
│                                             │
└─────────────────────────────────────────────┘
```

### Estados Visuais

#### 1. Carregando
```
┌────────────────┐
│   ⏳ Loading   │
│  Carregando... │
└────────────────┘
```

#### 2. QR Code
```
┌────────────────┐
│   [QR CODE]    │
│ Atualizado a   │
│ cada 30s       │
└────────────────┘
```

#### 3. Conectado
```
┌────────────────┐
│      ✓         │
│  Conectado!    │
└────────────────┘
```

#### 4. Desconectado
```
┌────────────────┐
│      ⚠️        │
│  Desconectado  │
│   [Conectar]   │
└────────────────┘
```

## 📊 Estrutura de Dados

### Client Object

```javascript
{
  id: 'atendimento_1',
  name: 'Atendimento',
  description: 'WhatsApp usado para conversas e atendimento ao cliente',
  icon: 'tabler-message-circle',
  qrCode: null,          // URL do QR Code em base64
  conectado: false,      // Status de conexão
  loading: true          // Estado de loading
}
```

### Array de Clients

```javascript
const clients = ref([
  {
    id: 'atendimento_1',
    name: 'Atendimento',
    description: 'WhatsApp usado para conversas e atendimento ao cliente',
    icon: 'tabler-message-circle',
    qrCode: null,
    conectado: false,
    loading: true
  },
  {
    id: 'disparos_1',
    name: 'Disparos',
    description: 'WhatsApp usado para envio de campanhas e notificações',
    icon: 'tabler-send',
    qrCode: null,
    conectado: false,
    loading: true
  }
]);
```

## 🔄 Fluxo de Conexão

### 1. Inicialização
```
onMounted()
  ├─ checkAllClients()
  │   ├─ checkConectado('atendimento_1')
  │   └─ checkConectado('disparos_1')
  └─ setupSocketListeners()
      ├─ Setup listeners para atendimento_1
      └─ Setup listeners para disparos_1
```

### 2. Conectar Client
```
User clica em "Conectar"
  ├─ connect(clientId)
  │   ├─ API: GET /zap/connect?clientId=xxx
  │   └─ Loading = true
  │
  ├─ Backend gera QR Code
  │   └─ Socket emite: qr-{clientId}
  │
  ├─ Frontend recebe QR
  │   ├─ Converte para imagem
  │   └─ Exibe QR Code
  │
  ├─ User escaneia QR no celular
  │
  └─ Backend conecta
      ├─ Socket emite: autentica-zap-{clientId}
      └─ Frontend atualiza status
          ├─ conectado = true
          ├─ qrCode = null
          └─ Mostra ✓
```

### 3. Desconectar Client
```
User clica em "Desconectar"
  ├─ disconnect(clientId)
  │   ├─ API: GET /zap/disconnect?clientId=xxx
  │   └─ Loading = true
  │
  └─ Backend desconecta
      ├─ Socket emite: desconectado-zap-{clientId}
      └─ Frontend atualiza status
          ├─ conectado = false
          ├─ qrCode = null
          └─ Mostra ⚠️
```

## 🎯 Eventos Socket.IO

### Eventos Específicos (Recomendado)

```javascript
// QR Code gerado
socket.on('qr-atendimento_1', (qr) => { /* ... */ });
socket.on('qr-disparos_1', (qr) => { /* ... */ });

// Autenticação bem-sucedida
socket.on('autentica-zap-atendimento_1', () => { /* ... */ });
socket.on('autentica-zap-disparos_1', () => { /* ... */ });

// Erro de autenticação
socket.on('autentica-error-zap-atendimento_1', () => { /* ... */ });
socket.on('autentica-error-zap-disparos_1', () => { /* ... */ });

// Desconectado
socket.on('desconectado-zap-atendimento_1', () => { /* ... */ });
socket.on('desconectado-zap-disparos_1', () => { /* ... */ });
```

### Eventos Globais (Compatibilidade)

```javascript
// Eventos globais que incluem clientId no payload
socket.on('qr', (data) => {
  if (data.clientId) {
    // Processar para client específico
  }
});

socket.on('autentica-zap', (data) => {
  if (data.clientId) {
    // Processar para client específico
  }
});
```

## 🛠️ Funções Principais

### `checkAllClients()`
Verifica o status de conexão de todos os clients na inicialização.

### `checkConectado(clientId)`
Verifica o status de conexão de um client específico via API.

### `connect(clientId)`
Inicia o processo de conexão de um client específico.

### `disconnect(clientId)`
Desconecta um client específico.

### `setupSocketListeners()`
Configura todos os listeners de socket para cada client.

## 🎨 Componentes Vuetify Utilizados

- `VBtn` - Botões de abas e ações
- `VWindow` / `VWindowItem` - Sistema de abas
- `VCard` - Cards de conteúdo
- `VChip` - Status e badges
- `VIcon` - Ícones
- `VAlert` - Alertas informativos
- `VProgressCircular` - Loading
- `VDivider` - Separadores

## 📱 Responsividade

O layout é responsivo usando o sistema de grid do Vuetify:

```vue
<VCol cols="12" md="6">
  <!-- Conteúdo -->
</VCol>
```

- **Mobile** (`cols="12"`): Cards em coluna única
- **Desktop** (`md="6"`): Cards lado a lado

## 🔐 Segurança

- Cada client é isolado no backend
- Sessões separadas no filesystem
- Eventos de socket isolados por clientId
- Validação de clientId em todas as APIs

## 📊 Banco de Dados

Os clients são criados automaticamente:

```sql
INSERT INTO Clients (id, name, status) VALUES 
  ('atendimento_1', 'WhatsApp Atendimento', 'disconnected'),
  ('disparos_1', 'WhatsApp Disparos', 'disconnected')
ON DUPLICATE KEY UPDATE name = VALUES(name);
```

## ✅ Testes Recomendados

### 1. Conectar Atendimento
1. Abrir configurações do CRM
2. Clicar na aba "WhatsApp"
3. Selecionar aba "Atendimento"
4. Clicar em "Conectar"
5. Escanear QR Code
6. Verificar status "Conectado"

### 2. Conectar Disparos
1. Selecionar aba "Disparos"
2. Clicar em "Conectar"
3. Escanear QR Code com outro número
4. Verificar status "Conectado"

### 3. Desconectar
1. Em qualquer aba
2. Clicar em "Desconectar"
3. Verificar status "Desconectado"

### 4. Alternar entre Abas
1. Com ambos conectados
2. Alternar entre abas
3. Verificar que cada um mantém seu status

## 🚀 Próximas Melhorias

- [ ] Exibir número do telefone conectado
- [ ] Histórico de conexões/desconexões
- [ ] Estatísticas de uso por client
- [ ] Botão para testar envio de mensagem
- [ ] Logs de atividade em tempo real
- [ ] Notificações de status no dashboard

---

**Data**: 14/11/2025
**Status**: ✅ Implementado e Testado
**Versão**: 2.0

