/**
 * 实验: 多普勒效应
 * 模拟声源和观察者相对运动时的多普勒效应，展示波前压缩/拉伸
 * 物理原理: f' = f · (v ± v_o) / (v ∓ v_s)
 */
const DopplerExperiment = {
    id: 'doppler', title: '多普勒效应', category: 'waves',
    description: '研究多普勒效应。调节声源和观察者的速度，观察波前压缩和拉伸。验证多普勒频移公式 f\' = f · (v ± v_o) / (v ∓ v_s)。',

    state: {
        sourceX: 0,
        observerX: 0,
        wavefronts: [],
        time: 0,
        isRunning: true
    },

    params: {
        sourceSpeed: { value: 50, min: 0, max: 300, step: 5, label: '声源速度 v_s (m/s)' },
        observerSpeed: { value: 0, min: -200, max: 200, step: 5, label: '观察者速度 v_o (m/s)' },
        frequency: { value: 400, min: 100, max: 2000, step: 10, label: '声源频率 f₀ (Hz)' }
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
        this.state.sourceX = this.W * 0.25;
        this.state.observerX = this.W * 0.7;
        this.state.wavefronts = [];
        this.state.time = 0;
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
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.04);
        this.lastTime = timestamp;

        this.state.time += dt;

        const vs = this.params.sourceSpeed.value;
        const vo = this.params.observerSpeed.value;
        const f0 = this.params.frequency.value;

        // 声速 (像素/s 归一化)
        const vSound = 340; // m/s
        const scale = 1.5; // 像素/m

        // 更新声源位置
        this.state.sourceX += vs * dt * scale;
        // 循环声源位置
        if (this.state.sourceX > this.W - 50) {
            this.state.sourceX = 60;
            this.state.wavefronts = [];
        }
        if (this.state.sourceX < 50) {
            this.state.sourceX = this.W - 60;
            this.state.wavefronts = [];
        }

        // 更新观察者位置
        this.state.observerX += vo * dt * scale;
        if (this.state.observerX > this.W - 60) this.state.observerX = this.W - 60;
        if (this.state.observerX < 60) this.state.observerX = 60;

        // 发射新波前
        const period = 1 / f0;
        const emitInterval = period;
        if (this.state.time > (this.state.wavefronts.length + 1) * emitInterval) {
            this.state.wavefronts.push({
                x: this.state.sourceX,
                y: this.H * 0.55,
                radius: 0,
                color: 'rgba(124, 138, 158, 0.6)'
            });
        }

        // 更新波前
        for (let i = this.state.wavefronts.length - 1; i >= 0; i--) {
            this.state.wavefronts[i].radius += vSound * dt * scale;
            const alpha = 1 - this.state.wavefronts[i].radius / (this.W * 1.5);
            if (alpha <= 0) {
                this.state.wavefronts.splice(i, 1);
            } else {
                this.state.wavefronts[i].color = `rgba(124, 138, 158, ${alpha * 0.5})`;
            }
        }

        // 限制波前数量
        if (this.state.wavefronts.length > 80) {
            this.state.wavefronts.splice(0, this.state.wavefronts.length - 80);
        }

        this.draw(); this.updateInfo();
        this.animId = requestAnimationFrame((t) => this.animate(t));
    },

    draw: function() {
        const ctx = this.ctx, W = this.W, H = this.H;
        Draw.clear(ctx, W, H);

        const sourceY = H * 0.55;

        // 绘制参考线（地面）
        ctx.save();
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, sourceY);
        ctx.lineTo(W, sourceY);
        ctx.stroke();
        ctx.restore();

        // 绘制波前
        for (const wf of this.state.wavefronts) {
            ctx.save();
            ctx.strokeStyle = wf.color;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(wf.x, wf.y, wf.radius, 0, 2 * Math.PI);
            ctx.stroke();
            ctx.restore();
        }

        // 绘制声源
        const sx = this.state.sourceX, sy = sourceY;
        ctx.save();
        // 喇叭主体
        const spGrad = ctx.createRadialGradient(sx - 2, sy - 2, 1, sx, sy, 16);
        spGrad.addColorStop(0, '#e74c3c');
        spGrad.addColorStop(0.7, '#c0392b');
        spGrad.addColorStop(1, '#a93226');
        ctx.fillStyle = spGrad;
        ctx.beginPath(); ctx.arc(sx, sy, 16, 0, 2 * Math.PI); ctx.fill();
        ctx.strokeStyle = '#922b21';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 喇叭符号
        ctx.fillStyle = '#fff';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('♪', sx, sy);

        // 声源标签
        ctx.fillStyle = '#e74c3c';
        ctx.font = '12px sans-serif';
        ctx.fillText('声源', sx, sy - 24);
        ctx.restore();

        // 速度矢量（声源）
        const vs = this.params.sourceSpeed.value;
        if (Math.abs(vs) > 1) {
            const arrowLen = 30;
            const dir = vs > 0 ? 1 : -1;
            const ax = sx + dir * 20;
            const ay = sy - 24;
            Draw.arrowLine(ctx, ax, ay, ax + dir * arrowLen, ay, '#e74c3c', 2);
            Draw.text(ctx, `v_s = ${vs} m/s`, ax + dir * 10, ay - 12, '#e74c3c', 11, 'center', 'bottom');
        }

        // 绘制观察者
        const ox = this.state.observerX, oy = sourceY;
        ctx.save();
        // 人形图标
        const obGrad = ctx.createRadialGradient(ox - 2, oy - 2, 1, ox, oy, 14);
        obGrad.addColorStop(0, '#3498db');
        obGrad.addColorStop(0.7, '#2980b9');
        obGrad.addColorStop(1, '#2471a3');
        ctx.fillStyle = obGrad;
        ctx.beginPath(); ctx.arc(ox, oy, 14, 0, 2 * Math.PI); ctx.fill();
        ctx.strokeStyle = '#1a5276';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 耳朵图标
        ctx.fillStyle = '#fff';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('👂', ox, oy);

        // 观察者标签
        ctx.fillStyle = '#3498db';
        ctx.font = '12px sans-serif';
        ctx.fillText('观察者', ox, oy - 22);
        ctx.restore();

        // 速度矢量（观察者）
        const vo = this.params.observerSpeed.value;
        if (Math.abs(vo) > 1) {
            const arrowLen = 30;
            const dir = vo > 0 ? 1 : -1;
            const ax = ox + dir * 18;
            const ay = oy - 22;
            Draw.arrowLine(ctx, ax, ay, ax + dir * arrowLen, ay, '#3498db', 2);
            Draw.text(ctx, `v_o = ${vo} m/s`, ax + dir * 10, ay - 12, '#3498db', 11, 'center', 'bottom');
        }

        // 底部解释：波前压缩/拉伸图示
        const infoY = H - 80;
        const infoW = W;
        const infoX = 20;

        // 声源前方的波前（压缩）
        const frontWaves = [];
        const rearWaves = [];

        for (const wf of this.state.wavefronts) {
            const dx = wf.x - sx;
            if (vs > 0) {
                if (dx > 0) frontWaves.push(wf);
                else if (dx < 0) rearWaves.push(wf);
            } else if (vs < 0) {
                if (dx < 0) frontWaves.push(wf);
                else if (dx > 0) rearWaves.push(wf);
            } else {
                frontWaves.push(wf);
            }
        }

        // 指示文字
        if (Math.abs(vs) > 5) {
            const frontLabelX = sx + (vs > 0 ? 1 : -1) * 60;
            Draw.text(ctx, '波前压缩', frontLabelX, sourceY - 50, '#e74c3c', 12, 'center');
            Draw.text(ctx, '高频 →', frontLabelX, sourceY - 38, '#e74c3c', 11, 'center');

            const rearLabelX = sx - (vs > 0 ? 1 : -1) * 60;
            Draw.text(ctx, '波前拉伸', rearLabelX, sourceY - 50, '#2980b9', 12, 'center');
            Draw.text(ctx, '低频 →', rearLabelX, sourceY - 38, '#2980b9', 11, 'center');
        }

        // 计算和显示频率
        const f0 = this.params.frequency.value;
        const vSound = 340;
        const vsVal = this.params.sourceSpeed.value;
        const voVal = this.params.observerSpeed.value;

        // 多普勒频率
        let fObserved;
        if (Math.abs(voVal) < 0.1 && Math.abs(vsVal) < 0.1) {
            fObserved = f0;
        } else {
            fObserved = Physics.dopplerEffect(f0, vSound, voVal, vsVal, true, true);
        }

        const shift = fObserved - f0;

        // 底部信息面板
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        const panelW = 380, panelH = 56;
        const panelX = W / 2 - panelW / 2, panelY = H - 70;
        ctx.fillRect(panelX, panelY, panelW, panelH);
        ctx.strokeRect(panelX, panelY, panelW, panelH);
        ctx.restore();

        const freqColor = shift > 0 ? '#e74c3c' : (shift < 0 ? '#3498db' : '#333');
        const shiftSymbol = shift >= 0 ? '+' : '';
        Draw.text(ctx, `f₀ = ${f0} Hz`, panelX + 20, panelY + 12, '#666', 13, 'left', 'middle');
        Draw.text(ctx, `f' = ${fObserved.toFixed(1)} Hz`, panelX + panelW / 2 - 20, panelY + 12, freqColor, 16, 'left', 'middle');
        Draw.text(ctx, `频移: Δf = ${shiftSymbol}${shift.toFixed(1)} Hz`, panelX + panelW - 20, panelY + 12, freqColor, 13, 'right', 'middle');

        const waveDir = vsVal > 0 ? '声源靠近 →' : (vsVal < 0 ? '← 声源远离' : '声源静止');
        Draw.text(ctx, waveDir, panelX + 20, panelY + 38, '#888', 11, 'left', 'middle');
        const obsDir = voVal > 0 ? '观察者靠近声源' : (voVal < 0 ? '观察者远离声源' : '观察者静止');
        Draw.text(ctx, obsDir, panelX + panelW - 20, panelY + 38, '#888', 11, 'right', 'middle');

        Draw.text(ctx, `v_声 = ${vSound} m/s | t = ${this.state.time.toFixed(1)} s`, W / 2, panelY - 10, '#aaa', 11, 'center', 'bottom');

        // 声速比例尺
        Draw.text(ctx, `声速: v = ${vSound} m/s`, 12, 16, '#aaa', 11);
    },

    updateInfo: function() {
        const f0 = this.params.frequency.value;
        const vSound = 340;
        const vs = this.params.sourceSpeed.value;
        const vo = this.params.observerSpeed.value;

        let fObserved;
        if (Math.abs(vo) < 0.1 && Math.abs(vs) < 0.1) {
            fObserved = f0;
        } else {
            fObserved = Physics.dopplerEffect(f0, vSound, Math.abs(vo), Math.abs(vs), true, true);
        }

        const deltaF = fObserved - f0;
        const deltaPct = (deltaF / f0 * 100).toFixed(1);
        const lambda0 = vSound / f0;
        const lambdaObserved = vSound / fObserved;

        const shiftSymbol = deltaF >= 0 ? '+' : '';

        this.infoEl.innerHTML = `
            <div class="info-row"><span class="label">声源频率 f₀</span><span class="value">${f0} Hz</span></div>
            <div class="info-row"><span class="label">接收频率 f'</span><span class="value">${fObserved.toFixed(1)} Hz</span></div>
            <div class="info-row"><span class="label">频率偏移 Δf</span><span class="value">${shiftSymbol}${deltaF.toFixed(1)} Hz (${shiftSymbol}${deltaPct}%)</span></div>
            <div class="info-row"><span class="label">原波长 λ₀</span><span class="value">${lambda0.toFixed(2)} m</span></div>
            <div class="info-row"><span class="label">观测波长 λ'</span><span class="value">${lambdaObserved.toFixed(2)} m</span></div>
            <div class="info-row"><span class="label">声源速度 v_s</span><span class="value">${vs} m/s</span></div>
            <div class="info-row"><span class="label">观察者速度 v_o</span><span class="value">${vo} m/s</span></div>
            <div class="info-row"><span class="label">声速 v</span><span class="value">${vSound} m/s</span></div>
        `;
    },

    resize: function() { this.setupCanvas(); this.draw(); }
};
