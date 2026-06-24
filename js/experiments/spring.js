/**
 * 实验3: 弹簧振子
 * 模拟弹簧-质量系统的简谐运动，支持调节质量、劲度系数和阻尼
 * 物理原理: m·d²x/dt² = -kx - b·dx/dt，简谐运动 x(t) = Acos(ωt+φ)
 */
const SpringExperiment = {
    id: 'spring', title: '弹簧振子', category: 'mechanics',
    description: '研究弹簧-质量系统的简谐振动，可调节质量、弹簧劲度系数和阻尼系数。验证周期公式 T = 2π√(m/k)。',

    state: { x: 0, v: 0, t: 0, trail: [], isRunning: true, equilibriumY: 0 },

    params: {
        mass: { value: 1.0, min: 0.2, max: 5.0, step: 0.1, label: '质量 m (kg)' },
        stiffness: { value: 10, min: 2, max: 30, step: 1, label: '劲度系数 k (N/m)' },
        amplitude: { value: 80, min: 20, max: 150, step: 5, label: '初始振幅' },
        damping: { value: 0, min: 0, max: 2.0, step: 0.05, label: '阻尼系数' }
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
        const m = this.params.mass.value;
        const k = this.params.stiffness.value;
        const omega = Math.sqrt(k / m);
        this.state.x = this.params.amplitude.value;
        this.state.v = 0;
        this.state.t = 0;
        this.state.trail = [];
        this.state.equilibriumY = this.H * 0.4;
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
        this.state.x = result.x; this.state.v = result.v;
        this.state.t += dt;

        // 记录x-t轨迹
        this.state.trail.push({ t: this.state.t, x: this.state.x });
        if (this.state.trail.length > 300) this.state.trail.shift();

        this.draw(); this.updateInfo();
        this.animId = requestAnimationFrame((t) => this.animate(t));
    },

    draw: function() {
        const ctx = this.ctx, W = this.W, H = this.H;
        Draw.clear(ctx, W, H);

        const cx = W * 0.35;
        const topY = 40;
        const eqY = this.state.equilibriumY;
        const scale = 1;
        const displacement = this.state.x * scale;

        // 天花板
        ctx.save();
        ctx.fillStyle = '#888';
        ctx.fillRect(cx - 40, topY - 5, 80, 10);
        ctx.fillStyle = '#aaa';
        ctx.fillRect(cx - 60, topY - 3, 120, 6);
        ctx.restore();

        // 弹簧（用锯齿线表示）
        const springCoils = 12;
        const springTop = topY + 10;
        const springBottom = eqY + displacement - 10;
        const springLen = springBottom - springTop;
        ctx.save();
        ctx.strokeStyle = '#555'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx, springTop);
        for (let i = 0; i <= springCoils; i++) {
            const t = i / springCoils;
            const sy = springTop + t * springLen;
            const sx = cx + (i % 2 === 0 ? 15 : -15) * Math.min(1, springLen / 80);
            ctx.lineTo(sx, sy);
        }
        ctx.stroke(); ctx.restore();

        // 质量块
        const boxW = 50, boxH = 30;
        const bx = cx - boxW / 2, by = springBottom;
        const gradient = ctx.createLinearGradient(bx, by, bx + boxW, by + boxH);
        gradient.addColorStop(0, '#7c8a9e'); gradient.addColorStop(1, '#6b7a8e');
        ctx.save();
        ctx.fillStyle = gradient;
        ctx.shadowColor = 'rgba(0,0,0,0.15)'; ctx.shadowBlur = 8;
        ctx.fillRect(bx, by, boxW, boxH);
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#5a6a7e'; ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, boxW, boxH);
        ctx.restore();
        Draw.text(ctx, `${this.params.mass.value}kg`, cx, by + boxH / 2, 'white', 12, 'center', 'middle');

        // 绘制x-t图
        const graphL = W * 0.5, graphR = W - 20;
        const graphT = 30, graphB = H * 0.45;
        const gW = graphR - graphL, gH = graphB - graphT;
        ctx.save();
        ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
        ctx.strokeRect(graphL, graphT, gW, gH);
        ctx.fillStyle = '#fafafa'; ctx.fillRect(graphL + 1, graphT + 1, gW - 2, gH - 2);
        Draw.text(ctx, 'x-t 图', graphL + gW / 2, graphT - 8, '#888', 12, 'center', 'bottom');
        // 零线
        const zeroY = graphT + gH / 2;
        ctx.strokeStyle = '#ddd'; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(graphL, zeroY); ctx.lineTo(graphR, zeroY);
        ctx.stroke(); ctx.setLineDash([]);
        // 绘制轨迹
        if (this.state.trail.length > 1) {
            const maxT = Math.max(this.state.t, 1);
            const maxX = Math.max(Math.max(...this.state.trail.map(p => Math.abs(p.x))), 10);
            ctx.strokeStyle = '#7c8a9e'; ctx.lineWidth = 1.5;
            ctx.beginPath();
            for (let i = 0; i < this.state.trail.length; i++) {
                const px = graphL + (this.state.trail[i].t / maxT) * gW;
                const py = zeroY - (this.state.trail[i].x / maxX) * (gH / 2 * 0.9);
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }
        ctx.restore();

        // 能量条
        const barX = W * 0.55, barW = 20;
        const barTop = graphB + 30, barH = H - barTop - 40;
        const m = this.params.mass.value;
        const k = this.params.stiffness.value;
        const Ek = 0.5 * m * this.state.v * this.state.v / 1000;
        const Ep = 0.5 * k * this.state.x * this.state.x / 1000;
        const Et = Ek + Ep;
        const maxE = Math.max(Et, 0.01);
        const ekH = (Ek / maxE) * barH;
        const epH = (Ep / maxE) * barH;

        // 动能条
        ctx.fillStyle = '#e74c3c'; ctx.fillRect(barX, barTop + barH - ekH, barW, ekH);
        ctx.strokeStyle = '#ddd'; ctx.strokeRect(barX, barTop, barW, barH);
        // 势能条
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(barX + barW + 10, barTop + barH - epH, barW, epH);
        ctx.strokeStyle = '#ddd';
        ctx.strokeRect(barX + barW + 10, barTop, barW, barH);
        Draw.text(ctx, 'Ek', barX + barW / 2, barTop + barH + 14, '#e74c3c', 11, 'center');
        Draw.text(ctx, 'Ep', barX + barW + 10 + barW / 2, barTop + barH + 14, '#2ecc71', 11, 'center');

        Draw.text(ctx, `t = ${this.state.t.toFixed(1)}s`, graphL, H - 10, '#888', 12);
    },

    updateInfo: function() {
        const m = this.params.mass.value;
        const k = this.params.stiffness.value;
        const T = 2 * Math.PI * Math.sqrt(m / k);
        const f = 1 / T;
        const omega = Math.sqrt(k / m);
        const Ek = 0.5 * m * this.state.v * this.state.v / 1000;
        const Ep = 0.5 * k * this.state.x * this.state.x / 1000;

        this.infoEl.innerHTML = `
            <div class="info-row"><span class="label">周期 T</span><span class="value">${T.toFixed(3)} s</span></div>
            <div class="info-row"><span class="label">频率 f</span><span class="value">${f.toFixed(3)} Hz</span></div>
            <div class="info-row"><span class="label">角频率 ω</span><span class="value">${omega.toFixed(3)} rad/s</span></div>
            <div class="info-row"><span class="label">位移 x</span><span class="value">${this.state.x.toFixed(1)} </span></div>
            <div class="info-row"><span class="label">速度 v</span><span class="value">${this.state.v.toFixed(2)} </span></div>
            <div class="info-row"><span class="label">动能 Ek</span><span class="value">${Ek.toFixed(3)} J</span></div>
            <div class="info-row"><span class="label">势能 Ep</span><span class="value">${Ep.toFixed(3)} J</span></div>
            <div class="info-row"><span class="label">总能量 E</span><span class="value">${(Ek + Ep).toFixed(3)} J</span></div>
        `;
    },

    resize: function() { this.setupCanvas(); this.draw(); }
};
