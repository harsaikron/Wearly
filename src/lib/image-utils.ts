/**
 * Compress an image File to a base64 string (max 800px, ~150KB).
 * Used for AI analysis and localStorage storage.
 */
export function compressImage(file: File, maxPx = 800, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(dataUrl);
    };
    img.onerror = reject;
    img.src = url;
  });
}

/** Strip the data:image/...;base64, prefix for API calls */
export function stripDataPrefix(dataUrl: string): string {
  return dataUrl.replace(/^data:[^;]+;base64,/, '');
}
