/**
 * 🤖 AI TOOL FUNCTIONS - Funções disponíveis para a IA executar
 * 
 * Este arquivo contém todas as funções que o Gemini pode executar via function calling
 * Inclui: Agendamentos, CRM, Comunicação, Controle de Fluxo, Localização
 */

const dbQuery = require('./dbHelper');
const moment = require('moment');

/**
 * Definições das funções para o Gemini (Function Declarations)
 * FORMATO: JSON Schema padrão compatível com @google/genai SDK v1.33+
 */
const toolDefinitions = [
    // ═══════════════════════════════════════════════════════════════════
    // 📅 AGENDAMENTOS
    // ═══════════════════════════════════════════════════════════════════
    {
        name: "buscarDisponibilidades",
        description: "OBRIGATÓRIO: Busca horários disponíveis para agendamento em um período. SEMPRE use esta função ANTES de confirmar qualquer horário com o cliente. Retorna lista de horários livres.",
        parameters: {
            type: "object",
            properties: {
                dataInicio: {
                    type: "string",
                    description: "Data inicial no formato YYYY-MM-DD (ex: 2025-12-17)"
                },
                dataFim: {
                    type: "string",
                    description: "Data final no formato YYYY-MM-DD (ex: 2025-12-20)"
                },
                duracaoMinutos: {
                    type: "integer",
                    description: "Duração do serviço em minutos (padrão: 60)"
                },
                periodoPreferido: {
                    type: "string",
                    enum: ["manha", "tarde", "noite", "qualquer"],
                    description: "Período preferido do cliente"
                },
                servicoId: {
                    type: "integer",
                    description: "ID do serviço desejado"
                }
            },
            required: ["dataInicio", "dataFim"]
        }
    },
    {
        name: "verificarHorarioDisponivel",
        description: "Verifica se um horário específico está disponível para agendamento",
        parameters: {
            type: "object",
            properties: {
                data: {
                    type: "string",
                    description: "Data no formato YYYY-MM-DD"
                },
                horaInicio: {
                    type: "string",
                    description: "Horário de início no formato HH:MM (ex: 10:00)"
                },
                horaFim: {
                    type: "string",
                    description: "Horário de fim no formato HH:MM"
                },
                servicoId: {
                    type: "integer",
                    description: "ID do serviço"
                }
            },
            required: ["data", "horaInicio"]
        }
    },
    {
        name: "consultarAgendamentosCliente",
        description: "IMPORTANTE: Consulta os agendamentos de um cliente. USE SEMPRE quando o cliente perguntar sobre 'meu agendamento', 'último agendamento', 'histórico de agendamentos', 'agendamentos anteriores' ou 'próximos agendamentos'.",
        parameters: {
            type: "object",
            properties: {
                clienteId: {
                    type: "integer",
                    description: "ID do cliente (obtido automaticamente do contexto)"
                },
                tipo: {
                    type: "string",
                    enum: ["ultimos", "proximos", "todos", "hoje"],
                    description: "Tipo de consulta: ultimos (passados), proximos (futuros), todos ou hoje"
                },
                limite: {
                    type: "integer",
                    description: "Quantidade máxima de resultados (padrão: 5)"
                }
            },
            required: ["tipo"]
        }
    },
    {
        name: "criarAgendamento",
        description: "AÇÃO CRÍTICA: Cria um novo agendamento no sistema. Use IMEDIATAMENTE após o cliente confirmar data e horário. NÃO apenas responda 'ok, agendado' - EXECUTE esta função para criar o agendamento de verdade!",
        parameters: {
            type: "object",
            properties: {
                data: {
                    type: "string",
                    description: "Data do agendamento no formato YYYY-MM-DD (ex: 2025-12-17)"
                },
                horaInicio: {
                    type: "string",
                    description: "Horário de início no formato HH:MM (ex: 10:00)"
                },
                horaFim: {
                    type: "string",
                    description: "Horário de fim no formato HH:MM (opcional, será calculado automaticamente)"
                },
                funcionarioId: {
                    type: "integer",
                    description: "ID do funcionário/profissional (opcional, será escolhido automaticamente)"
                },
                servicoId: {
                    type: "integer",
                    description: "ID do serviço"
                },
                endereco: {
                    type: "string",
                    description: "Endereço completo do atendimento (se diferente do cadastrado)"
                },
                observacoes: {
                    type: "string",
                    description: "Observações adicionais"
                }
            },
            required: ["data", "horaInicio"]
        }
    },
    {
        name: "atualizarAgendamento",
        description: "Atualiza um agendamento existente (data, horário, status, observações)",
        parameters: {
            type: "object",
            properties: {
                agendamentoId: {
                    type: "integer",
                    description: "ID do agendamento a atualizar"
                },
                data: {
                    type: "string",
                    description: "Nova data no formato YYYY-MM-DD"
                },
                horaInicio: {
                    type: "string",
                    description: "Novo horário de início no formato HH:MM"
                },
                status: {
                    type: "string",
                    enum: ["agendado", "confirmado", "atendido", "concluido", "cancelado", "remarcado"],
                    description: "Novo status do agendamento"
                },
                observacoes: {
                    type: "string",
                    description: "Observações atualizadas"
                }
            },
            required: ["agendamentoId"]
        }
    },
    {
        name: "cancelarAgendamento",
        description: "Cancela um agendamento existente quando o cliente solicitar cancelamento",
        parameters: {
            type: "object",
            properties: {
                agendamentoId: {
                    type: "integer",
                    description: "ID do agendamento a cancelar"
                },
                motivo: {
                    type: "string",
                    description: "Motivo do cancelamento"
                }
            },
            required: ["agendamentoId"]
        }
    },

    // ═══════════════════════════════════════════════════════════════════
    // 💼 CRM E NEGÓCIOS
    // ═══════════════════════════════════════════════════════════════════
    {
        name: "criarNegocio",
        description: "IMPORTANTE: Cria uma nova oportunidade/negócio no CRM. Use no INÍCIO da conversa quando cliente demonstrar interesse em agendar ou comprar. Isso permite rastrear o funil de vendas.",
        parameters: {
            type: "object",
            properties: {
                titulo: {
                    type: "string",
                    description: "Título do negócio (ex: 'Interesse em agendamento - Maria Silva')"
                },
                descricao: {
                    type: "string",
                    description: "Descrição detalhada do negócio"
                },
                valor: {
                    type: "number",
                    description: "Valor estimado do negócio"
                },
                etapaId: {
                    type: "integer",
                    description: "ID da etapa do funil"
                },
                funnelId: {
                    type: "integer",
                    description: "ID do funil"
                }
            },
            required: ["titulo"]
        }
    },
    {
        name: "atualizarNegocio",
        description: "Atualiza um negócio existente no CRM (avançar etapa, atualizar valor, adicionar anotação)",
        parameters: {
            type: "object",
            properties: {
                negocioId: {
                    type: "integer",
                    description: "ID do negócio a atualizar"
                },
                titulo: {
                    type: "string",
                    description: "Novo título"
                },
                valor: {
                    type: "number",
                    description: "Novo valor"
                },
                etapaId: {
                    type: "integer",
                    description: "Nova etapa do funil (use para avançar o negócio)"
                }
            },
            required: ["negocioId"]
        }
    },
    {
        name: "atualizarCliente",
        description: "Atualiza dados do cliente quando ele informar novos dados (nome, email, telefone, endereço, observações)",
        parameters: {
            type: "object",
            properties: {
                nome: {
                    type: "string",
                    description: "Nome do cliente"
                },
                email: {
                    type: "string",
                    description: "Email do cliente"
                },
                telefone: {
                    type: "string",
                    description: "Telefone do cliente"
                },
                endereco: {
                    type: "string",
                    description: "Endereço completo do cliente"
                },
                observacoes: {
                    type: "string",
                    description: "Observações sobre o cliente"
                },
                tags: {
                    type: "array",
                    items: { type: "string" },
                    description: "Tags para o cliente"
                }
            }
        }
    },

    // ═══════════════════════════════════════════════════════════════════
    // ⏱️ CONTROLE DE FLUXO
    // ═══════════════════════════════════════════════════════════════════
    {
        name: "aguardarResposta",
        description: "Pausa o fluxo e aguarda resposta do cliente antes de continuar",
        parameters: {
            type: "object",
            properties: {
                timeout: {
                    type: "integer",
                    description: "Tempo máximo de espera em segundos (padrão: 300 = 5min)"
                },
                variavel: {
                    type: "string",
                    description: "Nome da variável para armazenar a resposta"
                }
            }
        }
    },
    {
        name: "agendarAcaoFutura",
        description: "Agenda uma ação para ser executada após X minutos. Use para follow-ups, lembretes ou quando instruído a 'esperar X minutos se cliente não responder'.",
        parameters: {
            type: "object",
            properties: {
                minutos: {
                    type: "integer",
                    description: "Quantidade de minutos para aguardar antes de executar a ação"
                },
                acao: {
                    type: "string",
                    enum: ["followup", "lembrete", "enviar_mensagem", "verificar_resposta"],
                    description: "Tipo de ação a executar"
                },
                mensagem: {
                    type: "string",
                    description: "Mensagem a ser enviada quando a ação for executada"
                }
            },
            required: ["minutos", "acao"]
        }
    },
    {
        name: "bloquearClienteFluxos",
        description: "Bloqueia ou desbloqueia um cliente de receber novos fluxos automáticos (útil quando aguardando atendente humano)",
        parameters: {
            type: "object",
            properties: {
                bloquear: {
                    type: "boolean",
                    description: "true para bloquear, false para desbloquear"
                }
            },
            required: ["bloquear"]
        }
    },
    {
        name: "encaminharParaAtendente",
        description: "Encaminha a conversa para um atendente humano. Use apenas internamente - NUNCA diga ao cliente que está encaminhando.",
        parameters: {
            type: "object",
            properties: {
                mensagem: {
                    type: "string",
                    description: "Mensagem interna sobre o motivo do encaminhamento"
                },
                departamento: {
                    type: "string",
                    description: "Departamento para encaminhar (opcional)"
                },
                prioridade: {
                    type: "string",
                    enum: ["baixa", "normal", "alta", "urgente"],
                    description: "Prioridade do atendimento"
                }
            }
        }
    },
    {
        name: "redirecionarFluxo",
        description: "Redireciona para outro fluxo específico",
        parameters: {
            type: "object",
            properties: {
                fluxoId: {
                    type: "integer",
                    description: "ID do fluxo para redirecionar"
                },
                fluxoNome: {
                    type: "string",
                    description: "Nome do fluxo (alternativa ao ID)"
                }
            }
        }
    },

    // ═══════════════════════════════════════════════════════════════════
    // 💬 COMUNICAÇÃO
    // ═══════════════════════════════════════════════════════════════════
    {
        name: "enviarMensagem",
        description: "Envia mensagem WhatsApp para o cliente",
        parameters: {
            type: "object",
            properties: {
                mensagem: {
                    type: "string",
                    description: "Texto da mensagem"
                },
                phone: {
                    type: "string",
                    description: "Número de telefone (opcional, usa o do cliente atual)"
                }
            },
            required: ["mensagem"]
        }
    },
    {
        name: "enviarEmail",
        description: "Envia email para o cliente",
        parameters: {
            type: "object",
            properties: {
                destinatario: {
                    type: "string",
                    description: "Email do destinatário (opcional, usa o do cliente)"
                },
                assunto: {
                    type: "string",
                    description: "Assunto do email"
                },
                corpo: {
                    type: "string",
                    description: "Corpo do email"
                }
            },
            required: ["assunto", "corpo"]
        }
    },

    // ═══════════════════════════════════════════════════════════════════
    // 🗺️ LOCALIZAÇÃO E DISTÂNCIA
    // ═══════════════════════════════════════════════════════════════════
    {
        name: "geocodificarEndereco",
        description: "Converte endereço em coordenadas geográficas (latitude/longitude)",
        parameters: {
            type: "object",
            properties: {
                endereco: {
                    type: "string",
                    description: "Endereço completo para geocodificar"
                }
            },
            required: ["endereco"]
        }
    },
    {
        name: "calcularDistancia",
        description: "Calcula distância e tempo de deslocamento entre dois endereços",
        parameters: {
            type: "object",
            properties: {
                endereco1: {
                    type: "string",
                    description: "Endereço de origem"
                },
                endereco2: {
                    type: "string",
                    description: "Endereço de destino"
                }
            },
            required: ["endereco1", "endereco2"]
        }
    },
    {
        name: "resumirDisponibilidadeComMaps",
        description: "Resume opções de disponibilidade considerando localização do cliente para otimizar roteirização",
        parameters: {
            type: "object",
            properties: {
                opcoes: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            data: { type: "string" },
                            horarioInicio: { type: "string" },
                            horarioFim: { type: "string" },
                            funcionario: { type: "string" }
                        }
                    },
                    description: "Lista de opções de disponibilidade"
                },
                latLng: {
                    type: "object",
                    properties: {
                        lat: { type: "number" },
                        lng: { type: "number" }
                    },
                    description: "Coordenadas do cliente"
                }
            },
            required: ["opcoes"]
        }
    }
];

