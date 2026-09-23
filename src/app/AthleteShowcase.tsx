"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { ArrowUpRight } from "lucide-react";

type Hotspot = {
  id: string;
  label: string;
  target: string;
  // Adjust these normalized coordinates when the GLB model changes: x is horizontal, y is floor-up.
  point: [number, number];
  camera: [number, number, number];
  lookAt: [number, number, number];
};

const hotspots: Hotspot[] = [
  { id: "head", label: "Badminton Headbands", target: "Apparel", point: [0.12, 4.7], camera: [1.15, 4.45, 5.1], lookAt: [0, 4.45, 0] },
  { id: "shirt", label: "Badminton T-Shirts", target: "Apparel", point: [0, 3.25], camera: [1.35, 3.2, 5.35], lookAt: [0, 3.2, 0] },
  { id: "shorts", label: "Badminton Shorts", target: "Apparel", point: [0, 2.05], camera: [1.4, 2.05, 5.4], lookAt: [0, 2.05, 0] },
  { id: "shoes", label: "Badminton Shoes", target: "Shoes", point: [0.05, 0.5], camera: [1.5, 1.05, 5.25], lookAt: [0, 0.45, 0] },
  { id: "racquet", label: "Badminton Racquets", target: "Badminton", point: [-0.58, 1.75], camera: [-2.35, 2.7, 5.35], lookAt: [-0.85, 2.45, 0] },
];

const defaultCamera = { position: new THREE.Vector3(6.4, 3.15, 8.4), lookAt: new THREE.Vector3(0, 2.55, 0) };

function getSubjectTransform(activeId: string | null) {
  if (!activeId) return "translate(-50%, -50%) scale(1)";
  const focusTransforms: Record<string, string> = {
    head: "translate(-50%, -50%) scale(1.42) translate(0, 15%)",
    shirt: "translate(-50%, -50%) scale(1.3) translate(0, 2%)",
    shorts: "translate(-50%, -50%) scale(1.38) translate(0, -14%)",
    shoes: "translate(-50%, -50%) scale(1.56) translate(0, -31%)",
    racquet: "translate(-50%, -50%) scale(1.5) translate(19%, -6%)",
  };
  return focusTransforms[activeId] ?? "translate(-50%, -50%) scale(1)";
}

function makeMaterial(color: string, roughness = 0.55, metalness = 0.05) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function createFallbackAthlete() {
  const athlete = new THREE.Group();
  const skin = makeMaterial("#b77e65", 0.8);
  const shirt = makeMaterial("#e8edf4", 0.45);
  const shorts = makeMaterial("#172b45", 0.5);
  const shoe = makeMaterial("#f5f7fa", 0.35);
  const blue = makeMaterial("#4e9bff", 0.35, 0.15);
  const dark = makeMaterial("#08111f", 0.35, 0.2);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.66, 1.1, 8, 16), shirt);
  torso.position.y = 3.05;
  torso.scale.set(1, 1, 0.62);
  athlete.add(torso);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.3, 12), skin);
  neck.position.y = 3.9;
  athlete.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.39, 16, 12), skin);
  head.position.y = 4.42;
  head.scale.set(0.92, 1.13, 0.9);
  athlete.add(head);

  const headband = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.07, 8, 24, Math.PI * 1.7), blue);
  headband.position.set(0, 4.46, 0);
  headband.rotation.x = Math.PI / 2;
  athlete.add(headband);

  const shoulder = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.8, 6, 10), skin);
  shoulder.rotation.z = Math.PI / 2;
  shoulder.position.set(-0.83, 3.3, 0);
  athlete.add(shoulder);
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.86, 6, 10), skin);
  arm.rotation.z = -0.28;
  arm.position.set(-1.14, 2.83, 0.02);
  athlete.add(arm);
  const rightArm = arm.clone();
  rightArm.rotation.z = -2.5;
  rightArm.position.set(0.82, 3.02, 0.02);
  athlete.add(rightArm);

  const shortsMesh = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.7, 0.7), shorts);
  shortsMesh.position.y = 2.25;
  shortsMesh.scale.set(1, 1, 0.82);
  athlete.add(shortsMesh);

  const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 1.4, 7, 10), skin);
  leg.position.set(-0.35, 1.3, 0);
  athlete.add(leg);
  const rightLeg = leg.clone();
  rightLeg.position.x = 0.35;
  athlete.add(rightLeg);

  const sneaker = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), shoe);
  sneaker.position.set(-0.4, 0.25, 0.13);
  sneaker.scale.set(1.35, 0.62, 1.9);
  athlete.add(sneaker);
  const rightSneaker = sneaker.clone();
  rightSneaker.position.x = 0.4;
  athlete.add(rightSneaker);
  const sole = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.08, 0.93), blue);
  sole.position.set(-0.4, 0.08, 0.13);
  athlete.add(sole);
  const rightSole = sole.clone();
  rightSole.position.x = 0.4;
  athlete.add(rightSole);

  const racquet = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.035, 6, 28), dark);
  frame.scale.set(0.73, 1, 1);
  frame.rotation.z = -0.22;
  racquet.add(frame);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.55, 8), dark);
  shaft.position.y = -0.95;
  racquet.add(shaft);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.42, 8), blue);
  grip.position.y = -1.9;
  racquet.add(grip);
  racquet.position.set(1.15, 2.5, 0.05);
  racquet.rotation.z = -0.16;
  athlete.add(racquet);

  athlete.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  return athlete;
}

