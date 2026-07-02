"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Camera, CheckCircle2, Clock3, Loader2, MapPin, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SELFIE_BUCKET } from "@/lib/constants";
import { getDeviceLabel, getOrCreateDeviceId } from "@/lib/device";
import type { DutyPeriod, PunchType } from "@/lib/types";

type Props = {
  employeeId: string;
  canTimeIn: boolean;
  canTimeOut: boolean;
};

export function CameraPunch({ employeeId, canTimeIn, canTimeOut }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [mode, setMode] = useState<PunchType | null>(null);
  const [dutyPeriod, setDutyPeriod] = useState<DutyPeriod>("full_day");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [resetReason, setResetReason] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    return () => stream?.getTracks().forEach((track) => track.stop());
  }, [stream]);

  async function openCamera(type: PunchType) {
    setError("");
    setMessage("");
    setMode(type);

    if (!window.isSecureContext) {
      setError("Camera and GPS require HTTPS. For phone testing, deploy the app online or open it on this computer using localhost.");
      setMode(null);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser does not allow camera access here. Please use Chrome, Edge, or Safari and allow camera permission.");
      setMode(null);
      return;
    }

    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      setStream(media);
      if (videoRef.current) videoRef.current.srcObject = media;
    } catch (err) {
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setError("Camera permission was blocked. Please allow camera access in the browser settings, then tap Time In again.");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setError("No camera was found on this device.");
      } else if (name === "NotReadableError" || name === "TrackStartError") {
        setError("The camera is already being used by another app. Close other camera apps and try again.");
      } else {
        setError("Camera could not be opened. Please refresh the page and allow camera permission.");
      }
      setMode(null);
    }
  }

  async function captureBlobs() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) throw new Error("Camera is not ready.");
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 720;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Camera is not ready.");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const original = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not capture selfie."))), "image/jpeg", 0.85);
    });

    const stamp = new Intl.DateTimeFormat("en-PH", {
      dateStyle: "medium",
      timeStyle: "medium",
      timeZone: "Asia/Manila"
    }).format(new Date());
    const label = `BENGTECH ${mode === "time_in" ? "TIME IN" : "TIME OUT"} - ${stamp}`;
    const bandHeight = Math.max(92, Math.round(canvas.height * 0.16));
    context.fillStyle = "rgba(0, 0, 0, 0.72)";
    context.fillRect(0, canvas.height - bandHeight, canvas.width, bandHeight);
    context.fillStyle = "#ffffff";
    context.strokeStyle = "#000000";
    context.lineWidth = Math.max(4, Math.round(canvas.width * 0.006));
    context.font = `900 ${Math.max(28, Math.round(canvas.width * 0.046))}px Arial`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.strokeText(label, canvas.width / 2, canvas.height - bandHeight / 2);
    context.fillText(label, canvas.width / 2, canvas.height - bandHeight / 2);

    const watermarked = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not watermark selfie."))), "image/jpeg", 0.9);
    });
    return { original, watermarked };
  }

  async function getLocation() {
    if (!window.isSecureContext) {
      throw new Error("GPS requires HTTPS. Use localhost on this computer or deploy the app online for phone use.");
    }
    if (!navigator.geolocation) {
      throw new Error("This browser does not support GPS location.");
    }
    return new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        resolve,
        (err) => {
          if (err.code === err.PERMISSION_DENIED) reject(new Error("GPS permission was blocked. Please allow location access and try again."));
          else if (err.code === err.POSITION_UNAVAILABLE) reject(new Error("GPS location is unavailable. Turn on Location/GPS and try again."));
          else reject(new Error("GPS request timed out. Please move to an open area and try again."));
        },
        { enableHighAccuracy: true, timeout: 15000 }
      );
    });
  }

  function submitPunch() {
    if (!mode) return;
    startTransition(async () => {
      setError("");
      setMessage("");
      try {
        const [selfies, position] = await Promise.all([captureBlobs(), getLocation()]);
        const supabase = createClient();
        const timestamp = new Date().toISOString();
        const originalPath = `${employeeId}/original/${timestamp}-${mode}.jpg`;
        const watermarkedPath = `${employeeId}/watermarked/${timestamp}-${mode}.jpg`;
        const [originalUpload, watermarkedUpload] = await Promise.all([
          supabase.storage.from(SELFIE_BUCKET).upload(originalPath, selfies.original, { contentType: "image/jpeg", upsert: false }),
          supabase.storage.from(SELFIE_BUCKET).upload(watermarkedPath, selfies.watermarked, { contentType: "image/jpeg", upsert: false })
        ]);
        if (originalUpload.error) throw originalUpload.error;
        if (watermarkedUpload.error) throw watermarkedUpload.error;

        const response = await fetch("/api/attendance/punch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: mode,
            selfiePath: watermarkedPath,
            originalSelfiePath: originalPath,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            dutyPeriod,
            deviceId: getOrCreateDeviceId(),
            deviceLabel: getDeviceLabel(),
            userAgent: navigator.userAgent
          })
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Attendance was not saved.");
        setMessage(mode === "time_in" ? "Time In saved successfully." : "Time Out saved successfully.");
        stream?.getTracks().forEach((track) => track.stop());
        setStream(null);
        setMode(null);
        window.setTimeout(() => window.location.reload(), 900);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Attendance was not saved.");
      }
    });
  }

  function requestDeviceReset() {
    startTransition(async () => {
      setError("");
      setMessage("");
      try {
        const response = await fetch("/api/device/reset-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: resetReason })
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Device reset request was not sent.");
        setMessage("Device reset request sent to admin.");
        setResetReason("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Device reset request was not sent.");
      }
    });
  }

  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="dutyPeriod">
            Duty Option
          </label>
          <select id="dutyPeriod" className="field mt-1" value={dutyPeriod} onChange={(event) => setDutyPeriod(event.target.value as DutyPeriod)} disabled={pending}>
            <option value="full_day">Full Day</option>
            <option value="morning_half">Half Day - Morning Only</option>
            <option value="afternoon_half">Half Day - Afternoon</option>
          </select>
        </div>
        <button className="btn-primary min-h-20 text-lg" type="button" disabled={!canTimeIn || pending} onClick={() => openCamera("time_in")}>
          <Clock3 size={24} />
          Time In
        </button>
        <button className="btn-secondary min-h-20 text-lg" type="button" disabled={!canTimeOut || pending} onClick={() => openCamera("time_out")}>
          <CheckCircle2 size={24} />
          Time Out
        </button>
      </div>

      {mode ? (
        <div className="panel overflow-hidden">
          <video ref={videoRef} autoPlay playsInline muted className="aspect-[4/3] w-full bg-slate-900 object-cover" />
          <canvas ref={canvasRef} className="hidden" />
          <div className="grid grid-cols-2 gap-3 p-3">
            <button className="btn-secondary" type="button" onClick={() => openCamera(mode)} disabled={pending}>
              <RotateCcw size={18} />
              Retake
            </button>
            <button className="btn-primary" type="button" onClick={submitPunch} disabled={pending}>
              {pending ? <Loader2 className="animate-spin" size={18} /> : <Camera size={18} />}
              Save
            </button>
          </div>
          <div className="flex items-center gap-2 px-3 pb-3 text-xs text-slate-500">
            <MapPin size={14} />
            GPS is checked against your assigned branch before saving.
          </div>
        </div>
      ) : null}

      {message ? <div className="rounded-md bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">{message}</div> : null}
      {error ? <div className="rounded-md bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</div> : null}
      {error.includes("registered to another phone") ? (
        <div className="panel space-y-3 p-4">
          <label className="label" htmlFor="resetReason">
            Request Admin Device Reset
          </label>
          <textarea
            id="resetReason"
            className="field min-h-24"
            value={resetReason}
            onChange={(event) => setResetReason(event.target.value)}
            placeholder="Reason for using a new phone"
          />
          <button className="btn-secondary w-full" type="button" onClick={requestDeviceReset} disabled={pending}>
            Send Reset Request
          </button>
        </div>
      ) : null}
    </section>
  );
}
