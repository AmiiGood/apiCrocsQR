# 📮 Colección de Ejemplos - Postman/Thunder Client

Importa estos ejemplos en Postman o Thunder Client para probar la API fácilmente.

## 🔧 Variables de Entorno

Crea estas variables en Postman:

```
base_url = http://localhost:3000
po_number = PO-2025-001
carton_id = CARTON-001
```

---

## 📦 Ejemplos por Módulo

### 1. Health & Info

**GET** `/` - Información de la API

```
{{base_url}}/
```

**GET** `/health` - Health Check

```
{{base_url}}/health
```

---

### 2. Purchase Orders

**POST** Crear PO

```
{{base_url}}/api/pos
```

Body (JSON):

```json
{
  "numeroPo": "{{po_number}}",
  "proveedor": "Proveedor ABC",
  "observaciones": "Orden de prueba"
}
```

**GET** Listar todos los POs

```
{{base_url}}/api/pos
```

**GET** Obtener un PO específico

```
{{base_url}}/api/pos/{{po_number}}
```

**PUT** Actualizar PO

```
{{base_url}}/api/pos/{{po_number}}
```

Body (JSON):

```json
{
  "estado": "EN_PROCESO",
  "observaciones": "En proceso de recepción"
}
```

**DELETE** Eliminar PO

```
{{base_url}}/api/pos/{{po_number}}
```

---

### 3. Cartones

**POST** Crear Cartón

```
{{base_url}}/api/cartones
```

Body (JSON):

```json
{
  "cartonId": "{{carton_id}}",
  "poId": "{{po_number}}",
  "cantidadTotal": 12
}
```

**GET** Listar todos los cartones

```
{{base_url}}/api/cartones
```

**GET** Listar cartones de un PO

```
{{base_url}}/api/cartones?poId={{po_number}}
```

**GET** Obtener un cartón específico

```
{{base_url}}/api/cartones/{{carton_id}}
```

**POST** Iniciar proceso de escaneo

```
{{base_url}}/api/cartones/{{carton_id}}/iniciar
```

**POST** Finalizar escaneo - ENVIAR

```
{{base_url}}/api/cartones/{{carton_id}}/finalizar
```

Body (JSON):

```json
{
  "accion": "ENVIAR"
}
```

**POST** Finalizar escaneo - CANCELAR

```
{{base_url}}/api/cartones/{{carton_id}}/finalizar
```

Body (JSON):

```json
{
  "accion": "CANCELAR"
}
```

**PUT** Actualizar estado del cartón

```
{{base_url}}/api/cartones/{{carton_id}}
```

Body (JSON):

```json
{
  "estado": "COMPLETADO"
}
```

**DELETE** Eliminar cartón

```
{{base_url}}/api/cartones/{{carton_id}}
```

---

### 4. Escaneos

**POST** Validar código QR

```
{{base_url}}/api/escaneos/validar
```

Body (JSON):

```json
{
  "codigoQr": "http://192.168.0.249:500/Q/3TTAKYGBLOXJ"
}
```

**POST** Registrar escaneo

```
{{base_url}}/api/escaneos
```

Body (JSON):

```json
{
  "cartonId": "{{carton_id}}",
  "codigoQr": "http://192.168.0.249:500/Q/3TTAKYGBLOXJ",
  "usuario": "operador1",
  "dispositivo": "Scanner-01"
}
```

**GET** Obtener escaneos de un cartón

```
{{base_url}}/api/escaneos/carton/{{carton_id}}
```

**GET** Resumen de escaneos por SKU

```
{{base_url}}/api/escaneos/carton/{{carton_id}}/resumen
```

**GET** Estadísticas generales

```
{{base_url}}/api/escaneos/estadisticas
```

**DELETE** Eliminar un escaneo

```
{{base_url}}/api/escaneos/123e4567-e89b-12d3-a456-426614174000
```

---

### 5. SKUs

**GET** Listar todos los SKUs (con paginación)

```
{{base_url}}/api/skus?limit=20&offset=0
```

**GET** Buscar SKUs

```
{{base_url}}/api/skus?search=classic&limit=10
```

**GET** Obtener un SKU específico

```
{{base_url}}/api/skus/10001-001-M10W12
```

**GET** Buscar SKU por UPC

```
{{base_url}}/api/skus/upc/883503153356
```

**GET** SKUs más escaneados

```
{{base_url}}/api/skus/mas-escaneados?limit=10
```

---

### 6. Sincronización

**GET** Estado de sincronización

```
{{base_url}}/api/sync/estado
```

**GET** Última sincronización

```
{{base_url}}/api/sync/ultima
```

**POST** Sincronizar códigos QR (todos)

```
{{base_url}}/api/sync/codigos-qr
```

Body (JSON):

```json
{}
```

**POST** Sincronizar códigos QR (desde fecha)

```
{{base_url}}/api/sync/codigos-qr
```

Body (JSON):

```json
{
  "lastGetTime": "2025-01-01 00:00:00"
}
```

**DELETE** Limpiar códigos antiguos

```
{{base_url}}/api/sync/limpiar
```

Body (JSON):

```json
{
  "dias": 90
}
```

---

## 🎯 Flujo de Prueba Completo

### Paso 1: Verificar salud del sistema

```
GET {{base_url}}/health
```

### Paso 2: Sincronizar códigos QR

```
POST {{base_url}}/api/sync/codigos-qr
Body: {}
```

### Paso 3: Verificar SKUs disponibles

```
GET {{base_url}}/api/skus?limit=5
```

### Paso 4: Crear PO

```
POST {{base_url}}/api/pos
Body: {
  "numeroPo": "PO-2025-001",
  "proveedor": "Test Corp"
}
```

### Paso 5: Crear Cartón

```
POST {{base_url}}/api/cartones
Body: {
  "cartonId": "CARTON-001",
  "poId": "PO-2025-001",
  "cantidadTotal": 12
}
```

### Paso 6: Iniciar escaneo

```
POST {{base_url}}/api/cartones/CARTON-001/iniciar
```

### Paso 7: Validar QR

```
POST {{base_url}}/api/escaneos/validar
Body: {
  "codigoQr": "http://192.168.0.249:500/Q/3TTAKYGBLOXJ"
}
```

### Paso 8: Registrar escaneo

```
POST {{base_url}}/api/escaneos
Body: {
  "cartonId": "CARTON-001",
  "codigoQr": "http://192.168.0.249:500/Q/3TTAKYGBLOXJ",
  "usuario": "test_user"
}
```

### Paso 9: Ver progreso

```
GET {{base_url}}/api/cartones/CARTON-001
```

### Paso 10: Finalizar

```
POST {{base_url}}/api/cartones/CARTON-001/finalizar
Body: {
  "accion": "ENVIAR"
}
```

---

## 📝 Notas

1. **Códigos QR reales**: Para probar con datos reales, primero ejecuta la sincronización
2. **Variables**: Ajusta las variables según tus datos
3. **Orden**: Algunos endpoints dependen de que existan datos previos
4. **Errores**: Los errores 404 son normales si los recursos no existen

---

## 🔄 Importar a Postman

1. Abre Postman
2. Click en "Import"
3. Pega los ejemplos en formato cURL o crea manualmente
4. Configura las variables de entorno

## 💡 Tips

- Usa **Tests** en Postman para validaciones automáticas
- Crea **Pre-request Scripts** para generar datos dinámicos
- Guarda las respuestas como **Examples** para documentación
- Usa **Collections Runner** para ejecutar flujos completos
