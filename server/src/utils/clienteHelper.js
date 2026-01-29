/**
 * 👤 CLIENTE HELPER - Funções para gerenciar e analisar informações de clientes
 * 
 * Fornece resumos e análises completas para a IA
 */

const moment = require('moment');
const dbQuery = require('./dbHelper');

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
 * Gera resumo compacto do cliente para a IA
 * - Foca em consumo baixo de tokens
 * - Inclui últimos 3 agendamentos, negócios ativos e notas/atividades recentes
 * @param {Number} clienteId - ID do cliente
 * @returns {Promise<Object>} Resumo compacto
 */
async function getResumoClienteParaIA(clienteId) {
    console.log(`\n📊 Gerando resumo compacto do cliente ${clienteId} para IA...`);

    try {
        const [cliente] = await dbQuery('SELECT * FROM CLIENTES WHERE cli_Id = ?', [clienteId]);
        if (!cliente) return { error: 'Cliente não encontrado' };

        const enderecos = await dbQuery(`
            SELECT * FROM ENDERECO 
            WHERE cli_id = ? 
            ORDER BY end_id DESC 
            LIMIT 3
        `, [clienteId]);

        const agendamentos = await dbQuery(`
            SELECT 
                a.age_id,
                a.age_data,
                a.age_horaInicio,
                a.age_horaFim,
                a.ast_id,
                a.age_valor,
                a.age_observacao,
                s.ast_descricao as status_nome,
                f.fullName as funcionario_nome
            FROM AGENDAMENTO a
            LEFT JOIN AGENDAMENTO_STATUS s ON a.ast_id = s.ast_id
            LEFT JOIN User f ON a.fun_id = f.id
            WHERE a.cli_id = ?
            AND a.age_ativo = 1
            ORDER BY a.age_data DESC, a.age_horaInicio DESC
            LIMIT 5
        `, [clienteId]);
        
        console.log(`   📅 Agendamentos encontrados: ${agendamentos.length}`);

        const negocios = await dbQuery(`
            SELECT n.*, e.nome as etapa_nome, e.instrucoesIa as etapa_instrucoes
            FROM Negocios n
            LEFT JOIN Funis e ON n.etapaId = e.id
            WHERE n.cli_Id = ?
            ORDER BY n.updated_at DESC, n.created_at DESC
            LIMIT 3
        `, [clienteId]);

        const anotacoes = parseJSON(cliente.cli_anotacoes) || [];
        const atividades = parseJSON(cliente.cli_atividades) || [];
        const tags = parseJSON(cliente.cli_tags) || [];

        const stats = {
            totalAgendamentos: (await dbQuery('SELECT COUNT(*) as total FROM AGENDAMENTO WHERE cli_id = ? AND age_ativo = 1', [clienteId]))[0]?.total || 0,
            totalNegocios: negocios.length
        };

        const negociosAbertos = negocios.filter(n => (n.status || '').toLowerCase() === 'pendente');
        const negocioPrincipal = negociosAbertos[0] || negocios[0] || null;

        const formatEndereco = (end) => {
            if (!end) return '';
            return [
                [end.end_logradouro, end.end_numero].filter(Boolean).join(', '),
                end.end_bairro,
                [end.end_cidade, end.end_estado].filter(Boolean).join('/')
            ].filter(Boolean).join(' - ');
        };

        const formatAgendamento = (ag) => {
            const data = ag.age_data ? moment(ag.age_data).format('DD/MM/YYYY') : '';
            const hora = ag.age_horaInicio ? ag.age_horaInicio : '';
            const status = ag.status_nome || 'Agendado';
            const profissional = ag.funcionario_nome || '';
            const valor = ag.age_valor ? `R$ ${parseFloat(ag.age_valor).toFixed(2)}` : '';
            return `${data} às ${hora}${profissional ? ` com ${profissional}` : ''} (${status})${valor ? ` - ${valor}` : ''}`;
        };

        // Instruções especiais da etapa do negócio principal
        let instrucoesEtapaAtual = null;
        if (negocioPrincipal?.etapa_instrucoes) {
            instrucoesEtapaAtual = negocioPrincipal.etapa_instrucoes;
        }

        // Observações do cliente (importante para personalização)
        const observacoesCliente = cliente.cli_obs || cliente.cli_instrucoesIa || null;

        const textoResumoCurto = [
            '## 👤 RESUMO DO CLIENTE',
            `- **Nome**: ${cliente.cli_nome || 'N/D'}`,
            cliente.cli_celular ? `- **Telefone**: ${cliente.cli_celular}` : null,
            cliente.cli_email ? `- **Email**: ${cliente.cli_email}` : null,
            cliente.cli_genero ? `- **Gênero**: ${cliente.cli_genero}` : null,
            tags.length > 0 ? `- **Tags**: ${tags.map(t => t.name || t).join(', ')}` : null,
            enderecos.length > 0 ? `- **Endereço principal**: ${formatEndereco(enderecos[0])}` : '- ⚠️ **Endereço não informado** (pergunte ao cliente!)',
            stats.totalAgendamentos > 0 ? `- **Total de agendamentos**: ${stats.totalAgendamentos} (cliente recorrente)` : '- ⭐ **Cliente novo** (sem agendamentos anteriores)',
            observacoesCliente ? `\n### ⚠️ Observações Importantes:\n${observacoesCliente}` : null
        ].filter(Boolean).join('\n');

        // Negócio ativo com instruções da etapa
        let textoNegocioPrincipal = '';
        if (negocioPrincipal) {
            textoNegocioPrincipal = `\n### 💼 NEGÓCIO ATIVO (use este ID: ${negocioPrincipal.id})\n`;
            textoNegocioPrincipal += `- **Título**: ${negocioPrincipal.title || negocioPrincipal.nome || 'Sem título'}\n`;
            textoNegocioPrincipal += `- **Etapa atual**: ${negocioPrincipal.etapa_nome || 'N/D'}\n`;
            textoNegocioPrincipal += `- **Status**: ${negocioPrincipal.status || 'Pendente'}\n`;
            textoNegocioPrincipal += `- **Valor**: R$ ${parseFloat(negocioPrincipal.valor || 0).toFixed(2)}\n`;
            
            if (instrucoesEtapaAtual) {
                textoNegocioPrincipal += `\n**📋 Instruções para esta etapa do funil:**\n${instrucoesEtapaAtual}\n`;
            }
        } else {
            textoNegocioPrincipal = '\n### 💼 NEGÓCIOS\n- Nenhum negócio ativo. **Crie um com `criarNegocio` quando o cliente demonstrar interesse!**\n';
        }

        const textoAgendamentos = agendamentos.length > 0
            ? agendamentos.map((ag, i) => `${i + 1}. ${formatAgendamento(ag)}`).join('\n')
            : 'Nenhum agendamento recente';

        const textoOutrosNegocios = negocios.filter(n => n.id !== negocioPrincipal?.id).length > 0
            ? negocios.filter(n => n.id !== negocioPrincipal?.id).map((n, i) => `${i + 1}. ${n.title || n.nome} - ${n.etapa_nome || 'Etapa N/D'} - Status: ${n.status || 'N/D'}`).join('\n')
            : '';

        const textoNotas = (anotacoes.slice(0, 3)).map((a, i) => {
            const conteudo = (a.content || a.text || '').replace(/<[^>]*>/g, '').substring(0, 100);
            return `${i + 1}. ${conteudo}${conteudo.length >= 100 ? '...' : ''}`;
        }).join('\n') || 'Sem anotações';
        
        const textoAtividades = (atividades.filter(a => !a.concluido).slice(0, 3)).map((a, i) => {
            return `${i + 1}. ${a.title || a.descricao || ''} - ${a.date ? moment(a.date).format('DD/MM') : ''} ${a.hora || ''}`;
        }).join('\n') || 'Sem atividades pendentes';

        const textoResumo =
            `${textoResumoCurto}\n` +
            `${textoNegocioPrincipal}\n` +
            `### 📅 Últimos Agendamentos\n${textoAgendamentos}\n\n` +
            (textoOutrosNegocios ? `### 📊 Outros Negócios\n${textoOutrosNegocios}\n\n` : '') +
            `### 📝 Anotações Recentes\n${textoNotas}\n\n` +
            `### ✅ Atividades Pendentes\n${textoAtividades}`;

        return {
            success: true,
            cliente,
            enderecos,
            agendamentos,
            negocios,
            anotacoes,
            atividades,
            tags,
            stats,
            negocioPrincipal,
            instrucoesEtapa: instrucoesEtapaAtual,
            observacoesCliente,
            textoResumo,
            textoResumoCurto
        };

    } catch (error) {
        console.error('❌ Erro ao gerar resumo do cliente:', error);
        return { error: error.message };
    }
}

