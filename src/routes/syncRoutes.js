const express = require("express");
const router = express.Router();
const syncController = require("../controllers/syncController");

/**
 * @route   POST /api/sync/codigos-qr
 * @desc    Sincronizar códigos QR desde API externa
 * @access  Public
 */
router.post("/codigos-qr", syncController.sincronizarCodigosQr);

/**
 * @route   GET /api/sync/ultima
 * @desc    Obtener última fecha de sincronización
 * @access  Public
 */
router.get("/ultima", syncController.obtenerUltimaSincronizacion);

/**
 * @route   GET /api/sync/estado
 * @desc    Verificar estado de sincronización
 * @access  Public
 */
router.get("/estado", syncController.verificarEstado);

/**
 * @route   DELETE /api/sync/limpiar
 * @desc    Limpiar códigos QR antiguos
 * @access  Public
 */
router.delete("/limpiar", syncController.limpiarAntiguos);

module.exports = router;
