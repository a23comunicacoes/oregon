const jwt = require('jsonwebtoken');
const jose = require('jose-node-cjs-runtime');
const path = require("path");
const crypto = require('crypto');

const secretKey = jose.base64url.decode(process.env.KEY_SECRET_TOKEN || 'crm_oregon_k_g');

const dbQuery = require('../utils/dbHelper');

// Filtro para bloquear arquivos perigosos
const fileFilter = (req, file, cb) => {
    // Lista de extensões proibidas
    const extensoesProibidas = [
        ".exe", ".bat", ".cmd", ".sh", ".php", ".js", ".ts", ".java", ".py", ".cpp", ".c", ".h", ".sql",
        ".html", ".htm", ".css", ".scss", ".xml", ".json", ".yml", ".yaml", ".ps1", ".vbs", ".pl"
    ];

    // Lista de MIME types proibidos
    const mimeTypesProibidos = [
        "application/x-msdownload", "application/x-sh", "application/javascript", "text/html",
        "text/css", "text/x-python", "text/x-c", "text/x-java-source", "text/x-shellscript"
    ];

    const extensao = path.extname(file.originalname).toLowerCase();
    const mimeType = file.mimetype;

    if (extensoesProibidas.includes(extensao) || mimeTypesProibidos.includes(mimeType)) {
        return cb(new Error("Tipo de arquivo não permitido!"));
    }

    cb(null, true);
};

const tratarNome = (nome) => {
    if (typeof nome !== 'string') return '';

    // Remover acentos com normalize
    nome = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Retorna o nome "limpo", sem acentos
    return nome;
};

async function getUserLoggedUser(req, res, next) {
    try {
        const authHeader = req.headers["authorization"];
        if (!authHeader) {
            console.error("Cabeçalho de autorização ausente");
            return res.status(401).json({ message: "Você não tem permissão para isso" });
        }

        // O token deve vir no formato "Bearer <token>"
        const parts = authHeader.split("Bearer ");
        if (parts.length < 2 || !parts[1]) {
            console.error("Formato de token inválido");
            return res.status(401).json({ message: "Você não tem permissão para isso" });
        }

        const token = parts[1].trim();
        let decoded;
        try {
            const { payload, protectedHeader } = await jose.jwtDecrypt(token, secretKey);

            decoded = payload;
        } catch (err) {
            console.error("Erro ao verificar o token:", err);
            return res.status(401).json({ message: "Você não tem permissão para isso" });
        }

        const userQuery = await dbQuery('SELECT * FROM User WHERE id = ?', [decoded.id]);
        if (!userQuery || !userQuery.length || !userQuery[0]?.ativo) {
            console.error("Usuário não encontrado ou inativo");
            return res.status(401).json({ message: "Você não tem permissão para isso" });
        }

        const user = userQuery[0];

        const roleQuery = await dbQuery('SELECT * FROM Roles WHERE role_name = ? AND role_ability IS NOT NULL', [user.role]);
        if (!roleQuery || !roleQuery.length) {
            return res.status(401).json({ message: "Você não tem permissão para isso" });
        }

        // Armazena o usuário autenticado na requisição para uso posterior nas rotas
        if (!user.role || !roleQuery?.[0]?.role_ability) {
            return res.status(401).json({ message: "Você não tem permissão para isso" });
        }

        user.abilitys = roleQuery?.[0]?.role_ability && typeof roleQuery[0]?.role_ability === 'string'
            ? JSON.parse(roleQuery[0].role_ability) : [];

        if (!user.abilitys || !user.abilitys.length) {
            return res.status(401).json({ message: "Você não tem permissão para isso" });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error("Erro na autenticação:", error);
        return res.status(500).json({ message: "Erro interno no servidor." });
    }
}

function generatePassword(length = 10) {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';

    // Garantir pelo menos 1 de cada tipo
    const allChars = lowercase + uppercase + numbers;

    let password = '';
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];

    // Preencher o restante aleatoriamente
    for (let i = 3; i < length; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Embaralhar para que os 3 primeiros não fiquem previsíveis
    return password
        .split('')
        .sort(() => 0.5 - Math.random())
        .join('');
}

const valueIsValid = (value) => value && value != '' ? value : null;

const formatJsonToSql = (json) => {
    if (!json) return '';

    if (typeof json != 'object' || !Array.isArray(json)) return json;

    return JSON.stringify(json);
}

// Função para sanitizar entradas de texto e bloquear SQL Injection
function sanitizeInput(input) {
    if (typeof input === 'string') {
        // remove espaços extras
        let clean = input.trim();

        // lista de palavras proibidas (case insensitive)
        const forbidden = [
            'SELECT', 'UPDATE', 'DELETE', 'DROP', 'INSERT',
            'ALTER', 'TRUNCATE', 'EXEC', 'UNION', '--', ';'
        ];

        // substitui as palavras proibidas por vazio
        const regex = new RegExp(`\\b(${forbidden.join('|')})\\b`, 'gi');
        clean = clean.replace(regex, '');

        // escapa caracteres perigosos
        clean = clean.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, (char) => {
            switch (char) {
                case "\0": return "\\0";
                case "\x08": return "\\b";
                case "\x09": return "\\t";
                case "\x1a": return "\\z";
                case "\n": return "\\n";
                case "\r": return "\\r";
                case "\"":
                case "'":
                case "\\":
                case "%":
                    return "\\" + char;
            }
        });

        return clean;
    }
    return input;
}

