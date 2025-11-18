# 🚀 API REST - Sistema de Escaneo de Cartones

API REST completa para gestionar el escaneo de productos con códigos QR, validación contra API externa y seguimiento de órdenes de compra.

## ✨ Características

- ✅ Gestión completa de POs y Cartones
- ✅ Registro y validación de escaneos en tiempo real
- ✅ Integración con API externa TUS (obtener códigos QR)
- ✅ **Integración con API externa T4 (enviar/cancelar escaneos)**
- ✅ Detección automática de duplicados
- ✅ Sincronización de códigos QR
- ✅ Estadísticas y reportes
- ✅ Health checks
- ✅ CORS configurado
- ✅ Logging con Morgan
- ✅ Pool de conexiones optimizado

## 📋 Prerequisitos

- Node.js 16+
- PostgreSQL 12+
- npm o yarn

## 🚀 Instalación

### 1. Instalar dependencias

```bash
cd api
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
nano .env
```

Configura las siguientes variables:

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sistema_escaneo
DB_USER=postgres
DB_PASSWORD=tu_password
```

### 3. Verificar base de datos

Asegúrate de que la base de datos esté creada y las tablas existan:

```bash
psql -U postgres -d sistema_escaneo -c "\dt"
```

### 4. Iniciar el servidor

**Modo desarrollo (con auto-reload):**

```bash
npm run dev
```

**Modo producción:**

```bash
npm start
```

El servidor estará corriendo en `http://localhost:3000`

## 📚 Endpoints Disponibles

### 🏠 General

- `GET /` - Información de la API
- `GET /health` - Health check

### 📦 POs (Purchase Orders)

- `GET /api/pos` - Listar todos los POs
- `GET /api/pos/:numeroPo` - Obtener un PO
- `POST /api/pos` - Crear un PO
- `PUT /api/pos/:numeroPo` - Actualizar un PO
- `DELETE /api/pos/:numeroPo` - Eliminar un PO

### 📦 Cartones

- `GET /api/cartones` - Listar cartones
- `GET /api/cartones/:cartonId` - Obtener un cartón
- `POST /api/cartones` - Crear un cartón
- `POST /api/cartones/:cartonId/iniciar` - Iniciar escaneo
- `POST /api/cartones/:cartonId/finalizar` - Finalizar escaneo
- `PUT /api/cartones/:cartonId` - Actualizar cartón
- `DELETE /api/cartones/:cartonId` - Eliminar cartón

### 🔍 Escaneos

- `POST /api/escaneos` - Registrar escaneo
- `POST /api/escaneos/validar` - Validar código QR
- `GET /api/escaneos/carton/:cartonId` - Escaneos de un cartón
- `GET /api/escaneos/carton/:cartonId/resumen` - Resumen por SKU
- `GET /api/escaneos/estadisticas` - Estadísticas generales
- `DELETE /api/escaneos/:idEscaneo` - Eliminar escaneo

### 🏷️ SKUs

- `GET /api/skus` - Listar SKUs (con búsqueda y paginación)
- `GET /api/skus/:codigoSku` - Obtener un SKU
- `GET /api/skus/upc/:upc` - Buscar por UPC
- `GET /api/skus/mas-escaneados` - SKUs más escaneados

### 🔄 Sincronización

- `POST /api/sync/codigos-qr` - Sincronizar con API externa
- `GET /api/sync/ultima` - Última sincronización
- `GET /api/sync/estado` - Estado de sincronización
- `DELETE /api/sync/limpiar` - Limpiar códigos antiguos

Ver documentación completa en [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)

**Integraciones externas:**

