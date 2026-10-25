-- Coleção inicial (gerada a partir do catálogo original do site)
insert into public.categories (id, label, position) values
  ('redondo', 'Redondo', 0),
  ('quadrado', 'Quadrado', 1),
  ('clubmaster', 'Clubmaster', 2),
  ('aviador', 'Aviador', 3),
  ('gatinho', 'Gatinho', 4),
  ('geometrico', 'Geométrico', 5),
  ('madeira', 'Madeira', 6)
on conflict (id) do nothing;

insert into public.frame_colors (key, label, color, swatch, pattern, position) values
  ('preto', 'Preto', '#16181D', null, null, 0),
  ('tartaruga', 'Tartaruga', null, 'radial-gradient(circle at 30% 30%, #A8692F 0 18%, #6B3D1C 19% 46%, #2B1508 47% 60%, #8A5A2B 61%)', 'tortoise', 1),
  ('cristal', 'Cristal', '#C9D2DA', null, null, 2),
  ('fume', 'Fumê', '#55585E', null, null, 3),
  ('marinho', 'Azul-marinho', '#1E2A44', null, null, 4),
  ('vinho', 'Vinho', '#5B1F2A', null, null, 5),
  ('dourado', 'Dourado', '#BF9A57', 'linear-gradient(135deg, #E3C88E, #A9844F)', null, 6),
  ('prata', 'Prata', '#A9ADB3', 'linear-gradient(135deg, #E1E3E6, #8E9298)', null, 7),
  ('madeira', 'Madeira', null, 'repeating-linear-gradient(100deg, #8B5A33 0 3px, #A87545 3px 6px, #7A4C2A 6px 8px)', 'wood', 8)
on conflict (key) do nothing;

insert into public.lens_colors (key, label, top_color, bottom_color, opacity, position) values
  ('escuro', 'Escura G15', '#2C2E33', '#0D0E11', 0.93, 0),
  ('ambar', 'Âmbar', '#D9A257', '#93591F', 0.86, 1),
  ('verde', 'Verde', '#56624A', '#242A1F', 0.92, 2),
  ('marrom', 'Marrom degradê', '#4A2F1D', '#C8986A', 0.86, 3),
  ('azul', 'Azul espelhada', '#5B8FC4', '#132F50', 0.92, 4),
  ('rose', 'Rosé', '#D9A094', '#9A5A50', 0.78, 5)
on conflict (key) do nothing;

insert into public.products (id, name, shape, category, type_label, badge, badge_short, badge_gold, description, material, faces, frames, lenses, temple, position) values
  ('roma', 'Roma', 'redondo', 'redondo', 'Redondo · Acetato', 'Várias cores', null, false, 'O redondo clássico, com armação encorpada em acetato. Disponível em várias cores para combinar com o seu estilo.', 'Acetato', 'Quadrado, coração', array['tartaruga','preto','cristal','marinho']::text[], array['ambar','escuro','verde']::text[], null, 0),
  ('siena', 'Siena', 'wayfarer', 'quadrado', 'Wayfarer · Acetato', 'Campeão de vendas', 'Top vendas', true, 'Linhas retas e ponte reforçada. Um ícone atemporal que vai bem com tudo, do dia a dia à praia.', 'Acetato', 'Redondo, oval', array['preto','tartaruga','fume']::text[], array['escuro','verde','marrom']::text[], null, 1),
  ('milano', 'Milano', 'clubmaster', 'clubmaster', 'Clubmaster · Misto', null, null, false, 'Sobrancelha em acetato com aro metálico dourado. Elegância retrô com acabamento refinado.', 'Acetato + metal', 'Oval, coração', array['tartaruga','preto','marinho']::text[], array['marrom','escuro','verde']::text[], null, 2),
  ('firenze', 'Firenze', 'wayfarer', 'madeira', 'Wayfarer · Madeira', 'Madeira reciclável', 'Madeira', false, 'Frente em acetato e hastes de madeira reciclável. Leve, confortável e com um toque natural.', 'Acetato + madeira reciclável', 'Redondo, oval', array['preto','tartaruga','madeira']::text[], array['escuro','ambar','verde']::text[], 'madeira', 3),
  ('amalfi', 'Amalfi', 'aviador', 'aviador', 'Aviador · Metal', null, null, false, 'A gota clássica com ponte dupla e metal leve. Feito para dias de sol forte.', 'Metal', 'Quadrado, coração, oval', array['dourado','prata','preto']::text[], array['verde','escuro','azul']::text[], null, 4),
  ('capri', 'Capri', 'quadrado', 'quadrado', 'Quadrado · Oversized', 'Novo', null, false, 'Quadrado amplo, com presença e proteção extra. O preferido para quem gosta de óculos marcantes.', 'Acetato', 'Redondo, oval', array['preto','tartaruga','cristal','vinho']::text[], array['escuro','marrom','rose']::text[], null, 5),
  ('verona', 'Verona', 'gatinho', 'gatinho', 'Gatinho · Acetato', null, null, false, 'Cantos elevados que realçam o olhar. Feminino, sofisticado e cheio de atitude.', 'Acetato', 'Oval, quadrado', array['preto','tartaruga','vinho','cristal']::text[], array['escuro','rose','marrom']::text[], null, 6),
  ('napoli', 'Napoli', 'hexagonal', 'geometrico', 'Hexagonal · Metal', null, null, false, 'Geometria leve em metal fino. Moderno, discreto e fácil de usar.', 'Metal', 'Redondo, oval', array['dourado','prata','preto']::text[], array['verde','escuro','ambar']::text[], null, 7)
on conflict (id) do nothing;

update public.settings set hero_product = 'roma' where id = 1 and hero_product is null;
