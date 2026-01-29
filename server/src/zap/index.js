/**
 * Módulo principal da integração com WhatsApp Web JS
 * Exporta todas as funções e gerencia eventos globais
 */

const { getIO } = require('../socket');
const { usersJump } = require('./utils');
const { mapearMsg } = require('./message');
const { getClientById } = require('./client');

// Importa e re-exporta todas as funções dos módulos
const clientFunctions = require('./client');
const messageFunctions = require('./message');
const chatFunctions = require('./chats');
const utilFunctions = require('./utils');

/**
 * Configura os listeners de eventos para um client específico
 * @param {string} clientId - ID do client
 */
function setupClientListeners(clientId) {
    const client = getClientById(clientId);
    
    if (!client) {
        console.error(`Client ${clientId} não encontrado para configurar listeners`);
        return;
    }

    const io = getIO();

    // Listener de criação de mensagens
    client.on('message_create', async (message) => {
        try {
            const chat = await message.getChat();

         /*    console.log('Chat', chat);

            console.log('Chat2', chat._data?.from);
 */
          /*   console.log('check', {
                chat: chat ? 'ok' : 'não ok',
                isGroup: !chat?.isGroup ? 'ok' : 'não ok',
                server: (chat?.id?.server == 'c.us' || chat?.id?.server == 'lid') ? 'ok' : `não ok: ${chat?.id?.server}`,
                usersJump: !usersJump.includes(chat.id.user) ? 'ok' : `não ok: ${chat.id.user}`
            }) */


            if (chat && !chat.isGroup && chat.type != 'e2e_notification' &&
                (chat.id.server === 'c.us' || chat.id.server === 'lid')
                && !usersJump.includes(chat.id.user)) {

                    /* console.log('message_create', message);
 */
                const mappedMsg = await mapearMsg(message, true);

                if (mappedMsg) {
                    mappedMsg.idChat = chat.id._serialized;
                    mappedMsg.clientId = clientId; // Adiciona ID do client

                    // Enviar a mensagem para o socket
                    io.emit('nova-mensagem', mappedMsg);
                    io.emit(`nova-mensagem-${clientId}`, mappedMsg); // Evento específico do client

                    // Integra ao motor de fluxos quando houver mensagem do usuário (não do sistema)
                    // Apenas processa fluxos se for o client de atendimento
                    if (!message.fromMe && clientId === 'atendimento_1') {
                        try {
                            const { handleIncomingMessage } = require('../flows/core/flowEngine');
                            let phone;// = chat.id.user; // 55DDDNÚMERO

                            if(chat.id.server === 'c.us'){
                                phone = chat.id.user;
                            } else if(chat.id.server === 'lid'){
                                const contato = await chat.getContact();

                                phone = contato.number;
                            }

                            if(!phone){
                                console.error('Número de telefone não encontrado');
                                return;
                            }
                            
                            // 🎤 Usar a mídia já processada pelo mapearMsg
                            let mediaPath = null;
                            let mediaType = null;
                            
                            if (mappedMsg && mappedMsg.media) {
                                mediaPath = mappedMsg.media.caminho;
                                mediaType = mappedMsg.media.mime;
                                console.log('📎 Mídia detectada do mapearMsg:', mediaPath);
                                console.log('🎬 Tipo:', mediaType);
                            }
                            
                            await handleIncomingMessage({ 
                                clientId,
                                phone, 
                                chatId: chat.id._serialized, 
                                text: message.body || '',
                                mediaPath,
                                mediaType
                            });
                        } catch (e) {
                            console.error('flowEngine incoming error:', e.message);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Erro ao processar message_create:', error);
        }
    });

    // Listener de confirmação de mensagem (ACK)
    client.on('message_ack', async (message, ack) => {
        io.emit('update-mensagem', { 
            id: message.id._serialized, 
            ack: ack, 
            clientId 
        });
    });

    // Listener de edição de mensagem
    client.on('message_edit', async (message) => {
        const { formatarMensagemHTML } = require('./utils');
        io.emit('update-mensagem', { 
            id: message.id._serialized, 
            texto: formatarMensagemHTML(message.body), 
            clientId 
        });
    });

    console.log(`✅ Listeners configurados para client ${clientId}`);
}

/**
 * Remove os listeners de eventos de um client
 * @param {string} clientId - ID do client
 */
function removeClientListeners(clientId) {
    const client = getClientById(clientId);
    
    if (!client) {
        return;
    }

    // Remove todos os listeners customizados
    client.removeAllListeners('message_create');
    client.removeAllListeners('message_ack');
    client.removeAllListeners('message_edit');

    console.log(`🗑️ Listeners removidos do client ${clientId}`);
}

/**
 * Inicializa o sistema com clients padrão (para compatibilidade)
 * Esta função será chamada automaticamente na inicialização do servidor
 */
async function initDefaultClient() {
    try {
        console.log('🔄 Verificando clients para auto-inicialização...');
        
        const dbQuery = require('../utils/dbHelper');
        
        // IDs dos clients que podem ser auto-inicializados
        const clientIds = ['atendimento_1', 'disparos_1', 'default'];
        
        for (const clientId of clientIds) {
            try {
                const clientData = await dbQuery(
                    'SELECT * FROM Clients WHERE id = ?', 
                    [clientId]
                );

                if (clientData.length > 0 && clientData[0].status === 'connected') {
                    console.log(`🚀 Auto-inicializando client ${clientId}...`);
                    const result = await clientFunctions.initClient(clientId);
                    
                    if (result.success) {
                        setupClientListeners(clientId);
                        console.log(`✅ Client ${clientId} inicializado com sucesso`);
                    } else {
                        console.log(`⚠️ Falha ao inicializar client ${clientId}: ${result.message}`);
                    }
                }
            } catch (error) {
                console.error(`❌ Erro ao inicializar client ${clientId}:`, error);
            }
        }
        
        console.log('✅ Auto-inicialização de clients concluída');
    } catch (error) {
        console.error('Erro na auto-inicialização:', error);
    }
}

/**
 * Wrapper para initClient que também configura os listeners
 * @param {string} clientId - ID do client
 * @returns {Promise<Object>} Resultado da inicialização
 */
async function initClientWithListeners(clientId) {
    const result = await clientFunctions.initClient(clientId);
    
    if (result.success) {
        setupClientListeners(clientId);
    }
    
    return result;
}

/**
 * Wrapper para disconnectClient que também remove os listeners
 * @param {string} clientId - ID do client
 * @returns {Promise<boolean>} True se desconectado com sucesso
 */
async function disconnectClientWithCleanup(clientId) {
    removeClientListeners(clientId);
    return await clientFunctions.disconnectClient(clientId);
}

// Exporta todas as funções
module.exports = {
    // Funções de client
    ...clientFunctions,
    initClient: initClientWithListeners, // Sobrescreve com versão que adiciona listeners
    disconnectClient: disconnectClientWithCleanup, // Sobrescreve com versão que remove listeners
    
    // Funções de mensagens
    ...messageFunctions,
    
    // Funções de chats
    ...chatFunctions,
    
    // Funções utilitárias
    ...utilFunctions,
    
    // Funções de gerenciamento de listeners
    setupClientListeners,
    removeClientListeners,
    
    // Inicialização
    initDefaultClient
};

