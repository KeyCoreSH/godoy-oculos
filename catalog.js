/* ==========================================================================
   Godoy | Óculos Premium — catálogo e desenho dos óculos
   Compartilhado pelo site (script.js, tryon.js) e pelo painel (admin/).
   ========================================================================== */

const SUPABASE_URL = "https://jnrvelmomqrreytgpjre.supabase.co";
// Chave pública (publishable): só lê o que as regras do banco liberam.
const SUPABASE_KEY = "sb_publishable_HjRG4Y2sfzUFW8a7E4xLhw_3pMlmNRX";
const PHOTO_BUCKET = "produtos";

let WHATSAPP = "5581982888904";
let INSTAGRAM = "godoy_oculos";
let HERO_PRODUCT = "roma";

/* ---------- Catálogo padrão ----------
   Usado só se o Supabase não responder e não houver cópia salva no navegador.
   A coleção de verdade é editada no painel /admin. */

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

/* ---------- Leitura do Supabase ----------
   As listas acima são atualizadas no lugar (mesmos objetos), assim quem já
   guardou uma referência a PRODUCTS ou FRAMES continua vendo os dados novos. */

const CATALOG_CACHE = "godoy:catalog";

/* Os textos vêm do painel e entram no HTML do site: tira o que poderia virar código. */
const txt = v => String(v ?? "").replace(/[<>]/g, "").replace(/"/g, "”");
const css = v => v ? String(v).replace(/[^#\w\s(),.%-]/g, "") : v;

function rowToProduct(r) {
  return {
    id: r.id, name: txt(r.name), shape: r.shape, category: r.category, type: txt(r.type_label),
    badge: txt(r.badge), badgeShort: txt(r.badge_short), badgeGold: !!r.badge_gold,
    desc: txt(r.description), material: txt(r.material), faces: txt(r.faces),
    frames: r.frames || [], lenses: r.lenses || [], temple: r.temple || null,
    images: Array.isArray(r.images) ? r.images : [],
  };
}

function rowsToCatalog({ products, frames, lenses, categories, settings }) {
  return {
    frames: Object.fromEntries(frames.map(f => [f.key, {
      label: txt(f.label), color: css(f.color) || "#16181D",
      ...(f.swatch && { swatch: css(f.swatch) }), ...(f.pattern && { pattern: f.pattern }),
    }])),
    lenses: Object.fromEntries(lenses.map(l => [l.key, {
      label: txt(l.label), top: css(l.top_color), bottom: css(l.bottom_color), opacity: Number(l.opacity),
    }])),
    categories: categories.map(c => ({ id: c.id, label: txt(c.label) })),
    products: products.map(rowToProduct),
    settings: settings || {},
  };
}

function replaceObject(target, source) {
  Object.keys(target).forEach(k => delete target[k]);
  Object.assign(target, source);
}

function applyCatalog(c) {
  replaceObject(FRAMES, c.frames);
  replaceObject(LENSES, c.lenses);
  CATEGORIES.splice(0, CATEGORIES.length, { id: "todos", label: "Todos" }, ...c.categories);
  const firstFrame = Object.keys(FRAMES)[0], firstLens = Object.keys(LENSES)[0];
  const products = c.products
    .filter(p => SHAPES[p.shape])
    .map(p => {
      // Cores apagadas no painel somem do produto em vez de quebrar o desenho
      const frames = p.frames.filter(k => FRAMES[k]);
      const lenses = p.lenses.filter(k => LENSES[k]);
      return { ...p, frames: frames.length ? frames : [firstFrame], lenses: lenses.length ? lenses : [firstLens],
        temple: FRAMES[p.temple] ? p.temple : null };
    });
  PRODUCTS.splice(0, PRODUCTS.length, ...products);
  const s = c.settings;
  if (s.whatsapp) WHATSAPP = String(s.whatsapp).replace(/\D/g, "");
  if (s.instagram) INSTAGRAM = String(s.instagram).replace(/^@/, "");
  HERO_PRODUCT = PRODUCTS.some(p => p.id === s.hero_product) ? s.hero_product : (PRODUCTS[0]?.id ?? null);
}

async function fetchCatalog({ timeout = 6000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  const get = path => fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY }, signal: ctrl.signal,
  }).then(r => { if (!r.ok) throw new Error(`${path}: ${r.status}`); return r.json(); });
  try {
    const [products, frames, lenses, categories, settings] = await Promise.all([
      get("products?select=*&published=eq.true&order=position,name"),
      get("frame_colors?select=*&order=position,label"),
      get("lens_colors?select=*&order=position,label"),
      get("categories?select=*&order=position,label"),
      get("settings?select=*&id=eq.1"),
    ]);
    return rowsToCatalog({ products, frames, lenses, categories, settings: settings[0] });
  } finally {
    clearTimeout(timer);
  }
}

/* Busca a coleção; se falhar, usa a última cópia salva e, por fim, o catálogo padrão. */
async function loadCatalog() {
  try {
    const c = await fetchCatalog();
    if (c.products.length && Object.keys(c.frames).length && Object.keys(c.lenses).length) {
      applyCatalog(c);
      try { localStorage.setItem(CATALOG_CACHE, JSON.stringify(c)); } catch { /* sem storage */ }
      return "online";
    }
  } catch (err) {
    console.warn("Coleção indisponível no Supabase, usando cópia local.", err);
  }
  try {
    const cached = JSON.parse(localStorage.getItem(CATALOG_CACHE));
    if (cached) { applyCatalog(cached); return "cache"; }
  } catch { /* cópia inválida */ }
  return "padrao";
}

function photoURL(path) {
  return `${SUPABASE_URL}/storage/v1/object/public/${PHOTO_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/* Foto do produto para a cor de armação escolhida. Sem foto dessa cor, vale uma
   foto marcada como "todas as cores"; sem nenhuma, o site desenha a ilustração. */
function productPhoto(p, frameKey) {
  const imgs = p.images || [];
  return imgs.find(i => i.frame === frameKey) || imgs.find(i => !i.frame) || null;
}

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
