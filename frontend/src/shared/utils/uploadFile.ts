/**
 * Stub for uploading files.
 * This will be replaced with real Cloudflare R2 or S3 upload logic later.
 */
export async function uploadFile(file: File): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Mock URL for now
      resolve(URL.createObjectURL(file));
    }, 1000);
  });
}

/**
 * Stub for uploading multiple files.
 */
export async function uploadFiles(files: File[]): Promise<string[]> {
  return Promise.all(files.map(file => uploadFile(file)));
}
