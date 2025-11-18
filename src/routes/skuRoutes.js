const express = require("express");
const router = express.Router();
const skuController = require("../controllers/skuController");

/**
 * @route   GET /api/skus
 * @desc    Obtener todos los SKUs (con paginación y búsqueda)
 * @access  Public
 */
router.get("/", skuController.obtenerTodos);

/**
 * @route   GET /api/skus/mas-escaneados
 * @desc    Obtener SKUs más escaneados
 * @access  Public
 */
router.get("/mas-escaneados", skuController.obtenerMasEscaneados);

/**
 * @route   GET /api/skus/:codigoSku
 * @desc    Obtener un SKU por código
 * @access  Public
 */
router.get("/:codigoSku", skuController.obtenerPorCodigo);

/**
 * @route   GET /api/skus/upc/:upc
 * @desc    Buscar SKU por UPC
 * @access  Public
 */
router.get("/upc/:upc", skuController.buscarPorUpc);

module.exports = router;
