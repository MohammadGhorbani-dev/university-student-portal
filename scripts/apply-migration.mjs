import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { getFirebaseCliAccessToken } from './firebase-cli-credentials.mjs';
import { planMigration } from './migration-plan.mjs';
import { readOnlyBackup } from './read-only-backup.mjs';

const productionProject = 'university-portal-demo';
const allowedFields = {
  users: ['studentId', 'nationalCode', 'enrollmentVersion'],
  courses: ['enrolledCount', 'registrationEndsAt'],
  reservation_slots: ['reservedCount', 'bookingEndsAt'],
  enrollment_terms: ['studentUid', 'semester', 'totalCredits', 'lastCourseId'],
};

function encodeValue(value) {
  if (typeof value === 'string') return { stringValue: value };
  if (Number.isSafeInteger(value)) return { integerValue: String(value) };
  if (value?.__type === 'timestamp' && typeof value.value === 'string' && Number.isFinite(Date.parse(value.value))) {
    return { timestampValue: value.value };
  }
  throw new Error('Unexpected value in a migration patch.');
}

export function compileMigration(snapshot, plan, decisions) {
  if (!isDeepStrictEqual(plan, planMigration(snapshot, decisions))) {
    throw new Error('The reviewed plan does not match the snapshot and owner decisions.');
  }
  if (!plan.structurallyReady) throw new Error('The migration plan has blocking issues.');
  const basePath = 'projects/' + snapshot.projectId + '/databases/(default)/documents';
  const writes = plan.changes.map(change => {
    const [collection, id, ...rest] = change.path.split('/');
    const fieldPaths = Object.keys(change.patch);
    if (!Object.hasOwn(allowedFields, collection) || !id || rest.length || !fieldPaths.length ||
        fieldPaths.some(field => !allowedFields[collection].includes(field))) {
      throw new Error('Unexpected document or field in a migration patch.');
    }
    const create = change.operation === 'create-if-absent';
    if (create ? collection !== 'enrollment_terms' : !change.expectedUpdateTime) {
      throw new Error('A migration precondition is missing.');
    }
    const write = {
      update: { name: basePath + '/' + change.path, fields: Object.fromEntries(fieldPaths.map(field => [field, encodeValue(change.patch[field])])) },
      currentDocument: create ? { exists: false } : { updateTime: change.expectedUpdateTime },
    };
    if (!create) write.updateMask = { fieldPaths };
    if (collection === 'enrollment_terms') {
      write.updateTransforms = [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }];
    }
    return write;
  });
  if (writes.length > 500 || Buffer.byteLength(JSON.stringify({ writes })) > 9_000_000) {
    throw new Error('The migration exceeds the limit for a single atomic commit.');
  }
  return { basePath, writes };
}

function checkResult(snapshot, plan, after) {
  const expected = structuredClone(snapshot.collections);
  for (const change of plan.changes) {
    const [collection, id] = change.path.split('/');
    expected[collection] ??= {};
    const patch = { ...change.patch };
    // Firestore omits trailing zero fractions when it serializes timestamps.
    for (const [field, value] of Object.entries(patch)) {
      if (value?.__type !== 'timestamp') continue;
      const actual = after.collections[collection]?.[id]?.[field];
      if (actual?.__type === 'timestamp' && Date.parse(actual.value) === Date.parse(value.value)) patch[field] = actual;
    }
    if (collection === 'enrollment_terms') {
      const updatedAt = after.collections[collection]?.[id]?.updatedAt;
      if (updatedAt?.__type !== 'timestamp' || !Number.isFinite(Date.parse(updatedAt.value))) return false;
      patch.updatedAt = updatedAt;
    }
    expected[collection][id] = { ...expected[collection][id], ...patch };
  }
  return isDeepStrictEqual(expected, after.collections);
}

export async function applyMigration({ snapshot, plan, decisions, request }) {
  const { basePath, writes } = compileMigration(snapshot, plan, decisions);
  const inventory = () => readOnlyBackup({ projectId: snapshot.projectId, request });
  const before = (await inventory()).snapshot;
  if (!isDeepStrictEqual(snapshot.versions, before.versions) || !isDeepStrictEqual(snapshot.collections, before.collections)) {
    throw new Error('The database changed since the backup. Refresh and review the plan before applying it.');
  }
  if (!writes.length) return { applied: false, writes: 0, verified: true };
  let result;
  try {
    result = await request(basePath + ':commit', 'POST', { writes });
  } catch (error) {
    throw new Error('Commit did not return success. Inspect a new inventory before retrying.', { cause: error });
  }
  let after;
  try {
    after = (await inventory()).snapshot;
  } catch (error) {
    throw new Error('Commit succeeded, but verification could not read the database. Keep maintenance active.', { cause: error });
  }
  if (!checkResult(snapshot, plan, after)) {
    throw new Error('Commit succeeded, but verification found an unexpected difference. Keep maintenance active.');
  }
  return { applied: true, writes: writes.length, commitTime: result.commitTime, verified: true };
}

export function firestoreRequest(origin, token) {
  return async (path, method, body) => {
    const response = await fetch(origin + '/v1/' + path, {
      method,
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
      redirect: 'error',
      signal: AbortSignal.timeout(25000),
    });
    if (!response.ok) throw new Error('Firestore returned HTTP ' + response.status + '.');
    return response.json();
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const [mode, snapshotPath, planPath, decisionsPath, toolsRoot, maintenanceFlag] = process.argv.slice(2);
    if (!snapshotPath || !planPath || !decisionsPath) {
      throw new Error('Usage: node scripts/apply-migration.mjs --emulator SNAPSHOT PLAN DECISIONS');
    }
    const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8'));
    const plan = JSON.parse(await readFile(planPath, 'utf8'));
    const decisions = JSON.parse(await readFile(decisionsPath, 'utf8'));
    let request;
    if (mode === '--emulator' && /^demo-[a-z0-9-]+$/.test(snapshot.projectId) &&
        process.env.FIRESTORE_EMULATOR_HOST === '127.0.0.1:8187') {
      request = firestoreRequest('http://127.0.0.1:8187', 'owner');
    } else if (mode === '--production' && snapshot.projectId === productionProject &&
        toolsRoot && maintenanceFlag === '--maintenance-active' && !process.env.FIRESTORE_EMULATOR_HOST) {
      request = firestoreRequest('https://firestore.googleapis.com', await getFirebaseCliAccessToken(toolsRoot));
    } else {
      throw new Error('Use a local demo emulator, or the exact production project with confirmed maintenance.');
    }
    console.log(JSON.stringify(await applyMigration({ snapshot, plan, decisions, request })));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
