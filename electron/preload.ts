import { contextBridge, ipcRenderer } from 'electron';
import type {
  CreateClientPayload,
  UpdateClientPayload,
  CreateInvoicePayload,
  UpdateInvoicePayload,
} from '../src/types/electron';

// Expose safe database functions to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // ── Clients ──────────────────────────────────────────────────────────────
  getClients: () => ipcRenderer.invoke('db-get-clients'),

  createClient: (payload: CreateClientPayload) =>
    ipcRenderer.invoke('db-create-client', payload),

  updateClient: (payload: UpdateClientPayload) =>
    ipcRenderer.invoke('db-update-client', payload),

  deleteClient: (id: number) => ipcRenderer.invoke('db-delete-client', id),

  // ── Invoices ─────────────────────────────────────────────────────────────
  getInvoices: () => ipcRenderer.invoke('db-get-invoices'),

  getInvoiceById: (id: number) => ipcRenderer.invoke('db-get-invoice-by-id', id),

  createInvoice: (payload: CreateInvoicePayload) =>
    ipcRenderer.invoke('db-create-invoice', payload),

  updateInvoice: (payload: UpdateInvoicePayload) =>
    ipcRenderer.invoke('db-update-invoice', payload),

  deleteInvoice: (id: number) => ipcRenderer.invoke('db-delete-invoice', id),

  updateInvoiceStatus: (id: number, status: string) =>
    ipcRenderer.invoke('db-update-invoice-status', id, status),

  // ── Invoice statuses ──────────────────────────────────────────────────────
  getInvoiceStatuses: () => ipcRenderer.invoke('db-get-invoice-statuses'),

  createInvoiceStatus: (name: string, color: string) =>
    ipcRenderer.invoke('db-create-invoice-status', name, color),

  updateInvoiceStatusColor: (name: string, color: string) =>
    ipcRenderer.invoke('db-update-invoice-status-color', name, color),

  deleteInvoiceStatus: (name: string) =>
    ipcRenderer.invoke('db-delete-invoice-status', name),

  // ── Flags ─────────────────────────────────────────────────────────────────
  getFlags: () => ipcRenderer.invoke('db-get-flags'),

  toggleInvoiceFlag: (invoiceId: number, flagId: number) =>
    ipcRenderer.invoke('db-toggle-invoice-flag', invoiceId, flagId),

  // ── Export / email ────────────────────────────────────────────────────────
  printToPDF: (invoiceNumber: string, htmlContent: string) =>
    ipcRenderer.invoke('print-to-pdf', invoiceNumber, htmlContent),

  emailInvoice: (
    invoiceNumber: string,
    htmlContent: string,
    recipientEmail: string,
    clientName: string,
    grandTotal: number,
    dueDate: string,
  ) => ipcRenderer.invoke('email-invoice', invoiceNumber, htmlContent, recipientEmail, clientName, grandTotal, dueDate),

  emailMultipleInvoices: (
    invoiceEntries: Array<{ invoiceNumber: string; htmlContent: string; clientName: string; grandTotal: number; dueDate: string }>,
    recipientEmail: string,
  ) => ipcRenderer.invoke('email-multiple-invoices', invoiceEntries, recipientEmail),

  // ── Projects ──────────────────────────────────────────────────────────────
  getProjects: () => ipcRenderer.invoke('db-get-projects'),

  createProject: (name: string, clientId: number | null, description: string, status: string, startDate: string) =>
    ipcRenderer.invoke('db-create-project', name, clientId, description, status, startDate),

  updateProject: (id: number, name: string, clientId: number | null, description: string, status: string, startDate: string) =>
    ipcRenderer.invoke('db-update-project', id, name, clientId, description, status, startDate),

  deleteProject: (id: number) => ipcRenderer.invoke('db-delete-project', id),

  // ── Settings ──────────────────────────────────────────────────────────────
  getSettings: () => ipcRenderer.invoke('db-get-settings'),

  saveSettings: (settings: Record<string, string>) =>
    ipcRenderer.invoke('db-save-settings', settings),

  // ── Activity ──────────────────────────────────────────────────────────────
  getActivityLogs: () => ipcRenderer.invoke('db-get-activity-logs'),

  getInvoiceActivityLogs: (invoiceId: number) =>
    ipcRenderer.invoke('db-get-invoice-activity-logs', invoiceId),
});
