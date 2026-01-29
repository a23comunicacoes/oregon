const express = require('express');
const router = express.Router();
const path = require('path');
const db = require('../database');
const multer = require('multer');

const paginateArray = (array, perPage, page) => array.slice((page - 1) * perPage, page * perPage)

//Get Pedidos de Compra
