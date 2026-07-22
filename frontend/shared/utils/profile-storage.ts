export interface StoredDocument {
  id: string;
  name: string;
  url?: string;
  type?: string;
  previewText?: string;
  uploadedAt?: string;
  sizeLabel?: string;
  [key: string]: any;
}

export interface ProfileField {
  label: string;
  value: string;
}

export interface ProfileDataPatch {
  fullName?: string;
  accountLabel?: string;
  email?: string;
  secondaryEmail?: string;
  phone?: string;
  countryCode?: string;
  nationality?: string;
  dateOfBirth?: string;
  nationalIdentity?: string;
  currency?: string;
  avatarUrl?: string;
  joiningDate?: string;
  [key: string]: any;
}

const OVERRIDES_STORAGE_KEY = "user_profile_overrides_v2";
const DOCUMENTS_STORAGE_KEY = "user_profile_documents_v2";

function getStorageMap<T>(key: string): Record<string, T> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setStorageMap<T>(key: string, map: Record<string, T>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(map));
  } catch {}
}

export const saveProfileOverrides = (userId: string, patch: ProfileDataPatch) => {
  if (!userId) return;
  const all = getStorageMap<ProfileDataPatch>(OVERRIDES_STORAGE_KEY);
  const current = all[userId] || {};
  all[userId] = { ...current, ...patch };
  setStorageMap(OVERRIDES_STORAGE_KEY, all);
};

export const getProfileOverrides = (userId: string): ProfileDataPatch => {
  if (!userId) return {};
  const all = getStorageMap<ProfileDataPatch>(OVERRIDES_STORAGE_KEY);
  return all[userId] || {};
};

export const getProfileDocuments = (userId: string): StoredDocument[] => {
  if (!userId) return [];
  const all = getStorageMap<StoredDocument[]>(DOCUMENTS_STORAGE_KEY);
  return all[userId] || [];
};

export const addProfileDocument = (userId: string, doc: StoredDocument) => {
  if (!userId) return;
  const all = getStorageMap<StoredDocument[]>(DOCUMENTS_STORAGE_KEY);
  const docs = all[userId] || [];
  all[userId] = [doc, ...docs];
  setStorageMap(DOCUMENTS_STORAGE_KEY, all);
};

export const downloadTextFile = (content: string, filename: string) => {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
