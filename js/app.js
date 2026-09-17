/**
 * ShortVidReel — 3D Environment Studio V1
 * Canonical scene is the source of truth. Three.js is a viewer only.
 */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";

const STATE = {
  sceneData: null,
  scene: null,
  renderer: null,
  orbitCam: null,
  controls: null,
  activeCameraId: null,
  previewCam: null,
  objectMeshes: new Map(),
  cameraHelpers: new Map(),
  placeholder: null,
  locked: true,
  viewMode: "orbit",
  frames: [],
};

const canvas = document.getElementById("viewport");
const statusEl = document.getElementById("status");
const camList = document.getElementById("camera-list");
const objList = document.getElementById("object-list");
const infoPanel = document.getElementById("info-panel");
const frameStrip = document.getElementById("frame-strip");

function setStatus(msg) {
  statusEl.textContent = msg;
}

function matFromDef(def) {
  const params = {
    color: def.color,
    roughness: def.roughness ?? 0.6,
    metalness: def.metalness ?? 0,
  };
  if (def.transparent) {
    params.transparent = true;
    params.opacity = def.opacity ?? 0.4;
    params.side = THREE.DoubleSide;
  }
  return new THREE.MeshStandardMaterial(params);
}

function addBox(parent, w, h, d, mat, x, y, z, rx = 0, ry = 0, rz = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addCylinder(parent, rTop, rBot, h, mat, x, y, z, segs = 16) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, segs), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function buildObject(obj, materials) {
  const group = new THREE.Group();
  group.name = obj.object_id;
  group.userData = { ...obj };
  const mat = materials.get(obj.material_id) || materials.get("MAT_CREAM_PAINT");
  const trim = materials.get("MAT_SOFT_WHITE_TRIM");
  const wood = materials.get("MAT_WARM_WOOD_FURNITURE");
  const stone = materials.get("MAT_COUNTER_STONE");
  const [dx, dy, dz] = obj.dimensions;

  switch (obj.object_type) {
    case "floor": {
      const geo = new THREE.BoxGeometry(dx, dy, dz);
      const floorMat = mat.clone();
      floorMat.map = makeFloorboardTexture();
      floorMat.map.wrapS = floorMat.map.wrapT = THREE.RepeatWrapping;
      floorMat.map.repeat.set(dx / 0.14, dz / 0.9);
      floorMat.map.rotation = 0;
      const mesh = new THREE.Mesh(geo, floorMat);
      mesh.receiveShadow = true;
      group.add(mesh);
      break;
    }
    case "ceiling":
      addBox(group, dx, dy, dz, mat, 0, 0, 0);
      group.visible = false;
      break;
    case "wall":
      addBox(group, dx, dy, dz, mat.clone(), 0, 0, 0);
      break;
    case "window": {
      addBox(group, dx + 0.1, dy + 0.1, 0.06, trim, 0, 0, 0);
      addBox(group, dx * 0.46, dy * 0.86, 0.04, mat, -dx * 0.24, 0, 0.02);
      addBox(group, dx * 0.46, dy * 0.86, 0.04, mat, dx * 0.24, 0, 0.02);
      addBox(group, 0.04, dy + 0.1, 0.07, trim, 0, 0, 0);
      break;
    }
    case "base_cabinet": {
      addBox(group, dx, dy, dz, mat, 0, 0, 0);
      addBox(group, dx + 0.04, 0.06, dz + 0.04, stone, 0, dy / 2 + 0.03, 0);
      const faceZ = dz / 2 + 0.01;
      const doors = 5;
      for (let i = 0; i < doors; i++) {
        const tw = dx / doors - 0.04;
        const tx = -dx / 2 + (i + 0.5) * (dx / doors);
        addBox(group, tw, dy * 0.72, 0.03, mat, tx, -0.04, faceZ);
        addBox(group, tw * 0.7, dy * 0.5, 0.01, trim, tx, -0.04, faceZ + 0.02);
      }
      break;
    }
    case "upper_cabinet": {
      addBox(group, dx, dy, dz, mat, 0, 0, 0);
      const doors = 5;
      for (let i = 0; i < doors; i++) {
        const tw = dx / doors - 0.04;
        const tx = -dx / 2 + (i + 0.5) * (dx / doors);
        addBox(group, tw, dy * 0.78, 0.03, mat, tx, 0, dz / 2 + 0.01);
      }
      break;
    }
    case "sink": {
      addBox(group, dx, dy, dz, mat, 0, 0, 0);
      addBox(group, dx * 0.72, dy * 0.55, dz * 0.62, materials.get("MAT_SINK_METAL"), 0, 0.02, 0);
      addCylinder(group, 0.018, 0.018, 0.22, materials.get("MAT_SINK_METAL"), 0.12, 0.18, 0.05, 10);
      addCylinder(group, 0.018, 0.018, 0.22, materials.get("MAT_SINK_METAL"), -0.12, 0.18, 0.05, 10);
      break;
    }
    case "refrigerator": {
      addBox(group, dx, dy, dz, mat, 0, 0, 0);
      addBox(group, dx * 0.92, dy * 0.42, 0.03, trim, 0, dy * 0.22, dz / 2 + 0.02);
      addBox(group, dx * 0.92, dy * 0.42, 0.03, trim, 0, -dy * 0.22, dz / 2 + 0.02);
      addBox(group, 0.04, 0.28, 0.04, materials.get("MAT_SINK_METAL"), dx / 2 - 0.04, 0.15, dz / 2 + 0.03);
      addBox(group, 0.04, 0.28, 0.04, materials.get("MAT_SINK_METAL"), dx / 2 - 0.04, -0.25, dz / 2 + 0.03);
      break;
    }
    case "island": {
      addBox(group, dx, dy, dz, mat, 0, 0, 0);
      addBox(group, dx + 0.08, 0.07, dz + 0.08, stone, 0, dy / 2 + 0.035, 0);
      for (let i = 0; i < 3; i++) {
        const tx = -dx / 3 + i * (dx / 3);
        addBox(group, dx / 3.4, dy * 0.7, 0.03, mat, tx, -0.04, dz / 2 + 0.015);
      }
      break;
    }
    case "table": {
      addBox(group, dx, 0.06, dz, wood, 0, dy / 2 - 0.03, 0);
      const insetX = dx / 2 - 0.08;
      const insetZ = dz / 2 - 0.08;
      addBox(group, 0.07, dy - 0.06, 0.07, wood, -insetX, 0, -insetZ);
      addBox(group, 0.07, dy - 0.06, 0.07, wood, insetX, 0, -insetZ);
      addBox(group, 0.07, dy - 0.06, 0.07, wood, -insetX, 0, insetZ);
      addBox(group, 0.07, dy - 0.06, 0.07, wood, insetX, 0, insetZ);
      break;
    }
    case "stool": {
      addCylinder(group, 0.16, 0.16, 0.05, wood, 0, dy / 2, 0, 18);
      addCylinder(group, 0.03, 0.035, dy - 0.05, wood, 0, 0, 0, 10);
      addCylinder(group, 0.14, 0.14, 0.03, wood, 0, -dy / 2 + 0.03, 0, 14);
      break;
    }
    case "doorway": {
      addBox(group, 0.08, dy, 0.08, trim, 0, 0, -dz / 2);
      addBox(group, 0.08, dy, 0.08, trim, 0, 0, dz / 2);
      addBox(group, 0.08, 0.08, dz, trim, 0, dy / 2, 0);
      break;
    }
    case "plant": {
      addCylinder(group, 0.07, 0.05, 0.1, wood, 0, -0.08, 0, 10);
      addCylinder(group, 0.02, 0.03, 0.16, materials.get("MAT_LIGHT_SAGE"), 0, 0.06, 0, 8);
      addBox(group, 0.16, 0.04, 0.08, materials.get("MAT_LIGHT_SAGE"), 0.02, 0.12, 0);
      addBox(group, 0.12, 0.04, 0.08, materials.get("MAT_LIGHT_SAGE"), -0.03, 0.16, 0.02);
      break;
    }
    default:
      addBox(group, dx, dy, dz, mat, 0, 0, 0);
  }

  group.position.set(...obj.position);
  group.rotation.set(...obj.rotation);
  group.scale.set(...(obj.scale || [1, 1, 1]));
  return group;
}

