const db = require("../config/database");
const {
  enviarEscaneos,
  cancelarEscaneos,
  extraerCodigoQr,
} = require("../utils/t4Api");

/**
 * Obtener todos los cartones
 */
const obtenerTodos = async (req, res) => {
  try {
    const { poId } = req.query;

    let query = "SELECT * FROM v_progreso_carton";
    let params = [];

    if (poId) {
      query += " WHERE poid = $1";
      params = [poId];
    }

    query += " ORDER BY creadoen DESC";

    const result = await db.query(query, params);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error("Error al obtener cartones:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener cartones",
    });
  }
};

/**
 * Obtener un cartón por ID con SKUs esperados
 */
const obtenerPorId = async (req, res) => {
  try {
    const { cartonId } = req.params;

    // Obtener información del cartón
    const carton = await db.query(
      "SELECT * FROM v_progreso_carton WHERE cartonid = $1",
      [cartonId]
    );

    if (carton.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Cartón no encontrado",
      });
    }

    // Obtener SKUs esperados con progreso
    const skusEsperados = await db.query(
      `
      SELECT * FROM v_progreso_carton_sku
      WHERE cartonid = $1
      ORDER BY skuid
    `,
      [cartonId]
    );

    // Obtener escaneos del cartón
    const escaneos = await db.query(
      `
      SELECT 
        e.*,
        s.descripcion as sku_descripcion,
        s.color as sku_color
      FROM escaneo e
      JOIN sku s ON e.skuid = s.codigosku
      WHERE e.cartonid = $1
      ORDER BY e.fechaescaneo DESC
    `,
      [cartonId]
    );

    res.json({
      success: true,
      data: {
        carton: carton.rows[0],
        skusEsperados: skusEsperados.rows,
        escaneos: escaneos.rows,
      },
    });
  } catch (error) {
    console.error("Error al obtener cartón:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener cartón",
    });
  }
};

/**
 * Crear un nuevo cartón con SKUs esperados
 */
