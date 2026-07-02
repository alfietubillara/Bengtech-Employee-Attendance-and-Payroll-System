"use client";

import { useState, useTransition } from "react";
import { Loader2, MapPin } from "lucide-react";
import { distanceInMeters } from "@/lib/geo";

type Props = {
  branchName: string;
  branchLatitude: number;
  branchLongitude: number;
  allowedRadius: number;
};

type Result = {
  latitude: number;
  longitude: number;
  accuracy: number;
  distance: number;
};

export function LocationTester({ branchName, branchLatitude, branchLongitude, allowedRadius }: Props) {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function testLocation() {
    startTransition(async () => {
      setError("");
      setResult(null);

      if (!window.isSecureContext) {
        setError("GPS requires HTTPS or localhost. Use localhost on this computer or deploy to Vercel for phone testing.");
        return;
      }

      if (!navigator.geolocation) {
        setError("This browser does not support GPS location.");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;
          const distance = distanceInMeters(
            { latitude, longitude },
            { latitude: branchLatitude, longitude: branchLongitude }
          );
          setResult({
            latitude,
            longitude,
            accuracy: position.coords.accuracy,
            distance
          });
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) setError("GPS permission was blocked. Allow location access in the browser settings.");
          else if (err.code === err.POSITION_UNAVAILABLE) setError("GPS location is unavailable. Turn on Location/GPS and try again.");
          else setError("GPS request timed out. Try again near a window or using a phone.");
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      );
    });
  }

  const inside = result ? result.distance <= allowedRadius : false;

  return (
    <section className="panel mx-auto max-w-2xl space-y-4 p-4">
      <div>
        <h1 className="text-2xl font-bold">GPS Test</h1>
        <p className="text-sm text-slate-500">Check the location reported by this device before Time In.</p>
      </div>

      <div className="rounded-md bg-slate-50 p-3 text-sm">
        <div className="font-semibold">{branchName}</div>
        <div className="text-slate-500">
          Branch GPS: {branchLatitude}, {branchLongitude}
        </div>
        <div className="text-slate-500">Allowed radius: {allowedRadius}m</div>
      </div>

      <button className="btn-primary w-full" type="button" onClick={testLocation} disabled={pending}>
        {pending ? <Loader2 className="animate-spin" size={18} /> : <MapPin size={18} />}
        Test My GPS
      </button>

      {result ? (
        <div className={inside ? "rounded-md bg-green-50 p-4 text-green-800" : "rounded-md bg-red-50 p-4 text-red-800"}>
          <div className="font-bold">{inside ? "Inside allowed branch perimeter" : "Outside allowed branch perimeter"}</div>
          <div className="mt-2 text-sm">Your GPS: {result.latitude}, {result.longitude}</div>
          <div className="text-sm">Distance from branch: {Math.round(result.distance)}m</div>
          <div className="text-sm">Reported accuracy: +/- {Math.round(result.accuracy)}m</div>
        </div>
      ) : null}

      {error ? <div className="rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div> : null}
    </section>
  );
}
