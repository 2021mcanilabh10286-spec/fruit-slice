/**
 * Particle system: Fruit halves, juice droplets, background splats, floating score text, bomb blast
 */

export class JuiceParticle {
  constructor(x, y, color, angle, speedBonus = 1) {
    this.x = x;
    this.y = y;
    this.color = color;
    const spread = (Math.random() - 0.5) * 1.6;
    const speed = (Math.random() * 320 + 120) * speedBonus;
    this.vx = Math.cos(angle + spread) * speed;
    this.vy = Math.sin(angle + spread) * speed;
    this.gravity = 750;
    this.radius = Math.random() * 4.5 + 2;
    this.alpha = 1;
    this.life = Math.random() * 0.4 + 0.5; // seconds
    this.maxLife = this.life;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += this.gravity * dt;
    this.life -= dt;
    this.alpha = Math.max(0, this.life / this.maxLife);
  }

  draw(ctx) {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    
    // Stretch droplet along velocity
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const angle = Math.atan2(this.vy, this.vx);
    const stretch = Math.min(2.5, Math.max(1, speed / 150));

    ctx.translate(this.x, this.y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, 0, this.radius * stretch, this.radius, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class JuiceSplatDecal {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.radius = Math.random() * 26 + 18;
    this.alpha = 0.65;
    this.life = 12; // 12 seconds visible
    this.maxLife = this.life;
    this.blobs = [];

    // Generate random satellite splatter splotches
    const count = Math.floor(Math.random() * 5 + 4);
    for (let i = 0; i < count; i++) {
      const dist = Math.random() * (this.radius * 1.4) + 6;
      const angle = Math.random() * Math.PI * 2;
      this.blobs.push({
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        r: Math.random() * (this.radius * 0.35) + 3,
      });
    }
  }

  update(dt) {
    this.life -= dt;
    if (this.life < 3) {
      this.alpha = (this.life / 3) * 0.65;
    }
  }

  draw(ctx) {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

    for (const b of this.blobs) {
      ctx.beginPath();
      ctx.arc(this.x + b.dx, this.y + b.dy, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

export class FloatingText {
  constructor(x, y, text, color = '#fffa65', size = 28, isCritical = false) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.size = size;
    this.isCritical = isCritical;
    this.alpha = 1;
    this.scale = 0.4;
    this.vy = -65;
    this.life = 0.8;
    this.maxLife = 0.8;
  }

  update(dt) {
    this.y += this.vy * dt;
    this.life -= dt;
    this.alpha = Math.max(0, this.life / this.maxLife);
    const progress = 1 - this.life / this.maxLife;
    if (progress < 0.25) {
      this.scale = 0.4 + (progress / 0.25) * 0.8;
    } else {
      this.scale = 1.2 - (progress - 0.25) * 0.2;
    }
  }

  draw(ctx) {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.translate(this.x, this.y);
    ctx.scale(this.scale, this.scale);

    ctx.font = `bold ${this.size}px 'Bangers', cursive, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000';
    ctx.strokeText(this.text, 0, 0);

    ctx.fillStyle = this.color;
    ctx.fillText(this.text, 0, 0);

    ctx.restore();
  }
}

export class BombExplosionParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.particles = [];
    this.rings = [
      { radius: 10, maxRadius: 160, alpha: 1, color: '#ffea00' },
      { radius: 5, maxRadius: 240, alpha: 0.8, color: '#ff3300' },
    ];
    this.life = 0.9;
    this.maxLife = 0.9;

    // Fiery blast fragments
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 450 + 100;
      this.particles.push({
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: Math.random() * 6 + 3,
        color: ['#ffdd00', '#ff6600', '#ff0033', '#333333'][Math.floor(Math.random() * 4)],
        alpha: 1,
      });
    }
  }

  update(dt) {
    this.life -= dt;
    const p = 1 - this.life / this.maxLife;

    for (const ring of this.rings) {
      ring.radius = ring.maxRadius * p;
      ring.alpha = Math.max(0, 1 - p);
    }

    for (const part of this.particles) {
      part.x += part.vx * dt;
      part.y += part.vy * dt;
      part.vx *= 0.96;
      part.vy *= 0.96;
      part.alpha = Math.max(0, 1 - p);
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // Shockwave rings
    for (const ring of this.rings) {
      if (ring.alpha > 0) {
        ctx.save();
        ctx.globalAlpha = ring.alpha;
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = 10 * (1 - ring.radius / ring.maxRadius) + 2;
        ctx.shadowColor = ring.color;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(0, 0, ring.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    // Fire & smoke particles
    for (const part of this.particles) {
      if (part.alpha > 0) {
        ctx.save();
        ctx.globalAlpha = part.alpha;
        ctx.fillStyle = part.color;
        ctx.beginPath();
        ctx.arc(part.x, part.y, part.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    ctx.restore();
  }
}
