# 📚 API REST - Documentación

## 🔗 Base URL

```
http://localhost:3000/api
```

---

## 📦 Purchase Orders (POs)

### Obtener todos los POs

```http
GET /api/pos
```

**Respuesta:**

```json
{
  "success": true,
  "data": [
    {
      "numeropo": "PO-2025-001",
      "estado": "EN_PROCESO",
      "proveedor": "Proveedor ABC",
      "totalcartones": 5,
      "totalunidades": 60,
      "unidadesescaneadas": 30,
      "porcentajecompletado": 50.0
    }
  ],
  "count": 1
}
```

### Obtener un PO específico

```http
GET /api/pos/:numeroPo
```

**Ejemplo:**

```http
GET /api/pos/PO-2025-001
```

### Crear un nuevo PO

```http
POST /api/pos
Content-Type: application/json

{
  "numeroPo": "PO-2025-001",
  "proveedor": "Proveedor ABC",
  "observaciones": "Orden urgente"
}
```

### Actualizar un PO

```http
PUT /api/pos/:numeroPo
Content-Type: application/json

{
  "estado": "COMPLETADO",
  "observaciones": "Finalizado exitosamente"
}
```

### Eliminar un PO

```http
DELETE /api/pos/:numeroPo
```

---

## 📦 Cartones

### Obtener todos los cartones

```http
GET /api/cartones
GET /api/cartones?poId=PO-2025-001  # Filtrar por PO
```

**Respuesta:**

```json
{
  "success": true,
  "data": [
    {
      "cartonid": "CARTON-001",
      "poid": "PO-2025-001",
      "cantidadtotal": 12,
      "cantidadescaneada": 8,
      "porcentajecompletado": 66.67,
      "estado": "EN_PROCESO"
    }
  ]
}
```

### Obtener un cartón específico

```http
GET /api/cartones/:cartonId
```

**Respuesta incluye:**

- Información del cartón
- Progreso de escaneo
- Escaneos agrupados por SKU

### Crear un nuevo cartón

```http
POST /api/cartones
Content-Type: application/json

{
  "cartonId": "CARTON-001",
  "poId": "PO-2025-001",
  "cantidadTotal": 12
}
```

### Iniciar proceso de escaneo

```http
POST /api/cartones/:cartonId/iniciar
```

**Respuesta:**

```json
{
  "success": true,
  "message": "Proceso de escaneo iniciado",
  "data": {
    "cartonId": "CARTON-001",
    "cantidadTotal": 12,
    "cantidadEscaneada": 0
  }
}
```

### Finalizar proceso de escaneo

```http
POST /api/cartones/:cartonId/finalizar
Content-Type: application/json

{
  "accion": "ENVIAR"  // o "CANCELAR"
}
```

**Respuesta exitosa (ENVIAR):**

```json
{
  "success": true,
  "message": "Cartón enviado exitosamente",
  "data": {
    "carton": {
      "cartonid": "CARTON-001",
      "estado": "COMPLETADO",
      ...
    },
    "t4Response": {
      "success": "true",
      "message": null,
      "errorCode": null,
      "data": null
    },
    "escaneosProcesados": 12
  }
}
```

**Respuesta exitosa (CANCELAR):**

```json
{
  "success": true,
  "message": "Cartón cancelado exitosamente",
  "data": {
    "carton": {
      "cartonid": "CARTON-001",
      "estado": "CANCELADO",
      ...
    },
    "t4Response": {
      "success": "True",
      "message": "",
      "errorCode": "",
      "data": null
    },
    "escaneosProcesados": 12
  }
}
```

**Errores posibles:**

_Error al enviar al sistema T4:_

```json
{
  "success": false,
  "error": "Error al enviar datos al sistema T4",
  "detalles": "T4系统QR1个已经被扫描，已经扫描QR为：MXWAKYGBONBZ"
}
```

_Error al cancelar (códigos no enviados):_

```json
{
  "success": false,
  "error": "Error al cancelar datos en sistema T4",
  "detalles": "码值未发货扫描",
  "data": {
    "Message": "码值未发货扫描",
    "Codes": ["MXWAKYGBONBZ"]
  }
}
```

