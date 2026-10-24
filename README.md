# Godoy | Óculos Premium

Landing page / mostruário da coleção da [@godoy_oculos](https://www.instagram.com/godoy_oculos), com provador virtual.

Site estático (HTML, CSS e JavaScript puros), mobile first, sem etapa de build.

## Rodar localmente

```bash
python3 -m http.server 5173
```

Abra <http://localhost:5173>. A câmera do provador só funciona em `localhost` ou em `https`.

## Estrutura

| Arquivo | O que faz |
| --- | --- |
| `index.html` | Estrutura da página, ícones SVG e os modais (detalhe, favoritos, provador) |
| `styles.css` | Estilos mobile first, com breakpoints em 640px e 1024px |
| `script.js` | Catálogo, desenho dos óculos em SVG, filtros, favoritos, detalhe do produto e animações |
| `tryon.js` | Provador virtual: câmera, seletor de câmera, detecção facial e foto com os óculos |

## Catálogo

Os produtos ficam no array `PRODUCTS` em `script.js` (formato, cores de armação e lente, textos). As cores estão em `FRAMES` e `LENSES`, e os formatos desenhados em `SHAPES`.

> Somente o modelo **Roma** é real. Os demais nomes, cores, selos e indicações por formato de rosto são provisórios e devem ser revisados com a Godoy.

## Provador virtual

- Usa o [MediaPipe Face Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker) (`@mediapipe/tasks-vision@0.10.14`), carregado sob demanda.
- A detecção roda no aparelho; nenhuma imagem é enviada.
- Ajustes de encaixe no início de `tryon.js`: `FIT` (largura em relação ao rosto), `LIFT` e `ANCHOR_Y` (altura do centro das lentes por formato).
- Permite escolher a câmera (a escolha fica salva no navegador) ou enviar uma foto.

## Contato

WhatsApp usado nos botões: `+55 81 98288-8904` (constante `WHATSAPP` em `script.js`).
