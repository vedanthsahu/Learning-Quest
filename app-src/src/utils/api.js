const BASE = "/api/data";

export async function fetchData() {
  const res = await fetch(BASE, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load data: ${res.status}`);
  return res.json();
}

export async function saveData(data) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to save data: ${res.status}`);
  return res.json();
}

// Uploads an image (a File, or a data URL string) to the local server's uploads/ folder
// and returns its relative path (e.g. "uploads/ab12cd34.png") for use as an <img src>.
export async function uploadImage(fileOrDataUrl, filename) {
  const dataUrl =
    typeof fileOrDataUrl === "string" ? fileOrDataUrl : await readAsDataUrl(fileOrDataUrl);
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataUrl, filename: filename || "pasted-image.png" }),
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json(); // { path }
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
