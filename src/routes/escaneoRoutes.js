const express = require("express");
const router = express.Router();
const escaneoController = require("../controllers/escaneoController");

/**
 * @route   POST /api/escaneos
 * @desc    Registrar un nuevo escaneo
 * @access  Public
 */
router.post("/", escaneoController.registrarEscaneo);

/**
 * @route   POST /api/escaneos/validar
 * @desc    Validar un código QR antes de escanear
 * @access  Public
 */
router.post("/validar", escaneoController.validarQr);

/**
 * @route   GET /api/escaneos/estadisticas
 * @desc    Obtener estadísticas generales
 * @access  Public
 */
router.get("/estadisticas", escaneoController.obtenerEstadisticas);

/**
 * @route   GET /api/escaneos/carton/:cartonId
 * @desc    Obtener todos los escaneos de un cartón
 * @access  Public
 */
router.get("/carton/:cartonId", escaneoController.obtenerPorCarton);

/**
 * @route   GET /api/escaneos/carton/:cartonId/resumen
 * @desc    Obtener resumen de escaneos por SKU
 * @access  Public
 */
router.get("/carton/:cartonId/resumen", escaneoController.obtenerResumenPorSku);

/**
 * @route   DELETE /api/escaneos/:idEscaneo
 * @desc    Eliminar un escaneo
 * @access  Public
 */
router.delete("/:idEscaneo", escaneoController.eliminar);

module.exports = router;
