import { onMounted, onBeforeUnmount, watch } from 'vue';
import * as THREE from 'three';
import { shapeGenerators, getImagePoints, getImageContourPoints } from '../utils/shapeGenerators';

export function useThreeParticles(container, particleCount, particleColor, isAggregated, onFrame, opennessScaleRef) {
  let scene, camera, renderer, particles;
  let targetPositions = [];
  let basePositions = []; // 存储原始默认形状的位置
  let deformationType = 'none'; // 变形类型: none, letterA, letterB, letterC
  let letterAPositions = []; // 缓存字母A的位置
  let letterBPositions = []; // 缓存字母B的位置
  let letterCPositions = []; // 缓存字母C的位置
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
    // 保存原始形状作为基准位置
    basePositions = [...targetPositions];
    // 切换模型时重置变形
    deformationType = 'none';
    letterAPositions = [];
    letterBPositions = [];
    letterCPositions = [];
  }

  // 更新变形类型
  function updateDeformation(type) {
    deformationType = type;
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
    
    // Determine target state based on force and deformation type
    // We blend between:
    // 1. Base shape position (default)
    // 2. Deformed shape position (based on gesture)
    // 3. Exploded position (open palm)
    
    // 预计算字母形状的目标位置（如果需要的话）
    if (deformationType !== 'none') {
      // 只在需要的时候生成字母形状，优化性能
      if (deformationType === 'letterA' && letterAPositions.length === 0) {
        letterAPositions = shapeGenerators.letterA(particleCount);
      } else if (deformationType === 'letterB' && letterBPositions.length === 0) {
        letterBPositions = shapeGenerators.letterB(particleCount);
      } else if (deformationType === 'letterC' && letterCPositions.length === 0) {
        letterCPositions = shapeGenerators.letterC(particleCount);
      }
    }
    
    for (let i = 0; i < particleCount; i++) {
      const ix = i * 3;
      const iy = i * 3 + 1;
      const iz = i * 3 + 2;

      // 原始基准位置
      const txBase = basePositions[ix] || targetPositions[ix] || 0;
      const tyBase = basePositions[iy] || targetPositions[iy] || 0;
      const tzBase = basePositions[iz] || targetPositions[iz] || 0;
      
      // 变形后的目标位置
      let txDeformed = txBase;
      let tyDeformed = tyBase;
      let tzDeformed = tzBase;
      
      // 根据变形类型应用不同的变形
      if (deformationType === 'letterA') {
        const txLetter = letterAPositions[ix] || txBase;
        const tyLetter = letterAPositions[iy] || tyBase;
        const tzLetter = letterAPositions[iz] || tzBase;
        // 平滑过渡到字母A形状
        txDeformed = txBase + (txLetter - txBase) * 0.8;
        tyDeformed = tyBase + (tyLetter - tyBase) * 0.8;
        tzDeformed = tzBase + (tzLetter - tzBase) * 0.8;
      } else if (deformationType === 'letterB') {
        const txLetter = letterBPositions[ix] || txBase;
        const tyLetter = letterBPositions[iy] || tyBase;
        const tzLetter = letterBPositions[iz] || tzBase;
        // 平滑过渡到字母B形状
        txDeformed = txBase + (txLetter - txBase) * 0.8;
        tyDeformed = tyBase + (tyLetter - tyBase) * 0.8;
        tzDeformed = tzBase + (tzLetter - tzBase) * 0.8;
      } else if (deformationType === 'letterC') {
        const txLetter = letterCPositions[ix] || txBase;
        const tyLetter = letterCPositions[iy] || tyBase;
        const tzLetter = letterCPositions[iz] || tzBase;
        // 平滑过渡到字母C形状
        txDeformed = txBase + (txLetter - txBase) * 0.8;
        tyDeformed = tyBase + (tyLetter - tyBase) * 0.8;
        tzDeformed = tzBase + (tzLetter - tzBase) * 0.8;
      }

      // Calculate Exploded Position
      // 1. Scale up outward from center
      // 2. Add scatter noise
      
      // Explosion parameters
      const maxExplosionScale = 12.0; 
      const maxScatter = 40.0;
      
      const noiseX = Math.sin(i * 12.34);
      const noiseY = Math.cos(i * 56.78);
      const noiseZ = Math.sin(i * 90.12);
      
      // Target if fully exploded (基于变形后的位置)
      const txExplode = txDeformed * maxExplosionScale + noiseX * maxScatter;
      const tyExplode = tyDeformed * maxExplosionScale + noiseY * maxScatter;
      const tzExplode = tzDeformed * maxExplosionScale + noiseZ * maxScatter;
      
      // Interpolate based on force
      // force 0 -> txDeformed (变形后的形状)
      // force 1 -> txExplode (扩散效果)
      // Use easing for smoother transition
      
      const t = force; 
      
      const tx = txDeformed + (txExplode - txDeformed) * t;
      const ty = tyDeformed + (tyExplode - tyDeformed) * t;
      const tz = tzDeformed + (tzExplode - tzDeformed) * t;

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
    updateTargetShape,
    updateDeformation
  };
}
