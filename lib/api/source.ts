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
