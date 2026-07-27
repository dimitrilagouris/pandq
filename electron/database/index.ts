/**
 * Public API for the database layer.
 *
 * Core init/accessor logic lives in core.ts.
 * Domain-specific query helpers belong in the sibling files:
 *   - clients.ts
 *   - invoices.ts
 *   - projects.ts
 *   - settings.ts
 *   - activity.ts
 */
export { initDatabase, getDb } from './core';
