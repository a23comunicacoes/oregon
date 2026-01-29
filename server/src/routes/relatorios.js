const express = require('express');
const router = express.Router();
const path = require('path');
const db = require('../database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const transporter = require('../transporter');
const fs = require('fs');
const handlebars = require('handlebars');
const util = require('util');
const moment = require('moment');
moment.locale('pt-br');

const { createRelatorioSaida, createRelatorioReceber, createRelatorioComissoes, createRelatorioServicosTecnicos } = require('../utils/generatePDF');

require('dotenv').config();
const paginateArray = (array, perPage, page) => array.slice((page - 1) * perPage, page * perPage)
const dbQuery = require('../utils/dbHelper');

const statusNomes = [
    { ast_id: 3, ast_descricao: 'Atendido' },
    { ast_id: 6, ast_descricao: 'Cancelado' },
    { ast_id: 7, ast_descricao: 'Remarcado' },
    { ast_id: 1, ast_descricao: 'Agendado' },
    { ast_id: 2, ast_descricao: 'Confirmado' },
    { ast_id: 3, ast_descricao: 'Atendido' }
]

router.get('/get/financeiro', async (req, res) => {
    try {
        const {
            dataDe = null,
            dataAte = null,
        } = req.query;


        // ==========================
        // 1. BUSCAR DADOS BASE
        // ==========================

        // Buscar pagamentos (receitas) - filtrando pela data do agendamento
        // IMPORTANTE: Apenas agendamentos ATENDIDOS (ast_id = 3)
        let queryPagamentos = `
            SELECT 
                PAGAMENTO.*,
                AGENDAMENTO.age_data,
                AGENDAMENTO.age_valor,
                AGENDAMENTO.age_desconto,
                AGENDAMENTO.cli_id,
                AGENDAMENTO.ast_id,
                CLIENTES.cli_nome
            FROM PAGAMENTO
            JOIN AGENDAMENTO ON PAGAMENTO.age_id = AGENDAMENTO.age_id
            JOIN CLIENTES ON AGENDAMENTO.cli_id = CLIENTES.cli_Id
            WHERE AGENDAMENTO.ast_id = 3
            AND AGENDAMENTO.age_ativo = 1
        `;

        // Buscar agendamentos atendidos (para incluir os que ainda não têm pagamento)
        let queryAgendamentosAtendidos = `
            SELECT 
                AGENDAMENTO.age_id,
                AGENDAMENTO.age_data,
                AGENDAMENTO.age_valor,
                AGENDAMENTO.age_desconto,
                AGENDAMENTO.cli_id,
                CLIENTES.cli_nome
            FROM AGENDAMENTO
            JOIN CLIENTES ON AGENDAMENTO.cli_id = CLIENTES.cli_Id
            WHERE AGENDAMENTO.ast_id = 3
            AND AGENDAMENTO.age_ativo = 1
        `;

        // Buscar agendamentos futuros (Agendado ou Confirmado)
        let queryAgendamentosFuturos = `
            SELECT 
                AGENDAMENTO.age_id,
                AGENDAMENTO.age_data,
                AGENDAMENTO.age_valor,
                AGENDAMENTO.age_desconto,
                AGENDAMENTO.ast_id,
                CLIENTES.cli_nome
            FROM AGENDAMENTO
            JOIN CLIENTES ON AGENDAMENTO.cli_id = CLIENTES.cli_Id
            WHERE AGENDAMENTO.ast_id IN (1, 2)
            AND AGENDAMENTO.age_ativo = 1
        `;

        // Buscar despesas - usando des_data
        let queryDespesas = `SELECT * FROM DESPESAS WHERE 1 = 1`;

        // Buscar comissões - usando created_at do COMISSOES
        let queryComissoes = `
            SELECT 
                COMISSOES.*,
                AGENDAMENTO.age_data
            FROM COMISSOES
            JOIN AGENDAMENTO ON COMISSOES.age_id = AGENDAMENTO.age_id
            WHERE 1 = 1
        `;

        if (dataDe) {
            queryPagamentos += ` AND AGENDAMENTO.age_data >= '${dataDe}'`;
            queryAgendamentosAtendidos += ` AND AGENDAMENTO.age_data >= '${dataDe}'`;
            queryAgendamentosFuturos += ` AND AGENDAMENTO.age_data >= '${dataDe}'`;
            queryDespesas += ` AND DESPESAS.des_data >= '${dataDe}'`;
            queryComissoes += ` AND AGENDAMENTO.age_data >= '${dataDe}'`;
        }

        if (dataAte) {
            queryPagamentos += ` AND AGENDAMENTO.age_data <= '${dataAte}'`;
            queryAgendamentosAtendidos += ` AND AGENDAMENTO.age_data <= '${dataAte}'`;
            queryAgendamentosFuturos += ` AND AGENDAMENTO.age_data <= '${dataAte}'`;
            queryDespesas += ` AND DESPESAS.des_data <= '${dataAte}'`;
            queryComissoes += ` AND AGENDAMENTO.age_data <= '${dataAte}'`;
        }

        queryPagamentos += ` ORDER BY AGENDAMENTO.age_data DESC`;
        queryAgendamentosAtendidos += ` ORDER BY AGENDAMENTO.age_data DESC`;
        queryAgendamentosFuturos += ` ORDER BY AGENDAMENTO.age_data DESC`;
        queryDespesas += ` ORDER BY DESPESAS.des_data DESC`;
        queryComissoes += ` ORDER BY AGENDAMENTO.age_data DESC`;

        const pagamentos = await dbQuery(queryPagamentos);
        const agendamentosAtendidos = await dbQuery(queryAgendamentosAtendidos);
        const agendamentosFuturos = await dbQuery(queryAgendamentosFuturos);
        const despesas = await dbQuery(queryDespesas);
        const comissoes = await dbQuery(queryComissoes);

        // ==========================
        // 2. PROCESSAR PAGAMENTOS (RECEITAS)
        // ==========================

        let totalReceitaBruta = 0;
        let totalReceitaRecebida = 0;
        let totalReceitaPendente = 0;
        let quantidadePagamentosRecebidos = 0;
        let quantidadePagamentosPendentes = 0;

        const formasPagamentoMap = {};
        const receitaPorDia = {};
        const topClientes = {};

        // Mapa para evitar contagem duplicada do mesmo agendamento
        const agendamentoMap = {};

        for (let pagamento of pagamentos) {
            const ageId = pagamento.age_id;
            const valorAgendamento = parseFloat(pagamento.age_valor || 0) - parseFloat(pagamento.age_desconto || 0);

            if (!agendamentoMap[ageId]) {
                agendamentoMap[ageId] = {
                    age_id: ageId,
                    valorAgendamento,
                    cli_nome: pagamento.cli_nome,
                    age_data: pagamento.age_data,
                    valorPago: 0,
                };
            }

            const pags = pagamento.pgt_json ? JSON.parse(pagamento.pgt_json) : [];
            let valorPagoPagamento = 0;
            const fpg_names = [];

            for (let pag of pags) {
                // Somar apenas valores efetivamente pagos (pgt_data preenchida)
                if (pagamento.pgt_data) {
                    valorPagoPagamento += parseFloat(pag.pgt_valor || 0);
                }

                const forma = await dbQuery(`SELECT * FROM FORMAS_PAGAMENTO WHERE fpg_id = ${pag.fpg_id}`);
                const formaDesc = forma.length > 0 ? forma[0].fpg_descricao : 'Dinheiro';
                fpg_names.push(formaDesc);

                if (pagamento.pgt_data) {
                    formasPagamentoMap[formaDesc] = (formasPagamentoMap[formaDesc] || 0) + parseFloat(pag.pgt_valor || 0);
                }
            }

            pagamento.fpg_name = fpg_names.join(', ');
            pagamento.valorPago = valorPagoPagamento;

            if (pagamento.pgt_data) {
                agendamentoMap[ageId].valorPago += valorPagoPagamento;

                // Agrupar por dia (data do pagamento)
                const dia = moment(pagamento.pgt_data).format('YYYY-MM-DD');
                receitaPorDia[dia] = (receitaPorDia[dia] || 0) + valorPagoPagamento;

                // Top clientes
                topClientes[pagamento.cli_nome] = (topClientes[pagamento.cli_nome] || 0) + valorPagoPagamento;
            }
        }

        // Garantir que agendamentos atendidos sem nenhum pagamento também sejam considerados (pendentes)
        for (const agendamento of agendamentosAtendidos) {
            if (!agendamentoMap[agendamento.age_id]) {
                agendamentoMap[agendamento.age_id] = {
                    age_id: agendamento.age_id,
                    valorAgendamento: parseFloat(agendamento.age_valor || 0) - parseFloat(agendamento.age_desconto || 0),
                    cli_nome: agendamento.cli_nome,
                    age_data: agendamento.age_data,
                    valorPago: 0
                };
            }
        }

        // Consolidação por agendamento (evita duplicidade)
        for (const agendamento of Object.values(agendamentoMap)) {
            totalReceitaBruta += agendamento.valorAgendamento;
            totalReceitaRecebida += agendamento.valorPago;

            const pendente = Math.max(agendamento.valorAgendamento - agendamento.valorPago, 0);
            const pagoCompleto = pendente <= 0.0001; // tolerância pequena

            totalReceitaPendente += pendente;

            if (pagoCompleto) {
                quantidadePagamentosRecebidos++;
            } else {
                quantidadePagamentosPendentes++;
            }
        }

        // ==========================
        // 2.1. PROCESSAR AGENDAMENTOS FUTUROS (RECEITA FUTURA)
        // ==========================

        let totalReceitaFutura = 0;
        let quantidadeAgendamentosFuturos = 0;
        let quantidadeAgendados = 0;
        let quantidadeConfirmados = 0;

        for (let agendamento of agendamentosFuturos) {
            const valorAgendamento = parseFloat(agendamento.age_valor || 0) - parseFloat(agendamento.age_desconto || 0);
            totalReceitaFutura += valorAgendamento;
            quantidadeAgendamentosFuturos++;

            if (agendamento.ast_id === 1) {
                quantidadeAgendados++;
            } else if (agendamento.ast_id === 2) {
                quantidadeConfirmados++;
            }
        }

        // ==========================
        // 3. PROCESSAR DESPESAS
        // ==========================

        let totalDespesas = 0;
        let totalDespesasPagas = 0;
        let totalDespesasPendentes = 0;
        let quantidadeDespesasPagas = 0;
        let quantidadeDespesasPendentes = 0;

        const despesasPorTipo = {};
        const despesasPorDia = {};
        const formasPagamentoDespesas = {};

        for (let despesa of despesas) {
            const valor = parseFloat(despesa.des_valor || 0);
            totalDespesas += valor;

            if (despesa.des_pago) {
                totalDespesasPagas += valor;
                quantidadeDespesasPagas++;

                const dia = moment(despesa.des_paga_data || despesa.des_data).format('YYYY-MM-DD');
                despesasPorDia[dia] = (despesasPorDia[dia] || 0) + valor;

                // Agrupar por forma de pagamento
                const forma = despesa.des_forma_pagamento || 'Não especificado';
                formasPagamentoDespesas[forma] = (formasPagamentoDespesas[forma] || 0) + valor;
            } else {
                totalDespesasPendentes += valor;
                quantidadeDespesasPendentes++;
            }

            // Agrupar por tipo
            const tipo = despesa.des_tipo || 'Outros';
            if (!despesasPorTipo[tipo]) {
                despesasPorTipo[tipo] = { quantidade: 0, valor: 0, valorPago: 0 };
            }
            despesasPorTipo[tipo].quantidade++;
            despesasPorTipo[tipo].valor += valor;
            if (despesa.des_pago) {
                despesasPorTipo[tipo].valorPago += valor;
            }
        }

        // ==========================
        // 4. PROCESSAR COMISSÕES
        // ==========================

        let totalComissoes = 0;
        let totalComissoesPagas = 0;
        let totalComissoesPendentes = 0;
        let quantidadeComissoesPagas = 0;
        let quantidadeComissoesPendentes = 0;

        const comissoesPorDia = {};

        for (let comissao of comissoes) {
            const valor = parseFloat(comissao.com_valor || 0);
            totalComissoes += valor;

            if (comissao.com_paga) {
                totalComissoesPagas += valor;
                quantidadeComissoesPagas++;

                const dia = moment(comissao.com_paga_data || comissao.age_data).format('YYYY-MM-DD');
                comissoesPorDia[dia] = (comissoesPorDia[dia] || 0) + valor;
            } else {
                totalComissoesPendentes += valor;
                quantidadeComissoesPendentes++;
            }
        }

        // ==========================
        // 5. CALCULAR TOTAIS E LUCRO
        // ==========================

        const totalGastos = totalDespesasPagas + totalComissoesPagas;
        const totalGastosPendentes = totalDespesasPendentes + totalComissoesPendentes;
        const lucroLiquido = totalReceitaRecebida - totalGastos;
        const margemLucro = totalReceitaRecebida > 0 ? (lucroLiquido / totalReceitaRecebida) * 100 : 0;

        // ==========================
        // 6. EVOLUÇÃO TEMPORAL
        // ==========================

        const diasPeriodo = [];
        const evolucaoReceitas = [];
        const evolucaoDespesas = [];
        const evolucaoComissoes = [];
        const evolucaoLucro = [];

        if (dataDe && dataAte) {
            let dataAtual = moment(dataDe);
            const dataFinal = moment(dataAte);

            while (dataAtual.isSameOrBefore(dataFinal)) {
                const diaKey = dataAtual.format('YYYY-MM-DD');
                diasPeriodo.push(dataAtual.format('DD/MM'));

                const receita = receitaPorDia[diaKey] || 0;
                const despesa = despesasPorDia[diaKey] || 0;
                const comissao = comissoesPorDia[diaKey] || 0;
                const lucro = receita - despesa - comissao;

                evolucaoReceitas.push(receita);
                evolucaoDespesas.push(despesa);
                evolucaoComissoes.push(comissao);
                evolucaoLucro.push(lucro);

                dataAtual.add(1, 'day');
            }
        }

        // ==========================
        // 7. TOP CLIENTES
        // ==========================

        const topClientesArray = Object.keys(topClientes)
            .map(nome => ({ nome, valor: topClientes[nome] }))
            .sort((a, b) => b.valor - a.valor)
            .slice(0, 10);

        // ==========================
        // 8. FORMAS DE PAGAMENTO
        // ==========================

        const formasPagamentoArray = Object.keys(formasPagamentoMap)
            .map(forma => ({ forma, valor: formasPagamentoMap[forma] }))
            .filter(item => item.forma && item.forma !== 'null')
            .sort((a, b) => b.valor - a.valor);

        // ==========================
        // 9. TIPOS DE DESPESAS
        // ==========================

        const tiposDespesasArray = Object.keys(despesasPorTipo)
            .map(tipo => ({
                tipo,
                quantidade: despesasPorTipo[tipo].quantidade,
                valor: despesasPorTipo[tipo].valor,
                valorPago: despesasPorTipo[tipo].valorPago
            }))
            .filter(item => item.tipo && item.tipo !== 'null')
            .sort((a, b) => b.valor - a.valor);

        // ==========================
        // 9.1. FORMAS DE PAGAMENTO DAS DESPESAS
        // ==========================

        const formasPagamentoDespesasArray = Object.keys(formasPagamentoDespesas)
            .map(forma => ({ forma, valor: formasPagamentoDespesas[forma] }))
            .filter(item => item.forma && item.forma !== 'null')
            .sort((a, b) => b.valor - a.valor);

        // ==========================
        // 10. ÚLTIMOS REGISTROS
        // ==========================

        const ultimosRecebimentos = pagamentos
            .filter(p => p.pgt_data)
            .sort((a, b) => new Date(b.pgt_data) - new Date(a.pgt_data))
            .slice(0, 10)
            .map(p => ({
                pgt_id: p.pgt_id,
                cli_nome: p.cli_nome,
                pgt_valor: p.valorPago,
                fpg_name: p.fpg_name,
                pgt_data: p.pgt_data,
                age_data: p.age_data
            }));

        const ultimasDespesas = despesas
            .filter(d => d.des_pago)
            .slice(0, 10)
            .map(d => ({
                des_id: d.des_id,
                des_descricao: d.des_descricao,
                des_valor: d.des_valor,
                des_tipo: d.des_tipo,
                des_paga_data: d.des_paga_data,
                des_data: d.des_data
            }));

        // ==========================
        // 11. RESPOSTA FINAL
        // ==========================

        const data = {
            // Resumo Financeiro
            resumo: {
                totalReceitaBruta,
                totalReceitaRecebida,
                totalReceitaPendente,
                totalReceitaFutura,
                totalDespesas,
                totalDespesasPagas,
                totalDespesasPendentes,
                totalComissoes,
                totalComissoesPagas,
                totalComissoesPendentes,
                totalGastos,
                totalGastosPendentes,
                lucroLiquido,
                margemLucro: margemLucro.toFixed(2),
                saldo: lucroLiquido,
                resultado: lucroLiquido > 0 ? 'Positivo' : lucroLiquido < 0 ? 'Negativo' : 'Equilibrado'
            },

            // Contadores
            contadores: {
                pagamentosRecebidos: quantidadePagamentosRecebidos,
                pagamentosPendentes: quantidadePagamentosPendentes,
                agendamentosFuturos: quantidadeAgendamentosFuturos,
                agendamentosAgendados: quantidadeAgendados,
                agendamentosConfirmados: quantidadeConfirmados,
                despesasPagas: quantidadeDespesasPagas,
                despesasPendentes: quantidadeDespesasPendentes,
                comissoesPagas: quantidadeComissoesPagas,
                comissoesPendentes: quantidadeComissoesPendentes
            },

            // Evolução Temporal
            evolucao: {
                dias: diasPeriodo,
                receitas: evolucaoReceitas,
                despesas: evolucaoDespesas,
                comissoes: evolucaoComissoes,
                lucro: evolucaoLucro
            },

            // Top Clientes
            topClientes: topClientesArray,

            // Formas de Pagamento (Recebimentos)
            formasPagamento: formasPagamentoArray,

            // Formas de Pagamento (Despesas)
            formasPagamentoDespesas: formasPagamentoDespesasArray,

            // Tipos de Despesas
            tiposDespesas: tiposDespesasArray,

            // Últimos Registros
            ultimosRecebimentos,
            ultimasDespesas,

            // Dados Completos (para referência)
            dadosCompletos: {
                totalPagamentos: pagamentos.length,
                totalDespesasCount: despesas.length,
                totalComissoesCount: comissoes.length
            }
        };

        res.status(200).json(data);
    } catch (error) {
        console.error('Erro ao buscar dados financeiros', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/get/comissoes', async (req, res) => {
    try {
        const {
            dataDe = null,
            dataAte = null,
        } = req.query;

        const moment = require('moment');
        moment.locale('pt-br');
        const { getAgendamentos } = require('../utils/agendaUtils');

        // ==========================
        // 1. BUSCAR COMISSÕES
        // ==========================

        let query = `SELECT 
                        COMISSOES.*, 
                        User.fullName,
                        User.color,
                        AGENDAMENTO.age_data,
                        AGENDAMENTO.age_valor,
                        CLIENTES.cli_nome
                    FROM COMISSOES
                    JOIN User ON COMISSOES.fun_id = User.id
                    JOIN AGENDAMENTO ON COMISSOES.age_id = AGENDAMENTO.age_id
                    JOIN CLIENTES ON AGENDAMENTO.cli_id = CLIENTES.cli_id
                    WHERE 1 = 1`;

        if (dataDe) {
            const formattedDataDe = new Date(dataDe).toISOString().split('T')[0];
            query += ` AND DATE(COMISSOES.created_at) >= '${formattedDataDe}'`;
        }

        if (dataAte) {
            const formattedDataAte = new Date(dataAte).toISOString().split('T')[0];
            query += ` AND DATE(COMISSOES.created_at) <= '${formattedDataAte}'`;
        }

        query += ` ORDER BY COMISSOES.created_at DESC`;

        const comissoes = await dbQuery(query);
        const funcionarios = await dbQuery('SELECT * FROM User WHERE role = "tecnico" OR role = "tecnico-senior"');

        // Buscar detalhes dos agendamentos com serviços
        const ageIds = [...new Set(comissoes.map(c => c.age_id))];
        let agendamentosMap = {};

        if (ageIds.length > 0) {
            const agendamentosQuery = `SELECT * FROM AGENDAMENTO WHERE age_id IN (${ageIds.join(',')})`;
            const agendamentosCompletos = await getAgendamentos(agendamentosQuery, []);

            agendamentosCompletos.forEach(age => {
                agendamentosMap[age.age_id] = age;
            });
        }

        // ==========================
        // 2. PROCESSAR COMISSÕES
        // ==========================

        let totalComissoes = 0;
        let totalComissoesPagas = 0;
        let totalComissoesNaoPagas = 0;
        let valorTotalComissoes = 0;
        let valorTotalComissoesPagas = 0;
        let valorTotalComissoesNaoPagas = 0;

        const comissoesPorDia = {};
        const comissoesPorFuncionario = {};
        const formasPagamentoComissoes = {};

        for (let comissao of comissoes) {
            const valor = parseFloat(comissao.com_valor || 0);
            totalComissoes++;
            valorTotalComissoes += valor;

            // Comissões por funcionário
            if (!comissoesPorFuncionario[comissao.fullName]) {
                comissoesPorFuncionario[comissao.fullName] = {
                    fullName: comissao.fullName,
                    color: comissao.color,
                    valorPago: 0,
                    valorPagoQtd: 0,
                    valorNaoPago: 0,
                    valorNaoPagoQtd: 0,
                    total: 0,
                    fun_id: comissao.fun_id
                };
            }

            comissoesPorFuncionario[comissao.fullName].total += valor;

            if (comissao.com_paga) {
                totalComissoesPagas++;
                valorTotalComissoesPagas += valor;

                comissoesPorFuncionario[comissao.fullName].valorPago += valor;
                comissoesPorFuncionario[comissao.fullName].valorPagoQtd++;

                // Agrupar por dia usando created_at ou com_paga_data
                const dia = moment(comissao.com_paga_data || comissao.created_at).format('YYYY-MM-DD');
                comissoesPorDia[dia] = (comissoesPorDia[dia] || 0) + valor;

                // Formas de pagamento
                if (comissao.com_forma_pagamento) {
                    formasPagamentoComissoes[comissao.com_forma_pagamento] =
                        (formasPagamentoComissoes[comissao.com_forma_pagamento] || 0) + valor;
                }
            } else {
                totalComissoesNaoPagas++;
                valorTotalComissoesNaoPagas += valor;

                comissoesPorFuncionario[comissao.fullName].valorNaoPago += valor;
                comissoesPorFuncionario[comissao.fullName].valorNaoPagoQtd++;
            }
        }

        // ==========================
        // 3. EVOLUÇÃO TEMPORAL
        // ==========================

        const diasPeriodo = [];
        const evolucaoComissoesPagas = [];
        const evolucaoComissoesNaoPagas = [];

        if (dataDe && dataAte) {
            let dataAtual = moment(dataDe);
            const dataFinal = moment(dataAte);

            while (dataAtual.isSameOrBefore(dataFinal)) {
                const diaKey = dataAtual.format('YYYY-MM-DD');
                diasPeriodo.push(dataAtual.format('DD/MM'));

                const comissoesDia = comissoesPorDia[diaKey] || 0;
                evolucaoComissoesPagas.push(comissoesDia);

                dataAtual.add(1, 'day');
            }
        }

        // ==========================
        // 4. COMISSÕES POR FUNCIONÁRIO
        // ==========================

        const totalComissoesFun = Object.values(comissoesPorFuncionario)
            .sort((a, b) => b.total - a.total);

        // ==========================
        // 5. FORMAS DE PAGAMENTO
        // ==========================

        const formasPagamentoArray = Object.keys(formasPagamentoComissoes)
            .map(forma => ({ forma, valor: formasPagamentoComissoes[forma] }))
            .filter(item => item.forma && item.forma !== 'null')
            .sort((a, b) => b.valor - a.valor);

        // ==========================
        // 6. TICKET MÉDIO E MÉTRICAS
        // ==========================

        const ticketMedioPago = totalComissoesPagas > 0
            ? valorTotalComissoesPagas / totalComissoesPagas
            : 0;

        const ticketMedioTotal = totalComissoes > 0
            ? valorTotalComissoes / totalComissoes
            : 0;

        const taxaPagamento = totalComissoes > 0
            ? (totalComissoesPagas / totalComissoes) * 100
            : 0;

        // ==========================
        // 7. LISTA COMPLETA DE COMISSÕES
        // ==========================

        const comissoesDetalhadas = comissoes.map(c => {
            const agendamento = agendamentosMap[c.age_id];
            const servicos = agendamento?.servicos?.map(s => ({
                ser_nome: s.ser_nome,
                ser_descricao: s.ser_descricao,
                ser_valor: s.ser_valor,
                ser_quantity: s.ser_quantity || 1
            })) || [];

            return {
                com_id: c.com_id,
                com_valor: c.com_valor,
                com_paga: c.com_paga,
                com_paga_data: c.com_paga_data,
                com_forma_pagamento: c.com_forma_pagamento,
                com_descricao: c.com_descricao,
                created_at: c.created_at,
                fullName: c.fullName,
                fun_id: c.fun_id,
                cli_nome: c.cli_nome,
                age_id: c.age_id,
                age_data: c.age_data,
                age_valor: c.age_valor,
                servicos: servicos
            };
        });

        // ==========================
        // 8. RESPOSTA FINAL
        // ==========================

        const data = {
            // Resumo
            resumo: {
                totalComissoes,
                valorTotalComissoes,
                totalComissoesPagas,
                valorTotalComissoesPagas,
                totalComissoesNaoPagas,
                valorTotalComissoesNaoPagas,
                ticketMedioPago,
                ticketMedioTotal,
                taxaPagamento: taxaPagamento.toFixed(2)
            },

            // Evolução Temporal
            evolucao: {
                dias: diasPeriodo,
                comissoesPagas: evolucaoComissoesPagas
            },

            // Comissões por Funcionário
            comissoesPorFuncionario: totalComissoesFun,

            // Formas de Pagamento
            formasPagamento: formasPagamentoArray,

            // Lista completa
            comissoes: comissoesDetalhadas,

            // Dados dos funcionários
            funcionarios
        };

        res.status(200).json(data);
    } catch (error) {
        console.error('Erro ao buscar comissões', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/get/servicos', async (req, res) => {
    try {
        const {
            dataDe = null,
            dataAte = null,
        } = req.query;

        const moment = require('moment');
        moment.locale('pt-br');
        const { getAgendamentosSimple } = require('../utils/agendaUtils');

        // ==========================
        // 1. BUSCAR AGENDAMENTOS COM PAGAMENTOS ATENDIDOS NO PERÍODO
        // ==========================

        // Buscar agendamentos que têm pagamentos no período especificado
        // Usando created_at do PAGAMENTO como filtro (igual ao relatório financeiro)
        // IMPORTANTE: Deve ter serviços cadastrados (AXS ou AGENDAMENTO_X_SERVICOS)
        let queryAgendamentosComPagamento = `
            SELECT DISTINCT AGENDAMENTO.age_id
            FROM AGENDAMENTO
            JOIN PAGAMENTO ON AGENDAMENTO.age_id = PAGAMENTO.age_id
            WHERE AGENDAMENTO.ast_id = 3
            AND PAGAMENTO.pgt_data IS NOT NULL
            AND (
                EXISTS (SELECT 1 FROM AXS WHERE AXS.age_id = AGENDAMENTO.age_id)
                OR EXISTS (SELECT 1 FROM AGENDAMENTO_X_SERVICOS WHERE AGENDAMENTO_X_SERVICOS.age_id = AGENDAMENTO.age_id)
            )
        `;

        if (dataDe) {
            const formattedDataDe = new Date(dataDe).toISOString().split('T')[0];
            queryAgendamentosComPagamento += ` AND DATE(PAGAMENTO.created_at) >= '${formattedDataDe}'`;
        }

        if (dataAte) {
            const formattedDataAte = new Date(dataAte).toISOString().split('T')[0];
            queryAgendamentosComPagamento += ` AND DATE(PAGAMENTO.created_at) <= '${formattedDataAte}'`;
        }

        const ageIdsComPagamento = await dbQuery(queryAgendamentosComPagamento);

        if (ageIdsComPagamento.length === 0) {
            return res.status(200).json({
                totalServicosRealizados: 0,
                totalValorGerado: 0,
                ticketMedio: 0,
                servicoMaisRealizado: null,
                servicoMaisLucrativo: null,
                evolucaoServicos: [],
                servicosDetalhados: [],
                subservicosDetalhados: [],
                servicosPorFuncionario: [],
                funcionarios: [],
                statusAgendamentos: []
            });
        }

        // Buscar agendamentos completos com serviços
        const ageIds = ageIdsComPagamento.map(item => item.age_id);
        let queryAgendamentos = `SELECT * FROM AGENDAMENTO WHERE age_id IN (${ageIds.join(',')}) ORDER BY age_data DESC`;

        const agendamentos = await getAgendamentosSimple(queryAgendamentos, []);
        const funcionarios = await dbQuery('SELECT * FROM User WHERE podeAgendamento = 1');
        const statusAgendamentos = await dbQuery('SELECT * FROM AGENDAMENTO_STATUS');

        // ==========================
        // 1.5 BUSCAR PAGAMENTOS PARA CADA AGENDAMENTO
        // ==========================

        // Criar mapa de pagamentos por agendamento
        const pagamentosPorAgendamento = {};

        for (const agendamento of agendamentos) {
            // Buscar pagamentos deste agendamento que estejam no período
            let queryPagamentos = `
                SELECT pgt_id, pgt_data, pgt_json, created_at 
                FROM PAGAMENTO 
                WHERE age_id = ? 
                AND pgt_data IS NOT NULL
            `;

            const params = [agendamento.age_id];

            if (dataDe) {
                queryPagamentos += ` AND DATE(created_at) >= ?`;
                params.push(dataDe);
            }

            if (dataAte) {
                queryPagamentos += ` AND DATE(created_at) <= ?`;
                params.push(dataAte);
            }

            const pagamentos = await dbQuery(queryPagamentos, params);

            let valorPago = 0;
            for (const pgt of pagamentos) {
                const pgtJson = pgt.pgt_json ? JSON.parse(pgt.pgt_json) : [];
                for (const item of pgtJson) {
                    valorPago += parseFloat(item.pgt_valor || 0);
                }
            }

            pagamentosPorAgendamento[agendamento.age_id] = valorPago;
        }

        // ==========================
        // 2. AGREGAR DADOS POR SERVIÇO (PAI + SUBS + LEGACY)
        // ==========================

        let servicosPaiMap = {}; // Serviços PAI (com subs somados)
        let subsDetalhados = {}; // Subserviços detalhados
        let servicosPorData = {}; // Para evolução temporal
        let servicosPorFuncionario = {}; // Para tabela de técnicos

        let totalServicosRealizados = 0; // Quantidade: todos os status
        let totalValorGerado = 0; // Valor: apenas atendidos com pagamentos efetivos

        for (const agendamento of agendamentos) {
            const ageData = moment(agendamento.age_data).format('YYYY-MM-DD');
            const astId = agendamento.ast_id;
            const funId = agendamento.fun_id;
            const statusDescricao = statusAgendamentos.find(s => s.ast_id === astId)?.ast_descricao || 'Desconhecido';

            // Pegar valor PAGO do agendamento (não o valor teórico)
            const valorPagoAgendamento = pagamentosPorAgendamento[agendamento.age_id] || 0;

            // Calcular valor total dos serviços para distribuir proporcionalmente
            let valorTotalServicos = 0;
            for (const s of agendamento.servicos) {
                const sValor = parseFloat(s.ser_valor || 0);
                const sQtd = s.ser_quantity || 1;
                valorTotalServicos += sValor * sQtd;
            }

            // Processar cada serviço do agendamento
            for (const servico of agendamento.servicos) {
                const serNome = servico.ser_nome || 'Sem nome';
                const serValor = parseFloat(servico.ser_valor || 0);
                const serQuantity = servico.ser_quantity || 1;
                const serValorTeoricoTotal = serValor * serQuantity;

                // Calcular valor proporcional PAGO deste serviço
                // Todos os agendamentos aqui já são atendidos com pagamentos efetivados
                let serValorTotal = 0;
                if (valorTotalServicos > 0) {
                    // Distribuir o valor pago proporcionalmente
                    serValorTotal = (serValorTeoricoTotal / valorTotalServicos) * valorPagoAgendamento;
                } else if (valorPagoAgendamento > 0 && agendamento.servicos.length > 0) {
                    // Se o valor total dos serviços é 0 mas há pagamento,
                    // distribuir igualmente entre todos os serviços
                    serValorTotal = valorPagoAgendamento / agendamento.servicos.length;
                }

                const isOld = servico.isOld || false;
                const isSub = servico.isSub || false;
                const serPaiId = servico.ser_pai_id || servico.ser_id; // Se é sub, usa o pai_id, senão usa o próprio id

                // Determinar a chave do serviço PAI
                let ser_pai_key;
                if (isOld) {
                    ser_pai_key = `old_${servico.ser_id}`;
                } else {
                    ser_pai_key = `new_${serPaiId}`; // Sempre usa o ID do PAI
                }

                // Quantidade: sempre soma
                totalServicosRealizados += serQuantity;

                // Valor: soma o valor pago proporcional
                totalValorGerado += serValorTotal;

                // ==========================
                // 2.1 Agregar por SERVIÇO PAI (inclui subs)
                // ==========================
                if (!servicosPaiMap[ser_pai_key]) {
                    // Buscar nome do PAI se for sub
                    let nomePai = serNome;
                    if (isSub && serPaiId) {
                        const paiQuery = await dbQuery('SELECT ser_nome FROM SERVICOS_NEW WHERE ser_id = ?', [serPaiId]);
                        if (paiQuery.length > 0) {
                            nomePai = paiQuery[0].ser_nome;
                        }
                    }

                    servicosPaiMap[ser_pai_key] = {
                        ser_id: serPaiId,
                        ser_nome: nomePai,
                        ser_descricao: isOld ? 'Serviço Antigo' : '',
                        isOld: isOld,
                        quantidade: 0,
                        valorTotal: 0,
                        statusCount: {},
                        agendamentos: []
                    };

                    // Inicializar contadores de status
                    for (const status of statusAgendamentos) {
                        servicosPaiMap[ser_pai_key].statusCount[status.ast_descricao] = 0;
                    }
                }

                // Somar quantidade e valor ao PAI (inclui subs)
                servicosPaiMap[ser_pai_key].quantidade += serQuantity;
                servicosPaiMap[ser_pai_key].valorTotal += serValorTotal;
                servicosPaiMap[ser_pai_key].statusCount[statusDescricao] =
                    (servicosPaiMap[ser_pai_key].statusCount[statusDescricao] || 0) + serQuantity;

                // ==========================
                // 2.2 Agregar SUBSERVIÇOS detalhados (apenas subs)
                // ==========================
                if (isSub && servico.ser_sub_id) {
                    const sub_key = `sub_${servico.ser_sub_id}`;

                    if (!subsDetalhados[sub_key]) {
                        subsDetalhados[sub_key] = {
                            ser_sub_id: servico.ser_sub_id,
                            ser_pai_id: serPaiId,
                            ser_nome: serNome,
                            ser_descricao: servico.ser_descricao || '',
                            quantidade: 0,
                            valorTotal: 0,
                            statusCount: {}
                        };

                        // Inicializar contadores de status
                        for (const status of statusAgendamentos) {
                            subsDetalhados[sub_key].statusCount[status.ast_descricao] = 0;
                        }
                    }

                    subsDetalhados[sub_key].quantidade += serQuantity;
                    subsDetalhados[sub_key].valorTotal += serValorTotal;
                    subsDetalhados[sub_key].statusCount[statusDescricao] =
                        (subsDetalhados[sub_key].statusCount[statusDescricao] || 0) + serQuantity;
                }

                // ==========================
                // 2.3 Agregar por data (evolução)
                // ==========================
                if (!servicosPorData[ageData]) {
                    servicosPorData[ageData] = {
                        data: ageData,
                        quantidade: 0,
                        valorTotal: 0
                    };
                }

                // Quantidade: sempre soma
                servicosPorData[ageData].quantidade += serQuantity;

                // Valor: soma o valor pago proporcional
                servicosPorData[ageData].valorTotal += serValorTotal;

                // ==========================
                // 2.4 Agregar por funcionário
                // ==========================
                if (!servicosPorFuncionario[funId]) {
                    const funcionario = funcionarios.find(f => f.id === funId);
                    servicosPorFuncionario[funId] = {
                        fun_id: funId,
                        fun_nome: funcionario?.fullName || 'Desconhecido',
                        servicosRealizados: {},
                        quantidadeTotal: 0,
                        valorTotal: 0,
                        statusCount: {}
                    };

                    // Inicializar contadores de status
                    for (const status of statusAgendamentos) {
                        servicosPorFuncionario[funId].statusCount[status.ast_descricao] = 0;
                    }
                }

                // Usar a chave do PAI para funcionários também
                if (!servicosPorFuncionario[funId].servicosRealizados[ser_pai_key]) {
                    // Buscar nome do PAI
                    let nomePai = serNome;
                    if (isSub && serPaiId) {
                        const paiQuery = await dbQuery('SELECT ser_nome FROM SERVICOS_NEW WHERE ser_id = ?', [serPaiId]);
                        if (paiQuery.length > 0) {
                            nomePai = paiQuery[0].ser_nome;
                        }
                    }

                    servicosPorFuncionario[funId].servicosRealizados[ser_pai_key] = {
                        ser_nome: nomePai,
                        quantidade: 0,
                        valorTotal: 0,
                        statusCount: {}
                    };

                    // Inicializar contadores de status para este serviço
                    for (const status of statusAgendamentos) {
                        servicosPorFuncionario[funId].servicosRealizados[ser_pai_key].statusCount[status.ast_descricao] = 0;
                    }
                }

                // Quantidade: sempre soma
                servicosPorFuncionario[funId].servicosRealizados[ser_pai_key].quantidade += serQuantity;

                // Valor: soma o valor pago proporcional
                servicosPorFuncionario[funId].servicosRealizados[ser_pai_key].valorTotal += serValorTotal;

                servicosPorFuncionario[funId].servicosRealizados[ser_pai_key].statusCount[statusDescricao] =
                    (servicosPorFuncionario[funId].servicosRealizados[ser_pai_key].statusCount[statusDescricao] || 0) + serQuantity;

                // Quantidade: sempre soma
                servicosPorFuncionario[funId].quantidadeTotal += serQuantity;

                // Valor: soma o valor pago proporcional
                servicosPorFuncionario[funId].valorTotal += serValorTotal;

                servicosPorFuncionario[funId].statusCount[statusDescricao] =
                    (servicosPorFuncionario[funId].statusCount[statusDescricao] || 0) + serQuantity;
            }
        }

        // ==========================
        // 3. CONSOLIDAR SERVIÇOS LEGACY POR NOME
        // ==========================

        const servicosConsolidados = {};

        for (const [key, servico] of Object.entries(servicosPaiMap)) {
            if (servico.isOld) {
                // Normalizar nome (lowercase, remover espaços extras, singular/plural)
                const nomeNormalizado = servico.ser_nome
                    .toLowerCase()
                    .trim()
                    .replace(/s$/, ''); // Remove 's' do final para unificar singular/plural

                const keyLegacy = `legacy_${nomeNormalizado}`;

                if (!servicosConsolidados[keyLegacy]) {
                    servicosConsolidados[keyLegacy] = {
                        ser_id: 'legacy_' + nomeNormalizado,
                        ser_nome: servico.ser_nome.replace(/s$/, ''), // Nome no singular
                        ser_descricao: 'Serviço Antigo Consolidado',
                        isOld: true,
                        quantidade: 0,
                        valorTotal: 0,
                        statusCount: {}
                    };

                    // Inicializar status counts
                    for (const status of statusAgendamentos) {
                        servicosConsolidados[keyLegacy].statusCount[status.ast_descricao] = 0;
                    }
                }

                // Merge status counts
                for (const [status, count] of Object.entries(servico.statusCount)) {
                    servicosConsolidados[keyLegacy].statusCount[status] =
                        (servicosConsolidados[keyLegacy].statusCount[status] || 0) + count;
                }

                servicosConsolidados[keyLegacy].quantidade += servico.quantidade;
                servicosConsolidados[keyLegacy].valorTotal += servico.valorTotal;
            } else {
                // Serviços novos (pai + subs já somados) mantêm separados
                servicosConsolidados[key] = servico;
            }
        }

        // ==========================
        // 4. PREPARAR DADOS PARA O FRONTEND
        // ==========================

        // 4.1 Converter mapas em arrays e ordenar
        const servicosArray = Object.values(servicosConsolidados).sort((a, b) => b.quantidade - a.quantidade);
        const servicosPorFuncionarioArray = Object.values(servicosPorFuncionario)
            .map(func => ({
                ...func,
                servicosRealizados: Object.values(func.servicosRealizados).sort((a, b) => b.quantidade - a.quantidade)
            }))
            .sort((a, b) => b.quantidadeTotal - a.quantidadeTotal);

        // Subserviços detalhados em array
        const subsDetalhadosArray = Object.values(subsDetalhados).sort((a, b) => b.quantidade - a.quantidade);

        // 4.2 Preparar evolução temporal
        const evolucaoServicos = Object.values(servicosPorData).sort((a, b) => new Date(a.data) - new Date(b.data));

        // 4.3 Calcular métricas gerais
        const ticketMedio = totalServicosRealizados > 0 ? totalValorGerado / totalServicosRealizados : 0;
        const servicoMaisRealizado = servicosArray.length > 0 ? servicosArray[0] : null;
        const servicoMaisLucrativo = servicosArray.sort((a, b) => b.valorTotal - a.valorTotal)[0] || null;
        servicosArray.sort((a, b) => b.quantidade - a.quantidade); // Reordenar

        // ==========================
        // 5. RESPOSTA
        // ==========================

        res.status(200).json({
            // Métricas gerais
            totalServicosRealizados,
            totalValorGerado,
            ticketMedio,
            servicoMaisRealizado,
            servicoMaisLucrativo,

            // Evolução temporal
            evolucaoServicos,

            // Tabelas
            servicosDetalhados: servicosArray, // PAI com subs somados + legacy consolidado
            subservicosDetalhados: subsDetalhadosArray, // Subserviços individuais
            servicosPorFuncionario: servicosPorFuncionarioArray,

            // Dados auxiliares
            funcionarios,
            statusAgendamentos
        });
    } catch (error) {
        console.error('Erro ao buscar relatório de serviços', error);
        res.status(500).json({ error: error.message });
    }
});


router.get('/get/agendamentos', async (req, res) => {
    try {
        let {
            dataDe = null,
            dataAte = null
        } = req.query;

        if (!dataDe || !dataAte) {
            return res.status(400).json({ message: 'Parâmetros de data obrigatórios' });
        }

        // Formatar datas
        const formattedDataDe = moment(dataDe).format('YYYY-MM-DD');
        const formattedDataAte = moment(dataAte).format('YYYY-MM-DD');

        // Buscar agendamentos no período (EXCLUINDO BLOQUEIOS)
        let queryAgendamentos = `
            SELECT 
                AGENDAMENTO.*,
                AGENDAMENTO_STATUS.ast_descricao as status_nome
            FROM AGENDAMENTO
            JOIN AGENDAMENTO_STATUS ON AGENDAMENTO.ast_id = AGENDAMENTO_STATUS.ast_id
            WHERE AGENDAMENTO.age_data >= ? 
            AND AGENDAMENTO.age_data <= ?
            AND AGENDAMENTO.age_ativo = 1
            AND (AGENDAMENTO.age_type IS NULL OR AGENDAMENTO.age_type != 'bloqueio')
            ORDER BY AGENDAMENTO.age_data ASC
        `;

        const agendamentos = await dbQuery(queryAgendamentos, [formattedDataDe, formattedDataAte]);

        // Buscar clientes únicos
        const clienteIds = [...new Set(agendamentos.filter(a => a.cli_id).map(a => a.cli_id))];
        let clientesMap = {};

        if (clienteIds.length > 0) {
            const clientes = await dbQuery(`SELECT * FROM CLIENTES WHERE cli_Id IN (${clienteIds.join(',')})`);
            clientes.forEach(cli => {
                clientesMap[cli.cli_Id] = cli;
            });
        }

        // Buscar endereços únicos
        const enderecoIds = [...new Set(agendamentos.filter(a => a.age_endereco).map(a => a.age_endereco))];
        let enderecosMap = {};

        if (enderecoIds.length > 0) {
            const enderecos = await dbQuery(`SELECT * FROM ENDERECO WHERE end_id IN (${enderecoIds.join(',')})`);
            enderecos.forEach(end => {
                enderecosMap[end.end_id] = end;
            });
        }

        const funcionarioIds = [...new Set(agendamentos.filter(a => a.fun_id).map(a => a.fun_id))];
        let funcionariosMap = {};

        if (funcionarioIds.length > 0) {
            const funcionarios = await dbQuery(`SELECT * FROM User WHERE id IN (${funcionarioIds.join(',')})`);
            funcionarios.forEach(fun => {
                funcionariosMap[fun.id] = fun;
            });
        }

        // Buscar pagamentos dos agendamentos atendidos
        const ageIds = agendamentos.filter(a => a.ast_id === 3).map(a => a.age_id);
        let pagamentosMap = {};

        if (ageIds.length > 0) {
            const pagamentos = await dbQuery(`
                SELECT * FROM PAGAMENTO 
                WHERE age_id IN (${ageIds.join(',')})
                AND pgt_data IS NOT NULL
            `);

            pagamentos.forEach(pgt => {
                const pgtJson = pgt.pgt_json ? JSON.parse(pgt.pgt_json) : [];
                const valorPago = pgtJson.reduce((sum, item) => sum + parseFloat(item.pgt_valor || 0), 0);
                pagamentosMap[pgt.age_id] = valorPago;
            });
        }

        // === RESUMO GERAL ===
        const totalAgendamentos = agendamentos.length;
        let totalValorRecebido = 0;
        let totalValorPendente = 0;
        let totalValorFuturo = 0;

        // === EVOLUÇÃO POR DATA ===
        const evolucaoPorData = {};

        // === DADOS POR CIDADE ===
        const cidadesMap = {};

        // === DADOS POR BAIRRO ===
        const bairrosMap = {};

        // === DADOS POR CLIENTE ===
        const clientesStatsMap = {};

        // === DADOS POR TIPO DE AGENDAMENTO ===
        const tiposMap = {};

        // === DADOS POR CONTRATO ===
        const contratosMap = {};

        // Buscar informações completas dos contratos únicos (dos clientes)
        const contratoIds = [...new Set(agendamentos.filter(a => a.age_contrato).map(a => a.age_contrato))];
        let contratosInfoMap = {};

        if (contratoIds.length > 0) {
            // Buscar clientes que possuem contratos
            const clientesComContratos = await dbQuery(`
                SELECT cli_Id, cli_nome, cli_contratos 
                FROM CLIENTES 
                WHERE cli_contratos IS NOT NULL 
                AND cli_contratos != '[]'
                AND cli_Id IN (${clienteIds.join(',')})
            `);

            // Processar contratos de cada cliente
            clientesComContratos.forEach(cliente => {
                try {
                    const contratos = JSON.parse(cliente.cli_contratos || '[]');
                    contratos.forEach(contrato => {
                        if (contrato.numero && contratoIds.includes(contrato.numero.toString())) {
                            contratosInfoMap[contrato.numero.toString()] = {
                                ...contrato,
                                cliente: cliente.cli_nome
                            };
                        }
                    });
                } catch (e) {
                    console.error('Erro ao fazer parse de cli_contratos:', e);
                }
            });
        }

        // === DADOS POR STATUS ===
        const statusMap = {};

        // === DADOS POR FONTE ===
        const fontesMap = {};

        // Processar cada agendamento
        for (const agendamento of agendamentos) {
            const cliente = clientesMap[agendamento.cli_id];
            const endereco = enderecosMap[agendamento.age_endereco];
            const valorPago = pagamentosMap[agendamento.age_id] || 0;
            const ageData = moment(agendamento.age_data).format('YYYY-MM-DD');
            const ageValor = parseFloat(agendamento.age_valor || 0) - parseFloat(agendamento.age_desconto || 0);
            const isAtendido = agendamento.ast_id === 3;
            const isAgendadoOuConfirmado = agendamento.ast_id === 1 || agendamento.ast_id === 2;
            const isPago = valorPago > 0;
            const funcionario = [funcionariosMap[agendamento.fun_id]] || null;
            const funcionarioNome = funcionario ? funcionario?.fullName : null;

            agendamento.funcionario = funcionario;
            
            // Evolução por data
            if (!evolucaoPorData[ageData]) {
                evolucaoPorData[ageData] = {
                    data: ageData,
                    quantidade: 0,
                    valorRecebido: 0
                };
            }
            evolucaoPorData[ageData].quantidade += 1;
            if (isAtendido && isPago) {
                evolucaoPorData[ageData].valorRecebido += valorPago;
            }

            // Total recebido/pendente/futuro
            if (isAtendido) {
                if (isPago) {
                    totalValorRecebido += valorPago;
                } else {
                    totalValorPendente += ageValor;
                }
            } else if (isAgendadoOuConfirmado) {
                totalValorFuturo += ageValor;
            }

            // Por cidade
            if (endereco && endereco.end_cidade) {
                const cidadeKey = endereco.end_cidade.trim().toLowerCase();
                const cidadeNome = endereco.end_cidade.trim().charAt(0).toUpperCase() + endereco.end_cidade.trim().slice(1).toLowerCase();

                if (!cidadesMap[cidadeKey]) {
                    cidadesMap[cidadeKey] = {
                        cidade: cidadeNome,
                        quantidade: 0,
                        valorRecebido: 0
                    };
                }
                cidadesMap[cidadeKey].quantidade += 1;
                if (isAtendido && isPago) {
                    cidadesMap[cidadeKey].valorRecebido += valorPago;
                }
            }

            // Por bairro
            if (endereco && endereco.end_bairro) {
                const bairroKey = endereco.end_bairro.trim();

                if (!bairrosMap[bairroKey]) {
                    bairrosMap[bairroKey] = {
                        bairro: bairroKey,
                        quantidade: 0,
                        valorRecebido: 0
                    };
                }
                bairrosMap[bairroKey].quantidade += 1;
                if (isAtendido && isPago) {
                    bairrosMap[bairroKey].valorRecebido += valorPago;
                }
            }

            // Por cliente
            if (cliente && cliente.cli_nome) {
                const cliKey = cliente.cli_Id;

                if (!clientesStatsMap[cliKey]) {
                    clientesStatsMap[cliKey] = {
                        cli_id: cliente.cli_Id,
                        cliente: cliente.cli_nome,
                        quantidade: 0,
                        valorRecebido: 0
                    };
                }
                clientesStatsMap[cliKey].quantidade += 1;
                if (isAtendido && isPago) {
                    clientesStatsMap[cliKey].valorRecebido += valorPago;
                }
            }

            // Por tipo de agendamento
            const tipoKey = agendamento.age_type || 'servico';
            const statusNome = statusNomes.find(status => status.ast_id === agendamento.ast_id)?.ast_descricao || 'Indefinido';

            if (!tiposMap[tipoKey]) {
                tiposMap[tipoKey] = {
                    tipo: tipoKey,
                    quantidade: 0,
                    valorRecebido: 0,
                    statusCount: {}
                };
            }
            tiposMap[tipoKey].quantidade += 1;

            // Contagem por status
            if (!tiposMap[tipoKey].statusCount[statusNome]) {
                tiposMap[tipoKey].statusCount[statusNome] = 0;
            }
            tiposMap[tipoKey].statusCount[statusNome] += 1;

            if (isAtendido && isPago) {
                tiposMap[tipoKey].valorRecebido += valorPago;
            }

            // Por contrato
            if (agendamento.age_contrato) {
                const contratoKey = agendamento.age_contrato;
                const contratoInfo = contratosInfoMap[contratoKey];

                console.log("contratoInfo", contratosInfoMap);

                if (!contratosMap[contratoKey]) {
                    contratosMap[contratoKey] = {
                        contrato: contratoKey,
                        quantidade: 0,
                        valorRecebido: 0,
                        // Informações do contrato (do registro do contrato, não dos agendamentos)
                        contratoInfo: contratoInfo ? contratoInfo : null
                    };
                }
                contratosMap[contratoKey].quantidade += 1;
                contratosMap[contratoKey].agendamentos = [
                    ...(contratosMap[contratoKey].agendamentos || []),
                    agendamento
                ];
                if (isAtendido && isPago) {
                    contratosMap[contratoKey].valorRecebido += valorPago;
                }
            }

            // Por status
            const statusKey = agendamento.status_nome || 'Não informado';
            if (!statusMap[statusKey]) {
                statusMap[statusKey] = {
                    status: statusKey,
                    quantidade: 0,
                    valorRecebido: 0,
                    valorFuturo: 0
                };
            }
            statusMap[statusKey].quantidade += 1;
            
            // Adicionar valor baseado no status
            if (isAtendido && isPago) {
                statusMap[statusKey].valorRecebido += valorPago;
            } else if (isAgendadoOuConfirmado) {
                statusMap[statusKey].valorFuturo += ageValor;
            }

            // Por fonte
            if (agendamento.age_fonte) {
                const fonteKey = agendamento.age_fonte;
                if (!fontesMap[fonteKey]) {
                    fontesMap[fonteKey] = {
                        fonte: fonteKey,
                        quantidade: 0,
                        valorRecebido: 0,
                        valorFuturo: 0
                    };
                }
                fontesMap[fonteKey].quantidade += 1;
                if (isAtendido && isPago) {
                    fontesMap[fonteKey].valorRecebido += valorPago;
                } else if (isAgendadoOuConfirmado) {
                    fontesMap[fonteKey].valorFuturo += ageValor;
                }
            }
        }

        // Converter maps para arrays e ordenar
        const evolucaoArray = Object.values(evolucaoPorData).sort((a, b) =>
            moment(a.data).valueOf() - moment(b.data).valueOf()
        );

        const cidadesArray = Object.values(cidadesMap).sort((a, b) => b.quantidade - a.quantidade);
        const bairrosArray = Object.values(bairrosMap).sort((a, b) => b.quantidade - a.quantidade);
        const clientesArray = Object.values(clientesStatsMap).sort((a, b) => b.quantidade - a.quantidade);
        const tiposArray = Object.values(tiposMap).sort((a, b) => b.quantidade - a.quantidade);
        const contratosArray = Object.values(contratosMap).sort((a, b) => b.quantidade - a.quantidade);
        const statusArray = Object.values(statusMap).sort((a, b) => b.quantidade - a.quantidade);
        const fontesArray = Object.values(fontesMap).sort((a, b) => b.quantidade - a.quantidade);

        // Estatísticas por status específicos
        const qtdAtendidos = agendamentos.filter(a => a.ast_id === 3).length;
        const qtdConfirmados = agendamentos.filter(a => a.ast_id === 2).length;
        const qtdCancelados = agendamentos.filter(a => a.ast_id === 6).length;
        const qtdRetrabalhos = agendamentos.filter(a => a.age_retrabalho === 1).length;

        // Estatísticas de contratos (DOS CONTRATOS, não dos agendamentos)
        // Buscar TODOS os contratos dos clientes no período
        const todosClientesComContratos = await dbQuery(`
            SELECT DISTINCT cli_Id, cli_contratos 
            FROM CLIENTES 
            WHERE cli_contratos IS NOT NULL 
            AND cli_contratos != '[]'
            AND cli_Id IN (${clienteIds.join(',')})
        `);

        let todosContratos = [];
        todosClientesComContratos.forEach(cliente => {
            try {
                const contratos = JSON.parse(cliente.cli_contratos || '[]');
                todosContratos = [...todosContratos, ...contratos];
            } catch (e) {
                console.error('Erro ao fazer parse de cli_contratos:', e);
            }
        });

        const qtdContratosTotal = todosContratos.length;
        const valorTotalContratos = todosContratos.reduce((sum, contrato) =>
            sum + parseFloat(contrato.valor || 0), 0
        );

        // Resposta final
        const response = {
            // Resumo
            resumo: {
                totalAgendamentos,
                totalValorRecebido,
                totalValorPendente,
                totalValorFuturo,
                ticketMedio: totalAgendamentos > 0 ? totalValorRecebido / qtdAtendidos : 0,
                qtdAtendidos,
                qtdConfirmados,
                qtdCancelados,
                qtdRetrabalhos
            },

            // Resumo de contratos
            resumoContratos: {
                qtdContratos: qtdContratosTotal,
                valorTotalContratos: valorTotalContratos
            },

            // Evolução
            evolucao: evolucaoArray,

            // Detalhamentos
            cidades: cidadesArray,
            bairros: bairrosArray,
            clientes: clientesArray,
            tiposAgendamento: tiposArray,
            contratos: contratosArray,
            status: statusArray,
            fontes: fontesArray
        };

        res.status(200).json(response);
    } catch (error) {
        console.error('Erro ao buscar relatório de agendamentos:', error);
        res.status(500).json({ message: error.message });
    }
});

router.get('/list-servicos', async (req, res) => {
    let {
        q = '',
        dataDe = null,
        dataAte = null,
        sortBy = '',
        itemsPerPage = 10,
        page = 1,
        orderBy = 'asc'
    } = req.query;

    const offset = (page - 1) * itemsPerPage;

    let query = `SELECT * FROM SERVICOS WHERE 1 = 1 AND ser_ativo = 1`;

    if (q) {
        query += ` AND (
            ser_nome LIKE '%${q}%' OR 
            ser_descricao LIKE '%${q}%' OR 
            ser_valor LIKE '%${q}%'
        )`;
    }

    if (sortBy) {
        query += ` ORDER BY ${sortBy} ${orderBy}`;
    } else {
        query += ` ORDER BY ser_nome ASC`;
    }

    query += ` LIMIT ${offset}, ${itemsPerPage}`;

    try {
        let totalServicos = await dbQuery(`SELECT COUNT(*) AS total FROM SERVICOS WHERE ser_ativo = 1`);

        const servicos = await dbQuery(query);

        for (let servico of servicos) {
            let qtdAtendidos = 0;
            let axs = await dbQuery(`SELECT * FROM AGENDAMENTO_X_SERVICOS WHERE ser_id = ${servico.ser_id}`);

            for (let ax of axs) {
                let agesQuery = `SELECT * FROM AGENDAMENTO WHERE age_id = ${ax.age_id}`;
                if (dataDe && dataAte) {
                    dataDe = new Date(dataDe).toISOString().split('T')[0];
                    dataAte = new Date(dataAte).toISOString().split('T')[0];
                    agesQuery += ` AND age_data >= '${dataDe}' AND age_data <= '${dataAte}'`;
                }
                let ages = await dbQuery(agesQuery);
                if (ages.length > 0) {
                    qtdAtendidos += ax.ser_quantity;
                }
            }

            servico.qtdAtendidos = qtdAtendidos;
        }

        let juntarServicos = [];

        // Juntar serviços que tenham o mesmo nome
        for (let servico of servicos) {
            let index = juntarServicos.findIndex(juntarServico => juntarServico.ser_nome == servico.ser_nome);
            if (index == -1) {
                juntarServicos.push(servico);
            } else {
                juntarServicos[index].qtdAtendidos += servico.qtdAtendidos;
            }
        }


        let data = {
            servicos: juntarServicos,
            totalServicos: totalServicos[0].total
        };

        res.status(200).json(data);
    } catch (error) {
        console.error('Erro ao buscar serviços', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/list-servicos-f', async (req, res) => {
    const {
        f = null,
        dataDe = null,
        dataAte = null,
        sortBy = '',
        orderBy = 'asc'
    } = req.query;

    const formattedDataDe = dataDe ? new Date(dataDe).toISOString().split('T')[0] : null;
    const formattedDataAte = dataAte ? new Date(dataAte).toISOString().split('T')[0] : null;

    let agesQuery = `SELECT * FROM AGENDAMENTO WHERE 1 = 1`;

    if (formattedDataDe && formattedDataAte) {
        agesQuery += ` AND age_data >= '${formattedDataDe}' AND age_data <= '${formattedDataAte}'`;
    }

    if (f) {
        agesQuery += ` AND fun_id = ${f}`;
    }

    if (sortBy) {
        agesQuery += ` ORDER BY ${sortBy} ${orderBy}`;
    } else {
        agesQuery += ` ORDER BY age_data ASC`;
    }

    try {
        const agendamentos = await dbQuery(agesQuery);

        for (let agendamento of agendamentos) {
            agendamento.cliente = await dbQuery('SELECT * FROM CLIENTES WHERE cli_id = ?', [agendamento.cli_id]);
            agendamento.endereco = agendamento.age_endereco ? await dbQuery('SELECT * FROM ENDERECO WHERE end_id = ?', [agendamento.age_endereco])
                : await dbQuery('SELECT * FROM ENDERECO WHERE cli_id = ?', [agendamento.cli_id]);

            let axs = await dbQuery(`SELECT * FROM AGENDAMENTO_X_SERVICOS WHERE age_id = ${agendamento.age_id}`);

            let servicos = [];

            for (let ax of axs) {
                let servico = await dbQuery('SELECT * FROM SERVICOS WHERE ser_id = ?', [ax.ser_id]);
                if (servico.length > 0) {
                    servico[0].qtdAtendidos = ax.ser_quantity;
                    servico[0].ser_quantity = ax.ser_quantity;
                    servicos.push(servico[0]);
                }
            }

            agendamento.servicos = servicos;
        }

        let data = {
            agendamentos,
            totalAgendamentos: agendamentos.length
        };

        res.status(200).json(data);
    } catch (error) {
        console.error('Erro ao buscar serviços', error);
        res.status(500).json(error);
    }
});

// Rota de impressão de saídas removida - funcionalidade descontinuada

router.post('/print/receber', async (req, res) => {
    const {
        dataDe = null,
        dataAte = null,
    } = req.query;

    if (!dataDe || !dataAte) {
        return res.status(400).json({ message: 'Parâmetros inválidos' });
    }

    const formattedDataDe = dataDe ? new Date(dataDe).toISOString().split('T')[0] : null;
    const formattedDataAte = dataAte ? new Date(dataAte).toISOString().split('T')[0] : null;

    try {
        let query = `SELECT DISTINCT
                        PAGAMENTO.*,
                        User.id AS user_id,
                        User.fullName AS user_fullName,
                        User.email AS user_email,
                        AGENDAMENTO.*,
                        CLIENTES.*,
                        (
                            SELECT JSON_ARRAYAGG(JSON_OBJECT(
                                'ser_id', SERVICOS.ser_id,
                                'ser_nome', SERVICOS.ser_nome,
                                'ser_descricao', SERVICOS.ser_descricao,
                                'ser_valor', SERVICOS.ser_valor
                            ))
                            FROM AGENDAMENTO_X_SERVICOS
                            JOIN SERVICOS ON AGENDAMENTO_X_SERVICOS.ser_id = SERVICOS.ser_id
                            WHERE AGENDAMENTO_X_SERVICOS.age_id = AGENDAMENTO.age_id
                        ) AS servicos
                    FROM PAGAMENTO
                    JOIN AGENDAMENTO ON PAGAMENTO.age_id = AGENDAMENTO.age_id
                    JOIN User ON AGENDAMENTO.fun_id = User.id
                    JOIN CLIENTES ON AGENDAMENTO.cli_id = CLIENTES.cli_id
                    WHERE 1 = 1 AND AGENDAMENTO.age_data >= '${formattedDataDe}' AND AGENDAMENTO.age_data <= '${formattedDataAte}'
                    ORDER BY AGENDAMENTO.age_data DESC`;

        const pagamentos = await dbQuery(query);

        for (let i = 0; i < pagamentos.length; i++) {
            pagamentos[i].cliente = pagamentos[i].cli_nome;
            let pags = pagamentos[i].pgt_json ? JSON.parse(pagamentos[i].pgt_json) : [];
            let fpg_names = [];
            for (let pag of pags) {

                let forma = await dbQuery(`SELECT * FROM FORMAS_PAGAMENTO WHERE fpg_id = ${pag.fpg_id}`);
                fpg_names.push(forma.length > 0 ? forma[0].fpg_descricao : 'Dinheiro');
            }

            pagamentos[i].fpg_name = fpg_names.join(', ');
        }

        let totalRecebimento = pagamentos.reduce((acc, curr) => acc + curr.pgt_valor, 0);
        let totalNaoPago = pagamentos.filter(pagamento => !pagamento.pgt_data).reduce((acc, curr) => acc + curr.pgt_valor, 0);
        let totalPago = totalRecebimento - totalNaoPago;

        let dataDeText = dataDe ? new Date(dataDe).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
        let dataAteText = dataAte ? new Date(dataAte).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '';

        let data = {
            mesText: dataDeText == dataAteText ? `de ${dataDeText}` : `de ${dataDeText} até ${dataAteText}`,
            recebimentos: pagamentos,
            dataRelatorio: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            totalRecebimentos: pagamentos.length,
            valorTotalRecebimentos: totalRecebimento,
            valorTotalNaoPago: totalNaoPago,
            valorTotalPago: totalPago
        }

        const pdf = await createRelatorioReceber(data);

        let url = `/download/docs/relatorios/${pdf.fileName}`;

        res.status(200).json(url);
    } catch (error) {
        console.error('Erro ao buscar dados financeiros', error)
        res.status(500).json(error);
    }
});

router.post('/print/comissoes', async (req, res) => {
    const {
        dataDe = null,
        dataAte = null,
        fun_id = null,
    } = req.body;

    if (!dataDe || !dataAte || !fun_id) {
        return res.status(400).json({ message: 'Parâmetros inválidos' });
    }

    const formattedDataDe = dataDe ? new Date(dataDe).toISOString().split('T')[0] : null;
    const formattedDataAte = dataAte ? new Date(dataAte).toISOString().split('T')[0] : null;

    try {
        const { getAgendamentos } = require('../utils/agendaUtils');

        // Buscar funcionário
        const funcionarioQuery = await dbQuery('SELECT * FROM User WHERE id = ?', [fun_id]);
        if (!funcionarioQuery.length) {
            return res.status(404).json({ message: 'Funcionário não encontrado' });
        }
        const funcionario = funcionarioQuery[0];

        // Buscar comissões do funcionário
        let query = `SELECT 
                        COMISSOES.*, 
                        AGENDAMENTO.age_data,
                        AGENDAMENTO.age_valor,
                        CLIENTES.cli_nome
                    FROM COMISSOES
                    JOIN AGENDAMENTO ON COMISSOES.age_id = AGENDAMENTO.age_id
                    JOIN CLIENTES ON AGENDAMENTO.cli_id = CLIENTES.cli_id
                    WHERE COMISSOES.fun_id = ${fun_id}
                    AND DATE(COMISSOES.created_at) >= '${formattedDataDe}' 
                    AND DATE(COMISSOES.created_at) <= '${formattedDataAte}'
                    ORDER BY COMISSOES.created_at DESC`;

        const comissoes = await dbQuery(query);

        // Buscar agendamentos com serviços
        const ageIds = [...new Set(comissoes.map(c => c.age_id))];
        let agendamentosMap = {};

        if (ageIds.length > 0) {
            const agendamentosQuery = `SELECT * FROM AGENDAMENTO WHERE age_id IN (${ageIds.join(',')})`;
            const agendamentosCompletos = await getAgendamentos(agendamentosQuery, []);

            agendamentosCompletos.forEach(age => {
                agendamentosMap[age.age_id] = age;
            });
        }

        // Mapear comissões com detalhes completos
        const comissoesDetalhadas = comissoes.map(c => {
            const agendamento = agendamentosMap[c.age_id];
            const servicos = agendamento?.servicos?.map(s => ({
                ser_nome: s.ser_nome,
                ser_descricao: s.ser_descricao,
                ser_valor: s.ser_valor,
                ser_quantity: s.ser_quantity || 1
            })) || [];

            return {
                com_id: c.com_id,
                com_valor: c.com_valor,
                com_paga: c.com_paga,
                com_paga_data: c.com_paga_data,
                com_forma_pagamento: c.com_forma_pagamento,
                created_at: c.created_at,
                cli_nome: c.cli_nome,
                age_id: c.age_id,
                age_data: c.age_data,
                age_valor: c.age_valor,
                servicos: servicos
            };
        });

        let dataDeText = dataDe ? new Date(dataDe).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
        let dataAteText = dataAte ? new Date(dataAte).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '';

        let data = {
            mesText: dataDeText == dataAteText ? `de ${dataDeText}` : `de ${dataDeText} até ${dataAteText}`,
            funcionario: funcionario.fullName,
            comissoes: comissoesDetalhadas,
            dataRelatorio: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            totalComissoes: comissoes.length,
            valorTotalComissoes: comissoes.reduce((acc, curr) => acc + curr.com_valor, 0),
            valorTotalPago: comissoes.filter(comissao => comissao.com_paga).reduce((acc, curr) => acc + curr.com_valor, 0),
            valorTotalNaoPago: comissoes.filter(comissao => !comissao.com_paga).reduce((acc, curr) => acc + curr.com_valor, 0),
        }

        const pdf = await createRelatorioComissoes(data);

        res.status(200).json({ url: `/download/docs/relatorios/${pdf.fileName}` });
    } catch (error) {
        console.error('Erro ao gerar relatório de comissões', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/print/servico-tecnico', async (req, res) => {
    const {
        f = null,
        dataDe = null,
        dataAte = null,
        sortBy = '',
        orderBy = 'asc'
    } = req.body;

    const formattedDataDe = dataDe ? new Date(dataDe).toISOString().split('T')[0] : null;
    const formattedDataAte = dataAte ? new Date(dataAte).toISOString().split('T')[0] : null;

    let agesQuery = `SELECT * FROM AGENDAMENTO WHERE ast_id = 3`;

    if (formattedDataDe && formattedDataAte) {
        agesQuery += ` AND age_data >= '${formattedDataDe}' AND age_data <= '${formattedDataAte}'`;
    }

    if (f) {
        agesQuery += ` AND fun_id = ${f}`;
    }

    if (sortBy) {
        agesQuery += ` ORDER BY ${sortBy} ${orderBy}`;
    } else {
        agesQuery += ` ORDER BY age_data DESC`;
    }

    try {
        const agendamentos = await dbQuery(agesQuery);

        for (let agendamento of agendamentos) {
            agendamento.cliente = await dbQuery('SELECT * FROM CLIENTES WHERE cli_id = ?', [agendamento.cli_id]);
            agendamento.endereco = agendamento.age_endereco ? await dbQuery('SELECT * FROM ENDERECO WHERE end_id = ?', [agendamento.age_endereco])
                : await dbQuery('SELECT * FROM ENDERECO WHERE cli_id = ?', [agendamento.cli_id]);

            let axs = await dbQuery(`SELECT * FROM AGENDAMENTO_X_SERVICOS WHERE age_id = ${agendamento.age_id}`);

            let servicos = [];

            for (let ax of axs) {
                let servico = await dbQuery('SELECT * FROM SERVICOS WHERE ser_id = ?', [ax.ser_id]);
                if (servico.length > 0) {
                    servico[0].qtdAtendidos = 1;
                    servicos.push(servico[0]);
                }
            }

            agendamento.servicos = servicos;
        }

        let dataDeText = dataDe ? new Date(dataDe).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
        let dataAteText = dataAte ? new Date(dataAte).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '';

        let tecnico = await dbQuery(`SELECT * FROM User WHERE id = ${f}`);

        let quantidadeServicosAtendidos = agendamentos.reduce((acc, curr) => acc + curr.servicos.length, 0);
        let valorTotalServicosAtendidos = agendamentos.reduce((acc, curr) => acc + curr.servicos.reduce((acc, curr) => acc + curr.ser_valor, 0), 0);
        let valorTotalAgendamentos = agendamentos.reduce((acc, curr) => acc + curr.age_valor, 0);

        let data = {
            mesText: dataDeText == dataAteText ? `de ${dataDeText}` : `de ${dataDeText} até ${dataAteText}`,
            agendamentos,
            tecnico: tecnico[0].fullName,
            dataRelatorio: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            totalServicosAtendidos: quantidadeServicosAtendidos,
            valorTotalServicosAtendidos,
            valorTotalAgendamentos
        };

        const pdf = await createRelatorioServicosTecnicos(data);

        let url = `/download/docs/relatorios/${pdf.fileName}`;

        res.status(200).json(url);
    } catch (error) {
        console.error('Erro ao buscar serviços', error);
        res.status(500).json(error);
    }
});

// Endpoint para relatório de CRM
router.get('/get/crm', async (req, res) => {
    try {
        const {
            dataDe = null,
            dataAte = null,
        } = req.query;

        // Construir filtros de data
        let dataFilter = '';
        let dataParams = [];
        
        if (dataDe && dataAte) {
            dataFilter = ' AND DATE(created_at) BETWEEN ? AND ?';
            dataParams = [dataDe, dataAte];
        }

        // 1. Buscar todos os negócios
        const negocios = await dbQuery(`SELECT * FROM Negocios WHERE 1=1 ${dataFilter}`, dataParams);
        
        // 2. Buscar todos os funis
        const funis = await dbQuery('SELECT * FROM Funis ORDER BY ordem ASC');
        
        // 3. Estatísticas gerais
        const totalNegocios = negocios.length;
        const valorTotalNegocios = negocios.reduce((acc, n) => acc + (n.valor || 0), 0);
        const negociosGanhos = negocios.filter(n => n.status === 'Ganho').length;
        const negociosPerdidos = negocios.filter(n => n.status === 'Perdido').length;
        const negociosPendentes = negocios.filter(n => n.status === 'Pendente').length;
        
        const valorGanho = negocios.filter(n => n.status === 'Ganho').reduce((acc, n) => acc + (n.valor || 0), 0);
        const valorPerdido = negocios.filter(n => n.status === 'Perdido').reduce((acc, n) => acc + (n.valor || 0), 0);
        const valorPendente = negocios.filter(n => n.status === 'Pendente').reduce((acc, n) => acc + (n.valor || 0), 0);
        
        const taxaAprovacao = totalNegocios > 0 ? ((negociosGanhos / totalNegocios) * 100).toFixed(2) : 0;
        const taxaPerda = totalNegocios > 0 ? ((negociosPerdidos / totalNegocios) * 100).toFixed(2) : 0;
        
        // 4. Dados por etapa do funil
        const dadosPorEtapa = [];
        for (const funil of funis) {
            const negociosDaEtapa = negocios.filter(n => n.etapaId === funil.id);
            const valorDaEtapa = negociosDaEtapa.reduce((acc, n) => acc + (n.valor || 0), 0);
            
            dadosPorEtapa.push({
                etapaId: funil.id,
                etapaNome: funil.nome,
                probabilidade: funil.probabilidade,
                quantidade: negociosDaEtapa.length,
                valor: valorDaEtapa,
                percentual: totalNegocios > 0 ? ((negociosDaEtapa.length / totalNegocios) * 100).toFixed(2) : 0
            });
        }
        
        // 5. Negócios criados por data (últimos 30 dias ou período selecionado)
        const negociosPorDia = {};
        negocios.forEach(n => {
            const data = moment(n.created_at).format('YYYY-MM-DD');
            if (!negociosPorDia[data]) {
                negociosPorDia[data] = { quantidade: 0, valor: 0 };
            }
            negociosPorDia[data].quantidade++;
            negociosPorDia[data].valor += n.valor || 0;
        });
        
        const negociosPorDiaArray = Object.keys(negociosPorDia).map(data => ({
            data,
            quantidade: negociosPorDia[data].quantidade,
            valor: negociosPorDia[data].valor
        })).sort((a, b) => new Date(a.data) - new Date(b.data));
        
        // 6. Top 10 negócios por valor
        const top10Negocios = negocios
            .sort((a, b) => (b.valor || 0) - (a.valor || 0))
            .slice(0, 10)
            .map(n => ({
                id: n.id,
                title: n.title,
                valor: n.valor,
                status: n.status,
                created_at: n.created_at
            }));
        
        // 7. Tempo médio por etapa
        const tempoMedioPorEtapa = [];
        for (const funil of funis) {
            const negociosDaEtapa = negocios.filter(n => n.etapaId === funil.id && n.status !== 'Pendente');
            let tempoTotal = 0;
            
            negociosDaEtapa.forEach(n => {
                const inicio = new Date(n.created_at);
                const fim = n.data_fechamento ? new Date(n.data_fechamento) : new Date();
                const diferenca = Math.floor((fim - inicio) / (1000 * 60 * 60 * 24)); // dias
                tempoTotal += diferenca;
            });
            
            const tempoMedio = negociosDaEtapa.length > 0 ? Math.floor(tempoTotal / negociosDaEtapa.length) : 0;
            
            tempoMedioPorEtapa.push({
                etapaId: funil.id,
                etapaNome: funil.nome,
                tempoMedio // em dias
            });
        }
        
        // 8. Motivos de perda
        const motivosPerda = {};
        negocios.filter(n => n.status === 'Perdido' && n.motivoPerdido).forEach(n => {
            const motivo = n.motivoPerdido || 'Não informado';
            if (!motivosPerda[motivo]) {
                motivosPerda[motivo] = 0;
            }
            motivosPerda[motivo]++;
        });
        
        const motivosPerdaArray = Object.keys(motivosPerda).map(motivo => ({
            motivo,
            quantidade: motivosPerda[motivo]
        })).sort((a, b) => b.quantidade - a.quantidade);

        res.status(200).json({
            estatisticas: {
                totalNegocios,
                valorTotalNegocios,
                negociosGanhos,
                negociosPerdidos,
                negociosPendentes,
                valorGanho,
                valorPerdido,
                valorPendente,
                taxaAprovacao,
                taxaPerda
            },
            dadosPorEtapa,
            negociosPorDia: negociosPorDiaArray,
            top10Negocios,
            tempoMedioPorEtapa,
            motivosPerda: motivosPerdaArray
        });
    } catch (error) {
        console.error('Erro ao buscar relatório CRM:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para relatório de Atendimento
router.get('/get/atendimento', async (req, res) => {
    try {
        const {
            dataDe = null,
            dataAte = null,
        } = req.query;

        // Construir filtros de data
        let dataFilter = '';
        let dataParams = [];
        
        if (dataDe && dataAte) {
            dataFilter = ' AND DATE(inicio_conversa) BETWEEN ? AND ?';
            dataParams = [dataDe, dataAte];
        }

        // 1. Buscar todas as conversas
        const conversas = await dbQuery(`SELECT * FROM FlowConversations WHERE 1=1 ${dataFilter}`, dataParams);
        
        // 2. Buscar estatísticas de fluxos
        let flowStatsFilter = '';
        let flowStatsParams = [];
        if (dataDe && dataAte) {
            flowStatsFilter = ' WHERE data_execucao BETWEEN ? AND ?';
            flowStatsParams = [dataDe, dataAte];
        }
        const flowStats = await dbQuery(`SELECT * FROM FlowStats ${flowStatsFilter}`, flowStatsParams);
        
        // 3. Buscar ações executadas
        let actionsFilter = '';
        let actionsParams = [];
        if (dataDe && dataAte) {
            actionsFilter = ' WHERE DATE(created_at) BETWEEN ? AND ?';
            actionsParams = [dataDe, dataAte];
        }
        const flowActions = await dbQuery(`SELECT * FROM FlowActions ${actionsFilter}`, actionsParams);
        
        // 4. Estatísticas gerais
        const totalConversas = conversas.length;
        const conversasFinalizadas = conversas.filter(c => c.status === 'finalizado').length;
        const conversasEmAndamento = conversas.filter(c => c.status === 'em_andamento').length;
        const conversasCanceladas = conversas.filter(c => c.status === 'cancelado').length;
        
        const totalAgendamentosGerados = conversas.filter(c => c.gerou_agendamento === 1).length;
        const totalNegociosGerados = conversas.filter(c => c.gerou_negocio === 1).length;
        
        const taxaConversaoAgendamento = totalConversas > 0 ? ((totalAgendamentosGerados / totalConversas) * 100).toFixed(2) : 0;
        const taxaConversaoNegocio = totalConversas > 0 ? ((totalNegociosGerados / totalConversas) * 100).toFixed(2) : 0;
        
        // 5. Tempo médio de atendimento
        let tempoTotalAtendimento = 0;
        let conversasComTempo = 0;
        conversas.forEach(c => {
            if (c.fim_conversa) {
                const inicio = new Date(c.inicio_conversa);
                const fim = new Date(c.fim_conversa);
                const diferenca = Math.floor((fim - inicio) / (1000 * 60)); // minutos
                tempoTotalAtendimento += diferenca;
                conversasComTempo++;
            }
        });
        const tempoMedioAtendimento = conversasComTempo > 0 ? Math.floor(tempoTotalAtendimento / conversasComTempo) : 0;
        
        // 6. Conversas por fluxo
        const conversasPorFluxo = {};
        conversas.forEach(c => {
            const flowId = c.flow_id || 'Sem fluxo';
            if (!conversasPorFluxo[flowId]) {
                conversasPorFluxo[flowId] = {
                    quantidade: 0,
                    agendamentos: 0,
                    negocios: 0
                };
            }
            conversasPorFluxo[flowId].quantidade++;
            if (c.gerou_agendamento) conversasPorFluxo[flowId].agendamentos++;
            if (c.gerou_negocio) conversasPorFluxo[flowId].negocios++;
        });
        
        // Buscar nomes dos fluxos
        const flowIds = Object.keys(conversasPorFluxo).filter(id => id !== 'Sem fluxo');
        let fluxosNomes = {};
        if (flowIds.length > 0) {
            const flows = await dbQuery(`SELECT id, name FROM Flows WHERE id IN (${flowIds.join(',')})`);
            flows.forEach(f => {
                fluxosNomes[f.id] = f.name;
            });
        }
        
        const conversasPorFluxoArray = Object.keys(conversasPorFluxo).map(flowId => ({
            flowId,
            flowNome: fluxosNomes[flowId] || 'Sem fluxo',
            quantidade: conversasPorFluxo[flowId].quantidade,
            agendamentos: conversasPorFluxo[flowId].agendamentos,
            negocios: conversasPorFluxo[flowId].negocios,
            taxaConversao: conversasPorFluxo[flowId].quantidade > 0 
                ? ((conversasPorFluxo[flowId].agendamentos / conversasPorFluxo[flowId].quantidade) * 100).toFixed(2) 
                : 0
        })).sort((a, b) => b.quantidade - a.quantidade);
        
        // 7. Conversas por dia
        const conversasPorDia = {};
        conversas.forEach(c => {
            const data = moment(c.inicio_conversa).format('YYYY-MM-DD');
            if (!conversasPorDia[data]) {
                conversasPorDia[data] = { quantidade: 0, agendamentos: 0, negocios: 0 };
            }
            conversasPorDia[data].quantidade++;
            if (c.gerou_agendamento) conversasPorDia[data].agendamentos++;
            if (c.gerou_negocio) conversasPorDia[data].negocios++;
        });
        
        const conversasPorDiaArray = Object.keys(conversasPorDia).map(data => ({
            data,
            quantidade: conversasPorDia[data].quantidade,
            agendamentos: conversasPorDia[data].agendamentos,
            negocios: conversasPorDia[data].negocios
        })).sort((a, b) => new Date(a.data) - new Date(b.data));
        
        // 8. Ações mais executadas
        const acoesPorTipo = {};
        flowActions.forEach(a => {
            const tipo = a.tipo_acao || 'Desconhecido';
            if (!acoesPorTipo[tipo]) {
                acoesPorTipo[tipo] = { quantidade: 0, sucesso: 0, erro: 0 };
            }
            acoesPorTipo[tipo].quantidade++;
            if (a.sucesso) acoesPorTipo[tipo].sucesso++;
            else acoesPorTipo[tipo].erro++;
        });
        
        const acoesPorTipoArray = Object.keys(acoesPorTipo).map(tipo => ({
            tipo,
            quantidade: acoesPorTipo[tipo].quantidade,
            sucesso: acoesPorTipo[tipo].sucesso,
            erro: acoesPorTipo[tipo].erro,
            taxaSucesso: acoesPorTipo[tipo].quantidade > 0 
                ? ((acoesPorTipo[tipo].sucesso / acoesPorTipo[tipo].quantidade) * 100).toFixed(2)
                : 0
        })).sort((a, b) => b.quantidade - a.quantidade);
        
        // 9. Estatísticas agregadas de execução de fluxos
        let totalExecucoes = 0;
        let totalCompletados = 0;
        let totalCancelados = 0;
        let totalTimeout = 0;
        
        flowStats.forEach(fs => {
            totalExecucoes += fs.total_execucoes || 0;
            totalCompletados += fs.total_completados || 0;
            totalCancelados += fs.total_cancelados || 0;
            totalTimeout += fs.total_timeout || 0;
        });
        
        res.status(200).json({
            estatisticas: {
                totalConversas,
                conversasFinalizadas,
                conversasEmAndamento,
                conversasCanceladas,
                totalAgendamentosGerados,
                totalNegociosGerados,
                taxaConversaoAgendamento,
                taxaConversaoNegocio,
                tempoMedioAtendimento, // em minutos
                totalExecucoes,
                totalCompletados,
                totalCancelados,
                totalTimeout
            },
            conversasPorFluxo: conversasPorFluxoArray,
            conversasPorDia: conversasPorDiaArray,
            acoesPorTipo: acoesPorTipoArray
        });
    } catch (error) {
        console.error('Erro ao buscar relatório de atendimento:', error);
        res.status(500).json({ error: error.message });
    }
});

const checkDateStatus = (date, isPaid) => {
    if (isPaid) return { status: 'Pago', color: 'success' };

    const today = new Date();
    const dateToCheck = new Date(date);

    // Normalize the dates to only compare year, month, and day
    const todayNormalized = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dateToCheckNormalized = new Date(dateToCheck.getFullYear(), dateToCheck.getMonth(), dateToCheck.getDate());

    if (dateToCheckNormalized < todayNormalized) {
        return { status: 'Em atraso', color: 'error' };
    } else if (dateToCheckNormalized > todayNormalized) {
        return { status: 'Em aberto', color: 'warning' };
    } else {
        return { status: 'Pagar hoje', color: 'info' };
    }
};


module.exports = router;