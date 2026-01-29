const cron = require('node-cron');
const axios = require('axios');
const util = require('util');
const { exec } = require('child_process');
const { getIO } = require('./socket');
const moment = require('moment-timezone');
const io = getIO();
require('dotenv').config();

const { sendMailAndNotificationUserBase } = require('./utils/notifications');
const dbQuery = require('./utils/dbHelper');
const { checkScheduledFlows, checkTimeouts, checkWaitTimeouts } = require('./flows/core/flowEngine');

const repeatTypeOptions = {
  'day': (date) => `${date.minute()} ${date.hour()} * * *`,
  'week': (date) => `${date.minute()} ${date.hour()} * * ${date.day()}`,
  'month': (date) => `${date.minute()} ${date.hour()} ${date.date()} * *`,
  'bi-month': (date) => `${date.minute()} ${date.hour()} ${date.date()} */2 *`,
  'tri-month': (date) => `${date.minute()} ${date.hour()} ${date.date()} */3 *`,
  'quadri-month': (date) => `${date.minute()} ${date.hour()} ${date.date()} */4 *`,
  'semester': (date) => `${date.minute()} ${date.hour()} ${date.date()} */6 *`,
  'year': (date) => `${date.minute()} ${date.hour()} ${date.date()} ${date.month() + 1} *`
};

// Função para converter data para o fuso horário de Brasília
const convertToBrasiliaTime = (date) => {
  return moment.tz(date, 'America/Sao_Paulo');
};

// Configura os cron jobs
const setupCronJobs = async () => {

  console.log('Sincronizando crons de lembretes...');

  const lembretes = await dbQuery('SELECT * FROM Lembretes');
  const sendUsers = await dbQuery('SELECT * FROM User WHERE role = "admin" OR role = "gerente"');
  const emailsSend = await dbQuery('SELECT * FROM Options WHERE type = "email_notify"');

  lembretes.forEach((lembrete) => {

    if (lembrete.repeat_type !== 'none' && repeatTypeOptions[lembrete.repeat_type] && lembrete.concluido == 0) {

      const agendadoTime = convertToBrasiliaTime(new Date(lembrete.agendado_time));
      const cronTime = repeatTypeOptions[lembrete.repeat_type](agendadoTime);

      console.log('Lembrete:', lembrete.title, 'Cron:', cronTime, 'Agendado:', agendadoTime.format());

      cron.schedule(cronTime, async () => {
        try {
          if (lembrete.repeat_success > lembrete.repeat_times) {
            await dbQuery('UPDATE Lembretes SET concluido = 1 WHERE id = ?', [lembrete.id]);
            return;
          } else if (lembrete.repeat_success == lembrete.repeat_times) {
            await dbQuery('UPDATE Lembretes SET concluido = 1 WHERE id = ?', [lembrete.id]);
          }

          let dataNoti = {
            notificationTitle: lembrete.title,
            notificationSubtitle: lembrete.subtitle,
            mailTitle: 'Lembrete: ' + lembrete.title,
            params: lembrete.params,
            message: lembrete.subtitle,
            linkAction: lembrete.params ? lembrete.params : 'https://app.oregonservicos.com.br/',
            textAction: 'Ver Lembrete'
          };

          for (let user of sendUsers) {
            console.log('Enviando notificação de usuário para:', user.email);
            await sendMailAndNotificationUserBase(true, true, user.email, dataNoti);
          }

          if (lembrete.notify_email == 1) {
            for (let email of emailsSend) {
              console.log('Enviando notificação de email:', email);
              await sendMailAndNotificationUserBase(true, false, email.value, dataNoti);
            }
          }

          io.emit('newNotification', lembrete); // Envia a notificação via WebSocket

          let sucessos = lembrete.repeat_success;
          await dbQuery(`UPDATE Lembretes SET repeat_success = ${sucessos + 1} WHERE id = ?`, [lembrete.id]);
        } catch (error) {
          console.error('Erro ao processar lembrete:', lembrete, error);
        }
      });
    } else if (lembrete.concluido == 0) {

      const agendadoTime = convertToBrasiliaTime(new Date(lembrete.agendado_time));

      if (agendadoTime > moment().tz('America/Sao_Paulo')) {
        const cronTime = `${agendadoTime.minute()} ${agendadoTime.hour()} ${agendadoTime.date()} ${agendadoTime.month() + 1} *`;
        cron.schedule(cronTime, async () => {

          try {
            console.log('Iniciando lembrete:', lembrete.title, 'Agendado:', agendadoTime.format(), 'Now:', moment().tz('America/Sao_Paulo').format());

            let dataNoti = {
              notificationTitle: lembrete.title,
              notificationSubtitle: lembrete.subtitle,
              mailTitle: 'Lembrete: ' + lembrete.title,
              params: lembrete.params,
              message: lembrete.subtitle,
              linkAction: lembrete.params ? lembrete.params : 'https://app.oregonservicos.com.br/',
              textAction: 'Ver Lembrete'
            };

            for (let user of sendUsers) {
              console.log('Enviando notificação de usuário para:', user.email);
              await sendMailAndNotificationUserBase(true, true, user.email, dataNoti);
            }

            if (lembrete.notify_email == 1) {
              for (let email of emailsSend) {
                console.log('Enviando notificação de email:', email);
                await sendMailAndNotificationUserBase(true, false, email.value, dataNoti);
              }
            }

            io.emit('newNotification', lembrete); // Envia a notificação via WebSocket

            if (lembrete.repeat_type === 'none') {
              await dbQuery('UPDATE Lembretes SET concluido = 1, repeat_success = 1 WHERE id = ?', [lembrete.id]);
            }
          } catch (error) {
            console.error('Erro ao processar lembrete:', lembrete, error);
          }
        });
      }
    }
  });
};


