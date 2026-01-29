const { Server } = require("socket.io");
let io;


function setupSocket(server) {
    io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    console.log('Socket.io inicializado!');

    io.on('connection', (socket) => {
        console.log('Nova conexão, total de conexões:', io.engine.clientsCount);

        socket.on('disconnect', () => {
            console.log('Usuário desconectado, total de conexões:', io.engine.clientsCount);
        });

        socket.on('updateC', (id) => {
            console.log('Atualizando cliente:', id);
            socket.emit('updateC', id);
        });

        socket.on('qr', (qr) => {
            console.log('QR recebido:', qr);
            io.emit('qr', qr);
        });

        socket.on('qrZap', (qr) => {
            console.log('QR recebido:', qr);
            io.emit('qrZap', qr);
        });

        socket.on('autentica-zap', (msg) => {
            console.log('Autenticado:', msg);
            socket.emit('autentica-zap', msg);
        });

        socket.on('desconectado-zap', (msg) => {
            console.log('Desconectado:', msg);
            socket.emit('desconectado-zap', msg);
        });

        socket.on('autentica-error-zap', (msg) => {
            console.log('Erro na autenticação:', msg);
            socket.emit('autentica-error-zap', msg);
        });

        socket.on('atualizacampanha', async (id) => {
            console.log('Atualizando campanha:', id);
            socket.emit('atualizacampanha', id);
        });

        socket.on('nova-mensagem', async (msg) => {
            console.log('Nova mensagem recebida:', msg);
            socket.emit('nova-mensagem', msg);
        });

        socket.on('updateEvent', (data) => {
            console.log('Evento atualizado:', data);
            socket.emit('updateEvent', data);
        });

        //Ouvir erros
        socket.on('error', (error) => {
            console.error('Erro:', error);
        });
    });

    return io;
}

function getIO() {
    if (!io) {
        //throw new Error("Socket.io não foi inicializado!");
        return null;
    }
    return io;
}

module.exports = { setupSocket, getIO };