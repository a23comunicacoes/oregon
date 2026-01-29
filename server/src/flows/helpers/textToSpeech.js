/**
 * 🎤 TEXT-TO-SPEECH - Conversão de texto em áudio natural
 * 
 * Usa ElevenLabs API com otimizações para voz mais humanizada
 * Suporta vozes em português brasileiro com entonação natural
 */

const fs = require('fs').promises;
const path = require('path');
const dbQuery = require('../../utils/dbHelper');

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
 * Obtém configurações de áudio do banco
 */
async function getAudioConfig() {
    console.log('🔊 Buscando configurações de áudio...');
    
    const rows = await dbQuery(`SELECT * FROM Options WHERE type IN (
        "gemini_audio",
        "gemini_comportamento",
        "elevenlabs_key",
        "elevenlabs_voice_id"
    )`);
    
    const get = (t) => {
        const r = rows.find(x => x.type === t);
        return r ? r.value : null;
    };
    
    const config = {
        audio: parseJSON(get('gemini_audio')) || {},
        comportamento: parseJSON(get('gemini_comportamento')) || {},
        apiKey: get('elevenlabs_key') || process.env.ELEVENLABS_API_KEY || null,
        customVoiceId: get('elevenlabs_voice_id') || null
    };
    
    console.log('✅ Configuração de áudio carregada:');
    console.log('   ✅ Áudio ativo:', config.audio.ativo || false);
    console.log('   🔑 API Key ElevenLabs:', config.apiKey ? '✓ Configurada' : '✗ Não encontrada');
    console.log('   🎤 Voice ID customizado:', config.customVoiceId || 'Não definido');
    
    return config;
}

/**
 * 🎤 VOZES RECOMENDADAS PARA PORTUGUÊS BRASILEIRO
 * 
 * Vozes mais naturais e com melhor entonação para PT-BR:
 * - Rachel (21m00Tcm4TlvDq8ikWAM): Voz feminina profissional, clara
 * - Charlotte (XB0fDUnXU5powFXDhCwa): Voz feminina suave, amigável
 * - Sarah (EXAVITQu4vr4xnSDxMaL): Voz feminina expressiva
 * - Antoni (ErXwobaYiN019PkySvjV): Voz masculina profissional
 * - Adam (pNInz6obpgDQGcFmaJgB): Voz masculina confiante
 * - Nicole (piTKgcLEGmPE4e6mEKli): Voz feminina brasileira natural
 */
const VOICE_PRESETS = {
    // Vozes femininas otimizadas para PT-BR
    feminino: {
        id: 'KHmfNHtEjHhLK9eER20w', // Nicole - voz brasileira natural
        backup: 'XB0fDUnXU5powFXDhCwa', // Charlotte
        name: 'Nicole (PT-BR)'
    },
    // Vozes masculinas otimizadas para PT-BR
    masculino: {
        id: 'GnDrTQvdzZ7wqAKfLzVQ', // Adam
        backup: 'ErXwobaYiN019PkySvjV', // Antoni
        name: 'Adam (Profissional)'
    },
    // Voz neutra (feminina por padrão - mais amigável para atendimento)
    neutro: {
        id: 'KHmfNHtEjHhLK9eER20w', // Nicole
        backup: 'XB0fDUnXU5powFXDhCwa',
        name: 'Nicole (PT-BR)'
    }
};

/**
 * Obtém voice ID baseado no gênero configurado
 */
function getVoiceByGender(genero, customVoiceId = null) {
    // Se tem voice ID customizado, usar ele
    if (customVoiceId) {
        return customVoiceId;
    }
    
    const preset = VOICE_PRESETS[genero] || VOICE_PRESETS.neutro;
    return preset.id;
}

/**
 * 🎯 CONFIGURAÇÕES DE VOZ NATURAL
 * 
 * Para voz clara e profissional (não sussurrada):
 * - stability: 0.65-0.80 (mais alto = mais estável e clara)
 * - similarity_boost: 0.75-0.85 (preserva características da voz)
 * - style: 0.0-0.20 (valores baixos evitam distorções)
 * - use_speaker_boost: true (melhora clareza)
 * 
 * ⚠️ IMPORTANTE: Valores muito baixos de stability causam voz sussurrada!
 */
