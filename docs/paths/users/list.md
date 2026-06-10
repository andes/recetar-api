## GET /users

Lista paginada de usuarios del sistema.

### Detalle

- Soporta búsqueda por `searchTerm` sobre email, username, businessName, firstName y lastName.
- Solo usuarios con rol `admin` tienen acceso a listar todos los usuarios.
- Los resultados excluyen `password`, `refreshToken` y `authenticationToken`.

### Ejemplo cURL

```bash
curl -s -X GET http://localhost:4000/api/users?searchTerm=juan&offset=0&limit=10 \
  -H "Authorization: Bearer <token>"
```
