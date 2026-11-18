const NS = "http://www.w3.org/2000/svg";

function el(tag, attrs = {}, textContent = null) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v !== undefined && v !== null) node.setAttribute(k, String(v));
  }
  if (textContent !== null) node.textContent = textContent;
  return node;
}

/**
 * Renderiza pinos de chamada [1..N], setas esquematicas de fluxo de ar (quando aplicavel)
 * e cotas de referencia sobre o SVG alinhado [0..100] ao render real do Blender.
 */
export function renderSvgOverlay(svg, view, mode, options = {}) {
  svg.innerHTML = "";
  const { showPins = true, activeCalloutIdx = null, onSelectCallout = null } = options;

  // Definicoes de ponta de seta esquematica
  const defs = el("defs");
  const colors = new Set((view.esquematico_ar?.setas || []).map((s) => s.cor));
  for (const cor of colors) {
    const mid = `arrow-${cor.replace("#", "")}`;
    const marker = el("marker", {
      id: mid,
      viewBox: "0 0 10 10",
      refX: "8",
      refY: "5",
      markerWidth: "5",
      markerHeight: "5",
      orient: "auto-start-reverse",
    });
    marker.appendChild(el("path", { d: "M 0 1 L 10 5 L 0 9 z", fill: cor }));
    defs.appendChild(marker);
  }
  svg.appendChild(defs);

  // Setas esquematicas (exclusivamente V21, V22, V23)
  if (view.esquematico_ar?.ativo && Array.isArray(view.esquematico_ar.setas)) {
    const gAir = el("g", { opacity: "0.9" });
    for (const seta of view.esquematico_ar.setas) {
      const [x1, y1] = seta.from;
      const [x2, y2] = seta.to;
      const mid = `arrow-${seta.cor.replace("#", "")}`;
      gAir.appendChild(el("line", {
        x1, y1, x2, y2,
        stroke: "#ffffff",
        "stroke-width": "1.2",
        "stroke-linecap": "round",
        opacity: "0.75",
      }));
      gAir.appendChild(el("line", {
        x1, y1, x2, y2,
        stroke: seta.cor,
        "stroke-width": "0.65",
        "stroke-dasharray": "1.6 1.0",
        "stroke-linecap": "round",
        "marker-end": `url(#${mid})`,
      }));
    }
    svg.appendChild(gAir);
  }

  if (!showPins) return;

  const pins = mode === "tech" ? (view.chamadas_tech || []) : (view.chamadas_foto || []);
  for (const pin of pins) {
    if (!pin.in_frame) continue;
    const isActive = activeCalloutIdx === pin.index;
    const g = el("g", { class: "pin-hit" });

    // Anel externo se ativo
    if (isActive) {
      g.appendChild(el("circle", {
        cx: pin.x_pct, cy: pin.y_pct, r: "2.8",
        fill: "none", stroke: pin.modulo_cor || "#0f766e",
        "stroke-width": "0.45", opacity: "0.95",
      }));
    }

    // Sombra / Halo branco para legibilidade em fundos claros e escuros
    g.appendChild(el("circle", {
      cx: pin.x_pct, cy: pin.y_pct, r: isActive ? "2.0" : "1.65",
      fill: "#ffffff", opacity: "0.94",
    }));

    // Circulo numerado
    g.appendChild(el("circle", {
      cx: pin.x_pct, cy: pin.y_pct, r: isActive ? "1.65" : "1.35",
      fill: isActive ? (pin.modulo_cor || "#0f766e") : "#141619",
    }));

    g.appendChild(el("text", {
      x: pin.x_pct,
      y: pin.y_pct + 0.48,
      "text-anchor": "middle",
      "font-family": "SF Mono, Menlo, monospace",
      "font-size": isActive ? "1.55" : "1.35",
      "font-weight": "700",
      fill: "#ffffff",
    }, String(pin.index)));

    const title = el("title", {}, `[${pin.index}] ${pin.label} (${pin.obj_name})`);
    g.appendChild(title);

    if (onSelectCallout) {
      g.addEventListener("click", (ev) => {
        ev.stopPropagation();
        onSelectCallout(pin);
      });
    }
    svg.appendChild(g);
  }
}
