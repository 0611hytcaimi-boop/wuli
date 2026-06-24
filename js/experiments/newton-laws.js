/**
 * 实验: 牛顿三大定律
 * 演示牛顿第一定律(惯性)、牛顿第二定律(F=ma)、牛顿第三定律(作用力与反作用力)
 * 物理原理: 惯性定律、加速度定律、作用力-反作用力定律
 */
const NewtonLawsExperiment = {
    id: 'newton-laws', title: '牛顿定律', category: 'mechanics',
    description: '演示牛顿三大运动定律。第一定律：惯性；第二定律：F=ma；第三定律：作用力与反作用力。可在三种模式间切换。三大定律仅适用于惯性参考系、宏观低速质点模型。',

    state: {
        mode: 'fma',
        // 模式1: 惯性
        objX: 0, objV: 0,
        // 模式2: F=ma
        blockX: 0, blockV: 0, time: 0,
        // 模式3: 作用力与反作用力
        obj1X: 0, obj1V: 0, obj2X: 0, obj2V: 0, collisionTime: 0,
        isRunning: true
    },

    params: {
        mode: { value: 'fma', type: 'select', options: ['inertia', 'fma', 'action-reaction'], label: '定律模式' },
        force: { value: 5, min: 1, max: 20, step: 0.5, label: '作用力 F (N)' },
        mass: { value: 2, min: 0.5, max: 10, step: 0.5, label: '质量 m (kg)' }
    },

    info: {}, animId: null, lastTime: null,

    init: function(canvas, controls, info) {
        this.canvas = canvas; this.ctx = canvas.getContext('2d');
        this.controlsEl = controls; this.infoEl = info;
        this.setupCanvas(); this.setupScale(); this.createControls(); this.reset();
        document.getElementById('exp-description').innerHTML =
            '演示牛顿三大运动定律。第一定律：惯性；第二定律：F=ma；第三定律：作用力与反作用力。可在三种模式间切换。' +
            '<br><span style="font-size:11px;color:#aaa;">三大定律仅适用于惯性参考系、宏观低速质点模型</span>';
    },

    setupCanvas: function() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width - 32; this.canvas.height = rect.height - 32;
        this.W = this.canvas.width; this.H = this.canvas.height;
    },
    // 像素-米换算：55 像素 = 1 米
    setupScale: function() {
        this.ppm = 55; // pixels per meter
        this.ox = this.W * 0.08; // 画布左边界（x=0m 的像素位置）
    },
    // 米 → 像素
    px: function(meters) { return this.ox + meters * this.ppm; },

    createControls: function() {
        this.controlsEl.innerHTML = '';
        for (const [key, param] of Object.entries(this.params)) {
            const group = document.createElement('div'); group.className = 'control-group';
            if (param.type === 'select') {
                const modeLabels = { inertia: '牛一律：惯性', fma: '牛二律：F=ma', 'action-reaction': '牛三律：作用力与反作用力' };
                const opts = param.options.map(o =>
                    `<option value="${o}">${modeLabels[o] || o}</option>`).join('');
                group.innerHTML = `<label>${param.label}</label><select data-key="${key}">${opts}</select>`;
                group.querySelector('select').value = param.value;
                group.querySelector('select').addEventListener('change', (e) => {
                    this.params[key].value = e.target.value;
                    this.state.mode = e.target.value;
                    // 惯性模式下作用力滑块置灰
                    const forceSlider = document.querySelector('input[data-key="force"]');
                    const forceVal = document.getElementById('val-force');
                    if (forceSlider) {
                        forceSlider.disabled = (e.target.value === 'inertia');
                        forceSlider.style.opacity = (e.target.value === 'inertia') ? '0.4' : '1';
                        if (e.target.value === 'inertia') {
                            if (forceVal) forceVal.textContent = '0 (无外力)';
                        } else {
                            if (forceVal) forceVal.textContent = this.params.force.value;
                        }
                    }
                    this.reset();
                });
            } else {
                const isInertia = (this.state.mode === 'inertia');
                const isForceKey = (key === 'force');
                const disabledAttr = (isForceKey && isInertia) ? ' disabled' : '';
                const opacityStyle = (isForceKey && isInertia) ? ' style="opacity:0.4;"' : '';
                const displayVal = (isForceKey && isInertia) ? '0 (无外力)' : param.value;
                group.innerHTML = `
                    <label${opacityStyle}><span>${param.label}</span><span class="value" id="val-${key}">${displayVal}</span></label>
                    <input type="range" min="${param.min}" max="${param.max}" step="${param.step}" value="${param.value}" data-key="${key}"${disabledAttr}>`;
                group.querySelector('input').addEventListener('input', (e) => {
                    const val = parseFloat(e.target.value);
                    this.params[key].value = val;
                    if (key !== 'force' || this.state.mode !== 'inertia') {
                        document.getElementById(`val-${key}`).textContent = val;
                    }
                });
            }
            this.controlsEl.appendChild(group);
        }
    },

    reset: function() {
        this.state.mode = this.params.mode.value;
        // 惯性模式
        this.state.objX = 1.5; // 起始位置 (m)
        this.state.objV = (this.state.mode === 'inertia') ? 1.8 : 0; // m/s
        // F=ma模式
        this.state.blockX = 1.0; // m
        this.state.blockV = 0;
        this.state.time = 0;
        // 作用力反作用力
        this.state.obj1X = 1.5; // m
        this.state.obj1V = 0;
        this.state.obj2X = 6.0; // m
        this.state.obj2V = 0;
        this.state.collisionTime = 0;

        this.state.isRunning = false;
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
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.03);
        this.lastTime = timestamp;

        const F = this.params.force.value;
        const m = this.params.mass.value;
        const a = F / m;

        if (this.state.mode === 'inertia') {
            // 惯性：无外力，匀速直线运动 (v 恒定)
            const leftWall = (this.W * 0.12 - this.ox) / this.ppm;
            const rightWall = (this.W * 0.85 - this.ox) / this.ppm;
            this.state.objX += this.state.objV * dt;
            if (this.state.objX > rightWall) {
                this.state.objX = rightWall;
                this.state.objV = -Math.abs(this.state.objV);
            }
            if (this.state.objX < leftWall) {
                this.state.objX = leftWall;
                this.state.objV = Math.abs(this.state.objV);
            }
            this.state.time += dt;

        } else if (this.state.mode === 'fma') {
            // F=ma: 匀加速直线运动 (a = F/m)
            const v = this.state.blockV + a * dt;
            const dx = this.state.blockV * dt + 0.5 * a * dt * dt;
            this.state.blockX += dx;
            this.state.blockV = v;
            this.state.time += dt;

            const rightWall = (this.W * 0.9 - this.ox) / this.ppm;
            const leftWall = (this.W * 0.12 - this.ox) / this.ppm;
            if (this.state.blockX > rightWall) {
                this.state.blockX = leftWall;
                this.state.blockV = 0;
                this.state.time = 0;
            }

        } else if (this.state.mode === 'action-reaction') {
            // 作用力与反作用力: 两物体相向运动
            const m1 = m, m2 = m * 0.8;
            const forceMagnitude = F;
            const a1 = forceMagnitude / m1;
            const a2 = forceMagnitude / m2;

            this.state.obj1V += a1 * dt;
            this.state.obj2V -= a2 * dt;

            this.state.obj1X += this.state.obj1V * dt;
            this.state.obj2X += this.state.obj2V * dt;

            // 两物体碰撞检测 (刚刚接触时交换速度以模拟弹开)
            const minDist = 1.0;
            if (this.state.obj2X - this.state.obj1X < minDist && this.state.obj1V > this.state.obj2V) {
                const v1 = this.state.obj1V, v2 = this.state.obj2V;
                const result = Physics.elasticCollision1D(m1, m2, v1, v2);
                this.state.obj1V = result.v1;
                this.state.obj2V = result.v2;
                const overlap = minDist - (this.state.obj2X - this.state.obj1X);
                this.state.obj1X -= overlap / 2;
                this.state.obj2X += overlap / 2;
                this.state.collisionTime = this.state.time;
            }

            const leftWall = (this.W * 0.1 - this.ox) / this.ppm;
            const rightWall = (this.W * 0.9 - this.ox) / this.ppm;
            if (this.state.obj1X < leftWall) {
                this.state.obj1X = leftWall;
                this.state.obj1V = Math.abs(this.state.obj1V);
            }
            if (this.state.obj2X > rightWall) {
                this.state.obj2X = rightWall;
                this.state.obj2V = -Math.abs(this.state.obj2V);
            }
            this.state.time += dt;
        }

        this.draw(); this.updateInfo();
        this.animId = requestAnimationFrame((t) => this.animate(t));
    },

    draw: function() {
        const ctx = this.ctx, W = this.W, H = this.H;
        Draw.clear(ctx, W, H);

        const mode = this.state.mode;
        const F = this.params.force.value;
        const m = this.params.mass.value;
        const ppm = this.ppm;

        // 标题
        const titles = { inertia: '牛顿第一定律 — 惯性定律', fma: '牛顿第二定律 — F = ma', 'action-reaction': '牛顿第三定律 — 作用力与反作用力' };
        Draw.text(ctx, titles[mode], W / 2, 16, '#333', 16, 'center', 'top');

        // --- 所有模式共用：地面 + 刻度标尺 ---
        const groundY = H * 0.7;
        ctx.save();
        ctx.fillStyle = '#f0f0e8';
        ctx.fillRect(0, groundY, W, H - groundY);
        ctx.strokeStyle = '#888'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, groundY); ctx.lineTo(W, groundY); ctx.stroke();
        // 水平刻度标尺（每1米标记）
        ctx.strokeStyle = '#ccc'; ctx.lineWidth = 0.5;
        ctx.fillStyle = '#bbb'; ctx.font = '9px -apple-system, sans-serif';
        for (let meter = 0; meter <= 12; meter++) {
            const px = this.ox + meter * ppm;
            if (px < 0 || px > W) continue;
            ctx.beginPath(); ctx.moveTo(px, groundY); ctx.lineTo(px, groundY + (meter % 2 === 0 ? 8 : 4)); ctx.stroke();
            if (meter % 2 === 0) {
                ctx.fillText(`${meter} m`, px - 6, groundY + 18);
            }
        }
        // 方向标注
        Draw.text(ctx, '< 向左为负    向右为正 >', W * 0.5, groundY + 34, '#bbb', 10, 'center');
        ctx.restore();

        if (mode === 'inertia') {
            // 模式1: 惯性 — 物体在光滑表面上匀速运动
            const objY = groundY - 5;
            const objW = 60, objH = 40;
            const ox_px = this.px(this.state.objX);

            // 光滑表面虚线标注
            ctx.save();
            ctx.setLineDash([8, 12]);
            ctx.strokeStyle = '#bbb'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(0, groundY + 8); ctx.lineTo(W, groundY + 8); ctx.stroke();
            ctx.setLineDash([]);
            Draw.text(ctx, '光滑表面（无摩擦）', W * 0.5, groundY + 30, '#aaa', 11, 'center');
            ctx.restore();

            // 物体
            const grad = ctx.createLinearGradient(ox_px - objW / 2, objY - objH, ox_px + objW / 2, objY);
            grad.addColorStop(0, '#7c8a9e'); grad.addColorStop(1, '#6b7a8e');
            ctx.save();
            ctx.fillStyle = grad;
            ctx.shadowColor = 'rgba(0,0,0,0.15)'; ctx.shadowBlur = 6;
            ctx.fillRect(ox_px - objW / 2, objY - objH, objW, objH);
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#5a6a7e'; ctx.lineWidth = 1;
            ctx.strokeRect(ox_px - objW / 2, objY - objH, objW, objH);
            ctx.restore();

            // 速度箭头（向右为正）
            const vx = this.state.objV;
            if (Math.abs(vx) > 0.01) {
                const arrowLen = 50 + Math.abs(vx) * 8;
                const dir = vx > 0 ? 1 : -1;
                Draw.arrowLine(ctx, ox_px, objY - objH / 2,
                    ox_px + dir * arrowLen, objY - objH / 2, '#e74c3c', 2);
                Draw.text(ctx, `v = ${Math.abs(vx).toFixed(2)} m/s`,
                    ox_px + dir * (arrowLen + 30), objY - objH / 2 - 12, '#e74c3c', 12, 'center');
            }

            // 无外力说明
            Draw.text(ctx, '合力为零 → 物体保持匀速直线运动', W * 0.5, H * 0.25, '#333', 13, 'center');
            Draw.text(ctx, '无摩擦力，无外力作用，物体沿初始方向匀速运动', W * 0.5, H * 0.25 + 22, '#aaa', 12, 'center');

        } else if (mode === 'fma') {
            // 模式2: F=ma — 物体在合外力作用下加速
            const objW = 70, objH = 50;
            const bx_px = this.px(this.state.blockX);
            const objY = groundY - objH;
            const blockCenterX = bx_px;

            // 红色物体
            const grad = ctx.createLinearGradient(bx_px - objW / 2, objY, bx_px + objW / 2, objY + objH);
            grad.addColorStop(0, '#e74c3c'); grad.addColorStop(1, '#c0392b');
            ctx.save();
            ctx.fillStyle = grad;
            ctx.shadowColor = 'rgba(0,0,0,0.15)'; ctx.shadowBlur = 6;
            ctx.fillRect(bx_px - objW / 2, objY, objW, objH);
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#922b21'; ctx.lineWidth = 1;
            ctx.strokeRect(bx_px - objW / 2, objY, objW, objH);
            Draw.text(ctx, `${m} kg`, bx_px, objY + objH / 2, 'white', 13, 'center', 'middle');
            ctx.restore();

            // ---- 受力分析 ----
            const a = F / m;

            // ① 重力 G = mg（竖直向下虚线箭头）
            ctx.save();
            ctx.setLineDash([4, 5]);
            ctx.strokeStyle = '#9b59b6'; ctx.lineWidth = 1.5;
            const gravityEnd = groundY + 20;
            ctx.beginPath(); ctx.moveTo(blockCenterX, objY + objH); ctx.lineTo(blockCenterX, gravityEnd); ctx.stroke();
            // 箭头头
            ctx.setLineDash([]);
            const aSize = 6;
            ctx.beginPath();
            ctx.moveTo(blockCenterX, gravityEnd);
            ctx.lineTo(blockCenterX - aSize, gravityEnd - aSize);
            ctx.moveTo(blockCenterX, gravityEnd);
            ctx.lineTo(blockCenterX + aSize, gravityEnd - aSize);
            ctx.stroke();
            Draw.text(ctx, `G = mg = ${(m * Physics.g).toFixed(1)} N`,
                blockCenterX, gravityEnd + 14, '#9b59b6', 11, 'center', 'top');
            ctx.restore();

            // ② 支持力 N（竖直向上虚线箭头）
            ctx.save();
            ctx.setLineDash([4, 5]);
            ctx.strokeStyle = '#3498db'; ctx.lineWidth = 1.5;
            const normalStart = objY;
            const normalEnd = objY - 20;
            ctx.beginPath(); ctx.moveTo(blockCenterX, normalStart); ctx.lineTo(blockCenterX, normalEnd); ctx.stroke();
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(blockCenterX, normalEnd);
            ctx.lineTo(blockCenterX - aSize, normalEnd + aSize);
            ctx.moveTo(blockCenterX, normalEnd);
            ctx.lineTo(blockCenterX + aSize, normalEnd + aSize);
            ctx.stroke();
            Draw.text(ctx, `N = mg = ${(m * Physics.g).toFixed(1)} N  (竖直二力平衡)`,
                blockCenterX, normalEnd - 12, '#3498db', 11, 'center', 'bottom');
            ctx.restore();

            // ③ 水平拉力 —— 合外力（向右实线箭头）
            const arrowLen = 50 + F * 6;
            Draw.arrowLine(ctx, bx_px + objW / 2, objY + objH / 2,
                bx_px + objW / 2 + arrowLen, objY + objH / 2, '#2ecc71', 3);
            Draw.text(ctx, `F合 = ${F} N  (向右为正)`,
                bx_px + objW / 2 + arrowLen + 5, objY + objH / 2 - 12, '#2ecc71', 12, 'left', 'bottom');

            // 运动学参数
            Draw.text(ctx, `a = F/m = ${F}/${m} = ${a.toFixed(2)} m/s²`,
                W * 0.5, H * 0.25, '#333', 14, 'center');
            Draw.text(ctx, `v = ${this.state.blockV.toFixed(2)} m/s  |  t = ${this.state.time.toFixed(1)} s`,
                W * 0.5, H * 0.25 + 28, '#888', 12, 'center');

            // 公式展示（纯文字，无白框）
            Draw.text(ctx, 'F = m · a  （式中F为物体所受合外力）',
                W * 0.5, H * 0.38, '#333', 14, 'center');

        } else if (mode === 'action-reaction') {
            // 模式3: 作用力与反作用力
            const objW = 55, objH = 45;
            const objY = groundY - objH;

            // 物体1 (左) — 像素位置
            const ox1_px = this.px(this.state.obj1X);
            const grad1 = ctx.createLinearGradient(ox1_px - objW / 2, objY, ox1_px + objW / 2, objY + objH);
            grad1.addColorStop(0, '#7c8a9e'); grad1.addColorStop(1, '#6b7a8e');
            ctx.save();
            ctx.fillStyle = grad1;
            ctx.shadowColor = 'rgba(0,0,0,0.15)'; ctx.shadowBlur = 6;
            ctx.fillRect(ox1_px - objW / 2, objY, objW, objH);
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#5a6a7e'; ctx.lineWidth = 1;
            ctx.strokeRect(ox1_px - objW / 2, objY, objW, objH);
            Draw.text(ctx, `${m} kg`, ox1_px, objY + objH / 2, 'white', 13, 'center', 'middle');
            ctx.restore();

            // 物体2 (右)
            const ox2_px = this.px(this.state.obj2X);
            const m2 = m * 0.8;
            const grad2 = ctx.createLinearGradient(ox2_px - objW / 2, objY, ox2_px + objW / 2, objY + objH);
            grad2.addColorStop(0, '#e74c3c'); grad2.addColorStop(1, '#c0392b');
            ctx.save();
            ctx.fillStyle = grad2;
            ctx.shadowColor = 'rgba(0,0,0,0.15)'; ctx.shadowBlur = 6;
            ctx.fillRect(ox2_px - objW / 2, objY, objW, objH);
            ctx.shadowBlur = 0;
            ctx.strokeStyle = '#922b21'; ctx.lineWidth = 1;
            ctx.strokeRect(ox2_px - objW / 2, objY, objW, objH);
            Draw.text(ctx, `${m2.toFixed(1)} kg`, ox2_px, objY + objH / 2, 'white', 13, 'center', 'middle');
            ctx.restore();

            // 标签
            Draw.text(ctx, 'A', ox1_px, objY - 12, '#7c8a9e', 14, 'center', 'bottom');
            Draw.text(ctx, 'B', ox2_px, objY - 12, '#e74c3c', 14, 'center', 'bottom');

            // 作用力箭头（向右为正）
            const midPx = (ox1_px + ox2_px) / 2;
            // F_AB: A对B → 右
            Draw.arrowLine(ctx, ox1_px + objW / 2, objY + objH / 3, midPx, objY + objH / 3, '#2ecc71', 2.5);
            Draw.text(ctx, `F_AB = ${F} N`,
                midPx - 8, objY + objH / 3 - 8, '#2ecc71', 11, 'right', 'bottom');
            // F_BA: B对A → 左
            Draw.arrowLine(ctx, ox2_px - objW / 2, objY + objH * 2 / 3, midPx, objY + objH * 2 / 3, '#f39c12', 2.5);
            Draw.text(ctx, `F_BA = -${F} N`,
                midPx - 8, objY + objH * 2 / 3 + 10, '#f39c12', 11, 'right', 'top');

            // 顶部说明
            Draw.text(ctx, '作用力与反作用力作用在两个不同物体，无法相互抵消（区别于同一物体的一对平衡力）',
                W * 0.5, H * 0.12, '#bbb', 10, 'center');
            Draw.text(ctx, '作用力与反作用力分别作用在两个物体上',
                W * 0.5, H * 0.18, '#555', 12, 'center');
            Draw.text(ctx, '大小相等、方向相反、同时产生同时消失',
                W * 0.5, H * 0.18 + 18, '#888', 12, 'center');

            // 公式
            Draw.text(ctx, 'F_AB = −F_BA',
                W * 0.5, H * 0.25, '#333', 16, 'center');

            // 底部算式 F_AB + F_BA 完整结果
            Draw.text(ctx, `F_AB + F_BA = ${F} + (-${F}) = 0`,
                W * 0.5, H * 0.25 + 28, '#555', 13, 'center');

            // 速度
            Draw.text(ctx, `v_A = ${this.state.obj1V.toFixed(2)} m/s`,
                W * 0.22, groundY + 20, '#7c8a9e', 11, 'center');
            Draw.text(ctx, `v_B = ${this.state.obj2V.toFixed(2)} m/s`,
                W * 0.78, groundY + 20, '#e74c3c', 11, 'center');
        }

        Draw.text(ctx, `t = ${this.state.time.toFixed(1)} s`, 12, H - 10, '#999', 11);
    },

    updateInfo: function() {
        const mode = this.state.mode;
        const F = this.params.force.value;
        const m = this.params.mass.value;
        const a = F / m;

        let html = '';
        html += `<div class="info-row"><span class="label">模式</span><span class="value">${
            mode === 'inertia' ? '牛一律：惯性' : (mode === 'fma' ? '牛二律：F=ma' : '牛三律：作用力与反作用力')
        }</span></div>`;
        html += `<div class="info-row"><span class="label">质量 m</span><span class="value">${m} kg</span></div>`;

        if (mode === 'inertia') {
            html += `<div class="info-row"><span class="label"><strong>物体速度 v</strong></span><span class="value"><strong>${this.state.objV.toFixed(2)} m/s</strong></span></div>`;
            html += `<div class="info-row"><span class="label">合外力 ΣF</span><span class="value">0 N (无外力)</span></div>`;
            html += `<div class="info-row"><span class="label">定律说明</span><span class="value">ΣF=0 时，v 保持不变</span></div>`;
            html += `<div style="font-size:10px;color:#aaa;margin-top:2px;">物体在光滑水平面上做匀速直线运动</div>`;
        } else if (mode === 'fma') {
            html += `<div class="info-row"><span class="label"><strong>作用力 F</strong></span><span class="value"><strong>${F} N</strong></span></div>`;
            html += `<div class="info-row"><span class="label"><strong>加速度 a</strong></span><span class="value"><strong>${a.toFixed(2)} m/s²</strong></span></div>`;
            html += `<div class="info-row"><span class="label">当前速度 v</span><span class="value">${this.state.blockV.toFixed(2)} m/s</span></div>`;
            html += `<div class="info-row"><span class="label">运行时间 t</span><span class="value">${this.state.time.toFixed(1)} s</span></div>`;
            html += `<div style="border-top:1px solid var(--border);margin:4px 0 2px;"></div>`;
            html += `<div style="font-size:11px;color:#555;">F = m · a，式中F为物体所受<strong>合外力</strong></div>`;
            html += `<div style="font-size:10px;color:#9b59b6;margin-top:2px;">重力 G = mg 与支持力 N 二力平衡</div>`;
        } else {
            const m2 = m * 0.8;
            html += `<div class="info-row"><span class="label">作用力 F</span><span class="value">${F} N</span></div>`;
            html += `<div class="info-row"><span class="label">物体A质量</span><span class="value">${m} kg</span></div>`;
            html += `<div class="info-row"><span class="label">物体B质量</span><span class="value">${m2.toFixed(1)} kg</span></div>`;
            html += `<div class="info-row"><span class="label">物体A速度</span><span class="value">${this.state.obj1V.toFixed(2)} m/s</span></div>`;
            html += `<div class="info-row"><span class="label">物体B速度</span><span class="value">${this.state.obj2V.toFixed(2)} m/s</span></div>`;
            html += `<div style="border-top:1px solid var(--border);margin:4px 0 2px;"></div>`;
            html += `<div class="info-row"><span class="label"><strong>F</strong><sub>AB</sub> + <strong>F</strong><sub>BA</sub></span><span class="value"><strong>${F} + (-${F}) = 0</strong></span></div>`;
            html += `<div style="font-size:10px;color:#888;margin-top:2px;">作用力与反作用力分别作用在两个物体上</div>`;
        }
        this.infoEl.innerHTML = html;
    },

    resize: function() { this.setupCanvas(); this.setupScale(); this.draw(); }
};
