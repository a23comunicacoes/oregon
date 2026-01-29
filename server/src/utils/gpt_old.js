/**
 * 🤖 GPT INTEGRATION - Integração com OpenAI GPT
 * 
 * Sistema de IA usando OpenAI GPT-4o-mini (texto) e GPT-4o (áudio/voz)
 */

const OpenAI = require('openai');
const dbQuery = require('./dbHelper');
const availabilityHelper = require('../flows/helpers/availabilityHelper');
const { textToSpeech, shouldUseTTS } = require('../flows/helpers/textToSpeech');
const moment = require('moment');
const fs = require('fs').promises;
const path = require('path');

// Modelos configurados no código
const MODEL_TEXT = 'gpt-4o-mini'; // Para conversas de texto
const MODEL_AUDIO = 'gpt-4o'; // Para mensagens com áudio
const MODEL_TTS = 'tts-1'; // Para geração de áudio (Text-to-Speech)

/**
 * Parse seguro de JSON
 */
function parseJSON(value) {
    if (!value) return null;
    try {
        return typeof value === 'string' ? JSON.parse(value) : value;
    } catch (error) {
        return value;
    }
}

/**
 * Converte arquivo local para base64
 * @param {String} filePath - Caminho do arquivo
 * @returns {Object} - { mimeType, base64Data }
 */
async function fileToBase64(filePath) {
    try {
        const data = await fs.readFile(filePath);
        const ext = path.extname(filePath).toLowerCase();

        const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.mp3': 'audio/mp3',
            '.wav': 'audio/wav',
            '.ogg': 'audio/ogg',
            '.m4a': 'audio/mp4',
            '.mp4': 'video/mp4'
        };

        const mimeType = mimeTypes[ext] || 'application/octet-stream';

        return {
            mimeType,
            base64Data: data.toString('base64'),
            buffer: data
        };
    } catch (error) {
        console.error('❌ Erro ao processar arquivo:', filePath, error.message);
        return null;
    }
}

/**
 * Obtém configuração completa do GPT do banco de dados
 * @returns {Object} - Configuração do GPT
 */
async function getGPTConfig() {
    console.log('🔧 Buscando configuração do GPT no banco de dados...');

    const rows = await dbQuery(`SELECT * FROM Options WHERE type IN (
        "gpt_key",
        "gpt_comportamento",
        "gpt_empresa",
        "gpt_agendamentos",
        "gpt_disponibilidade",
        "gpt_protecao",
        "gpt_audio"
    )`);

    const get = (t) => {
        const r = rows.find(x => x.type === t);
        return r ? r.value : null;
    };

    const apiKey = get('gpt_key') || process.env.OPENAI_API_KEY || null;

    console.log('✅ Configuração GPT carregada:');
    console.log('   🔑 API Key:', apiKey ? '✓ Configurada' : '✗ Não encontrada');
    console.log('   🤖 Modelo Texto:', MODEL_TEXT);
    console.log('   🎤 Modelo Áudio:', MODEL_AUDIO);

    return {
        apiKey,
        modelText: MODEL_TEXT,
        modelAudio: MODEL_AUDIO,
        modelTTS: MODEL_TTS,
        comportamento: parseJSON(get('gpt_comportamento')) || {},
        empresa: parseJSON(get('gpt_empresa')) || {},
        agendamentos: parseJSON(get('gpt_agendamentos')) || {},
        disponibilidade: parseJSON(get('gpt_disponibilidade')) || {},
        protecao: parseJSON(get('gpt_protecao')) || { ativo: true },
        audio: parseJSON(get('gpt_audio')) || {}
    };
}

/**
 * Constrói as instruções do sistema para a IA
 * @param {Object} config - Configuração do GPT
 * @param {Object} context - Contexto da conversa
 * @returns {String} - Instruções formatadas
 */
