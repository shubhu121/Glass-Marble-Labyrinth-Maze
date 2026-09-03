import * as THREE from 'three';

// Generates realistic procedural wood grain textures and surface maps
export class ProceduralTextureGenerator {
  private static woodFloorTexture: THREE.CanvasTexture | null = null;
  private static woodWallTexture: THREE.CanvasTexture | null = null;
  private static marbleScratchesTexture: THREE.CanvasTexture | null = null;
  private static woodNormalTexture: THREE.CanvasTexture | null = null;
  private static tabletopTexture: THREE.CanvasTexture | null = null;
  private static cabinetWoodTexture: THREE.CanvasTexture | null = null;
  private static cabinetFeltTexture: THREE.CanvasTexture | null = null;

  static resetTextures(): void {
    if (this.woodFloorTexture) {
      this.woodFloorTexture.dispose();
      this.woodFloorTexture = null;
    }
    if (this.woodWallTexture) {
      this.woodWallTexture.dispose();
      this.woodWallTexture = null;
    }
    if (this.marbleScratchesTexture) {
      this.marbleScratchesTexture.dispose();
      this.marbleScratchesTexture = null;
    }
    if (this.woodNormalTexture) {
      this.woodNormalTexture.dispose();
      this.woodNormalTexture = null;
    }
    if (this.tabletopTexture) {
      this.tabletopTexture.dispose();
      this.tabletopTexture = null;
    }
    if (this.cabinetWoodTexture) {
      this.cabinetWoodTexture.dispose();
      this.cabinetWoodTexture = null;
    }
    if (this.cabinetFeltTexture) {
      this.cabinetFeltTexture.dispose();
      this.cabinetFeltTexture = null;
    }
  }

  // Rich walnut/oak wood floor texture with wood grain lines and soft color variations
  static getWoodFloorTexture(): THREE.CanvasTexture {
    if (this.woodFloorTexture) return this.woodFloorTexture;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Base warm honey-walnut color
    const baseGrad = ctx.createLinearGradient(0, 0, size, size);
    baseGrad.addColorStop(0, '#54361c');
    baseGrad.addColorStop(0.5, '#6a4628');
    baseGrad.addColorStop(1, '#4e3118');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, size, size);

    // Subtle wood growth rings and grain fibers
    ctx.fillStyle = 'rgba(38, 20, 10, 0.08)';
    for (let i = 0; i < 350; i++) {
      const y = Math.random() * size;
      const h = 1 + Math.random() * 2.5;
      const waveFreq = 0.005 + Math.random() * 0.01;
      const waveAmp = 4 + Math.random() * 12;

      ctx.beginPath();
      for (let x = 0; x <= size; x += 10) {
        const py = y + Math.sin(x * waveFreq) * waveAmp;
        if (x === 0) ctx.moveTo(x, py);
        else ctx.lineTo(x, py);
      }
      ctx.lineWidth = h;
      ctx.strokeStyle = `rgba(${35 + Math.floor(Math.random() * 30)}, ${
        18 + Math.floor(Math.random() * 18)
      }, ${8 + Math.floor(Math.random() * 10)}, ${0.05 + Math.random() * 0.08})`;
      ctx.stroke();
    }

    // Add wooden floor plank inlays/seams (subtle grooving)
    const planks = 8;
    const plankWidth = size / planks;
    for (let p = 0; p <= planks; p++) {
      const px = p * plankWidth;
      // Dark groove
      ctx.strokeStyle = 'rgba(20, 10, 5, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, size);
      ctx.stroke();

      // Highlight bevel edge
      ctx.strokeStyle = 'rgba(255, 220, 180, 0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px + 1.5, 0);
      ctx.lineTo(px + 1.5, size);
      ctx.stroke();
    }

