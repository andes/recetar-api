# Guía de migración de rutas API para Recetar App

> **Propósito:** Esta guía documenta todos los cambios de ruta, método HTTP, autenticación y formato de respuesta que un agente de IA debe aplicar en la aplicación Recetar (frontend/mobile) para consumir la API refactorizada.

## Prefijo base

Todas las rutas usan el prefijo `/api`. Ejemplo: `PATCH /api/patients/:id`.

---

## 1. Cambios de método HTTP: PUT → PATCH

Todos los endpoints que antes usaban `PUT` ahora usan `PATCH`. La API ya no expone `PUT` en ningún recurso.

| Módulo | Ruta | Método anterior | Método nuevo |
|--------|------|:---:|:---:|
| Pacientes | `/patients/:id` | PUT | PATCH |
| Profesionales | `/professionals/:id` | PUT | PATCH |
| Farmacéuticos | `/pharmacists/:id` | PUT | PATCH |
| Farmacias | `/pharmacies/:id` | PUT | PATCH |
| Insumos | `/supplies/:id` | PUT | PATCH |
| Prácticas | `/practices/:id` | PUT | PATCH |
| Certificados | `/certificates/:id` | PUT | PATCH |
| Recetas | `/prescriptions/:id` | PUT | PATCH |
| Recetas - dispensar | `/prescriptions/:id/dispense` | PUT | PATCH |
| Recetas - cancelar dispensa | `/prescriptions/:id/cancel-dispense` | PUT | PATCH |
| Recetas ANDES - dispensar | `/prescriptions/andes/dispense` | PUT | PATCH |
| Recetas ANDES - cancelar dispensa | `/prescriptions/andes/cancel-dispense` | PUT | PATCH |
| Recetas ANDES - suspender | `/prescriptions/andes/suspend` | PUT | PATCH |

---

## 2. Cambios de ruta

| Descripción | Ruta anterior | Ruta nueva |
|-------------|---------------|------------|
| Buscar paciente por DNI | `GET /patients/get-by-dni/:dni` | `GET /patients/dni/:dni` |
| Obtener obras sociales | `GET /patients/get-os` | `GET /patients/coverages` |
| Obtener obra social por DNI | `GET /patients/get-os-by-dni` | `GET /patients/coverages/:dni` |
| Obtener token | `GET /user/get-token` | `POST /auth/get-token` |
| Buscar recetas de paciente (ANDES) | `GET /andes-prescriptions/verificar` | `GET /prescriptions/andes/verify` |
| Obtener receta ANDES por ID | `GET /andes-prescriptions/:id` | `GET /prescriptions/andes/:id` |
| Parámetro en ruta find | `GET /prescriptions/find/:patient_id` | `GET /prescriptions/find/:patientId` |

---

## 3. Endpoints eliminados (ya no existen)

| Ruta | Alternativa |
|------|-------------|
| `GET /andes/professionals` | Usar `PATCH /professionals/` (CRUD local) |
| `GET /andes/pharmacies` | Usar `PATCH /pharmacies/` (CRUD local) |
| `GET /supplies/get-by-name` | Usar `GET /supplies/?name=` |
| `GET /snomed/supplies/` | Eliminado (integración SNOMED directa eliminada) |
| `GET /prescriptions/user/:id/search` | Usar `GET /prescriptions/?professionalId=` |
| `POST /prescriptions/get-csv/` | Eliminado |
| `GET /certificates/get-by-user-id/:userId` | Usar `GET /certificates/?professionalId=` |
| `GET /certificates/user/:id` | Usar `GET /certificates/?professionalId=` |
| `GET /certificates/user/:id/search` | Usar `GET /certificates/?professionalId=` |
| `GET /practices/user/:id` | Usar `GET /practices/` con filtros |
| `GET /practices/user/:id/search` | Usar `GET /practices/` con filtros |
| `POST /andes/prescriptions` | Usar `POST /prescriptions/` + integración ANDES interna |
| `POST /andes/practices` | Usar `POST /practices/` |
| `GET /users/index` | Eliminado (módulo Users completo eliminado) |
| `GET /users/search` | Eliminado |
| `GET /users/:id` | Eliminado |
| `POST /users/create` | Eliminado |
| `POST /users/update` | Eliminado |
| `POST /users/update-own` | Eliminado |
| `POST /users/request-update` | Eliminado |
| `POST /users/confirm-update` | Eliminado |
| `GET /organizaciones-andes` | Eliminado |
| `GET /roles/types` | Eliminado (módulo Roles eliminado) |
| `GET /jobs`, `POST /schedule-*`, `POST /cancel`, `POST /delete`, `GET /stats` | Eliminado (módulo Jobs eliminado, usar Agenda UI) |

---

## 4. Endpoints nuevos

