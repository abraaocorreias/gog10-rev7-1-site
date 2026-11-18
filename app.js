import { renderSvgOverlay } from "./calloutOverlay.js";
import { Gog3DViewer } from "./viewer3d.js";

const state = {
  viewsData: null,
  dimData: null,
  modData: null,
  manifestData: null,
  dimByName: {},
  dimById: {},
  activeSection: "overview",
  groupFilter: "ALL",
  renderMode: "foto", // "foto" | "tech"
  showPins: true,
  activeViewIdx: 0,
  activeCalloutIdx: null,
  zoom: 1,
  panX: 0,
  panY: 0,
  dimSearch: "",
  dimModule: "ALL",
  dimCategory: "ALL",
  dimSort: "id-asc",
  dimPage: 1,
  dimPerPage: 40,
  viewer3d: null,
};

const GROUP_HERO_MAP = [
  { grupo: "A", title: "Grupo A · Apresentação Externa", img: "./renders/externo/05_vista_superior_isometrica_externa.png", desc: "Frontal, traseira, laterais esquerda/direita e perspectiva 3/4 isométrica." },
  { grupo: "B", title: "Grupo B · Arquitetura Interna", img: "./renders/interno/06_isometrica_carenagem_removida.png", desc: "Carenagem removida, fachadas internas, planta superior +Z e corte longitudinal." },
  { grupo: "C", title: "Grupo C · Módulos e Equipamentos", img: "./renders/modulos/13_mod3_fontes_eletrica_ventilacao.png", desc: "MOD1 MR30G, MOD2 ONT, MOD3 Fontes, MOD4 LA-L161P e visão dos 4 andares." },
  { grupo: "D", title: "Grupo D · Estrutura e Mecanismos", img: "./renders/estrutura/16_sistema_gavetas_e_trilhos.png", desc: "7 gavetas e trilhos 3 estágios, batentes/patim H3, portas -95° e 26 colunas." },
  { grupo: "E", title: "Grupo E · Refrigeração e Conectividade", img: "./renders/termica-conectividade/21_fluxo_ar_geral_gabinete.png", desc: "Rede térmica 3D, circulação MOD3/MOD4, 13 cabos internos e afastamentos RF." },
  { grupo: "F", title: "Grupo F · Construção e Fabricação", img: "./renders/fabricacao/26_explosao_axonometrica_conjunto.png", desc: "Explosão axonométrica, módulos 1:1, peças individuais H5, interfaces e cotas." },
];

async function loadAllData() {
  const [vRes, dRes, mRes, manRes, propRes] = await Promise.all([
    fetch("./data/rev7_1_site_views.json").then((r) => r.json()),
    fetch("./data/rev7_1_site_dimensions.json").then((r) => r.json()),
    fetch("./data/rev7_1_site_modules.json").then((r) => r.json()),
    fetch("./data/rev7_1_render_manifest.json").then((r) => r.json()),
    fetch("./data/rev7_1_stl_propositos.json").then((r) => r.json()).catch(() => null),
  ]);
  state.viewsData = vRes;
  state.dimData = dRes;
  state.modData = mRes;
  state.manifestData = manRes;
  state.propData = propRes;
  for (const r of dRes.itens) {
    state.dimByName[r.nome] = r;
    state.dimById[r.id] = r;
  }
}

function fmtStatusBadge(status = "") {
  const s = status.toLowerCase();
  if (s.includes("provisório") || s.includes("pendente") || s.includes("confirmar")) {
    return `<span class="badge badge-warn">${status}</span>`;
  }
  if (s.includes("analítico")) {
    return `<span class="badge badge-neutral">${status}</span>`;
  }
  return `<span class="badge badge-ok">${status}</span>`;
}