function makeFloorboardTexture() {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 256;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#8B5A2B";
  ctx.fillRect(0, 0, 64, 256);
  for (let y = 0; y < 8; y++) {
    const shade = 120 + ((y * 17) % 40);
    ctx.fillStyle = `rgb(${shade + 20},${shade - 20},${shade - 50})`;
    ctx.fillRect(0, y * 32, 64, 30);
    ctx.strokeStyle = "#5C3A18";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y * 32);
    ctx.lineTo(64, y * 32);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function buildLights(data, scene) {
  for (const l of data.lights) {
    if (l.type === "ambient") {
      scene.add(new THREE.AmbientLight(l.color, l.intensity));
    } else if (l.type === "hemisphere") {
      scene.add(new THREE.HemisphereLight(l.sky, l.ground, l.intensity));
    } else if (l.type === "directional") {
      const d = new THREE.DirectionalLight(l.color, l.intensity);
      d.position.set(...l.position);
      d.castShadow = true;
      d.shadow.mapSize.set(2048, 2048);
      d.shadow.camera.near = 0.5;
      d.shadow.camera.far = 18;
      d.shadow.camera.left = -6;
      d.shadow.camera.right = 6;
      d.shadow.camera.top = 6;
      d.shadow.camera.bottom = -6;
      scene.add(d);
    } else if (l.type === "point") {
      const p = new THREE.PointLight(l.color, l.intensity, l.distance ?? 8);
      p.position.set(...l.position);
      p.castShadow = true;
      scene.add(p);
    }
  }
}

function makePerspectiveCam(def) {
  const cam = new THREE.PerspectiveCamera(def.fov, def.aspect || 16 / 9, 0.08, 40);
  cam.position.set(...def.position);
  cam.lookAt(new THREE.Vector3(...def.target));
  cam.userData = { id: def.camera_id, target: def.target, name: def.name };
  return cam;
}

function buildScene(data) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#c9b89a");
  scene.fog = new THREE.Fog("#c9b89a", 12, 28);
  const materials = new Map();
  for (const m of data.materials) materials.set(m.material_id, matFromDef(m));
  buildLights(data, scene);
  for (const obj of data.objects) {
    const mesh = buildObject(obj, materials);
    scene.add(mesh);
    STATE.objectMeshes.set(obj.object_id, mesh);
  }
  for (const p of data.story_props || []) {
    const cookie = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.025, 16),
      new THREE.MeshStandardMaterial({ color: "#C47A3A", roughness: 0.7 })
    );
    cookie.position.set(...p.position);
    cookie.name = p.object_id;
    scene.add(cookie);
  }
  const ph = data.placeholders?.[0];
  if (ph) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.11, 0.18, 6, 12),
      new THREE.MeshStandardMaterial({ color: "#5A4634", roughness: 0.6 })
    );
    body.position.y = 0.22;
    const earL = new THREE.Mesh(
      new THREE.ConeGeometry(0.04, 0.08, 6),
      new THREE.MeshStandardMaterial({ color: "#5A4634" })
    );
    earL.position.set(-0.05, 0.4, 0);
    const earR = earL.clone();
    earR.position.x = 0.05;
    g.add(body, earL, earR);
    g.position.set(...ph.position);
    g.rotation.set(...ph.rotation);
    g.name = ph.object_id;
    scene.add(g);
    STATE.placeholder = g;
  }
  return scene;
}

