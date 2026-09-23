import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase/admin";

const PUBLIC_DOCUMENT_MARKER = "/storage/v1/object/public/professional-documents/";
const PUBLIC_PROFILE_MARKER = "/storage/v1/object/public/professional-profiles/";

function storagePath(value: string | null, publicMarker: string) {
  if (!value) return null;
  if (!value.startsWith("http://") && !value.startsWith("https://")) return value;

  try {
    const url = new URL(value);
    const markerIndex = url.pathname.indexOf(publicMarker);
    if (markerIndex === -1) return null;
    return decodeURIComponent(url.pathname.slice(markerIndex + publicMarker.length));
  } catch {
    return null;
  }
}

async function createPrivateViewUrl(
  bucket: "professional-documents" | "professional-profiles",
  value: string | null,
  publicMarker: string
) {
  const path = storagePath(value, publicMarker);
  if (!path) return null;

  const { data, error } = await getSupabaseAdmin()
    .storage
    .from(bucket)
    .createSignedUrl(path, 5 * 60, { download: false });

  if (error) {
    console.error("PRIVATE_FILE_SIGNED_URL_ERROR", {
      bucket,
      path,
      message: error.message,
    });
    return null;
  }

  return data.signedUrl;
}

export function documentStoragePath(value: string | null) {
  return storagePath(value, PUBLIC_DOCUMENT_MARKER);
}

export function createDocumentViewUrl(value: string | null) {
  return createPrivateViewUrl(
    "professional-documents",
    value,
    PUBLIC_DOCUMENT_MARKER
  );
}

export function createProfileViewUrl(value: string | null) {
  return createPrivateViewUrl(
    "professional-profiles",
    value,
    PUBLIC_PROFILE_MARKER
  );
}
