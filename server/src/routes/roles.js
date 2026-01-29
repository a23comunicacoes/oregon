const express = require('express');
const router = express.Router();
const path = require('path');
const db = require('../database');

const dbQuery = require('../utils/dbHelper');

// ADD
router.post('/add-role', async (req, res) => {
    try {
        const { name, permissions } = req.body;

        if (!name || !permissions) {
            return res.status(400).json({ message: 'O nome do setor e permissões são obrigatórios' });
        }

        const exists = await dbQuery('SELECT id FROM Roles WHERE role_name = ?', [name]);
        if (exists.length > 0) {
            return res.status(409).json({ message: 'Setor já cadastrado' });
        }

        const permissionsJSON = JSON.stringify(permissions);
        const result = await dbQuery('INSERT INTO Roles (role_name, role_ability) VALUES (?, ?)', [name, permissionsJSON]);

        return res.status(201).json({ message: 'Setor criado com sucesso', id: result.insertId });
    } catch (error) {
        return res.status(500).json({ message: 'Erro no servidor', error });
    }
});


router.post('/edit-role', async (req, res) => {
    try {
        const { id, name, permissions } = req.body;

        if (!id || !name || !permissions || permissions.length === 0) {
            return res.status(400).json({ message: 'O nome do setor e permissões são obrigatórios' });
        }

        const check = await dbQuery('SELECT * FROM Roles WHERE id = ?', [id]);
        if (check.length === 0) {
            return res.status(404).json({ message: 'Função não encontrada' });
        }

        if (check[0].role_name == 'admin') {
            return res.status(403).json({ message: 'A função admin não pode ser editada' });
        }

        const nomeOriginal = check[0].role_name;

        console.log(nomeOriginal, name);
        if (nomeOriginal != name) {
            const exists = await dbQuery('SELECT id FROM Roles WHERE role_name = ? AND id != ?', [name, id]);
            if (exists.length > 0) {
                return res.status(409).json({ message: 'Já existe uma função com esse nome' });
            }

            let atualizarUsers = await dbQuery('UPDATE User SET role = ? WHERE role = ?', [name, nomeOriginal]);

            console.log('Usuários atualizados:', atualizarUsers.affectedRows);
        }

        let permissionsJSON = [];

        if (!permissions.some(p => p.action === 'read' && p.subject === 'all')) {
            permissions.push({ action: 'read', subject: 'all' });
        }

        permissionsJSON = JSON.stringify([...permissions, ...permissionsJSON]);

        const query = 'UPDATE Roles SET role_name = ?, role_ability = ? WHERE id = ?';
        await dbQuery(query, [name, permissionsJSON, id]);

        return res.status(200).json({ message: 'Função atualizada com sucesso' });
    } catch (error) {
        return res.status(500).json({ message: 'Ocorreu um erro ao atualizar a função!', error: error });
    }
});

// LIST (roles)
router.get('/list-role', async (req, res) => {
    try {
        const rows = await dbQuery('SELECT id, role_name, role_ability FROM Roles', []);
        const rolesFiltered = rows
            .map(r => {
                let parsed = [];
                try { parsed = JSON.parse(r.role_ability || '[]'); } catch (_) { parsed = []; }
                return { ...r, role_ability: parsed };
            });

        for (let role of rolesFiltered) {
            let countUsers = await dbQuery('SELECT COUNT(*) AS total FROM User WHERE role = ?', [role.role_name]);
            role.userCount = countUsers[0]?.total || 0;
        }
        
        return res.status(200).json({ results: rolesFiltered });
    } catch (error) {
        return res.status(500).json({ message: 'Erro no servidor', error });
    }
});

// LIST (users by role)
router.get('/list-role-users', async (req, res) => {
    try {
        const { role } = req.query;
        if (!role) {
            return res.status(400).json({ message: 'O nome do setor é obrigatório' });
        }

        const users = await dbQuery('SELECT * FROM User WHERE role = ?', [role]);
        return res.status(200).json({ results: users });
    } catch (error) {
        return res.status(500).json({ message: 'Erro no servidor', error });
    }
});

// DELETE
router.post('/delete-role', async (req, res) => {
    try {
        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ message: 'O ID do setor é obrigatório' });
        }

        const result = await dbQuery('DELETE FROM Roles WHERE id = ?', [id]);

        // Opcional: checar se algo foi apagado
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Setor não encontrado' });
        }

        return res.status(200).json({ message: 'Setor excluído com sucesso' });
    } catch (error) {
        return res.status(500).json({ message: 'Erro no servidor', error });
    }
});


module.exports = router;