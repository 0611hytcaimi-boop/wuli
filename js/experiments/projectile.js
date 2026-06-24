/**
 * 实验2: 抛体运动
 * 模拟物体在重力作用下的抛物运动，支持调节初速度、角度和空气阻力
 * 物理原理: 水平匀速，竖直匀加速 x = v₀cosθ·t, y = v₀sinθ·t - ½gt²
 */
const ProjectileExperiment = {
    id: 'projectile', title: '抛体运动', category: 'mechanics',
    description: '研究抛体运动的轨迹，可调节初速度、抛射角度和空气阻力。射程公式 R = v₀²sin2θ/g 仅适用于无空气阻力、抛出落地高度相同的理想斜抛。',

    state: { x: 0, y: 0, vx: 0, vy: 0, t: 0, trail: [], isRunning: false, launched: false },

    params: {
        velocity: { value: 20, min: 5, max: 50, step: 1, label: '初速度 v₀ (m/s)' },
        angle: { value: 45, min: 5, max: 85, step: 1, label: '抛射角 θ (°)' },
        airResistance: { value: 0, min: 0, max: 0.1, step: 0.005, label: '空气阻力系数' }
    },

    info: {}, animId: null, lastTime: null,

    init: function(canvas, controls, info) {
        this.canvas = canvas; this.ctx = canvas.getContext('2d');
        this.controlsEl = controls; this.infoEl = info;
        this.setupCanvas(); this.createControls(); this.reset();
        document.getElementById('exp-description').innerHTML =
            '研究抛体运动的轨迹，可调节初速度、抛射角度和空气阻力。' +
            '<br><span style="font-size:11px;color:#aaa;">射程公式 R = v₀²sin2θ/g 仅适用于无空气阻力、抛出落地高度相同的理想斜抛；空气阻力不为0时，实际射程会小于理论计算值；' +
            '理想无阻力等高斜抛，θ=45°时射程达到最大值</span>';
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
                if (!this.state.launched) this.reset();
            });
            // 空气阻力补充说明
            if (key === 'airResistance') {
                const note = document.createElement('div');
                note.style.cssText = 'font-size:11px;color:var(--text-secondary);margin-top:2px;line-height:1.4;';
                note.textContent = '数值越大，空气阻力越强，轨迹衰减越明显';
                group.appendChild(note);
            }
            this.controlsEl.appendChild(group);
        }
    },

    reset: function() {
        const angle = Physics.toRad(this.params.angle.value);
        const v = this.params.velocity.value;
        this.state.x = 0; this.state.y = 0;
        this.state.vx = v * Math.cos(angle);
        this.state.vy = -v * Math.sin(angle);
        this.state.t = 0;
        this.state.trail = [{ x: 0, y: 0 }];
        this.state.isRunning = false;
        this.state.launched = false;
        this.lastTime = null;
        document.getElementById('btn-pause').textContent = '发射';
        document.getElementById('btn-pause').classList.remove('paused');
        this.draw(); this.updateInfo();
    },

    togglePause: function() {
        if (!this.state.launched) {
            this.state.launched = true;
            this.state.isRunning = true;
            document.getElementById('btn-pause').textContent = '暂停';
            this.lastTime = performance.now();
            this.animate(this.lastTime);
        } else {
            this.state.isRunning = !this.state.isRunning;
            document.getElementById('btn-pause').textContent = this.state.isRunning ? '暂停' : '继续';
            if (this.state.isRunning) {
                this.lastTime = performance.now();
                this.animate(this.lastTime);
            } else {
                if (this.animId) { cancelAnimationFrame(this.animId); this.animId = null; }
            }
        }
    },

    animate: function(timestamp) {
        if (!this.state.isRunning) return;
        if (this.lastTime === null) this.lastTime = timestamp;
        let dt = Math.min((timestamp - this.lastTime) / 1000, 0.02);
        if (dt <= 0) dt = 0.016; // 首帧最小步长，避免 dt=0 导致落地误判
        this.lastTime = timestamp;

        const ar = this.params.airResistance.value;
        const result = Physics.projectileMotion(
            this.state.x, this.state.y, this.state.vx, this.state.vy, dt, ar
        );
        this.state.x = result.x; this.state.y = result.y;
        this.state.vx = result.vx; this.state.vy = result.vy;
        this.state.t += dt;

        this.state.trail.push({ x: this.state.x, y: this.state.y });

        // 检查落地
        if (this.state.y >= 0) {
            this.state.y = 0;
            this.state.isRunning = false;
            this.state.launched = false;
            document.getElementById('btn-pause').textContent = '发射';
            document.getElementById('btn-pause').classList.remove('paused');
            if (this.animId) { cancelAnimationFrame(this.animId); this.animId = null; }
        }

        this.draw(); this.updateInfo();
        if (this.state.isRunning)
            this.animId = requestAnimationFrame((t) => this.animate(t));
    },

    draw: function() {
        const ctx = this.ctx, W = this.W, H = this.H;
        Draw.clear(ctx, W, H);

        // 缩放和偏移
        const maxRange = this.params.velocity.value ** 2 / Physics.g * 1.5;
        const maxHeight = this.params.velocity.value ** 2 / (2 * Physics.g) * 1.5;
        const scale = Math.min((W - 80) / Math.max(maxRange, 1), (H - 80) / Math.max(maxHeight, 1));
        const ox = 40, oy = H - 40;

        // 绘制网格和地面
        Draw.grid(ctx, W, H, 50, '#f5f5f5');
        ctx.save();
        ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, oy); ctx.lineTo(W, oy); ctx.stroke();
        // 地面纹理
        ctx.fillStyle = '#e8e0d0';
        ctx.fillRect(0, oy + 1, W, H - oy);
        ctx.restore();

        // === 坐标轴标注 ===
        ctx.save();
        ctx.fillStyle = '#999'; ctx.font = '11px -apple-system, sans-serif';
        // 原点 O(0,0)
        ctx.fillText('O(0,0)', ox - 22, oy + 16);
        // 横轴
        ctx.fillText('x → 水平位移', W - 70, oy - 4);
        // 纵轴
        ctx.save();
        ctx.translate(ox - 2, 12);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('y ↑ 竖直高度', 0, 0);
        ctx.restore();
        ctx.restore();

        // === 运动分解说明（始终显示在画布顶部） ===
        Draw.text(ctx, '水平方向：不受力，匀速直线运动  vₓ = v₀cosθ', W * 0.5, 10, '#555', 11, 'center', 'top');
        Draw.text(ctx, '竖直方向：只受重力，匀变速运动  vᵧ = v₀sinθ − gt', W * 0.5, 24, '#555', 11, 'center', 'top');

        // 坐标转换（物理 y 负值 = 高于地面 → 画布上方）
        const toScreen = (x, y) => [ox + x * scale, oy + y * scale];

        // 绘制轨迹
        if (this.state.trail.length > 1) {
            ctx.save();
            ctx.strokeStyle = '#7c8a9e'; ctx.lineWidth = 2.5;
            ctx.beginPath();
            const [sx, sy] = toScreen(this.state.trail[0].x, this.state.trail[0].y);
            ctx.moveTo(sx, sy);
            for (let i = 1; i < this.state.trail.length; i++) {
                const [px, py] = toScreen(this.state.trail[i].x, this.state.trail[i].y);
                ctx.lineTo(px, py);
            }
            ctx.stroke();
            ctx.restore();
        }

        // 绘制预测轨迹（虚线）
        if (!this.state.launched) {
            const angle = Physics.toRad(this.params.angle.value);
            const v = this.params.velocity.value;
            const vx = v * Math.cos(angle), vy = -v * Math.sin(angle);
            const ar = this.params.airResistance.value;
            ctx.save();
            ctx.strokeStyle = 'rgba(124, 138, 158, 0.3)'; ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 5]); ctx.beginPath();
            let px = 0, py = 0, pvx = vx, pvy = vy;
            const [sx, sy] = toScreen(0, 0); ctx.moveTo(sx, sy);
            for (let i = 1; i < 100; i++) {
                const dt = 0.05;
                const r = Physics.projectileMotion(px, py, pvx, pvy, dt, ar);
                px = r.x; py = r.y; pvx = r.vx; pvy = r.vy;
                if (py >= 0) break;
                const [dx, dy] = toScreen(px, py);
                ctx.lineTo(dx, dy);
            }
            ctx.stroke(); ctx.restore();
        }

        // 绘制球体
        if (this.state.launched || !this.state.trail || this.state.trail.length <= 1) {
            const [bx, by] = toScreen(this.state.x, this.state.y);
            const gradient = ctx.createRadialGradient(bx - 3, by - 3, 1, bx, by, 8);
            gradient.addColorStop(0, '#e74c3c'); gradient.addColorStop(1, '#c0392b');
            ctx.save();
            ctx.beginPath(); ctx.arc(bx, by, 8, 0, 2 * Math.PI);
            ctx.fillStyle = gradient; ctx.fill();
            ctx.restore();

            // === 受力箭头（小球飞行中） ===
            if (this.state.launched && this.state.y < 0) {
                const aSize = 5;
                // ① 重力 G = mg（竖直向下）
                ctx.save();
                ctx.setLineDash([4, 5]);
                ctx.strokeStyle = '#9b59b6'; ctx.lineWidth = 1.5;
                const gLen = 25;
                ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, by + gLen); ctx.stroke();
                ctx.setLineDash([]);
                ctx.beginPath();
                ctx.moveTo(bx, by + gLen);
                ctx.lineTo(bx - aSize, by + gLen - aSize);
                ctx.moveTo(bx, by + gLen);
                ctx.lineTo(bx + aSize, by + gLen - aSize);
                ctx.stroke();
                Draw.text(ctx, 'G', bx + 8, by + gLen / 2 - 4, '#9b59b6', 10, 'left', 'middle');
                ctx.restore();

                // ② 空气阻力（与速度反向，仅阻力系数 > 0 时显示）
                const ar = this.params.airResistance.value;
                if (ar > 0.001) {
                    // 速度方向单位向量
                    const vx = this.state.vx, vy = this.state.vy;
                    const speed = Math.sqrt(vx * vx + vy * vy);
                    if (speed > 0.01) {
                        const dragLen = Math.min(30, 15 + ar * speed * 50);
                        const ndx = -vx / speed, ndy = -vy / speed;
                        ctx.save();
                        ctx.strokeStyle = '#e67e22'; ctx.lineWidth = 1.5;
                        ctx.beginPath(); ctx.moveTo(bx, by);
                        ctx.lineTo(bx + ndx * dragLen, by + ndy * dragLen);
                        ctx.stroke();
                        // 箭头头
                        const adx = ndx * aSize, ady = ndy * aSize;
                        const perpX = -ndy, perpY = ndx;
                        ctx.beginPath();
                        ctx.moveTo(bx + adx, by + ady);
                        ctx.lineTo(bx + adx - perpX * aSize * 0.5, by + ady - perpY * aSize * 0.5);
                        ctx.moveTo(bx + adx, by + ady);
                        ctx.lineTo(bx + adx + perpX * aSize * 0.5, by + ady + perpY * aSize * 0.5);
                        ctx.stroke();
                        Draw.text(ctx, 'f', bx + ndx * (dragLen + 10), by + ndy * (dragLen + 10), '#e67e22', 10, 'center', 'middle');
                        ctx.restore();
                    }
                }
            }
        }

        if (!this.state.launched) {
            // 绘制初始速度矢量
            const angle = Physics.toRad(this.params.angle.value);
            const v = this.params.velocity.value;
            const [sx, sy] = toScreen(0, 0);
            const [ex, ey] = toScreen(v * 0.3 * Math.cos(angle), -v * 0.3 * Math.sin(angle));
            Draw.arrowLine(ctx, sx, sy, ex, ey, '#e74c3c', 2);
            Draw.text(ctx, 'v₀', ex + 8, ey - 8, '#e74c3c', 13);

            // 角度弧
            const ar = 30;
            ctx.save();
            ctx.strokeStyle = '#e67e22'; ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(sx, sy, ar, -Physics.toRad(this.params.angle.value), 0);
            ctx.stroke();
            Draw.text(ctx, `${this.params.angle.value}°`, sx + ar * 0.7, sy - ar * 0.5, '#e67e22', 12);
            ctx.restore();
        }

        // 考点提示（画布底部右侧）
        Draw.text(ctx, '💡 理想无阻力等高斜抛，θ = 45° 时射程达到最大值',
            W - 12, H - 10, '#bbb', 10, 'right', 'bottom');

        // 显示射程和高度
        if (this.state.launched) {
            const rangeX = this.state.x;
            const maxHeight = Math.abs(Math.min(...this.state.trail.map(p => p.y)));
            Draw.text(ctx, `射程: ${rangeX.toFixed(1)} m`, 12, 44, '#333', 12);
            Draw.text(ctx, `最大高度: ${maxHeight.toFixed(1)} m`, 12, 60, '#333', 12);
        }
    },

    updateInfo: function() {
        const angle = this.params.angle.value;
        const v = this.params.velocity.value;
        const angleRad = Physics.toRad(angle);
        const range = v * v * Math.sin(2 * angleRad) / Physics.g;
        const maxH = v * v * Math.sin(angleRad) ** 2 / (2 * Physics.g);
        const flightT = 2 * v * Math.sin(angleRad) / Physics.g;

        this.infoEl.innerHTML = `
            <div style="border-top:none;margin-bottom:2px;"><span style="font-size:10px;color:#999;">【实时仿真实际值】</span></div>
            <div class="info-row"><span class="label">水平速度 vₓ</span><span class="value">${this.state.vx.toFixed(2)} m/s</span></div>
            <div class="info-row"><span class="label">竖直速度 vᵧ</span><span class="value">${(-this.state.vy).toFixed(2)} m/s</span></div>
            <div class="info-row"><span class="label">当前位置 (x, y)</span><span class="value">(${this.state.x.toFixed(1)}, ${(-this.state.y).toFixed(1)}) m</span></div>
            <div class="info-row"><span class="label">当前时间 t</span><span class="value">${this.state.t.toFixed(2)} s</span></div>
            <div style="border-top:1px solid var(--border);margin:6px 0 4px;"></div>
            <div style="font-size:10px;color:#999;margin-bottom:2px;">【理想无阻力理论值】</div>
            <div class="info-row"><span class="label">射程 R</span><span class="value">${range.toFixed(2)} m</span></div>
            <div class="info-row"><span class="label">最大高度 H</span><span class="value">${maxH.toFixed(2)} m</span></div>
            <div class="info-row"><span class="label">飞行时间 T</span><span class="value">${flightT.toFixed(2)} s</span></div>
        `;
    },

    resize: function() { this.setupCanvas(); this.draw(); }
};