    // Add subtle warm luster specular highlights
    const radial = ctx.createRadialGradient(size * 0.5, size * 0.5, 50, size * 0.5, size * 0.5, size * 0.7);
    radial.addColorStop(0, 'rgba(255, 230, 200, 0.05)');
    radial.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.woodFloorTexture = texture;
    return texture;
  }

  // Polished solid hardwood for walls and outer rim
  static getWoodWallTexture(): THREE.CanvasTexture {
    if (this.woodWallTexture) return this.woodWallTexture;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Rich cherry/mahogany hue
    ctx.fillStyle = '#683b22';
    ctx.fillRect(0, 0, size, size);

    // Fine wood grain fibers running horizontally
    for (let i = 0; i < 300; i++) {
      const y = Math.random() * size;
      ctx.strokeStyle = `rgba(${30 + Math.random() * 20}, ${10 + Math.random() * 10}, 5, ${0.08 + Math.random() * 0.1})`;
      ctx.lineWidth = 0.8 + Math.random() * 1.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(
        size * 0.3,
        y + (Math.random() - 0.5) * 8,
        size * 0.7,
        y + (Math.random() - 0.5) * 8,
        size,
        y
      );
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.woodWallTexture = texture;
    return texture;
  }

  // Micro surface imperfections map for glass marble (subtle hairline swirls & dust specs)
  static getMarbleImperfectionsTexture(): THREE.CanvasTexture {
    if (this.marbleScratchesTexture) return this.marbleScratchesTexture;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Smooth baseline
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);

    // Subtle faint micro-hairline scratches
    ctx.strokeStyle = 'rgba(160, 160, 160, 0.08)';
    for (let i = 0; i < 80; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const len = 10 + Math.random() * 30;
      const angle = Math.random() * Math.PI * 2;
      ctx.lineWidth = 0.5 + Math.random() * 0.8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
      ctx.stroke();
    }

    // Micro dust specks
    for (let i = 0; i < 150; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = 0.5 + Math.random() * 1.0;
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(200, 200, 200, 0.12)' : 'rgba(100, 100, 100, 0.12)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    this.marbleScratchesTexture = texture;
    return texture;
  }

  // Realistic dark oak / walnut workbench tabletop texture
  static getTabletopTexture(): THREE.CanvasTexture {
    if (this.tabletopTexture) return this.tabletopTexture;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Rich dark warm espresso walnut
    const grad = ctx.createLinearGradient(0, 0, size, size);
    grad.addColorStop(0, '#1c140e');
    grad.addColorStop(0.5, '#281d15');
    grad.addColorStop(1, '#18110c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Subtle parallel wood grain lines
    ctx.fillStyle = 'rgba(10, 5, 2, 0.12)';
    for (let i = 0; i < 280; i++) {
      const y = Math.random() * size;
      const h = 0.8 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y + (Math.random() - 0.5) * 6);
      ctx.lineWidth = h;
      ctx.strokeStyle = `rgba(${30 + Math.random() * 20}, ${20 + Math.random() * 15}, 10, 0.08)`;
      ctx.stroke();
    }

    // Wide board planks seams
    const plankWidth = size / 4;
    for (let p = 1; p < 4; p++) {
      const px = p * plankWidth;
      ctx.strokeStyle = 'rgba(5, 3, 1, 0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, size);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.tabletopTexture = texture;
    return texture;
  }

  // Deep mahogany / walnut for the outer stationary cabinet
  static getCabinetWoodTexture(): THREE.CanvasTexture {
    if (this.cabinetWoodTexture) return this.cabinetWoodTexture;

    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Deep vintage dark walnut
    ctx.fillStyle = '#3a2012';
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 240; i++) {
      const y = Math.random() * size;
      ctx.strokeStyle = `rgba(18, 9, 4, ${0.1 + Math.random() * 0.12})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y + (Math.random() - 0.5) * 8);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.cabinetWoodTexture = texture;
    return texture;
  }

  // Acoustic dark felt lining for the interior drop cavity underneath the tilting tray
  static getCabinetFeltTexture(): THREE.CanvasTexture {
    if (this.cabinetFeltTexture) return this.cabinetFeltTexture;

    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // Dark charcoal / deep billiard green-black acoustic velvet felt
    ctx.fillStyle = '#141816';
    ctx.fillRect(0, 0, size, size);

    // Micro noise specks for velvety fabric texture
    const imgData = ctx.getImageData(0, 0, size, size);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 16;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(3, 3);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.cabinetFeltTexture = texture;
    return texture;
  }
}
