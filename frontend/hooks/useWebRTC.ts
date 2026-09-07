"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { socket } from "@/lib/socket";

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
    { urls: "stun:stun.services.mozilla.com" },
  ],
  iceCandidatePoolSize: 10,
};

export type WatchPartyRole = "host" | "viewer";

interface UseWebRTCOptions {
  roomId: string;
  roomCode?: string;
  role?: WatchPartyRole;
  isHost?: boolean;
  onSharingChange?: (isSharing: boolean) => void;
}

export function useWebRTC({
  roomId,
  roomCode,
  role: roleProp,
  isHost: isHostProp,
  onSharingChange,
}: UseWebRTCOptions) {
  const role: WatchPartyRole = roleProp || (isHostProp ? "host" : "viewer");
  const isHost = role === "host";

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isSharing, setIsSharing] = useState<boolean>(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const remoteMediaStreamRef = useRef<MediaStream | null>(null);

  // Keep latest props in refs to avoid rebuilding effects & teardown
  const isHostRef = useRef(isHost);
  isHostRef.current = isHost;
  const roleRef = useRef(role);
  roleRef.current = role;
  const roomIdRef = useRef(roomId);
  roomIdRef.current = roomId;
  const roomCodeRef = useRef(roomCode);
  roomCodeRef.current = roomCode;
  const onSharingChangeRef = useRef(onSharingChange);
  onSharingChangeRef.current = onSharingChange;

  // Multi-peer map for Host: maps viewerSocketId -> RTCPeerConnection
  // For Viewer: maps hostSocketId -> RTCPeerConnection
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  // Per-peer queued ICE candidates
  const iceCandidatesQueueRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  // Set of all known peers in the room
  const knownPeersRef = useRef<Set<string>>(new Set());

  // Host creates and dispatches offer for a specific viewer
  const sendOfferToViewer = useCallback(
    async (viewerSocketId: string, activeStream: MediaStream) => {
      try {
        let pc = peerConnectionsRef.current.get(viewerSocketId);
        if (pc) {
          try {
            pc.close();
          } catch {}
          peerConnectionsRef.current.delete(viewerSocketId);
        }

        // 1. Create peer connection
        pc = new RTCPeerConnection(RTC_CONFIG);
        peerConnectionsRef.current.set(viewerSocketId, pc);

        // 2. Add tracks BEFORE creating offer
        console.log("Sending tracks:", activeStream.getTracks());
        activeStream.getTracks().forEach((track) => {
          pc.addTrack(track, activeStream);
        });

        pc.onicecandidate = (event) => {
          if (event.candidate && viewerSocketId) {
            console.log("ice sent", { to: viewerSocketId, candidate: event.candidate });
            const candJson = event.candidate.toJSON ? event.candidate.toJSON() : event.candidate;
            socket.emit("webrtc-ice-candidate", {
              to: viewerSocketId,
              candidate: candJson,
            });
          }
        };

        pc.onconnectionstatechange = () => {
          if (
            pc.connectionState === "disconnected" ||
            pc.connectionState === "failed" ||
            pc.connectionState === "closed"
          ) {
            try {
              pc.close();
            } catch {}
            peerConnectionsRef.current.delete(viewerSocketId);
          }
        };

        // 3. createOffer()
        const offer = await pc.createOffer();
        // 4. setLocalDescription()
        await pc.setLocalDescription(offer);

        // 5. send offer
        console.log("offer sent", { to: viewerSocketId });
        socket.emit("webrtc-offer", {
          to: viewerSocketId,
          offer,
        });
      } catch (err) {
        console.error("[WebRTC] Error sending offer to viewer:", viewerSocketId, err);
      }
    },
    []
  );

  // Stop screen share (only invoked explicitly by user action or browser native stop)
  const stopScreenShare = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    peerConnectionsRef.current.forEach((pc) => {
      try {
        pc.close();
      } catch {}
    });
    peerConnectionsRef.current.clear();
    iceCandidatesQueueRef.current.clear();

    setLocalStream(null);
    setIsSharing(false);
    onSharingChangeRef.current?.(false);

    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }

    if (isHostRef.current) {
      const curRoomId = roomIdRef.current;
      const curRoomCode = roomCodeRef.current;
      if (curRoomId) socket.emit("webrtc-stop-sharing", { roomId: curRoomId });
      if (curRoomCode && curRoomCode !== curRoomId) {
        socket.emit("webrtc-stop-sharing", { roomId: curRoomCode });
      }
    }
  }, []);

  // Host starts screen share via getDisplayMedia with 720p 30fps constraints
  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: 30,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      });

      if (!stream || !stream.active) {
        console.error("Screen share stream is not active");
        return;
      }

      localStreamRef.current = stream;
      streamRef.current = stream;
      setLocalStream(stream);
      setIsSharing(true);
      onSharingChangeRef.current?.(true);

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Automatically handle stop sharing from browser UI
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      // Broadcast offers to ALL connected/known viewers
      knownPeersRef.current.forEach((viewerId) => {
        sendOfferToViewer(viewerId, stream);
      });

      // Announce presence in rooms to trigger any viewers to re-announce
      const curRoomId = roomIdRef.current;
      const curRoomCode = roomCodeRef.current;
      if (curRoomId) socket.emit("join-room", curRoomId);
      if (curRoomCode && curRoomCode !== curRoomId) socket.emit("join-room", curRoomCode);
    } catch (err) {
      console.error("Screen share cancelled or failed:", err);
      setIsSharing(false);
    }
  }, [sendOfferToViewer, stopScreenShare]);

  // Keep rooms joined when roomId or roomCode resolves/changes without resetting state
  useEffect(() => {
    if (!roomId) return;
    if (!socket.connected) {
      socket.connect();
    }
    socket.emit("join-room", roomId);
    if (roomCode && roomCode !== roomId) {
      socket.emit("join-room", roomCode);
    }
  }, [roomId, roomCode]);

  // Main socket event listener lifecycle (stable across renders)
  useEffect(() => {
    const joinRooms = () => {
      const curRoomId = roomIdRef.current;
      const curRoomCode = roomCodeRef.current;
      if (curRoomId) {
        console.log("[WebRTC] Emitting join-room:", curRoomId);
        socket.emit("join-room", curRoomId);
      }
      if (curRoomCode && curRoomCode !== curRoomId) {
        console.log("[WebRTC] Emitting join-room for code:", curRoomCode);
        socket.emit("join-room", curRoomCode);
      }
    };

    const handleConnect = () => {
      console.log("[WebRTC] Socket connected:", socket.id);
      joinRooms();
    };

    socket.on("connect", handleConnect);
    if (socket.connected) {
      joinRooms();
    } else {
      socket.connect();
    }

    // 4. Resend offer on new user (Host side)
    const handleUserJoined = async (userId: string) => {
      console.log("[WebRTC] user-joined received:", userId);
      knownPeersRef.current.add(userId);

      if (isHostRef.current) {
        // Late joiner or new user: create new offer and send to that specific user
        const activeStream = localStreamRef.current || streamRef.current;
        if (activeStream) {
          console.log("[WebRTC] Host sending fresh offer to new user:", userId);
          sendOfferToViewer(userId, activeStream);
        }
      }
    };

    // Viewer receives offer from host
    const handleWebRTCOffer = async ({
      from,
      offer,
    }: {
      from: string;
      offer: RTCSessionDescriptionInit;
    }) => {
      console.log("offer received", { from });
      let pc = peerConnectionsRef.current.get(from);
      if (pc) {
        try {
          pc.close();
        } catch {}
      }

      pc = new RTCPeerConnection(RTC_CONFIG);
      peerConnectionsRef.current.set(from, pc);

      pc.onicecandidate = (event) => {
        if (event.candidate && from) {
          console.log("ice sent", { to: from, candidate: event.candidate });
          const candJson = event.candidate.toJSON ? event.candidate.toJSON() : event.candidate;
          socket.emit("webrtc-ice-candidate", {
            to: from,
            candidate: candJson,
          });
        }
      };

      pc.onconnectionstatechange = () => {
        if (
          pc.connectionState === "disconnected" ||
          pc.connectionState === "failed" ||
          pc.connectionState === "closed"
        ) {
          if (!isHostRef.current) {
            setRemoteStream(null);
            setIsSharing(false);
            onSharingChangeRef.current?.(false);
            remoteMediaStreamRef.current = null;
          }
        }
      };

      pc.ontrack = async (event) => {
        console.log("Received track:", event.track.kind);
        console.log("track received", event.streams);

        let stream = event.streams && event.streams[0];
        if (!stream) {
          if (!remoteMediaStreamRef.current) {
            remoteMediaStreamRef.current = new MediaStream();
          }
          if (!remoteMediaStreamRef.current.getTracks().some((t) => t.id === event.track.id)) {
            remoteMediaStreamRef.current.addTrack(event.track);
          }
          stream = remoteMediaStreamRef.current;
        } else {
          remoteMediaStreamRef.current = stream;
        }

        if (remoteVideoRef.current) {
          if (event.streams && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
          } else {
            remoteVideoRef.current.srcObject = stream;
          }
          remoteVideoRef.current.muted = true;
          await remoteVideoRef.current.play().catch(() => {
            console.log("autoplay blocked");
          });
        }

        setRemoteStream(stream);
        setIsSharing(true);
        onSharingChangeRef.current?.(true);

        const handleTrackEnded = () => {
          if (stream.getTracks().every((t) => t.readyState === "ended")) {
            setRemoteStream(null);
            setIsSharing(false);
            onSharingChangeRef.current?.(false);
            remoteMediaStreamRef.current = null;
          }
        };

        stream.getTracks().forEach((track) => {
          track.onended = handleTrackEnded;
        });
        event.track.onended = handleTrackEnded;
      };

      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Flush queued candidates for this connection
      const queued = iceCandidatesQueueRef.current.get(from) || [];
      for (const candidate of queued) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      }
      iceCandidatesQueueRef.current.delete(from);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      console.log("answer sent", { to: from });
      socket.emit("webrtc-answer", {
        to: from,
        answer,
      });
    };

    // Host receives answer from viewer
    const handleWebRTCAnswer = async ({
      from,
      answer,
    }: {
      from: string;
      answer: RTCSessionDescriptionInit;
    }) => {
      console.log("answer received", { from });
      const pc = peerConnectionsRef.current.get(from);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));

        const queued = iceCandidatesQueueRef.current.get(from) || [];
        for (const candidate of queued) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
        }
        iceCandidatesQueueRef.current.delete(from);
      }
    };

    // Receive ICE candidate
    const handleWebRTCIceCandidate = async ({
      from,
      candidate,
    }: {
      from: string;
      candidate: RTCIceCandidateInit;
    }) => {
      if (!candidate || !from) return;
      console.log("ice received", { from, candidate });
      const pc = peerConnectionsRef.current.get(from);
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("[WebRTC] Error adding candidate:", e);
        }
      } else {
        const q = iceCandidatesQueueRef.current.get(from) || [];
        q.push(candidate);
        iceCandidatesQueueRef.current.set(from, q);
      }
    };

    const handleStopSharing = () => {
      if (!isHostRef.current) {
        setRemoteStream(null);
        setIsSharing(false);
        onSharingChangeRef.current?.(false);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
        }
        remoteMediaStreamRef.current = null;
      }
    };

    socket.on("user-joined", handleUserJoined);
    socket.on("webrtc-offer", handleWebRTCOffer);
    socket.on("webrtc-answer", handleWebRTCAnswer);
    socket.on("webrtc-ice-candidate", handleWebRTCIceCandidate);
    socket.on("webrtc-stop-sharing", handleStopSharing);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("user-joined", handleUserJoined);
      socket.off("webrtc-offer", handleWebRTCOffer);
      socket.off("webrtc-answer", handleWebRTCAnswer);
      socket.off("webrtc-ice-candidate", handleWebRTCIceCandidate);
      socket.off("webrtc-stop-sharing", handleStopSharing);
    };
  }, [sendOfferToViewer]);

  // Viewer auto-discovery heartbeat: if viewer has not received stream yet, ping room every 2 seconds to ensure host sends fresh offer
  useEffect(() => {
    if (isHost || remoteStream) return;

    const interval = setInterval(() => {
      const curRoomId = roomIdRef.current;
      const curRoomCode = roomCodeRef.current;
      if (curRoomId) socket.emit("join-room", curRoomId);
      if (curRoomCode && curRoomCode !== curRoomId) socket.emit("join-room", curRoomCode);
    }, 2000);

    return () => clearInterval(interval);
  }, [isHost, remoteStream]);

  // Component unmount cleanup ONLY: stop local stream when page unmounts
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      peerConnectionsRef.current.forEach((pc) => {
        try {
          pc.close();
        } catch {}
      });
      peerConnectionsRef.current.clear();
      iceCandidatesQueueRef.current.clear();
      knownPeersRef.current.clear();
    };
  }, []);

  return {
    role,
    isHost,
    localStream,
    remoteStream,
    isSharing,
    startScreenShare,
    stopScreenShare,
    localVideoRef,
    remoteVideoRef,
  };
}

export default useWebRTC;
