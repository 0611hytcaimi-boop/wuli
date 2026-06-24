/**
 * 实验: 电磁感应
 * 模拟磁铁穿过线圈时的电磁感应现象 - 法拉第定律
 * 物理原理: ε = -N·dΦ/dt, 楞次定律决定感应电流方向
 */
const ElectromagneticInductionExperiment = {
    id: 'electromagnetic-induction', title: '电磁感应', category: 'electromagnetism',
    description: '观察磁铁在线圈中运动产生的电磁感应现象。调节磁铁速度、线圈匝数和磁铁强度，验证法拉第电磁感应定律和楞次定律。',

    state: {
        magnetX: 0,       // 磁铁水平位置 (px)
        magnetDir: 1,     // 运动方向
        flux: 0,          // 当前磁通量
        prevFlux: 0,      // 上一帧磁通量
        emf: 0,           // 感生电动势 (V)
        time: 0,
        isRunning: false,
        currentHistory: [] // EMF历史 (用于示波器显示)
    },

    params: {
        magnetSpeed: { value: 100, min: 20, max: 300, step: 10, label: '磁铁速度' },
        coilTurns: { value: 100, min: 10, max: 500, step: 10, label: '线圈匝数 N' },
        magnetStrength: { value: 1, min: 0.2, max: 3, step: 0.1, label: '磁铁强度 B (T)' }
    },

    info: {}, animId: null, lastTime: null,

    init: function(canvas, controls, info) {
        this.canvas = canvas; this.ctx = canvas.getContext('2d');
        this.controlsEl = controls; this.infoEl = info;
        this.setupCanvas(); this.createControls(); this.reset();
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
            });
            this.controlsEl.appendChild(group);
        }
    },

    // 计算通过线圈的磁通量 (高斯型分布)
    calcFlux: function(magX, coilX) {
        const B = this.params.magnetStrength.value;
        const sigma = 60; // 磁通分布的宽度
        const dx = magX - coilX;
        return B * Math.exp(-(dx * dx) / (2 * sigma * sigma));
    },

    reset: function() {
        const coilX = this.W * 0.45;
        this.state.magnetX = coilX - 250;
        this.state.magnetDir = 1;
        this.state.flux = 0;
        this.state.prevFlux = 0;
        this.state.emf = 0;
        this.state.time = 0;
        this.state.isRunning = false;
        this.state.currentHistory = [];
        this.lastTime = null;
        document.getElementById('btn-pause').textContent = '开始';
        document.getElementById('btn-pause').classList.remove('paused');
        this.draw(); this.updateInfo();
    },

    togglePause: function() {
        this.state.isRunning = !this.state.isRunning;
        document.getElementById('btn-pause').textContent = this.state.isRunning ? '暂停' : '继续';
        if (this.state.isRunning) {
            this.lastTime = performance.now();
            this.animate(this.lastTime);
        } else {
            if (this.animId) { cancelAnimationFrame(this.animId); this.animId = null; }
        }
    },

    animate: function(timestamp) {
        if (!this.state.isRunning) return;
        if (this.lastTime === null) this.lastTime = timestamp;
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
        this.lastTime = timestamp;

        const speed = this.params.magnetSpeed.value;
        const coilX = this.W * 0.45;

        // 磁铁往复运动
        const leftLimit = coilX - 200;
        const rightLimit = coilX + 200;
        this.state.magnetX += speed * dt * this.state.magnetDir;

        if (this.state.magnetX > rightLimit) {
            this.state.magnetX = rightLimit;
            this.state.magnetDir = -1;
        } else if (this.state.magnetX < leftLimit) {
            this.state.magnetX = leftLimit;
            this.state.magnetDir = 1;
        }

        this.state.time += dt;

        // 计算磁通量和感生电动势
        this.state.prevFlux = this.state.flux;
        this.state.flux = this.calcFlux(this.state.magnetX, coilX);
        const dPhi = (this.state.flux - this.state.prevFlux) / dt;
        const N = this.params.coilTurns.value;
        this.state.emf = -N * dPhi;

        // 记录EMF历史
        this.state.currentHistory.push({
            t: this.state.time,
            emf: this.state.emf
        });
        if (this.state.currentHistory.length > 500) this.state.currentHistory.shift();

        this.draw(); this.updateInfo();
        this.animId = requestAnimationFrame((t) => this.animate(t));
    },

    draw: function() {
        const ctx = this.ctx, W = this.W, H = this.H;
        Draw.clear(ctx, W, H, '#f8fafc');

        const coilX = W * 0.45;
        const coilY = H * 0.45;

        // ========== 磁通量图示 (上半部分) ==========
        const fluxGraphY = H * 0.15;
        const fluxGraphH = 60;
        const fluxGraphL = coilX - 180;
        const fluxGraphR = coilX + 180;

        ctx.save();
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        ctx.strokeRect(fluxGraphL, fluxGraphY, fluxGraphR - fluxGraphL, fluxGraphH);

        // 绘制磁通曲线
        const sigma = 60;
        const B = this.params.magnetStrength.value;
        ctx.strokeStyle = '#7c8a9e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let px = fluxGraphL; px <= fluxGraphR; px += 2) {
            const dx = px - coilX;
            const phi = B * Math.exp(-(dx * dx) / (2 * sigma * sigma));
            const py = fluxGraphY + fluxGraphH - (phi / B) * fluxGraphH * 0.8;
            if (px === fluxGraphL) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // 标记当前位置
        const currentPhi = this.state.flux;
        const phiNorm = currentPhi / B;
        const markerX = this.state.magnetX;
        const markerY = fluxGraphY + fluxGraphH - phiNorm * fluxGraphH * 0.8;
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(markerX, markerY, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();

        Draw.text(ctx, 'Φ(t)', fluxGraphL - 30, fluxGraphY + fluxGraphH / 2, '#666', 12, 'right', 'middle');

        // ========== 线圈 ==========
        ctx.save();
        const N = this.params.coilTurns.value;
        const turnsDrawn = Math.min(12, Math.max(4, Math.floor(N / 20)));
        const coilWidth = 30;
        const coilHeight = 120;

        // 线圈支架
        ctx.fillStyle = '#888';
        ctx.fillRect(coilX - coilWidth / 2 - 10, coilY - coilHeight / 2 - 15, coilWidth + 20, 8);
        ctx.fillRect(coilX - coilWidth / 2 - 10, coilY + coilHeight / 2 + 7, coilWidth + 20, 8);

        // 绘制多个线圈匝
        for (let i = 0; i < turnsDrawn; i++) {
            const alpha = 0.3 + (i / turnsDrawn) * 0.5;
            const spacing = (i - (turnsDrawn - 1) / 2) * (coilWidth / turnsDrawn) * 2;
            ctx.strokeStyle = `rgba(231, 76, 60, ${alpha})`;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(
                coilX - coilWidth / 2 + spacing,
                coilY - coilHeight / 2,
                coilWidth - spacing * 2,
                coilHeight
            );
        }

        // 线圈引出线到电流表
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(coilX - coilWidth / 2, coilY - coilHeight / 2);
        ctx.lineTo(coilX - coilWidth / 2, coilY - coilHeight / 2 - 30);
        ctx.lineTo(W * 0.78, coilY - coilHeight / 2 - 30);
        ctx.lineTo(W * 0.78, coilY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(coilX - coilWidth / 2, coilY + coilHeight / 2);
        ctx.lineTo(coilX - coilWidth / 2, coilY + coilHeight / 2 + 30);
        ctx.lineTo(W * 0.72, coilY + coilHeight / 2 + 30);
        ctx.lineTo(W * 0.72, coilY);
        ctx.stroke();

        Draw.text(ctx, `N=${N}匝`, coilX + 30, coilY, '#666', 12, 'left', 'middle');
        ctx.restore();

        // ========== 磁铁 ==========
        const magX = this.state.magnetX;
        const magY = coilY;
        const magW = 70;
        const magH = 100;

        ctx.save();
        // N极 (红色)
        const gradN = ctx.createLinearGradient(magX - magW / 2, magY, magX, magY);
        gradN.addColorStop(0, '#ff4444');
        gradN.addColorStop(1, '#cc3333');
        ctx.fillStyle = gradN;
        ctx.fillRect(magX - magW / 2, magY - magH / 2, magW / 2, magH);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.strokeRect(magX - magW / 2, magY - magH / 2, magW, magH);

        // S极 (蓝色)
        const gradS = ctx.createLinearGradient(magX, magY, magX + magW / 2, magY);
        gradS.addColorStop(0, '#3366cc');
        gradS.addColorStop(1, '#3355bb');
        ctx.fillStyle = gradS;
        ctx.fillRect(magX, magY - magH / 2, magW / 2, magH);
        ctx.strokeRect(magX - magW / 2, magY - magH / 2, magW, magH);

        // N 和 S 标签
        Draw.text(ctx, 'N', magX - magW / 4, magY - magH / 2 - 5, 'white', 18, 'center', 'bottom');
        Draw.text(ctx, 'S', magX + magW / 4, magY - magH / 2 - 5, 'white', 18, 'center', 'bottom');

        // 磁铁阴影
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillRect(magX - magW / 2 + 3, magY - magH / 2 + 3, magW, magH);
        ctx.restore();

        // ========== 磁场线 ==========
        ctx.save();
        ctx.strokeStyle = 'rgba(150,150,200,0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        const fieldLines = 5;
        for (let i = 0; i < fieldLines; i++) {
            const spread = (i - (fieldLines - 1) / 2) * 18;
            ctx.beginPath();
            // 从N极出发
            ctx.moveTo(magX + magW / 2, magY - magH / 2 + 15 + i * 15);
            // 弯曲到S极
            const cp1x = magX + magW / 2 + 50 + Math.abs(spread) * 2;
            const cp1y = magY - magH / 2 + 15 + i * 15 - 20;
            const cp2x = magX - magW / 2 - 50 - Math.abs(spread) * 2;
            const cp2y = magY - magH / 2 + 15 + i * 15 - 10;
            const endX = magX - magW / 2;
            const endY = magY - magH / 2 + 15 + i * 15;
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
            ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.restore();

        // ========== 电流表 (检流计) ==========
        const galvX = W * 0.75;
        const galvY = coilY;
        const galvR = 45;

        ctx.save();
        // 表盘
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(galvX, galvY, galvR, 0, 2 * Math.PI);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.stroke();

        // 刻度线
        for (let i = -5; i <= 5; i++) {
            const angle = (i / 5) * Math.PI * 0.7;
            const innerR = i === 0 ? galvR - 12 : galvR - 8;
            const x1 = galvX + innerR * Math.sin(angle);
            const y1 = galvY - innerR * Math.cos(angle);
            const x2 = galvX + (galvR - 2) * Math.sin(angle);
            const y2 = galvY - (galvR - 2) * Math.cos(angle);
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }

        // 指针 (偏转角度对应EMF)
        const maxEMF = 5;
        const emfClamped = Physics.clamp(this.state.emf, -maxEMF, maxEMF);
        const needleAngle = -(emfClamped / maxEMF) * Math.PI * 0.6;

        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(galvX, galvY);
        ctx.lineTo(
            galvX + (galvR - 6) * Math.sin(needleAngle),
            galvY - (galvR - 6) * Math.cos(needleAngle)
        );
        ctx.stroke();

        // 中心点
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(galvX, galvY, 3, 0, 2 * Math.PI);
        ctx.fill();

        ctx.restore();
        Draw.text(ctx, 'G', galvX, galvY + 35, '#555', 14, 'center', 'middle');
        Draw.text(ctx, '检流计', galvX, galvY + 50, '#888', 11, 'center', 'top');

        // ========== 感应电流方向箭头 (楞次定律) ==========
        const currentDir = this.state.emf > 0.05 ? 1 : (this.state.emf < -0.05 ? -1 : 0);
        if (currentDir !== 0) {
            ctx.save();
            ctx.strokeStyle = currentDir > 0 ? '#e74c3c' : '#3498db';
            ctx.lineWidth = 3;
            ctx.fillStyle = ctx.strokeStyle;

            // 线圈上的电流箭头
            const arrowX = coilX + coilWidth / 2 + 10;
            const arrowY1 = coilY - coilHeight / 3;
            const arrowY2 = coilY + coilHeight / 3;

            if (currentDir > 0) {
                // 逆时针 (从上往下看)
                Draw.arrowLine(ctx, arrowX, arrowY2, arrowX, arrowY1, ctx.strokeStyle, 3);
            } else {
                // 顺时针
                Draw.arrowLine(ctx, arrowX, arrowY1, arrowX, arrowY2, ctx.strokeStyle, 3);
            }

            // 标注电流方向
            const label = currentDir > 0 ? '逆时针 (楞次: 排斥)' : '顺时针 (楞次: 吸引)';
            Draw.text(ctx, label, arrowX + 15, (arrowY1 + arrowY2) / 2,
                ctx.strokeStyle, 11, 'left', 'middle');
            ctx.restore();
        }

        // ========== EMF波形图 (底部) ==========
        const waveY = H * 0.82;
        const waveH = 80;
        const waveL = W * 0.08;
        const waveR = W * 0.92;
        const waveW = waveR - waveL;
        const waveMidY = waveY + waveH / 2;

        ctx.save();
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        ctx.strokeRect(waveL, waveY, waveW, waveH);
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(waveL + 1, waveY + 1, waveW - 2, waveH - 2);

        // 零线
        ctx.strokeStyle = '#ddd';
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(waveL, waveMidY);
        ctx.lineTo(waveR, waveMidY);
        ctx.stroke();
        ctx.setLineDash([]);

        // EMF波形
        const hist = this.state.currentHistory;
        if (hist.length > 1) {
            ctx.strokeStyle = '#7c8a9e';
            ctx.lineWidth = 2;
            ctx.beginPath();
            const maxT = Math.max(hist[hist.length - 1].t, 5);
            const tWindow = 5;
            const tMin = Math.max(0, maxT - tWindow);
            for (let i = 0; i < hist.length; i++) {
                if (hist[i].t < tMin) continue;
                const px = waveL + ((hist[i].t - tMin) / tWindow) * waveW;
                const maxEMFVis = 8;
                const emfNorm = Physics.clamp(hist[i].emf / maxEMFVis, -1, 1);
                const py = waveMidY - emfNorm * (waveH / 2 - 10);
                if (i === 0 || hist[i - 1].t < tMin) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }

        Draw.text(ctx, 'ε(t) 感生电动势', waveL + waveW / 2, waveY - 8, '#666', 11, 'center', 'bottom');
        Draw.text(ctx, '0', waveL - 4, waveMidY, '#ccc', 10, 'right', 'middle');
        ctx.restore();

        // 标签
        Draw.text(ctx, '磁铁', this.state.magnetX, magY - magH / 2 - 20, '#333', 12, 'center', 'bottom');
        if (currentDir !== 0) {
            const dirText = this.state.emf > 0 ? 'ε > 0 (磁通减少)' : 'ε < 0 (磁通增加)';
            Draw.text(ctx, dirText, W / 2, H - 10, '#888', 11, 'center', 'bottom');
        }
        Draw.text(ctx, `t = ${this.state.time.toFixed(1)} s`, 12, 18, '#888', 11);
    },

    updateInfo: function() {
        const N = this.params.coilTurns.value;
        const emf = this.state.emf;
        const flux = this.state.flux;
        const dPhi = (this.state.flux - this.state.prevFlux) / 0.016; // approx per frame
        const dPhiSign = dPhi > 0.0001 ? '增加 ↑' : (dPhi < -0.0001 ? '减少 ↓' : '不变 —');
        const currentDir = emf > 0.05 ? '逆时针 ↺' : (emf < -0.05 ? '顺时针 ↻' : '无');
        const lenzDesc = emf > 0.05 ? '排斥磁铁 (抵抗磁通减少)' :
            (emf < -0.05 ? '吸引磁铁 (抵抗磁通增加)' : '—');

        this.infoEl.innerHTML = `
            <div class="info-row"><span class="label">感生电动势 ε</span><span class="value" style="color:${Math.abs(emf)>1?'#e74c3c':'#333'}">${emf.toFixed(3)} V</span></div>
            <div class="info-row"><span class="label">磁通量 Φ</span><span class="value">${flux.toFixed(4)} Wb</span></div>
            <div class="info-row"><span class="label">磁通变化</span><span class="value">${dPhiSign}</span></div>
            <div class="info-row"><span class="label">匝数 N</span><span class="value">${N}</span></div>
            <div class="info-row"><span class="label">感应电流</span><span class="value">${currentDir}</span></div>
            <div class="info-row"><span class="label">楞次效应</span><span class="value" style="font-size:11px;">${lenzDesc}</span></div>
            <div class="info-row"><span class="label">法拉第定律</span><span class="value" style="font-size:10px;">ε = -N·dΦ/dt</span></div>
            <div class="info-row"><span class="label">运行时间</span><span class="value">${this.state.time.toFixed(1)} s</span></div>
        `;
    },

    resize: function() { this.setupCanvas(); this.draw(); }
};