function addCameraHelpers(data, scene) {
  for (const def of data.cameras) {
    const cam = makePerspectiveCam(def);
    const helper = new THREE.CameraHelper(cam);
    helper.visible = false;
    scene.add(cam);
    scene.add(helper);
    STATE.cameraHelpers.set(def.camera_id, { cam, helper, def });
  }
}

function populateLists(data) {
  camList.innerHTML = "";
  data.cameras.forEach((c) => {
    const btn = document.createElement("button");
    btn.className = "row-btn";
    btn.textContent = c.name + "  ·  " + c.camera_id;
    btn.onclick = () => selectCamera(c.camera_id);
    btn.dataset.id = c.camera_id;
    camList.appendChild(btn);
  });
  objList.innerHTML = "";
  data.objects.forEach((o) => {
    const li = document.createElement("li");
    li.innerHTML = `<code>${o.object_id}</code><span>${o.object_type}</span>`;
    objList.appendChild(li);
  });
  infoPanel.innerHTML = `
    <div><b>${data.name}</b> v${data.environment_version}</div>
    <div>ID: ${data.environment_id}</div>
    <div>Status: <span class="lock">${data.locked ? "LOCKED" : "EDITABLE"}</span></div>
    <div>Room: ${data.room_dimensions.width} × ${data.room_dimensions.depth} × ${data.room_dimensions.height} m</div>
    <div>Permanent objects: ${data.objects.length}</div>
    <div>Cameras: ${data.cameras.length}</div>
  `;
}

