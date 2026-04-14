/** Browser talks to Next; Rust API default is :4000 (docker-compose backend port). */
const raw =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
  "http://localhost:4000";

export const API_BASE = raw;

/** y-websocket expects `serverUrl` without path; room is the second argument. */
export const WS_BASE = raw.replace(/^http/, "ws");

export function apiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

export function wsUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  const wsBase = raw.replace(/^http/, "ws");
  return `${wsBase}${p}`;
}
