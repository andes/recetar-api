# Tasks

## 1. Modelado de genérico + sugerido

- [ ] 1.1 Agregar al `supply` del modelo/DTO los campos de genérico (droga, presentación) y de comercial sugerido, y verificar con test de creación/lectura del documento
- [ ] 1.2 Ajustar el mapper de salida/entrada para preservar genérico y sugerido, y verificar con test de round-trip

## 2. Resolución del código Alfabeta

- [ ] 2.1 Definir e implementar la resolución del código Alfabeta del genérico con el vademecum (mapeo SNOMED/conceptId → droga/alfabeta) y verificar con test unitario
- [ ] 2.2 Implementar la selección del sugerido por defecto (criterio por menor precio) y verificar con test

## 3. Envío a Praxis

- [ ] 3.1 Enviar a Praxis el `codigoAlfabeta`/`codigoBarras` del sugerido (elegido o por defecto) y verificar con test que el payload usa el código del sugerido
- [ ] 3.2 Confirmar con Praxis el soporte de genérico/sugerido y ajustar el payload si corresponde (spike); documentar el resultado en `design.md`

## 4. Verificación

- [ ] 4.1 Ejecutar la verificación de `recetar-api` (`npm run lint`, `npm run build`, `npm test`) y registrar el resultado

## Workflow follow-up

- Archivar el change cuando se cumplan los requisitos de revisión del proyecto.
- Verificar el resultado archivado.