/**
 * Executar função chamada pela IA
 * @param {String} functionName - Nome da função
 * @param {Object} args - Argumentos
 * @param {Object} context - Contexto do fluxo
 * @returns {Promise<Object>} - Resultado
 */
async function executeToolFunction(functionName, args, context = {}) {
    console.log(`\n🔧 Executando função: ${functionName}`);
    console.log('📥 Argumentos:', JSON.stringify(args, null, 2));

    try {
    switch (functionName) {
            // ═══════════════════════════════════════════════════════════════════
            // 📅 AGENDAMENTOS
            // ═══════════════════════════════════════════════════════════════════
            case 'buscarDisponibilidades': {
                const availabilityHelper = require('../flows/helpers/availabilityHelper');
                const resultado = await availabilityHelper.buscarOpcoesDisponibilidade(
                args.dataInicio,
                args.dataFim,
                args.duracaoMinutos || 60,
                    args.periodoPreferido || 'qualquer',
                    args.servicoId || null,
                    args.subservicoId || null
                );
                console.log(`✅ Encontradas ${resultado?.length || 0} opções de disponibilidade`);
                return resultado;
            }

            case 'verificarHorarioDisponivel': {
            const { verificarDisponibilidadeGeral } = require('../flows/helpers/availabilityHelper');
                const resultado = await verificarDisponibilidadeGeral(
                args.data,
                args.horaInicio,
                args.horaFim,
                args.servicoId,
                args.subservicoId
            );
                console.log(`✅ Horário ${args.horaInicio} em ${args.data}: ${resultado.disponivel ? 'Disponível' : 'Indisponível'}`);
                return resultado;
            }

            case 'consultarAgendamentosCliente': {
                const clienteId = args.clienteId || context?.cliente?.cli_Id;
                if (!clienteId) {
                    return { error: 'Cliente não identificado', agendamentos: [] };
                }
                
                const tipo = args.tipo || 'proximos';
                const limite = args.limite || 5;
                const hoje = moment().format('YYYY-MM-DD');
                
                // Usar a função completa do agendaUtils
                const { getAgendamentos } = require('./agendaUtils');
                
                let query = `
                    SELECT * FROM AGENDAMENTO a
                    WHERE a.cli_id = ?
                    AND a.age_ativo = 1
                `;
                
                const params = [clienteId];
                
                switch (tipo) {
                    case 'ultimos':
                        query += ` AND a.age_data < ? ORDER BY a.age_data DESC, a.age_horaInicio DESC`;
                        params.push(hoje);
                        break;
                    case 'proximos':
                        query += ` AND a.age_data >= ? ORDER BY a.age_data ASC, a.age_horaInicio ASC`;
                        params.push(hoje);
                        break;
                    case 'hoje':
                        query += ` AND a.age_data = ? ORDER BY a.age_horaInicio ASC`;
                        params.push(hoje);
                        break;
                    default:
                        query += ` ORDER BY a.age_data DESC, a.age_horaInicio DESC`;
                }
                
                query += ` LIMIT ?`;
                params.push(limite);
                
                // Usar getAgendamentos para obter dados completos
                const agendamentos = await getAgendamentos(query, params);
                
                // Formatar para a IA de forma mais completa
                const formatados = agendamentos.map(ag => {
                    const servicosNomes = ag.servicos?.map(s => s.ser_nome).join(', ') || 'Serviço';
                    const funcionarioNome = ag.funcionario?.[0]?.fullName || 'A definir';
                    const clienteNome = ag.cliente?.[0]?.cli_nome || '';
                    const endereco = ag.endereco?.[0] 
                        ? `${ag.endereco[0].end_logradouro || ''}, ${ag.endereco[0].end_numero || ''} - ${ag.endereco[0].end_bairro || ''}`
                        : '';
                    
                    return {
                        id: ag.age_id,
                        data: moment(ag.age_data).format('DD/MM/YYYY'),
                        diaSemana: moment(ag.age_data).format('dddd'),
                        horario: `${ag.age_horaInicio}${ag.age_horaFim ? ' às ' + ag.age_horaFim : ''}`,
                        status: ag.status || 'Pendente',
                        funcionario: funcionarioNome,
                        servicos: servicosNomes,
                        valor: ag.age_valor ? `R$ ${parseFloat(ag.age_valor).toFixed(2)}` : null,
                        valorPago: ag.age_valorPago ? `R$ ${parseFloat(ag.age_valorPago).toFixed(2)}` : null,
                        endereco: endereco,
                        observacao: ag.age_observacao,
                        pago: ag.pago
                    };
                });
                
                console.log(`✅ Encontrados ${formatados.length} agendamentos (${tipo}) para cliente ${clienteId}`);
                
                // Criar resumo textual para a IA
                let resumoTexto = '';
                if (formatados.length > 0) {
                    resumoTexto = formatados.map((ag, i) => 
                        `${i + 1}. ${ag.data} (${ag.diaSemana}) às ${ag.horario} - ${ag.servicos} com ${ag.funcionario} - Status: ${ag.status}${ag.valor ? ` - Valor: ${ag.valor}` : ''}`
                    ).join('\n');
                } else {
                    resumoTexto = tipo === 'ultimos' 
                        ? 'O cliente não possui agendamentos anteriores.' 
                        : tipo === 'proximos' 
                            ? 'O cliente não possui agendamentos futuros marcados.'
                            : 'Nenhum agendamento encontrado.';
                }
                
                return {
                    tipo,
                    total: formatados.length,
                    agendamentos: formatados,
                    resumoTexto,
                    mensagem: formatados.length > 0 
                        ? `Encontrados ${formatados.length} agendamentos` 
                        : 'Nenhum agendamento encontrado'
                };
            }

            case 'verificarDataDisponivel': {
                const { isDataBloqueada } = require('../flows/helpers/availabilityHelper');
                const bloqueada = await isDataBloqueada(args.data);
                return { disponivel: !bloqueada, dataBloqueada: bloqueada };
            }

            case 'criarAgendamento': {
                console.log('\n📅 ========== CRIANDO AGENDAMENTO VIA IA ==========');
                console.log('📥 Args recebidos:', JSON.stringify(args, null, 2));
                console.log('👤 Cliente no contexto:', context?.cliente?.cli_Id || context?.cliente?.id || 'NÃO ENCONTRADO');
                
                if (!context || !context.cliente) {
                    console.error('❌ ERRO: Contexto sem cliente!');
                    return { error: 'Contexto com cliente necessário para criar agendamento', success: false };
                }
                
                const { createAgendamento } = require('../flows/actions/agendamentoActions');
                const moment = require('moment');
                const clienteId = context.cliente.cli_Id || context.cliente.id;
                
                // ═══════════════════════════════════════════════════════════════════
                // VERIFICAÇÃO DE DUPLICATAS - Evita criar múltiplos agendamentos
                // ═══════════════════════════════════════════════════════════════════
                console.log('🔍 Verificando agendamentos existentes para evitar duplicatas...');
                
                // Verificar se já existe agendamento pendente para a mesma data
                const agendamentosExistentes = await dbQuery(`
                    SELECT age_id, age_data, age_horaInicio, age_horaFim, ast_id
                    FROM AGENDAMENTO 
                    WHERE cli_id = ? 
                    AND age_ativo = 1 
                    AND ast_id IN (1, 2)  -- Agendado ou Confirmado
                    AND age_data = ?
                    ORDER BY age_horaInicio ASC
                `, [clienteId, args.data]);
                
                if (agendamentosExistentes.length > 0) {
                    const existente = agendamentosExistentes[0];
                    console.log(`⚠️ DUPLICATA DETECTADA! Já existe agendamento #${existente.age_id} para ${args.data}`);
                    console.log(`   Horário existente: ${existente.age_horaInicio}`);
                    console.log(`   Horário solicitado: ${args.horaInicio}`);
                    
                    // Se é para o mesmo horário, retornar sucesso sem criar novo
                    if (existente.age_horaInicio === args.horaInicio) {
                        console.log('✅ Agendamento já existe para este horário, retornando existente');
                        return {
                            success: true,
                            agendamentoId: existente.age_id,
                            agendamento_id: existente.age_id,
                            jaExistia: true,
                            mensagemConfirmacao: `Você já tem um agendamento confirmado para ${args.data} às ${args.horaInicio}`,
                            contextUpdates: {
                                agendamento_id: existente.age_id,
                                agendamento_data: args.data,
                                agendamento_hora: args.horaInicio
                            }
                        };
                    }
                    
                    // Se é horário diferente, atualizar o existente ao invés de criar novo
                    console.log('🔄 Atualizando agendamento existente para novo horário...');
                    const { updateAgendamento } = require('../flows/actions/agendamentoActions');
                    const updateResult = await updateAgendamento({
                        agendamentoId: existente.age_id,
                        data: args.data,
                        horaInicio: args.horaInicio,
                        horaFim: args.horaFim,
                        observacoes: `Horário alterado via IA de ${existente.age_horaInicio} para ${args.horaInicio} - ${moment().format('DD/MM/YYYY HH:mm')}`
                    }, context);
                    
                    if (updateResult.success) {
                        console.log(`✅ Agendamento #${existente.age_id} atualizado para ${args.horaInicio}`);
                        return {
                            ...updateResult,
                            agendamentoId: existente.age_id,
                            agendamento_id: existente.age_id,
                            foiAtualizado: true,
                            mensagemConfirmacao: `Agendamento alterado para ${args.data} às ${args.horaInicio}`,
                            contextUpdates: {
                                agendamento_id: existente.age_id,
                                agendamento_data: args.data,
                                agendamento_hora: args.horaInicio
                            }
                        };
                    }
                }
                
                // Verificar se existe agendamento pendente em outra data (remarcação)
                const agendamentoPendente = await dbQuery(`
                    SELECT age_id, age_data, age_horaInicio 
                    FROM AGENDAMENTO 
                    WHERE cli_id = ? 
                    AND age_ativo = 1 
                    AND ast_id IN (1, 2)  -- Agendado ou Confirmado
                    AND age_data >= CURDATE()
                    ORDER BY age_data ASC, age_horaInicio ASC
                    LIMIT 1
                `, [clienteId]);
                
                if (agendamentoPendente.length > 0 && context.isRemarking) {
                    const pendente = agendamentoPendente[0];
                    console.log(`🔄 Cliente tem agendamento pendente #${pendente.age_id} para ${pendente.age_data}`);
                    console.log('   Detectada intenção de remarcação, atualizando ao invés de criar...');
                    
                    const { updateAgendamento } = require('../flows/actions/agendamentoActions');
                    const updateResult = await updateAgendamento({
                        agendamentoId: pendente.age_id,
                        data: args.data,
                        horaInicio: args.horaInicio,
                        horaFim: args.horaFim,
                        statusId: 7, // Remarcado
                        observacoes: `Remarcado via IA de ${moment(pendente.age_data).format('DD/MM/YYYY')} ${pendente.age_horaInicio} para ${args.data} ${args.horaInicio}`
                    }, context);
                    
                    if (updateResult.success) {
                        return {
                            ...updateResult,
                            foiRemarcado: true,
                            agendamentoAnterior: {
                                id: pendente.age_id,
                                data: pendente.age_data,
                                hora: pendente.age_horaInicio
                            }
                        };
                    }
                }
                
                // ═══════════════════════════════════════════════════════════════════
                // CRIAR NOVO AGENDAMENTO (se não houver duplicata)
                // ═══════════════════════════════════════════════════════════════════
                
                // Calcular hora fim se não fornecida (60 minutos padrão)
                let horaFim = args.horaFim;
                if (!horaFim && args.horaInicio) {
                    const horaInicioMoment = moment(args.horaInicio, 'HH:mm');
                    horaFim = horaInicioMoment.add(60, 'minutes').format('HH:mm');
                    console.log(`⏰ Hora fim calculada: ${horaFim}`);
                }
                
                const createConfig = {
                    data: args.data,
                    horaInicio: args.horaInicio,
                    horaFim: horaFim,
                    funcionarioId: args.funcionarioId || args.profissionalId || null, // null = escolher automaticamente
                    observacoes: args.observacoes || `Agendamento criado via IA - ${moment().format('DD/MM/YYYY HH:mm')}`,
                    statusId: 1, // Agendado
                    fonte: 'ia_gemini',
                    enderecoMode: args.endereco ? 'novo' : 'padrao'
                };
                
                // Processar endereço
                if (args.endereco) {
                    if (typeof args.endereco === 'string') {
                        // Se é string, tentar parsear ou usar como logradouro
                        createConfig.enderecoMode = 'novo';
                        createConfig.endereco = {
                            logradouro: args.endereco
                        };
                    } else {
                        createConfig.endereco = args.endereco;
                    }
                }
                
                // Serviços
                if (args.servicoId || args.servicos) {
                    createConfig.servicos = [];
                    if (args.servicoId) {
                        createConfig.servicos.push({
                            servicoId: args.servicoId,
                            quantidade: args.quantidade || 1,
                            valor: args.valor || 0,
                            descricao: args.descricaoServico || ''
                        });
                    } else if (Array.isArray(args.servicos)) {
                        createConfig.servicos = args.servicos;
                    }
                }
                
                console.log('📋 Config final:', JSON.stringify(createConfig, null, 2));
                
                try {
                    const resultado = await createAgendamento(createConfig, context);
                    
                    console.log('📤 Resultado createAgendamento:', JSON.stringify(resultado, null, 2));
                    
                    if (resultado.success) {
                        console.log(`✅ ========== AGENDAMENTO #${resultado.agendamentoId || resultado.agendamento_id} CRIADO! ==========\n`);
                        
                        // Criar negócio automaticamente se não existir
                        const clienteId = context.cliente.cli_Id || context.cliente.id;
                        const clienteNome = context.cliente.cli_nome || 'Cliente';
                        
                        try {
                            const { criarNegocioAutomatico } = require('./negocioHelper');
                            const negocioExistente = await dbQuery(
                                `SELECT id FROM Negocios WHERE cli_Id = ? AND status = 'Pendente' LIMIT 1`,
                                [clienteId]
                            );
                            
                            if (negocioExistente.length === 0) {
                                console.log('💼 Criando negócio automático para o cliente...');
                                const negocioResult = await criarNegocioAutomatico({
                                    clienteId,
                                    titulo: `Agendamento - ${clienteNome}`,
                                    valor: args.valor || 0,
                                    origem: 'Agendamento via IA',
                                    descricao: `Agendamento para ${args.data} às ${args.horaInicio}`
                                });
                                
                                if (negocioResult.success) {
                                    console.log(`✅ Negócio #${negocioResult.negocioId} criado automaticamente!`);
                                    
                                    // Vincular agendamento ao negócio
                                    await dbQuery(
                                        'UPDATE Negocios SET age_id = ? WHERE id = ?',
                                        [resultado.agendamentoId || resultado.agendamento_id, negocioResult.negocioId]
                                    );
                                }
                            }
                        } catch (negocioErr) {
                            console.error('⚠️ Erro ao criar negócio automático:', negocioErr.message);
                            // Não falhar o agendamento por causa do negócio
                        }
                        
                        return {
                            ...resultado,
                            mensagemConfirmacao: `Agendamento confirmado para ${args.data} às ${args.horaInicio}`,
                            contextUpdates: {
                                agendamento_id: resultado.agendamentoId || resultado.agendamento_id,
                                agendamento_data: args.data,
                                agendamento_hora: args.horaInicio
                            }
                        };
                    }
                    
                    console.error('❌ Falha ao criar agendamento:', resultado.error);
                    return resultado;
                } catch (createError) {
                    console.error('❌ EXCEÇÃO ao criar agendamento:', createError);
                    return { success: false, error: createError.message };
                }
            }

            case 'atualizarAgendamento': {
            if (!context) {
                    return { error: 'Contexto necessário para atualizar agendamento', success: false };
            }
                
            const { updateAgendamento } = require('../flows/actions/agendamentoActions');
            
                // Mapear status para ID
            let statusId = null;
            if (args.status) {
                const statusMap = {
                    'agendado': 1,
                    'confirmado': 2,
                    'atendido': 3,
                    'concluido': 3,
                        'em_atendimento': 4,
                        'em_deslocamento': 5,
                    'cancelado': 6,
                    'remarcado': 7
                };
                statusId = statusMap[args.status.toLowerCase()] || null;
            }
            
                const updateConfig = {
                agendamentoId: args.agendamentoId || context.agendamento_id,
                data: args.data,
                horaInicio: args.horaInicio,
                horaFim: args.horaFim,
                    funcionarioId: args.funcionarioId,
                statusId: statusId,
                    observacoes: args.observacoes
                };
                
                console.log('📝 Atualizando agendamento:', updateConfig);
                return await updateAgendamento(updateConfig, context);
            }

            case 'cancelarAgendamento': {
            if (!context) {
                    return { error: 'Contexto necessário para cancelar agendamento', success: false };
                }
                
                const { updateAgendamento: updateForCancel } = require('../flows/actions/agendamentoActions');
                return await updateForCancel({
                    agendamentoId: args.agendamentoId || context.agendamento_id,
                    statusId: 6, // Cancelado
                    observacoes: args.motivo || 'Cancelado via IA'
                }, context);
            }

            // ═══════════════════════════════════════════════════════════════════
            // 💼 CRM E NEGÓCIOS
            // ═══════════════════════════════════════════════════════════════════
            case 'criarNegocio': {
                console.log('\n💼 ========== CRIANDO NEGÓCIO VIA IA ==========');
                console.log('📥 Args recebidos:', JSON.stringify(args, null, 2));
                
                if (!context || !context.cliente) {
                    console.error('❌ ERRO: Contexto sem cliente!');
                    return { error: 'Contexto com cliente necessário para criar negócio', success: false };
                }
                
                const clienteId = context.cliente.cli_Id || context.cliente.id;
                const clienteNome = context.cliente.cli_nome || 'Cliente';
                
                // Verificar se já existe negócio ativo para este cliente
                const negocioExistente = await dbQuery(
                    `SELECT id, title, status FROM Negocios WHERE cli_Id = ? AND status = 'Pendente' ORDER BY created_at DESC LIMIT 1`,
                    [clienteId]
                );
                
                if (negocioExistente.length > 0) {
                    console.log(`⚠️ Cliente já possui negócio ativo: #${negocioExistente[0].id} - ${negocioExistente[0].title}`);
                    
                    // Atualizar negócio existente se necessário
                    if (args.valor || args.titulo) {
                        const { atualizarNegocio } = require('./negocioHelper');
                        await atualizarNegocio({
                            negocioId: negocioExistente[0].id,
                            valor: args.valor,
                            anotacao: `Atualizado via IA: ${args.descricao || args.titulo || 'Nova interação'}`
                        });
                    }
                    
                    return {
                        success: true,
                        message: `Negócio existente #${negocioExistente[0].id} utilizado`,
                        negocioId: negocioExistente[0].id,
                        negocio_id: negocioExistente[0].id,
                        jaExistia: true,
                        contextUpdates: {
                            negocio_id: negocioExistente[0].id
                        }
                    };
                }
                
                // Criar novo negócio
                const { criarNegocioAutomatico } = require('./negocioHelper');
                const resultado = await criarNegocioAutomatico({
                    clienteId,
                    titulo: args.titulo || `Interesse - ${clienteNome}`,
                    valor: args.valor || 0,
                    origem: 'Conversa via IA',
                    descricao: args.descricao || `Cliente demonstrou interesse em agendamento/serviço`
                });

                if (resultado.success) {
                    console.log(`✅ ========== NEGÓCIO #${resultado.negocioId} CRIADO! ==========\n`);
                    return {
                        ...resultado,
                        negocio_id: resultado.negocioId,
                        contextUpdates: {
                            negocio_id: resultado.negocioId
                        }
                    };
                }
                
                console.error('❌ Falha ao criar negócio:', resultado.error);
                return resultado;
            }

            case 'atualizarNegocio': {
            if (!context) {
                    return { error: 'Contexto necessário para atualizar negócio', success: false };
                }
                
                const { updateNegocio } = require('../flows/actions/negocioActions');
                return await updateNegocio({
                    negocioId: args.negocioId || context.negocio_id,
                    titulo: args.titulo,
                    descricao: args.descricao,
                    valor: args.valor,
                    stageId: args.etapaId || args.stageId
                }, context);
            }

            case 'atualizarCliente': {
                if (!context || !context.cliente) {
                    return { error: 'Contexto com cliente necessário para atualizar', success: false };
                }
                
                const { updateCliente } = require('../flows/actions/clienteActions');
                return await updateCliente({
                nome: args.nome,
                email: args.email,
                telefone: args.telefone,
                    endereco: args.endereco,
                observacoes: args.observacoes,
                tags: args.tags
                }, context);
            }

            // ═══════════════════════════════════════════════════════════════════
            // ⏱️ CONTROLE DE FLUXO
            // ═══════════════════════════════════════════════════════════════════
            case 'aguardarResposta': {
                console.log('⏳ Configurando aguardar resposta...');
                
                const timeout = args.timeout || 300; // 5 minutos padrão
                const variavel = args.variavel || 'resposta_cliente';
                
                return {
                    success: true,
                    action: 'wait_reply',
                    timeout: timeout,
                    variavel: variavel,
                    contextUpdates: {
                        waiting_reply: true,
                        wait_timeout: timeout,
                        wait_variable: variavel
                    }
                };
            }

            case 'agendarAcaoFutura': {
                console.log(`⏰ Agendando ação para ${args.minutos} minutos...`);
                
                if (!context || !context.cliente) {
                    return { error: 'Contexto necessário para agendar ação', success: false };
                }
                
                const clienteId = context.cliente.cli_Id || context.cliente.id;
                const dataAgendada = moment().add(args.minutos, 'minutes').format('YYYY-MM-DD HH:mm:ss');
                
                // Inserir na tabela de ações agendadas
                try {
                    await dbQuery(`
                        INSERT INTO FlowScheduledActions 
                        (cliente_id, action_type, action_data, scheduled_at, status, created_at)
                        VALUES (?, ?, ?, ?, 'pending', NOW())
                    `, [
                        clienteId,
                        args.acao,
                        JSON.stringify({
                            mensagem: args.mensagem,
                            flowRunId: context.flowRunId,
                            flowId: context.flowId
                        }),
                        dataAgendada
                    ]);
                    
                    console.log(`✅ Ação agendada para ${dataAgendada}`);
                    
                    return {
                        success: true,
                        scheduledAt: dataAgendada,
                        action: args.acao,
                        message: `Ação "${args.acao}" agendada para ${args.minutos} minutos`
                    };
                } catch (error) {
                    console.error('❌ Erro ao agendar ação:', error);
                    return { error: error.message, success: false };
                }
            }

            case 'bloquearClienteFluxos': {
                console.log(`🔒 ${args.bloquear ? 'Bloqueando' : 'Desbloqueando'} cliente de fluxos...`);
                
                if (!context || !context.cliente) {
                    return { error: 'Contexto com cliente necessário', success: false };
                }
                
                const clienteId = context.cliente.cli_Id || context.cliente.id;
                
                try {
                    await dbQuery(`
                        UPDATE clientes 
                        SET flows_blocked = ?, flows_blocked_at = ${args.bloquear ? 'NOW()' : 'NULL'}
                        WHERE cli_Id = ?
                    `, [args.bloquear ? 1 : 0, clienteId]);
                    
                    console.log(`✅ Cliente ${args.bloquear ? 'bloqueado' : 'desbloqueado'}`);
                    
                    return {
                        success: true,
                        blocked: args.bloquear,
                        contextUpdates: {
                            flows_blocked: args.bloquear
                        }
                    };
                } catch (error) {
                    console.error('❌ Erro ao alterar bloqueio:', error);
                    return { error: error.message, success: false };
                }
            }

            case 'encaminharParaAtendente': {
                console.log('👨‍💼 Encaminhando para atendente...');
                
                if (!context || !context.cliente) {
                    return { error: 'Contexto necessário para encaminhar', success: false };
                }
                
                const mensagem = args.mensagem || 'Vou transferir você para um atendente humano. Aguarde um momento! 👨‍💼';
                const clienteId = context.cliente.cli_Id || context.cliente.id;
                
                try {
                    // Enviar mensagem ao cliente
                    const { sendWhatsAppMessage } = require('../flows/actions/messageActions');
                    await sendWhatsAppMessage({ message: mensagem }, context);
                    
                    // Bloquear fluxos automáticos
                    await dbQuery(`
                        UPDATE clientes 
                        SET flows_blocked = 1, flows_blocked_at = NOW(), flows_blocked_reason = 'wait_for_agent'
                        WHERE cli_Id = ?
                    `, [clienteId]);
                    
                    // Registrar encaminhamento
                    await dbQuery(`
                        INSERT INTO FlowForwardLog 
                        (cliente_id, reason, departamento, priority, created_at)
                        VALUES (?, ?, ?, ?, NOW())
                    `, [
                        clienteId,
                        'ia_encaminhou',
                        args.departamento || 'geral',
                        args.prioridade || 'normal'
                    ]);
                    
                    console.log('✅ Encaminhado para atendente');
                    
                    return {
                        success: true,
                        wait_for_agent: true,
                        contextUpdates: {
                            wait_for_agent: true,
                            flows_blocked: true
                        }
                    };
                } catch (error) {
                    console.error('❌ Erro ao encaminhar:', error);
                    return { error: error.message, success: false };
                }
            }

            case 'redirecionarFluxo': {
                console.log('↪️ Redirecionando fluxo...');
                
                let fluxoId = args.fluxoId;
                
                // Se passou nome, buscar ID
                if (!fluxoId && args.fluxoNome) {
                    const [flow] = await dbQuery(`
                        SELECT id FROM Flows WHERE name LIKE ? AND status = 'active' LIMIT 1
                    `, [`%${args.fluxoNome}%`]);
                    
                    if (flow) {
                        fluxoId = flow.id;
                    }
                }
                
                if (!fluxoId) {
                    return { error: 'Fluxo não encontrado', success: false };
                }
                
                return {
                    success: true,
                    action: 'redirect_flow',
                    targetFlowId: fluxoId,
                    contextUpdates: {
                        redirect_to_flow: fluxoId
                    }
                };
            }

            // ═══════════════════════════════════════════════════════════════════
            // 💬 COMUNICAÇÃO
            // ═══════════════════════════════════════════════════════════════════
            case 'enviarMensagem': {
                if (!context) {
                    return { error: 'Contexto necessário para enviar mensagem', success: false };
                }
                
                const { sendWhatsAppMessage } = require('../flows/actions/messageActions');
                return await sendWhatsAppMessage({
                    message: args.mensagem,
                    phone: args.phone,
                    fromAI: true // Marcar para ativar TTS se configurado
                }, context);
            }

            case 'enviarEmail': {
            if (!context) {
                    return { error: 'Contexto necessário para enviar email', success: false };
                }
                
                const { sendEmail } = require('../flows/actions/emailActions');
                return await sendEmail({
                    to: args.destinatario || context.cliente?.cli_email,
                    subject: args.assunto,
                    body: args.corpo
                }, context);
            }

            // ═══════════════════════════════════════════════════════════════════
            // 🗺️ LOCALIZAÇÃO E DISTÂNCIA
            // ═══════════════════════════════════════════════════════════════════
            case 'geocodificarEndereco': {
                const { geocodificarEnderecoComMaps } = require('../flows/helpers/availabilityHelper');
                const coords = await geocodificarEnderecoComMaps(args.endereco);
                console.log(`📍 Geocodificado: ${args.endereco} -> ${JSON.stringify(coords)}`);
                return { latLng: coords, endereco: args.endereco };
            }

            case 'calcularDistancia': {
                try {
                    const { calcularDistancia } = require('./distanceHelper');
                    return await calcularDistancia(args.endereco1, args.endereco2);
                } catch (error) {
                    console.error('❌ Erro ao calcular distância:', error);
                    return { error: 'Função de distância não disponível', success: false };
                }
            }

            case 'resumirDisponibilidadeComMaps': {
                const { resumirOpcoesParaIAComMaps } = require('../flows/helpers/availabilityHelper');
                const resumo = await resumirOpcoesParaIAComMaps(args.opcoes || [], args.latLng || null);
                return { resumo };
            }

            // ═══════════════════════════════════════════════════════════════════
            // DEFAULT
            // ═══════════════════════════════════════════════════════════════════
        default:
                console.warn(`⚠️ Função não implementada: ${functionName}`);
                return { error: `Função não encontrada: ${functionName}`, success: false };
        }
    } catch (error) {
        console.error(`❌ Erro ao executar ${functionName}:`, error);
        return { error: error.message, success: false };
    }
}

