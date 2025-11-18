const axios = require("axios");
const crypto = require("crypto");
require("dotenv").config();

/**
 * Generar firma MD5 para autenticación del API externa
 */
function generarFirma(method, appSecret, businessData) {
  // Concatenar datos
  let str = method + appSecret + businessData;

  // Agregar primeros y últimos 5 caracteres
  const str1 = str.substring(0, 5);
  const str2 = str.substring(str.length - 5);
  str = str + str1 + str2;

  // Generar MD5
  const sign = crypto.createHash("md5").update(str).digest("hex").toLowerCase();

  return sign;
}

/**
 * Consumir API externa para obtener códigos QR con UPC
 */
async function obtenerCodigosQR(lastGetTime = "2020-01-01 00:00:00") {
  try {
    const businessData = JSON.stringify({ LastGetTime: lastGetTime });

    // Generar firma
    const sign = generarFirma(
      process.env.EXTERNAL_API_METHOD,
      process.env.EXTERNAL_API_SECRET,
      businessData
    );

    // Headers
    const headers = {
      "Content-Type": "application/json",
      method: process.env.EXTERNAL_API_METHOD,
      appKey: process.env.EXTERNAL_API_KEY,
      sign: sign,
    };

    // Body
    const body = {
      BusinessData: businessData,
    };

    console.log("🌐 Consumiendo API externa...");

    const response = await axios.post(process.env.EXTERNAL_API_URL, body, {
      headers,
      timeout: 30000,
    });

    if (response.data.Success === "true") {
      const qrData = JSON.parse(response.data.Data);
      console.log(`✅ API respondió con ${qrData.length} códigos QR`);
      return {
        success: true,
        data: qrData,
        count: qrData.length,
      };
    } else {
      console.error("❌ API respondió con error:", response.data.Message);
      return {
        success: false,
        error: response.data.Message,
        data: [],
      };
    }
  } catch (error) {
    console.error("❌ Error al consumir API:", error.message);
    return {
      success: false,
      error: error.message,
      data: [],
    };
  }
}

/**
 * Validar código QR contra API externa
 */
async function validarCodigoQR(codigoQr) {
  // En este caso, la validación se hace buscando en la base de datos
  // ya que previamente sincronizamos los datos del API
  const db = require("../config/database");

  try {
    const result = await db.query(
      "SELECT * FROM apiProducto WHERE codigoQr = $1",
      [codigoQr]
    );

    if (result.rows.length > 0) {
      return {
        valid: true,
        data: result.rows[0],
      };
    } else {
      return {
        valid: false,
        error: "Código QR no encontrado en el sistema",
      };
    }
  } catch (error) {
    console.error("Error al validar código QR:", error);
    return {
      valid: false,
      error: error.message,
    };
  }
}

module.exports = {
  obtenerCodigosQR,
  validarCodigoQR,
  generarFirma,
};
