/**
 * Character loader abstraction.
 * Today: procedural Milo.
 * Later: swap source.type to "glb" and load Milo.glb — callers stay the same.
 */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export const MILO_SCALE = 1.0;

function mat(def) {
  return new THREE.MeshStandardMaterial({
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
  const eye = materials.get("MAT_MILO_GREEN_EYE");
  const pupil = materials.get("MAT_MILO_PUPIL");
  const nose = materials.get("MAT_MILO_NOSE");
  const collar = materials.get("MAT_MILO_BLUE_COLLAR");

  const root = new THREE.Group();
  root.name = "MILO_ROOT";
  root.userData.character_id = definition.character_id;
  root.userData.character_version = definition.character_version;

  const body = new THREE.Group();
  body.name = "MILO_BODY";
  body.add(mesh(new THREE.SphereGeometry(0.12, 18, 14), orange, "MILO_BODY_CORE"));
  body.children[0].scale.set(1.05, 0.82, 1.45);
  body.position.y = 0.155;
  for (let i = 0; i < 4; i++) {
    const s = mesh(
      new THREE.SphereGeometry(0.045, 10, 8),
      stripe,
      "MILO_BODY_STRIPE_" + i,
      0,
      0.055,
      -0.12 + i * 0.07
    );
    s.scale.set(1.55, 0.28, 0.55);
    body.add(s);
  }
  root.add(body);

  const chest = mesh(
    new THREE.SphereGeometry(0.055, 14, 12),
    white,
    "MILO_CHEST",
    0,
    0.15,
    0.11
  );
  chest.scale.set(0.85, 0.95, 0.7);
  root.add(chest);

  const head = new THREE.Group();
  head.name = "MILO_HEAD";
  head.position.set(0, 0.30, 0.13);
  head.add(mesh(new THREE.SphereGeometry(0.095, 18, 16), orange, "MILO_HEAD_CORE"));

  head.add(mesh(new THREE.BoxGeometry(0.012, 0.04, 0.008), stripe, "MILO_BROW_L", -0.02, 0.055, 0.078));
  head.add(mesh(new THREE.BoxGeometry(0.012, 0.04, 0.008), stripe, "MILO_BROW_R", 0.02, 0.055, 0.078));
  head.add(mesh(new THREE.BoxGeometry(0.01, 0.03, 0.008), stripe, "MILO_BROW_C", 0, 0.06, 0.08));

  const earL = new THREE.Group();
  earL.name = "MILO_LEFT_EAR";
  earL.add(mesh(new THREE.ConeGeometry(0.032, 0.06, 8), orange, "MILO_LEFT_EAR_MESH", 0, 0, 0));
  const notch = mesh(new THREE.BoxGeometry(0.02, 0.012, 0.02), orange, "MILO_LEFT_EAR_NOTCH", -0.012, 0.018, 0);
  earL.add(notch);
  earL.position.set(-0.055, 0.075, -0.01);
  earL.rotation.z = 0.28;
  head.add(earL);

  const earR = mesh(new THREE.ConeGeometry(0.032, 0.06, 8), orange, "MILO_RIGHT_EAR", 0.055, 0.075, -0.01, 0, 0, -0.28);
  head.add(earR);

  const eyeL = new THREE.Group();
  eyeL.name = "MILO_LEFT_EYE";
  eyeL.position.set(-0.032, 0.012, 0.078);
  eyeL.add(mesh(new THREE.SphereGeometry(0.022, 12, 10), eye, "MILO_LEFT_EYE_BALL"));
  eyeL.add(mesh(new THREE.SphereGeometry(0.01, 10, 8), pupil, "MILO_LEFT_PUPIL", 0, 0, 0.016));
  head.add(eyeL);

  const eyeR = new THREE.Group();
  eyeR.name = "MILO_RIGHT_EYE";
  eyeR.position.set(0.032, 0.012, 0.078);
  eyeR.add(mesh(new THREE.SphereGeometry(0.022, 12, 10), eye, "MILO_RIGHT_EYE_BALL"));
  eyeR.add(mesh(new THREE.SphereGeometry(0.01, 10, 8), pupil, "MILO_RIGHT_PUPIL", 0, 0, 0.016));
  head.add(eyeR);

  const muzzle = mesh(new THREE.SphereGeometry(0.038, 12, 10), white, "MILO_MUZZLE", 0, -0.02, 0.08);
  muzzle.scale.set(1.15, 0.7, 0.85);
  head.add(muzzle);

  const noseMesh = mesh(new THREE.SphereGeometry(0.012, 10, 8), nose, "MILO_NOSE", 0, -0.012, 0.112);
  noseMesh.scale.set(1.2, 0.7, 0.8);
  head.add(noseMesh);

  const collarMesh = mesh(
    new THREE.TorusGeometry(0.07, 0.012, 8, 20),
    collar,
    "MILO_COLLAR",
    0,
    -0.07,
    0.01,
    Math.PI / 2,
    0,
    0
  );
  head.add(collarMesh);
  root.add(head);

  function leg(name, x, z, whiteTip) {
    const g = new THREE.Group();
    g.name = name;
    g.position.set(x, 0.07, z);
    g.add(mesh(new THREE.CapsuleGeometry(0.028, 0.05, 6, 10), orange, name + "_LIMB"));
    const paw = mesh(
      new THREE.SphereGeometry(0.03, 10, 8),
      whiteTip ? white : orange,
      name + "_PAW",
      0,
      -0.055,
      0.008
    );
    paw.scale.set(1, 0.55, 1.1);
    g.add(paw);
    root.add(g);
    return g;
  }
  leg("MILO_FRONT_LEFT_LEG", -0.055, 0.10, true);
  leg("MILO_FRONT_RIGHT_LEG", 0.055, 0.10, true);
  leg("MILO_BACK_LEFT_LEG", -0.06, -0.11, false);
  leg("MILO_BACK_RIGHT_LEG", 0.06, -0.11, false);

  const tail = new THREE.Group();
  tail.name = "MILO_TAIL";
  tail.position.set(0, 0.16, -0.175);
  let prev = tail;
  for (let i = 0; i < 6; i++) {
    const useStripe = i % 2 === 1;
    const seg = mesh(
      new THREE.CapsuleGeometry(0.018 - i * 0.0015, 0.045, 6, 8),
      useStripe ? stripe : orange,
      "MILO_TAIL_SEG_" + i,
      0,
      0.01 + i * 0.002,
      -0.042
    );
    seg.rotation.x = 0.35 + i * 0.08;
    prev.add(seg);
    prev = seg;
  }
  root.add(tail);

  root.scale.setScalar(MILO_SCALE * (definition.scale_constant ?? 1));
  return root;
}

export async function loadCharacter(definition) {
  const materials = new Map();
  for (const m of definition.materials || []) materials.set(m.material_id, mat(m));

  const source = definition.source || { type: "procedural" };

  if (source.type === "glb" && source.url) {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(source.url);
    const root = gltf.scene;
    root.name = "MILO_ROOT";
    root.userData.character_id = definition.character_id;
    root.userData.character_version = definition.character_version;
    return root;
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
