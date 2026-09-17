/**
 * Character loader abstraction.
 * Prefers GLB when source.type === "glb".
 * Falls back to polished procedural Milo.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export const MILO_SCALE = 1.0;
const TARGET_HEIGHT = 0.38;

function mat(def) {
  return new THREE.MeshStandardMaterial({
    name: def.material_id || "MAT",
    color: def.color,
    roughness: def.roughness ?? 0.7,
    metalness: def.metalness ?? 0,
  });
}

function mesh(geo, material, name, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, material);
  m.name = name;
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function buildProceduralMilo(definition, materials) {
  const orange = materials.get("MAT_MILO_ORANGE");
  const stripe = materials.get("MAT_MILO_STRIPE");
  const white = materials.get("MAT_MILO_WHITE");
  const eye = materials.get("MAT_MILO_GREEN_EYE") || materials.get("MAT_MILO_EYE_GREEN");
  const pupil = materials.get("MAT_MILO_PUPIL");
  const nose = materials.get("MAT_MILO_NOSE");
  const collar = materials.get("MAT_MILO_BLUE_COLLAR") || materials.get("MAT_MILO_COLLAR_BLUE");
  const pink = materials.get("MAT_MILO_PINK_EAR") || orange;
  const sclera = materials.get("MAT_MILO_SCLERA") || white;
  const bell = materials.get("MAT_MILO_BELL") || collar;

  const root = new THREE.Group();
  root.name = "MILO_ROOT";
  root.userData.character_id = definition.character_id;
  root.userData.character_version = definition.character_version;
  root.userData.source = "procedural";

  const body = new THREE.Group();
  body.name = "MILO_BODY";
  body.position.y = 0.16;
  const torso = mesh(new THREE.SphereGeometry(0.125, 28, 22), orange, "MILO_BODY_CORE");
  torso.scale.set(1.08, 0.86, 1.52);
  body.add(torso);

  for (let i = 0; i < 5; i++) {
    const s = mesh(new THREE.SphereGeometry(0.05, 16, 12), stripe, "MILO_BODY_STRIPE_" + i, 0, 0.052, -0.14 + i * 0.065);
    s.scale.set(1.72, 0.22, 0.62);
    body.add(s);
  }
  root.add(body);

  const chest = mesh(new THREE.SphereGeometry(0.068, 20, 16), white, "MILO_CHEST", 0, 0.145, 0.125);
  chest.scale.set(0.92, 1.05, 0.78);
  root.add(chest);

  const head = new THREE.Group();
  head.name = "MILO_HEAD";
  head.position.set(0, 0.305, 0.145);
  const skull = mesh(new THREE.SphereGeometry(0.108, 28, 24), orange, "MILO_HEAD_CORE");
  skull.scale.set(1.02, 0.96, 1.0);
  head.add(skull);
  head.add(mesh(new THREE.SphereGeometry(0.038, 16, 14), orange, "MILO_CHEEK_L", -0.07, -0.02, 0.04));
  head.add(mesh(new THREE.SphereGeometry(0.038, 16, 14), orange, "MILO_CHEEK_R", 0.07, -0.02, 0.04));
  head.add(mesh(new THREE.CapsuleGeometry(0.007, 0.036, 6, 10), stripe, "MILO_BROW_L", -0.024, 0.058, 0.088, 0.15, 0, 0.25));
  head.add(mesh(new THREE.CapsuleGeometry(0.007, 0.036, 6, 10), stripe, "MILO_BROW_R", 0.024, 0.058, 0.088, 0.15, 0, -0.25));
  head.add(mesh(new THREE.CapsuleGeometry(0.006, 0.028, 6, 10), stripe, "MILO_BROW_C", 0, 0.066, 0.09, 0.2, 0, 0));

  const earL = new THREE.Group();
  earL.name = "MILO_LEFT_EAR";
  earL.position.set(-0.062, 0.082, -0.012);
  earL.rotation.set(0.12, 0.15, 0.32);
  earL.add(mesh(new THREE.ConeGeometry(0.034, 0.068, 12), orange, "MILO_LEFT_EAR_MESH"));
  earL.add(mesh(new THREE.ConeGeometry(0.02, 0.042, 10), pink, "MILO_LEFT_EAR_INNER", 0, 0.004, 0.01));
  earL.add(mesh(new THREE.SphereGeometry(0.012, 10, 8), stripe, "MILO_LEFT_EAR_NOTCH", -0.016, 0.02, 0.004));
  head.add(earL);

  const earR = new THREE.Group();
  earR.name = "MILO_RIGHT_EAR";
  earR.position.set(0.062, 0.082, -0.012);
  earR.rotation.set(0.12, -0.15, -0.32);
  earR.add(mesh(new THREE.ConeGeometry(0.034, 0.068, 12), orange, "MILO_RIGHT_EAR_MESH"));
  earR.add(mesh(new THREE.ConeGeometry(0.02, 0.042, 10), pink, "MILO_RIGHT_EAR_INNER", 0, 0.004, 0.01));
  head.add(earR);

  function makeEye(name, x) {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(x, 0.014, 0.086);
    const ball = mesh(new THREE.SphereGeometry(0.028, 18, 14), sclera, name + "_SCLERA");
    ball.scale.set(1, 1.05, 0.72);
    g.add(ball);
    g.add(mesh(new THREE.SphereGeometry(0.016, 14, 12), eye, name + "_IRIS", 0, 0, 0.014));
    g.add(mesh(new THREE.SphereGeometry(0.008, 12, 10), pupil, name + "_PUPIL", 0, 0, 0.026));
    g.add(mesh(new THREE.SphereGeometry(0.0045, 8, 8), white, name + "_HIGHLIGHT", 0.006, 0.007, 0.03));
    return g;
  }
  head.add(makeEye("MILO_LEFT_EYE", -0.036));
  head.add(makeEye("MILO_RIGHT_EYE", 0.036));

  const muzzle = mesh(new THREE.SphereGeometry(0.042, 18, 14), white, "MILO_MUZZLE", 0, -0.026, 0.086);
  muzzle.scale.set(1.22, 0.72, 0.9);
  head.add(muzzle);
  const noseMesh = mesh(new THREE.SphereGeometry(0.013, 12, 10), nose, "MILO_NOSE", 0, -0.016, 0.122);
  noseMesh.scale.set(1.25, 0.7, 0.85);
  head.add(noseMesh);

  const collarMesh = mesh(new THREE.TorusGeometry(0.072, 0.011, 10, 28), collar, "MILO_COLLAR", 0, -0.078, 0.012, Math.PI / 2, 0, 0);
  head.add(collarMesh);
  head.add(mesh(new THREE.SphereGeometry(0.014, 12, 10), bell, "MILO_BELL", 0, -0.1, 0.05));
  root.add(head);

  function leg(name, x, z, whiteTip) {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(x, 0.075, z);
    g.add(mesh(new THREE.CapsuleGeometry(0.03, 0.055, 8, 12), orange, name + "_LIMB"));
    const paw = mesh(new THREE.SphereGeometry(0.032, 14, 12), whiteTip ? white : orange, name + "_PAW", 0, -0.058, 0.01);
    paw.scale.set(1.05, 0.52, 1.15);
    g.add(paw);
    root.add(g);
    return g;
  }
  leg("MILO_FRONT_LEFT_LEG", -0.058, 0.105, true);
  leg("MILO_FRONT_RIGHT_LEG", 0.058, 0.105, true);
  leg("MILO_BACK_LEFT_LEG", -0.062, -0.118, false);
  leg("MILO_BACK_RIGHT_LEG", 0.062, -0.118, false);

  const tail = new THREE.Group();
  tail.name = "MILO_TAIL";
  tail.position.set(0, 0.175, -0.185);
  let prev = tail;
  for (let i = 0; i < 8; i++) {
    const r = 0.02 - i * 0.0014;
    const seg = mesh(new THREE.CapsuleGeometry(Math.max(r, 0.009), 0.042, 6, 10), i % 2 === 1 ? stripe : orange, "MILO_TAIL_SEG_" + i, 0.01 * Math.sin(i * 0.4), 0.012 + i * 0.003, -0.04);
    seg.rotation.x = 0.28 + i * 0.07;
    seg.rotation.y = 0.12;
    prev.add(seg);
    prev = seg;
  }
  root.add(tail);
  root.scale.setScalar(MILO_SCALE * (definition.scale_constant ?? 1));
  return root;
}

function enableShadows(root) {
  root.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
}

function normalizeCharacterRoot(root) {
  enableShadows(root);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  if (size.y > 0.0001) {
    const s = TARGET_HEIGHT / size.y;
    root.scale.multiplyScalar(s);
    root.updateMatrixWorld(true);
    box.setFromObject(root);
  }
  root.position.y -= box.min.y;
  root.updateMatrixWorld(true);
}

async function loadGLBMilo(definition) {
  const url = definition.source.url || definition.source.future_glb || "./assets/characters/milo-v1.glb";
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(url);
  const wrapper = new THREE.Group();
  wrapper.name = "MILO_ROOT";
  wrapper.userData.character_id = definition.character_id;
  wrapper.userData.character_version = definition.character_version;
  wrapper.userData.source = "glb";
  wrapper.add(gltf.scene);
  normalizeCharacterRoot(wrapper);
  return wrapper;
}

export async function loadCharacter(definition) {
  const materials = new Map();
  for (const m of definition.materials || []) materials.set(m.material_id, mat(m));
  const source = definition.source || { type: "procedural" };
  if (source.type === "glb") {
    try {
      const root = await loadGLBMilo(definition);
      console.info("[Milo] loaded GLB", definition.source.url);
      return root;
    } catch (err) {
      console.warn("[Milo] GLB load failed, using procedural fallback:", err && err.message ? err.message : err);
    }
  }
  return buildProceduralMilo(definition, materials);
}

export function applyInstance(root, instance, floorY = 0.03) {
  const p = instance.position || [0, floorY, 0];
  root.position.set(p[0], floorY, p[2]);
  root.rotation.set(...(instance.rotation || [0, 0, 0]));
  const s = instance.scale || [1, 1, 1];
  root.scale.set(s[0] * MILO_SCALE, s[1] * MILO_SCALE, s[2] * MILO_SCALE);
}

export function characterInstancePayload(root, definition) {
  return {
    character_id: definition.character_id,
    character_version: definition.character_version,
    name: definition.name,
    source: definition.source,
    position: [root.position.x, root.position.y, root.position.z],
    rotation: [root.rotation.x, root.rotation.y, root.rotation.z],
    scale: [root.scale.x, root.scale.y, root.scale.z],
  };
}
