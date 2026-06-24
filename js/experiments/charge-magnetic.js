/**
 * 实验6: 磁场中的电荷运动
 * 模拟带电粒子在匀强磁场中的圆周运动（洛伦兹力）
 * 物理原理: F = qv×B, 回旋半径 r = mv/(qB)
 */
const ChargeMagneticExperiment = {
    id: 'charge-magnetic', title: '磁场中的电荷', category: 'electromagnetism',
    description: '观察带电粒子在匀强磁场中的圆周运动。调节电荷量、质量和磁感应强度。验证回旋半径公式 r = mv/(qB)。',

    state: { x: 0, y: 0, z: 0, vx: 1, vy: 0, vz: 0, trail: [], isRunning: true, t: 0 },

    params: {
        charge: { value: 1, min: 0.5, max: 5, step: 0.5, label: '电荷量 q (归一化)' },
        mass: { value: 1, min: 0.2, max: 5, step: 0.1, label: '质量 m (归一化)' },
        bField: { value: 1, min: 0.2, max: 3, step: 0.1, label: '磁感应强度 B (T)' },
        speed: { value: 2, min: 0.5, max: 5, step: 0.5, label: '初速度 v₀ (归一化)' }
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
        const cx = this.W / 2, cy = this.H / 2;
        this.state.x = cx - 100; this.state.y = cy; this.state.z = 0;
        this.state.vx = 0; this.state.vy = this.params.speed.value * 30; this.state.vz = 0;
        this.state.t = 0;
        this.state.trail = [{ x: this.state.x, y: this.state.y }];
        this.state.isRunning = true;
        this.lastTime = null;
        document.getElementById('btn-pause').textContent = '暂停';
        document.getElementById('btn-pause').classList.remove('paused');
        this.draw(); this.updateInfo();
    },

    togglePause: function() {
        this.state.isRunning = !this.state.isRunning;
        document.getElementById('btn-pause').textContent = this.state.isRunning ? '暂停' : '继续';
        if (this.state.isRunning) { this.lastTime = performance.now(); this.animate(this.lastTime); }
        else { if (this.animId) { cancelAnimationFrame(this.animId); this.animId = null; } }
    },

    animate: function(timestamp) {
        if (!this.state.isRunning) return;
        if (this.lastTime === null) this.lastTime = timestamp;
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.02);
        this.lastTime = timestamp;

        const q = this.params.charge.value;
        const m = this.params.mass.value;
        const B = this.params.bField.value;

        const result = Physics.chargeMotion(
            this.state.x, this.state.y, this.state.z,
            this.state.vx, this.state.vy, this.state.vz,
            q, B, m, dt
        );
        this.state.x = result.x; this.state.y = result.y;
        this.state.vx = result.vx; this.state.vy = result.vy;
        this.state.t += dt;

        this.state.trail.push({ x: this.state.x, y: this.state.y });
        if (this.state.trail.length > 500) this.state.trail.shift();

        this.draw(); this.updateInfo();
        this.animId = requestAnimationFrame((t) => this.animate(t));
    },

    draw: function() {
        const ctx = this.ctx, W = this.W, H = this.H;
        Draw.clear(ctx, W, H);

        // 磁场背景
        ctx.save();
        for (let y = 0; y < H; y += 30) {
            for (let x = 0; x < W; x += 30) {
                ctx.fillStyle = 'rgba(124, 138, 158, 0.05)';
                ctx.font = '16px sans-serif';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('⊙', x + 15, y + 15);
            }
        }
        ctx.restore();
        Draw.text(ctx, '磁场 B 方向: 垂直纸面向外', W / 2, 16, 'rgba(124,138,158,0.5)', 12, 'center', 'top');

        // 轨迹
        const trail = this.state.trail;
        if (trail.length > 1) {
            ctx.save();
            const gradient = ctx.createLinearGradient(0, 0, W, 0);
            gradient.addColorStop(0, 'rgba(231,76,60,0.3)');
            gradient.addColorStop(0.5, 'rgba(231,76,60,0.6)');
            gradient.addColorStop(1, 'rgba(231,76,60,0.3)');
            ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(trail[0].x, trail[0].y);
            for (let i = 1; i < trail.length; i++) ctx.lineTo(trail[i].x, trail[i].y);
            ctx.stroke();
            ctx.restore();
        }

        // 粒子
        const px = this.state.x, py = this.state.y;
        const gradient = ctx.createRadialGradient(px - 3, py - 3, 1, px, py, 8);
        gradient.addColorStop(0, '#f1c40f'); gradient.addColorStop(1, '#e67e22');
        ctx.save();
        ctx.beginPath(); ctx.arc(px, py, 8, 0, 2 * Math.PI);
        ctx.fillStyle = gradient; ctx.fill();
        ctx.strokeStyle = '#d35400'; ctx.lineWidth = 1;
        ctx.stroke();

        // 速度矢量
        const vScale = 0.5;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + this.state.vx * vScale, py + this.state.vy * vScale);
        ctx.strokeStyle = '#2ecc71'; ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        Draw.text(ctx, '● 带电粒子  → 速度方向', 12, H - 20, '#888', 12);
    },

    updateInfo: function() {
        const q = this.params.charge.value;
        const m = this.params.mass.value;
        const B = this.params.bField.value;
        const v = Math.sqrt(this.state.vx ** 2 + this.state.vy ** 2);
        const r = m * v / (q * B);
        const T = 2 * Math.PI * m / (q * B);
        const f = 1 / T;

        this.infoEl.innerHTML = `
            <div class="info-row"><span class="label">回旋半径 r</span><span class="value">${r.toFixed(1)} 归一化长度</span></div>
            <div class="info-row"><span class="label">回旋周期 T</span><span class="value">${T.toFixed(2)} s</span></div>
            <div class="info-row"><span class="label">回旋频率 f</span><span class="value">${f.toFixed(2)} Hz</span></div>
            <div class="info-row"><span class="label">速率 v</span><span class="value">${v.toFixed(2)} 归一化速率</span></div>
            <div class="info-row"><span class="label">运行时间</span><span class="value">${this.state.t.toFixed(1)} s</span></div>
        `;
    },

    resize: function() { this.setupCanvas(); this.draw(); }
};
