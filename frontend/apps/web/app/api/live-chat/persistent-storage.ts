import fs from "fs";
import path from "path";
import os from "os";

// Candidate directories for durable persistence across builds
function getStorageLocations(filename: string): string[] {
  const paths: string[] = [];

  // 1. User home persistent app data folder (survives any git clone / build / container wipe)
  try {
    const homeDir = os.homedir();
    if (homeDir) {
      paths.push(path.join(homeDir, ".saas_live_chat_store", filename));
    }
  } catch {}

  // 2. Temp directory backup
  try {
    const tmp = os.tmpdir();
    if (tmp) {
      paths.push(path.join(tmp, "saas_live_chat_store", filename));
    }
  } catch {}

  // 3. Local project data folder
  try {
    paths.push(path.join(process.cwd(), "data", filename));
  } catch {}

  return paths;
}

export function readPersistentData<T>(filename: string, defaultValue: T): T {
  const candidates = getStorageLocations(filename);

  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        if (raw && raw.trim()) {
          const parsed = JSON.parse(raw);
          if (parsed !== null && parsed !== undefined) {
            // Also ensure other backup paths have the latest data
            syncToAllLocations(candidates, parsed);
            return parsed as T;
          }
        }
      }
    } catch {}
  }

  return defaultValue;
}

export function writePersistentData<T>(filename: string, data: T): void {
  const candidates = getStorageLocations(filename);
  syncToAllLocations(candidates, data);
}

function syncToAllLocations<T>(paths: string[], data: T): void {
  const serialized = JSON.stringify(data, null, 2);
  for (const filePath of paths) {
    try {
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, serialized, "utf-8");
    } catch {}
  }
}
