const axios = require("axios");
const crypto = require("crypto");
require("dotenv").config();

/**
 * Generar firma MD5 para autenticación del API T4
 */
function generarFirmaT4(method, appSecret, businessData) {
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
 * Enviar datos de escaneo al sistema T4
 * @param {Array} escaneos - Array de escaneos a enviar
 * @returns {Object} Respuesta del API
 */
async function enviarEscaneos(escaneos) {
  try {
    console.log("📤 Enviando escaneos al sistema T4...");

    // Preparar datos según formato requerido
    const datosFormateados = escaneos.map((escaneo) => ({
      PoNo: escaneo.poNo,
      Brand: escaneo.brand || "Crocs",
      ShipToId: escaneo.shipToId || "2004",
      StyleNo: escaneo.styleNo,
      StyleName: escaneo.styleName,
      Color: escaneo.color,
      ColorName: escaneo.colorName,
      Size: escaneo.size,
      Quantity: escaneo.quantity.toString(),
      FacilitySite: escaneo.facilitySite || "PROD",
      ProductCategory: escaneo.productCategory || "FOOTWEAR",
      Gender: escaneo.gender || "Unisex",
      CfmXfDate: escaneo.cfmXfDate,
      Codes: escaneo.codes, // Array de códigos QR
    }));

    const businessData = JSON.stringify(datosFormateados);
    const method = "genpoassociation";

    // Generar firma
    const sign = generarFirmaT4(
      method,
      process.env.T4_API_SECRET,
      businessData
    );

    console.log(
      "   Enviando",
      escaneos.length,
      "registros con",
      escaneos.reduce((acc, e) => acc + e.codes.length, 0),
      "códigos QR"
    );

    // Headers
    const headers = {
      "Content-Type": "application/json",
      method: method,
      appKey: process.env.T4_API_KEY,
      sign: sign,
    };

    // Body
    const body = {
      BusinessData: businessData,
    };

    const response = await axios.post(process.env.T4_API_URL, body, {
      headers,
      timeout: 30000,
    });

    if (response.data.success === "true" || response.data.success === true) {
      console.log("✅ Escaneos enviados exitosamente al sistema T4");
      return {
        success: true,
        message: "Datos enviados correctamente al sistema T4",
        data: response.data,
      };
    } else {
      console.error("❌ Error al enviar al sistema T4:", response.data.message);
      return {
        success: false,
        error: response.data.message || "Error desconocido",
        errorCode: response.data.errorCode,
        data: response.data,
      };
    }
  } catch (error) {
    console.error("❌ Error al consumir API T4:", error.message);
    return {
      success: false,
      error: error.message,
      data: null,
    };
  }
}

/**
 * Cancelar escaneos en el sistema T4
 * @param {Array} codigosQr - Array de códigos QR a cancelar
 * @returns {Object} Respuesta del API
 */
async function cancelarEscaneos(codigosQr) {
  try {
    console.log("🚫 Cancelando escaneos en el sistema T4...");
    console.log("   Códigos a cancelar:", codigosQr.length);

    // Preparar datos
    const businessData = JSON.stringify({
      Codes: codigosQr,
    });

    const method = "cancelpoassociation";

    // Generar firma
    const sign = generarFirmaT4(
      method,
      process.env.T4_API_SECRET,
      businessData
    );

    // Headers
    const headers = {
      "Content-Type": "application/json",
      method: method,
      appKey: process.env.T4_API_KEY,
      sign: sign,
    };

    // Body
    const body = {
      BusinessData: businessData,
    };

    const response = await axios.post(process.env.T4_API_URL, body, {
      headers,
      timeout: 30000,
    });

    // Nota: El API T4 devuelve "True" con mayúscula para cancelación
    if (
      response.data.success === "True" ||
      response.data.success === true ||
      response.data.success === "true"
    ) {
      console.log("✅ Escaneos cancelados exitosamente en el sistema T4");
      return {
        success: true,
        message: "Datos cancelados correctamente en el sistema T4",
        data: response.data,
      };
    } else {
      console.error(
        "❌ Error al cancelar en sistema T4:",
        response.data.message
      );

      // Parsear datos del error si vienen en string
      let errorData = response.data.data;
      if (typeof errorData === "string") {
        try {
          errorData = JSON.parse(errorData);
        } catch (e) {
          // Si no se puede parsear, dejar como está
        }
      }

      return {
        success: false,
        error:
          response.data.message || errorData?.Message || "Error desconocido",
        errorCode: response.data.errorCode,
        data: errorData,
      };
    }
  } catch (error) {
    console.error(
      "❌ Error al consumir API T4 para cancelación:",
      error.message
    );
    return {
      success: false,
      error: error.message,
      data: null,
    };
  }
}

/**
 * Extraer solo los códigos QR de las URLs completas
 * Ejemplo: "http://192.168.0.249:500/Q/MXWAKYGBONBZ" -> "MXWAKYGBONBZ"
 */
function extraerCodigoQr(urlCompleta) {
  // Si ya es solo el código, devolverlo
  if (!urlCompleta.includes("/")) {
    return urlCompleta;
  }

  // Extraer la última parte de la URL
  const partes = urlCompleta.split("/");
  return partes[partes.length - 1];
}

module.exports = {
  enviarEscaneos,
  cancelarEscaneos,
  extraerCodigoQr,
  generarFirmaT4,
};
