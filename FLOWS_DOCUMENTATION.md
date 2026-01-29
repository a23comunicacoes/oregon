# Documentação Completa do Sistema de Fluxos

## Visão Geral

O sistema de fluxos é uma engine de automação que permite criar workflows personalizados para atendimento ao cliente via WhatsApp, integrado com CRM, agendamentos e Inteligência Artificial (Gemini).

### Características Principais

- **Motor de Execução Assíncrono**: Processa fluxos de forma não-bloqueante
- **Integração com WhatsApp**: Envio/recebimento de mensagens automatizadas
- **IA Integrada (Gemini)**: Processamento de linguagem natural com function calling
- **Sistema de Triggers**: Disparo automático baseado em eventos
- **Prioridades e Interrupção**: Fluxos podem interromper outros baseado em prioridade
- **Variáveis de Contexto**: Sistema completo de substituição de variáveis

---

## Arquitetura de Arquivos

```
/server/src/flows/
├── core/
│   ├── flowEngine.js              # Motor principal de execução (~1100 linhas)
│   ├── flowTriggers.js            # Sistema de triggers automáticos (~700 linhas)
│   ├── flowInterruptionManager.js # Gerenciamento de prioridades (~540 linhas)
│   └── aiProcessor.js             # Integração Gemini com function calling (~645 linhas)
├── actions/
│   ├── messageActions.js          # Envio WhatsApp, Email, encaminhamento (~370 linhas)
│   ├── agendamentoActions.js      # CRUD de agendamentos (~550 linhas)
│   ├── clienteActions.js          # CRUD de clientes (~460 linhas)
│   ├── negocioActions.js          # Operações CRM/negócios (~455 linhas)
│   ├── waitActions.js             # Ações de espera e captura (~380 linhas)
│   └── httpActions.js             # Requisições HTTP externas (~140 linhas)
├── helpers/
│   ├── contextHelper.js           # Construção de contexto e variáveis (~360 linhas)
│   ├── logHelper.js               # Sistema de logging estruturado (~145 linhas)
│   ├── availabilityHelper.js      # Verificação de disponibilidade
│   ├── clienteContextHelper.js    # Enriquecimento de dados do cliente (~250 linhas)
│   └── textToSpeech.js            # Conversão texto para áudio (TTS)
├── validators/
│   └── flowValidator.js           # Validação de fluxos e nós (~310 linhas)
└── routes/
    └── flowsRoute.js              # Endpoints da API de fluxos
```

### Descrição dos Módulos

#### Core

| Arquivo | Descrição |
|---------|-----------|
| `flowEngine.js` | Motor principal: `startFlow()`, `advance()`, `execAction()`, `handleIncomingMessage()` |
| `flowTriggers.js` | Disparo de fluxos por eventos: agendamentos, mensagens WhatsApp |
| `flowInterruptionManager.js` | Keywords globais, prioridades, análise de intenção |
| `aiProcessor.js` | Processamento de blocos AI com Gemini, function calling |

#### Actions

| Arquivo | Funções Principais |
|---------|-------------------|
| `messageActions.js` | `sendWhatsAppMessage()`, `sendEmail()`, `forwardContact()` |
| `agendamentoActions.js` | `createAgendamento()`, `updateAgendamento()`, `getAgendamento()` |
| `clienteActions.js` | `updateCliente()`, `createOrUpdateCliente()`, `getClienteByPhone()`, `blockUnblockClientFlows()` |
| `negocioActions.js` | `createNegocio()`, `updateNegocio()`, `moveNegocioToStage()` |
| `waitActions.js` | `executeWaitReply()`, `executeWaitReplyConditional()`, `executeWaitReplyOptions()`, `executeDelay()` |
| `httpActions.js` | `executeHttp()` - requisições GET, POST, PUT, PATCH |

#### Helpers

