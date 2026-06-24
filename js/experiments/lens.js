/**
 * 实验7: 凸透镜成像
 * 模拟凸透镜成像规律，支持调节焦距和物距
 * 物理原理: 1/f = 1/u + 1/v, 放大率 M = |v/u|
 */
const LensExperiment = {
    id: 'lens', title: '凸透镜成像', category: 'optics',
    description: '研究凸透镜成像规律，可调节焦距和物距。观察成像位置、大小和倒正变化。验证高斯透镜方程 1/f = 1/u + 1/v。',

    state: { u: 150, imageType: '' },

    params: {
        focalLength: { value: 80, min: 40, max: 150, step: 5, label: '焦距 f' },
        objectDist: { value: 150, min: 30, max: 300, step: 5, label: '物距 u' },
        objectHeight: { value: 50, min: 20, max: 100, step: 5, label: '物体高度' }
    },

    draw: function() {
        const ctx = this.ctx, W = this.W, H = this.H;
        Draw.clear(ctx, W, H);

        const f = this.params.focalLength.value;
        const u = this.params.objectDist.value;
        const objH = this.params.objectHeight.value;

        const cx = W * 0.4;
        const baseY = H * 0.65;

        // 主光轴
        ctx.save();
        ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath(); ctx.moveTo(30, baseY); ctx.lineTo(W - 30, baseY);
        ctx.stroke(); ctx.setLineDash([]);
        ctx.restore();

        // 透镜
        ctx.save();
        ctx.strokeStyle = '#7c8a9e'; ctx.lineWidth = 3;
        // 双线表示凸透镜
        ctx.beginPath();
        ctx.arc(cx, baseY - 60, 65, -Math.PI / 4, Math.PI / 4);
        ctx.moveTo(cx, baseY - 60);
        ctx.arc(cx, baseY + 60, 65, Math.PI / 4, 3 * Math.PI / 4, true);
        ctx.stroke();
        // 透镜中心竖线
        ctx.strokeStyle = 'rgba(124,138,158,0.3)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx, baseY - 70); ctx.lineTo(cx, baseY + 70);
        ctx.stroke();
        ctx.restore();

        // 焦点标记
        const fL = cx - f, fR = cx + f;
        ctx.save();
        ctx.fillStyle = '#e74c3c';
        ctx.beginPath(); ctx.arc(fL, baseY, 4, 0, 2 * Math.PI); ctx.fill();
        ctx.beginPath(); ctx.arc(fR, baseY, 4, 0, 2 * Math.PI); ctx.fill();
        Draw.text(ctx, 'F', fL - 10, baseY + 16, '#e74c3c', 12, 'center');
        Draw.text(ctx, "F'", fR + 10, baseY + 16, '#e74c3c', 12, 'center');

        // 2F
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath(); ctx.arc(cx - 2 * f, baseY, 3, 0, 2 * Math.PI); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 2 * f, baseY, 3, 0, 2 * Math.PI); ctx.fill();
        Draw.text(ctx, '2F', cx - 2 * f - 10, baseY + 16, '#f59e0b', 12, 'center');
        Draw.text(ctx, "2F'", cx + 2 * f + 10, baseY + 16, '#f59e0b', 12, 'center');
        ctx.restore();

        // 物体（箭头）
        const objX = cx - u;
        const objTop = baseY - objH;
        ctx.save();
        ctx.strokeStyle = '#2ecc71'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(objX, baseY); ctx.lineTo(objX, objTop);
        ctx.stroke();

        ctx.fillStyle = '#2ecc71';
        ctx.beginPath();
        ctx.moveTo(objX, objTop); ctx.lineTo(objX - 8, objTop + 12);
        ctx.lineTo(objX + 8, objTop + 12);
        ctx.closePath(); ctx.fill();
        Draw.text(ctx, '物体', objX, baseY + 20, '#2ecc71', 13, 'center');
        ctx.restore();

        // 计算像距
        const v = Physics.lensEquation(f, u);
        const M = Physics.magnification(v, u);
        const imageH = objH * M;
        const imageX = cx + v;
        const imageTop = baseY - imageH;

        // 像
        if (isFinite(v) && v > 0) {
            ctx.save();
            const isInverted = imageH > 0;
            ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = 3;
            ctx.beginPath();
            if (isInverted) {
                ctx.moveTo(imageX, baseY);
                ctx.lineTo(imageX, baseY - imageH);
            } else {
                ctx.moveTo(imageX, baseY);
                ctx.lineTo(imageX, baseY + imageH);
            }
            ctx.stroke();

            ctx.fillStyle = '#e74c3c';
            const arrowTip = isInverted ? baseY - imageH : baseY + imageH;
            ctx.beginPath();
            ctx.moveTo(imageX, arrowTip);
            ctx.lineTo(imageX - 8, arrowTip + (isInverted ? -12 : 12));
            ctx.lineTo(imageX + 8, arrowTip + (isInverted ? -12 : 12));
            ctx.closePath(); ctx.fill();

            Draw.text(ctx, '实像', imageX, baseY + (isInverted ? imageH > 0 ? 20 : -20 : 20), '#e74c3c', 13, 'center');

            // 成像光线
            ctx.strokeStyle = 'rgba(231,76,60,0.15)'; ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            // 平行于主光轴的光线
            ctx.beginPath(); ctx.moveTo(objX, objTop); ctx.lineTo(cx, objTop);
            ctx.lineTo(imageX, isInverted ? baseY - imageH : baseY + imageH);
            ctx.stroke();
            // 过光心的光线
            ctx.beginPath(); ctx.moveTo(objX, objTop); ctx.lineTo(imageX, isInverted ? baseY - imageH : baseY + imageH);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();

            this.state.imageType = `实像, ${isInverted ? '倒立' : '正立'}, ${M.toFixed(2)}×`;

            // 像距标签
            if (imageX < W - 30) {
                ctx.save();
                ctx.strokeStyle = 'rgba(231,76,60,0.3)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(imageX, baseY + 25);
                ctx.lineTo(imageX, baseY + 35);
                ctx.stroke();
                Draw.text(ctx, `v=${v.toFixed(0)}`, imageX, baseY + 42, '#e74c3c', 11, 'center');
                ctx.restore();
            }
        } else if (v < 0) {
            // 虚像
            const viX = cx + v; // v is negative
            const viH = objH * M;
            ctx.save();
            ctx.strokeStyle = '#9b59b6'; ctx.lineWidth = 3;
            ctx.setLineDash([6, 4]);
            ctx.beginPath(); ctx.moveTo(viX, baseY); ctx.lineTo(viX, baseY - viH);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#9b59b6';
            ctx.beginPath();
            ctx.moveTo(viX, baseY - viH); ctx.lineTo(viX - 8, baseY - viH + 12);
            ctx.lineTo(viX + 8, baseY - viH + 12);
            ctx.closePath(); ctx.fill();
            Draw.text(ctx, '虚像', viX, baseY + 20, '#9b59b6', 13, 'center');

            // 虚像光线（延长线）
            ctx.strokeStyle = 'rgba(155,89,182,0.15)'; ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath(); ctx.moveTo(objX, objTop);
            ctx.lineTo(cx, objTop);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();

            this.state.imageType = `虚像, 正立, ${M.toFixed(2)}×`;
        } else {
            this.state.imageType = '不成像 (u = f)';
        }

        // 物距和焦距标注
        Draw.text(ctx, `f = ${f}px`, 12, 20, '#888', 12);
        Draw.text(ctx, `u = ${u}px`, 12, 38, '#888', 12);
        Draw.text(ctx, `成像: ${this.state.imageType}`, 12, H - 16, '#333', 13);
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
            group.innerHTML = `
                <label><span>${param.label}</span><span class="value" id="val-${key}">${param.value}</span></label>
                <input type="range" min="${param.min}" max="${param.max}" step="${param.step}" value="${param.value}" data-key="${key}">`;
            group.querySelector('input').addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.params[key].value = val;
                document.getElementById(`val-${key}`).textContent = val;
                this.draw(); this.updateInfo();
            });
            this.controlsEl.appendChild(group);
        }
    },

    reset: function() { this.draw(); this.updateInfo(); },
    togglePause: function() {},

    updateInfo: function() {
        const f = this.params.focalLength.value;
        const u = this.params.objectDist.value;
        const v = Physics.lensEquation(f, u);
        const M = Physics.magnification(v, u);

        this.infoEl.innerHTML = `
            <div class="info-row"><span class="label">焦距 f</span><span class="value">${f}</span></div>
            <div class="info-row"><span class="label">物距 u</span><span class="value">${u}</span></div>
            <div class="info-row"><span class="label">像距 v</span><span class="value">${isFinite(v) ? v.toFixed(1) : '∞'}</span></div>
            <div class="info-row"><span class="label">放大率 M</span><span class="value">${M.toFixed(2)}×</span></div>
            <div class="info-row"><span class="label">成像类型</span><span class="value">${this.state.imageType}</span></div>
            <div class="info-row"><span class="label">1/u + 1/v</span><span class="value">${isFinite(v) ? (1/u + 1/v).toFixed(6) : (1/u).toFixed(6)}</span></div>
            <div class="info-row"><span class="label">1/f</span><span class="value">${(1/f).toFixed(6)}</span></div>
        `;
    },

    resize: function() { this.setupCanvas(); this.draw(); }
};
