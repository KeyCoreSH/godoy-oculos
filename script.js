/* ==========================================================================
   Godoy | Óculos Premium — mostruário interativo
   ========================================================================== */

const WHATSAPP = "5581982888904";
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Catálogo ----------
   Para trocar por fotos reais, adicione `image: "fotos/roma.jpg"` no produto:
   o card passa a usar a foto no lugar da ilustração. */

const FRAMES = {
  preto:     { label: "Preto",      color: "#16181D" },
  tartaruga: { label: "Tartaruga",  pattern: "tortoise", swatch: "radial-gradient(circle at 30% 30%, #A8692F 0 18%, #6B3D1C 19% 46%, #2B1508 47% 60%, #8A5A2B 61%)" },
  cristal:   { label: "Cristal",    color: "#C9D2DA" },
  fume:      { label: "Fumê",       color: "#55585E" },
  marinho:   { label: "Azul-marinho", color: "#1E2A44" },
  vinho:     { label: "Vinho",      color: "#5B1F2A" },
  dourado:   { label: "Dourado",    color: "#BF9A57", swatch: "linear-gradient(135deg, #E3C88E, #A9844F)" },
  prata:     { label: "Prata",      color: "#A9ADB3", swatch: "linear-gradient(135deg, #E1E3E6, #8E9298)" },
  madeira:   { label: "Madeira",    pattern: "wood", swatch: "repeating-linear-gradient(100deg, #8B5A33 0 3px, #A87545 3px 6px, #7A4C2A 6px 8px)" },
};

const LENSES = {
  escuro:  { label: "Escura G15",   top: "#2C2E33", bottom: "#0D0E11", opacity: .93 },
  ambar:   { label: "Âmbar",        top: "#D9A257", bottom: "#93591F", opacity: .86 },
  verde:   { label: "Verde",        top: "#56624A", bottom: "#242A1F", opacity: .92 },
  marrom:  { label: "Marrom degradê", top: "#4A2F1D", bottom: "#C8986A", opacity: .86 },
  azul:    { label: "Azul espelhada", top: "#5B8FC4", bottom: "#132F50", opacity: .92 },
  rose:    { label: "Rosé",         top: "#D9A094", bottom: "#9A5A50", opacity: .78 },
};

/* Formas desenhadas a partir da lente esquerda (viewBox 240×112); a direita é espelhada. */
const SHAPES = {
  redondo: {
    lens: "M32,58 a36,36 0 1,0 72,0 a36,36 0 1,0 -72,0",
    sw: 6.5, bridge: "M103,52 Q120,38 137,52", hinge: [33, 50],
  },
  wayfarer: {
    lens: "M26,34 Q26,27 34,27 L102,30 Q110,31 108,40 L102,74 Q99,88 84,88 L50,88 Q34,88 31,74 Z",
    sw: 8, bridge: "M107,42 Q120,33 133,42", hinge: [27, 33],
  },
  quadrado: {
    lens: "M22,28 Q22,22 28,22 L104,24 Q110,24 110,30 L108,78 Q106,92 92,92 L38,92 Q24,92 22,78 Z",
    sw: 7, bridge: "M110,44 Q120,37 130,44", hinge: [22, 30],
  },
  clubmaster: {
    lens: "M31,42 L106,42 L104,62 Q100,88 70,88 Q38,88 33,64 Z",
    sw: 3, metalRim: true,
    brow: "M24,32 Q24,24 34,24 L102,24 Q111,24 110,33 L109,47 L30,47 Q24,47 24,40 Z",
    bridge: "M108,40 Q120,33 132,40", hinge: [24, 32],
  },
  aviador: {
    lens: "M30,36 Q30,26 46,26 L98,27 Q110,28 109,40 Q106,70 86,84 Q72,92 56,88 Q32,80 30,52 Z",
    sw: 3.2, metal: true,
    bridge: "M107,36 Q120,29 133,36", topbar: "M98,25 L142,25", hinge: [30, 32],
  },
  gatinho: {
    lens: "M18,24 Q60,30 104,36 Q113,38 108,52 Q100,84 68,86 Q38,86 30,64 Q24,46 18,24 Z",
    sw: 7, bridge: "M106,45 Q120,36 134,45", hinge: [19, 26],
  },
  hexagonal: {
    lens: "M48,22 L90,22 L108,56 L90,90 L48,90 L30,56 Z",
    sw: 3.5, metal: true, bridge: "M106,48 Q120,40 134,48", hinge: [31, 52],
  },
};

