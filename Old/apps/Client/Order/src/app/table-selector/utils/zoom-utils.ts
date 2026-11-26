export class ZoomUtils {
  minZoomLevel = 0.3;
  maxZoomLevel = 10;
  roomsZoomThreshold = 0.5;
  roomZoom = 0.7;
  tableZoom = 0.5;

  zoomIn(mouseX: number, mouseY: number, zoomLevel: number, panX: number, panY: number, canvas: HTMLCanvasElement) {
    if (zoomLevel <= this.maxZoomLevel) {
      return this.zoom(mouseX, mouseY, 1.05, zoomLevel, panX, panY, canvas);
    }
    return { zoomLevel, panX, panY };
  }

  zoomOut(mouseX: number, mouseY: number, zoomLevel: number, panX: number, panY: number, canvas: HTMLCanvasElement) {
    if (zoomLevel > this.minZoomLevel) {
      return this.zoom(mouseX, mouseY, 1 / 1.05, zoomLevel, panX, panY, canvas);
    }
    return { zoomLevel, panX, panY };
  }

  zoom(
    mouseX: number,
    mouseY: number,
    scaleFactor: number,
    currentZoom: number,
    currentPanX: number,
    currentPanY: number,
    canvas: HTMLCanvasElement
  ) {
    const rect = canvas.getBoundingClientRect();
    const x = mouseX - rect.left;
    const y = mouseY - rect.top;

    const newZoomLevel = currentZoom * scaleFactor;
    const newPanX = x - (x - currentPanX) * (newZoomLevel / currentZoom);
    const newPanY = y - (y - currentPanY) * (newZoomLevel / currentZoom);

    return {
      zoomLevel: newZoomLevel,
      panX: newPanX,
      panY: newPanY
    };
  }

  animateZoom(
    targetX: number,
    targetY: number,
    targetZoom: number,
    startZoom: number,
    startPanX: number,
    startPanY: number,
    canvas: HTMLCanvasElement,
    onUpdate: (zoom: number, panX: number, panY: number) => void
  ) {
    const duration = 500;
    const startTime = performance.now();
    const rect = canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const finalPanX = centerX - targetX * targetZoom;
    const finalPanY = centerY - targetY * targetZoom;

    const easeInOutQuad = (t: number) =>
      t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

    const animate = (currentTime: number) => {
      const elapsedTime = currentTime - startTime;
      let progress = Math.min(elapsedTime / duration, 1);
      progress = easeInOutQuad(progress);

      const newZoom = startZoom + (targetZoom - startZoom) * progress;
      const newPanX = startPanX + (finalPanX - startPanX) * progress;
      const newPanY = startPanY + (finalPanY - startPanY) * progress;

      onUpdate(newZoom, newPanX, newPanY);

      if (elapsedTime < duration) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }
} 