export default function AthleteShowcase({ onBrowse }: { onBrowse?: (category: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeIdRef = useRef<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section || !window.WebGLRenderingContext) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: window.devicePixelRatio < 2, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(29, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.copy(defaultCamera.position);
    const cameraLookAt = defaultCamera.lookAt.clone();
    const targetPosition = defaultCamera.position.clone();
    const targetLookAt = defaultCamera.lookAt.clone();
    const clock = new THREE.Clock();
    const fallback = createFallbackAthlete();
    scene.add(fallback);

    scene.add(new THREE.HemisphereLight("#dbeaff", "#0b1421", 2.1));
    const keyLight = new THREE.DirectionalLight("#ffffff", 4.2);
    keyLight.position.set(-3, 7, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight("#4e9bff", 2.8);
    rimLight.position.set(4, 3, -4);
    scene.add(rimLight);

    const floor = new THREE.Mesh(new THREE.CircleGeometry(2.25, 48), new THREE.MeshStandardMaterial({ color: "#28486d", transparent: true, opacity: 0.24, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2;
    floor.scale.set(1.45, 0.54, 1);
    floor.position.y = 0.03;
    floor.receiveShadow = true;
    scene.add(floor);

    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
    loader.setDRACOLoader(dracoLoader);
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load("/athlete.glb", (gltf) => {
      const model = gltf.scene;
      model.scale.setScalar(2.5);
      model.position.y = 0;
      model.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });
      fallback.visible = false;
      scene.add(model);
    }, undefined, () => {
      // The local fallback stays visible until a production athlete.glb is supplied.
    });

    const setActive = (id: string | null) => {
      activeIdRef.current = id;
      setActiveId(id);
      const hotspot = hotspots.find((item) => item.id === id);
      const nextPosition: [number, number, number] = hotspot ? hotspot.camera : [defaultCamera.position.x, defaultCamera.position.y, defaultCamera.position.z];
      const nextLookAt: [number, number, number] = hotspot ? hotspot.lookAt : [defaultCamera.lookAt.x, defaultCamera.lookAt.y, defaultCamera.lookAt.z];
      targetPosition.set(...nextPosition);
      targetLookAt.set(...nextLookAt);
    };

    const updateFromPointer = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const bounds = canvas.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width;
      const y = (event.clientY - bounds.top) / bounds.height;
      const nearest = hotspots.reduce<{ item: Hotspot; distance: number } | null>((closest, item) => {
        const hotspotX = 0.5 + item.point[0] * 0.25;
        const hotspotY = 1 - item.point[1] * 0.19;
        const distance = Math.hypot(x - hotspotX, y - hotspotY);
        return !closest || distance < closest.distance ? { item, distance } : closest;
      }, null);
      setActive(nearest && nearest.distance < 0.13 ? nearest.item.id : null);
    };
    const clearPointer = () => setActive(null);
    const focusFromTap = (event: Event) => setActive((event as CustomEvent<string | null>).detail);
    canvas.addEventListener("pointermove", updateFromPointer);
    canvas.addEventListener("pointerleave", clearPointer);
    window.addEventListener("alraed-athlete-focus", focusFromTap);

    let visible = false;
    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }, { threshold: 0.05 });
    observer.observe(section);
    const resize = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    window.addEventListener("resize", resize);
    resize();

    const render = () => {
      frame = window.requestAnimationFrame(render);
      if (!visible) return;
      const elapsed = clock.getElapsedTime();
      fallback.position.y = Math.sin(elapsed * 1.35) * 0.018;
      fallback.rotation.y = Math.sin(elapsed * 0.6) * 0.012;
      camera.position.lerp(targetPosition, 0.075);
      cameraLookAt.lerp(targetLookAt, 0.09);
      camera.lookAt(cameraLookAt);
      renderer.render(scene, camera);
    };
    render();

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointermove", updateFromPointer);
      canvas.removeEventListener("pointerleave", clearPointer);
      window.removeEventListener("alraed-athlete-focus", focusFromTap);
      dracoLoader.dispose();
      renderer.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose());
          else object.material.dispose();
        }
      });
    };
  }, []);

  const active = hotspots.find((hotspot) => hotspot.id === activeId);
  const activate = (id: string) => {
    window.dispatchEvent(new CustomEvent("alraed-athlete-focus", { detail: id }));
    setActiveId(id);
  };
  const browse = (hotspot: Hotspot) => {
    activate(hotspot.id);
    onBrowse?.(hotspot.target);
    document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
  };
  const clearFocus = () => window.dispatchEvent(new CustomEvent("alraed-athlete-focus", { detail: null }));

  return (
    <section ref={sectionRef} className="athlete-section" aria-labelledby="athlete-title">
      <div className="athlete-layout">
        <aside className="athlete-sidebar">
          <div className="athlete-heading">
            <div><p className="eyebrow">THE PLAYER EDIT</p><h2 id="athlete-title">Built for<br /><em>every rally.</em></h2></div>
            <p>Shop the pieces that keep the game moving. Select a product area to bring it into focus.</p>
          </div>
          <div className="athlete-profile">
            <span className="athlete-profile-label">PERFORMANCE PROFILE</span>
            <p>Everything close to the body, nothing in the way of the next point.</p>
            <div className="athlete-profile-stats">
              <div><strong>01</strong><span>LIGHT ON<br />THE COURT</span></div>
              <div><strong>02</strong><span>READY FOR<br />THE RALLY</span></div>
              <div><strong>03</strong><span>MADE TO<br />MOVE</span></div>
            </div>
          </div>
        </aside>
        <div className="athlete-stage">
        <div className="athlete-visual">
        <canvas ref={canvasRef} aria-label="Interactive 3D badminton athlete" />
        <img
          className="athlete-subject"
          src="/hero-athlete-premium.png"
          alt="Badminton athlete wearing a headband, performance shirt, shorts and court shoes while holding a racquet"
          style={{ transform: getSubjectTransform(active?.id ?? null) }}
        />
        <div className="athlete-hotspots" aria-label="Athlete product areas">
          {hotspots.map((hotspot) => <button key={hotspot.id} className={`athlete-hotspot ${activeId === hotspot.id ? "active" : ""}`} style={{ left: `${50 + hotspot.point[0] * 25}%`, top: `${100 - hotspot.point[1] * 19}%` }} onPointerEnter={() => window.dispatchEvent(new CustomEvent("alraed-athlete-focus", { detail: hotspot.id }))} onPointerLeave={clearFocus} onPointerDown={() => browse(hotspot)} aria-label={`View ${hotspot.label}`}><span /></button>)}
        </div>
        </div>
        {active && <div className="athlete-card"><span className="eyebrow">IN THE FRAME</span><strong>{active.label}</strong><a href="#shop" onClick={(event) => { event.preventDefault(); browse(active); }}>BROWSE <ArrowUpRight size={14} /></a></div>}
        <div className="athlete-note">MOVE TO EXPLORE <span>↗</span></div>
        </div>
      </div>
    </section>
  );
}
