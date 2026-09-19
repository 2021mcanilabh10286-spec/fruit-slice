/**
 * Fruit entity & FruitHalf entity
 * Procedurally rendered, high-resolution arcade fruits with rich cut interiors.
 */

import { JuiceParticle, JuiceSplatDecal } from './Particle';

export const FRUIT_TYPES = {
  WATERMELON: {
    id: 'watermelon',
    name: 'Watermelon',
    radius: 46,
    points: 1,
    juiceColor: '#ff2d55',
    splatColor: 'rgba(230, 20, 60, 0.45)',
  },
  ORANGE: {
    id: 'orange',
    name: 'Orange',
    radius: 40,
    points: 2,
    juiceColor: '#ff8c00',
    splatColor: 'rgba(255, 140, 0, 0.45)',
  },
  APPLE: {
    id: 'apple',
    name: 'Green Apple',
    radius: 38,
    points: 2,
    juiceColor: '#a6e22e',
    splatColor: 'rgba(166, 226, 46, 0.45)',
  },
  BANANA: {
    id: 'banana',
    name: 'Banana',
    radius: 42,
    points: 3,
    juiceColor: '#ffe600',
    splatColor: 'rgba(255, 230, 0, 0.45)',
  },
  STRAWBERRY: {
    id: 'strawberry',
    name: 'Strawberry',
    radius: 32,
    points: 4,
    juiceColor: '#e8175d',
    splatColor: 'rgba(232, 23, 93, 0.45)',
  },
  PINEAPPLE: {
    id: 'pineapple',
    name: 'Pineapple',
    radius: 48,
    points: 5,
    juiceColor: '#ffcc00',
    splatColor: 'rgba(255, 204, 0, 0.45)',
  },
  COCONUT: {
    id: 'coconut',
    name: 'Coconut',
    radius: 42,
    points: 3,
    juiceColor: '#f7f1e3',
    splatColor: 'rgba(240, 235, 220, 0.45)',
  },
  FRENZY: {
    id: 'frenzy',
    name: 'Dragon Frenzy',
    radius: 44,
    points: 10,
    juiceColor: '#ff007f',
    splatColor: 'rgba(255, 0, 127, 0.5)',
    isSpecial: true,
  },
};

export class Fruit {
  constructor(canvasWidth, canvasHeight, forcedType = null) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;

    // Pick type
    const types = Object.values(FRUIT_TYPES);
    if (forcedType) {
      this.typeConfig = forcedType;
    } else {
      // 5% chance for dragon frenzy fruit
      if (Math.random() < 0.05) {
        this.typeConfig = FRUIT_TYPES.FRENZY;
      } else {
        const standardTypes = types.filter((t) => !t.isSpecial);
        this.typeConfig = standardTypes[Math.floor(Math.random() * standardTypes.length)];
      }
    }

    this.type = this.typeConfig.id;
    this.radius = this.typeConfig.radius;
    this.points = this.typeConfig.points;
    this.juiceColor = this.typeConfig.juiceColor;
    this.splatColor = this.typeConfig.splatColor;
    this.isSpecial = !!this.typeConfig.isSpecial;

    // Spawn physics: spawn near bottom with upward parabolic trajectory
    const margin = this.radius + 60;
    this.x = margin + Math.random() * (canvasWidth - margin * 2);
    this.y = canvasHeight + this.radius + 10;

    // Velocity
    // Target somewhere in the upper-middle quadrant of the screen
    const targetX = canvasWidth * 0.2 + Math.random() * (canvasWidth * 0.6);
    const targetY = canvasHeight * 0.15 + Math.random() * (canvasHeight * 0.25);
    
    // Calculate parabolic launch
    this.gravity = 680; // px/s^2
    const timeToPeak = 1.1 + Math.random() * 0.35;
    this.vy = -(this.gravity * timeToPeak);
    this.vx = (targetX - this.x) / timeToPeak;

    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 4; // rad/s
    this.isSliced = false;
    this.missed = false;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += this.gravity * dt;
    this.rotation += this.rotSpeed * dt;