const NATURAL_VOICE_SETTINGS = {
    // Padrão: Voz clara e natural
    natural: {
        stability: 0.72,           // Estabilidade alta = voz clara, não sussurrada
        similarity_boost: 0.80,    // Mantém características da voz
        style: 0.10,               // Expressividade sutil
        use_speaker_boost: true    // Clareza aprimorada
    },
    // Para mensagens mais formais/profissionais
    professional: {
        stability: 0.78,           // Bem estável para clareza máxima
        similarity_boost: 0.82,
        style: 0.05,               // Mínima variação
        use_speaker_boost: true
    },
    // Para mensagens amigáveis/casuais
    friendly: {
        stability: 0.68,           // Levemente mais variado, mas ainda claro
        similarity_boost: 0.78,
        style: 0.15,               // Expressividade moderada
        use_speaker_boost: true
    },
    // Para mensagens urgentes/alertas
    urgent: {
        stability: 0.75,           // Estável mas com energia
        similarity_boost: 0.85,
        style: 0.20,               // Mais ênfase
        use_speaker_boost: true
    }
};

/**
 * Detecta o tom ideal para a mensagem
 */
function detectMessageTone(text) {
    const textLower = (text || '').toLowerCase();
    
    // Mensagens urgentes
    if (textLower.includes('urgente') || textLower.includes('importante') || 
        textLower.includes('atenção') || textLower.includes('aviso')) {
        return 'urgent';
    }
    
    // Mensagens formais
    if (textLower.includes('prezado') || textLower.includes('confirma') ||
        textLower.includes('agendamento') || textLower.includes('cancelamento')) {
        return 'professional';
    }
    
    // Mensagens casuais/amigáveis
    if (textLower.includes('oi') || textLower.includes('olá') || 
        textLower.includes('obrigad') || textLower.includes('😊') ||
        textLower.includes('bom dia') || textLower.includes('boa tarde')) {
        return 'friendly';
    }
    
    return 'natural';
}

/**
 * Gera áudio usando ElevenLabs TTS com configurações otimizadas
 * 
 * ⚠️ IMPORTANTE: Parâmetros ajustados para evitar voz sussurrada:
 * - stability ALTO (0.65-0.80) = voz clara e consistente
 * - style BAIXO (0.0-0.20) = evita distorções
 */
