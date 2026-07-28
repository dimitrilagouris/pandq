import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { getDb } from '../database';
import { getDatabaseSettings, insertActivityLog, formatDate } from '../database/utils';

export function registerSystemHandlers(): void {
  ipcMain.handle('print-to-pdf', async (_event, invoiceNumber: string, htmlContent: string): Promise<boolean> => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) {
      return false;
    }

    const { filePath } = await dialog.showSaveDialog(win, {
      title: 'Save Invoice as PDF',
      defaultPath: `Invoice-${invoiceNumber}.pdf`,
      filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
    });

    if (!filePath) {
      return false;
    }

    const printWin = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    const tempFilePath = path.join(app.getPath('temp'), `print-${Date.now()}.html`);
    fs.writeFileSync(tempFilePath, htmlContent, 'utf-8');
    
    await printWin.loadFile(tempFilePath);

    const pdfData = await printWin.webContents.printToPDF({
      pageSize: 'A4',
      margins: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
      },
      printBackground: true
    });

    fs.writeFileSync(filePath, pdfData);
    printWin.close();
    
    try {
      fs.unlinkSync(tempFilePath);
    } catch (e) {
      console.error('Failed to delete temp file:', e);
    }

    return true;
  });

  ipcMain.handle('email-invoice', async (
    _event,
    invoiceNumber: string,
    htmlContent: string,
    recipientEmail: string,
    clientName: string = '',
    grandTotal: number = 0,
    dueDate: string = ''
  ): Promise<boolean> => {
    const printWin = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    const tempHtmlPath = path.join(app.getPath('temp'), `print-${Date.now()}.html`);
    fs.writeFileSync(tempHtmlPath, htmlContent, 'utf-8');
    
    await printWin.loadFile(tempHtmlPath);

    const pdfData = await printWin.webContents.printToPDF({
      pageSize: 'A4',
      margins: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
      },
      printBackground: true
    });

    printWin.close();
    
    try {
      fs.unlinkSync(tempHtmlPath);
    } catch {}

    const tempPdfPath = path.join(app.getPath('temp'), `Invoice-${invoiceNumber}.pdf`);
    fs.writeFileSync(tempPdfPath, pdfData);

    const settings = getDatabaseSettings();
    const settingSubject = settings['setting_email_subject'] || 'Invoice {invoiceNumber}';
    const settingBody = settings['setting_email_body'] || 'Hi,\n\nPlease find attached invoice {invoiceNumber}.\n\nKind regards,\n{orgName}';
    const orgName = settings['setting_org_name'] || 'Your Business';

    const formattedTotal = `$${grandTotal.toFixed(2)}`;
    const formattedDueDate = formatDate(dueDate);

    const subject = settingSubject
      .replace(/{invoiceNumber}/g, invoiceNumber)
      .replace(/{clientName}/g, clientName)
      .replace(/{grandTotal}/g, formattedTotal)
      .replace(/{dueDate}/g, formattedDueDate);

    const body = settingBody
      .replace(/{invoiceNumber}/g, invoiceNumber)
      .replace(/{clientName}/g, clientName)
      .replace(/{grandTotal}/g, formattedTotal)
      .replace(/{dueDate}/g, formattedDueDate)
      .replace(/{orgName}/g, orgName);

    // Write AppleScript to a temp file to avoid shell escaping issues
    const scriptContent = [
      `set theAttachment to POSIX file "${tempPdfPath}" as alias`,
      `tell application "Mail"`,
      `  set newMsg to make new outgoing message with properties {subject:"${subject}", visible:true}`,
      `  tell newMsg`,
      `    set content to "${body.replace(/\n/g, '\\n')}"`,
      `    make new to recipient at end of to recipients with properties {address:"${recipientEmail}"}`,
      `    make new attachment with properties {file name:theAttachment} at after the last paragraph of content of newMsg`,
      `  end tell`,
      `  activate`,
      `end tell`,
    ].join('\n');

    const tempScriptPath = path.join(app.getPath('temp'), `mail-${Date.now()}.scpt`);
    fs.writeFileSync(tempScriptPath, scriptContent, 'utf-8');

    return new Promise((resolve) => {
      exec(`osascript "${tempScriptPath}"`, (error) => {
        try { fs.unlinkSync(tempScriptPath); } catch {}
        
        const db = getDb();
        const inv = db.prepare('SELECT id FROM invoices WHERE invoice_number = ?').get(invoiceNumber) as { id: number } | undefined;
        insertActivityLog(inv?.id || null, invoiceNumber, 'invoice_sent', `Emailed to ${recipientEmail}`);

        if (error) {
          console.error('Failed to open Mail.app via AppleScript:', error);
          shell.openExternal(`mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  });

  ipcMain.handle('email-multiple-invoices', async (
    _event,
    invoiceEntries: Array<{ invoiceNumber: string; htmlContent: string; grandTotal?: number; clientName?: string; dueDate?: string; }>,
    recipientEmail: string,
  ): Promise<boolean> => {
    const pdfPaths: string[] = [];

    for (const entry of invoiceEntries) {
      const printWin = new BrowserWindow({
        show: false,
        webPreferences: { nodeIntegration: false, contextIsolation: true }
      });

      const tempHtmlPath = path.join(app.getPath('temp'), `print-${Date.now()}-${Math.random().toString(36).slice(2)}.html`);
      fs.writeFileSync(tempHtmlPath, entry.htmlContent, 'utf-8');
      await printWin.loadFile(tempHtmlPath);

      const pdfData = await printWin.webContents.printToPDF({
        pageSize: 'A4',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        printBackground: true
      });

      printWin.close();
      try { fs.unlinkSync(tempHtmlPath); } catch {}

      const pdfPath = path.join(app.getPath('temp'), `Invoice-${entry.invoiceNumber}.pdf`);
      fs.writeFileSync(pdfPath, pdfData);
      pdfPaths.push(pdfPath);
    }

    const settings = getDatabaseSettings();
    const settingSubject = settings['setting_email_subject'] || 'Invoice {invoiceNumber}';
    const settingBody = settings['setting_email_body'] || 'Hi,\n\nPlease find attached invoice {invoiceNumber}.\n\nKind regards,\n{orgName}';
    const orgName = settings['setting_org_name'] || 'Your Business';

    const totalAmount = invoiceEntries.reduce((sum, e) => sum + (e.grandTotal || 0), 0);
    const clientName = invoiceEntries[0]?.clientName || '';
    const formattedTotal = `$${totalAmount.toFixed(2)}`;
    const dueDates = Array.from(new Set(invoiceEntries.map(e => e.dueDate).filter(Boolean))).map(d => formatDate(d as string)).join(', ');

    const invoiceNumbers = invoiceEntries.map(e => e.invoiceNumber).join(', ');
    const subjectRaw = settingSubject.includes('{invoiceNumber}')
      ? settingSubject.replace(/{invoiceNumber}/g, invoiceNumbers)
      : `Invoices: ${invoiceNumbers}`;

    const subject = subjectRaw
      .replace(/{clientName}/g, clientName)
      .replace(/{grandTotal}/g, formattedTotal)
      .replace(/{dueDate}/g, dueDates);

    let bodyRaw = settingBody.includes('{invoiceNumber}')
      ? settingBody.replace(/{invoiceNumber}/g, invoiceNumbers)
      : `Hi,\n\nPlease find attached ${invoiceEntries.length} invoice${invoiceEntries.length > 1 ? 's' : ''}: ${invoiceNumbers}.\n\nKind regards,\n${orgName}`;

    const body = bodyRaw
      .replace(/{clientName}/g, clientName)
      .replace(/{grandTotal}/g, formattedTotal)
      .replace(/{orgName}/g, orgName)
      .replace(/{dueDate}/g, dueDates);

    const attachmentLines = pdfPaths.map(p =>
      `    make new attachment with properties {file name:(POSIX file "${p}" as alias)} at after the last paragraph of content of newMsg`
    ).join('\n');

    const scriptContent = [
      `tell application "Mail"`,
      `  set newMsg to make new outgoing message with properties {subject:"${subject}", visible:true}`,
      `  tell newMsg`,
      `    set content to "${body.replace(/\n/g, '\\n')}"`,
      `    make new to recipient at end of to recipients with properties {address:"${recipientEmail}"}`,
      attachmentLines,
      `  end tell`,
      `  activate`,
      `end tell`,
    ].join('\n');

    const tempScriptPath = path.join(app.getPath('temp'), `mail-batch-${Date.now()}.scpt`);
    fs.writeFileSync(tempScriptPath, scriptContent, 'utf-8');

    return new Promise((resolve) => {
      exec(`osascript "${tempScriptPath}"`, (error) => {
        try { fs.unlinkSync(tempScriptPath); } catch {}

        const db = getDb();
        for (const entry of invoiceEntries) {
          const inv = db.prepare('SELECT id FROM invoices WHERE invoice_number = ?').get(entry.invoiceNumber) as { id: number } | undefined;
          insertActivityLog(inv?.id || null, entry.invoiceNumber, 'invoice_sent', `Batch emailed to ${recipientEmail}`);
        }

        if (error) {
          console.error('Failed to open Mail.app via AppleScript:', error);
          shell.openExternal(`mailto:${recipientEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  });
}