| Arquivo | Descrição |
|---------|-----------|
| `contextHelper.js` | `buildFlatContext()`, `replaceVariables()` - gestão de variáveis |
| `logHelper.js` | `flowLog` - logging estruturado com níveis DEBUG, INFO, WARN, ERROR |
| `clienteContextHelper.js` | `getClienteResumoParaIA()` - dados enriquecidos para IA |

---

## Estrutura do Banco de Dados

### Tabela: `Flows`

Definição dos fluxos de automação.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INT PK | ID único do fluxo |
| `name` | VARCHAR(255) | Nome do fluxo |
| `description` | TEXT | Descrição |
| `status` | VARCHAR(20) | `ativo`, `inativo`, `rascunho` |
| `trigger_type` | VARCHAR(50) | Tipo de trigger (ver seção Triggers) |
| `webhook_key` | VARCHAR(100) | Chave para triggers via webhook |
| `trigger_conditions` | JSON | Condições para disparo |
| `priority` | INT | Prioridade (0-100, maior = mais prioritário) |
| `interruptible` | TINYINT | Se pode ser interrompido (0/1) |
| `global_keywords` | JSON | Keywords que ativam este fluxo |
| `created_at` | TIMESTAMP | Data de criação |
| `updated_at` | TIMESTAMP | Última atualização |

### Tabela: `FlowNodes`

Nós/etapas dos fluxos.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INT PK | ID único do nó |
| `flow_id` | INT FK | ID do fluxo |
| `type` | VARCHAR(50) | Tipo do nó (ver seção Tipos de Nós) |
| `label` | VARCHAR(255) | Rótulo/nome do nó |
| `config` | LONGTEXT | Configuração JSON do nó |
| `position_x` | INT | Posição X no editor visual |
| `position_y` | INT | Posição Y no editor visual |
| `created_at` | TIMESTAMP | Data de criação |

### Tabela: `FlowEdges`

Conexões entre nós.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INT PK | ID único da conexão |
| `flow_id` | INT FK | ID do fluxo |
| `source_node_id` | INT FK | Nó de origem |
| `target_node_id` | INT FK | Nó de destino |
| `label` | VARCHAR(255) | Rótulo da conexão (`true`, `false`, `timeout`, etc) |
| `condition_json` | TEXT | Condição opcional para esta conexão |
| `created_at` | TIMESTAMP | Data de criação |

### Tabela: `FlowRuns`

Execuções ativas de fluxos.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INT PK | ID único da execução |
| `flow_id` | INT FK | ID do fluxo |
| `current_node_id` | INT | Nó atual da execução |
| `status` | VARCHAR(30) | `running`, `completed`, `error`, `timeout`, `redirected` |
| `cliente_id` | INT | ID do cliente |
| `chat_id` | VARCHAR(100) | ID do chat WhatsApp |
| `phone` | VARCHAR(30) | Telefone do cliente |
| `context_json` | TEXT | Contexto serializado em JSON |
| `waiting_for_response` | TINYINT | Se está aguardando resposta (0/1) |
| `wait_state` | TEXT | Estado do wait (tipo, opções, tentativas) |
| `next_run_at` | DATETIME | Próxima execução (para timeouts) |
| `created_at` | TIMESTAMP | Início da execução |
| `updated_at` | TIMESTAMP | Última atualização |

### Tabela: `FlowConversations`

Histórico de conversas dos fluxos.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INT PK | ID único |
| `flow_id` | INT FK | ID do fluxo |
| `flow_run_id` | INT | ID da execução |
| `cliente_id` | INT FK | ID do cliente |
| `phone` | VARCHAR(30) | Telefone |
| `status` | VARCHAR(50) | Status da conversa |
| `total_mensagens_enviadas` | INT | Total de mensagens enviadas |
| `total_mensagens_recebidas` | INT | Total de mensagens recebidas |
| `gerou_agendamento` | TINYINT | Se gerou agendamento (0/1) |
| `agendamento_id` | INT FK | ID do agendamento gerado |
| `gerou_negocio` | TINYINT | Se gerou negócio (0/1) |
| `negocio_id` | INT FK | ID do negócio gerado |

