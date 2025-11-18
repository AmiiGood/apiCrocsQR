const express = require("express");
const router = express.Router();
const poController = require("../controllers/poController");

/**
 * @route   GET /api/pos
 * @desc    Obtener todos los POs
 * @access  Public
 */
router.get("/", poController.obtenerTodos);

/**
 * @route   GET /api/pos/:numeroPo
 * @desc    Obtener un PO por número
 * @access  Public
 */
router.get("/:numeroPo", poController.obtenerPorNumero);

/**
 * @route   POST /api/pos
 * @desc    Crear un nuevo PO
 * @access  Public
 */
router.post("/", poController.crear);

/**
 * @route   PUT /api/pos/:numeroPo
 * @desc    Actualizar un PO
 * @access  Public
 */
router.put("/:numeroPo", poController.actualizar);

/**
 * @route   DELETE /api/pos/:numeroPo
 * @desc    Eliminar un PO
 * @access  Public
 */
router.delete("/:numeroPo", poController.eliminar);

module.exports = router;
