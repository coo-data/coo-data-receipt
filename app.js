const COMPANY_NAME = "有限会社COO";

const canvas = document.querySelector("#signatureCanvas");
const hint = document.querySelector("#emptyHint");
const sizeInput = document.querySelector("#sizeInput");
const clearButton = document.querySelector("#clearButton");
const saveButton = document.querySelector("#saveButton");
const undoButton = document.querySelector("#undoButton");
const shareMethod = document.querySelector("#shareMethod");
const recordDate = document.querySelector("#recordDate");
const personInCharge = document.querySelector("#personInCharge");
const agreementNote = document.querySelector("#agreementNote");
const dataContentInputs = document.querySelectorAll("input[name='dataContent']");
const swatches = document.querySelectorAll(".swatch");
const ctx = canvas.getContext("2d");

let inkColor = "#171717";
let isDrawing = false;
let hasInk = false;
let lastPoint = null;
let history = [];

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  const snapshot = canvas.width && canvas.height ? canvas.toDataURL("image/png") : null;

  canvas.width = Math.round(rect.width * ratio);
  canvas.height = Math.round(rect.height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (snapshot) {
    const image = new Image();
    image.onload = () => ctx.drawImage(image, 0, 0, rect.width, rect.height);
    image.src = snapshot;
  }
}

function pointFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function saveHistory() {
  history.push({
    image: canvas.toDataURL("image/png"),
    hasInk,
  });
  if (history.length > 20) {
    history.shift();
  }
}

function updateHint() {
  hint.classList.toggle("hidden", hasInk);
}

function startDrawing(event) {
  event.preventDefault();
  canvas.setPointerCapture?.(event.pointerId);
  saveHistory();
  isDrawing = true;
  hasInk = true;
  lastPoint = pointFromEvent(event);
  updateHint();
}

function draw(event) {
  if (!isDrawing || !lastPoint) return;
  event.preventDefault();

  const currentPoint = pointFromEvent(event);
  ctx.strokeStyle = inkColor;
  ctx.lineWidth = Number(sizeInput.value);
  ctx.beginPath();
  ctx.moveTo(lastPoint.x, lastPoint.y);
  ctx.lineTo(currentPoint.x, currentPoint.y);
  ctx.stroke();
  lastPoint = currentPoint;
}

function stopDrawing(event) {
  if (!isDrawing) return;
  event.preventDefault();
  isDrawing = false;
  lastPoint = null;
}

function clearCanvas() {
  saveHistory();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  hasInk = false;
  updateHint();
}

function restoreState(state) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  hasInk = state.hasInk;
  updateHint();

  if (!state.hasInk) return;

  const image = new Image();
  image.onload = () => {
    const rect = canvas.getBoundingClientRect();
    ctx.drawImage(image, 0, 0, rect.width, rect.height);
  };
  image.src = state.image;
}

function undo() {
  const previous = history.pop();
  if (!previous) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasInk = false;
    updateHint();
    return;
  }
  restoreState(previous);
}

function selectedText(select) {
  return select.options[select.selectedIndex]?.text || "";
}

function selectedDataContent() {
  const selected = Array.from(dataContentInputs)
    .filter((input) => input.checked)
    .map((input) => input.value);
  return selected.length ? selected.join(" / ") : "未選択";
}

function formatDisplayDate(value) {
  return value ? value.replaceAll("-", "/") : "";
}

function drawTextBlock(context, text, x, y, maxWidth, lineHeight) {
  let line = "";
  let currentY = y;

  for (const char of text) {
    const testLine = line + char;
    if (context.measureText(testLine).width > maxWidth && line) {
      context.fillText(line, x, currentY);
      line = char;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }

  if (line) {
    context.fillText(line, x, currentY);
  }

  return currentY;
}

function createExportCanvas(date) {
  const exportCanvas = document.createElement("canvas");
  const exportCtx = exportCanvas.getContext("2d");
  const width = 1200;
  const height = 1120;
  const padding = 72;

  exportCanvas.width = width;
  exportCanvas.height = height;

  exportCtx.fillStyle = "#ffffff";
  exportCtx.fillRect(0, 0, width, height);

  exportCtx.fillStyle = "#171717";
  exportCtx.font = "700 44px sans-serif";
  exportCtx.fillText("撮影データ受け渡し確認書", padding, 92);

  exportCtx.font = "700 28px sans-serif";
  exportCtx.fillText(`署名依頼元: ${COMPANY_NAME}`, padding, 142);

  exportCtx.font = "600 30px sans-serif";
  exportCtx.fillText(`日付: ${formatDisplayDate(date)}`, padding, 206);
  exportCtx.fillText(`担当者: ${selectedText(personInCharge)}`, padding, 260);
  exportCtx.fillText(`共有方法: ${selectedText(shareMethod)}`, padding, 314);
  exportCtx.fillText(`データ内容: ${selectedDataContent()}`, padding, 368);

  exportCtx.fillStyle = "#333333";
  exportCtx.font = "500 25px sans-serif";
  const noteEndY = drawTextBlock(
    exportCtx,
    agreementNote.textContent.trim(),
    padding,
    438,
    width - padding * 2,
    38
  );

  const signatureX = padding;
  const signatureY = Math.max(570, noteEndY + 70);
  const signatureWidth = width - padding * 2;
  const signatureHeight = 410;

  exportCtx.strokeStyle = "#d7d7d7";
  exportCtx.lineWidth = 3;
  exportCtx.strokeRect(signatureX, signatureY, signatureWidth, signatureHeight);

  exportCtx.fillStyle = "#666666";
  exportCtx.font = "600 24px sans-serif";
  exportCtx.fillText("署名", signatureX, signatureY - 18);

  exportCtx.drawImage(canvas, signatureX + 24, signatureY + 24, signatureWidth - 48, signatureHeight - 48);

  return exportCanvas;
}

function savePng() {
  const link = document.createElement("a");
  const date = recordDate.value || new Date().toISOString().slice(0, 10);
  link.download = `coo-data-receipt-${personInCharge.value}-${shareMethod.value}-${date}.png`;
  link.href = createExportCanvas(date).toDataURL("image/png");
  link.click();
}

function setDefaultDate() {
  if (recordDate.value) return;
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60000;
  recordDate.value = new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  navigator.serviceWorker.register("service-worker.js");
}

window.addEventListener("resize", resizeCanvas);
canvas.addEventListener("pointerdown", startDrawing);
canvas.addEventListener("pointermove", draw);
canvas.addEventListener("pointerup", stopDrawing);
canvas.addEventListener("pointercancel", stopDrawing);
canvas.addEventListener("pointerleave", stopDrawing);
clearButton.addEventListener("click", clearCanvas);
saveButton.addEventListener("click", savePng);
undoButton.addEventListener("click", undo);

swatches.forEach((swatch) => {
  swatch.addEventListener("click", () => {
    inkColor = swatch.dataset.color;
    swatches.forEach((item) => item.classList.remove("active"));
    swatch.classList.add("active");
  });
});

resizeCanvas();
setDefaultDate();
updateHint();
