const express = require('express');
const router = express.Router();
const path = require('path');
const db = require('../database');
const util = require('util');
require('dotenv').config();

const paginateArray = (array, perPage, page) => array.slice((page - 1) * perPage, page * perPage)

const dbQuery = require('../utils/dbHelper');

router.get('/get-noti', async (req, res) => {
    try {
        const notificacoes = await dbQuery('SELECT * FROM Notificacoes ORDER BY time DESC LIMIT 15');

        if (notificacoes.length === 0) {
            return res.status(404).send('Nenhuma notificação encontrada');
        }

        res.status(200).send(notificacoes);
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao processar a solicitação');
    }
});

router.post('/delete-noti', async (req, res) => {
    let { id_notificacao } = req.body;

    if (!id_notificacao) {
        return res.status(400).send('ID da notificação não informado');
    }

    try {
        const notificacoes = await dbQuery('DELETE FROM Notificacoes WHERE id_noti = ?', [id_notificacao]);

        if (notificacoes.length === 0) {
            return res.status(404).send('Nenhuma notificação encontrada');
        }

        res.status(200).send('Notificação deletada com sucesso');
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao processar a solicitação');
    }
});

router.post('/marcar-noti', async (req, res) => {
    let { id_notificacao } = req.body;

    if (!id_notificacao) {
        return res.status(400).send('ID da notificação não informado');
    }

    try {
        const notificacoes = await dbQuery('UPDATE Notificacoes SET visualizada = 1 WHERE id_noti = ?', [id_notificacao]);

        if (notificacoes.length === 0) {
            return res.status(404).send('Nenhuma notificação encontrada');
        }

        res.status(200).send('Notificação visualizada com sucesso');
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao processar a solicitação');
    }
});

router.post('/marcar-noti-all', async (req, res) => {

    try {
        const notificacoes = await dbQuery('UPDATE Notificacoes SET visualizada = 1');

        if (notificacoes.length === 0) {
            return res.status(404).send('Nenhuma notificação encontrada');
        }

        res.status(200).send('Notificações visualizadas com sucesso');
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao processar a solicitação');
    }
});

router.post('/desmarcar-noti', async (req, res) => {
    let { id_notificacao } = req.body;

    if (!id_notificacao) {
        return res.status(400).send('ID da notificação não informado');
    }

    try {
        const notificacoes = await dbQuery('UPDATE Notificacoes SET visualizada = 0 WHERE id_noti = ?', [id_notificacao]);

        if (notificacoes.length === 0) {
            return res.status(404).send('Nenhuma notificação encontrada');
        }

        res.status(200).send('Notificação desmarcada com sucesso');
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao processar a solicitação');
    }
});

router.post('/desmarcar-noti-all', async (req, res) => {
    try {
        const notificacoes = await dbQuery('UPDATE Notificacoes SET visualizada = 0');

        if (notificacoes.length === 0) {
            return res.status(404).send('Nenhuma notificação encontrada');
        }

        res.status(200).send('Notificações desmarcadas com sucesso');
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao processar a solicitação');
    }
});

module.exports = router;