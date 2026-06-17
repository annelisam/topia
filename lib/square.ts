// Server-side Square client. Imported only from API route handlers — never
// ship the access token to the browser. The browser uses the Web Payments SDK
// with the *public* application ID + location ID to tokenize cards; the token
// (sourceId) is then charged here via the Payments API.
import { SquareClient, SquareEnvironment } from 'square';

const isProduction = process.env.SQUARE_ENV === 'production';

export const squareClient = new SquareClient({
  token: process.env.SQUARE_ACCESS_TOKEN,
  environment: isProduction ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
});

// The Square Location that receives the payment. Required by Payments API.
export const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID ?? '';

// Used to verify inbound webhook signatures.
export const SQUARE_WEBHOOK_SIGNATURE_KEY = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY ?? '';

export const SQUARE_ENV: 'production' | 'sandbox' = isProduction ? 'production' : 'sandbox';

// True only when the server has enough config to actually charge a card.
export function isSquareConfigured(): boolean {
  return Boolean(process.env.SQUARE_ACCESS_TOKEN && SQUARE_LOCATION_ID);
}
