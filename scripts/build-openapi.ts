import { writeFileSync } from 'fs';
import { join } from 'path';
import { buildOpenApiSpec } from '../src/config/openapi';

const spec = buildOpenApiSpec();
const outputPath = join(__dirname, '../openapi.json');

writeFileSync(outputPath, JSON.stringify(spec, null, 2), 'utf-8');
// eslint-disable-next-line no-console
console.log(`OpenAPI spec generated: ${outputPath}`);
