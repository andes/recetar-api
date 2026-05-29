## POST /auth/register

Registra un nuevo usuario en el sistema.

### Detalle

- Validación mediante Cloudflare Turnstile (captcha).
- Para `roleType: professional` verifica contra ANDES que el profesional exista y tenga matrícula válida.
- Para `roleType: pharmacist` verifica contra ANDES la farmacia y su responsable técnico.
- Si no hay servicio de email configurado, no envía notificación de bienvenida.

### Campos requeridos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| username | string | DNI del profesional o CUIT del farmacéutico |
| password | string | Mínimo 8 caracteres |
| roleType | string | `professional` o `pharmacist` |
| captcha | string | Token de Cloudflare Turnstile |
