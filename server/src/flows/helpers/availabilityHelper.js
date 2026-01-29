const moment = require('moment');
const dbQuery = require('../../utils/dbHelper');
const { generateGeminiText } = require('../../utils/gemini');

/**
 * Helper para verificar disponibilidade de funcionários e agendamentos
 * Usado pela IA para determinar horários livres para novos agendamentos
 */

/**
 * Obtém a configuração de disponibilidade dos funcionários do banco
 * @returns {Object} Configuração de disponibilidade
 */
async function getAvailabilityConfig() {
    try {
        const config = await dbQuery(
            'SELECT * FROM Options WHERE type = "gemini_disponibilidade"'
        );
        
        if (config.length > 0 && config[0].value) {
            const parsed = JSON.parse(config[0].value);
            
            // Ordenar funcionários por prioridade (menor número = maior prioridade)
            if (parsed.funcionarios && Array.isArray(parsed.funcionarios)) {
                parsed.funcionarios.sort((a, b) => {
                    const prioridadeA = a.prioridade || 999;
                    const prioridadeB = b.prioridade || 999;
                    return prioridadeA - prioridadeB;
                });
            }
            
            return parsed;
        }
        
        return {
            funcionarios: [],
            datasBloqueadas: []
        };
    } catch (error) {
        console.error('Erro ao buscar configuração de disponibilidade:', error);
        return { funcionarios: [], datasBloqueadas: [] };
    }
}

/**
 * Verifica se uma data está bloqueada (feriados, etc)
 * @param {String} data - Data no formato YYYY-MM-DD
 * @returns {Boolean}
 */
async function isDataBloqueada(data) {
    const config = await getAvailabilityConfig();
    const dataMoment = moment(data, 'YYYY-MM-DD');
    
    return config.datasBloqueadas.some(bloqueio => {
        const dataBloqueada = moment(bloqueio.data, 'YYYY-MM-DD');
        return dataBloqueada.isSame(dataMoment, 'day');
    });
}

/**
 * Obtém os horários de trabalho de um funcionário em um dia da semana
 * @param {Number} funId - ID do funcionário
 * @param {String} diaSemana - Dia da semana (0-6, domingo = 0)
 * @returns {Array} Array de horários [{inicio, fim}]
 */
async function getHorariosFuncionario(funId, diaSemana) {
    const config = await getAvailabilityConfig();
    const funcionarioConfig = config.funcionarios.find(f => f.fun_id == funId);
    
    if (!funcionarioConfig || !funcionarioConfig.horarios) {
        return [];
    }
    
    const diasSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    const diaKey = diasSemana[diaSemana];
    
    const horarioDia = funcionarioConfig.horarios[diaKey];
    
    if (!horarioDia || !horarioDia.ativo) {
        return [];
    }
    
    return horarioDia.periodos || [];
}

/**
 * Obtém os agendamentos de um funcionário em uma data específica
 * @param {Number} funId - ID do funcionário
 * @param {String} data - Data no formato YYYY-MM-DD
 * @returns {Array} Array de agendamentos
 */
async function getAgendamentosFuncionarioData(funId, data) {
    try {
        const agendamentos = await dbQuery(
            `SELECT age_id, age_data, age_horaInicio, age_horaFim, age_dataFim, 
             age_horaInicioFim, age_horaFimFim, age_type, ast_id
             FROM AGENDAMENTO 
             WHERE fun_id = ? 
             AND age_ativo = 1
             AND ast_id NOT IN (6, 7)
             AND (
                 (age_data = ? AND age_dataFim IS NULL) 
                 OR (age_data <= ? AND age_dataFim >= ?)
             )`,
            [funId, data, data, data]
        );
        
        return agendamentos || [];
    } catch (error) {
        console.error('Erro ao buscar agendamentos do funcionário:', error);
        return [];
    }
}

/**
 * Verifica se um funcionário pode atender um tipo de serviço
 * @param {Number} funId - ID do funcionário
 * @param {Number} servicoId - ID do serviço principal
 * @param {Number} subservicoId - ID do subserviço (opcional)
 * @returns {Boolean}
 */
async function funcionarioPodeAtenderServico(funId, servicoId, subservicoId = null) {
    const config = await getAvailabilityConfig();
    const funcionarioConfig = config.funcionarios.find(f => f.fun_id == funId);
    
    if (!funcionarioConfig) {
        return false;
    }
    
    // Se não tem serviços configurados, pode atender todos
    if (!funcionarioConfig.servicos || funcionarioConfig.servicos.length === 0) {
        return true;
    }
    
    // Verificar se o funcionário pode atender o serviço ou subserviço
    // Os serviços estão no formato: "servico_X" ou "sub_Y"
    const servicoKey = subservicoId ? `sub_${subservicoId}` : `servico_${servicoId}`;
    
    return funcionarioConfig.servicos.includes(servicoKey);
}

