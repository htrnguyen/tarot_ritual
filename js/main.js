import { TarotScene } from './scene.js';
import { RitualManager } from './ritual.js';
import { UIManager } from './ui.js';
import { HandTracker } from './hand-tracking.js';
import { fetchTarotData } from './data-loader.js';
import { generateParticleTexture, shuffleArray } from './utils.js';
import { RITUAL_STATE } from './config.js';

class TarotApp {
    constructor() {
        this.container = document.getElementById('canvas-container');
        this.particleTexture = generateParticleTexture();
        this.sceneManager = new TarotScene(this.container, this.particleTexture);
        this.uiManager = new UIManager();
        this.ritualManager = new RitualManager(this.sceneManager, this.uiManager, () => {
            if (this.handTracker) this.handTracker.stop();
        });
        this.handTracker = new HandTracker((results) => this.ritualManager.onResults(results));
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        window.addEventListener('resize', () => this.sceneManager.onResize());
        
        this.init();
    }

    async init() {
        const tarotData = await fetchTarotData();
        shuffleArray(tarotData);
        
        this.sceneManager.createCards(tarotData);
        this.sceneManager.createBackgroundStars();
        
        setTimeout(() => {
            document.getElementById('loading').style.opacity = 0;
            setTimeout(() => {
                document.getElementById('loading').style.display = 'none';
            }, 800);
        }, 1500);

        const startBtn = document.getElementById('start-btn');
        if (startBtn) {
            startBtn.addEventListener('click', async () => {
                const welcomeScreen = document.getElementById('welcome-screen');
                if (welcomeScreen) {
                    welcomeScreen.style.opacity = 0;
                    setTimeout(() => {
                        welcomeScreen.style.display = 'none';
                    }, 800);
                }

                // Start camera
                this.ritualManager.currentState = RITUAL_STATE.PREPARING;
                const cameraStarted = await this.handTracker.start();
                
                if (cameraStarted) {
                    const uiLayer = document.getElementById('ui-layer');
                    if (uiLayer) {
                        uiLayer.style.display = 'block';
                    }
                    this.uiManager.updateGuide("Tách ngón cái và ngón trỏ (🤏) để bắt đầu tráo bài", "rgba(255,255,255,0.5)");
                }
            });
        }

        this.animate();
    }

    animate(time) {
        requestAnimationFrame((t) => this.animate(t));
        TWEEN.update(time);
        
        this.sceneManager.updateExplosions();
        this.ritualManager.updateAnimation(time);
        
        if (this.sceneManager.starFieldMesh) {
            this.sceneManager.starFieldMesh.rotation.y = time * 0.00005;
            if (this.ritualManager.currentState === RITUAL_STATE.SHUFFLING) {
                this.sceneManager.starFieldMesh.rotation.y += 0.001;
            }
            this.sceneManager.starFieldMesh.material.size = Math.sin(time * 0.002) * 0.1 + 0.9;
        }

        this.sceneManager.renderer.render(this.sceneManager.scene, this.sceneManager.camera);
    }
}

new TarotApp();
