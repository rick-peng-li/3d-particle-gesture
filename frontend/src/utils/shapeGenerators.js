// Shape Generators for 3D Particles

export function getSpherePoints(count) {
  const points = [];
  for (let i = 0; i < count; i++) {
    const phi = Math.acos(-1 + (2 * i) / count);
    const theta = Math.sqrt(count * Math.PI) * phi;
    const r = 20;
    points.push(
      r * Math.cos(theta) * Math.sin(phi),
      r * Math.sin(theta) * Math.sin(phi),
      r * Math.cos(phi)
    );
  }
  return points;
}

export function getHeartPoints(count) {
  const points = [];
  for (let i = 0; i < count; i++) {
    const t = Math.random() * Math.PI * 2;
    const r = Math.random(); // volume
    // Heart surface equation roughly
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    const z = (Math.random() - 0.5) * 10; // Thickness
    const scale = 1.5;
    points.push(x * scale, y * scale, z * scale);
  }
  return points;
}

export function getFlowerPoints(count) {
  const points = [];
  // Parametric Rose (Grandiflora)
  // Surface:
  // x = r * cos(theta) * r_shape
  // y = r * sin(theta) * r_shape
  // z = z_shape
  
  // r_shape logic to simulate petals:
  // r = (1 - v) * (0.5 + 0.5 * cos(k * u)) where u is angle, v is height ratio
  
  // Let's use a spiral distribution for better coverage
  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  
  for (let i = 0; i < count; i++) {
    const t = i / count; // 0 to 1
    
    // Spiral angle
    const theta = 2 * Math.PI * i * goldenRatio;
    const rBase = Math.sqrt(t); // Uniform disk distribution base
    
    // Petal modulation
    // 5 major lobes
    const k = 5; 
    const petalMod = 0.2 * Math.sin(k * theta) * rBase;
    
    // Radius with petal shape
    const radius = 25 * (rBase + petalMod);
    
    // Cup shape (z)
    // Center is lower, edges higher
    const z = 10 * Math.pow(rBase, 2) + 2 * Math.sin(10 * rBase);
    
    const x = radius * Math.cos(theta);
    const y = radius * Math.sin(theta);
    
    // Add some random thickness
    const dz = (Math.random() - 0.5) * 2;
    
    points.push(x, y, z + dz);
  }
  return points;
}

export function getSaturnPoints(count) {
  const points = [];
  const sphereCount = Math.floor(count * 0.4);
  const ringCount = count - sphereCount;

  // Sphere
  const sphere = getSpherePoints(sphereCount);
  points.push(...sphere);

  // Ring
  for (let i = 0; i < ringCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 30 + Math.random() * 15;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const y = (Math.random() - 0.5) * 2;
    points.push(x, y, z);
  }
  return points;
}

export function getBuddhaPoints(count) {
  const points = [];
  
  // Geometric composition of Buddha silhouette (Front View)
  // 1. Head (Sphere)
  // 2. Body (Ellipsoid)
  // 3. Legs/Base (Flattened Ellipsoid)
  // 4. Halo (Ring)
  
  const headCount = Math.floor(count * 0.15);
  const bodyCount = Math.floor(count * 0.35);
  const baseCount = Math.floor(count * 0.35);
  const haloCount = count - headCount - bodyCount - baseCount;
  
  // Helper for random point in sphere/ellipsoid
  const randomPoint = (rx, ry, rz, cx, cy, cz) => {
    // Uniform in volume
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = Math.cbrt(Math.random());
    
    const x = cx + rx * r * Math.sin(phi) * Math.cos(theta);
    const y = cy + ry * r * Math.sin(phi) * Math.sin(theta);
    const z = cz + rz * r * Math.cos(phi);
    return [x, y, z];
  };
  
  // 1. Head
  for (let i = 0; i < headCount; i++) {
    points.push(...randomPoint(5, 6, 5, 0, 18, 0));
  }
  
  // 2. Body (Chest + Belly)
  for (let i = 0; i < bodyCount; i++) {
    // Upper body slightly wider at bottom (pear shape)
    const t = Math.random(); // 0 top, 1 bottom
    const width = 8 + 6 * t;
    const height = 16;
    const yPos = 10 - height * t;
    points.push(...randomPoint(width, 1, 6, 0, yPos, 0)); // Flat z for silhouette
  }
  
  // 3. Base (Lotus position legs)
  for (let i = 0; i < baseCount; i++) {
    points.push(...randomPoint(18, 5, 8, 0, -10, 0));
  }
  
  // 4. Halo (Ring behind head)
  for (let i = 0; i < haloCount; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const r = 10 + Math.random() * 2; // Radius 10-12
    const x = r * Math.cos(angle);
    const y = 18 + r * Math.sin(angle); // Centered on head
    const z = -2 + (Math.random() - 0.5); // Slightly behind
    points.push(x, y, z);
  }
  
  return points;
}