/**
 * Converte horário string (HH:mm) para minutos desde meia-noite
 * @param {String} horario - Horário no formato HH:mm
 * @returns {Number} Minutos desde meia-noite
 */
function horarioParaMinutos(horario) {
    const [horas, minutos] = horario.split(':').map(Number);
    return horas * 60 + minutos;
}

/**
 * Converte minutos desde meia-noite para horário string (HH:mm)
 * @param {Number} minutos - Minutos desde meia-noite
 * @returns {String} Horário no formato HH:mm
 */
function minutosParaHorario(minutos) {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return `${String(horas).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Verifica se há conflito entre dois períodos de tempo
 * @param {Object} periodo1 - {inicio, fim}
 * @param {Object} periodo2 - {inicio, fim}
 * @returns {Boolean}
 */
function temConflito(periodo1, periodo2) {
    const inicio1 = horarioParaMinutos(periodo1.inicio);
    const fim1 = horarioParaMinutos(periodo1.fim);
    const inicio2 = horarioParaMinutos(periodo2.inicio);
    const fim2 = horarioParaMinutos(periodo2.fim);
    
    return (inicio1 < fim2 && fim1 > inicio2);
}

/**
 * Calcula os horários livres de um funcionário em uma data
 * @param {Number} funId - ID do funcionário
 * @param {String} data - Data no formato YYYY-MM-DD
 * @param {Number} duracaoMinutos - Duração necessária em minutos
 * @returns {Array} Array de horários livres [{inicio, fim}]
 */
async function getHorariosLivres(funId, data, duracaoMinutos = 60) {
    // Verificar se a data está bloqueada
    const dataBloqueada = await isDataBloqueada(data);
    if (dataBloqueada) {
        return [];
    }
    
    const dataMoment = moment(data, 'YYYY-MM-DD');
    const diaSemana = dataMoment.day();
    
    // Obter horários de trabalho do funcionário
    const horariosTrabalho = await getHorariosFuncionario(funId, diaSemana);
    if (horariosTrabalho.length === 0) {
        return [];
    }
    
    // Obter agendamentos do funcionário na data
    const agendamentos = await getAgendamentosFuncionarioData(funId, data);
    
    // Para cada período de trabalho, remover os agendamentos e encontrar janelas livres
    const horariosLivres = [];
    
    for (const periodoTrabalho of horariosTrabalho) {
        const periodos = [{
            inicio: periodoTrabalho.inicio,
            fim: periodoTrabalho.fim
        }];
        
        // Remover cada agendamento dos períodos disponíveis
        for (const agendamento of agendamentos) {
            const novosPeriodos = [];
            
            for (const periodo of periodos) {
                const agendInicio = agendamento.age_horaInicio;
                const agendFim = agendamento.age_horaFim;
                
                if (!temConflito(periodo, { inicio: agendInicio, fim: agendFim })) {
                    // Não há conflito, mantém o período
                    novosPeriodos.push(periodo);
                } else {
                    // Há conflito, dividir o período
                    const inicioMinutos = horarioParaMinutos(periodo.inicio);
                    const fimMinutos = horarioParaMinutos(periodo.fim);
                    const agendInicioMinutos = horarioParaMinutos(agendInicio);
                    const agendFimMinutos = horarioParaMinutos(agendFim);
                    
                    // Período antes do agendamento
                    if (inicioMinutos < agendInicioMinutos) {
                        novosPeriodos.push({
                            inicio: periodo.inicio,
                            fim: agendInicio
                        });
                    }
                    
                    // Período depois do agendamento
                    if (fimMinutos > agendFimMinutos) {
                        novosPeriodos.push({
                            inicio: agendFim,
                            fim: periodo.fim
                        });
                    }
                }
            }
            
            periodos.length = 0;
            periodos.push(...novosPeriodos);
        }
        
        // Filtrar apenas períodos que têm duração suficiente
        for (const periodo of periodos) {
            const duracaoPeriodo = horarioParaMinutos(periodo.fim) - horarioParaMinutos(periodo.inicio);
            if (duracaoPeriodo >= duracaoMinutos) {
                horariosLivres.push(periodo);
            }
        }
    }
    
    return horariosLivres;
}

/**
 * Encontra o melhor funcionário e horário para um serviço
 * @param {Number} servicoId - ID do serviço
 * @param {Number} subservicoId - ID do subserviço (opcional)
 * @param {String} dataInicio - Data início busca (YYYY-MM-DD)
 * @param {String} dataFim - Data fim busca (YYYY-MM-DD)
 * @param {Number} duracaoMinutos - Duração do serviço em minutos
 * @param {String} periodoPreferido - Período preferido: 'manha', 'tarde', 'noite', null
 * @returns {Array} Array de opções [{funId, data, horario, funcionarioNome}]
 */
async function findDisponibilidades(servicoId, subservicoId = null, dataInicio, dataFim, duracaoMinutos = 60, periodoPreferido = null) {
    const opcoes = [];
    
    // Buscar funcionários que podem atender o serviço
    const funcionarios = await dbQuery(
        'SELECT id, fullName, ordemCalendar FROM User WHERE ativo = 1 AND podeAgendamento = 1'
    );
    
    const dataInicioMoment = moment(dataInicio, 'YYYY-MM-DD');
    const dataFimMoment = moment(dataFim, 'YYYY-MM-DD');
    
    // Para cada funcionário
    for (const funcionario of funcionarios) {
        // Verificar se pode atender o serviço/subserviço
        const podeAtender = await funcionarioPodeAtenderServico(funcionario.id, servicoId, subservicoId);
        if (!podeAtender) {
            continue;
        }
        
        // Para cada data no intervalo
        let dataAtual = dataInicioMoment.clone();
        while (dataAtual.isSameOrBefore(dataFimMoment)) {
            const dataStr = dataAtual.format('YYYY-MM-DD');
            const horariosLivres = await getHorariosLivres(funcionario.id, dataStr, duracaoMinutos);
            
            for (const horario of horariosLivres) {
                const horaInicio = horarioParaMinutos(horario.inicio);
                
                // Filtrar por período preferido
                let incluir = true;
                if (periodoPreferido === 'manha' && (horaInicio < 360 || horaInicio >= 720)) { // 6h-12h
                    incluir = false;
                } else if (periodoPreferido === 'tarde' && (horaInicio < 720 || horaInicio >= 1080)) { // 12h-18h
                    incluir = false;
                } else if (periodoPreferido === 'noite' && (horaInicio < 1080 || horaInicio >= 1320)) { // 18h-22h
                    incluir = false;
                }
                
                if (incluir) {
                    opcoes.push({
                        funId: funcionario.id,
                        funcionarioNome: funcionario.fullName,
                        data: dataStr,
                        dataFormatada: dataAtual.format('DD/MM/YYYY'),
                        horarioInicio: horario.inicio,
                        horarioFim: minutosParaHorario(horarioParaMinutos(horario.inicio) + duracaoMinutos),
                        diaSemana: dataAtual.format('dddd')
                    });
                }
            }
            
            dataAtual.add(1, 'day');
        }
    }

    console.log('OPÇÕES DE DISPONIBILIDADE:', opcoes);
    
    return opcoes;
}

/**
 * Gera texto descritivo de disponibilidades para a IA
 * @param {Array} disponibilidades - Array de disponibilidades
 * @param {Number} limite - Número máximo de opções a retornar
 * @returns {String} Texto descritivo
 */
function formatDisponibilidadesParaIA(disponibilidades, limite = 5) {
    if (disponibilidades.length === 0) {
        return 'Não há disponibilidades no período solicitado.';
    }
    
    const opcoes = disponibilidades.slice(0, limite);
    let texto = 'Disponibilidades encontradas:\n';
    
    opcoes.forEach((opc, index) => {
        texto += `${index + 1}. ${opc.dataFormatada} (${opc.diaSemana}) às ${opc.horarioInicio} com ${opc.funcionarioNome}\n`;
    });
    
    if (disponibilidades.length > limite) {
        texto += `\n(E mais ${disponibilidades.length - limite} opções disponíveis)`;
    }
    
    return texto;
}

/**
 * Obtém informações sobre serviços para a IA
 * @param {String} query - Termo de busca (opcional)
 * @returns {Array} Array de serviços com informações
 */
async function getServicosInfo(query = null) {
    try {
        let querySQL = 'SELECT ser_id, ser_nome, ser_descricao, ser_valor FROM SERVICOS_NEW WHERE 1=1';
        const params = [];
        
        if (query) {
            querySQL += ' AND (ser_nome LIKE ? OR ser_descricao LIKE ?)';
            params.push(`%${query}%`, `%${query}%`);
        }
        
        querySQL += ' LIMIT 20';
        
        const servicos = await dbQuery(querySQL, params);
        
        // Buscar subserviços
        for (const servico of servicos) {
            const subs = await dbQuery(
                'SELECT ser_id, ser_nome, ser_descricao, ser_valor FROM SERVICOS_SUBS WHERE ser_pai = ?',
                [servico.ser_id]
            );
            servico.subservicos = subs || [];
        }
        
        return servicos;
    } catch (error) {
        console.error('Erro ao buscar serviços:', error);
        return [];
    }
}

/**
 * Formata informações de serviços para a IA
 * @param {Array} servicos - Array de serviços
 * @returns {String} Texto formatado
 */
function formatServicosParaIA(servicos) {
    if (servicos.length === 0) {
        return 'Nenhum serviço encontrado.';
    }
    
    let texto = 'Serviços disponíveis:\n\n';
    
    servicos.forEach((servico, index) => {
        texto += `${index + 1}. ${servico.ser_nome}`;
        if (servico.ser_descricao) {
            texto += ` - ${servico.ser_descricao}`;
        }
        if (servico.ser_valor) {
            texto += ` (R$ ${parseFloat(servico.ser_valor).toFixed(2)})`;
        }
        texto += '\n';
        
        if (servico.subservicos && servico.subservicos.length > 0) {
            servico.subservicos.forEach(sub => {
                texto += `   - ${sub.ser_nome}`;
                if (sub.ser_descricao) {
                    texto += `: ${sub.ser_descricao}`;
                }
                if (sub.ser_valor) {
                    texto += ` (R$ ${parseFloat(sub.ser_valor).toFixed(2)})`;
                }
                texto += '\n';
            });
        }
    });
    
    return texto;
}

/**
 * Verifica disponibilidade considerando TODOS os funcionários
 * Retorna informações sobre quantos e quais funcionários estão disponíveis
 * 
 * @param {String} data - Data no formato YYYY-MM-DD
 * @param {String} horaInicio - Hora início no formato HH:mm
 * @param {String} horaFim - Hora fim no formato HH:mm
 * @param {Number} servicoId - ID do serviço (opcional)
 * @param {Number} subservicoId - ID do subserviço (opcional)
 * @returns {Object} { disponivel, funcionariosDisponiveis, funcionariosOcupados, total, detalhes }
 */
async function verificarDisponibilidadeGeral(data, horaInicio, horaFim, servicoId = null, subservicoId = null) {
    console.log('\n🔍 ========== VERIFICANDO DISPONIBILIDADE GERAL ==========');
    console.log(`📅 Data: ${data} (${moment(data).format('DD/MM/YYYY - dddd')})`);
    console.log(`⏰ Horário: ${horaInicio} - ${horaFim}`);
    console.log(`🛠️ Serviço ID: ${servicoId || 'N/A'} | Sub ID: ${subservicoId || 'N/A'}`);
    
    try {
        // 1. Buscar todos os funcionários ativos
        console.log('\n👥 Buscando funcionários ativos...');
        let funcionarios = await dbQuery(
            'SELECT id, fullName, ordemCalendar FROM User WHERE ativo = 1 AND podeAgendamento = 1'
        );

        // Ordenar funcionários pela prioridade configurada ou ordemCalendar
        const config = await getAvailabilityConfig();
        funcionarios = funcionarios.map(func => {
            const funcConfig = config.funcionarios.find(f => f.fun_id === func.id);
            const prioridadeConfig = funcConfig?.prioridade;
            const prioridadeOrdem = func.ordemCalendar || 999;
            return {
                ...func,
                prioridade: prioridadeConfig !== undefined ? prioridadeConfig : prioridadeOrdem
            };
        }).sort((a, b) => a.prioridade - b.prioridade);
        
        console.log(`   ✅ ${funcionarios.length} funcionário(s) encontrado(s) (ordenados por prioridade)`);

        if (funcionarios.length === 0) {
            console.error('   ❌ Nenhum funcionário ativo no sistema!');
            return {
                disponivel: false,
                funcionariosDisponiveis: [],
                funcionariosOcupados: [],
                total: 0,
                detalhes: 'Nenhum funcionário ativo no sistema',
                mensagem: 'Não há funcionários disponíveis'
            };
        }

        // 2. Verificar se a data está bloqueada
        console.log('\n🚫 Verificando se data está bloqueada...');
        const dataBloqueada = await isDataBloqueada(data);
        console.log(`   ${dataBloqueada ? '❌ Data BLOQUEADA' : '✅ Data DISPONÍVEL'}`);
        
        if (dataBloqueada) {
            return {
                disponivel: false,
                funcionariosDisponiveis: [],
                funcionariosOcupados: funcionarios.map(f => ({
                    id: f.id,
                    nome: f.fullName,
                    motivo: 'Data bloqueada (feriado/folga)'
                })),
                total: funcionarios.length,
                detalhes: 'Data bloqueada no sistema',
                mensagem: 'Esta data está bloqueada para agendamentos'
            };
        }

        // 3. Buscar todos os agendamentos desta data
        console.log('\n📆 Buscando agendamentos existentes na data...');
        const agendamentos = await dbQuery(`
            SELECT 
                age_id,
                fun_id,
                age_horaInicio,
                age_horaFim,
                age_type
            FROM AGENDAMENTO 
            WHERE age_ativo = 1
            AND age_data = ?
            AND ast_id NOT IN (6, 7)
            ORDER BY age_horaInicio
        `, [data]);
        console.log(`   ℹ️ ${agendamentos.length} agendamento(s) encontrado(s)`);
        
        if (agendamentos.length > 0) {
            console.log('   Agendamentos:');
            agendamentos.forEach(a => {
                console.log(`     - Func ${a.fun_id}: ${a.age_horaInicio} - ${a.age_horaFim}`);
            });
        }

        // 4. Converter horários para minutos
        const inicioMinutos = horarioParaMinutos(horaInicio);
        const fimMinutos = horarioParaMinutos(horaFim);
        const periodoDesejado = {
            inicio: horaInicio,
            fim: horaFim
        };

        // 5. Verificar cada funcionário
        console.log('\n👷 Analisando cada funcionário...');
        const funcionariosDisponiveis = [];
        const funcionariosOcupados = [];

        for (const funcionario of funcionarios) {
            console.log(`\n   👤 ${funcionario.fullName} (ID: ${funcionario.id})`);
            
            // Verificar se pode atender o serviço (se informado)
            if (servicoId) {
                const podeAtender = await funcionarioPodeAtenderServico(
                    funcionario.id,
                    servicoId,
                    subservicoId
                );
                
                if (!podeAtender) {
                    console.log(`      ❌ Não atende este tipo de serviço`);
                    funcionariosOcupados.push({
                        id: funcionario.id,
                        nome: funcionario.fullName,
                        motivo: 'Não atende este tipo de serviço'
                    });
                    continue;
                } else {
                    console.log(`      ✅ Pode atender este serviço`);
                }
            }

            // Verificar horários de trabalho configurados
            const dataMoment = moment(data, 'YYYY-MM-DD');
            const diaSemana = dataMoment.day(); // 0 = Domingo, 6 = Sábado
            const nomeDia = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'][diaSemana];
            console.log(`      📅 Dia da semana: ${nomeDia} (${diaSemana})`);
            
            const horariosTrabalho = await getHorariosFuncionario(funcionario.id, diaSemana);
            console.log(`      ⏰ Horários de trabalho: ${horariosTrabalho.length > 0 ? 
                horariosTrabalho.map(h => `${h.inicio}-${h.fim}`).join(', ') : 'NENHUM'}`);
            
            if (horariosTrabalho.length === 0) {
                console.log(`      ❌ NÃO trabalha neste dia`);
                funcionariosOcupados.push({
                    id: funcionario.id,
                    nome: funcionario.fullName,
                    motivo: `Não trabalha às ${nomeDia}s`
                });
                continue;
            }

            // Verificar se o horário desejado está dentro do horário de trabalho
            let dentroDoExpediente = false;
            for (const expediente of horariosTrabalho) {
                const expInicio = horarioParaMinutos(expediente.inicio);
                const expFim = horarioParaMinutos(expediente.fim);
                
                console.log(`      🔍 Comparando: ${horaInicio}-${horaFim} com expediente ${expediente.inicio}-${expediente.fim}`);
                console.log(`          Minutos: desejado ${inicioMinutos}-${fimMinutos}, expediente ${expInicio}-${expFim}`);
                
                if (inicioMinutos >= expInicio && fimMinutos <= expFim) {
                    dentroDoExpediente = true;
                    console.log(`      ✅ Horário dentro do expediente!`);
                    break;
                } else {
                    console.log(`      ⚠️ Horário FORA do expediente`);
                }
            }

            if (!dentroDoExpediente) {
                console.log(`      ❌ Horário solicitado está fora do expediente`);
                funcionariosOcupados.push({
                    id: funcionario.id,
                    nome: funcionario.fullName,
                    motivo: 'Fora do horário de trabalho',
                    horariosTrabalho: horariosTrabalho.map(h => `${h.inicio}-${h.fim}`).join(', ')
                });
                continue;
            }

            // Verificar conflitos com agendamentos existentes
            const agendamentosFuncionario = agendamentos.filter(a => a.fun_id === funcionario.id);
            console.log(`      📆 Agendamentos do funcionário: ${agendamentosFuncionario.length}`);
            
            let temConflitoBool = false;
            let motivoConflito = '';

            for (const agendamento of agendamentosFuncionario) {
                const periodoAgendamento = {
                    inicio: agendamento.age_horaInicio,
                    fim: agendamento.age_horaFim
                };

                if (temConflito(periodoDesejado, periodoAgendamento)) {
                    temConflitoBool = true;
                    motivoConflito = `Já tem agendamento ${agendamento.age_horaInicio}-${agendamento.age_horaFim}`;
                    console.log(`      ❌ CONFLITO: ${motivoConflito}`);
                    break;
                }
            }

            if (temConflitoBool) {
                funcionariosOcupados.push({
                    id: funcionario.id,
                    nome: funcionario.fullName,
                    motivo: motivoConflito
                });
            } else {
                console.log(`      ✅ DISPONÍVEL!`);
                funcionariosDisponiveis.push({
                    id: funcionario.id,
                    nome: funcionario.fullName,
                    motivo: 'Disponível'
                });
            }
        }

        // 6. Preparar resposta
        const dataFormatada = moment(data, 'YYYY-MM-DD').format('DD/MM/YYYY');
        const diaNome = moment(data, 'YYYY-MM-DD').format('dddd');
        
        console.log('\n📊 ========== RESULTADO DA VERIFICAÇÃO ==========');
        console.log(`   ✅ Disponíveis: ${funcionariosDisponiveis.length}`);
        if (funcionariosDisponiveis.length > 0) {
            funcionariosDisponiveis.forEach(f => {
                console.log(`      - ${f.nome}`);
            });
        }
        console.log(`   ❌ Ocupados: ${funcionariosOcupados.length}`);
        if (funcionariosOcupados.length > 0) {
            funcionariosOcupados.forEach(f => {
                console.log(`      - ${f.nome}: ${f.motivo}`);
            });
        }
        console.log(`   📈 Total: ${funcionarios.length} funcionário(s)`);
        console.log(`   ${funcionariosDisponiveis.length > 0 ? '✅ TEM DISPONIBILIDADE!' : '❌ SEM DISPONIBILIDADE'}`);
        console.log('================================================\n');

        return {
            disponivel: funcionariosDisponiveis.length > 0,
            funcionariosDisponiveis,
            funcionariosOcupados,
            total: funcionarios.length,
            data: dataFormatada,
            diaSemana: diaNome,
            horario: `${horaInicio} - ${horaFim}`,
            detalhes: funcionariosDisponiveis.length > 0 
                ? `${funcionariosDisponiveis.length} de ${funcionarios.length} funcionário(s) disponível(is)`
                : `Todos os ${funcionarios.length} funcionários estão ocupados`,
            mensagem: funcionariosDisponiveis.length > 0
                ? `Temos disponibilidade neste horário!`
                : `Não há disponibilidade neste horário`
        };

    } catch (error) {
        console.error('❌ Erro ao verificar disponibilidade geral:', error);
        console.error('   Stack:', error.stack);
        throw error;
    }
}

/**
 * Formata resultado de disponibilidade geral para texto legível pela IA
 * @param {Object} resultado - Resultado de verificarDisponibilidadeGeral
 * @returns {String} - Texto formatado
 */
function formatarDisponibilidadeGeralParaIA(resultado) {
    if (!resultado.disponivel) {
        let texto = `❌ *Não há disponibilidade* no horário ${resultado.horario} do dia ${resultado.data} (${resultado.diaSemana}).\n\n`;
        
        if (resultado.funcionariosOcupados.length > 0) {
            texto += `Situação dos ${resultado.total} funcionários:\n\n`;
            
            for (const func of resultado.funcionariosOcupados) {
                texto += `- ${func.nome}: ${func.motivo}\n`;
            }
        }
        
        texto += `\n💡 _Sugira outros horários ou dias para o cliente._`;
        return texto;
    }

    let texto = `✅ *Temos disponibilidade!* 🎉\n\n`;
    texto += `📅 Data: ${resultado.data} (${resultado.diaSemana})\n`;
    texto += `⏰ Horário: ${resultado.horario}\n\n`;
    texto += `👥 *${resultado.funcionariosDisponiveis.length} de ${resultado.total} funcionário(s) disponível(is):*\n\n`;
    
    for (const func of resultado.funcionariosDisponiveis) {
        texto += `- ${func.nome}\n`;
    }

    if (resultado.funcionariosOcupados.length > 0) {
        texto += `\n_Ocupados:_\n`;
        for (const func of resultado.funcionariosOcupados) {
            texto += `- ${func.nome}: ${func.motivo}\n`;
        }
    }

    return texto;
}

/**
 * Busca múltiplas opções de horários disponíveis em um período
 * Considera TODOS os funcionários, não apenas um
 * 
 * @param {String} dataInicio - Data início (YYYY-MM-DD)
 * @param {String} dataFim - Data fim (YYYY-MM-DD)
 * @param {Number} duracaoMinutos - Duração do serviço
 * @param {String} periodoPreferido - 'manha', 'tarde', 'noite' ou null
 * @param {Number} servicoId - ID do serviço (opcional)
 * @param {Number} subservicoId - ID do subserviço (opcional)
 * @returns {Array} - Lista de opções disponíveis
 */
async function buscarOpcoesDisponibilidade(dataInicio, dataFim, duracaoMinutos = 60, periodoPreferido = null, servicoId = null, subservicoId = null) {
    const opcoes = [];
    
    const dataInicioMoment = moment(dataInicio, 'YYYY-MM-DD');
    const dataFimMoment = moment(dataFim, 'YYYY-MM-DD');
    
    // Definir horários de busca baseados no período
    let horariosParaBuscar = [];
    
    if (periodoPreferido === 'manha') {
        horariosParaBuscar = ['08:00', '09:00', '10:00', '11:00'];
    } else if (periodoPreferido === 'tarde') {
        horariosParaBuscar = ['13:00', '14:00', '15:00', '16:00', '17:00'];
    } else if (periodoPreferido === 'noite') {
        horariosParaBuscar = ['18:00', '19:00', '20:00'];
    } else {
        // Buscar em todos os períodos
        horariosParaBuscar = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];
    }
    
    // Para cada data no intervalo
    let dataAtual = dataInicioMoment.clone();
    while (dataAtual.isSameOrBefore(dataFimMoment) && opcoes.length < 20) {
        const dataStr = dataAtual.format('YYYY-MM-DD');
        
        // Para cada horário
        for (const horaInicio of horariosParaBuscar) {
            const horaInicioMinutos = horarioParaMinutos(horaInicio);
            const horaFim = minutosParaHorario(horaInicioMinutos + duracaoMinutos);
            
            // Verificar disponibilidade
            const disponibilidade = await verificarDisponibilidadeGeral(
                dataStr,
                horaInicio,
                horaFim,
                servicoId,
                subservicoId
            );
            
            if (disponibilidade.disponivel) {
                opcoes.push({
                    data: dataStr,
                    dataFormatada: dataAtual.format('DD/MM/YYYY'),
                    diaSemana: dataAtual.format('dddd'),
                    horarioInicio: horaInicio,
                    horarioFim: horaFim,
                    funcionariosDisponiveis: disponibilidade.funcionariosDisponiveis.length,
                    nomesFuncionarios: disponibilidade.funcionariosDisponiveis.map(f => f.nome),
                    periodo: periodoPreferido || getPeriodoDoHorario(horaInicio)
                });
                
                // Limitar a 20 opções
                if (opcoes.length >= 20) break;
            }
        }
        
        dataAtual.add(1, 'day');
    }
    
    return opcoes;
}

/**
 * Determina o período do dia baseado no horário
 * @param {String} horario - Horário no formato HH:mm
 * @returns {String} - 'manha', 'tarde' ou 'noite'
 */
function getPeriodoDoHorario(horario) {
    const minutos = horarioParaMinutos(horario);
    
    if (minutos >= 360 && minutos < 720) return 'manhã'; // 6h-12h
    if (minutos >= 720 && minutos < 1080) return 'tarde'; // 12h-18h
    return 'noite'; // 18h+
}

/**
 * Resume opções de disponibilidade usando grounding do Google Maps via Gemini
 * @param {Array} opcoes - Array de opções {dataFormatada, horarioInicio, horarioFim, nomesFuncionarios, periodo}
 * @param {{latitude:number, longitude:number}|null} latLng - Coordenadas para contextualizar (opcional)
 * @returns {Promise<String>} - Texto resumido e compacto
 */
async function resumirOpcoesParaIAComMaps(opcoes = [], latLng = null) {
    if (!opcoes || opcoes.length === 0) {
        return 'Nenhuma disponibilidade encontrada.';
    }

    const resumoBasico = opcoes.slice(0, 12).map((o, idx) => (
        `${idx + 1}. ${o.dataFormatada} ${o.horarioInicio}-${o.horarioFim} (${o.periodo || 'indef'}) ` +
        `com ${o.nomesFuncionarios?.slice(0, 2).join(', ') || `${o.funcionariosDisponiveis || 1} prof.`}`
    )).join('\n');

    const prompt = [
        'Você é um assistente que precisa resumir disponibilidades em intervalos compactos.',
        'Agrupe datas consecutivas em faixas (ex: "13 a 15/12").',
        'Agrupe horários contíguos em intervalos (ex: "13h–15h").',
        'Destaque prioridades: profissionais com maior prioridade primeiro.',
        'Responda somente com as 3 melhores opções (ou menos se não houver), em formato curto.',
        'Use português, tom objetivo.',
        '',
        'Disponibilidades:',
        resumoBasico
    ].join('\n');

    const mapsLatLng = latLng ? { latitude: latLng.latitude, longitude: latLng.longitude } : null;

    const res = await generateGeminiText({
        instructions: prompt,
        userText: '',
        history: [],
        context: {},
        tools: [],
        useGoogleMapsGrounding: true,
        googleMapsLatLng: mapsLatLng
    });

    return res;
}

/**
 * Geocodifica endereço livre (mesmo incompleto) usando grounding do Google Maps via Gemini.
 * Retorna { latitude, longitude } ou null.
 * @param {String} enderecoTexto
 * @param {{lat:number,lng:number}|null} fallback
 */
async function geocodificarEnderecoComMaps(enderecoTexto, fallback = null) {
    if (!enderecoTexto || enderecoTexto.trim().length < 4) return fallback;

    const prompt = [
        'Você é um geocodificador. Receba um endereço (mesmo incompleto) e retorne APENAS JSON com latitude e longitude.',
        'Use o grounding do Google Maps. Se não tiver confiança, retorne null.',
        'Formato: {"lat": -23.0, "lng": -46.0}',
        '',
        'Endereço:',
        enderecoTexto
    ].join('\n');

    const resp = await generateGeminiText({
        instructions: prompt,
        userText: '',
        history: [],
        context: {},
        tools: [],
        useGoogleMapsGrounding: true
    });

    try {
        const cleaned = (resp || '').trim();
        const jsonStart = cleaned.indexOf('{');
        const jsonEnd = cleaned.lastIndexOf('}');
        if (jsonStart === -1 || jsonEnd === -1) return fallback;
        const jsonStr = cleaned.slice(jsonStart, jsonEnd + 1);
        const parsed = JSON.parse(jsonStr);
        if (parsed.lat !== undefined && parsed.lng !== undefined) {
            return { latitude: parsed.lat, longitude: parsed.lng };
        }
    } catch (err) {
        console.error('Erro ao parsear geocodificação:', err.message);
    }
    return fallback;
}

/**
 * Formata lista de opções de disponibilidade para a IA
 * @param {Array} opcoes - Array de opções
 * @param {Number} limite - Número máximo de opções a mostrar
 * @returns {String} - Texto formatado
 */
function formatarOpcoesParaIA(opcoes, limite = 10) {
    if (opcoes.length === 0) {
        return '❌ Não encontrei disponibilidades no período solicitado.\n\n💡 Sugira datas alternativas ou períodos diferentes.';
    }
    
    let texto = `✅ Encontrei *${opcoes.length} opções disponíveis!*\n\n`;
    texto += `Aqui estão as ${Math.min(limite, opcoes.length)} primeiras:\n\n`;
    
    const opcoesLimitadas = opcoes.slice(0, limite);
    
    for (let i = 0; i < opcoesLimitadas.length; i++) {
        const opc = opcoesLimitadas[i];
        texto += `${i + 1}. *${opc.dataFormatada}* (${opc.diaSemana}) - ${opc.horarioInicio} às ${opc.horarioFim}\n`;
        texto += `   👥 ${opc.funcionariosDisponiveis} funcionário(s) disponível(is)\n\n`;
    }
    
    if (opcoes.length > limite) {
        texto += `_...e mais ${opcoes.length - limite} opções disponíveis!_\n\n`;
    }
    
    texto += `💬 _Qual horário você prefere?_`;
    
    return texto;
}

module.exports = {
    getAvailabilityConfig,
    isDataBloqueada,
    getHorariosFuncionario,
    getAgendamentosFuncionarioData,
    funcionarioPodeAtenderServico,
    getHorariosLivres,
    findDisponibilidades,
    formatDisponibilidadesParaIA,
    getServicosInfo,
    formatServicosParaIA,
    horarioParaMinutos,
    minutosParaHorario,
    temConflito,
    // Novas funções para verificação geral
    verificarDisponibilidadeGeral,
    formatarDisponibilidadeGeralParaIA,
    buscarOpcoesDisponibilidade,
    formatarOpcoesParaIA,
    getPeriodoDoHorario,
    resumirOpcoesParaIAComMaps,
    geocodificarEnderecoComMaps
};

