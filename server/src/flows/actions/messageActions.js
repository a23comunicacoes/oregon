/**
 * 💬 MESSAGE ACTIONS - Ações de envio de mensagens
 * 
 * Funções para enviar mensagens WhatsApp, Email, etc
 */

const { replaceVariables } = require('../helpers/contextHelper');
const { flowLog } = require('../helpers/logHelper');

// Lazy loading para evitar dependências circulares
let sendZapMessage, sendZapMessageImage, sendMessageChat, getSMTPTransporter;

function loadZapFunctions() {
    if (!sendZapMessage || !sendZapMessageImage || !sendMessageChat) {
        const zap = require('../../zap');
        
        sendZapMessage = async (phoneOrClientId, messageOrPhone, messageOptional) => {
            if (messageOptional !== undefined) {
                return await zap.sendZapMessage(phoneOrClientId, messageOrPhone, messageOptional);
            }
            return await zap.sendZapMessage('atendimento_1', phoneOrClientId, messageOrPhone);
        };
        
        sendZapMessageImage = async (phoneOrClientId, messageOrPhone, imagePathOrMessage, imagePathOptional) => {
            if (imagePathOptional !== undefined) {
                return await zap.sendZapMessageImage(phoneOrClientId, messageOrPhone, imagePathOrMessage, imagePathOptional);
            }
            return await zap.sendZapMessageImage('atendimento_1', phoneOrClientId, messageOrPhone, imagePathOrMessage);
        };
        
        sendMessageChat = async (clientId, chatId, message, idReply, midiaPath) => {
            return await zap.sendMessageChat(clientId, chatId, message, idReply, midiaPath);
        };
    }
    return { sendZapMessage, sendZapMessageImage, sendMessageChat };
}

/**
 * Enviar mensagem WhatsApp
 * @param {Object} config - Configuração do nó
 * @param {Object} context - Contexto do fluxo
 * @returns {Promise<Object>} - Resultado da operação
 */
async function sendWhatsAppMessage(config, context) {
    flowLog.actionSuccess('send_whatsapp_message', { step: 'start' });
    
    try {
        const { sendZapMessage: szm, sendZapMessageImage: szmi, sendMessageChat: smc } = loadZapFunctions();
        
        // Substituir variáveis na mensagem
        let message = await replaceVariables(config.message, context);
        
        // Determinar destinatário
        let phone = context.phone;
        let chatId = context.chatId;
        
        // 🎤 NOVO: Sistema de alternância texto/áudio (TTS)
        // Verificar se deve usar TTS automaticamente (a cada 3 mensagens)
        let useTTS = false;
        let audioPath = null;
        
        // Só tentar TTS se não tiver mídia customizada e for mensagem de IA
        if (!config.mediaPath && (context.isAIMessage || config.fromAI)) {
            const { shouldUseTTS, textToSpeech } = require('../helpers/textToSpeech');
            
            try {
                useTTS = await shouldUseTTS();
                
                if (useTTS) {
                    console.log('🎤 Convertendo mensagem para áudio (TTS)...');
                    const ttsResult = await textToSpeech(message, {
                        filename: `ai-message-${Date.now()}`
                    });
                    
                    if (ttsResult.success) {
                        audioPath = ttsResult.audioPath;
                        console.log('✅ Áudio gerado:', audioPath);
                    } else {
                        console.log('⚠️ Falha no TTS, enviando como texto:', ttsResult.error);
                        useTTS = false;
                    }
                }
            } catch (error) {
                console.error('⚠️ Erro ao processar TTS:', error.message);
                useTTS = false;
            }
        }
        
        // Enviar mensagem
        if (useTTS && audioPath) {
            // Enviar como áudio (TTS)
            if (chatId) {
                await smc(context.clientId || 'atendimento_1', chatId, '', null, audioPath);
            } else {
                await szmi(phone, '', audioPath);
            }
            
            flowLog.actionSuccess('send_whatsapp_message', { 
                step: 'mensagem_audio_tts_enviada',
                phone,
                chatId,
                audioPath
            });
            
            console.log('🎤 Mensagem enviada como ÁUDIO (TTS)');
        } else if (config.mediaPath) {
            // Mensagem com mídia customizada
            const mediaPath = await replaceVariables(config.mediaPath, context);
            
            if (chatId) {
                await smc(context.clientId || 'atendimento_1', chatId, message, null, mediaPath);
            } else {
                await szmi(phone, message, mediaPath);
            }
            
            flowLog.actionSuccess('send_whatsapp_message', { 
                step: 'mensagem_com_midia_enviada',
                phone,
                chatId
            });
        } else {
            // Mensagem de texto normal
            if (chatId) {
                await smc(context.clientId || 'atendimento_1', chatId, message);
            } else {
                await szm(phone, message);
            }
            
            flowLog.actionSuccess('send_whatsapp_message', { 
                step: 'mensagem_texto_enviada',
                phone,
                chatId
            });
            
            console.log('📝 Mensagem enviada como TEXTO');
        }
        
        return {
            success: true,
            message: 'Mensagem enviada com sucesso',
            sentAsAudio: useTTS
        };
        
    } catch (error) {
        flowLog.actionError('send_whatsapp_message', error);
        return { success: false, error: error.message };
    }
}

/**
 * Enviar email
 * @param {Object} config - Configuração do nó
 * @param {Object} context - Contexto do fluxo
 * @returns {Promise<Object>} - Resultado da operação
 */
