/**
 * 实验9: 双缝干涉
 * 模拟杨氏双缝干涉实验，显示干涉条纹图案
 * 物理原理: 亮纹条件 d·sin(θ) = nλ, 条纹间距 Δx = λL/d
 */
const DoubleSlitExperiment = {
    id: 'double-slit', title: '双缝干涉', category: 'optics',
    description: '模拟杨氏双缝干涉实验。调节缝距、波长和缝屏距，观察干涉条纹变化。验证条纹间距公式 Δx = λL/d。',

    state: {},

    params: {
        slitDist: { value: 0.5, min: 0.1, max: 2.0, step: 0.05, label: '缝距 d (μm)' },
        wavelength: { value: 500, min: 380, max: 780, step: 10, label: '波长 λ (nm)' },
        screenDist: { value: 1.0, min: 0.3, max: 3.0, step: 0.1, label: '缝屏距 L (m)' },
        slitWidth: { value: 0.08, min: 0.02, max: 0.2, step: 0.01, label: '缝宽 a (μm)' }
    },

    init: function(canvas, controls, info) {
        this.canvas = canvas; this.ctx = canvas.getContext('2d');
        this.controlsEl = controls; this.infoEl = info;
        this.setupCanvas(); this.createControls();
        document.getElementById('btn-pause').style.display = 'none';
        document.getElementById('btn-reset').textContent = '更新';
        this.draw(); this.updateInfo();
    },

    setupCanvas: function() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width - 32; this.canvas.height = rect.height - 32;
        this.W = this.canvas.width; this.H = this.canvas.height;
    },

    createControls: function() {
        this.controlsEl.innerHTML = '';
        for (const [key, param] of Object.entries(this.params)) {
            const group = document.createElement('div'); group.className = 'control-group';
            group.innerHTML = `
                <label><span>${param.label}</span><span class="value" id="val-${key}">${param.value}</span></label>
                <input type="range" min="${param.min}" max="${param.max}" step="${param.step}" value="${param.value}" data-key="${key}">`;
            group.querySelector('input').addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.params[key].value = val;
                document.getElementById(`val-${key}`).textContent = val;
                this.draw(); this.updateInfo();
            });
            this.controlsEl.appendChild(group);
        }
    },

    draw: function() {
        const ctx = this.ctx, W = this.W, H = this.H;
        Draw.clear(ctx, W, H);

        const d = this.params.slitDist.value;
        const lambda = this.params.wavelength.value;
        const L = this.params.screenDist.value;

        // 左侧：双缝示意图
        const slitX = 80;
        const slitCenterY = H / 2;
        const slitGap = 40;

        Draw.text(ctx, '双缝', slitX, 12, '#888', 12);

        // 挡板
        ctx.save();
        ctx.fillStyle = '#888';
        ctx.fillRect(slitX - 5, 0, 10, slitCenterY - slitGap / 2 - 5);
        ctx.fillRect(slitX - 5, slitCenterY + slitGap / 2 + 5, 10, H - slitCenterY - slitGap / 2 - 5);

        // 两条缝
        ctx.fillStyle = '#f1c40f';
        ctx.fillRect(slitX - 2, slitCenterY - slitGap / 2 - 8, 4, 16);
        ctx.fillRect(slitX - 2, slitCenterY + slitGap / 2 - 8, 4, 16);
        ctx.restore();

        // 光源
        ctx.save();
        ctx.fillStyle = '#f39c12';
        ctx.beginPath(); ctx.arc(20, H / 2, 10, 0, 2 * Math.PI); ctx.fill();
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath(); ctx.arc(20, H / 2, 6, 0, 2 * Math.PI); ctx.fill();
        Draw.text(ctx, 'S', 20, H / 2 - 20, '#f39c12', 13, 'center');
        ctx.restore();

        // 波传播示意
        ctx.save();
        ctx.strokeStyle = 'rgba(241,196,15,0.15)'; ctx.lineWidth = 1;
        for (let r = 20; r < slitX - 10; r += 15) {
            ctx.beginPath();
            ctx.arc(20, H / 2, r, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();

        // 右侧：干涉条纹（屏幕）
        const screenX = W - 60;
        ctx.save();
        ctx.fillStyle = '#eee';
        ctx.fillRect(screenX, 0, 6, H);

        // 计算条纹
        const lambdaM = lambda * 1e-9;
        const dM = d * 1e-6;
        const deltaX = lambdaM * L / dM;

        const maxOrder = Math.floor(dM / lambdaM) + 1;
        // 屏幕半高显示约 8 条干涉条纹
        const numFringes = 8;
        const fringeScale = (H / 2) / (numFringes * deltaX);

        // 绘制条纹强度分布
        const imgData = ctx.createImageData(12, H);
        for (let y = 0; y < H; y++) {
            const yNorm = (y - H / 2) / fringeScale;
            const xPos = yNorm; // position on screen
            // 双缝干涉强度: I = I₀ cos²(π d x / (λ L))
            const beta = Math.PI * dM * xPos / (lambdaM * L);
            let intensity = Math.cos(beta) ** 2;

            // 单缝衍射调制
            const a = this.params.slitWidth.value * 1e-6;
            const alpha = Math.PI * a * xPos / (lambdaM * L);
            if (Math.abs(alpha) > 0.001) {
                intensity *= (Math.sin(alpha) / alpha) ** 2;
            }

            const val = Math.floor(intensity * 255);
            for (let x = 0; x < 12; x++) {
                const idx = (y * 12 + x) * 4;
                imgData.data[idx] = val;
                imgData.data[idx + 1] = val;
                imgData.data[idx + 2] = val;
                imgData.data[idx + 3] = 255;
            }
        }
        ctx.putImageData(imgData, screenX - 3, 0);
        ctx.restore();

        // 标注
        Draw.text(ctx, '屏幕', screenX - 1, 14, '#888', 12, 'center');

        // 条纹间距标注
        const spacingPx = deltaX * fringeScale;
        if (spacingPx > 10 && spacingPx < H / 2) {
            ctx.save();
            ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            const lx = screenX - 15;
            ctx.beginPath();
            ctx.moveTo(lx, H / 2);
            ctx.lineTo(lx, H / 2 + spacingPx);
            ctx.stroke();
            ctx.setLineDash([]);
            Draw.text(ctx, `Δx = ${(deltaX * 1e3).toFixed(2)}mm`, lx - 10, H / 2 + spacingPx / 2, '#e74c3c', 11, 'right', 'middle');
            ctx.restore();
        }

        // 从缝到屏幕的连接线
        ctx.save();
        ctx.strokeStyle = 'rgba(124,138,158,0.08)'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(slitX, slitCenterY - slitGap / 2);
        ctx.lineTo(screenX, 0);
        ctx.moveTo(slitX, slitCenterY + slitGap / 2);
        ctx.lineTo(screenX, H);
        ctx.stroke();
        ctx.restore();

        Draw.text(ctx, `λ = ${lambda}nm  d = ${d}μm  L = ${L}m`, W / 2, H - 12, '#888', 12, 'center');

        // 颜色指示
        const colorMap = { 380: '#8b00ff', 450: '#0000ff', 500: '#00ff88', 550: '#ffff00', 600: '#ff8800', 700: '#ff0000', 780: '#cc0000' };
        let closestColor = '#ffffff';
        let minDiff = Infinity;
        for (const [wl, col] of Object.entries(colorMap)) {
            const diff = Math.abs(lambda - parseInt(wl));
            if (diff < minDiff) { minDiff = diff; closestColor = col; }
        }
        ctx.save();
        ctx.fillStyle = closestColor;
        ctx.fillRect(W - 100, H - 30, 16, 16);
        ctx.restore();
        Draw.text(ctx, '光色', W - 120, H - 24, '#888', 11);
    },

    reset: function() { this.draw(); this.updateInfo(); },
    togglePause: function() {},

    updateInfo: function() {
        const d = this.params.slitDist.value;
        const lambda = this.params.wavelength.value;
        const L = this.params.screenDist.value;

        const lambdaM = lambda * 1e-9;
        const dM = d * 1e-6;
        const deltaX = lambdaM * L / dM;
        const maxOrder = Math.floor(dM / lambdaM);

        this.infoEl.innerHTML = `
            <div class="info-row"><span class="label">条纹间距 Δx</span><span class="value">${(deltaX * 1e3).toFixed(2)} mm</span></div>
            <div class="info-row"><span class="label">最大干涉级数</span><span class="value">${maxOrder}</span></div>
            <div class="info-row"><span class="label">波长 λ</span><span class="value">${lambda} nm</span></div>
            <div class="info-row"><span class="label">缝距 d</span><span class="value">${d} μm</span></div>
            <div class="info-row"><span class="label">缝屏距 L</span><span class="value">${L} m</span></div>
        `;
    },

    resize: function() { this.setupCanvas(); this.draw(); }
};
