/**
 * 实验8: 光的折射
 * 模拟光从一种介质射入另一种介质时的折射现象
 * 物理原理: n₁sin(θ₁) = n₂sin(θ₂)，全反射条件
 */
const RefractionExperiment = {
    id: 'refraction', title: '光的折射', category: 'optics',
    description: '研究光的折射定律（斯涅尔定律）。调节入射角和两种介质的折射率，观察折射角和全反射现象。',

    state: { angle1: 0, angle2: 0, totalReflection: false },

    params: {
        n1: { value: 1.0, min: 1.0, max: 2.5, step: 0.1, label: '介质1 折射率 n₁' },
        n2: { value: 1.5, min: 1.0, max: 2.5, step: 0.1, label: '介质2 折射率 n₂' },
        incidentAngle: { value: 30, min: 0, max: 89, step: 1, label: '入射角 θ₁ (°)' },
        showNormal: { value: true, type: 'boolean', label: '显示法线' }
    },

    init: function(canvas, controls, info) {
        this.canvas = canvas; this.ctx = canvas.getContext('2d');
        this.controlsEl = controls; this.infoEl = info;
        this.setupCanvas(); this.createControls();
        document.getElementById('btn-pause').style.display = 'none';
        document.getElementById('btn-reset').textContent = '更新';
        this.draw(); this.updateInfo();
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
                group.innerHTML = `<label><input type="checkbox" ${param.value ? 'checked' : ''} data-key="${key}"> ${param.label}</label>`;
                group.querySelector('input').addEventListener('change', (e) => {
                    this.params[key].value = e.target.checked;
                    this.draw();
                });
            } else {
                group.innerHTML = `
                    <label><span>${param.label}</span><span class="value" id="val-${key}">${param.value}</span></label>
                    <input type="range" min="${param.min}" max="${param.max}" step="${param.step}" value="${param.value}" data-key="${key}">`;
                group.querySelector('input').addEventListener('input', (e) => {
                    const val = parseFloat(e.target.value);
                    this.params[key].value = val;
                    document.getElementById(`val-${key}`).textContent = val;
                    this.draw(); this.updateInfo();
                });
            }
            this.controlsEl.appendChild(group);
        }
    },

    draw: function() {
        const ctx = this.ctx, W = this.W, H = this.H;
        Draw.clear(ctx, W, H);

        const cx = W / 2, cy = H / 2;

        // 介质分界
        ctx.save();
        const grad1 = ctx.createLinearGradient(0, 0, 0, cy);
        grad1.addColorStop(0, '#e8f4fd'); grad1.addColorStop(1, '#d0eafc');
        ctx.fillStyle = grad1; ctx.fillRect(0, 0, W, cy);

        const grad2 = ctx.createLinearGradient(0, cy, 0, H);
        grad2.addColorStop(0, '#e8f8f0'); grad2.addColorStop(1, '#d0f0e0');
        ctx.fillStyle = grad2; ctx.fillRect(0, cy, W, H);
        ctx.restore();

        // 分界面
        ctx.save();
        ctx.strokeStyle = '#555'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
        ctx.restore();

        // 法线
        if (this.params.showNormal.value) {
            ctx.save();
            ctx.strokeStyle = '#aaa'; ctx.lineWidth = 1; ctx.setLineDash([5, 5]);
            ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();
            ctx.setLineDash([]);
            Draw.text(ctx, '法线', cx + 6, 8, '#aaa', 12);
            ctx.restore();
        }

        const n1 = this.params.n1.value;
        const n2 = this.params.n2.value;
        const theta1 = Physics.toRad(this.params.incidentAngle.value);
        const theta2 = Physics.snellLaw(n1, n2, theta1);
        this.state.totalReflection = theta2 === null;

        const rayLen = Math.min(W, H) * 0.4;

        // 入射光线
        const a1x = cx - rayLen * Math.sin(theta1);
        const a1y = cy - rayLen * Math.cos(theta1);
        Draw.arrowLine(ctx, a1x, a1y, cx, cy, '#e74c3c', 2.5);

        // 标记入射角
        ctx.save();
        ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 1;
        const arcR = 30;
        ctx.beginPath();
        ctx.arc(cx, cy, arcR, -Math.PI / 2, -Math.PI / 2 + theta1);
        ctx.stroke();
        const midAngle = -Math.PI / 2 + theta1 / 2;
        Draw.text(ctx, `θ₁=${this.params.incidentAngle.value}°`,
            cx + (arcR + 20) * Math.cos(midAngle), cy + (arcR + 20) * Math.sin(midAngle), '#e74c3c', 12, 'center', 'middle');
        ctx.restore();

        // 反射光线
        const rfx = cx + rayLen * Math.sin(theta1);
        const rfy = cy - rayLen * Math.cos(theta1);
        ctx.save();
        ctx.strokeStyle = '#f39c12'; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(rfx, rfy); ctx.stroke();
        ctx.setLineDash([]);
        Draw.text(ctx, '反射光', rfx - 40, rfy - 10, '#f39c12', 12);
        ctx.restore();

        if (!this.state.totalReflection) {
            // 折射光线
            const a2x = cx + rayLen * Math.sin(theta2);
            const a2y = cy + rayLen * Math.cos(theta2);
            Draw.arrowLine(ctx, cx, cy, a2x, a2y, '#3498db', 2.5);

            // 标记折射角
            ctx.save();
            ctx.strokeStyle = '#3498db'; ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(cx, cy, arcR, Math.PI / 2, Math.PI / 2 + (Math.PI / 2 - theta2));
            ctx.stroke();
            Draw.text(ctx, `θ₂=${Physics.toDeg(theta2).toFixed(1)}°`,
                cx + (arcR + 20) * Math.sin(Math.PI / 2 - theta2 / 2),
                cy + (arcR + 20) * Math.cos(Math.PI / 2 - theta2 / 2), '#3498db', 12, 'center', 'middle');
            ctx.restore();
        } else {
            // 全反射
            ctx.save();
            ctx.fillStyle = 'rgba(231,76,60,0.15)';
            ctx.fillRect(cx, cy, W - cx, H - cy);
            Draw.text(ctx, '⚠️ 全反射', cx + 80, cy + 40, '#e74c3c', 16, 'left');
            // 计算临界角
            const criticalAngle = Physics.toDeg(Math.asin(n2 / n1));
            Draw.text(ctx, `临界角 = ${criticalAngle.toFixed(1)}°`, cx + 80, cy + 64, '#e74c3c', 13, 'left');
            ctx.restore();
        }

        // 介质标签
        Draw.text(ctx, `介质1  n₁ = ${n1}`, 12, 16, '#2980b9', 13);
        Draw.text(ctx, `介质2  n₂ = ${n2}`, 12, H - 16, '#27ae60', 13);
    },

    reset: function() { this.draw(); this.updateInfo(); },
    togglePause: function() {},

    updateInfo: function() {
        const n1 = this.params.n1.value;
        const n2 = this.params.n2.value;
        const theta1 = this.params.incidentAngle.value;
        const theta1Rad = Physics.toRad(theta1);
        const theta2Rad = Physics.snellLaw(n1, n2, theta1Rad);
        const criticalAngle = n1 > n2 ? Physics.toDeg(Math.asin(n2 / n1)) : '无（光密→光疏）';

        const theta2Str = theta2Rad ? `${Physics.toDeg(theta2Rad).toFixed(2)}°` : '全反射';

        this.infoEl.innerHTML = `
            <div class="info-row"><span class="label">入射角 θ₁</span><span class="value">${theta1}°</span></div>
            <div class="info-row"><span class="label">折射角 θ₂</span><span class="value">${theta2Str}</span></div>
            <div class="info-row"><span class="label">n₁sin(θ₁)</span><span class="value">${(n1 * Math.sin(theta1Rad)).toFixed(4)}</span></div>
            <div class="info-row"><span class="label">n₂sin(θ₂)</span><span class="value">${theta2Rad ? (n2 * Math.sin(theta2Rad)).toFixed(4) : '—'}</span></div>
            <div class="info-row"><span class="label">相对折射率 n₂/n₁</span><span class="value">${(n2 / n1).toFixed(3)}</span></div>
            <div class="info-row"><span class="label">临界角</span><span class="value">${typeof criticalAngle === 'string' ? criticalAngle : criticalAngle.toFixed(1) + '°'}</span></div>
        `;
    },

    resize: function() { this.setupCanvas(); this.draw(); }
};
