export class HandTracker {
    constructor(onResultsCallback) {
        this.onResultsCallback = onResultsCallback;
        this.hands = null;
        this.camera = null;
        this.videoElement = null;
        this.debugCanvas = null;
        this.debugCtx = null;
        this.init();
    }

    init() {
        // Create video element
        this.videoElement = document.createElement('video');
        this.videoElement.style.display = 'none';
        document.body.appendChild(this.videoElement);

        this.hands = new Hands({
            locateFile: (file) => `assets/vendor/mediapipe/${file}`
        });

        this.hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.6,
            minTrackingConfidence: 0.6
        });

        this.hands.onResults((results) => {
            if (this.onResultsCallback) {
                this.onResultsCallback(results);
            }
        });
    }

    async start() {
        this.camera = new Camera(this.videoElement, {
            onFrame: async () => {
                await this.hands.send({ image: this.videoElement });
            },
            width: 1280,
            height: 720
        });
        try {
            await this.camera.start();
            return true;
        } catch (error) {
            console.error("Failed to start camera:", error);
            alert("Error: Could not access the camera. Please ensure you have a camera connected and have granted permission.");
            this.stop();
            return false;
        }
    }

    stop() {
        if (this.camera) {
            this.camera.stop();
        }
        if (this.videoElement) {
            this.videoElement.remove();
        }
    }
}
