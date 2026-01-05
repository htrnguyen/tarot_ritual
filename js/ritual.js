import { RITUAL_STATE } from './config.js';

export class RitualManager {
    constructor(sceneManager, uiManager, onRitualFinished) {
        this.sceneManager = sceneManager;
        this.uiManager = uiManager;
        this.onRitualFinished = onRitualFinished;
        this.currentState = RITUAL_STATE.IDLE;
        
        this.shuffleStartTime = 0;
        this.rotationSpeed = 0;
        this.avgPinchDistance = 0.1;
        this.leftHandActive = false;
        this.rightHandActive = false;
        this.handsDetected = false;
        
        this.inspectingCard = null;
        this.pickedCard = null;
    }

    getPinchDistance(hand) {
        const thumbTip = hand[4];
        const indexTip = hand[8];
        
        const dx = thumbTip.x - indexTip.x;
        const dy = thumbTip.y - indexTip.y;
        const dz = (thumbTip.z || 0) - (indexTip.z || 0);
        
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    isLeftHand(hand) {
        return hand[0].x > 0.5;
    }

    onResults(results) {
        if (this.currentState === RITUAL_STATE.IDLE || this.currentState === RITUAL_STATE.FINISHED) return;

        this.handsDetected = false;
        let pinchDistances = [];
        this.leftHandActive = false;
        this.rightHandActive = false;

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            this.handsDetected = true;
            
            results.multiHandLandmarks.forEach(hand => {
                const dist = this.getPinchDistance(hand);
                pinchDistances.push(dist);
                
                if (this.isLeftHand(hand)) {
                    this.leftHandActive = true;
                } else {
                    this.rightHandActive = true;
                }
            });

            const rawAvgPinch = pinchDistances.reduce((a, b) => a + b, 0) / pinchDistances.length;
            const smoothingFactor = 0.3;
            this.avgPinchDistance = smoothingFactor * rawAvgPinch + (1 - smoothingFactor) * this.avgPinchDistance;
        }

        const MIN_PINCH_FOR_SHUFFLE = 0.1;
        const MAX_PINCH_FOR_REVEAL = 0.08;

        if (this.avgPinchDistance > MIN_PINCH_FOR_SHUFFLE && this.handsDetected) {
            if (this.currentState === RITUAL_STATE.PREPARING) {
                this.currentState = RITUAL_STATE.SHUFFLING;
                this.shuffleStartTime = Date.now();
            }
            this.uiManager.updateGuide("Đang tráo bài...", "#fff");
        } else if (this.avgPinchDistance < MAX_PINCH_FOR_REVEAL && this.handsDetected && this.currentState === RITUAL_STATE.SHUFFLING) {
            this.currentState = RITUAL_STATE.STOPPING;
            this.selectCardFromRitual();
        }

        if (this.currentState === RITUAL_STATE.PREPARING) {
            this.uiManager.updateGuide("Tách ngón cái và ngón trỏ (🤏) để bắt đầu tráo bài", "rgba(255,255,255,0.5)");
        }
    }

    selectCardFromRitual() {
        let bestCard = null;
        let minDist = Infinity;

        this.sceneManager.cardGroup.children.forEach(card => {
            if (card.userData.isPicked) return;
            const worldPos = new THREE.Vector3();
            card.getWorldPosition(worldPos);
            const distToCam = worldPos.distanceTo(this.sceneManager.camera.position);

            if (distToCam < minDist) {
                minDist = distToCam;
                bestCard = card;
            }
        });

        if (bestCard) {
            this.uiManager.updateGuide("Đã chọn một lá bài! Chuẩn bị tiết lộ...", "#FFD700");
            this.pickCard(bestCard);
        }
    }

