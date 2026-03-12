import { ref } from 'vue';

export function useCustomShape(onShapeConfirmed) {
  const showCustomModal = ref(false);
  const drawCanvas = ref(null);
  const savedImageData = ref(null);
  const fileInput = ref(null);
  let ctx = null;
  let isDrawing = false;
  
  const openCustomModal = () => {
    showCustomModal.value = true;
    // Wait for DOM update to get canvas
    setTimeout(() => {
      if (drawCanvas.value) {
        ctx = drawCanvas.value.getContext('2d');
        
        if (savedImageData.value) {
          ctx.putImageData(savedImageData.value, 0, 0);
        } else {
          ctx.fillStyle = 'black';
          ctx.fillRect(0, 0, drawCanvas.value.width, drawCanvas.value.height);
        }
        
        // Reset stroke styles
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
      }
    }, 100);
  };
  
  const closeCustomModal = () => {
    showCustomModal.value = false;
  };
  
  const clearCanvas = () => {
    if (ctx && drawCanvas.value) {
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, drawCanvas.value.width, drawCanvas.value.height);
    }
  };
  
  const startDrawing = (e) => {
    isDrawing = true;
    draw(e);
  };
  
  const stopDrawing = () => {
    isDrawing = false;
    if (ctx) ctx.beginPath();
  };
  
  const draw = (e) => {
    if (!isDrawing || !ctx || !drawCanvas.value) return;
    
    // Get mouse position relative to canvas
    const rect = drawCanvas.value.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  
  const confirmDrawing = () => {
    if (!ctx || !drawCanvas.value) return;
    
    const imageData = ctx.getImageData(0, 0, drawCanvas.value.width, drawCanvas.value.height);
    savedImageData.value = imageData; // Save the drawing
    
    if (onShapeConfirmed) {
      onShapeConfirmed(imageData);
    }
    closeCustomModal();
  };

  const triggerFileInput = () => {
    if (fileInput.value) fileInput.value.click();
  };

  const handleFileUpload = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file || !drawCanvas.value) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Fit image into canvas bounds with aspect ratio
        const cw = drawCanvas.value.width;
        const ch = drawCanvas.value.height;
        const scale = Math.min(cw / img.width, ch / img.height);
        const w = Math.floor(img.width * scale);
        const h = Math.floor(img.height * scale);
        const dx = Math.floor((cw - w) / 2);
        const dy = Math.floor((ch - h) / 2);
        // Draw with black background then image
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, cw, ch);
        ctx.drawImage(img, 0, 0, img.width, img.height, dx, dy, w, h);
        // Save current canvas content
        savedImageData.value = ctx.getImageData(0, 0, cw, ch);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  return {
    showCustomModal,
    drawCanvas,
    fileInput,
    openCustomModal,
    closeCustomModal,
    clearCanvas,
    startDrawing,
    stopDrawing,
    draw,
    confirmDrawing,
    triggerFileInput,
    handleFileUpload
  };
}
