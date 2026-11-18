import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/**
 * Visualizador 3D Interativo dedicado ao CAMINHO C v2 (Hibrido: Chapas Laser 3mm + Aluminio + 14 Pecas 3D + Hardware Real).
 */
export class CaminhoCViewer {
  constructor(hostEl, onSelectObj) {
    this.host = hostEl;
    this.onSelectObj = onSelectObj;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.rootGroup = null;
    this.meshes = [];
    this.center = new THREE.Vector3(-39, 293, 100);
    this.initialized = false;
    this.loaded = false;
    this.explodePct = 0;
    this.xrayExt = false;
    this.layerVis = {
      laser_ext: true,
      laser_int: true,
      alu_comercial: true,
      petg_3d: true,
      hardware: true,
    };
  }

  init() {
    if (this.initialized) return;
    this.initialized = true;
    const w = this.host.clientWidth || 860;
    const h = this.host.clientHeight || 520;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, w / h, 5, 15000);
    this.camera.position.set(780, 560, 860);

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

    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xcbd5e1, 1.2));
    const key = new THREE.DirectionalLight(0xffffff, 1.35);
    key.position.set(900, 1150, 900);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xeef2f6, 0.8);
    fill.position.set(-900, 500, -850);
    this.scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 0.55);
    rim.position.set(0, -500, 900);
    this.scene.add(rim);

    const grid = new THREE.GridHelper(1100, 22, 0x9ca3af, 0xd1d5db);
    grid.position.set(-39, 0, 100);
    this.scene.add(grid);

    let downPt = null;
    this.renderer.domElement.addEventListener("pointerdown", (e) => { downPt = { x: e.clientX, y: e.clientY }; });
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

  _classifyLayer(name) {
    if (/^LASER0[1-5]_/.test(name)) return "laser_ext";
    if (/^LASER(0[6-9]|10)/.test(name)) return "laser_int";
    if (/^(LASER11_|COMERCIAL_)/.test(name)) return "alu_comercial";
    if (/^CAMC2/.test(name)) return "petg_3d";
    return "hardware";
  }

  _explodeVector(name, layer) {
    // Em Three.js Y-up (glTF exporta Blender X->X, Y->-Z, Z->Y)
    if (name.startsWith("LASER01_")) return new THREE.Vector3(0, 0, 190);     // Blender -Y => Three +Z
    if (name.startsWith("LASER02_")) return new THREE.Vector3(0, 0, -190);    // Blender +Y => Three -Z
    if (name.startsWith("LASER03_")) return new THREE.Vector3(185, 0, 0);     // Blender +X => Three +X
    if (name.startsWith("LASER04_")) return new THREE.Vector3(-185, 0, 0);    // Blender -X => Three -X
    if (name.startsWith("LASER05_")) return new THREE.Vector3(0, 145, 0);     // Blender +Z => Three +Y
    if (name.startsWith("LASER06_")) return new THREE.Vector3(0, -85, 0);     // Blender -Z => Three -Y
    if (layer === "petg_3d") return new THREE.Vector3(55, 35, 0);
    if (layer === "alu_comercial") return new THREE.Vector3(-45, 0, 45);
    if (layer === "laser_int") return new THREE.Vector3(0, -25, 0);
    return new THREE.Vector3(0, 0, 0);
  }

  _loadModel() {
    const loader = new GLTFLoader();
    loader.load(
      "./models/caminho_c_v2.glb",
      (gltf) => {
        this.rootGroup = gltf.scene;
        this.scene.add(this.rootGroup);
        const box = new THREE.Box3().setFromObject(this.rootGroup);
        box.getCenter(this.center);
        this.controls.target.copy(this.center);

        this.rootGroup.traverse((obj) => {
          if (!obj.isMesh) return;
          const nm = obj.name || obj.parent?.name || "";
          const layer = this._classifyLayer(nm);
          obj.userData.camcName = nm;
          obj.userData.camcLayer = layer;
          obj.userData.basePos = obj.position.clone();
          obj.userData.explodeVec = this._explodeVector(nm, layer);
          if (obj.material) {
            obj.material = obj.material.clone();
            obj.userData.origOpacity = obj.material.opacity ?? 1.0;
          }
          this.meshes.push(obj);
        });

        this.loaded = true;
        this.setPreset("iso");
        const loading = document.getElementById("camc-three-loading");
        if (loading) loading.classList.add("hidden");
      },
      undefined,
      (err) => {
        console.error("Erro ao carregar caminho_c_v2.glb:", err);
        const loading = document.getElementById("camc-three-loading");
        if (loading) loading.innerHTML = `<p style="color:#b91c1c;">Erro ao carregar modelo 3D Caminho C v2.</p>`;
      }
    );
  }

  setExplode(pct) {
    this.explodePct = pct / 100.0;
    for (const m of this.meshes) {
      const bp = m.userData.basePos;
      const ev = m.userData.explodeVec;
      if (bp && ev) m.position.copy(bp).addScaledVector(ev, this.explodePct);
    }
  }

  setLayerVisible(layer, vis) {
    this.layerVis[layer] = vis;
    for (const m of this.meshes) {
      if (m.userData.camcLayer === layer) m.visible = vis;
    }
  }

  setXrayExternal(on) {
    this.xrayExt = on;
    for (const m of this.meshes) {
      if (m.userData.camcLayer === "laser_ext" && m.material) {
        m.material.transparent = on;
        m.material.opacity = on ? 0.22 : 1.0;
        m.material.depthWrite = !on;
        m.material.needsUpdate = true;
      }
    }
  }

  setPreset(preset) {
    const c = this.center;
    const map = {
      iso: [c.x + 1020, c.y + 340, c.z - 820],      // Frontal-Direita completa (Baia RF + 5 Frisos)
      front: [c.x + 1180, c.y + 50, c.z],           // Fachada +X
      rear: [c.x - 1080, c.y + 210, c.z + 720],     // Traseira -X / Alumínio 135W / FAN1
      cutaway: [c.x + 920, c.y + 290, c.z - 740],   // Corte interno completo
      top: [c.x + 40, c.y + 1240, c.z - 120],
    };
    const p = map[preset] || map.iso;
    this.camera.position.set(p[0], p[1], p[2]);
    this.controls.target.copy(c);
    this.controls.update();

    if (preset === "cutaway") {
      for (const m of this.meshes) {
        if (/^LASER0[235]_/.test(m.userData.camcName)) m.visible = false;
        else m.visible = this.layerVis[m.userData.camcLayer];
      }
    } else if (preset === "rear") {
      for (const m of this.meshes) {
        if (/^LASER01_/.test(m.userData.camcName)) m.visible = false;
        else m.visible = this.layerVis[m.userData.camcLayer];
      }
    } else {
      for (const m of this.meshes) {
        m.visible = this.layerVis[m.userData.camcLayer];
      }
    }
  }

  _pickAt(e) {
    if (!this.loaded) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(mouse, this.camera);
    const hits = ray.intersectObjects(this.meshes.filter((m) => m.visible), false);
    if (hits.length > 0 && this.onSelectObj) {
      const m = hits[0].object;
      this.onSelectObj(m.userData.camcName, m.userData.camcLayer);
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
