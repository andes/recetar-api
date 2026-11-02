# Spec Delta

## Purpose

Define cómo `recetar-api` emite su canal operacional por OTLP (bootstrap, identidad, wide events, sampling, PII y cierre ordenado), de forma verificable y alineada al contrato `observability/contract` v1.

## ADDED Requirements

### Requirement: Bootstrap previo a Express y Pino
El proceso SHALL inicializar el SDK de OpenTelemetry antes de cargar `express`, `pino` y `pino-http`. El repositorio MUST garantizar ese orden mediante un módulo de telemetría importado primero en el entrypoint.

#### Scenario: Request instrumentado
- **WHEN** la API recibe un request HTTP con la telemetría inicializada
- **THEN** se genera una traza HTTP en Tempo además del log operacional

#### Scenario: Orden de carga alterado
- **WHEN** el módulo de telemetría deja de ser el primer import del entrypoint
- **THEN** la verificación de integración detecta la ausencia de spans HTTP y falla

### Requirement: Identidad del servicio por entorno
La API SHALL tomar `service.name`, `deployment.environment` y `service.instance.id` de `SERVICE_NAME`, `DEPLOYMENT_ENVIRONMENT` e `INSTANCE_ID`, y la versión de `APP_VERSION`. `SERVICE_NAME` es obligatorio y no se reemplaza por un valor fijo en el código.

#### Scenario: Identidad configurada
- **WHEN** el proceso arranca con `SERVICE_NAME=recetar-api` y `DEPLOYMENT_ENVIRONMENT=prod`
- **THEN** logs, trazas y métricas llegan con `service_name=recetar-api` y `deployment_environment=prod`

#### Scenario: Falta la identidad
- **WHEN** el proceso arranca sin `SERVICE_NAME`
- **THEN** el resource queda como `unknown` y se emite una advertencia visible en el arranque

### Requirement: Wide event por request HTTP
Cada request SHALL producir un wide event con `action=http.request`, `request_id`, `method`, `path`, `status_code`, `duration_ms`, `outcome` y `version`. El `request_id` MUST reutilizar `X-Request-Id` cuando venga en el request y SHALL devolverse en la respuesta.

#### Scenario: Request exitoso
- **WHEN** llega un request que responde 2xx
- **THEN** se emite un wide event con `outcome="success"` y el mismo `X-Request-Id` recibido

#### Scenario: Request fallido
- **WHEN** un request responde con status mayor o igual a 400
- **THEN** el wide event se emite siempre, con `outcome="error"` y `status_code` real

### Requirement: Wide event sin duplicar atributos de recurso
El wide event MUST NOT repetir `service.name`, `service.instance.id` ni `deployment.environment`; esos atributos se toman del resource de cada línea.

#### Scenario: Línea emitida
- **WHEN** se inspecciona la línea JSON del wide event
- **THEN** cada atributo de recurso aparece una sola vez y proviene del logger base

### Requirement: Sampling y access log
Los wide events SHALL emitirse siempre para errores y requests que superen el umbral de lentitud, y aplicar `LOG_SAMPLE_RATE` al resto. El sampling de trazas SHALL configurarse con `OTEL_TRACES_SAMPLER_RATIO`, independiente del sample de wide events. El access log de `pino-http` MUST quedar deshabilitado por defecto.

#### Scenario: Errores fuera del sample
- **WHEN** `LOG_SAMPLE_RATE` es bajo y el request responde 500
- **THEN** el wide event se emite igual

#### Scenario: Trazas desactivadas sin afectar logs
- **WHEN** `OTEL_TRACES_SAMPLER_RATIO=0`
- **THEN** no se exportan trazas y los logs operacionales siguen emitiéndose

### Requirement: Protección de PII y PHI
La API MUST NOT emitir DNI, tokens, cuerpos clínicos ni credenciales en el canal operacional, y SHALL redactar `authorization`, `cookie`, `x-api-key` y `set-cookie`.

#### Scenario: Datos sensibles enriquecidos
- **WHEN** un módulo intenta enriquecer un wide event con datos personales o clínicos
- **THEN** sólo viajan identificadores internos no sensibles

#### Scenario: Header sensible
- **WHEN** el request incluye `Authorization`
- **THEN** el valor aparece como `[REDACTED]` en la línea emitida

### Requirement: Cierre ordenado con flush de telemetría
Ante `SIGTERM` o `SIGINT`, el proceso SHALL cerrar el servidor HTTP, ejecutar el flush y shutdown del SDK y luego finalizar. MUST NOT invocarse `process.exit()` antes de completar el flush.

#### Scenario: Deploy con reinicio
- **WHEN** el proceso recibe `SIGTERM` con telemetría inicializada
- **THEN** cierra el servidor, hace flush del SDK y termina sin perder las últimas líneas

#### Scenario: Proceso sin telemetría
- **WHEN** la telemetría está deshabilitada por configuración
- **THEN** el cierre sigue funcionando y no bloquea el proceso

### Requirement: Degradación sin colector disponible
La API SHALL seguir respondiendo requests cuando el colector OTLP no esté disponible, y el cierre MUST completarse aunque el exportador no responda.

#### Scenario: Alloy caído
- **WHEN** `OTEL_EXPORTER_OTLP_ENDPOINT` apunta a un host inalcanzable
- **THEN** los endpoints de negocio responden con normalidad y el proceso cierra sin colgarse
