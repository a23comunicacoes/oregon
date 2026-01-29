/**
 * 📝 LOG HELPER - Sistema de Logging Otimizado para Fluxos
 * 
 * Funções para logging estruturado e debugging de fluxos
 */

const moment = require('moment');

/**
 * Nível de logging
 * DEBUG: Detalhes completos (desenvolvimento)
 * INFO: Informações importantes (produção)
 * WARN: Avisos
 * ERROR: Erros
 */
const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

// Definir nível atual (pode ser configurado por env)
const CURRENT_LOG_LEVEL = process.env.FLOW_LOG_LEVEL 
    ? LOG_LEVELS[process.env.FLOW_LOG_LEVEL.toUpperCase()] 
    : LOG_LEVELS.INFO;

/**
 * Log estruturado
 */
function log(level, message, data = {}) {
    if (LOG_LEVELS[level] < CURRENT_LOG_LEVEL) return;
    
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
    const icon = {
        DEBUG: '🔍',
        INFO: 'ℹ️',
        WARN: '⚠️',
        ERROR: '❌'
    }[level];
    
    console.log(`[${timestamp}] ${icon} ${message}`);
    
    if (Object.keys(data).length > 0) {
        console.log('   Dados:', JSON.stringify(data, null, 2));
    }
}

/**
 * Logs específicos para fluxos
 */
const flowLog = {
    // Método genérico de log
    log: (level, message, data = {}) => {
        log(level, message, data);
    },
    
    start: (flowId, flowName, runId) => {
        log('INFO', `🚀 INICIANDO FLUXO`, {
            flowId,
            flowName,
            runId,
            timestamp: moment().format('YYYY-MM-DD HH:mm:ss')
        });
    },
    
    nodeExecution: (nodeId, nodeType, nodeLabel) => {
        if (CURRENT_LOG_LEVEL <= LOG_LEVELS.DEBUG) {
            log('DEBUG', `📍 Executando Nó: ${nodeLabel || nodeType}`, {
                nodeId,
                nodeType
            });
        }
    },
    
    actionSuccess: (action, result) => {
        log('INFO', `✅ Ação "${action}" executada com sucesso`, { result });
    },
    
    actionError: (action, error) => {
        log('ERROR', `❌ Erro na ação "${action}"`, {
            error: error.message,
            stack: error.stack
        });
    },
    
    conditionEval: (conditions, result) => {
        if (CURRENT_LOG_LEVEL <= LOG_LEVELS.DEBUG) {
            log('DEBUG', `🔀 Avaliação de condições: ${result ? 'TRUE' : 'FALSE'}`, {
                conditions
            });
        }
    },
    
    waitingResponse: (runId, nodeType) => {
        log('INFO', `⏸️ Aguardando resposta do usuário`, {
            runId,
            nodeType
        });
    },
    
    flowComplete: (flowId, runId, duration) => {
        log('INFO', `✅ FLUXO FINALIZADO`, {
            flowId,
            runId,
            duration: `${duration}ms`
        });
    },
    
    flowInterrupted: (flowId, runId, reason) => {
        log('WARN', `🔄 FLUXO INTERROMPIDO`, {
            flowId,
            runId,
            reason
        });
    },
    
    flowError: (flowId, runId, error) => {
        log('ERROR', `❌ ERRO NO FLUXO`, {
            flowId,
            runId,
            error: error.message,
            stack: error.stack
        });
    },
    
    trigger: (triggerType, flowId) => {
        log('INFO', `🎯 Trigger acionado: ${triggerType}`, { flowId });
    },
    
    database: (operation, table, result) => {
        if (CURRENT_LOG_LEVEL <= LOG_LEVELS.DEBUG) {
            log('DEBUG', `💾 Operação de DB: ${operation} em ${table}`, { result });
        }
    }
};

module.exports = {
    log,
    flowLog,
    LOG_LEVELS
};