const PRODUCTS = [
  { id: "roma", name: "Roma", shape: "redondo", category: "redondo", type: "Redondo · Acetato",
    badge: "Várias cores", desc: "O redondo clássico, com armação encorpada em acetato. Disponível em várias cores para combinar com o seu estilo.",
    frames: ["tartaruga", "preto", "cristal", "marinho"], lenses: ["ambar", "escuro", "verde"],
    material: "Acetato", faces: "Quadrado, coração" },
  { id: "siena", name: "Siena", shape: "wayfarer", category: "quadrado", type: "Wayfarer · Acetato",
    badge: "Campeão de vendas", badgeShort: "Top vendas", badgeGold: true, desc: "Linhas retas e ponte reforçada. Um ícone atemporal que vai bem com tudo, do dia a dia à praia.",
    frames: ["preto", "tartaruga", "fume"], lenses: ["escuro", "verde", "marrom"],
    material: "Acetato", faces: "Redondo, oval" },
  { id: "milano", name: "Milano", shape: "clubmaster", category: "clubmaster", type: "Clubmaster · Misto",
    desc: "Sobrancelha em acetato com aro metálico dourado. Elegância retrô com acabamento refinado.",
    frames: ["tartaruga", "preto", "marinho"], lenses: ["marrom", "escuro", "verde"],
    material: "Acetato + metal", faces: "Oval, coração" },
  { id: "firenze", name: "Firenze", shape: "wayfarer", category: "madeira", type: "Wayfarer · Madeira",
    badge: "Madeira reciclável", badgeShort: "Madeira", desc: "Frente em acetato e hastes de madeira reciclável. Leve, confortável e com um toque natural.",
    frames: ["preto", "tartaruga", "madeira"], lenses: ["escuro", "ambar", "verde"], temple: "madeira",
    material: "Acetato + madeira reciclável", faces: "Redondo, oval" },
  { id: "amalfi", name: "Amalfi", shape: "aviador", category: "aviador", type: "Aviador · Metal",
    desc: "A gota clássica com ponte dupla e metal leve. Feito para dias de sol forte.",
    frames: ["dourado", "prata", "preto"], lenses: ["verde", "escuro", "azul"],
    material: "Metal", faces: "Quadrado, coração, oval" },
  { id: "capri", name: "Capri", shape: "quadrado", category: "quadrado", type: "Quadrado · Oversized",
    badge: "Novo", desc: "Quadrado amplo, com presença e proteção extra. O preferido para quem gosta de óculos marcantes.",
    frames: ["preto", "tartaruga", "cristal", "vinho"], lenses: ["escuro", "marrom", "rose"],
    material: "Acetato", faces: "Redondo, oval" },
  { id: "verona", name: "Verona", shape: "gatinho", category: "gatinho", type: "Gatinho · Acetato",
    desc: "Cantos elevados que realçam o olhar. Feminino, sofisticado e cheio de atitude.",
    frames: ["preto", "tartaruga", "vinho", "cristal"], lenses: ["escuro", "rose", "marrom"],
    material: "Acetato", faces: "Oval, quadrado" },
  { id: "napoli", name: "Napoli", shape: "hexagonal", category: "geometrico", type: "Hexagonal · Metal",
    desc: "Geometria leve em metal fino. Moderno, discreto e fácil de usar.",
    frames: ["dourado", "prata", "preto"], lenses: ["verde", "escuro", "ambar"],
    material: "Metal", faces: "Redondo, oval" },
];

