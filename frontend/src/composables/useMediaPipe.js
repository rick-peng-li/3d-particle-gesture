import { ref, onMounted, onBeforeUnmount } from 'vue';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

export function useMediaPipe() {
  const videoElement = ref(null);
  const loading = ref(true);
  const trackingStatus = ref('正在初始化...');
  const isAggregated = ref(true);
  const opennessScale = ref(0.0); // Default to 0 (fully aggregated)
  const fingerCount = ref(0); // 伸出的手指数量 (0-5)
  const letterMode = ref(null); // null = 正常模式, 'A'/'B'/'C' = 字母模式
  let handLandmarker = null;
  let lastVideoTime = -1;

  async function initMediaPipe() {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://unpkg.com/@mediapipe/tasks-vision@0.10.14/wasm"
      );
      handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 2
      });

      // Start Camera
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoElement.value) {
        videoElement.value.srcObject = stream;
        videoElement.value.addEventListener('loadeddata', () => {
          loading.value = false;
        });
      }

    } catch (error) {
      console.error("Error initializing MediaPipe:", error);
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        trackingStatus.value = "请允许摄像头权限以使用手势功能";
      } else {
        trackingStatus.value = "错误：摄像头或模型加载失败";
      }
      loading.value = false;
    }
  }

  function detectGesture() {
    if (handLandmarker && 
        videoElement.value && 
        videoElement.value.readyState >= 2 && 
        videoElement.value.videoWidth > 0 && 
        videoElement.value.videoHeight > 0) {
      
      let now = performance.now();
      let results = handLandmarker.detectForVideo(videoElement.value, now);
      
      if (results.landmarks && results.landmarks.length > 0) {
          // Check ALL detected hands. If ANY hand is open, trigger diffusion.
          let maxOpenness = 0;
          let anyHandOpen = false;

          for (const landmarks of results.landmarks) {
            const wrist = landmarks[0];
            const middleFingerMCP = landmarks[9]; // Middle finger base
            
            // Hand scale reference (Wrist to Middle MCP)
            const scaleRef = Math.sqrt(
                Math.pow(middleFingerMCP.x - wrist.x, 2) + 
                Math.pow(middleFingerMCP.y - wrist.y, 2)
            );

            if (scaleRef > 0) {
                // Check 4 fingers: Index(8), Middle(12), Ring(16), Pinky(20)
                const fingerTips = [8, 12, 16, 20];
                let extendedCount = 0;
                let currentHandOpenness = 0;

                fingerTips.forEach(tipIdx => {
                    const tip = landmarks[tipIdx];
                    const distToWrist = Math.sqrt(
                        Math.pow(tip.x - wrist.x, 2) + 
                        Math.pow(tip.y - wrist.y, 2)
                    );
                    
                    // Normalize distance by hand scale
                    const ratio = distToWrist / scaleRef;
                    currentHandOpenness += ratio;

                    // Threshold for "extended" finger
                    if (ratio > 1.6) {
                        extendedCount++;
                    }
                });
                
                // Average openness for this hand
                currentHandOpenness /= 4;
                if (currentHandOpenness > maxOpenness) {
                    maxOpenness = currentHandOpenness;
                }

                // If at least 4 fingers extended, this hand is "Open"
                if (extendedCount >= 4) {
                    anyHandOpen = true;
                }
            }
          }

          // 计算伸出的手指数量
          let maxExtendedCount = 0;
          for (const landmarks of results.landmarks) {
            const wrist = landmarks[0];
            const middleFingerMCP = landmarks[9];
            const scaleRef = Math.sqrt(
                Math.pow(middleFingerMCP.x - wrist.x, 2) + 
                Math.pow(middleFingerMCP.y - wrist.y, 2)
            );
            
            if (scaleRef > 0) {
              // 检查5根手指: Thumb(4), Index(8), Middle(12), Ring(16), Pinky(20)
              // 拇指使用不同的检测逻辑
              const fingerTips = [4, 8, 12, 16, 20];
              const fingerPips = [2, 6, 10, 14, 18]; // 关节位置
              let extendedCount = 0;
              
              // 食指到小指
              for (let i = 1; i < 5; i++) {
                const tip = landmarks[fingerTips[i]];
                const pip = landmarks[fingerPips[i]];
                const distTip = Math.sqrt(
                    Math.pow(tip.x - wrist.x, 2) + 
                    Math.pow(tip.y - wrist.y, 2)
                );
                const distPip = Math.sqrt(
                    Math.pow(pip.x - wrist.x, 2) + 
                    Math.pow(pip.y - wrist.y, 2)
                );
                
                // 指尖比关节离手腕更远，说明手指伸出
                if (distTip > distPip * 1.2) {
                  extendedCount++;
                }
              }
              
              // 拇指检测：指尖x坐标与关节x坐标的比较（根据手的方向）
              const thumbTip = landmarks[4];
              const thumbIp = landmarks[3];
              const thumbMcp = landmarks[2];
              // 简单判断：拇指指尖远离其他手指根部
              const thumbDist = Math.sqrt(
                  Math.pow(thumbTip.x - wrist.x, 2) + 
                  Math.pow(thumbTip.y - wrist.y, 2)
              );
              if (thumbDist > scaleRef * 1.1) {
                extendedCount++;
              }
              
              if (extendedCount > maxExtendedCount) {
                maxExtendedCount = extendedCount;
              }
            }
          }
          
          // 更新手指数量
          fingerCount.value = maxExtendedCount;
          
          // 根据手指数量设置字母模式
          if (maxExtendedCount >= 1 && maxExtendedCount <= 3) {
            letterMode.value = ['A', 'B', 'C'][maxExtendedCount - 1];
          } else {
            letterMode.value = null;
          }

          // Global State Logic:
          // Smooth mapping: no hard binary switch.
          // Map maxOpenness to both state and scale continuously.
          
          // Thresholds for logic state (just for UI text feedback)
          const openThreshold = 1.4; 
          
          // Clamp openness to a useful range [1.0, 2.4]
          // 1.0 = Closed fist
          // 2.4 = Fully extended fingers (reduced from 3.0 to make 100% easier to reach)
          const minOpen = 1.0;
          const maxOpen = 2.4; 
          const clamped = Math.min(Math.max(maxOpenness, minOpen), maxOpen);
          
          // Map to 0..1 progress
          const progress = (clamped - minOpen) / (maxOpen - minOpen);
          
          // Apply linear mapping for more direct control (1:1 feel)
          const scaleFactor = progress; 
          
          // Update scale: 0.0 (aggregated) to 1.0 (max diffusion)
          // We will use this value in Three.js to lerp positions
          // 0 = Target Shape, 1 = Explosion
          // Note: isAggregated boolean is now less important for logic, mainly for UI text
          
          // 根据手指数量更新状态文本
          let fingerText = "";
          if (maxExtendedCount === 1) fingerText = " - 变形为字母A";
          else if (maxExtendedCount === 2) fingerText = " - 变形为字母B";
          else if (maxExtendedCount === 3) fingerText = " - 变形为字母C";
          
          if (maxOpenness > openThreshold) {
               isAggregated.value = false;
               trackingStatus.value = "手掌张开 (粒子扩散)" + fingerText;
          } else {
                isAggregated.value = true;
                trackingStatus.value = "握拳/其他 (粒子聚合)" + fingerText;
                opennessScale.value = 0.0;
           }
           
           // Pass the continuous factor to the particle system
          // Range: 0.0 (closed) -> 1.0 (open)
          // But we mapped opennessScale previously as 1.0 -> 2.5
          // Let's redefine opennessScale to be the interpolation factor t (0 to 1)
          // Or keep using it as multiplier? Let's use it as 'explosion force'.
          // 0 force = aggregate. >0 force = diffuse.
          
          opennessScale.value = scaleFactor; 
          
      } else {
           // No hand detected -> Default
           isAggregated.value = true;
           trackingStatus.value = "未检测到手势";
           opennessScale.value = 0.0;
           fingerCount.value = 0;
           letterMode.value = null;
       }
     }
   }

  onBeforeUnmount(() => {
    if (videoElement.value && videoElement.value.srcObject) {
      videoElement.value.srcObject.getTracks().forEach(track => track.stop());
    }
  });

  return {
    videoElement,
    loading,
    trackingStatus,
    isAggregated,
    opennessScale,
    fingerCount,
    letterMode,
    initMediaPipe,
    detectGesture
  };
}