function selectCamera(id) {
  STATE.activeCameraId = id;
  STATE.viewMode = "camera";
  const rec = STATE.cameraHelpers.get(id);
  if (!rec) return;
  STATE.previewCam = rec.cam;
  rec.cam.aspect = canvas.clientWidth / canvas.clientHeight;
  rec.cam.updateProjectionMatrix();
  STATE.controls.enabled = false;
  document.querySelectorAll("#camera-list .row-btn").forEach((b) => {
    b.classList.toggle("active", b.dataset.id === id);
  });
  setStatus("Camera view: " + rec.def.name + " — geometry is the same set");
}

function orbitMode() {
  STATE.viewMode = "orbit";
  STATE.activeCameraId = null;
  STATE.controls.enabled = true;
  document.querySelectorAll("#camera-list .row-btn").forEach((b) => b.classList.remove("active"));
  setStatus("Orbit view — persistent 3D set");
}

function setPresetView(kind) {
  orbitMode();
  const cam = STATE.orbitCam;
  if (kind === "top") cam.position.set(0.1, 4.6, 0.15);
  if (kind === "front") cam.position.set(0.2, 1.45, 2.15);
  if (kind === "side") cam.position.set(2.55, 1.45, 0.2);
  if (kind === "reset") cam.position.set(2.15, 1.65, 2.05);
  STATE.controls.target.set(0, 0.9, 0);
  STATE.controls.update();
}

function renderFrame(cameraId) {
  const rec = STATE.cameraHelpers.get(cameraId);
  if (!rec) return;
  const cam = rec.cam;
  const w = 1280;
  const h = 720;
  STATE.renderer.setSize(w, h, false);
  cam.aspect = w / h;
  cam.updateProjectionMatrix();
  STATE.renderer.render(STATE.scene, cam);
  const dataUrl = STATE.renderer.domElement.toDataURL("image/png");
  STATE.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  STATE.orbitCam.aspect = canvas.clientWidth / canvas.clientHeight;
  STATE.orbitCam.updateProjectionMatrix();
  const frame = {
    render_id: "RND_" + Date.now() + "_" + cameraId,
    environment_id: STATE.sceneData.environment_id,
    environment_version: STATE.sceneData.environment_version,
    camera_id: cameraId,
    frame_image: dataUrl,
    camera_transform: { position: rec.def.position, target: rec.def.target, fov: rec.def.fov },
    timestamp: new Date().toISOString(),
  };
  STATE.frames.push(frame);
  addFrameThumb(frame);
  return frame;
}

