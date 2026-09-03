import fs from "fs";
import path from "path";
import os from "os";

// Candidate directories for durable persistence across builds and environments
function getStorageLocations(filename: string): string[] {
  const paths: string[] = [];
  const added = new Set<string>();

  const addPath = (p: string) => {
    const normalized = path.normalize(p);
    if (!added.has(normalized)) {
      added.add(normalized);
      paths.push(normalized);
    }
  };

  // 1. Next.js web app data directory (primary committed location)
  try {
    addPath(path.join(process.cwd(), "frontend", "apps", "web", "data", filename));
    addPath(path.join(process.cwd(), "apps", "web", "data", filename));
    addPath(path.join(process.cwd(), "data", filename));
  } catch {}

  // 2. Relative __dirname directory resolution for server build output
  try {
    if (typeof __dirname !== "undefined") {
      addPath(path.resolve(__dirname, "../../../../../data", filename));
      addPath(path.resolve(__dirname, "../../../../data", filename));
      addPath(path.resolve(__dirname, "../../../data", filename));
      addPath(path.resolve(__dirname, "../../data", filename));
    }
  } catch {}

  // 3. User home persistent app data folder (survives container/process restarts)
  try {
    const homeDir = os.homedir();
    if (homeDir) {
      addPath(path.join(homeDir, ".saas_live_chat_store", filename));
    }
  } catch {}

  // 4. System temp directory backup
  try {
    const tmp = os.tmpdir();
    if (tmp) {
      addPath(path.join(tmp, "saas_live_chat_store", filename));
    }
  } catch {}

  return paths;
}

export function readPersistentData<T>(filename: string, defaultValue: T): T {
  const candidates = getStorageLocations(filename);
  let bestData: any = null;
  let hasFound = false;

  for (const filePath of candidates) {
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        if (raw && raw.trim()) {
          const parsed = JSON.parse(raw);
          if (parsed !== null && parsed !== undefined) {
            hasFound = true;
            if (bestData === null) {
              bestData = parsed;
            } else if (Array.isArray(bestData) && Array.isArray(parsed)) {
              // Merge arrays safely by ID or unique key
              const map = new Map<string, any>();
              [...bestData, ...parsed].forEach((item, index) => {
                const key = item?.id || (item?.senderEmail && item?.receiverEmail ? `${item.senderEmail}::${item.receiverEmail}` : `item-${index}`);
                map.set(key, item);
              });
              bestData = Array.from(map.values());
            } else if (typeof bestData === "object" && typeof parsed === "object" && !Array.isArray(bestData) && !Array.isArray(parsed)) {
              // Merge objects / records (e.g. messages dictionary)
              const mergedObj: Record<string, any> = { ...bestData, ...parsed };
              Object.keys(parsed).forEach((k) => {
                if (Array.isArray(parsed[k]) && Array.isArray(bestData[k])) {
                  const itemMap = new Map<string, any>();
                  [...bestData[k], ...parsed[k]].forEach((msg, idx) => {
                    const mKey = msg?.id || `msg-${idx}`;
                    itemMap.set(mKey, msg);
                  });
                  mergedObj[k] = Array.from(itemMap.values());
                }
              });
              bestData = mergedObj;
            }
          }
        }
      }
    } catch {}
  }

  if (hasFound && bestData !== null) {
    // Ensure all candidate storage paths have the latest synchronized data
    try {
      syncToAllLocations(candidates, bestData);
    } catch {}
    return bestData as T;
  }

  // If nothing found anywhere, write default value so candidate paths are initialized
  try {
    syncToAllLocations(candidates, defaultValue);
  } catch {}

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
