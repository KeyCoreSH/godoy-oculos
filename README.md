# Godoy | Óculos Premium

Landing page / mostruário da coleção da [@godoy_oculos](https://www.instagram.com/godoy_oculos), com provador virtual.

Site estático (HTML, CSS e JavaScript puros), mobile first, sem etapa de build. A coleção, as fotos e os ajustes ficam no Supabase e são editados no painel `/admin`.

- Site: <https://godoyoculos.com.br>
- Painel: <https://godoyoculos.com.br/admin/>

## Rodar localmente

```bash
python3 -m http.server 5173
```

Abra <http://localhost:5173>. A câmera do provador só funciona em `localhost` ou em `https`.

## Estrutura

| Arquivo | O que faz |
| --- | --- |
| `index.html` | Estrutura da página, ícones SVG e os modais (detalhe, favoritos, provador) |
| `catalog.js` | Leitura da coleção no Supabase, catálogo padrão e desenho dos óculos em SVG (usado pelo site e pelo painel) |
| `styles.css` | Estilos mobile first, com breakpoints em 640px e 1024px |
| `script.js` | Grade, filtros, favoritos, detalhe do produto (fotos ou ilustração) e animações |
| `tryon.js` | Provador virtual: câmera, seletor de câmera, detecção facial e foto com os óculos |
| `admin/` | Painel: login, modelos, fotos, cores, categorias e ajustes |
| `supabase/schema.sql` | Tabelas, regras de acesso (RLS) e bucket de fotos |
| `supabase/seed.sql` | Coleção inicial |
| `Dockerfile`, `nginx.conf` | Imagem usada no deploy do Coolify |

## Painel e banco (Supabase)

- Tabelas: `products`, `frame_colors`, `lens_colors`, `categories` e `settings` (WhatsApp, Instagram e modelo em destaque).
- Fotos no bucket público `produtos`. O painel reduz cada foto para no máximo 1600 px (WebP) antes de enviar.
- Cada foto pode ser marcada com uma cor de armação: o site troca a imagem quando o cliente escolhe a cor. Sem foto para a cor, o site mostra a ilustração em SVG.
- Leitura pública com a chave *publishable* (em `catalog.js`). Gravação só para o usuário com `app_metadata.role = "admin"`, garantida pelas regras RLS do banco.
- O login do painel aceita o usuário `godoy` (vira `godoy@godoyoculos.com.br` no Supabase Auth). A senha pode ser trocada em **Ajustes**.
- A chave secreta do Supabase não fica no repositório nem no site.
- Se o Supabase não responder, o site usa a última coleção salva no navegador ou o catálogo padrão de `catalog.js`.

Para recriar o banco em outro projeto: rode `supabase/schema.sql` e `supabase/seed.sql` e crie o usuário admin com `app_metadata: { "role": "admin" }`.

> Somente o modelo **Roma** é real. Os demais nomes, cores, selos e indicações por formato de rosto são provisórios e devem ser revisados com a Godoy pelo painel.

## Deploy

O Coolify (`admin.keycore.com.br`) constrói o `Dockerfile` (nginx) a partir da branch `main` e publica em `godoyoculos.com.br`. Ao mudar CSS ou JS, aumente o `?v=` correspondente nos HTML para furar o cache.

## Provador virtual

- Usa o [MediaPipe Face Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker) (`@mediapipe/tasks-vision@0.10.14`), carregado sob demanda.
- A detecção roda no aparelho; nenhuma imagem é enviada.
- Usa a ilustração do formato escolhido no painel (não as fotos).
- Ajustes de encaixe no início de `tryon.js`: `FIT` (largura em relação ao rosto), `LIFT` e `ANCHOR_Y` (altura do centro das lentes por formato).
- Permite escolher a câmera (a escolha fica salva no navegador) ou enviar uma foto.

## Contato

WhatsApp usado nos botões: `+55 81 98288-8904`, editável em **Ajustes** no painel.