    // If fruit falls below screen after reaching apex
    if (this.vy > 0 && this.y > this.canvasHeight + this.radius + 50) {
      this.missed = true;
    }
  }

  slice(sliceAngle, particlesArray, decalsArray) {
    this.isSliced = true;

    // Calculate normal vector perpendicular to slice
    const normalX = -Math.sin(sliceAngle);
    const normalY = Math.cos(sliceAngle);
    const kickSpeed = 160 + Math.random() * 80;

    const initialHalfAngle = sliceAngle - Math.PI / 2;
    const half1 = new FruitHalf(
      this.x + normalX * 8,
      this.y + normalY * 8,
      this.vx + normalX * kickSpeed,
      this.vy + normalY * kickSpeed,
      initialHalfAngle,
      -(2.5 + Math.random() * 2.5),
      this.radius,
      this.typeConfig,
      1,
      sliceAngle
    );

    const half2 = new FruitHalf(
      this.x - normalX * 8,
      this.y - normalY * 8,
      this.vx - normalX * kickSpeed,
      this.vy - normalY * kickSpeed,
      initialHalfAngle,
      (2.5 + Math.random() * 2.5),
      this.radius,
      this.typeConfig,
      -1,
      sliceAngle
    );

    // Spawn juicy splatter particles
    const particleCount = this.isSpecial ? 35 : 20;
    for (let i = 0; i < particleCount; i++) {
      particlesArray.push(new JuiceParticle(this.x, this.y, this.juiceColor, sliceAngle));
    }

    // Spawn wall decal splat
    decalsArray.push(new JuiceSplatDecal(this.x, this.y, this.splatColor));

    return [half1, half2];
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    if (this.isSpecial) {
      this.drawSpecialAura(ctx);
    }

    switch (this.type) {
      case 'watermelon':
        this.drawWatermelon(ctx);
        break;
      case 'orange':
        this.drawOrange(ctx);
        break;
      case 'apple':
        this.drawApple(ctx);
        break;
      case 'banana':
        this.drawBanana(ctx);
        break;
      case 'strawberry':
        this.drawStrawberry(ctx);
        break;
      case 'pineapple':
        this.drawPineapple(ctx);
        break;
      case 'coconut':
        this.drawCoconut(ctx);
        break;
      case 'frenzy':
        this.drawFrenzyFruit(ctx);
        break;
      default:
        this.drawWatermelon(ctx);
    }

    ctx.restore();
  }

  drawSpecialAura(ctx) {
    ctx.save();
    const glowGradient = ctx.createRadialGradient(0, 0, this.radius * 0.5, 0, 0, this.radius * 1.5);
    glowGradient.addColorStop(0, 'rgba(255, 0, 128, 0.6)');
    glowGradient.addColorStop(0.6, 'rgba(255, 215, 0, 0.4)');
    glowGradient.addColorStop(1, 'rgba(255, 0, 128, 0)');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawWatermelon(ctx) {
    const r = this.radius;
    // Outer green sphere with gradient
    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.2, 0, 0, r);
    grad.addColorStop(0, '#2ecc71');
    grad.addColorStop(0.7, '#1b5e20');
    grad.addColorStop(1, '#0d3813');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Dark wavy stripes
    ctx.strokeStyle = '#07240c';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 12, -r + 4);
      ctx.bezierCurveTo(i * 18 - 8, -r * 0.3, i * 18 + 8, r * 0.3, i * 12, r - 4);
      ctx.stroke();
    }

    // Stem
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(6, -r - 10, 12, -r - 8);
    ctx.stroke();
  }

  drawOrange(ctx) {
    const r = this.radius;
    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.15, 0, 0, r);
    grad.addColorStop(0, '#ffa726');
    grad.addColorStop(0.8, '#f57c00');
    grad.addColorStop(1, '#e65100');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Texture dots
    ctx.fillStyle = 'rgba(230, 81, 0, 0.4)';
    for (let i = 0; i < 16; i++) {
      const angle = (i * Math.PI * 2) / 16;
      const d = r * 0.6 + (i % 3) * 5;
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * d, Math.sin(angle) * d, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Top stem dot
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath();
    ctx.arc(0, -r + 4, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  drawApple(ctx) {
    const r = this.radius;
    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.15, 0, 0, r);
    grad.addColorStop(0, '#c6ff00');
    grad.addColorStop(0.7, '#76ff03');
    grad.addColorStop(1, '#388e3c');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Specular highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.35, -r * 0.35, r * 0.25, r * 0.15, -Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // Apple Stem & Leaf
    ctx.strokeStyle = '#4e342e';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(0, -r + 2);
    ctx.quadraticCurveTo(4, -r - 12, 10, -r - 14);
    ctx.stroke();

    // Leaf
    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.ellipse(8, -r - 8, 7, 3.5, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
  }

  drawBanana(ctx) {
    const r = this.radius;
    ctx.save();
    // Curved banana body
    ctx.fillStyle = '#ffeb3b';
    ctx.strokeStyle = '#fbc02d';
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.moveTo(-r * 0.8, r * 0.5);
    ctx.quadraticCurveTo(0, -r * 0.8, r * 0.9, -r * 0.4);
    ctx.quadraticCurveTo(0, -r * 0.3, -r * 0.8, r * 0.5);
    ctx.fill();
    ctx.stroke();

    // Banana tips
    ctx.fillStyle = '#5d4037';
    ctx.beginPath();
    ctx.arc(-r * 0.8, r * 0.5, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(r * 0.9, -r * 0.4, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  drawStrawberry(ctx) {
    const r = this.radius;
    const grad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.1, 0, 0, r);
    grad.addColorStop(0, '#ff5252');
    grad.addColorStop(0.7, '#d50000');
    grad.addColorStop(1, '#8b0000');

    ctx.fillStyle = grad;
    // Heart/berry shape
    ctx.beginPath();
    ctx.moveTo(0, r);
    ctx.bezierCurveTo(-r * 1.1, r * 0.4, -r * 1.1, -r * 0.7, 0, -r * 0.6);
    ctx.bezierCurveTo(r * 1.1, -r * 0.7, r * 1.1, r * 0.4, 0, r);
    ctx.fill();

    // Yellow seeds
    ctx.fillStyle = '#fff59d';
    const seedCoords = [
      [0, 0], [-10, -5], [10, -5], [-6, 12], [6, 12],
      [-14, 5], [14, 5], [0, 20], [0, -10]
    ];
    for (const [sx, sy] of seedCoords) {
      ctx.beginPath();
      ctx.ellipse(sx * (r / 32), sy * (r / 32), 1.5, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Leafy cap
    ctx.fillStyle = '#2e7d32';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.6);
      ctx.lineTo(i * 9, -r * 0.95);
      ctx.lineTo(i * 5, -r * 0.5);
      ctx.fill();
    }
  }

  drawPineapple(ctx) {
    const r = this.radius;
    // Body
    const grad = ctx.createRadialGradient(-r * 0.2, 0, r * 0.2, 0, 0, r);
    grad.addColorStop(0, '#ffca28');
    grad.addColorStop(0.7, '#f57f17');
    grad.addColorStop(1, '#bf360c');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 4, r * 0.8, r * 0.95, 0, 0, Math.PI * 2);
    ctx.fill();

    // Diamond grid
    ctx.strokeStyle = 'rgba(120, 40, 10, 0.45)';
    ctx.lineWidth = 2;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 12 - 20, -r * 0.7);
      ctx.lineTo(i * 12 + 20, r * 0.7);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(i * 12 + 20, -r * 0.7);
      ctx.lineTo(i * 12 - 20, r * 0.7);
      ctx.stroke();
    }

    // Spiky crown leaves
    ctx.fillStyle = '#2e7d32';
    const leaves = [-18, -10, 0, 10, 18];
    for (const lx of leaves) {
      ctx.beginPath();
      ctx.moveTo(lx * 0.5, -r * 0.7);
      ctx.lineTo(lx, -r * 1.25);
      ctx.lineTo(lx * 0.2, -r * 0.6);
      ctx.fill();
    }
  }

  drawCoconut(ctx) {
    const r = this.radius;
    const grad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.2, 0, 0, r);
    grad.addColorStop(0, '#795548');
    grad.addColorStop(0.7, '#4e342e');
    grad.addColorStop(1, '#271c19');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Fibrous shell hairs
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 18; i++) {
      const angle = (i * Math.PI * 2) / 18;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * (r - 2), Math.sin(angle) * (r - 2));
      ctx.lineTo(Math.cos(angle) * (r + 4), Math.sin(angle) * (r + 4));
      ctx.stroke();
    }

    // 3 characteristic coconut eye spots
    ctx.fillStyle = '#1b120c';
    ctx.beginPath();
    ctx.arc(-8, -8, 4, 0, Math.PI * 2);
    ctx.arc(8, -8, 4, 0, Math.PI * 2);
    ctx.arc(0, -18, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  drawFrenzyFruit(ctx) {
    const r = this.radius;
    // Glowing rainbow mystical fruit
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.4, '#ff007f');
    grad.addColorStop(0.8, '#7928ca');
    grad.addColorStop(1, '#00dfd8');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Dragon scales
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Star sparkle at center
    ctx.fillStyle = '#fff';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡', 0, 0);
  }
}

