/**
 * Which data the app reads. The mock layer is the default, so a build with no setting behaves
 * exactly as before. Set NEXT_PUBLIC_VIDHATA_DATA=backend to read the real FastAPI backend.
 */
export function backendDataEnabled(): boolean {
  return process.env.NEXT_PUBLIC_VIDHATA_DATA === "backend";
}

/**
 * Whether questions go to the backend's chat endpoint (POST /documents/{id}/chat). Off unless
 * NEXT_PUBLIC_VIDHATA_CHAT=1, so production keeps the local agent until the flag is set there.
 */
export function chatBackendEnabled(): boolean {
  return process.env.NEXT_PUBLIC_VIDHATA_CHAT === "1";
}

/**
 * Whether a started draft shows the "Upload your contract" step. The SRD defers Path 2 (reviewing a
 * contract the client already has), so production hides it. Set NEXT_PUBLIC_VIDHATA_UPLOAD=1 to
 * test the upload and review path against the backend.
 */
export function uploadPathEnabled(): boolean {
  return process.env.NEXT_PUBLIC_VIDHATA_UPLOAD === "1";
}