const initCronJobs = () => {
  console.log('Iniciando cron jobs');
  setupCronJobs();
  //adjustPayments();

  //Cron para a cada 1 hora verificar se o usuário está ativo
  cron.schedule('0 * * * *', async () => {
    console.log('Iniciando check de usuários');
    const users = await dbQuery('SELECT * FROM User');

    for (let user of users) {
      let dataAgora = moment().tz('America/Sao_Paulo');

      if (dataAgora.isAfter(user.expIni) && dataAgora.isBefore(user.expFim) && user.ativo == 0) {
        await dbQuery('UPDATE User SET ativo = 0 WHERE id = ?', [user.id]);
      } else if (dataAgora.isAfter(user.expFim)) {
        await dbQuery('UPDATE User SET ativo = 0 WHERE id = ?', [user.id]);
      }
    }
  });

  //Cron para verificar fluxos agendados
  cron.schedule('* * * * *', async () => {
    console.log('Iniciando check de fluxos agendados');
    await checkScheduledFlows();
    await checkTimeouts();
    await checkWaitTimeouts();
  });

  //Cron para processar ações agendadas pela IA
  cron.schedule('* * * * *', async () => {
    console.log('Verificando ações agendadas pela IA...');
    try {
      // Buscar ações prontas para executar
      const acoesAgendadas = await dbQuery(`
        SELECT * FROM FlowScheduledActions 
        WHERE executado = FALSE 
        AND executarEm <= NOW()
        ORDER BY executarEm ASC
        LIMIT 50
      `);

      if (acoesAgendadas.length === 0) {
        return;
      }

      console.log(`📋 ${acoesAgendadas.length} ação(ões) agendada(s) pronta(s) para executar`);

      for (const acao of acoesAgendadas) {
        try {
          console.log(`⚙️ Executando ação: ${acao.acao} para cliente ${acao.clientId}`);
          
          const parametros = typeof acao.parametros === 'string' ? JSON.parse(acao.parametros) : acao.parametros;
          
          // Montar contexto básico
          const context = {
            clientId: acao.clientId,
            phone: acao.phone,
            runId: acao.flowRunId
          };

          // Executar ação conforme o tipo
          switch (acao.acao) {
            case 'enviar_mensagem':
              const { sendWhatsAppMessage } = require('./flows/actions/messageActions');
              await sendWhatsAppMessage({ 
                message: parametros.mensagem || parametros.message 
              }, context);
              console.log(`✅ Mensagem enviada para ${acao.phone}`);
              break;

            case 'atualizar_cliente':
              const { updateCliente } = require('./flows/actions/clienteActions');
              await updateCliente(parametros, context);
              console.log(`✅ Cliente ${acao.clientId} atualizado`);
              break;

            case 'criar_negocio':
              const { createNegocio } = require('./flows/actions/negocioActions');
              await createNegocio(parametros, context);
              console.log(`✅ Negócio criado para cliente ${acao.clientId}`);
              break;

            case 'reativar_fluxo':
              // Verificar se é para retomar fluxo pausado ou iniciar novo
              if (acao.flowRunId && parametros.resumeFrom === 'current') {
                // Retomar fluxo pausado
                const { advance } = require('./flows/core/flowEngine');
                
                // Atualizar status do fluxo para running
                await dbQuery(
                  'UPDATE FlowRuns SET status = ?, next_run_at = NULL WHERE id = ?',
                  ['running', acao.flowRunId]
                );
                
                // Continuar execução
                await advance(acao.flowRunId);
                console.log(`✅ Fluxo ${acao.flowRunId} retomado`);
              } else {
                // Iniciar novo fluxo
                const { startFlow } = require('./flows/core/flowEngine');
                await startFlow({
                  flowId: parametros.flowId,
                  phone: acao.phone,
                  clientId: acao.clientId
                });
                console.log(`✅ Fluxo ${parametros.flowId} iniciado`);
              }
              break;

            default:
              console.log(`⚠️ Tipo de ação desconhecido: ${acao.acao}`);
          }

          // Marcar como executado
          await dbQuery('UPDATE FlowScheduledActions SET executado = TRUE WHERE id = ?', [acao.id]);
          
        } catch (error) {
          console.error(`❌ Erro ao executar ação ${acao.id}:`, error);
          // Não marcar como executado para tentar novamente
        }
      }
    } catch (error) {
      console.error('❌ Erro ao processar ações agendadas:', error);
    }
  });
};

module.exports = { initCronJobs, setupCronJobs };
