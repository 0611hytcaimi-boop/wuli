/**
 * 实验: 三体运动
 * 模拟三个天体在相互引力作用下的运动 - 经典多体问题
 * 物理原理: F = G·m₁m₂/r², 无法得到解析解, 展示混沌轨道
 */
const ThreeBodyExperiment = {
    id: 'three-body', title: '三体运动', category: 'mechanics',
    description: '观察三个天体在万有引力作用下的复杂运动。三体问题没有解析解，运动轨迹高度依赖初始条件，是混沌系统的经典范例。',

    state: {
        bodies: [],     // [{x, y, vx, vy, m, color}]
        trails: [],     // 每个天体的轨迹 [[{x,y},...], ...]
        time: 0,
        isRunning: false,
        centerOfMass: { x: 0, y: 0 }
    },

    params: {
        mass1: { value: 3, min: 1, max: 10, step: 0.5, label: '质量 m₁ (归一化)' },
        mass2: { value: 3, min: 1, max: 10, step: 0.5, label: '质量 m₂ (归一化)' },
        mass3: { value: 3, min: 1, max: 10, step: 0.5, label: '质量 m₃ (归一化)' },
        speed: { value: 1, min: 0.2, max: 3, step: 0.1, label: '模拟速度' }
    },

    info: {}, animId: null, lastTime: null,

    init: function(canvas, controls, info) {
        this.canvas = canvas; this.ctx = canvas.getContext('2d');
        this.controlsEl = controls; this.infoEl = info;
        this.setupCanvas(); this.createControls(); this.reset();
        document.getElementById('exp-description').innerHTML =
            this.description +
            '<br><span style="font-size:11px;color:#aaa;">三个天体仅在彼此万有引力作用下运动，系统不受外部作用力；三体问题无通用解析解，属于混沌系统。</span>';
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
            });
            this.controlsEl.appendChild(group);
            if (key === 'mass3') {
                const note = document.createElement('div');
                note.style.cssText = 'font-size:10px;color:#999;line-height:1.5;margin:2px 0 8px 0;padding:0 2px;';
                note.textContent = '本仿真采用无量纲归一化引力模型，省略万有引力常数G，数值仅代表天体相对引力大小，非真实千克质量；天体速度为归一化速度。';
                this.controlsEl.appendChild(note);
            }
        }
    },

    reset: function() {
        const W = this.W, H = this.H;
        const cx = W / 2, cy = H / 2;
        const scale = Math.min(W, H) * 0.4;
        const m1 = this.params.mass1.value;
        const m2 = this.params.mass2.value;
        const m3 = this.params.mass3.value;
        const speedMul = this.params.speed.value * 0.5;

        // 使用近似8字形轨道的初始条件（Chenciner-Montgomery）
        // 缩放并居中
        this.state.bodies = [
            {
                x: cx + 0.9700436 * scale * 0.5,
                y: cy - 0.24308753 * scale * 0.5,
                vx: 0.466203685 * scale * speedMul * 0.5,
                vy: 0.43236573 * scale * speedMul * 0.5,
                m: m1, color: '#7c8a9e'
            },
            {
                x: cx - 0.9700436 * scale * 0.5,
                y: cy + 0.24308753 * scale * 0.5,
                vx: 0.466203685 * scale * speedMul * 0.5,
                vy: 0.43236573 * scale * speedMul * 0.5,
                m: m2, color: '#e74c3c'
            },
            {
                x: cx + 0,
                y: cy + 0,
                vx: -0.93240737 * scale * speedMul * 0.5,
                vy: -0.86473146 * scale * speedMul * 0.5,
                m: m3, color: '#f1c40f'
            }
        ];

        this.state.trails = [[], [], []];
        this.state.time = 0;
        this.state.isRunning = false;
        this.state.centerOfMass = this.calculateCenterOfMass();
        this.lastTime = null;
        document.getElementById('btn-pause').textContent = '开始';
        document.getElementById('btn-pause').classList.remove('paused');
        this.draw(); this.updateInfo();
    },

    calculateCenterOfMass: function() {
        const bodies = this.state.bodies;
        const totalMass = bodies.reduce((s, b) => s + b.m, 0);
        if (totalMass === 0) return { x: this.W / 2, y: this.H / 2 };
        return {
            x: bodies.reduce((s, b) => s + b.x * b.m, 0) / totalMass,
            y: bodies.reduce((s, b) => s + b.y * b.m, 0) / totalMass
        };
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
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.033) * this.params.speed.value;
        this.lastTime = timestamp;

        const bodies = this.state.bodies;
        const N = bodies.length;

        // 计算每个天体受到的合力
        const forces = [];
        for (let i = 0; i < N; i++) {
            forces.push({ fx: 0, fy: 0 });
        }

        for (let i = 0; i < N; i++) {
            for (let j = i + 1; j < N; j++) {
                const dx = bodies[j].x - bodies[i].x;
                const dy = bodies[j].y - bodies[i].y;
                const f = Physics.gravityForce(bodies[i].m, bodies[j].m, dx, dy);
                forces[i].fx += f.fx;
                forces[i].fy += f.fy;
                forces[j].fx -= f.fx;
                forces[j].fy -= f.fy;
            }
        }

        // 更新速度和位置 (使用半隐式欧拉)
        for (let i = 0; i < N; i++) {
            bodies[i].vx += (forces[i].fx / bodies[i].m) * dt;
            bodies[i].vy += (forces[i].fy / bodies[i].m) * dt;
        }
        for (let i = 0; i < N; i++) {
            bodies[i].x += bodies[i].vx * dt;
            bodies[i].y += bodies[i].vy * dt;
        }

        this.state.time += dt;

        // 更新轨迹
        for (let i = 0; i < N; i++) {
            this.state.trails[i].push({ x: bodies[i].x, y: bodies[i].y });
            if (this.state.trails[i].length > 400) this.state.trails[i].shift();
        }

        this.state.centerOfMass = this.calculateCenterOfMass();

        this.draw(); this.updateInfo();
        this.animId = requestAnimationFrame((t) => this.animate(t));
    },

    draw: function() {
        const ctx = this.ctx, W = this.W, H = this.H;
        Draw.clear(ctx, W, H, '#050510');

        // 星空背景
        ctx.save();
        // 生成伪随机星点 (使用确定性种子)
        for (let i = 0; i < 60; i++) {
            const sx = ((i * 137 + 53) % W + W) % W;
            const sy = ((i * 251 + 97) % H + H) % H;
            const brightness = ((i * 73 + 41) % 60) / 100 + 0.15;
            ctx.fillStyle = `rgba(255,255,255,${brightness})`;
            ctx.fillRect(sx, sy, 1.5, 1.5);
        }
        ctx.restore();

        // 三天体之间的引力连线（代表相互万有引力作用）
        const bodies = this.state.bodies;
        for (let i = 0; i < bodies.length; i++) {
            for (let j = i + 1; j < bodies.length; j++) {
                ctx.save();
                ctx.strokeStyle = 'rgba(255,255,255,0.12)';
                ctx.lineWidth = 0.8;
                ctx.setLineDash([3, 5]);
                ctx.beginPath();
                ctx.moveTo(bodies[i].x, bodies[i].y);
                ctx.lineTo(bodies[j].x, bodies[j].y);
                ctx.stroke();
                ctx.restore();
            }
        }

        // 轨迹
        for (let i = 0; i < this.state.trails.length; i++) {
            const trail = this.state.trails[i];
            const color = this.state.bodies[i].color;
            if (trail.length < 2) continue;

            ctx.save();
            for (let j = 1; j < trail.length; j++) {
                const alpha = 0.1 + (j / trail.length) * 0.5;
                ctx.strokeStyle = color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
                if (color.startsWith('#')) {
                    const r = parseInt(color.slice(1, 3), 16);
                    const g = parseInt(color.slice(3, 5), 16);
                    const b = parseInt(color.slice(5, 7), 16);
                    ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
                }
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(trail[j - 1].x, trail[j - 1].y);
                ctx.lineTo(trail[j].x, trail[j].y);
                ctx.stroke();
            }
            ctx.restore();
        }

        // 天体 (按质量从大到小绘制, 小的在上面)
        const sorted = [...this.state.bodies].map((b, i) => ({ ...b, idx: i }))
            .sort((a, b) => b.m - a.m);

        for (const body of sorted) {
            const r = Math.max(5, Math.min(22, 6 + body.m * 2));
            ctx.save();

            // 发光光晕
            const glow = ctx.createRadialGradient(body.x, body.y, r * 0.3, body.x, body.y, r * 2.5);
            const c = body.color;
            let rv, gv, bv;
            if (c.startsWith('#')) {
                rv = parseInt(c.slice(1, 3), 16);
                gv = parseInt(c.slice(3, 5), 16);
                bv = parseInt(c.slice(5, 7), 16);
            } else {
                rv = 255; gv = 255; bv = 255;
            }
            glow.addColorStop(0, `rgba(${rv},${gv},${bv},0.9)`);
            glow.addColorStop(0.4, `rgba(${rv},${gv},${bv},0.3)`);
            glow.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(body.x, body.y, r * 2.5, 0, 2 * Math.PI);
            ctx.fill();

            // 天体球体
            const grad = ctx.createRadialGradient(body.x - r * 0.25, body.y - r * 0.25, r * 0.1, body.x, body.y, r);
            grad.addColorStop(0, `rgba(${rv},${gv},${bv},1)`);
            grad.addColorStop(0.7, `rgba(${Math.round(rv*0.5)},${Math.round(gv*0.5)},${Math.round(bv*0.5)},1)`);
            grad.addColorStop(1, `rgba(${Math.round(rv*0.2)},${Math.round(gv*0.2)},${Math.round(bv*0.2)},1)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(body.x, body.y, r, 0, 2 * Math.PI);
            ctx.fill();
            ctx.restore();

            // 质量标签
            Draw.text(ctx, `m${body.idx + 1}=${body.m.toFixed(1)}`,
                body.x + r + 6, body.y + r + 2, 'rgba(255,255,255,0.4)', 10, 'left', 'top');
        }

        // 质心
        const cm = this.state.centerOfMass;
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(cm.x - 10, cm.y);
        ctx.lineTo(cm.x + 10, cm.y);
        ctx.moveTo(cm.x, cm.y - 10);
        ctx.lineTo(cm.x, cm.y + 10);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath();
        ctx.arc(cm.x, cm.y, 3, 0, 2 * Math.PI);
        ctx.fill();
        Draw.text(ctx, '质心', cm.x + 12, cm.y - 8, 'rgba(255,255,255,0.5)', 10, 'left', 'middle');
        ctx.restore();

        // 底部标签
        const labels = this.state.bodies.map((b, i) =>
            `<span style="color:${b.color}">■ m${i + 1}</span>`
        ).join(' ');
        ctx.save();
        ctx.font = '11px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.textAlign = 'left';
        ctx.fillText(`t = ${this.state.time.toFixed(1)} s    ${labels}`, 12, 18);
        ctx.restore();

        const colorNote = 'rgba(255,255,255,0.2)';
        Draw.text(ctx, '8字形轨道是三体极少数稳定特解，绝大多数初始条件下天体会发生碰撞或逃逸', W / 2, H - 14, colorNote, 10, 'center', 'bottom');
    },

    updateInfo: function() {
        const bodies = this.state.bodies;
        const cm = this.state.centerOfMass;

        // 动能
        let Ek = 0;
        for (const b of bodies) {
            const v2 = b.vx * b.vx + b.vy * b.vy;
            Ek += 0.5 * b.m * v2;
        }

        // 势能 (G=1)
        let Ep = 0;
        const N = bodies.length;
        for (let i = 0; i < N; i++) {
            for (let j = i + 1; j < N; j++) {
                const dx = bodies[i].x - bodies[j].x;
                const dy = bodies[i].y - bodies[j].y;
                const r = Math.sqrt(dx * dx + dy * dy);
                if (r > 0.1) {
                    Ep -= bodies[i].m * bodies[j].m / r;
                }
            }
        }

        const Et = Ek + Ep;

        let bodyInfo = '';
        for (let i = 0; i < N; i++) {
            const b = bodies[i];
            const v = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
            bodyInfo += `<div class="info-row"><span class="label" style="color:${b.color};">天体 ${i + 1}</span><span class="value">v=${v.toFixed(1)} / m=${b.m}</span></div>`;
        }

        this.infoEl.innerHTML = `
            ${bodyInfo}
            <div class="info-row"><span class="label">动能 Ek</span><span class="value">${Ek.toFixed(1)}</span></div>
            <div class="info-row"><span class="label">势能 Ep</span><span class="value">${Ep.toFixed(1)}</span></div>
            <div class="info-row"><span class="label">总能量 E</span><span class="value">${Et.toFixed(1)}</span></div>
            <div style="font-size:10px;color:#999;line-height:1.4;margin-top:4px;padding-top:4px;border-top:1px solid rgba(0,0,0,0.06);">引力势能零点取无穷远处，因此势能恒为负值；孤立三体系统无外力损耗，总机械能守恒。</div>
            <div class="info-row"><span class="label">质心 X (归一化坐标)</span><span class="value">${(cm.x - this.W/2).toFixed(0)}</span></div>
            <div class="info-row"><span class="label">质心 Y (归一化坐标)</span><span class="value">${(cm.y - this.H/2).toFixed(0)}</span></div>
            <div class="info-row"><span class="label">运行时间</span><span class="value">${this.state.time.toFixed(1)} s</span></div>
        `;
    },

    resize: function() { this.setupCanvas(); this.draw(); }
};
