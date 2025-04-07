import { useEffect, useRef, useState } from "react";
import { useSocket } from "../HomePage/socket";
import Peer from "simple-peer";
import { CopyToClipboard } from "react-copy-to-clipboard";
import {
  Button,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Phone } from "lucide-react";
import { useSelector } from "react-redux";
import { RootState } from "../../redux/store/store";

//NOTE:- For now the video calling is based on test it will work on production

const Calling = () => {
  const { socket } = useSocket();
  const [me, setMe] = useState("");
  const [stream, setStream] = useState<MediaStream | undefined>();
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const [idToCall, setIdToCall] = useState("");
  const [callEnded, setCallEnded] = useState(false);
  const [name, setName] = useState("");
  const myVideo = useRef<HTMLVideoElement>(null);
  const userVideo = useRef<HTMLVideoElement>(null);
  const connectionRef = useRef<Peer.Instance | null>(null);

  const currentSocketId = useSelector(
    (state: RootState) => state.chat.currentUserSocketId
  );

  useEffect(() => {
    console.log("Socket instance:", socket);
    if (socket) {
      socket.on("connect", () => console.log("Socket connected:", socket.id));
      socket.on("disconnect", () => console.log("Socket disconnected"));
    }

    const getMediaStream = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        console.log("Stream initialized:", mediaStream);
        console.log("Stream active:", mediaStream.active);
        console.log("Stream tracks:", mediaStream.getTracks());
        setStream(mediaStream);
        if (myVideo.current) {
          myVideo.current.srcObject = mediaStream;
          myVideo.current
            .play()
            .catch((err) => console.error("Video play error:", err));
        }
      } catch (err) {
        console.error("Error getting media stream:", err);
        alert("Failed to access camera/microphone. Please check permissions.");
      }
    };
    getMediaStream();

    socket?.on("me", (id: string) => {
      console.log("Received my ID:", id);
      setMe(id);
    });

    socket?.on("callUser", (data) => {
      console.log("Incoming call:", data);
      setReceivingCall(true);
      setCaller(data.from);
      setName(data.name);
      setCallerSignal(data.signal);
    });

    return () => {
      socket?.off("connect");
      socket?.off("disconnect");
      socket?.off("me");
      socket?.off("callUser");
    };
  }, [socket]);

  const callUser = (userToCall: string) => {
    console.log(`📞 Calling user with ID: ${userToCall}`);
    console.log("Socket connected:", socket?.connected);
    console.log("Socket ID:", socket?.id);
    console.log("Stream:", stream);
    console.log("Stream active:", stream?.active);
    console.log("Stream tracks:", stream?.getTracks());

    if (!socket || !socket.connected) {
      console.error("🚨 Socket is not initialized or not connected");
      alert("Socket not connected. Please refresh the page.");
      return;
    }
    if (!stream || !stream.active || stream.getTracks().length === 0) {
      console.error("🚨 Stream is not available, inactive, or has no tracks");
      alert("Cannot make call: Camera/microphone not ready.");
      return;
    }

    // Temporarily skip Peer creation
    console.log("✅ Emitting callUser event without Peer...");
    socket.emit("callUser", {
      userToCall,
      signalData: { test: "dummy-signal" }, // Dummy signal
      from: me,
      name: name || "Caller",
    });
    console.log("✅ callUser event emitted successfully!");
  };

  const answerCall = () => {
    if (!stream || !stream.active || stream.getTracks().length === 0) {
      console.error(
        "🚨 Stream is not available, inactive, or has no tracks for answering"
      );
      return;
    }
    setCallAccepted(true);
    const peer = new Peer({ initiator: false, trickle: false, stream });
    peer.on("signal", (data) => {
      socket?.emit("answerCall", { signal: data, to: caller });
    });
    peer.on("stream", (stream: any) => {
      if (userVideo.current) {
        userVideo.current.srcObject = stream;
      }
    });
    peer.signal(callerSignal);
    connectionRef.current = peer;
  };

  const leaveCall = () => {
    setCallEnded(true);
    connectionRef.current?.destroy();
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(undefined);
    }
  };

  return (
    <>
      <Typography textAlign="center" color="#fff">
        Video-calling
      </Typography>
      <Stack>
        <div>
          {stream && (
            <video
              playsInline
              muted
              ref={myVideo}
              autoPlay
              style={{ width: "300px" }}
            />
          )}
          {callAccepted && !callEnded && (
            <video
              playsInline
              ref={userVideo}
              autoPlay
              style={{ width: "300px" }}
            />
          )}
        </div>
        <div>
          <TextField
            label="Name"
            variant="filled"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ marginBottom: "20px" }}
          />
          <CopyToClipboard text={me}>
            <Button variant="contained" color="primary">
              Copy ID
            </Button>
          </CopyToClipboard>
          <TextField
            label="ID to call"
            variant="filled"
            value={idToCall}
            onChange={(e) => setIdToCall(e.target.value)}
          />
          <div>
            {callAccepted && !callEnded ? (
              <Button variant="contained" color="secondary" onClick={leaveCall}>
                End Call
              </Button>
            ) : (
              <IconButton
                color="primary"
                aria-label="call"
                onClick={() => callUser(currentSocketId || idToCall)}
              >
                <Phone size={32} />
              </IconButton>
            )}
          </div>
          {receivingCall && !callAccepted && (
            <div>
              <h1>{name} is calling...</h1>
              <Button variant="contained" color="primary" onClick={answerCall}>
                Answer
              </Button>
            </div>
          )}
        </div>
      </Stack>
    </>
  );
};

export default Calling;
