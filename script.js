/* ==========================================================================
   Godoy | Óculos Premium — mostruário interativo
   ========================================================================== */

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const FACES = [
  { id: "redondo", label: "Redondo", path: '<ellipse cx="60" cy="75" rx="47" ry="54"/>',
    title: "Rosto redondo", text: "Bochechas mais cheias e traços suaves. Armações retas e angulares alongam o rosto e dão definição.",
    picks: ["capri", "siena", "napoli"] },
  { id: "quadrado", label: "Quadrado", path: '<path d="M18,32 Q18,14 36,14 L84,14 Q102,14 102,32 L102,104 Q102,134 76,136 L44,136 Q18,134 18,104 Z"/>',
    title: "Rosto quadrado", text: "Maxilar marcado e testa larga. Formas redondas e curvas suavizam os ângulos.",
    picks: ["roma", "amalfi", "verona"] },
  { id: "oval", label: "Oval", path: '<ellipse cx="60" cy="75" rx="40" ry="58"/>',
    title: "Rosto oval", text: "Proporções equilibradas: quase tudo combina. Aposte em modelos com personalidade.",
    picks: ["milano", "verona", "capri"] },
  { id: "coracao", label: "Coração", path: '<path d="M14,36 Q14,12 40,12 L80,12 Q106,12 106,36 Q106,80 82,114 Q70,136 60,136 Q50,136 38,114 Q14,80 14,36 Z"/>',
    title: "Rosto coração", text: "Testa mais larga e queixo fino. Modelos com base mais larga ou leves equilibram a parte de cima.",
    picks: ["amalfi", "milano", "roma"] },
];

/* ---------- Estado ---------- */

const state = {
  filter: "todos",
  sel: {},
  favs: loadFavs(),
};

/* Seleção inicial de cores; chamado depois que a coleção chega do Supabase. */
function initState() {
  state.sel = Object.fromEntries(PRODUCTS.map(p => [p.id, { frame: p.frames[0], lens: p.lenses[0] }]));
  state.favs = state.favs.filter(id => byId(id));
}

function loadFavs() {
  try { return JSON.parse(localStorage.getItem("godoy:favs")) || []; } catch { return []; }
}
function saveFavs() {
  try { localStorage.setItem("godoy:favs", JSON.stringify(state.favs)); } catch { /* sem storage, segue em memória */ }
}

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const byId = id => PRODUCTS.find(p => p.id === id);

/* ---------- Helpers ---------- */

/* Foto do produto na cor escolhida; sem foto, a ilustração em SVG. */
function artHTML(p, frame, lens, { label = "", eager = false } = {}) {
  const photo = productPhoto(p, frame);
  if (!photo) return glassesSVG(p, frame, lens, { label });
  return `<img class="photo" src="${photoURL(photo.path)}" alt="${escapeAttr(label || photo.alt || `Óculos ${p.name}`)}"
    ${eager ? "" : 'loading="lazy"'} decoding="async">`;
}

