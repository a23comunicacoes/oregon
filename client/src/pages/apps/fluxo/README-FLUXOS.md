Guia rápido (MVP) - Fluxos

1) Tabelas criadas por createFlowTables() em server/src/utils/functions.js.
   - Flows, FlowTriggers, FlowNodes, FlowEdges, FlowRuns, FlowRunLogs

2) Rotas backend
   - GET/POST/PUT/DELETE /flows
   - POST /flows/:id/run  → inicia execução a partir de um nó
   - POST /flows/run/:runId/advance { flowId } → avança execução
   - ALL /flows/webhook/:key → dispara fluxo por webhook

3) Ações suportadas (node.type):
   - start/end (visuais)
   - send_whatsapp { content, media? }
   - send_email { to?, subject, html }
   - send_ai { instructions, replyOnWhatsApp? }
   - http { method, url, headers?, body?, params? }
   - condition { condition: {left, op, right} }
   - delay { seconds }
   - wait_reply { timeoutSeconds? }

4) Variáveis
   - Conteúdo suporta placeholders de crmUtils: {{cliente_nome}}, {{agendamento_data}}, etc.
   - Em condições, use {{chave}} para interpolar do contexto atual.

5) Triggers/Gatilhos
   - Webhook: crie um Flow com trigger_type = 'webhook' e defina webhook_key. Envie requisições para /flows/webhook/:key
   - Mensagem WhatsApp: quando FlowRuns está com wait_reply=1, qualquer mensagem recebida daquele número retoma o fluxo.

6) Estendendo
   - Ações: adicione novo case em execAction() no flowEngine.js
   - Condições: incremente evalCondition()
   - Triggers adicionais (ex: agendamento/pagamento): crie pontos de chamada para startFlow() nas rotas/serviços correspondentes.


