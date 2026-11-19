## POST /prescriptions/praxys

Crea una prescripción electrónica en el sistema Praxys v2.

### Detalle

Este endpoint permite crear prescripciones médicas electrónicas en el sistema Praxys, que es el sistema oficial de prescripción electrónica.

**Reglas de negocio:**
- El paciente debe tener un documento válido (DNI)
- Se requiere al menos un renglón en la prescripción
- La matrícula del prescriptor es obligatoria
- Si el paciente tiene cobertura, se debe incluir la información de obra social
- Los códigos de producto deben ser válidos en Praxys

**Flujo interno:**
1. Valida los datos de entrada con Zod schema
2. Mapea los datos al formato Praxys v2 usando `PraxysMapper`
3. Envía POST a `/api/v2/prescripcion` en Praxys
4. Retorna el ID de la prescripción creada

### Ejemplo cURL

```bash
curl -s -X POST http://localhost:4000/api/prescriptions/praxys \
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
    "tratamientoProlongado": false,
    "idAtencion": "P-123"
  }'
```

### Respuesta exitosa (201)

```json
{
  "status": "success",
  "data": {
    "idPrescripcion": 12345,
    "hash": "9f2c...",
    "recetasEmitidas": [
      {
        "numeroReceta": "10015",
        "idReceta": 1234567890,
        "hash": "a153a3...",
        "contenidoQR": "https://...",
        "cuirs": ["..."]
      }
    ],
    "mensajes": []
  }
}
```

El `hash` de la prescripción y el `hash` de cada receta son los identificadores que usa el contrato de eventos de Praxys. RecetAr los guarda en `identificadoresExternos` (`praxys` y `praxys-receta`) y en `syncExterno.praxys`.

En tratamientos prolongados se envía además `recetas: { cantidadRecetas: N, cantidadDiasEntreRecetas: 30 }` para que Praxys emita una receta por mes.

### Errores comunes

| Código | Descripción |
|--------|-------------|
| 422 | Error de validación (datos faltantes o inválidos) |
| 500 | Error de conexión con Praxys |
