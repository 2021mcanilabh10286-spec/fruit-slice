/**
 * Bomb entity - Hazardous explosive with animated burning fuse and spark particles
 */

import { BombExplosionParticle } from './Particle';

export class Bomb {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.radius = 38;
    this.isBomb = true;

    // Launch physics similar to fruit
    const margin = this.radius + 60;
    this.x = margin + Math.random() * (canvasWidth - margin * 2);
    this.y = canvasHeight + this.radius + 10;

    const targetX = canvasWidth * 0.25 + Math.random() * (canvasWidth * 0.5);
    this.gravity = 660;
    const timeToPeak = 1.1 + Math.random() * 0.3;
    this.vy = -(this.gravity * timeToPeak);
    this.vx = (targetX - this.x) / timeToPeak;

    this.rotation = (Math.random() - 0.5) * 1.5;
    this.rotSpeed = (Math.random() - 0.5) * 2;
    this.isExploded = false;
    this.missed = false;

    // Fuse spark emitter timer
    this.fuseTimer = 0;
    this.fuseSparks = [];
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += this.gravity * dt;
    this.rotation += this.rotSpeed * dt;

    // Emit sparks from fuse tip
    this.fuseTimer += dt;
    if (this.fuseTimer > 0.04) {
      this.fuseTimer = 0;
      this.emitFuseSpark();
    }

    // Update fuse sparks
    for (let i = this.fuseSparks.length - 1; i >= 0; i--) {
      const sp = this.fuseSparks[i];
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.life -= dt;
      if (sp.life <= 0) {
        this.fuseSparks.splice(i, 1);
      }
    }

    if (this.vy > 0 && this.y > this.canvasHeight + this.radius + 50) {
      this.missed = true;
    }
  }

  getFuseTipPosition() {
    // Fuse tip relative to bomb center (at rotation)
    const fuseLocalX = 14;
    const fuseLocalY = -this.radius - 12;
    const cos = Math.cos(this.rotation);
    const sin = Math.sin(this.rotation);
    return {
      x: this.x + (fuseLocalX * cos - fuseLocalY * sin),
      y: this.y + (fuseLocalX * sin + fuseLocalY * cos),
    };
  }

  emitFuseSpark() {
    const tip = this.getFuseTipPosition();
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 50 + 20;
      this.fuseSparks.push({
        x: tip.x,
        y: tip.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: Math.random() * 0.2 + 0.1,
        maxLife: 0.3,
        size: Math.random() * 2.5 + 1.5,
        color: ['#ffea00', '#ff6600', '#ff3300', '#ffffff'][Math.floor(Math.random() * 4)],
      });
    }
  }

  explode(particlesArray) {
    this.isExploded = true;
    particlesArray.push(new BombExplosionParticle(this.x, this.y));
  }

  draw(ctx) {
    // Draw trailing fuse sparks in world space
    ctx.save();
    for (const sp of this.fuseSparks) {
      ctx.globalAlpha = Math.max(0, sp.life / sp.maxLife);
      ctx.fillStyle = sp.color;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Draw Bomb Body
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    const r = this.radius;

    // Fuse cap (brass collar)
    ctx.fillStyle = '#b8860b';
    ctx.fillRect(-6, -r - 4, 12, 6);

    // Fuse cord
    ctx.strokeStyle = '#d7ccc8';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -r - 4);
    ctx.quadraticCurveTo(8, -r - 10, 14, -r - 12);
    ctx.stroke();

    // Fuse burning ember glow at tip
    ctx.save();
    ctx.fillStyle = '#ff3300';
    ctx.shadowColor = '#ffdd00';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(14, -r - 12, 4 + Math.random() * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Bomb iron sphere body
    const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
    grad.addColorStop(0, '#555555');
    grad.addColorStop(0.5, '#222222');
    grad.addColorStop(1, '#050505');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Specular shine curve
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r - 4, -Math.PI * 0.75, -Math.PI * 0.35);
    ctx.stroke();

    // Skull and crossbones / Hazard emblem
    ctx.fillStyle = '#e74c3c';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(231, 76, 60, 0.8)';
    ctx.shadowBlur = 8;
    ctx.fillText('☠', 0, 2);

    ctx.restore();
  }
}
