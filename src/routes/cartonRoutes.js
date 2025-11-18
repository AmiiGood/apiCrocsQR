const express = require("express");
const router = express.Router();
const cartonController = require("../controllers/cartonController");

/**
 * @route   GET /api/cartones
 * @desc    Obtener todos los cartones (puede filtrar por poId)
 * @access  Public
 */
router.get("/", cartonController.obtenerTodos);

/**
 * @route   GET /api/cartones/:cartonId
 * @desc    Obtener un cartón por ID
 * @access  Public
 */
router.get("/:cartonId", cartonController.obtenerPorId);

/**
 * @route   POST /api/cartones
 * @desc    Crear un nuevo cartón
 * @access  Public
 */
router.post("/", cartonController.crear);

/**
 * @route   PUT /api/cartones/:cartonId
 * @desc    Actualizar estado de un cartón
 * @access  Public
 */
router.put("/:cartonId", cartonController.actualizar);

/**
 * @route   POST /api/cartones/:cartonId/iniciar
 * @desc    Iniciar proceso de escaneo
 * @access  Public
 */
router.post("/:cartonId/iniciar", cartonController.iniciarEscaneo);

/**
 * @route   POST /api/cartones/:cartonId/finalizar
 * @desc    Finalizar proceso de escaneo (enviar o cancelar)
 * @access  Public
 */
router.post("/:cartonId/finalizar", cartonController.finalizarEscaneo);

/**
 * @route   DELETE /api/cartones/:cartonId
 * @desc    Eliminar un cartón
 * @access  Public
 */
router.delete("/:cartonId", cartonController.eliminar);

module.exports = router;
