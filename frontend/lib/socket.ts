import { io, Socket } from "socket.io-client";

const SIGNALING_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_SIGNALING_URL?.trim()) ||
  "http://localhost:4000";

export const socket: Socket = io(SIGNALING_URL, {
  transports: ["websocket"],
});

export default socket;
