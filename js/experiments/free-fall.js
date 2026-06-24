/**
 * 实验: 自由落体运动
 * 模拟物体从一定高度自由下落，支持有无空气阻力两种模式
 * 物理原理: h = ½gt², v = gt, Ek = ½mv², Ep = mgh
 */
const FreeFallExperiment = {
    id: 'free-fall', title: '自由落体运动', category: 'mechanics',
    description: '研究自由落体运动规律，可调节下落高度、物体质量和空气阻力。观察速度、加速度、动能和势能的实时变化。',

    state: {
        y: 0,         // 当前高度 (m)
        vy: 0,        // 当前速度 (m/s, 向下为正)
        time: 0,
        isRunning: false,
        hasLanded: false,
        trail: [],     // y-t轨迹
        vTrail: []     // v-t轨迹
    },

    params: {
        height: { value: 100, min: 20, max: 200, step: 5, label: '初始高度 h₀ (m)' },
        mass: { value: 2, min: 0.5, max: 20, step: 0.5, label: '质量 m (kg)' },
        withAirResistance: { value: false, type: 'boolean', label: '考虑空气阻力' }
    },

    info: {}, animId: null, lastTime: null,

    init: function(canvas, controls, info) {
        this.canvas = canvas; this.ctx = canvas.getContext('2d');
        this.controlsEl = controls; this.infoEl = info;
        this.setupCanvas(); this.createControls(); this.reset();
        document.getElementById('exp-description').innerHTML =
            '研究自由落体运动规律，可调节下落高度、物体质量和空气阻力。观察速度、加速度、动能和势能的实时变化。' +
            '<br><span style="font-size:11px;color:#aaa;">h = ½gt²、v = gt 仅适用于初速度为0、无空气阻力的理想自由落体；勾选【考虑空气阻力】后，运动规律偏离该理想公式</span>';
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
                    if (!this.state.hasLanded && !this.state.isRunning) this.reset();
                });
                // 空气阻力补充说明
                if (key === 'withAirResistance') {
                    const note = document.createElement('div');
                    note.style.cssText = 'font-size:11px;color:var(--text-secondary);margin-top:2px;line-height:1.4;';
                    note.textContent = '勾选后存在向上空气阻力，下落加速度小于9.8m/s²，落地速度、时间与理论值存在偏差';
                    group.appendChild(note);
                }
            } else {
                group.innerHTML = `
                    <label><span>${param.label}</span><span class="value" id="val-${key}">${param.value}</span></label>
                    <input type="range" min="${param.min}" max="${param.max}" step="${param.step}" value="${param.value}" data-key="${key}">`;
                group.querySelector('input').addEventListener('input', (e) => {
                    const val = parseFloat(e.target.value);
                    this.params[key].value = val;
                    document.getElementById(`val-${key}`).textContent = val;
                    if (!this.state.hasLanded && !this.state.isRunning) this.reset();
                });
            }
            this.controlsEl.appendChild(group);
        }
    },

    // 存储落地瞬间能量用于冻结显示
    landedEnergies: null,

    reset: function() {
        this.state.y = this.params.height.value;
        this.state.vy = 0;
        this.state.time = 0;
        this.state.isRunning = false;
        this.state.hasLanded = false;
        this.state.trail = [{ t: 0, y: this.state.y }];
        this.state.vTrail = [{ t: 0, v: 0 }];
        this.landedEnergies = null;
        this.lastTime = null;
        document.getElementById('btn-pause').textContent = '开始';
        document.getElementById('btn-pause').classList.remove('paused');
        this.draw(); this.updateInfo();
    },

    togglePause: function() {
        if (this.state.hasLanded) {
            this.reset();
            // 重置后立即开始下落
            this.state.isRunning = true;
            document.getElementById('btn-pause').textContent = '暂停';
            document.getElementById('btn-pause').classList.remove('paused');
            this.lastTime = performance.now();
            this.animate(this.lastTime);
            return;
        }
        if (!this.state.isRunning) {
            // 开始下落
            this.state.isRunning = true;
            document.getElementById('btn-pause').textContent = '暂停';
            document.getElementById('btn-pause').classList.remove('paused');
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
        let dt = Math.min((timestamp - this.lastTime) / 1000, 0.03);
        if (dt <= 0) dt = 0.016;
        this.lastTime = timestamp;

        // 速度因子，用于将真实物理速度映射到动画像素速度
        const timeScale = 1.5;

        if (this.params.withAirResistance.value) {
            // 带空气阻力: ma = mg - kv², 这里简化为 kv 阻力
            const m = this.params.mass.value;
            const k = 0.5; // 阻力系数
            const dragAccel = k * this.state.vy * this.state.vy / m;
            const a = Physics.g - dragAccel;
            this.state.vy += a * dt * timeScale;
            this.state.y -= this.state.vy * dt * timeScale;
        } else {
            // 无空气阻力: v = gt, y = y₀ - ½gt²
            this.state.vy += Physics.g * dt * timeScale;
            this.state.y -= this.state.vy * dt * timeScale;
        }
        this.state.time += dt * timeScale;

        // 记录轨迹
        this.state.trail.push({ t: this.state.time, y: this.state.y });
        this.state.vTrail.push({ t: this.state.time, v: this.state.vy });
        if (this.state.trail.length > 400) this.state.trail.shift();
        if (this.state.vTrail.length > 400) this.state.vTrail.shift();

        // 检查落地
        if (this.state.y <= 0) {
            // 冻结落地瞬间能量
            const m = this.params.mass.value;
            this.landedEnergies = {
                Ek: 0.5 * m * this.state.vy * this.state.vy,
                Ep: 0,
                E: 0.5 * m * this.state.vy * this.state.vy
            };
            this.state.y = 0;
            this.state.vy = 0; // 落地后速度归零
            this.state.isRunning = false;
            this.state.hasLanded = true;
            document.getElementById('btn-pause').textContent = '开始';
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

        const h0 = this.params.height.value;
        const m = this.params.mass.value;
        const withAir = this.params.withAirResistance.value;

        // ====== 左侧: 下落场景 ======
        const sceneL = 20, sceneR = W * 0.38;
        const sceneW = sceneR - sceneL;
        const sceneTop = 30, sceneBottom = H - 30;
        const sceneH = sceneBottom - sceneTop;

        // 比例尺: 将实际高度映射到画布
        const towerTop = sceneTop + 20;
        const towerBottom = sceneBottom - 10;
        const towerH = towerBottom - towerTop;
        const scale = towerH / h0;

        // 建筑/塔
        ctx.save();
        ctx.fillStyle = '#ddd';
        // 建筑主体
        const buildingW = 40;
        const buildingX = sceneL + sceneW * 0.3;
        ctx.fillRect(buildingX, towerTop, buildingW, towerBottom - towerTop);
        ctx.fillStyle = '#ccc';
        // 窗户
        for (let wy = towerTop + 15; wy < towerBottom - 20; wy += 25) {
            ctx.fillStyle = '#88ccff';
            ctx.fillRect(buildingX + 8, wy, 10, 12);
            ctx.fillRect(buildingX + 22, wy, 10, 12);
        }
        // 顶部平台
        ctx.fillStyle = '#bbb';
        ctx.fillRect(buildingX - 10, towerTop - 5, buildingW + 20, 10);
        // 塔顶天线
        ctx.fillStyle = '#999';
        ctx.fillRect(buildingX + buildingW / 2 - 1, towerTop - 25, 2, 25);
        ctx.restore();

        // 地面
        ctx.save();
        ctx.fillStyle = '#e8e0d0';
        ctx.fillRect(sceneL, towerBottom, sceneW, sceneBottom - towerBottom);
        ctx.strokeStyle = '#888'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(sceneL, towerBottom); ctx.lineTo(sceneR, towerBottom); ctx.stroke();
        ctx.restore();

        // 物体位置
        const objY = towerBottom - this.state.y * scale;
        const objX = buildingX + buildingW / 2;
        const objR = Math.max(5, Math.min(14, 6 + m * 0.5));

        // 下落物体
        const objGrad = ctx.createRadialGradient(objX - 1, objY - 1, 1, objX, objY, objR);
        objGrad.addColorStop(0, '#e74c3c');
        objGrad.addColorStop(0.7, '#c0392b');
        objGrad.addColorStop(1, '#922b21');
        ctx.save();
        ctx.beginPath(); ctx.arc(objX, objY, objR, 0, 2 * Math.PI);
        ctx.fillStyle = objGrad; ctx.fill();
        ctx.strokeStyle = '#922b21'; ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        // 高度标注虚线
        if (this.state.y > 0) {
            ctx.save();
            ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(buildingX + buildingW + 20, towerTop);
            ctx.lineTo(buildingX + buildingW + 20, objY);
            ctx.stroke();
            ctx.setLineDash([]);
            Draw.text(ctx, `h = ${this.state.y.toFixed(1)} m`,
                buildingX + buildingW + 26, (towerTop + objY) / 2, '#e74c3c', 11, 'left', 'middle');
            ctx.restore();
        }

        // 现实参考标签
        Draw.text(ctx, `${h0}m`, buildingX + buildingW / 2, towerTop - 4, '#888', 11, 'center', 'bottom');
        Draw.text(ctx, '地面', sceneL + sceneW / 2, towerBottom + 16, '#888', 11, 'center');

        // 初始位置标记
        ctx.save();
        ctx.fillStyle = 'rgba(231,76,60,0.2)';
        ctx.beginPath(); ctx.arc(objX, towerTop + objR + 2, objR + 4, 0, 2 * Math.PI); ctx.fill();
        ctx.setLineDash([2, 2]);
        ctx.strokeStyle = 'rgba(231,76,60,0.4)';
        ctx.beginPath(); ctx.arc(objX, towerTop + objR + 2, objR + 4, 0, 2 * Math.PI); ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();

        // === 高塔刻度标尺 ===
        ctx.save();
        ctx.strokeStyle = '#bbb'; ctx.lineWidth = 0.5;
        ctx.fillStyle = '#999'; ctx.font = '9px -apple-system, sans-serif';
        const stepScale = 10;
        for (let h = 0; h <= h0; h += stepScale) {
            const sy = towerBottom - h * scale;
            if (sy < towerTop || sy > towerBottom) continue;
            ctx.beginPath(); ctx.moveTo(buildingX + buildingW + 2, sy);
            ctx.lineTo(buildingX + buildingW + 8, sy); ctx.stroke();
            ctx.fillText(`${h}m`, buildingX + buildingW + 10, sy + 3);
        }
        ctx.restore();

        // === 受力箭头（小球下落中） ===
        if (this.state.isRunning || (this.state.hasLanded && this.state.y <= 0)) {
            const aSize = 5;
            if (this.state.y > 0 || this.state.isRunning) {
                // ① 重力 G = mg（竖直向下）
                ctx.save();
                ctx.setLineDash([4, 5]);
                ctx.strokeStyle = '#9b59b6'; ctx.lineWidth = 1.5;
                const gLen = 20;
                const gEnd = objY + gLen;
                ctx.beginPath(); ctx.moveTo(objX, objY); ctx.lineTo(objX, gEnd); ctx.stroke();
                ctx.setLineDash([]);
                ctx.beginPath();
                ctx.moveTo(objX, gEnd);
                ctx.lineTo(objX - aSize, gEnd - aSize);
                ctx.moveTo(objX, gEnd);
                ctx.lineTo(objX + aSize, gEnd - aSize);
                ctx.stroke();
                Draw.text(ctx, 'G=mg', objX + 10, objY + gLen / 2 - 4, '#9b59b6', 9, 'left', 'middle');
                ctx.restore();

                // ② 空气阻力（竖直向上，仅阻力模式显示）
                if (withAir && this.state.vy > 0.1) {
                    ctx.save();
                    ctx.setLineDash([4, 5]);
                    ctx.strokeStyle = '#e67e22'; ctx.lineWidth = 1.5;
                    const dLen = Math.min(20, 8 + this.state.vy * 0.8);
                    const dEnd = objY - dLen;
                    ctx.beginPath(); ctx.moveTo(objX, objY); ctx.lineTo(objX, dEnd); ctx.stroke();
                    ctx.setLineDash([]);
                    ctx.beginPath();
                    ctx.moveTo(objX, dEnd);
                    ctx.lineTo(objX - aSize, dEnd + aSize);
                    ctx.moveTo(objX, dEnd);
                    ctx.lineTo(objX + aSize, dEnd + aSize);
                    ctx.stroke();
                    Draw.text(ctx, 'f', objX + 10, objY - dLen / 2 - 4, '#e67e22', 9, 'left', 'middle');
                    ctx.restore();
                }
            }
        }

        // ====== 右侧: y-t 图 ======
        const gL1 = W * 0.42, gR1 = W - 20;
        const gT1 = 30, gB1 = H * 0.48;
        const gw1 = gR1 - gL1, gh1 = gB1 - gT1;

        ctx.save();
        ctx.fillStyle = '#fafafa'; ctx.fillRect(gL1, gT1, gw1, gh1);
        ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
        ctx.strokeRect(gL1, gT1, gw1, gh1);
        Draw.text(ctx, '高度-时间 (h-t) 图', gL1 + gw1 / 2, gT1 - 6, '#666', 12, 'center', 'bottom');
        // 坐标轴
        ctx.strokeStyle = '#eee'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(gL1, gB1); ctx.lineTo(gR1, gB1); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(gL1, gT1); ctx.lineTo(gL1, gB1); ctx.stroke();
        Draw.text(ctx, 'h', gL1 + 10, gT1 + 10, '#999', 10);
        Draw.text(ctx, 't', gR1 - 10, gB1 - 4, '#999', 10);

        // 绘制h-t曲线
        if (this.state.trail.length > 1) {
            const maxT = Math.max(this.state.time, 1);
            const maxH = h0;
            ctx.strokeStyle = '#7c8a9e'; ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < this.state.trail.length; i++) {
                const px = gL1 + (this.state.trail[i].t / maxT) * gw1;
                const py = gT1 + gh1 - (this.state.trail[i].y / maxH) * gh1;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }
        ctx.restore();

        // ====== 右侧偏下: v-t 图 ======
        const gL2 = W * 0.42, gR2 = W - 20;
        const gT2 = H * 0.52, gB2 = H - 30;
        const gw2 = gR2 - gL2, gh2 = gB2 - gT2;

        ctx.save();
        ctx.fillStyle = '#fafafa'; ctx.fillRect(gL2, gT2, gw2, gh2);
        ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
        ctx.strokeRect(gL2, gT2, gw2, gh2);
        Draw.text(ctx, '速度-时间 (v-t) 图', gL2 + gw2 / 2, gT2 - 6, '#666', 12, 'center', 'bottom');
        // 坐标轴
        ctx.strokeStyle = '#eee'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(gL2, gT2 + gh2); ctx.lineTo(gR2, gT2 + gh2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(gL2, gT2); ctx.lineTo(gL2, gB2); ctx.stroke();
        Draw.text(ctx, 'v', gL2 + 10, gT2 + 10, '#999', 10);
        Draw.text(ctx, 't', gR2 - 10, gB2 - 4, '#999', 10);

        // 理论终速度 gt
        const theoreticalV = withAir ? Math.sqrt(2 * Physics.g * this.params.mass.value / 0.5) :
            Math.sqrt(2 * Physics.g * h0);
        const maxV = theoreticalV * 1.1;

        // 绘制v-t曲线
        if (this.state.vTrail.length > 1) {
            const maxT = Math.max(this.state.time, 1);
            ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < this.state.vTrail.length; i++) {
                const px = gL2 + (this.state.vTrail[i].t / maxT) * gw2;
                const py = gT2 + gh2 - (this.state.vTrail[i].v / maxV) * gh2;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }
        ctx.restore();

        // === 教学提示 ===
        if (!withAir) {
            Draw.text(ctx, '💡 无空气阻力时，自由落体加速度与物体质量无关',
                W * 0.42, H - 4, '#bbb', 9, 'left', 'bottom');
        }
        Draw.text(ctx, 'h-t图为二次抛物线，v-t图斜率 = g',
            W - 12, H - 4, '#bbb', 9, 'right', 'bottom');

        // 状态文本
        const statusText = this.state.hasLanded ? '已落地！' :
            (this.state.isRunning ? '下落中...' : '准备开始');
        Draw.text(ctx, statusText, sceneL + sceneW / 2, towerBottom + 30, '#333', 12, 'center');

        Draw.text(ctx, `t = ${this.state.time.toFixed(2)}s | v = ${this.state.vy.toFixed(2)} m/s | h = ${this.state.y.toFixed(1)} m`,
            W / 2, H - 8, '#888', 11, 'center', 'bottom');
    },

    updateInfo: function() {
        const h0 = this.params.height.value;
        const m = this.params.mass.value;
        const y = this.state.y;
        const vy = this.state.vy;
        const withAir = this.params.withAirResistance.value;

        let Ep, Ek, E, aText;
        if (this.state.hasLanded && this.landedEnergies) {
            // 落地后：速度/加速度归零，能量冻结为落地瞬间值
            Ek = this.landedEnergies.Ek;
            Ep = 0;
            E = this.landedEnergies.E;
            aText = '0 (已落地)';
        } else {
            Ep = m * Physics.g * Math.max(y, 0);
            Ek = 0.5 * m * vy * vy;
            E = Ep + Ek;
            aText = withAir ? '< 9.8 (有阻力)' : Physics.g.toFixed(1);
        }
        const theoreticalV = Math.sqrt(2 * Physics.g * h0);
        const theoreticalT = Math.sqrt(2 * h0 / Physics.g);

        this.infoEl.innerHTML = `
            <div class="info-row"><span class="label">初始高度 h₀</span><span class="value">${h0} m</span></div>
            <div class="info-row"><span class="label">质量 m</span><span class="value">${m} kg</span></div>
            <div class="info-row"><span class="label">当前高度 h</span><span class="value">${y.toFixed(2)} m</span></div>
            <div class="info-row"><span class="label">当前速度 v</span><span class="value">${vy.toFixed(2)} m/s</span></div>
            <div class="info-row"><span class="label">加速度 a</span><span class="value">${aText} m/s²</span></div>
            <div style="border-top:1px solid var(--border);margin:4px 0 6px;"></div>
            <div class="info-row"><span class="label"><strong>动能</strong> Ek</span><span class="value"><strong>${Ek.toFixed(1)}</strong> J</span></div>
            <div class="info-row"><span class="label"><strong>势能</strong> Ep</span><span class="value"><strong>${Ep.toFixed(1)}</strong> J</span></div>
            <div class="info-row"><span class="label" style="font-weight:600;">总能量 E</span><span class="value" style="font-weight:600;">${E.toFixed(1)} J</span></div>
            <div style="font-size:9px;color:#aaa;margin-top:1px;">重力势能以地面为零势能参考面</div>
            ${!withAir ? '<div style="font-size:9px;color:#7a9a7e;margin-top:1px;">无空气阻力，系统总机械能守恒</div>' : ''}
            <div style="border-top:1px solid var(--border);margin:4px 0 6px;"></div>
            <div class="info-row"><span class="label">运动时间 t</span><span class="value">${this.state.time.toFixed(2)} s</span></div>
            <div class="info-row"><span class="label">理论落地速度</span><span class="value">${theoreticalV.toFixed(2)} m/s</span></div>
            <div class="info-row"><span class="label">理论落地时间</span><span class="value">${theoreticalT.toFixed(2)} s</span></div>
            <div class="info-row"><span class="label">空气阻力</span><span class="value">${withAir ? '有' : '无'}</span></div>
        `;
    },

    resize: function() { this.setupCanvas(); this.draw(); }
};
