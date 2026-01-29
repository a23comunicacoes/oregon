const express = require('express');
const router = express.Router();
const dbQuery = require('../utils/dbHelper');
const { getFlowById, startFlow, advance } = require('../flows/core/flowEngine');

// CRUD básico
router.get('/', async (req, res) => {
    try {
        let { q, page = 1, itemsPerPage = 10, sortBy, orderBy } = req.query;
        
        let whereClause = '';
        let params = [];
        
        if (q) {
            whereClause = 'WHERE name LIKE ?';
            params.push(`%${q}%`);
        }
        
        page = parseInt(page) || 1;
        itemsPerPage = parseInt(itemsPerPage) || 10;
        
        const offset = (page - 1) * itemsPerPage;
        const limit = itemsPerPage === -1 ? 1000 : itemsPerPage;
        
        // Contar total
        const countQuery = `SELECT COUNT(*) as total FROM Flows ${whereClause}`;
        const countResult = await dbQuery(countQuery, params);
        const totalFlows = countResult[0].total;
        
        // Buscar fluxos
        let orderClause = '';
        if (sortBy && orderBy) {
            orderClause = `ORDER BY ${sortBy} ${orderBy.toUpperCase()}`;
        } else {
            orderClause = 'ORDER BY created_at DESC';
        }
        
        const flowsQuery = `
            SELECT * FROM Flows 
            ${whereClause} 
            ${orderClause} 
            LIMIT ? OFFSET ?
        `;
        
        const flows = await dbQuery(flowsQuery, [...params, limit, offset]);
        
        res.json({
            flows,
            totalFlows,
            page: parseInt(page),
            itemsPerPage: parseInt(itemsPerPage)
        });
    } catch (err) { res.status(500).json({ message: 'Erro', err: err.message }); }
});

router.get('/:id', async (req, res) => {
    try {
        const data = await getFlowById(parseInt(req.params.id, 10));
        if (!data) return res.status(404).json({ message: 'Não encontrado' });
        res.json(data);
    } catch (err) { res.status(500).json({ message: 'Ocorreu um erro ao buscar o fluxo', err: err.message }); }
});

router.post('/', async (req, res) => {
    try {
        const { 
            name, 
            description, 
            status = 'ativo', 
            trigger_type = null, 
            webhook_key = null, 
            trigger_conditions = null,
            priority = 50,
            interruptible = true,
            global_keywords = null,
            nodes = [], 
            edges = [] 
        } = req.body;
        
        const triggerConditionsJson = trigger_conditions && Array.isArray(trigger_conditions) && trigger_conditions.length > 0 
            ? JSON.stringify(trigger_conditions) 
            : null;
        
        const globalKeywordsJson = global_keywords && Array.isArray(global_keywords) && global_keywords.length > 0
            ? JSON.stringify(global_keywords)
            : null;
        
        const inserted = await dbQuery(
            'INSERT INTO Flows (name, description, status, trigger_type, webhook_key, trigger_conditions, priority, interruptible, global_keywords) VALUES (?,?,?,?,?,?,?,?,?)',
            [name, description, status, trigger_type, webhook_key, triggerConditionsJson, priority, interruptible ? 1 : 0, globalKeywordsJson]
        );
        const flowId = inserted.insertId || inserted;
        for (const n of nodes) {
            await dbQuery('INSERT INTO FlowNodes (flow_id, type, label, config, position_x, position_y) VALUES (?,?,?,?,?,?)', [flowId, n.type, n.label || null, JSON.stringify(n.config || {}), n.position_x || 100, n.position_y || 100]);
        }
        const allNodes = await dbQuery('SELECT * FROM FlowNodes WHERE flow_id = ?', [flowId]);
        const findNodeId = (idx) => allNodes[idx]?.id;
        for (const e of edges) {
            const sourceId = e.source_node_id || findNodeId(e.sourceIndex || 0);
            const targetId = e.target_node_id || findNodeId(e.targetIndex || 0);
            
            // Se os IDs ainda são strings, tentar encontrar pelos índices
            const finalSourceId = typeof sourceId === 'string' ? findNodeId(e.sourceIndex || 0) : sourceId;
            const finalTargetId = typeof targetId === 'string' ? findNodeId(e.targetIndex || 0) : targetId;
            
            if (finalSourceId && finalTargetId) {
                await dbQuery('INSERT INTO FlowEdges (flow_id, source_node_id, target_node_id, label, condition_json) VALUES (?,?,?,?,?)', [flowId, finalSourceId, finalTargetId, e.label || null, JSON.stringify(e.condition || null)]);
            }
        }
        res.json({ id: flowId });
    } catch (err) { res.status(500).json({ message: 'Erro', err: err.message }); }
});

