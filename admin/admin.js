/* ==========================================================================
   Godoy | Painel da coleção
   Login pelo Supabase Auth; só o usuário com app_metadata.role = "admin"
   consegue gravar (as regras ficam no banco, em supabase/schema.sql).
   Usa de ../catalog.js: SUPABASE_URL, SUPABASE_KEY, PHOTO_BUCKET, SHAPES,
   FRAMES, LENSES, glassesSVG, photoURL, rowsToCatalog e replaceObject.
   ========================================================================== */

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm";

const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: "godoy-admin" },
});

const LOGIN_DOMAIN = "godoyoculos.com.br";
const MAX_PHOTO = 1600;          // lado maior da foto depois de reduzida
const PHOTO_QUALITY = .86;

const SHAPE_LABELS = {
  redondo: "Redondo", wayfarer: "Wayfarer", quadrado: "Quadrado", clubmaster: "Clubmaster",
  aviador: "Aviador", gatinho: "Gatinho", hexagonal: "Hexagonal",
};
const PATTERN_SWATCH = {
  tortoise: "radial-gradient(circle at 30% 30%, #A8692F 0 18%, #6B3D1C 19% 46%, #2B1508 47% 60%, #8A5A2B 61%)",
  wood: "repeating-linear-gradient(100deg, #8B5A33 0 3px, #A87545 3px 6px, #7A4C2A 6px 8px)",
};

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const db = { products: [], frames: [], lenses: [], categories: [], settings: {} };

/* ---------- Utilidades ---------- */

function slugify(s) {
  return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

function uniqueSlug(base, taken) {
  let id = base || "item", n = 2;
  while (taken.includes(id)) id = `${base}-${n++}`;
  return id;
}

let toastTimer;
function toast(msg, { error = false } = {}) {
  const t = $("#toast");
  // Dentro de um <dialog> aberto o toast precisa estar na mesma camada
  const host = $$("dialog[open]").pop() || document.body;
  if (t.parentElement !== host) host.append(t);
  t.textContent = msg;
  t.classList.toggle("is-error", error);
  t.classList.add("is-on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("is-on"), error ? 4200 : 2400);
}

function friendlyError(err) {
  const msg = err?.message || String(err);
  if (/Invalid login credentials/i.test(msg)) return "Usuário ou senha incorretos.";
  if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) return "Sem conexão com o servidor. Verifique a internet e tente de novo.";
  if (/duplicate key/i.test(msg)) return "Já existe um item com esse nome.";
  if (/row-level security|permission denied|not authorized/i.test(msg)) return "Sua sessão não tem permissão para isso. Entre de novo.";
  if (/JWT expired|invalid JWT/i.test(msg)) return "Sua sessão expirou. Entre de novo.";
  if (/should be different/i.test(msg)) return "A nova senha precisa ser diferente da atual.";
  if (/at least/i.test(msg) && /password/i.test(msg)) return "A senha é curta demais.";
  if (/exceeded the maximum allowed size|Payload too large/i.test(msg)) return "Foto grande demais (máximo 8 MB).";
  return msg;
}

function busy(btn, on, label) {
  if (!btn) return;
  if (on) { btn.dataset.label = btn.innerHTML; btn.disabled = true; if (label) btn.textContent = label; }
  else { btn.disabled = false; if (btn.dataset.label) btn.innerHTML = btn.dataset.label; }
}

function ask(title, text, okLabel = "Excluir") {
  const d = $("#confirm");
  $("#confirmTitle").textContent = title;
  $("#confirmText").textContent = text;
  $("#confirmOk").textContent = okLabel;
  d.returnValue = "";
  d.showModal();
  return new Promise(res => d.addEventListener("close", () => res(d.returnValue === "ok"), { once: true }));
}

const isAdmin = session => session?.user?.app_metadata?.role === "admin";

/* ---------- Login ---------- */

function showLogin() {
  $("#app").hidden = true;
  $("#login").hidden = false;
  $("#boot").classList.add("is-done");
  $("#loginForm [name=user]").focus();
}

function initLogin() {
  const form = $("#loginForm");
  $("#togglePass").addEventListener("click", e => {
    const b = e.currentTarget, input = form.pass;
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    b.setAttribute("aria-pressed", show);
    b.setAttribute("aria-label", show ? "Esconder senha" : "Mostrar senha");
  });
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const err = $("#loginError");
    err.hidden = true;
    const user = form.user.value.trim().toLowerCase();
    const pass = form.pass.value;
    if (!user || !pass) {
      err.textContent = "Preencha usuário e senha.";
      err.hidden = false;
      return;
    }
    const email = user.includes("@") ? user : `${user}@${LOGIN_DOMAIN}`;
    const btn = $("#loginBtn");
    busy(btn, true, "Entrando…");
    const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
    busy(btn, false);
    if (error) {
      err.textContent = friendlyError(error);
      err.hidden = false;
      return;
    }
    if (!isAdmin(data.session)) {
      await sb.auth.signOut();
      err.textContent = "Este usuário não tem acesso ao painel.";
      err.hidden = false;
      return;
    }
    form.reset();
    enterApp(data.session);
  });
}

/* ---------- Dados ---------- */

