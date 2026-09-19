/**
 * Game - Main fruit cutter game engine and loop
 */

import { Fruit, FruitHalf, FRUIT_TYPES } from '../entities/Fruit';
import { Bomb } from '../entities/Bomb';
import { Blade } from '../entities/Blade';
import { FloatingText } from '../entities/Particle';
import { checkSegmentCircleIntersection } from './Collision';

export const GAME_STATES = {
  MENU: 'menu',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAMEOVER: 'gameover',
};

export class Game {
  constructor(canvas, soundManager, uiManager) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sound = soundManager;
    this.ui = uiManager;

    this.state = GAME_STATES.MENU;
    this.mode = 'classic'; // 'classic' | 'arcade' | 'zen'

    // Display sizing
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = window.devicePixelRatio || 1;
    this.setupCanvas();

    // Entities
    this.blade = new Blade(this.canvas);
    this.fruits = [];
    this.fruitHalves = [];
    this.bombs = [];
    this.particles = [];
    this.decals = [];
    this.floatingTexts = [];

    // Game variables
    this.score = 0;
    this.strikes = 0;
    this.maxStrikes = 3;
    this.timer = 0;
    this.maxTimer = 60;
    this.totalSlices = 0;
    this.maxCombo = 0;

    // Spawning system
    this.spawnTimer = 0;
    this.spawnInterval = 2.0; // seconds
    this.waveNumber = 0;

    // Combo system
    this.currentComboCount = 0;
    this.comboTimer = 0;
    this.comboMaxWindow = 0.35; // seconds
    this.comboScoreAccumulator = 0;

    // Frenzy system
    this.isFrenzy = false;
    this.frenzyTimer = 0;

    // Screen shake
    this.shakeIntensity = 0;
    this.shakeDuration = 0;

    // Timing
    this.lastTime = performance.now();

    window.addEventListener('resize', () => this.setupCanvas());
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  setupCanvas() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  start(mode = 'classic') {
    this.mode = mode;
    this.state = GAME_STATES.PLAYING;
    this.score = 0;
    this.strikes = 0;
    this.totalSlices = 0;
    this.maxCombo = 0;
    this.waveNumber = 0;
    this.spawnTimer = 0.5; // first wave soon
    this.spawnInterval = 2.2;
    this.isFrenzy = false;
    this.frenzyTimer = 0;

    if (this.mode === 'arcade') {
      this.maxTimer = 60;
      this.timer = 60;
    } else if (this.mode === 'zen') {
      this.maxTimer = 90;
      this.timer = 90;
    } else {
      this.timer = 0;
    }

    // Reset entities
    this.fruits = [];
    this.fruitHalves = [];
    this.bombs = [];
    this.particles = [];
    this.decals = [];
    this.floatingTexts = [];
    this.blade.points = [];

    this.ui.showHUD(this.mode);
    this.ui.updateScore(0);
    this.sound.ensureContext();
  }

  pause() {
    if (this.state === GAME_STATES.PLAYING) {
      this.state = GAME_STATES.PAUSED;
      this.ui.showPause();
    }
  }

  resume() {
    if (this.state === GAME_STATES.PAUSED) {
      this.state = GAME_STATES.PLAYING;
      this.ui.hidePause();
      this.lastTime = performance.now();
    }
  }

  restart() {
    this.start(this.mode);
  }

  quitToMenu() {
    this.state = GAME_STATES.MENU;
    this.fruits = [];
    this.fruitHalves = [];
    this.bombs = [];
    this.ui.showMenu();
  }

