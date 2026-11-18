import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/**
 * Visualizador 3D Interativo (Modo 3 — Explodido, Camadas, Cinematica & Selecao).
 * Opera exclusivamente sobre a copia WebGL derivada do .blend (sem modificar a geometria real).
 */
export class Gog3DViewer {
  constructor(hostEl, dimByName, modulesMeta, onSelectPart) {
    this.host = hostEl;
    this.dimByName = dimByName;
    this.modulesMeta = modulesMeta;
    this.onSelectPart = onSelectPart;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.rootGroup = null;
    this.meshes = [];
    this.edgesVisible = false;
    this.edgeLines = [];
    this.selectedMesh = null;
    this.selectionBox = null;
    this.savedMaterialState = null;

    this.explodeFactor = 0.0;
    this.drawerFactor = 0.0;
    this.hiddenModules = new Set(["MOD4_VPS_REF"]);
    this.moduleGroupsMap = new Map();

    // Centro aproximado em coordenadas Three.js Y-up (Blender [-39, -100, 312.5] -> [-39, 312.5, +100])
    this.center = new THREE.Vector3(-39, 312.5, 100);
    this.initialized = false;
    this.loaded = false;
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;

    const w = this.host.clientWidth || 900;
    const h = this.host.clientHeight || 600;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, w / h, 5, 15000);
    this.camera.position.set(820, 620, 920);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.host.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.copy(this.center);
    this.controls.update();