async function buildSystemInstructions(config, context = {}) {
    let instructions = '';

    // === 1. ROLE/IDENTITY ===
    instructions += '# IDENTIDADE E PAPEL\n\n';

    const comp = config.comportamento || {};
    const emp = config.empresa || {};

    // Nome e apresentação
    const nome = comp.nome || 'Assistente';
    let artigo = 'um(a)';
    let pronome = 'experiente';
    
    if (comp.genero === 'masculino') {
        artigo = 'um';
        pronome = 'experiente';
    } else if (comp.genero === 'feminino') {
        artigo = 'uma';
        pronome = 'experiente';
    }

    instructions += `Você é ${artigo} atendente virtual chamado(a) **${nome}**`;
    
    if (emp.nome) {
        instructions += ` da empresa **${emp.nome}**`;
    }
    
    instructions += '.\n\n';
    
    // Sempre se apresente pelo nome nas primeiras interações
    instructions += `**IMPORTANTE**: Sempre se apresente como "${nome}" no início das conversas ou quando perguntarem seu nome.\n`;
    instructions += `Exemplo de saudação: "Olá! Meu nome é ${nome}, como posso ajudá-lo(a) hoje?"\n\n`;

    instructions += `Você é ${artigo} profissional ${pronome} em atendimento ao cliente via WhatsApp, `;
    instructions += 'especializado(a) em oferecer um atendimento humanizado, consultivo e eficiente.\n\n';

    if (comp.tom) {
        instructions += `**Tom de voz**: ${comp.tom}\n`;
    }

    if (comp.estilo) {
        instructions += `**Estilo de comunicação**: ${comp.estilo}\n`;
    }
    
    if (comp.instrucoesCustomizadas) {
        instructions += `\n**Instruções específicas de comportamento**:\n${comp.instrucoesCustomizadas}\n`;
    }

    // === 2. CONTEXTO TEMPORAL ===
    instructions += '\n# CONTEXTO TEMPORAL ATUAL\n\n';
    const agora = moment();
    instructions += `**Data e hora atual**: ${agora.format('DD/MM/YYYY HH:mm')}\n`;
    instructions += `**Dia da semana**: ${agora.format('dddd')}\n`;
    instructions += `**Mês**: ${agora.format('MMMM')}\n`;
    instructions += `**Ano**: ${agora.format('YYYY')}\n\n`;
    instructions += '**IMPORTANTE**: Quando o cliente mencionar dias da semana sem especificar data (ex: "quero na terça"), ';
    instructions += 'você deve considerar a próxima ocorrência desse dia A PARTIR DE HOJE. ';
    instructions += 'Se hoje é domingo e ele diz "quero na terça", refere-se à próxima terça-feira.\n';
    instructions += 'Se ele disser "amanhã", calcule a partir da data atual acima.\n';
    instructions += 'Se ele disser "depois de amanhã", some 2 dias à data atual.\n';
    instructions += 'Se ele mencionar "próxima semana", some 7 dias à data atual.\n\n';

    // === 3. EMPRESA ===
    if (emp.nome || emp.sobre) {
        instructions += '\n# SOBRE A EMPRESA\n\n';

        if (emp.nome) {
            instructions += `**Nome**: ${emp.nome}\n`;
        }

        if (emp.sobre) {
            instructions += `**Sobre**: ${emp.sobre}\n`;
        }

        if (emp.horarioAtendimento) {
            instructions += `**Horários de atendimento**: ${emp.horarioAtendimento}\n`;
        }

        if (emp.regiaoAtendida) {
            instructions += `**Região atendida**: ${emp.regiaoAtendida}\n`;
        }

        if (emp.localizacao) {
            instructions += `**Localização**: ${emp.localizacao}\n`;
        }
        
        if (emp.politicas) {
            instructions += `\n**Políticas e Regras**:\n${emp.politicas}\n`;
        }
        
        if (emp.informacoesAdicionais) {
            instructions += `\n**Informações Adicionais**:\n${emp.informacoesAdicionais}\n`;
        }
    }

    // === 4. DIRETRIZES DE ATENDIMENTO E VENDAS ===
    instructions += '\n# DIRETRIZES DE ATENDIMENTO E VENDAS\n\n';
    
    instructions += '## Postura Consultiva e Vendedora\n';
    instructions += '- **Você é um(a) vendedor(a) consultivo(a)**: Seu objetivo é ajudar o cliente E fechar negócios\n';
    instructions += '- **Identifique oportunidades**: Perceba quando o cliente demonstra interesse e conduza para o fechamento\n';
    instructions += '- **Seja proativo(a)**: Ofereça serviços complementares, sugira upgrades quando apropriado\n';
    instructions += '- **Crie urgência sutil**: Mencione disponibilidades limitadas, promoções temporárias\n';
    instructions += '- **Supere objeções**: Quando o cliente hesitar, aborde as preocupações de forma consultiva\n';
    instructions += '- **Sempre conduza ao próximo passo**: Cada mensagem deve avançar para o fechamento\n\n';
    
    instructions += '## Boas Práticas de Atendimento\n';
    instructions += '1. **Humanize a conversa**: Use linguagem natural, empatia e personalização baseada no histórico\n';
    instructions += '2. **Seja objetivo mas amigável**: Vá direto ao ponto sem perder o tom acolhedor\n';
    instructions += '3. **Personalize baseado no histórico**: Use informações de agendamentos e negócios anteriores\n';
    instructions += '4. **Confirme sempre antes de finalizar**: Recapitule todos os dados antes de criar/atualizar algo\n';
    instructions += '5. **Use as funções disponíveis**: Busque disponibilidades, verifique horários, gerencie negócios\n';
    instructions += '6. **Gerencie expectativas**: Se não houver disponibilidade, sugira alternativas atrativas\n';
    instructions += '7. **Valorize o relacionamento**: Clientes fiéis recebem tratamento especial\n\n';
    
    instructions += '## Gerenciamento de Negócios (Pipeline de Vendas)\n';
    instructions += '- **Sempre crie negócios**: Quando identificar intenção de compra, crie um negócio no CRM\n';
    instructions += '- **Acompanhe o pipeline**: Veja em qual etapa está cada negócio e avance conforme progresso\n';
    instructions += '- **Marque como ganho**: Quando finalizar agendamento/venda, marque o negócio como "Ganho"\n';
    instructions += '- **Marque como perdido**: Se o cliente desistir, marque como "Perdido" com motivo\n';
    instructions += '- **Registre valor**: Sempre que possível, registre o valor estimado/real do negócio\n\n';

    if (comp.diretrizes && Array.isArray(comp.diretrizes)) {
        instructions += '**Diretrizes adicionais configuradas**:\n';
        comp.diretrizes.forEach((diretriz, i) => {
            instructions += `${i + 1}. ${diretriz}\n`;
        });
        instructions += '\n';
    }

    // === 5. CONTEXTO DO CLIENTE ===
    if (context.cliente) {
        instructions += '\n# INFORMAÇÕES DO CLIENTE ATUAL\n\n';

        if (context.cliente.cli_nome) {
            instructions += `**Nome**: ${context.cliente.cli_nome}\n`;
        }

        if (context.cliente.cli_email) {
            instructions += `**Email**: ${context.cliente.cli_email}\n`;
        }

        if (context.cliente.cli_celular) {
            instructions += `**Telefone**: ${context.cliente.cli_celular}\n`;
        }
        
        if (context.cliente.cli_endereco || context.cliente.endereco) {
            instructions += `**Endereço**: ${context.cliente.cli_endereco || context.cliente.endereco}\n`;
        }
    }

    // === 6. CONTEXTO DO AGENDAMENTO ===
    if (context.agendamento) {
        instructions += '\n# AGENDAMENTO ATUAL\n\n';
        instructions += `**ID**: ${context.agendamento.age_id || context.agendamento.id}\n`;

        if (context.agendamento.age_data) {
            const dataAgend = moment(context.agendamento.age_data);
            instructions += `**Data**: ${dataAgend.format('DD/MM/YYYY')} (${dataAgend.format('dddd')})\n`;
        }

        if (context.agendamento.age_horaInicio) {
            instructions += `**Horário**: ${context.agendamento.age_horaInicio}`;
            if (context.agendamento.age_horaFim) {
                instructions += ` às ${context.agendamento.age_horaFim}`;
            }
            instructions += '\n';
        }
        
        if (context.agendamento.status || context.agendamento.age_status) {
            instructions += `**Status**: ${context.agendamento.status || context.agendamento.age_status}\n`;
        }
    }

    // === 6. SERVIÇOS DISPONÍVEIS ===
    if (config.agendamentos && config.agendamentos.servicos && config.agendamentos.servicos.length > 0) {
        instructions += '\n# SERVIÇOS DISPONÍVEIS\n\n';
        instructions += 'Você oferece os seguintes serviços:\n\n';
        
        for (const servico of config.agendamentos.servicos) {
            instructions += `## ${servico.nome}\n`;
            if (servico.descricao) {
                instructions += `${servico.descricao}\n\n`;
            }
            
            if (servico.regrasPrecificacao && servico.regrasPrecificacao.length > 0) {
                instructions += '**Precificação:**\n';
                for (const regra of servico.regrasPrecificacao) {
                    instructions += `- ${regra.titulo}: R$ ${regra.preco ? regra.preco.toFixed(2) : '0,00'}`;
                    if (regra.duracaoMinutos) {
                        instructions += ` (${regra.duracaoMinutos} minutos)`;
                    }
                    instructions += '\n';
                    if (regra.descricao) {
                        instructions += `  ${regra.descricao}\n`;
                    }
                    if (regra.condicoes) {
                        instructions += `  Quando: ${regra.condicoes}\n`;
                    }
                }
            }
            
            if (servico.observacoes) {
                instructions += `\n**Observações:** ${servico.observacoes}\n`;
            }
            
            instructions += '\n';
        }
        
        if (config.agendamentos.instrucoesGerais) {
            instructions += `\n**Instruções Gerais de Agendamento:**\n${config.agendamentos.instrucoesGerais}\n`;
        }
        
        if (config.agendamentos.regraDistancia) {
            instructions += `\n**Regras de Distância:**\n${config.agendamentos.regraDistancia}\n`;
        }
        
        if (config.agendamentos.regraConfirmacao) {
            instructions += `\n**Regras de Confirmação:**\n${config.agendamentos.regraConfirmacao}\n`;
        }
    }

    // === 7. FUNÇÕES DISPONÍVEIS (TOOLS) ===
    instructions += '\n# FUNÇÕES DISPONÍVEIS\n\n';
    instructions += 'Você tem acesso a TODAS as funções do sistema de fluxos. Use-as proativamente:\n\n';
    
    instructions += '## Agendamentos\n';
    instructions += '- `criarAgendamento`: Criar novo agendamento para o cliente\n';
    instructions += '- `atualizarAgendamento`: Atualizar agendamento existente\n';
    instructions += '- `cancelarAgendamento`: Cancelar agendamento\n';
    instructions += '- `buscarDisponibilidades`: Verificar horários disponíveis\n\n';
    
    instructions += '## Negócios e CRM\n';
    instructions += '- `criarNegocio`: Criar oportunidade no funil de vendas\n';
    instructions += '- `atualizarNegocio`: Atualizar negócio existente\n';
    instructions += '- `moverNegocioEtapa`: Mover negócio para outra etapa\n';
    instructions += '- `marcarNegocioGanho`: Marcar negócio como fechado\n';
    instructions += '- `marcarNegocioPerdido`: Marcar negócio como perdido\n';
    instructions += '- `atualizarCliente`: Atualizar dados do cliente\n';
    instructions += '- `adicionarAnotacao`: Adicionar nota sobre o atendimento\n';
    instructions += '- `adicionarTagsCliente`: Adicionar tags para segmentação\n';
    instructions += '- `removerTagsCliente`: Remover tags do cliente\n\n';
    
    instructions += '## Comunicação\n';
    instructions += '- `enviarMensagem`: Enviar mensagem WhatsApp\n';
    instructions += '- `enviarEmail`: Enviar email para o cliente\n';
    instructions += '- `enviarMenuOpcoes`: Enviar menu de opções interativo\n';
    instructions += '- `encaminharParaAtendente`: Encaminhar para atendente humano\n\n';
    
    instructions += '## Controle de Fluxo (MUITO IMPORTANTE)\n';
    instructions += '- `aguardarResposta`: Pausar e aguardar resposta do cliente\n';
    instructions += '  * Use quando precisar que o cliente responda algo\n';
    instructions += '  * Configure timeout para não esperar eternamente\n';
    instructions += '  * Especifique variáveis que quer capturar\n';
    instructions += '- `pausarFluxoEContinuar`: Pausar fluxo e continuar após X minutos\n';
    instructions += '  * Use para "enviar mensagem daqui 5 minutos"\n';
    instructions += '  * Use para "se não responder em X tempo, fazer Y"\n';
    instructions += '  * Descreva a ação que será executada após a pausa\n';
    instructions += '- `agendarAcaoFutura`: Agendar ação específica para o futuro\n';
    instructions += '- `aguardarTempo`: Fazer delay simples entre ações\n';
    instructions += '- `redirecionarFluxo`: Redirecionar para outro fluxo\n';
    instructions += '- `bloquearClienteFluxos`: Bloquear cliente de receber fluxos\n\n';
    
    instructions += '## Outras Funções\n';
    instructions += '- `calcularDistancia`: Calcular distância entre endereços\n';
    instructions += '- `executarRequisicaoHTTP`: Integração com APIs externas\n\n';
    
    instructions += '## 🎯 EXEMPLOS DE USO:\n\n';
    instructions += '**Exemplo 1 - Aguardar com timeout:**\n';
    instructions += 'Cliente: "Quero agendar"\n';
    instructions += 'Você: "Qual data você prefere?"\n';
    instructions += 'Ação: `aguardarResposta({timeoutMinutos: 5, variaveis: [{nome: "data_preferida"}]})`\n';
    instructions += 'Se não responder em 5 min → timeout → você envia lembrete\n\n';
    
    instructions += '**Exemplo 2 - Enviar mensagem após tempo:**\n';
    instructions += 'Cliente não respondeu algo importante\n';
    instructions += 'Você: Envia lembrete agora\n';
    instructions += 'Ação: `pausarFluxoEContinuar({minutos: 10, acaoAposPausa: "enviar segunda mensagem de lembrete"})`\n';
    instructions += 'Resultado: Após 10 minutos, fluxo continua automaticamente\n\n';
    
    instructions += '**Exemplo 3 - Menu de opções:**\n';
    instructions += 'Você: "Como posso ajudar?"\n';
    instructions += 'Ação: `enviarMenuOpcoes({mensagem: "Escolha uma opção:", opcoes: [...]})`\n';
    instructions += 'Cliente escolhe número ou texto da opção\n\n';
    
    instructions += '**IMPORTANTE**: Quando as instruções do usuário disserem coisas como:\n';
    instructions += '- "Se não responder em X minutos, fazer Y" → Use `aguardarResposta` com timeout\n';
    instructions += '- "Enviar mensagem daqui X minutos" → Use `pausarFluxoEContinuar`\n';
    instructions += '- "Aguardar resposta do cliente" → Use `aguardarResposta`\n';
    instructions += '- "Dar opções para o cliente escolher" → Use `enviarMenuOpcoes`\n\n';

    return instructions;
}

