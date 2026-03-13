import { ref, onMounted, onBeforeUnmount } from 'vue';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

export function useMediaPipe() {
  const videoElement = ref(null);
  const loading = ref(true);
  const trackingStatus = ref('正在初始化...');
  const isAggregated = ref(true);
  const opennessScale = ref(0.0); // Default to 0 (fully aggregated)
  const gestureType = ref('closed'); // closed, 1finger, 2fingers, 3fingers, open
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
          // Check ALL detected hands. We'll take the hand with the most extended fingers
          let maxOpenness = 0;
          let maxExtendedCount = 0;

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

                // Track the maximum extended fingers across all hands
                if (extendedCount > maxExtendedCount) {
                    maxExtendedCount = extendedCount;
                }
            }
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
          
          // Determine gesture type based on extended finger count
          if (maxExtendedCount >= 4) {
               isAggregated.value = false;
               gestureType.value = 'open';
               trackingStatus.value = "手掌张开 (粒子扩散)";
          } else if (maxExtendedCount === 3) {
               isAggregated.value = true;
               gestureType.value = '3fingers';
               trackingStatus.value = "3根手指 (模型C)";
               opennessScale.value = 0.0;
          } else if (maxExtendedCount === 2) {
               isAggregated.value = true;
               gestureType.value = '2fingers';
               trackingStatus.value = "2根手指 (模型B)";
               opennessScale.value = 0.0;
          } else if (maxExtendedCount === 1) {
               isAggregated.value = true;
               gestureType.value = '1finger';
               trackingStatus.value = "1根手指 (模型A)";
               opennessScale.value = 0.0;
          } else {
                isAggregated.value = true;
                gestureType.value = 'closed';
                trackingStatus.value = "握拳 (默认形状)";
                opennessScale.value = 0.0;
           }
           
           // Pass the continuous factor to the particle system
          // Range: 0.0 (closed) -> 1.0 (open)
          // But we mapped opennessScale previously as 1.0 -> 2.5
          // Let's redefine opennessScale to be the interpolation factor t (0 to 1)
          // Or keep using it as multiplier? Let's use it as 'explosion force'.
          // 0 force = aggregate. >0 force = diffuse.
          
          if (gestureType.value === 'open') {
              opennessScale.value = scaleFactor; 
          }
          
      } else {
           // No hand detected -> Default
           isAggregated.value = true;
           gestureType.value = 'closed';
           trackingStatus.value = "未检测到手势";
           opennessScale.value = 0.0;
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
    gestureType,
    initMediaPipe,
    detectGesture
  };
}