const isDiff = (value1, value2) => {
    if (value1 === null && value2 === null ||
        value1 === undefined && value2 === undefined ||
        typeof value1 === 'string' && typeof value2 === 'string'
        && value1.trim() === '' && value2.trim() === '') return false;

    return value1 !== value2;
}

const can = (action, subject, abilitys) => {
   
    if (!action || !subject) return true
    if (!abilitys) return false;


    if (abilitys.some(a => a.action === 'manage' && a.subject === 'all')) return true

    if (subject) {
        //&& canImpl('manage', subject)) return true
        if (subject.includes('_')) {
            subject = subject.split('_')[0]
        }

        if (abilitys.some(a => a.action === 'manage' && a.subject === subject)) return true
    }

    return abilitys.some(a => a.action === action && a.subject === subject)
}

const escreverEndereco = (endereco) => {
    if (!endereco) return '';

    endereco = {
        end_logradouro: endereco.end_logradouro || endereco.logradouro || '',
        end_numero: endereco.end_numero || endereco.numero || '',
        end_bairro: endereco.end_bairro || endereco.bairro || '',
        end_cidade: endereco.end_cidade || endereco.cidade || '',
        end_estado: endereco.end_estado || endereco.estado || '',
        end_cep: endereco.end_cep || endereco.cep || '',
        end_complemento: endereco.end_complemento || endereco.complemento || '',
    }

    // ----------- Formato Brasileiro -----------
    const partes = [];

    let linha1 = [endereco.end_logradouro, endereco.end_numero]
        .filter(Boolean)
        .join(', ');
    if (linha1) partes.push(linha1);

    if (endereco.end_bairro) partes.push(endereco.end_bairro);

    let cidadeEstado = [endereco.end_cidade, endereco.end_estado]
        .filter(Boolean)
        .join('/');
    if (cidadeEstado) partes.push(cidadeEstado);

    if (endereco.end_cep) partes.push(`${endereco.end_cep}`);

    if (endereco.end_complemento) partes.push(` - ${endereco.end_complemento}`);
    return partes.join(' - ');
};

module.exports = {
    secretKey,
    fileFilter,
    tratarNome,
    getUserLoggedUser,
    generatePassword,
    valueIsValid,
    formatJsonToSql,
    sanitizeInput,
    isDiff,
    can,
    escreverEndereco
};