async function generateElevenLabsTTS(text, voiceId, apiKey, options = {}) {
    console.log('🎙️ Gerando áudio com ElevenLabs TTS...');
    console.log('   📝 Texto:', text.substring(0, 80) + (text.length > 80 ? '...' : ''));
    console.log('   🎤 Voice ID:', voiceId);
    
    try {
        const https = require('https');
        
        // Detectar tom da mensagem para ajustar configurações
        const tone = detectMessageTone(text);
        const voiceSettings = NATURAL_VOICE_SETTINGS[tone] || NATURAL_VOICE_SETTINGS.natural;
        
        console.log(`   🎯 Tom detectado: ${tone}`);
        console.log(`   ⚙️ Settings: stability=${voiceSettings.stability}, similarity=${voiceSettings.similarity_boost}, style=${voiceSettings.style}`);
        
        // Usar modelo multilingual v2 para melhor qualidade em PT-BR
        const modelId = options.model_id || 'eleven_multilingual_v2';
        
        // Combinar configurações padrão com opções customizadas
        // Garantir valores mínimos para evitar sussurro
        const finalSettings = {
            stability: Math.max(0.65, options.stability ?? voiceSettings.stability),
            similarity_boost: Math.max(0.70, options.similarity_boost ?? voiceSettings.similarity_boost),
            style: Math.min(0.25, options.style ?? voiceSettings.style), // Limitar style para evitar distorções
            use_speaker_boost: options.use_speaker_boost ?? voiceSettings.use_speaker_boost
        };
        
        console.log(`   ✅ Settings finais: stability=${finalSettings.stability}, similarity=${finalSettings.similarity_boost}, style=${finalSettings.style}`);
        
        const postData = JSON.stringify({
            text: text,
            model_id: modelId,
            voice_settings: finalSettings
        });
        
        const response = await new Promise((resolve, reject) => {
            const reqOptions = {
                hostname: 'api.elevenlabs.io',
                port: 443,
                path: `/v1/text-to-speech/${voiceId}`,
                method: 'POST',
                headers: {
                    'Accept': 'audio/mpeg',
                    'Content-Type': 'application/json',
                    'xi-api-key': apiKey,
                    'Content-Length': Buffer.byteLength(postData)
                }
            };
            
            const req = https.request(reqOptions, (res) => {
                const chunks = [];
                
                res.on('data', (chunk) => chunks.push(chunk));
                
                res.on('end', () => {
                    if (res.statusCode !== 200) {
                        const errorBody = Buffer.concat(chunks).toString();
                        reject(new Error(`ElevenLabs API error: ${res.statusCode} - ${errorBody}`));
                        return;
                    }
                    resolve(Buffer.concat(chunks));
                });
            });
            
            req.on('error', reject);
            req.write(postData);
            req.end();
        });
        
        console.log('✅ Áudio gerado:', response.length, 'bytes');
        return response;
        
    } catch (error) {
        console.error('❌ Erro ElevenLabs TTS:', error.message);
        throw error;
    }
}

/**
 * Salva buffer de áudio em arquivo
 */
async function saveAudioFile(audioBuffer, filename, extension = 'mp3') {
    const audioDir = path.join(__dirname, '../../uploads/audio-tts');
    
    try {
        await fs.mkdir(audioDir, { recursive: true });
    } catch (error) {
        // Diretório já existe
    }
    
    const timestamp = Date.now();
    const filePath = path.join(audioDir, `${filename}-${timestamp}.${extension}`);
    
    await fs.writeFile(filePath, audioBuffer);
    console.log('💾 Áudio salvo:', filePath);
    
    return filePath;
}

/**
 * 🧹 LIMPEZA INTELIGENTE DE TEXTO PARA TTS
 * 
 * Prepara o texto para síntese de voz natural:
 * - Remove formatação de chat (negrito, itálico)
 * - Converte emojis em pausas ou remove
 * - Mantém pontuação para entonação correta
 * - Expande abreviações comuns
 */