- [Integración API TUS](./API_DOCUMENTATION.md#sincronización) - Obtener códigos QR
- [Integración API T4](./T4_INTEGRATION.md) - Enviar/Cancelar escaneos

## 🧪 Pruebas Rápidas

### Health Check

```bash
curl http://localhost:3000/health
```

### Crear un PO

```bash
curl -X POST http://localhost:3000/api/pos \
  -H "Content-Type: application/json" \
  -d '{"numeroPo": "PO-2025-001", "proveedor": "Test Provider"}'
```

### Sincronizar códigos QR

```bash
curl -X POST http://localhost:3000/api/sync/codigos-qr \
  -H "Content-Type: application/json" \
  -d '{}'
```

## 📁 Estructura del Proyecto

```
api/
├── src/
│   ├── config/
│   │   └── database.js          # Configuración de PostgreSQL
│   ├── controllers/
│   │   ├── poController.js      # Lógica de POs
│   │   ├── cartonController.js  # Lógica de Cartones
│   │   ├── escaneoController.js # Lógica de Escaneos
│   │   ├── skuController.js     # Lógica de SKUs
│   │   └── syncController.js    # Sincronización API
│   ├── routes/
│   │   ├── poRoutes.js          # Rutas de POs
│   │   ├── cartonRoutes.js      # Rutas de Cartones
│   │   ├── escaneoRoutes.js     # Rutas de Escaneos
│   │   ├── skuRoutes.js         # Rutas de SKUs
│   │   └── syncRoutes.js        # Rutas de Sync
│   ├── utils/
│   │   └── externalApi.js       # Cliente API externa
│   └── server.js                # Servidor principal
├── .env.example                 # Plantilla de configuración
├── package.json                 # Dependencias
├── API_DOCUMENTATION.md         # Documentación completa
└── README.md                    # Este archivo
```

## 🔧 Configuración Avanzada

### Pool de Conexiones

Edita `src/config/database.js` para ajustar el pool:

```javascript
const pool = new Pool({
  max: 20, // Máximo de conexiones
  idleTimeoutMillis: 30000, // Timeout de idle
  connectionTimeoutMillis: 2000,
});
```

### CORS

Configura los orígenes permitidos en `.env`:

```env
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,https://tu-dominio.com
```

### Logging

El servidor usa Morgan para logging:

- Modo `development`: formato `dev` (colorizado)
- Modo `production`: formato `combined` (Apache style)

## 📊 Monitoreo

### Verificar conexiones activas

```sql
SELECT COUNT(*) FROM pg_stat_activity
WHERE datname = 'sistema_escaneo';
```

### Ver queries lentos

```sql
SELECT query, calls, total_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
```

## 🐛 Troubleshooting

### Error: "ECONNREFUSED"

```bash
# Verificar que PostgreSQL esté corriendo
sudo systemctl status postgresql
sudo systemctl start postgresql
```

### Error: "authentication failed"

Verifica las credenciales en `.env`

### Error: "Port already in use"

```bash
# Cambiar puerto en .env o matar proceso
lsof -ti:3000 | xargs kill -9
```

### API externa no responde

- Verificar conectividad de red
- Revisar credenciales en `.env`
- Verificar que las URLs sean correctas

## 🚀 Deployment

### Usando PM2

```bash
# Instalar PM2
npm install -g pm2

# Iniciar aplicación
pm2 start src/server.js --name "escaneo-api"

# Ver logs
pm2 logs escaneo-api

# Reiniciar
pm2 restart escaneo-api

# Auto-start on boot
pm2 startup
pm2 save
```

### Usando Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "src/server.js"]
```

```bash
docker build -t escaneo-api .
docker run -p 3000:3000 --env-file .env escaneo-api
```

## 🔒 Seguridad

**Para producción:**

1. ✅ Implementar autenticación (JWT, API Keys)
2. ✅ Usar HTTPS
3. ✅ Rate limiting
4. ✅ Input validation
5. ✅ Helmet.js para headers de seguridad
6. ✅ Sanitizar inputs
7. ✅ Variables de entorno seguras
8. ✅ Logs de auditoría

## 📈 Performance

- Pool de conexiones optimizado
- Queries indexados en BD
- Paginación en listados
- Transacciones para operaciones críticas
- Logging condicional según ambiente

## 🤝 Contribuir

1. Fork el proyecto
2. Crear branch: `git checkout -b feature/nueva-funcionalidad`
3. Commit: `git commit -m 'Agrega nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Pull Request

## 📝 Licencia

Proyecto interno - Todos los derechos reservados

## 👥 Contacto

Para soporte técnico o consultas, contacta al equipo de desarrollo.

---

**Version:** 1.0.0  
**Last Updated:** Enero 2025
