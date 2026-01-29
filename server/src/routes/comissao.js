const express = require('express');
const router = express.Router();
const moment = require('moment');

const dbQuery = require('../utils/dbHelper');
const { sanitizeInput } = require('../utils/functions');
const { getAgendamentos } = require('../utils/agendaUtils');

router.get('/list', async (req, res) => {
    let {
        q = '',
        d = null,
        dateDe = null,
        dateAte = null,
        f = '',
        sortBy = '',
        itemsPerPage = 10,
        page = 1,
        orderBy = 'asc',
        cliente = null
    } = req.query;

    let offset = (page - 1) * itemsPerPage;

    if (itemsPerPage == '-1') {
        offset = 0;
        itemsPerPage = 1000000;
    }

    let baseQuery = `FROM COMISSOES WHERE 1 = 1`;
    if (q) {
        let funcionarios = await dbQuery(`SELECT * FROM User WHERE fullName LIKE '%${sanitizeInput(q)}%'`);
        let funcionariosIds = funcionarios.map(f => f.id);

        let agendamentos = await dbQuery(`SELECT * FROM AGENDAMENTO WHERE fun_id IN (${funcionariosIds.length > 0 ? funcionariosIds.join(',') : '0'}) OR cli_id IN (SELECT cli_Id FROM CLIENTES WHERE cli_nome LIKE '%${sanitizeInput(q)}%')`);
        let agendamentosIds = agendamentos.map(a => a.age_id);

        let qQuery = '';

        if (agendamentosIds.length > 0) {
            qQuery = ` AND (age_id IN (${agendamentosIds.join(',')}) OR com_valor LIKE '%${sanitizeInput(q)}%')`;
        } else {
            qQuery = ` AND com_valor LIKE '%${sanitizeInput(q)}%'`;
        }

        baseQuery += qQuery;
    }

    if (cliente) {
        //baseQuery += ` AND CLIENTES.cli_id = ${cliente}`;
        let agendamentosCliente = await dbQuery(`SELECT * FROM AGENDAMENTO WHERE cli_Id = ?`, [cliente]);
        let agendamentosClienteIds = agendamentosCliente.map(a => a.age_id);

        if (agendamentosClienteIds.length > 0) {
            baseQuery += ` AND age_id IN (${agendamentosClienteIds.join(',')})`;
        } else {
            baseQuery += ` AND age_id = 0`; //Nenhum agendamento
        }
    }

    if (f) {
        // baseQuery += ` AND User.id = ${f}`;

        let agendamentosFuncionario = await dbQuery(`SELECT * FROM AGENDAMENTO WHERE fun_id = ?`, [f]);
        let agendamentosFuncionarioIds = agendamentosFuncionario.map(a => a.age_id);

        if (agendamentosFuncionarioIds.length > 0) {
            baseQuery += ` AND age_id IN (${agendamentosFuncionarioIds.join(',')})`;
        } else {
            baseQuery += ` AND age_id = 0`; //Nenhum agendamento
        }
    }

    if (d) {
        //baseQuery += ` AND AGENDAMENTO.age_data = '${d}'`;

        let agendamentosData = await dbQuery(`SELECT * FROM AGENDAMENTO WHERE age_data = ?`, [d]);
        let agendamentosDataIds = agendamentosData.map(a => a.age_id);

        if (agendamentosDataIds.length > 0) {
            baseQuery += ` AND age_id IN (${agendamentosDataIds.join(',')})`;
        } else {
            baseQuery += ` AND age_id = 0`; //Nenhum agendamento
        }
    }

    console.log('DateDe', dateDe, 'DateAte', dateAte);
    if (dateDe && dateAte) {
        // baseQuery += ` AND age_data >= '${moment(dateDe).format('YYYY-MM-DD')}' AND age_data <= '${moment(dateAte).format('YYYY-MM-DD')}'`;
        let agendamentosData = await dbQuery(`SELECT * FROM AGENDAMENTO WHERE age_data >= ? AND age_data <= ?`, [moment(dateDe).format('YYYY-MM-DD'), moment(dateAte).format('YYYY-MM-DD')]);
        let agendamentosDataIds = agendamentosData.map(a => a.age_id);

        if (agendamentosDataIds.length > 0) {
            baseQuery += ` AND age_id IN (${agendamentosDataIds.join(',')})`;
        } else {
            baseQuery += ` AND age_id = 0`; //Nenhum agendamento
        }
    }

    console.log('BaseQuery', baseQuery);

    let dataQuery = `SELECT *,(SELECT COUNT(*) ${baseQuery}) AS totalComissoes ${baseQuery}`;

    if (sortBy) {
        dataQuery += ` ORDER BY ${sortBy} ${orderBy}`;
    } else {
        dataQuery += ` ORDER BY COMISSOES.created_at DESC`;
    }

    dataQuery += ` LIMIT ${offset}, ${itemsPerPage}`;

    try {
        let funcionarios = await dbQuery(`SELECT * FROM User`);
        const comissoes = await dbQuery(dataQuery);

        for (let comissao of comissoes) {
            let comissaoagendamento = await getAgendamentos('SELECT * FROM AGENDAMENTO WHERE age_id = ?', [comissao.age_id]);
            comissao.agendamento = comissaoagendamento[0] || null;
            comissao.cliente = comissao.agendamento ? comissao.agendamento.cliente[0] || null : null;
            comissao.funcionario = comissao.agendamento && comissao.agendamento?.funcionario?.[0] ?
                comissao.agendamento.funcionario[0] : funcionarios.find(f => f.id == comissao.fun_id) || null;
            comissao.servicos = comissao.agendamento ? comissao.agendamento.servicos : [];
            comissao.endereco = comissao.agendamento ? comissao.agendamento.endereco : [];
        }

        //Remover comissoes duplicadas
        let correctComissoes = [];

        for (let comissao of comissoes) {
            if (!correctComissoes.find(c => c.com_id == comissao.com_id)) {
                correctComissoes.push(comissao);
            }
        }

        let data = {
            comissoes: correctComissoes,
            totalComissoes: comissoes.length > 0 ? comissoes[0].totalComissoes : 0,
            funcionarios
        }

        res.status(200).json(data);
    } catch (error) {
        console.error('Erro ao buscar comissões', error);
        res.status(500).json({ error });
    }
});