| Ruta | Descripción |
|------|-------------|
| `GET /professionals/` | Listar profesionales |
| `GET /professionals/dni/:dni` | Buscar profesional por DNI |
| `GET /professionals/:id` | Obtener profesional por ID |
| `PATCH /professionals/:id` | Actualizar profesional |
| `DELETE /professionals/:id` | Eliminar profesional |
| `GET /pharmacists/` | Listar farmacéuticos |
| `GET /pharmacists/:id` | Obtener farmacéutico |
| `POST /pharmacists/` | Crear farmacéutico |
| `PATCH /pharmacists/:id` | Actualizar farmacéutico |
| `DELETE /pharmacists/:id` | Eliminar farmacéutico |
| `GET /pharmacies/` | Listar farmacias |
| `GET /pharmacies/:id` | Obtener farmacia |
| `POST /pharmacies/` | Crear farmacia |
| `PATCH /pharmacies/:id` | Actualizar farmacia |
| `DELETE /pharmacies/:id` | Eliminar farmacia |
| `GET /supplies/:id` | Obtener insumo por ID |
| `DELETE /supplies/:id` | Eliminar insumo |
| `GET /practices/` | Listar prácticas (con filtros) |
| `PATCH /practices/:id` | Actualizar práctica |
| `DELETE /practices/:id` | Eliminar práctica |
| `DELETE /certificates/:id` | Eliminar certificado |
| `GET /prescriptions/dispensed-by/:cuil` | Recetas despachadas por CUIL |

---

## 5. Autenticación

- La mayoría de los endpoints requieren `Authorization: Bearer <token>` (JWT).
- Endpoints públicos (sin auth):
  - `POST /auth/login`
  - `POST /auth/register` (y otros de auth que no llevan `checkAuth`)
  - `GET /auth/pharmacies-andes`
  - `GET /auth/professionals-andes`
  - `GET /auth/authorizedProfessions`
  - `GET /certificates/:id`
  - `GET /practices/:id`
- Los demás endpoints requieren token JWT.

---

## 6. Formato de respuestas

### Lista paginada
```json
{
  "status": "success",
  "data": {
    "<recurso>": [],
    "total": 0,
    "offset": 0,
    "limit": 20
  }
}
```

### Recurso individual
```json
{
  "status": "success",
  "data": { ... }
}
```

### Error
```json
{
  "status": "error",
  "error": {
    "code": "RECURSO_NOT_FOUND",
    "message": "Insumo no encontrado",
    "details": []
  }
}
```

### Códigos HTTP
| Situación | Código |
|-----------|:------:|
| Creación exitosa | 201 |
| Lectura exitosa | 200 |
| Actualización exitosa | 200 |
| Eliminación exitosa | **204** (sin body) |
| Error de validación | 422 |
| No encontrado | 404 |
| Error de negocio | 409 |

---

## 7. Schemas de body (campos principales)

### POST /auth/login
```json
{ "email": "string", "password": "string" }
```

### POST /auth/register
```json
{
  "email": "string",
  "password": "string (min 6)",
  "nombre": "string",
  "apellido": "string",
  "documento": "string",
  "dni": "string",
  "rol": "farmaceutico | profesional | admin"
}
```

### POST /prescriptions/
```json
{
  "patient": { "firstName": "string", "lastName": "string", "dni": "string", "sex": "string" },
  "professional": { "businessName": "string", "username": "string", "enrollment": "string" },
  "supplies": [{
    "supply": { "name": "string", "snomedConcept": { "conceptId": "string", "term": "string" } },
    "quantity": "number",
    "diagnostic": "string",
    "indication": "string"
  }],
  "date": "string"
}
```

### PATCH /prescriptions/:id/dispense
```json
{
  "userId": "string",
  "businessName": "string",
  "cuil": "string (opcional)"
}
```

---

## 8. Checklist para el agente de frontend

```markdown
- [ ] Reemplazar todas las llamadas PUT por PATCH en los 13 endpoints listados
- [ ] Actualizar ruta GET /patients/get-by-dni/:dni → GET /patients/dni/:dni
- [ ] Actualizar ruta GET /patients/get-os → GET /patients/coverages
- [ ] Actualizar ruta GET /patients/get-os-by-dni → GET /patients/coverages/:dni
- [ ] Actualizar ruta GET /user/get-token → POST /auth/get-token
- [ ] Actualizar ruta GET /andes-prescriptions/:id → GET /prescriptions/andes/:id
- [ ] Actualizar ruta GET /andes-prescriptions/verificar → GET /prescriptions/andes/verify
- [ ] Actualizar parámetro patient_id → patientId en GET /prescriptions/find/:patientId
- [ ] Eliminar llamadas a endpoints de Users module (9 endpoints)
- [ ] Eliminar llamadas a endpoints de Roles module (GET /roles/types)
- [ ] Eliminar llamadas a endpoints de Jobs module (7 endpoints)
- [ ] Usar filtros por query params (?professionalId=, ?patientId=, etc.) en lugar de sub-rutas /user/:id/search
- [ ] Manejar código 204 en DELETE (sin body)
- [ ] Manejar código 422 como error de validación
```
