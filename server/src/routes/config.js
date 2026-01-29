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

require('dotenv').config();
const paginateArray = (array, perPage, page) => array.slice((page - 1) * perPage, page * perPage)
const dbQuery = require('../utils/dbHelper');
const caminhoimg = path.join(__dirname, '../uploads/fotos-perfil');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, caminhoimg);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

router.get('/get', async (req, res) => {
    try {
        const { type = null, types = [] } = req.query;

        let query = 'SELECT * FROM Options';
        let values = [];

        if (type) {
            query += ' WHERE type = ?';
            values.push(type);
        } else if (types.length > 0) {
            const placeholders = types.map(() => '?').join(',');
            query += ` WHERE type IN (${placeholders})`;
            values.push(...types);
        }

        const config = await dbQuery(query, values);

        if (config.length === 0) {
            return res.status(404).json({ message: 'Nenhuma configuração encontrada', types, type });
        }

        res.status(200).json(config);
    } catch (error) {
        console.log('Erro ao buscar configurações', error)
        res.status(500).json({ error: error.message });
    }
})

router.get('/g/:type', async (req, res) => {
    try {
        const { type } = req.params;

        const config = await dbQuery('SELECT * FROM Options WHERE type = ?', [type]);

        if (config.length === 0) {
            return res.status(404).send('Configuração não encontrada');
        }

        res.status(200).json(config);
    } catch (error) {
        console.log('Erro ao buscar configuração', error)
        res.status(500).json({ error: error.message });
    }
});

router.post('/update', async (req, res) => {
    try {
        const { data, type_del = null } = req.body;

        if (!data) {
            return res.status(400).send('Dados não informados');
        }

        if (type_del) {
            await dbQuery('DELETE FROM Options WHERE type = ?', [type_del]);
            return res.status(200).send('Configuração deletada com sucesso');
        }

        let deletesNoExist = [];
        let currentValues = null;

        for (const item of data) {
            if (!item.multiple) {
                // Verificar se o tipo existe
                let keyExists = await dbQuery('SELECT * FROM Options WHERE type = ?', [item.type]);
                if (keyExists.length === 0) {
                    // Inserir novo tipo
                    await dbQuery('INSERT INTO Options (type, value) VALUES (?, ?)', [item.type, item.value]);
                } else {
                    // Atualizar valor existente
                    await dbQuery('UPDATE Options SET value = ? WHERE type = ?', [item.value, item.type]);
                }
            } else {
                let existe = await dbQuery('SELECT * FROM Options WHERE type = ? AND value = ?', [item.type, item.value]);

                if (existe.length === 0) {
                    await dbQuery('INSERT INTO Options (type, value) VALUES (?, ?)', [item.type, item.value]);
                    continue;
                }

                currentValues = await dbQuery('SELECT * FROM Options WHERE type = ?', [item.type]);
            }
        }

        if (currentValues) {
            for (const item of currentValues) {
                let exists = data.find(x => x.type === item.type && x.value === item.value);
                if (!exists) {
                    deletesNoExist.push(item);
                }
            }

            for (const item of deletesNoExist) {
                console.log('Deletando', item);
                await dbQuery('DELETE FROM Options WHERE type = ? AND value = ?', [item.type, item.value]);
            }
        }

        res.status(200).send('Configurações atualizadas com sucesso');
    } catch (error) {
        console.log('Erro ao atualizar configurações', error);
        res.status(500).json({ error: error.message });
    }
});

//Tipos de agendamento
router.get('/get-tipos-agendamento', async (req, res) => {
    try {
        const tiposAgendamento = await dbQuery('SELECT * FROM AGENDAMENTO_TIPOS');

        if (tiposAgendamento.length === 0) {
            return res.status(404).json({ message: 'Nenhum tipo de agendamento encontrado' });
        }

        tiposAgendamento.forEach(tipo => {
            tipo.icon = tipo.icon ? Buffer.from(tipo.icon, 'base64').toString('utf8') : null;
        });
        res.status(200).json(tiposAgendamento);
    } catch (error) {
        console.log('Erro ao buscar tipos de agendamento', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/upsert-tipo-agendamento', async (req, res) => {
    try {
        let { id = null, name, icon } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Nome do tipo de agendamento é obrigatório' });
        }

        icon = icon ? Buffer.from(icon).toString('base64') : null;

        if (id) {
            const atualTipoAgendamento = await dbQuery('SELECT * FROM AGENDAMENTO_TIPOS WHERE id = ?', [id]);

            if (atualTipoAgendamento.length === 0) {
                return res.status(404).json({ message: 'Tipo de agendamento não encontrado' });
            }

            const agendamentos = await dbQuery('SELECT * FROM AGENDAMENTO WHERE age_type = ?', [atualTipoAgendamento[0].name]);

            if (agendamentos.length > 0) {
                await dbQuery('UPDATE AGENDAMENTO SET age_type = ? WHERE age_type = ?', [name, atualTipoAgendamento[0].name]);
            }

            await dbQuery('UPDATE AGENDAMENTO_TIPOS SET name = ?, icon = ? WHERE id = ?', [name, icon, id]);
            return res.status(200).json({ message: 'Tipo de agendamento atualizado com sucesso' });
        }

        const tipoAgendamento = await dbQuery('INSERT INTO AGENDAMENTO_TIPOS (name, icon) VALUES (?, ?)', [name, icon]);
        return res.status(200).json({ message: 'Tipo de agendamento inserido com sucesso', id: tipoAgendamento.insertId });

    } catch (error) {
        console.log('Erro ao upsert tipo de agendamento', error);
        res.status(500).json({ error: error.message });
    }
});

router.delete('/delete-tipo-agendamento', async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ message: 'ID do tipo de agendamento é obrigatório' });
        }

        const atualTipoAgendamento = await dbQuery('SELECT * FROM AGENDAMENTO_TIPOS WHERE id = ?', [id]);

        if (atualTipoAgendamento.length === 0) {
            return res.status(404).json({ message: 'Tipo de agendamento não encontrado' });
        }

        const agendamentos = await dbQuery('SELECT * FROM AGENDAMENTO WHERE age_type = ?', [atualTipoAgendamento[0].name]);

        if (agendamentos.length > 0) {
            return res.status(400).json({ message: `Tipo de agendamento não pode ser deletado porque está sendo usado em ${agendamentos.length} agendamentos` });
        }

        await dbQuery('DELETE FROM AGENDAMENTO_TIPOS WHERE id = ?', [id]);
        return res.status(200).json({ message: 'Tipo de agendamento deletado com sucesso' });
    } catch (error) {
        console.log("Erro ao deletar tipo de agendamento:", error, error.response);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;