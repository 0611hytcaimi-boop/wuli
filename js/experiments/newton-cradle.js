/**
 * 实验4: 牛顿摆
 * 模拟牛顿摆（碰撞球）的动量守恒和能量守恒
 * 物理原理: 弹性碰撞中动量守恒 m₁v₁ + m₂v₂ = m₁v₁' + m₂v₂'
 */
const NewtonCradleExperiment = {
    id: 'newton-cradle', title: '牛顿摆', category: 'mechanics',
    description: '演示动量守恒和能量守恒定律。拉起一端的球释放后，动量通过碰撞传递到另一端的球。',

    state: {
        balls: [], // {angle, omega, x, y}
        paused: false,
        time: 0
    },

    params: {
        balls: { value: 5, min: 3, max: 7, step: 1, label: '球数量' },
        pullAngle: { value: 30, min: 10, max: 60, step: 1, label: '拉起角度 (°)' },
        pullSide: { value: 'left', type: 'select', options: ['left', 'right'], label: '拉起方向' }
    },

    animId: null, lastTime: null,

    init: function(canvas, controls, info) {
        this.canvas = canvas; this.ctx = canvas.getContext('2d');
        this.controlsEl = controls; this.infoEl = info;
        this.setupCanvas(); this.createControls(); this.reset();
        document.getElementById('exp-description').innerHTML =
            this.description +
            '<br><span style="font-size:11px;color:#aaa;">本仿真为理想无阻尼模型，所有小球质量相等、碰撞为完全弹性正碰；系统水平方向不受外力，水平动量守恒；无空气阻力时系统总机械能（动能+重力势能）恒定；真实实验存在阻力，动能会缓慢损耗。</span>';
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
                const opts = param.options.map(o => `<option value="${o}">${o === 'left' ? '左侧' : '右侧'}</option>`).join('');
                group.innerHTML = `<label>${param.label}</label><select data-key="${key}">${opts}</select>`;
                group.querySelector('select').value = param.value;
                group.querySelector('select').addEventListener('change', (e) => {
                    this.params[key].value = e.target.value;
                    this.reset();
                });
            } else {
                group.innerHTML = `
                    <label><span>${param.label}</span><span class="value" id="val-${key}">${param.value}</span></label>
                    <input type="range" min="${param.min}" max="${param.max}" step="${param.step}" value="${param.value}" data-key="${key}">`;
                group.querySelector('input').addEventListener('input', (e) => {
                    this.params[key].value = parseInt(e.target.value);
                    document.getElementById(`val-${key}`).textContent = e.target.value;
                    this.reset();
                });
            }
            this.controlsEl.appendChild(group);
        }
    },

    reset: function() {
        const n = this.params.balls.value;
        const cx = this.W / 2;
        const cy = 60;
        const spacing = 30;
        const len = 120;
        const ballR = 12;
        const startX = cx - (n - 1) * spacing / 2;

        this.state.balls = [];
        for (let i = 0; i < n; i++) {
            const isPull = (this.params.pullSide.value === 'left' && i === 0) ||
                           (this.params.pullSide.value === 'right' && i === n - 1);
            this.state.balls.push({
                x: startX + i * spacing,
                y: cy + len,
                angle: isPull ? Physics.toRad(this.params.pullAngle.value) * (this.params.pullSide.value === 'left' ? -1 : 1) : 0,
                omega: 0,
                anchorX: startX + i * spacing,
                anchorY: cy,
                len: len,
                radius: ballR,
                mass: 1,
                pulled: isPull
            });
        }
        this.state.time = 0;
        this.state.paused = true;
        this.lastTime = null;
        document.getElementById('btn-pause').textContent = '释放';
        document.getElementById('btn-pause').classList.add('paused');
        this.draw(); this.updateInfo();
    },

    togglePause: function() {
        if (this.state.paused) {
            this.state.paused = false;
            document.getElementById('btn-pause').textContent = '暂停';
            document.getElementById('btn-pause').classList.remove('paused');
            this.lastTime = performance.now();
            this.animate(this.lastTime);
        } else {
            this.state.paused = true;
            document.getElementById('btn-pause').textContent = '继续';
            document.getElementById('btn-pause').classList.add('paused');
            if (this.animId) { cancelAnimationFrame(this.animId); this.animId = null; }
        }
    },

    animate: function(timestamp) {
        if (this.state.paused) return;
        if (this.lastTime === null) this.lastTime = timestamp;
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.02);
        this.lastTime = timestamp;
        this.state.time += dt;

        const balls = this.state.balls;
        const n = balls.length;

        // 物理更新：单摆运动
        for (let i = 0; i < n; i++) {
            const b = balls[i];
            const result = Physics.pendulumMotion(b.angle, b.omega, b.len / 100, Physics.g, dt, 0.01);
            b.angle = result.theta;
            b.omega = result.omega;
        }

        // 碰撞检测（相邻球）
        for (let iter = 0; iter < 3; iter++) {
            for (let i = 0; i < n - 1; i++) {
                const b1 = balls[i], b2 = balls[i + 1];
                const x1 = b1.anchorX + b1.len * Math.sin(b1.angle);
                const y1 = b1.anchorY + b1.len * Math.cos(b1.angle);
                const x2 = b2.anchorX + b2.len * Math.sin(b2.angle);
                const y2 = b2.anchorY + b2.len * Math.cos(b2.angle);
                const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

                if (dist < b1.radius + b2.radius) {
                    // 弹性碰撞：交换角速度
                    const tempOmega = b1.omega;
                    b1.omega = b2.omega;
                    b2.omega = tempOmega;

                    // 分离球
                    const overlap = (b1.radius + b2.radius - dist) / 2;
                    const nx = (x2 - x1) / dist;
                    const ny = (y2 - y1) / dist;
                    b1.angle -= overlap / b1.len * nx;
                    b2.angle += overlap / b2.len * nx;
                }
            }
        }

        this.draw(); this.updateInfo();
        this.animId = requestAnimationFrame((t) => this.animate(t));
    },

    draw: function() {
        const ctx = this.ctx, W = this.W, H = this.H;
        Draw.clear(ctx, W, H);

        const balls = this.state.balls;
        const n = balls.length;

        // 绘制支架
        ctx.save();
        ctx.strokeStyle = '#888'; ctx.lineWidth = 3;
        const leftX = balls[0].anchorX - 20;
        const rightX = balls[n - 1].anchorX + 20;
        ctx.beginPath();
        ctx.moveTo(leftX, balls[0].anchorY);
        ctx.lineTo(rightX, balls[0].anchorY);
        ctx.stroke();
        // 支柱
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(leftX, balls[0].anchorY);
        ctx.lineTo(leftX, balls[0].anchorY + 15);
        ctx.moveTo(rightX, balls[0].anchorY);
        ctx.lineTo(rightX, balls[0].anchorY + 15);
        ctx.stroke();
        ctx.restore();

        // ① 悬点向下绘制竖直浅灰色基准虚线（展示拉起偏角参考线）
        ctx.save();
        ctx.strokeStyle = 'rgba(150,150,150,0.25)';
        ctx.lineWidth = 0.8;
        ctx.setLineDash([4, 6]);
        for (let i = 0; i < n; i++) {
            const b = balls[i];
            ctx.beginPath();
            ctx.moveTo(b.anchorX, b.anchorY);
            ctx.lineTo(b.anchorX, b.anchorY + b.len + b.radius + 8);
            ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.restore();

        // ③ 水平刻度标尺（画布底部，便于观察摆动高度）
        ctx.save();
        const rulerY = balls[0].anchorY + balls[0].len + balls[0].radius + 18;
        ctx.strokeStyle = 'rgba(150,150,150,0.3)';
        ctx.fillStyle = 'rgba(150,150,150,0.4)';
        ctx.lineWidth = 0.5;
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.beginPath();
        ctx.moveTo(leftX - 10, rulerY);
        ctx.lineTo(rightX + 10, rulerY);
        ctx.stroke();
        for (let x = leftX - 10; x <= rightX + 10; x += 20) {
            ctx.beginPath();
            ctx.moveTo(x, rulerY - 3);
            ctx.lineTo(x, rulerY + 3);
            ctx.stroke();
            if ((x - leftX + 10) % 40 === 0) {
                const idx = Math.round((x - balls[0].anchorX) / 30);
                if (idx >= 0 && idx < n) {
                    ctx.fillText(`${idx + 1}`, x, rulerY + 4);
                }
            }
        }
        ctx.restore();

        // 绘制小球、绳子及受力分析
        for (let i = 0; i < n; i++) {
            const b = balls[i];
            const bx = b.anchorX + b.len * Math.sin(b.angle);
            const by = b.anchorY + b.len * Math.cos(b.angle);

            // 绳子
            ctx.save();
            ctx.strokeStyle = '#999'; ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(b.anchorX, b.anchorY);
            ctx.lineTo(bx, by);
            ctx.stroke();
            ctx.restore();

            // 球
            const gradient = ctx.createRadialGradient(bx - 3, by - 3, 1, bx, by, b.radius);
            gradient.addColorStop(0, '#e74c3c');
            gradient.addColorStop(0.7, '#c0392b');
            gradient.addColorStop(1, '#922b21');
            ctx.save();
            ctx.beginPath(); ctx.arc(bx, by, b.radius, 0, 2 * Math.PI);
            ctx.fillStyle = gradient; ctx.fill();
            ctx.strokeStyle = '#922b21'; ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();

            // ② 受力箭头（仅对摆动中的小球绘制）
            const isMoving = Math.abs(b.angle) > 0.01 || Math.abs(b.omega) > 0.01;
            if (isMoving && !this.state.paused) {
                const arrowLen = 28;
                const headSize = 6;
                // 重力箭头：竖直向下（从球心出发）
                ctx.save();
                ctx.strokeStyle = 'rgba(46, 204, 113, 0.7)';
                ctx.fillStyle = 'rgba(46, 204, 113, 0.7)';
                ctx.lineWidth = 1.5;
                this.drawArrow(ctx, bx, by, bx, by + arrowLen, headSize);
                ctx.font = '9px sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                ctx.fillText('mg', bx + 3, by + 3);
                ctx.restore();

                // 拉力箭头：沿绳指向悬点
                const dx = b.anchorX - bx;
                const dy = b.anchorY - by;
                const d = Math.sqrt(dx * dx + dy * dy);
                if (d > 0) {
                    const tx = dx / d * arrowLen;
                    const ty = dy / d * arrowLen;
                    ctx.save();
                    ctx.strokeStyle = 'rgba(52, 152, 219, 0.7)';
                    ctx.fillStyle = 'rgba(52, 152, 219, 0.7)';
                    ctx.lineWidth = 1.5;
                    this.drawArrow(ctx, bx, by, bx + tx, by + ty, headSize);
                    ctx.font = '9px sans-serif';
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'bottom';
                    ctx.fillText('T', bx + tx + 3, by + ty - 2);
                    ctx.restore();
                }
            }
        }

        Draw.text(ctx, '等质量小球完全弹性一维碰撞会交换速度，中间小球仅传递动量，几乎无位移', W / 2, H - 20, '#999', 11, 'center', 'bottom');
        Draw.text(ctx, `t = ${this.state.time.toFixed(1)}s`, 12, 20, '#888', 12);
    },

    // 绘制箭头辅助方法
    drawArrow: function(ctx, x1, y1, x2, y2, headSize) {
        const angle = Math.atan2(y2 - y1, x2 - x1);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        // 箭头头部
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headSize * Math.cos(angle - 0.4), y2 - headSize * Math.sin(angle - 0.4));
        ctx.lineTo(x2 - headSize * Math.cos(angle + 0.4), y2 - headSize * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fill();
    },

    updateInfo: function() {
        const balls = this.state.balls;
        const g = Physics.g;
        let totalMomentum = 0, totalKE = 0, totalEP = 0;
        for (const b of balls) {
            const v = b.len / 100 * b.omega;
            totalMomentum += b.mass * v;
            totalKE += 0.5 * b.mass * v * v;
            // 势能：以最低点为零势能参考面
            const h = (b.len / 100) * (1 - Math.cos(b.angle));
            totalEP += b.mass * g * h;
        }
        const totalE = totalKE + totalEP;
        this.infoEl.innerHTML = `
            <div class="info-row"><span class="label">球数量</span><span class="value">${balls.length}</span></div>
            <div class="info-row"><span class="label">总动量</span><span class="value">${totalMomentum.toFixed(3)}</span></div>
            <div class="info-row"><span class="label">总动能</span><span class="value">${totalKE.toFixed(3)} J</span></div>
            <div class="info-row"><span class="label">重力势能 Ep</span><span class="value">${totalEP.toFixed(3)} J</span></div>
            <div class="info-row"><span class="label">总机械能 E</span><span class="value">${totalE.toFixed(3)} J</span></div>
            <div style="font-size:10px;color:#999;line-height:1.4;margin-top:4px;padding-top:4px;border-top:1px solid rgba(0,0,0,0.06);">重力势能以小球最低点为零势能参考面；所有小球质量完全相同。</div>
            <div class="info-row"><span class="label">运行时间</span><span class="value">${this.state.time.toFixed(1)} s</span></div>
        `;
    },

    resize: function() { this.setupCanvas(); this.draw(); }
};
