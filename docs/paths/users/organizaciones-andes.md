## GET /users/organizaciones-andes

Busca organizaciones en ANDES por nombre.

### Detalle

- Proxy hacia el endpoint de ANDES `/core/tm/organizaciones`.
- Requiere las variables de entorno `ANDES_ENDPOINT` y `JWT_MPI_TOKEN`.
- Filtra solo organizaciones activas.
- Retorna lo que devuelva ANDES directamente (sin transformación).

### Ejemplo cURL

```bash
curl -s -X GET "http://localhost:4000/api/users/organizaciones-andes?nombre=Hospital" \
  -H "Authorization: Bearer <token>"
```