### Tabela: `FlowActions`

Log de ações executadas.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INT PK | ID único |
| `flow_id` | INT FK | ID do fluxo |
| `flow_run_id` | INT | ID da execução |
| `tipo_acao` | VARCHAR(100) | Tipo da ação executada |
| `node_type` | VARCHAR(50) | Tipo do nó |
| `detalhes` | JSON | Detalhes da execução |
| `sucesso` | TINYINT | Se executou com sucesso |
| `erro_mensagem` | TEXT | Mensagem de erro (se houver) |
| `tempo_execucao` | INT | Tempo de execução em ms |
| `created_at` | TIMESTAMP | Data/hora da execução |

### Tabela: `FlowScheduledActions`

Ações agendadas para execução futura.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INT PK | ID único |
| `flowRunId` | INT | ID da execução |
| `clientId` | INT | ID do cliente |
| `phone` | VARCHAR(20) | Telefone |
| `acao` | VARCHAR(50) | Tipo de ação |
| `parametros` | JSON | Parâmetros da ação |
| `executarEm` | DATETIME | Data/hora para executar |
| `executado` | TINYINT | Se já foi executado |
| `created_at` | TIMESTAMP | Data de criação |

### Tabela: `FlowForwardLog`

Log de encaminhamentos de contatos.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | INT PK | ID único |
| `flow_run_id` | INT FK | ID da execução |
| `flow_id` | INT FK | ID do fluxo |
| `node_id` | INT | ID do nó |
| `contact_phone` | VARCHAR(30) | Telefone do contato |
| `forwarded_to_phone` | VARCHAR(30) | Encaminhado para |
| `forwarded_to_label` | VARCHAR(255) | Label do destinatário |
| `forward_type` | ENUM | `ordered`, `random`, `all` |
| `status` | ENUM | `pending`, `sent`, `failed` |
| `created_at` | TIMESTAMP | Data do encaminhamento |

---

## Fluxo de Processamento de Mensagens

