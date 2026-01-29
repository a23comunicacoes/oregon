import { ref } from 'vue';

// Cache das variáveis para evitar múltiplas chamadas à API
const variaveisCache = ref(null);

// Função para carregar variáveis do crmUtils via API
export const loadVariaveisFromAPI = async () => {
  if (variaveisCache.value) {
    return variaveisCache.value;
  }

  try {
    // Buscar variáveis do crmUtils via API
    const response = await $api('/crm/variaveis');

    if (!response) {
      throw new Error('Erro ao carregar variáveis');
    }

    console.log('Variáveis:', response);
    
    const data = response;
    
    // Adicionar variáveis do sistema
    const variaveisSistema = [
      { 
        title: "Data Atual", 
        value: "data_atual", 
        type: 'sistema', 
        desc: "Data atual do sistema" 
      },
      { 
        title: "Hora Atual", 
        value: "hora_atual", 
        type: 'sistema', 
        desc: "Hora atual do sistema" 
      },
      { 
        title: "Dia da Semana", 
        value: "dia_semana", 
        type: 'sistema', 
        desc: "Dia da semana atual" 
      },
      { 
        title: "Mês Atual", 
        value: "mes_atual", 
        type: 'sistema', 
        desc: "Mês atual" 
      }
    ];

    variaveisCache.value = [...data, ...variaveisSistema];
    return variaveisCache.value;
  } catch (error) {
    console.error('Erro ao carregar variáveis:', error, error.response);
    // Retornar variáveis padrão em caso de erro
    return getVariaveisPadrao();
  }
};

// Variáveis padrão como fallback
const getVariaveisPadrao = () => [
  // Variáveis do Cliente
  { 
    title: "Nome do Cliente", 
    value: "cliente_nome", 
    type: 'cliente', 
    desc: "Nome do cliente (primeira palavra do nome completo)" 
  },
  { 
    title: "Sobrenome do Cliente", 
    value: "cliente_sobrenome", 
    type: 'cliente', 
    desc: "Sobrenome do cliente (resto do nome)" 
  },
  { 
    title: "Nome Completo do Cliente", 
    value: "cliente_nomecompleto", 
    type: 'cliente', 
    desc: "Nome completo do cliente" 
  },
  { 
    title: "Email do Cliente", 
    value: "cliente_email", 
    type: 'cliente', 
    desc: "Email do cliente" 
  },
  { 
    title: "Celular do Cliente", 
    value: "cliente_celular", 
    type: 'cliente', 
    desc: "Número de celular do cliente" 
  },
  { 
    title: "Cidade do Cliente", 
    value: "cliente_cidade", 
    type: 'cliente', 
    desc: "Cidade do cliente (primeiro endereço)" 
  },
  { 
    title: "Estado do Cliente", 
    value: "cliente_estado", 
    type: 'cliente', 
    desc: "Estado do cliente (primeiro endereço)" 
  },
  { 
    title: "Bairro do Cliente", 
    value: "cliente_bairro", 
    type: 'cliente', 
    desc: "Bairro do cliente (primeiro endereço)" 
  },
  { 
    title: "Gênero do Cliente", 
    value: "cliente_genero", 
    type: 'cliente', 
    desc: "Gênero do cliente" 
  },
  { 
    title: "Valor Total Ganhos", 
    value: "cliente_valor_gasto", 
    type: 'cliente', 
    desc: "Valor total ganho do cliente em todos os agendamentos" 
  },
  { 
    title: "Quantidade de Agendamentos", 
    value: "cliente_qtd_agendamentos", 
    type: 'cliente', 
    desc: "Número total de agendamentos do cliente" 
  },
  { 
    title: "Data de Cadastro", 
    value: "cliente_data_cadastro", 
    type: 'cliente', 
    desc: "Data de cadastro do cliente" 
  },

  // Variáveis do Agendamento (quando aplicável)
  { 
    title: "Data do Agendamento", 
    value: "agendamento_data", 
    type: 'agendamento', 
    desc: "Data do agendamento" 
  },
  { 
    title: "Hora do Agendamento", 
    value: "agendamento_hora", 
    type: 'agendamento', 
    desc: "Hora do agendamento" 
  },
  { 
    title: "Data Completa do Agendamento", 
    value: "agendamento_datacompleta", 
    type: 'agendamento', 
    desc: "Data e hora do agendamento" 
  },
  { 
    title: "Número do Agendamento", 
    value: "agendamento_numero", 
    type: 'agendamento', 
    desc: "ID do agendamento" 
  },
  { 
    title: "Valor do Agendamento", 
    value: "agendamento_valor", 
    type: 'agendamento', 
    desc: "Valor do agendamento" 
  },
  { 
    title: "Profissional do Agendamento", 
    value: "agendamento_profissional", 
    type: 'agendamento', 
    desc: "Nome do profissional responsável" 
  },
  { 
    title: "Status do Agendamento", 
    value: "agendamento_status", 
    type: 'agendamento', 
    desc: "Status atual do agendamento" 
  },
  { 
    title: "Serviços do Agendamento", 
    value: "agendamento_servicos", 
    type: 'agendamento', 
    desc: "Serviços incluídos no agendamento" 
  },
  { 
    title: "Observações do Agendamento", 
    value: "agendamento_observacoes", 
    type: 'agendamento', 
    desc: "Observações do agendamento" 
  },

  // Variáveis do Sistema
  { 
    title: "Data Atual", 
    value: "data_atual", 
    type: 'sistema', 
    desc: "Data atual do sistema" 
  },
  { 
    title: "Hora Atual", 
    value: "hora_atual", 
    type: 'sistema', 
    desc: "Hora atual do sistema" 
  },
  { 
    title: "Dia da Semana", 
    value: "dia_semana", 
    type: 'sistema', 
    desc: "Dia da semana atual" 
  },
  { 
    title: "Mês Atual", 
    value: "mes_atual", 
    type: 'sistema', 
    desc: "Mês atual" 
  }
];

// Exportar função para obter variáveis (assíncrona)
export const getVariaveisItens = async () => {
  return await loadVariaveisFromAPI();
};

// Exportar variáveis padrão para compatibilidade
export const variaveisItens = getVariaveisPadrao();

export const getVariableByValue = (value) => {
  return variaveisItens.find(v => v.value === value);
};

export const getVariablesByType = (type) => {
  return variaveisItens.filter(v => v.type === type);
};
