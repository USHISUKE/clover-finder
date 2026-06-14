const video = document.getElementById("video");
const overlay = document.getElementById("overlay");
const work = document.getElementById("work");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const scanBtn = document.getElementById("scanBtn");
const emptyState = document.getElementById("emptyState");
const bestScoreEl = document.getElementById("bestScore");
const candidateCountEl = document.getElementById("candidateCount");
const fpsEl = document.getElementById("fps");
const hintEl = document.getElementById("hint");
const strictness = document.getElementById("strictness");
const strictnessOut = document.getElementById("strictnessOut");
const sizePref = document.getElementById("sizePref");
const sizePrefOut = document.getElementById("sizePrefOut");
const showMask = document.getElementById("showMask");

const octx = overlay.getContext("2d");
const wctx = work.getContext("2d", { willReadFrequently: true });

let stream = null;
let timer = null;
let busy = false;
let lastAnalysisMs = 0;

strictness.addEventListener("input", () => strictnessOut.value = strictness.value);
sizePref.addEventListener("input", () => sizePrefOut.value = sizePref.value);

function setStatus(text) {
  fpsEl.textContent = text;
}

function resizeOverlay() {
  const rect = video.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  overlay.width = Math.max(1, Math.floor(rect.width * dpr));
  overlay.height = Math.max(1, Math.floor(rect.height * dpr));
  octx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener("resize", resizeOverlay);

async function startCamera() {
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("このブラウザーではカメラAPIを利用できません。Chrome / Safari / Edge でHTTPSまたはlocalhostから開いてください。");
    }

    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      }
    });

    video.srcObject = stream;
    await video.play();
    emptyState.style.display = "none";
    resizeOverlay();
    setStatus("解析中");

    clearInterval(timer);
    timer = setInterval(analyzeFrame, 650);
    analyzeFrame();
  } catch (err) {
    hintEl.textContent = err.message || "カメラを開始できませんでした。権限設定を確認してください。";
    setStatus("エラー");
  }
}

function stopCamera() {
  clearInterval(timer);
  timer = null;
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  video.srcObject = null;
  emptyState.style.display = "";
  clearOverlay();
  bestScoreEl.textContent = "--";
  candidateCountEl.textContent = "0";
  setStatus("停止");
}

startBtn.addEventListener("click", startCamera);
stopBtn.addEventListener("click", stopCamera);
scanBtn.addEventListener("click", analyzeFrame);

function clearOverlay() {
  const rect = overlay.getBoundingClientRect();
  octx.clearRect(0, 0, rect.width, rect.height);
}

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return [h, s, max];
}

function makeGreenMask(imageData, width, height, strict) {
  const data = imageData.data;
  const mask = new Uint8Array(width * height);
  const minSat = 0.20 + strict * 0.0028;
  const minVal = 0.12 + strict * 0.0008;
  const hueLow = 48 - strict * 0.06;
  const hueHigh = 178 - strict * 0.14;

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const [h, s, v] = rgbToHsv(r, g, b);
    const greenDominant = g > r * (1.02 + strict * 0.0015) && g > b * (0.92 + strict * 0.001);
    if (h >= hueLow && h <= hueHigh && s >= minSat && v >= minVal && greenDominant) {
      mask[p] = 1;
    }
  }
  return mask;
}

function sampleDensity(mask, width, height, cx, cy, radius, binCount = 24) {
  const green = new Array(binCount).fill(0);
  const total = new Array(binCount).fill(0);
  const r2 = radius * radius;
  const inner = radius * 0.34;
  const inner2 = inner * inner;
  const step = radius > 38 ? 2 : 1;
  const x0 = Math.max(0, Math.floor(cx - radius));
  const x1 = Math.min(width - 1, Math.ceil(cx + radius));
  const y0 = Math.max(0, Math.floor(cy - radius));
  const y1 = Math.min(height - 1, Math.ceil(cy + radius));

  for (let y = y0; y <= y1; y += step) {
    for (let x = x0; x <= x1; x += step) {
      const dx = x - cx;
      const dy = y - cy;
      const d2 = dx * dx + dy * dy;
      if (d2 < inner2 || d2 > r2) continue;
      let angle = Math.atan2(dy, dx);
      if (angle < 0) angle += Math.PI * 2;
      const bin = Math.floor(angle / (Math.PI * 2) * binCount) % binCount;
      total[bin]++;
      if (mask[y * width + x]) green[bin]++;
    }
  }

  return green.map((g, i) => total[i] ? g / total[i] : 0);
}

function circularAvg(arr, idx, span = 1) {
  let sum = 0;
  let n = 0;
  const len = arr.length;
  for (let d = -span; d <= span; d++) {
    sum += arr[(idx + d + len) % len];
    n++;
  }
  return sum / n;
}

function scoreFourLeaf(mask, width, height, cx, cy, radius) {
  const bins = sampleDensity(mask, width, height, cx, cy, radius, 24);
  let best = -999;
  let bestOrientation = 0;

  for (let o = 0; o < 6; o++) {
    const peaks = [0, 6, 12, 18].map(k => circularAvg(bins, o + k, 1));
    const gaps = [3, 9, 15, 21].map(k => circularAvg(bins, o + k, 1));

    const peakAvg = peaks.reduce((a, b) => a + b, 0) / peaks.length;
    const minPeak = Math.min(...peaks);
    const gapAvg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const spread = Math.max(...peaks) - minPeak;

    let score = peakAvg * 0.55 + minPeak * 0.45 - gapAvg * 0.62 - spread * 0.22;
    if (minPeak < 0.26) score -= 0.3;
    if (peakAvg - gapAvg < 0.10) score -= 0.25;

    if (score > best) {
      best = score;
      bestOrientation = o;
    }
  }

  return { score: best, orientation: bestOrientation };
}

