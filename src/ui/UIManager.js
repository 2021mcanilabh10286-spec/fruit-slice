/**
 * UIManager - Manages screens, modals, HUD, high scores, blade selector
 */

import { BLADE_SKINS } from '../entities/Blade';

export class UIManager {
  constructor(callbacks) {
    this.callbacks = callbacks; // { onStart, onPause, onResume, onRestart, onQuit, onBladeChange, onSoundToggle }
    
    // Mode
    this.selectedMode = 'classic';
    this.selectedBlade = 'classic';

    // DOM Elements
    this.hud = document.getElementById('hud');
    this.scoreVal = document.getElementById('score-val');
    this.bestScoreVal = document.getElementById('best-score-val');
    this.timerDisplay = document.getElementById('timer-display');
    this.timerVal = document.getElementById('timer-val');
    this.timerProgressFill = document.getElementById('timer-progress-fill');
    this.frenzyBanner = document.getElementById('frenzy-banner');
    this.strikesContainer = document.getElementById('strikes-container');
    this.strikeSlots = document.querySelectorAll('.strike-slot');
    this.comboOverlay = document.getElementById('combo-overlay');

    // Screens
    this.menuScreen = document.getElementById('menu-screen');
    this.pauseScreen = document.getElementById('pause-screen');
    this.gameoverScreen = document.getElementById('gameover-screen');
    this.dojoModal = document.getElementById('dojo-modal');
    this.bladesGrid = document.getElementById('blades-grid');

    // Game Over stats
    this.goScore = document.getElementById('go-score');
    this.goBestScore = document.getElementById('go-best-score');
    this.goNewBest = document.getElementById('go-new-best');
    this.goTotalSlices = document.getElementById('go-total-slices');
    this.goMaxCombo = document.getElementById('go-max-combo');
    this.goModeName = document.getElementById('go-mode-name');

    // Sound Icon
    this.soundIcon = document.getElementById('sound-icon');

    this.init();
  }

  init() {
    this.loadStorage();
    this.bindEvents();
    this.renderDojoBlades();
    this.updateBestScoreDisplay();
  }

  loadStorage() {
    try {
      const savedBlade = localStorage.getItem('fruit_cutter_blade');
      if (savedBlade && BLADE_SKINS[savedBlade]) {
        this.selectedBlade = savedBlade;
      }
    } catch (e) {
      console.warn('LocalStorage error', e);
    }
  }

  getHighScore(mode) {
    try {
      return parseInt(localStorage.getItem(`fruit_cutter_best_${mode}`) || '0', 10);
    } catch {
      return 0;
    }
  }

  setHighScore(mode, score) {
    try {
      localStorage.setItem(`fruit_cutter_best_${mode}`, score.toString());
    } catch (e) {
      console.warn('LocalStorage save error', e);
    }
  }

