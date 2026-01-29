/**
 * Utilitário para validar configurações de IA do Gemini
 * Verifica se todas as configurações necessárias estão presentes antes de permitir uso de blocos de IA
 */

/**
 * Verifica se as configurações de IA estão completas
 * @returns {Promise<{configured: boolean, missingFields: string[], warnings: string[]}>}
 */
export async function verificarConfiguracoesIA() {
  try {
    const response = await $api('/config/g/gemini_key');
    const geminiKey = response && response.length > 0 ? response[0].value : null;
    
    if (!geminiKey || geminiKey === '' || geminiKey === 'null') {
      return {
        configured: false,
        missingFields: ['gemini_key'],
        warnings: ['API Key do Gemini não configurada']
      };
    }

    // Verificar outras configurações obrigatórias
    const configs = [
      { key: 'gemini_comportamento', name: 'Comportamento da IA' },
      { key: 'gemini_empresa', name: 'Informações da Empresa' },
      { key: 'gemini_agendamentos', name: 'Configurações de Agendamentos' }
    ];

    const missing = [];
    const warnings = [];

    for (const config of configs) {
      try {
        const resp = await $api(`/config/g/${config.key}`);
        const value = resp && resp.length > 0 ? resp[0].value : null;
        
        if (!value || value === '' || value === 'null' || value === '{}' || value === '[]') {
          missing.push(config.key);
          warnings.push(`${config.name} não configurado`);
        }
      } catch (error) {
        missing.push(config.key);
        warnings.push(`${config.name} não encontrado`);
      }
    }

    return {
      configured: missing.length === 0,
      missingFields: missing,
      warnings
    };
  } catch (error) {
    console.error('Erro ao verificar configurações de IA:', error);
    return {
      configured: false,
      missingFields: ['all'],
      warnings: ['Erro ao verificar configurações']
    };
  }
}

/**
 * Exibe mensagem de erro amigável sobre configurações faltantes
 * @param {Object} validation - Resultado da validação
 * @param {Function} setAlert - Função para exibir alerta
 */
export function mostrarErroConfiguracaoIA(validation, setAlert) {
  if (!validation.configured) {
    const mensagem = `As seguintes configurações de IA estão faltando:\n${validation.warnings.join('\n')}`;
    
    setAlert(
      `Para usar blocos de IA, você precisa configurar o Gemini em "Configurações > Gemini AI".\n\n${mensagem}`,
      'warning',
      'tabler-alert-triangle',
      8000
    );
  }
}

/**
 * Verifica se um tipo de bloco requer configurações de IA
 * @param {string} blockType - Tipo do bloco
 * @returns {boolean}
 */
export function blocoRequerIA(blockType) {
  const blocosIA = [
    'ai_decision',
    'ai_actions',
    'ai_options',
    'create_agendamento', // Apenas se useIA estiver ativo
    'update_agendamento'  // Apenas se useIA estiver ativo
  ];
  
  return blocosIA.includes(blockType);
}

/**
 * Obtém mensagem de ajuda específica para cada configuração faltante
 * @param {string} field - Campo faltante
 * @returns {string}
 */
export function getMensagemAjuda(field) {
  const mensagens = {
    gemini_key: 'Configure a API Key do Gemini em "Configurações > Gemini AI > Chaves e Modelo"',
    gemini_comportamento: 'Configure o comportamento da IA em "Configurações > Gemini AI > Comportamento"',
    gemini_empresa: 'Configure as informações da empresa em "Configurações > Gemini AI > Sobre a Empresa"',
    gemini_agendamentos: 'Configure as regras de agendamento em "Configurações > Gemini AI > Agendamentos"'
  };
  
  return mensagens[field] || `Configure ${field} em "Configurações > Gemini AI"`;
}

/**
 * Verifica se o bloco de agendamento usa IA
 * @param {Object} config - Configuração do bloco
 * @returns {boolean}
 */
export function agendamentoUsaIA(config) {
  return config && config.useIA === true;
}