    pickCard(card) {
        if (this.inspectingCard || card.userData.isPicked) return;
        card.userData.isPicked = true;
        this.inspectingCard = card;
        this.pickedCard = card;
        
        this.sceneManager.scene.attach(card);
        this.currentState = RITUAL_STATE.FINISHED;
        if (this.onRitualFinished) this.onRitualFinished();

        new TWEEN.Tween(card.position)
            .to({ x: 0, y: 0, z: 12 }, 800)
            .easing(TWEEN.Easing.Exponential.In)
            .onComplete(() => {
                new TWEEN.Tween(card.position)
                    .to({ x: 0, y: 0, z: 10 }, 1500)
                    .easing(TWEEN.Easing.Elastic.Out)
                    .start();

                new TWEEN.Tween(card.scale)
                    .to({ x: 3.0, y: 3.0, z: 3.0 }, 1500)
                    .easing(TWEEN.Easing.Elastic.Out)
                    .start();
                
                new TWEEN.Tween(card.rotation)
                    .to({ x: 0, y: 0, z: 0 }, 1500)
                    .easing(TWEEN.Easing.Back.Out)
                    .onComplete(() => {
                        this.sceneManager.createExplosion(card.position);
                         setTimeout(() => this.uiManager.revealReading([card]), 500);
                    })
                    .start();
            })
            .start();
        
        new TWEEN.Tween(card.rotation)
            .to({ x: 0, y: Math.PI, z: 0 }, 800)
            .easing(TWEEN.Easing.Exponential.In)
            .start();
        new TWEEN.Tween(card.scale)
            .to({ x: 6.0, y: 6.0, z: 6.0 }, 800)
            .easing(TWEEN.Easing.Exponential.In)
            .start();
    }

    updateAnimation(time) {
        if (this.currentState !== RITUAL_STATE.IDLE && this.currentState !== RITUAL_STATE.FINISHED) {
            let targetRotSpeed = 0;

            if (this.currentState === RITUAL_STATE.SHUFFLING) {
                if (!this.handsDetected) {
                    targetRotSpeed = 0;
                } else {
                    const minDist = 0.08;
                    const maxDist = 0.3;
                    const normalizedDist = Math.min(Math.max(this.avgPinchDistance, minDist), maxDist);
                    const speedMultiplier = ((normalizedDist - minDist) / (maxDist - minDist)) * 0.04 + 0.01;
                    
                    if (this.leftHandActive && !this.rightHandActive) {
                        targetRotSpeed = -speedMultiplier;
                    } else if (this.rightHandActive && !this.leftHandActive) {
                        targetRotSpeed = speedMultiplier;
                    } else if (this.leftHandActive && this.rightHandActive) {
                        targetRotSpeed = speedMultiplier;
                    } else {
                        targetRotSpeed = 0;
                    }
                }
            } else if (this.currentState === RITUAL_STATE.STOPPING) {
                targetRotSpeed = 0;
            }
            
            this.rotationSpeed += (targetRotSpeed - this.rotationSpeed) * 0.08;
            this.sceneManager.cardGroup.rotation.y += this.rotationSpeed;

            this.sceneManager.cardGroup.children.forEach((c, i) => {
                if (!c.userData.isPicked) {
                    const tier = c.userData.tier || 0;
                    const timeOffset = i * 0.1;
                    
                    if (this.currentState === RITUAL_STATE.SHUFFLING) {
                        const orbitRadius = 0.15;
                        const orbitSpeed = 0.002;
                        const orbitAngle = time * orbitSpeed + timeOffset;
                        
                        c.position.x += Math.cos(orbitAngle) * orbitRadius;
                        c.position.z += Math.sin(orbitAngle) * orbitRadius;
                        
                        const waveHeight = 0.4;
                        const waveSpeed = 0.003 + tier * 0.001;
                        c.position.y = Math.sin(time * waveSpeed + timeOffset) * waveHeight;
                        
                        c.rotation.x = Math.sin(time * 0.002 + timeOffset) * 0.3;
                        c.rotation.z = Math.cos(time * 0.0025 + timeOffset) * 0.2;
                        c.rotation.y += Math.sin(time * 0.001 + timeOffset) * 0.02;
                        
                    } else if (this.currentState === RITUAL_STATE.PREPARING) {
                        c.position.y = Math.sin(time * 0.001 + timeOffset) * 0.12;
                        c.rotation.x = Math.sin(time * 0.0008 + timeOffset) * 0.05;
                        c.rotation.z = Math.cos(time * 0.001 + timeOffset) * 0.03;
                    }
                }
            });
        }
    }
}
