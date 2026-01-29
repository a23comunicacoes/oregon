const express = require('express');
const router = express.Router();
const path = require('path');
const db = require('../database');
const fs = require('fs');
const util = require('util');
require('dotenv').config();

const dbQuery = require('../utils/dbHelper');

router.use(express.json()); // Para analisar application/json
/*
router.post('/upload', async (req, res) => {
    const { oportunidade_id, arquivo } = req.body;

    if (!arquivo || !arquivo.filename || !arquivo.contents) {
        return res.status(400).send('Arquivo inválido.');
    }

    if (!oportunidade_id) {
        return res.status(400).send('ID da oportunidade é obrigatório.');
    }

    // Decodificar o arquivo base64 para binário
    const fileBuffer = Buffer.from(arquivo.contents, 'base64');

    const caminhoBase = path.join(__dirname, '../uploads/docs-oportunidades');
    const caminhoOportunidade = path.join(caminhoBase, oportunidade_id);

    // Garantir que a pasta base existe
    if (!fs.existsSync(caminhoOportunidade)) {
        fs.mkdirSync(caminhoOportunidade, { recursive: true });
    }

    const filePath = path.join(caminhoOportunidade, arquivo.filename);

    // Salvar o arquivo no sistema de arquivos
    fs.writeFileSync(filePath, fileBuffer);

    const relativePath = `/download/docs/${oportunidade_id}/${arquivo.filename}`;
    const urlArquiv = process.env.APP_URL + relativePath;
    const filenameURLEncoded = encodeURIComponent(arquivo.filename);

    let inserirAnexos = await dbQuery('INSERT INTO anexo (id_oportunidade, filename, url) VALUES (?, ?, ?)', [oportunidade_id, filenameURLEncoded, urlArquiv]);

    const response = {
        id_anexo: inserirAnexos.insertId,
        filename: arquivo.filename,
        url: relativePath
    }

    res.status(200).send(response);
});*/

module.exports = router;
