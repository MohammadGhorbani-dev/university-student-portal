import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

export async function getFirebaseCliAccessToken(firebaseToolsRoot) {
  const require = createRequire(import.meta.url);
  const root = resolve(firebaseToolsRoot);
  if (require(join(root, 'package.json')).version !== '15.28.1') {
    throw new Error('This credential adapter was verified with firebase-tools 15.28.1.');
  }
  const auth = require(join(root, 'lib/auth.js'));
  let tokens = auth.getGlobalDefaultAccount()?.tokens;
  if (!tokens) throw new Error('Firebase CLI login is required.');
  if (!tokens.access_token || !Number.isFinite(tokens.expires_at) || tokens.expires_at < Date.now() + 60000) {
    try {
      tokens = await auth.getAccessToken(tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
    } catch {
      throw new Error('Authentication refresh failed. Reconnect Firebase CLI on a working network.');
    }
  }
  if (!tokens?.access_token) throw new Error('No usable CLI access token.');
  return tokens.access_token;
}
