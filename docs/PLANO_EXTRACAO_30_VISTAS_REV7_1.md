# Plano de Extração das 30 Vistas & Arquitetura do Site Técnico — `FASE6_ETAPA3_REV7_1`

Este documento registra a inspeção prévia do arquivo mestre [`FASE6_ETAPA3_REV7_1.blend`](file:///Users/abraao/.gemini/antigravity/scratch/gabinete_gog10/FASE6_ETAPA3_REV7_1.blend) e estabelece o plano completo de extração das **30 vistas fotorrealistas + 30 vistas técnicas correspondentes**, exportação **3D interativa `.glb`**, catálogo **dimensional completo (`813` itens BOM + `3` keepouts ref.)** e interface web de apresentação.

**Regra de fidelidade absoluta**: o arquivo `FASE6_ETAPA3_REV7_1.blend` permanece **intacto em modo somente leitura**; todas as explosões, cinemáticas abertas, rotações de porta e cortes visuais operam em memória/cópia temporária de apresentação usando exclusivamente `hide_render` e translações rígidas reversíveis, sem alterar ou criar geometria estrutural/fictícia.

---

## 1. Diagnóstico do `.blend` Inspecionado

- **Cena & Dimensões Globais Reais**: `Scene`, envoltória efetiva do conjunto `X = [-186,0; +108,0] mm` (`294,0 mm` profundidade), `Y = [-318,0; +118,0] mm` (`436,0 mm` largura), `Z = [0,0; +624,9] mm` (`624,9 mm` altura); centro geométrico `(-39,0; -100,0; 312,45) mm`.
- **Convenção de Faces no Modelo**:
  - **Frente (`+X = +108,0 mm`, `436 mm`)**: coluna `ColF` com `5` frisos cápsula + baía RF aberta do roteador `MR30G`.
  - **Traseira (`-X = -186,0 mm`, `436 mm`)**: grade limpa `3 × 4` `#ECEAE4` e `2` portas de clique `PELE_F6_PortaClic_Rear_T1_Cabos` / `T3_Hub`.
  - **Lateral Esquerda (`-Y = -318,0 mm`, `294 mm`)**: painéis lisos `PELE_F6_LatNegY_*` + plinto e fresta superior `8 mm`.
  - **Lateral Direita (`+Y = +118,0 mm`, `294 mm`)**: painéis `PELE_F6_LatPosY_*` + envoltório L da baía RF (`PELE_F6_LatPosY_BayWrap_T1`, `BayFrameFill_T2T3`, `Baia_FrenteBandeja_CornerRear`).
- **Inventário & Malhas**: **`827` objetos na cena** (`804 MESH`, `13 CURVE`, `1 EMPTY`, `8 LIGHT`, `1 CAMERA`; `91.601` polígonos, `117.532` vértices), `0` objetos ocultos no arquivo original (`hide_viewport=False`, `hide_render=False`). Todas as `804` malhas possuem material válido atribuído (`0` faces sem material; `170` objetos têm slot secundário vazio residual pós-booleana limpo apenas na cópia `.glb`).
- **Itens Auxiliares / Referência / Provisórios**:
  - `11` objetos de estúdio (`F5_*`, `F6_Studio_Floor`, `F6_Render_Cam`).
  - `3` volumes de keepout **a confirmar**: `PROVISORIO_VPS_REF_Clearance_{Blowers_A_CONFIRMAR,M2_Drives,RAM_Modules}` (ocultos nos renders fotorrealistas e identificáveis como keepouts de referência na documentação).
  - Demais peças comerciais/hardware **`PROVISORIO_*`** (`Fonte_Lenovo_135W`, `WallWarts 9V/12V`, `Fonte_5V_2A`, `Plugue_90G_AC`, `Plugue_IEC_C5`, `Hub_USBC`, `SSD_25_SATA`, `VPS_Bateria`, `Coolers 8015`, dimensões `JSSD2/blowers` e curva P-Q) explicitamente sinalizadas como **pendentes de aferição no paquímetro / bancada**.

---

## 2. Plano de Extração das 30 Vistas (6 Grupos × 5 Vistas)

Para cada uma das 30 câmeras são extraídas **2 renderizações**:
1. **`Modo 1` (Fotorrealista Cycles CPU `1440×1080`, `40–48` amostras + denoising)** mantendo paleta industrial `#ECEAE4`, cinza estrutural e preto fosco `#141619`.
2. **`Modo 2` (Vista Técnica `BLENDER_WORKBENCH` `1440×1080`, contornos + cavidade + câmera ortográfica quando ortogonal/elevação/planta/corte)** + projeção exata 2D (`world_to_camera_view`) dos pinos identificadores `[1..N]` direto das coordenadas reais no Blender.

| Nº | Grupo / Pasta | Arquivo Base | Modo de Cena / Visibilidade | Objetivo Técnico |
|---:|---|---|---|---|
| **01** | A (`externo/`) | `V01_vista_frontal_completa` | Conjunto completo (`PROVISORIO_VPS_REF_*` ocultos); `+X -> -X` | Volume frontal `+X`, `5` frisos `ColF`, baía RF aberta `MR30G` e juntas `2 mm` |
| **02** | A (`externo/`) | `V02_vista_traseira_completa` | Conjunto completo; `-X -> +X` | Grade `3×4` limpa `-X`, portas clique `T1_Cabos` / `T3_Hub` e plinto/gola oculta |
| **03** | A (`externo/`) | `V03_vista_lateral_esquerda` | Conjunto completo; `-Y -> +Y` | Face estreita `294 mm` em `-Y`, sombra basal `13 mm` e fresta `8 mm` no topo |
| **04** | A (`externo/`) | `V04_vista_lateral_direita` | Conjunto completo; `+Y -> -Y` | Face `+Y`, envoltório em L da baía RF e transição baía/carenagem |
| **05** | A (`externo/`) | `V05_vista_superior_isometrica_externa` | Conjunto completo; `+X/-Y/+Z` elevado | Silhueta `294,0 × 436,0 × 624,9 mm`, coroa `21 mm` e fresta perimetral `8 mm` |
| **06** | B (`interno/`) | `V06_isometrica_carenagem_removida` | `PELE_F6_*`, `AIR_Tela_Hex_*`, `BAIA_Plenum_Hex_*` ocultos | Arquitetura interna completa dos `4` andares sobre esqueleto e dutos |
| **07** | B (`interno/`) | `V07_frontal_arquitetura_interna` | Carenagem frontal `+X` oculta (laterais/traseira mantidas) | Alinhamento frontal interno de `ColF`, filtro `MOD4`, fonte `135 W` e `MR30G` |
| **08** | B (`interno/`) | `V08_traseira_arquitetura_interna` | Painéis/portas `-X` e almas traseiras ocultos | Acesso traseiro real: `Hub`, `SSD 2,5"`, I/O `LA-L161P`, `SW1`, `iCLAMPER`, `ONT`, cabos |
| **09** | B (`interno/`) | `V09_superior_disposicao_modulos` | `PELE_F6_LajeTopo_*` + `BAIA_Labirinto_Topo_*` ocultos; zenital `+Z` | Planta baixa `X×Y` dos módulos, topo chaminé `MOD3`, coletores e `4` antenas |
| **10** | B (`interno/`) | `V10_corte_longitudinal_lateral` | Face `-Y` e faixa `-Y` seletivamente ocultas p/ leitura em seção; `-Y -> +Y` | Empilhamento vertical `Z=0..624,9 mm` (`Plinto -> MOD1/2 -> MOD3 -> Deck -> MOD4 -> Topo`) |
| **11** | C (`modulos/`) | `V11_mod1_mercusys_mr30g` | Close baía `MOD1` sem painéis externos frontais/wrap | Roteador `MR30G` (`O1`), bandeja, selos móveis/fixos, plugues `90°` e trilhos `PC` |
| **12** | C (`modulos/`) | `V12_mod2_ont_fd511g` | Close cavidade `+Y` de `MOD2` sem pele lateral | `ONT FD511G` real (`PON` verde, `LAN`, LEDs), bandeja, abas e trilhos `PETG-CF` |
| **13** | C (`modulos/`) | `V13_mod3_fontes_eletrica_ventilacao` | Close cavidade `MOD3` (`Z=190..360`) sem pele `-X/-Y` | `iCLAMPER`, `3` fontes (`9V/12V/5V` prov.), `135 W`, blindagem `PC-ABS FR`, `FAN1`, `FAN2` |
| **14** | C (`modulos/`) | `V14_mod4_placa_mae_la_l161p` | Close `MOD4` (keepouts ref. visíveis no Técnico, ocultos no Foto) | Placa-mãe `LA-L161P`, bateria prov., `8` bossas `M2.5`, cassete bipartido, `Hub`, `SSD 2,5"` |
| **15** | C (`modulos/`) | `V15_vista_geral_4_modulos_relacoes` | Sem carenagem externa; `4` módulos deslocados em `ΔZ` em apresentação | Visão integrada dos `4` módulos (`MOD1..4`) + `Plinto`, volumes livres e interfaces |
| **16** | D (`estrutura/`) | `V16_sistema_gavetas_e_trilhos` | Laterais/frente seletivos ocultos; todas as `7` gavetas abertas em apresentação (`0,5×` intermed) | Cinemática real `C-in-C-in-T` (`MOD1`, `MOD2`, `iCLAMPER`, `135 W`, `Hub`, `SSD25`, `VPS`) |
| **17** | D (`estrutura/`) | `V17_detalhe_encaixes_e_guias` | Close macro em corrediça `MOD1`/`MOD4`, batente e patim `40 mm` | Folga `0,25 mm/lado`, batentes positivos `0,5×`, patins `MOD4_VPS` (`40/49,5 mm`) |
| **18** | D (`estrutura/`) | `V18_sistema_portas_e_travas` | Canto `-X/+Y` c/ `PortaClic T1/T3` rotacionadas `-95°` na dobradiça real | Dobradiças internas, pinos inox, `5` fechos *push-latch* (`tic-tac`) e trava `MOD1` |
| **19** | D (`estrutura/`) | `V19_estrutura_colunas_vigas` | Esqueleto estrutural isolado (sem `PELE_`, eletrônica ou dutos `AIR_`) | `26` colunas (`T1..T4`), `7` sapatas no piso, vigas `Y137/Y61`, travessas e `Viga_Arco` |
| **20** | D (`estrutura/`) | `V20_juncoes_estruturais_e_talas` | Close emendas `X=-38/-40` e reforços estruturais `H1b/H2` | Talas `FIX_Tala_Struct_*`, `Deck`, `Esq_N1_Y146`, suportes `BlowerDir`/`BayCheek` e `M3` |
| **21** | E (`termica-conectividade/`) | `V21_fluxo_ar_geral_gabinete` | Rede térmica `AIR_*`/`FAN*`/`MANUT_*`/`BAIA_Labirinto*` + envoltória ghost no Técnico | Rede contínua de fluxos `Plinto->MOD3->Chaminé` e `ColF->MOD4->Topo` (setas SVG esquemáticas) |
| **22** | E (`termica-conectividade/`) | `V22_ventilacao_mod3` | Subconjunto térmico `MOD3` + `FAN1/FAN2` + plinto/chaminé | Percurso independente: frestas plinto -> `Tela_Basal` -> `FAN1/FAN2` -> chaminé `32,67 cm²` |
| **23** | E (`termica-conectividade/`) | `V23_ventilacao_mod4_e_dissipacao` | `MOD4` c/ `LA-L161P`, blowers, heatpipes, coletores e divisor topo | Admissão `Filtro Frontal` + `ColF T3+T4 45°`, blowers, `4` coletores e divisor `MOD3/MOD4` |
| **24** | E (`termica-conectividade/`) | `V24_organizacao_cabos_alimentacao` | `13` cabos `CABO_ETAPA2_*` + fontes/placas + alívios de tração isolados | Roteamento "cabo único AC": entrada basal, distribuição `MOD3`, fibra, Ethernet, `USB-C`, `SATA` |
| **25** | E (`termica-conectividade/`) | `V25_antenas_roteador_afastamentos` | Superior-frontal focada na baía `MOD1` sem teto superior (`Z>250`) | `4` antenas `MR30G`, fendas `U`, recuo `MOD3_Rear_Transv`, `30,44 mm CF`, `34,52 mm metal` |
| **26** | F (`fabricacao/`) | `V26_explosao_axonometrica_conjunto` | Painéis `#ECEAE4` explodidos em `±X/±Y/+Z` e módulos escalonados | Visão explodida completa da arquitetura em camadas ("Cebola") e montagem modular |
| **27** | F (`fabricacao/`) | `V27_separacao_pecas_por_modulo` | Translação lateral ordenada em linha dos `5` blocos (`Plinto`, `MOD1`, `MOD2`, `MOD3`, `MOD4`) | Comparação `1:1` de densidade de peças e independência funcional por módulo |
| **28** | F (`fabricacao/`) | `V28_pecas_individuais_encaixes` | Subconjunto isolado de peças FDM pós-`H5` em arranjo expositivo | `BAIA_Plenum_Hex 45°`, `Chamine_Inf/Sup` (`1` ilha), friso `ColF + alma`, `Tala` e `Corredica` |
| **29** | F (`fabricacao/`) | `V29_principais_interfaces_montagem` | Close conjunto nas interfaces `FDM ↔ Ferragem ↔ Hardware` | Insertos `M2.5/M3`, `8` bossas `LA-L161P`, sapatas no `Piso_Basal`, encaixe da baía `4FendasU` |
| **30** | F (`fabricacao/`) | `V30_vista_geral_dimensoes_referencia` | Isométrica `3/4` limpa do conjunto completo + projeção exata dos eixos/cotas | Síntese dimensional: `294,0 × 436,0 × 624,9 mm`, andares `T1..T4`, plinto e referência geral |

---

## 3. Arquitetura de Software e Entrega

- **Fontes de Dados Estruturados (`/data/`)**:
  - `rev7_1_site_views.json`: metadados das `30` vistas, diretórios de imagem Modo 1/Modo 2, câmeras, objetos ocultos/movidos, e coordenadas 2D projetadas (`u%, v%`) dos componentes chamados.
  - `rev7_1_site_dimensions.json` & `.csv`: todas as `813` peças identificáveis do BOM + `3` keepouts de referência (total `816` registros técnicos), com `ID` (`GOG-001`..`GOG-813`), nome real no Blender, coleção, módulo funcional, dimensões montadas `(X, Y, Z)` em `mm`, dimensões considerando orientação de impressão FDM recomendada, volume (`cm³`), material confirmado/especificado, categoria e status de validação física.
  - `rev7_1_site_modules.json`: resumo dimensional e funcional de conjunto montado (envelope global, `Plinto`, `MOD1..MOD4`, equipamentos, `7` gavetas/bandejas, colunas/vigas e peças de maior porte — estritamente separado das medidas individuais).
  - `rev7_1_render_manifest.json`: relatório exato de correspondência vista ↔ objetos reais no `.blend`.
  - `GOG10_REV7_1.glb`: cena fiel convertida para WebGL/Three.js (sem alterações geométricas, curvas convertidas fielmente em malha tubular, slots nulos removidos em cópia temporária).
- **Aplicação Web (`/site/`)**:
  - Catálogo técnico editorial industrial em HTML5/CSS3/ES Modules + `Three.js` empacotado localmente em `site/vendor/three/` (zero dependência de CDN externo).
  - Quatro modalidades integradas (**Fotorrealista**, **Vista Técnica + SVG**, **Explodido Interativo 3D**, **Dimensional & Tabela Pesquisável CSV**), sincronizadas pelos mesmos identificadores de componente e módulo.