```
┌─────────────────────────────────────────────────────────────────┐
│                    MENSAGEM RECEBIDA                            │
│                    (WhatsApp Web JS)                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    zap/index.js                                 │
│                    (Listener message_create)                    │
│    - Filtra grupos, notificações do sistema                     │
│    - Extrai número do telefone                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    flowEngine.handleIncomingMessage()           │
│    - Recebe: phone, chatId, text, clientId, mediaPath           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│            flowInterruptionManager.processMessageWithInterruption│
│    - Verifica keywords globais                                  │
│    - Analisa intenção para interrupção                          │
│    - Verifica prioridades                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
      (Interrompido)                   (Continua)
              │                               │
              ▼                               ▼
┌─────────────────────────┐   ┌─────────────────────────────────────┐
│ Inicia novo fluxo       │   │ Busca FlowRuns aguardando resposta  │
│ (maior prioridade)      │   │ WHERE waiting_for_response = 1      │
└─────────────────────────┘   └─────────────────────────────────────┘
                                              │
                              ┌───────────────┴───────────────┐
                              │                               │
                       (Encontrou)                      (Não encontrou)
                              │                               │
                              ▼                               ▼
┌─────────────────────────────────────┐   ┌─────────────────────────────────┐
│ Processa resposta baseado no tipo:  │   │ Busca fluxos com trigger        │
│ - wait_reply: captura variáveis     │   │ mensagem_whatsapp               │
│ - wait_reply_conditional: avalia    │   │ flowTriggers.triggerMessageReceived│
│ - wait_reply_options: valida opção  │   └─────────────────────────────────┘
│ - wait_for_agent: verifica unlock   │
└─────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    flowEngine.advance(runId)                    │
│    - Executa próximo nó                                         │
│    - Processa condições                                         │
│    - Envia mensagens                                            │
│    - Recursivo até wait ou fim                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tipos de Nós Disponíveis

### Nós de Controle

| Tipo | Descrição | Config |
|------|-----------|--------|
| `start` | Nó inicial do fluxo | - |
| `condition` | Avaliação condicional | `conditions: [{field, operator, value, logicalOperator}]` |
| `delay` | Pausa na execução | `delayValue`, `delayType` (seconds/minutes/hours/days) |
| `redirect_flow` | Redireciona para outro fluxo | `targetFlowId`, `message` (opcional) |

### Nós de Comunicação

| Tipo | Descrição | Config |
|------|-----------|--------|
| `send_whatsapp` | Envia mensagem WhatsApp | `message`, `mediaPath` (opcional) |
| `send_email` | Envia email | `to`, `subject`, `body` |
| `forward_contact` | Encaminha para atendente | `phones`, `forwardType` (next/random/all), `message` |

### Nós de Espera

| Tipo | Descrição | Config |
|------|-----------|--------|
| `wait_reply` | Aguarda resposta simples | `variables: [{name}]`, `timeoutValue`, `timeoutType` |
| `wait_reply_conditional` | Aguarda com condição | `variables`, `conditions`, `timeoutValue`, `timeoutType` |
| `wait_reply_options` | Menu de opções | `message`, `options: [{label}]`, `maxAttempts`, `invalidOptionMessage` |
| `wait_for_agent` | Aguarda atendente humano | `message`, `finishMessage` |

### Nós de Dados

| Tipo | Descrição | Config |
|------|-----------|--------|
| `create_agendamento` | Cria agendamento | `data`, `horaInicio`, `funcionarioId`, `servicoIds`, `useIA` |
| `update_agendamento` | Atualiza agendamento | `agendamentoId`, `data`, `horaInicio`, `status`, `useIA` |
| `get_appointment` | Obtém dados do agendamento | `agendamentoId` |
| `update_cliente` | Atualiza dados do cliente | `nome`, `email`, `cpf`, `dataNascimento`, `genero`, `observacoes` |
| `create_negocio` | Cria negócio no CRM | `titulo`, `valor`, `funilId`, `etapaId`, `origem` |
| `update_negocio` | Atualiza negócio | `negocioId`, `status`, `valor`, `etapaId` |
| `block_flows` | Bloqueia/desbloqueia fluxos | `action` (block/unblock) |

### Nós com IA

| Tipo | Descrição | Config |
|------|-----------|--------|
| `ai_actions` | IA com ações configuráveis | `instructions`, `capabilities: {createAppointment, updateAppointment, ...}` |
| `ai_decision` | Decisão SIM/NÃO via IA | `instructions` |
| `ai_options` | Seleção de opção via IA | `instructions`, `options: [{label, description, output}]` |

### Nós de Integração

| Tipo | Descrição | Config |
|------|-----------|--------|
| `http` | Requisição HTTP | `url`, `method`, `headers`, `body`, `responseMapping` |

---

## Sistema de Variáveis de Contexto

### Variáveis do Cliente

| Variável | Descrição |
|----------|-----------|
| `{{cliente_nome}}` | Primeiro nome |
| `{{cliente_sobrenome}}` | Sobrenome |
| `{{cliente_nomecompleto}}` | Nome completo |
| `{{cliente_telefone}}` | Telefone principal |
| `{{cliente_celular}}` | Celular |
| `{{cliente_email}}` | Email |
| `{{cliente_cpf}}` | CPF |
| `{{cliente_data_nascimento}}` | Data de nascimento (DD/MM/YYYY) |
| `{{cliente_genero}}` | Gênero |
| `{{cliente_cidade}}` | Cidade |
| `{{cliente_estado}}` | Estado |
| `{{cliente_bairro}}` | Bairro |
| `{{cliente_endereco}}` | Endereço formatado |
| `{{cliente_qtd_agendamentos}}` | Total de agendamentos |
| `{{cliente_valor_gasto}}` | Valor total gasto |
| `{{cliente_ultimo_agendamento}}` | Data do último agendamento |
| `{{tags_cliente}}` | Tags do cliente |

### Variáveis do Agendamento

| Variável | Descrição |
|----------|-----------|
| `{{agendamento_id}}` | ID do agendamento |
| `{{agendamento_numero}}` | Número (alias para ID) |
| `{{agendamento_data}}` | Data (DD/MM/YYYY) |
| `{{agendamento_hora}}` | Hora de início |
| `{{agendamento_hora_fim}}` | Hora de término |
| `{{agendamento_datacompleta}}` | Data e hora formatados |
| `{{agendamento_status}}` | Status atual |
| `{{agendamento_valor}}` | Valor total |
| `{{agendamento_profissional}}` | Nome do profissional |
| `{{agendamento_servico}}` | Serviço(s) |
| `{{agendamento_observacoes}}` | Observações |
| `{{agendamento_endereco}}` | Endereço do agendamento |

### Variáveis do Negócio (CRM)

| Variável | Descrição |
|----------|-----------|
| `{{negocio_id}}` | ID do negócio |
| `{{negocio_titulo}}` | Título |
| `{{negocio_valor}}` | Valor |
| `{{negocio_status}}` | Status |
| `{{negocio_origem}}` | Origem |
| `{{negocio_etapa_nome}}` | Nome da etapa no funil |
| `{{negocio_stage}}` | Alias para etapa |
| `{{negocio_funnel}}` | Nome do funil |
| `{{negocio_etapa_instrucoes}}` | Instruções da etapa |

### Variáveis do Sistema

| Variável | Descrição |
|----------|-----------|
| `{{data_atual}}` | Data atual (DD/MM/YYYY) |
| `{{hora_atual}}` | Hora atual (HH:mm) |
| `{{dia_semana}}` | Dia da semana por extenso |
| `{{mes_atual}}` | Mês atual por extenso |
| `{{ano_atual}}` | Ano atual |

### Variáveis Dinâmicas

| Variável | Descrição |
|----------|-----------|
| `{{ultima_mensagem}}` | Última mensagem do usuário |
| `{{resposta_usuario}}` | Resposta capturada pelo wait_reply |
| `{{selected_option}}` | Índice da opção selecionada |
| `{{selected_option_label}}` | Label da opção selecionada |

---

## Integração com IA (Gemini)

### Capabilities Disponíveis

```javascript
capabilities: {
  createAppointment: true,    // Criar agendamentos
  updateAppointment: true,    // Atualizar agendamentos
  cancelAppointment: true,    // Cancelar agendamentos
  checkAvailability: true,    // Verificar disponibilidade
  createBusiness: true,       // Criar negócios no CRM
  updateBusiness: true,       // Atualizar negócios
  updateClient: true,         // Atualizar dados do cliente
  updateAddress: true,        // Atualizar endereço
  forwardToAgent: true,       // Encaminhar para atendente
  sendMessage: true,          // Enviar mensagens
  scheduleAction: true        // Agendar ações futuras
}
```

### Function Calling

A IA tem acesso às seguintes funções:

| Função | Descrição | Parâmetros |
|--------|-----------|------------|
| `buscarDisponibilidades` | Busca horários disponíveis | `data`, `servicoId`, `funcionarioId` |
| `criarAgendamento` | Cria novo agendamento | `data`, `horaInicio`, `servicoIds`, `funcionarioId` |
| `atualizarAgendamento` | Atualiza agendamento existente | `agendamentoId`, `data`, `horaInicio`, `status` |
| `cancelarAgendamento` | Cancela agendamento | `agendamentoId`, `motivo` |
| `consultarAgendamentosCliente` | Lista agendamentos do cliente | `status`, `limite` |
| `atualizarCliente` | Atualiza dados do cliente | `nome`, `email`, `cpf`, etc |
| `criarNegocio` | Cria negócio no CRM | `titulo`, `valor`, `funilId` |
| `atualizarNegocio` | Atualiza negócio | `negocioId`, `status`, `etapaId` |
| `enviarMensagem` | Envia mensagem ao cliente | `mensagem` |
| `encaminharParaAtendente` | Encaminha para humano | `motivo` |
| `agendarAcaoFutura` | Agenda ação para depois | `acao`, `parametros`, `executarEm` |

### Exemplo de Prompt para IA

```javascript
{
  type: 'ai_actions',
  config: {
    instructions: `
      Você é um assistente de agendamentos.

      REGRAS:
      1. Sempre verifique disponibilidade antes de confirmar
      2. Confirme todos os dados antes de criar agendamento
      3. Nunca mencione que é uma IA

      SERVIÇOS DISPONÍVEIS:
      - Corte de cabelo (30min) - R$ 50
      - Barba (20min) - R$ 30
      - Corte + Barba (45min) - R$ 70
    `,
    capabilities: {
      createAppointment: true,
      checkAvailability: true,
      sendMessage: true
    }
  }
}
```

---

## Sistema de Triggers

### Tipos de Trigger

| Trigger | Descrição | Contexto Disponível |
|---------|-----------|---------------------|
| `mensagem_whatsapp` | Mensagem recebida no WhatsApp | phone, chatId, text, cliente |
| `novo_agendamento` | Agendamento criado | agendamento, cliente |
| `status_agendamento` | Status do agendamento alterado | agendamento, cliente, statusAnterior, statusNovo |
| `agendamento_proximo` | Agendamento próximo (lembrete) | agendamento, cliente, horasFaltando |
| `agendamento_confirmado` | Agendamento confirmado | agendamento, cliente |
| `agendamento_cancelado` | Agendamento cancelado | agendamento, cliente, motivoCancelamento |

### Condições de Trigger

```json
{
  "trigger_conditions": [
    {
      "field": "cliente_genero",
      "operator": "eq",
      "value": "feminino",
      "logicalOperator": "and"
    },
    {
      "field": "agendamento_valor",
      "operator": "gt",
      "value": "100"
    }
  ]
}
```

### Operadores Disponíveis

| Operador | Descrição |
|----------|-----------|
| `eq` / `equals` | Igual a |
| `neq` / `not_equals` | Diferente de |
| `contains` | Contém texto |
| `not_contains` | Não contém texto |
| `gt` / `greater` | Maior que |
| `lt` / `less` | Menor que |
| `gte` / `greater_equal` | Maior ou igual |
| `lte` / `less_equal` | Menor ou igual |
| `empty` | Campo vazio |
| `not_empty` | Campo não vazio |
| `regex` | Expressão regular |

---

## Sistema de Prioridades e Interrupção

### Keywords Globais

Keywords que podem interromper qualquer fluxo e iniciar outro:

```json
{
  "global_keywords": [
    {
      "keyword": "cancelar",
      "matchType": "contains",
      "targetFlowId": 5
    },
    {
      "keyword": "falar com atendente",
      "matchType": "exact",
      "targetFlowId": 10
    }
  ]
}
```

### Tipos de Match

| Tipo | Descrição |
|------|-----------|
| `exact` | Texto exato |
| `contains` | Contém o texto |
| `startsWith` | Começa com |
| `endsWith` | Termina com |
| `regex` | Expressão regular |

### Prioridades

- Fluxos com maior `priority` (0-100) podem interromper fluxos com menor prioridade
- `interruptible = 0` torna o fluxo não-interrompível
- A análise de intenção usa IA para detectar mudança de contexto

---

## Exemplos de Uso para Prompts

### Exemplo 1: Consultar estrutura de um fluxo

```
Prompt: "Quero entender como funciona o fluxo de agendamento ID 5"

