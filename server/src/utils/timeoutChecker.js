const { checkTimeouts } = require('./flowEngine');

// Executar verificação de timeouts a cada 30 segundos
setInterval(async () => {
    try {
        await checkTimeouts();
    } catch (error) {
        console.error('Erro no timeout checker:', error);
    }
}, 30000); // 30 segundos

console.log('Timeout checker iniciado - verificando a cada 30 segundos');
