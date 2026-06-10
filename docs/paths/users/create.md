## POST /users

Crea un nuevo usuario en el sistema.

### Detalle

- `password` debe tener al menos 8 caracteres.
- `roles` debe contener al menos un ID de rol válido.
- Si se provee `email`, debe ser único en el sistema.
- Si se provee `username`, debe ser único en el sistema.
- El usuario se crea con `isActive: true` por defecto.
- Si el rol es `auditor`, `username` es obligatorio.

### Ejemplo cURL

```bash
curl -s -X POST http://localhost:4000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"password":"12345678","roles":["507f1f77bcf86cd799439011"],"email":"nuevo@test.com","businessName":"Nuevo Usuario"}'
```
