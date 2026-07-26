import test from 'node:test';
import assert from 'node:assert';
import { validateToolArgs } from '../../src/schemas/tool.schema.mjs';

test('tool.schema validation', async (t) => {
  await t.test('validates correctly with valid arguments', () => {
    const rawArgs = { service: 'database' };
    const result = validateToolArgs('get_system_status', rawArgs);
    assert.strictEqual(result.success, true);
    assert.deepStrictEqual(result.data, { service: 'database' });
    assert.strictEqual(result.error, undefined);
  });

  await t.test('returns error for unknown tool', () => {
    const result = validateToolArgs('unknown_tool', {});
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.error, 'Herramienta desconocida: unknown_tool');
    assert.strictEqual(result.data, undefined);
  });

  await t.test('returns error without throwing for invalid arguments', () => {
    // service requires min length of 1
    const rawArgs = { service: '' };
    const result = validateToolArgs('get_system_status', rawArgs);
    assert.strictEqual(result.success, false);
    assert.ok(result.error.includes("El nombre del servicio es requerido"));
    assert.strictEqual(result.data, undefined);
  });
});