/**
 * Gera resumo rápido do cliente (versão curta)
 * @param {Number} clienteId - ID do cliente
 * @returns {Promise<String>} Texto resumido
 */
async function getResumoRapidoCliente(clienteId) {
    const resumo = await getResumoClienteParaIA(clienteId);
    
    if (resumo.error) {
        return `Cliente ${clienteId} não encontrado`;
    }
    
    const { cliente, stats } = resumo;
    
    let texto = `**${cliente.cli_nome}**`;
    if (stats.totalAgendamentos > 0) {
        texto += ` - ${stats.totalAgendamentos} agendamento(s)`;
    }
    if (stats.negociosAtivos > 0) {
        texto += `, ${stats.negociosAtivos} negócio(s) ativo(s)`;
    }
    
    return texto;
}

/**
 * Busca cliente por telefone verificando se está bloqueado
 * @param {String} phone - Número de telefone
 * @param {Boolean} onlyBlocked - Se true, retorna apenas se estiver bloqueado
 * @returns {Promise<Object|null>} Cliente ou null
 */
async function findClienteByPhoneBlocked(phone, onlyBlocked = false) {
    if (!phone) return null;
    
    try {
        const cleanPhone = phone.replace(/\D/g, '');
        const last8 = cleanPhone.slice(-8);
        
        let query = `
            SELECT cli_Id, cli_nome, cli_celular, flows_blocked
            FROM CLIENTES
            WHERE (
                RIGHT(REGEXP_REPLACE(COALESCE(cli_celular, ''), '[^0-9]', ''), 8) = ?
                OR RIGHT(REGEXP_REPLACE(COALESCE(cli_celular2, ''), '[^0-9]', ''), 8) = ?
            )
        `;
        
        if (onlyBlocked) {
            query += ' AND flows_blocked = 1';
        }
        
        query += ' LIMIT 1';
        
        const clientes = await dbQuery(query, [last8, last8]);
        
        return clientes.length > 0 ? clientes[0] : null;
    } catch (error) {
        console.error('Erro ao buscar cliente por telefone bloqueado:', error);
        return null;
    }
}

module.exports = {
    getResumoClienteParaIA,
    getResumoRapidoCliente,
    findClienteByPhoneBlocked
};
