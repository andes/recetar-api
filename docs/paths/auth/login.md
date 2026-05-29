## POST /auth/login

Autentica al usuario con email o nombre de usuario y contraseña.

### Detalle

- La autenticación se realiza contra MongoDB local (no LDAP ni SSO).
- El campo `identifier` acepta tanto email como username.
- La contraseña debe tener al menos 8 caracteres.
- Si la contraseña venció (3 meses sin cambios), el endpoint responde 401 y envía un email de recuperación si el servicio de email está configurado.

### Ejemplo cURL

```bash
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"identifier":"profesional@test.com","password":"12345678"}'
```
