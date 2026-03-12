import { onMounted, onBeforeUnmount, watch } from 'vue';
import * as THREE from 'three';
import { shapeGenerators, getImagePoints, getImageContourPoints } from '../utils/shapeGenerators';

export function useThreeParticles(container, particleCount, particleColor, isAggregated, onFrame, opennessScaleRef) {
  let scene, camera, renderer, particles;
  let targetPositions = [];
  let animationId;
  
  // Initialize Three.js
  function initThree() {
    if (!container.value) return;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 60;

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    container.value.appendChild(renderer.domElement);

    // Particles
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    // Initial random positions
    for (let i = 0; i < particleCount * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 100;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: particleColor.value,
      size: 0.5,
      transparent: true,
      opacity: 0.8,
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Initial Target (default to sphere if no shape set yet)
    // updateTargetShape('heart'); // This will be called from component
  }

  // Update target positions based on shape name or custom image data
  function updateTargetShape(shapeName, customImageData = null) {
    if (shapeName === 'custom' && customImageData) {
      // Prefer contour points for cleaner outlines
      targetPositions = getImageContourPoints(customImageData, particleCount);
    } else if (shapeGenerators[shapeName]) {
      targetPositions = shapeGenerators[shapeName](particleCount);
    }
  }

  // Animation Loop
  function animate() {
    animationId = requestAnimationFrame(animate);

    if (onFrame) onFrame();

    if (!particles) return;

    const positions = particles.geometry.attributes.position.array;
    const speed = 0.05; // Lerp speed

    // We use opennessScaleRef as a normalized factor (0.0 = fully closed, 1.0 = fully open)
    // 0.0 -> aggregate to shape
    // 1.0 -> diffuse maximally
    const force = opennessScaleRef ? (opennessScaleRef.value || 0) : 0;
    
    // Determine target state based on force
    // We blend between "Target Shape Position" and "Exploded Position"
    
    for (let i = 0; i < particleCount; i++) {
      const ix = i * 3;
      const iy = i * 3 + 1;
      const iz = i * 3 + 2;

      const txBase = targetPositions[ix] || 0;
      const tyBase = targetPositions[iy] || 0;
      const tzBase = targetPositions[iz] || 0;

      // Calculate Exploded Position
      // 1. Scale up outward from center
      // 2. Add scatter noise
      
      // Explosion parameters
      const maxExplosionScale = 12.0; 
      const maxScatter = 40.0;
      
      const noiseX = Math.sin(i * 12.34);
      const noiseY = Math.cos(i * 56.78);
      const noiseZ = Math.sin(i * 90.12);
      
      // Target if fully exploded
      const txExplode = txBase * maxExplosionScale + noiseX * maxScatter;
      const tyExplode = tyBase * maxExplosionScale + noiseY * maxScatter;
      const tzExplode = tzBase * maxExplosionScale + noiseZ * maxScatter;
      
      // Interpolate based on force
      // force 0 -> txBase
      // force 1 -> txExplode
      // Use easing for smoother transition
      
      const t = force; 
      
      const tx = txBase + (txExplode - txBase) * t;
      const ty = tyBase + (tyExplode - tyBase) * t;
      const tz = tzBase + (tzExplode - tzBase) * t;

      // Lerp towards target
      positions[ix] += (tx - positions[ix]) * speed;
      positions[iy] += (ty - positions[iy]) * speed;
      positions[iz] += (tz - positions[iz]) * speed;
    }

    particles.geometry.attributes.position.needsUpdate = true;
    particles.rotation.y += 0.002;

    renderer.render(scene, camera);
  }

  function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // Watchers
  watch(particleColor, (newVal) => {
    if (particles) {
      particles.material.color.set(newVal);
    }
  });

  onMounted(() => {
    window.addEventListener('resize', onWindowResize);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('resize', onWindowResize);
    cancelAnimationFrame(animationId);
    if (renderer) renderer.dispose();
  });

  return {
    initThree,
    animate,
    updateTargetShape
  };
}
