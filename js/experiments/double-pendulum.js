/**
 * 实验: 双摆混沌运动
 * 模拟双摆的非线性混沌运动，展示对初始条件的高度敏感性
 * 物理原理: 耦合二阶微分方程组，使用拉格朗日力学推导
 */
const DoublePendulumExperiment = {
    id: 'double-pendulum', title: '双摆混沌运动', category: 'mechanics',
    description: '观察双摆的混沌运动。改变任一初始角度都会导致完全不同的运动轨迹，这是混沌系统对初始条件极端敏感的标志。',

    state: {
        theta1: 0, theta2: 0,
        omega1: 0, omega2: 0,
        time: 0,
        isRunning: false,
        trail: []
    },

    params: {
        mass1: { value: 2, min: 0.5, max: 5, step: 0.1, label: '质量 m₁ (kg)' },
        mass2: { value: 1.5, min: 0.5, max: 5, step: 0.1, label: '质量 m₂ (kg)' },
        length1: { value: 80, min: 40, max: 150, step: 5, label: '摆长 L₁ (m)' },
        length2: { value: 70, min: 40, max: 150, step: 5, label: '摆长 L₂ (m)' },
        angle1: { value: 120, min: 30, max: 170, step: 1, label: '初始角度 θ₁ (°)' },
        angle2: { value: 100, min: 30, max: 170, step: 1, label: '初始角度 θ₂ (°)' },
        showTrail: { value: true, type: 'boolean', label: '显示轨迹' }
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
            if (param.type === 'boolean') {
                group.innerHTML = `
                    <label>
                        <input type="checkbox" ${param.value ? 'checked' : ''} data-key="${key}">
                        ${param.label}
                    </label>`;
                group.querySelector('input').addEventListener('change', (e) => {
                    this.params[key].value = e.target.checked;
                });
            } else {
                group.innerHTML = `
                    <label><span>${param.label}</span><span class="value" id="val-${key}">${param.value}</span></label>
                    <input type="range" min="${param.min}" max="${param.max}" step="${param.step}" value="${param.value}" data-key="${key}">`;
                group.querySelector('input').addEventListener('input', (e) => {
                    const val = parseFloat(e.target.value);
                    this.params[key].value = val;
                    document.getElementById(`val-${key}`).textContent = val;
                    if (key === 'angle1' || key === 'angle2' || key === 'length1' || key === 'length2') {
                        this.state.trail = [];
                    }
                });
            }
            this.controlsEl.appendChild(group);
        }
    },

    reset: function() {
        this.state.theta1 = Physics.toRad(this.params.angle1.value);
        this.state.theta2 = Physics.toRad(this.params.angle2.value);
        this.state.omega1 = 0;
        this.state.omega2 = 0;
        this.state.time = 0;
        this.state.isRunning = false;
        this.state.trail = [];
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
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.0167);
        this.lastTime = timestamp;

        const m1 = this.params.mass1.value;
        const m2 = this.params.mass2.value;
        const L1 = this.params.length1.value;
        const L2 = this.params.length2.value;

        const result = Physics.doublePendulumMotion(
            this.state.theta1, this.state.theta2,
            this.state.omega1, this.state.omega2,
            m1, m2, L1, L2, Physics.g, dt
        );
        this.state.theta1 = result.theta1;
        this.state.theta2 = result.theta2;
        this.state.omega1 = result.omega1;
        this.state.omega2 = result.omega2;
        this.state.time += dt;

        // 记录第二个摆球的轨迹
        if (this.params.showTrail.value) {
            const pivotX = this.W / 2;
            const pivotY = this.H * 0.15;
            const x1 = pivotX + L1 * Math.sin(this.state.theta1);
            const y1 = pivotY + L1 * Math.cos(this.state.theta1);
            const x2 = x1 + L2 * Math.sin(this.state.theta2);
            const y2 = y1 + L2 * Math.cos(this.state.theta2);
            this.state.trail.push({ x: x2, y: y2 });
            if (this.state.trail.length > 600) this.state.trail.shift();
        }

        this.draw(); this.updateInfo();
        this.animId = requestAnimationFrame((t) => this.animate(t));
    },

    draw: function() {
        const ctx = this.ctx, W = this.W, H = this.H;
        const L1 = this.params.length1.value;
        const L2 = this.params.length2.value;
        Draw.clear(ctx, W, H, '#0a0a1a');

        const pivotX = W / 2;
        const pivotY = H * 0.15;

        // 摆臂末端位置
        const x1 = pivotX + L1 * Math.sin(this.state.theta1);
        const y1 = pivotY + L1 * Math.cos(this.state.theta1);
        const x2 = x1 + L2 * Math.sin(this.state.theta2);
        const y2 = y1 + L2 * Math.cos(this.state.theta2);

        // 网格 (暗色)
        Draw.grid(ctx, W, H, 40, 'rgba(255,255,255,0.03)');

        // 轨迹 (混沌模式 - 渐变彩色)
        if (this.params.showTrail.value && this.state.trail.length > 1) {
            ctx.save();
            for (let i = 1; i < this.state.trail.length; i++) {
                const t = i / this.state.trail.length;
                const hue = (t * 200 + this.state.time * 10) % 360;
                ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${0.3 + t * 0.5})`;
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.moveTo(this.state.trail[i - 1].x, this.state.trail[i - 1].y);
                ctx.lineTo(this.state.trail[i].x, this.state.trail[i].y);
                ctx.stroke();
            }
            ctx.restore();
        }

        // 绘制支架
        ctx.save();
        ctx.fillStyle = '#555';
        ctx.fillRect(pivotX - 4, pivotY - 15, 8, 20);
        ctx.fillStyle = '#666';
        ctx.fillRect(pivotX - 30, pivotY - 5, 60, 6);
        ctx.restore();

        // 第一根摆臂
        ctx.save();
        ctx.strokeStyle = '#7c8a9e';
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(124, 138, 158, 0.5)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(pivotX, pivotY);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 第一个关节
        ctx.beginPath();
        ctx.arc(pivotX, pivotY, 6, 0, 2 * Math.PI);
        ctx.fillStyle = '#888';
        ctx.fill();
        ctx.restore();

        // 第一个摆球
        const r1 = Math.max(8, Math.min(18, 10 + L1 * 0.05));
        ctx.save();
        const g1 = ctx.createRadialGradient(x1 - 2, y1 - 2, 1, x1, y1, r1);
        g1.addColorStop(0, '#5b8cf7');
        g1.addColorStop(1, '#5a6a7e');
        ctx.beginPath();
        ctx.arc(x1, y1, r1, 0, 2 * Math.PI);
        ctx.fillStyle = g1;
        ctx.fill();
        ctx.strokeStyle = '#1a2fa0';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        // 第二根摆臂
        ctx.save();
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 3;
        ctx.shadowColor = 'rgba(231, 76, 60, 0.5)';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // 中间关节
        ctx.beginPath();
        ctx.arc(x1, y1, 5, 0, 2 * Math.PI);
        ctx.fillStyle = '#ddd';
        ctx.fill();
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        // 第二个摆球 (拖着轨迹的)
        const r2 = Math.max(7, Math.min(16, 9 + L2 * 0.05));
        ctx.save();
        const g2 = ctx.createRadialGradient(x2 - 2, y2 - 2, 1, x2, y2, r2);
        g2.addColorStop(0, '#ff6b6b');
        g2.addColorStop(1, '#c0392b');
        ctx.beginPath();
        ctx.arc(x2, y2, r2, 0, 2 * Math.PI);
        ctx.fillStyle = g2;
        ctx.fill();
        ctx.strokeStyle = '#7b1a1a';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        // 角度弧线标注
        ctx.save();
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = 'rgba(124,138,158,0.4)';
        ctx.lineWidth = 1;
        const arcR = 30;
        const a1deg = Physics.toDeg(this.state.theta1);
        if (Math.abs(a1deg) > 1) {
            ctx.beginPath();
            ctx.arc(pivotX, pivotY, arcR, Math.min(0, this.state.theta1), Math.max(0, this.state.theta1));
            ctx.stroke();
            Draw.text(ctx, `θ₁=${a1deg.toFixed(1)}°`, pivotX + (arcR + 18) * Math.sin(this.state.theta1 / 2),
                pivotY + (arcR + 18) * Math.cos(this.state.theta1 / 2), 'rgba(124,138,158,0.7)', 11, 'center', 'middle');
        }
        // θ2 弧线 (相对于第一根臂)
        const a2deg = Physics.toDeg(this.state.theta2);
        if (Math.abs(a2deg - a1deg) > 1) {
            ctx.beginPath();
            ctx.arc(x1, y1, 25, Math.min(this.state.theta1, this.state.theta2), Math.max(this.state.theta1, this.state.theta2));
            ctx.strokeStyle = 'rgba(231,76,60,0.4)';
            ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.restore();

        // 底部信息
        const L1m = this.params.length1.value / 100 * 2;
        const L2m = this.params.length2.value / 100 * 2;
        Draw.text(ctx, `L₁≈${L1m.toFixed(1)}m  L₂≈${L2m.toFixed(1)}m  m₁=${this.params.mass1.value}kg  m₂=${this.params.mass2.value}kg`,
            W / 2, H - 14, 'rgba(255,255,255,0.25)', 11, 'center', 'bottom');
        Draw.text(ctx, `t = ${this.state.time.toFixed(1)} s`, 12, 20, 'rgba(255,255,255,0.35)', 12);

        // 混沌标识
        if (this.state.trail.length > 100) {
            Draw.text(ctx, '混沌运动', W - 12, 20, 'rgba(255,255,255,0.3)', 12, 'right');
        }
    },

    updateInfo: function() {
        const m1 = this.params.mass1.value;
        const m2 = this.params.mass2.value;
        const L1 = this.params.length1.value / 100;
        const L2 = this.params.length2.value / 100;
        const g = Physics.g;
        const t1 = this.state.theta1, t2 = this.state.theta2;
        const w1 = this.state.omega1, w2 = this.state.omega2;

        // 摆球位置 (以m为单位)
        const x1 = L1 * Math.sin(t1), y1 = -L1 * Math.cos(t1);
        const x2 = x1 + L2 * Math.sin(t2), y2 = y1 - L2 * Math.cos(t2);
        const vx1 = L1 * w1 * Math.cos(t1);
        const vy1 = L1 * w1 * Math.sin(t1);
        const vx2 = vx1 + L2 * w2 * Math.cos(t2);
        const vy2 = vy1 + L2 * w2 * Math.sin(t2);
        const v1sq = vx1 * vx1 + vy1 * vy1;
        const v2sq = vx2 * vx2 + vy2 * vy2;

        const Ek = 0.5 * m1 * v1sq + 0.5 * m2 * v2sq;
        const Ep = m1 * g * (y1 + L1) + m2 * g * (y2 + L1 + L2); // 零点在最高处
        const Et = Ek + Ep;

        this.infoEl.innerHTML = `
            <div class="info-row"><span class="label">θ₁</span><span class="value">${Physics.toDeg(t1).toFixed(1)}°</span></div>
            <div class="info-row"><span class="label">θ₂</span><span class="value">${Physics.toDeg(t2).toFixed(1)}°</span></div>
            <div class="info-row"><span class="label">ω₁</span><span class="value">${w1.toFixed(2)} rad/s</span></div>
            <div class="info-row"><span class="label">ω₂</span><span class="value">${w2.toFixed(2)} rad/s</span></div>
            <div class="info-row"><span class="label">动能 Ek</span><span class="value">${Ek.toFixed(2)} J</span></div>
            <div class="info-row"><span class="label">势能 Ep</span><span class="value">${Ep.toFixed(2)} J</span></div>
            <div class="info-row"><span class="label">总能量 E</span><span class="value">${Et.toFixed(2)} J</span></div>
            <div class="info-row"><span class="label">运行时间</span><span class="value">${this.state.time.toFixed(1)} s</span></div>
            <div class="info-row"><span class="label" style="color:#e74c3c;">轨迹点数</span><span class="value" style="color:#e74c3c;">${this.state.trail.length}</span></div>
        `;
    },

    resize: function() { this.setupCanvas(); this.draw(); }
};
