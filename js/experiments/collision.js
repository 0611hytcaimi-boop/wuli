/**
 * 实验: 双小球刚体碰撞
 * 模拟两个小球的碰撞过程，研究动量守恒与能量守恒
 * 物理原理: 弹性碰撞 m₁v₁+m₂v₂=m₁v₁'+m₂v₂', 非弹性碰撞动量守恒但动能不守恒
 */
const CollisionExperiment = {
    id: 'collision', title: '双小球刚体碰撞', category: 'mechanics',
    description: '研究两个小球在直线上的碰撞过程。调节质量、速度和弹性系数，观察碰撞前后的动量和能量变化。验证动量守恒定律。',

    state: {
        // Ball 1
        x1: 0, v1: 0,
        // Ball 2
        x2: 0, v2: 0,
        time: 0,
        isRunning: false,
        hasCollided: false,
        // 碰撞前后记录
        pBefore: 0, pAfter: 0,
        keBefore: 0, keAfter: 0,
        v1Before: 0, v2Before: 0,
        v1After: 0, v2After: 0,
        trail1: [], trail2: [],
        collisionTime: 0,
        mode1D: true  // 1D collision
    },

    params: {
        mass1: { value: 2, min: 0.5, max: 10, step: 0.5, label: '球1质量 m₁ (kg)' },
        mass2: { value: 2, min: 0.5, max: 10, step: 0.5, label: '球2质量 m₂ (kg)' },
        velocity1: { value: 3, min: -5, max: 5, step: 0.1, label: '球1初速 v₁ (m/s)' },
        velocity2: { value: -2, min: -5, max: 5, step: 0.1, label: '球2初速 v₂ (m/s)' },
        elasticity: { value: 1, min: 0, max: 1, step: 0.05, label: '弹性系数 e (0=完全非弹性, 1=完全弹性)' }
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
                if (!this.state.isRunning) this.reset();
            });
            this.controlsEl.appendChild(group);
        }
    },

    reset: function() {
        const m1 = this.params.mass1.value;
        const m2 = this.params.mass2.value;
        const v1 = this.params.velocity1.value;
        const v2 = this.params.velocity2.value;

        // 1D碰撞 - 两球在水平线上
        const trackY = this.H * 0.55;
        const centerX = this.W * 0.5;

        this.state.x1 = centerX - 120;
        this.state.v1 = v1;
        this.state.x2 = centerX + 120;
        this.state.v2 = v2;

        this.state.time = 0;
        this.state.isRunning = false;
        this.state.hasCollided = false;
        this.state.trail1 = [{ x: this.state.x1, t: 0 }];
        this.state.trail2 = [{ x: this.state.x2, t: 0 }];
        this.state.collisionTime = 0;

        // 初始动量和动能
        this.state.pBefore = m1 * v1 + m2 * v2;
        this.state.keBefore = 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2;
        this.state.pAfter = 0;
        this.state.keAfter = 0;
        this.state.v1Before = v1;
        this.state.v2Before = v2;
        this.state.v1After = 0;
        this.state.v2After = 0;

        this.lastTime = null;
        document.getElementById('btn-pause').textContent = '开始碰撞';
        document.getElementById('btn-pause').classList.remove('paused');
        this.draw(); this.updateInfo();
    },

    togglePause: function() {
        if (this.state.hasCollided) {
            this.reset();
            return;
        }
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

        const speedScale = 40; // 像素/单位速度/秒

        // 移动两球
        this.state.x1 += this.state.v1 * speedScale * dt;
        this.state.x2 += this.state.v2 * speedScale * dt;
        this.state.time += dt;

        // 轨迹
        this.state.trail1.push({ x: this.state.x1, t: this.state.time });
        this.state.trail2.push({ x: this.state.x2, t: this.state.time });
        if (this.state.trail1.length > 500) this.state.trail1.shift();
        if (this.state.trail2.length > 500) this.state.trail2.shift();

        // 碰撞检测 (球心距离)
        const radius1 = Math.max(12, Math.min(30, 14 + this.params.mass1.value * 1.5));
        const radius2 = Math.max(12, Math.min(30, 14 + this.params.mass2.value * 1.5));
        const minDist = radius1 + radius2;

        if (!this.state.hasCollided && Math.abs(this.state.x2 - this.state.x1) <= minDist &&
            (this.state.v1 - this.state.v2 > 0)) {
            // 碰撞发生
            const m1 = this.params.mass1.value;
            const m2 = this.params.mass2.value;
            const e = this.params.elasticity.value;
            const v1 = this.state.v1;
            const v2 = this.state.v2;

            // 保存碰撞前数据
            this.state.v1Before = v1;
            this.state.v2Before = v2;

            // 使用弹性/非弹性碰撞公式
            let newV1, newV2;
            if (e >= 0.999) {
                // 完全弹性碰撞
                const result = Physics.elasticCollision1D(m1, m2, v1, v2);
                newV1 = result.v1;
                newV2 = result.v2;
            } else {
                // 非完全弹性/完全非弹性碰撞
                const result = Physics.inelasticCollision1D(m1, m2, v1, v2, e);
                newV1 = result.v1;
                newV2 = result.v2;
            }

            this.state.v1 = newV1;
            this.state.v2 = newV2;
            this.state.v1After = newV1;
            this.state.v2After = newV2;
            this.state.hasCollided = true;
            this.state.collisionTime = this.state.time;

            // 分离球体避免重叠
            const overlap = minDist - Math.abs(this.state.x2 - this.state.x1);
            if (overlap > 0) {
                if (this.state.x1 < this.state.x2) {
                    this.state.x1 -= overlap / 2;
                    this.state.x2 += overlap / 2;
                } else {
                    this.state.x1 += overlap / 2;
                    this.state.x2 -= overlap / 2;
                }
            }

            // 记录碰撞后动量和动能
            this.state.pAfter = m1 * newV1 + m2 * newV2;
            this.state.keAfter = 0.5 * m1 * newV1 * newV1 + 0.5 * m2 * newV2 * newV2;

            document.getElementById('btn-pause').textContent = '重新开始';
        }

        // 检查是否两球跑出视野
        const margin = 80;
        const bothOutLeft = this.state.x1 < -margin && this.state.x2 < -margin;
        const bothOutRight = this.state.x1 > this.W + margin && this.state.x2 > this.W + margin;
        if (bothOutLeft || bothOutRight) {
            this.state.isRunning = false;
            this.state.hasCollided = true;
            document.getElementById('btn-pause').textContent = '重新开始';
            document.getElementById('btn-pause').classList.add('paused');
            if (this.animId) { cancelAnimationFrame(this.animId); this.animId = null; }
        }

        this.draw(); this.updateInfo();
        if (this.state.isRunning)
            this.animId = requestAnimationFrame((t) => this.animate(t));
    },

    draw: function() {
        const ctx = this.ctx, W = this.W, H = this.H;
        Draw.clear(ctx, W, H);

        const m1 = this.params.mass1.value;
        const m2 = this.params.mass2.value;
        const e = this.params.elasticity.value;
        const trackY = H * 0.55;

        // 水平轨道
        ctx.save();
        ctx.fillStyle = '#f0f0e8';
        ctx.fillRect(0, trackY + 35, W, H - trackY - 35);
        ctx.strokeStyle = '#888'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, trackY + 35); ctx.lineTo(W, trackY + 35); ctx.stroke();
        // 轨道线
        ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.beginPath(); ctx.moveTo(20, trackY); ctx.lineTo(W - 20, trackY); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // 半径（与质量成正比）
        const r1 = Math.max(12, Math.min(30, 14 + m1 * 1.5));
        const r2 = Math.max(12, Math.min(30, 14 + m2 * 1.5));

        // 轨迹
        if (this.state.trail1.length > 1) {
            ctx.save();
            ctx.strokeStyle = 'rgba(124,138,158,0.2)'; ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.state.trail1[0].x, trackY);
            for (let i = 1; i < this.state.trail1.length; i++) {
                ctx.lineTo(this.state.trail1[i].x, trackY);
            }
            ctx.stroke();
            ctx.restore();
        }
        if (this.state.trail2.length > 1) {
            ctx.save();
            ctx.strokeStyle = 'rgba(231,76,60,0.2)'; ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.state.trail2[0].x, trackY);
            for (let i = 1; i < this.state.trail2.length; i++) {
                ctx.lineTo(this.state.trail2[i].x, trackY);
            }
            ctx.stroke();
            ctx.restore();
        }

        // Ball 1
        const grad1 = ctx.createRadialGradient(this.state.x1 - 2, trackY - 2, 2, this.state.x1, trackY, r1);
        grad1.addColorStop(0, '#7ba5ff');
        grad1.addColorStop(0.7, '#7c8a9e');
        grad1.addColorStop(1, '#5a6a7e');
        ctx.save();
        ctx.beginPath(); ctx.arc(this.state.x1, trackY, r1, 0, 2 * Math.PI);
        ctx.fillStyle = grad1; ctx.fill();
        ctx.strokeStyle = '#5a6a7e'; ctx.lineWidth = 1.5;
        ctx.stroke();
        Draw.text(ctx, `${m1}kg`, this.state.x1, trackY + 1, 'white', 11, 'center', 'middle');
        // 质量标签
        Draw.text(ctx, 'm₁', this.state.x1, trackY - r1 - 10, '#7c8a9e', 12, 'center', 'bottom');
        ctx.restore();

        // Ball 2
        const grad2 = ctx.createRadialGradient(this.state.x2 - 2, trackY - 2, 2, this.state.x2, trackY, r2);
        grad2.addColorStop(0, '#f58a7c');
        grad2.addColorStop(0.7, '#e74c3c');
        grad2.addColorStop(1, '#922b21');
        ctx.save();
        ctx.beginPath(); ctx.arc(this.state.x2, trackY, r2, 0, 2 * Math.PI);
        ctx.fillStyle = grad2; ctx.fill();
        ctx.strokeStyle = '#922b21'; ctx.lineWidth = 1.5;
        ctx.stroke();
        Draw.text(ctx, `${m2}kg`, this.state.x2, trackY + 1, 'white', 11, 'center', 'middle');
        Draw.text(ctx, 'm₂', this.state.x2, trackY - r2 - 10, '#e74c3c', 12, 'center', 'bottom');
        ctx.restore();

        // 速度矢量
        const vScale = 15;
        if (Math.abs(this.state.v1) > 0.01) {
            Draw.arrowLine(ctx, this.state.x1, trackY,
                this.state.x1 + this.state.v1 * vScale, trackY, '#7c8a9e', 2);
            Draw.text(ctx, `v₁=${this.state.v1.toFixed(1)}`, this.state.x1 + this.state.v1 * vScale / 2,
                trackY - 12, '#7c8a9e', 11, 'center');
        }
        if (Math.abs(this.state.v2) > 0.01) {
            Draw.arrowLine(ctx, this.state.x2, trackY,
                this.state.x2 + this.state.v2 * vScale, trackY, '#e74c3c', 2);
            Draw.text(ctx, `v₂=${this.state.v2.toFixed(1)}`, this.state.x2 + this.state.v2 * vScale / 2,
                trackY - 12, '#e74c3c', 11, 'center');
        }

        // 碰撞点标记
        if (this.state.hasCollided) {
            const colX = (this.state.x1 + this.state.x2) / 2;
            ctx.save();
            ctx.fillStyle = '#f39c12';
            ctx.strokeStyle = '#f39c12'; ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(colX, trackY - 50);
            ctx.lineTo(colX, trackY + 50);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.beginPath(); ctx.arc(colX, trackY - 50, 4, 0, 2 * Math.PI); ctx.fill();
            Draw.text(ctx, `碰撞 t=${this.state.collisionTime.toFixed(2)}s`, colX, trackY - 60, '#f39c12', 11, 'center');
            ctx.restore();
        }

        // ====== 信息栏: 碰撞前后对比 ======
        const infoY = 20;
        const col1X = W * 0.15, col2X = W * 0.5, col3X = W * 0.85;

        // 表头
        Draw.text(ctx, '碰撞前', col1X, infoY, '#888', 13, 'center');
        Draw.text(ctx, '碰撞后', col3X, infoY, '#888', 13, 'center');

        ctx.save();
        ctx.strokeStyle = '#f39c12'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(col2X - 40, infoY + 10);
        ctx.lineTo(col2X + 40, infoY + 10);
        ctx.stroke();

        // 碰撞标记
        const eLabel = e >= 0.999 ? '完全弹性碰撞' : (e <= 0.001 ? '完全非弹性碰撞' : `弹性碰撞 e=${e.toFixed(2)}`);
        Draw.text(ctx, eLabel, col2X, infoY + 22, '#f39c12', 12, 'center');
        ctx.restore();

        // 碰撞前数据
        const v1b = this.state.v1Before;
        const v2b = this.state.v2Before;
        const pb = this.state.pBefore;
        const keb = this.state.keBefore;

        Draw.text(ctx, `v₁ = ${v1b.toFixed(1)} m/s`, col1X, infoY + 42, '#7c8a9e', 11, 'center');
        Draw.text(ctx, `v₂ = ${v2b.toFixed(1)} m/s`, col1X, infoY + 56, '#e74c3c', 11, 'center');
        Draw.text(ctx, `p = ${pb.toFixed(1)} kg·m/s`, col1X, infoY + 72, '#666', 11, 'center');
        Draw.text(ctx, `Ek = ${keb.toFixed(1)} J`, col1X, infoY + 86, '#666', 11, 'center');

        // 碰撞后数据
        if (this.state.hasCollided) {
            const v1a = this.state.v1After;
            const v2a = this.state.v2After;
            const pa = this.state.pAfter;
            const kea = this.state.keAfter;

            Draw.text(ctx, `v₁' = ${v1a.toFixed(1)} m/s`, col3X, infoY + 42, '#7c8a9e', 11, 'center');
            Draw.text(ctx, `v₂' = ${v2a.toFixed(1)} m/s`, col3X, infoY + 56, '#e74c3c', 11, 'center');
            Draw.text(ctx, `p' = ${pa.toFixed(1)} kg·m/s`, col3X, infoY + 72, '#666', 11, 'center');
            Draw.text(ctx, `Ek' = ${kea.toFixed(1)} J`, col3X, infoY + 86, '#666', 11, 'center');

            // 守恒验证
            const dp = Math.abs(pa - pb);
            const dke = Math.abs(kea - keb);
            const dpColor = dp < 0.01 ? '#2ecc71' : '#e74c3c';
            const dkeColor = dke < 0.01 || (e < 0.999 && dke < keb * 0.5) ? '#2ecc71' : '#e74c3c';

            Draw.text(ctx, `Δp = ${dp.toFixed(3)}`, col2X, infoY + 72, dpColor, 11, 'center');
            Draw.text(ctx, `ΔEk = ${dke.toFixed(1)} J`, col2X, infoY + 86, dkeColor, 11, 'center');
        } else {
            Draw.text(ctx, '待碰撞...', col3X, infoY + 60, '#ccc', 12, 'center');
        }

        // 动量守恒定律
        Draw.text(ctx, '动量守恒: m₁v₁ + m₂v₂ = m₁v₁\' + m₂v₂\'', W / 2, infoY + 106, '#aaa', 11, 'center');
        Draw.text(ctx, `t = ${this.state.time.toFixed(2)} s`, W / 2, H - 8, '#888', 11, 'center', 'bottom');
    },

    updateInfo: function() {
        const m1 = this.params.mass1.value;
        const m2 = this.params.mass2.value;
        const v1 = this.params.velocity1.value;
        const v2 = this.params.velocity2.value;
        const e = this.params.elasticity.value;

        const pTotal = m1 * v1 + m2 * v2;
        const keTotal = 0.5 * m1 * v1 * v1 + 0.5 * m2 * v2 * v2;

        let html = '';
        html += `<div class="info-row"><span class="label">球1质量 m₁</span><span class="value">${m1} kg</span></div>`;
        html += `<div class="info-row"><span class="label">球2质量 m₂</span><span class="value">${m2} kg</span></div>`;
        html += `<div class="info-row"><span class="label">初始总动量</span><span class="value">${pTotal.toFixed(1)} kg·m/s</span></div>`;
        html += `<div class="info-row"><span class="label">初始总动能</span><span class="value">${keTotal.toFixed(1)} J</span></div>`;

        if (this.state.hasCollided) {
            const pAfter = this.state.pAfter;
            const keAfter = this.state.keAfter;
            const dp = Math.abs(pAfter - this.state.pBefore);
            const dke = Math.abs(keAfter - this.state.keBefore);

            html += `<div class="info-row"><span class="label">碰撞后总动量</span><span class="value">${pAfter.toFixed(1)} kg·m/s</span></div>`;
            html += `<div class="info-row"><span class="label">碰撞后总动能</span><span class="value">${keAfter.toFixed(1)} J</span></div>`;
            html += `<div class="info-row"><span class="label">动量差 Δp</span><span class="value">${dp.toFixed(3)} ${dp < 0.01 ? '≈ 0 ✓' : ''}</span></div>`;
            html += `<div class="info-row"><span class="label">动能差 ΔEk</span><span class="value">${dke.toFixed(3)} J</span></div>`;
        }

        if (e >= 0.999) {
            // 完全弹性碰撞：用公式计算理论结果
            const result = Physics.elasticCollision1D(m1, m2, v1, v2);
            html += `<div class="info-row"><span class="label">理论v₁' (弹性)</span><span class="value">${result.v1.toFixed(2)} m/s</span></div>`;
            html += `<div class="info-row"><span class="label">理论v₂' (弹性)</span><span class="value">${result.v2.toFixed(2)} m/s</span></div>`;
        } else if (e <= 0.001) {
            // 完全非弹性
            const vcm = (m1 * v1 + m2 * v2) / (m1 + m2);
            html += `<div class="info-row"><span class="label">共同速度 v_cm</span><span class="value">${vcm.toFixed(2)} m/s</span></div>`;
        }

        html += `<div class="info-row"><span class="label">弹性系数</span><span class="value">${e.toFixed(2)}</span></div>`;
        html += `<div class="info-row"><span class="label">碰撞状态</span><span class="value">${this.state.hasCollided ? '已碰撞' : '未碰撞'}</span></div>`;

        this.infoEl.innerHTML = html;
    },

    resize: function() { this.setupCanvas(); this.draw(); }
};