/**
 * FruitHalf - Represents one of the two halves flying apart after slicing
 */
export class FruitHalf {
  constructor(x, y, vx, vy, rotation, rotSpeed, radius, typeConfig, side, sliceAngle) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.rotation = rotation;
    this.rotSpeed = rotSpeed;
    this.radius = radius;
    this.typeConfig = typeConfig;
    this.type = typeConfig.id;
    this.side = side; // 1 = right half, -1 = left half
    this.sliceAngle = sliceAngle;
    this.gravity = 750;
    this.alpha = 1;
    this.isDead = false;
  }

  update(dt, canvasHeight) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += this.gravity * dt;
    this.rotation += this.rotSpeed * dt;

    if (this.y > canvasHeight + this.radius + 60) {
      this.isDead = true;
    }
  }

  draw(ctx) {
    const r = this.radius;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // Clip to half-circle
    ctx.beginPath();
    // Arc of 180 degrees
    ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, this.side < 0);
    ctx.closePath();
    ctx.clip();

    // Draw the internal juicy cross-section & flesh
    switch (this.type) {
      case 'watermelon':
        this.drawWatermelonInterior(ctx, r);
        break;
      case 'orange':
        this.drawOrangeInterior(ctx, r);
        break;
      case 'apple':
        this.drawAppleInterior(ctx, r);
        break;
      case 'banana':
        this.drawBananaInterior(ctx, r);
        break;
      case 'strawberry':
        this.drawStrawberryInterior(ctx, r);
        break;
      case 'pineapple':
        this.drawPineappleInterior(ctx, r);
        break;
      case 'coconut':
        this.drawCoconutInterior(ctx, r);
        break;
      default:
        this.drawGenericInterior(ctx, r);
    }

    ctx.restore();
  }

  drawWatermelonInterior(ctx, r) {
    // Green rind
    ctx.fillStyle = '#1b5e20';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // White rind boundary
    ctx.fillStyle = '#e8f5e9';
    ctx.beginPath();
    ctx.arc(0, 0, r - 4, 0, Math.PI * 2);
    ctx.fill();

    // Juicy pink/red meat
    ctx.fillStyle = '#ff2d55';
    ctx.beginPath();
    ctx.arc(0, 0, r - 8, 0, Math.PI * 2);
    ctx.fill();

    // Black seeds
    ctx.fillStyle = '#111';
    const seeds = [[-12, -10], [12, -12], [0, 8], [-15, 14], [15, 14]];
    for (const [sx, sy] of seeds) {
      ctx.beginPath();
      ctx.ellipse(sx, sy, 2, 4, Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawOrangeInterior(ctx, r) {
    // Orange peel
    ctx.fillStyle = '#e65100';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // White pith
    ctx.fillStyle = '#fff3e0';
    ctx.beginPath();
    ctx.arc(0, 0, r - 3, 0, Math.PI * 2);
    ctx.fill();

    // Orange segmented flesh
    ctx.fillStyle = '#ff9800';
    ctx.beginPath();
    ctx.arc(0, 0, r - 6, 0, Math.PI * 2);
    ctx.fill();

    // Radial segment lines
    ctx.strokeStyle = '#fff3e0';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI * 2) / 8;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * (r - 6), Math.sin(a) * (r - 6));
      ctx.stroke();
    }
  }

  drawAppleInterior(ctx, r) {
    // Apple skin
    ctx.fillStyle = '#43a047';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Cream pulp
    ctx.fillStyle = '#fffde7';
    ctx.beginPath();
    ctx.arc(0, 0, r - 3, 0, Math.PI * 2);
    ctx.fill();

    // Core and seeds
    ctx.fillStyle = '#e0e0e0';
    ctx.beginPath();
    ctx.ellipse(0, 0, 7, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.ellipse(-3, 0, 2, 3.5, 0.2, 0, Math.PI * 2);
    ctx.ellipse(3, 0, 2, 3.5, -0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  drawBananaInterior(ctx, r) {
    ctx.fillStyle = '#fbc02d';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Cream interior
    ctx.fillStyle = '#fffde7';
    ctx.beginPath();
    ctx.arc(0, 0, r - 4, 0, Math.PI * 2);
    ctx.fill();

    // Seed center specks
    ctx.fillStyle = '#5d4037';
    ctx.beginPath();
    ctx.arc(0, -3, 1.5, 0, Math.PI * 2);
    ctx.arc(-3, 2, 1.5, 0, Math.PI * 2);
    ctx.arc(3, 2, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  drawStrawberryInterior(ctx, r) {
    ctx.fillStyle = '#d50000';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Pink flesh with white center
    ctx.fillStyle = '#ff80ab';
    ctx.beginPath();
    ctx.arc(0, 0, r - 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  drawPineappleInterior(ctx, r) {
    ctx.fillStyle = '#f57f17';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffee58';
    ctx.beginPath();
    ctx.arc(0, 0, r - 5, 0, Math.PI * 2);
    ctx.fill();

    // Pineapple core
    ctx.fillStyle = '#fbc02d';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  drawCoconutInterior(ctx, r) {
    ctx.fillStyle = '#4e342e';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Thick white coconut meat
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, r - 4, 0, Math.PI * 2);
    ctx.fill();

    // Dark water cavity
    ctx.fillStyle = '#211714';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }

  drawGenericInterior(ctx, r) {
    ctx.fillStyle = '#ff007f';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
    ctx.fill();
  }
}
