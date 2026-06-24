/**
 * 实验: 伏安法测电阻
 * 模拟伏安法电路，展示电流表与电压表的连接方式，验证欧姆定律
 * 物理原理: V = IR, P = VI, 伏安法测电阻 R = V/I
 */
const VoltAmpereExperiment = {
    id: 'volt-ampere', title: '伏安法测电阻', category: 'electromagnetism',
    description: '学习伏安法测电阻的电路连接。电流表串联测量电流，电压表并联测量电压，利用欧姆定律 R=V/I 计算电阻值。',

    state: {
        time: 0,
        dots: [],           // 电流流动点
        isRunning: true
    },

    params: {
        resistance: { value: 100, min: 10, max: 1000, step: 5, label: '电阻 R (Ω)' },
        voltage: { value: 12, min: 1, max: 24, step: 0.5, label: '电源电压 E (V)' },
        internalResistance: { value: 0, min: 0, max: 50, step: 1, label: '电源内阻 r (Ω)' }
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
                // Reset dot positions on param change
                this.initDots();
                this.draw(); this.updateInfo();
            });
            this.controlsEl.appendChild(group);
        }
    },

    getCircuit: function() {
        const R = this.params.resistance.value;
        const V = this.params.voltage.value;
        const r = this.params.internalResistance.value;
        const totalR = R + r;
        const I = totalR > 0 ? V / totalR : 0;
        const Vr = I * R;         // 电阻两端电压
        const Vint = I * r;       // 内阻分压
        const P = V * I;          // 总功率
        const Pr = I * I * R;     // 电阻消耗功率
        return { R, V, r, totalR, I, Vr, Vint, P, Pr };
    },

    // Define circuit path for moving dots
    getCircuitPath: function() {
        const W = this.W, H = this.H;
        const cx = W * 0.32, cy = H * 0.50;
        const bw = W * 0.10, bh = H * 0.22; // battery size

        // Circuit loop: left side (battery) -> top wire -> right side (resistor) -> bottom wire -> back
        const batLeft = cx - bw / 2;
        const batRight = cx + bw / 2;
        const batBottom = cy + bh / 2;
        const resistorX = cx + bw * 3.5;
        const wireTop = cy - bh * 0.7;
        const wireBottom = cy + bh * 0.7;

        // Path: battery top -> top wire -> right -> resistor top -> resistor bottom -> bottom wire -> left -> battery bottom
        // This forms a loop
        return [
            // Top wire: left to right
            { x: batRight, y: wireTop },
            { x: batRight + bw * 0.5, y: wireTop },
            { x: resistorX, y: wireTop },
            // Down through resistor
            { x: resistorX, y: wireBottom - 20 },
            // Continue down to bottom wire
            { x: resistorX, y: wireBottom },
            // Bottom wire: right to left
            { x: batRight + bw * 0.5, y: wireBottom },
            { x: batLeft, y: wireBottom },
            // Up through battery
            { x: batLeft, y: batBottom },
        ];
    },

    initDots: function() {
        const { I } = this.getCircuit();
        const path = this.getCircuitPath();
        const numDots = Math.max(5, Math.min(Math.round(I * 4), 60));
        this.state.dots = [];
        for (let i = 0; i < numDots; i++) {
            this.state.dots.push({ progress: i / numDots });
        }
    },

    reset: function() {
        this.state.time = 0;
        this.state.isRunning = true;
        this.lastTime = null;
        this.initDots();
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
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.02);
        this.lastTime = timestamp;
        this.state.time += dt;

        const { I } = this.getCircuit();
        const speed = Math.max(0.02, I * 0.04); // dots speed proportional to current

        const pathLen = this.getCircuitPath().length - 1; // number of segments
        for (const dot of this.state.dots) {
            dot.progress += speed * dt;
            if (dot.progress > 1) dot.progress -= 1;
        }

        this.draw(); this.updateInfo();
        this.animId = requestAnimationFrame((t) => this.animate(t));
    },

    // Interpolate along path segments
    getDotPosition: function(progress) {
        const path = this.getCircuitPath();
        const segCount = path.length - 1;
        const scaled = progress * segCount;
        const segIndex = Math.floor(scaled);
        const segFrac = scaled - segIndex;
        const i = Math.min(segIndex, segCount - 1);
        const p1 = path[i], p2 = path[i + 1];
        return {
            x: p1.x + (p2.x - p1.x) * segFrac,
            y: p1.y + (p2.y - p1.y) * segFrac
        };
    },

    draw: function() {
        const ctx = this.ctx, W = this.W, H = this.H;
        Draw.clear(ctx, W, H);

        const { R, V, r, I, Vr, P, Vint } = this.getCircuit();
        const cx = W * 0.32, cy = H * 0.50;
        const bw = W * 0.10, bh = H * 0.22;
        const batLeft = cx - bw / 2;
        const batRight = cx + bw / 2;
        const batBottom = cy + bh / 2;
        const batTop = cy - bh / 2;
        const wireTop = cy - bh * 0.7;
        const wireBottom = cy + bh * 0.7;
        const resistorX = cx + bw * 3.0;

        // --- Draw wires ---
        ctx.save();
        ctx.strokeStyle = '#555'; ctx.lineWidth = 2.5;
        ctx.beginPath();
        // Top wire
        ctx.moveTo(batRight, wireTop);
        ctx.lineTo(resistorX, wireTop);
        // Bottom wire
        ctx.moveTo(batLeft, wireBottom);
        ctx.lineTo(resistorX, wireBottom);
        ctx.stroke();
        ctx.restore();

        // --- Battery ---
        ctx.save();
        // Long line (positive)
        ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(batLeft, batTop); ctx.lineTo(batRight, batTop); ctx.stroke();
        // Short thick line (negative)
        ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(batLeft + 4, batBottom); ctx.lineTo(batRight - 4, batBottom); ctx.stroke();
        // Battery body outline
        ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(batLeft, batTop);
        ctx.lineTo(batLeft, batBottom);
        ctx.lineTo(batRight, batBottom);
        ctx.lineTo(batRight, batTop);
        ctx.stroke();
        // Label
        Draw.text(ctx, `${V}V`, cx, cy, '#e74c3c', 13, 'center', 'middle');
        ctx.restore();

        // Internal resistance (if > 0)
        if (r > 0) {
            ctx.save();
            ctx.strokeStyle = '#e67e22'; ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 2]);
            const irX = batLeft - bw * 0.8;
            ctx.beginPath();
            ctx.moveTo(irX, batBottom);
            ctx.lineTo(irX, wireBottom);
            ctx.stroke();
            ctx.setLineDash([]);
            // Resistor symbol for internal resistance
            const irSegW = 8, irSegH = 6;
            const irMidY = (batBottom + wireBottom) / 2;
            ctx.beginPath();
            ctx.moveTo(irX, batBottom);
            for (let i = 0; i < 4; i++) {
                const sy = batBottom + (i + 0.5) * (wireBottom - batBottom) / 4;
                const sx = irX + (i % 2 === 0 ? -irSegW : irSegW);
                ctx.lineTo(sx, sy);
            }
            ctx.lineTo(irX, wireBottom);
            ctx.stroke();
            Draw.text(ctx, `r=${r}Ω`, irX - 24, irMidY, '#e67e22', 10, 'right', 'middle');
            ctx.restore();
        }

        // --- Ammeter (top wire, between battery and resistor) ---
        const ammeterX = batRight + bw * 0.5;
        const ammeterR = 18;
        ctx.save();
        ctx.beginPath();
        ctx.arc(ammeterX, wireTop, ammeterR, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#555'; ctx.lineWidth = 2;
        ctx.stroke();
        Draw.text(ctx, 'A', ammeterX, wireTop + 1, '#333', 14, 'center', 'middle');
        Draw.text(ctx, '电流表', ammeterX, wireTop - ammeterR - 14, '#555', 10, 'center', 'bottom');
        ctx.restore();

        // Ammeter needle
        const ammeterAngle = Physics.mapRange(I, 0, Math.max(V / (R + r) * 1.5, 0.01), -Math.PI * 0.4, Math.PI * 0.4);
        ctx.save();
        ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 1.5;
        ctx.translate(ammeterX, wireTop);
        ctx.rotate(ammeterAngle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(ammerR * 0.85, 0);
        ctx.stroke();
        ctx.restore();

        // --- Resistor (right side, vertical) ---
        const resTop = wireTop + 20;
        const resBottom = wireBottom - 20;
        const resMidY = (resTop + resBottom) / 2;

        ctx.save();
        ctx.strokeStyle = '#555'; ctx.lineWidth = 2;
        ctx.beginPath();
        // Zigzag resistor symbol
        const zigStart = resTop + 8;
        const zigEnd = resBottom - 8;
        const zigLen = zigEnd - zigStart;
        const zigSegs = 8;
        const zigAmp = 10;
        ctx.moveTo(resistorX, resTop);
        ctx.lineTo(resistorX, zigStart);
        for (let i = 0; i <= zigSegs; i++) {
            const t = i / zigSegs;
            const zy = zigStart + t * zigLen;
            const zx = resistorX + (i % 2 === 0 ? -zigAmp : zigAmp);
            ctx.lineTo(zx, zy);
        }
        ctx.lineTo(resistorX, resBottom);
        ctx.stroke();
        Draw.text(ctx, `${R}Ω`, resistorX, resMidY - 22, '#333', 12, 'center', 'bottom');
        ctx.restore();

        // --- Voltmeter (parallel with resistor) ---
        const vmX = resistorX + bw * 1.6;
        const vmY = resMidY;
        const vmR = 18;

        // Voltmeter wires (connecting top and bottom of resistor to voltmeter)
        ctx.save();
        ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(resistorX, wireTop);
        ctx.lineTo(resistorX, wireTop);
        ctx.lineTo(vmX, wireTop);
        ctx.lineTo(vmX, vmY - vmR);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(resistorX, wireBottom);
        ctx.lineTo(vmX, wireBottom);
        ctx.lineTo(vmX, vmY + vmR);
        ctx.stroke();
        ctx.restore();

        // Voltmeter circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(vmX, vmY, vmR, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#555'; ctx.lineWidth = 2;
        ctx.stroke();
        Draw.text(ctx, 'V', vmX, vmY + 1, '#333', 14, 'center', 'middle');
        Draw.text(ctx, '电压表', vmX, vmY - vmR - 14, '#555', 10, 'center', 'bottom');
        ctx.restore();

        // Voltmeter needle
        const voltmeterAngle = Physics.mapRange(Vr, 0, Math.max(V, 0.01), -Math.PI * 0.4, Math.PI * 0.4);
        ctx.save();
        ctx.strokeStyle = '#3498db'; ctx.lineWidth = 1.5;
        ctx.translate(vmX, vmY);
        ctx.rotate(voltmeterAngle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(vmR * 0.85, 0);
        ctx.stroke();
        ctx.restore();

        // --- Moving dots (current flow) ---
        const { I: current } = this.getCircuit();
        if (current > 0.001) {
            for (const dot of this.state.dots) {
                const pos = this.getDotPosition(dot.progress);
                ctx.save();
                ctx.fillStyle = 'rgba(231, 76, 60, 0.8)';
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, 3.5, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }

        // --- Right side: digital meter displays ---
        const meterX = W * 0.72;
        const meterW = W * 0.24;
        const meterH = 56;

        const drawMeterBox = (x, y, w, h, label, value, unit, color) => {
            ctx.save();
            ctx.fillStyle = '#1a1a2e';
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 1;
            ctx.fillRect(x, y, w, h);
            ctx.strokeRect(x, y, w, h);
            // Label
            ctx.fillStyle = '#888';
            ctx.font = '11px -apple-system, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
            ctx.fillText(label, x + w / 2, y + 6);
            // Value
            ctx.fillStyle = color;
            ctx.font = 'bold 22px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(value, x + w / 2, y + h / 2 + 4);
            // Unit
            ctx.fillStyle = '#aaa';
            ctx.font = '10px -apple-system, sans-serif';
            ctx.fillText(unit, x + w / 2, y + h - 14);
            ctx.restore();
        };

        const mStartY = H * 0.08;
        const mGap = 10;
        drawMeterBox(meterX, mStartY, meterW, meterH, '电压表读数', Vr.toFixed(3), 'V', '#3498db');
        drawMeterBox(meterX, mStartY + meterH + mGap, meterW, meterH, '电流表读数', I.toFixed(4), 'A', '#e74c3c');
        drawMeterBox(meterX, mStartY + 2 * (meterH + mGap), meterW, meterH, '计算电阻 R=V/I', (I > 0.0001 ? (Vr / I).toFixed(1) : '∞'), 'Ω', '#f39c12');
        drawMeterBox(meterX, mStartY + 3 * (meterH + mGap), meterW, meterH, '功率 P=VI', P.toFixed(3), 'W', '#2ecc71');

        // Circuit formula
        Draw.text(ctx, `I = V / (R + r) = ${V} / (${R} + ${r}) = ${I.toFixed(4)} A`,
            meterX + meterW / 2, mStartY + 4 * (meterH + mGap) + 10, '#aaa', 12, 'center', 'top');

        // Title
        Draw.text(ctx, '伏安法电路', cx, 22, '#555', 16, 'center', 'top');
    },

    updateInfo: function() {
        const { R, V, r, totalR, I, Vr, Vint, P, Pr } = this.getCircuit();

        this.infoEl.innerHTML = `
            <div class="info-row"><span class="label">电源电压 E</span><span class="value">${V} V</span></div>
            <div class="info-row"><span class="label">负载电阻 R</span><span class="value">${R} Ω</span></div>
            <div class="info-row"><span class="label">电源内阻 r</span><span class="value">${r} Ω</span></div>
            <div class="info-row"><span class="label">总电阻 Rₜ</span><span class="value">${totalR} Ω</span></div>
            <div class="info-row"><span class="label" style="color:#e74c3c;">电流 I</span><span class="value" style="color:#e74c3c;">${I.toFixed(4)} A</span></div>
            <div class="info-row"><span class="label" style="color:#3498db;">电阻电压 V_R</span><span class="value" style="color:#3498db;">${Vr.toFixed(3)} V</span></div>
            <div class="info-row"><span class="label">内阻分压 V_int</span><span class="value">${Vint.toFixed(3)} V</span></div>
            <div class="info-row"><span class="label">总功率 P</span><span class="value">${P.toFixed(3)} W</span></div>
            <div class="info-row"><span class="label">电阻功率 P_R</span><span class="value">${Pr.toFixed(3)} W</span></div>
            <div class="info-row"><span class="label">测量电阻 R=V/I</span><span class="value">${(I > 0.0001 ? (Vr / I).toFixed(2) : '∞')} Ω</span></div>
            <div class="info-row"><span class="label">欧姆定律</span><span class="value">V = IR ✓</span></div>
        `;
    },

    resize: function() { this.setupCanvas(); this.draw(); }
};