  triggerScreenShake(intensity = 15, duration = 0.4) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
  }

  activateFrenzy(duration = 5.0) {
    this.isFrenzy = true;
    this.frenzyTimer = duration;
    this.ui.setFrenzyActive(true);
    this.sound.playFrenzy();
  }

  triggerStrike() {
    if (this.mode !== 'classic') return;
    this.strikes++;
    this.sound.playStrike();
    this.ui.setStrikes(this.strikes);
    this.triggerScreenShake(8, 0.25);

    if (this.strikes >= this.maxStrikes) {
      this.gameOver('strikes');
    }
  }

  gameOver(reason = 'strikes') {
    this.state = GAME_STATES.GAMEOVER;
    const currentBest = this.ui.getHighScore(this.mode);
    const isNewBest = this.score > currentBest;

    if (isNewBest) {
      this.ui.setHighScore(this.mode, this.score);
    }

    this.ui.showGameOver({
      score: this.score,
      bestScore: isNewBest ? this.score : currentBest,
      isNewBest,
      totalSlices: this.totalSlices,
      maxCombo: this.maxCombo,
      mode: this.mode,
      reason,
    });
  }

  spawnWave() {
    this.waveNumber++;
    const fruitCount = this.isFrenzy
      ? Math.floor(Math.random() * 4 + 3)
      : Math.floor(Math.random() * Math.min(4, 1 + Math.floor(this.waveNumber / 4))) + 1;

    for (let i = 0; i < fruitCount; i++) {
      setTimeout(() => {
        if (this.state === GAME_STATES.PLAYING) {
          this.fruits.push(new Fruit(this.width, this.height));
        }
      }, i * 90);
    }

    // Bombs: only in classic and arcade, not during frenzy or zen
    if (!this.isFrenzy && this.mode !== 'zen') {
      const bombChance = this.mode === 'arcade' ? 0.28 : 0.22;
      if (Math.random() < bombChance) {
        setTimeout(() => {
          if (this.state === GAME_STATES.PLAYING) {
            this.bombs.push(new Bomb(this.width, this.height));
          }
        }, Math.random() * 200);
      }
    }
  }

  checkSlicingCollisions() {
    const segments = this.blade.getSegments();
    if (segments.length === 0) return;

    let slicedInThisFrame = 0;

    for (const seg of segments) {
      // Check fruit collisions
      for (let i = this.fruits.length - 1; i >= 0; i--) {
        const fruit = this.fruits[i];
        if (fruit.isSliced) continue;

        const check = checkSegmentCircleIntersection(
          seg.x1, seg.y1, seg.x2, seg.y2,
          fruit.x, fruit.y, fruit.radius
        );

        if (check.hit) {
          slicedInThisFrame++;
          this.totalSlices++;
          const halves = fruit.slice(check.angle, this.particles, this.decals);
          this.fruitHalves.push(...halves);
          this.fruits.splice(i, 1);

          // Audio
          this.sound.playSlice(fruit.type);

          // Points
          const multiplier = this.isFrenzy ? 2 : 1;
          const pointsEarned = fruit.points * multiplier;
          this.score += pointsEarned;
          this.ui.updateScore(this.score);

          // Special dragon fruit effect
          if (fruit.isSpecial) {
            this.activateFrenzy(5);
            this.floatingTexts.push(
              new FloatingText(fruit.x, fruit.y - 20, '⚡ FRENZY! ⚡', '#ff007f', 36, true)
            );
          } else {
            this.floatingTexts.push(
              new FloatingText(fruit.x, fruit.y, `+${pointsEarned}`, fruit.juiceColor, 26)
            );
          }

          // Combo tracking
          this.currentComboCount++;
          this.comboTimer = this.comboMaxWindow;
        }
      }

      // Check bomb collisions
      if (this.mode !== 'zen') {
        for (let i = this.bombs.length - 1; i >= 0; i--) {
          const bomb = this.bombs[i];
          if (bomb.isExploded) continue;

          const check = checkSegmentCircleIntersection(
            seg.x1, seg.y1, seg.x2, seg.y2,
            bomb.x, bomb.y, bomb.radius
          );

          if (check.hit) {
            bomb.explode(this.particles);
            this.bombs.splice(i, 1);
            this.sound.playExplosion();
            this.triggerScreenShake(24, 0.6);

            if (this.mode === 'classic') {
              this.gameOver('bomb');
              return;
            } else if (this.mode === 'arcade') {
              // Deduct 10 points and blow up existing fruits
              this.score = Math.max(0, this.score - 10);
              this.ui.updateScore(this.score);
              this.floatingTexts.push(
                new FloatingText(bomb.x, bomb.y, '-10 BOMB!', '#ff2222', 32, true)
              );
              // Clear current onscreen fruits
              this.fruits = [];
            }
          }
        }
      }
    }

    if (slicedInThisFrame > 0) {
      this.sound.playSwoosh();
    }
  }

  updateCombos(dt) {
    if (this.currentComboCount > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        // Evaluate finished combo
        if (this.currentComboCount >= 3) {
          const bonus = this.currentComboCount;
          this.score += bonus;
          this.ui.updateScore(this.score);
          this.ui.triggerComboPopup(this.currentComboCount);
          this.sound.playCombo(this.currentComboCount);

          if (this.currentComboCount > this.maxCombo) {
            this.maxCombo = this.currentComboCount;
          }

          this.floatingTexts.push(
            new FloatingText(
              this.width / 2,
              this.height * 0.38,
              `+${bonus} COMBO BONUS!`,
              '#ffea00',
              34,
              true
            )
          );
        }
        this.currentComboCount = 0;
      }
    }
  }

  update(dt) {
    this.blade.update(dt);

    if (this.state === GAME_STATES.PLAYING) {
      // Timer update for timed modes
      if (this.mode === 'arcade' || this.mode === 'zen') {
        this.timer -= dt;
        this.ui.updateTimer(this.timer, this.maxTimer);
        if (this.timer <= 0) {
          this.gameOver('timeout');
          return;
        }
      }

      // Frenzy timer
      if (this.isFrenzy) {
        this.frenzyTimer -= dt;
        if (this.frenzyTimer <= 0) {
          this.isFrenzy = false;
          this.ui.setFrenzyActive(false);
        }
      }

      // Spawning
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnWave();
        // Spawning scales slightly faster over waves
        const speedFactor = Math.max(0.7, 1 - this.waveNumber * 0.015);
        this.spawnInterval = (this.isFrenzy ? 0.7 : 2.0) * speedFactor;
        this.spawnTimer = this.spawnInterval;
      }

      // Slicing collision checks
      this.checkSlicingCollisions();
      this.updateCombos(dt);

      // Update Fruits
      for (let i = this.fruits.length - 1; i >= 0; i--) {
        const fruit = this.fruits[i];
        fruit.update(dt);
        if (fruit.missed) {
          this.fruits.splice(i, 1);
          // Dropping fruit penalty only in Classic mode and non-special fruit
          if (this.mode === 'classic' && !fruit.isSpecial) {
            this.triggerStrike();
          }
        }
      }

      // Update Bombs
      for (let i = this.bombs.length - 1; i >= 0; i--) {
        const bomb = this.bombs[i];
        bomb.update(dt);
        if (bomb.missed) {
          this.bombs.splice(i, 1);
        }
      }
    }

    // Update Fruit halves
    for (let i = this.fruitHalves.length - 1; i >= 0; i--) {
      const half = this.fruitHalves[i];
      half.update(dt, this.height);
      if (half.isDead) {
        this.fruitHalves.splice(i, 1);
      }
    }

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const part = this.particles[i];
      part.update(dt);
      if (part.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update Decals
    for (let i = this.decals.length - 1; i >= 0; i--) {
      const decal = this.decals[i];
      decal.update(dt);
      if (decal.alpha <= 0) {
        this.decals.splice(i, 1);
      }
    }

    // Update Floating Text
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const text = this.floatingTexts[i];
      text.update(dt);
      if (text.alpha <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // Screen shake update
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      if (this.shakeDuration <= 0) {
        this.shakeIntensity = 0;
      }
    }
  }

  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    ctx.save();
    // Screen shake offset
    if (this.shakeDuration > 0 && this.shakeIntensity > 0) {
      const offsetX = (Math.random() - 0.5) * this.shakeIntensity * 2;
      const offsetY = (Math.random() - 0.5) * this.shakeIntensity * 2;
      ctx.translate(offsetX, offsetY);
    }

    // 1. Draw wall juice decals
    for (const decal of this.decals) {
      decal.draw(ctx);
    }

    // 2. Draw flying fruits
    for (const fruit of this.fruits) {
      fruit.draw(ctx);
    }

    // 3. Draw flying bombs
    for (const bomb of this.bombs) {
      bomb.draw(ctx);
    }

    // 4. Draw sliced fruit halves
    for (const half of this.fruitHalves) {
      half.draw(ctx);
    }

    // 5. Draw particles (juice sprays, bomb explosion shockwaves)
    for (const part of this.particles) {
      part.draw(ctx);
    }

    // 6. Draw floating score numbers
    for (const text of this.floatingTexts) {
      text.draw(ctx);
    }

    // 7. Draw blade swipe trail & sparks
    this.blade.draw(ctx);

    ctx.restore();
  }

  animate(currentTime) {
    let dt = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Clamp dt to avoid physics leaps on tab defocus
    if (dt > 0.05) dt = 0.05;
    if (dt < 0) dt = 0.016;

    if (this.state !== GAME_STATES.PAUSED) {
      this.update(dt);
    }
    this.render();

    requestAnimationFrame(this.animate);
  }
}