function escapeAttr(s) {
  return String(s).replace(/[&"<>]/g, c => ({ "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" })[c]);
}

function swatchHTML(kind, key, checked, size = "") {
  const def = kind === "frame" ? FRAMES[key] : LENSES[key];
  const bg = kind === "frame"
    ? (def.swatch || def.color)
    : `linear-gradient(180deg, ${def.top}, ${def.bottom})`;
  return `<button type="button" class="swatch ${size}" role="radio" aria-checked="${checked}"
    data-kind="${kind}" data-key="${key}" aria-label="${def.label}" title="${def.label}"
    style="--c:${bg}"></button>`;
}

function waLink(message) {
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`;
}

function productMessage(p) {
  const { frame, lens } = state.sel[p.id];
  return `Olá! Vi o mostruário da Godoy e tenho interesse no modelo ${p.name} — armação ${FRAMES[frame].label}, lente ${LENSES[lens].label}. Está disponível?`;
}

let toastTimer;
function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("is-on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("is-on"), 2200);
}

/* ---------- Links genéricos de WhatsApp ---------- */

function wireWhatsApp(root = document) {
  $$("[data-wa]", root).forEach(a => {
    a.href = waLink(a.dataset.waMsg || "Olá! Vim pelo site da Godoy e quero conhecer os modelos.");
    a.target = "_blank";
    a.rel = "noopener";
  });
}

/* ---------- Hero ---------- */

function initHero() {
  const roma = byId(HERO_PRODUCT) || PRODUCTS[0];
  const holder = $("#heroGlasses");
  const sw = $("#heroSwatches");
  // Lente que mais combina com cada armação no destaque (vale quando o modelo tem essas cores)
  const pairs = { tartaruga: "ambar", preto: "escuro", cristal: "verde", marinho: "escuro" };
  const lensFor = frame => roma.lenses.includes(pairs[frame]) ? pairs[frame] : roma.lenses[0];
  const first = roma.frames.includes("tartaruga") ? "tartaruga" : roma.frames[0];
  const heroSel = { frame: first, lens: lensFor(first) };
  $$("[data-hero-try]").forEach(el => { el.dataset.tryon = roma.id; });
  $("#heroGlasses").setAttribute("aria-label", `Óculos modelo ${roma.name}`);
  $("#heroModelName").textContent = roma.name;
  $("#heroSwatches").setAttribute("aria-label", `Cor da armação do modelo ${roma.name}`);

  const draw = () => {
    holder.innerHTML = glassesSVG(roma, heroSel.frame, heroSel.lens);
    $("#heroColorName").textContent = `· ${FRAMES[heroSel.frame].label}`;
  };
  sw.innerHTML = roma.frames.map(k => swatchHTML("frame", k, k === heroSel.frame)).join("");
  sw.addEventListener("click", e => {
    const b = e.target.closest(".swatch");
    if (!b) return;
    heroSel.frame = b.dataset.key;
    heroSel.lens = lensFor(b.dataset.key);
    $$(".swatch", sw).forEach(x => x.setAttribute("aria-checked", x === b));
    draw();
  });
  draw();

  // Inclinação 3D acompanhando o cursor (apenas em dispositivos com mouse)
  if (reduceMotion || !window.matchMedia("(hover: hover)").matches) return;
  const stage = $("#heroStage");
  const area = $(".hero__visual");
  area.addEventListener("pointermove", e => {
    const r = area.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - .5;
    const y = (e.clientY - r.top) / r.height - .5;
    holder.style.transform = `rotateY(${x * 22}deg) rotateX(${-y * 14}deg)`;
  });
  area.addEventListener("pointerleave", () => { holder.style.transform = ""; });
  stage.style.willChange = "transform";
}

/* ---------- Filtros + grade ---------- */

function renderFilters() {
  const counts = PRODUCTS.reduce((acc, p) => (acc[p.category] = (acc[p.category] || 0) + 1, acc), {});
  $("#filters").innerHTML = CATEGORIES
    .filter(c => c.id === "todos" || counts[c.id])
    .map(c => `<button class="chip" role="tab" type="button" data-filter="${c.id}" aria-selected="${c.id === state.filter}">
      ${c.label}<small>${c.id === "todos" ? PRODUCTS.length : counts[c.id]}</small></button>`)
    .join("");
}

function cardHTML(p, i) {
  const { frame, lens } = state.sel[p.id];
  const fav = state.favs.includes(p.id);
  return `
  <li class="card" style="--i:${i}; view-transition-name: card-${p.id}" data-id="${p.id}">
    ${p.badge ? `<span class="badge ${p.badgeGold ? "badge--gold" : ""}"><span class="badge__long">${p.badge}</span><span class="badge__short" aria-hidden="true">${p.badgeShort || p.badge}</span></span>` : ""}
    <button class="heart" type="button" aria-pressed="${fav}" aria-label="${fav ? "Remover dos" : "Adicionar aos"} favoritos: ${p.name}" data-fav="${p.id}">
      <svg class="icon" aria-hidden="true"><use href="#i-heart"/></svg>
    </button>
    <button class="card__media ${productPhoto(p, frame) ? "has-photo" : ""}" type="button" data-open="${p.id}" aria-label="Ver detalhes do modelo ${p.name}">
      ${artHTML(p, frame, lens, { eager: i < 2 })}
      <span class="card__view" aria-hidden="true">Ver detalhes</span>
    </button>
    <div class="card__body">
      <div class="card__top">
        <h3 class="card__name">${p.name}</h3>
        <p class="card__type">${p.type}</p>
      </div>
      <div class="swatches" role="radiogroup" aria-label="Cor da armação ${p.name}">
        ${p.frames.map(k => swatchHTML("frame", k, k === frame, "swatch--sm")).join("")}
      </div>
      <div class="card__foot">
        <p class="card__color">${FRAMES[frame].label} · ${LENSES[lens].label}</p>
        <a class="card__cta" href="${waLink(productMessage(p))}" target="_blank" rel="noopener" data-cta="${p.id}">
          Quero <svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg>
        </a>
        <button class="card__try" type="button" data-tryon="${p.id}" aria-label="Provar o ${p.name} no provador virtual" title="Provar no rosto">
          <svg class="icon" aria-hidden="true"><use href="#i-face"/></svg>
        </button>
      </div>
    </div>
  </li>`;
}

function renderGrid() {
  const list = PRODUCTS.filter(p => state.filter === "todos" || p.category === state.filter);
  $("#grid").innerHTML = list.map(cardHTML).join("");
  $("#resultCount").textContent = `${list.length} ${list.length === 1 ? "modelo" : "modelos"}`;
}

function setFilter(id, { scroll = false } = {}) {
  if (id === state.filter && !scroll) return;
  state.filter = id;
  $$(".chip").forEach(c => c.setAttribute("aria-selected", c.dataset.filter === id));
  const run = () => renderGrid();
  if (document.startViewTransition && !reduceMotion) document.startViewTransition(run);
  else run();
  if (scroll) $("#colecao").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
}

function updateCard(id) {
  const card = $(`.card[data-id="${id}"]`);
  if (!card) return;
  const p = byId(id);
  const { frame, lens } = state.sel[id];
  const media = $(".card__media", card);
  const art = artHTML(p, frame, lens, { eager: true });
  // Mesma foto para outra cor: não recarrega a imagem
  if (!(media.firstElementChild.tagName === "IMG" && art.includes(media.firstElementChild.getAttribute("src")))) {
    media.firstElementChild.outerHTML = art;
  }
  media.classList.toggle("has-photo", !!productPhoto(p, frame));
  $$(".swatch", card).forEach(s => s.setAttribute("aria-checked", s.dataset.key === frame));
  $(".card__color", card).textContent = `${FRAMES[frame].label} · ${LENSES[lens].label}`;
  $(".card__cta", card).href = waLink(productMessage(p));
}

function initCollection() {
  renderFilters();
  renderGrid();

  $("#filters").addEventListener("click", e => {
    const chip = e.target.closest(".chip");
    if (chip) setFilter(chip.dataset.filter);
  });

  // Setas do teclado entre os filtros (padrão de tabs)
  $("#filters").addEventListener("keydown", e => {
    if (!["ArrowRight", "ArrowLeft"].includes(e.key)) return;
    const chips = $$(".chip");
    const i = chips.indexOf(document.activeElement);
    const next = chips[(i + (e.key === "ArrowRight" ? 1 : -1) + chips.length) % chips.length];
    next.focus();
    setFilter(next.dataset.filter);
  });

  $("#grid").addEventListener("click", e => {
    const sw = e.target.closest(".swatch");
    if (sw) {
      const id = sw.closest(".card").dataset.id;
      state.sel[id].frame = sw.dataset.key;
      updateCard(id);
      return;
    }
    const fav = e.target.closest("[data-fav]");
    if (fav) return toggleFav(fav.dataset.fav);
    const open = e.target.closest("[data-open]");
    if (open) openProduct(open.dataset.open, open);
  });
}

/* ---------- Favoritos ---------- */

function toggleFav(id) {
  const has = state.favs.includes(id);
  state.favs = has ? state.favs.filter(x => x !== id) : [...state.favs, id];
  saveFavs();
  $$(`[data-fav="${id}"]`).forEach(b => {
    b.setAttribute("aria-pressed", !has);
    b.setAttribute("aria-label", `${has ? "Adicionar aos" : "Remover dos"} favoritos: ${byId(id).name}`);
  });
  syncFavUI();
  toast(has ? "Removido dos favoritos" : `${byId(id).name} salvo nos favoritos`);
}

function favMessage() {
  const lines = state.favs.map(id => {
    const p = byId(id), s = state.sel[id];
    return `• ${p.name} — ${FRAMES[s.frame].label}, lente ${LENSES[s.lens].label}`;
  });
  return `Olá! Separei estes modelos no mostruário da Godoy:\n${lines.join("\n")}\nPode me passar disponibilidade e valores?`;
}

function syncFavUI() {
  const n = state.favs.length;
  $("#favPill").hidden = n === 0;
  $("#favCount").textContent = n;
  $("#dockFavCount").textContent = n;
  $("#dockFav").classList.toggle("has-favs", n > 0);
  $("#dockWaLabel").textContent = n ? `Enviar ${n} ${n === 1 ? "favorito" : "favoritos"}` : "Falar no WhatsApp";
  $("#dockWa").href = n ? waLink(favMessage()) : waLink("Olá! Vim pelo site da Godoy e quero conhecer os modelos.");
}

function renderFavSheet() {
  const list = $("#favList");
  if (!state.favs.length) {
    list.innerHTML = `<li class="fav-empty">Nenhum favorito ainda. Toque no coração dos modelos para salvar aqui.</li>`;
    $("#favSend").hidden = true;
    return;
  }
  $("#favSend").hidden = false;
  $("#favSend").href = waLink(favMessage());
  list.innerHTML = state.favs.map(id => {
    const p = byId(id), s = state.sel[id];
    return `<li class="fav-item">
      <div class="fav-item__img">${artHTML(p, s.frame, s.lens)}</div>
      <div><p class="fav-item__name">${p.name}</p><p class="fav-item__meta">${FRAMES[s.frame].label} · ${LENSES[s.lens].label}</p></div>
      <button type="button" data-unfav="${id}" aria-label="Remover ${p.name} dos favoritos"><svg class="icon" aria-hidden="true"><use href="#i-close"/></svg></button>
    </li>`;
  }).join("");
}

function initFavs() {
  syncFavUI();
  const open = () => { renderFavSheet(); showSheet($("#favSheet")); };
  $("#favPill").addEventListener("click", open);
  $("#dockFav").addEventListener("click", open);
  $("#favList").addEventListener("click", e => {
    const b = e.target.closest("[data-unfav]");
    if (!b) return;
    toggleFav(b.dataset.unfav);
    renderFavSheet();
  });
}

/* ---------- Bottom sheet / modal ---------- */

let lastFocus = null;

function showSheet(dialog, opener) {
  lastFocus = opener || document.activeElement;
  dialog.classList.remove("is-closing");
  dialog.showModal();
  document.body.style.overflow = "hidden";
}

function closeSheet(dialog) {
  if (!dialog.open || dialog.classList.contains("is-closing")) return;
  if (reduceMotion) return finishClose(dialog);
  dialog.classList.add("is-closing");
  setTimeout(() => finishClose(dialog), 320);
}

function finishClose(dialog) {
  dialog.classList.remove("is-closing");
  dialog.close();
  document.body.style.overflow = "";
  lastFocus?.focus?.({ preventScroll: true });
}

function productDetailHTML(p) {
  const { frame, lens } = state.sel[p.id];
  const fav = state.favs.includes(p.id);
  const photo = productPhoto(p, frame);
  const thumbs = (p.images || []).length > 1 ? `
    <div class="pd__thumbs" role="list" aria-label="Fotos do modelo">
      ${p.images.map((img, i) => `<button type="button" role="listitem" class="pd__thumb" data-photo="${i}" aria-pressed="${img === photo}"
        aria-label="Foto ${i + 1}${img.frame && FRAMES[img.frame] ? `, armação ${FRAMES[img.frame].label}` : ""}">
        <img src="${photoURL(img.path)}" alt="" loading="lazy" decoding="async"></button>`).join("")}
    </div>` : "";
  return `
    <div class="pd__stage ${photo ? "has-photo" : ""}" id="pdStage">
      ${artHTML(p, frame, lens, { eager: true, label: `Óculos ${p.name}, armação ${FRAMES[frame].label}, lente ${LENSES[lens].label}` })}
      <button class="heart" type="button" aria-pressed="${fav}" aria-label="${fav ? "Remover dos" : "Adicionar aos"} favoritos: ${p.name}" data-fav="${p.id}">
        <svg class="icon" aria-hidden="true"><use href="#i-heart"/></svg>
      </button>
      ${photo ? "" : '<p class="pd__hint" aria-hidden="true">Ilustração do modelo</p>'}
    </div>${thumbs}
    <div class="pd__head">
      <h2 class="pd__name" id="sheetTitle">${p.name}</h2>
      <p class="pd__type">${p.type}</p>
    </div>
    <p class="pd__desc">${p.desc}</p>

    <div class="pd__group">
      <p class="pd__label">Armação <span id="pdFrameName">· ${FRAMES[frame].label}</span></p>
      <div class="swatches" role="radiogroup" aria-label="Cor da armação">
        ${p.frames.map(k => swatchHTML("frame", k, k === frame)).join("")}
      </div>
    </div>
    <div class="pd__group">
      <p class="pd__label">Lente <span id="pdLensName">· ${LENSES[lens].label}</span></p>
      <div class="swatches" role="radiogroup" aria-label="Cor da lente">
        ${p.lenses.map(k => swatchHTML("lens", k, k === lens)).join("")}
      </div>
    </div>

    <dl class="pd__specs">
      <div><dt>Proteção</dt><dd>UV400</dd></div>
      <div><dt>Material</dt><dd>${p.material}</dd></div>
      <div><dt>Estilo</dt><dd>${p.type.split(" · ")[0]}</dd></div>
      <div><dt>Indicado para</dt><dd>${p.faces}</dd></div>
    </dl>

    <div class="pd__actions">
      <button class="btn btn--ghost btn--block" type="button" data-tryon="${p.id}">
        <svg class="icon" aria-hidden="true"><use href="#i-face"/></svg>
        Provar no rosto
      </button>
      <a class="btn btn--dark btn--block" id="pdCta" href="${waLink(productMessage(p))}" target="_blank" rel="noopener">
        <svg class="icon" aria-hidden="true"><use href="#i-wa"/></svg>
        Quero este modelo
      </a>
    </div>`;
}

function openProduct(id, opener) {
  const p = byId(id);
  const body = $("#sheetBody");
  body.innerHTML = productDetailHTML(p);
  body.dataset.id = id;
  showSheet($("#sheet"), opener);
  $("#sheetPanel").scrollTop = 0;
}

function initSheets() {
  const sheet = $("#sheet");
  const body = $("#sheetBody");

  body.addEventListener("click", e => {
    const id = body.dataset.id;
    const sw = e.target.closest(".swatch");
    if (sw) {
      state.sel[id][sw.dataset.kind] = sw.dataset.key;
      const p = byId(id), { frame, lens } = state.sel[id];
      if (sw.dataset.kind === "frame" || !productPhoto(p, frame)) {
        showStageArt(p, artHTML(p, frame, lens, { eager: true, label: `Óculos ${p.name}, armação ${FRAMES[frame].label}, lente ${LENSES[lens].label}` }), productPhoto(p, frame));
      }
      $$(`.swatch[data-kind="${sw.dataset.kind}"]`, body).forEach(x => x.setAttribute("aria-checked", x === sw));
      $("#pdFrameName").textContent = `· ${FRAMES[frame].label}`;
      $("#pdLensName").textContent = `· ${LENSES[lens].label}`;
      $("#pdCta").href = waLink(productMessage(p));
      updateCard(id);
      syncFavUI();
      return;
    }
    const thumb = e.target.closest("[data-photo]");
    if (thumb) {
      const p = byId(id), img = p.images[+thumb.dataset.photo];
      return showStageArt(p, `<img class="photo" src="${photoURL(img.path)}" alt="${escapeAttr(img.alt || `Óculos ${p.name}`)}" decoding="async">`, img);
    }
    const fav = e.target.closest("[data-fav]");
    if (fav) toggleFav(fav.dataset.fav);
  });

  function showStageArt(p, html, photo) {
    const stage = $("#pdStage", body);
    stage.firstElementChild.outerHTML = html;
    stage.classList.toggle("has-photo", !!photo);
    $(".pd__hint", stage)?.remove();
    if (!photo) stage.insertAdjacentHTML("beforeend", '<p class="pd__hint" aria-hidden="true">Ilustração do modelo</p>');
    $$(".pd__thumb", body).forEach((t, i) => t.setAttribute("aria-pressed", p.images[i] === photo));
  }

  // Inclinação do produto no detalhe
  body.addEventListener("pointermove", e => {
    const stage = e.target.closest("#pdStage");
    if (!stage || reduceMotion || e.pointerType !== "mouse") return;
    const r = stage.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - .5;
    const y = (e.clientY - r.top) / r.height - .5;
    const svg = $(":scope > svg", stage);
    if (svg) svg.style.transform = `rotateY(${x * 24}deg) rotateX(${-y * 16}deg) scale(1.03)`;
  });
  body.addEventListener("pointerout", e => {
    if (e.target.closest("#pdStage") && !e.relatedTarget?.closest?.("#pdStage")) {
      const svg = $("#pdStage svg", body);
      if (svg) svg.style.transform = "";
    }
  });

  $$(".sheet").forEach(d => {
    d.addEventListener("cancel", e => { e.preventDefault(); closeSheet(d); });
    // Clique fora do painel fecha
    d.addEventListener("click", e => { if (e.target === d) closeSheet(d); });
    $$(".sheet__close", d).forEach(b => b.addEventListener("click", () => closeSheet(d)));
    enableSwipeToClose(d);
  });
}

/* Arrastar para baixo fecha o bottom sheet no mobile */
function enableSwipeToClose(dialog) {
  const panel = $(".sheet__panel", dialog);
  let startY = 0, dy = 0, dragging = false;

  panel.addEventListener("touchstart", e => {
    if (panel.scrollTop > 0 || window.innerWidth >= 640) return;
    startY = e.touches[0].clientY; dy = 0; dragging = true;
    panel.style.transition = "none";
  }, { passive: true });

  panel.addEventListener("touchmove", e => {
    if (!dragging) return;
    dy = Math.max(0, e.touches[0].clientY - startY);
    panel.style.transform = `translateY(${dy}px)`;
  }, { passive: true });

  panel.addEventListener("touchend", () => {
    if (!dragging) return;
    dragging = false;
    panel.style.transition = "transform .35s cubic-bezier(.22,1,.36,1)";
    if (dy > 110) {
      panel.style.transform = "translateY(100%)";
      setTimeout(() => { panel.style.transform = ""; panel.style.transition = ""; finishClose(dialog); }, 300);
    } else {
      panel.style.transform = "";
    }
  });
}

/* ---------- Guia de formato de rosto ---------- */

function faceSVG(face, cls = "") {
  return `<svg class="${cls}" viewBox="0 0 120 150" aria-hidden="true">
    <g fill="#F6F2EA" stroke="#1E2A44" stroke-width="2">${face.path}</g>
  </svg>`;
}

function renderFace(id) {
  const face = FACES.find(f => f.id === id);
  const picks = face.picks.filter(byId);
  if (!picks.length) picks.push(...PRODUCTS.slice(0, 3).map(p => p.id));
  const sample = byId(picks[0]);
  const panel = $("#facePanel");
  panel.classList.remove("is-swapping");
  void panel.offsetWidth;
  panel.classList.add("is-swapping");
  panel.innerHTML = `
    <div class="face-card__figure">
      ${faceSVG(face)}
      <div class="face-glasses">${glassesSVG(sample, sample.frames[0], sample.lenses[0])}</div>
    </div>
    <h3 class="face-card__title">${face.title}</h3>
    <p class="face-card__text">${face.text}</p>
    <div class="face-card__models">
      ${picks.map(pid => `<button type="button" data-face-pick="${pid}">${byId(pid).name}
        <svg class="icon" aria-hidden="true" style="width:16px;height:16px"><use href="#i-arrow"/></svg></button>`).join("")}
    </div>`;
  $$(".face-tab").forEach(t => t.setAttribute("aria-selected", t.dataset.face === id));
}

function initFaces() {
  $("#faceTabs").innerHTML = FACES.map(f => `
    <button class="face-tab" role="tab" type="button" data-face="${f.id}" aria-selected="false">
      ${faceSVG({ path: f.path })}${f.label}
    </button>`).join("");
  $("#faceTabs").addEventListener("click", e => {
    const t = e.target.closest(".face-tab");
    if (t) renderFace(t.dataset.face);
  });
  $("#facePanel").addEventListener("click", e => {
    const b = e.target.closest("[data-face-pick]");
    if (b) openProduct(b.dataset.facePick, b);
  });
  renderFace("oval");
}

/* ---------- Demonstração do provador (celular ilustrado) ---------- */

function initDemo() {
  const holder = $("#demoGlasses");
  const name = $("#demoName");
  let i = 0, timer = 0;
  const draw = () => {
    const p = PRODUCTS[i % PRODUCTS.length], { frame, lens } = state.sel[p.id];
    holder.innerHTML = glassesSVG(p, frame, lens);
    name.textContent = `${p.name} · ${FRAMES[frame].label}`;
  };
  const next = () => {
    holder.classList.add("is-out");
    setTimeout(() => { i++; draw(); holder.classList.remove("is-out"); }, 350);
  };
  draw();
  if (reduceMotion) return;
  // Só troca os modelos enquanto a seção está visível
  new IntersectionObserver(([e]) => {
    clearInterval(timer);
    if (e.isIntersecting) timer = setInterval(next, 2600);
  }).observe(holder);
}

/* ---------- Cabeçalho, menu e dock ---------- */

function initChrome() {
  const header = $("#header");
  const dock = $("#dock");
  const hero = $("#inicio");
  const burger = $("#burger");
  const nav = $("#nav");

  const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 10);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // A dock aparece depois do hero e some no CTA final (evita botões duplicados)
  const cta = $("#contato");
  let pastHero = false, atCta = false;
  const syncDock = () => {
    const show = pastHero && !atCta;
    dock.classList.toggle("is-visible", show);
    dock.setAttribute("aria-hidden", !show);
    $$("a, button", dock).forEach(el => el.tabIndex = show ? 0 : -1);
  };
  new IntersectionObserver(([e]) => { pastHero = !e.isIntersecting; syncDock(); }, { rootMargin: "-40% 0px 0px 0px" }).observe(hero);
  new IntersectionObserver(([e]) => { atCta = e.isIntersecting; syncDock(); }, { threshold: .2 }).observe(cta);

  const setMenu = open => {
    burger.setAttribute("aria-expanded", open);
    burger.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    nav.classList.toggle("is-open", open);
    document.body.style.overflow = open ? "hidden" : "";
  };
  burger.addEventListener("click", () => setMenu(burger.getAttribute("aria-expanded") !== "true"));
  nav.addEventListener("click", e => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && nav.classList.contains("is-open")) setMenu(false); });
}

/* ---------- Animações de entrada e contadores ---------- */

function initReveal() {
  const els = $$(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    els.forEach(el => el.classList.add("is-in"));
    return;
  }
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-in");
      io.unobserve(e.target);
    });
  }, { threshold: .15, rootMargin: "0px 0px -40px 0px" });
  els.forEach(el => io.observe(el));
}

function initCounters() {
  const els = $$("[data-count]");
  const fmt = (v, d) => v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
  const run = el => {
    const target = parseFloat(el.dataset.count);
    const dec = +(el.dataset.decimals || 0);
    if (reduceMotion) return (el.textContent = fmt(target, dec));
    const t0 = performance.now(), dur = 1600;
    const tick = now => {
      const k = Math.min(1, (now - t0) / dur);
      el.textContent = fmt(target * (1 - Math.pow(1 - k, 4)), dec);
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
  }, { threshold: .6 });
  els.forEach(el => io.observe(el));
}

/* ---------- API usada pelo provador (tryon.js) ---------- */

async function start() {
  initChrome();
  initReveal();
  initCounters();
  document.body.classList.add("is-loading-catalog");
  await loadCatalog();
  document.body.classList.remove("is-loading-catalog");
  initState();
  $$('a[href*="instagram.com/"]').forEach(a => { a.href = `https://www.instagram.com/${INSTAGRAM}`; });
  wireWhatsApp();
  initHero();
  initCollection();
  initFaces();
  initDemo();
  initFavs();
  initSheets();
}

window.Godoy = {
  PRODUCTS, FRAMES, LENSES, state, byId,
  glassesSVG, swatchHTML, waLink, productMessage, toast, updateCard,
  closeAllSheets: () => $$(".sheet").forEach(d => d.open && finishClose(d)),
  ready: start(),
};
