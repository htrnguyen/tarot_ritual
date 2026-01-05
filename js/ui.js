export class UIManager {
    constructor() {
        this.guide = document.getElementById('guide-text');
        this.counter = document.getElementById('counter');
        this.modal = document.getElementById('result-modal');
        this.uiLayer = document.getElementById('ui-layer');
        this.readingContent = document.getElementById('final-reading');
        this.ritualOverlay = document.getElementById('ritual-overlay');
    }

    onStartRitualClick(callback) {
        document.getElementById('start-ritual-btn').onclick = callback;
    }

    onSkipCameraClick(callback) {
        document.getElementById('skip-camera-btn').onclick = callback;
    }

    updateGuide(text, color = "#fff") {
        this.guide.innerText = text;
        this.guide.style.color = color;
    }

    updateCounter(count) {
        this.counter.innerText = `${count} / 3`;
        if (count === 3) {
            this.updateGuide("Định mệnh đã an bài...", "#fff");
        }
    }

    hideOverlay() {
        this.ritualOverlay.style.opacity = 0;
        setTimeout(() => {
            this.ritualOverlay.style.display = 'none';
            this.uiLayer.style.display = 'block';
        }, 1000);
    }

    revealReading(storedCards) {
        this.uiLayer.style.pointerEvents = "auto";
        this.guide.style.opacity = 0;
        
        const card = storedCards[0];
        if (!card) {
            console.warn("No card to display in revealReading.");
            return;
        }
        const data = card.userData.data;
        
        let html = `
            <div class="reading-section">
                <div class="reading-body">
                    <img src="${data.url}" class="reading-img">
                    <div class="reading-content">
                        <h3>${data.name_en}</h3>
                        <div class="reading-en" style="font-size: 1.1rem; color: #ccc;">${data.name}</div>
                        <div class="reading-msg">${data.core_message}</div>
                        <div class="reading-tags">
                            ${data.keywords.map(k => `<span class="tag">${k}</span>`).join('')}
                        </div>
                        <div class="reading-box">
                            <span class="reading-subtitle">Chỉ dẫn hằng ngày</span>
                            <div class="reading-desc">${data.daily_guidance}</div>
                        </div>
                        <div class="reading-box">
                            <span class="reading-subtitle">Câu hỏi suy ngẫm</span>
                            <div class="reading-desc" style="font-style: italic;">"${data.reflection_question}"</div>
                        </div>
                    </div>
                </div>
            </div>`;
        
        this.readingContent.innerHTML = html;
        this.modal.style.display = 'block';
    }
}
