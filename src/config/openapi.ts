import { readFileSync, globSync } from 'node:fs';
import { join } from 'node:path';
import { load } from 'js-yaml';
import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';

const API_PREFIX = process.env.API_URI_PREFIX || process.env.API_URI_PRFIX || '/api';

const baseSpec: Record<string, unknown> = {
    openapi: '3.0.3',
    info: {
        title: 'RecetAR API',
        version: '1.0.0',
        description: readFileSync(join(__dirname, '../../docs/index.md'), 'utf-8'),
    },
    servers: [
        { url: `http://localhost:${process.env.PORT || 4000}${API_PREFIX}`, description: 'Local' },
    ],
    'x-tagGroups': [
        {
            name: 'Endpoints',
            tags: ['Autenticación', 'Prescripciones', 'Pacientes', 'Profesionales',
                   'Farmacéuticos', 'Farmacias', 'Insumos', 'Prácticas', 'Stock', 'Certificados',
                   'Usuarios'],
        },
        {
            name: 'Integraciones',
            tags: ['Andes'],
        },
    ],
};

const MERGE_KEYS = ['paths', 'components', 'tags', 'security'] as const;

function mergeYamlIntoSpec(spec: Record<string, unknown>, yamlDoc: Record<string, unknown>): void {
    for (const key of MERGE_KEYS) {
        const value = yamlDoc[key];
        if (value === undefined) { continue; }

        if (key === 'tags' && Array.isArray(value)) {
            const existing = (spec[key] ?? []) as unknown[];
            spec[key] = existing.concat(value as unknown[]);
        } else if (typeof value === 'object' && value !== null) {
            const existing = (spec[key] ?? {}) as Record<string, unknown>;
            spec[key] = { ...existing, ...value as Record<string, unknown> };
        }
    }
}

export function buildOpenApiSpec(): Record<string, unknown> {
    const spec: Record<string, unknown> = { ...baseSpec };

    const yamlFiles = globSync('src/{modules,integrations}/**/*.openapi.yaml');
    for (const filePath of yamlFiles) {
        const doc = load(readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
        mergeYamlIntoSpec(spec, doc);
    }

    resolveDescriptionFiles(spec);

    return spec;
}

function resolveDescriptionFiles(obj: unknown): void {
    if (typeof obj !== 'object' || obj === null) { return; }

    if (Array.isArray(obj)) {
        obj.forEach(resolveDescriptionFiles);
        return;
    }

    const record = obj as Record<string, unknown>;

    if ('x-description-file' in record && typeof record['x-description-file'] === 'string') {
        const filePath = join(__dirname, '../..', record['x-description-file'] as string);
        try {
            record['description'] = readFileSync(filePath, 'utf-8');
        } catch {
            record['description'] = `*Documentation not found: ${record['x-description-file']}*`;
        }
        delete record['x-description-file'];
    }

    for (const key of Object.keys(record)) {
        resolveDescriptionFiles(record[key]);
    }
}

// zod-to-openapi integration
let _registry: OpenAPIRegistry | null = null;

export function getZodRegistry(): OpenAPIRegistry {
    if (!_registry) {
        _registry = new OpenAPIRegistry();
    }
    return _registry;
}

export function generateZodComponents(): Record<string, unknown> {
    const registry = getZodRegistry();
    const generator = new OpenApiGeneratorV3(registry.definitions);
    return generator.generateComponents();
}