async function loadAll() {
  const q = (table, order) => sb.from(table).select("*").order(order).order(table === "products" ? "name" : "label");
  const [p, f, l, c, s] = await Promise.all([
    q("products", "position"), q("frame_colors", "position"), q("lens_colors", "position"),
    q("categories", "position"), sb.from("settings").select("*").eq("id", 1).maybeSingle(),
  ]);
  for (const r of [p, f, l, c, s]) if (r.error) throw r.error;
  db.products = p.data; db.frames = f.data; db.lenses = l.data; db.categories = c.data;
  db.settings = s.data || { id: 1 };
  syncDrawing();
}

/* Mantém FRAMES/LENSES do catalog.js iguais ao banco para o desenho dos óculos. */
function syncDrawing() {
  const c = rowsToCatalog({ products: [], frames: db.frames, lenses: db.lenses, categories: [], settings: {} });
  replaceObject(FRAMES, c.frames);
  replaceObject(LENSES, c.lenses);
}

function drawing(row, frame, lens) {
  const f = FRAMES[frame] ? frame : Object.keys(FRAMES)[0];
  const l = LENSES[lens] ? lens : Object.keys(LENSES)[0];
  if (!f || !l || !SHAPES[row.shape]) return "";
  return glassesSVG({ shape: row.shape, temple: FRAMES[row.temple] ? row.temple : null }, f, l);
}

function thumbHTML(row) {
  const img = row.images?.[0];
  return img
    ? `<img src="${esc(photoURL(img.path))}" alt="" loading="lazy" decoding="async">`
    : drawing(row, row.frames?.[0], row.lenses?.[0]);
}

const categoryLabel = id => db.categories.find(c => c.id === id)?.label;
const frameLabel = key => db.frames.find(f => f.key === key)?.label || key;

/* ---------- Abas ---------- */

const TABS = ["colecao", "cores", "categorias", "ajustes"];

function showTab(name) {
  if (!TABS.includes(name)) name = "colecao";
  TABS.forEach(t => { $(`#view-${t}`).hidden = t !== name; });
  $$(".tab").forEach(b => b.dataset.tab === name ? b.setAttribute("aria-current", "page") : b.removeAttribute("aria-current"));
  if (location.hash.slice(1) !== name) history.replaceState(null, "", `#${name}`);
  window.scrollTo({ top: 0 });
}

function initTabs() {
  $("#tabs").addEventListener("click", e => {
    const b = e.target.closest(".tab");
    if (b) showTab(b.dataset.tab);
  });
  window.addEventListener("hashchange", () => showTab(location.hash.slice(1)));
}

/* ---------- Coleção ---------- */

function renderProducts() {
  const term = slugify($("#productSearch").value);
  const list = db.products.filter(p => !term || slugify(`${p.name} ${p.type_label} ${categoryLabel(p.category) || ""}`).includes(term));
  const published = db.products.filter(p => p.published).length;
  $("#productsSummary").textContent = `${db.products.length} ${db.products.length === 1 ? "modelo" : "modelos"} · ${published} no site`;
  const canSort = !term;
  $("#productList").innerHTML = list.length ? list.map((p, i) => `
    <li class="pitem" style="--i:${i}" data-id="${esc(p.id)}">
      <button class="pitem__open" type="button" data-edit="${esc(p.id)}" aria-label="Editar ${esc(p.name)}">
        <span class="pitem__thumb">${thumbHTML(p)}</span>
        <span class="pitem__info">
          <span class="pitem__name">${esc(p.name)}</span>
          <span class="pitem__meta">${esc(metaLine(p))}</span>
          <span class="pitem__tags">
            ${p.published ? '<span class="pill pill--ok">No site</span>' : '<span class="pill pill--off">Oculto</span>'}
            <span class="pill"><svg class="icon"><use href="#i-image"/></svg>${p.images.length}</span>
            ${p.badge ? `<span class="pill pill--gold">${esc(p.badge)}</span>` : ""}
            ${db.settings.hero_product === p.id ? '<span class="pill pill--gold"><svg class="icon"><use href="#i-star"/></svg>Destaque</span>' : ""}
          </span>
        </span>
      </button>
      ${canSort ? `<span class="order">
        <button class="icon-btn" type="button" data-move="-1" aria-label="Subir ${esc(p.name)}" ${i === 0 ? "disabled" : ""}><svg class="icon"><use href="#i-up"/></svg></button>
        <button class="icon-btn" type="button" data-move="1" aria-label="Descer ${esc(p.name)}" ${i === list.length - 1 ? "disabled" : ""}><svg class="icon"><use href="#i-down"/></svg></button>
      </span>` : "<span></span>"}
    </li>`).join("") : `<li class="empty">${term ? "Nenhum modelo encontrado." : "Nenhum modelo ainda. Toque em “Novo modelo”."}</li>`;
}

function metaLine(p) {
  const type = p.type_label || SHAPE_LABELS[p.shape];
  const cat = categoryLabel(p.category);
  return cat && !slugify(type).includes(slugify(cat)) ? `${type} · ${cat}` : type;
}

/* Reordena e grava só as posições que mudaram. */
async function moveItem(table, list, keyField, id, dir) {
  const i = list.findIndex(x => x[keyField] === id), j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  const changed = list.map((x, n) => [x, n]).filter(([x, n]) => x.position !== n);
  changed.forEach(([x, n]) => { x.position = n; });
  const results = await Promise.all(changed.map(([x, n]) => sb.from(table).update({ position: n }).eq(keyField, x[keyField])));
  const failed = results.find(r => r.error);
  if (failed) toast(friendlyError(failed.error), { error: true });
}

