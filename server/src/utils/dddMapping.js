// Mapeamento de DDD para Estado e Cidade principal
const dddMapping = {
    // São Paulo
    11: { estado: 'SP', cidade: 'São Paulo' },
    12: { estado: 'SP', cidade: 'São José dos Campos' },
    13: { estado: 'SP', cidade: 'Santos' },
    14: { estado: 'SP', cidade: 'Bauru' },
    15: { estado: 'SP', cidade: 'Sorocaba' },
    16: { estado: 'SP', cidade: 'Ribeirão Preto' },
    17: { estado: 'SP', cidade: 'São José do Rio Preto' },
    18: { estado: 'SP', cidade: 'Presidente Prudente' },
    19: { estado: 'SP', cidade: 'Campinas' },
    
    // Rio de Janeiro
    21: { estado: 'RJ', cidade: 'Rio de Janeiro' },
    22: { estado: 'RJ', cidade: 'Campos dos Goytacazes' },
    24: { estado: 'RJ', cidade: 'Volta Redonda' },
    
    // Espírito Santo
    27: { estado: 'ES', cidade: 'Vitória' },
    28: { estado: 'ES', cidade: 'Cachoeiro de Itapemirim' },
    
    // Minas Gerais
    31: { estado: 'MG', cidade: 'Belo Horizonte' },
    32: { estado: 'MG', cidade: 'Juiz de Fora' },
    33: { estado: 'MG', cidade: 'Governador Valadares' },
    34: { estado: 'MG', cidade: 'Uberlândia' },
    35: { estado: 'MG', cidade: 'Poços de Caldas' },
    37: { estado: 'MG', cidade: 'Divinópolis' },
    38: { estado: 'MG', cidade: 'Montes Claros' },
    
    // Paraná
    41: { estado: 'PR', cidade: 'Curitiba' },
    42: { estado: 'PR', cidade: 'Ponta Grossa' },
    43: { estado: 'PR', cidade: 'Londrina' },
    44: { estado: 'PR', cidade: 'Maringá' },
    45: { estado: 'PR', cidade: 'Foz do Iguaçu' },
    46: { estado: 'PR', cidade: 'Francisco Beltrão' },
    
    // Santa Catarina
    47: { estado: 'SC', cidade: 'Joinville' },
    48: { estado: 'SC', cidade: 'Florianópolis' },
    49: { estado: 'SC', cidade: 'Chapecó' },
    
    // Rio Grande do Sul
    51: { estado: 'RS', cidade: 'Porto Alegre' },
    53: { estado: 'RS', cidade: 'Pelotas' },
    54: { estado: 'RS', cidade: 'Caxias do Sul' },
    55: { estado: 'RS', cidade: 'Santa Maria' },
    
    // Distrito Federal
    61: { estado: 'DF', cidade: 'Brasília' },
    
    // Goiás
    62: { estado: 'GO', cidade: 'Goiânia' },
    64: { estado: 'GO', cidade: 'Rio Verde' },
    
    // Tocantins
    63: { estado: 'TO', cidade: 'Palmas' },
    
    // Mato Grosso
    65: { estado: 'MT', cidade: 'Cuiabá' },
    66: { estado: 'MT', cidade: 'Rondonópolis' },
    
    // Mato Grosso do Sul
    67: { estado: 'MS', cidade: 'Campo Grande' },
    
    // Acre
    68: { estado: 'AC', cidade: 'Rio Branco' },
    
    // Rondônia
    69: { estado: 'RO', cidade: 'Porto Velho' },
    
    // Bahia
    71: { estado: 'BA', cidade: 'Salvador' },
    73: { estado: 'BA', cidade: 'Ilhéus' },
    74: { estado: 'BA', cidade: 'Juazeiro' },
    75: { estado: 'BA', cidade: 'Feira de Santana' },
    77: { estado: 'BA', cidade: 'Barreiras' },
    
    // Sergipe
    79: { estado: 'SE', cidade: 'Aracaju' },
    
    // Pernambuco
    81: { estado: 'PE', cidade: 'Recife' },
    87: { estado: 'PE', cidade: 'Petrolina' },
    
    // Alagoas
    82: { estado: 'AL', cidade: 'Maceió' },
    
    // Paraíba
    83: { estado: 'PB', cidade: 'João Pessoa' },
    
    // Rio Grande do Norte
    84: { estado: 'RN', cidade: 'Natal' },
    
    // Ceará
    85: { estado: 'CE', cidade: 'Fortaleza' },
    88: { estado: 'CE', cidade: 'Juazeiro do Norte' },
    
    // Piauí
    86: { estado: 'PI', cidade: 'Teresina' },
    89: { estado: 'PI', cidade: 'Picos' },
    
    // Pará
    91: { estado: 'PA', cidade: 'Belém' },
    93: { estado: 'PA', cidade: 'Santarém' },
    94: { estado: 'PA', cidade: 'Marabá' },
    
    // Amazonas
    92: { estado: 'AM', cidade: 'Manaus' },
    97: { estado: 'AM', cidade: 'Tefé' },
    
    // Roraima
    95: { estado: 'RR', cidade: 'Boa Vista' },
    
    // Amapá
    96: { estado: 'AP', cidade: 'Macapá' },
    
    // Maranhão
    98: { estado: 'MA', cidade: 'São Luís' },
    99: { estado: 'MA', cidade: 'Imperatriz' }
};

/**
 * Extrai o DDD de um número de telefone
 * @param {string} phone - Número de telefone
 * @returns {string|null} - DDD ou null se não encontrado
 */
function extractDDD(phone) {
    if (!phone) return null;
    
    // Remove caracteres não numéricos
    const cleaned = phone.replace(/\D/g, '');
    
    // Remove código do país (55) se existir
    let phoneNumber = cleaned;
    if (phoneNumber.startsWith('55')) {
        phoneNumber = phoneNumber.substring(2);
    }
    
    // Extrai os primeiros 2 dígitos (DDD)
    if (phoneNumber.length >= 10) {
        return phoneNumber.substring(0, 2);
    }
    
    return null;
}

/**
 * Obtém informações de estado e cidade baseado no DDD
 * @param {string} phone - Número de telefone
 * @returns {Object|null} - {estado, cidade} ou null se não encontrado
 */
function getLocationFromPhone(phone) {
    const ddd = extractDDD(phone);
    
    if (!ddd) return null;
    
    const dddNumber = parseInt(ddd, 10);
    
    return dddMapping[dddNumber] || null;
}

module.exports = {
    dddMapping,
    extractDDD,
    getLocationFromPhone
};