1. SELECT * FROM Flows WHERE id = 5
2. SELECT * FROM FlowNodes WHERE flow_id = 5 ORDER BY id
3. SELECT * FROM FlowEdges WHERE flow_id = 5

Analisar:
- Qual o trigger_type?
- Quais tipos de nós existem?
- Como estão conectados (edges)?
```

### Exemplo 2: Debugar uma execução

```
Prompt: "O fluxo do cliente 5511999999999 travou"

1. Buscar execução:
   SELECT * FROM FlowRuns
   WHERE phone LIKE '%999999999%'
   AND status = 'running'
   ORDER BY id DESC LIMIT 1

2. Verificar contexto:
   - context_json contém os dados?
   - wait_state está correto?
   - waiting_for_response = 1?

3. Verificar nó atual:
   SELECT * FROM FlowNodes WHERE id = {current_node_id}
```

### Exemplo 3: Criar novo tipo de ação

```
1. Criar função em /flows/actions/
2. Registrar em flowEngine.js no switch de execAction()
3. Adicionar validação em flowValidator.js
4. Documentar configuração do nó
```

### Exemplo 4: Testar fluxo via API

```bash
# Simular mensagem de entrada
curl -X POST http://localhost:3005/flow-test/simulate-message \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "5511999999999",
    "text": "Olá, quero agendar um horário"
  }'