router.post('/list-agenda', async (req, res) => {
    const { age_id } = req.body;

    let query = `
    SELECT 
        COMISSOES.*, 
        User.*, 
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
    FROM COMISSOES
    JOIN User ON COMISSOES.fun_id = User.id
    JOIN AGENDAMENTO ON COMISSOES.age_id = AGENDAMENTO.age_id
    JOIN CLIENTES ON AGENDAMENTO.cli_id = CLIENTES.cli_id
    WHERE COMISSOES.age_id = ${age_id} ORDER BY COMISSOES.created_at DESC`;

    try {
        const comissoes = await dbQuery(query);

        res.status(200).json(comissoes);
    } catch (error) {
        console.error('Erro ao buscar comissões', error);
        res.status(500).json({ error });
    }
});


router.get('/get/:id', async (req, res) => {
    const { id } = req.params;

    try {

        let queryComissao = `SELECT * FROM COMISSOES WHERE com_id = ?`;
        let comissaoQuery = await dbQuery(queryComissao, [id]);

        if (!comissaoQuery || comissaoQuery.length == 0) {
            return res.status(404).json({ message: 'Comissão não encontrada' });
        }

        const comissao = comissaoQuery[0];

        let agendamentoComissao = await getAgendamentos('SELECT * FROM AGENDAMENTO WHERE age_id = ?', [comissao.age_id]);

        comissao.agendamento = agendamentoComissao[0] || null;
        comissao.cliente = comissao.agendamento ? comissao.agendamento.cliente[0] || null : null;
        comissao.funcionario = comissao.agendamento && comissao.agendamento?.funcionario?.[0] ? comissao.agendamento.funcionario[0] : null;
        comissao.fun_id_bk = comissao.fun_id;
        comissao.com_valor_bk = comissao.com_valor;
        comissao.servicos = comissao.agendamento ? comissao.agendamento.servicos : [];
        comissao.endereco = comissao.agendamento ? comissao.agendamento.endereco : [];
        comissao.funcionarios = await dbQuery('SELECT * FROM User');

        res.status(200).json(comissao);
    } catch (error) {
        console.error('Erro ao buscar comissão', error);
        res.status(500).json({ error });
    }
});

router.post('/create', async (req, res) => {
    const { fun_id, age_id, com_valor, com_descricao = null, ser_id = null } = req.body;

    if (!fun_id || !age_id || !com_valor) {
        return res.status(400).json({ message: `Preencha ${!fun_id ? 'o funcionário' : !age_id ? 'o agendamento' : 'o valor da comissão'}` });
    }

    try {
        let query = `INSERT INTO COMISSOES (fun_id, age_id, com_valor, com_descricao, ser_id) VALUES (?, ?, ?, ?, ?)`;

        await dbQuery(query, [fun_id, age_id, com_valor, com_descricao, ser_id]);

        res.status(201).json({ message: 'Comissão cadastrada com sucesso' });
    } catch (error) {
        console.error('Erro ao cadastrar comissão', error);
        res.status(500).json({ error });
    }
});

router.post('/update/:id', async (req, res) => {
    const { id } = req.params;
    const { fun_id, age_id, com_valor, com_descricao = null, ser_id = null } = req.body;

    if (!fun_id || !age_id || !com_valor) {
        return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
    }

    try {
        let query = `UPDATE COMISSOES SET fun_id = ?, age_id = ?, com_valor = ?, com_descricao = ?, ser_id = ? WHERE com_id = ?`;

        await dbQuery(query, [fun_id, age_id, com_valor, com_descricao, ser_id, id]);

        res.status(200).json({ message: 'Comissão atualizada com sucesso' });
    } catch (error) {
        console.error('Erro ao atualizar comissão', error);
        res.status(500).json({ error });
    }
});

router.delete('/delete/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await dbQuery('DELETE FROM COMISSOES WHERE com_id = ?', [id]);

        res.status(200).json({ message: 'Comissão deletada com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar comissão', error);
        res.status(500).json({ error });
    }
});

router.put('/paga/:id', async (req, res) => {
    const { id } = req.params;

    const { sai_fpt } = req.body;
    try {
        let dataAgora = new Date();

        let query = `UPDATE COMISSOES SET com_paga = 1, com_paga_data = ?, com_pagar_em = ?, com_pagoPor = ?, com_forma_pagamento = ? WHERE com_id = ?`;

        await dbQuery(query, [dataAgora, dataAgora, req.user.fullName, sai_fpt, id]);

        res.status(200).json({ message: 'Comissão paga com sucesso' });
    } catch (error) {
        console.error('Erro ao pagar comissão', error);
        res.status(500).json({ error });
    }
});

module.exports = router;