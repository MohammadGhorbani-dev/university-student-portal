import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

export function decodeValue(value) {
  if ('nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) {
    const n = Number(value.integerValue);
    return Number.isSafeInteger(n) ? n : { __type: 'integer', value: value.integerValue };
  }
  if ('doubleValue' in value) return typeof value.doubleValue === 'number' ? value.doubleValue : { __type: 'double', value: value.doubleValue };
  if ('timestampValue' in value) return { __type: 'timestamp', value: value.timestampValue };
  if ('referenceValue' in value) return { __type: 'reference', value: value.referenceValue };
  if ('bytesValue' in value) return { __type: 'bytes', value: value.bytesValue };
  if ('geoPointValue' in value) return { __type: 'geo', ...value.geoPointValue };
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(decodeValue);
  if ('mapValue' in value) return decodeFields(value.mapValue.fields ?? {});
  throw new Error('Unsupported Firestore value; raw backup must be reviewed.');
}
const decodeFields = fields => Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));

// request is injectable for tests. Its permitted REST endpoints are read operations only.
export async function readOnlyBackup({ projectId, request, maxDocuments = 5000, maxRequests = 12000 }) {
  if (!/^[a-z][a-z0-9-]+$/.test(projectId)) throw new Error('Invalid project ID');
  const prefix = 'projects/' + projectId + '/databases/(default)/documents';
  const collections = {}, versions = {}, rawDocuments = [], missingParents = [];
  let requests = 0;
  const call = async (path, method = 'GET', body) => {
    if (++requests > maxRequests) throw new Error('Read request limit exceeded; no complete backup produced.');
    return request(path, method, body);
  };
  async function visit(parent, collectionPath = '') {
    let pageToken;
    do {
      const page = await call(parent + ':listCollectionIds', 'POST', { pageSize: 100, ...(pageToken ? { pageToken } : {}) });
      for (const id of page.collectionIds ?? []) {
        const path = collectionPath ? collectionPath + '/' + id : id;
        collections[path] ??= {};
        let token;
        do {
          const params = new URLSearchParams({ pageSize: '500', showMissing: 'true', ...(token ? { pageToken: token } : {}) });
          const documents = await call(parent + '/' + encodeURIComponent(id) + '?' + params);
          for (const document of documents.documents ?? []) {
            if (rawDocuments.length + missingParents.length >= maxDocuments) throw new Error('Document limit exceeded; no complete backup produced.');
            if (!document.name?.startsWith(prefix + '/')) throw new Error('Unexpected document outside the requested project');
            const relative = document.name.slice(prefix.length + 1);
            const docId = relative.slice(relative.lastIndexOf('/') + 1);
            if (document.updateTime) {
              rawDocuments.push(document);
              collections[path][docId] = decodeFields(document.fields ?? {});
              versions[relative] = document.updateTime;
            } else missingParents.push(relative);
            await visit(document.name.split('/').map(encodeURIComponent).join('/'), relative);
          }
          token = documents.nextPageToken;
        } while (token);
      }
      pageToken = page.nextPageToken;
    } while (pageToken);
  }
  await visit(prefix);
  const capturedAt = new Date().toISOString();
  return {
    raw: { format: 'portal-rest-backup-v1', projectId, capturedAt, consistentSnapshot: false, documents: rawDocuments, missingParents },
    snapshot: { format: 'portal-snapshot-v1', projectId, capturedAt, consistentSnapshot: false, collections, versions },
    summary: { documents: rawDocuments.length, missingParents: missingParents.length, collectionPaths: Object.keys(collections).length, requests },
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [firebaseToolsRoot, projectId, outputDirectory] = process.argv.slice(2);
    if (!firebaseToolsRoot || projectId !== 'university-portal-demo' || !outputDirectory) throw new Error('Usage: node scripts/read-only-backup.mjs FIREBASE_TOOLS_ROOT university-portal-demo OUTPUT_DIRECTORY');
    const require = createRequire(import.meta.url);
    const version = require(join(resolve(firebaseToolsRoot), 'package.json')).version;
    if (version !== '15.28.1') throw new Error('This CLI credential adapter was verified with firebase-tools 15.28.1 only.');
    const auth = require(join(resolve(firebaseToolsRoot), 'lib/auth.js'));
    const account = auth.getGlobalDefaultAccount();
    if (!account?.tokens) throw new Error('Firebase CLI login is required.');
    let tokens = account.tokens;
    if (!tokens.access_token || tokens.expires_at < Date.now() + 60000) {
      try { tokens = await auth.getAccessToken(tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']); }
      catch { throw new Error('Authentication refresh failed; reconnect Firebase CLI on a working network.'); }
    }
    if (!tokens?.access_token) throw new Error('No usable CLI access token.');
    const result = await readOnlyBackup({ projectId, request: async (path, method, body) => {
      const response = await fetch('https://firestore.googleapis.com/v1/' + path, {
        method, headers: { Authorization: 'Bearer ' + tokens.access_token, 'Content-Type': 'application/json' },
        ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(25000),
      });
      if (!response.ok) throw new Error('Read-only Firestore request failed: HTTP ' + response.status);
      if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('Firestore returned a non-JSON response; check network access.');
      return response.json();
    } });
    // Exclusive output directory/files prevent accidentally overwriting an earlier backup.
    await mkdir(resolve(outputDirectory), { recursive: false });
    for (const [name, value] of [['raw-backup.json', result.raw], ['snapshot.json', result.snapshot]]) {
      const content = JSON.stringify(value, null, 2);
      await writeFile(join(outputDirectory, name), content, { flag: 'wx' });
      await writeFile(join(outputDirectory, name + '.sha256'), createHash('sha256').update(content).digest('hex') + '\n', { flag: 'wx' });
    }
    console.log(JSON.stringify({ ...result.summary, writtenToDatabase: false, backupSaved: true, consistentSnapshot: false }));
  } catch (error) {
    // Avoid dumping credential-provider errors, HTTP bodies or personal records.
    console.error('Read-only backup did not complete. ' + (error.message?.startsWith('Read-only Firestore') || error.message?.startsWith('Firestore returned') || error.message?.startsWith('Authentication refresh') || error.message?.startsWith('Usage:') ? error.message : 'Check login, network, CLI version and the unused output directory.'));
    process.exitCode = 1;
  }
}