const crear = async (req, res) => {
  const client = await db.getClient();

  try {
    const { cartonId, poId, skus } = req.body;

    // Validar campos requeridos
    if (
      !cartonId ||
      !poId ||
      !skus ||
      !Array.isArray(skus) ||
      skus.length === 0
    ) {
      return res.status(400).json({
        success: false,
        error: "cartonId, poId y skus (array) son requeridos",
        ejemplo: {
          cartonId: "CARTON-001",
          poId: "PO-2025-001",
          skus: [
            { skuId: "10001-001-M10W12", cantidad: 3 },
            { skuId: "10001-001-M11", cantidad: 5 },
          ],
        },
      });
    }

    await client.query("BEGIN");

    // Verificar que el PO existe
    const poExists = await client.query(
      "SELECT 1 FROM po WHERE numeropo = $1",
      [poId]
    );

    if (poExists.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        error: "El PO especificado no existe",
      });
    }

    // Verificar que todos los SKUs existen
    for (const sku of skus) {
      const skuExists = await client.query(
        "SELECT 1 FROM sku WHERE codigosku = $1",
        [sku.skuId]
      );

      if (skuExists.rows.length === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          error: `El SKU ${sku.skuId} no existe`,
        });
      }

      if (!sku.cantidad || sku.cantidad <= 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          error: `La cantidad para el SKU ${sku.skuId} debe ser mayor a 0`,
        });
      }
    }

    // Calcular cantidad total
    const cantidadTotal = skus.reduce((sum, sku) => sum + sku.cantidad, 0);

    // Crear el cartón
    const cartonResult = await client.query(
      `
      INSERT INTO carton (cartonid, poid, cantidadtotal, estado)
      VALUES ($1, $2, $3, 'PENDIENTE')
      RETURNING *
    `,
      [cartonId, poId, cantidadTotal]
    );

    // Insertar los SKUs esperados
    for (const sku of skus) {
      await client.query(
        `
        INSERT INTO carton_sku (cartonid, skuid, cantidadesperada)
        VALUES ($1, $2, $3)
      `,
        [cartonId, sku.skuId, sku.cantidad]
      );
    }

    await client.query("COMMIT");

    // Obtener información completa del cartón creado
    const skusEsperados = await db.query(
      `
      SELECT 
        cs.*,
        s.descripcion,
        s.color
      FROM carton_sku cs
      JOIN sku s ON cs.skuid = s.codigosku
      WHERE cs.cartonid = $1
    `,
      [cartonId]
    );

    res.status(201).json({
      success: true,
      message: "Cartón creado exitosamente",
      data: {
        carton: cartonResult.rows[0],
        skusEsperados: skusEsperados.rows,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error al crear cartón:", error);

    if (error.code === "23505") {
      // Duplicate key
      return res.status(400).json({
        success: false,
        error: "El ID del cartón ya existe",
      });
    }

    res.status(500).json({
      success: false,
      error: "Error al crear cartón",
    });
  } finally {
    client.release();
  }
};

/**
 * Actualizar estado de un cartón
 */
const actualizar = async (req, res) => {
  try {
    const { cartonId } = req.params;
    const { estado } = req.body;

    if (!estado) {
      return res.status(400).json({
        success: false,
        error: "El estado es requerido",
      });
    }

    const result = await db.query(
      `
      UPDATE carton
      SET estado = $1
      WHERE cartonid = $2
      RETURNING *
    `,
      [estado, cartonId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Cartón no encontrado",
      });
    }

    res.json({
      success: true,
      message: "Cartón actualizado exitosamente",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error al actualizar cartón:", error);
    res.status(500).json({
      success: false,
      error: "Error al actualizar cartón",
    });
  }
};

/**
 * Iniciar proceso de escaneo de un cartón
 */
const iniciarEscaneo = async (req, res) => {
  try {
    const { cartonId } = req.params;

    // Verificar que el cartón existe
    const carton = await db.query("SELECT * FROM carton WHERE cartonid = $1", [
      cartonId,
    ]);

    if (carton.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Cartón no encontrado",
      });
    }

    // Obtener SKUs esperados
    const skusEsperados = await db.query(
      `
      SELECT * FROM v_progreso_carton_sku
      WHERE cartonid = $1
    `,
      [cartonId]
    );

    // Actualizar estado a EN_PROCESO
    await db.query("UPDATE carton SET estado = $1 WHERE cartonid = $2", [
      "EN_PROCESO",
      cartonId,
    ]);

    res.json({
      success: true,
      message: "Proceso de escaneo iniciado",
      data: {
        cartonId,
        cantidadTotal: carton.rows[0].cantidadtotal,
        cantidadEscaneada: carton.rows[0].cantidadescaneada,
        skusEsperados: skusEsperados.rows,
      },
    });
  } catch (error) {
    console.error("Error al iniciar escaneo:", error);
    res.status(500).json({
      success: false,
      error: "Error al iniciar proceso de escaneo",
    });
  }
};

/**
 * Finalizar proceso de escaneo - ENVIAR o CANCELAR
 */