    // Iluminacao neutra de catalogo industrial
    const hemi = new THREE.HemisphereLight(0xffffff, 0xcbd5e1, 1.15);
    this.scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 1.35);
    key.position.set(900, 1200, 950);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xeef2f6, 0.75);
    fill.position.set(-900, 500, -850);
    this.scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 0.55);
    rim.position.set(0, -600, 900);
    this.scene.add(rim);

    // Grade sutil no chao Y=0
    const grid = new THREE.GridHelper(1200, 24, 0x9ca3af, 0xd1d5db);
    grid.position.set(-39, 0, 100);
    this.scene.add(grid);

    // Click para selecionar componente
    let downPt = null;
    this.renderer.domElement.addEventListener("pointerdown", (e) => {
      downPt = { x: e.clientX, y: e.clientY };
    });
    this.renderer.domElement.addEventListener("pointerup", (e) => {
      if (!downPt) return;
      const dist = Math.hypot(e.clientX - downPt.x, e.clientY - downPt.y);
      downPt = null;
      if (dist < 5) this._pickAt(e);
    });

    window.addEventListener("resize", () => this.resize());
    this._animate();
    this._loadModel();
  }

  resize() {
    if (!this.renderer || !this.camera) return;
    const w = this.host.clientWidth;
    const h = this.host.clientHeight;
    if (w < 10 || h < 10) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  _loadModel() {
    const loader = new GLTFLoader();
    loader.load(
      "./data/GOG10_REV7_1.glb",
      (gltf) => {
        this.rootGroup = gltf.scene;
        this.scene.add(this.rootGroup);

        // Enquadra centro real a partir do modelo carregado
        const box = new THREE.Box3().setFromObject(this.rootGroup);
        box.getCenter(this.center);
        this.controls.target.copy(this.center);
        this.setPreset("iso");

        // Indexa cada malha, calcula vetor de explosao e vetor cinematico real (em Three.js Y-up)
        this.rootGroup.traverse((obj) => {
          if (!obj.isMesh) return;
          const cleanName = obj.name.replace(/(_Mesh(\.\d+)?)$/, "");
          const rec = this.dimByName[obj.name] || this.dimByName[cleanName] || null;
          const modId = rec?.modulo_id || obj.userData?.gog10_module || "ESQ_ESTRUTURA";

          obj.userData.basePos = obj.position.clone();
          obj.userData.baseQuat = obj.quaternion.clone();
          obj.userData.record = rec;
          obj.userData.moduloId = modId;
          obj.userData.explodeOffset = this._computeExplodeOffset(obj, rec, modId);
          obj.userData.drawerOffset = this._computeDrawerOffset(rec ? rec.nome : obj.name);
          obj.userData.doorSwing = this._computeDoorSwing(rec ? rec.nome : obj.name);

          // Centro real do mesh em Three.js Y-up (caso pivot esteja em 0,0,0)
          obj.geometry.computeBoundingBox();
          const mBox = obj.geometry.boundingBox.clone().applyMatrix4(obj.matrixWorld);
          obj.userData.worldCenter = mBox.getCenter(new THREE.Vector3());

          this.meshes.push(obj);
          if (!this.moduleGroupsMap.has(modId)) this.moduleGroupsMap.set(modId, []);
          this.moduleGroupsMap.get(modId).push(obj);

          if (this.hiddenModules.has(modId)) obj.visible = false;
        });

        const loadEl = document.getElementById("three-loading");
        if (loadEl) loadEl.classList.add("hidden");
        this.loaded = true;
      },
      undefined,
      (err) => {
        const loadEl = document.getElementById("three-loading");
        if (loadEl) loadEl.innerHTML = `<p style="color:#b91c1c">Falha ao carregar modelo 3D: ${err?.message || err}</p>`;
      }
    );
  }

  _computeExplodeOffset(obj, rec, modId) {
    const n = rec ? rec.nome : obj.name;
    // Coordenadas Blender -> Three Y-up: (dx, dy, dz)_blender -> (dx, dz, -dy)_three
    if (n.startsWith("PELE_F6_LajeTopo_") || n.startsWith("PELE_F6_FrestaExaustao_") || n.startsWith("PELE_F6_AlmaLaje_") || n.startsWith("BAIA_Labirinto_Topo_")) {
      return new THREE.Vector3(0, 210, 0);
    }
    if (n.startsWith("PELE_F6_Front_") || n.startsWith("AIR_Tela_Hex_Frisos_") || n.startsWith("BAIA_Plenum_Hex_") || n.startsWith("PELE_F6_AlmaHoriz_FrontX_") || n.startsWith("PELE_F6_AlmaVert_FrontX_")) {
      return new THREE.Vector3(240, 0, 0);
    }
    if (n.startsWith("PELE_F6_Rear_") || n.startsWith("PELE_F6_PortaClic_") || n.startsWith("PELE_F6_AlmaHoriz_RearX_") || n.startsWith("PELE_F6_AlmaVert_RearX_")) {
      return new THREE.Vector3(-240, 0, 0);
    }
    if (n.startsWith("PELE_F6_LatNegY_") || n.startsWith("PELE_F6_AlmaHoriz_NegY_") || n.startsWith("PELE_F6_AlmaVert_LatNegY_")) {
      return new THREE.Vector3(0, 0, 220); // -Y_blender = +Z_three
    }
    if (n.startsWith("PELE_F6_LatPosY_") || n.startsWith("PELE_F6_AlmaHoriz_PosY_") || n.startsWith("PELE_F6_AlmaVert_LatPosY_")) {
      return new THREE.Vector3(0, 0, -220); // +Y_blender = -Z_three
    }
    if (modId === "MOD1_MR30G") return new THREE.Vector3(110, 0, 0);
    if (modId === "MOD2_ONT") return new THREE.Vector3(0, 0, -110);
    if (modId === "MOD3_ENERGIA") return new THREE.Vector3(-85, 45, 70);
    if (modId === "MOD4_VPS") return new THREE.Vector3(-110, 120, 0);
    if (modId === "PLINTO_BASE") return new THREE.Vector3(0, -110, 0);
    if (modId === "CARENAGEM_PELE") return new THREE.Vector3(0, 60, 0);
    return new THREE.Vector3(0, 0, 0);
  }

  _computeDrawerOffset(n) {
    // Coordenadas reais REV7.1 em Three.js Y-up: (dx_bl, dz_bl, -dy_bl)
    if ((n.startsWith("MOD1_") && !n.includes("Fixa") && !n.includes("Batente") && !n.includes("Intermed") && !n.includes("Trava_PETG")) ||
        n.startsWith("MR30G_") || n.startsWith("PLUG_COMERCIAL_RJ45_90G_MR30G") || n.startsWith("PLUG_COMERCIAL_Barrel90G_") ||
        n.startsWith("PELE_F6_Baia_FrenteGaveta_MR30G") || n.startsWith("BAIA_Gaveta") || n.startsWith("BAIA_Selo_Corredor_Movel_")) {
      return new THREE.Vector3(125, 0, 0);
    }
    if (n === "MOD1_Corredica_Intermed_Front" || n === "MOD1_Corredica_Intermed_Rear") {
      return new THREE.Vector3(62.5, 0, 0);
    }
    if ((n.startsWith("MOD2_") && !n.includes("Trilho")) || n.startsWith("ONT_FD511G_")) {
      return new THREE.Vector3(0, 0, -115); // +115 mm +Y_bl
    }
    if (n === "MOD2_Trilho_Intermed_ONT_Esq" || n === "MOD2_Trilho_Intermed_ONT_Dir") {
      return new THREE.Vector3(0, 0, -57.5);
    }
    if (n.startsWith("MOD3_SubGaveta_iClamper") || n.startsWith("MOD3_Trilho_iClamper_Movel") || n.startsWith("CERTIFICADO_iCLAMPER_") ||
        n.startsWith("PROVISORIO_Plugue_90G_AC_") || n.startsWith("PROVISORIO_Fonte_9V_") || n.startsWith("PROVISORIO_Fonte_12V_") || n.startsWith("PROVISORIO_Fonte_5V_")) {
      return new THREE.Vector3(0, 0, -200); // +200 mm +Y_bl
    }
    if (n === "MOD3_Trilho_iClamper_Intermed_Esq" || n === "MOD3_Trilho_iClamper_Intermed_Dir") {
      return new THREE.Vector3(0, 0, -100);
    }
    if (n.startsWith("MOD3_Gaveta_Energia") || n.startsWith("MOD3_Presilha_Fonte135W") || n.startsWith("MOD3_Parede_Blindagem") ||
        n.startsWith("MOD3_Trilho_Fonte135W_Movel") || n.includes("Fonte_Lenovo_135W") || n.includes("Plugue_IEC_C5")) {
      return new THREE.Vector3(0, 0, 150); // -150 mm -Y_bl
    }
    if (n === "MOD3_Trilho_Fonte135W_Intermed_Esq" || n === "MOD3_Trilho_Fonte135W_Intermed_Dir") {
      return new THREE.Vector3(0, 0, 75);
    }
    if (["MOD4_Gaveta_Hub_USBC_Bandeja", "MOD4_Gaveta_Hub_USBC_AbaBack", "PROVISORIO_Hub_USBC_Periferico_115x44x16", "MOD4_Trilho_Hub_Movel_Esq", "MOD4_Trilho_Hub_Movel_Dir",
         "MOD4_Gaveta_SSD25_Bandeja", "MOD4_Gaveta_SSD25_AbaFront", "MOD4_Gaveta_SSD25_AbaRear", "PROVISORIO_SSD_25_SATA_Case_100x70x9_5", "MOD4_Trilho_SSD25_Movel_Front", "MOD4_Trilho_SSD25_Movel_Rear"].includes(n)) {
      return new THREE.Vector3(-125, 0, 0);
    }
    if (["MOD4_Trilho_Hub_Intermed_Esq", "MOD4_Trilho_Hub_Intermed_Dir", "MOD4_Trilho_SSD25_Intermed_Front", "MOD4_Trilho_SSD25_Intermed_Rear"].includes(n)) {
      return new THREE.Vector3(-62.5, 0, 0);
    }
    if (n.startsWith("MOD4_LEGO_Cassete") || n.startsWith("MOD4_Berco_") || n.startsWith("MOD4_Bossa_") || n.startsWith("MOD4_Orelha_") ||
        n.startsWith("MOD4_Patim_") || n.startsWith("MOD4_Ponte_") || n.startsWith("FIX_Tala_Inox_Junta_Cassete") || n.startsWith("EXTRAIDO_VPS_") || n.startsWith("PROVISORIO_VPS_Bateria")) {
      return new THREE.Vector3(-120, 0, 0);
    }
    return new THREE.Vector3(0, 0, 0);
  }

  _computeDoorSwing(n) {
    if (n === "PELE_F6_PortaClic_Rear_T1_Cabos" || n === "PELE_F6_PortaClic_Rear_T3_Hub") {
      // Pivo em Blender (-181.5, 113.0, 0) -> Three (-181.5, 0, -113.0)
      return { pivot: new THREE.Vector3(-181.5, 0, -113.0), maxAngleRad: (-95 * Math.PI) / 180 };
    }
    return null;
  }

  applyTransforms() {
    for (const obj of this.meshes) {
      const p = obj.userData.basePos.clone();
      p.addScaledVector(obj.userData.explodeOffset, this.explodeFactor);
      p.addScaledVector(obj.userData.drawerOffset, this.drawerFactor);

      const q = obj.userData.baseQuat.clone();
      const sw = obj.userData.doorSwing;
      if (sw && this.drawerFactor > 0.001) {
        const ang = sw.maxAngleRad * this.drawerFactor;
        const dq = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ang);
        p.sub(sw.pivot).applyQuaternion(dq).add(sw.pivot);
        q.premultiply(dq);
      }
      obj.position.copy(p);
      obj.quaternion.copy(q);
    }
  }

  setExplode(pct) {
    this.explodeFactor = Math.max(0, Math.min(1, pct / 100));
    this.applyTransforms();
  }

  setDrawers(pct) {
    this.drawerFactor = Math.max(0, Math.min(1, pct / 100));
    this.applyTransforms();
  }

  setModuleVisibility(modId, visible) {
    if (visible) this.hiddenModules.delete(modId);
    else this.hiddenModules.add(modId);
    const list = this.moduleGroupsMap.get(modId) || [];
    for (const o of list) o.visible = visible;
  }

  toggleEdges() {
    this.edgesVisible = !this.edgesVisible;
    if (this.edgesVisible && this.edgeLines.length === 0) {
      const mat = new THREE.LineBasicMaterial({ color: 0x141619, transparent: true, opacity: 0.48 });
      for (const m of this.meshes) {
        if (m.name.includes("SMD_")) continue;
        const eg = new THREE.EdgesGeometry(m.geometry, 28);
        const ls = new THREE.LineSegments(eg, mat);
        ls.raycast = () => {};
        m.add(ls);
        this.edgeLines.push(ls);
      }
    }
    for (const ls of this.edgeLines) ls.visible = this.edgesVisible;
    return this.edgesVisible;
  }

  setPreset(preset) {
    const c = this.center;
    const presets = {
      iso: [c.x + 820, c.y + 340, c.z + 820],
      front: [c.x + 1080, c.y + 20, c.z],
      rear: [c.x - 1080, c.y + 20, c.z],
      left: [c.x, c.y + 20, c.z + 1080],  // -Y_bl -> +Z_three
      right: [c.x, c.y + 20, c.z - 1080], // +Y_bl -> -Z_three
      top: [c.x, c.y + 1180, c.z + 10],
    };
    const pos = presets[preset] || presets.iso;
    this.camera.position.set(pos[0], pos[1], pos[2]);
    this.controls.target.copy(c);
    this.controls.update();
  }

  focusPartByName(name) {
    const target = this.meshes.find((m) => (m.userData.record?.nome || m.name) === name);
    if (!target) return false;
    this._selectMesh(target);
    const box = new THREE.Box3().setFromObject(target);
    const c = box.getCenter(new THREE.Vector3());
    const sz = box.getSize(new THREE.Vector3()).length();
    const dist = Math.max(260, sz * 2.2);
    this.controls.target.copy(c);
    this.camera.position.copy(c).add(new THREE.Vector3(dist * 0.72, dist * 0.45, dist * 0.72));
    this.controls.update();
    return true;
  }

  _pickAt(ev) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((ev.clientX - rect.left) / rect.width) * 2 - 1,
      -((ev.clientY - rect.top) / rect.height) * 2 + 1
    );
    const rc = new THREE.Raycaster();
    rc.setFromCamera(ndc, this.camera);
    const vis = this.meshes.filter((m) => m.visible);
    const hits = rc.intersectObjects(vis, false);
    if (hits.length > 0) {
      this._selectMesh(hits[0].object);
    }
  }

  _selectMesh(mesh) {
    if (this.selectionBox) {
      this.scene.remove(this.selectionBox);
      this.selectionBox.dispose?.();
      this.selectionBox = null;
    }
    if (this.selectedMesh && this.savedMaterialState) {
      this.selectedMesh.material = this.savedMaterialState;
    }
    this.selectedMesh = mesh;
    this.savedMaterialState = mesh.material;

    const hlMat = (mesh.material?.clone ? mesh.material.clone() : new THREE.MeshStandardMaterial({ color: 0x0f766e }));
    if (hlMat.emissive) {
      hlMat.emissive.setHex(0x0f766e);
      hlMat.emissiveIntensity = 0.55;
    }
    mesh.material = hlMat;

    const box = new THREE.Box3().setFromObject(mesh);
    this.selectionBox = new THREE.Box3Helper(box, 0x0f766e);
    this.scene.add(this.selectionBox);

    if (this.onSelectPart) {
      const rec = mesh.userData.record || { nome: mesh.name, modulo_id: mesh.userData.moduloId };
      this.onSelectPart(rec);
    }
  }

  _animate() {
    requestAnimationFrame(() => this._animate());
    if (this.controls) this.controls.update();
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
