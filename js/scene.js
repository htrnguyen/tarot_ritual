import { CARD_CONFIG } from './config.js';

export class TarotScene {
    constructor(container, particleTexture) {
        this.container = container;
        this.particleTexture = particleTexture;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.cardGroup = new THREE.Group();
        this.explosions = [];
        this.starFieldMesh = null;

        this.init();
    }

    init() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x000000, 1);
        this.container.appendChild(this.renderer.domElement);

        this.camera.position.set(0, 0, 16);
        this.camera.lookAt(0, 0, 0);
        
        this.scene.add(this.cardGroup);

        // Enhanced lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(5, 10, 5);
        this.scene.add(directionalLight);
    }

    createCards(tarotData) {
        if (!tarotData || tarotData.length === 0) {
            console.error('[SCENE] No tarot data provided!');
            return;
        }
        
        console.log('[SCENE] Creating cards from', tarotData.length, 'data items');
        
        const textureLoader = new THREE.TextureLoader();
        let cardCount = 0;
        
        const backTexture = textureLoader.load('assets/back.png');
        const backMaterial = new THREE.MeshStandardMaterial({
            map: backTexture,
            side: THREE.FrontSide
        });

        const geometry = new THREE.PlaneGeometry(CARD_CONFIG.cardWidth, CARD_CONFIG.cardHeight);

        CARD_CONFIG.tiers.forEach((tier, tierIndex) => {
            for (let i = 0; i < tier.count; i++) {
                if (cardCount >= tarotData.length) break;

                const data = tarotData[cardCount];
                if (!data) continue;

                const cardGroup = new THREE.Group();

                const backMesh = new THREE.Mesh(geometry, backMaterial);
                backMesh.rotation.y = Math.PI; 
                
                const frontMaterial = new THREE.MeshStandardMaterial({
                    color: 0xffffff,
                    metalness: 0.1,
                    roughness: 0.8,
                    side: THREE.FrontSide
                });
                
                const frontMesh = new THREE.Mesh(geometry, frontMaterial);
                
                backMesh.position.z = -0.005;
                frontMesh.position.z = 0.005;

                cardGroup.add(backMesh);
                cardGroup.add(frontMesh);

                const angle = (i / tier.count) * Math.PI * 2;
                cardGroup.position.x = Math.cos(angle) * tier.radius;
                cardGroup.position.z = Math.sin(angle) * tier.radius;
                cardGroup.position.y = 0;

                cardGroup.rotation.set(0, -angle - Math.PI / 2, 0); 
                
                cardGroup.userData = { 
                    data, 
                    isPicked: false, 
                    tier: tierIndex,
                    angle,
                    initialPosition: cardGroup.position.clone(),
                    initialRotation: cardGroup.rotation.clone(),
                    frontMaterial: frontMaterial
                };
                
                this.cardGroup.add(cardGroup);
                cardCount++;
                
                if (data.url) {
                    textureLoader.load(
                        data.url,
                        (texture) => {
                            frontMaterial.map = texture;
                            frontMaterial.needsUpdate = true;
                        },
                        undefined,
                        (err) => {
                            console.warn(`[SCENE] ⚠ Could not load ${data.url}`);
                        }
                    );
                }
            }
        });
    }

    createBackgroundStars() {
        const starCount = 3000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(starCount * 3);
        
        for (let i = 0; i < starCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 200;
            positions[i + 1] = (Math.random() - 0.5) * 200;
            positions[i + 2] = (Math.random() - 0.5) * 200;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const material = new THREE.PointsMaterial({
            map: this.particleTexture,
            size: 0.8,
            transparent: true,
            opacity: 0.7,
            color: 0xffffff,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        this.starFieldMesh = new THREE.Points(geometry, material);
        this.scene.add(this.starFieldMesh);
    }

    createExplosion(position) {
        const particleCount = 100;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const velocities = [];
        
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = position.x;
            positions[i * 3 + 1] = position.y;
            positions[i * 3 + 2] = position.z;
            
            velocities.push({
                x: (Math.random() - 0.5) * 0.3,
                y: (Math.random() - 0.5) * 0.3,
                z: (Math.random() - 0.5) * 0.3
            });
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const material = new THREE.PointsMaterial({
            map: this.particleTexture,
            size: 0.3,
            transparent: true,
            opacity: 1,
            color: 0xd4af37,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        const particles = new THREE.Points(geometry, material);
        this.scene.add(particles);
        
        this.explosions.push({
            particles,
            velocities,
            life: 1.0
        });
    }

    updateExplosions() {
        this.explosions.forEach((explosion, index) => {
            explosion.life -= 0.015;
            
            if (explosion.life <= 0) {
                this.scene.remove(explosion.particles);
                this.explosions.splice(index, 1);
                return;
            }
            
            const positions = explosion.particles.geometry.attributes.position.array;
            
            for (let i = 0; i < explosion.velocities.length; i++) {
                positions[i * 3] += explosion.velocities[i].x;
                positions[i * 3 + 1] += explosion.velocities[i].y;
                positions[i * 3 + 2] += explosion.velocities[i].z;
            }
            
            explosion.particles.geometry.attributes.position.needsUpdate = true;
            explosion.particles.material.opacity = explosion.life;
        });
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}
