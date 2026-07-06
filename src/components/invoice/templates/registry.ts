import { InvoiceTemplate } from './templateTypes';
import { classicTemplate } from './classic';
import { minimalTemplate } from './minimal';
import { miamiTemplate } from './miami';

/**
 * Central registry of all available invoice templates.
 * To add a new template, import it and append to this array.
 */
export const templates: InvoiceTemplate[] = [
  classicTemplate,
  minimalTemplate,
  miamiTemplate,
];

/** Look up a template by ID, falling back to 'classic' if not found. */
export function getTemplate(id: string): InvoiceTemplate {
  return templates.find(t => t.id === id) ?? classicTemplate;
}
