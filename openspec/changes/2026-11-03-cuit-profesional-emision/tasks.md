# Tasks

## 1. CUIT/CUIL

- [x] 1.1 Util `tax-id` (`normalizeTaxId`, `isValidCuitCuil`) en `shared/utils`
- [x] 1.2 `ProfessionalService.resolveCuit` con fallback ANDES → cuenta
- [x] 1.3 `ProfessionalCuilRequiredError` (422) en `requireForUser`
- [x] 1.4 `registerProfessional` acepta el CUIL del formulario si ANDES no trae `cuit`
- [x] 1.5 `updateOwnUserSchema` acepta `cuil` validado
- [x] 1.6 `checkPraxisEligibility` marca `Profesional sin CUIT/CUIL`

## 2. Tests

- [x] 2.1 Resolución por ANDES, por cuenta y 422 sin CUIT/CUIL
- [x] 2.2 Validación de CUIT/CUIL en DTOs de registro y autogestión
- [x] 2.3 Elegibilidad Praxis sin CUIT/CUIL

## 3. Verificación

- [x] 3.1 `npm run lint`
- [x] 3.2 `npm run build`
- [x] 3.3 `npm test`