**Notas importantes:**

- La acción `ENVIAR` envía los datos al sistema T4 con el método `genpoassociation`
- La acción `CANCELAR` cancela los datos en T4 con el método `cancelpoassociation`
- Para poder cancelar, los códigos QR primero deben haber sido enviados
- El API T4 valida duplicados y códigos ya escaneados
- La firma MD5 se genera automáticamente según las especificaciones de T4

### Actualizar estado del cartón

```http
PUT /api/cartones/:cartonId
Content-Type: application/json

{
  "estado": "COMPLETADO"
}
```

### Eliminar un cartón

```http
DELETE /api/cartones/:cartonId
```

---

## 🔍 Escaneos

### Registrar un nuevo escaneo

```http
POST /api/escaneos
Content-Type: application/json

{
  "cartonId": "CARTON-001",
  "codigoQr": "http://192.168.0.249:500/Q/3TTAKYGBLOXJ",
  "usuario": "operador1",
  "dispositivo": "Scanner-01"
}
```

**Respuesta exitosa:**

```json
{
  "success": true,
  "message": "Escaneo registrado exitosamente",
  "data": {
    "escaneo": {
      "idescaneo": "uuid-here",
      "cartonid": "CARTON-001",
      "skuid": "10001-001-M10W12",
      "codigoqr": "http://...",
      "upc": "883503153356",
      "estado": "VALIDADO",
      "fechaescaneo": "2025-01-04T10:30:00Z"
    },
    "progreso": {
      "cartonid": "CARTON-001",
      "cantidadtotal": 12,
      "cantidadescaneada": 9,
      "porcentajecompletado": 75.0
    }
  }
}
```

**Errores posibles:**

```json
{
  "success": false,
  "error": "Código QR duplicado - ya fue escaneado en este cartón"
}
```

```json
{
  "success": false,
  "error": "Código QR no encontrado en el sistema"
}
```

### Validar código QR antes de escanear

```http
POST /api/escaneos/validar
Content-Type: application/json

{
  "codigoQr": "http://192.168.0.249:500/Q/3TTAKYGBLOXJ"
}
```

**Respuesta:**

```json
{
  "success": true,
  "message": "Código QR válido",
  "data": {
    "codigoQr": "http://...",
    "upc": "883503153356",
    "sku": {
      "codigosku": "10001-001-M10W12",
      "descripcion": "Classic Blk",
      "color": "Blk"
    }
  }
}
```

### Obtener escaneos de un cartón

```http
GET /api/escaneos/carton/:cartonId
```

### Obtener resumen de escaneos por SKU

```http
GET /api/escaneos/carton/:cartonId/resumen
```

**Respuesta:**

```json
{
  "success": true,
  "data": [
    {
      "codigosku": "10001-001-M10W12",
      "descripcion": "Classic Blk",
      "color": "Blk",
      "cantidadescaneada": 5,
      "ultimoescaneo": "2025-01-04T10:30:00Z"
    }
  ]
}
```

### Obtener estadísticas generales

```http
GET /api/escaneos/estadisticas
```

### Eliminar un escaneo

```http
DELETE /api/escaneos/:idEscaneo
```

---

## 🏷️ SKUs

### Obtener todos los SKUs

```http
GET /api/skus
GET /api/skus?search=classic&limit=20&offset=0
```

**Parámetros:**

- `search`: Buscar en código o descripción
- `limit`: Cantidad de resultados (default: 50)
- `offset`: Paginación (default: 0)

### Obtener un SKU específico

```http
GET /api/skus/:codigoSku
```

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "sku": {
      "codigosku": "10001-001-M10W12",
      "descripcion": "Classic Blk",
      "color": "Blk"
    },
    "upcs": [
      {
        "codigoupc": "841158002474",
        "skuid": "10001-001-M10W12"
      }
    ],
    "codigosQrDisponibles": 150
  }
}
```

### Buscar SKU por UPC

```http
GET /api/skus/upc/:upc
```

**Ejemplo:**

```http
GET /api/skus/upc/883503153356
```

### Obtener SKUs más escaneados

```http
GET /api/skus/mas-escaneados?limit=10
```

---

## 🔄 Sincronización

### Sincronizar códigos QR desde API externa

```http
POST /api/sync/codigos-qr
Content-Type: application/json

