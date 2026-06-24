/**
 * 实验: 驻波
 * 模拟弦上的驻波，展示不同谐振模式下的波节和波腹
 * 物理原理: y(x,t) = 2A sin(kx) cos(ωt), k = nπ/L
 */
const StandingWaveExperiment = {
    id: 'standing-wave', title: '驻波', category: 'waves',
    description: '研究弦上驻波的形成。调节频率、张力和谐振模式，观察不同谐波下波节和波腹的分布。验证驻波条件 L = nλ/2。',

    state: {
        time: 0,
        isRunning: true,
        trail: []
    },

    params: {
        harmonic: { value: 1, min: 1, max: 5, step: 1, label: '谐波数 n' },
        frequency: { value: 50, min: 10, max: 200, step: 5, label: '频率 f (Hz)' },
        tension: { value: 1, min: 0.5, max: 3, step: 0.1, label: '张力倍数' }
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
        this.state.time = 0;
        this.state.isRunning = true;
        this.state.trail = [];
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
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.03);
        this.lastTime = timestamp;

        this.state.time += dt;

        this.draw(); this.updateInfo();
        this.animId = requestAnimationFrame((t) => this.animate(t));
    },

    draw: function() {
        const ctx = this.ctx, W = this.W, H = this.H;
        Draw.clear(ctx, W, H);

        const n = this.params.harmonic.value;
        const f = this.params.frequency.value;
        const tension = this.params.tension.value;
        const omega = 2 * Math.PI * f;
        const L = W - 160; // 弦的显示长度
        const ox = 80, oy = H / 2;
        const A = Math.min(80, H * 0.2) * tension;

        // 绘制背景导轨
        ctx.save();
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(ox, oy + A + 5);
        ctx.lineTo(ox + L, oy + A + 5);
        ctx.moveTo(ox, oy - A - 5);
        ctx.lineTo(ox + L, oy - A - 5);
        ctx.stroke();
        ctx.restore();

        // 绘制固定支座
        ctx.save();
        const supportW = 12, supportH = A + 20;
        // 左支座
        const slGrad = ctx.createLinearGradient(ox - supportW, 0, ox, 0);
        slGrad.addColorStop(0, '#666');
        slGrad.addColorStop(0.5, '#999');
        slGrad.addColorStop(1, '#666');
        ctx.fillStyle = slGrad;
        ctx.fillRect(ox - supportW, oy - supportH, supportW, supportH * 2);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.strokeRect(ox - supportW, oy - supportH, supportW, supportH * 2);

        // 右支座
        const srGrad = ctx.createLinearGradient(ox + L, 0, ox + L + supportW, 0);
        srGrad.addColorStop(0, '#666');
        srGrad.addColorStop(0.5, '#999');
        srGrad.addColorStop(1, '#666');
        ctx.fillStyle = srGrad;
        ctx.fillRect(ox + L, oy - supportH, supportW, supportH * 2);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.strokeRect(ox + L, oy - supportH, supportW, supportH * 2);
        ctx.restore();

        // 标注支座
        Draw.text(ctx, '固定端', ox - 6, oy + supportH + 8, '#888', 11, 'center', 'top');
        Draw.text(ctx, '固定端', ox + L + 6, oy + supportH + 8, '#888', 11, 'center', 'top');

        // 绘制多帧波形叠加
        const numGhosts = 15;
        for (let g = 0; g < numGhosts; g++) {
            const tGhost = g * (Math.PI * 2 / omega) / numGhosts;
            const alpha = 0.05 + 0.1 * (g / numGhosts);
            ctx.save();
            ctx.strokeStyle = `rgba(124, 138, 158, ${alpha.toFixed(2)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let x = 0; x <= L; x += 2) {
                const xNorm = x / L;
                const k = n * Math.PI;
                const y = 2 * A * Math.sin(k * xNorm) * Math.cos(omega * tGhost);
                const sx = ox + x;
                const sy = oy - y;
                if (x === 0) ctx.moveTo(sx, sy);
                else ctx.lineTo(sx, sy);
            }
            ctx.stroke();
            ctx.restore();
        }

        // 绘制当前波形
        const currentT = this.state.time;
        ctx.save();
        ctx.strokeStyle = '#7c8a9e';
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(124, 138, 158, 0.3)';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        let currentPoints = [];
        for (let x = 0; x <= L; x += 1) {
            const xNorm = x / L;
            const k = n * Math.PI;
            const y = Physics.standingWave(xNorm, currentT, A * 0.5, k, omega);
            const sx = ox + x;
            const sy = oy - y;
            currentPoints.push({ sx, sy, xNorm });
            if (x === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
        ctx.restore();

        // 绘制节点标记
        ctx.save();
        for (let i = 0; i <= n; i++) {
            const nodeX = ox + (i / n) * L;
            // 节点（不动点）- 红色菱形
            ctx.fillStyle = '#e74c3c';
            ctx.strokeStyle = '#c0392b';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(nodeX, oy - 8);
            ctx.lineTo(nodeX + 5, oy);
            ctx.lineTo(nodeX, oy + 8);
            ctx.lineTo(nodeX - 5, oy);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // 判断是节点还是端点
            if (i === 0) {
                Draw.text(ctx, 'N', nodeX - 12, oy - 14, '#e74c3c', 11, 'center');
            } else if (i === n) {
                Draw.text(ctx, 'N', nodeX + 12, oy - 14, '#e74c3c', 11, 'center');
            } else {
                Draw.text(ctx, 'N', nodeX, oy - 14, '#e74c3c', 11, 'center');
            }
        }
        ctx.restore();

        // 绘制波腹标记
        ctx.save();
        for (let i = 0; i < n; i++) {
            const antinodeX = ox + ((i + 0.5) / n) * L;
            // 波腹（最大振幅点）- 蓝色圆
            ctx.fillStyle = '#3498db';
            ctx.strokeStyle = '#2980b9';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(antinodeX, oy, 5, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
            Draw.text(ctx, 'A', antinodeX, oy + 16, '#3498db', 11, 'center');
        }
        ctx.restore();

        // 绘制节点到节点的半波长标注
        if (n >= 1) {
            const halfLambdaX1 = ox;
            const halfLambdaX2 = ox + L / n;
            const midX = (halfLambdaX1 + halfLambdaX2) / 2;

            ctx.save();
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            // 上方括号标注
            const braceY = oy - A - 20;
            ctx.beginPath();
            ctx.moveTo(halfLambdaX1, braceY);
            ctx.lineTo(halfLambdaX1, braceY - 10);
            ctx.lineTo(halfLambdaX2, braceY - 10);
            ctx.lineTo(halfLambdaX2, braceY);
            ctx.stroke();
            ctx.setLineDash([]);
            Draw.text(ctx, 'λ/2', midX, braceY - 18, '#f59e0b', 12, 'center', 'bottom');
            ctx.restore();
        }

        // 底部信息
        const lambda = 2 * L / n;
        const waveSpeed = lambda * f;
        const k = n * Math.PI / L * L / (W - 160); // normalized
        Draw.text(ctx, `驻波模式 n = ${n} | λ = ${(lambda).toFixed(0)} 像素 | f = ${f} Hz | 波速 = ${(waveSpeed).toFixed(0)} px/s`,
            W / 2, H - 20, '#888', 12, 'center', 'bottom');
        Draw.text(ctx, `t = ${this.state.time.toFixed(2)} s`, 12, 16, '#aaa', 11);

        // 右上角图例
        const lx = W - 160, ly = 10;
        ctx.save();
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath(); ctx.moveTo(lx + 22, ly + 8); ctx.lineTo(lx + 27, ly + 13);
        ctx.lineTo(lx + 22, ly + 18); ctx.lineTo(lx + 17, ly + 13); ctx.closePath();
        ctx.fill();
        Draw.text(ctx, '波节 (Node)', lx + 35, ly + 12, '#888', 11);

        ctx.fillStyle = '#3498db';
        ctx.beginPath(); ctx.arc(lx + 22, ly + 32, 4, 0, 2 * Math.PI); ctx.fill();
        Draw.text(ctx, '波腹 (Antinode)', lx + 35, ly + 32, '#888', 11);
        ctx.restore();
    },

    updateInfo: function() {
        const n = this.params.harmonic.value;
        const f = this.params.frequency.value;
        const L = this.W - 160; // 像素长度

        // 理论计算
        const lambda = 2 * L / n;
        const waveSpeed = lambda * f;
        const period = 1 / f;
        const omega = 2 * Math.PI * f;
        const nodeCount = n + 1;
        const antinodeCount = n;

        this.infoEl.innerHTML = `
            <div class="info-row"><span class="label">谐波数 n</span><span class="value">${n}</span></div>
            <div class="info-row"><span class="label">波长 λ</span><span class="value">${lambda.toFixed(0)} </span></div>
            <div class="info-row"><span class="label">频率 f</span><span class="value">${f} Hz</span></div>
            <div class="info-row"><span class="label">周期 T</span><span class="value">${period.toFixed(3)} s</span></div>
            <div class="info-row"><span class="label">波速 v</span><span class="value">${waveSpeed.toFixed(0)} </span></div>
            <div class="info-row"><span class="label">波节数</span><span class="value">${nodeCount}</span></div>
            <div class="info-row"><span class="label">波腹数</span><span class="value">${antinodeCount}</span></div>
            <div class="info-row"><span class="label">弦条件</span><span class="value">L = ${n}·λ/2</span></div>
        `;
    },

    resize: function() { this.setupCanvas(); this.draw(); }
};
