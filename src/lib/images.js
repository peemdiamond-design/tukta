// Client-side image compression. Firebase Storage needs the paid Blaze plan for new
// projects, so images are stored as compressed WebP data URLs in Firestore (max ~1 MiB/doc).
const MAX_BYTES = 700 * 1024;

const loadImage = (file) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("อ่านไฟล์รูปไม่ได้")); };
    img.src = url;
  });

const dataUrlBytes = (d) => Math.ceil((d.length - d.indexOf(",") - 1) * 0.75);

/** Resize to max 1600px wide and re-encode until under MAX_BYTES. */
export async function compressImage(file) {
  if (!file.type.startsWith("image/")) throw new Error("ไฟล์นี้ไม่ใช่รูปภาพ");
  const img = await loadImage(file);
  let width = Math.min(1600, img.naturalWidth);
  let quality = 0.82;
  for (let attempt = 0; attempt < 8; attempt++) {
    const height = Math.round((img.naturalHeight / img.naturalWidth) * width);
    const canvas = Object.assign(document.createElement("canvas"), { width, height });
    canvas.getContext("2d").drawImage(img, 0, 0, width, height);
    const data = canvas.toDataURL("image/webp", quality);
    if (dataUrlBytes(data) <= MAX_BYTES) return { data, width, height };
    if (quality > 0.55) quality -= 0.1;
    else width = Math.round(width * 0.8);
  }
  throw new Error("รูปใหญ่เกินไป ลองใช้รูปที่เล็กลง");
}
