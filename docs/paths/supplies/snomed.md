## GET /supplies/snomed

Busca conceptos SNOMED en ANDES para insumos.

### Detalle

- Proxy hacia el endpoint de ANDES `/core/term/snomed` con una expresión ECL predefinida para insumos.
- Requiere las variables de entorno `ANDES_ENDPOINT` y `JWT_MPI_TOKEN`.
- Retorna conceptos SNOMED con `conceptId`, `term`, `fsn` y `semanticTag`.

### Ejemplo cURL

```bash
curl -s -X GET "http://localhost:4000/api/supplies/snomed?search=ibuprofeno" \
  -H "Authorization: Bearer <token>"
```