function initProducts() {
  $("#productSearch").addEventListener("input", renderProducts);
  $("#newProduct").addEventListener("click", () => openEditor(null));
  $("#productList").addEventListener("click", async e => {
    const move = e.target.closest("[data-move]");
    if (move) {
      const id = move.closest(".pitem").dataset.id;
      await moveItem("products", db.products, "id", id, +move.dataset.move);
      renderProducts();
      $(`.pitem[data-id="${CSS.escape(id)}"] [data-move="${move.dataset.move}"]`)?.focus();
      return;
    }
    const edit = e.target.closest("[data-edit]");
    if (edit) openEditor(edit.dataset.edit);
  });
}

/* ---------- Editor de modelo ---------- */

const ed = {
  draft: null,
  isNew: false,
  dirty: false,
  uploaded: [],   // fotos enviadas nesta edição (apagadas se cancelar)
  removed: [],    // fotos tiradas do modelo (apagadas ao salvar)
  pending: 0,     // envios em andamento
};

function openEditor(id) {
  const row = id ? db.products.find(p => p.id === id) : null;
  ed.isNew = !row;
  ed.draft = row ? structuredClone(row) : {
    id: "", name: "", shape: "redondo", category: db.categories[0]?.id || null, type_label: "",
    badge: "", badge_short: "", badge_gold: false, description: "", material: "", faces: "",
    frames: db.frames.slice(0, 1).map(f => f.key), lenses: db.lenses.slice(0, 1).map(l => l.key),
    temple: null, images: [], published: true,
  };
  ed.dirty = false;
  ed.uploaded = [];
  ed.removed = [];
  ed.pending = 0;

  const f = $("#productForm"), d = ed.draft;
  $("#editorTitle").textContent = row ? row.name : "Novo modelo";
  f.name.value = d.name;
  f.type_label.value = d.type_label || "";
  f.description.value = d.description || "";
  f.material.value = d.material || "";
  f.faces.value = d.faces || "";
  f.badge.value = d.badge || "";
  f.badge_short.value = d.badge_short || "";
  f.badge_gold.checked = !!d.badge_gold;
  f.published.checked = d.published !== false;
  f.name.removeAttribute("aria-invalid");
  $("#categorySelect").innerHTML = `<option value="">Sem categoria</option>` +
    db.categories.map(c => `<option value="${esc(c.id)}">${esc(c.label)}</option>`).join("");
  $("#categorySelect").value = d.category || "";
  $("#deleteProduct").hidden = ed.isNew;
  updateSlugHint();
  renderEditorParts();

  const dlg = $("#editor");
  dlg.showModal();
  $(".drawer__body", dlg).scrollTop = 0;
  if (ed.isNew) f.name.focus();
}

function updateSlugHint() {
  const d = ed.draft;
  if (ed.isNew) d.id = uniqueSlug(slugify(d.name), db.products.map(p => p.id));
  $("#slugHint").textContent = d.id ? `Código do modelo: ${d.id}${ed.isNew ? " (gerado pelo nome)" : ""}` : "";
}

function renderEditorParts() {
  renderPreview();
  renderShapes();
  renderColorPickers();
  renderTemple();
  renderPhotos();
}

function renderPreview() {
  const d = ed.draft;
  $("#preview").innerHTML = `${drawing(d, d.frames[0], d.lenses[0])}<span class="preview__label">Ilustração · usada no provador virtual</span>`;
}

function renderShapes() {
  const d = ed.draft;
  $("#shapePicker").innerHTML = Object.keys(SHAPES).map(s => `
    <button type="button" class="shape" role="radio" aria-checked="${s === d.shape}" data-shape="${s}">
      ${drawing({ ...d, shape: s }, d.frames[0], d.lenses[0])}${SHAPE_LABELS[s] || s}
    </button>`).join("");
}

function chipHTML(kind, item, selected) {
  const n = selected.indexOf(item.key);
  const bg = kind === "frame"
    ? (item.pattern ? PATTERN_SWATCH[item.pattern] : item.swatch || item.color)
    : `linear-gradient(180deg, ${item.top_color}, ${item.bottom_color})`;
  return `<button type="button" class="chip" data-kind="${kind}" data-key="${esc(item.key)}" aria-pressed="${n >= 0}">
    <span class="dot" style="--c:${esc(bg)}"></span>${esc(item.label)}<span class="chip__n">${n + 1}</span></button>`;
}

function renderColorPickers() {
  const d = ed.draft;
  $("#framePicker").innerHTML = db.frames.map(f => chipHTML("frame", f, d.frames)).join("");
  $("#lensPicker").innerHTML = db.lenses.map(l => chipHTML("lens", l, d.lenses)).join("");
}

function renderTemple() {
  $("#templeSelect").innerHTML = `<option value="">Iguais à armação</option>` +
    db.frames.map(f => `<option value="${esc(f.key)}">${esc(f.label)}</option>`).join("");
  $("#templeSelect").value = ed.draft.temple || "";
}

