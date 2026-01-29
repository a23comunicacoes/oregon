/**
 * Utilitários para integração com WhatsApp Web JS
 * Contém funções auxiliares para formatação, limpeza e mapeamento de dados
 */

const moment = require('moment');
const { parsePhoneNumberFromString } = require('libphonenumber-js');

/**
 * Formata mensagens HTML para formato WhatsApp (markdown)
 * @param {string} mensagem - Mensagem em HTML
 * @returns {string} Mensagem formatada para WhatsApp
 */
function formatarMensagemHTML(mensagem) {
    if (!mensagem) return '';

    return mensagem
        .replace(/\*(.*?)\*/g, '<strong>$1</strong>')       // *negrito*
        .replace(/_(.*?)_/g, '<em>$1</em>')                 // _itálico_
        .replace(/~(.*?)~/g, '<s>$1</s>')                   // ~riscado~
        .replace(/\n/g, '<br>');                            // quebras de linha
}

/**
 * Formata mensagens do formato HTML para formato WhatsApp
 * @param {string} mensagem - Mensagem em HTML
 * @returns {string} Mensagem formatada para WhatsApp
 */
function formatHtmlMensagem(mensagem) {
    if (!mensagem) return '';

    return mensagem
        .replace(/<strong>(.*?)<\/strong>/g, '*$1*')       // <strong>negrito</strong>
        .replace(/<em>(.*?)<\/em>/g, '_$1_')               // <em>itálico</em>
        .replace(/<s>(.*?)<\/s>/g, '~$1~')                 // <s>riscado</s>
        .replace(/<br>/g, '\n');                           // <br> quebras de linha
}

/**
 * Remove caracteres não numéricos e prefixos de código de país
 * @param {string} number - Número de telefone
 * @returns {string} Número limpo
 */
function cleanNumber(number) {
    if (!number) return '';
    return number.replace(/\D/g, '').replace(/^\+55/, '').replace(/^55/, '');
}

/**
 * Formata número de telefone para formato internacional do WhatsApp
 * @param {string} number - Número de telefone
 * @returns {string} Número formatado com @c.us
 */
function formatPhoneNumber(number) {
    // Remove todos os caracteres não numéricos
    const cleaned = ('' + number).replace(/\D/g, '');
    // Verifique se o número começa com o código do país
    if (cleaned.startsWith('55')) {
        return cleaned + '@c.us';
    }
    return '55' + cleaned + '@c.us';
}

/**
 * Tenta resolver o chatId testando variações de número com/sem nono dígito
 * @param {Object} client - Instância do client wwebjs
 * @param {string} rawNumber - Número bruto
 * @returns {Promise<string>} Chat ID válido
 * @throws {Error} Se número não for registrado no WhatsApp
 */
async function resolveChatId(client, rawNumber) {
    // 1) Extrai só dígitos
    const onlyDigits = rawNumber.replace(/\D+/g, '');

    // 2) Valida e pega nationalNumber (DDD + subscriber)
    const phoneObj = parsePhoneNumberFromString(onlyDigits, 'BR');
    if (!phoneObj || !phoneObj.isValid()) {
        throw new Error(`Número inválido: ${rawNumber}`);
    }
    const national = phoneObj.nationalNumber.toString(); // ex: "11976331280" ou "1112345678"
    const ddd = national.slice(0, 2);             // ex: "11"
    const subscriber = national.slice(2);                // ex: "976331280" ou "12345678"

    // 3) Prepara lista de variações a testar
    const candidates = [national];
    if (subscriber.length === 9 && subscriber.startsWith('9')) {
        candidates.push(ddd + subscriber.slice(1));         // remove nono dígito
    } else if (subscriber.length === 8) {
        candidates.push(ddd + '9' + subscriber);            // adiciona nono dígito
    }

    // 4) Tenta cada candidato com getNumberId
    for (let cand of candidates) {
        const e164 = `55${cand}`;                           // ex: "5511976331280" ou "551176331280"
        console.log(`→ Testando: ${e164}`);

        // getNumberId aceita string sem "@c.us" e acrescenta sozinho
        const contactId = await client.getNumberId(e164);
        if (contactId) {
            // contactId.user = "551176331280", contactId.server = "c.us"
            console.log(`✔ Encontrou no WhatsApp: ${contactId.user}@${contactId.server}`);
            return `${contactId.user}@${contactId.server}`;
        }
    }

    throw new Error(`Número não registrado no WhatsApp: ${rawNumber}`);
}

/**
 * Verifica e retorna o nome do contato (evita números como nome)
 * @param {Object} contato - Objeto de contato do wwebjs
 * @returns {string} Nome do contato
 */
function checkNameContato(contato) {
    if (!contato) return '';

    let nome = contato.name;

    // Verificar se inicia com +55 ou 55
    if (!nome || nome.startsWith('+55') || nome.startsWith('55')) {
        nome = contato.pushname;
    }

    return nome;
}

/**
 * Lista de números que devem ser ignorados pelo sistema
 */
const usersJump = [
    '13135550002', '0'
];

module.exports = {
    formatarMensagemHTML,
    formatHtmlMensagem,
    cleanNumber,
    formatPhoneNumber,
    resolveChatId,
    checkNameContato,
    usersJump
};

