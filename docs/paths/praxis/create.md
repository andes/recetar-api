## POST /prescriptions/praxis

Crea una prescripción electrónica en el sistema Praxis v2.

### Detalle

Este endpoint permite crear prescripciones médicas electrónicas en el sistema Praxis, que es el sistema oficial de prescripción electrónica.

**Reglas de negocio:**
- El paciente debe tener un documento válido (DNI)
- Se requiere al menos un renglón en la prescripción
- La matrícula del prescriptor es obligatoria
- Si el paciente tiene cobertura, se debe incluir la información de obra social
- Los códigos de producto deben ser válidos en Praxis

**Flujo interno:**
1. Valida los datos de entrada con Zod schema
2. Mapea los datos al formato Praxis v2 usando `PraxisMapper`
3. Envía POST a `/api/v2/prescripcion` en Praxis
4. Retorna el ID de la prescripción creada

### Ejemplo cURL

```bash
curl -s -X POST http://localhost:4000/api/prescriptions/praxis \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "paciente": {
      "nombre": "JUAN",
      "apellido": "PEREZ",
      "tipoDocumento": "DNI",
      "numeroDocumento": 30123456,
      "fechaNacimiento": "1990-01-15T00:00:00",
      "sexo": "M"
    },
    "prescriptor": {
      "matricula": "12345",
      "tipoMatricula": "N",
      "idProvinciaMatricula": "C",
      "tipoPrescriptor": "M"
    },
    "renglones": [
      {
        "tipoPrescripcion": "G",
        "producto": {
          "codigoAlfabeta": 65123456,
          "codigoBarras": "7891234567890"
        },
        "cantidadEnvases": 1,
        "diagnostico": {
          "descripcion": "Hipertensión arterial esencial",
          "codigoCIE10": "I10"
        },
        "indicaciones": "Tomar 1 comprimido por vía oral cada 24 horas"
      }
    ],
    "tratamientoProlongado": false
  }'
```

### Respuesta exitosa (201)

```json
{
  "status": "success",
  "data": {
    "idPrescripcion": "12345",
    "estado": "creada",
    "mensaje": "Prescripción creada exitosamente"
  }
}
```

### Errores comunes

| Código | Descripción |
|--------|-------------|
| 422 | Error de validación (datos faltantes o inválidos) |
| 500 | Error de conexión con Praxis |