const CATEGORIES = [
  { id: "todos", label: "Todos" },
  { id: "redondo", label: "Redondo" },
  { id: "quadrado", label: "Quadrado" },
  { id: "clubmaster", label: "Clubmaster" },
  { id: "aviador", label: "Aviador" },
  { id: "gatinho", label: "Gatinho" },
  { id: "geometrico", label: "Geométrico" },
  { id: "madeira", label: "Madeira" },
];

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
  sel: Object.fromEntries(PRODUCTS.map(p => [p.id, { frame: p.frames[0], lens: p.lenses[0] }])),
  favs: loadFavs(),
};

function loadFavs() {
  try { return JSON.parse(localStorage.getItem("godoy:favs")) || []; } catch { return []; }
}
function saveFavs() {
  try { localStorage.setItem("godoy:favs", JSON.stringify(state.favs)); } catch { /* sem storage, segue em memória */ }
}

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const byId = id => PRODUCTS.find(p => p.id === id);

/* ---------- Desenho dos óculos (SVG) ---------- */

let uidSeq = 0;

function paint(key, uid) {
  const f = FRAMES[key];
  return f.pattern ? `url(#${f.pattern}-${uid})` : f.color;
}

function patternDefs(uid) {
  return `
    <pattern id="tortoise-${uid}" width="30" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
      <rect width="30" height="22" fill="#6B3D1C"/>
      <ellipse cx="6" cy="6" rx="6.5" ry="3.6" fill="#2B1508" opacity=".85"/>
      <ellipse cx="21" cy="14" rx="7.5" ry="4.2" fill="#A8692F" opacity=".75"/>
      <ellipse cx="17" cy="4" rx="3" ry="2" fill="#2B1508" opacity=".7"/>
      <ellipse cx="4" cy="17" rx="4" ry="2.4" fill="#C88A45" opacity=".55"/>
      <ellipse cx="27" cy="21" rx="3" ry="1.8" fill="#2B1508" opacity=".6"/>
    </pattern>
    <pattern id="wood-${uid}" width="14" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(8)">
      <rect width="14" height="40" fill="#946039"/>
      <rect x="0" width="3" height="40" fill="#7A4C2A"/>
      <rect x="6" width="1.5" height="40" fill="#B07A4A"/>
      <rect x="10" width="2" height="40" fill="#81522E" opacity=".8"/>
    </pattern>`;
}

function glassesSVG(product, frameKey, lensKey, { label = "" } = {}) {
  const s = SHAPES[product.shape];
  const uid = `g${++uidSeq}`;
  const L = LENSES[lensKey];
  const frame = paint(frameKey, uid);
  const metalShape = s.metal;
  const rim = s.metalRim ? "#BF9A57" : frame;
  const templeColor = product.temple ? paint(product.temple, uid) : frame;
  const [hx, hy] = s.hinge;

  const lens = `
    <use href="#ln-${uid}" fill="url(#lg-${uid})" fill-opacity="${L.opacity}"/>
    <g clip-path="url(#cp-${uid})">
      <g class="glare">
        <rect x="16" y="-30" width="20" height="170" fill="#fff" opacity=".26" transform="rotate(24 68 56)"/>
        <rect x="44" y="-30" width="7" height="170" fill="#fff" opacity=".16" transform="rotate(24 68 56)"/>
      </g>
    </g>
    <use href="#ln-${uid}" fill="none" stroke="${rim}" stroke-width="${s.sw}" stroke-linejoin="round"/>
    ${s.brow ? `<path d="${s.brow}" fill="${frame}"/><path d="M30,28 L100,28" stroke="#fff" stroke-opacity=".18" stroke-width="1.5" stroke-linecap="round"/>` : ""}
    <path d="M${hx},${hy} l-13,-2.5" stroke="${templeColor}" stroke-width="${metalShape ? 3.4 : 6}" stroke-linecap="round"/>`;

  return `
  <svg viewBox="0 0 240 112" xmlns="http://www.w3.org/2000/svg" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}>
    <defs>
      ${patternDefs(uid)}
      <linearGradient id="lg-${uid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${L.top}"/><stop offset="1" stop-color="${L.bottom}"/>
      </linearGradient>
      <path id="ln-${uid}" d="${s.lens}"/>
      <clipPath id="cp-${uid}"><use href="#ln-${uid}"/></clipPath>
    </defs>
    <path d="${s.bridge}" fill="none" stroke="${s.metalRim ? rim : frame}" stroke-width="${metalShape || s.metalRim ? 3.2 : s.sw}" stroke-linecap="round"/>
    ${s.topbar ? `<path d="${s.topbar}" fill="none" stroke="${frame}" stroke-width="2.6" stroke-linecap="round"/>` : ""}
    <g>${lens}</g>
    <g transform="matrix(-1 0 0 1 240 0)">${lens}</g>
  </svg>`;
}