function switchSection(sec) {
  state.activeSection = sec;
  document.querySelectorAll(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.section === sec));
  document.querySelectorAll(".page-section").forEach((el) => el.classList.toggle("active", el.id === `sec-${sec}`));
  if (sec === "viewer3d") {
    initViewerIfNeeded();
    setTimeout(() => state.viewer3d?.resize(), 60);
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function initOverview() {
  const pGrid = document.getElementById("propositos-stl-grid");
  if (pGrid && state.propData?.propositos) {
    pGrid.innerHTML = state.propData.propositos.map((p) => `
      <div class="panel-card" style="padding:18px 20px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap;margin-bottom:10px;">
          <div>
            <span class="vista-code-tag" style="margin-bottom:6px;display:inline-block;">${p.proposito}</span>
            <h4 style="margin:4px 0;font-size:1.05rem;">${p.titulo}</h4>
            <p class="small-note" style="margin:2px 0;"><strong>Propósito:</strong> ${p.objetivo}</p>
            <p class="small-note" style="margin:4px 0;color:#0f766e;"><strong>Como Montar:</strong> ${p.como_montar}</p>
            <p class="small-note" style="margin:2px 0;"><strong>Vistas de Referência no Site:</strong> <code>${p.vistas_ref}</code> · <strong>Total do Grupo:</strong> <code>${p.pecas} peças</code> em <code>${p.mesas_202x202} bandejas 202×202 mm</code> (~<code>${p.peso_estimado_g} g</code>)</p>
          </div>
          <a class="btn btn-primary" href="${p.zip_arquivo}" download style="text-decoration:none;white-space:nowrap;">⬇ Baixar ${p.proposito} (.ZIP · ${p.zip_mb} MB)</a>
        </div>
        <div class="table-scroll">
          <table class="mini-table" style="width:100%;">
            <thead>
              <tr>
                <th>Subgrupo Funcional</th>
                <th>Material de Impressão</th>
                <th>Cor Indicada</th>
                <th class="num">Peças</th>
                <th class="num">Bandejas 202×202</th>
                <th class="num">Peso Est.</th>
              </tr>
            </thead>
            <tbody>
              ${p.subgrupos.map((sb) => `
                <tr>
                  <td><code>${sb.subgrupo}</code><div class="small-note">${sb.funcao}</div></td>
                  <td><strong>${sb.material}</strong></td>
                  <td><span style="display:inline-block;width:12px;height:12px;border-radius:3px;background:${sb.cor_hex};border:1px solid #9ca3af;vertical-align:middle;margin-right:6px;"></span>${sb.cor}</td>
                  <td class="num">${sb.pecas}</td>
                  <td class="num">${sb.mesas_202x202}</td>
                  <td class="num"><strong>~${sb.peso_estimado_g} g</strong></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `).join("");
  }

  const gGrid = document.getElementById("groups-overview-grid");
  gGrid.innerHTML = GROUP_HERO_MAP.map((g) => `
    <article class="group-card" data-jump-group="${g.grupo}">
      <img src="${g.img}" alt="${g.title}" loading="lazy" />
      <div class="group-card-body">
        <span>5 VISTAS · MODO 1 &amp; 2</span>
        <h4>${g.title}</h4>
        <p>${g.desc}</p>
      </div>
    </article>
  `).join("");
  gGrid.querySelectorAll("[data-jump-group]").forEach((el) => {
    el.addEventListener("click", () => {
      state.groupFilter = el.dataset.jumpGroup;
      const firstIdx = state.viewsData.vistas.findIndex((v) => v.grupo === state.groupFilter);
      if (firstIdx >= 0) state.activeViewIdx = firstIdx;
      document.querySelectorAll("#vista-group-filters .pill").forEach((p) => p.classList.toggle("active", p.dataset.group === state.groupFilter));
      switchSection("vistas");
      renderVistasSection();
    });
  });

  const mGrid = document.getElementById("overview-modules-grid");
  mGrid.innerHTML = Object.entries(state.modData.modulos).map(([mid, m]) => `
    <div class="module-card" style="border-left-color: ${m.color}">
      <h4>${m.label}</h4>
      <p>${m.summary}</p>
      <div class="module-meta">
        <span>Objetos: ${m.contagem_objetos_cena} (${m.contagem_fdm} FDM)</span>
        <span>${m.conjunto_bbox_mm.dx}×${m.conjunto_bbox_mm.dy}×${m.conjunto_bbox_mm.dz} mm</span>
      </div>
    </div>
  `).join("");
}

function getFilteredViews() {
  if (!state.viewsData) return [];
  if (state.groupFilter === "ALL") return state.viewsData.vistas;
  return state.viewsData.vistas.filter((v) => v.grupo === state.groupFilter);
}

function applyZoomTransform() {
  const tr = document.getElementById("stage-transform");
  tr.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;
  document.getElementById("zoom-readout").textContent = `${Math.round(state.zoom * 100)}%`;
}

function resetZoom() {
  state.zoom = 1;
  state.panX = 0;
  state.panY = 0;
  applyZoomTransform();
}

function renderActiveStage() {
  const v = state.viewsData.vistas[state.activeViewIdx];
  if (!v) return;

  document.getElementById("stage-code").textContent = v.id;
  document.getElementById("stage-group").textContent = v.grupo_label;
  document.getElementById("stage-counter").textContent = `${v.num} / ${state.viewsData.vistas.length}`;
  document.getElementById("stage-title").textContent = v.titulo;
  document.getElementById("stage-subtitle").textContent = v.subtitulo;
  document.getElementById("stage-objetivo").textContent = v.objetivo;
  document.getElementById("stage-descricao").textContent = v.descricao;
  document.getElementById("stage-observacoes").textContent = v.observacoes;

  const tMeta = v.modo_tecnico_meta;
  document.getElementById("stage-tech-meta").textContent = state.renderMode === "tech"
    ? `Modo Técnico: ${tMeta.projecao}${tMeta.ortho_scale_mm ? ` (escala ${tMeta.ortho_scale_mm} mm)` : ""} · ${tMeta.motor}`
    : "Modo Fotorrealista: Cycles CPU c/ Denoising · Estética #ECEAE4 & #141619 fiel ao .blend";

  const img = document.getElementById("stage-img");
  img.src = `./${state.renderMode === "tech" ? v.tech_path : v.foto_path}`;
  img.alt = `${v.id} — ${v.titulo}`;

  const banner = document.getElementById("stage-schematic-banner");
  if (v.esquematico_ar?.ativo) {
    banner.textContent = v.esquematico_ar.aviso;
    banner.classList.remove("hidden");
  } else {
    banner.classList.add("hidden");
  }

  const cotaStrip = document.getElementById("stage-cota-strip");
  if (v.cotas_referencia && v.cotas_referencia.length > 0) {
    cotaStrip.innerHTML = v.cotas_referencia.map((c) => `
      <div class="cota-box">
        <span>${c.eixo}</span>
        <strong>${c.valor_mm}</strong>
        <small>${c.intervalo}</small>
      </div>
    `).join("");
    cotaStrip.classList.remove("hidden");
  } else {
    cotaStrip.classList.add("hidden");
  }

  const svg = document.getElementById("stage-svg-overlay");
  renderSvgOverlay(svg, v, state.renderMode, {
    showPins: state.showPins,
    activeCalloutIdx: state.activeCalloutIdx,
    onSelectCallout: (pin) => {
      state.activeCalloutIdx = pin.index;
      renderActiveStage();
    },
  });

  const pins = state.renderMode === "tech" ? v.chamadas_tech : v.chamadas_foto;
  const list = document.getElementById("stage-callouts-list");
  list.innerHTML = pins.map((p) => {
    const dimText = p.dim_mm ? `${p.dim_mm.x}×${p.dim_mm.y}×${p.dim_mm.z} mm` : "—";
    const activeCls = state.activeCalloutIdx === p.index ? "active" : "";
    return `
      <li class="callout-item ${activeCls}" data-pin-idx="${p.index}">
        <div class="callout-head">
          <span class="pin-num" style="background:${p.modulo_cor}">${p.index}</span>
          <span class="callout-title">${p.label}</span>
        </div>
        <p class="callout-desc">${p.funcao}</p>
        <div class="callout-specs">
          <span><code>${p.gog_id}</code></span>
          <span>${dimText}</span>
          ${fmtStatusBadge(p.status_validacao)}
          <button class="link-btn" data-inspect-obj="${p.obj_name}">Ficha Dimensional</button>
          <button class="link-btn" data-goto-3d="${p.obj_name}">Ver no 3D</button>
        </div>
      </li>
    `;
  }).join("");

  list.querySelectorAll(".callout-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      if (e.target.closest("button")) return;
      state.activeCalloutIdx = Number(item.dataset.pinIdx);
      renderActiveStage();
    });
  });

  list.querySelectorAll("[data-inspect-obj]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const rec = state.dimByName[btn.dataset.inspectObj];
      if (rec) openPartDrawer(rec);
    });
  });

  list.querySelectorAll("[data-goto-3d]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      switchSection("viewer3d");
      setTimeout(() => state.viewer3d?.focusPartByName(btn.dataset.goto3d), 300);
    });
  });
}

function renderThumbsGrid() {
  const list = getFilteredViews();
  document.getElementById("thumbs-count").textContent = `${list.length} vistas exibidas`;
  const grid = document.getElementById("vistas-thumbs-grid");
  grid.innerHTML = list.map((v) => {
    const src = `./${state.renderMode === "tech" ? v.tech_path : v.foto_path}`;
    const isAct = (v.num - 1) === state.activeViewIdx ? "active" : "";
    return `
      <article class="thumb-card ${isAct}" data-view-num="${v.num - 1}">
        <img src="${src}" alt="${v.id} ${v.titulo}" loading="lazy" />
        <div class="thumb-body">
          <span>${v.id} · ${v.grupo_label.split("—")[0].trim()}</span>
          <h5>${v.titulo}</h5>
        </div>
      </article>
    `;
  }).join("");

  grid.querySelectorAll(".thumb-card").forEach((card) => {
    card.addEventListener("click", () => {
      state.activeViewIdx = Number(card.dataset.viewNum);
      state.activeCalloutIdx = null;
      resetZoom();
      renderActiveStage();
      renderThumbsGrid();
      document.getElementById("vista-stage").scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  });
}

function renderVistasSection() {
  renderActiveStage();
  renderThumbsGrid();
}

function setupStageInteractions() {
  const vp = document.getElementById("stage-viewport");
  let dragging = false;
  let last = { x: 0, y: 0 };

  vp.addEventListener("wheel", (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    state.zoom = Math.max(1, Math.min(4.2, state.zoom * factor));
    if (state.zoom === 1) { state.panX = 0; state.panY = 0; }
    applyZoomTransform();
  }, { passive: false });

  vp.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".pin-hit")) return;
    dragging = true;
    last = { x: e.clientX, y: e.clientY };
  });
  window.addEventListener("pointermove", (e) => {
    if (!dragging || state.zoom <= 1) return;
    state.panX += e.clientX - last.x;
    state.panY += e.clientY - last.y;
    last = { x: e.clientX, y: e.clientY };
    applyZoomTransform();
  });
  window.addEventListener("pointerup", () => { dragging = false; });

  document.getElementById("btn-zoom-in").addEventListener("click", () => {
    state.zoom = Math.min(4.2, state.zoom * 1.25);
    applyZoomTransform();
  });
  document.getElementById("btn-zoom-out").addEventListener("click", () => {
    state.zoom = Math.max(1, state.zoom * 0.8);
    if (state.zoom === 1) { state.panX = 0; state.panY = 0; }
    applyZoomTransform();
  });
  document.getElementById("btn-zoom-reset").addEventListener("click", resetZoom);

  document.getElementById("btn-prev-view").addEventListener("click", () => {
    state.activeViewIdx = (state.activeViewIdx - 1 + 30) % 30;
    state.activeCalloutIdx = null;
    resetZoom();
    renderVistasSection();
  });
  document.getElementById("btn-next-view").addEventListener("click", () => {
    state.activeViewIdx = (state.activeViewIdx + 1) % 30;
    state.activeCalloutIdx = null;
    resetZoom();
    renderVistasSection();
  });

  document.querySelectorAll("#vista-group-filters .pill").forEach((pill) => {
    pill.addEventListener("click", () => {
      state.groupFilter = pill.dataset.group;
      document.querySelectorAll("#vista-group-filters .pill").forEach((p) => p.classList.remove("active"));
      pill.classList.add("active");
      const filtered = getFilteredViews();
      if (filtered.length > 0 && !filtered.some((v) => (v.num - 1) === state.activeViewIdx)) {
        state.activeViewIdx = filtered[0].num - 1;
        state.activeCalloutIdx = null;
      }
      renderVistasSection();
    });
  });

  document.querySelectorAll("[data-render-mode]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.renderMode = btn.dataset.renderMode;
      document.querySelectorAll("[data-render-mode]").forEach((b) => b.classList.toggle("active", b.dataset.renderMode === state.renderMode));
      renderVistasSection();
    });
  });

  document.getElementById("toggle-global-pins").addEventListener("change", (e) => {
    state.showPins = e.target.checked;
    renderActiveStage();
  });

  // Lightbox Tela Cheia
  const lb = document.getElementById("vista-lightbox");
  const openLb = () => {
    lb.classList.remove("hidden");
    renderLightbox();
  };
  document.getElementById("btn-fullscreen").addEventListener("click", openLb);
  document.getElementById("lb-close").addEventListener("click", () => lb.classList.add("hidden"));
  document.getElementById("lb-prev").addEventListener("click", () => {
    state.activeViewIdx = (state.activeViewIdx - 1 + 30) % 30;
    renderLightbox();
    renderVistasSection();
  });
  document.getElementById("lb-next").addEventListener("click", () => {
    state.activeViewIdx = (state.activeViewIdx + 1) % 30;
    renderLightbox();
    renderVistasSection();
  });
  document.getElementById("lb-toggle-pins").addEventListener("click", () => {
    state.showPins = !state.showPins;
    document.getElementById("toggle-global-pins").checked = state.showPins;
    renderLightbox();
    renderActiveStage();
  });
  document.querySelectorAll("[data-lb-mode]").forEach((b) => {
    b.addEventListener("click", () => {
      state.renderMode = b.dataset.lbMode;
      document.querySelectorAll("[data-render-mode]").forEach((x) => x.classList.toggle("active", x.dataset.renderMode === state.renderMode));
      renderLightbox();
      renderVistasSection();
    });
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !lb.classList.contains("hidden")) lb.classList.add("hidden");
    if (state.activeSection !== "vistas" && lb.classList.contains("hidden")) return;
    if (e.key === "ArrowLeft") {
      state.activeViewIdx = (state.activeViewIdx - 1 + 30) % 30;
      renderVistasSection();
      if (!lb.classList.contains("hidden")) renderLightbox();
    } else if (e.key === "ArrowRight") {
      state.activeViewIdx = (state.activeViewIdx + 1) % 30;
      renderVistasSection();
      if (!lb.classList.contains("hidden")) renderLightbox();
    }
  });
}

function renderLightbox() {
  const v = state.viewsData.vistas[state.activeViewIdx];
  document.getElementById("lb-code").textContent = v.id;
  document.getElementById("lb-title").textContent = v.titulo;
  document.getElementById("lb-img").src = `./${state.renderMode === "tech" ? v.tech_path : v.foto_path}`;
  document.getElementById("lb-caption").textContent = `${v.subtitulo} — ${v.observacoes}`;
  document.getElementById("lb-toggle-pins").textContent = state.showPins ? "Ocultar Pinos" : "Mostrar Pinos";
  document.querySelectorAll("[data-lb-mode]").forEach((b) => b.classList.toggle("active", b.dataset.lbMode === state.renderMode));
  renderSvgOverlay(document.getElementById("lb-svg"), v, state.renderMode, {
    showPins: state.showPins,
    activeCalloutIdx: state.activeCalloutIdx,
    onSelectCallout: (pin) => { state.activeCalloutIdx = pin.index; renderLightbox(); renderActiveStage(); },
  });
}

function initViewerIfNeeded() {
  if (state.viewer3d) return;
  const host = document.getElementById("three-canvas-host");
  state.viewer3d = new Gog3DViewer(host, state.dimByName, state.modData.modulos, (rec) => {
    const body = document.getElementById("selection3d-body");
    if (!rec) return;
    const mod = state.modData.modulos[rec.modulo_id] || {};
    const d = rec.dim_montada_mm;
    const o = rec.orientacao_impressao;
    body.className = "selection-kv";
    body.innerHTML = `
      <div><span class="vista-code-tag">${rec.id || "OBJ"}</span> <code>${rec.nome}</code></div>
      <div><strong>Módulo:</strong> ${mod.label || rec.modulo_id}</div>
      <div><strong>Função:</strong> ${rec.funcao || "—"}</div>
      <div><strong>Dimensões Montadas:</strong> ${d ? `${d.x} × ${d.y} × ${d.z} mm` : "—"}</div>
      ${o?.aplicavel ? `<div><strong>Orientação FDM (Mesa XY × Z):</strong> ${o.mesa_x_mm} × ${o.mesa_y_mm} × ${o.altura_z_mm} mm</div>` : ""}
      <div><strong>Volume:</strong> ${rec.volume_cm3 ?? "N/A"} cm³ · <strong>Material:</strong> ${rec.material || "—"}</div>
      <div>${fmtStatusBadge(rec.status_validacao || "Confirmado em CAD")}</div>
      <div><button class="link-btn" id="btn3d-open-drawer">Abrir Ficha Dimensional Completa</button></div>
    `;
    document.getElementById("btn3d-open-drawer")?.addEventListener("click", () => {
      if (rec.id && state.dimById[rec.id]) openPartDrawer(state.dimById[rec.id]);
    });
  });
  state.viewer3d.init();

  const layerList = document.getElementById("layer-toggles-list");
  layerList.innerHTML = Object.entries(state.modData.modulos).map(([mid, m]) => {
    const checked = mid !== "MOD4_VPS_REF" ? "checked" : "";
    return `
      <label class="layer-row">
        <span class="layer-left">
          <input type="checkbox" data-layer-id="${mid}" ${checked} />
          <span class="swatch" style="background:${m.color}"></span>
          <span>${m.short} (${m.contagem_objetos_cena})</span>
        </span>
      </label>
    `;
  }).join("");

  layerList.querySelectorAll("[data-layer-id]").forEach((cb) => {
    cb.addEventListener("change", (e) => {
      state.viewer3d.setModuleVisibility(e.target.dataset.layerId, e.target.checked);
    });
  });

  document.getElementById("slider-explode").addEventListener("input", (e) => {
    document.getElementById("val-explode").textContent = `${e.target.value}%`;
    state.viewer3d.setExplode(Number(e.target.value));
  });
  document.getElementById("slider-drawers").addEventListener("input", (e) => {
    document.getElementById("val-drawers").textContent = `${e.target.value}%`;
    state.viewer3d.setDrawers(Number(e.target.value));
  });
  document.querySelectorAll("[data-cam3d]").forEach((b) => {
    b.addEventListener("click", () => state.viewer3d.setPreset(b.dataset.cam3d));
  });
  document.getElementById("btn3d-wire-edges").addEventListener("click", (e) => {
    const on = state.viewer3d.toggleEdges();
    e.target.classList.toggle("active", on);
  });
  document.getElementById("btn3d-reset").addEventListener("click", () => {
    document.getElementById("slider-explode").value = 0;
    document.getElementById("slider-drawers").value = 0;
    document.getElementById("val-explode").textContent = "0%";
    document.getElementById("val-drawers").textContent = "0%";
    state.viewer3d.setExplode(0);
    state.viewer3d.setDrawers(0);
    state.viewer3d.setPreset("iso");
  });
  document.getElementById("btn3d-show-all").addEventListener("click", () => {
    layerList.querySelectorAll("[data-layer-id]").forEach((cb) => {
      if (cb.dataset.layerId !== "MOD4_VPS_REF") {
        cb.checked = true;
        state.viewer3d.setModuleVisibility(cb.dataset.layerId, true);
      }
    });
  });
  document.getElementById("btn3d-hide-skin").addEventListener("click", () => {
    ["CARENAGEM_PELE", "TERMO_ENVOLTORIA"].forEach((mid) => {
      const cb = layerList.querySelector(`[data-layer-id="${mid}"]`);
      if (cb) cb.checked = false;
      state.viewer3d.setModuleVisibility(mid, false);
    });
  });
}

function initDimensionalSection() {
  // Preenche tabelas resumo de conjuntos (nunca confundir com peca individual)
  document.querySelector("#dim-modules-table tbody").innerHTML = Object.values(state.modData.modulos).map((m) => `
    <tr>
      <td><span class="swatch" style="background:${m.color};display:inline-block;margin-right:6px"></span>${m.short}</td>
      <td>${m.contagem_objetos_cena} (${m.contagem_fdm} FDM)</td>
      <td>${m.conjunto_bbox_mm.dx} × ${m.conjunto_bbox_mm.dy} × ${m.conjunto_bbox_mm.dz}</td>
    </tr>
  `).join("");

  document.querySelector("#dim-equip-table tbody").innerHTML = state.dimData.dimensoes_equipamentos_conjunto.map((eq) => `
    <tr>
      <td><strong>${eq.equipamento}</strong><br><small>${eq.submalhas_count} submalhas · Z=[${eq.z_band_mm[0]}; ${eq.z_band_mm[1]}]</small></td>
      <td>${eq.dx_mm} × ${eq.dy_mm} × ${eq.dz_mm}</td>
      <td><small>${eq.observacao}</small></td>
    </tr>
  `).join("");

  document.querySelector("#dim-largest-table tbody").innerHTML = state.dimData.maiores_pecas_fdm.slice(0, 10).map((p) => `
    <tr>
      <td><code>${p.id}</code></td>
      <td>${p.nome}</td>
      <td>${p.max_mm} mm</td>
      <td>${p.vol_cm3}</td>
    </tr>
  `).join("");

  document.querySelector("#dim-drawers-table tbody").innerHTML = state.dimData.gavetas_auditadas.map((g) => {
    const a = g.criterio_a_flecha;
    const b = g.criterio_b_tensoes_FoS;
    const d = g.criterio_d_extracao;
    const e = g.criterio_e_sobreposicao_estab;
    const elast = a.fluencia_elastica_E630_mm;
    const drop = a.queda_folga_acumulada_2est_mm ?? a.queda_folga_canal_patim_mm ?? 0;
    return `
      <tr>
        <td><strong>${g.gaveta}</strong></td>
        <td>${g.curso_mm} mm</td>
        <td class="num">${g.W_dead_N} / ${g.W_crit_N}</td>
        <td class="num">${b.FoS_dead_Z22}× / ${b.FoS_crit_Z22}×</td>
        <td class="num">${elast} + ${drop} = <strong>${a.flecha_total_creep_2est_mm}</strong></td>
        <td class="num">${a.limite_mm}</td>
        <td class="num">${e.engaste_S2_S1_mm} / ${e.engaste_S3_S2_mm}</td>
        <td class="num">${d.F_extracao_dead_N} / ${d.F_extracao_crit_N}</td>
      </tr>
    `;
  }).join("");

  const modSelect = document.getElementById("dim-filter-module");
  for (const [mid, m] of Object.entries(state.modData.modulos)) {
    const opt = document.createElement("option");
    opt.value = mid;
    opt.textContent = `${m.short} (${m.contagem_objetos_cena})`;
    modSelect.appendChild(opt);
  }

  document.getElementById("dim-search").addEventListener("input", (e) => {
    state.dimSearch = e.target.value.trim().toLowerCase();
    state.dimPage = 1;
    renderMainDimTable();
  });
  modSelect.addEventListener("change", (e) => { state.dimModule = e.target.value; state.dimPage = 1; renderMainDimTable(); });
  document.getElementById("dim-filter-category").addEventListener("change", (e) => { state.dimCategory = e.target.value; state.dimPage = 1; renderMainDimTable(); });
  document.getElementById("dim-sort").addEventListener("change", (e) => { state.dimSort = e.target.value; renderMainDimTable(); });
  document.getElementById("btn-export-csv").addEventListener("click", exportFilteredCsv);
  document.getElementById("pd-close").addEventListener("click", () => document.getElementById("part-detail-drawer").classList.add("hidden"));

  renderMainDimTable();
}

function getFilteredDimRows() {
  let rows = state.dimData.itens.filter((r) => {
    if (state.dimModule !== "ALL" && r.modulo_id !== state.dimModule) return false;
    if (state.dimCategory !== "ALL" && r.categoria !== state.dimCategory) return false;
    if (state.dimSearch) {
      const hay = `${r.id} ${r.nome} ${r.material} ${r.modulo_label} ${r.colecao}`.toLowerCase();
      if (!hay.includes(state.dimSearch)) return false;
    }
    return true;
  });

  const sorters = {
    "id-asc": (a, b) => a.id.localeCompare(b.id),
    "max-desc": (a, b) => b.dim_montada_mm.max - a.dim_montada_mm.max,
    "x-desc": (a, b) => b.dim_montada_mm.x - a.dim_montada_mm.x,
    "y-desc": (a, b) => b.dim_montada_mm.y - a.dim_montada_mm.y,
    "z-desc": (a, b) => b.dim_montada_mm.z - a.dim_montada_mm.z,
    "vol-desc": (a, b) => (b.volume_cm3 || -1) - (a.volume_cm3 || -1),
    "name-asc": (a, b) => a.nome.localeCompare(b.nome),
  };
  return rows.sort(sorters[state.dimSort] || sorters["id-asc"]);
}

function renderMainDimTable() {
  const rows = getFilteredDimRows();
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / state.dimPerPage));
  if (state.dimPage > pages) state.dimPage = pages;
  const start = (state.dimPage - 1) * state.dimPerPage;
  const slice = rows.slice(start, start + state.dimPerPage);

  document.getElementById("table-count-label").textContent = `Exibindo ${slice.length} (total filtrado: ${total} de ${state.dimData.itens.length} itens)`;

  const tbody = document.getElementById("dim-main-tbody");
  tbody.innerHTML = slice.map((r) => {
    const o = r.orientacao_impressao;
    const oriTxt = o.aplicavel ? `${o.mesa_x_mm} × ${o.mesa_y_mm} × ${o.altura_z_mm}` : "N/A (Não FDM)";
    return `
      <tr data-row-id="${r.id}">
        <td><code>${r.id}</code></td>
        <td><strong>${r.nome}</strong></td>
        <td><span class="mod-pill"><span class="swatch" style="background:${r.modulo_cor}"></span>${r.modulo_label}</span></td>
        <td class="num">${r.dim_montada_mm.x}</td>
        <td class="num">${r.dim_montada_mm.y}</td>
        <td class="num">${r.dim_montada_mm.z}</td>
        <td><code>${oriTxt}</code></td>
        <td class="num">${r.volume_cm3 !== null ? r.volume_cm3 : "—"}</td>
        <td>${r.material}</td>
        <td class="num">${r.quantidade}</td>
        <td>${fmtStatusBadge(r.status_validacao)}</td>
      </tr>
    `;
  }).join("");

  tbody.querySelectorAll("tr").forEach((tr) => {
    tr.addEventListener("click", () => {
      const rec = state.dimById[tr.dataset.rowId];
      if (rec) openPartDrawer(rec);
    });
  });

  const pag = document.getElementById("dim-pagination");
  pag.innerHTML = `
    <span>Página ${state.dimPage} de ${pages}</span>
    <div style="display:flex;gap:8px">
      <button class="tool-btn" id="pg-prev" ${state.dimPage <= 1 ? "disabled" : ""}>← Anterior</button>
      <button class="tool-btn" id="pg-next" ${state.dimPage >= pages ? "disabled" : ""}>Próxima →</button>
    </div>
  `;
  document.getElementById("pg-prev")?.addEventListener("click", () => { if (state.dimPage > 1) { state.dimPage--; renderMainDimTable(); } });
  document.getElementById("pg-next")?.addEventListener("click", () => { if (state.dimPage < pages) { state.dimPage++; renderMainDimTable(); } });
}

function openPartDrawer(r) {
  const drawer = document.getElementById("part-detail-drawer");
  document.getElementById("pd-id").textContent = r.id;
  document.getElementById("pd-name").textContent = r.nome;
  const o = r.orientacao_impressao;
  document.getElementById("pd-content").innerHTML = `
    <div class="meta-box">
      <div><strong>Módulo:</strong> ${r.modulo_label} (<code>${r.modulo_id}</code>)</div>
      <div><strong>Categoria:</strong> ${r.categoria} · <strong>Coleção Blender:</strong> <code>${r.colecao}</code></div>
      <div><strong>Função Técnica:</strong> ${r.funcao}</div>
    </div>
    <div class="meta-box">
      <div><strong>1. Dimensão Real Montada:</strong> ${r.dim_montada_mm.x} × ${r.dim_montada_mm.y} × ${r.dim_montada_mm.z} mm (máx: ${r.dim_montada_mm.max} mm)</div>
      <div><strong>Coordenadas no Gabinete (mm):</strong> X=[${r.bbox_mm.x0}; ${r.bbox_mm.x1}] · Y=[${r.bbox_mm.y0}; ${r.bbox_mm.y1}] · Z=[${r.bbox_mm.z0}; ${r.bbox_mm.z1}]</div>
      <div><strong>2. Orientação de Impressão FDM:</strong> ${o.aplicavel ? `${o.mesa_x_mm} × ${o.mesa_y_mm} mm na mesa XY · ${o.altura_z_mm} mm em Z (${o.regra})` : o.regra}</div>
      <div><strong>Volume Sólido:</strong> ${r.volume_cm3 !== null ? `${r.volume_cm3} cm³` : "Não aplicável (curva/referência)"}</div>
      <div><strong>Material Especificado:</strong> ${r.material} (<code>${r.material_blender}</code>)</div>
      <div><strong>Status:</strong> ${fmtStatusBadge(r.status_validacao)}</div>
    </div>
    <button class="btn btn-primary" id="pd-focus-3d" style="width:100%">Localizar Peça no Modelo 3D Interativo</button>
  `;
  drawer.classList.remove("hidden");
  document.getElementById("pd-focus-3d").addEventListener("click", () => {
    drawer.classList.add("hidden");
    switchSection("viewer3d");
    setTimeout(() => state.viewer3d?.focusPartByName(r.nome), 320);
  });
}

function exportFilteredCsv() {
  const rows = getFilteredDimRows();
  const cols = ["ID", "Peca", "Modulo", "X_mm", "Y_mm", "Z_mm", "Print_X_mm", "Print_Y_mm", "Print_Z_mm", "Volume_cm3", "Material", "Quantidade", "Status"];
  const lines = [cols.join(",")];
  for (const r of rows) {
    const o = r.orientacao_impressao;
    const vals = [
      r.id, r.nome, r.modulo_label,
      r.dim_montada_mm.x, r.dim_montada_mm.y, r.dim_montada_mm.z,
      o.aplicavel ? o.mesa_x_mm : "", o.aplicavel ? o.mesa_y_mm : "", o.aplicavel ? o.altura_z_mm : "",
      r.volume_cm3 ?? "", r.material, r.quantidade, r.status_validacao,
    ].map((v) => `"${String(v).replaceAll('"', '""')}"`);
    lines.push(vals.join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "gog10_rev7_1_dimensoes.csv";
  a.click();
}

function initTraceabilitySection() {
  document.getElementById("trace-pending-list").innerHTML = state.modData.pendencias_validacao_fisica
    .map((p) => `<li>${p}</li>`)
    .join("");

  const au = state.modData.auditoria_resumo;
  const pq3 = au.pq_mod3;
  const pq4 = au.pq_mod4;
  document.getElementById("trace-audit-summary").innerHTML = `
    <table class="mini-table">
      <tbody>
        <tr><td>Conectividade BVH 0,65 mm FIRME</td><td><strong>${au.bfs_firmes}</strong> (0 estruturais soltas)</td></tr>
        <tr><td>Topologia FDM H5</td><td><strong>${au.fdm_topologia_ok}</strong></td></tr>
        <tr><td>Colisões fora da lista / Cinemática</td><td><strong>${au.colisoes_non_nominal} non-nominal</strong> · <strong>${au.cinematica}</strong></td></tr>
        <tr><td>Afastamento RF Antenas</td><td>Metal min <strong>${au.rf_min_metal_mm} mm</strong> · PETG-CF min <strong>${au.rf_min_cf_mm} mm</strong></td></tr>
        <tr><td>Vazamentos Ópticos (8 Câmeras)</td><td><strong>${au.ray_leaks_8cams}</strong> · Pior tombamento <strong>${au.tombamento_min_deg}°</strong></td></tr>
        <tr><td>Áreas BVH Principais (cm²)</td><td>Plinto <strong>${au.termica_areas_cm2.Plinto_Labirinto_Chicane_Interna_cm2}</strong> · Tela Basal <strong>${au.termica_areas_cm2.PisoBasal_Janela_Tela_Basal_efetiva_cm2}</strong> · ColF T1T2/T3T4 <strong>${au.termica_areas_cm2.ColF_Frisos_Chevron_MOD1_MOD3_T1T2_cm2} / ${au.termica_areas_cm2.ColF_Frisos_Chevron_MOD4_T3T4_cm2}</strong> · Chaminé <strong>${au.termica_areas_cm2.MOD3_Coletor_Deck_e_Chamine_ByPass_cm2}</strong></td></tr>
        <tr><td>P-Q Analítico MOD3 (Sigma_K=5,36)</td><td><strong>${pq3.operating_point_CFM} CFM @ ${pq3.operating_pressure_drop_Pa} Pa</strong> · ΔT(22/35W)=<strong>${pq3.predicted_air_deltaT_at_22W_C}/${pq3.predicted_air_deltaT_at_35W_C} °C</strong> (não medido em bancada)</td></tr>
        <tr><td>Ramal MOD4 (Ref. analítica 26 CFM/130 Pa)</td><td>dP invólucro = <strong>${pq4.contrapressao_estimada_100pct_Pa} Pa (${pq4.fracao_shutoff_estimada_pct}%)</strong> (curva real pendente)</td></tr>
      </tbody>
    </table>
  `;

  document.getElementById("manifest-tbody").innerHTML = state.manifestData.vistas.map((m) => `
    <tr>
      <td><span class="vista-code-tag">${m.vista_id}</span></td>
      <td><code>${m.foto_arquivo}</code><br><code>${m.tecnica_arquivo}</code></td>
      <td><small>Foto: lens ${m.camera_foto.lens_mm} mm<br>Téc: ${m.camera_tech.tipo}${m.camera_tech.ortho_scale_mm ? ` (${m.camera_tech.ortho_scale_mm} mm)` : ""}</small></td>
      <td class="num">${m.objetos_visiveis_count}</td>
      <td class="num">${m.objetos_ocultos_count}</td>
      <td>${m.transformacao_apresentacao_aplicada ? "Sim (cópia)" : "Original"}</td>
      <td><small>${m.objetos_identificados_nos_pinos.join(", ")}</small></td>
    </tr>
  `).join("");
}

async function bootstrap() {
  document.querySelectorAll(".nav-btn").forEach((b) => b.addEventListener("click", () => switchSection(b.dataset.section)));
  document.querySelectorAll("[data-jump-section]").forEach((b) => b.addEventListener("click", () => switchSection(b.dataset.jumpSection)));

  await loadAllData();
  initOverview();
  setupStageInteractions();
  renderVistasSection();
  initDimensionalSection();
  initTraceabilitySection();
}

bootstrap().catch((err) => {
  console.error("Erro inicializando site REV7.1:", err);
});
