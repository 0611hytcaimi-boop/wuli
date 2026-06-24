/**
 * 实验: 浮力与沉降速度
 * 模拟物体在流体中的浮沉运动，展示重力、浮力、斯托克斯阻力的平衡关系
 * 物理原理: 阿基米德原理 Fb=ρ_fluid·g·V, 斯托克斯阻力 Fd=6π·η·r·v, 末速度 vt=2r²(ρ_p-ρ_f)g/(9η)
 */
const BuoyancyExperiment = {
    id: 'buoyancy', title: '浮力与沉降速度', category: 'thermodynamics',
    description: '研究物体在流体中的浮沉行为。调节物体与流体的密度、物体半径和流体粘度，观察重力、浮力与阻力的动态平衡。',

    state: {
        objY: 0,          // 物体在流体中的Y位置 (0 = 液面, >0 向下)
        velocity: 0,      // 当前速度 (m/s)
        time: 0,
        vHistory: [],     // 速度-时间历史
        yHistory: [],     // 位置-时间历史
        isRunning: true,
        settled: false    // 是否已达到平衡/到底/到顶
    },

    params: {
        objectDensity: { value: 2500, min: 500, max: 5000, step: 50, label: '物体密度 ρₒ (kg/m³)' },
        fluidDensity: { value: 1000, min: 500, max: 2000, step: 50, label: '流体密度 ρ_f (kg/m³)' },
        objectRadius: { value: 0.03, min: 0.01, max: 0.10, step: 0.005, label: '物体半径 r (m)' },
        viscosity: { value: 0.01, min: 0.001, max: 1.0, step: 0.001, label: '粘度 η (Pa·s)' }
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
                if (!this.state.settled && this.state.velocity !== 0) {
                    // 允许实时调节，对象会重新响应
                }
            });
            this.controlsEl.appendChild(group);
        }
    },

    reset: function() {
        this.state.objY = 0;
        this.state.velocity = 0;
        this.state.time = 0;
        this.state.vHistory = [];
        this.state.yHistory = [];
        this.state.isRunning = true;
        this.state.settled = false;
        this.lastTime = null;
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

    // 获取物理参数
    getPhysics: function() {
        const rhoObj = this.params.objectDensity.value;
        const rhoFluid = this.params.fluidDensity.value;
        const r = this.params.objectRadius.value;
        const eta = this.params.viscosity.value;
        const volume = (4 / 3) * Math.PI * Math.pow(r, 3);
        const mass = rhoObj * volume;
        const Fg = mass * Physics.g;
        const Fb = Physics.buoyancyForce(rhoFluid, volume, Physics.g);
        const vt = Physics.terminalVelocity(mass, Physics.g, rhoFluid, volume, r, eta);
        return { rhoObj, rhoFluid, r, eta, volume, mass, Fg, Fb, vt };
    },

    animate: function(timestamp) {
        if (!this.state.isRunning) return;
        if (this.lastTime === null) this.lastTime = timestamp;
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.02);
        this.lastTime = timestamp;

        const { rhoObj, rhoFluid, r, eta, volume, mass, Fg, Fb } = this.getPhysics();
        const v = Math.abs(this.state.velocity);

        // Drag force opposes motion
        const Fd = Physics.stokesDrag(r, eta, v);
        const Fnet = Fg - Fb;
        const direction = this.state.velocity >= 0 ? 1 : -1;

        // Acceleration: Fnet - sign(v)*Fd = m*a
        const a = Math.abs(this.state.velocity) < 0.0001
            ? Fnet / mass  // Starting from rest
            : (Fnet - direction * Fd) / mass;

        this.state.velocity += a * dt;

        // Clamp very small velocities to zero if practically settled
        if (Math.abs(this.state.velocity) < 0.0001 && Math.abs(Fnet - 0) < 0.01) {
            this.state.velocity = 0;
        }

        this.state.objY += this.state.velocity * dt;
        this.state.time += dt;

        // Boundary: object hits top of fluid
        const fluidTop = this.H * 0.15;
        const fluidBottom = this.H * 0.82;
        const fluidHeight = fluidBottom - fluidTop;
        const maxY = fluidHeight - r * 150; // convert physical meters to canvas px

        // Scale: map physical max depth to canvas
        const scaleFactor = 1000; // px per meter
        if (this.state.objY < 0) {
            this.state.objY = 0;
            if (this.state.velocity < 0) this.state.velocity = 0;
        }
        if (this.state.objY > fluidHeight / scaleFactor) {
            this.state.objY = fluidHeight / scaleFactor;
            if (this.state.velocity > 0) this.state.velocity = 0;
            this.state.settled = true;
        }

        // Record history
        this.state.vHistory.push({ t: this.state.time, v: this.state.velocity });
        this.state.yHistory.push({ t: this.state.time, y: this.state.objY });
        if (this.state.vHistory.length > 400) this.state.vHistory.shift();
        if (this.state.yHistory.length > 400) this.state.yHistory.shift();

        this.draw(); this.updateInfo();
        this.animId = requestAnimationFrame((t) => this.animate(t));
    },

    draw: function() {
        const ctx = this.ctx, W = this.W, H = this.H;
        Draw.clear(ctx, W, H);

        const { rhoObj, rhoFluid, r, eta, volume, mass, Fg, Fb } = this.getPhysics();
        const Fnet = Fg - Fb;
        const v = this.state.velocity;

        // --- Fluid container (beaker) ---
        const beakerLeft = W * 0.18;
        const beakerRight = W * 0.48;
        const beakerTop = H * 0.15;
        const beakerBottom = H * 0.82;
        const beakerW = beakerRight - beakerLeft;
        const beakerH = beakerBottom - beakerTop;

        // Beaker walls
        ctx.save();
        ctx.strokeStyle = '#888'; ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(beakerLeft - 10, beakerTop);
        ctx.lineTo(beakerRight + 10, beakerTop);
        ctx.moveTo(beakerLeft - 10, beakerTop);
        ctx.lineTo(beakerLeft, beakerBottom);
        ctx.lineTo(beakerRight, beakerBottom);
        ctx.lineTo(beakerRight + 10, beakerTop);
        ctx.stroke();
        // Beaker bottom
        ctx.beginPath();
        ctx.moveTo(beakerLeft - 6, beakerBottom);
        ctx.lineTo(beakerRight + 6, beakerBottom);
        ctx.stroke();
        ctx.restore();

        // Fluid fill
        const fluidColor = rhoFluid > 1200 ? 'rgba(52, 152, 219, 0.4)' :
                           rhoFluid > 800 ? 'rgba(52, 152, 219, 0.3)' :
                            'rgba(135, 206, 250, 0.25)';
        ctx.save();
        ctx.fillStyle = fluidColor;
        ctx.fillRect(beakerLeft + 1, beakerTop + 1, beakerW - 2, beakerH - 2);
        ctx.restore();

        // Fluid level label
        Draw.text(ctx, `流体密度: ${rhoFluid} kg/m³`, beakerLeft + beakerW / 2, beakerTop - 20, '#3498db', 11, 'center', 'bottom');

        // --- Object in fluid ---
        const scaleFactor = 1000; // px per meter
        const objPixelRadius = r * scaleFactor * 0.8;
        const displayRadius = Math.max(12, Math.min(objPixelRadius, 45));
        const objX = beakerLeft + beakerW / 2;
        const objY = beakerTop + this.state.objY * scaleFactor + displayRadius;

        // Clamp object within fluid
        const objDrawY = Math.max(beakerTop + displayRadius, Math.min(beakerBottom - displayRadius, objY));

        // Object gradient
        const densityRatio = rhoObj / rhoFluid;
        const objColor1 = rhoObj > rhoFluid ? '#e74c3c' : rhoObj < rhoFluid ? '#2ecc71' : '#f39c12';
        const objColor2 = rhoObj > rhoFluid ? '#c0392b' : rhoObj < rhoFluid ? '#27ae60' : '#e67e22';
        const grad = ctx.createRadialGradient(objX - displayRadius * 0.25, objDrawY - displayRadius * 0.25, displayRadius * 0.1, objX, objDrawY, displayRadius);
        grad.addColorStop(0, objColor1);
        grad.addColorStop(1, objColor2);

        ctx.save();
        ctx.beginPath();
        ctx.arc(objX, objDrawY, displayRadius, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = objColor2; ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();

        // Density label on object
        Draw.text(ctx, `${rhoObj}`, objX, objDrawY, 'white', Math.max(10, displayRadius * 0.7), 'center', 'middle');

        // --- Force arrows ---
        const arrowOx = objX + displayRadius + 25;
        const arrowLen = 60;

        // Gravity (always down)
        Draw.arrowLine(ctx, arrowOx, objDrawY - 20, arrowOx, objDrawY - 20 + arrowLen, '#e74c3c', 2.5);
        Draw.text(ctx, `重力 ${Fg.toFixed(3)}N`, arrowOx + 15, objDrawY - 20 + arrowLen / 2, '#e74c3c', 11, 'left', 'middle');

        // Buoyancy (always up)
        Draw.arrowLine(ctx, arrowOx + 35, objDrawY - 20 + arrowLen, arrowOx + 35, objDrawY - 20, '#2ecc71', 2.5);
        Draw.text(ctx, `浮力 ${Fb.toFixed(3)}N`, arrowOx + 50, objDrawY - 20 + arrowLen / 2, '#2ecc71', 11, 'left', 'middle');

        // Drag (opposes motion)
        if (Math.abs(v) > 0.001) {
            const dragMagnitude = Physics.stokesDrag(r, eta, Math.abs(v));
            const dragDir = v > 0 ? 1 : -1; // upward if sinking, downward if floating
            const dragY1 = objDrawY - 20 + arrowLen / 2 - dragDir * arrowLen * 0.5;
            const dragY2 = objDrawY - 20 + arrowLen / 2 + dragDir * arrowLen * 0.5;
            Draw.arrowLine(ctx, arrowOx + 70, dragY1, arrowOx + 70, dragY2, '#f39c12', 2.5);
            Draw.text(ctx, `阻力 ${dragMagnitude.toFixed(4)}N`, arrowOx + 85, objDrawY - 20 + arrowLen / 2, '#f39c12', 11, 'left', 'middle');
        }

        // Net force indicator
        const netArrowDir = Fnet > 0 ? 1 : -1;
        const netColor = Fnet > 0 ? '#e74c3c' : '#2ecc71';
        Draw.arrowLine(ctx, arrowOx + 110, objDrawY - 20 + arrowLen, arrowOx + 110, objDrawY - 20, netColor, 3);
        Draw.text(ctx, `合力 ${Fnet.toFixed(3)}N`, arrowOx + 125, objDrawY - 20 + arrowLen / 2, netColor, 11, 'left', 'middle');

        // --- v-t Graph ---
        const graphL = W * 0.52, graphR = W - 16;
        const graphT = H * 0.10, graphB = H * 0.45;
        const gW = graphR - graphL, gH = graphB - graphT;

        ctx.save();
        ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
        ctx.strokeRect(graphL, graphT, gW, gH);
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(graphL + 1, graphT + 1, gW - 2, gH - 2);
        Draw.text(ctx, '速度-时间图 (v-t)', graphL + gW / 2, graphT - 10, '#666', 12, 'center', 'bottom');

        // Zero line
        const zeroVY = graphT + gH / 2;
        ctx.strokeStyle = '#ccc'; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(graphL, zeroVY); ctx.lineTo(graphR, zeroVY); ctx.stroke();
        ctx.setLineDash([]);

        // Plot v-t history
        if (this.state.vHistory.length > 1) {
            const maxT = Math.max(this.state.time, 0.5);
            const maxV = Math.max(0.05, ...this.state.vHistory.map(p => Math.abs(p.v))) * 1.2;

            ctx.strokeStyle = '#7c8a9e'; ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < this.state.vHistory.length; i++) {
                const px = graphL + (this.state.vHistory[i].t / maxT) * gW;
                const py = zeroVY - (this.state.vHistory[i].v / maxV) * (gH / 2 * 0.85);
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();

            // Terminal velocity dashed line
            const vt = this.getPhysics().vt;
            if (vt > 0.001) {
                const vtY = zeroVY - (vt / maxV) * (gH / 2 * 0.85);
                ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
                ctx.beginPath(); ctx.moveTo(graphL, vtY); ctx.lineTo(graphR, vtY); ctx.stroke();
                ctx.setLineDash([]);
                Draw.text(ctx, `末速度 ${vt.toFixed(3)} m/s`, graphL + 6, vtY - 12, '#e74c3c', 10, 'left', 'bottom');
            }
        }
        ctx.restore();

        // --- y-t Graph ---
        const graphYtT = graphB + 20;
        const graphYtB = H - 20;
        const gYtH = graphYtB - graphYtT;

        ctx.save();
        ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
        ctx.strokeRect(graphL, graphYtT, gW, gYtH);
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(graphL + 1, graphYtT + 1, gW - 2, gYtH - 2);
        Draw.text(ctx, '位置-时间图 (y-t)', graphL + gW / 2, graphYtT - 10, '#666', 12, 'center', 'bottom');

        if (this.state.yHistory.length > 1) {
            const maxT = Math.max(this.state.time, 0.5);
            const maxY = Math.max(0.01, ...this.state.yHistory.map(p => p.y)) * 1.15;

            ctx.strokeStyle = '#2ecc71'; ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < this.state.yHistory.length; i++) {
                const px = graphL + (this.state.yHistory[i].t / maxT) * gW;
                const py = graphYtB - (this.state.yHistory[i].y / maxY) * (gYtH * 0.85);
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }
        ctx.restore();

        // Status text
        const modeText = Fnet > 0.001 ? '下沉中 ▼' : Fnet < -0.001 ? '上浮中 ▲' : '悬浮平衡';
        const modeColor = Fnet > 0.001 ? '#e74c3c' : Fnet < -0.001 ? '#2ecc71' : '#f39c12';
        Draw.text(ctx, `状态: ${modeText}`, beakerLeft + beakerW / 2, beakerBottom + 18, modeColor, 13, 'center', 'top');
        Draw.text(ctx, `t = ${this.state.time.toFixed(1)}s`, 12, 18, '#888', 11);
    },

    updateInfo: function() {
        const { rhoObj, rhoFluid, r, eta, volume, mass, Fg, Fb, vt } = this.getPhysics();
        const Fnet = Fg - Fb;
        const v = this.state.velocity;
        const Fd = Physics.stokesDrag(r, eta, Math.abs(v));
        const densityRatio = rhoObj / rhoFluid;
        const status = Fnet > 0.001 ? '下沉' : Fnet < -0.001 ? '上浮' : '悬浮';

        this.infoEl.innerHTML = `
            <div class="info-row"><span class="label">物体密度</span><span class="value">${rhoObj} kg/m³</span></div>
            <div class="info-row"><span class="label">流体密度</span><span class="value">${rhoFluid} kg/m³</span></div>
            <div class="info-row"><span class="label">密度比 ρₒ/ρ_f</span><span class="value">${densityRatio.toFixed(3)}</span></div>
            <div class="info-row"><span class="label">物体体积</span><span class="value">${(volume*1e6).toFixed(2)} cm³</span></div>
            <div class="info-row"><span class="label">物体质量</span><span class="value">${(mass*1000).toFixed(1)} g</span></div>
            <div class="info-row"><span class="label" style="color:#e74c3c;">重力 Fg</span><span class="value" style="color:#e74c3c;">${Fg.toFixed(4)} N</span></div>
            <div class="info-row"><span class="label" style="color:#2ecc71;">浮力 Fb</span><span class="value" style="color:#2ecc71;">${Fb.toFixed(4)} N</span></div>
            <div class="info-row"><span class="label" style="color:#f39c12;">阻力 Fd</span><span class="value" style="color:#f39c12;">${Fd.toFixed(6)} N</span></div>
            <div class="info-row"><span class="label">合力 Fnet</span><span class="value">${Fnet.toFixed(4)} N</span></div>
            <div class="info-row"><span class="label">当前速度</span><span class="value">${v.toFixed(5)} m/s</span></div>
            <div class="info-row"><span class="label">末速度 vt</span><span class="value">${vt.toFixed(5)} m/s</span></div>
            <div class="info-row"><span class="label">运动状态</span><span class="value">${status}</span></div>
            <div class="info-row"><span class="label">当前时间</span><span class="value">${this.state.time.toFixed(2)} s</span></div>
        `;
    },

    resize: function() { this.setupCanvas(); this.draw(); }
};
