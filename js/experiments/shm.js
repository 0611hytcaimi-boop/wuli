/**
 * 实验: 简谐运动 (Simple Harmonic Motion)
 * 模拟弹簧-质量系统的简谐运动，同时显示 x-t、v-t、a-t 三张图的相位关系
 * 物理原理: x=Acos(ωt+φ), v=-Aωsin(ωt+φ), a=-Aω²cos(ωt+φ)=-ω²x
 */
const SHMExperiment = {
    id: 'shm', title: '简谐运动', category: 'mechanics',
    description: '深入研究简谐运动的位移、速度、加速度三者之间的相位关系。同时显示x-t、v-t、a-t三个图像，直观呈现x领先v相位π/2，v领先a相位π/2的规律。',

    state: {
        x: 0,            // 位移 (m)
        v: 0,            // 速度 (m/s)
        t: 0,            // 时间 (s)
        xHistory: [],    // x-t 数据
        vHistory: [],    // v-t 数据
        aHistory: [],    // a-t 数据
        isRunning: true,
        equilibriumY: 0
    },

    params: {
        amplitude: { value: 0.5, min: 0.1, max: 2.0, step: 0.05, label: '振幅 A (m)' },
        mass: { value: 1.0, min: 0.1, max: 5.0, step: 0.1, label: '质量 m (kg)' },
        stiffness: { value: 10, min: 1, max: 50, step: 1, label: '劲度系数 k (N/m)' },
        damping: { value: 0, min: 0, max: 2.0, step: 0.05, label: '阻尼系数 b' }
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

    reset: function() {
        const A = this.params.amplitude.value;
        this.state.x = A;
        this.state.v = 0;
        this.state.t = 0;
        this.state.xHistory = [];
        this.state.vHistory = [];
        this.state.aHistory = [];
        this.state.equilibriumY = this.H * 0.45;
        this.state.isRunning = true;
        this.lastTime = null;
        document.getElementById('btn-pause').textContent = '暂停';
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
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.02);
        this.lastTime = timestamp;

        const m = this.params.mass.value;
        const k = this.params.stiffness.value;
        const damp = this.params.damping.value;

        const result = Physics.springMotion(this.state.x, this.state.v, k, m, dt, damp);
        this.state.x = result.x;
        this.state.v = result.v;
        this.state.t += dt;

        // Acceleration from springMotion: a = -(k/m)x - damping*v
        const a = -(k / m) * this.state.x - damp * this.state.v;

        // Record history (limit buffer size)
        this.state.xHistory.push({ t: this.state.t, val: this.state.x });
        this.state.vHistory.push({ t: this.state.t, val: this.state.v });
        this.state.aHistory.push({ t: this.state.t, val: a });

        const maxLen = 500;
        if (this.state.xHistory.length > maxLen) this.state.xHistory.shift();
        if (this.state.vHistory.length > maxLen) this.state.vHistory.shift();
        if (this.state.aHistory.length > maxLen) this.state.aHistory.shift();

        this.draw(); this.updateInfo();
        this.animId = requestAnimationFrame((t) => this.animate(t));
    },

    draw: function() {
        const ctx = this.ctx, W = this.W, H = this.H;
        Draw.clear(ctx, W, H);

        const m = this.params.mass.value;
        const k = this.params.stiffness.value;
        const damp = this.params.damping.value;
        const A = this.params.amplitude.value;
        const omega = Math.sqrt(k / m);

        // ---- LEFT SECTION: Spring + Mass Animation ----
        const animCenterX = W * 0.22;
        const animTopY = H * 0.10;
        const eqY = this.state.equilibriumY;
        const scale = Math.min(H * 0.30 / Math.max(A, 0.01), 120);
        const displacement = this.state.x * scale;

        // Ceiling fixture
        const ceilW = 60, ceilH = 8;
        ctx.save();
        ctx.fillStyle = '#666';
        ctx.fillRect(animCenterX - ceilW / 2, animTopY, ceilW, ceilH);
        ctx.fillStyle = '#555';
        ctx.fillRect(animCenterX - ceilW / 2 - 10, animTopY - 4, ceilW + 20, ceilH + 4);
        // Hatching on ceiling
        ctx.strokeStyle = '#777'; ctx.lineWidth = 0.5;
        for (let i = -2; i <= 2; i++) {
            ctx.beginPath();
            ctx.moveTo(animCenterX - ceilW / 2, animTopY + ceilH - 1);
            ctx.lineTo(animCenterX - ceilW / 2 + ceilW, animTopY + i * 2);
            ctx.stroke();
        }
        ctx.restore();

        // Spring
        const springTop = animTopY + ceilH + 4;
        const springBottom = eqY + displacement - 16;
        const springLen = springBottom - springTop;
        const coils = 14;
        const coilAmp = Math.min(14, springLen / coils * 0.7);

        ctx.save();
        ctx.strokeStyle = '#666'; ctx.lineWidth = 2.5;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(animCenterX, springTop);
        for (let i = 0; i <= coils; i++) {
            const t = i / coils;
            const sy = springTop + t * springLen;
            const sx = animCenterX + (i % 2 === 0 ? coilAmp : -coilAmp);
            ctx.lineTo(sx, sy);
        }
        ctx.stroke();
        ctx.restore();

        // Equilibrium dashed line
        ctx.save();
        ctx.strokeStyle = 'rgba(150,150,150,0.5)'; ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(animCenterX - 55, eqY);
        ctx.lineTo(animCenterX + 55, eqY);
        ctx.stroke();
        ctx.setLineDash([]);
        Draw.text(ctx, '平衡位置', animCenterX + 58, eqY, '#999', 10, 'left', 'middle');
        ctx.restore();

        // Mass block
        const boxW = 52, boxH = 34;
        const bx = animCenterX - boxW / 2, by = springBottom;

        ctx.save();
        // Shadow
        ctx.shadowColor = 'rgba(0,0,0,0.2)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 3;
        const blockGrad = ctx.createLinearGradient(bx, by, bx + boxW, by + boxH);
        blockGrad.addColorStop(0, '#7c6ef7');
        blockGrad.addColorStop(0.5, '#5b4de0');
        blockGrad.addColorStop(1, '#3d2fc4');
        ctx.fillStyle = blockGrad;
        ctx.fillRect(bx, by, boxW, boxH);
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        // Border
        ctx.strokeStyle = '#3d2fc4'; ctx.lineWidth = 1.5;
        ctx.strokeRect(bx, by, boxW, boxH);
        // Mass label
        ctx.fillStyle = '#fff'; ctx.font = 'bold 12px -apple-system, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(`${m} kg`, animCenterX, by + boxH / 2);
        ctx.restore();

        // Displacement arrow
        if (Math.abs(this.state.x) > 0.005) {
            const arrowX = animCenterX + 40;
            const xDir = this.state.x > 0 ? 1 : -1;
            Draw.arrowLine(ctx, arrowX, eqY, arrowX, eqY + displacement, '#7c6ef7', 2);
            Draw.text(ctx, `x=${this.state.x.toFixed(3)}m`, arrowX + 8, eqY + displacement / 2, '#7c6ef7', 11, 'left', 'middle');
        }

        // Amplitude markers
        if (damp < 0.01) {
            ctx.save();
            ctx.strokeStyle = 'rgba(124,110,247,0.3)'; ctx.lineWidth = 1;
            ctx.setLineDash([3, 4]);
            ctx.beginPath();
            ctx.moveTo(animCenterX - 60, eqY - A * scale);
            ctx.lineTo(animCenterX + 60, eqY - A * scale);
            ctx.moveTo(animCenterX - 60, eqY + A * scale);
            ctx.lineTo(animCenterX + 60, eqY + A * scale);
            ctx.stroke();
            ctx.setLineDash([]);
            Draw.text(ctx, '+A', animCenterX - 62, eqY - A * scale, 'rgba(124,110,247,0.6)', 10, 'right', 'middle');
            Draw.text(ctx, '-A', animCenterX - 62, eqY + A * scale, 'rgba(124,110,247,0.6)', 10, 'right', 'middle');
            ctx.restore();
        }

        // ---- RIGHT SECTION: Graphs ----
        const graphL = W * 0.38;
        const graphR = W - 16;
        const graphW = graphR - graphL;
        const graphTop = H * 0.06;
        const graphBottom = H * 0.94;
        const totalGraphH = graphBottom - graphTop;
        const graphH = totalGraphH / 3;
        const graphGap = 6;

        const maxT = Math.max(this.state.t, 2);
        const historyLen = Math.max(this.state.xHistory.length, this.state.vHistory.length, this.state.aHistory.length);

        const drawGraph = (baseY, h, history, color, label, unit, yLabelMax) => {
            const gY = baseY;
            const gH = h - graphGap;

            ctx.save();
            // Background
            ctx.fillStyle = '#fafafa';
            ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
            ctx.fillRect(graphL, gY, graphW, gH);
            ctx.strokeRect(graphL, gY, graphW, gH);

            // Title
            Draw.text(ctx, label, graphL + 8, gY + 4, color, 11, 'left', 'top');

            // Zero line
            const zeroY = gY + gH / 2;
            ctx.strokeStyle = '#e0e0e0'; ctx.lineWidth = 0.8;
            ctx.setLineDash([2, 3]);
            ctx.beginPath(); ctx.moveTo(graphL, zeroY); ctx.lineTo(graphR, zeroY); ctx.stroke();
            ctx.setLineDash([]);

            // Y axis markers
            ctx.fillStyle = '#bbb'; ctx.font = '9px -apple-system, sans-serif';
            ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
            ctx.fillText(`+${yLabelMax}`, graphL - 4, gY + 10);
            ctx.fillText('0', graphL - 4, zeroY);
            ctx.fillText(`-${yLabelMax}`, graphL - 4, gY + gH - 10);

            // Time axis labels
            ctx.fillStyle = '#bbb'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
            for (let tMark = 0; tMark <= maxT; tMark += Math.ceil(maxT / 5)) {
                const tx = graphL + (tMark / maxT) * graphW;
                ctx.fillText(`${tMark.toFixed(1)}s`, tx, gY + gH - 14);
            }

            // Plot data
            if (history && history.length > 1) {
                const absMax = Math.max(yLabelMax, ...history.map(p => Math.abs(p.val)), 0.001);
                const plotMax = absMax * 1.1;

                ctx.strokeStyle = color; ctx.lineWidth = 2;
                ctx.beginPath();
                for (let i = 0; i < history.length; i++) {
                    const px = graphL + (history[i].t / maxT) * graphW;
                    const py = zeroY - (history[i].val / plotMax) * (gH / 2 * 0.85);
                    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                }
                ctx.stroke();
            }

            ctx.restore();
        };

        // Get max values for each graph
        const xMax = Math.max(A, ...this.state.xHistory.map(p => Math.abs(p.val)), 0.01);
        const vMax = Math.max(A * omega, ...this.state.vHistory.map(p => Math.abs(p.val)), 0.01);
        const aMax = Math.max(A * omega * omega, ...this.state.aHistory.map(p => Math.abs(p.val)), 0.01);

        // Draw the three graphs
        const g1Y = graphTop;
        const g2Y = graphTop + graphH;
        const g3Y = graphTop + 2 * graphH;

        drawGraph(g1Y, graphH, this.state.xHistory, '#7c8a9e', '位移 x-t', 'm', xMax.toFixed(2));
        drawGraph(g2Y, graphH, this.state.vHistory, '#e74c3c', '速度 v-t', 'm/s', vMax.toFixed(2));
        drawGraph(g3Y, graphH, this.state.aHistory, '#2ecc71', '加速度 a-t', 'm/s²', aMax.toFixed(2));

        // Phase indicator lines (vertical dashed line at current time)
        if (historyLen > 1) {
            const phaseLineX = graphL + (this.state.t / maxT) * graphW;
            if (phaseLineX >= graphL && phaseLineX <= graphR) {
                ctx.save();
                ctx.strokeStyle = 'rgba(0,0,0,0.25)';
                ctx.lineWidth = 1;
                ctx.setLineDash([4, 5]);
                ctx.beginPath();
                ctx.moveTo(phaseLineX, graphTop);
                ctx.lineTo(phaseLineX, graphBottom);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();

                // Current values at the phase line
                const x0Y = g1Y + graphH / 2 - (this.state.x / Math.max(xMax * 1.1, 0.001)) * ((graphH - graphGap) / 2 * 0.85);
                const v0Y = g2Y + graphH / 2 - (this.state.v / Math.max(vMax * 1.1, 0.001)) * ((graphH - graphGap) / 2 * 0.85);
                const a = -(k / m) * this.state.x - damp * this.state.v;
                const a0Y = g3Y + graphH / 2 - (a / Math.max(aMax * 1.1, 0.001)) * ((graphH - graphGap) / 2 * 0.85);

                ctx.save();
                ctx.fillStyle = '#7c8a9e';
                ctx.beginPath(); ctx.arc(phaseLineX, x0Y, 3.5, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#e74c3c';
                ctx.beginPath(); ctx.arc(phaseLineX, v0Y, 3.5, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = '#2ecc71';
                ctx.beginPath(); ctx.arc(phaseLineX, a0Y, 3.5, 0, Math.PI * 2); ctx.fill();
                ctx.restore();
            }
        }

        // Phase relationship legend
        const legendX = graphL + graphW - 130;
        const legendY = graphTop + 4;
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.strokeStyle = '#ddd'; ctx.lineWidth = 0.5;
        ctx.fillRect(legendX, legendY, 126, 52);
        ctx.strokeRect(legendX, legendY, 126, 52);
        ctx.font = '9px -apple-system, sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillStyle = '#7c8a9e'; ctx.fillText('● x = Acos(ωt)', legendX + 6, legendY + 5);
        ctx.fillStyle = '#e74c3c'; ctx.fillText('● v =-Aωsin(ωt)', legendX + 6, legendY + 19);
        ctx.fillStyle = '#2ecc71'; ctx.fillText('● a =-Aω²cos(ωt)', legendX + 6, legendY + 33);
        ctx.restore();

        // Bottom status bar
        Draw.text(ctx, `t = ${this.state.t.toFixed(2)}s  ·  ω = ${omega.toFixed(2)} rad/s  ·  T = ${(2*Math.PI/omega).toFixed(3)}s`,
            graphL + graphW / 2, H - 8, '#888', 11, 'center', 'bottom');
    },

    updateInfo: function() {
        const m = this.params.mass.value;
        const k = this.params.stiffness.value;
        const damp = this.params.damping.value;
        const A = this.params.amplitude.value;
        const x = this.state.x;
        const v = this.state.v;
        const a = -(k / m) * x - damp * v;

        const omega = Math.sqrt(k / m);
        const T = 2 * Math.PI / omega;
        const f = 1 / T;
        const Ek = 0.5 * m * v * v;
        const Ep = 0.5 * k * x * x;
        const E = Ek + Ep;

        // Phase info
        const phaseOmega = Math.atan2(-v / omega, x);
        const phaseDeg = Physics.toDeg(phaseOmega);

        this.infoEl.innerHTML = `
            <div class="info-row"><span class="label">周期 T</span><span class="value">${T.toFixed(3)} s</span></div>
            <div class="info-row"><span class="label">频率 f</span><span class="value">${f.toFixed(3)} Hz</span></div>
            <div class="info-row"><span class="label">角频率 ω</span><span class="value">${omega.toFixed(3)} rad/s</span></div>
            <div class="info-row"><span class="label" style="color:#7c8a9e;">位移 x</span><span class="value" style="color:#7c8a9e;">${x.toFixed(4)} m</span></div>
            <div class="info-row"><span class="label" style="color:#e74c3c;">速度 v</span><span class="value" style="color:#e74c3c;">${v.toFixed(4)} m/s</span></div>
            <div class="info-row"><span class="label" style="color:#2ecc71;">加速度 a</span><span class="value" style="color:#2ecc71;">${a.toFixed(4)} m/s²</span></div>
            <div class="info-row"><span class="label">相位 φ</span><span class="value">${phaseDeg.toFixed(1)}° (${phaseOmega.toFixed(3)} rad)</span></div>
            <div class="info-row"><span class="label">动能 Ek</span><span class="value">${Ek.toFixed(4)} J</span></div>
            <div class="info-row"><span class="label">势能 Ep</span><span class="value">${Ep.toFixed(4)} J</span></div>
            <div class="info-row"><span class="label">总能量 E</span><span class="value">${E.toFixed(4)} J</span></div>
            <div class="info-row"><span class="label">振幅 A</span><span class="value">${A} m</span></div>
            <div class="info-row"><span class="label">阻尼系数</span><span class="value">${damp}</span></div>
            <div class="info-row"><span class="label">相位关系</span><span class="value">x领先v 90°; v领先a 90°</span></div>
        `;
    },

    resize: function() { this.setupCanvas(); this.draw(); }
};
