import { type StoredSetup, parseStoredSetup } from "./setupTypes.ts";

// Storage IndexedDB del dataset di setup attivo.
// Gira SOLO nel browser: non importare questo file nei test (usa il structured
// clone di IndexedDB, non disponibile in bun senza dipendenze).
//
// Scelta: salviamo lo StoredSetup come STRINGA JSON (non structured clone).
// Motivo: parseStoredSetup lavora su stringa e fa da singolo punto di validazione;
// in questo modo load e parse condividono lo stesso codepath, un record scritto da
// una versione futura con struttura diversa fallisce in modo controllato, e la
// serializzazione è indipendente dalle capacità di structured clone del browser.

const DB_NAME = "analisi-fv";
const DB_VERSION = 1;
const STORE = "setup";
const KEY = "active";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("Apertura IndexedDB fallita."));
  });
}

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error ?? new Error("Operazione IndexedDB fallita."));
  });
}

/** Carica il setup attivo, o null se assente/rotto. Un record illeggibile viene rimosso. */
export async function loadSetup(): Promise<StoredSetup | null> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readonly");
    const raw = await req(tx.objectStore(STORE).get(KEY));
    if (typeof raw !== "string") {
      if (raw !== undefined) await clearSetup();
      return null;
    }
    try {
      return parseStoredSetup(raw);
    } catch {
      await clearSetup();
      return null;
    }
  } finally {
    db.close();
  }
}

/** Salva (sovrascrive) il setup attivo. */
export async function saveSetup(s: StoredSetup): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    await req(tx.objectStore(STORE).put(JSON.stringify(s), KEY));
  } finally {
    db.close();
  }
}

/** Rimuove il setup attivo. */
export async function clearSetup(): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STORE, "readwrite");
    await req(tx.objectStore(STORE).delete(KEY));
  } finally {
    db.close();
  }
}
