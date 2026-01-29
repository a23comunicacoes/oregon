const dbQuery = require('./dbHelper');
const moment = require('moment');

/**
 * Obtém informações completas dos funis (pipeline) da empresa
 * Inclui nome, probabilidade, ordem e instruções de IA de cada etapa
 * @returns {Array} Lista de funis ordenados
 */
async function getFunisCompletos() {
    try {
        const funis = await dbQuery(`
            SELECT 
                id, 
                nome, 
                probabilidade, 
                ordem, 
                instrucoesIa 
            FROM Funis 
            ORDER BY ordem ASC
        `);
        
        return funis || [];
    } catch (error) {
        console.error('❌ Erro ao buscar funis:', error);
        return [];
    }
}

/**
 * Gera um resumo formatado da pipeline para a IA
 * Inclui todas as etapas, suas instruções e como avançar
 * @returns {String} Texto formatado para contexto da IA
 */
async function getPipelineResumoParaIA() {
    const funis = await getFunisCompletos();
    
    if (!funis || funis.length === 0) {
        return '';
    }
    
    let resumo = '\n## 📊 PIPELINE DE VENDAS DA EMPRESA\n\n';
    resumo += 'A empresa trabalha com um funil de vendas estruturado. Aqui estão as etapas:\n\n';
    
    for (let i = 0; i < funis.length; i++) {
        const funil = funis[i];
        const proximaEtapa = i < funis.length - 1 ? funis[i + 1] : null;
        
        resumo += `### ${i + 1}. ${funil.nome}\n`;
        resumo += `   - ID Interno: ${funil.id} (use para avançar etapa)\n`;
        resumo += `   - Probabilidade de fechamento: ${funil.probabilidade || 0}%\n`;
        
        if (funil.instrucoesIa && funil.instrucoesIa.trim()) {
            resumo += `   - Instruções: ${funil.instrucoesIa}\n`;
        }
        
        if (proximaEtapa) {
            resumo += `   - Próxima etapa: "${proximaEtapa.nome}" (ID: ${proximaEtapa.id})\n`;
        } else {
            resumo += `   - Esta é a última etapa antes do fechamento\n`;
        }
        
        resumo += '\n';
    }
    
    resumo += '### 🎯 Como Gerenciar a Pipeline:\n\n';
    resumo += '1. **Avançar Etapa**: Quando cliente demonstrar evolução\n';
    resumo += '   ```json\n';
    resumo += '   {"atualizarNegocio": true, "etapaId": ID_PROXIMA_ETAPA, "anotacao": "Cliente confirmou interesse"}\n';
    resumo += '   ```\n\n';
    
    resumo += '2. **Atualizar Valor**: Quando negociar/confirmar preço\n';
    resumo += '   ```json\n';
    resumo += '   {"atualizarNegocio": true, "valor": 500, "anotacao": "Valor acordado"}\n';
    resumo += '   ```\n\n';
    
    resumo += '3. **Marcar como Ganho**: Quando cliente confirmar fechamento\n';
    resumo += '   ```json\n';
    resumo += '   {"marcarNegocioGanho": true, "valorFinal": 500}\n';
    resumo += '   ```\n\n';
    
    resumo += '4. **Marcar como Perdido**: Quando cliente desistir\n';
    resumo += '   ```json\n';
    resumo += '   {"marcarNegocioPerdido": true, "motivo": "Preço alto", "observacao": "Cliente achou caro"}\n';
    resumo += '   ```\n\n';
    
    resumo += '5. **Adicionar Anotação**: Registrar informação importante\n';
    resumo += '   ```json\n';
    resumo += '   {"adicionarAnotacao": true, "texto": "Cliente pediu desconto de 10%"}\n';
    resumo += '   ```\n\n';
    
    resumo += '### ⚠️ REGRAS IMPORTANTES:\n\n';
    resumo += '- SEMPRE adicione anotações ao fazer mudanças importantes\n';
    resumo += '- Avance etapas SOMENTE quando cliente demonstrar evolução clara\n';
    resumo += '- Marque como ganho APENAS quando cliente confirmar fechamento\n';
    resumo += '- Seja conservador ao marcar como perdido - tente recuperar primeiro\n';
    resumo += '- Mantenha o valor sempre atualizado conforme as negociações\n\n';
    
    return resumo;
}