function renderPhotos() {
  const d = ed.draft;
  const options = [...new Set([...d.frames, ...d.images.map(i => i.frame).filter(Boolean)])];
  $("#photoList").innerHTML = d.images.map((img, i) => `
    <li class="photo" data-i="${i}">
      <div class="photo__img">
        <img src="${esc(img.preview || photoURL(img.path))}" alt="Foto ${i + 1} do modelo">
        ${i === 0 ? '<span class="photo__cover"><svg class="icon"><use href="#i-star"/></svg>Capa</span>' : ""}
        ${img.busy ? '<span class="photo__busy">Enviando…</span>' : ""}
      </div>
      <select class="input" data-photo-frame aria-label="Cor da armação da foto ${i + 1}" ${img.busy ? "disabled" : ""}>
        <option value="">Todas as cores</option>
        ${options.map(k => `<option value="${esc(k)}" ${img.frame === k ? "selected" : ""}>${esc(frameLabel(k))}</option>`).join("")}
      </select>
      <div class="photo__tools">
        <button class="icon-btn" type="button" data-photo-move="-1" aria-label="Mover foto ${i + 1} para trás" ${i === 0 || img.busy ? "disabled" : ""}><svg class="icon"><use href="#i-left"/></svg></button>
        <button class="icon-btn icon-btn--danger" type="button" data-photo-del aria-label="Remover foto ${i + 1}" ${img.busy ? "disabled" : ""}><svg class="icon"><use href="#i-trash"/></svg></button>
        <button class="icon-btn" type="button" data-photo-move="1" aria-label="Mover foto ${i + 1} para frente" ${i === d.images.length - 1 || img.busy ? "disabled" : ""}><svg class="icon"><use href="#i-right"/></svg></button>
      </div>
    </li>`).join("");
}

/* Reduz a foto no aparelho antes de enviar: carrega rápido no site e economiza espaço. */
async function shrinkPhoto(file) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => null);
  if (!bitmap) return { blob: file, ext: file.name.split(".").pop().toLowerCase() || "jpg", type: file.type };
  const scale = Math.min(1, MAX_PHOTO / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const toBlob = type => new Promise(res => canvas.toBlob(res, type, PHOTO_QUALITY));
  let blob = await toBlob("image/webp");
  // Navegadores sem WebP devolvem PNG: aí vai JPEG
  if (!blob || blob.type !== "image/webp") blob = await toBlob("image/jpeg");
  return { blob, ext: blob.type === "image/webp" ? "webp" : "jpg", type: blob.type };
}