const finalizarEscaneo = async (req, res) => {
  const client = await db.getClient();

  try {
    const { cartonId } = req.params;
    const { accion } = req.body; // 'ENVIAR' o 'CANCELAR'

    if (!accion || !["ENVIAR", "CANCELAR"].includes(accion)) {
      return res.status(400).json({
        success: false,
        error: "Acción inválida. Debe ser ENVIAR o CANCELAR",
      });
    }

    await client.query("BEGIN");

    // Verificar que el cartón existe
    const carton = await client.query(
      "SELECT c.*, p.numeropo FROM carton c JOIN po p ON c.poid = p.numeropo WHERE c.cartonid = $1",
      [cartonId]
    );

    if (carton.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        error: "Cartón no encontrado",
      });
    }

    // Obtener todos los escaneos validados del cartón con información completa
    const escaneos = await client.query(
      `
      SELECT 
        e.codigoqr,
        e.upc,
        s.codigosku,
        s.descripcion,
        s.color,
        s.categoria
      FROM escaneo e
      JOIN sku s ON e.skuid = s.codigosku
      WHERE e.cartonid = $1 AND e.estado = 'VALIDADO'
    `,
      [cartonId]
    );

    if (escaneos.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        error: "No hay escaneos para procesar",
      });
    }

    let resultadoT4;

    if (accion === "ENVIAR") {
      // ========================================
      // ENVIAR DATOS AL SISTEMA T4
      // ========================================

      console.log(
        `📤 Preparando envío de ${escaneos.rows.length} escaneos al sistema T4...`
      );

      // Agrupar escaneos por SKU para el formato requerido por T4
      const escaneosPorSku = {};

      for (const escaneo of escaneos.rows) {
        const sku = escaneo.codigosku;

        if (!escaneosPorSku[sku]) {
          escaneosPorSku[sku] = {
            poNo: carton.rows[0].numeropo,
            styleNo: escaneo.codigosku,
            styleName: escaneo.descripcion,
            color: escaneo.color || "N/A",
            colorName: escaneo.descripcion,
            size: "M", // TODO: Obtener de datos reales
            quantity: 0,
            cfmXfDate: new Date().toISOString().split("T")[0],
            codes: [],
          };
        }

        escaneosPorSku[sku].quantity++;
        escaneosPorSku[sku].codes.push(extraerCodigoQr(escaneo.codigoqr));
      }

      // Convertir a array
      const datosParaEnviar = Object.values(escaneosPorSku);

      // Enviar al sistema T4
      resultadoT4 = await enviarEscaneos(datosParaEnviar);

      if (!resultadoT4.success) {
        await client.query("ROLLBACK");
        return res.status(500).json({
          success: false,
          error: "Error al enviar datos al sistema T4",
          detalles: resultadoT4.error,
          data: resultadoT4.data,
        });
      }

      // Actualizar estado del cartón a COMPLETADO
      await client.query("UPDATE carton SET estado = $1 WHERE cartonid = $2", [
        "COMPLETADO",
        cartonId,
      ]);

      console.log("✅ Datos enviados exitosamente al sistema T4");
    } else {
      // ========================================
      // CANCELAR DATOS EN EL SISTEMA T4
      // ========================================

      console.log(
        `🚫 Preparando cancelación de ${escaneos.rows.length} escaneos en sistema T4...`
      );

      // Extraer solo los códigos QR
      const codigosQr = escaneos.rows.map((e) => extraerCodigoQr(e.codigoqr));

      // Cancelar en el sistema T4
      resultadoT4 = await cancelarEscaneos(codigosQr);

      if (!resultadoT4.success) {
        await client.query("ROLLBACK");
        return res.status(500).json({
          success: false,
          error: "Error al cancelar datos en sistema T4",
          detalles: resultadoT4.error,
          data: resultadoT4.data,
        });
      }

      // Actualizar estado del cartón a CANCELADO
      await client.query("UPDATE carton SET estado = $1 WHERE cartonid = $2", [
        "CANCELADO",
        cartonId,
      ]);

      console.log("✅ Datos cancelados exitosamente en sistema T4");
    }

    await client.query("COMMIT");

    // Obtener estado actualizado
    const cartonActualizado = await db.query(
      "SELECT * FROM v_progreso_carton WHERE cartonid = $1",
      [cartonId]
    );

    res.json({
      success: true,
      message: `Cartón ${
        accion === "ENVIAR" ? "enviado" : "cancelado"
      } exitosamente`,
      data: {
        carton: cartonActualizado.rows[0],
        t4Response: resultadoT4.data,
        escaneosProcesados: escaneos.rows.length,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error al finalizar escaneo:", error);
    res.status(500).json({
      success: false,
      error: "Error al finalizar proceso de escaneo",
      detalles: error.message,
    });
  } finally {
    client.release();
  }
};

/**
 * Eliminar un cartón
 */
const eliminar = async (req, res) => {
  try {
    const { cartonId } = req.params;

    const result = await db.query(
      "DELETE FROM carton WHERE cartonid = $1 RETURNING *",
      [cartonId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Cartón no encontrado",
      });
    }

    res.json({
      success: true,
      message: "Cartón eliminado exitosamente",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error al eliminar cartón:", error);
    res.status(500).json({
      success: false,
      error: "Error al eliminar cartón",
    });
  }
};

module.exports = {
  obtenerTodos,
  obtenerPorId,
  crear,
  actualizar,
  iniciarEscaneo,
  finalizarEscaneo,
  eliminar,
};
