/**
 * Fruit Cutter - Main Entry Point
 */

import './styles/main.css';
import { SoundManager } from './audio/SoundManager';
import { UIManager } from './ui/UIManager';
import { Game } from './core/Game';

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const soundManager = new SoundManager();

  let game = null;

  const uiManager = new UIManager({
    onStart: (mode) => {
      soundManager.ensureContext();
      soundManager.playClick();
      game.start(mode);
    },
    onPause: () => {
      soundManager.playClick();
      game.pause();
    },
    onResume: () => {
      soundManager.playClick();
      game.resume();
    },
    onRestart: () => {
      soundManager.playClick();
      game.restart();
    },
    onQuit: () => {
      soundManager.playClick();
      game.quitToMenu();
    },
    onBladeChange: (skinId) => {
      soundManager.playClick();
      game.blade.setSkin(skinId);
    },
    onSoundToggle: () => {
      soundManager.ensureContext();
      const isMuted = soundManager.toggleMute();
      if (!isMuted) {
        soundManager.playClick();
      }
      return isMuted;
    },
    onButtonClick: () => {
      soundManager.ensureContext();
      soundManager.playClick();
    },
  });

  game = new Game(canvas, soundManager, uiManager);

  // Set initial blade skin from saved settings
  if (uiManager.selectedBlade) {
    game.blade.setSkin(uiManager.selectedBlade);
  }

  // Audio Context unlock on first user gesture
  const unlockAudio = () => {
    soundManager.ensureContext();
    window.removeEventListener('click', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };

  window.addEventListener('click', unlockAudio, { once: true });
  window.addEventListener('touchstart', unlockAudio, { once: true });
  window.addEventListener('keydown', unlockAudio, { once: true });
});
