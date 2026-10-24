/* ==========================================================================
   Provador virtual — câmera + MediaPipe Face Landmarker
   Toda a detecção roda no aparelho: nenhuma imagem sai do navegador.
   ========================================================================== */

const G = window.Godoy;

const VISION_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

// Pontos da malha facial (478 landmarks, com íris)
const LM = { irisL: 468, irisR: 473, templeL: 127, templeR: 356, top: 10, chin: 152 };
const FIT = 1.12;    // largura do SVG (240 un.) em relação à distância entre as têmporas
const LIFT = 0.015;  // sobe levemente os óculos em relação às pupilas
const SVG_RATIO = 112 / 240;
// Altura (no SVG) do centro das lentes de cada formato, que deve coincidir com as pupilas
const ANCHOR_Y = { redondo: 58, wayfarer: 58, quadrado: 57, clubmaster: 63, aviador: 58, gatinho: 55, hexagonal: 56 };
const anchor = () => (ANCHOR_Y[product().shape] ?? 57) / 112;

const $ = s => document.querySelector(s);
const els = {
  dialog: $("#tryon"),
  stage: $("#tryonStage"),
  video: $("#tryonVideo"),
  photo: $("#tryonPhoto"),
  glasses: $("#tryonGlasses"),
  hint: $("#tryonHint"),
  intro: $("#tryonIntro"),
  loading: $("#tryonLoading"),
  loadingText: $("#tryonLoadingText"),
  error: $("#tryonError"),
  errorText: $("#tryonErrorText"),
  name: $("#tryonName"),
  meta: $("#tryonMeta"),
  frames: $("#tryonFrames"),
  lenses: $("#tryonLenses"),
  models: $("#tryonModels"),
  cta: $("#tryonCta"),
  camWrap: $("#tryonCamWrap"),
  cam: $("#tryonCam"),
  file: $("#tryonFile"),
  shot: $("#tryonShot"),
  shotImg: $("#tryonShotImg"),
  shotSave: $("#tryonShotSave"),
  shotShare: $("#tryonShotShare"),
};

let landmarker = null;
let landmarkerPromise = null;
let runningMode = "VIDEO";
let stream = null;
let source = null;
let box = null;
let pose = null;
let rafId = 0;
let lastVideoTime = -1;
let lostFrames = 0;
let photoUrl = null;
let shotUrl = null;
let shotFile = null;
let current = G.PRODUCTS[0].id;
let mirrorVideo = true;

const CAM_KEY = "godoy:camera";
const savedCamera = () => { try { return localStorage.getItem(CAM_KEY); } catch { return null; } };
const saveCamera = id => { try { localStorage.setItem(CAM_KEY, id); } catch { /* sem storage */ } };
const forgetCamera = () => { try { localStorage.removeItem(CAM_KEY); } catch { /* sem storage */ } };

/* ---------- MediaPipe ---------- */

function loadLandmarker() {
  if (landmarker) return Promise.resolve(landmarker);
  landmarkerPromise ??= (async () => {
    const { FaceLandmarker, FilesetResolver } = await import(`${VISION_URL}/vision_bundle.mjs`);
    const fileset = await FilesetResolver.forVisionTasks(`${VISION_URL}/wasm`);
    const create = delegate => FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate },
      runningMode: "VIDEO",
      numFaces: 1,
    });
    try { return await create("GPU"); } catch { return await create("CPU"); }
  })();
  return landmarkerPromise.then(
    lm => (landmarker = lm),
    err => { landmarkerPromise = null; throw err; },
  );
}

async function setMode(mode) {
  if (runningMode === mode) return;
  await landmarker.setOptions({ runningMode: mode });
  runningMode = mode;
}

/* ---------- Pose dos óculos a partir da malha ---------- */

