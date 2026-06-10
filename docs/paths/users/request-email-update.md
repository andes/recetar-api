## POST /users/request-email-update

Solicita un cambio de email para el usuario autenticado.

### Detalle

- Genera un token de confirmación con expiración de 24 horas.
- Envía un email de confirmación a la nueva dirección (si el servicio de email está configurado).
- El email no se actualiza hasta que se confirme con el token.

### Ejemplo cURL

```bash
curl -s -X POST http://localhost:4000/api/users/request-email-update \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"email":"nuevo@example.com"}'
```
