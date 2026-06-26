export function setupCanvas(containerId: string, width: number = 224, height: number = 256): HTMLCanvasElement {
  const container = document.getElementById(containerId);
  if (!container) throw new Error(`Container ${containerId} not found`);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  // Basic styling for crisp pixels
  canvas.style.imageRendering = 'pixelated';
  canvas.style.width = `${width * 2}px`; // Scale up for visibility
  canvas.style.height = `${height * 2}px`;
  canvas.style.backgroundColor = '#000';

  container.appendChild(canvas);
  return canvas;
}