  bindEvents() {
    // Mode selection
    const modeCards = document.querySelectorAll('.mode-card');
    modeCards.forEach((card) => {
      card.addEventListener('click', () => {
        modeCards.forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedMode = card.dataset.mode;
        this.updateBestScoreDisplay();
        if (this.callbacks.onButtonClick) this.callbacks.onButtonClick();
      });
    });

    // Start button
    document.getElementById('btn-start-game').addEventListener('click', () => {
      this.callbacks.onStart(this.selectedMode);
    });

    // Pause button
    document.getElementById('btn-pause').addEventListener('click', () => {
      this.callbacks.onPause();
    });

    // Sound toggle button
    document.getElementById('btn-sound').addEventListener('click', () => {
      const isMuted = this.callbacks.onSoundToggle();
      this.soundIcon.textContent = isMuted ? '🔇' : '🔊';
    });

    // Pause modal buttons
    document.getElementById('btn-resume').addEventListener('click', () => {
      this.callbacks.onResume();
    });
    document.getElementById('btn-restart').addEventListener('click', () => {
      this.callbacks.onRestart();
    });
    document.getElementById('btn-quit-menu').addEventListener('click', () => {
      this.callbacks.onQuit();
    });

    // Game Over modal buttons
    document.getElementById('btn-play-again').addEventListener('click', () => {
      this.callbacks.onRestart();
    });
    document.getElementById('btn-go-menu').addEventListener('click', () => {
      this.callbacks.onQuit();
    });

    // Blade Dojo modal open & close
    document.getElementById('btn-blade-dojo').addEventListener('click', () => {
      this.openDojo();
    });
    document.getElementById('btn-close-dojo').addEventListener('click', () => {
      this.closeDojo();
    });
    document.getElementById('btn-equip-blade').addEventListener('click', () => {
      this.equipBlade();
    });

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (!this.pauseScreen.classList.contains('hidden')) {
          this.callbacks.onResume();
        } else if (!this.menuScreen.classList.contains('active') && this.gameoverScreen.classList.contains('hidden')) {
          this.callbacks.onPause();
        }
      }
      if (e.key === 'm' || e.key === 'M') {
        const isMuted = this.callbacks.onSoundToggle();
        this.soundIcon.textContent = isMuted ? '🔇' : '🔊';
      }
    });
  }

  renderDojoBlades() {
    this.bladesGrid.innerHTML = '';
    Object.values(BLADE_SKINS).forEach((skin) => {
      const card = document.createElement('div');
      card.className = `blade-card ${skin.id === this.selectedBlade ? 'selected' : ''}`;
      card.dataset.id = skin.id;

      card.innerHTML = `
        <div class="blade-preview-color" style="background: ${skin.trailColor}; color: ${skin.coreColor};">
          ${skin.icon}
        </div>
        <div class="blade-name">${skin.name}</div>
      `;

      card.addEventListener('click', () => {
        document.querySelectorAll('.blade-card').forEach((c) => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedBlade = skin.id;
        if (this.callbacks.onButtonClick) this.callbacks.onButtonClick();
      });

      this.bladesGrid.appendChild(card);
    });
  }

  openDojo() {
    this.dojoModal.classList.remove('hidden');
    if (this.callbacks.onButtonClick) this.callbacks.onButtonClick();
  }

  closeDojo() {
    this.dojoModal.classList.add('hidden');
  }

  equipBlade() {
    this.closeDojo();
    try {
      localStorage.setItem('fruit_cutter_blade', this.selectedBlade);
    } catch (e) {
      console.warn('LocalStorage error', e);
    }
    this.callbacks.onBladeChange(this.selectedBlade);
  }

  updateBestScoreDisplay() {
    const best = this.getHighScore(this.selectedMode);
    this.bestScoreVal.textContent = best;
  }

  showMenu() {
    this.menuScreen.classList.add('active');
    this.menuScreen.classList.remove('hidden');
    this.hud.classList.add('hidden');
    this.pauseScreen.classList.add('hidden');
    this.gameoverScreen.classList.add('hidden');
    this.updateBestScoreDisplay();
  }

  showHUD(mode) {
    this.menuScreen.classList.remove('active');
    this.menuScreen.classList.add('hidden');
    this.pauseScreen.classList.add('hidden');
    this.gameoverScreen.classList.add('hidden');
    this.hud.classList.remove('hidden');

    this.scoreVal.textContent = '0';
    this.updateBestScoreDisplay();

    // Mode-specific HUD elements
    if (mode === 'classic') {
      this.strikesContainer.classList.remove('hidden');
      this.timerDisplay.classList.add('hidden');
      this.resetStrikes();
    } else {
      this.strikesContainer.classList.add('hidden');
      this.timerDisplay.classList.remove('hidden');
      this.updateTimer(mode === 'arcade' ? 60 : 90, mode === 'arcade' ? 60 : 90);
    }
  }

  updateScore(score) {
    this.scoreVal.textContent = score;
  }

  updateTimer(timeLeft, maxTime) {
    this.timerVal.textContent = Math.ceil(timeLeft);
    const pct = Math.max(0, Math.min(100, (timeLeft / maxTime) * 100));
    this.timerProgressFill.style.width = `${pct}%`;
  }

  setFrenzyActive(active) {
    if (active) {
      this.frenzyBanner.classList.remove('hidden');
    } else {
      this.frenzyBanner.classList.add('hidden');
    }
  }

  resetStrikes() {
    this.strikeSlots.forEach((slot) => slot.classList.remove('active'));
  }

  setStrikes(strikeCount) {
    this.strikeSlots.forEach((slot, idx) => {
      if (idx < strikeCount) {
        slot.classList.add('active');
      } else {
        slot.classList.remove('active');
      }
    });
  }

  showPause() {
    this.pauseScreen.classList.remove('hidden');
  }

  hidePause() {
    this.pauseScreen.classList.add('hidden');
  }

  showGameOver(stats) {
    this.hud.classList.add('hidden');
    this.gameoverScreen.classList.remove('hidden');

    this.goScore.textContent = stats.score;
    this.goBestScore.textContent = stats.bestScore;
    this.goTotalSlices.textContent = stats.totalSlices;
    this.goMaxCombo.textContent = stats.maxCombo ? `${stats.maxCombo}x` : '0';
    this.goModeName.textContent = stats.mode.toUpperCase();

    if (stats.isNewBest) {
      this.goNewBest.classList.remove('hidden');
    } else {
      this.goNewBest.classList.add('hidden');
    }
  }

  triggerComboPopup(comboCount) {
    const el = document.createElement('div');
    el.className = 'combo-text-item';
    el.textContent = `${comboCount}x COMBO!`;

    this.comboOverlay.appendChild(el);
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 850);
  }
}