/**
 * Formatar histórico de mensagens para o formato do GPT
 * @param {Array} history - Histórico de mensagens
 * @returns {Array} - Histórico formatado
 */
function formatHistoryForGPT(history) {
    if (!history || !Array.isArray(history)) return [];

    return history.map(msg => {
        // Se já está no formato correto (com content como string), retornar direto
        if (typeof msg.content === 'string') {
            return {
                role: msg.role || 'user',
                content: msg.content
            };
        }

        // Formato antigo: processar text e image
        const content = [];

        // Adicionar texto se houver (pode vir como text ou content)
        const text = msg.text || msg.content || '';
        if (text) {
            content.push({
                type: 'text',
                text: text
            });
        }

        // Adicionar imagem se houver
        if (msg.image) {
            content.push({
                type: 'image_url',
                image_url: {
                    url: msg.image.startsWith('http')
                        ? msg.image
                        : `data:image/jpeg;base64,${msg.image}`
                }
            });
        }

        return {
            role: msg.role === 'model' ? 'assistant' : (msg.role || 'user'),
            content: content.length === 1 ? content[0].text : content
        };
    });
}

/**
 * Gerar texto com GPT
 * @param {Object} params - Parâmetros
 * @returns {Promise<String>} - Texto gerado
 */
async function generateGPTText({
    instructions = '',
    userText = '',
    history = [],
    context = {},
    clientId = null,
    chatId = null,
    mediaFiles = [],
    useAudio = false,
    tools = null // Function calling tools (opcional)
}) {
    console.log('\n🤖 === GERANDO RESPOSTA COM GPT ===');
    console.log('💬 Texto do usuário:', userText ? userText.substring(0, 100) : 'Nenhum');
    console.log('📚 Histórico:', history.length, 'mensagens');
    console.log('📱 Client/Chat:', clientId, '/', chatId);
    console.log('📎 Arquivos de mídia:', mediaFiles ? mediaFiles.length : 0);
    console.log('🎤 Usar áudio:', useAudio);

    const config = await getGPTConfig();

    if (!config.apiKey) {
        console.error('❌ API Key do OpenAI não configurada!');
        return 'Desculpe, o sistema de atendimento está temporariamente indisponível. Por favor, tente novamente mais tarde.';
    }

    // Inicializar cliente OpenAI
    const openai = new OpenAI({
        apiKey: config.apiKey
    });

    // Selecionar modelo (áudio ou texto)
    const model = useAudio ? config.modelAudio : config.modelText;
    console.log('🤖 Modelo selecionado:', model);

    // Buscar histórico do WhatsApp se disponível
    let fullHistory = history || [];
    if (clientId && chatId) {
        console.log('📖 Buscando histórico do WhatsApp...');
        try {
            const { getChatMessages } = require('../zap/chats');
            const messages = await getChatMessages(clientId, chatId, 50);

            if (messages && messages.length > 0) {
                const whatsappHistory = messages.map(msg => ({
                    role: msg.from_me === 1 ? 'assistant' : 'user',
                    content: msg.body || msg.text || ''
                }));

                console.log(`✅ ${whatsappHistory.length} mensagens carregadas`);

                if (history && history.length > 0) {
                    fullHistory = [...whatsappHistory, ...history];
                } else {
                    fullHistory = whatsappHistory;
                }

                console.log(`✅ Total: ${fullHistory.length} mensagens`);
            }
        } catch (error) {
            console.error('❌ Erro ao buscar histórico:', error.message);
        }
    }

    // Construir instruções do sistema
    let systemInstructions = await buildSystemInstructions(config, context);

    // Adicionar informações da pipeline da empresa
    try {
        const { getPipelineResumoParaIA } = require('./negocioHelper');
        const resumoPipeline = await getPipelineResumoParaIA();

        if (resumoPipeline && resumoPipeline.trim()) {
            systemInstructions += `\n\n# PIPELINE DE VENDAS\n\n${resumoPipeline}\n`;
            console.log('📊 Pipeline da empresa adicionada');
        }
    } catch (error) {
        console.error('⚠️ Erro ao buscar pipeline:', error.message);
    }

    // Adicionar resumo completo do cliente (inclui negócios, agendamentos, anotações, etc)
    if (context && context.cliente && (context.cliente.cli_Id || context.cliente.id)) {
        try {
            const clienteId = context.cliente.cli_Id || context.cliente.id;
            const { getResumoClienteParaIA } = require('./clienteHelper');
            const resumoCliente = await getResumoClienteParaIA(clienteId);

            if (resumoCliente && resumoCliente.textoResumo) {
                systemInstructions += `\n\n${resumoCliente.textoResumo}\n`;
                console.log(`📊 Resumo completo do cliente ${clienteId} adicionado`);
                console.log(`   - ${resumoCliente.stats.totalAgendamentos} agendamentos`);
                console.log(`   - ${resumoCliente.stats.totalNegocios} negócios`);
                console.log(`   - ${resumoCliente.anotacoes.length} anotações`);
            }
        } catch (error) {
            console.error('⚠️ Erro ao buscar resumo do cliente:', error.message);
        }
    }

    // Adicionar instruções específicas
    if (instructions) {
        systemInstructions += `\n\n# TAREFA ESPECÍFICA\n\n${instructions}\n`;
    }

    // Determinar temperatura
    let temperature = 0.7;
    if (config.comportamento?.temperatura === 'baixa') {
        temperature = 0.3;
    } else if (config.comportamento?.temperatura === 'alta') {
        temperature = 0.9;
    }

    // Construir mensagens
    const messages = [
        {
            role: 'system',
            content: systemInstructions
        }
    ];

    // Adicionar histórico formatado
    if (fullHistory && fullHistory.length > 0) {
        const formattedHistory = formatHistoryForGPT(fullHistory);
        messages.push(...formattedHistory);
    }

    // Adicionar mensagem do usuário
    if (userText) {
        const userMessage = {
            role: 'user',
            content: []
        };

        // Adicionar texto
        userMessage.content.push({
            type: 'text',
            text: userText
        });

        // Adicionar mídias se houver
        if (mediaFiles && mediaFiles.length > 0) {
            for (const mediaFile of mediaFiles) {
                const fileData = await fileToBase64(mediaFile);
                if (fileData && fileData.mimeType.startsWith('image/')) {
                    userMessage.content.push({
                        type: 'image_url',
                        image_url: {
                            url: `data:${fileData.mimeType};base64,${fileData.base64Data}`
                        }
                    });
                }
            }
        }

        messages.push(userMessage);
    }

    console.log('📤 Enviando para GPT...');

    try {
        // Tools/Functions disponíveis (padrão + customizados)
        const defaultTools = [
            {
                type: 'function',
                function: {
                    name: 'buscarDisponibilidades',
                    description: 'Busca horários disponíveis para agendamento de serviços',
                    parameters: {
                        type: 'object',
                        properties: {
                            servicoId: { type: 'number', description: 'ID do serviço' },
                            subservicoId: { type: 'number', description: 'ID do subserviço (opcional)' },
                            dataInicio: { type: 'string', description: 'Data início no formato YYYY-MM-DD' },
                            dataFim: { type: 'string', description: 'Data fim no formato YYYY-MM-DD' },
                            duracaoMinutos: { type: 'number', description: 'Duração em minutos' },
                            periodoPreferido: { type: 'string', description: 'Período preferido: manha, tarde, noite' }
                        },
                        required: ['dataInicio', 'dataFim']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'verificarHorarioDisponivel',
                    description: 'Verifica se um horário específico está disponível',
                    parameters: {
                        type: 'object',
                        properties: {
                            data: { type: 'string', description: 'Data no formato YYYY-MM-DD' },
                            horaInicio: { type: 'string', description: 'Hora início no formato HH:MM' },
                            horaFim: { type: 'string', description: 'Hora fim no formato HH:MM' },
                            servicoId: { type: 'number', description: 'ID do serviço (opcional)' }
                        },
                        required: ['data', 'horaInicio', 'horaFim']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'verificarDataDisponivel',
                    description: 'Verifica se uma data tem disponibilidade',
                    parameters: {
                        type: 'object',
                        properties: {
                            data: { type: 'string', description: 'Data no formato YYYY-MM-DD' }
                        },
                        required: ['data']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'calcularDistancia',
                    description: 'Calcula distância entre dois endereços',
                    parameters: {
                        type: 'object',
                        properties: {
                            endereco1: { type: 'string', description: 'Endereço de origem' },
                            endereco2: { type: 'string', description: 'Endereço de destino' }
                        },
                        required: ['endereco1', 'endereco2']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'criarAgendamento',
                    description: 'Cria um novo agendamento para o cliente',
                    parameters: {
                        type: 'object',
                        properties: {
                            servicoId: { type: 'number', description: 'ID do serviço' },
                            data: { type: 'string', description: 'Data do agendamento no formato YYYY-MM-DD' },
                            horaInicio: { type: 'string', description: 'Hora de início no formato HH:MM' },
                            horaFim: { type: 'string', description: 'Hora de término no formato HH:MM' },
                            funcionarioId: { type: 'number', description: 'ID do funcionário/profissional' },
                            endereco: { 
                                type: 'object', 
                                description: 'Endereço do serviço',
                                properties: {
                                    cep: { type: 'string' },
                                    logradouro: { type: 'string' },
                                    numero: { type: 'string' },
                                    complemento: { type: 'string' },
                                    bairro: { type: 'string' },
                                    cidade: { type: 'string' },
                                    estado: { type: 'string' }
                                }
                            },
                            observacoes: { type: 'string', description: 'Observações sobre o agendamento' }
                        },
                        required: ['data', 'horaInicio', 'horaFim', 'funcionarioId']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'atualizarAgendamento',
                    description: 'Atualiza um agendamento existente',
                    parameters: {
                        type: 'object',
                        properties: {
                            agendamentoId: { type: 'number', description: 'ID do agendamento (opcional se houver agendamento no contexto)' },
                            data: { type: 'string', description: 'Nova data no formato YYYY-MM-DD' },
                            horaInicio: { type: 'string', description: 'Nova hora início no formato HH:MM' },
                            horaFim: { type: 'string', description: 'Nova hora fim no formato HH:MM' },
                            status: { type: 'string', description: 'Novo status: agendado, confirmado, cancelado, concluido' },
                            observacoes: { type: 'string', description: 'Novas observações' }
                        }
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'cancelarAgendamento',
                    description: 'Cancela um agendamento',
                    parameters: {
                        type: 'object',
                        properties: {
                            agendamentoId: { type: 'number', description: 'ID do agendamento' },
                            motivo: { type: 'string', description: 'Motivo do cancelamento' }
                        }
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'enviarMensagem',
                    description: 'Envia uma mensagem WhatsApp para o cliente',
                    parameters: {
                        type: 'object',
                        properties: {
                            mensagem: { type: 'string', description: 'Texto da mensagem a enviar' },
                            phone: { type: 'string', description: 'Telefone do destinatário (opcional, usa o do contexto)' }
                        },
                        required: ['mensagem']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'atualizarCliente',
                    description: 'Atualiza informações do cliente',
                    parameters: {
                        type: 'object',
                        properties: {
                            nome: { type: 'string', description: 'Nome do cliente' },
                            email: { type: 'string', description: 'Email do cliente' },
                            telefone: { type: 'string', description: 'Telefone do cliente' },
                            observacoes: { type: 'string', description: 'Observações sobre o cliente' },
                            tags: { 
                                type: 'array', 
                                description: 'Tags do cliente',
                                items: { type: 'number' }
                            }
                        }
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'criarNegocio',
                    description: 'Cria um novo negócio/oportunidade no CRM',
                    parameters: {
                        type: 'object',
                        properties: {
                            titulo: { type: 'string', description: 'Título do negócio' },
                            valor: { type: 'number', description: 'Valor estimado do negócio' },
                            descricao: { type: 'string', description: 'Descrição do negócio' },
                            origem: { type: 'string', description: 'Origem do negócio' }
                        },
                        required: ['titulo']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'atualizarNegocio',
                    description: 'Atualiza um negócio existente',
                    parameters: {
                        type: 'object',
                        properties: {
                            negocioId: { type: 'number', description: 'ID do negócio' },
                            titulo: { type: 'string', description: 'Novo título' },
                            valor: { type: 'number', description: 'Novo valor' },
                            status: { type: 'string', description: 'Novo status' },
                            etapaId: { type: 'number', description: 'Nova etapa do funil' }
                        }
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'agendarAcaoFutura',
                    description: 'Agenda uma ação para ser executada no futuro (ex: enviar mensagem em X minutos)',
                    parameters: {
                        type: 'object',
                        properties: {
                            acao: { 
                                type: 'string', 
                                description: 'Tipo de ação: enviar_mensagem, atualizar_cliente, criar_negocio',
                                enum: ['enviar_mensagem', 'atualizar_cliente', 'criar_negocio', 'reativar_fluxo']
                            },
                            delayMinutos: { type: 'number', description: 'Minutos para esperar antes de executar' },
                            parametros: { 
                                type: 'object', 
                                description: 'Parâmetros da ação a executar'
                            }
                        },
                        required: ['acao', 'delayMinutos']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'adicionarAnotacao',
                    description: 'Adiciona uma anotação/nota sobre o atendimento ou cliente',
                    parameters: {
                        type: 'object',
                        properties: {
                            titulo: { type: 'string', description: 'Título da anotação' },
                            descricao: { type: 'string', description: 'Conteúdo da anotação' },
                            tipo: { 
                                type: 'string', 
                                description: 'Tipo de anotação',
                                enum: ['observacao', 'lembrete', 'importante', 'followup']
                            }
                        },
                        required: ['descricao']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'aguardarTempo',
                    description: 'Aguarda um período de tempo antes de continuar (delay)',
                    parameters: {
                        type: 'object',
                        properties: {
                            valor: { type: 'number', description: 'Valor do tempo' },
                            tipo: { 
                                type: 'string', 
                                description: 'Unidade de tempo',
                                enum: ['seconds', 'minutes', 'hours', 'days']
                            }
                        },
                        required: ['valor', 'tipo']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'redirecionarFluxo',
                    description: 'Redireciona para outro fluxo de atendimento',
                    parameters: {
                        type: 'object',
                        properties: {
                            fluxoId: { type: 'number', description: 'ID do fluxo de destino' },
                            mensagem: { type: 'string', description: 'Mensagem antes de redirecionar (opcional)' }
                        },
                        required: ['fluxoId']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'encaminharParaAtendente',
                    description: 'Encaminha o contato para um atendente humano',
                    parameters: {
                        type: 'object',
                        properties: {
                            departamento: { type: 'string', description: 'Departamento para encaminhar' },
                            motivo: { type: 'string', description: 'Motivo do encaminhamento' },
                            prioridade: { 
                                type: 'string', 
                                description: 'Prioridade do atendimento',
                                enum: ['baixa', 'normal', 'alta', 'urgente']
                            }
                        }
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'bloquearClienteFluxos',
                    description: 'Bloqueia ou desbloqueia cliente de receber fluxos automáticos',
                    parameters: {
                        type: 'object',
                        properties: {
                            acao: { 
                                type: 'string', 
                                description: 'Ação a executar',
                                enum: ['bloquear', 'desbloquear']
                            },
                            motivo: { type: 'string', description: 'Motivo do bloqueio/desbloqueio' }
                        },
                        required: ['acao']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'adicionarTagsCliente',
                    description: 'Adiciona tags/etiquetas ao cliente para segmentação',
                    parameters: {
                        type: 'object',
                        properties: {
                            tags: { 
                                type: 'array',
                                description: 'Lista de tags para adicionar',
                                items: { type: 'string' }
                            }
                        },
                        required: ['tags']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'removerTagsCliente',
                    description: 'Remove tags/etiquetas do cliente',
                    parameters: {
                        type: 'object',
                        properties: {
                            tags: { 
                                type: 'array',
                                description: 'Lista de tags para remover',
                                items: { type: 'string' }
                            }
                        },
                        required: ['tags']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'moverNegocioEtapa',
                    description: 'Move um negócio para outra etapa do funil de vendas',
                    parameters: {
                        type: 'object',
                        properties: {
                            negocioId: { type: 'number', description: 'ID do negócio (opcional se houver no contexto)' },
                            etapaId: { type: 'number', description: 'ID da nova etapa do funil' },
                            observacao: { type: 'string', description: 'Observação sobre a mudança' }
                        },
                        required: ['etapaId']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'marcarNegocioGanho',
                    description: 'Marca um negócio como ganho/fechado',
                    parameters: {
                        type: 'object',
                        properties: {
                            negocioId: { type: 'number', description: 'ID do negócio' },
                            valorFinal: { type: 'number', description: 'Valor final do negócio' },
                            observacao: { type: 'string', description: 'Observações sobre o fechamento' }
                        }
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'marcarNegocioPerdido',
                    description: 'Marca um negócio como perdido',
                    parameters: {
                        type: 'object',
                        properties: {
                            negocioId: { type: 'number', description: 'ID do negócio' },
                            motivo: { type: 'string', description: 'Motivo da perda' },
                            observacao: { type: 'string', description: 'Observações adicionais' }
                        },
                        required: ['motivo']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'enviarEmail',
                    description: 'Envia um email para o cliente',
                    parameters: {
                        type: 'object',
                        properties: {
                            destinatario: { type: 'string', description: 'Email do destinatário (opcional, usa do cliente)' },
                            assunto: { type: 'string', description: 'Assunto do email' },
                            mensagem: { type: 'string', description: 'Conteúdo do email (HTML ou texto)' }
                        },
                        required: ['assunto', 'mensagem']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'executarRequisicaoHTTP',
                    description: 'Executa uma requisição HTTP para integração externa',
                    parameters: {
                        type: 'object',
                        properties: {
                            url: { type: 'string', description: 'URL da requisição' },
                            metodo: { 
                                type: 'string', 
                                description: 'Método HTTP',
                                enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
                            },
                            headers: { type: 'object', description: 'Headers da requisição' },
                            body: { type: 'object', description: 'Corpo da requisição (para POST/PUT)' }
                        },
                        required: ['url', 'metodo']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'aguardarResposta',
                    description: 'Aguarda resposta do usuário e captura variáveis. Use quando precisar esperar o cliente responder.',
                    parameters: {
                        type: 'object',
                        properties: {
                            timeoutMinutos: { 
                                type: 'number', 
                                description: 'Tempo máximo para aguardar resposta em minutos (0 = sem limite)' 
                            },
                            variaveis: {
                                type: 'array',
                                description: 'Lista de variáveis para capturar da resposta',
                                items: {
                                    type: 'object',
                                    properties: {
                                        nome: { type: 'string', description: 'Nome da variável' },
                                        descricao: { type: 'string', description: 'Descrição da variável' }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'enviarMenuOpcoes',
                    description: 'Envia um menu de opções para o cliente escolher',
                    parameters: {
                        type: 'object',
                        properties: {
                            mensagem: { type: 'string', description: 'Mensagem antes do menu' },
                            opcoes: {
                                type: 'array',
                                description: 'Lista de opções do menu',
                                items: {
                                    type: 'object',
                                    properties: {
                                        texto: { type: 'string', description: 'Texto da opção' },
                                        acao: { type: 'string', description: 'Ação a executar quando selecionada' }
                                    }
                                }
                            },
                            maxTentativas: { 
                                type: 'number', 
                                description: 'Máximo de tentativas para opção inválida (padrão: 3)' 
                            }
                        },
                        required: ['mensagem', 'opcoes']
                    }
                }
            },
            {
                type: 'function',
                function: {
                    name: 'pausarFluxoEContinuar',
                    description: 'Pausa o fluxo e programa para continuar após um tempo. Use para "enviar mensagem daqui X minutos"',
                    parameters: {
                        type: 'object',
                        properties: {
                            minutos: { 
                                type: 'number', 
                                description: 'Minutos para aguardar antes de continuar' 
                            },
                            acaoAposPausa: {
                                type: 'string',
                                description: 'Descrição da ação que será executada após a pausa'
                            }
                        },
                        required: ['minutos']
                    }
                }
            }
        ];

        // Combinar tools padrão com tools customizados (se fornecidos)
        const finalTools = tools && tools.length > 0 ? [...defaultTools, ...tools] : defaultTools;

        // Fazer chamada para API
        const completion = await openai.chat.completions.create({
            model: model,
            messages: messages,
            temperature: temperature,
            max_tokens: 4096,
            top_p: 0.95,
            tools: finalTools.length > 0 ? finalTools : undefined,
            tool_choice: finalTools.length > 0 ? 'auto' : undefined
        });

        const response = completion.choices[0];

        // Se a IA chamou uma função
        if (response.finish_reason === 'tool_calls' && response.message.tool_calls) {
            console.log('🔧 IA solicitou chamada de função');

            // Processar chamadas de função
            const toolCalls = response.message.tool_calls;
            const toolResults = [];

            for (const toolCall of toolCalls) {
                const functionName = toolCall.function.name;
                const functionArgs = JSON.parse(toolCall.function.arguments);

                console.log(`📞 Chamando função: ${functionName}`, functionArgs);

                let result;
                try {
                    result = await executeToolFunction(functionName, functionArgs, context);
                } catch (error) {
                    console.error(`❌ Erro ao executar função ${functionName}:`, error);
                    result = { error: error.message };
                }

                toolResults.push({
                    tool_call_id: toolCall.id,
                    role: 'tool',
                    name: functionName,
                    content: JSON.stringify(result)
                });
            }

            // Fazer segunda chamada com os resultados das funções
            messages.push(response.message);
            messages.push(...toolResults);

            const secondCompletion = await openai.chat.completions.create({
                model: model,
                messages: messages,
                temperature: temperature,
                max_tokens: 4096
            });

            const finalResponse = secondCompletion.choices[0].message.content;
            console.log('✅ Resposta gerada (com funções)');
            return finalResponse;
        }

        // Resposta normal sem chamada de função
        const finalResponse = response.message.content;
        console.log('✅ Resposta gerada');

        return finalResponse;

    } catch (error) {
        console.error('❌ Erro ao gerar resposta GPT:', error.message);
        if (error.response) {
            console.error('❌ Detalhes:', error.response.data);
        }
        return 'Desculpe, houve um erro ao processar sua mensagem. Por favor, tente novamente.';
    }
}

/**
 * Executar função chamada pela IA
 * @param {String} functionName - Nome da função
 * @param {Object} args - Argumentos
 * @param {Object} context - Contexto do fluxo (opcional, para ações que precisam de contexto)
 * @returns {Promise<Object>} - Resultado
 */
async function executeToolFunction(functionName, args, context = {}) {
    switch (functionName) {
        case 'buscarDisponibilidades':
            return await availabilityHelper.buscarOpcoesDisponibilidade(
                args.dataInicio,
                args.dataFim,
                args.duracaoMinutos || 60,
                args.periodoPreferido,
                args.servicoId,
                args.subservicoId
            );

        case 'verificarHorarioDisponivel':
            const { verificarDisponibilidadeGeral } = require('../flows/helpers/availabilityHelper');
            return await verificarDisponibilidadeGeral(
                args.data,
                args.horaInicio,
                args.horaFim,
                args.servicoId,
                args.subservicoId
            );

        case 'verificarDataDisponivel':
            const { isDataBloqueada } = require('../flows/helpers/availabilityHelper');
            const bloqueada = await isDataBloqueada(args.data);
            return { disponivel: !bloqueada };

        case 'calcularDistancia':
            const { calcularDistancia } = require('./distanceHelper');
            return await calcularDistancia(args.endereco1, args.endereco2);

        // Ações de agendamento (requerem contexto)
        case 'criarAgendamento':
            if (!context) {
                return { error: 'Contexto necessário para criar agendamento' };
            }
            const { createAgendamento } = require('../flows/actions/agendamentoActions');
            
            // Preparar configuração do agendamento
            const createAgendConfig = {
                data: args.data,
                horaInicio: args.horaInicio,
                horaFim: args.horaFim,
                funcionarioId: args.funcionarioId || args.profissionalId || 1, // ID padrão se não especificado
                observacoes: args.observacoes || args.observacao,
                statusId: 1, // Agendado
                fonte: 'fluxo_ia',
                enderecoMode: 'padrao' // Usar endereço padrão do cliente
            };
            
            // Se endereço foi fornecido, usar modo novo
            if (args.endereco) {
                createAgendConfig.enderecoMode = 'novo';
                createAgendConfig.endereco = args.endereco;
            }
            
            // Se serviços foram especificados
            if (args.servicoId || args.servicos) {
                createAgendConfig.servicos = [];
                
                if (args.servicoId) {
                    // Serviço único
                    createAgendConfig.servicos.push({
                        servicoId: args.servicoId,
                        quantidade: args.quantidade || 1,
                        valor: args.valor || 0,
                        descricao: args.descricaoServico || ''
                    });
                } else if (Array.isArray(args.servicos)) {
                    // Múltiplos serviços
                    createAgendConfig.servicos = args.servicos;
                }
            }
            
            console.log('📅 Criando agendamento com IA:', createAgendConfig);
            return await createAgendamento(createAgendConfig, context);

        case 'atualizarAgendamento':
            if (!context) {
                return { error: 'Contexto necessário para atualizar agendamento' };
            }
            const { updateAgendamento } = require('../flows/actions/agendamentoActions');
            
            // Mapear status textual para ID
            let statusId = null;
            if (args.status) {
                const statusMap = {
                    'agendado': 1,
                    'confirmado': 2,
                    'atendido': 3,
                    'concluido': 3,
                    'cancelado': 6,
                    'remarcado': 7
                };
                statusId = statusMap[args.status.toLowerCase()] || null;
            }
            
            const updateAgendConfig = {
                agendamentoId: args.agendamentoId || context.agendamento_id,
                data: args.data,
                horaInicio: args.horaInicio,
                horaFim: args.horaFim,
                funcionarioId: args.funcionarioId || args.profissionalId,
                statusId: statusId,
                observacoes: args.observacoes || args.observacao
            };
            
            console.log('📅 Atualizando agendamento com IA:', updateAgendConfig);
            return await updateAgendamento(updateAgendConfig, context);

        case 'cancelarAgendamento':
            if (!context) {
                return { error: 'Contexto necessário para cancelar agendamento' };
            }
            const { updateAgendamento: updateAgendForCancel } = require('../flows/actions/agendamentoActions');
            const cancelConfig = {
                agendamentoId: args.agendamentoId || context.agendamento_id,
                status: 'cancelado',
                observacoes: args.motivo || 'Cancelado pela IA'
            };
            return await updateAgendForCancel(cancelConfig, context);

        case 'enviarMensagem':
            if (!context) {
                return { error: 'Contexto necessário para enviar mensagem' };
            }
            const { sendWhatsAppMessage: sendMsg } = require('../flows/actions/messageActions');
            return await sendMsg({ 
                message: args.mensagem, 
                phone: args.phone,
                fromAI: true // 🎤 Marcar que é mensagem da IA para ativar TTS
            }, context);

        case 'atualizarCliente':
            if (!context) {
                return { error: 'Contexto necessário para atualizar cliente' };
            }
            const { updateCliente: updateCli } = require('../flows/actions/clienteActions');
            const updateClienteConfig = {
                nome: args.nome,
                email: args.email,
                telefone: args.telefone,
                observacoes: args.observacoes,
                tags: args.tags
            };
            return await updateCli(updateClienteConfig, context);

        case 'agendarAcaoFutura':
            if (!context) {
                return { error: 'Contexto necessário para agendar ação futura' };
            }
            
            // Calcular timestamp futuro
            const futureTimestamp = Date.now() + (args.delayMinutos * 60 * 1000);
            const futureDate = new Date(futureTimestamp);
            
            // Registrar na tabela de ações agendadas (criar se não existir)
            try {
                await dbQuery(`
                    INSERT INTO FlowScheduledActions 
                    (flowRunId, clientId, phone, acao, parametros, executarEm) 
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    context.runId || null,
                    context.clientId || null,
                    context.phone || null,
                    args.acao,
                    JSON.stringify(args.parametros || {}),
                    moment(futureDate).format('YYYY-MM-DD HH:mm:ss')
                ]);
                
                return { 
                    success: true, 
                    message: `Ação agendada para ${args.delayMinutos} minutos`,
                    executarEm: moment(futureDate).format('DD/MM/YYYY HH:mm')
                };
            } catch (error) {
                console.error('Erro ao agendar ação:', error);
                return { error: 'Erro ao agendar ação: ' + error.message };
            }

        case 'adicionarAnotacao':
            if (!context || !context.clientId) {
                return { error: 'Contexto com clientId necessário para adicionar anotação' };
            }
            
            try {
                // Buscar anotações atuais do cliente
                const clienteData = await dbQuery('SELECT cli_anotacoes FROM CLIENTES WHERE cli_Id = ?', [context.clientId]);
                
                let anotacoes = [];
                if (clienteData && clienteData.length > 0 && clienteData[0].cli_anotacoes) {
                    try {
                        anotacoes = JSON.parse(clienteData[0].cli_anotacoes);
                    } catch (e) {
                        anotacoes = [];
                    }
                }
                
                // Adicionar nova anotação
                const novaAnotacao = {
                    id: Date.now(),
                    titulo: args.titulo || 'Anotação da IA',
                    descricao: args.descricao,
                    tipo: args.tipo || 'observacao',
                    criadoPor: 'IA - Assistente Virtual',
                    criadoEm: moment().format('YYYY-MM-DD HH:mm:ss')
                };
                
                anotacoes.push(novaAnotacao);
                
                // Atualizar no banco
                await dbQuery(
                    'UPDATE CLIENTES SET cli_anotacoes = ? WHERE cli_Id = ?',
                    [JSON.stringify(anotacoes), context.clientId]
                );
                
                return { 
                    success: true, 
                    message: 'Anotação adicionada com sucesso',
                    anotacao: novaAnotacao
                };
            } catch (error) {
                console.error('Erro ao adicionar anotação:', error);
                return { error: 'Erro ao adicionar anotação: ' + error.message };
            }

        // Ações de negócio (requerem contexto)
        case 'criarNegocio':
            if (!context) {
                return { error: 'Contexto necessário para criar negócio' };
            }
            const { createNegocio } = require('../flows/actions/negocioActions');
            const createNegConfig = {
                titulo: args.titulo,
                descricao: args.descricao,
                valor: args.valor,
                funnelId: args.funnelId,
                stageId: args.stageId
            };
            return await createNegocio(createNegConfig, context);

        case 'atualizarNegocio':
            if (!context) {
                return { error: 'Contexto necessário para atualizar negócio' };
            }
            const { updateNegocio } = require('../flows/actions/negocioActions');
            const updateNegConfig = {
                negocioId: args.negocioId || context.negocio_id,
                titulo: args.titulo,
                descricao: args.descricao,
                valor: args.valor,
                stageId: args.stageId
            };
            return await updateNegocio(updateNegConfig, context);

        case 'aguardarTempo':
            if (!context) {
                return { error: 'Contexto necessário para aguardar tempo' };
            }
            
            // Calcular delay em milissegundos
            const { convertTimeToMs } = require('../flows/actions/waitActions');
            const delayMs = convertTimeToMs(args.valor, args.tipo);
            
            // Usar o sistema de agendamento de ações
            const delayTimestamp = Date.now() + delayMs;
            const delayDate = new Date(delayTimestamp);
            
            try {
                await dbQuery(`
                    CREATE TABLE IF NOT EXISTS FlowScheduledActions (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        flowRunId INT,
                        clientId INT,
                        phone VARCHAR(20),
                        acao VARCHAR(50),
                        parametros JSON,
                        executarEm DATETIME,
                        executado BOOLEAN DEFAULT FALSE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `);
                
                await dbQuery(`
                    INSERT INTO FlowScheduledActions 
                    (flowRunId, clientId, phone, acao, parametros, executarEm) 
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    context.runId || null,
                    context.clientId || null,
                    context.phone || null,
                    'reativar_fluxo',
                    JSON.stringify({ resumeFrom: 'current' }),
                    moment(delayDate).format('YYYY-MM-DD HH:mm:ss')
                ]);
                
                return { 
                    success: true, 
                    message: `Aguardando ${args.valor} ${args.tipo}`,
                    resumeAt: moment(delayDate).format('DD/MM/YYYY HH:mm')
                };
            } catch (error) {
                console.error('Erro ao agendar delay:', error);
                return { error: 'Erro ao agendar delay: ' + error.message };
            }

        case 'redirecionarFluxo':
            if (!context) {
                return { error: 'Contexto necessário para redirecionar fluxo' };
            }
            
            try {
                if (args.mensagem) {
                    const { sendWhatsAppMessage: sendMsgRedirect } = require('../flows/actions/messageActions');
                    await sendMsgRedirect({ message: args.mensagem }, context);
                }
                
                // Parar fluxo atual
                await dbQuery('UPDATE FlowRuns SET status = ? WHERE id = ?', ['redirected', context.runId]);
                
                // Iniciar novo fluxo
                const { startFlow } = require('../flows/core/flowEngine');
                await startFlow({
                    flowId: args.fluxoId,
                    phone: context.phone,
                    chatId: context.chatId,
                    clientId: context.clientId,
                    cliente: context.cliente,
                    agendamento: context.agendamento,
                    context: context
                });
                
                return { success: true, message: `Redirecionado para fluxo ${args.fluxoId}` };
            } catch (error) {
                console.error('Erro ao redirecionar fluxo:', error);
                return { error: 'Erro ao redirecionar fluxo: ' + error.message };
            }

        case 'encaminharParaAtendente':
            if (!context) {
                return { error: 'Contexto necessário para encaminhar' };
            }
            
            try {
                const { forwardContact } = require('../flows/actions/messageActions');
                await forwardContact(null, {
                    departamento: args.departamento,
                    motivo: args.motivo,
                    prioridade: args.prioridade || 'normal'
                }, context);
                
                return { success: true, message: 'Contato encaminhado para atendente' };
            } catch (error) {
                console.error('Erro ao encaminhar:', error);
                return { error: 'Erro ao encaminhar: ' + error.message };
            }

        case 'bloquearClienteFluxos':
            if (!context || !context.clientId) {
                return { error: 'Contexto com clientId necessário' };
            }
            
            try {
                const { blockUnblockClientFlows } = require('../flows/actions/clienteActions');
                await blockUnblockClientFlows({
                    action: args.acao,
                    motivo: args.motivo
                }, context);
                
                return { 
                    success: true, 
                    message: `Cliente ${args.acao === 'bloquear' ? 'bloqueado' : 'desbloqueado'} de fluxos` 
                };
            } catch (error) {
                console.error('Erro ao bloquear/desbloquear:', error);
                return { error: 'Erro ao bloquear/desbloquear: ' + error.message };
            }

        case 'adicionarTagsCliente':
        case 'removerTagsCliente':
            if (!context || !context.clientId) {
                return { error: 'Contexto com clientId necessário' };
            }
            
            try {
                // Buscar tags atuais do cliente
                const clienteData = await dbQuery('SELECT cli_tags FROM CLIENTES WHERE cli_Id = ?', [context.clientId]);
                
                let tagsAtuais = [];
                if (clienteData && clienteData.length > 0 && clienteData[0].cli_tags) {
                    try {
                        tagsAtuais = JSON.parse(clienteData[0].cli_tags);
                        if (!Array.isArray(tagsAtuais)) tagsAtuais = [];
                    } catch (e) {
                        tagsAtuais = [];
                    }
                }
                
                let novasTags = [...tagsAtuais];
                
                if (functionName === 'adicionarTagsCliente') {
                    // Adicionar novas tags (evitar duplicatas)
                    for (const tag of args.tags) {
                        if (!novasTags.includes(tag)) {
                            novasTags.push(tag);
                        }
                    }
                } else {
                    // Remover tags
                    novasTags = novasTags.filter(tag => !args.tags.includes(tag));
                }
                
                // Atualizar no banco
                await dbQuery(
                    'UPDATE CLIENTES SET cli_tags = ? WHERE cli_Id = ?',
                    [JSON.stringify(novasTags), context.clientId]
                );
                
                return { 
                    success: true, 
                    message: functionName === 'adicionarTagsCliente' ? 
                        `Tags adicionadas: ${args.tags.join(', ')}` :
                        `Tags removidas: ${args.tags.join(', ')}`,
                    tags: novasTags
                };
            } catch (error) {
                console.error('Erro ao gerenciar tags:', error);
                return { error: 'Erro ao gerenciar tags: ' + error.message };
            }

        case 'moverNegocioEtapa':
            if (!context) {
                return { error: 'Contexto necessário para mover negócio' };
            }
            
            try {
                const { updateNegocio } = require('../flows/actions/negocioActions');
                await updateNegocio({
                    negocioId: args.negocioId || context.negocio_id,
                    stageId: args.etapaId,
                    observacao: args.observacao
                }, context);
                
                return { success: true, message: `Negócio movido para etapa ${args.etapaId}` };
            } catch (error) {
                console.error('Erro ao mover negócio:', error);
                return { error: 'Erro ao mover negócio: ' + error.message };
            }

        case 'marcarNegocioGanho':
            if (!context) {
                return { error: 'Contexto necessário' };
            }
            
            try {
                const { updateNegocio } = require('../flows/actions/negocioActions');
                await updateNegocio({
                    negocioId: args.negocioId || context.negocio_id,
                    status: 'ganho',
                    valor: args.valorFinal,
                    observacao: args.observacao
                }, context);
                
                return { success: true, message: 'Negócio marcado como ganho' };
            } catch (error) {
                console.error('Erro ao marcar negócio como ganho:', error);
                return { error: 'Erro ao marcar negócio: ' + error.message };
            }

        case 'marcarNegocioPerdido':
            if (!context) {
                return { error: 'Contexto necessário' };
            }
            
            try {
                const { updateNegocio } = require('../flows/actions/negocioActions');
                await updateNegocio({
                    negocioId: args.negocioId || context.negocio_id,
                    status: 'perdido',
                    motivoPerda: args.motivo,
                    observacao: args.observacao
                }, context);
                
                return { success: true, message: `Negócio marcado como perdido: ${args.motivo}` };
            } catch (error) {
                console.error('Erro ao marcar negócio como perdido:', error);
                return { error: 'Erro ao marcar negócio: ' + error.message };
            }

        case 'enviarEmail':
            if (!context) {
                return { error: 'Contexto necessário para enviar email' };
            }
            
            try {
                const { sendEmail } = require('../flows/actions/messageActions');
                await sendEmail({
                    to: args.destinatario || context.cliente?.cli_email,
                    subject: args.assunto,
                    message: args.mensagem
                }, context);
                
                return { success: true, message: 'Email enviado com sucesso' };
            } catch (error) {
                console.error('Erro ao enviar email:', error);
                return { error: 'Erro ao enviar email: ' + error.message };
            }

        case 'executarRequisicaoHTTP':
            try {
                const { executeHttp } = require('../flows/actions/httpActions');
                const result = await executeHttp({
                    url: args.url,
                    method: args.metodo,
                    headers: args.headers || {},
                    body: args.body || null
                }, context || {});
                
                return { 
                    success: true, 
                    message: 'Requisição HTTP executada',
                    response: result.response
                };
            } catch (error) {
                console.error('Erro ao executar HTTP:', error);
                return { error: 'Erro ao executar requisição: ' + error.message };
            }

        case 'aguardarResposta':
            if (!context || !context.runId) {
                return { error: 'Contexto necessário para aguardar resposta' };
            }
            
            try {
                // Converter minutos para o formato interno
                const timeoutValue = args.timeoutMinutos || 0;
                
                // Preparar variáveis
                const variables = (args.variaveis || []).map(v => ({
                    name: v.nome,
                    label: v.descricao || v.nome
                }));
                
                // Configurar wait state
                const { convertTimeToMs } = require('../flows/actions/waitActions');
                const timeoutMs = convertTimeToMs(timeoutValue, 'minutes');
                
                let nextRunAt = null;
                if (timeoutMs > 0) {
                    const timeoutDate = new Date(Date.now() + timeoutMs);
                    nextRunAt = moment(timeoutDate).format('YYYY-MM-DD HH:mm:ss');
                }
                
                // Atualizar FlowRun para aguardar resposta
                await dbQuery(
                    'UPDATE FlowRuns SET waiting_for_response = 1, next_run_at = ?, context_json = ? WHERE id = ?',
                    [nextRunAt, JSON.stringify(context), context.runId]
                );
                
                return { 
                    success: true, 
                    message: `Aguardando resposta do usuário${timeoutValue > 0 ? ` (timeout: ${timeoutValue} min)` : ''}`,
                    awaitingResponse: true,
                    variables: variables.map(v => v.name)
                };
            } catch (error) {
                console.error('Erro ao configurar aguardar resposta:', error);
                return { error: 'Erro ao configurar aguardar resposta: ' + error.message };
            }

        case 'enviarMenuOpcoes':
            if (!context) {
                return { error: 'Contexto necessário para enviar menu' };
            }
            
            try {
                const { sendWhatsAppMessage: sendMenuMsg } = require('../flows/actions/messageActions');
                
                // Montar texto do menu
                let menuText = args.mensagem + '\n\n';
                args.opcoes.forEach((opcao, index) => {
                    menuText += `${index + 1} - ${opcao.texto}\n`;
                });
                
                // Enviar menu
                await sendMenuMsg({ message: menuText }, context);
                
                // Configurar wait state para aguardar seleção
                const waitState = {
                    waitType: 'options',
                    options: args.opcoes.map((opt, idx) => ({
                        id: idx,
                        label: opt.texto,
                        acao: opt.acao
                    })),
                    maxAttempts: args.maxTentativas || 3,
                    currentAttempt: 0
                };
                
                // Atualizar FlowRun
                if (context.runId) {
                    await dbQuery(
                        'UPDATE FlowRuns SET waiting_for_response = 1, wait_state = ?, context_json = ? WHERE id = ?',
                        [JSON.stringify(waitState), JSON.stringify(context), context.runId]
                    );
                }
                
                return { 
                    success: true, 
                    message: 'Menu enviado, aguardando seleção',
                    menuSent: true,
                    optionsCount: args.opcoes.length
                };
            } catch (error) {
                console.error('Erro ao enviar menu:', error);
                return { error: 'Erro ao enviar menu: ' + error.message };
            }

        case 'pausarFluxoEContinuar':
            if (!context || !context.runId) {
                return { error: 'Contexto necessário para pausar fluxo' };
            }
            
            try {
                // Calcular timestamp futuro
                const futureTimestamp = Date.now() + (args.minutos * 60 * 1000);
                const futureDate = new Date(futureTimestamp);
                
                // Criar tabela se não existir
                await dbQuery(`
                    CREATE TABLE IF NOT EXISTS FlowScheduledActions (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        flowRunId INT,
                        clientId INT,
                        phone VARCHAR(20),
                        acao VARCHAR(50),
                        parametros JSON,
                        executarEm DATETIME,
                        executado BOOLEAN DEFAULT FALSE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                `);
                
                // Registrar ação agendada
                await dbQuery(`
                    INSERT INTO FlowScheduledActions 
                    (flowRunId, clientId, phone, acao, parametros, executarEm) 
                    VALUES (?, ?, ?, ?, ?, ?)
                `, [
                    context.runId,
                    context.clientId || null,
                    context.phone || null,
                    'reativar_fluxo',
                    JSON.stringify({ 
                        resumeFrom: 'current',
                        descricao: args.acaoAposPausa 
                    }),
                    moment(futureDate).format('YYYY-MM-DD HH:mm:ss')
                ]);
                
                // Pausar fluxo atual
                await dbQuery(
                    'UPDATE FlowRuns SET status = ?, next_run_at = ? WHERE id = ?',
                    ['paused', moment(futureDate).format('YYYY-MM-DD HH:mm:ss'), context.runId]
                );
                
                return { 
                    success: true, 
                    message: `Fluxo pausado, continuará em ${args.minutos} minutos`,
                    resumeAt: moment(futureDate).format('DD/MM/YYYY HH:mm'),
                    paused: true
                };
            } catch (error) {
                console.error('Erro ao pausar fluxo:', error);
                return { error: 'Erro ao pausar fluxo: ' + error.message };
            }

        // Ações de cliente (requerem contexto)
        default:
            return { error: `Função não encontrada: ${functionName}` };
    }
}

// Manter compatibilidade com nome antigo
const generateGeminiText = generateGPTText;

/**
 * Gerar texto com GPT e processar ações automaticamente (para ai_actions)
 * @param {Object} params - Parâmetros (mesmos de generateGPTText + capabilities)
 * @returns {Promise<Object>} - { response, actionsExecuted, contextUpdates }
 */
async function generateGPTTextWithActions(params) {
    const { capabilities = {}, ...gptParams } = params;

    // Chamar generateGPTText normal (que já processa function calling)
    const response = await generateGPTText(gptParams);

    // Por enquanto, retornar resposta simples
    // O processamento de ações já acontece dentro de generateGPTText via executeToolFunction
    return {
        response: response,
        actionsExecuted: [],
        contextUpdates: {}
    };
}

module.exports = {
    generateGPTText,
    generateGPTTextWithActions,
    generateGeminiText, // Alias para compatibilidade
    getGPTConfig,
    buildSystemInstructions,
    parseJSON,
    fileToBase64,
    executeToolFunction,

    // Exportar constantes de modelos
    MODEL_TEXT,
    MODEL_AUDIO,
    MODEL_TTS
};

