const express = require("express");
const router = express.Router();
const cajaController = require("../controllers/cajaController");

/**
 * @route   POST /api/cajas/scan
 * @desc    Escanear código de caja y crear registro
 * @access  Public
 */
router.post("/scan", cajaController.escanearCodigoCaja);

/**
 * @route   POST /api/cajas/:idCaja/escanear-par
 * @desc    Escanear un par (QR + UPC) dentro de una caja
 * @access  Public
 */
router.post("/:idCaja/escanear-par", cajaController.escanearPar);

/**
 * @route   GET /api/cajas/:idCaja
 * @desc    Obtener información de una caja por ID
 * @access  Public
 */
router.get("/:idCaja", cajaController.obtenerCajaPorId);

/**
 * @route   GET /api/cajas/codigo/:codigoCaja
 * @desc    Obtener información de una caja por código
 * @access  Public
 */
router.get("/codigo/:codigoCaja", cajaController.obtenerCajaPorCodigo);

/**
 * @route   GET /api/cajas/carton/:cartonId
 * @desc    Listar todas las cajas de un cartón
 * @access  Public
 */
router.get("/carton/:cartonId", cajaController.obtenerCajasPorCarton);

/**
 * @route   POST /api/cajas/:idCaja/reutilizar
 * @desc    Reutilizar validación de una caja en otro cartón
 * @access  Public
 */
router.post("/:idCaja/reutilizar", cajaController.reutilizarValidacion);

/**
 * @route   GET /api/cajas/verificar/:codigoCaja
 * @desc    Verificar si una caja puede ser reutilizada
 * @access  Public
 */
router.get(
  "/verificar/:codigoCaja",
  cajaController.verificarCajaParaReutilizar
);

/**
 * @route   DELETE /api/cajas/escaneo/:idEscaneo
 * @desc    Eliminar un escaneo de una caja
 * @access  Public
 */
router.delete("/escaneo/:idEscaneo", cajaController.eliminarEscaneo);

module.exports = router;
