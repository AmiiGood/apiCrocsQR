const db = require("../config/database");
const { validarCodigoQR } = require("../utils/externalApi");

/**
 * Parsear código de caja
 * Formato: 120925$10001-001-M10W12$12$009
 * Retorna: { fecha, skuId, unidades, idIncremental }
 */
function parsearCodigoCaja(codigoCaja) {
  const partes = codigoCaja.split("$");

  if (partes.length !== 4) {
    throw new Error(
      "Formato de código de caja inválido. Esperado: fecha$sku$unidades$id"
    );
  }

  const [fechaStr, skuId, unidadesStr, idStr] = partes;

  // Parsear fecha DDMMYY a formato ISO
  const dia = fechaStr.substring(0, 2);
  const mes = fechaStr.substring(2, 4);
  const anio = "20" + fechaStr.substring(4, 6);
  const fecha = `${anio}-${mes}-${dia}`;

  return {
    fecha,
    skuId,
    unidades: parseInt(unidadesStr),
    idIncremental: parseInt(idStr),
  };
}

/**
 * Escanear código de caja y crear registro
 */
const escanearCodigoCaja = async (req, res) => {
  const client = await db.getClient();

  try {
    const { cartonId, codigoCaja, usuario } = req.body;

    // SI se proporciona cartonId, verificar que existe
    // SI NO se proporciona (empaque), continuar sin cartón
    if (cartonId) {
      const carton = await pool.query(
        "SELECT * FROM carton WHERE cartonid = $1",
        [cartonId]
      );
      if (carton.rows.length === 0) {
        return res.status(404).json({ error: "Cartón no encontrado" });
      }
    }

    await client.query("BEGIN");

    // Verificar que el cartón existe
    const carton = await client.query(
      "SELECT * FROM carton WHERE cartonId = $1",
      [cartonId]
    );

    if (carton.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        error: "Cartón no encontrado",
      });
    }

    // Verificar si el código de caja ya existe
    const cajaExistente = await client.query(
      "SELECT * FROM caja WHERE codigoCaja = $1",
      [codigoCaja]
    );

    if (cajaExistente.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        error: "El código de caja ya fue escaneado",
        caja: cajaExistente.rows[0],
      });
    }

    // Parsear código de caja
    let datosParseados;
    try {
      datosParseados = parsearCodigoCaja(codigoCaja);
    } catch (error) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    const { fecha, skuId, unidades, idIncremental } = datosParseados;

    // Verificar que el SKU existe
    const skuExists = await client.query(
      "SELECT * FROM sku WHERE codigoSku = $1",
      [skuId]
    );

    if (skuExists.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        error: `El SKU ${skuId} no existe en el sistema`,
      });
    }

    // Crear la caja
    const cajaResult = await pool.query(
      `INSERT INTO caja (
    idcaja, cartonid, codigocaja, skuid, fecha, 
    unidadesporcaja, idincrementalcaja
  ) VALUES ($1, $2, $3, $4, $5, $6, $7)
  RETURNING *`,
      [
        idCaja,
        cartonId || null, // ← PERMITIR NULL
        codigoCaja,
        skuId,
        parsedCodigo.fecha,
        parsedCodigo.unidades,
        parsedCodigo.id,
      ]
    );

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "Código de caja escaneado exitosamente",
      data: {
        caja: cajaResult.rows[0],
        sku: skuExists.rows[0],
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error al escanear código de caja:", error);
    res.status(500).json({
      success: false,
      error: "Error al procesar código de caja",
    });
  } finally {
    client.release();
  }
};

/**
 * Escanear par (QR + UPC) dentro de una caja
 */
