import { WebSocket } from 'ws';
import * as Y from 'yjs';
// @ts-ignore
import * as sync from 'y-protocols/sync';
// @ts-ignore
import * as encoding from 'lib0/encoding';
// @ts-ignore
import * as decoding from 'lib0/decoding';
// Map of roomName -> Y.Doc
const docs = new Map();
// Map of roomName -> Set of connected WebSockets
const rooms = new Map();
export function setupWSConnection(conn, roomName) {
    conn.binaryType = 'arraybuffer';
    // 1. Get or create Y.Doc for the room
    let doc = docs.get(roomName);
    if (!doc) {
        doc = new Y.Doc();
        docs.set(roomName, doc);
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
    const onUpdate = (update, origin) => {
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
    conn.on('message', (message) => {
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
        }
        catch (err) {
            console.error(`Error handling Yjs message for room ${roomName}:`, err);
        }
    });
    // 6. Handle socket closure and clean up
    conn.on('close', () => {
        if (doc) {
            doc.off('update', onUpdate);
        }
        const conns = rooms.get(roomName);
        if (conns) {
            conns.delete(conn);
            if (conns.size === 0) {
                rooms.delete(roomName);
                docs.delete(roomName);
                console.log(`🧹 Cleaned up empty Yjs room: ${roomName}`);
            }
        }
    });
}
