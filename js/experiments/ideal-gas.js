/**
 * 实验: 理想气体状态方程
 * 模拟气体分子在容器内的运动，展示压强、温度与体积的关系
 * 物理原理: PV = nRT, 压强源于分子与器壁的碰撞
 */
const IdealGasExperiment = {
    id: 'ideal-gas', title: '理想气体状态方程', category: 'thermodynamics',
    description: '模拟理想气体分子在容器中的运动。调节温度、体积和分子数，观察压强变化。验证理想气体状态方程 PV = nRT。',

    state: {
        particles: [],
        time: 0,
        isRunning: true,
        collisionCount: 0,
        wallImpulse: []
    },

    params: {
        temperature: { value: 300, min: 100, max: 800, step: 10, label: '温度 T (K)' },
        volume: { value: 50, min: 20, max: 100, step: 1, label: '体积 V (%)' },
        particleCount: { value: 50, min: 10, max: 200, step: 5, label: '分子数 N' }
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
                if (key === 'particleCount' || key === 'volume') {
                    this.adjustParticles();
                }
            });
            this.controlsEl.appendChild(group);
        }
    },

    adjustParticles: function() {
        const target = this.params.particleCount.value;
        const volPct = this.params.volume.value / 100;
        const container = this.getContainerBounds();

        while (this.state.particles.length < target) {
            this.state.particles.push(this.createParticle(container, false));
        }
        while (this.state.particles.length > target) {
            this.state.particles.pop();
        }

        // 重新约束所有粒子在容器内
        for (const p of this.state.particles) {
            p.x = Physics.clamp(p.x, container.x + p.r, container.x + container.w - p.r);
            p.y = Physics.clamp(p.y, container.y + p.r, container.y + container.h - p.r);
        }
    },

    getContainerBounds: function() {
        const volPct = this.params.volume.value / 100;
        const baseW = this.W * 0.55;
        const baseH = this.H * 0.65;
        const cw = baseW * volPct;
        const ch = baseH * volPct;
        const cx = this.W * 0.08 + (baseW - cw) / 2;
        const cy = this.H * 0.05 + (baseH - ch) / 2;
        return { x: cx, y: cy, w: cw, h: ch };
    },

    createParticle: function(container, randomSpeed) {
        const cx = container.x + container.w / 2;
        const cy = container.y + container.h / 2;
        const r = 3 + Math.random() * 2;

        // 速度与温度相关: v_rms = sqrt(3kT/m), 归一化
        const T = this.params.temperature.value;
        const speedScale = Math.sqrt(T / 300) * 40;
        const angle = randomSpeed ? Math.random() * 2 * Math.PI : (Math.random() * 2 * Math.PI);
        const speed = randomSpeed ? speedScale * (0.5 + Math.random()) : speedScale * (0.8 + Math.random() * 0.4);

        return {
            x: cx + (Math.random() - 0.5) * container.w * 0.8,
            y: cy + (Math.random() - 0.5) * container.h * 0.8,
            vx: speed * Math.cos(angle),
            vy: speed * Math.sin(angle),
            r: r,
            color: this.getParticleColor(speed)
        };
    },

    getParticleColor: function(speed) {
        // 高速=红色，低速=蓝色
        const maxSpeed = Math.sqrt(this.params.temperature.value / 300) * 80;
        const ratio = Physics.clamp(speed / maxSpeed, 0, 1);
        const r = Math.round(Physics.lerp(52, 231, ratio));
        const g = Math.round(Physics.lerp(152, 76, ratio));
        const b = Math.round(Physics.lerp(219, 60, ratio));
        return `rgb(${r},${g},${b})`;
    },

    reset: function() {
        this.state.particles = [];
        this.state.time = 0;
        this.state.isRunning = true;
        this.state.collisionCount = 0;
        this.state.wallImpulse = [];
        this.lastTime = null;

        const container = this.getContainerBounds();
        for (let i = 0; i < this.params.particleCount.value; i++) {
            this.state.particles.push(this.createParticle(container, true));
        }

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

        const container = this.getContainerBounds();
        const T = this.params.temperature.value;

        // 根据温度调整粒子速度
        const speedScale = Math.sqrt(T / 300);

        // 更新离子位置和碰撞检测
        const particles = this.state.particles;
        this.state.wallImpulse = [];
        this.state.collisionCount = 0;

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];

            // 更新位置
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // 与器壁碰撞
            // 左壁
            if (p.x - p.r < container.x) {
                p.x = container.x + p.r;
                p.vx = Math.abs(p.vx);
                this.state.collisionCount++;
                this.state.wallImpulse.push({ x: container.x, y: p.y });
            }
            // 右壁
            if (p.x + p.r > container.x + container.w) {
                p.x = container.x + container.w - p.r;
                p.vx = -Math.abs(p.vx);
                this.state.collisionCount++;
                this.state.wallImpulse.push({ x: container.x + container.w, y: p.y });
            }
            // 顶壁
            if (p.y - p.r < container.y) {
                p.y = container.y + p.r;
                p.vy = Math.abs(p.vy);
                this.state.collisionCount++;
                this.state.wallImpulse.push({ x: p.x, y: container.y });
            }
            // 底壁（活塞）
            if (p.y + p.r > container.y + container.h) {
                p.y = container.y + container.h - p.r;
                p.vy = -Math.abs(p.vy);
                this.state.collisionCount++;
                this.state.wallImpulse.push({ x: p.x, y: container.y + container.h });
            }

            // 更新颜色
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            p.color = this.getParticleColor(speed);
        }

        // 粒子间碰撞检测
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const a = particles[i], b = particles[j];
                const dx = b.x - a.x, dy = b.y - a.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const minDist = a.r + b.r;
                if (dist < minDist && dist > 0.001) {
                    // 分离重叠
                    const overlap = minDist - dist;
                    const nx = dx / dist, ny = dy / dist;
                    a.x -= nx * overlap / 2;
                    a.y -= ny * overlap / 2;
                    b.x += nx * overlap / 2;
                    b.y += ny * overlap / 2;

                    // 弹性碰撞
                    const dvx = a.vx - b.vx, dvy = a.vy - b.vy;
                    const dvDotN = dvx * nx + dvy * ny;
                    if (dvDotN > 0) {
                        a.vx -= dvDotN * nx;
                        a.vy -= dvDotN * ny;
                        b.vx += dvDotN * nx;
                        b.vy += dvDotN * ny;
                    }
                }
            }
        }

        // 限制壁碰撞脉冲数量
        if (this.state.wallImpulse.length > 100) {
            this.state.wallImpulse = this.state.wallImpulse.slice(-100);
        }

        this.draw(); this.updateInfo();
        this.animId = requestAnimationFrame((t) => this.animate(t));
    },

    draw: function() {
        const ctx = this.ctx, W = this.W, H = this.H;
        Draw.clear(ctx, W, H);

        const container = this.getContainerBounds();

        // === 左侧: 气体容器 ===
        // 容器背景
        ctx.save();
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(container.x, container.y, container.w, container.h);
        ctx.restore();

        // 容器壁
        const wallThick = 4;
        ctx.save();
        const wallGradTop = ctx.createLinearGradient(0, container.y - wallThick, 0, container.y);
        wallGradTop.addColorStop(0, '#555');
        wallGradTop.addColorStop(1, '#888');
        ctx.fillStyle = '#777';
        // 上壁
        ctx.fillRect(container.x - wallThick, container.y - wallThick, container.w + wallThick * 2, wallThick);
        // 左壁
        ctx.fillRect(container.x - wallThick, container.y - wallThick, wallThick, container.h + wallThick * 2);
        // 右壁
        ctx.fillRect(container.x + container.w, container.y - wallThick, wallThick, container.h + wallThick * 2);
        // 下壁（较厚 - 活塞）
        const pistonH = 8;
        ctx.fillStyle = '#888';
        ctx.fillRect(container.x - wallThick, container.y + container.h, container.w + wallThick * 2, pistonH);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.strokeRect(container.x - wallThick, container.y + container.h, container.w + wallThick * 2, pistonH);
        ctx.restore();

        // 活塞标签
        Draw.text(ctx, '活塞', container.x + container.w / 2, container.y + container.h + 14, '#666', 11, 'center');

        // 容器标签
        Draw.text(ctx, '理想气体容器', container.x + container.w / 2, container.y - 12, '#666', 12, 'center', 'bottom');

        // 碰撞闪光
        for (const imp of this.state.wallImpulse.slice(-30)) {
            ctx.save();
            ctx.fillStyle = 'rgba(255, 165, 0, 0.3)';
            ctx.beginPath();
            ctx.arc(imp.x, imp.y, 4, 0, 2 * Math.PI);
            ctx.fill();
            ctx.restore();
        }

        // 绘制粒子
        for (const p of this.state.particles) {
            ctx.save();
            const grad = ctx.createRadialGradient(p.x - 1, p.y - 1, 0.5, p.x, p.y, p.r);
            grad.addColorStop(0, 'rgba(255,255,255,0.4)');
            grad.addColorStop(0.5, p.color);
            grad.addColorStop(1, 'rgba(0,0,0,0.1)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, 2 * Math.PI);
            ctx.fill();

            // 速度矢量
            const vx = p.vx, vy = p.vy;
            const vLen = Math.sqrt(vx * vx + vy * vy);
            if (vLen > 1) {
                ctx.strokeStyle = p.color.replace('rgb', 'rgba').replace(')', ',0.4)');
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x + vx * 0.15, p.y + vy * 0.15);
                ctx.stroke();
            }
            ctx.restore();
        }

        // === 右侧: 信息面板 ===
        const infoX = container.x + container.w + 30;
        const infoY = container.y;
        const infoW = W - infoX - 20;
        const infoH = container.h;

        // P-V 关系图
        const graphH = infoH * 0.55;
        const graphY = infoY;
        const graphW = infoW;

        ctx.save();
        ctx.fillStyle = '#fafafa';
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        ctx.fillRect(infoX, graphY, graphW, graphH);
        ctx.strokeRect(infoX, graphY, graphW, graphH);
        Draw.text(ctx, 'P-V 关系', infoX + graphW / 2, graphY - 6, '#666', 12, 'center', 'bottom');

        // 图中坐标轴
        const gx = infoX + 35, gy = graphY + 5;
        const gw = graphW - 45, gh = graphH - 30;
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + gh);
        ctx.moveTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh);
        ctx.stroke();
        Draw.text(ctx, 'P', gx - 15, gy + gh / 2, '#888', 11, 'center', 'middle');
        Draw.text(ctx, 'V', gx + gw / 2, gy + gh + 16, '#888', 11, 'center', 'top');

        // 理论曲线 P = nRT/V (一条反比例曲线)
        const T = this.params.temperature.value;
        const N = this.params.particleCount.value;
        const n = N / 6.022e23 * 1e22; // 缩放到合适范围
        const R = 8.314;

        ctx.save();
        ctx.strokeStyle = '#7c8a9e';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.beginPath();
        let started = false;
        for (let i = 10; i <= 100; i++) {
            const Vrel = i / 100;
            const P = n * R * T / Vrel * 1e-24;
            const px = gx + Vrel * gw;
            const py = gy + gh - Math.min(P / 50, 1) * gh;
            if (!started) { ctx.moveTo(px, py); started = true; }
            else ctx.lineTo(px, py);
        }
        ctx.stroke();

        // 当前点
        const currentV = this.params.volume.value / 100;
        const currentP = n * R * T / currentV * 1e-24;
        const cpx = gx + currentV * gw;
        const cpy = gy + gh - Math.min(currentP / 50, 1) * gh;
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(cpx, cpy, 5, 0, 2 * Math.PI);
        ctx.fill();
        Draw.text(ctx, '当前', cpx + 10, cpy - 8, '#e74c3c', 10);
        ctx.restore();

        // P-T 关系图
        const graph2Y = graphY + graphH + 10;
        const graph2H = infoH - graphH - 15;

        ctx.save();
        ctx.fillStyle = '#fafafa';
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        ctx.fillRect(infoX, graph2Y, graphW, graph2H);
        ctx.strokeRect(infoX, graph2Y, graphW, graph2H);
        Draw.text(ctx, 'P-T 关系 (V固定)', infoX + graphW / 2, graph2Y - 6, '#666', 12, 'center', 'bottom');

        const g2x = infoX + 35, g2y = graph2Y + 5;
        const g2w = graphW - 45, g2h = graph2H - 20;
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(g2x, g2y); ctx.lineTo(g2x, g2y + g2h);
        ctx.moveTo(g2x, g2y + g2h); ctx.lineTo(g2x + g2w, g2y + g2h);
        ctx.stroke();
        Draw.text(ctx, 'P', g2x - 15, g2y + g2h / 2, '#888', 11, 'center', 'middle');
        Draw.text(ctx, 'T', g2x + g2w / 2, g2y + g2h + 14, '#888', 11, 'center', 'top');

        // 线性关系 P ∝ T
        ctx.save();
        ctx.strokeStyle = '#2ecc71';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const Tmin = 0, Tmax = 1000;
        const Pmin = n * R * Tmin / currentV * 1e-24;
        const Pmax = n * R * Tmax / currentV * 1e-24;
        ctx.moveTo(g2x, g2y + g2h);
        ctx.lineTo(g2x + g2w, g2y + g2h - (Pmax / 50) * g2h);
        ctx.stroke();

        // 当前点
        const c2px = g2x + (T / Tmax) * g2w;
        const c2py = g2y + g2h - Math.min(currentP / 50, 1) * g2h;
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath();
        ctx.arc(c2px, c2py, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();

        // 底部统计信息
        const avgSpeed = this.state.particles.reduce((s, p) => {
            return s + Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        }, 0) / Math.max(1, this.state.particles.length);

        Draw.text(ctx, `N = ${this.state.particles.length} | T = ${T}K | V = ${this.params.volume.value}% | v̄ = ${avgSpeed.toFixed(0)} px/s`,
            infoX + infoW / 2, container.y + container.h - 10, '#888', 11, 'center', 'bottom');
        Draw.text(ctx, `碰撞/秒: ${(this.state.collisionCount / Math.max(0.001, 0.04)).toFixed(0)}`,
            W / 2, H - 8, '#aaa', 10, 'center', 'bottom');

        // 图例
        Draw.text(ctx, '● 高速粒子 → ● 低速粒子', container.x, container.y + container.h + 32, '#888', 10);
    },

    updateInfo: function() {
        const T = this.params.temperature.value;
        const Vpct = this.params.volume.value;
        const N = this.params.particleCount.value;

        // 归一化理想气体计算
        const n = N / 100; // 任意归一化摩尔数
        const R = 8.314;
        const V = Vpct * 0.001; // 换算到 m³
        const P = n * R * T / V;
        const P_atm = P / 101325;

        // 计算平均动能
        const kb = 1.381e-23;
        const avgKE = 1.5 * kb * T;
        const rmsSpeed = Math.sqrt(3 * R * T / (0.028)); // kg/mol (N₂ ~ 28)

        // 碰撞频率估计
        const collisionsPerSec = this.state.collisionCount > 0 ?
            (this.state.collisionCount / Math.max(0.001, 0.04)).toFixed(0) : '0';

        this.infoEl.innerHTML = `
            <div class="info-row"><span class="label">温度 T</span><span class="value">${T} K</span></div>
            <div class="info-row"><span class="label">体积 V</span><span class="value">${Vpct} %</span></div>
            <div class="info-row"><span class="label">分子数 N</span><span class="value">${N}</span></div>
            <div class="info-row"><span class="label">压强 P</span><span class="value">${P.toFixed(0)} Pa (${P_atm.toFixed(4)} atm)</span></div>
            <div class="info-row"><span class="label">PV/nT</span><span class="value">${(P * V / (n * T)).toFixed(3)} ≈ R(${R.toFixed(1)})</span></div>
            <div class="info-row"><span class="label">平均动能</span><span class="value">${(avgKE * 1e21).toFixed(2)} ×10⁻²¹ J</span></div>
            <div class="info-row"><span class="label">方均根速率</span><span class="value">${rmsSpeed.toFixed(0)} m/s</span></div>
            <div class="info-row"><span class="label">碰壁频率</span><span class="value">${collisionsPerSec} /s</span></div>
        `;
    },

    resize: function() { this.setupCanvas(); this.draw(); }
};
