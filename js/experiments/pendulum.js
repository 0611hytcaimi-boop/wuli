/**
 * 实验1: 单摆
 * 模拟单摆运动，支持调节摆长、初始角度、阻尼
 * 物理原理: θ'' = -(g/L)sin(θ)，小角度(θ<5°)近似下为简谐运动
 * 周期公式: T = 2π√(L/g)，其中 L 为摆长，g = 9.8 m/s²
 */
const PendulumExperiment = {
    id: 'pendulum',
    title: '单摆运动',
    category: 'waves',
    description: '研究单摆的运动规律，可调节摆长、初始角度和阻尼系数。仅当摆角θ＜5°小角度近似下，周期满足公式 T=2π√(L/g)；大角度摆动时该公式不再精确成立。',

    // 物理状态
    state: {
        theta: Physics.toRad(5), // 当前角度 (rad)
        omega: 0,                // 角速度 (rad/s)
        time: 0,                 // 时间
        mass: 1,                 // 小球质量固定 1kg
        isRunning: false,
        trail: [],               // 轨迹点
        largeAngleWarned: false  // 大角度是否已提醒
    },

    // 物理参数（保持原有计算逻辑不变）
    params: {
        length: { value: 2.0, min: 0.5, max: 4.0, step: 0.1, label: '摆长 L (m)' },
        angle: { value: 5, min: 1, max: 80, step: 1, label: '初始角度 θ (°)' },
        damping: { value: 0, min: 0, max: 0.5, step: 0.01, label: '阻尼系数 b' },
        showTrail: { value: true, type: 'boolean', label: '显示轨迹' }
    },

    // 显示信息
    info: {},

    // 动画循环ID
    animId: null,
    // 上次时间戳
    lastTime: null,

    // 初始化
    init: function(canvas, controls, info) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.controlsEl = controls;
        this.infoEl = info;
        this.setupCanvas();
        this.createControls();
        this.reset();
        // 使用 innerHTML 渲染实验介绍中的公式
        document.getElementById('exp-description').innerHTML =
            '研究单摆的运动规律，可调节摆长、初始角度和阻尼系数。仅当摆角θ＜5°小角度近似下，周期满足公式 ' +
            '<span style="font-family:\'Times New Roman\',serif;font-style:italic;">T = 2π√(L/g)</span>' +
            '；大角度摆动时该公式不再精确成立。' +
            '<br><span style="font-size:11px;color:#aaa;">注：L为摆长，重力加速度 g = 9.8 m/s²</span>';
    },

    setupCanvas: function() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width - 32;
        this.canvas.height = rect.height - 32;
        this.W = this.canvas.width;
        this.H = this.canvas.height;
    },

    createControls: function() {
        this.controlsEl.innerHTML = '';

        // 质量固定显示
        const massGroup = document.createElement('div');
        massGroup.className = 'control-group';
        massGroup.innerHTML = `
            <label>
                <span><strong>小球质量 m</strong></span>
                <span class="value"><strong>1.000 kg</strong></span>
            </label>
            <div style="font-size:11px;color:var(--text-secondary);margin-top:2px;">固定质量 m = 1 kg，便于能量计算</div>`;
        this.controlsEl.appendChild(massGroup);

        for (const [key, param] of Object.entries(this.params)) {
            const group = document.createElement('div');
            group.className = 'control-group';
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
                const valStr = key === 'damping' ? Number(param.value).toFixed(2) : param.value;
                group.innerHTML = `
                    <label>
                        <span>${param.label}</span>
                        <span class="value" id="val-${key}">${valStr}</span>
                    </label>
                    <input type="range" min="${param.min}" max="${param.max}" step="${param.step}"
                           value="${param.value}" data-key="${key}">`;
                group.querySelector('input').addEventListener('input', (e) => {
                    const val = parseFloat(e.target.value);
                    this.params[key].value = val;
                    const display = key === 'damping' ? val.toFixed(2) : val;
                    document.getElementById(`val-${key}`).textContent = display;
                    if (key === 'angle') {
                        this.state.theta = Physics.toRad(val);
                        this.state.omega = 0;
                        this.state.trail = [];
                        this.state.largeAngleWarned = false;
                    }
                    if (key === 'length') {
                        this.state.trail = [];
                    }
                });
                // 阻尼补充说明
                if (key === 'damping') {
                    const note = document.createElement('div');
                    note.style.cssText = 'font-size:11px;color:var(--text-secondary);margin-top:2px;line-height:1.4;';
                    note.textContent = '数值越大，空气阻力越强，单摆机械能损耗越快';
                    group.appendChild(note);
                }
            }
            this.controlsEl.appendChild(group);
        }
    },

    reset: function() {
        this.state.theta = Physics.toRad(this.params.angle.value);
        this.state.omega = 0;
        this.state.time = 0;
        this.state.isRunning = false;
        this.state.trail = [];
        this.state.largeAngleWarned = false;
        this.lastTime = null;
        const btn = document.getElementById('btn-pause');
        btn.textContent = '开始';
        btn.classList.remove('paused');
        btn.classList.remove('running');
        this.draw();
        this.updateInfo();
    },

    togglePause: function() {
        this.state.isRunning = !this.state.isRunning;
        const btn = document.getElementById('btn-pause');
        if (this.state.isRunning) {
            btn.textContent = '暂停';
            btn.classList.remove('paused');
            btn.classList.add('running');
            this.lastTime = performance.now();
            this.animate(this.lastTime);
        } else {
            btn.textContent = '继续';
            btn.classList.add('paused');
            btn.classList.remove('running');
            if (this.animId) {
                cancelAnimationFrame(this.animId);
                this.animId = null;
            }
        }
    },

    // ---- 物理仿真（完全保持原有计算逻辑） ----
    animate: function(timestamp) {
        if (!this.state.isRunning) return;

        if (this.lastTime === null) this.lastTime = timestamp;
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
        this.lastTime = timestamp;

        // 物理更新（原样保留）
        const L = this.params.length.value;
        const damping = this.params.damping.value;
        const result = Physics.pendulumMotion(
            this.state.theta, this.state.omega, L, Physics.g, dt, damping
        );
        this.state.theta = result.theta;
        this.state.omega = result.omega;
        this.state.time += dt;

        // 大角度提醒
        const currentDeg = Math.abs(Physics.toDeg(this.state.theta));
        if (currentDeg > 5 && !this.state.largeAngleWarned && this.state.time > 0.5) {
            this.state.largeAngleWarned = true;
        }

        // 记录轨迹
        if (this.params.showTrail.value) {
            const ox = this.W / 2;
            const oy = this.H * 0.25;
            const scale = this.H * 0.55 / L;
            const bx = ox + scale * L * Math.sin(this.state.theta);
            const by = oy + scale * L * Math.cos(this.state.theta);
            this.state.trail.push({ x: bx, y: by });
            if (this.state.trail.length > 200) this.state.trail.shift();
        }

        this.draw();
        this.updateInfo();

        this.animId = requestAnimationFrame((t) => this.animate(t));
    },

    // ---- 画布绘制（可视化优化） ----
    draw: function() {
        const ctx = this.ctx;
        const W = this.W, H = this.H;
        const L = this.params.length.value;

        Draw.clear(ctx, W, H);

        // 坐标
        const ox = W / 2;
        const oy = H * 0.25;
        const scale = H * 0.55 / L;

        // 摆球位置
        const bx = ox + scale * L * Math.sin(this.state.theta);
        const by = oy + scale * L * Math.cos(this.state.theta);

        // === 1. 竖直基准虚线（零偏角参考线） ===
        ctx.save();
        ctx.strokeStyle = '#d6d3cc';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 6]);
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(ox, H);
        ctx.stroke();
        ctx.setLineDash([]);
        Draw.text(ctx, 'θ = 0°', ox + 6, H - 10, '#c4c1ba', 11);
        ctx.restore();

        // === 2. 悬点刻度支架 ===
        ctx.save();
        // 横梁
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(ox - 80, oy);
        ctx.lineTo(ox + 80, oy);
        ctx.stroke();
        // 刻度纹
        ctx.strokeStyle = '#bbb';
        ctx.lineWidth = 1;
        for (let i = -60; i <= 60; i += 15) {
            const tickH = i % 30 === 0 ? 8 : 4;
            ctx.beginPath();
            ctx.moveTo(ox + i, oy);
            ctx.lineTo(ox + i, oy + tickH);
            ctx.stroke();
        }
        // 支柱
        ctx.strokeStyle = '#aaa';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(ox - 80, oy);
        ctx.lineTo(ox - 85, oy + 25);
        ctx.moveTo(ox + 80, oy);
        ctx.lineTo(ox + 85, oy + 25);
        ctx.stroke();
        ctx.restore();

        // === 3. 轨迹（浅橙色，与摆线区分） ===
        if (this.params.showTrail.value && this.state.trail.length > 1) {
            ctx.save();
            ctx.strokeStyle = 'rgba(196, 168, 118, 0.45)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.state.trail[0].x, this.state.trail[0].y);
            for (let i = 1; i < this.state.trail.length; i++) {
                ctx.lineTo(this.state.trail[i].x, this.state.trail[i].y);
            }
            ctx.stroke();
            ctx.restore();
        }

        // === 4. 摆线 ===
        ctx.save();
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(bx, by);
        ctx.stroke();
        ctx.restore();

        // === 5. 摆球 ===
        const radius = Math.max(8, Math.min(20, 12 + L * 2));
        const gradient = ctx.createRadialGradient(bx - 3, by - 3, 1, bx, by, radius);
        gradient.addColorStop(0, '#8a9aaa');
        gradient.addColorStop(1, '#5a6a7e');
        ctx.save();
        ctx.beginPath();
        ctx.arc(bx, by, radius, 0, 2 * Math.PI);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = '#4a5a6e';
        ctx.lineWidth = 1;
        ctx.stroke();
        // 质量标注
        Draw.text(ctx, 'm=1kg', bx, by + radius + 14, '#888', 10, 'center', 'top');
        ctx.restore();

        // === 6. 角度弧线与标注 ===
        const currentDeg = Math.abs(Physics.toDeg(this.state.theta));
        if (currentDeg > 0.5) {
            ctx.save();
            const arcR = 40;
            const isLargeAngle = currentDeg > 5;

            // 角度弧线
            ctx.strokeStyle = isLargeAngle ? '#d4735e' : '#c4a87a';
            ctx.lineWidth = 1.5;
            if (isLargeAngle) ctx.setLineDash([4, 4]);
            const startAngle = 0;
            const endAngle = this.state.theta;
            ctx.beginPath();
            ctx.arc(ox, oy, arcR, Math.min(startAngle, endAngle), Math.max(startAngle, endAngle));
            ctx.stroke();
            ctx.setLineDash([]);

            // 角度数值
            const midAngle = this.state.theta / 2;
            const labelColor = isLargeAngle ? '#d4735e' : '#c4a87a';
            Draw.text(ctx, `${currentDeg.toFixed(1)}°`,
                ox + (arcR + 15) * Math.sin(midAngle),
                oy + (arcR + 15) * Math.cos(midAngle),
                labelColor, 12, 'center', 'middle');

            // 大角度警告
            if (isLargeAngle) {
                Draw.text(ctx, '⚠ 大角度，不满足简谐近似条件',
                    ox, oy + arcR + 40, '#d4735e', 11, 'center', 'top');
            }
            ctx.restore();
        }

        // === 7. 底部信息：理论周期与实测周期 ===
        const T_theory = (2 * Math.PI * Math.sqrt(L / Physics.g)).toFixed(3);
        const T_measured = this.state.time > 0.1 && this.state.omega !== 0
            ? (2 * Math.PI / Math.abs(this.state.omega)).toFixed(3)
            : '—';

        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.font = '12px -apple-system, sans-serif';

        ctx.fillStyle = '#666';
        ctx.fillText(`理论周期 T₀ = ${T_theory} s`, ox - 100, H - 6);
        ctx.fillStyle = '#888';
        ctx.font = '10px -apple-system, sans-serif';
        ctx.fillText('(仅小角度下精确)', ox - 100, H - 20);

        ctx.font = '12px -apple-system, sans-serif';
        ctx.fillStyle = '#575f6e';
        ctx.fillText(`实测周期 T实 = ${T_measured} s`, ox + 100, H - 6);
        ctx.restore();

        // === 8. 时间与状态 ===
        Draw.text(ctx, `t = ${this.state.time.toFixed(1)} s`, 12, 20, '#999', 12);
        if (this.state.largeAngleWarned) {
            ctx.save();
            ctx.fillStyle = 'rgba(212, 115, 94, 0.08)';
            ctx.fillRect(0, 0, W, 32);
            Draw.text(ctx, '💡 当前摆角较大，不满足简谐近似条件（θ<5°），实际周期大于 T=2π√(L/g)',
                W / 2, 12, '#d4735e', 11, 'center', 'top');
            ctx.restore();
        }
    },

    // ---- 信息面板（规范化） ----
    updateInfo: function() {
        const L = this.params.length.value;
        const T = 2 * Math.PI * Math.sqrt(L / Physics.g);
        const theta = Physics.toDeg(this.state.theta);
        const omega = this.state.omega;
        const m = this.state.mass;
        const v = L * omega;
        const Ek = 0.5 * m * v * v;
        const h = L * (1 - Math.cos(this.state.theta));
        const Ep = m * Physics.g * h;
        const E_total = Ek + Ep;
        const isDamped = this.params.damping.value > 0.001;
        const isLarge = Math.abs(theta) > 5;

        this.infoEl.innerHTML = `
            <div class="info-row" style="margin-bottom:4px;">
                <span class="label"><strong>小球质量 m</strong></span>
                <span class="value"><strong>1.000 kg</strong></span>
            </div>
            <div style="border-top:1px solid var(--border);margin:2px 0 6px;"></div>
            <div class="info-row">
                <span class="label">周期 T <span style="font-size:10px;color:#aaa;">(理论)</span></span>
                <span class="value">${T.toFixed(3)} s</span>
            </div>
            <div style="font-size:10px;color:#aaa;margin:-2px 0 4px;line-height:1.4;">仅θ&lt;5°时计算结果精确${isLarge ? '，大角度仅作参考' : ''}</div>
            <div class="info-row"><span class="label">当前角度 θ</span><span class="value">${theta.toFixed(2)} °</span></div>
            <div class="info-row"><span class="label">角速度 ω</span><span class="value">${omega.toFixed(3)} rad/s</span></div>
            <div class="info-row"><span class="label">线速度 v</span><span class="value">${v.toFixed(3)} m/s</span></div>
            <div style="border-top:1px solid var(--border);margin:4px 0 6px;"></div>
            <div class="info-row"><span class="label"><strong>动能</strong> E<sub>k</sub></span><span class="value"><strong>${Ek.toFixed(4)}</strong> J</span></div>
            <div class="info-row"><span class="label"><strong>势能</strong> E<sub>p</sub></span><span class="value"><strong>${Ep.toFixed(4)}</strong> J</span></div>
            <div class="info-row"><span class="label" style="font-weight:600;">总能量 E</span><span class="value" style="font-weight:600;">${E_total.toFixed(4)} J</span></div>
            <div style="font-size:10px;color:#aaa;margin-top:2px;">势能以单摆最低点为零势能参考面</div>
            ${isDamped
                ? '<div style="font-size:10px;color:#d4735e;margin-top:2px;">⏳ 阻尼模式下能量实时耗散</div>'
                : '<div style="font-size:10px;color:#7a9a7e;margin-top:2px;">✓ 无阻尼理想环境，系统总机械能守恒</div>'}
            <div class="info-row" style="margin-top:4px;"><span class="label">运行时间</span><span class="value">${this.state.time.toFixed(1)} s</span></div>
        `;
    },

    resize: function() {
        this.setupCanvas();
        this.draw();
    }
};