function computePose(lm, w, h) {
  const P = i => ({ x: lm[i].x * w, y: lm[i].y * h, z: lm[i].z * w });
  const a = P(LM.irisL), b = P(LM.irisR);
  const tl = P(LM.templeL), tr = P(LM.templeR);
  const top = P(LM.top), chin = P(LM.chin);

  // Distância 3D entre as têmporas: não encolhe quando o rosto gira
  const faceW = Math.hypot(tr.x - tl.x, tr.y - tl.y, tr.z - tl.z);
  const width = faceW * FIT;
  const roll = Math.atan2(b.y - a.y, b.x - a.x);
  const yaw = Math.atan2(tr.z - tl.z, Math.hypot(tr.x - tl.x, tr.y - tl.y));
  const pitch = Math.atan2(top.z - chin.z, Math.hypot(chin.x - top.x, chin.y - top.y)) * .6;
  const lift = width * LIFT;

  return {
    cx: (a.x + b.x) / 2 + Math.sin(roll) * lift,
    cy: (a.y + b.y) / 2 - Math.cos(roll) * lift,
    width,
    roll,
    yaw: clamp(yaw, -1, 1),
    pitch: clamp(pitch, -.45, .45),
  };
}

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// Suavização exponencial para os óculos não "tremerem"
function smooth(next) {
  if (!pose) return (pose = next);
  for (const k in next) pose[k] += (next[k] - pose[k]) * .5;
  return pose;
}

function sourceSize() {
  return source === els.video
    ? [els.video.videoWidth, els.video.videoHeight]
    : [els.photo.naturalWidth, els.photo.naturalHeight];
}

// Mesmo cálculo do object-fit (cover no vídeo, contain na foto)
function measure() {
  if (!source) return;
  const r = els.stage.getBoundingClientRect();
  const [sw, sh] = sourceSize();
  if (!sw || !sh) return;
  const s = (source === els.video ? Math.max : Math.min)(r.width / sw, r.height / sh);
  box = { s, ox: (r.width - sw * s) / 2, oy: (r.height - sh * s) / 2 };
}

function place(p) {
  if (!box) measure();
  if (!box || !p) return;
  const w = p.width * box.s;
  const h = w * SVG_RATIO;
  const ay = anchor();
  const x = box.ox + p.cx * box.s - w / 2;
  const y = box.oy + p.cy * box.s - h * ay;
  els.glasses.style.width = `${w}px`;
  els.glasses.style.transformOrigin = `50% ${ay * 100}%`;
  els.glasses.style.transform =
    `translate3d(${x}px, ${y}px, 0) rotateZ(${p.roll}rad) rotateY(${p.yaw}rad) rotateX(${p.pitch}rad)`;
}

// Na foto enviada, aproxima a imagem para o rosto ocupar boa parte da tela
function zoomToFace() {
  const mirror = els.stage.querySelector(".tryon__mirror");
  if (source !== els.photo || !pose || !box) { mirror.style.transform = ""; return; }
  const r = els.stage.getBoundingClientRect();
  const fx = box.ox + pose.cx * box.s;
  const fy = box.oy + pose.cy * box.s;
  const z = clamp((Math.min(r.width, r.height * .75) * .55) / (pose.width * box.s), 1, 3.5);
  mirror.style.transformOrigin = "0 0";
  mirror.style.transform = `translate(${r.width / 2 - fx * z}px, ${r.height * .38 - fy * z}px) scale(${z})`;
}

function setFace(found) {
  els.stage.classList.toggle("has-face", found);
  if (found) hint("");
  else if (source === els.video) hint("Centralize o rosto na moldura");
}

function handle(result, w, h, live) {
  const lm = result.faceLandmarks?.[0];
  if (!lm) {
    if (++lostFrames > 6) { setFace(false); pose = null; }
    return;
  }
  lostFrames = 0;
  setFace(true);
  const p = computePose(lm, w, h);
  place(live ? smooth(p) : (pose = p));
}

function loop() {
  rafId = requestAnimationFrame(loop);
  const v = els.video;
  if (v.readyState < 2 || v.currentTime === lastVideoTime) return;
  lastVideoTime = v.currentTime;
  try {
    handle(landmarker.detectForVideo(v, performance.now()), v.videoWidth, v.videoHeight, true);
  } catch (e) {
    console.warn("[provador] erro na detecção:", e);
  }
}

const withTimeout = (promise, ms) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error("tempo esgotado")), ms)),
]);

/* ---------- Estados da tela ---------- */

function show(which) {
  els.intro.hidden = which !== "intro";
  els.loading.hidden = which !== "loading";
  els.error.hidden = which !== "error";
  els.stage.classList.toggle("is-live", !which);
}

function loading(text) { els.loadingText.textContent = text; show("loading"); }
function hint(text) { els.hint.textContent = text; els.hint.hidden = !text; }

