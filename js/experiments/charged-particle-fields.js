/**
 * 实验: 带电粒子在电场和重力场中的运动
 * 模拟带电粒子在平行板电场与重力场共同作用下的运动轨迹
 * 物理原理: F = qE + mg, 类似阴极射线管原理
 */
const ChargedParticleFieldsExperiment = {
    id: 'charged-particle-fields', title: '带电粒子在电场和重力场中的运动', category: 'electromagnetism',
    description: '观察带电粒子在平行板电容器电场和重力场共同作用下的运动。调节电荷量、质量、电场强度和入射角度，分析力的合成与运动轨迹。',

    state: {
        x: 0, y: 0,
        vx: 0, vy: 0,
        time: 0,
        isRunning: false,
        trail: [],
        leftPlate: false  // 粒子是否已离开板间区域
    },

    params: {
        charge: { value: 1, min: -5, max: 5, step: 0.1, label: '电荷量 q (归一化)' },
        mass: { value: 1, min: 0.1, max: 5, step: 0.1, label: '质量 m (归一化)' },
        voltage: { value: 10, min: 0.5, max: 50, step: 0.5, label: '板间电压 V (V)' },
        angle: { value: 15, min: -45, max: 45, step: 1, label: '入射角度 (°)' },
        showFieldLines: { value: true, type: 'boolean', label: '显示电场线' }
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
                });
            }
            this.controlsEl.appendChild(group);
        }
    },

    reset: function() {
        const plateTop = this.H * 0.3;
        const plateGap = this.H * 0.3;
        const midY = plateTop + plateGap / 2;
        const startX = this.W * 0.08;
        const speed = 200;

        const angleRad = Physics.toRad(this.params.angle.value);
        this.state.x = startX;
        this.state.y = midY;
        this.state.vx = speed * Math.cos(angleRad);
        this.state.vy = -speed * Math.sin(angleRad); // 负号因为canvas Y轴向下
        this.state.time = 0;
        this.state.isRunning = false;
        this.state.trail = [{ x: startX, y: midY }];
        this.state.leftPlate = false;
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
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.025);
        this.lastTime = timestamp;

        const q = this.params.charge.value;
        const m = this.params.mass.value;
        const V = this.params.voltage.value;
        const plateGap = this.H * 0.3; // plate gap in px
        const d = plateGap / 100;       // convert to meters (scale)
        const plateLeft = this.W * 0.18;
        const plateRight = this.W * 0.82;
        const plateTop = this.H * 0.3;
        const plateBottom = plateTop + plateGap;

        // 电场 (仅在板间)
        const E = Physics.parallelPlateField(V, d); // E = V/d
        let Fe = 0;
        let insidePlates = false;
        if (this.state.x >= plateLeft && this.state.x <= plateRight &&
            this.state.y >= plateTop && this.state.y <= plateBottom) {
            insidePlates = true;
            Fe = Physics.electricForce(q, E); // Fe = q * E
        }

        // 重力
        const Fg = m * Physics.g;

        // 合力 (向上为正, canvas中向上为负方向)
        // E方向: 从上板(+)指向下板(-) = 向下
        // Fe = q*E, 正电荷受力向下, 负电荷受力向上
        const Fnet = Fe + Fg; // 都朝canvas下方为正

        // 加速度 (Fnet向下, canvas的y轴正方向)
        const ax = 0;
        const ay = Fnet / m; // px/s², 方向向下

        // 更新速度
        this.state.vx += ax * dt;
        this.state.vy += ay * dt;

        // 更新位置
        this.state.x += this.state.vx * dt;
        this.state.y += this.state.vy * dt;

        this.state.time += dt;

        // 记录轨迹
        this.state.trail.push({ x: this.state.x, y: this.state.y });
        if (this.state.trail.length > 600) this.state.trail.shift();

        // 检查是否离开板区域
        if (this.state.x > plateRight || this.state.y < 0 || this.state.y > this.H ||
            this.state.x < 0) {
            if (this.state.isRunning) {
                this.state.isRunning = false;
                document.getElementById('btn-pause').textContent = '继续';
                if (this.animId) { cancelAnimationFrame(this.animId); this.animId = null; }
            }
        }

        this.draw(); this.updateInfo();
        if (this.state.isRunning) {
            this.animId = requestAnimationFrame((t) => this.animate(t));
        }
    },

    draw: function() {
        const ctx = this.ctx, W = this.W, H = this.H;
        Draw.clear(ctx, W, H, '#fafbfc');

        const plateLeft = W * 0.18;
        const plateRight = W * 0.82;
        const plateTop = H * 0.3;
        const plateGap = H * 0.3;
        const plateBottom = plateTop + plateGap;
        const plateThickness = 10;

        // ========== 电场线 (板间) ==========
        if (this.params.showFieldLines.value) {
            ctx.save();
            ctx.strokeStyle = 'rgba(124, 138, 158, 0.25)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 8]);
            const numLines = 12;
            for (let i = 0; i <= numLines; i++) {
                const lx = plateLeft + (i / numLines) * (plateRight - plateLeft);
                ctx.beginPath();
                ctx.moveTo(lx, plateTop + 5);
                ctx.lineTo(lx, plateBottom - 5);
                ctx.stroke();

                // 箭头 (向下, E方向从+到-)
                if (i % 2 === 0) {
                    const arrowY = plateTop + plateGap * 0.6;
                    ctx.setLineDash([]);
                    ctx.fillStyle = 'rgba(124, 138, 158, 0.35)';
                    ctx.beginPath();
                    ctx.moveTo(lx, arrowY + 6);
                    ctx.lineTo(lx - 4, arrowY);
                    ctx.lineTo(lx + 4, arrowY);
                    ctx.closePath();
                    ctx.fill();
                    ctx.setLineDash([4, 8]);
                }
            }
            ctx.setLineDash([]);
            ctx.restore();
        }

        // ========== 上板 (+) ==========
        ctx.save();
        const gradTop = ctx.createLinearGradient(0, plateTop - plateThickness, 0, plateTop);
        gradTop.addColorStop(0, '#e74c3c');
        gradTop.addColorStop(1, '#c0392b');
        ctx.fillStyle = gradTop;
        ctx.fillRect(plateLeft, plateTop - plateThickness, plateRight - plateLeft, plateThickness);
        ctx.strokeStyle = '#7b1a1a';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(plateLeft, plateTop - plateThickness, plateRight - plateLeft, plateThickness);
        Draw.text(ctx, '+ 正极板', plateLeft + (plateRight - plateLeft) / 2, plateTop - plateThickness - 6,
            '#c0392b', 14, 'center', 'bottom');
        ctx.restore();

        // ========== 下板 (-) ==========
        ctx.save();
        const gradBot = ctx.createLinearGradient(0, plateBottom, 0, plateBottom + plateThickness);
        gradBot.addColorStop(0, '#3498db');
        gradBot.addColorStop(1, '#2471a3');
        ctx.fillStyle = gradBot;
        ctx.fillRect(plateLeft, plateBottom, plateRight - plateLeft, plateThickness);
        ctx.strokeStyle = '#145a7a';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(plateLeft, plateBottom, plateRight - plateLeft, plateThickness);
        Draw.text(ctx, '− 负极板', plateLeft + (plateRight - plateLeft) / 2, plateBottom + plateThickness + 16,
            '#2471a3', 14, 'center', 'top');
        ctx.restore();

        // ========== 电压标注 ==========
        const vMidX = plateLeft + (plateRight - plateLeft) / 2;
        const vMidY = plateTop + plateGap / 2;
        Draw.text(ctx, `V = ${this.params.voltage.value} V`, vMidX + 80, vMidY, '#666', 13, 'left', 'middle');
        Draw.text(ctx, `E = ${(this.params.voltage.value/(plateGap/100)).toFixed(1)} V/m`, vMidX + 80, vMidY + 18, '#888', 11, 'left', 'middle');

        // ========== 电场方向箭头 ==========
        ctx.save();
        ctx.strokeStyle = 'rgba(124,138,158,0.6)';
        ctx.fillStyle = 'rgba(124,138,158,0.6)';
        ctx.lineWidth = 2;
        Draw.arrowLine(ctx, vMidX + 30, plateTop + 15, vMidX + 30, plateBottom - 15, 'rgba(124,138,158,0.6)', 2);
        Draw.text(ctx, 'E↓', vMidX + 42, vMidY, 'rgba(124,138,158,0.7)', 11, 'left', 'middle');
        ctx.restore();

        // ========== 粒子轨迹 ==========
        const trail = this.state.trail;
        if (trail.length > 1) {
            ctx.save();
            // 轨迹线
            for (let i = 1; i < trail.length; i++) {
                const alpha = 0.15 + (i / trail.length) * 0.7;
                const isInside = trail[i].x >= plateLeft && trail[i].x <= plateRight &&
                    trail[i].y >= plateTop && trail[i].y <= plateBottom;
                ctx.strokeStyle = isInside ?
                    `rgba(243, 156, 18, ${alpha})` :
                    `rgba(231, 76, 60, ${alpha * 0.5})`;
                ctx.lineWidth = isInside ? 2 : 1.5;
                ctx.beginPath();
                ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
                ctx.lineTo(trail[i].x, trail[i].y);
                ctx.stroke();
            }
            ctx.restore();

            // 板出射后延长虚线
            if (trail.length > 0 && trail[trail.length - 1].x > plateRight) {
                ctx.save();
                ctx.setLineDash([5, 5]);
                ctx.strokeStyle = 'rgba(231,76,60,0.4)';
                ctx.lineWidth = 1;
                const last = trail[trail.length - 1];
                const prev = trail[trail.length - 2];
                if (prev) {
                    ctx.beginPath();
                    ctx.moveTo(prev.x, prev.y);
                    ctx.lineTo(last.x + (last.x - prev.x) * 0.5, last.y + (last.y - prev.y) * 0.5);
                    ctx.stroke();
                }
                ctx.setLineDash([]);
                ctx.restore();
            }
        }

        // ========== 粒子 ==========
        const px = this.state.x, py = this.state.y;
        const particleR = 6;
        const chargeColor = this.params.charge.value >= 0 ? '#e74c3c' : '#3498db';
        const chargeSign = this.params.charge.value >= 0 ? '+' : '−';

        ctx.save();
        // 光晕
        const glow = ctx.createRadialGradient(px, py, particleR * 0.3, px, py, particleR * 2);
        glow.addColorStop(0, chargeColor);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(px, py, particleR * 2, 0, 2 * Math.PI);
        ctx.fill();

        // 粒子球
        const grad = ctx.createRadialGradient(px - 1, py - 1, 0.5, px, py, particleR);
        grad.addColorStop(0, '#fff');
        grad.addColorStop(0.5, chargeColor);
        grad.addColorStop(1, '#333');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py, particleR, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 电荷符号
        Draw.text(ctx, chargeSign, px, py, 'white', 10, 'center', 'middle');

        // 质量标注
        Draw.text(ctx, `q=${this.params.charge.value} m=${this.params.mass.value}`,
            px + particleR + 4, py - 12, chargeColor, 10, 'left', 'bottom');
        ctx.restore();

        // ========== 受力分析 (在粒子附近) ==========
        if (px < this.W - 120 && py > 60 && py < this.H - 60) {
            const insidePlates = (px >= plateLeft && px <= plateRight &&
                py >= plateTop && py <= plateBottom);

            const q = this.params.charge.value;
            const m = this.params.mass.value;
            const V = this.params.voltage.value;
            const d = plateGap / 100;
            const E = Physics.parallelPlateField(V, d);
            const Fe = q * E;
            const Fg = m * Physics.g;

            // 力箭头起点
            const fx = px + particleR + 5;
            const fy = py;
            const fScale = 1.5; // px per N

            // 重力 (总是向下)
            ctx.save();
            Draw.arrowLine(ctx, fx + 30, fy, fx + 30, fy + Math.abs(Fg) * fScale,
                '#27ae60', 2);
            Draw.text(ctx, `Fg=${Fg.toFixed(1)}N`, fx + 36, fy + Math.abs(Fg) * fScale / 2,
                '#27ae60', 10, 'left', 'middle');
            ctx.restore();

            // 电场力 (仅在板间)
            if (insidePlates && Math.abs(Fe) > 0.01) {
                ctx.save();
                const feDir = Fe > 0 ? 1 : -1; // 正=向下
                Draw.arrowLine(ctx, fx, fy, fx, fy + Fe * fScale,
                    '#e67e22', 2);
                Draw.text(ctx, `Fe=${Fe.toFixed(1)}N`, fx + 6, fy + Fe * fScale / 2,
                    '#e67e22', 10, 'left', 'middle');
                ctx.restore();
            }

            // 合力标注
            if (insidePlates) {
                const Fnet = Fe + Fg;
                Draw.text(ctx, `Fnet=${Fnet.toFixed(1)}N  ay=${(Fnet/m).toFixed(1)}`, fx + 40, fy - 14,
                    '#8e44ad', 10, 'left', 'middle');
                Draw.text(ctx, '受力分析 →', fx - 8, fy - 22, '#999', 9, 'left', 'bottom');
            }
        }

        // ========== 电子枪标记 (起始位置) ==========
        const startX = this.W * 0.08;
        const midY = plateTop + plateGap / 2;
        ctx.save();
        ctx.fillStyle = '#555';
        ctx.fillRect(startX - 20, midY - 4, 20, 8);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.strokeRect(startX - 20, midY - 4, 20, 8);
        Draw.text(ctx, '发射源', startX - 22, midY - 10, '#666', 10, 'right', 'bottom');
        ctx.restore();

        // ========== 屏幕标记 (右侧) ==========
        const screenX = plateRight + 40;
        ctx.save();
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(screenX, plateTop - 20);
        ctx.lineTo(screenX, plateBottom + 20);
        ctx.stroke();
        ctx.setLineDash([]);
        Draw.text(ctx, '荧屏', screenX + 6, plateTop - 25, '#888', 11, 'left', 'top');

        // 如果粒子打到屏幕, 标记落点
        if (this.state.trail.length > 0) {
            const lastPt = this.state.trail[this.state.trail.length - 1];
            if (lastPt.x >= screenX - 5 && lastPt.x <= screenX + 5) {
                ctx.fillStyle = '#e74c3c';
                ctx.beginPath();
                ctx.arc(screenX, lastPt.y, 4, 0, 2 * Math.PI);
                ctx.fill();
                Draw.text(ctx, `偏转: ${(lastPt.y - midY).toFixed(0)}px`,
                    screenX + 10, lastPt.y, '#e74c3c', 10, 'left', 'middle');
            }
        }
        ctx.restore();

        // 底部信息
        const insidePlates = (px >= plateLeft && px <= plateRight &&
            py >= plateTop && py <= plateBottom);
        Draw.text(ctx, insidePlates ? '板间区域' : '自由飞行区域',
            W / 2, H - 10, insidePlates ? '#e67e22' : '#888', 11, 'center', 'bottom');
        Draw.text(ctx, `t = ${this.state.time.toFixed(2)} s`, 12, 18, '#888', 11);
    },

    updateInfo: function() {
        const q = this.params.charge.value;
        const m = this.params.mass.value;
        const V = this.params.voltage.value;
        const plateGap = this.H * 0.3;
        const d = plateGap / 100; // meters scale
        const E = Physics.parallelPlateField(V, d);
        const Fe = Physics.electricForce(q, E);
        const Fg = m * Physics.g;
        const Fnet = Fe + Fg;
        const ay = Fnet / m;
        const v = Math.sqrt(this.state.vx * this.state.vx + this.state.vy * this.state.vy);
        const vAbs = Math.abs(this.state.vy);
        const plateLeft = this.W * 0.18;
        const plateRight = this.W * 0.82;
        const plateTop = this.H * 0.3;
        const plateBottom = plateTop + plateGap;
        const insidePlates = (this.state.x >= plateLeft && this.state.x <= plateRight &&
            this.state.y >= plateTop && this.state.y <= plateBottom);

        this.infoEl.innerHTML = `
            <div class="info-row"><span class="label">电场强度 E</span><span class="value">${E.toFixed(2)} V/m</span></div>
            <div class="info-row"><span class="label">电场力 Fe</span><span class="value">${Fe.toFixed(2)} N</span></div>
            <div class="info-row"><span class="label">重力 Fg</span><span class="value">${Fg.toFixed(2)} N</span></div>
            <div class="info-row"><span class="label">合力 Fnet</span><span class="value" style="color:${insidePlates?'#8e44ad':'#999'}">${insidePlates ? Fnet.toFixed(2) : '—'} N</span></div>
            <div class="info-row"><span class="label">纵向加速度 ay</span><span class="value" style="color:${insidePlates?'#8e44ad':'#999'}">${insidePlates ? ay.toFixed(2) : Physics.g.toFixed(2)} m/s²</span></div>
            <div class="info-row"><span class="label">速率 v</span><span class="value">${v.toFixed(1)} m/s</span></div>
            <div class="info-row"><span class="label">vx (水平)</span><span class="value">${this.state.vx.toFixed(1)} m/s</span></div>
            <div class="info-row"><span class="label">vy (垂直)</span><span class="value">${this.state.vy.toFixed(1)} m/s</span></div>
            <div class="info-row"><span class="label">位置</span><span class="value">${insidePlates ? '板间' : '板外'}</span></div>
            <div class="info-row"><span class="label">运行时间</span><span class="value">${this.state.time.toFixed(2)} s</span></div>
        `;
    },

    resize: function() { this.setupCanvas(); this.draw(); }
};
