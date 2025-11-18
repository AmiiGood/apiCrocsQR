const db = require("../config/database");
const { obtenerCodigosQR } = require("../utils/externalApi");

/**
 * Sincronizar códigos QR desde API externa
 */
const sincronizarCodigosQr = async (req, res) => {
  try {
    const { lastGetTime } = req.body;

    console.log("🔄 Iniciando sincronización con API externa...");

    // Obtener códigos QR desde API externa
    const apiResponse = await obtenerCodigosQR(lastGetTime);

    if (!apiResponse.success) {
      return res.status(500).json({
        success: false,
        error: apiResponse.error,
        message: "Error al obtener datos del API externa",
      });
    }

    const qrData = apiResponse.data;

    if (qrData.length === 0) {
      return res.json({
        success: true,
        message: "No hay nuevos códigos QR para sincronizar",
        data: {
          sincronizados: 0,
          errores: 0,
        },
      });
    }

    console.log(`📦 Procesando ${qrData.length} códigos QR...`);

    // Insertar códigos QR en batch
    let sincronizados = 0;
    let errores = 0;

    const client = await db.getClient();

    try {
      await client.query("BEGIN");

      for (const item of qrData) {
        try {
          const { QrCode, UPC } = item;

          await client.query(
            `
            INSERT INTO apiproducto (codigoqr, upc, fuenteexterna, datosjson)
            VALUES ($1, $2, 'TUS API', $3)
            ON CONFLICT (codigoqr) DO UPDATE 
            SET upc = EXCLUDED.upc,
                fuenteexterna = EXCLUDED.fuenteexterna,
                datosjson = EXCLUDED.datosjson,
                ultimaactualizacion = CURRENT_TIMESTAMP
          `,
            [QrCode, UPC, JSON.stringify(item)]
          );

          sincronizados++;
        } catch (error) {
          console.error(`Error al insertar QR ${item.QrCode}:`, error);
          errores++;
        }
      }

      await client.query("COMMIT");
      console.log(
        `✅ Sincronización completada: ${sincronizados} exitosos, ${errores} errores`
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    res.json({
      success: true,
      message: "Sincronización completada",
      data: {
        sincronizados,
        errores,
        total: qrData.length,
      },
    });
  } catch (error) {
    console.error("Error al sincronizar:", error);
    res.status(500).json({
      success: false,
      error: "Error al sincronizar códigos QR",
    });
  }
};

/**
 * Obtener última fecha de sincronización
 */
const obtenerUltimaSincronizacion = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        MAX(ultimaactualizacion) as ultima_sincronizacion,
        COUNT(*) as total_codigos
      FROM apiproducto
    `);

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error al obtener última sincronización:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener información de sincronización",
    });
  }
};

/**
 * Verificar estado de sincronización
 */
const verificarEstado = async (req, res) => {
  try {
    // Contar códigos QR en API
    const qrCount = await db.query("SELECT COUNT(*) FROM apiproducto");

    // Contar UPCs únicos
    const upcCount = await db.query(
      "SELECT COUNT(DISTINCT upc) FROM apiproducto"
    );

    // Códigos QR sin UPC en la tabla UPC
    const sinUpc = await db.query(`
      SELECT COUNT(*) 
      FROM apiproducto ap
      LEFT JOIN upc u ON ap.upc = u.codigoupc
      WHERE u.codigoupc IS NULL
    `);

    // Última actualización
    const ultimaActualizacion = await db.query(
      "SELECT MAX(ultimaactualizacion) as fecha FROM apiproducto"
    );

    res.json({
      success: true,
      data: {
        totalCodigosQr: parseInt(qrCount.rows[0].count),
        upcsUnicos: parseInt(upcCount.rows[0].count),
        codigosSinUpc: parseInt(sinUpc.rows[0].count),
        ultimaActualizacion: ultimaActualizacion.rows[0].fecha,
      },
    });
  } catch (error) {
    console.error("Error al verificar estado:", error);
    res.status(500).json({
      success: false,
      error: "Error al verificar estado de sincronización",
    });
  }
};

/**
 * Limpiar códigos QR antiguos
 */
const limpiarAntiguos = async (req, res) => {
  try {
    const { dias = 90 } = req.body;

    const result = await db.query(`
      DELETE FROM apiproducto
      WHERE ultimaactualizacion < NOW() - INTERVAL '${dias} days'
      RETURNING *
    `);

    res.json({
      success: true,
      message: `Códigos QR más antiguos de ${dias} días eliminados`,
      data: {
        eliminados: result.rowCount,
      },
    });
  } catch (error) {
    console.error("Error al limpiar códigos antiguos:", error);
    res.status(500).json({
      success: false,
      error: "Error al limpiar códigos antiguos",
    });
  }
};

module.exports = {
  sincronizarCodigosQr,
  obtenerUltimaSincronizacion,
  verificarEstado,
  limpiarAntiguos,
};
