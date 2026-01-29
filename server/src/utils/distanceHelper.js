const axios = require('axios');

/**
 * Helper para cálculo de distâncias usando Haversine
 * Converte endereços em coordenadas (geocoding) e calcula distância real
 */

/**
 * Fórmula de Haversine para calcular distância entre duas coordenadas
 * @param {Number} lat1 - Latitude do ponto 1
 * @param {Number} lon1 - Longitude do ponto 1
 * @param {Number} lat2 - Latitude do ponto 2
 * @param {Number} lon2 - Longitude do ponto 2
 * @returns {Number} Distância em quilômetros
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raio da Terra em km
    
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c; // Distância em km
}

/**
 * Converte graus para radianos
 * @param {Number} degrees - Ângulo em graus
 * @returns {Number} Ângulo em radianos
 */
function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

/**
 * Geocodifica um endereço usando a API do Google Maps
 * @param {String} endereco - Endereço para geocodificar
 * @param {String} apiKey - Chave da API do Google Maps (opcional)
 * @returns {Object} {lat, lng, formatted_address} ou null se falhar
 */
async function geocodeAddress(endereco, apiKey = null) {
    try {
        console.log(`📍 Geocodificando endereço: "${endereco}"`);
        
        // Se não houver API key, tentar com Nominatim (OpenStreetMap - grátis)
        if (!apiKey || apiKey === '' || apiKey === 'null') {
            console.log('⚠️ Sem API Key do Google - usando Nominatim (OpenStreetMap)');
            return await geocodeWithNominatim(endereco);
        }
        
        // Usar Google Maps Geocoding API
        const url = 'https://maps.googleapis.com/maps/api/geocode/json';
        const response = await axios.get(url, {
            params: {
                address: endereco,
                key: apiKey,
                language: 'pt-BR',
                region: 'br'
            },
            timeout: 10000
        });
        
        if (response.data.status === 'OK' && response.data.results.length > 0) {
            const result = response.data.results[0];
            const location = result.geometry.location;
            
            console.log(`✅ Geocodificação bem-sucedida (Google): ${location.lat}, ${location.lng}`);
            console.log(`   Endereço formatado: ${result.formatted_address}`);
            
            return {
                lat: location.lat,
                lng: location.lng,
                formatted_address: result.formatted_address,
                source: 'google'
            };
        } else if (response.data.status === 'ZERO_RESULTS') {
            console.log('⚠️ Endereço não encontrado no Google Maps - tentando Nominatim');
            return await geocodeWithNominatim(endereco);
        } else {
            console.error(`❌ Erro na geocodificação (Google): ${response.data.status}`);
            if (response.data.error_message) {
                console.error(`   Mensagem: ${response.data.error_message}`);
            }
            // Fallback para Nominatim
            console.log('⚠️ Tentando Nominatim como fallback...');
            return await geocodeWithNominatim(endereco);
        }
    } catch (error) {
        console.error('❌ Erro ao geocodificar com Google:', error.message);
        // Fallback para Nominatim
        console.log('⚠️ Tentando Nominatim como fallback...');
        return await geocodeWithNominatim(endereco);
    }
}

/**
 * Geocodifica um endereço usando Nominatim (OpenStreetMap - grátis)
 * @param {String} endereco - Endereço para geocodificar
 * @returns {Object} {lat, lng, formatted_address} ou null se falhar
 */
async function geocodeWithNominatim(endereco) {
    try {
        const url = 'https://nominatim.openstreetmap.org/search';
        const response = await axios.get(url, {
            params: {
                q: endereco,
                format: 'json',
                addressdetails: 1,
                limit: 1,
                countrycodes: 'br'
            },
            headers: {
                'User-Agent': 'OregonServicos-CRM/1.0'
            },
            timeout: 10000
        });
        
        if (response.data && response.data.length > 0) {
            const result = response.data[0];
            
            console.log(`✅ Geocodificação bem-sucedida (Nominatim): ${result.lat}, ${result.lon}`);
            console.log(`   Endereço: ${result.display_name}`);
            
            return {
                lat: parseFloat(result.lat),
                lng: parseFloat(result.lon),
                formatted_address: result.display_name,
                source: 'nominatim'
            };
        } else {
            console.error('❌ Endereço não encontrado no Nominatim');
            return null;
        }
    } catch (error) {
        console.error('❌ Erro ao geocodificar com Nominatim:', error.message);
        return null;
    }
}

/**
 * Calcula a distância entre dois endereços usando Haversine
 * @param {String} endereco1 - Primeiro endereço
 * @param {String} endereco2 - Segundo endereço
 * @param {String} googleApiKey - Chave da API do Google Maps (opcional)
 * @returns {Object} {distancia, endereco1_coords, endereco2_coords, endereco1_formatted, endereco2_formatted}
 */
