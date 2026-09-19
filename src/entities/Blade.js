/**
 * Blade - Handles user swipe trail, pointer events, rendering blade trail and spark particles
 */

export const BLADE_SKINS = {
  classic: {
    id: 'classic',
    name: 'Katana Silver',
    glowColor: 'rgba(120, 200, 255, 0.8)',
    coreColor: '#ffffff',
    trailColor: 'rgba(200, 230, 255, 0.9)',
    sparkColor: '#bbf2f6',
    icon: '⚔️',
  },
  fire: {
    id: 'fire',
    name: 'Flame Blade',
    glowColor: 'rgba(255, 60, 20, 0.85)',
    coreColor: '#fffb96',
    trailColor: 'rgba(255, 120, 30, 0.95)',
    sparkColor: '#ff7b25',
    icon: '🔥',
  },
  cyber: {
    id: 'cyber',
    name: 'Cyber Neon',
    glowColor: 'rgba(255, 0, 128, 0.85)',
    coreColor: '#00f7ff',
    trailColor: 'rgba(220, 20, 200, 0.9)',
    sparkColor: '#00f7ff',
    icon: '⚡',
  },
  shadow: {
    id: 'shadow',
    name: 'Shadow Void',
    glowColor: 'rgba(155, 40, 255, 0.85)',
    coreColor: '#e0b0ff',
    trailColor: 'rgba(110, 20, 200, 0.9)',
    sparkColor: '#d685ff',
    icon: '🌌',
  },
  gold: {
    id: 'gold',
    name: 'Golden Emperor',
    glowColor: 'rgba(255, 200, 50, 0.9)',
    coreColor: '#ffffff',
    trailColor: 'rgba(255, 215, 0, 0.95)',
    sparkColor: '#ffe57f',
    icon: '👑',
  },
};

export class Blade {
  constructor(canvas) {
    this.canvas = canvas;
    this.points = []; // {x, y, time}
    this.maxTrailAge = 140; // ms
    this.maxTrailPoints = 18;
    this.minPointDistance = 3;
    this.isMouseDown = false;
    this.currentSkin = BLADE_SKINS.classic;
    this.sparks = [];
    this.minSliceSpeed = 120; // px per sec
    this.lastPos = null;
    this.isSwiping = false;
    this.cursorPos = null;
    this.trackpadPos = null;
    this.trackpadResetTimer = null;
    // A two-finger touchpad gesture is delivered by browsers as a wheel event.
    // Coarse-pointer devices (phones/tablets) keep their existing touch input.
    this.supportsTrackpadBlade = window.matchMedia('(pointer: fine)').matches;

    this.setupListeners();
  }

  setSkin(skinId) {
    if (BLADE_SKINS[skinId]) {
      this.currentSkin = BLADE_SKINS[skinId];
    }
  }

  setupListeners() {
    // Mouse events
    window.addEventListener('mousedown', (e) => {
      if (e.target && e.target.closest && e.target.closest('button, .mode-card, .blade-card, .btn-close')) {
        return;
      }
      this.isMouseDown = true;
      const pos = this.getCanvasCoords(e);
      this.addPoint(pos.x, pos.y);
      this.lastPos = pos;
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
      this.lastPos = null;
      this.isSwiping = false;
    });

    window.addEventListener('mousemove', (e) => {
      const pos = this.getCanvasCoords(e);
      this.cursorPos = pos;
      if (this.isMouseDown) {
        this.handleMove(pos.x, pos.y);
      }
    });

    this.canvas.addEventListener('wheel', (e) => {
      if (!this.supportsTrackpadBlade || e.ctrlKey) return;

      const distance = Math.hypot(e.deltaX, e.deltaY);
      if (distance < 2) return;

      // Keep the game canvas from scrolling while a two-finger swipe is used
      // as the blade. This listener is canvas-only, so modal content can still
      // be scrolled normally.
      e.preventDefault();
      this.handleTrackpadSwipe(e.deltaX, e.deltaY);
    }, { passive: false });

    // Touch events for mobile/tablets
    window.addEventListener('touchstart', (e) => {
      if (e.target && e.target.closest && e.target.closest('button, .mode-card, .blade-card, .btn-close')) {
        return;
      }
      if (e.touches.length > 0) {
        this.isMouseDown = true;
        const pos = this.getCanvasCoords(e.touches[0]);
        this.addPoint(pos.x, pos.y);
        this.lastPos = pos;
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (this.isMouseDown && e.touches.length > 0) {
        const pos = this.getCanvasCoords(e.touches[0]);
        this.handleMove(pos.x, pos.y);
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      this.isMouseDown = false;
      this.lastPos = null;
      this.isSwiping = false;
    });
  }

  getCanvasCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  handleMove(x, y) {
    const now = performance.now();
    if (this.lastPos) {
      const dx = x - this.lastPos.x;
      const dy = y - this.lastPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Pointer events can arrive far faster than the display refresh rate.
      // Keeping only meaningfully different points bounds both trail drawing
      // and segment collision checks without affecting slice accuracy.
      if (dist < this.minPointDistance) return;
      
      // Emit sparks along the blade
      if (dist > 15) {
        this.emitSparks(x, y, dx, dy);
        this.isSwiping = true;
      }
    }
    this.addPoint(x, y);
    this.lastPos = { x, y, time: now };
  }

  addPoint(x, y) {
    const now = performance.now();
    this.points.push({ x, y, time: now });
    if (this.points.length > this.maxTrailPoints) this.points.shift();
  }

  handleTrackpadSwipe(deltaX, deltaY) {
    const start = this.trackpadPos || this.cursorPos || {
      x: this.canvas.clientWidth / 2,
      y: this.canvas.clientHeight / 2,
    };
    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const end = {
      x: clamp(start.x + deltaX, 0, this.canvas.clientWidth),
      y: clamp(start.y + deltaY, 0, this.canvas.clientHeight),
    };

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    if (Math.hypot(dx, dy) < this.minPointDistance) return;

    this.addPoint(start.x, start.y);
    this.addPoint(end.x, end.y);
    this.emitSparks(end.x, end.y, dx, dy);
    this.trackpadPos = end;
    this.isSwiping = true;

    clearTimeout(this.trackpadResetTimer);
    this.trackpadResetTimer = setTimeout(() => {
      this.trackpadPos = null;
      this.isSwiping = false;
    }, 100);
  }

  emitSparks(x, y, dx, dy) {
    const count = 2;
    for (let i = 0; i < count; i++) {
      const angle = Math.atan2(dy, dx) + (Math.random() - 0.5) * 1.5;
      const speed = Math.random() * 80 + 40;
      this.sparks.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 6,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3 + 1.5,
        alpha: 1,
        life: 0.35, // seconds
        maxLife: 0.35,
        color: this.currentSkin.sparkColor,
      });
    }
  }