function addFrameThumb(frame) {
  const wrap = document.createElement("figure");
  wrap.innerHTML = `<img src="${frame.frame_image}" alt="${frame.camera_id}" /><figcaption>${frame.camera_id.replace("CAM_KITCHEN_", "")}</figcaption>`;
  frameStrip.prepend(wrap);
}

function renderAllFive() {
  frameStrip.innerHTML = "";
  STATE.frames = [];
  for (const c of STATE.sceneData.cameras) renderFrame(c.camera_id);
  setStatus("Rendered 5 structural frames from the SAME locked 3D set.");
}

function exportGLB() {
  const exporter = new GLTFExporter();
  exporter.parse(
    STATE.scene,
    (result) => {
      const blob = new Blob([result], { type: "model/gltf-binary" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "milo-kitchen-v1.0.glb";
      a.click();
    },
    (err) => console.error(err),
    { binary: true }
  );
}

function exportSceneJSON() {
  const blob = new Blob([JSON.stringify(STATE.sceneData, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "milo-kitchen-v1.0.scene.json";
  a.click();
}

function onResize() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  STATE.renderer.setSize(w, h, false);
  STATE.orbitCam.aspect = w / h;
  STATE.orbitCam.updateProjectionMatrix();
  if (STATE.previewCam) {
    STATE.previewCam.aspect = w / h;
    STATE.previewCam.updateProjectionMatrix();
  }
}

function animate() {
  requestAnimationFrame(animate);
  if (STATE.viewMode === "orbit") {
    STATE.controls.update();
    STATE.renderer.render(STATE.scene, STATE.orbitCam);
  } else if (STATE.previewCam) {
    STATE.renderer.render(STATE.scene, STATE.previewCam);
  }
}

async function boot() {
  const res = await fetch("./data/milo-kitchen-v1.json");
  const data = await res.json();
  STATE.sceneData = data;
  STATE.locked = data.locked;
  STATE.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  STATE.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  STATE.renderer.shadowMap.enabled = true;
  STATE.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  STATE.renderer.outputColorSpace = THREE.SRGBColorSpace;
  STATE.renderer.toneMapping = THREE.ACESFilmicToneMapping;
  STATE.renderer.toneMappingExposure = 1.05;
  STATE.orbitCam = new THREE.PerspectiveCamera(55, 16 / 9, 0.08, 40);
  STATE.orbitCam.position.set(2.15, 1.65, 2.05);
  STATE.scene = buildScene(data);
  addCameraHelpers(data, STATE.scene);
  STATE.controls = new OrbitControls(STATE.orbitCam, canvas);
  STATE.controls.target.set(0, 0.9, 0);
  STATE.controls.enableDamping = true;
  populateLists(data);
  onResize();
  window.addEventListener("resize", onResize);
  animate();
  setStatus("Milo Kitchen v1.0 LOCKED — spatial source of truth loaded");
}

document.getElementById("btn-orbit").onclick = orbitMode;
document.getElementById("btn-reset").onclick = () => setPresetView("reset");
document.getElementById("btn-top").onclick = () => setPresetView("top");
document.getElementById("btn-front").onclick = () => setPresetView("front");
document.getElementById("btn-side").onclick = () => setPresetView("side");
document.getElementById("btn-render").onclick = () => {
  if (STATE.activeCameraId) renderFrame(STATE.activeCameraId);
  else setStatus("Select a camera first, or use Render All Five.");
};
document.getElementById("btn-render-all").onclick = renderAllFive;
document.getElementById("btn-export-glb").onclick = exportGLB;
document.getElementById("btn-export-json").onclick = exportSceneJSON;
document.getElementById("btn-helpers").onclick = () => {
  const on = [...STATE.cameraHelpers.values()].some((h) => h.helper.visible);
  STATE.cameraHelpers.forEach((h) => (h.helper.visible = !on));
};

boot().catch((e) => {
  console.error(e);
  setStatus("Failed to load scene: " + e.message);
});