export function getFireworkPoints(count) {
  const points = [];
  for (let i = 0; i < count; i++) {
    const r = 25 * Math.cbrt(Math.random()); // Uniform distribution in sphere
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(2 * Math.random() - 1);
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);
    points.push(x, y, z);
  }
  return points;
}

// Function to process image data into points
export function getImagePoints(imageData, count) {
  const points = [];
  const { width, height, data } = imageData;
  const validPixels = [];

  // Filter valid pixels
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const alpha = data[index + 3];
      
      // Check for non-transparent AND bright pixels (handling black background)
      const brightness = (r + g + b) / 3;
      if (alpha > 128 && brightness > 30) {
        validPixels.push({ x, y });
      }
    }
  }

  if (validPixels.length === 0) return getSpherePoints(count);

  // Randomly sample pixels to match particle count
  for (let i = 0; i < count; i++) {
    const pixel = validPixels[Math.floor(Math.random() * validPixels.length)];
    // Map to 3D space, centered
    // Scale down to fit view
    const scale = 0.2; 
    const x = (pixel.x - width / 2) * scale;
    const y = -(pixel.y - height / 2) * scale; // Invert Y for image coords
    const z = (Math.random() - 0.5) * 5; // Slight depth
    points.push(x, y, z);
  }

  return points;
}

// Extract contour points from image data (bright foreground on dark background)
export function getImageContourPoints(imageData, count) {
  const { width, height, data } = imageData;
  const gray = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const a = data[idx + 3];
      if (a > 128) {
        const r = data[idx], g = data[idx + 1], b = data[idx + 2];
        gray[y * width + x] = (r + g + b) / 3;
      } else {
        gray[y * width + x] = 0;
      }
    }
  }
  const mag = new Float32Array(width * height);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const gx =
        -gray[(y - 1) * width + (x - 1)] +
        gray[(y - 1) * width + (x + 1)] +
        -2 * gray[y * width + (x - 1)] +
        2 * gray[y * width + (x + 1)] +
        -gray[(y + 1) * width + (x - 1)] +
        gray[(y + 1) * width + (x + 1)];
      const gy =
        -gray[(y - 1) * width + (x - 1)] +
        -2 * gray[(y - 1) * width + x] +
        -gray[(y - 1) * width + (x + 1)] +
        gray[(y + 1) * width + (x - 1)] +
        2 * gray[(y + 1) * width + x] +
        gray[(y + 1) * width + (x + 1)];
      mag[i] = Math.hypot(gx, gy);
    }
  }
  let sum = 0, sum2 = 0, n = 0;
  for (let i = 0; i < mag.length; i++) {
    const v = mag[i];
    if (v > 0) { sum += v; sum2 += v * v; n++; }
  }
  const mean = n ? sum / n : 0;
  const std = n ? Math.sqrt(Math.max(0, sum2 / n - mean * mean)) : 0;
  const thr = mean + std * 0.5;
  const edges = [];
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      if (mag[i] >= thr && gray[i] > 30) {
        edges.push({ x, y });
      }
    }
  }
  if (edges.length === 0) return getImagePoints(imageData, count);
  const minDim = Math.min(width, height);
  const minDist = Math.max(1, (minDim / Math.sqrt(count)) * 0.6);
  const selected = [];
  for (let i = 0; i < edges.length && selected.length < count; i++) {
    const e = edges[Math.floor(Math.random() * edges.length)];
    let ok = true;
    for (let j = 0; j < selected.length; j++) {
      const dx = e.x - selected[j].x;
      const dy = e.y - selected[j].y;
      if (dx * dx + dy * dy < minDist * minDist) { ok = false; break; }
    }
    if (ok) selected.push(e);
  }
  while (selected.length < count) {
    const e = edges[Math.floor(Math.random() * edges.length)];
    selected.push(e);
  }
  const out = [];
  const scale = 0.3;
  for (let i = 0; i < count; i++) {
    const p = selected[i];
    const x = (p.x - width / 2) * scale;
    const y = -(p.y - height / 2) * scale;
    const z = (Math.random() - 0.5) * 3;
    out.push(x, y, z);
  }
  return out;
}