  update(dt) {
    const now = performance.now();
    // Prune expired trail points
    while (this.points.length && now - this.points[0].time >= this.maxTrailAge) {
      this.points.shift();
    }

    // Update blade sparks
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.life -= dt;
      sp.alpha = Math.max(0, sp.life / sp.maxLife);
      if (sp.life <= 0) {
        this.sparks.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    const now = performance.now();

    // Draw sparks
    ctx.save();
    for (const sp of this.sparks) {
      ctx.globalAlpha = sp.alpha;
      ctx.fillStyle = sp.color;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Render trail if we have at least 2 points
    if (this.points.length < 2) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw outer glowing aura
    const firstSegment = Math.max(1, this.points.length - 8);
    for (let i = firstSegment; i < this.points.length; i++) {
      const p0 = this.points[i - 1];
      const p1 = this.points[i];
      const ageRatio = (now - p1.time) / this.maxTrailAge;
      const alpha = Math.max(0, 1 - ageRatio);
      const width = (1 - ageRatio) * 16 + 2;

      ctx.strokeStyle = this.currentSkin.glowColor;
      ctx.globalAlpha = alpha * 0.45;
      ctx.lineWidth = width * 1.8;
      ctx.shadowColor = this.currentSkin.glowColor;
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }

    // Draw middle trail
    for (let i = firstSegment; i < this.points.length; i++) {
      const p0 = this.points[i - 1];
      const p1 = this.points[i];
      const ageRatio = (now - p1.time) / this.maxTrailAge;
      const alpha = Math.max(0, 1 - ageRatio);
      const width = (1 - ageRatio) * 10 + 2;

      ctx.strokeStyle = this.currentSkin.trailColor;
      ctx.globalAlpha = alpha * 0.85;
      ctx.lineWidth = width;

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }

    // Draw sharp glowing blade core
    for (let i = firstSegment; i < this.points.length; i++) {
      const p0 = this.points[i - 1];
      const p1 = this.points[i];
      const ageRatio = (now - p1.time) / this.maxTrailAge;
      const alpha = Math.max(0, 1 - ageRatio);
      const width = (1 - ageRatio) * 4 + 1;

      ctx.strokeStyle = this.currentSkin.coreColor;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = width;

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
    }

    ctx.restore();
  }

  /**
   * Returns recent segment pairs to check for slice collisions
   */
  getSegments() {
    const segs = [];
    if (this.points.length < 2) return segs;
    const now = performance.now();

    // Check points that were added in the last ~70ms
    const firstSegment = Math.max(1, this.points.length - 8);
    for (let i = firstSegment; i < this.points.length; i++) {
      const p0 = this.points[i - 1];
      const p1 = this.points[i];
      if (now - p1.time < 90) {
        segs.push({
          x1: p0.x,
          y1: p0.y,
          x2: p1.x,
          y2: p1.y,
        });
      }
    }
    return segs;
  }
}
