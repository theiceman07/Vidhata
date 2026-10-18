/**
 * Which data the app reads. The mock layer is the default, so a build with no setting behaves
 * exactly as before. Set NEXT_PUBLIC_VIDHATA_DATA=backend to read the real FastAPI backend.
 */
export function backendDataEnabled(): boolean {
  return process.env.NEXT_PUBLIC_VIDHATA_DATA === "backend";
}