# Responder ao fluxo
curl -X POST http://localhost:3005/flow-test/respond \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "5511999999999",
    "text": "Corte de cabelo"
  }'
```

---

## API de Fluxos

### Endpoints Disponíveis

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/flows` | Lista todos os fluxos |
| GET | `/flows/:id` | Obtém fluxo com nós e edges |
| POST | `/flows` | Cria novo fluxo |
| PUT | `/flows/:id` | Atualiza fluxo |
| DELETE | `/flows/:id` | Remove fluxo |
| POST | `/flows/:id/nodes` | Adiciona nó |
| PUT | `/flows/:id/nodes/:nodeId` | Atualiza nó |
| DELETE | `/flows/:id/nodes/:nodeId` | Remove nó |

### Endpoints de Teste

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/flow-test/simulate-message` | Simula mensagem (sem enviar ao WhatsApp) |
| POST | `/flow-test/respond` | Responde a fluxo em execução |
| GET | `/flow-test/status/:phone` | Status do fluxo para telefone |
| POST | `/flow-test/cancel` | Cancela fluxo ativo |
| GET | `/flow-test/flows` | Lista fluxos disponíveis |
| POST | `/flow-test/start-flow` | Inicia fluxo manualmente |
| POST | `/flow-test/reset` | Limpa dados de teste |

---

## Dicas e Boas Práticas

### Performance

1. **Evite loops infinitos**: Sempre tenha condição de saída
2. **Use delay com moderação**: Delays longos ocupam recursos
3. **Limite histórico de conversa**: Não carregue mais de 20 mensagens para IA

### Manutenção

1. **Nomeie nós claramente**: Use labels descritivos
2. **Documente instruções da IA**: Seja específico nas instruções
3. **Teste em ambiente isolado**: Use a rota `/flow-test/` antes de produção

### Segurança

1. **Nunca exponha dados sensíveis**: Não inclua senhas em mensagens
2. **Valide inputs**: Especialmente em ações que modificam dados
3. **Use flows_blocked**: Para pausar automações quando necessário

---

## Glossário

| Termo | Definição |
|-------|-----------|
| **Flow** | Fluxo de automação composto por nós e conexões |
| **Node** | Etapa/ação dentro de um fluxo |
| **Edge** | Conexão entre dois nós |
| **Run** | Execução ativa de um fluxo para um cliente |
| **Trigger** | Evento que inicia um fluxo |
| **Context** | Dados disponíveis durante a execução |
| **Wait** | Estado de espera por resposta do usuário |
| **Capability** | Permissão de ação para a IA |
