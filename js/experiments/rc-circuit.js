/**
 * 实验5: RC电路
 * 模拟RC电路的充放电过程，显示电压和电流变化曲线
 * 物理原理: Vc(t) = V₀(1 - e^(-t/RC)) 充电, Vc(t) = V₀·e^(-t/RC) 放电
 */
const RCCircuitExperiment = {
    id: 'rc-circuit', title: 'RC电路', category: 'electromagnetism',
    description: '研究RC电路的充放电过程，可调节电阻和电容参数。观察时间常数 τ = RC 对充放电速度的影响。',

    state: { t: 0, mode: 'charge', Vc: 0, trail: [], isRunning: true },

    params: {
        resistance: { value: 10, min: 1, max: 100, step: 1, label: '电阻 R (kΩ)' },
        capacitance: { value: 100, min: 10, max: 500, step: 10, label: '电容 C (μF)' },
        voltage: { value: 12, min: 3, max: 24, step: 1, label: '电源电压 V₀ (V)' },
        mode: { value: 'charge', type: 'select', options: ['charge', 'discharge'], label: '工作模式' }
    },

    info: {}, animId: null, lastTime: null,

    init: function(canvas, controls, info) {
        this.canvas = canvas; this.ctx = canvas.getContext('2d');
        this.controlsEl = controls; this.infoEl = info;
        this.setupCanvas(); this.createControls(); this.reset();
        document.getElementById('exp-description').innerHTML =
            this.description + '<br><span style="font-size:11px;color:#aaa;">' +
            '时间常数 τ = RC；充电规律 Vc = V₀(1 − e^(−t/τ))；放电规律 Vc = V₀·e^(−t/τ)' +
            '<br>本仿真为理想RC电路，忽略导线电阻、电源内阻。</span>';
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
                const opts = param.options.map(o =>
                    `<option value="${o}">${o === 'charge' ? '充电' : '放电'}</option>`).join('');
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
                    const val = parseFloat(e.target.value);
                    this.params[key].value = val;
                    document.getElementById(`val-${key}`).textContent = val;
                    this.reset();
                });
            }
            this.controlsEl.appendChild(group);
        }
    },

    reset: function() {
        this.state.t = 0;
        this.state.mode = this.params.mode.value;
        this.state.Vc = this.state.mode === 'charge' ? 0 : this.params.voltage.value;
        this.state.trail = [{ t: 0, Vc: this.state.Vc }];
        this.state.isRunning = false;
        this.lastTime = null;
        document.getElementById('btn-pause').textContent = '开始';
        document.getElementById('btn-pause').classList.add('paused');
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
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05) * 2;
        this.lastTime = timestamp;

        const R = this.params.resistance.value * 1000;
        const C = this.params.capacitance.value * 1e-6;
        const V0 = this.params.voltage.value;

        this.state.t += dt;
        if (this.state.mode === 'charge') {
            this.state.Vc = Physics.rcCharge(this.state.t, R, C, V0);
        } else {
            this.state.Vc = Physics.rcDischarge(this.state.t, R, C, V0);
        }

        this.state.trail.push({ t: this.state.t, Vc: this.state.Vc });
        if (this.state.trail.length > 500) this.state.trail.shift();

        // 充电完成或放电完成停止
        if ((this.state.mode === 'charge' && this.state.Vc > V0 * 0.995) ||
            (this.state.mode === 'discharge' && this.state.Vc < V0 * 0.005)) {
            this.state.isRunning = false;
            document.getElementById('btn-pause').textContent = '继续';
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

        const marginL = 60, marginR = 20, marginT = 30, marginB = 40;
        const gW = W - marginL - marginR, gH = H - marginT - marginB;

        // 电路示意图
        const circX = marginL + gW * 0.05, circY = marginT + 30;
        const circW = gW * 0.25, circH = 90;

        ctx.save();
        ctx.strokeStyle = '#555'; ctx.lineWidth = 2;
        const cl = circX, cr = circX + circW, ct = circY, cb = circY + circH;
        const cmx = (cl + cr) / 2, cmy = (ct + cb) / 2;
        const V0 = this.params.voltage.value;
        const mode = this.state.mode;

        // 主回路外框线
        ctx.beginPath();
        ctx.moveTo(cl + 10, ct); ctx.lineTo(cr - 15, ct);   // 顶线
        ctx.moveTo(cr - 15, ct); ctx.lineTo(cr - 15, cb);   // 右线
        ctx.moveTo(cl + 10, cb); ctx.lineTo(cr - 15, cb);   // 底线
        ctx.moveTo(cl + 10, ct); ctx.lineTo(cl + 10, cb);   // 左线
        ctx.stroke();

        // ── 电池 (左侧，+ 在上，- 在下) ──
        const batX = cl + 10;
        ctx.beginPath();
        ctx.moveTo(batX, ct + 10);
        ctx.lineTo(batX - 8, ct + 16);
        ctx.moveTo(batX, ct + 10);
        ctx.lineTo(batX + 8, ct + 16);
        ctx.fillStyle = '#555';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('+', batX - 14, ct + 14);
        ctx.moveTo(batX, ct + 18);
        ctx.lineTo(batX - 8, ct + 24);
        ctx.moveTo(batX, ct + 18);
        ctx.lineTo(batX + 8, ct + 24);
        ctx.fillText('−', batX - 14, ct + 24);
        ctx.stroke();
        Draw.text(ctx, `${V0}V`, batX + 24, ct + 12, '#888', 10);
        // 电池竖直引线
        ctx.beginPath();
        ctx.moveTo(batX, ct + 24); ctx.lineTo(batX, cb);
        ctx.stroke();

        // ── 电阻 (顶部中间) ──
        const rx1 = cmx - 18, rx2 = cmx + 18;
        ctx.beginPath();
        ctx.moveTo(rx1, ct);
        for (let i = 0; i < 5; i++) {
            const xx = rx1 + (i / 5) * (rx2 - rx1);
            ctx.lineTo(xx, ct - (i % 2 === 0 ? 0 : 10));
        }
        ctx.stroke();
        Draw.text(ctx, `${this.params.resistance.value}kΩ`, cmx - 14, ct - 20, '#888', 10);
        // 电阻竖直引线
        ctx.beginPath();
        ctx.moveTo(rx2, ct); ctx.lineTo(rx2, cb);
        ctx.stroke();

        // ── 单刀双掷开关 SPDT (右侧) ──
        const swX = cr - 15;
        const swPivotY = ct + 35;    // 转轴位置
        const swTopY = ct + 8;       // 上触点 (充电: 接电池)
        const swBotY = cb - 8;       // 下触点 (放电: 接电容)

        // 转轴 (小圆圈)
        ctx.beginPath();
        ctx.arc(swX, swPivotY, 3, 0, 2 * Math.PI);
        ctx.fillStyle = '#555';
        ctx.fill();
        ctx.stroke();

        // 固定触点（上、下）
        ctx.beginPath();
        ctx.arc(swX, swTopY, 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(swX, swBotY, 2, 0, 2 * Math.PI);
        ctx.fill();

        // 动触点（根据模式指向）
        const swAngle = mode === 'charge' ? (swTopY - swPivotY) : (swBotY - swPivotY);
        ctx.beginPath();
        ctx.moveTo(swX, swPivotY);
        ctx.lineTo(swX + 14, swPivotY + swAngle * 0.6);
        ctx.stroke();

        // 模式标签
        ctx.fillStyle = mode === 'charge' ? '#e74c3c' : '#2980b9';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(mode === 'charge' ? '充电' : '放电', swX + 16, swPivotY + swAngle * 0.6 + 3);

        // 上触点引线 (接电池正极)
        ctx.beginPath();
        ctx.moveTo(swX, swTopY);
        ctx.lineTo(swX, ct);
        ctx.stroke();

        // 下触点引线 (接电容下极板)
        ctx.beginPath();
        ctx.moveTo(swX, swBotY);
        ctx.lineTo(swX, cb);
        ctx.stroke();

        // ── 电容 (底部) ──
        const capX = cmx;
        ctx.beginPath();
        ctx.moveTo(batX, capX);  // 从电池底部到电容左侧
        ctx.lineTo(capX - 10, cb - 12);
        ctx.moveTo(capX - 10, cb - 12);
        ctx.lineTo(capX - 10, cb - 2);
        ctx.moveTo(capX - 4, cb - 12);
        ctx.lineTo(capX - 4, cb - 2);
        ctx.stroke();

        // 电容符号 (两平行板)
        ctx.strokeStyle = '#555'; ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(capX - 10, cb - 12); ctx.lineTo(capX + 5, cb - 12);
        ctx.moveTo(capX - 4, cb - 2); ctx.lineTo(capX + 5, cb - 2);
        ctx.stroke();

        // 电容右侧引线 → 接右下回路
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(capX + 5, cb - 12); ctx.lineTo(swX, cb - 12);
        ctx.moveTo(capX + 5, cb - 2); ctx.lineTo(swX, cb - 2);
        ctx.stroke();

        // 电容标签
        Draw.text(ctx, 'C', capX + 14, cb - 10, '#888', 10);

        // ── 电压表 (并联在电容两端) ──
        const voltX = capX + 30;
        ctx.save();
        ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(voltX, cmy - 2, 14, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#555';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('V', voltX, cmy - 2);
        ctx.restore();
        // 电压表引线 (上→电容上极板，下→电容下极板)
        ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(voltX, cmy - 2 - 14);
        ctx.lineTo(voltX, cb - 12);
        ctx.moveTo(voltX, cmy - 2 + 14);
        ctx.lineTo(voltX, cb - 2);
        ctx.stroke();

        // ── 接地符号 (右下) ──
        const gndX = cr - 5;
        ctx.beginPath();
        ctx.moveTo(gndX, cb); ctx.lineTo(gndX + 15, cb);
        ctx.moveTo(gndX + 4, cb); ctx.lineTo(gndX + 2, cb + 5);
        ctx.moveTo(gndX + 8, cb); ctx.lineTo(gndX + 6, cb + 5);
        ctx.moveTo(gndX + 12, cb); ctx.lineTo(gndX + 10, cb + 5);
        ctx.stroke();
        Draw.text(ctx, 'GND', gndX + 20, cb - 2, '#888', 9, 'left', 'middle');

        // ── 红色电流箭头 (充电模式指向电容正极) ──
        if (mode === 'charge' && this.state.isRunning) {
            Draw.arrowLine(ctx, capX - 20, cb - 23, capX - 20, cb - 12, 'rgba(231,76,60,0.7)', 2);
            ctx.save();
            ctx.fillStyle = 'rgba(231,76,60,0.8)';
            ctx.font = '9px sans-serif';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            ctx.fillText('I', capX - 22, cb - 14);
            ctx.restore();
        }

        ctx.restore();

        // V-t 图
        const gx = marginL + gW * 0.35, gy = marginT;
        const gw = gW * 0.62, gh = gH;
        ctx.save();
        ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
        ctx.strokeRect(gx, gy, gw, gh);
        ctx.fillStyle = '#fafafa'; ctx.fillRect(gx + 1, gy + 1, gw - 2, gh - 2);

        // 轴标签
        Draw.text(ctx, 't (s)', gx + gw / 2, gy + gh + 16, '#888', 12, 'center');
        Draw.text(ctx, 'Vc (V)', gx - 10, gy + gh / 2, '#888', 12, 'center', 'middle');
        Draw.text(ctx, 'V-t 曲线', gx + gw / 2, gy - 8, '#666', 13, 'center', 'bottom');

        // 坐标轴
        const tau = this.params.resistance.value * this.params.capacitance.value / 1000;
        const maxT = Math.max(this.state.t, tau * 5);
        const ax0 = gx, ay0 = gy + gh;

        // 浅灰色网格线 (水平 + 垂直)
        ctx.strokeStyle = 'rgba(200,200,200,0.35)'; ctx.lineWidth = 0.5;
        for (let i = 0; i <= 4; i++) {
            const vy = gy + gh - (i / 4) * gh;
            ctx.beginPath(); ctx.moveTo(gx, vy); ctx.lineTo(gx + gw, vy); ctx.stroke();
        }
        for (let j = 0; j <= 8; j++) {
            const vx = gx + (j / 8) * gw;
            ctx.beginPath(); ctx.moveTo(vx, gy); ctx.lineTo(vx, gy + gh); ctx.stroke();
        }

        // Y轴刻度标签
        ctx.fillStyle = '#999'; ctx.font = '10px sans-serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        for (let i = 0; i <= 4; i++) {
            const vy = gy + gh - (i / 4) * gh;
            ctx.fillText(`${(V0 * i / 4).toFixed(0)}V`, gx - 5, vy);
        }

        // X轴刻度标签
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        for (let j = 0; j <= 8; j++) {
            const vx = gx + (j / 8) * gw;
            ctx.fillText(`${(maxT * j / 8).toFixed(1)}`, vx, gy + gh + 3);
        }

        // 时间常数线 (t=τ 竖线 + 对应电压横线)
        const tauX = gx + (tau / maxT) * gw;
        ctx.strokeStyle = '#f59e0b'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(tauX, gy); ctx.lineTo(tauX, gy + gh); ctx.stroke();
        const tauV = this.state.mode === 'charge' ? V0 * (1 - 1 / Math.E) : V0 / Math.E;
        const tauY = gy + gh - (tauV / V0) * gh;
        ctx.beginPath(); ctx.moveTo(gx, tauY); ctx.lineTo(gx + gw, tauY); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#f59e0b'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
        ctx.fillText('τ', tauX + 3, gy + gh - 2);
        // τ 知识点说明
        ctx.font = '9px sans-serif'; ctx.fillStyle = 'rgba(245,158,11,0.7)'; ctx.textBaseline = 'top';
        ctx.fillText('t=τ: 充电63.2% / 放电剩余36.8%', tauX - 10, gy + gh - 18);

        // 绘制曲线
        if (this.state.trail.length > 1) {
            ctx.strokeStyle = '#7c8a9e'; ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < this.state.trail.length; i++) {
                const px = gx + (this.state.trail[i].t / maxT) * gw;
                const py = gy + gh - (this.state.trail[i].Vc / V0) * gh;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }

        // 当前点
        if (this.state.trail.length > 0) {
            const last = this.state.trail[this.state.trail.length - 1];
            const px = gx + (last.t / maxT) * gw;
            const py = gy + gh - (last.Vc / V0) * gh;
            ctx.save();
            ctx.fillStyle = '#e74c3c';
            ctx.beginPath(); ctx.arc(px, py, 4, 0, 2 * Math.PI); ctx.fill();
            ctx.restore();
        }

        ctx.restore();

        // 时间常数信息
        Draw.text(ctx, `τ = RC = ${tau.toFixed(2)}s | t = ${this.state.t.toFixed(1)}s | Vc = ${this.state.Vc.toFixed(2)}V`,
            12, H - 10, '#888', 12);
    },

    updateInfo: function() {
        const R = this.params.resistance.value;
        const C = this.params.capacitance.value;
        const V0 = this.params.voltage.value;
        const tau = R * C / 1000;
        const t = this.state.t;

        let pct;
        if (this.state.mode === 'charge') {
            pct = (this.state.Vc / V0 * 100);
        } else {
            pct = ((V0 - this.state.Vc) / V0 * 100);
        }

        this.infoEl.innerHTML = `
            <div class="info-row"><span class="label">时间常数 τ</span><span class="value">${tau.toFixed(2)} s</span></div>
            <div class="info-row"><span class="label">当前电压 Vc</span><span class="value">${this.state.Vc.toFixed(3)} V</span></div>
            <div class="info-row"><span class="label">当前电流 I</span><span class="value">${((V0 - this.state.Vc) / R).toFixed(3)} mA</span></div>
            <div class="info-row"><span class="label">完成度</span><span class="value">${pct.toFixed(1)}%</span></div>
            <div style="font-size:10px;color:#999;line-height:1.4;margin-top:-2px;margin-bottom:4px;">完成度 = 当前电容电压 / 电源电压 × 100%</div>
            <div class="info-row"><span class="label">工作模式</span><span class="value">${this.state.mode === 'charge' ? '充电' : '放电'}</span></div>
            <div class="info-row"><span class="label">运行时间</span><span class="value">${t.toFixed(1)} s</span></div>
        `;
    },

    resize: function() { this.setupCanvas(); this.draw(); }
};
