const db = require("../config/database");
const { validarCodigoQR } = require("../utils/externalApi");

/**
 * Registrar un nuevo escaneo
 */
const registrarEscaneo = async (req, res) => {
  const client = await db.getClient();

  try {
    const { cartonId, codigoQr, usuario, dispositivo } = req.body;

    // Validar campos requeridos
    if (!cartonId || !codigoQr) {
      return res.status(400).json({
        success: false,
        error: "cartonId y codigoQr son requeridos",
      });
    }

    await client.query("BEGIN");

    // 1. Verificar que el cartón existe
    const carton = await client.query(
      "SELECT * FROM carton WHERE cartonid = $1",
      [cartonId]
    );

    if (carton.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        error: "Cartón no encontrado",
      });
    }

    // 2. Validar código QR en apiProducto
    const qrValidacion = await validarCodigoQR(codigoQr);

    if (!qrValidacion.valid) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        error: qrValidacion.error || "Código QR no encontrado en el sistema",
      });
    }

    const { upc } = qrValidacion.data;

    // 3. Obtener SKU desde UPC
    const skuResult = await client.query(
      "SELECT skuid FROM upc WHERE codigoupc = $1",
      [upc]
    );

    if (skuResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        error: "UPC no tiene SKU asociado",
      });
    }

    const skuId = skuResult.rows[0].skuid;

    // 4. VALIDAR QUE EL SKU ESTÉ EN LOS SKUs ESPERADOS DEL CARTÓN
    const skuEsperado = await client.query(
      `
      SELECT * FROM carton_sku
      WHERE cartonid = $1 AND skuid = $2
    `,
      [cartonId, skuId]
    );

    if (skuEsperado.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        error: `El SKU ${skuId} no está esperado en este cartón`,
        skuEscaneado: skuId,
      });
    }

    // 5. Verificar que no se exceda la cantidad esperada
    const cantidadEsperada = skuEsperado.rows[0].cantidadesperada;
    const cantidadEscaneada = skuEsperado.rows[0].cantidadescaneada;

    if (cantidadEscaneada >= cantidadEsperada) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        error: `Ya se escanearon todas las unidades esperadas del SKU ${skuId}`,
        esperadas: cantidadEsperada,
        escaneadas: cantidadEscaneada,
      });
    }

    // 6. Verificar si el QR ya fue escaneado en este cartón
    const duplicado = await client.query(
      "SELECT * FROM escaneo WHERE cartonid = $1 AND codigoqr = $2",
      [cartonId, codigoQr]
    );

    if (duplicado.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        error: "Código QR duplicado - ya fue escaneado en este cartón",
        escaneo: duplicado.rows[0],
      });
    }

    // 7. Registrar el escaneo
    const escaneo = await client.query(
      `
      INSERT INTO escaneo (cartonid, skuid, codigoqr, upc, estado, usuario, dispositivo)
      VALUES ($1, $2, $3, $4, 'VALIDADO', $5, $6)
      RETURNING *
    `,
      [cartonId, skuId, codigoQr, upc, usuario, dispositivo]
    );

    await client.query("COMMIT");

    // 8. Obtener progreso actualizado
    const progreso = await db.query(
      "SELECT * FROM v_progreso_carton WHERE cartonid = $1",
      [cartonId]
    );

    // 9. Obtener progreso por SKU
    const progresoSku = await db.query(
      "SELECT * FROM v_progreso_carton_sku WHERE cartonid = $1",
      [cartonId]
    );

    res.status(201).json({
      success: true,
      message: "Escaneo registrado exitosamente",
      data: {
        escaneo: escaneo.rows[0],
        progreso: progreso.rows[0],
        progresoSku: progresoSku.rows,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error al registrar escaneo:", error);
    res.status(500).json({
      success: false,
      error: "Error al registrar escaneo",
    });
  } finally {
    client.release();
  }
};

/**
 * Obtener escaneos de un cartón
 */
const obtenerPorCarton = async (req, res) => {
  try {
    const { cartonId } = req.params;

    const result = await db.query(
      `
      SELECT 
        e.*,
        s.descripcion as sku_descripcion,
        s.color as sku_color
      FROM escaneo e
      LEFT JOIN sku s ON e.skuid = s.codigosku
      WHERE e.cartonid = $1
      ORDER BY e.fechaescaneo DESC
    `,
      [cartonId]
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error("Error al obtener escaneos:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener escaneos",
    });
  }
};

/**
 * Obtener resumen de escaneos por SKU
 */
const obtenerResumenPorSku = async (req, res) => {
  try {
    const { cartonId } = req.params;

    const result = await db.query(
      `
      SELECT * FROM v_escaneos_por_sku
      WHERE cartonid = $1
      ORDER BY codigosku
    `,
      [cartonId]
    );

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error("Error al obtener resumen:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener resumen",
    });
  }
};

/**
 * Validar código QR antes de escanear
 */
const validarQr = async (req, res) => {
  try {
    const { codigoQr } = req.body;

    if (!codigoQr) {
      return res.status(400).json({
        success: false,
        error: "codigoQr es requerido",
      });
    }

    const validacion = await validarCodigoQR(codigoQr);

    if (!validacion.valid) {
      return res.status(404).json({
        success: false,
        error: validacion.error,
      });
    }

    // Obtener información completa del SKU
    const skuInfo = await db.query(
      `
      SELECT 
        u.codigoupc,
        s.codigosku,
        s.descripcion,
        s.color
      FROM apiproducto ap
      JOIN upc u ON ap.upc = u.codigoupc
      JOIN sku s ON u.skuid = s.codigosku
      WHERE ap.codigoqr = $1
    `,
      [codigoQr]
    );

    res.json({
      success: true,
      message: "Código QR válido",
      data: {
        codigoQr,
        upc: validacion.data.upc,
        sku: skuInfo.rows[0] || null,
      },
    });
  } catch (error) {
    console.error("Error al validar QR:", error);
    res.status(500).json({
      success: false,
      error: "Error al validar código QR",
    });
  }
};

/**
 * Eliminar un escaneo (solo si no está validado)
 */
const eliminar = async (req, res) => {
  try {
    const { idEscaneo } = req.params;

    const result = await db.query(
      "DELETE FROM escaneo WHERE idescaneo = $1 AND estado != $2 RETURNING *",
      [idEscaneo, "VALIDADO"]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Escaneo no encontrado o ya está validado",
      });
    }

    res.json({
      success: true,
      message: "Escaneo eliminado exitosamente",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error al eliminar escaneo:", error);
    res.status(500).json({
      success: false,
      error: "Error al eliminar escaneo",
    });
  }
};

/**
 * Obtener estadísticas generales
 */
const obtenerEstadisticas = async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT 
        COUNT(DISTINCT cartonid) as total_cartones,
        COUNT(*) as total_escaneos,
        COUNT(DISTINCT skuid) as skus_unicos,
        COUNT(CASE WHEN estado = 'VALIDADO' THEN 1 END) as escaneos_validados,
        COUNT(CASE WHEN estado = 'DUPLICADO' THEN 1 END) as escaneos_duplicados,
        COUNT(CASE WHEN estado = 'ERROR' THEN 1 END) as escaneos_error
      FROM escaneo
    `);

    res.json({
      success: true,
      data: stats.rows[0],
    });
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener estadísticas",
    });
  }
};

module.exports = {
  registrarEscaneo,
  obtenerPorCarton,
  obtenerResumenPorSku,
  validarQr,
  eliminar,
  obtenerEstadisticas,
};
