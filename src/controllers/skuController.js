const db = require("../config/database");

/**
 * Obtener todos los SKUs
 */
const obtenerTodos = async (req, res) => {
  try {
    const { search, limit = 50, offset = 0 } = req.query;

    let query = "SELECT * FROM sku WHERE 1=1";
    let params = [];
    let paramCount = 1;

    if (search) {
      query += ` AND (codigosku ILIKE $${paramCount} OR descripcion ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ` ORDER BY codigosku LIMIT $${paramCount} OFFSET $${
      paramCount + 1
    }`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    // Contar total
    const countResult = await db.query(
      "SELECT COUNT(*) FROM sku" +
        (search ? ` WHERE (codigosku ILIKE $1 OR descripcion ILIKE $1)` : ""),
      search ? [`%${search}%`] : []
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    console.error("Error al obtener SKUs:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener SKUs",
    });
  }
};

/**
 * Obtener un SKU por código
 */
const obtenerPorCodigo = async (req, res) => {
  try {
    const { codigoSku } = req.params;

    // Obtener SKU
    const sku = await db.query("SELECT * FROM sku WHERE codigosku = $1", [
      codigoSku,
    ]);

    if (sku.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "SKU no encontrado",
      });
    }

    // Obtener UPCs asociados
    const upcs = await db.query("SELECT * FROM upc WHERE skuid = $1", [
      codigoSku,
    ]);

    // Obtener cantidad de códigos QR disponibles
    const qrCount = await db.query(
      `
      SELECT COUNT(*) as total
      FROM apiproducto ap
      JOIN upc u ON ap.upc = u.codigoupc
      WHERE u.skuid = $1
    `,
      [codigoSku]
    );

    res.json({
      success: true,
      data: {
        sku: sku.rows[0],
        upcs: upcs.rows,
        codigosQrDisponibles: parseInt(qrCount.rows[0].total),
      },
    });
  } catch (error) {
    console.error("Error al obtener SKU:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener SKU",
    });
  }
};

/**
 * Buscar SKU por UPC
 */
const buscarPorUpc = async (req, res) => {
  try {
    const { upc } = req.params;

    const result = await db.query(
      `
      SELECT 
        s.*,
        u.codigoupc
      FROM sku s
      JOIN upc u ON s.codigosku = u.skuid
      WHERE u.codigoupc = $1
    `,
      [upc]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No se encontró SKU para este UPC",
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error al buscar SKU por UPC:", error);
    res.status(500).json({
      success: false,
      error: "Error al buscar SKU",
    });
  }
};

/**
 * Obtener SKUs más escaneados
 */
const obtenerMasEscaneados = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const result = await db.query(
      `
      SELECT 
        s.codigosku,
        s.descripcion,
        s.color,
        COUNT(e.idescaneo) as total_escaneos
      FROM sku s
      LEFT JOIN escaneo e ON s.codigosku = e.skuid
      WHERE e.estado = 'VALIDADO'
      GROUP BY s.codigosku, s.descripcion, s.color
      ORDER BY total_escaneos DESC
      LIMIT $1
    `,
      [limit]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error al obtener SKUs más escaneados:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener estadísticas",
    });
  }
};

module.exports = {
  obtenerTodos,
  obtenerPorCodigo,
  buscarPorUpc,
  obtenerMasEscaneados,
};
