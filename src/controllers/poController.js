const db = require("../config/database");

/**
 * Obtener todos los POs
 */
const obtenerTodos = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM v_resumen_po
      ORDER BY numeropo DESC
    `);

    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error("Error al obtener POs:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener órdenes de compra",
    });
  }
};

/**
 * Obtener un PO por número
 */
const obtenerPorNumero = async (req, res) => {
  try {
    const { numeroPo } = req.params;

    // Usar la vista v_resumen_po en lugar de la tabla po directamente
    const result = await db.query(
      "SELECT * FROM v_resumen_po WHERE numeropo = $1",
      [numeroPo]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "PO no encontrado",
      });
    }

    // Obtener cartones asociados con sus datos calculados
    const cartones = await db.query(
      "SELECT * FROM v_progreso_carton WHERE poid = $1 ORDER BY creadoen DESC",
      [numeroPo]
    );

    res.json({
      success: true,
      data: {
        po: result.rows[0],
        cartones: cartones.rows,
      },
    });
  } catch (error) {
    console.error("Error al obtener PO:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener orden de compra",
    });
  }
};

/**
 * Crear un nuevo PO
 */
const crear = async (req, res) => {
  try {
    const { numeroPo, proveedor, observaciones } = req.body;

    // Validar campos requeridos
    if (!numeroPo) {
      return res.status(400).json({
        success: false,
        error: "El número de PO es requerido",
      });
    }

    const result = await db.query(
      `
      INSERT INTO po (numeropo, proveedor, observaciones, estado)
      VALUES ($1, $2, $3, 'PENDIENTE')
      RETURNING *
    `,
      [numeroPo, proveedor, observaciones]
    );

    res.status(201).json({
      success: true,
      message: "PO creado exitosamente",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error al crear PO:", error);

    if (error.code === "23505") {
      // Duplicate key
      return res.status(400).json({
        success: false,
        error: "El número de PO ya existe",
      });
    }

    res.status(500).json({
      success: false,
      error: "Error al crear orden de compra",
    });
  }
};

/**
 * Actualizar un PO
 */
const actualizar = async (req, res) => {
  try {
    const { numeroPo } = req.params;
    const { estado, proveedor, observaciones } = req.body;

    const result = await db.query(
      `
      UPDATE po
      SET estado = COALESCE($1, estado),
          proveedor = COALESCE($2, proveedor),
          observaciones = COALESCE($3, observaciones)
      WHERE numeropo = $4
      RETURNING *
    `,
      [estado, proveedor, observaciones, numeroPo]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "PO no encontrado",
      });
    }

    res.json({
      success: true,
      message: "PO actualizado exitosamente",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error al actualizar PO:", error);
    res.status(500).json({
      success: false,
      error: "Error al actualizar orden de compra",
    });
  }
};

/**
 * Eliminar un PO
 */
const eliminar = async (req, res) => {
  try {
    const { numeroPo } = req.params;

    const result = await db.query(
      "DELETE FROM po WHERE numeropo = $1 RETURNING *",
      [numeroPo]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "PO no encontrado",
      });
    }

    res.json({
      success: true,
      message: "PO eliminado exitosamente",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error al eliminar PO:", error);
    res.status(500).json({
      success: false,
      error: "Error al eliminar orden de compra",
    });
  }
};

module.exports = {
  obtenerTodos,
  obtenerPorNumero,
  crear,
  actualizar,
  eliminar,
};