{
  "lastGetTime": "2025-01-01 00:00:00"  // Opcional
}
```

**Respuesta:**

```json
{
  "success": true,
  "message": "Sincronización completada",
  "data": {
    "sincronizados": 1250,
    "errores": 0,
    "total": 1250
  }
}
```

### Obtener última sincronización

```http
GET /api/sync/ultima
```

### Verificar estado de sincronización

```http
GET /api/sync/estado
```

**Respuesta:**

```json
{
  "success": true,
  "data": {
    "totalCodigosQr": 15000,
    "upcsUnicos": 350,
    "codigosSinUpc": 5,
    "ultimaActualizacion": "2025-01-04T10:00:00Z"
  }
}
```

### Limpiar códigos QR antiguos

```http
DELETE /api/sync/limpiar
Content-Type: application/json

{
  "dias": 90  // Eliminar códigos más antiguos de 90 días
}
```

---

## 🏥 Health Check

### Verificar estado del servidor

```http
GET /health
```

**Respuesta:**

```json
{
  "status": "healthy",
  "timestamp": "2025-01-04T10:30:00Z",
  "database": "connected",
  "uptime": 3600
}
```

---

## 📝 Estados Válidos

### Estados de PO

- `PENDIENTE`
- `EN_PROCESO`
- `COMPLETADO`
- `CANCELADO`

### Estados de Cartón

- `PENDIENTE`
- `EN_PROCESO`
- `COMPLETADO`
- `CANCELADO`

### Estados de Escaneo

- `ESCANEADO`
- `VALIDADO`
- `ERROR`
- `DUPLICADO`

---

## 🚨 Códigos de Error

| Código | Descripción                                  |
| ------ | -------------------------------------------- |
| 200    | OK - Éxito                                   |
| 201    | Created - Recurso creado                     |
| 400    | Bad Request - Parámetros inválidos           |
| 404    | Not Found - Recurso no encontrado            |
| 500    | Internal Server Error - Error del servidor   |
| 503    | Service Unavailable - Servicio no disponible |

---

## 💡 Ejemplos de Flujo Completo

### Flujo de Escaneo Completo

1. **Crear PO**

```bash
curl -X POST http://localhost:3000/api/pos \
  -H "Content-Type: application/json" \
  -d '{"numeroPo": "PO-2025-001", "proveedor": "ABC Corp"}'
```

2. **Crear Cartón**

```bash
curl -X POST http://localhost:3000/api/cartones \
  -H "Content-Type: application/json" \
  -d '{"cartonId": "CARTON-001", "poId": "PO-2025-001", "cantidadTotal": 12}'
```

3. **Iniciar Escaneo**

```bash
curl -X POST http://localhost:3000/api/cartones/CARTON-001/iniciar
```

4. **Validar QR**

```bash
curl -X POST http://localhost:3000/api/escaneos/validar \
  -H "Content-Type: application/json" \
  -d '{"codigoQr": "http://192.168.0.249:500/Q/3TTAKYGBLOXJ"}'
```

5. **Registrar Escaneo**

```bash
curl -X POST http://localhost:3000/api/escaneos \
  -H "Content-Type: application/json" \
  -d '{"cartonId": "CARTON-001", "codigoQr": "http://...", "usuario": "op1"}'
```

6. **Ver Progreso**

```bash
curl http://localhost:3000/api/cartones/CARTON-001
```

7. **Finalizar**

```bash
curl -X POST http://localhost:3000/api/cartones/CARTON-001/finalizar \
  -H "Content-Type: application/json" \
  -d '{"accion": "ENVIAR"}'
```

---

## 🔐 Autenticación

Actualmente la API no tiene autenticación. En producción se recomienda implementar:

- JWT tokens
- API keys
- OAuth 2.0

---

## 📞 Soporte

Para reportar problemas o solicitar nuevas funcionalidades, contacta al equipo de desarrollo.
