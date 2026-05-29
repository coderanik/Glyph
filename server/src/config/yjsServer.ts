import { WebSocket } from 'ws';
import * as Y from 'yjs';
// @ts-ignore
import * as sync from 'y-protocols/sync';
// @ts-ignore
import * as encoding from 'lib0/encoding';
// @ts-ignore
import * as decoding from 'lib0/decoding';
import { query } from './db.js';

// Map of roomName -> Y.Doc
const docs = new Map<string, Y.Doc>();

// Map of roomName -> Set of connected WebSockets
const rooms = new Map<string, Set<WebSocket>>();

// Map of roomName -> Promise of Y.Doc loading state to avoid race conditions
const docsLoading = new Map<string, Promise<Y.Doc>>();

// Map of roomName -> NodeJS.Timeout for debounced database saves
const saveTimeouts = new Map<string, NodeJS.Timeout>();

async function saveDocToDb(roomName: string, doc: Y.Doc) {
  try {
    const update = Y.encodeStateAsUpdate(doc);
    const text = doc.getText('codemirror').toString();
    await query(
      'UPDATE files SET yjs_state = $1, content = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [Buffer.from(update), text, roomName]
    );
    console.log(`💾 Saved Yjs document for room: ${roomName}`);
  } catch (err) {
    console.error(`Error saving Yjs doc for room ${roomName}:`, err);
  }
}

function queueSave(roomName: string, doc: Y.Doc) {
  if (saveTimeouts.has(roomName)) {
    clearTimeout(saveTimeouts.get(roomName)!);
  }
  const timeout = setTimeout(async () => {
    saveTimeouts.delete(roomName);
    await saveDocToDb(roomName, doc);
  }, 2500);
  saveTimeouts.set(roomName, timeout);
}

export async function setupWSConnection(conn: WebSocket, roomName: string) {
  conn.binaryType = 'arraybuffer';
  
  // 1. Get or create Y.Doc for the room
  let doc = docs.get(roomName);
  if (!doc) {
    let loadPromise = docsLoading.get(roomName);
    if (!loadPromise) {
      loadPromise = (async () => {
        const doc = new Y.Doc();
        
        // Register the DB save listener once for the document life cycle in memory
        doc.on('update', () => {
          queueSave(roomName, doc);
        });

        try {
          const fileRes = await query('SELECT yjs_state, content FROM files WHERE id = $1', [roomName]);
          if (fileRes.rows.length > 0) {
            const yjsState = fileRes.rows[0].yjs_state;
            if (yjsState) {
              Y.applyUpdate(doc, yjsState);
              console.log(`📖 Loaded persisted Yjs state for room: ${roomName}`);
            } else {
              const content = fileRes.rows[0].content || '';
              doc.getText('codemirror').insert(0, content);
              console.log(`📖 Initialized room ${roomName} from files.content`);
            }
          } else {
            console.warn(`Room ${roomName} not found in database.`);
          }
        } catch (err) {
          console.error(`Error loading doc for room ${roomName} from DB:`, err);
        }
        docs.set(roomName, doc);
        docsLoading.delete(roomName);
        return doc;
      })();
      docsLoading.set(roomName, loadPromise);
    }
    doc = await loadPromise;
  }

  // 2. Track connection in the room
  let roomConns = rooms.get(roomName);
  if (!roomConns) {
    roomConns = new Set();
    rooms.set(roomName, roomConns);
  }
  roomConns.add(conn);

  // 3. Send initial sync step 1 to the client
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, 0); // messageSync = 0
  sync.writeSyncStep1(encoder, doc);
  conn.send(encoding.toUint8Array(encoder));

  // 4. Listen to local document updates and broadcast to other clients in the room
  const onUpdate = (update: Uint8Array, origin: any) => {
    if (origin !== conn) {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, 0); // messageSync = 0
      sync.writeUpdate(encoder, update);
      const message = encoding.toUint8Array(encoder);
      
      const conns = rooms.get(roomName);
      if (conns) {
        for (const client of conns) {
          if (client !== conn && client.readyState === 1 /* WebSocket.OPEN */) {
            client.send(message);
          }
        }
      }
    }
  };
  doc.on('update', onUpdate);

  // 5. Handle incoming client messages (Sync messages)
  conn.on('message', (message: ArrayBuffer) => {
    try {
      const decoder = decoding.createDecoder(new Uint8Array(message));
      const messageType = decoding.readVarUint(decoder);
      
      if (messageType === 0) { // messageSync
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, 0);
        // We pass conn as the transaction origin so we don't echo back to the same connection
        sync.readSyncMessage(decoder, encoder, doc, conn);
        if (encoding.length(encoder) > 1) {
          conn.send(encoding.toUint8Array(encoder));
        }
      }
    } catch (err) {
      console.error(`Error handling Yjs message for room ${roomName}:`, err);
    }
  });

  // 6. Handle socket closure and clean up
  conn.on('close', async () => {
    if (doc) {
      doc.off('update', onUpdate);
    }
    const conns = rooms.get(roomName);
    if (conns) {
      conns.delete(conn);
      if (conns.size === 0) {
        rooms.delete(roomName);
        
        // Final save on last disconnect
        if (saveTimeouts.has(roomName)) {
          clearTimeout(saveTimeouts.get(roomName)!);
          saveTimeouts.delete(roomName);
        }
        await saveDocToDb(roomName, doc);

        docs.delete(roomName);
        console.log(`🧹 Cleaned up and persisted empty Yjs room: ${roomName}`);
      }
    }
  });
}

export async function forceSaveRoom(roomName: string) {
  const doc = docs.get(roomName);
  if (doc) {
    // Clear any pending save timeout
    if (saveTimeouts.has(roomName)) {
      clearTimeout(saveTimeouts.get(roomName)!);
      saveTimeouts.delete(roomName);
    }
    await saveDocToDb(roomName, doc);
  }
}
