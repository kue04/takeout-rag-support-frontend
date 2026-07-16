import { copyFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const snapshotPath = resolve(projectRoot, "openapi/openapi.json");
const configuredPath = process.env.BACKEND_OPENAPI_PATH;
const defaultPath = resolve(projectRoot, "../llm-customer-service/docs/openapi.json");
const sourcePath = configuredPath ? resolve(configuredPath) : defaultPath;

if (existsSync(sourcePath)) {
  await mkdir(dirname(snapshotPath), { recursive: true });
  await copyFile(sourcePath, snapshotPath);
  console.log(`OpenAPI snapshot synced from ${sourcePath}`);
} else if (existsSync(snapshotPath)) {
  console.log(`Backend OpenAPI not found; using committed snapshot ${snapshotPath}`);
} else {
  throw new Error(
    `OpenAPI schema not found. Set BACKEND_OPENAPI_PATH or export the backend schema to ${sourcePath}`,
  );
}
