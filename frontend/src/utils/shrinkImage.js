// Shrinks a photo in the browser before it's uploaded.
// Phone photos are often 3 to 10 MB; resizing them to a sensible size makes uploads
// fast and keeps them well under the server's 5 MB limit.
//
// Returns a new JPEG (or PNG for images with transparency) File, or the original file
// when it's already small, is a GIF (keeps animation), or the browser can't read it.

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable image"));
    };
    img.src = url;
  });
}

export async function shrinkImage(file, { maxDimension = 1600, quality = 0.85 } = {}) {
  if (!file || !file.type?.startsWith("image/") || file.type === "image/gif") return file;

  try {
    const img = await loadImage(file);
    const scale = Math.min(1, maxDimension / Math.max(img.naturalWidth, img.naturalHeight));

    // Already small enough in both size and pixels: keep the original
    if (scale === 1 && file.size <= 1024 * 1024) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);

    const keepPng = file.type === "image/png" && file.size <= 2 * 1024 * 1024;
    const type = keepPng ? "image/png" : "image/jpeg";
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, quality));
    if (!blob || blob.size >= file.size) return file;

    const base = (file.name || "photo").replace(/\.[^.]+$/, "");
    return new File([blob], `${base}.${keepPng ? "png" : "jpg"}`, { type, lastModified: Date.now() });
  } catch {
    // e.g. an iPhone HEIC photo in a browser that can't open it; let the server decide
    return file;
  }
}