const ERRORS = {
  denied: "Você não liberou a câmera. Para usar o provador, permita o acesso nas configurações do navegador ou envie uma foto.",
  nocam: "Não encontramos uma câmera neste aparelho. Você pode enviar uma foto do seu rosto.",
  insecure: "O provador precisa de uma conexão segura (https) para usar a câmera. Você pode enviar uma foto.",
  model: "Não foi possível carregar o provador. Verifique sua conexão e tente de novo.",
  generic: "Algo deu errado ao ligar a câmera. Tente de novo ou envie uma foto.",
};

function fail(kind) {
  els.errorText.textContent = ERRORS[kind];
  show("error");
}

/* ---------- Câmera e foto ---------- */

function requestCamera(deviceId) {
  return navigator.mediaDevices.getUserMedia({
    video: {
      ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: "user" }),
      width: { ideal: 1280 },
      height: { ideal: 960 },
    },
    audio: false,
  });
}

// deviceId: câmera escolhida no seletor; sem ele, usa a última escolhida (ou a frontal)
async function startCamera(deviceId) {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) return fail("insecure");
  stopCamera();
  loading("Ligando a câmera…");
  const model = loadLandmarker();
  model.catch(() => {});

  const wanted = typeof deviceId === "string" ? deviceId : savedCamera();
  try {
    try {
      stream = await requestCamera(wanted);
    } catch (e) {
      // A câmera salva pode ter sido desconectada: volta para a padrão
      if (!wanted || !["OverconstrainedError", "NotFoundError", "NotReadableError"].includes(e.name)) throw e;
      forgetCamera();
      stream = await requestCamera(null);
    }
  } catch (e) {
    console.warn("[provador] câmera indisponível:", e);
    return fail(e.name === "NotAllowedError" || e.name === "SecurityError" ? "denied"
      : e.name === "NotFoundError" || e.name === "OverconstrainedError" ? "nocam" : "generic");
  }
  if (!els.dialog.open) return stopCamera();

  // Câmera traseira não é espelhada; frontal e webcams sim
  const settings = stream.getVideoTracks()[0]?.getSettings() || {};
  mirrorVideo = settings.facingMode !== "environment";
  refreshCameras(settings.deviceId);

  // Mostra a câmera na hora; o detector termina de carregar com a pessoa já se vendo.
  // (O vídeo precisa estar visível antes do play() para o Safari decodificar os quadros.)
  els.video.srcObject = stream;
  useSource(els.video);
  show(null);
  if (!landmarker) hint("Carregando o provador…");
  await els.video.play().catch(() => {});
  if (!els.video.videoWidth) await new Promise(r => els.video.addEventListener("loadedmetadata", r, { once: true }));
  measure();

  try {
    await withTimeout(model, 45000);
    await setMode("VIDEO");
  } catch (e) {
    console.warn("[provador] falha ao carregar o detector facial:", e);
    stopCamera();
    return fail("model");
  }
  if (!els.dialog.open) return stopCamera();

  setFace(false);
  lastVideoTime = -1;
  cancelAnimationFrame(rafId);
  loop();
}

// Lista as câmeras (os nomes só aparecem depois que a permissão é concedida)
async function refreshCameras(activeId = stream?.getVideoTracks()[0]?.getSettings().deviceId) {
  let cams = [];
  try {
    cams = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === "videoinput" && d.deviceId);
  } catch { /* sem enumerateDevices */ }
  els.camWrap.hidden = cams.length < 2;
  els.cam.innerHTML = cams
    .map((c, i) => `<option value="${c.deviceId}">${escapeHTML(c.label || `Câmera ${i + 1}`)}</option>`)
    .join("");
  if (activeId) els.cam.value = activeId;
}

const escapeHTML = t => t.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function stopCamera() {
  cancelAnimationFrame(rafId);
  stream?.getTracks().forEach(t => t.stop());
  stream = null;
  els.video.srcObject = null;
}

async function usePhoto(file) {
  if (!file) return;
  stopCamera();
  loading("Analisando a foto…");
  if (photoUrl) URL.revokeObjectURL(photoUrl);
  photoUrl = URL.createObjectURL(file);
  els.photo.src = photoUrl;
  try {
    await els.photo.decode();
    await loadLandmarker();
    await setMode("IMAGE");
  } catch {
    return fail("model");
  }
  useSource(els.photo);
  show(null);
  pose = null;
  lostFrames = 99;
  const result = landmarker.detect(els.photo);
  handle(result, els.photo.naturalWidth, els.photo.naturalHeight, false);
  zoomToFace();
  if (!result.faceLandmarks?.length) {
    hint("Não encontramos um rosto nesta foto. Tente outra, de frente e bem iluminada.");
  }
}

