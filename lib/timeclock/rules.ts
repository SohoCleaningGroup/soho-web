export type LocationSnapshot = {
  status: "captured" | "denied" | "unavailable" | "timeout";
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  capturedAt?: string;
};

export function locationSnapshot(value: unknown, now = Date.now()): LocationSnapshot {
  if (!value || typeof value !== "object") throw new Error("Location result is required.");
  const input = value as Record<string, unknown>;
  if (["denied", "unavailable", "timeout"].includes(String(input.status))) {
    return { status: input.status as LocationSnapshot["status"] };
  }
  if (input.status !== "captured" ||
      typeof input.latitude !== "number" || !Number.isFinite(input.latitude) || Math.abs(input.latitude) > 90 ||
      typeof input.longitude !== "number" || !Number.isFinite(input.longitude) || Math.abs(input.longitude) > 180 ||
      typeof input.accuracy !== "number" || !Number.isFinite(input.accuracy) || input.accuracy < 0 ||
      typeof input.capturedAt !== "string") throw new Error("Invalid location result.");
  const capturedAt = Date.parse(input.capturedAt);
  if (!Number.isFinite(capturedAt) || capturedAt > now + 30_000 || capturedAt < now - 120_000) {
    throw new Error("Location is too old. Please try again.");
  }
  return { status: "captured", latitude: input.latitude, longitude: input.longitude,
    accuracy: input.accuracy, capturedAt: new Date(capturedAt).toISOString() };
}

export function validatePeriod(start: Date, end: Date, now = Date.now()) {
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) ||
      end <= start || end.getTime() > now + 1_000) {
    throw new Error("Enter a valid start and end time in the past.");
  }
}

export function distanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const rad = (n: number) => n * Math.PI / 180;
  const dLat = rad(b.latitude - a.latitude), dLng = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}

export function locationAssessment(location: LocationSnapshot, site: { siteLatitude: number | null; siteLongitude: number | null; siteRadiusMeters: number }) {
  if (location.status !== "captured") return "Location unavailable — review";
  if (location.accuracy === undefined || location.accuracy > 100) return "Low location accuracy — review";
  if (site.siteLatitude === null || site.siteLongitude === null) return "Compare with job address";
  const distance = distanceMeters(
    { latitude: location.latitude!, longitude: location.longitude! },
    { latitude: site.siteLatitude, longitude: site.siteLongitude }
  );
  if (distance > site.siteRadiusMeters + location.accuracy) return "Outside job area — review";
  if (distance + location.accuracy > site.siteRadiusMeters) return "Near job area boundary — review";
  return "Within job area (phone reported)";
}
