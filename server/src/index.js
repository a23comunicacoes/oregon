const express = require('express');
const cors = require('cors');
const path = require('path');
const https = require('https');
const fs = require('fs');

const app = express();

process.on('uncaughtException', (error) => {
  if (error.code === 'ECONNRESET') {
    console.error('ECONNRESET capturado, mantendo o servidor em execução.');
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promessa rejeitada não tratada:', promise, 'motivo:', reason);
});

const pathEnv = path.join(__dirname, `.env${process.env.NODE_ENV === 'dev' ? '.dev' : ''}`);
console.log('Carregando variáveis de ambiente do arquivo:', pathEnv);
require('dotenv').config({ path: pathEnv });
require('events').EventEmitter.defaultMaxListeners = 20;

app.use(express.json({ limit: '5000mb' }));
app.use(express.urlencoded({ limit: '5000mb', extended: true }));
app.use(express.static(path.join(__dirname, '../../client/dist')));

const options = {
  key: fs.readFileSync('/etc/letsencrypt/live/app.oregonhigienizacao.com.br/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/app.oregonhigienizacao.com.br/fullchain.pem')
};

const server = https.createServer(options, app);

// Serve arquivos estáticos da pasta 'uploads'
const caminhostatic = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(caminhostatic));

//Socket.io
const { setupSocket } = require('./socket');
setupSocket(server);

//WhatsApp - Novo sistema modular
const { initDefaultClient } = require('./zap');
initDefaultClient();

//Cron
const { initCronJobs } = require('./crons');
initCronJobs();

/* const { testFlow } = require('./utils/test_flow_complete');

// Chamar após inicialização
setTimeout(async () => {
    const result = await testFlow();
    
    if (result.success) {
        console.log('✅ Teste passou!', result);
    } else {
        console.error('❌ Teste falhou:', result.error);
    }
}, 3000); */

//Rotas e Cors

app.use(cors({
  origin: ['https://app.oregonhigienizacao.com.br', 'http://app.oregonhigienizacao.com.br:5174', 'https://app.oregonhigienizacao.com.br:5174',
    'http://app.oregonhigienizacao.com.br:5173', 'https://app.oregonhigienizacao.com.br:5173', 'https://app.oregonservicos.com.br',
    'http://app.oregonservicos.com.br:5174', 'https://app.oregonservicos.com.br:5174', 'http://app.oregonservicos.com.br:5173',
    'https://app.oregonservicos.com.br:5173', 'https://dev.oregonservicos.com.br', 'http://dev.oregonservicos.com.br:5174',
    'https://dev.oregonservicos.com.br:5174', 'http://dev.oregonservicos.com.br:5173', 'https://dev.oregonservicos.com.br:5173'
  ]
}));

const { getUserLoggedUser } = require('./utils/functions');

app.use('/conta', require('./routes/auth'));
app.use('/users', getUserLoggedUser, require('./routes/users'));
app.use('/roles', getUserLoggedUser, require('./routes/roles'));
app.use('/download', require('./routes/download'));
app.use('/noti', getUserLoggedUser, require('./routes/notificacoes'));
app.use('/anexo', require('./routes/upload-files'));
app.use('/agenda', getUserLoggedUser, require('./routes/agendamentos'));
app.use('/clientes', getUserLoggedUser, require('./routes/clientes'));
app.use('/servicos', getUserLoggedUser, require('./routes/servicos'));
app.use('/config', getUserLoggedUser, require('./routes/config'));
app.use('/comissoes', getUserLoggedUser, require('./routes/comissao'));
app.use('/estoque', getUserLoggedUser, require('./routes/estoque'));
app.use('/setores', getUserLoggedUser, require('./routes/setores'));
app.use('/ordens-entrada', getUserLoggedUser, require('./routes/ordensEntrada'));
app.use('/ordens-retirada', getUserLoggedUser, require('./routes/ordensRetirada'));
app.use('/lembretes', getUserLoggedUser, require('./routes/lembretes'));
app.use('/pagamentos', getUserLoggedUser, require('./routes/pagamentos'));
app.use('/relatorios', getUserLoggedUser, require('./routes/relatorios'));
app.use('/crm', getUserLoggedUser, require('./routes/crm'));
app.use('/disparos', getUserLoggedUser, require('./routes/disparos'));
app.use('/templates', getUserLoggedUser, require('./routes/templates'));
app.use('/zap', getUserLoggedUser, require('./routes/zap-route'));
app.use('/atendimento', require('./routes/atendimento'));
app.use('/flows', require('./flows/routes/flowsRoute'));
app.use('/ordem-servico', require('./routes/ordem-servico'));

/*-------*/

//Logar hora do servidor
console.log('Hora do servidor:', new Date().toLocaleString());
//Logar fuso horário do servidor
console.log('Fuso horário do servidor:', Intl.DateTimeFormat().resolvedOptions().timeZone);


app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/dist', 'index.html'));
});

const PORT = process.env.NODE_ENV == 'dev' ? 3005 : 3000;

server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});