function useSource(el) {
  source = el;
  els.video.hidden = el !== els.video;
  els.photo.hidden = el !== els.photo;
  els.stage.classList.toggle("is-mirrored", el === els.video && mirrorVideo);
  els.stage.querySelector(".tryon__mirror").style.transform = "";
  measure();
}

/* ---------- Painel: modelo e cores ---------- */

function product() { return G.byId(current); }

function renderGlasses() {
  const p = product();
  const { frame, lens } = G.state.sel[p.id];
  els.glasses.innerHTML = G.glassesSVG(p, frame, lens);
  els.name.textContent = p.name;
  els.meta.textContent = `${G.FRAMES[frame].label} · ${G.LENSES[lens].label}`;
  els.cta.href = G.waLink(G.productMessage(p));
}

function renderOptions() {
  const p = product();
  const { frame, lens } = G.state.sel[p.id];
  els.frames.innerHTML = p.frames.map(k => G.swatchHTML("frame", k, k === frame, "swatch--sm")).join("");
  els.lenses.innerHTML = p.lenses.map(k => G.swatchHTML("lens", k, k === lens, "swatch--sm")).join("");
}

function renderModels() {
  els.models.innerHTML = G.PRODUCTS.map(p => {
    const { frame, lens } = G.state.sel[p.id];
    return `<button type="button" class="tryon__model" role="radio" aria-checked="${p.id === current}" data-model="${p.id}">
      ${G.glassesSVG(p, frame, lens)}<span>${p.name}</span>
    </button>`;
  }).join("");
}

function selectModel(id) {
  current = id;
  [...els.models.children].forEach(b => b.setAttribute("aria-checked", b.dataset.model === id));
  els.models.querySelector(`[data-model="${id}"]`)?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  renderOptions();
  renderGlasses();
  if (pose) place(pose);
  els.glasses.classList.remove("is-swap");
  void els.glasses.offsetWidth;
  els.glasses.classList.add("is-swap");
}

function refreshModelThumb(id) {
  const btn = els.models.querySelector(`[data-model="${id}"]`);
  if (!btn) return;
  const p = G.byId(id), { frame, lens } = G.state.sel[id];
  btn.querySelector("svg").outerHTML = G.glassesSVG(p, frame, lens);
}

/* ---------- Foto com os óculos ---------- */

function svgToImage(svg) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob(
      [svg.replace("<svg ", '<svg width="960" height="448" ')],
      { type: "image/svg+xml" },
    ));
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = reject;
    img.src = url;
  });
}