const escanearPar = async (req, res) => {
  const client = await db.getClient();

  try {
    const { idCaja } = req.params;
    const { codigoQr, upc, usuario, dispositivo } = req.body;

    // Validar campos requeridos
    if (!codigoQr || !upc) {
      return res.status(400).json({
        success: false,
        error: "codigoQr y upc son requeridos",
      });
    }

    await client.query("BEGIN");

    // Obtener información de la caja
    const caja = await client.query(
      `
      SELECT c.*, s.codigoSku, s.descripcion, s.color
      FROM caja c
      JOIN sku s ON c.skuId = s.codigoSku
      WHERE c.idCaja = $1
    `,
      [idCaja]
    );

    if (caja.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        error: "Caja no encontrada",
      });
    }

    const cajaDatos = caja.rows[0];

    // Verificar que la caja no esté ya validada
    if (cajaDatos.validada) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        error: "La caja ya está validada completamente",
      });
    }

    // Verificar que no se exceda el límite de unidades
    const conteoActual = await client.query(
      "SELECT COUNT(*) as total FROM escaneo_caja WHERE idCaja = $1",
      [idCaja]
    );

    if (parseInt(conteoActual.rows[0].total) >= cajaDatos.unidadesporcaja) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        error: "La caja ya tiene todas las unidades esperadas escaneadas",
        esperadas: cajaDatos.unidadesporcaja,
        escaneadas: conteoActual.rows[0].total,
      });
    }

    // Validar código QR en apiProducto
    const qrValidacion = await validarCodigoQR(codigoQr);

    if (!qrValidacion.valid) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        error: qrValidacion.error || "Código QR no encontrado en el sistema",
      });
    }

    // Verificar que el UPC coincida con el QR
    if (qrValidacion.data.upc !== upc) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        error: "El UPC no coincide con el código QR",
        upcEsperado: qrValidacion.data.upc,
        upcRecibido: upc,
      });
    }

    // Obtener SKU desde UPC
    const skuResult = await client.query(
      "SELECT skuId FROM upc WHERE codigoUpc = $1",
      [upc]
    );

    if (skuResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        error: "UPC no tiene SKU asociado",
      });
    }

    const skuEscaneado = skuResult.rows[0].skuid;

    // Validar que el SKU coincida con el de la caja
    const esValido = skuEscaneado === cajaDatos.skuid;
    const estadoEscaneo = esValido ? "VALIDADO" : "SKU_INCORRECTO";

    // Verificar duplicados
    const duplicado = await client.query(
      "SELECT * FROM escaneo_caja WHERE idCaja = $1 AND codigoQr = $2",
      [idCaja, codigoQr]
    );

    if (duplicado.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        error: "Código QR duplicado - ya fue escaneado en esta caja",
        escaneo: duplicado.rows[0],
      });
    }

    // Registrar el escaneo
    const escaneoResult = await client.query(
      `
      INSERT INTO escaneo_caja (
        idCaja, codigoQr, upc, skuId, 
        estado, usuario, dispositivo, esValido
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `,
      [
        idCaja,
        codigoQr,
        upc,
        skuEscaneado,
        estadoEscaneo,
        usuario,
        dispositivo,
        esValido,
      ]
    );

    await client.query("COMMIT");

    // Obtener progreso actualizado de la caja
    const progreso = await db.query(
      "SELECT * FROM v_detalle_caja WHERE idCaja = $1",
      [idCaja]
    );

    res.status(201).json({
      success: true,
      message: esValido
        ? "Par validado exitosamente"
        : "Par escaneado pero el SKU no coincide",
      data: {
        escaneo: escaneoResult.rows[0],
        progreso: progreso.rows[0],
        validacion: {
          skuEsperado: cajaDatos.skuid,
          skuEscaneado: skuEscaneado,
          coincide: esValido,
        },
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error al escanear par:", error);
    res.status(500).json({
      success: false,
      error: "Error al procesar escaneo de par",
    });
  } finally {
    client.release();
  }
};

/**
 * Obtener información de una caja por ID
 */
const obtenerCajaPorId = async (req, res) => {
  try {
    const { idCaja } = req.params;

    const caja = await db.query(
      "SELECT * FROM v_detalle_caja WHERE idCaja = $1",
      [idCaja]
    );

    if (caja.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Caja no encontrada",
      });
    }

    // Obtener escaneos de la caja
    const escaneos = await db.query(
      `
      SELECT 
        ec.*,
        s.descripcion as skuDescripcion,
        s.color as skuColor
      FROM escaneo_caja ec
      LEFT JOIN sku s ON ec.skuId = s.codigoSku
      WHERE ec.idCaja = $1
      ORDER BY ec.fechaEscaneo ASC
    `,
      [idCaja]
    );

    res.json({
      success: true,
      data: {
        caja: caja.rows[0],
        escaneos: escaneos.rows,
      },
    });
  } catch (error) {
    console.error("Error al obtener caja:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener información de la caja",
    });
  }
};

/**
 * Obtener caja por código
 */
const obtenerCajaPorCodigo = async (req, res) => {
  try {
    const { codigoCaja } = req.params;

    const caja = await db.query(
      "SELECT * FROM v_detalle_caja WHERE codigoCaja = $1",
      [codigoCaja]
    );

    if (caja.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Caja no encontrada",
      });
    }

    // Obtener escaneos de la caja
    const escaneos = await db.query(
      `
      SELECT 
        ec.*,
        s.descripcion as skuDescripcion,
        s.color as skuColor
      FROM escaneo_caja ec
      LEFT JOIN sku s ON ec.skuId = s.codigoSku
      JOIN caja c ON ec.idCaja = c.idCaja
      WHERE c.codigoCaja = $1
      ORDER BY ec.fechaEscaneo ASC
    `,
      [codigoCaja]
    );

    res.json({
      success: true,
      data: {
        caja: caja.rows[0],
        escaneos: escaneos.rows,
      },
    });
  } catch (error) {
    console.error("Error al obtener caja:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener información de la caja",
    });
  }
};

/**
 * Listar cajas de un cartón
 */
