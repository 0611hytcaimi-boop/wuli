/**
 * 实验: 干涉衍射
 * 综合演示单缝衍射、双缝干涉和多缝(光栅)衍射
 * 物理原理: 单缝衍射 I = I₀(sinα/α)², 双缝干涉 I = I₀cos²β, 光栅 I = I₀(sinα/α)²(sin(Nβ)/sinβ)²/N²
 */
const InterferenceDiffractionExperiment = {
    id: 'interference-diffraction', title: '干涉衍射', category: 'optics',
    description: '综合研究光的干涉与衍射现象。可在单缝衍射、双缝干涉和多缝光栅之间切换，观察强度分布图和彩色条纹图样。',

    state: { mode: 'double' },

    params: {
        mode: { value: 'double', type: 'select', options: ['single', 'double', 'grating'], label: '模式' },
        wavelength: { value: 550, min: 380, max: 780, step: 5, label: '波长 λ (nm)' },
        slitDist: { value: 0.5, min: 0.1, max: 2.0, step: 0.05, label: '缝距 d (μm)' },
        slitWidth: { value: 0.1, min: 0.02, max: 0.3, step: 0.01, label: '缝宽 a (μm)' },
        numSlits: { value: 3, min: 2, max: 5, step: 1, label: '缝数 N (光栅)' },
        screenDist: { value: 1.0, min: 0.3, max: 3.0, step: 0.1, label: '缝屏距 L (m)' }
    },

    info: {}, animId: null, lastTime: null,

    init: function(canvas, controls, info) {
        this.canvas = canvas; this.ctx = canvas.getContext('2d');
        this.controlsEl = controls; this.infoEl = info;
        this.setupCanvas(); this.createControls();
        document.getElementById('btn-pause').style.display = 'none';
        document.getElementById('btn-reset').textContent = '更新';
        this.state.mode = this.params.mode.value;
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
            if (param.type === 'select') {
                const modeLabels = { single: '单缝衍射', double: '双缝干涉', grating: '多缝光栅' };
                const opts = param.options.map(o =>
                    `<option value="${o}">${modeLabels[o] || o}</option>`).join('');
                group.innerHTML = `<label>${param.label}</label><select data-key="${key}">${opts}</select>`;
                group.querySelector('select').value = param.value;
                group.querySelector('select').addEventListener('change', (e) => {
                    this.params[key].value = e.target.value;
                    this.state.mode = e.target.value;
                    this.draw(); this.updateInfo();
                });
            } else {
                group.innerHTML = `
                    <label><span>${param.label}</span><span class="value" id="val-${key}">${param.value}</span></label>
                    <input type="range" min="${param.min}" max="${param.max}" step="${param.step}" value="${param.value}" data-key="${key}">`;
                group.querySelector('input').addEventListener('input', (e) => {
                    const val = parseFloat(e.target.value);
                    this.params[key].value = val;
                    document.getElementById(`val-${key}`).textContent = val;
                    this.draw(); this.updateInfo();
                });
            }
            this.controlsEl.appendChild(group);
        }
    },

    reset: function() { this.draw(); this.updateInfo(); },
    togglePause: function() {},

    draw: function() {
        const ctx = this.ctx, W = this.W, H = this.H;
        Draw.clear(ctx, W, H);

        const mode = this.state.mode;
        const lambda = this.params.wavelength.value;
        const d = this.params.slitDist.value;
        const a = this.params.slitWidth.value;
        const N = this.params.numSlits.value;
        const L = this.params.screenDist.value;

        const lambdaM = lambda * 1e-9;
        const dM = d * 1e-6;
        const aM = a * 1e-6;

        // ====== 左侧: 缝示意图 ======
        const slitX = 70;
        const slitCY = H * 0.35;

        Draw.text(ctx, '缝示意图', slitX, 14, '#888', 12, 'center');

        // 光源
        ctx.save();
        const lightGrad = ctx.createRadialGradient(18, slitCY, 2, 18, slitCY, 12);
        lightGrad.addColorStop(0, '#fffde7');
        lightGrad.addColorStop(1, '#f9a825');
        ctx.fillStyle = lightGrad;
        ctx.beginPath(); ctx.arc(18, slitCY, 12, 0, 2 * Math.PI); ctx.fill();
        ctx.fillStyle = '#fdd835';
        ctx.beginPath(); ctx.arc(18, slitCY, 7, 0, 2 * Math.PI); ctx.fill();
        Draw.text(ctx, 'S', 18, slitCY - 18, '#f9a825', 13, 'center');
        ctx.restore();

        // 光波传播
        ctx.save();
        ctx.strokeStyle = 'rgba(249,168,37,0.1)'; ctx.lineWidth = 1;
        for (let r = 15; r < slitX - 15; r += 12) {
            ctx.beginPath();
            ctx.arc(18, slitCY, r, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();

        // 挡板
        ctx.save();
        ctx.fillStyle = '#666';

        if (mode === 'single') {
            // 单缝
            ctx.fillRect(slitX - 5, 0, 10, slitCY - 20);
            ctx.fillRect(slitX - 5, slitCY + 20, 10, H * 0.7 - slitCY);
            ctx.fillStyle = '#fdd835';
            ctx.fillRect(slitX - 3, slitCY - 20, 6, 40);
        } else if (mode === 'double') {
            const gap = 30;
            ctx.fillRect(slitX - 5, 0, 10, slitCY - gap / 2 - 12);
            ctx.fillRect(slitX - 5, slitCY - gap / 2 + 12, 10, gap - 24);
            ctx.fillRect(slitX - 5, slitCY + gap / 2 + 12, 10, H * 0.7 - slitCY - gap / 2 - 12);
            ctx.fillStyle = '#fdd835';
            ctx.fillRect(slitX - 3, slitCY - gap / 2 - 10, 6, 20);
            ctx.fillRect(slitX - 3, slitCY + gap / 2 - 10, 6, 20);
        } else {
            // 光栅 - 多条缝
            const gap = 22;
            const n = Math.min(N, 5);
            const totalH = (n - 1) * gap;
            const startY = slitCY - totalH / 2;
            ctx.fillRect(slitX - 5, 0, 10, startY - 12);
            for (let i = 0; i < n; i++) {
                const sy = startY + i * gap;
                if (i > 0) {
                    ctx.fillRect(slitX - 5, sy - 14, 10, gap - 28);
                }
                ctx.fillStyle = '#fdd835';
                ctx.fillRect(slitX - 3, sy - 10, 6, 20);
                ctx.fillStyle = '#666';
            }
            ctx.fillRect(slitX - 5, startY + totalH + 12, 10, H * 0.7 - (startY + totalH + 12));
        }
        ctx.restore();

        // 从缝到屏幕的示意线
        ctx.save();
        ctx.strokeStyle = 'rgba(124,138,158,0.06)'; ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(slitX, slitCY - 20);
        ctx.lineTo(W * 0.58, 30);
        ctx.moveTo(slitX, slitCY + 20);
        ctx.lineTo(W * 0.58, H - 30);
        ctx.stroke();
        ctx.restore();

        // ====== 右侧: 强度分布图 ======
        const graphL = W * 0.38, graphR = W - 30;
        const graphT = 35, graphB = H - 50;
        const gW = graphR - graphL, gH = graphB - graphT;

        // 背景
        ctx.save();
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(graphL, graphT, gW, gH);
        ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
        ctx.strokeRect(graphL, graphT, gW, gH);
        ctx.restore();

        Draw.text(ctx, mode === 'single' ? '单缝衍射强度分布' : (mode === 'double' ? '双缝干涉强度分布' : `光栅衍射 N=${N} 强度分布`),
            graphL + gW / 2, graphT - 8, '#666', 13, 'center', 'bottom');

        // 坐标轴
        const zeroY = graphT + gH / 2;
        ctx.save();
        ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(graphL, zeroY); ctx.lineTo(graphR, zeroY); ctx.stroke();
        // I = 1 参考线
        ctx.beginPath(); ctx.moveTo(graphL, graphT); ctx.lineTo(graphR, graphT); ctx.stroke();
        ctx.setLineDash([]);

        // Y轴标签
        Draw.text(ctx, '1', graphL - 4, graphT, '#999', 10, 'right', 'middle');
        Draw.text(ctx, '0.5', graphL - 4, graphT + gH / 4, '#999', 10, 'right', 'middle');
        Draw.text(ctx, '0', graphL - 4, zeroY, '#999', 10, 'right', 'middle');
        Draw.text(ctx, 'I', graphL - 4, graphT + gH / 2, '#666', 11, 'right', 'middle');
        ctx.restore();

        // 计算X轴范围
        const maxOrder = mode === 'single' ? 3 : (mode === 'double' ? Math.min(5, Math.floor(dM / lambdaM) + 1) : Math.min(3, Math.floor(dM / lambdaM) + 1));
        const xMaxRaw = maxOrder * lambdaM * L / Math.max(aM, dM);
        const xMax = Math.max(xMaxRaw, lambdaM * L / aM * 3);
        const xScale = gW / 2 / xMax;

        // 波长颜色
        const rgb = Physics.wavelengthToRGB(lambda);
        const waveColor = `rgb(${rgb.r},${rgb.g},${rgb.b})`;

        // 绘制强度曲线
        ctx.save();
        ctx.beginPath();
        const steps = 400;
        let firstPoint = true;
        const curvePoints = [];

        for (let i = 0; i <= steps; i++) {
            const xScreen = (i / steps - 0.5) * 2 * xMax; // screen position in meters
            let intensity;

            if (mode === 'single') {
                intensity = Physics.singleSlitIntensity(xScreen, aM, L, lambdaM, 1);
            } else if (mode === 'double') {
                const doubleI = Physics.doubleSlitIntensity(xScreen, dM, L, lambdaM, 1);
                const singleEnv = Physics.singleSlitIntensity(xScreen, aM, L, lambdaM, 1);
                intensity = doubleI * singleEnv;
            } else {
                intensity = Physics.gratingIntensity(xScreen, dM, aM, L, lambdaM, N, 1);
            }

            const px = graphL + gW / 2 + xScreen * xScale;
            const py = graphT + gH - intensity * gH;
            curvePoints.push({ px, py, intensity });

            if (firstPoint) { ctx.moveTo(px, py); firstPoint = false; }
            else { ctx.lineTo(px, py); }
        }

        ctx.strokeStyle = waveColor;
        ctx.lineWidth = 2;
        ctx.stroke();

        // 填充面积
        if (curvePoints.length > 0) {
            const lastPoint = curvePoints[curvePoints.length - 1];
            ctx.lineTo(lastPoint.px, zeroY);
            const firstPt = curvePoints[0];
            ctx.lineTo(firstPt.px, zeroY);
            ctx.closePath();
            ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.15)`;
            ctx.fill();
        }
        ctx.restore();

        // ====== 底部: 彩色干涉/衍射图样 ======
        const fringeT = graphB + 10;
        const fringeH = H - fringeT - 20;
        if (fringeH > 10) {
            const imgW = Math.min(gW, 500);
            const imgH = fringeH;
            const imgX = graphL + (gW - imgW) / 2;

            ctx.save();
            const imgData = ctx.createImageData(1, Math.floor(imgH));
            for (let py = 0; py < imgH; py++) {
                const yNorm = (py / imgH - 0.5) * 2 * xMax;
                let intensity;
                if (mode === 'single') {
                    intensity = Physics.singleSlitIntensity(yNorm, aM, L, lambdaM, 1);
                } else if (mode === 'double') {
                    const doubleI = Physics.doubleSlitIntensity(yNorm, dM, L, lambdaM, 1);
                    const singleEnv = Physics.singleSlitIntensity(yNorm, aM, L, lambdaM, 1);
                    intensity = doubleI * singleEnv;
                } else {
                    intensity = Physics.gratingIntensity(yNorm, dM, aM, L, lambdaM, N, 1);
                }
                const val = Physics.clamp(intensity, 0, 1);
                const idx = py;
                imgData.data[idx * 4] = Math.round(rgb.r * val);
                imgData.data[idx * 4 + 1] = Math.round(rgb.g * val);
                imgData.data[idx * 4 + 2] = Math.round(rgb.b * val);
                imgData.data[idx * 4 + 3] = 255;
            }
            // 水平扩展图像数据
            const fullImgData = ctx.createImageData(Math.floor(imgW), Math.floor(imgH));
            for (let px = 0; px < imgW; px++) {
                for (let py = 0; py < imgH; py++) {
                    const srcIdx = py;
                    const dstIdx = (py * Math.floor(imgW) + px) * 4;
                    fullImgData.data[dstIdx] = imgData.data[srcIdx * 4];
                    fullImgData.data[dstIdx + 1] = imgData.data[srcIdx * 4 + 1];
                    fullImgData.data[dstIdx + 2] = imgData.data[srcIdx * 4 + 2];
                    fullImgData.data[dstIdx + 3] = 255;
                }
            }
            ctx.putImageData(fullImgData, imgX, fringeT);
            ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
            ctx.strokeRect(imgX, fringeT, imgW, imgH);

            ctx.restore();
            Draw.text(ctx, '干涉/衍射图样（屏幕）', imgX + imgW / 2, fringeT + imgH + 14, '#888', 11, 'center');
        }

        // 底部信息栏
        const modeNames = { single: '单缝衍射', double: '双缝干涉', grating: '多缝光栅' };
        const extraInfo = mode === 'grating' ? `  N = ${N}` : '';
        Draw.text(ctx, `${modeNames[mode] || mode}${extraInfo}  λ = ${lambda}nm  d = ${d}μm  a = ${a}μm  L = ${L}m`,
            W / 2, H - 6, '#888', 11, 'center', 'bottom');

        // 光色色块
        ctx.save();
        ctx.fillStyle = waveColor;
        ctx.fillRect(W - 60, 10, 18, 18);
        ctx.strokeStyle = '#ccc';
        ctx.strokeRect(W - 60, 10, 18, 18);
        Draw.text(ctx, `${lambda}nm`, W - 60, 38, '#888', 10, 'center');
        ctx.restore();
    },

    updateInfo: function() {
        const mode = this.state.mode;
        const lambda = this.params.wavelength.value;
        const d = this.params.slitDist.value;
        const a = this.params.slitWidth.value;
        const N = this.params.numSlits.value;
        const L = this.params.screenDist.value;

        const lambdaM = lambda * 1e-9;
        const dM = d * 1e-6;
        const aM = a * 1e-6;

        const fringeSpacing = (mode !== 'single') ? (lambdaM * L / dM) : 0;
        const firstMinAngle = Physics.toDeg(Math.asin(lambdaM / aM));
        const maxOrder = (mode !== 'single') ? Math.floor(dM / lambdaM) : 0;

        let html = '';
        html += `<div class="info-row"><span class="label">模式</span><span class="value">${
            mode === 'single' ? '单缝衍射' : (mode === 'double' ? '双缝干涉' : '多缝光栅')
        }</span></div>`;
        html += `<div class="info-row"><span class="label">波长 λ</span><span class="value">${lambda} nm</span></div>`;
        html += `<div class="info-row"><span class="label">缝宽 a</span><span class="value">${a} μm</span></div>`;
        if (mode !== 'single') {
            html += `<div class="info-row"><span class="label">缝距 d</span><span class="value">${d} μm</span></div>`;
            html += `<div class="info-row"><span class="label">条纹间距 Δx</span><span class="value">${(fringeSpacing * 1e3).toFixed(2)} mm</span></div>`;
            html += `<div class="info-row"><span class="label">最大干涉级数</span><span class="value">${maxOrder}</span></div>`;
        }
        html += `<div class="info-row"><span class="label">第一暗纹角 θ</span><span class="value">${firstMinAngle.toFixed(1)}°</span></div>`;
        if (mode === 'grating') {
            html += `<div class="info-row"><span class="label">缝数 N</span><span class="value">${N}</span></div>`;
            const dSinTheta = lambdaM / dM;
            html += `<div class="info-row"><span class="label">主极大条件</span><span class="value">d·sinθ = nλ</span></div>`;
        }
        html += `<div class="info-row"><span class="label">缝屏距 L</span><span class="value">${L} m</span></div>`;

        this.infoEl.innerHTML = html;
    },

    resize: function() { this.setupCanvas(); this.draw(); }
};