async function capture() {
  if (!source || !pose || !els.stage.classList.contains("has-face")) {
    hint("Posicione o rosto para tirar a foto");
    return;
  }
  const p = product();
  const { frame, lens } = G.state.sel[p.id];
  const [sw, sh] = sourceSize();
  const snap = { ...pose };

  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d");
  const glasses = await svgToImage(G.glassesSVG(p, frame, lens));

  ctx.save();
  if (source === els.video && mirrorVideo) { ctx.translate(sw, 0); ctx.scale(-1, 1); }
  ctx.drawImage(source, 0, 0, sw, sh);
  const w = snap.width, h = w * SVG_RATIO;
  ctx.translate(snap.cx, snap.cy);
  ctx.rotate(snap.roll);
  ctx.scale(Math.cos(snap.yaw), Math.cos(snap.pitch));
  ctx.drawImage(glasses, -w / 2, -h * anchor(), w, h);
  ctx.restore();

  // Assinatura discreta da marca
  const fs = Math.round(sw * .032);
  const pad = Math.round(sw * .04);
  const grad = ctx.createLinearGradient(0, sh - fs * 4, 0, sh);
  grad.addColorStop(0, "rgba(20,26,42,0)");
  grad.addColorStop(1, "rgba(20,26,42,.55)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, sh - fs * 4, sw, fs * 4);
  ctx.fillStyle = "#F6F2EA";
  ctx.font = `600 ${fs}px "Cormorant Garamond", serif`;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(`G O D O Y  ·  ${p.name}`, pad, sh - pad);

  els.stage.classList.remove("is-flash");
  void els.stage.offsetWidth;
  els.stage.classList.add("is-flash");

  const blob = await new Promise(r => canvas.toBlob(r, "image/jpeg", .92));
  if (shotUrl) URL.revokeObjectURL(shotUrl);
  shotUrl = URL.createObjectURL(blob);
  const fileName = `godoy-${p.id}.jpg`;
  shotFile = new File([blob], fileName, { type: "image/jpeg" });
  els.shotImg.src = shotUrl;
  els.shotSave.href = shotUrl;
  els.shotSave.download = fileName;
  els.shotShare.hidden = !navigator.canShare?.({ files: [shotFile] });
  els.shot.hidden = false;
  els.shotShare.hidden ? els.shotSave.focus() : els.shotShare.focus();
}

async function shareShot() {
  try {
    await navigator.share({
      files: [shotFile],
      title: "Godoy Óculos Premium",
      text: `Experimentei o modelo ${product().name} da Godoy. O que acha?`,
    });
  } catch { /* compartilhamento cancelado */ }
}

/* ---------- Abrir / fechar ---------- */

async function open(id) {
  if (id && G.byId(id)) current = id;
  G.closeAllSheets();
  els.shot.hidden = true;
  hint("");
  renderModels();
  renderOptions();
  renderGlasses();
  els.dialog.showModal();
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => selectModel(current));

  if (stream || source === els.photo) { show(null); return; }

  // Adianta o download do modelo enquanto a pessoa lê a explicação
  loadLandmarker().catch(() => {});

  let granted = false;
  try { granted = (await navigator.permissions?.query({ name: "camera" }))?.state === "granted"; } catch { /* sem Permissions API */ }
  if (granted) startCamera();
  else show("intro");
}

function close() {
  els.dialog.classList.add("is-closing");
  setTimeout(() => {
    els.dialog.classList.remove("is-closing");
    els.dialog.close();
  }, 280);
}

function cleanup() {
  stopCamera();
  source = null;
  pose = null;
  box = null;
  els.photo.hidden = true;
  els.stage.classList.remove("has-face", "is-live", "is-mirrored");
  document.body.style.overflow = "";
}

/* ---------- Eventos ---------- */

document.addEventListener("click", e => {
  const t = e.target.closest("[data-tryon]");
  if (!t) return;
  e.preventDefault();
  open(t.dataset.tryon);
});

els.dialog.addEventListener("cancel", e => { e.preventDefault(); close(); });
els.dialog.addEventListener("close", cleanup);
$("#tryonClose").addEventListener("click", close);
$("#tryonStart").addEventListener("click", () => startCamera());
$("#tryonRetry").addEventListener("click", () => startCamera());
els.cam.addEventListener("change", () => {
  saveCamera(els.cam.value);
  startCamera(els.cam.value);
});
navigator.mediaDevices?.addEventListener?.("devicechange", () => { if (stream) refreshCameras(); });
document.querySelectorAll("[data-tryon-upload]").forEach(b => b.addEventListener("click", () => els.file.click()));
els.file.addEventListener("change", () => { usePhoto(els.file.files[0]); els.file.value = ""; });
$("#tryonCapture").addEventListener("click", capture);
$("#tryonShotBack").addEventListener("click", () => { els.shot.hidden = true; });
els.shotShare.addEventListener("click", shareShot);

els.models.addEventListener("click", e => {
  const b = e.target.closest("[data-model]");
  if (b) selectModel(b.dataset.model);
});

$("#tryonOptions").addEventListener("click", e => {
  const sw = e.target.closest(".swatch");
  if (!sw) return;
  G.state.sel[current][sw.dataset.kind] = sw.dataset.key;
  sw.parentElement.querySelectorAll(".swatch").forEach(x => x.setAttribute("aria-checked", x === sw));
  renderGlasses();
  refreshModelThumb(current);
  G.updateCard(current);
});

// Setas do teclado trocam de modelo
els.dialog.addEventListener("keydown", e => {
  if (!["ArrowRight", "ArrowLeft"].includes(e.key) || e.target.closest("input")) return;
  const ids = G.PRODUCTS.map(p => p.id);
  const i = ids.indexOf(current);
  selectModel(ids[(i + (e.key === "ArrowRight" ? 1 : -1) + ids.length) % ids.length]);
});

new ResizeObserver(() => {
  measure();
  if (source === els.photo) { place(pose); zoomToFace(); }
}).observe(els.stage);