async function addPhotos(files) {
  const images = [...files].filter(f => /^image\//.test(f.type));
  if (!images.length) return toast("Escolha arquivos de imagem (JPG, PNG ou WebP).", { error: true });
  ed.dirty = true;
  await Promise.all(images.map(async file => {
    const item = { path: "", frame: null, busy: true, preview: URL.createObjectURL(file) };
    ed.draft.images.push(item);
    ed.pending++;
    renderPhotos();
    try {
      const { blob, ext, type } = await shrinkPhoto(file);
      const folder = ed.draft.id || "novo";
      const path = `${folder}/${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
      const { error } = await sb.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: type, cacheControl: "31536000", upsert: false });
      if (error) throw error;
      item.path = path;
      ed.uploaded.push(path);
      delete item.busy;
    } catch (err) {
      ed.draft.images = ed.draft.images.filter(x => x !== item);
      toast(`Não foi possível enviar ${file.name}: ${friendlyError(err)}`, { error: true });
    } finally {
      ed.pending--;
      if (!ed.draft) return;
      renderPhotos();
      renderPreview();
    }
  }));
}

/* Remove arquivos do Storage sem travar a tela se falhar. */
async function removeFiles(paths) {
  if (!paths.length) return;
  const { error } = await sb.storage.from(PHOTO_BUCKET).remove(paths);
  if (error) console.warn("Fotos não apagadas do Storage:", paths, error);
}

async function closeEditor({ force = false } = {}) {
  if (!force && ed.pending) return toast("Espere as fotos terminarem de enviar.");
  if (!force && ed.dirty && !(await ask("Descartar alterações?", "As mudanças deste modelo ainda não foram salvas.", "Descartar"))) return;
  if (!force) removeFiles(ed.uploaded);
  ed.draft.images.forEach(i => i.preview && URL.revokeObjectURL(i.preview));
  ed.draft = null;
  $("#editor").close();
}

async function saveProduct(e) {
  e.preventDefault();
  const f = $("#productForm"), d = ed.draft;
  if (ed.pending) return toast("Espere as fotos terminarem de enviar.");
  d.name = f.name.value.trim();
  if (!d.name) {
    f.name.setAttribute("aria-invalid", "true");
    f.name.focus();
    return toast("Dê um nome ao modelo.", { error: true });
  }
  if (!d.frames.length) return toast("Marque pelo menos uma cor de armação.", { error: true });
  if (!d.lenses.length) return toast("Marque pelo menos uma cor de lente.", { error: true });
  if (ed.isNew) updateSlugHint();

  const row = {
    id: d.id,
    name: d.name,
    shape: d.shape,
    category: f.category.value || null,
    type_label: f.type_label.value.trim() || `${SHAPE_LABELS[d.shape]}`,
    badge: f.badge.value.trim() || null,
    badge_short: f.badge_short.value.trim() || null,
    badge_gold: f.badge_gold.checked,
    description: f.description.value.trim(),
    material: f.material.value.trim(),
    faces: f.faces.value.trim(),
    frames: d.frames,
    lenses: d.lenses,
    temple: f.temple.value || null,
    images: d.images.map(({ path, frame }) => ({ path, frame: frame || null })),
    published: f.published.checked,
  };
  if (ed.isNew) row.position = db.products.reduce((m, p) => Math.max(m, p.position + 1), 0);

  const btn = $("#saveProduct");
  busy(btn, true, "Salvando…");
  const { data, error } = ed.isNew
    ? await sb.from("products").insert(row).select().single()
    : await sb.from("products").update(row).eq("id", row.id).select().single();
  busy(btn, false);
  if (error) return toast(friendlyError(error), { error: true });

  if (ed.isNew) db.products.push(data);
  else db.products[db.products.findIndex(p => p.id === data.id)] = data;
  removeFiles(ed.removed);
  ed.uploaded = [];
  renderProducts();
  renderHeroSelect();
  await closeEditor({ force: true });
  toast(ed.isNew ? `${data.name} adicionado à coleção` : `${data.name} salvo`);
}

async function deleteProduct() {
  const d = ed.draft;
  if (!(await ask(`Excluir ${d.name}?`, "O modelo e as fotos dele saem do site. Isso não pode ser desfeito."))) return;
  const { error } = await sb.from("products").delete().eq("id", d.id);
  if (error) return toast(friendlyError(error), { error: true });
  removeFiles([...d.images.map(i => i.path), ...ed.removed, ...ed.uploaded].filter(Boolean));
  db.products = db.products.filter(p => p.id !== d.id);
  renderProducts();
  renderHeroSelect();
  await closeEditor({ force: true });
  toast(`${d.name} excluído`);
}

function initEditor() {
  const dlg = $("#editor"), f = $("#productForm");
  f.addEventListener("submit", saveProduct);
  f.addEventListener("input", e => {
    ed.dirty = true;
    if (e.target === f.name) {
      e.target.removeAttribute("aria-invalid");
      ed.draft.name = f.name.value;
      $("#editorTitle").textContent = f.name.value.trim() || "Novo modelo";
      updateSlugHint();
    }
  });
  f.temple.addEventListener("change", () => { ed.draft.temple = f.temple.value || null; renderPreview(); renderShapes(); });
  $$("[data-close]", dlg).forEach(b => b.addEventListener("click", () => closeEditor()));
  dlg.addEventListener("cancel", e => { e.preventDefault(); closeEditor(); });
  $("#deleteProduct").addEventListener("click", deleteProduct);

  $("#shapePicker").addEventListener("click", e => {
    const b = e.target.closest("[data-shape]");
    if (!b) return;
    ed.draft.shape = b.dataset.shape;
    ed.dirty = true;
    $$(".shape", $("#shapePicker")).forEach(x => x.setAttribute("aria-checked", x === b));
    renderPreview();
  });

  dlg.addEventListener("click", e => {
    const chip = e.target.closest(".chip[data-kind]");
    if (!chip) return;
    const list = chip.dataset.kind === "frame" ? ed.draft.frames : ed.draft.lenses;
    const i = list.indexOf(chip.dataset.key);
    if (i >= 0) list.splice(i, 1); else list.push(chip.dataset.key);
    ed.dirty = true;
    renderColorPickers();
    renderPreview();
    renderShapes();
    if (chip.dataset.kind === "frame") renderPhotos();
  });

  // Fotos
  const input = $("#photoInput"), zone = $("#dropzone");
  input.addEventListener("change", () => { addPhotos(input.files); input.value = ""; });
  ["dragenter", "dragover"].forEach(t => zone.addEventListener(t, e => { e.preventDefault(); zone.classList.add("is-over"); }));
  ["dragleave", "drop"].forEach(t => zone.addEventListener(t, e => { e.preventDefault(); zone.classList.remove("is-over"); }));
  zone.addEventListener("drop", e => addPhotos(e.dataTransfer.files));

  $("#photoList").addEventListener("change", e => {
    const sel = e.target.closest("[data-photo-frame]");
    if (!sel) return;
    ed.draft.images[+sel.closest(".photo").dataset.i].frame = sel.value || null;
    ed.dirty = true;
  });
  $("#photoList").addEventListener("click", e => {
    const li = e.target.closest(".photo");
    if (!li) return;
    const i = +li.dataset.i, imgs = ed.draft.images;
    const move = e.target.closest("[data-photo-move]");
    if (move) {
      const j = i + +move.dataset.photoMove;
      [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
      ed.dirty = true;
      renderPhotos();
      $(`.photo[data-i="${j}"] [data-photo-move="${move.dataset.photoMove}"]`)?.focus();
      return;
    }
    if (e.target.closest("[data-photo-del]")) {
      const [img] = imgs.splice(i, 1);
      if (ed.uploaded.includes(img.path)) {
        ed.uploaded = ed.uploaded.filter(p => p !== img.path);
        removeFiles([img.path]);
      } else ed.removed.push(img.path);
      ed.dirty = true;
      renderPhotos();
    }
  });
}

/* ---------- Cores ---------- */

function frameSwatch(f) {
  return f.pattern ? PATTERN_SWATCH[f.pattern] : f.swatch || f.color;
}

function usage(kind, key) {
  return db.products.filter(p => kind === "frame"
    ? p.frames.includes(key) || p.temple === key || p.images.some(i => i.frame === key)
    : p.lenses.includes(key)).map(p => p.name);
}

function renderColors() {
  const row = (kind, item, bg) => {
    const used = usage(kind, item.key).length;
    return `<li class="citem">
      <button class="citem__btn" type="button" data-edit-color="${kind}" data-key="${esc(item.key)}">
        <span class="dot" style="--c:${esc(bg)}"></span>
        <span><span class="citem__name">${esc(item.label)}</span><br><span class="citem__meta">${used ? `${used} ${used === 1 ? "modelo" : "modelos"}` : "Sem uso"}</span></span>
      </button>
      <svg class="icon" aria-hidden="true" style="color:var(--muted)"><use href="#i-right"/></svg>
    </li>`;
  };
  $("#frameList").innerHTML = db.frames.map(f => row("frame", f, frameSwatch(f))).join("");
  $("#lensList").innerHTML = db.lenses.map(l => row("lens", l, `linear-gradient(180deg, ${l.top_color}, ${l.bottom_color})`)).join("");
}

/* Mistura uma cor hex com branco (t > 0) ou preto (t < 0). */
function shade(hex, t) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(t > 0 ? v + (255 - v) * t : v * (1 + t)));
  return `#${c.map(v => v.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

const toHex = v => /^#[0-9a-f]{6}$/i.test(v || "") ? v.toUpperCase() : "#16181D";

let itemCtx = null;   // { type: "frame" | "lens" | "category", item }

function openItem(type, key) {
  const list = { frame: db.frames, lens: db.lenses, category: db.categories }[type];
  const keyField = type === "category" ? "id" : "key";
  const item = key ? list.find(x => x[keyField] === key) : null;
  itemCtx = { type, item };
  const titles = { frame: ["Nova cor de armação", "Cor de armação"], lens: ["Nova cor de lente", "Cor de lente"], category: ["Nova categoria", "Categoria"] };
  $("#itemTitle").textContent = titles[type][item ? 1 : 0];
  $("#itemError").hidden = true;
  $("#itemDelete").hidden = !item;
  const fields = $("#itemFields");

  if (type === "frame") {
    const finish = item?.pattern || (item?.swatch?.startsWith("linear-gradient(135deg") ? "metal" : "solid");
    fields.innerHTML = `
      <div class="form">
        <label class="field"><span class="field__label">Nome</span><input class="input" name="label" maxlength="30" required value="${esc(item?.label)}" placeholder="Ex.: Verde-oliva"></label>
        <label class="field"><span class="field__label">Acabamento</span>
          <select class="input" name="finish">
            <option value="solid">Liso</option><option value="metal">Metálico (brilho)</option>
            <option value="tortoise">Tartaruga</option><option value="wood">Madeira</option>
          </select></label>
        <div class="field" data-color-field><span class="field__label">Cor</span>
          <div class="colorrow"><input type="color" name="color" value="${toHex(item?.color)}" aria-label="Escolher cor"><input class="input" name="colorHex" value="${toHex(item?.color)}" maxlength="7" aria-label="Código da cor"></div></div>
        <div class="lens-preview" id="itemPreview"></div>
      </div>`;
    fields.querySelector("[name=finish]").value = finish;
  } else if (type === "lens") {
    fields.innerHTML = `
      <div class="form">
        <label class="field"><span class="field__label">Nome</span><input class="input" name="label" maxlength="30" required value="${esc(item?.label)}" placeholder="Ex.: Azul degradê"></label>
        <div class="row2">
          <div class="field"><span class="field__label">Cor de cima</span>
            <div class="colorrow"><input type="color" name="top" value="${toHex(item?.top_color || "#2C2E33")}" aria-label="Cor de cima"><input class="input" name="topHex" value="${toHex(item?.top_color || "#2C2E33")}" maxlength="7" aria-label="Código da cor de cima"></div></div>
          <div class="field"><span class="field__label">Cor de baixo</span>
            <div class="colorrow"><input type="color" name="bottom" value="${toHex(item?.bottom_color || "#0D0E11")}" aria-label="Cor de baixo"><input class="input" name="bottomHex" value="${toHex(item?.bottom_color || "#0D0E11")}" maxlength="7" aria-label="Código da cor de baixo"></div></div>
        </div>
        <label class="field"><span class="field__label">Transparência <span class="field__hint" id="opacityOut"></span></span>
          <input type="range" name="opacity" min="30" max="100" value="${Math.round((item?.opacity ?? .9) * 100)}"></label>
        <div class="lens-preview" id="itemPreview"></div>
      </div>`;
  } else {
    const count = item ? db.products.filter(p => p.category === item.id).length : 0;
    fields.innerHTML = `
      <div class="form">
        <label class="field"><span class="field__label">Nome</span><input class="input" name="label" maxlength="24" required value="${esc(item?.label)}" placeholder="Ex.: Esportivo"></label>
        ${item ? `<p class="field__hint">${count} ${count === 1 ? "modelo nesta categoria" : "modelos nesta categoria"}.</p>` : ""}
      </div>`;
  }
  updateItemPreview();
  $("#itemModal").showModal();
  if (!item) fields.querySelector("[name=label]").focus();
}

/* Valores do formulário de cor no formato das tabelas */
function readItem() {
  const f = $("#itemForm");
  const label = f.label.value.trim();
  if (itemCtx.type === "frame") {
    const finish = f.finish.value, color = toHex(f.color.value);
    return {
      label, color,
      pattern: ["tortoise", "wood"].includes(finish) ? finish : null,
      swatch: finish === "metal" ? `linear-gradient(135deg, ${shade(color, .45)}, ${shade(color, -.2)})`
        : ["tortoise", "wood"].includes(finish) ? PATTERN_SWATCH[finish] : null,
    };
  }
  if (itemCtx.type === "lens") {
    return { label, top_color: toHex(f.top.value), bottom_color: toHex(f.bottom.value), opacity: +f.opacity.value / 100 };
  }
  return { label };
}

function updateItemPreview() {
  const box = $("#itemPreview");
  if (!box) return;
  const f = $("#itemForm"), v = readItem();
  const sample = { shape: "wayfarer" };
  if (itemCtx.type === "frame") {
    $("[data-color-field]").hidden = !!v.pattern;
    FRAMES.__preview = { label: v.label, color: v.color, ...(v.pattern && { pattern: v.pattern }) };
    box.innerHTML = glassesSVG(sample, "__preview", Object.keys(LENSES).find(k => k !== "__preview") || "__preview");
    delete FRAMES.__preview;
  } else {
    $("#opacityOut").textContent = `${f.opacity.value}% de cor`;
    LENSES.__preview = { label: v.label, top: v.top_color, bottom: v.bottom_color, opacity: v.opacity };
    box.innerHTML = glassesSVG(sample, Object.keys(FRAMES)[0], "__preview");
    delete LENSES.__preview;
  }
}

async function saveItem(e) {
  e.preventDefault();
  const { type, item } = itemCtx;
  const f = $("#itemForm"), err = $("#itemError");
  const values = readItem();
  if (!values.label) {
    err.textContent = "Preencha o nome.";
    err.hidden = false;
    f.label.focus();
    return;
  }
  const table = { frame: "frame_colors", lens: "lens_colors", category: "categories" }[type];
  const keyField = type === "category" ? "id" : "key";
  const list = { frame: db.frames, lens: db.lenses, category: db.categories }[type];
  const btn = $("button[type=submit]", f);
  busy(btn, true, "Salvando…");
  let res;
  if (item) {
    res = await sb.from(table).update(values).eq(keyField, item[keyField]).select().single();
  } else {
    const key = uniqueSlug(slugify(values.label), list.map(x => x[keyField]));
    const position = list.reduce((m, x) => Math.max(m, x.position + 1), 0);
    res = await sb.from(table).insert({ ...values, [keyField]: key, position }).select().single();
  }
  busy(btn, false);
  if (res.error) {
    err.textContent = friendlyError(res.error);
    err.hidden = false;
    return;
  }
  if (item) list[list.indexOf(item)] = res.data; else list.push(res.data);
  afterCatalogChange();
  $("#itemModal").close();
  toast(item ? `${values.label} salvo` : `${values.label} criado`);
}

async function deleteItem() {
  const { type, item } = itemCtx;
  const err = $("#itemError");
  if (type !== "category") {
    const used = usage(type, item.key);
    if (used.length) {
      err.textContent = `Esta cor está em uso em: ${used.join(", ")}. Tire dos modelos antes de excluir.`;
      err.hidden = false;
      return;
    }
  }
  const count = type === "category" ? db.products.filter(p => p.category === item.id).length : 0;
  const text = count ? `${count} ${count === 1 ? "modelo fica" : "modelos ficam"} sem categoria (continuam em “Todos”).` : "Isso não pode ser desfeito.";
  $("#itemModal").close();
  if (!(await ask(`Excluir ${item.label}?`, text))) return $("#itemModal").showModal();
  const table = { frame: "frame_colors", lens: "lens_colors", category: "categories" }[type];
  const keyField = type === "category" ? "id" : "key";
  const { error } = await sb.from(table).delete().eq(keyField, item[keyField]);
  if (error) return toast(friendlyError(error), { error: true });
  if (type === "frame") db.frames = db.frames.filter(x => x !== item);
  if (type === "lens") db.lenses = db.lenses.filter(x => x !== item);
  if (type === "category") {
    db.categories = db.categories.filter(x => x !== item);
    db.products.forEach(p => { if (p.category === item.id) p.category = null; });
  }
  afterCatalogChange();
  toast(`${item.label} excluído`);
}

function afterCatalogChange() {
  syncDrawing();
  renderColors();
  renderCategories();
  renderProducts();
}

function initItems() {
  $("#itemForm").addEventListener("submit", saveItem);
  $("#itemDelete").addEventListener("click", deleteItem);
  $$("#itemModal [data-close]").forEach(b => b.addEventListener("click", () => $("#itemModal").close()));
  $("#itemForm").addEventListener("input", e => {
    const f = $("#itemForm"), t = e.target;
    // Mantém o seletor de cor e o código hex iguais
    const pair = { color: "colorHex", colorHex: "color", top: "topHex", topHex: "top", bottom: "bottomHex", bottomHex: "bottom" }[t.name];
    if (pair && (t.type === "color" || /^#[0-9a-f]{6}$/i.test(t.value))) f[pair].value = t.value.toUpperCase();
    $("#itemError").hidden = true;
    updateItemPreview();
  });
  $$("[data-new-color]").forEach(b => b.addEventListener("click", () => openItem(b.dataset.newColor)));
  $("#view-cores").addEventListener("click", e => {
    const b = e.target.closest("[data-edit-color]");
    if (b) openItem(b.dataset.editColor, b.dataset.key);
  });
  $("#newCategory").addEventListener("click", () => openItem("category"));
  $("#categoryList").addEventListener("click", async e => {
    const move = e.target.closest("[data-move]");
    if (move) {
      const id = move.closest(".citem").dataset.id;
      await moveItem("categories", db.categories, "id", id, +move.dataset.move);
      renderCategories();
      $(`.citem[data-id="${CSS.escape(id)}"] [data-move="${move.dataset.move}"]`)?.focus();
      return;
    }
    const b = e.target.closest("[data-edit-cat]");
    if (b) openItem("category", b.dataset.editCat);
  });
}

/* ---------- Categorias ---------- */

function renderCategories() {
  const list = db.categories;
  $("#categoryList").innerHTML = list.length ? list.map((c, i) => {
    const n = db.products.filter(p => p.category === c.id).length;
    return `<li class="citem" data-id="${esc(c.id)}">
      <button class="citem__btn" type="button" data-edit-cat="${esc(c.id)}">
        <span class="dot dot--cat"><svg class="icon"><use href="#i-tag"/></svg></span>
        <span><span class="citem__name">${esc(c.label)}</span><br><span class="citem__meta">${n} ${n === 1 ? "modelo" : "modelos"}</span></span>
      </button>
      <span class="order">
        <button class="icon-btn" type="button" data-move="-1" aria-label="Subir ${esc(c.label)}" ${i === 0 ? "disabled" : ""}><svg class="icon"><use href="#i-up"/></svg></button>
        <button class="icon-btn" type="button" data-move="1" aria-label="Descer ${esc(c.label)}" ${i === list.length - 1 ? "disabled" : ""}><svg class="icon"><use href="#i-down"/></svg></button>
      </span>
    </li>`;
  }).join("") : `<li class="empty">Nenhuma categoria.</li>`;
}

/* ---------- Ajustes ---------- */

function renderHeroSelect() {
  const sel = $("#heroSelect");
  sel.innerHTML = db.products.map(p => `<option value="${esc(p.id)}">${esc(p.name)}${p.published ? "" : " (oculto)"}</option>`).join("");
  sel.value = db.settings.hero_product || db.products[0]?.id || "";
}

function renderSettings() {
  const f = $("#settingsForm"), s = db.settings;
  f.whatsapp.value = s.whatsapp || "";
  f.instagram.value = s.instagram || "";
  renderHeroSelect();
}

function initSettings() {
  $("#settingsForm").addEventListener("submit", async e => {
    e.preventDefault();
    const f = e.currentTarget;
    const whatsapp = f.whatsapp.value.replace(/\D/g, "");
    if (whatsapp.length < 12 || whatsapp.length > 13) {
      f.whatsapp.setAttribute("aria-invalid", "true");
      return toast("WhatsApp com DDI + DDD + número, ex.: 55 81 98288-8904.", { error: true });
    }
    f.whatsapp.removeAttribute("aria-invalid");
    const values = { whatsapp, instagram: f.instagram.value.trim().replace(/^@/, ""), hero_product: f.hero_product.value || null };
    const btn = $("button[type=submit]", f);
    busy(btn, true, "Salvando…");
    const { data, error } = await sb.from("settings").update(values).eq("id", 1).select().single();
    busy(btn, false);
    if (error) return toast(friendlyError(error), { error: true });
    db.settings = data;
    renderProducts();
    toast("Ajustes salvos");
  });

  $("#passwordForm").addEventListener("submit", async e => {
    e.preventDefault();
    const f = e.currentTarget, err = $("#passError");
    err.hidden = true;
    if (f.pass.value.length < 8) { err.textContent = "Use pelo menos 8 caracteres."; err.hidden = false; return; }
    if (f.pass.value !== f.pass2.value) { err.textContent = "As duas senhas não são iguais."; err.hidden = false; return; }
    const btn = $("button[type=submit]", f);
    busy(btn, true, "Trocando…");
    const { error } = await sb.auth.updateUser({ password: f.pass.value });
    busy(btn, false);
    if (error) { err.textContent = friendlyError(error); err.hidden = false; return; }
    f.reset();
    toast("Senha trocada");
  });
}

/* ---------- Entrada ---------- */

let started = false;

async function enterApp(session) {
  $("#login").hidden = true;
  $("#boot").classList.remove("is-done");
  $("#whoami").textContent = session.user.user_metadata?.username || session.user.email;
  try {
    await loadAll();
  } catch (err) {
    $("#boot").classList.add("is-done");
    showLogin();
    const e = $("#loginError");
    e.textContent = friendlyError(err);
    e.hidden = false;
    return;
  }
  if (!started) {
    started = true;
    initTabs();
    initProducts();
    initEditor();
    initItems();
    initSettings();
    $("#logout").addEventListener("click", () => sb.auth.signOut());
  }
  renderProducts();
  renderColors();
  renderCategories();
  renderSettings();
  showTab(location.hash.slice(1));
  $("#app").hidden = false;
  $("#boot").classList.add("is-done");
}

initLogin();
sb.auth.onAuthStateChange(event => {
  if (event === "SIGNED_OUT") {
    $$("dialog[open]").forEach(d => d.close());
    showLogin();
  }
});
const { data: { session } } = await sb.auth.getSession();
if (isAdmin(session)) enterApp(session);
else showLogin();