/**
 * Busca todos os negócios de um cliente com informações completas
 * @param {Number} clienteId - ID do cliente
 * @returns {Array} Lista de negócios do cliente
 */
async function getNegociosCliente(clienteId) {
    try {
        const negocios = await dbQuery(`
            SELECT 
                n.*,
                f.nome as etapa_nome,
                f.probabilidade as etapa_probabilidade,
                f.ordem as etapa_ordem,
                f.instrucoesIa as etapa_instrucoes
            FROM Negocios n
            LEFT JOIN Funis f ON f.id = n.etapaId
            WHERE n.cli_Id = ?
            AND n.status NOT IN ('Perdido', 'Cancelado')
            ORDER BY n.updated_at DESC, n.created_at DESC
        `, [clienteId]);
        
        // Parsear JSONs
        for (const negocio of negocios) {
            negocio.historico = negocio.historico ? JSON.parse(negocio.historico) : [];
            negocio.anotacoes = negocio.anotacoes ? JSON.parse(negocio.anotacoes) : [];
            negocio.atividades = negocio.atividades ? JSON.parse(negocio.atividades) : [];
            negocio.tags = negocio.tags ? JSON.parse(negocio.tags) : [];
        }
        
        return negocios;
    } catch (error) {
        console.error('❌ Erro ao buscar negócios do cliente:', error);
        return [];
    }
}

/**
 * Gera resumo dos negócios do cliente formatado para a IA
 * @param {Number} clienteId - ID do cliente
 * @returns {Object} Resumo formatado com total e texto
 */
async function getNegociosClienteResumo(clienteId) {
    const negocios = await getNegociosCliente(clienteId);
    
    if (!negocios || negocios.length === 0) {
        return {
            total: 0,
            negocios: [],
            textoIA: '\n## 💼 NEGÓCIOS DO CLIENTE: Nenhum negócio ativo encontrado\n'
        };
    }
    
    let texto = '\n## 💼 NEGÓCIOS ATIVOS DO CLIENTE\n\n';
    texto += `O cliente possui ${negocios.length} negócio(s) ativo(s) em andamento:\n\n`;
    
    for (let i = 0; i < negocios.length; i++) {
        const n = negocios[i];
        const numero = i + 1;
        
        texto += `### ${numero}. ${n.title}\n`;
        texto += `   - ID: ${n.id} (use este ID para atualizar)\n`;
        texto += `   - Etapa atual: "${n.etapa_nome}" (probabilidade: ${n.etapa_probabilidade || 0}%)\n`;
        texto += `   - Status: ${n.status}\n`;
        texto += `   - Valor: R$ ${parseFloat(n.valor || 0).toFixed(2)}\n`;
        
        if (n.origem) {
            texto += `   - Origem: ${n.origem}\n`;
        }
        
        // Mostrar última anotação se existir
        if (n.anotacoes && n.anotacoes.length > 0) {
            const ultimaAnotacao = n.anotacoes[n.anotacoes.length - 1];
            const anotacaoPreview = ultimaAnotacao.content.substring(0, 100);
            texto += `   - Última anotação: "${anotacaoPreview}${ultimaAnotacao.content.length > 100 ? '...' : ''}"\n`;
        }
        
        // Mostrar instruções da etapa atual
        if (n.etapa_instrucoes && n.etapa_instrucoes.trim()) {
            texto += `   - Instruções da etapa: ${n.etapa_instrucoes}\n`;
        }
        
        // Calcular idade do negócio
        const idade = moment().diff(moment(n.created_at), 'days');
        texto += `   - Criado há: ${idade} dia(s)\n`;
        
        texto += '\n';
    }
    
    texto += '### 🎯 PRÓXIMOS PASSOS:\n';
    texto += '- Identifique em qual negócio o cliente está falando\n';
    texto += '- Se evoluiu, avance a etapa usando o ID do negócio\n';
    texto += '- Se confirmou valores, atualize o valor do negócio\n';
    texto += '- SEMPRE adicione anotações importantes sobre a conversa\n';
    texto += '- Se fechou, marque como ganho. Se desistiu, marque como perdido\n\n';
    
    return {
        total: negocios.length,
        negocios,
        textoIA: texto
    };
}

