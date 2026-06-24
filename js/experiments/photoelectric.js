/**
 * 实验: 光电效应
 * 模拟光电效应实验，显示电子发射、I-V特性曲线和截止电压
 * 物理原理: E_k = hf - W, 截止电压 V_s = (hf - W)/e
 */
const PhotoelectricExperiment = {
    id: 'photoelectric', title: '光电效应', category: 'modern',
    description: '研究光电效应现象，调节入射光波长、光强和加速电压。验证爱因斯坦光电方程 E_k = hν - W，观察截止电压与频率的关系。',

    state: {
        electrons: [],
        time: 0,
        isRunning: true,
        currentData: []
    },

    params: {
        wavelength: { value: 400, min: 100, max: 700, step: 5, label: '波长 λ (nm)' },
        intensity: { value: 50, min: 10, max: 100, step: 1, label: '光强 I (%)' },
        voltage: { value: 0, min: -5, max: 5, step: 0.1, label: '外加电压 V (V)' }
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
                this.state.currentData = [];
                if (key === 'wavelength') { this.state.electrons = []; }
            });
            this.controlsEl.appendChild(group);
        }
    },

    reset: function() {
        this.state.electrons = [];
        this.state.time = 0;
        this.state.isRunning = true;
        this.state.currentData = [];
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

    animate: function(timestamp) {
        if (!this.state.isRunning) return;
        if (this.lastTime === null) this.lastTime = timestamp;
        const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
        this.lastTime = timestamp;

        this.state.time += dt;

        const f = 3e17 / this.params.wavelength.value; // Hz (c=3e17 nm/s)
        const h = 6.626e-34;
        const W = 3.5e-19; // 功函数 ~2.2eV (钠)
        const E = h * f;
        const V = this.params.voltage.value;

        // 只有当光子能量超过功函数时才发射电子
        if (E > W) {
            const maxK = (E - W) / 1.602e-19; // 最大动能 (eV)
            const Vstop = maxK; // 截止电压

            // 发射电子（受光强和电压影响）
            const intensity = this.params.intensity.value / 100;
            const spawnRate = intensity * 30;
            if (Math.random() < spawnRate * dt) {
                // 计算电子动能受外加电压影响
                const kEnergy = Math.max(0, (E - W) - Math.max(0, -V * 1.602e-19)) / 1.602e-19;
                const kMax = Math.max(0, (E - W) / 1.602e-19 + V);
                if (kMax > 0) {
                    const kinetic = Math.random() * kMax * 0.8 + kMax * 0.2;
                    const speed = Math.sqrt(2 * kinetic * 1.602e-19 / 9.109e-31) * 1e-8;
                    const angle = (Math.random() - 0.5) * Math.PI * 0.4;
                    this.state.electrons.push({
                        x: 100, y: this.H / 2 + (Math.random() - 0.5) * 20,
                        vx: speed * Math.cos(angle),
                        vy: speed * Math.sin(angle),
                        age: 0, maxAge: 1.5 + Math.random()
                    });
                }
                // 数据记录
                if (this.state.currentData.length < 200) {
                    this.state.currentData.push({ V: V, I: intensity * maxK * 0.1 });
                }
            }
        }

        // 更新电子位置
        for (let i = this.state.electrons.length - 1; i >= 0; i--) {
            const el = this.state.electrons[i];
            el.x += el.vx * dt;
            el.y += el.vy * dt;
            el.age += dt;

            const anodeX = this.W - 80;
            if (el.x > anodeX || el.age > el.maxAge) {
                this.state.electrons.splice(i, 1);
            }
        }

        // 限制电子数量
        if (this.state.electrons.length > 100) {
            this.state.electrons.splice(0, this.state.electrons.length - 100);
        }

        this.draw(); this.updateInfo();
        this.animId = requestAnimationFrame((t) => this.animate(t));
    },

    draw: function() {
        const ctx = this.ctx, W = this.W, H = this.H;
        Draw.clear(ctx, W, H);

        // === 左侧: 实验装置示意图 ===
        const plateX = 80, anodeX = W * 0.45;
        const plateTop = H * 0.2, plateBottom = H * 0.8;
        const plateH = plateBottom - plateTop;
        const plateMid = (plateTop + plateBottom) / 2;

        // 光源（左侧）
        const lightSourceX = 20, lightSourceY = plateMid;
        const wavelength = this.params.wavelength.value;
        const rgb = Physics.wavelengthToRGB(wavelength);
        const lightColor = `rgb(${rgb.r},${rgb.g},${rgb.b})`;

        ctx.save();
        // 光源灯泡
        const bulbGrad = ctx.createRadialGradient(lightSourceX, lightSourceY, 2, lightSourceX, lightSourceY, 14);
        bulbGrad.addColorStop(0, '#ffffff');
        bulbGrad.addColorStop(0.3, lightColor);
        bulbGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = bulbGrad;
        ctx.beginPath(); ctx.arc(lightSourceX, lightSourceY, 14, 0, 2 * Math.PI); ctx.fill();

        // 光线束
        for (let i = -2; i <= 2; i++) {
            const ly = lightSourceY + i * 8;
            ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${0.15 + Math.abs(Math.sin(this.state.time * 3 + i)) * 0.15})`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(lightSourceX + 14, ly);
            ctx.lineTo(plateX - 2, plateMid + i * 15);
            ctx.stroke();
        }
        ctx.restore();
        Draw.text(ctx, '光源', lightSourceX, lightSourceY - 22, '#888', 12, 'center');

        // 阴极金属板
        ctx.save();
        const metalGrad = ctx.createLinearGradient(plateX, 0, plateX + 15, 0);
        metalGrad.addColorStop(0, '#888');
        metalGrad.addColorStop(0.3, '#bbb');
        metalGrad.addColorStop(0.7, '#999');
        metalGrad.addColorStop(1, '#666');
        ctx.fillStyle = metalGrad;
        ctx.fillRect(plateX, plateTop, 15, plateH);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.strokeRect(plateX, plateTop, 15, plateH);
        ctx.restore();
        Draw.text(ctx, '阴极 (K)', plateX + 7, plateBottom + 16, '#888', 11, 'center');

        // 阳极
        ctx.save();
        ctx.fillStyle = '#999';
        ctx.fillRect(anodeX, plateTop, 10, plateH);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.strokeRect(anodeX, plateTop, 10, plateH);
        ctx.restore();
        Draw.text(ctx, '阳极 (A)', anodeX + 5, plateBottom + 16, '#888', 11, 'center');

        // 导线和电压表
        ctx.save();
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        // 顶部导线
        ctx.beginPath();
        ctx.moveTo(plateX + 15, plateTop);
        ctx.lineTo(anodeX, plateTop);
        ctx.stroke();
        // 底部导线
        ctx.beginPath();
        ctx.moveTo(plateX + 15, plateBottom);
        ctx.lineTo(anodeX, plateBottom);
        ctx.stroke();
        ctx.restore();

        // 电压表连接
        const vmX = anodeX + 40, vmY = plateMid - 20;
        ctx.save();
        ctx.fillStyle = '#fafafa';
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.rect(vmX - 28, vmY - 10, 56, 25);
        ctx.fill(); ctx.stroke();
        Draw.text(ctx, `V = ${this.params.voltage.value.toFixed(1)} V`, vmX, vmY + 5, '#e74c3c', 12, 'center');
        // 连线到电压表
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(anodeX + 50, plateTop + 5);
        ctx.lineTo(vmX - 10, vmY - 10);
        ctx.moveTo(anodeX + 50, plateBottom - 5);
        ctx.lineTo(vmX - 10, vmY + 15);
        ctx.stroke();
        ctx.restore();

        // 发射的电子
        for (const el of this.state.electrons) {
            const alpha = 1 - el.age / el.maxAge;
            ctx.save();
            ctx.fillStyle = `rgba(52, 152, 219, ${alpha})`;
            ctx.beginPath();
            ctx.arc(el.x, el.y, 3, 0, 2 * Math.PI);
            ctx.fill();
            // 小速度箭头
            ctx.strokeStyle = `rgba(52, 152, 219, ${alpha * 0.5})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(el.x, el.y);
            ctx.lineTo(el.x + el.vx * 0.3, el.y + el.vy * 0.3);
            ctx.stroke();
            ctx.restore();
        }
        Draw.text(ctx, 'e⁻ e⁻ e⁻', plateX + 25, plateMid, 'rgba(52,152,219,0.6)', 11, 'center');

        // === 右侧: I-V 曲线图 ===
        const ivX = W * 0.52, ivY = H * 0.1;
        const ivW = W * 0.44, ivH = H * 0.7;

        // 背景
        ctx.save();
        ctx.fillStyle = '#fafafa';
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        ctx.fillRect(ivX, ivY, ivW, ivH);
        ctx.strokeRect(ivX, ivY, ivW, ivH);

        // 网格
        ctx.strokeStyle = '#eee';
        ctx.lineWidth = 0.5;
        for (let i = 1; i < 5; i++) {
            const gy = ivY + (i / 5) * ivH;
            ctx.beginPath(); ctx.moveTo(ivX, gy); ctx.lineTo(ivX + ivW, gy); ctx.stroke();
        }
        for (let i = 1; i < 5; i++) {
            const gx = ivX + (i / 5) * ivW;
            ctx.beginPath(); ctx.moveTo(gx, ivY); ctx.lineTo(gx, ivY + ivH); ctx.stroke();
        }

        // 坐标轴
        const ax0 = ivX, ay0 = ivY + ivH;
        const zeroVX = ivX + ivW / 2;

        ctx.strokeStyle = '#888';
        ctx.lineWidth = 1.5;
        // Y轴
        ctx.beginPath(); ctx.moveTo(ax0, ivY); ctx.lineTo(ax0, ivY + ivH); ctx.stroke();
        // X轴
        ctx.beginPath(); ctx.moveTo(ivX, ay0); ctx.lineTo(ivX + ivW, ay0); ctx.stroke();

        // 零电压线
        ctx.strokeStyle = '#ccc';
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(zeroVX, ivY); ctx.lineTo(zeroVX, ivY + ivH); ctx.stroke();
        ctx.setLineDash([]);

        // 标签
        Draw.text(ctx, 'I-V 特性曲线', ivX + ivW / 2, ivY - 16, '#666', 13, 'center', 'bottom');
        Draw.text(ctx, 'V (V)', ivX + ivW / 2, ay0 + 18, '#888', 11, 'center', 'top');
        Draw.text(ctx, 'I', ax0 - 20, ivY + ivH / 2, '#888', 11, 'center', 'middle');

        // X轴刻度
        for (let v = -5; v <= 5; v += 1) {
            const vx = zeroVX + (v / 5) * (ivW / 2);
            Draw.text(ctx, `${v}`, vx, ay0 + 5, '#999', 9, 'center', 'top');
        }

        // 绘制理论 I-V 曲线
        const f = 3e17 / wavelength;
        const hJs = 6.626e-34;
        const Wfunc = 3.5e-19;
        const Ephot = hJs * f;
        const maxKE = Ephot > Wfunc ? (Ephot - Wfunc) / 1.602e-19 : 0;
        const Vstop = maxKE;
        const intensity = this.params.intensity.value / 100;

        ctx.save();
        ctx.strokeStyle = '#7c8a9e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        let started = false;
        for (let i = 0; i <= 200; i++) {
            const v = -5 + (i / 200) * 10;
            let Ival = 0;
            if (Ephot > Wfunc && v > -Vstop) {
                // 饱和电流随电压增加趋近于最大值
                const vNorm = (v - (-Vstop)) / Math.max(Vstop + 5, 0.1);
                Ival = intensity * 5 * Math.min(1, vNorm * 1.5) * (1 - Math.exp(-vNorm * 3));
            }
            const px = zeroVX + (v / 5) * (ivW / 2);
            const py = ay0 - Ival / 6 * ivH;
            if (!started) { ctx.moveTo(px, py); started = true; }
            else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.restore();

        // 标注截止电压
        if (Ephot > Wfunc) {
            const vsx = zeroVX + (-Vstop / 5) * (ivW / 2);
            ctx.save();
            ctx.strokeStyle = '#e74c3c';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(vsx, ivY); ctx.lineTo(vsx, ay0);
            ctx.stroke();
            ctx.setLineDash([]);
            Draw.text(ctx, `Vₛ = ${(-Vstop).toFixed(2)}V`, vsx + 4, ivY + 10, '#e74c3c', 10, 'left', 'top');
            ctx.restore();
        }

        // === 底部: 能量级图 ===
        const erX = ivX, erY = ay0 + 50;
        const erW = ivW, erH = H - erY - 20;

        ctx.save();
        ctx.fillStyle = '#fafafa';
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        ctx.fillRect(erX, erY, erW, erH);
        ctx.strokeRect(erX, erY, erW, erH);
        Draw.text(ctx, '能量级图', erX + erW / 2, erY - 5, '#666', 12, 'center', 'bottom');

        // 费米能级
        const efY = erY + erH * 0.7;
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(erX + 20, efY); ctx.lineTo(erX + erW - 20, efY); ctx.stroke();
        Draw.text(ctx, '费米能级 E_F', erX + 22, efY - 6, '#555', 11);

        // 真空能级
        const evY = erY + erH * 0.15;
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 3]);
        ctx.beginPath(); ctx.moveTo(erX + 20, evY); ctx.lineTo(erX + erW - 20, evY); ctx.stroke();
        ctx.setLineDash([]);
        Draw.text(ctx, '真空能级', erX + 22, evY - 4, '#999', 11);

        // 功函数
        const wfH = efY - evY;
        ctx.save();
        ctx.fillStyle = 'rgba(231,76,60,0.1)';
        ctx.fillRect(erX + erW - 70, evY, 20, wfH);
        Draw.arrowLine(ctx, erX + erW - 60, efY, erX + erW - 60, evY, '#e74c3c', 2);
        Draw.text(ctx, `W = 2.2eV`, erX + erW - 120, evY + wfH / 2 - 6, '#e74c3c', 10, 'right', 'middle');
        ctx.restore();

        // 光子能量
        const EeV = Ephot / 1.602e-19;
        ctx.save();
        const phH = Math.min(erH * 0.5, EeV * 15);
        const phX = erX + 70;
        ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.15)`;
        ctx.fillRect(phX, efY - phH, 20, phH);
        ctx.strokeStyle = lightColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(phX + 10, efY); ctx.lineTo(phX + 10, efY - phH); ctx.stroke();
        ctx.setLineDash([]);
        Draw.text(ctx, `hν = ${EeV.toFixed(2)}eV`, phX - 10, efY - phH / 2, lightColor, 10, 'right', 'middle');
        ctx.restore();

        // 发射电子能量
        if (Ephot > Wfunc) {
            const keH = (Ephot - Wfunc) / 1.602e-19 * 15;
            const keX = erX + 130;
            ctx.save();
            ctx.fillStyle = 'rgba(52, 152, 219, 0.15)';
            ctx.fillRect(keX, efY - keH, 20, keH);
            ctx.strokeStyle = '#3498db';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(keX + 10, efY); ctx.lineTo(keX + 10, efY - keH); ctx.stroke();
            Draw.text(ctx, `E_k = ${((Ephot - Wfunc) / 1.602e-19).toFixed(2)}eV`, keX - 8, efY - keH / 2, '#3498db', 10, 'right', 'middle');
            ctx.restore();
        }

        ctx.restore();

        // 图例
        Draw.text(ctx, `λ = ${wavelength}nm  I = ${this.params.intensity.value}%  V = ${this.params.voltage.value.toFixed(1)}V`,
            W / 2, H - 6, '#888', 11, 'center', 'bottom');
    },

    updateInfo: function() {
        const wavelength = this.params.wavelength.value;
        const f = 3e17 / wavelength;
        const h = 6.626e-34;
        const W = 3.5e-19;
        const E = h * f / 1.602e-19;
        const Ek = Math.max(0, E - 2.2);
        const freqTHz = f / 1e12;
        const electronCount = this.state.electrons.length;
        const photocurrent = electronCount > 0 ? (electronCount / 100 * 10).toFixed(3) : '0.000';

        this.infoEl.innerHTML = `
            <div class="info-row"><span class="label">频率 ν</span><span class="value">${freqTHz.toFixed(0)} THz</span></div>
            <div class="info-row"><span class="label">光子能量 hν</span><span class="value">${E.toFixed(3)} eV</span></div>
            <div class="info-row"><span class="label">功函数 W</span><span class="value">2.200 eV</span></div>
            <div class="info-row"><span class="label">最大动能 E_k</span><span class="value">${Ek.toFixed(3)} eV</span></div>
            <div class="info-row"><span class="label">截止电压 V_s</span><span class="value">${Ek.toFixed(2)} V</span></div>
            <div class="info-row"><span class="label">光电流</span><span class="value">${photocurrent} mA</span></div>
            <div class="info-row"><span class="label">截止频率 ν₀</span><span class="value">${(W / h / 1e12).toFixed(0)} THz</span></div>
        `;
    },

    resize: function() { this.setupCanvas(); this.draw(); }
};
