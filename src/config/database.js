const { Pool } = require("pg");
require("dotenv").config();

// Configuración del pool de conexiones
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // Máximo de conexiones en el pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Manejar errores del pool
pool.on("error", (err, client) => {
  console.error("Error inesperado en el pool de conexiones:", err);
});

// Función helper para ejecutar queries
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV === "development") {
      console.log("Query ejecutado:", { text, duration, rows: res.rowCount });
    }

    return res;
  } catch (error) {
    console.error("Error en query:", error);
    throw error;
  }
};

// Función para transacciones
const getClient = async () => {
  const client = await pool.connect();
  const query = client.query.bind(client);
  const release = client.release.bind(client);

  // Timeout para liberar conexión
  const timeout = setTimeout(() => {
    console.error("Cliente no liberado después de 5 segundos");
  }, 5000);

  // Wrapper para liberar conexión automáticamente
  client.release = () => {
    clearTimeout(timeout);
    return release();
  };

  return client;
};

module.exports = {
  query,
  pool,
  getClient,
};
