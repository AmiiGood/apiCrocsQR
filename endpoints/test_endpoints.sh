#!/bin/bash

# ============================================
# Script de Prueba de Endpoints
# ============================================

BASE_URL="http://localhost:3000"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "============================================"
echo "🧪 PRUEBAS DE API - Sistema de Escaneo"
echo "============================================"
echo ""

# Función para hacer requests
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo -e "${YELLOW}Testing:${NC} $description"
    echo -e "  ${method} ${endpoint}"
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X ${method} "${BASE_URL}${endpoint}")
    else
        response=$(curl -s -w "\n%{http_code}" -X ${method} "${BASE_URL}${endpoint}" \
            -H "Content-Type: application/json" \
            -d "${data}")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ $http_code -ge 200 ] && [ $http_code -lt 300 ]; then
        echo -e "  ${GREEN}✓ Success${NC} (HTTP $http_code)"
    else
        echo -e "  ${RED}✗ Failed${NC} (HTTP $http_code)"
        echo "  Response: $body"
    fi
    echo ""
}

# ============================================
# 1. Health Check
# ============================================
echo "1️⃣  Health Checks"
echo "----------------------------------------"
test_endpoint "GET" "/" "Root endpoint"
test_endpoint "GET" "/health" "Health check"

# ============================================
# 2. Sincronización
# ============================================
echo "2️⃣  Sincronización"
echo "----------------------------------------"
test_endpoint "GET" "/api/sync/estado" "Estado de sincronización"
test_endpoint "GET" "/api/sync/ultima" "Última sincronización"

# ============================================
# 3. SKUs
# ============================================
echo "3️⃣  SKUs"
echo "----------------------------------------"
test_endpoint "GET" "/api/skus?limit=5" "Listar SKUs"
test_endpoint "GET" "/api/skus/mas-escaneados?limit=5" "SKUs más escaneados"

# ============================================
# 4. POs
# ============================================
echo "4️⃣  Purchase Orders"
echo "----------------------------------------"

# Crear PO
PO_NUM="PO-TEST-$(date +%s)"
test_endpoint "POST" "/api/pos" \
    "{\"numeroPo\": \"${PO_NUM}\", \"proveedor\": \"Test Provider\"}" \
    "Crear PO"

# Listar POs
test_endpoint "GET" "/api/pos" "Listar POs"

# Obtener PO específico
test_endpoint "GET" "/api/pos/${PO_NUM}" "Obtener PO ${PO_NUM}"

# Actualizar PO
test_endpoint "PUT" "/api/pos/${PO_NUM}" \
    "{\"estado\": \"EN_PROCESO\"}" \
    "Actualizar estado de PO"

# ============================================
# 5. Cartones
# ============================================
echo "5️⃣  Cartones"
echo "----------------------------------------"

# Crear Cartón
CARTON_ID="CARTON-TEST-$(date +%s)"
test_endpoint "POST" "/api/cartones" \
    "{\"cartonId\": \"${CARTON_ID}\", \"poId\": \"${PO_NUM}\", \"cantidadTotal\": 5}" \
    "Crear Cartón"

# Listar Cartones
test_endpoint "GET" "/api/cartones" "Listar Cartones"

# Obtener Cartón específico
test_endpoint "GET" "/api/cartones/${CARTON_ID}" "Obtener Cartón ${CARTON_ID}"

# Iniciar escaneo
test_endpoint "POST" "/api/cartones/${CARTON_ID}/iniciar" "" "Iniciar escaneo"

# ============================================
# 6. Escaneos
# ============================================
echo "6️⃣  Escaneos"
echo "----------------------------------------"

# Estadísticas
test_endpoint "GET" "/api/escaneos/estadisticas" "Estadísticas de escaneos"

# Validar QR (este probablemente falle si no hay datos)
test_endpoint "POST" "/api/escaneos/validar" \
    "{\"codigoQr\": \"http://192.168.0.249:500/Q/TEST\"}" \
    "Validar código QR (puede fallar si no existe)"

# Obtener escaneos del cartón
test_endpoint "GET" "/api/escaneos/carton/${CARTON_ID}" "Escaneos del cartón"

# Resumen por SKU
test_endpoint "GET" "/api/escaneos/carton/${CARTON_ID}/resumen" "Resumen por SKU"

# ============================================
# 7. Limpieza (opcional)
# ============================================
echo "7️⃣  Limpieza (opcional)"
echo "----------------------------------------"
echo "Para limpiar los datos de prueba:"
echo "  DELETE /api/cartones/${CARTON_ID}"
echo "  DELETE /api/pos/${PO_NUM}"
echo ""

read -p "¿Deseas eliminar los datos de prueba? (s/n): " cleanup

if [ "$cleanup" = "s" ] || [ "$cleanup" = "S" ]; then
    test_endpoint "DELETE" "/api/cartones/${CARTON_ID}" "" "Eliminar Cartón"
    test_endpoint "DELETE" "/api/pos/${PO_NUM}" "" "Eliminar PO"
fi

# ============================================
# Resumen
# ============================================
echo "============================================"
echo "✅ Pruebas completadas"
echo "============================================"
echo ""
echo "📊 Recursos creados (si no se limpiaron):"
echo "   PO: ${PO_NUM}"
echo "   Cartón: ${CARTON_ID}"
echo ""
echo "💡 Revisa los logs del servidor para más detalles"
echo "   npm run dev (en otra terminal)"