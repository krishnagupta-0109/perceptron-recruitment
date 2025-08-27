// js/neural-bg.module.js
// Module: interactive neural-network style background with bloom + mouse/touch interaction

import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js';
import { EffectComposer } from 'https://unpkg.com/three@0.152.2/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'https://unpkg.com/three@0.152.2/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'https://unpkg.com/three@0.152.2/examples/jsm/postprocessing/UnrealBloomPass.js';

(() => {
  // --------- Config ----------
  const container = document.getElementById('particles-js') || document.body;
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || window.innerWidth < 600;
  const PARTICLE_COUNT = isMobile ? 120 : 420;   // tune for performance
  const MAX_CONNECTIONS = 3;                     // edges per particle
  const PARTICLE_AREA = 80;                      // spread area (larger = sparser)
  const ATTRACTION_STRENGTH = isMobile ? 0.0006 : 0.0012;
  const DAMPING = 0.97;

  // --------- Renderer / Scene / Camera ----------
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 120;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.domElement.style.position = 'fixed';
  renderer.domElement.style.top = '0';
  renderer.domElement.style.left = '0';
  renderer.domElement.style.zIndex = '-2'; // behind your UI
  renderer.domElement.style.pointerEvents = 'none'; // allow UI clicks through canvas
  container.appendChild(renderer.domElement);

  // Composer + Bloom
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight),
                                        isMobile ? 0.6 : 1.4, 0.4, 0.85);
  composer.addPass(bloomPass);

  // --------- Helper: soft particle sprite texture ----------
  function createSoftSprite() {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.2, 'rgba(0,255,255,0.95)');
    grad.addColorStop(0.45, 'rgba(0,255,255,0.25)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,size,size);
    return new THREE.CanvasTexture(canvas);
  }
  const spriteTex = createSoftSprite();

  // --------- Create particle system ----------
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const velocities = new Float32Array(PARTICLE_COUNT * 3);
  for (let i=0;i<PARTICLE_COUNT;i++){
    positions[i*3]   = (Math.random() - 0.5) * PARTICLE_AREA;
    positions[i*3+1] = (Math.random() - 0.5) * (PARTICLE_AREA * 0.6);
    positions[i*3+2] = (Math.random() - 0.5) * 30;
    velocities[i*3] = (Math.random()-0.5) * 0.02;
    velocities[i*3+1] = (Math.random()-0.5) * 0.02;
    velocities[i*3+2] = (Math.random()-0.5) * 0.02;
  }

  const pointsGeo = new THREE.BufferGeometry();
  pointsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const pointsMat = new THREE.PointsMaterial({
    size: isMobile ? 2.2 : 3.6,
    map: spriteTex,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const points = new THREE.Points(pointsGeo, pointsMat);
  scene.add(points);

  // --------- Create initial nearest-neighbour connections (computed once) ----------
  const neighborIndex = new Uint16Array(PARTICLE_COUNT * MAX_CONNECTIONS); // store neighbor indices
  (function computeNeighbors() {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // compute distances
      const dists = [];
      const ix = i*3;
      const px = positions[ix], py = positions[ix+1], pz = positions[ix+2];
      for (let j = 0; j < PARTICLE_COUNT; j++) {
        if (i === j) continue;
        const jx = j*3;
        const dx = px - positions[jx], dy = py - positions[jx+1], dz = pz - positions[jx+2];
        dists.push({ j, d: dx*dx + dy*dy + dz*dz });
      }
      dists.sort((a,b)=>a.d-b.d);
      for (let k=0;k<MAX_CONNECTIONS;k++){
        neighborIndex[i*MAX_CONNECTIONS + k] = dists[k] ? dists[k].j : 0;
      }
    }
  })();

  // Line segments geometry (will be updated each frame from neighborIndex)
  const linePositions = new Float32Array(PARTICLE_COUNT * MAX_CONNECTIONS * 6);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
  const lineMat = new THREE.LineBasicMaterial({
    color: 0x00ffff,
    transparent: true,
    opacity: 0.55,
    linewidth: 1 // note: linewidth may not work on all platforms
  });
  const lines = new THREE.LineSegments(lineGeo, lineMat);
  scene.add(lines);

  // --------- Interaction data ----------
  const attractor = new THREE.Vector3(9999,9999,0); // far away initial
  const mouseN = { x: 9999, y: 9999 };

  function onPointerMove(clientX, clientY) {
    mouseN.x = (clientX / window.innerWidth) * 2 - 1;
    mouseN.y = -(clientY / window.innerHeight) * 2 + 1;
    // convert normalized to world - small Z near center
    const vec = new THREE.Vector3(mouseN.x, mouseN.y, 0.5).unproject(camera);
    attractor.copy(vec);
  }

  window.addEventListener('mousemove', (e) => onPointerMove(e.clientX, e.clientY));
  window.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches[0]) {
      onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });

  // click/tap burst
  window.addEventListener('click', (e) => createBurst(e.clientX, e.clientY));
  window.addEventListener('touchstart', (e) => {
    if (e.touches && e.touches[0]) createBurst(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  // Burst particle pool
  const bursts = [];

  function createBurst(clientX, clientY) {
    const world = new THREE.Vector3((clientX/window.innerWidth)*2-1, -(clientY/window.innerHeight)*2+1, 0.5).unproject(camera);
    const count = isMobile ? 12 : 26;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count*3);
    const vel = new Float32Array(count*3);
    for (let i=0;i<count;i++){
      pos[i*3] = world.x; pos[i*3+1] = world.y; pos[i*3+2] = world.z;
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.6 + Math.random() * 1.2;
      vel[i*3] = Math.cos(angle) * speed * (0.6 + Math.random());
      vel[i*3+1] = Math.sin(angle) * speed * (0.6 + Math.random());
      vel[i*3+2] = (Math.random()-0.5)*0.8;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      size: isMobile ? 1.6 : 2.6,
      map: spriteTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const p = new THREE.Points(geo, mat);
    scene.add(p);
    bursts.push({ mesh: p, vel, life: 0, maxLife: 60 });
  }

  // --------- Resize ----------
  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  }
  window.addEventListener('resize', onResize);

  // --------- Animation loop ----------
  function animate() {
    requestAnimationFrame(animate);

    // move core particles
    for (let i=0;i<PARTICLE_COUNT;i++){
      const ix = i*3;
      // attraction:
      const dx = attractor.x - positions[ix];
      const dy = attractor.y - positions[ix+1];
      const dz = attractor.z - positions[ix+2];
      const dist2 = dx*dx + dy*dy + dz*dz + 0.0001;
      const factor = ATTRACTION_STRENGTH / Math.sqrt(dist2);

      velocities[ix] += dx * factor;
      velocities[ix+1] += dy * factor;
      velocities[ix+2] += dz * factor * 0.2; // less Z pull

      // noise + damping
      velocities[ix] += (Math.random()-0.5)*0.002;
      velocities[ix+1] += (Math.random()-0.5)*0.002;
      velocities[ix+2] += (Math.random()-0.5)*0.002;

      velocities[ix] *= DAMPING;
      velocities[ix+1] *= DAMPING;
      velocities[ix+2] *= DAMPING;

      positions[ix] += velocities[ix];
      positions[ix+1] += velocities[ix+1];
      positions[ix+2] += velocities[ix+2];

      // bounds wrap
      const halfX = PARTICLE_AREA/2;
      const halfY = (PARTICLE_AREA*0.6)/2;
      if (positions[ix] > halfX) positions[ix] = -halfX;
      if (positions[ix] < -halfX) positions[ix] = halfX;
      if (positions[ix+1] > halfY) positions[ix+1] = -halfY;
      if (positions[ix+1] < -halfY) positions[ix+1] = halfY;
      if (positions[ix+2] > 40) positions[ix+2] = -40;
      if (positions[ix+2] < -40) positions[ix+2] = 40;
    }

    // update points geometry
    pointsGeo.attributes.position.needsUpdate = true;

    // update lines by reading neighborIndex -> linePositions
    let lp = 0;
    for (let i=0;i<PARTICLE_COUNT;i++){
      const iix = i*3;
      for (let k=0;k<MAX_CONNECTIONS;k++){
        const j = neighborIndex[i*MAX_CONNECTIONS + k];
        const jj = j*3;
        linePositions[lp++] = positions[iix];
        linePositions[lp++] = positions[iix+1];
        linePositions[lp++] = positions[iix+2];
        linePositions[lp++] = positions[jj];
        linePositions[lp++] = positions[jj+1];
        linePositions[lp++] = positions[jj+2];
      }
    }
    lineGeo.attributes.position.needsUpdate = true;

    // update bursts
    for (let b = bursts.length-1; b >= 0; b--) {
      const item = bursts[b];
      item.life++;
      const posAttr = item.mesh.geometry.attributes.position;
      for (let i=0;i<posAttr.count;i++){
        posAttr.array[i*3] += item.vel[i*3]*0.9;
        posAttr.array[i*3+1] += item.vel[i*3+1]*0.9;
        posAttr.array[i*3+2] += item.vel[i*3+2]*0.9;
        // slow down
        item.vel[i*3] *= 0.92;
        item.vel[i*3+1] *= 0.92;
        item.vel[i*3+2] *= 0.92;
      }
      posAttr.needsUpdate = true;
      // fade & remove
      item.mesh.material.opacity = Math.max(0, 1 - item.life / item.maxLife);
      if (item.life > item.maxLife) {
        scene.remove(item.mesh);
        item.mesh.geometry.dispose();
        item.mesh.material.dispose();
        bursts.splice(b, 1);
      }
    }

    // small flicker effect (simulate neurons firing) - tweak points size occasionally
    if (Math.random() < 0.02) {
      points.material.size = (isMobile?2.2:3.6) * (0.9 + Math.random()*0.6);
    } else {
      points.material.size += ( (isMobile?2.2:3.6) - points.material.size ) * 0.06;
    }

    // render with composer for bloom
    composer.render();
  }

  animate();

})();