const obtenerCajasPorCarton = async (req, res) => {
  try {
    const { cartonId } = req.params;

    const cajas = await db.query(
      `
      SELECT * FROM v_detalle_caja
      WHERE cartonId = $1
      ORDER BY idIncremental ASC
    `,
      [cartonId]
    );

    res.json({
      success: true,
      data: cajas.rows,
      count: cajas.rows.length,
    });
  } catch (error) {
    console.error("Error al obtener cajas:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener cajas del cartón",
    });
  }
};

/**
 * Reutilizar validación de una caja en otro cartón
 */
const reutilizarValidacion = async (req, res) => {
  try {
    const { idCaja } = req.params;
    const { cartonDestinoId, usuario, dispositivo } = req.body;

    if (!cartonDestinoId) {
      return res.status(400).json({
        success: false,
        error: "cartonDestinoId es requerido",
      });
    }

    // Verificar que el cartón destino existe
    const cartonDestino = await db.query(
      "SELECT * FROM carton WHERE cartonId = $1",
      [cartonDestinoId]
    );

    if (cartonDestino.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Cartón destino no encontrado",
      });
    }

    // Llamar función de reutilización
    const resultado = await db.query(
      `
      SELECT * FROM reutilizar_validacion_caja($1, $2, $3, $4)
    `,
      [idCaja, cartonDestinoId, usuario || "sistema", dispositivo || "api"]
    );

    if (resultado.rows[0].escaneos_creados === 0) {
      return res.status(400).json({
        success: false,
        error: resultado.rows[0].mensaje,
      });
    }

    // Obtener progreso del cartón destino
    const progreso = await db.query(
      "SELECT * FROM v_progreso_carton WHERE cartonId = $1",
      [cartonDestinoId]
    );

    res.json({
      success: true,
      message: resultado.rows[0].mensaje,
      data: {
        escaneosCreados: resultado.rows[0].escaneos_creados,
        cartonDestino: progreso.rows[0],
      },
    });
  } catch (error) {
    console.error("Error al reutilizar validación:", error);
    res.status(500).json({
      success: false,
      error: "Error al reutilizar validación de caja",
    });
  }
};

/**
 * Verificar si una caja puede ser reutilizada
 */
const verificarCajaParaReutilizar = async (req, res) => {
  try {
    const { codigoCaja } = req.params;

    const caja = await db.query(
      `
      SELECT 
        c.idCaja,
        c.codigoCaja,
        c.skuId,
        c.unidadesPorCaja,
        c.validada,
        c.estado,
        COUNT(ec.idEscaneo) as escaneos_registrados
      FROM caja c
      LEFT JOIN escaneo_caja ec ON c.idCaja = ec.idCaja
      WHERE c.codigoCaja = $1
      GROUP BY c.idCaja, c.codigoCaja, c.skuId, c.unidadesPorCaja, c.validada, c.estado
    `,
      [codigoCaja]
    );

    if (caja.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Caja no encontrada",
      });
    }

    const cajaDatos = caja.rows[0];
    const puedeReutilizar =
      cajaDatos.validada && cajaDatos.estado === "VALIDADA";

    res.json({
      success: true,
      data: {
        caja: cajaDatos,
        puedeReutilizar,
        motivo: puedeReutilizar
          ? "Caja validada y lista para reutilizar"
          : `Caja no puede ser reutilizada - Estado: ${cajaDatos.estado}`,
      },
    });
  } catch (error) {
    console.error("Error al verificar caja:", error);
    res.status(500).json({
      success: false,
      error: "Error al verificar caja",
    });
  }
};

/**
 * Eliminar un escaneo de caja (solo si la caja no está validada)
 */
const eliminarEscaneo = async (req, res) => {
  const client = await db.getClient();

  try {
    const { idEscaneo } = req.params;

    await client.query("BEGIN");

    // Verificar que el escaneo existe y la caja no está validada
    const escaneo = await client.query(
      `
      SELECT ec.*, c.validada
      FROM escaneo_caja ec
      JOIN caja c ON ec.idCaja = c.idCaja
      WHERE ec.idEscaneo = $1
    `,
      [idEscaneo]
    );

    if (escaneo.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        error: "Escaneo no encontrado",
      });
    }

    if (escaneo.rows[0].validada) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        error: "No se puede eliminar escaneo de una caja ya validada",
      });
    }

    // Eliminar el escaneo
    const resultado = await client.query(
      "DELETE FROM escaneo_caja WHERE idEscaneo = $1 RETURNING *",
      [idEscaneo]
    );

    await client.query("COMMIT");

    res.json({
      success: true,
      message: "Escaneo eliminado exitosamente",
      data: resultado.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error al eliminar escaneo:", error);
    res.status(500).json({
      success: false,
      error: "Error al eliminar escaneo",
    });
  } finally {
    client.release();
  }
};

module.exports = {
  escanearCodigoCaja,
  escanearPar,
  obtenerCajaPorId,
  obtenerCajaPorCodigo,
  obtenerCajasPorCarton,
  reutilizarValidacion,
  verificarCajaParaReutilizar,
  eliminarEscaneo,
};