router.put('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { 
            name, 
            description, 
            status = 'ativo', 
            trigger_type = null, 
            webhook_key = null, 
            trigger_conditions = null,
            priority = 50,
            interruptible = true,
            global_keywords = null,
            nodes = [], 
            edges = [] 
        } = req.body;
        
        // Atualizar informações do fluxo
        const triggerConditionsJson = trigger_conditions && Array.isArray(trigger_conditions) && trigger_conditions.length > 0 
            ? JSON.stringify(trigger_conditions) 
            : null;
        
        const globalKeywordsJson = global_keywords && Array.isArray(global_keywords) && global_keywords.length > 0
            ? JSON.stringify(global_keywords)
            : null;
        
        await dbQuery(
            'UPDATE Flows SET name=?, description=?, status=?, trigger_type=?, webhook_key=?, trigger_conditions=?, priority=?, interruptible=?, global_keywords=?, updated_at=NOW() WHERE id=?',
            [name, description, status, trigger_type, webhook_key, triggerConditionsJson, priority, interruptible ? 1 : 0, globalKeywordsJson, id]
        );
        
        // Deletar nós e conexões antigas
        await dbQuery('DELETE FROM FlowEdges WHERE flow_id=?', [id]);
        await dbQuery('DELETE FROM FlowNodes WHERE flow_id=?', [id]);
        
        // Criar um mapa para associar índices/labels antigos com novos IDs
        const nodeIdMap = {};
        
        // Inserir novos nós e mapear seus IDs
        for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            const result = await dbQuery('INSERT INTO FlowNodes (flow_id, type, label, config, position_x, position_y) VALUES (?,?,?,?,?,?)', 
                [id, n.type, n.label || null, JSON.stringify(n.config || {}), n.position_x || 100, n.position_y || 100]);
            
            const newNodeId = result.insertId;
            
            // Mapear o índice do array
            nodeIdMap[i] = newNodeId;
            
            // Mapear o ID antigo (se existir)
            if (n.id) {
                nodeIdMap[`id_${n.id}`] = newNodeId;
            }
            
            // Mapear o label (se existir)
            if (n.label) {
                nodeIdMap[`label_${n.label}`] = newNodeId;
            }
        }
        
        // Buscar todos os nós recém-criados para fallback
        const allNodes = await dbQuery('SELECT * FROM FlowNodes WHERE flow_id = ? ORDER BY id', [id]);
        
        // Inserir conexões usando o mapeamento
        for (const e of edges) {
            let sourceId, targetId;
            
            // Tentar descobrir o source_node_id
            if (e.sourceIndex !== undefined && e.sourceIndex !== null) {
                // Usar o índice do array
                sourceId = nodeIdMap[e.sourceIndex];
            } else if (e.source_node_id) {
                // Tentar usar o ID antigo mapeado
                sourceId = nodeIdMap[`id_${e.source_node_id}`];
            } else if (e.source_label) {
                // Tentar usar o label
                sourceId = nodeIdMap[`label_${e.source_label}`];
            }
            
            // Tentar descobrir o target_node_id
            if (e.targetIndex !== undefined && e.targetIndex !== null) {
                // Usar o índice do array
                targetId = nodeIdMap[e.targetIndex];
            } else if (e.target_node_id) {
                // Tentar usar o ID antigo mapeado
                targetId = nodeIdMap[`id_${e.target_node_id}`];
            } else if (e.target_label) {
                // Tentar usar o label
                targetId = nodeIdMap[`label_${e.target_label}`];
            }
            
            // Fallback: buscar por label nos nós recém-criados
            if (!sourceId && e.source_label) {
                sourceId = allNodes.find(n => n.label === e.source_label)?.id;
            }
            if (!targetId && e.target_label) {
                targetId = allNodes.find(n => n.label === e.target_label)?.id;
            }
            
            // Se ainda não encontrou, usar os primeiros nós como fallback
            if (!sourceId) sourceId = allNodes[0]?.id;
            if (!targetId) targetId = allNodes[0]?.id;
            
            // Inserir a conexão
            if (sourceId && targetId) {
                await dbQuery('INSERT INTO FlowEdges (flow_id, source_node_id, target_node_id, label, condition_json) VALUES (?,?,?,?,?)', 
                    [id, sourceId, targetId, e.label || null, JSON.stringify(e.condition || null)]);
            }
        }
        
        res.json({ ok: true });
    } catch (err) { 
        console.error('Erro ao atualizar fluxo:', err);
        res.status(500).json({ message: 'Erro', err: err.message }); 
    }
});

