// Convert a File to a small JPEG data URL (max 512px on the longer side, ~q=0.72).
// We use this to render the uploaded photo inline in the transcript and to
// persist it cheaply in localStorage history. The original full-res file is
// still what gets POSTed to /api/diagnose-photo for accurate AI vision.

export async function fileToThumbDataUrl(
  file: File,
  maxDim = 512,
  quality = 0.72,
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(maxDim / bitmap.width, maxDim / bitmap.height, 1);
  const w = Math.max(1, Math.round(bitmap.width * ratio));
  const h = Math.max(1, Math.round(bitmap.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", quality);
}
