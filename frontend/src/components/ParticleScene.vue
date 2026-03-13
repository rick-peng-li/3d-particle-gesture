<script setup>
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useMediaPipe } from '../composables/useMediaPipe';
import { useThreeParticles } from '../composables/useThreeParticles';
import { useCustomShape } from '../composables/useCustomShape';
import '../styles/ParticleScene.css';

const container = ref(null);
const particleCount = 5000;
const currentShape = ref('heart');
const particleColor = ref('#ff0055');

const shapeLabels = {
  heart: '爱心',
  flower: '花朵',
  saturn: '土星',
  buddha: '佛像',
  firework: '烟花',
  custom: '自定义',
};

// Use Composables
const { 
  videoElement, 
  loading, 
  trackingStatus, 
  isAggregated, 
  opennessScale,
  gestureType,
  initMediaPipe, 
  detectGesture 
} = useMediaPipe();

const { 
  initThree, 
  animate, 
  updateTargetShape,
  updateDeformation 
} = useThreeParticles(
  container, 
  particleCount, 
  particleColor, 
  isAggregated, 
  detectGesture,
  opennessScale
);

// --- Custom Image Handler ---
const {
  showCustomModal,
  drawCanvas,
  openCustomModal,
  closeCustomModal,
  clearCanvas,
  startDrawing,
  stopDrawing,
  draw,
  confirmDrawing,
  triggerFileInput,
  handleFileUpload,
  fileInput
} = useCustomShape((imageData) => {
  currentShape.value = 'custom';
  updateTargetShape('custom', imageData);
});

// --- Watchers ---
watch(currentShape, (newVal) => {
    if (newVal !== 'custom') {
      updateTargetShape(newVal);
    } 
    // For 'custom', we handle the update manually in confirmDrawing or handleFileUpload
    // to avoid reopening the modal or clearing the shape.
  });

// Watch gesture type changes to deform particle shape
watch(gestureType, (newGesture) => {
    // 根据手势类型应用不同的变形
    switch(newGesture) {
      case '1finger':
        updateDeformation('letterA'); // 1根手指 - 变形为字母A
        break;
      case '2fingers':
        updateDeformation('letterB'); // 2根手指 - 变形为字母B
        break;
      case '3fingers':
        updateDeformation('letterC'); // 3根手指 - 变形为字母C
        break;
      case 'closed':
      case 'open':
      default:
        updateDeformation('none'); // 握拳或张开手掌 - 恢复默认形状
        break;
    }
  });

onMounted(async () => {
  initThree();
  updateTargetShape(currentShape.value); // Set initial shape
  await initMediaPipe();
  animate();
});
</script>

<template>
  <div class="particle-container" ref="container"></div>
  
  <video ref="videoElement" class="input_video" autoplay playsinline muted></video>

  <div class="ui-panel">
    <h1>3D 手势粒子交互</h1>
    <div class="status">{{ trackingStatus }}</div>
    
    <div class="controls">
      <div class="control-group">
        <label>形状模板</label>
        <div class="button-group">
          <button v-for="(label, key) in shapeLabels" :key="key" 
                  :class="{ active: currentShape === key }"
                  @click="key === 'custom' ? openCustomModal() : (currentShape = key)">
            {{ label }}
          </button>
        </div>
      </div>
      
      <div class="control-group">
        <label>粒子颜色</label>
        <input type="color" v-model="particleColor">
      </div>
    </div>
    
    <div class="loading-overlay" v-if="loading">
      <div class="loader"></div>
      <p>正在加载 AI 模型和摄像头...</p>
    </div>
  </div>

  <!-- Custom Drawing Modal -->
  <div class="modal-overlay" v-if="showCustomModal" @click.self="closeCustomModal">
    <div class="modal-content">
      <h2>自定义粒子形状</h2>
      <p>请在下方绘制图形，或上传图片</p>
      
      <div class="canvas-wrapper">
        <canvas ref="drawCanvas" width="300" height="300"
                @mousedown="startDrawing"
                @mousemove="draw"
                @mouseup="stopDrawing"
                @mouseleave="stopDrawing"
                @touchstart.prevent="startDrawing"
                @touchmove.prevent="draw"
                @touchend.prevent="stopDrawing"
        ></canvas>
      </div>
      
      <div class="modal-actions">
        <button @click="clearCanvas" class="secondary">清空</button>
        <button @click="triggerFileInput" class="secondary">上传图片</button>
        <input type="file" ref="fileInput" accept="image/*" style="display: none" @change="handleFileUpload" />
        <button @click="confirmDrawing" class="primary">确认生成</button>
        <button @click="closeCustomModal" class="danger">取消</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Scoped styles can remain empty or contain component-specific overrides */
</style>