// Duplicar fluxo
router.post('/:id/duplicate', async (req, res) => {
    try {
        const flowId = parseInt(req.params.id, 10);
        
        // Buscar fluxo original
        const originalFlow = await dbQuery('SELECT * FROM Flows WHERE id = ?', [flowId]);
        
        if (!originalFlow || originalFlow.length === 0) {
            return res.status(404).json({ error: 'Fluxo não encontrado' });
        }
        
        const flow = originalFlow[0];
        
        // Criar novo fluxo (cópia)
        const newFlowResult = await dbQuery(
            `INSERT INTO Flows (name, description, status, trigger_type, webhook_key, trigger_conditions, created_at, updated_at) 
             VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [
                `${flow.name} (Cópia)`,
                flow.description,
                'inativo', // Criar como inativo por segurança
                flow.trigger_type,
                flow.webhook_key ? `${flow.webhook_key}_copy_${Date.now()}` : null,
                flow.trigger_conditions
            ]
        );
        
        const newFlowId = newFlowResult.insertId;
        
        // Buscar nós do fluxo original
        const originalNodes = await dbQuery('SELECT * FROM FlowNodes WHERE flow_id = ?', [flowId]);
        
        // Mapa para relacionar IDs antigos com novos
        const nodeIdMap = {};
        
        // Copiar nós
        for (const node of originalNodes) {
            const newNodeResult = await dbQuery(
                `INSERT INTO FlowNodes (flow_id, type, label, config, position_x, position_y, created_at) 
                 VALUES (?, ?, ?, ?, ?, ?, NOW())`,
                [newFlowId, node.type, node.label, node.config, node.position_x, node.position_y]
            );
            
            nodeIdMap[node.id] = newNodeResult.insertId;
        }
        
        // Buscar edges do fluxo original
        const originalEdges = await dbQuery('SELECT * FROM FlowEdges WHERE flow_id = ?', [flowId]);
        
        // Copiar edges com os novos IDs dos nós
        for (const edge of originalEdges) {
            const newSourceId = nodeIdMap[edge.source_node_id];
            const newTargetId = nodeIdMap[edge.target_node_id];
            
            if (newSourceId && newTargetId) {
                await dbQuery(
                    `INSERT INTO FlowEdges (flow_id, source_node_id, target_node_id, label, condition_json, created_at) 
                     VALUES (?, ?, ?, ?, ?, NOW())`,
                    [newFlowId, newSourceId, newTargetId, edge.label, edge.condition_json]
                );
            }
        }
        
        res.json({ 
            ok: true, 
            newFlowId,
            message: 'Fluxo duplicado com sucesso'
        });
        
    } catch (err) {
        console.error('Erro ao duplicar fluxo:', err);
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await dbQuery('DELETE FROM Flows WHERE id=?', [parseInt(req.params.id, 10)]);
        res.json({ ok: true });
    } catch (err) { res.status(500).json({ message: 'Erro', err: err.message }); }
});

// Toggle status do fluxo
router.put('/toggle-status/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { status } = req.body;
        
        if (!status || !['ativo', 'inativo'].includes(status)) {
            return res.status(400).json({ message: 'Status inválido' });
        }
        
        await dbQuery('UPDATE Flows SET status=?, updated_at=NOW() WHERE id=?', [status, id]);
        res.json({ ok: true, status });
    } catch (err) { res.status(500).json({ message: 'Erro', err: err.message }); }
});

// Execução manual
router.post('/:id/run', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        const { startNodeId, phone, cliente = null, agendamento = null, chatId = null, context = {} } = req.body;
        const runId = await startFlow({ flowId: id, startNodeId, phone, cliente, agendamento, chatId, context });
        res.json({ runId });
    } catch (err) { res.status(500).json({ message: 'Erro', err: err.message }); }
});

router.post('/run/:runId/advance', async (req, res) => {
    try {
        const { flowId } = req.body;
        const ok = await advance(flowId, parseInt(req.params.runId, 10));
        res.json({ ok });
    } catch (err) { res.status(500).json({ message: 'Erro', err: err.message }); }
});

// Liberar bloqueio de atendimento
router.post('/run/:runId/release-agent-block', async (req, res) => {
    try {
        const runId = parseInt(req.params.runId, 10);
        
        console.log(`🔓 Liberando bloqueio de atendimento para run ${runId}`);
        
        // Buscar a execução
        const runs = await dbQuery('SELECT * FROM FlowRuns WHERE id = ?', [runId]);
        if (!runs || runs.length === 0) {
            return res.status(404).json({ message: 'Execução não encontrada' });
        }
        
        const run = runs[0];
        const context = JSON.parse(run.context_json || '{}');
        
        // Remover tag do WhatsApp Business (se disponível)
        if (run.chat_id) {
            try {
                const zap = require('../zap');
                await zap.removeWaitingForAgentTag(run.chat_id);
                console.log('🏷️ Tag removida do WhatsApp Business');
            } catch (error) {
                console.log('ℹ️ Não foi possível remover tag (WhatsApp Business não detectado)');
            }
        }
        
        // Remover flag de bloqueio
        delete context.waiting_for_agent;
        
        // Finalizar a execução
        await dbQuery(
            'UPDATE FlowRuns SET status = ?, waiting_for_response = 0, context_json = ? WHERE id = ?',
            ['completed', JSON.stringify(context), runId]
        );
        
        console.log(`✅ Bloqueio liberado para run ${runId}`);
        console.log(`ℹ️ Cliente pode receber novos fluxos automáticos`);
        
        res.json({ 
            ok: true, 
            message: 'Bloqueio de atendimento liberado com sucesso',
            runId 
        });
    } catch (err) { 
        console.error('❌ Erro ao liberar bloqueio:', err);
        res.status(500).json({ message: 'Erro ao liberar bloqueio', err: err.message }); 
    }
});

// Webhook trigger: /flows/webhook/:key?any=query
router.all('/webhook/:key', async (req, res) => {
    try {
        const key = req.params.key;
        const flows = await dbQuery('SELECT * FROM Flows WHERE webhook_key = ? AND status = "ativo"', [key]);
        const flow = flows[0];
        if (!flow) return res.status(404).json({ message: 'Fluxo não encontrado' });

        const { nodes } = await require('../utils/flowEngine').getFlowById(flow.id);
        const startNode = nodes.find(n => n.type === 'start');
        if (!startNode) return res.status(400).json({ message: 'Nó inicial não encontrado' });

        const context = { webhook: { query: req.query, body: req.body, headers: req.headers } };
        const runId = await startFlow({ flowId: flow.id, startNodeId: startNode.id, phone: null, cliente: null, agendamento: null, chatId: null, context });
        res.json({ ok: true, runId });
    } catch (err) { res.status(500).json({ message: 'Erro', err: err.message }); }
});

module.exports = router;