function nonMaxSuppression(candidates, maxItems = 6) {
  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const keep = [];
  for (const c of sorted) {
    const overlaps = keep.some(k => {
      const dx = c.cx - k.cx;
      const dy = c.cy - k.cy;
      const dist = Math.hypot(dx, dy);
      return dist < Math.max(c.r, k.r) * 0.72;
    });
    if (!overlaps) keep.push(c);
    if (keep.length >= maxItems) break;
  }
  return keep;
}

function drawMask(imageData, mask, width, height) {
  const data = imageData.data;
  for (let p = 0, i = 0; p < mask.length; p++, i += 4) {
    if (mask[p]) {
      data[i] = 80;
      data[i + 1] = 210;
      data[i + 2] = 90;
      data[i + 3] = 80;
    } else {
      data[i + 3] = 0;
    }
  }
}

function analyzeFrame() {
  if (!stream || busy || video.readyState < 2) return;
  busy = true;

  const start = performance.now();
  const vw = video.videoWidth || 1280;
  const vh = video.videoHeight || 720;
  const targetW = 360;
  const targetH = Math.max(1, Math.round(vh / vw * targetW));

  work.width = targetW;
  work.height = targetH;
  wctx.drawImage(video, 0, 0, targetW, targetH);

  const imageData = wctx.getImageData(0, 0, targetW, targetH);
  const strict = Number(strictness.value);
  const mask = makeGreenMask(imageData, targetW, targetH, strict);

  const sizeBias = Number(sizePref.value) / 100;
  const rMin = 14 + sizeBias * 12;
  const rMax = 34 + sizeBias * 42;
  const radii = [];
  for (let r = rMin; r <= rMax; r += 8) radii.push(Math.round(r));

  const stride = 10;
  const threshold = 0.255 + strict * 0.0022;
  const raw = [];

  for (let y = Math.round(rMax); y < targetH - rMax; y += stride) {
    for (let x = Math.round(rMax); x < targetW - rMax; x += stride) {
      let best = { score: -999, orientation: 0, r: radii[0] };
      for (const r of radii) {
        const result = scoreFourLeaf(mask, targetW, targetH, x, y, r);
        if (result.score > best.score) best = { ...result, r };
      }
      if (best.score > threshold) {
        raw.push({ cx: x, cy: y, r: best.r, score: best.score, orientation: best.orientation });
      }
    }
  }

  const candidates = nonMaxSuppression(raw, 6);
  drawOverlay(candidates, targetW, targetH, imageData, mask);
  updateStats(candidates, start);

  busy = false;
}

function drawOverlay(candidates, sourceW, sourceH, imageData, mask) {
  const rect = video.getBoundingClientRect();
  resizeOverlay();
  clearOverlay();

  const sx = rect.width / sourceW;
  const sy = rect.height / sourceH;

  if (showMask.checked) {
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = sourceW;
    maskCanvas.height = sourceH;
    const mctx = maskCanvas.getContext("2d");
    const maskImage = mctx.createImageData(sourceW, sourceH);
    drawMask(maskImage, mask, sourceW, sourceH);
    mctx.putImageData(maskImage, 0, 0);
    octx.drawImage(maskCanvas, 0, 0, rect.width, rect.height);
  }

  candidates.forEach((c, idx) => {
    const x = c.cx * sx;
    const y = c.cy * sy;
    const r = c.r * Math.max(sx, sy);
    const scorePct = Math.max(0, Math.min(99, Math.round(c.score * 100)));

    octx.save();
    octx.lineWidth = idx === 0 ? 4 : 2.5;
    octx.strokeStyle = idx === 0 ? "rgba(227, 61, 61, 0.98)" : "rgba(255, 189, 89, 0.92)";
    octx.fillStyle = idx === 0 ? "rgba(227, 61, 61, 0.12)" : "rgba(255, 189, 89, 0.10)";
    octx.beginPath();
    octx.arc(x, y, r, 0, Math.PI * 2);
    octx.fill();
    octx.stroke();

    for (let k = 0; k < 4; k++) {
      const angle = ((c.orientation + k * 6) / 24) * Math.PI * 2;
      octx.beginPath();
      octx.moveTo(x, y);
      octx.lineTo(x + Math.cos(angle) * r * 0.82, y + Math.sin(angle) * r * 0.82);
      octx.stroke();
    }

    octx.fillStyle = idx === 0 ? "rgba(227, 61, 61, 0.98)" : "rgba(255, 189, 89, 0.96)";
    octx.font = "bold 14px system-ui, sans-serif";
    octx.fillText(`${idx + 1}: ${scorePct}`, x + r + 5, y - r - 3);
    octx.restore();
  });
}

function updateStats(candidates, startTime) {
  const best = candidates[0]?.score ?? null;
  bestScoreEl.textContent = best === null ? "--" : `${Math.round(best * 100)}`;
  candidateCountEl.textContent = String(candidates.length);

  const elapsed = performance.now() - startTime;
  lastAnalysisMs = Math.round(elapsed);
  setStatus(`${lastAnalysisMs}ms`);

  if (candidates.length === 0) {
    hintEl.textContent = "候補なし。少し近づく、影を避ける、検出の厳しさを下げる、の順に試してください。";
  } else if (best > 0.55) {
    hintEl.textContent = "強い候補があります。赤い丸の中心付近を目で確認してください。";
  } else {
    hintEl.textContent = "候補を表示しています。黄色は弱めの候補、赤は最有力候補です。";
  }
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
