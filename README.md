# GOG10 · Monólito Modular VPS — Apresentação Técnica REV7.1

Documentação visual, modelo 3D interativo e catálogo dimensional extraídos fielmente de `FASE6_ETAPA3_REV7_1.blend` (zero `.stl`/`.3mf` gerados nesta etapa CAD).

## Conteúdo publicado

- **30 Vistas Técnicas e Fotorrealistas (`60` PNGs)**: 6 grupos de 5 vistas em Modo Fotorrealista (Cycles) e Modo Técnico CAD (Workbench) com pinos interativos.
- **Explodido Interativo 3D (`Three.js` + `data/GOG10_REV7_1.glb`)**: separação por módulos, cinemática das 7 gavetas e 2 portas `-95°`, camadas e inspeção de peças.
- **Catálogo Dimensional (`816` registros)**: separação estrita entre dimensões da peça montada, orientação FDM recomendada (`220×220 mm`) e conjunto montado, com exportação CSV.

## Execução local

```bash
python3 -m http.server 8710
```

Abra `http://127.0.0.1:8710/` no navegador.

> **Nota técnica**: Esta publicação documenta o estado CAD Etapa 3 (`REV7.1`) e **não certifica aprovação física para impressão definitiva**; itens `PROVISORIO_*`, fluência (`E_creep`) e ensaios térmicos/elétricos aguardam medição com paquímetro e bancada antes da Etapa 4.