/**
 * Cria um negócio automaticamente (chamado pela IA)
 * @param {Object} params - Parâmetros do negócio
 * @returns {Object} Resultado da criação
 */
async function criarNegocioAutomatico({ clienteId, titulo, valor = 0, origem = 'IA', descricao = '' }) {
    console.log('\n💼 === CRIANDO NEGÓCIO AUTOMATICAMENTE ===');
    console.log('📊 Dados:', { clienteId, titulo, valor, origem });
    
    try {
        // Buscar primeira etapa do funil (ordem = 1)
        const [primeiraEtapa] = await dbQuery(`
            SELECT id, nome 
            FROM Funis 
            ORDER BY ordem ASC 
            LIMIT 1
        `);
        
        if (!primeiraEtapa) {
            console.error('❌ Nenhuma etapa do funil encontrada!');
            return { success: false, error: 'Funil de vendas não configurado' };
        }
        
        console.log('✅ Primeira etapa:', primeiraEtapa.nome, '(ID:', primeiraEtapa.id, ')');
        
        // Criar anotação inicial
        const anotacaoInicial = {
            id: moment().unix(),
            content: descricao || `Negócio criado automaticamente pela IA.\n\n📍 Origem: ${origem}\n💰 Valor inicial: R$ ${valor.toFixed(2)}\n⏰ Criado em: ${moment().format('DD/MM/YYYY HH:mm')}`,
            feitoPor: {
                id: 0,
                fullName: 'Sistema - IA'
            },
            created_at: moment().format('YYYY-MM-DD HH:mm:ss'),
            updated_at: moment().format('YYYY-MM-DD HH:mm:ss')
        };
        
        // Criar histórico inicial
        const historicoInicial = [
            {
                title: 'Negócio criado pela IA',
                description: `Negócio "${titulo}" criado automaticamente`,
                date: moment().format('YYYY-MM-DD HH:mm:ss'),
                feitoPor: 'Sistema - IA',
                color: 'success',
                icon: 'tabler-briefcase',
                type: 'negocio-criado'
            },
            {
                type: 'negocio-etapa',
                etapa: primeiraEtapa.nome,
                etapaId: primeiraEtapa.id,
                date: moment().format('YYYY-MM-DD HH:mm:ss'),
                feitoPor: 'Sistema - IA'
            }
        ];
        
        // Inserir no banco
        const result = await dbQuery(`
            INSERT INTO Negocios 
            (cli_Id, title, etapaId, status, valor, origem, historico, anotacoes, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            clienteId,
            titulo,
            primeiraEtapa.id,
            'Pendente',
            valor,
            origem,
            JSON.stringify(historicoInicial),
            JSON.stringify([anotacaoInicial]),
            'Sistema - IA'
        ]);
        
        const negocioId = result.insertId;
        
        // Atualizar histórico do cliente
        const [cliente] = await dbQuery('SELECT cli_historico FROM CLIENTES WHERE cli_Id = ?', [clienteId]);
        if (cliente) {
            let historicoCliente = cliente.cli_historico ? JSON.parse(cliente.cli_historico) : [];
            historicoCliente.unshift({
                title: 'Negócio criado pela IA',
                description: `Negócio "${titulo}" criado automaticamente na etapa "${primeiraEtapa.nome}"`,
                date: moment().format('YYYY-MM-DD HH:mm:ss'),
                feitoPor: 'Sistema - IA',
                color: 'success',
                icon: 'tabler-briefcase'
            });
            
            await dbQuery('UPDATE CLIENTES SET cli_historico = ? WHERE cli_Id = ?', 
                [JSON.stringify(historicoCliente), clienteId]);
        }
        
        console.log('✅ Negócio criado com sucesso! ID:', negocioId);
        
        return {
            success: true,
            negocioId,
            etapaId: primeiraEtapa.id,
            etapaNome: primeiraEtapa.nome
        };
    } catch (error) {
        console.error('❌ Erro ao criar negócio:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Atualiza um negócio (avançar etapa, valor, etc)
 * @param {Object} params - Parâmetros da atualização
 * @returns {Object} Resultado da atualização
 */
async function atualizarNegocio({ negocioId, etapaId = null, valor = null, anotacao = null }) {
    console.log('\n💼 === ATUALIZANDO NEGÓCIO ===');
    console.log('📊 Params:', { negocioId, etapaId, valor, anotacao });
    
    try {
        // Buscar negócio atual
        const [negocio] = await dbQuery('SELECT * FROM Negocios WHERE id = ?', [negocioId]);
        
        if (!negocio) {
            return { success: false, error: 'Negócio não encontrado' };
        }
        
        let historico = negocio.historico ? JSON.parse(negocio.historico) : [];
        let anotacoes = negocio.anotacoes ? JSON.parse(negocio.anotacoes) : [];
        let updates = [];
        let values = [];
        
        // Atualizar etapa
        if (etapaId && etapaId !== negocio.etapaId) {
            const [novaEtapa] = await dbQuery('SELECT * FROM Funis WHERE id = ?', [etapaId]);
            
            if (novaEtapa) {
                // Finalizar etapa antiga
                let lastEtapaHist = historico.find(h => h.type === 'negocio-etapa' && h.etapaId === negocio.etapaId);
                if (lastEtapaHist) {
                    lastEtapaHist.dateFim = moment().format('YYYY-MM-DD HH:mm:ss');
                }
                
                // Adicionar nova etapa
                historico.unshift({
                    type: 'negocio-etapa',
                    etapa: novaEtapa.nome,
                    etapaId: novaEtapa.id,
                    date: moment().format('YYYY-MM-DD HH:mm:ss'),
                    dateFim: null,
                    feitoPor: 'Sistema - IA'
                });
                
                historico.unshift({
                    title: 'Etapa avançada pela IA',
                    description: `Negócio movido para "${novaEtapa.nome}"`,
                    date: moment().format('YYYY-MM-DD HH:mm:ss'),
                    feitoPor: 'Sistema - IA',
                    color: 'success',
                    icon: 'tabler-trending-up'
                });
                
                updates.push('etapaId = ?');
                values.push(etapaId);
                
                console.log('✅ Etapa atualizada para:', novaEtapa.nome);
            }
        }
        
        // Atualizar valor
        if (valor !== null && valor !== negocio.valor) {
            historico.unshift({
                title: 'Valor atualizado pela IA',
                description: `Valor alterado de R$ ${parseFloat(negocio.valor || 0).toFixed(2)} para R$ ${parseFloat(valor).toFixed(2)}`,
                date: moment().format('YYYY-MM-DD HH:mm:ss'),
                feitoPor: 'Sistema - IA',
                color: 'warning',
                icon: 'tabler-currency-real'
            });
            
            updates.push('valor = ?');
            values.push(valor);
            
            console.log('✅ Valor atualizado para:', valor);
        }
        
        // Adicionar anotação
        if (anotacao && anotacao.trim()) {
            anotacoes.push({
                id: moment().unix(),
                content: anotacao,
                feitoPor: {
                    id: 0,
                    fullName: 'Sistema - IA'
                },
                created_at: moment().format('YYYY-MM-DD HH:mm:ss'),
                updated_at: moment().format('YYYY-MM-DD HH:mm:ss')
            });
            
            console.log('✅ Anotação adicionada');
        }
        
        // Sempre atualizar histórico e anotações
        updates.push('historico = ?', 'anotacoes = ?', 'updated_by = ?');
        values.push(JSON.stringify(historico), JSON.stringify(anotacoes), 'Sistema - IA');
        
        // Executar update
        if (updates.length > 0) {
            const query = `UPDATE Negocios SET ${updates.join(', ')} WHERE id = ?`;
            values.push(negocioId);
            
            await dbQuery(query, values);
            console.log('✅ Negócio atualizado com sucesso!');
        }
        
        return { success: true, negocioId };
    } catch (error) {
        console.error('❌ Erro ao atualizar negócio:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Marca negócio como ganho
 * @param {Object} params - Parâmetros
 * @returns {Object} Resultado
 */
async function marcarNegocioGanho({ negocioId, valorFinal = null }) {
    console.log('\n🎉 === MARCANDO NEGÓCIO COMO GANHO ===');
    console.log('📊 Negócio ID:', negocioId, 'Valor:', valorFinal);
    
    try {
        const [negocio] = await dbQuery('SELECT * FROM Negocios WHERE id = ?', [negocioId]);
        
        if (!negocio) {
            return { success: false, error: 'Negócio não encontrado' };
        }
        
        let historico = negocio.historico ? JSON.parse(negocio.historico) : [];
        
        historico.unshift({
            title: 'Negócio ganho! 🎉',
            description: 'Negócio foi marcado como ganho pela IA',
            date: moment().format('YYYY-MM-DD HH:mm:ss'),
            feitoPor: 'Sistema - IA',
            color: 'success',
            icon: 'tabler-trophy',
            type: 'negocio-ganho'
        });
        
        const valorFinalUsar = valorFinal !== null ? valorFinal : negocio.valor;
        
        await dbQuery(`
            UPDATE Negocios 
            SET status = ?, 
                data_fechamento = ?, 
                valor = ?,
                historico = ?,
                motivoPerdido = NULL, 
                obsPerdido = NULL, 
                dataPerdido = NULL,
                updated_by = ?
            WHERE id = ?
        `, [
            'Ganho',
            moment().format('YYYY-MM-DD'),
            valorFinalUsar,
            JSON.stringify(historico),
            'Sistema - IA',
            negocioId
        ]);
        
        console.log('✅ Negócio marcado como ganho!');
        return { success: true, negocioId };
    } catch (error) {
        console.error('❌ Erro ao marcar como ganho:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Marca negócio como perdido
 * @param {Object} params - Parâmetros
 * @returns {Object} Resultado
 */
async function marcarNegocioPerdido({ negocioId, motivo = 'Não especificado', observacao = null }) {
    console.log('\n😞 === MARCANDO NEGÓCIO COMO PERDIDO ===');
    console.log('📊 Negócio ID:', negocioId, 'Motivo:', motivo);
    
    try {
        const [negocio] = await dbQuery('SELECT * FROM Negocios WHERE id = ?', [negocioId]);
        
        if (!negocio) {
            return { success: false, error: 'Negócio não encontrado' };
        }
        
        let historico = negocio.historico ? JSON.parse(negocio.historico) : [];
        
        historico.unshift({
            title: 'Negócio perdido',
            description: `Motivo: ${motivo}${observacao ? '\n' + observacao : ''}`,
            date: moment().format('YYYY-MM-DD HH:mm:ss'),
            feitoPor: 'Sistema - IA',
            color: 'error',
            icon: 'tabler-x',
            type: 'negocio-perdido'
        });
        
        await dbQuery(`
            UPDATE Negocios 
            SET status = ?, 
                historico = ?,
                motivoPerdido = ?,
                obsPerdido = ?,
                dataPerdido = ?,
                data_fechamento = NULL,
                updated_by = ?
            WHERE id = ?
        `, [
            'Perdido',
            JSON.stringify(historico),
            motivo,
            observacao,
            moment().format('YYYY-MM-DD HH:mm:ss'),
            'Sistema - IA',
            negocioId
        ]);
        
        console.log('✅ Negócio marcado como perdido');
        return { success: true, negocioId };
    } catch (error) {
        console.error('❌ Erro ao marcar como perdido:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    getFunisCompletos,
    getPipelineResumoParaIA,
    getNegociosCliente,
    getNegociosClienteResumo,
    criarNegocioAutomatico,
    atualizarNegocio,
    marcarNegocioGanho,
    marcarNegocioPerdido
};