function cleanTextForTTS(text) {
    if (!text) return '';
    
    // SANITIZAÇÃO ROBUSTA DE UNICODE
    // Converter para buffer e voltar para garantir UTF-8 válido
    let sanitized = '';
    try {
        // Método 1: Usar Buffer para sanitizar
        const buffer = Buffer.from(text, 'utf8');
        sanitized = buffer.toString('utf8');
    } catch (e) {
        sanitized = text;
    }
    
    // Remover caracteres Unicode problemáticos manualmente
    sanitized = sanitized
        // Remover unpaired surrogates (high sem low, low sem high)
        .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '')
        .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '')
        // Remover caracteres de controle e especiais inválidos
        .replace(/[\uFFFE\uFFFF\uFEFF]/g, '')
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
        // Remover caracteres de formatação invisíveis
        .replace(/[\u200B-\u200F\u2028-\u202F\u2060-\u206F]/g, '')
        // Remover variation selectors (usados em emojis compostos)
        .replace(/[\uFE00-\uFE0F]/g, '');
    
    // Converter caracteres especiais problemáticos para equivalentes ASCII
    sanitized = sanitized
        .replace(/[""]/g, '"')
        .replace(/['']/g, "'")
        .replace(/[–—]/g, '-')
        .replace(/[…]/g, '...')
        .replace(/[•·]/g, '-');
    
    let cleaned = sanitized
        // Remover formatação WhatsApp
        .replace(/\*([^*]+)\*/g, '$1')    // *negrito*
        .replace(/_([^_]+)_/g, '$1')      // _itálico_
        .replace(/~([^~]+)~/g, '$1')      // ~riscado~
        .replace(/```[^`]*```/g, '')      // ```código```
        
        // Converter emojis comuns em pausas naturais
        .replace(/[😊😄😃🙂]/g, '.')       // Sorrisos = pausa
        .replace(/[👋🖐️]/g, '')           // Acenos = remover
        .replace(/[👍✅]/g, ', certo,')    // Confirmação
        .replace(/[❌🚫]/g, ', não,')      // Negação
        .replace(/[📅📆]/g, '')            // Calendário = remover
        .replace(/[⏰🕐]/g, '')            // Relógio = remover
        .replace(/[📍🏠]/g, '')            // Localização = remover
        .replace(/[💼📞]/g, '')            // Trabalho/telefone = remover
        
        // Remover outros emojis
        .replace(/[\u{1F600}-\u{1F64F}]/gu, '')
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')
        .replace(/[\u{1F700}-\u{1F77F}]/gu, '')
        .replace(/[\u{1F780}-\u{1F7FF}]/gu, '')
        .replace(/[\u{1F800}-\u{1F8FF}]/gu, '')
        .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')
        .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '')
        .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')
        .replace(/[\u{2600}-\u{26FF}]/gu, '')
        .replace(/[\u{2700}-\u{27BF}]/gu, '')
        
        // Expandir abreviações para melhor pronúncia
        .replace(/\bvc\b/gi, 'você')
        .replace(/\btbm\b/gi, 'também')
        .replace(/\bpq\b/gi, 'porque')
        .replace(/\bq\b/gi, 'que')
        .replace(/\bhj\b/gi, 'hoje')
        .replace(/\bprox\b/gi, 'próximo')
        .replace(/\bmsg\b/gi, 'mensagem')
        .replace(/\bobs\b/gi, 'observação')
        .replace(/\bR\$\s*(\d)/gi, '$1 reais')
        
        // Melhorar pausas naturais
        .replace(/\n+/g, '. ')            // Quebras de linha = pausas
        .replace(/\.{2,}/g, '...')        // Múltiplos pontos = reticências
        .replace(/!{2,}/g, '!')           // Múltiplas exclamações = uma
        .replace(/\?{2,}/g, '?')          // Múltiplas interrogações = uma
        
        // Limpar espaços
        .replace(/\s+/g, ' ')
        .trim();
    
    // Garantir que termina com pontuação para entonação correta
    if (cleaned && !/[.!?]$/.test(cleaned)) {
        cleaned += '.';
    }
    
    return cleaned;
}

/**
 * 🎤 FUNÇÃO PRINCIPAL DE TTS
 * Converte texto em áudio natural usando ElevenLabs
 */
async function textToSpeech(text, options = {}) {
    console.log('\n🎤 === INICIANDO TEXT-TO-SPEECH ===');
    
    try {
        const config = await getAudioConfig();
        
        // Verificar se áudio está ativo
        if (!config.audio.ativo) {
            console.log('⚠️ TTS não está ativo nas configurações');
            return { success: false, error: 'TTS não está ativo' };
        }
        
        // Verificar API Key
        if (!config.apiKey) {
            console.error('❌ API Key do ElevenLabs não configurada');
            return { success: false, error: 'API Key do ElevenLabs não configurada' };
        }
        
        // Limpar texto
        const cleanText = cleanTextForTTS(text);
        
        if (!cleanText || cleanText.length < 3) {
            console.log('⚠️ Texto muito curto ou vazio');
            return { success: false, error: 'Texto inválido para TTS' };
        }
        
        console.log('📝 Texto limpo:', cleanText.substring(0, 80) + '...');
        
        // Determinar voice ID
        const genero = config.comportamento.genero || 'neutro';
        const voiceId = options.voiceId || config.customVoiceId || getVoiceByGender(genero);
        
        console.log(`🎤 Voz: ${VOICE_PRESETS[genero]?.name || 'Customizada'} (${voiceId})`);
        
        // Gerar áudio
        const audioBuffer = await generateElevenLabsTTS(cleanText, voiceId, config.apiKey, options);
        
        // Salvar arquivo
        const filename = options.filename || 'tts';
        const tempMp3Path = await saveAudioFile(audioBuffer, filename, 'mp3');
        
        // Converter para OGG (WhatsApp)
        let audioPath = tempMp3Path;
        
        try {
            const { convertMp3ToOgg } = require('../../zap/message');
            const oggPath = await convertMp3ToOgg(tempMp3Path);
            audioPath = oggPath;
            console.log('✅ Convertido para OGG:', oggPath);
            
            // Remover MP3 temporário
            try {
                await fs.unlink(tempMp3Path);
            } catch (e) {
                // Ignorar erro de remoção
            }
        } catch (error) {
            console.warn('⚠️ Erro na conversão OGG, usando MP3:', error.message);
        }
        
        console.log('✅ TTS concluído!');
        console.log('=====================================\n');
        
        return {
            success: true,
            audioPath,
            extension: audioPath.endsWith('.ogg') ? 'ogg' : 'mp3',
            provider: 'elevenlabs',
            voiceId: voiceId
        };
        
    } catch (error) {
        console.error('❌ Erro no TTS:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * 🔄 SISTEMA DE ALTERNÂNCIA TEXTO/ÁUDIO
 * 
 * Alterna entre texto e áudio para experiência mais natural:
 * - Padrão: TEXTO → ÁUDIO (ciclo de 2) - mais natural
 * - Configurável para diferentes padrões
 */
let ttsMessageCounter = 0;
const TTS_CYCLE = 2; // A cada 2 mensagens, alterna texto/áudio

async function shouldUseTTS(forceCheck = false) {
    try {
        const config = await getAudioConfig();
        
        if (!config.audio.ativo) {
            return false;
        }
        
        // Incrementar contador
        ttsMessageCounter++;
        
        // Verificar ciclo - agora alterna: texto, áudio, texto, áudio...
        const useAudio = ttsMessageCounter % TTS_CYCLE === 0;
        
        if (useAudio) {
            console.log(`🎤 TTS: ÁUDIO (mensagem ${ttsMessageCounter})`);
        } else {
            console.log(`📝 TTS: TEXTO (mensagem ${ttsMessageCounter})`);
        }
        
        return useAudio;
        
    } catch (error) {
        console.error('Erro ao verificar TTS:', error);
        return false;
    }
}

/**
 * Reseta contador TTS
 */
function resetTTSCounter() {
    ttsMessageCounter = 0;
    console.log('🔄 Contador TTS resetado');
}

/**
 * Força próxima mensagem como áudio
 */
function forceNextAsAudio() {
    ttsMessageCounter = TTS_CYCLE - 1;
    console.log('🎤 Próxima mensagem será ÁUDIO');
}

/**
 * Status atual do TTS
 */
async function getTTSStatus() {
    const config = await getAudioConfig();
    return {
        enabled: config.audio.ativo || false,
        counter: ttsMessageCounter,
        cycle: TTS_CYCLE,
        nextWillBeAudio: ttsMessageCounter >= TTS_CYCLE - 1,
        voicePresets: Object.keys(VOICE_PRESETS),
        currentGenero: config.comportamento.genero || 'neutro'
    };
}

/**
 * Lista vozes disponíveis
 */
function getAvailableVoices() {
    return VOICE_PRESETS;
}

module.exports = {
    textToSpeech,
    shouldUseTTS,
    cleanTextForTTS,
    getAudioConfig,
    getVoiceByGender,
    resetTTSCounter,
    forceNextAsAudio,
    getTTSStatus,
    getAvailableVoices,
    VOICE_PRESETS,
    NATURAL_VOICE_SETTINGS,
    detectMessageTone
};