async function sendEmail(config, context) {
    flowLog.actionSuccess('send_email', { step: 'start' });
    
    try {
        if (!getSMTPTransporter) {
            const flowEngineModule = require('../core/flowEngine');
            getSMTPTransporter = flowEngineModule.getSMTPTransporter;
        }
        
        const transporter = await getSMTPTransporter();
        
        if (!transporter) {
            flowLog.actionError('send_email', new Error('SMTP não configurado'));
            return { success: false, error: 'SMTP não configurado' };
        }
        
        // Processar destinatário
        let to = await replaceVariables(config.to, context);
        
        // Processar assunto
        let subject = await replaceVariables(config.subject, context);
        
        // Processar corpo
        let body = await replaceVariables(config.body, context);
        
        // Enviar email
        await transporter.transporter.sendMail({
            from: transporter.from,
            to: to,
            subject: subject,
            html: body
        });
        
        flowLog.actionSuccess('send_email', { 
            step: 'email_enviado',
            to,
            subject
        });
        
        return {
            success: true,
            message: 'Email enviado com sucesso'
        };
        
    } catch (error) {
        flowLog.actionError('send_email', error);
        return { success: false, error: error.message };
    }
}

/**
 * Encaminhar contato
 * @param {Object} node - Nó completo
 * @param {Object} config - Configuração do nó
 * @param {Object} context - Contexto do fluxo
 * @returns {Promise<Object>} - Resultado da operação
 */
async function forwardContact(node, config, context) {
    flowLog.actionSuccess('forward_contact', { step: 'start' });
    
    try {
        const dbQuery = require('../../utils/dbHelper');
        const { sendZapMessage: szm } = loadZapFunctions();
        
        const forwardType = config.forwardType || 'next';
        const phones = config.phones || [];
        const message = config.message ? await replaceVariables(config.message, context) : 
                       `📞 *Novo contato encaminhado*\n\nO contato abaixo está aguardando atendimento:`;
        
        if (phones.length === 0) {
            flowLog.actionError('forward_contact', new Error('Nenhum número configurado'));
            return { success: false, error: 'Nenhum número para encaminhar configurado' };
        }
        
        let targetPhones = [];
        
        // Lógica de seleção baseada no tipo
        switch (forwardType) {
            case 'next': {
                // Buscar último encaminhamento
                const lastForward = await dbQuery(`
                    SELECT forwarded_to_phone 
                    FROM FlowForwardLog 
                    WHERE flow_id = ? 
                    ORDER BY created_at DESC 
                    LIMIT 1
                `, [context.flowId || 0]);
                
                let currentIndex = 0;
                if (lastForward.length > 0) {
                    const lastPhone = lastForward[0].forwarded_to_phone;
                    currentIndex = phones.findIndex(p => p.phone === lastPhone);
                    if (currentIndex === -1) currentIndex = 0;
                    else currentIndex = (currentIndex + 1) % phones.length;
                } else {
                    currentIndex = 0;
                }
                
                targetPhones = [phones[currentIndex]];
                flowLog.actionSuccess('forward_contact', { 
                    step: 'next_selecionado',
                    index: currentIndex
                });
                break;
            }
            
            case 'random': {
                const randomIndex = Math.floor(Math.random() * phones.length);
                targetPhones = [phones[randomIndex]];
                flowLog.actionSuccess('forward_contact', { 
                    step: 'random_selecionado',
                    index: randomIndex
                });
                break;
            }
            
            case 'all': {
                targetPhones = [...phones];
                flowLog.actionSuccess('forward_contact', { 
                    step: 'all_selecionado',
                    count: phones.length
                });
                break;
            }
            
            default: {
                flowLog.actionError('forward_contact', new Error('Tipo de encaminhamento inválido'));
                return { success: false, error: 'Tipo de encaminhamento inválido' };
            }
        }
        
        // Link do WhatsApp
        const cleanContactPhone = (context.phone || '').replace(/\D/g, '');
        const whatsappLink = `https://wa.me/${cleanContactPhone}`;
        
        // Enviar para cada número
        const results = [];
        
        for (const targetPhone of targetPhones) {
            try {
                const finalMessage = `${message}\n\n🔗 *Contato:* ${whatsappLink}`;
                const cleanTargetPhone = (targetPhone.phone || '').replace(/\D/g, '');
                
                if (!cleanTargetPhone || cleanTargetPhone.length < 10) {
                    results.push({
                        phone: targetPhone.phone,
                        label: targetPhone.label,
                        success: false,
                        error: 'Número inválido'
                    });
                    continue;
                }
                
                await szm(cleanTargetPhone, finalMessage);
                
                results.push({
                    phone: targetPhone.phone,
                    label: targetPhone.label,
                    success: true
                });
                
                // Registrar no log
                await dbQuery(`
                    INSERT INTO FlowForwardLog 
                    (flow_run_id, flow_id, node_id, contact_phone, forwarded_to_phone, forwarded_to_label, forward_type, message_content, status, created_at) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
                `, [
                    context.runId || 0,
                    context.flowId || 0,
                    node.id,
                    context.phone,
                    cleanTargetPhone,
                    targetPhone.label || null,
                    forwardType,
                    finalMessage,
                    'sent'
                ]);
                
            } catch (error) {
                results.push({
                    phone: targetPhone.phone,
                    label: targetPhone.label,
                    success: false,
                    error: error.message
                });
            }
        }
        
        const successCount = results.filter(r => r.success).length;
        
        flowLog.actionSuccess('forward_contact', { 
            step: 'finalizado',
            successCount,
            totalCount: results.length
        });
        
        return {
            success: successCount > 0,
            message: `${successCount}/${results.length} encaminhamento(s) realizado(s)`,
            results
        };
        
    } catch (error) {
        flowLog.actionError('forward_contact', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    sendWhatsAppMessage,
    sendEmail,
    forwardContact
};