/**
 * Obter definições de ferramentas para o Gemini
 * @param {Array} capabilities - Lista de capacidades habilitadas (opcional)
 * @returns {Array} - Definições de ferramentas
 */
function getToolDefinitions(capabilities = null) {
    if (!capabilities || capabilities.length === 0) {
        return toolDefinitions;
    }
    
    // Filtrar por capacidades
    const capabilityMap = {
        'agendamentos': ['buscarDisponibilidades', 'verificarHorarioDisponivel', 'consultarAgendamentosCliente', 'criarAgendamento', 'atualizarAgendamento', 'cancelarAgendamento'],
        'crm': ['criarNegocio', 'atualizarNegocio', 'atualizarCliente'],
        'fluxo': ['aguardarResposta', 'agendarAcaoFutura', 'bloquearClienteFluxos', 'encaminharParaAtendente', 'redirecionarFluxo'],
        'comunicacao': ['enviarMensagem', 'enviarEmail'],
        'localizacao': ['geocodificarEndereco', 'calcularDistancia', 'resumirDisponibilidadeComMaps']
    };
    
    const allowedFunctions = new Set();
    for (const cap of capabilities) {
        if (capabilityMap[cap]) {
            capabilityMap[cap].forEach(fn => allowedFunctions.add(fn));
        }
    }
    
    return toolDefinitions.filter(tool => allowedFunctions.has(tool.name));
}

/**
 * Formatar definições para o formato Gemini
 */
function getToolsForGemini(capabilities = null) {
    const definitions = getToolDefinitions(capabilities);
    return [{
        functionDeclarations: definitions
    }];
}

module.exports = {
    executeToolFunction,
    getToolDefinitions,
    getToolsForGemini,
    toolDefinitions
};