// Redesigned Buddha (Maitreya) using clustered Gaussians for a pleasant silhouette
export function getMaitreyaPoints(count) {
  const points = [];
  const clusters = [
    // belly
    { cx: 0, cy: -5, cz: 0, rx: 14, ry: 10, rz: 6, weight: 0.45 },
    // head
    { cx: 0, cy: 12, cz: 0, rx: 6, ry: 6, rz: 4, weight: 0.15 },
    // ears
    { cx: -6, cy: 10, cz: 0, rx: 2, ry: 4, rz: 2, weight: 0.05 },
    { cx: 6, cy: 10, cz: 0, rx: 2, ry: 4, rz: 2, weight: 0.05 },
    // arms resting on belly
    { cx: -10, cy: 0, cz: 0, rx: 6, ry: 3, rz: 3, weight: 0.1 },
    { cx: 10, cy: 0, cz: 0, rx: 6, ry: 3, rz: 3, weight: 0.1 },
    // base
    { cx: 0, cy: -15, cz: 0, rx: 18, ry: 3, rz: 6, weight: 0.1 },
  ];
  // Normalize weights
  const totalW = clusters.reduce((s, c) => s + c.weight, 0);
  clusters.forEach(c => c.weight /= totalW);

  function sampleCluster(c) {
    // Box-Muller for normal distribution
    function randn() {
      let u = 0, v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    }
    const x = c.cx + randn() * c.rx;
    const y = c.cy + randn() * c.ry;
    const z = c.cz + randn() * c.rz;
    return [x, y, z];
  }

  for (let i = 0; i < count; i++) {
    // select cluster by weight
    const r = Math.random();
    let acc = 0;
    let chosen = clusters[0];
    for (const c of clusters) {
      acc += c.weight;
      if (r <= acc) { chosen = c; break; }
    }
    const [x, y, z] = sampleCluster(chosen);
    points.push(x, y, z);
  }
  return points;
}
export function getChristmasTreePoints(count) {
  const points = [];
  
  // 分配粒子数量：树冠占大部分，树干、装饰球、正方体、糖果棍占小部分
  const treeCrownCount = Math.floor(count * 0.6); // 树冠
  const trunkCount = Math.floor(count * 0.1);    // 树干
  const ornamentBallCount = Math.floor(count * 0.15); // 装饰球
  const ornamentCubeCount = Math.floor(count * 0.1);  // 装饰正方体
  const candyCaneCount = count - treeCrownCount - trunkCount - ornamentBallCount - ornamentCubeCount; // 糖果棍
  
  // 1. 生成树冠（多层圆锥体）
  const layers = [
    { y: 0, radius: 20, height: 15 },   // 底层
    { y: 12, radius: 15, height: 12 },  // 中层
    { y: 22, radius: 10, height: 10 },  // 上层
    { y: 30, radius: 5, height: 8 },    // 顶层
  ];
  
  for (let i = 0; i < treeCrownCount; i++) {
    // 随机选择一层
    const layer = layers[Math.floor(Math.random() * layers.length)];
    // 在圆锥体内随机生成点
    const t = Math.random(); // 0 到 1，从底部到顶部
    const y = layer.y + t * layer.height;
    const radiusAtHeight = layer.radius * (1 - t * 0.8); // 越往上半径越小
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * radiusAtHeight; // 均匀分布在圆内
    
    const x = r * Math.cos(angle);
    const z = r * Math.sin(angle);
    
    points.push(x, y, z);
  }
  
  // 2. 生成树干（圆柱体）
  for (let i = 0; i < trunkCount; i++) {
    const y = -10 + Math.random() * 12; // 从-10到2，在树冠下方
    const angle = Math.random() * Math.PI * 2;
    const r = 3 + Math.random() * 2; // 半径3-5
    
    const x = r * Math.cos(angle);
    const z = r * Math.sin(angle);
    
    points.push(x, y, z);
  }
  
  // 3. 生成装饰球（散布在树冠上的小球）
  const ballColors = ['#ff0000', '#ffd700', '#00ff00', '#0000ff']; // 红、金、绿、蓝
  for (let i = 0; i < ornamentBallCount; i++) {
    // 随机在树冠区域内选择位置
    const layer = layers[Math.floor(Math.random() * layers.length)];
    const t = 0.2 + Math.random() * 0.6; // 主要分布在中下部
    const y = layer.y + t * layer.height;
    const radiusAtHeight = layer.radius * (1 - t * 0.8);
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * radiusAtHeight;
    
    const x = r * Math.cos(angle);
    const z = r * Math.sin(angle);
    
    // 添加一些偏移，让球看起来是挂在外面的
    const offset = 1.5;
    points.push(
      x + (x > 0 ? offset : -offset) * 0.3,
      y,
      z + (z > 0 ? offset : -offset) * 0.3
    );
  }
  
  // 4. 生成装饰正方体（散布在树冠上的小方块）
  for (let i = 0; i < ornamentCubeCount; i++) {
    const layer = layers[Math.floor(Math.random() * layers.length)];
    const t = 0.3 + Math.random() * 0.5;
    const y = layer.y + t * layer.height;
    const radiusAtHeight = layer.radius * (1 - t * 0.8);
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * radiusAtHeight;
    
    const x = r * Math.cos(angle);
    const z = r * Math.sin(angle);
    
    // 正方体稍微突出一点
    const offset = 1;
    points.push(
      x + (x > 0 ? offset : -offset) * 0.2,
      y + 0.5,
      z + (z > 0 ? offset : -offset) * 0.2
    );
  }
  
  // 5. 生成糖果棍（螺旋形，主要在树冠外层）
  for (let i = 0; i < candyCaneCount; i++) {
    // 螺旋参数
    const turns = 3; // 螺旋圈数
    const height = 15; // 高度
    const startY = 5; // 起始高度
    const angle = Math.random() * Math.PI * 2;
    const t = Math.random();
    const y = startY + t * height;
    const radius = 18 - t * 12; // 越往上半径越小
    const spiralAngle = angle + t * turns * Math.PI * 2;
    
    const x = radius * Math.cos(spiralAngle);
    const z = radius * Math.sin(spiralAngle);
    
    // 稍微偏离螺旋线，增加自然感
    const jitter = (Math.random() - 0.5) * 2;
    points.push(x + jitter, y + jitter * 0.5, z + jitter);
  }
  
  // 树顶星星（用一个小的星形点集）
  const starCount = 50;
  const starY = 40;
  const starRadius = 4;
  for (let i = 0; i < starCount && points.length < count * 3; i++) {
    const angle = (i / starCount) * Math.PI * 2 * 5; // 5角星
    const r = starRadius * (0.5 + 0.5 * Math.abs(Math.sin(angle * 5)));
    const x = r * Math.cos(angle);
    const z = r * Math.sin(angle);
    points.push(x, starY + (Math.random() - 0.5) * 2, z);
  }
  
  // 如果粒子数不够，补充一些随机点
  while (points.length < count * 3) {
    const layer = layers[Math.floor(Math.random() * layers.length)];
    const t = Math.random();
    const y = layer.y + t * layer.height;
    const radiusAtHeight = layer.radius * (1 - t * 0.8);
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * radiusAtHeight;
    
    points.push(r * Math.cos(angle), y, r * Math.sin(angle));
  }
  
  // 确保返回的粒子数正好是count*3
  return points.slice(0, count * 3);
}

export const shapeGenerators = {
  christmasTree: getChristmasTreePoints,
  heart: getHeartPoints,
  flower: getFlowerPoints,
  saturn: getSaturnPoints,
  buddha: getBuddhaPoints,
  firework: getFireworkPoints,
};