async function calculateDistance(endereco1, endereco2, googleApiKey = null) {
    try {
        console.log('\n📏 === CALCULANDO DISTÂNCIA ===');
        console.log(`   Origem: ${endereco1}`);
        console.log(`   Destino: ${endereco2}`);
        
        // Geocodificar ambos os endereços
        const coords1 = await geocodeAddress(endereco1, googleApiKey);
        const coords2 = await geocodeAddress(endereco2, googleApiKey);
        
        if (!coords1 || !coords2) {
            console.error('❌ Não foi possível geocodificar um ou ambos os endereços');
            return {
                sucesso: false,
                erro: 'Não foi possível localizar um ou ambos os endereços',
                endereco1_formatted: coords1?.formatted_address || endereco1,
                endereco2_formatted: coords2?.formatted_address || endereco2
            };
        }
        
        // Calcular distância com Haversine
        const distancia = calculateHaversineDistance(
            coords1.lat,
            coords1.lng,
            coords2.lat,
            coords2.lng
        );
        
        console.log(`✅ Distância calculada: ${distancia.toFixed(2)} km`);
        console.log(`   Método: Haversine (${coords1.source} + ${coords2.source})`);
        console.log('===========================\n');
        
        return {
            sucesso: true,
            distancia: distancia,
            distanciaFormatada: `${distancia.toFixed(2)} km`,
            endereco1_coords: {
                lat: coords1.lat,
                lng: coords1.lng
            },
            endereco2_coords: {
                lat: coords2.lat,
                lng: coords2.lng
            },
            endereco1_formatted: coords1.formatted_address,
            endereco2_formatted: coords2.formatted_address,
            fonte: `${coords1.source} + ${coords2.source}`
        };
    } catch (error) {
        console.error('❌ Erro ao calcular distância:', error.message);
        return {
            sucesso: false,
            erro: error.message
        };
    }
}

/**
 * Verifica se dois endereços estão no mesmo bairro/região
 * @param {String} endereco1 - Primeiro endereço
 * @param {String} endereco2 - Segundo endereço
 * @returns {Boolean}
 */
function saoMesmoBairro(endereco1, endereco2) {
    // Normalizar endereços para comparação
    const normalizar = (str) => str.toLowerCase().trim()
        .replace(/[áàãâä]/g, 'a')
        .replace(/[éèêë]/g, 'e')
        .replace(/[íìîï]/g, 'i')
        .replace(/[óòõôö]/g, 'o')
        .replace(/[úùûü]/g, 'u')
        .replace(/ç/g, 'c');
    
    const end1 = normalizar(endereco1);
    const end2 = normalizar(endereco2);
    
    // Lista de bairros conhecidos próximos
    const bairrosProximos = [
        ['serraria', 'barreiros'],
        ['centro', 'praia comprida'],
        ['kobrasol', 'campinas'],
        // Adicionar mais conforme necessário
    ];
    
    // Verificar se são o mesmo bairro
    for (const grupo of bairrosProximos) {
        const tem1 = grupo.some(b => end1.includes(b));
        const tem2 = grupo.some(b => end2.includes(b));
        
        if (tem1 && tem2) {
            console.log(`✅ Bairros próximos detectados: ${grupo.join(', ')}`);
            return true;
        }
    }
    
    return false;
}

/**
 * Formata informação de distância para a IA
 * @param {Object} resultado - Resultado do cálculo de distância
 * @returns {String} Texto formatado para a IA
 */
function formatDistanceForAI(resultado) {
    if (!resultado.sucesso) {
        return `Não foi possível calcular a distância: ${resultado.erro}`;
    }
    
    const { distancia, distanciaFormatada, endereco1_formatted, endereco2_formatted } = resultado;
    
    let texto = `A distância entre os endereços é de aproximadamente ${distanciaFormatada}.\n\n`;
    texto += `📍 Origem: ${endereco1_formatted}\n`;
    texto += `📍 Destino: ${endereco2_formatted}\n\n`;
    
    if (distancia < 1) {
        texto += `✅ Os endereços estão muito próximos (menos de 1 km).`;
    } else if (distancia < 5) {
        texto += `✅ Os endereços estão na mesma região (menos de 5 km).`;
    } else if (distancia < 10) {
        texto += `⚠️ Os endereços estão a uma distância moderada (${distanciaFormatada}).`;
    } else {
        texto += `❌ Os endereços estão distantes (${distanciaFormatada}).`;
    }
    
    return texto;
}

module.exports = {
    calculateHaversineDistance,
    geocodeAddress,
    geocodeWithNominatim,
    calculateDistance,
    saoMesmoBairro,
    formatDistanceForAI
};