/* ---------- Helpers ---------- */

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
  const roma = byId("roma");
  const holder = $("#heroGlasses");
  const sw = $("#heroSwatches");
  const heroSel = { frame: "tartaruga", lens: "ambar" };
  const heroLens = { tartaruga: "ambar", preto: "escuro", cristal: "verde", marinho: "escuro" };

  const draw = () => {
    holder.innerHTML = glassesSVG(roma, heroSel.frame, heroSel.lens);
    $("#heroColorName").textContent = `· ${FRAMES[heroSel.frame].label}`;
  };
  sw.innerHTML = roma.frames.map(k => swatchHTML("frame", k, k === heroSel.frame)).join("");
  sw.addEventListener("click", e => {
    const b = e.target.closest(".swatch");
    if (!b) return;
    heroSel.frame = b.dataset.key;
    heroSel.lens = heroLens[b.dataset.key];
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
    <button class="card__media" type="button" data-open="${p.id}" aria-label="Ver detalhes do modelo ${p.name}">
      ${glassesSVG(p, frame, lens)}
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
  $(".card__media", card).firstElementChild.outerHTML = glassesSVG(p, frame, lens);
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
      <div class="fav-item__img">${glassesSVG(p, s.frame, s.lens)}</div>
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
  return `
    <div class="pd__stage" id="pdStage">
      ${glassesSVG(p, frame, lens, { label: `Óculos ${p.name}, armação ${FRAMES[frame].label}, lente ${LENSES[lens].label}` })}
      <button class="heart" type="button" aria-pressed="${fav}" aria-label="${fav ? "Remover dos" : "Adicionar aos"} favoritos: ${p.name}" data-fav="${p.id}">
        <svg class="icon" aria-hidden="true"><use href="#i-heart"/></svg>
      </button>
      <p class="pd__hint" aria-hidden="true">Ilustração do modelo</p>
    </div>
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
      $(".pd__stage svg", body).outerHTML = glassesSVG(p, frame, lens, { label: `Óculos ${p.name}, armação ${FRAMES[frame].label}, lente ${LENSES[lens].label}` });
      $$(`.swatch[data-kind="${sw.dataset.kind}"]`, body).forEach(x => x.setAttribute("aria-checked", x === sw));
      $("#pdFrameName").textContent = `· ${FRAMES[frame].label}`;
      $("#pdLensName").textContent = `· ${LENSES[lens].label}`;
      $("#pdCta").href = waLink(productMessage(p));
      updateCard(id);
      syncFavUI();
      return;
    }
    const fav = e.target.closest("[data-fav]");
    if (fav) toggleFav(fav.dataset.fav);
  });

  // Inclinação do produto no detalhe
  body.addEventListener("pointermove", e => {
    const stage = e.target.closest("#pdStage");
    if (!stage || reduceMotion || e.pointerType !== "mouse") return;
    const r = stage.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - .5;
    const y = (e.clientY - r.top) / r.height - .5;
    $("svg", stage).style.transform = `rotateY(${x * 24}deg) rotateX(${-y * 16}deg) scale(1.03)`;
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
  const sample = byId(face.picks[0]);
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
      ${face.picks.map(pid => `<button type="button" data-face-pick="${pid}">${byId(pid).name}
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

window.Godoy = {
  PRODUCTS, FRAMES, LENSES, state, byId,
  glassesSVG, swatchHTML, waLink, productMessage, toast, updateCard,
  closeAllSheets: () => $$(".sheet").forEach(d => d.open && finishClose(d)),
};

/* ---------- Start ---------- */

wireWhatsApp();
initHero();
initCollection();
initFaces();
initDemo();
initFavs();
initSheets();
initChrome();
initReveal();
initCounters();
