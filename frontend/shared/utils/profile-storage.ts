export interface StoredDocument { id: string; name: string; url?: string; type?: string; previewText?: string; uploadedAt?: string; sizeLabel?: string; [key: string]: any; }
export interface ProfileField { label: string; value: string; }

export const saveProfileOverrides = (userId: string, patch: any) => {
  // Mock save implementation
};

export const getProfileOverrides = (userId: string) => {
  return {} as any;
};

export const downloadTextFile = (content: string, filename: string) => {};
export const getProfileDocuments = (userId: string) => [] as StoredDocument[];
export const addProfileDocument = (userId: string, doc: StoredDocument) => {};
