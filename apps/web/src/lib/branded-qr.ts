type BrandedQrDownloadOptions = {
  payload: string;
  libraryName: string;
  location?: string | null;
  qrKeyId?: string | null;
  filename?: string;
};

export function buildQrImageUrl(payload: string, size = 640) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=16&data=${encodeURIComponent(payload)}`;
}

export function buildQrFileName(libraryName: string) {
  const safeName = libraryName.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "library";
  return `${safeName}-booklib-attendance-qr.png`;
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
}

function drawCenteredText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  lines.slice(0, 2).forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });
}

async function fetchImageObjectUrl(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Unable to fetch QR asset.");
  const blob = await response.blob();
  return window.URL.createObjectURL(blob);
}

async function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load image."));
    image.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Unable to generate branded QR."));
    }, "image/png");
  });
}

function triggerDownload(blob: Blob, filename: string) {
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(objectUrl);
}

export async function downloadBrandedQrPng(options: BrandedQrDownloadOptions) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1600;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to prepare QR canvas.");

  let qrObjectUrl: string | null = null;
  let logoObjectUrl: string | null = null;

  try {
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#0f766e");
    gradient.addColorStop(1, "#0b1220");
    ctx.fillStyle = gradient;
    roundedRect(ctx, 72, 72, 1056, 1456, 48);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    roundedRect(ctx, 112, 112, 976, 1376, 36);
    ctx.fill();

    ctx.fillStyle = "#ecfdf5";
    roundedRect(ctx, 152, 152, 896, 150, 28);
    ctx.fill();

    try {
      logoObjectUrl = await fetchImageObjectUrl("/icons/booklib-logo.png");
      const logo = await loadImage(logoObjectUrl);
      ctx.drawImage(logo, 184, 182, 112, 72);
    } catch {
      ctx.fillStyle = "#ffffff";
      roundedRect(ctx, 184, 180, 96, 76, 18);
      ctx.fill();
      ctx.fillStyle = "#0f766e";
      ctx.font = "700 36px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("BL", 232, 218);
    }

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#0f172a";
    ctx.font = "900 42px Arial";
    ctx.fillText("BookLib Attendance QR", 320, 206);
    ctx.fillStyle = "#475569";
    ctx.font = "700 24px Arial";
    ctx.fillText("Scan for check-in, check-out, and library access.", 320, 246);

    ctx.textAlign = "center";
    ctx.fillStyle = "#0f172a";
    ctx.font = "900 54px Arial";
    drawCenteredText(ctx, options.libraryName || "Library QR", 600, 400, 860, 62);

    if (options.location) {
      ctx.fillStyle = "#64748b";
      ctx.font = "700 28px Arial";
      drawCenteredText(ctx, options.location, 600, 524, 760, 36);
    }

    qrObjectUrl = await fetchImageObjectUrl(buildQrImageUrl(options.payload, 940));
    const qrImage = await loadImage(qrObjectUrl);
    ctx.fillStyle = "#ffffff";
    roundedRect(ctx, 182, 590, 836, 836, 40);
    ctx.fill();
    ctx.strokeStyle = "#d1fae5";
    ctx.lineWidth = 12;
    roundedRect(ctx, 182, 590, 836, 836, 40);
    ctx.stroke();
    ctx.drawImage(qrImage, 230, 638, 740, 740);

    ctx.fillStyle = "#0f766e";
    ctx.font = "900 30px Arial";
    ctx.fillText("Students scan this at reception from BookLib.", 600, 1470);

    ctx.fillStyle = "#64748b";
    ctx.font = "700 22px Arial";
    ctx.fillText(`QR Key: ${options.qrKeyId || "-"}`, 600, 1510);

    const blob = await canvasToBlob(canvas);
    triggerDownload(blob, options.filename || buildQrFileName(options.libraryName));
  } finally {
    if (qrObjectUrl) window.URL.revokeObjectURL(qrObjectUrl);
    if (logoObjectUrl) window.URL.revokeObjectURL(logoObjectUrl);
  }
}
