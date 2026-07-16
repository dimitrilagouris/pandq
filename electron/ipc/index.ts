import { registerClientHandlers } from './clients';
import { registerInvoiceHandlers } from './invoices';
import { registerProjectHandlers } from './projects';
import { registerSettingsHandlers } from './settings';
import { registerActivityHandlers } from './activity';
import { registerSystemHandlers } from './system';

export function registerAllHandlers(): void {
  registerClientHandlers();
  registerInvoiceHandlers();
  registerProjectHandlers();
  registerSettingsHandlers();
  registerActivityHandlers();
  registerSystemHandlers();
}
