/**
 * 实验: 色光混合实验
 * 模拟红绿蓝三原色光的加色混合，展示色光叠加原理
 * 物理原理: 加色混合 —— 红光+绿光=黄光，红光+蓝光=品红，绿光+蓝光=青色，三色叠加=白光
 */
const ColorMixingExperiment = {
    id: 'color-mixing', title: '色光混合实验', category: 'optics',
    description: '研究色光加色混合原理。红、绿、蓝三原色光以不同强度叠加，观察混合结果与对应的RGB数值、十六进制色码。',

    state: {},

    params: {
        red: { value: 255, min: 0, max: 255, step: 1, label: '红光强度 R' },
        green: { value: 255, min: 0, max: 255, step: 1, label: '绿光强度 G' },
        blue: { value: 255, min: 0, max: 255, step: 1, label: '蓝光强度 B' }
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
            const input = group.querySelector('input');
            // Color preview dot for each channel
            const dotColors = { red: '#e74c3c', green: '#2ecc71', blue: '#3498db' };
            const dot = document.createElement('span');
            dot.style.cssText = `display:inline-block;width:12px;height:12px;border-radius:50%;background:${dotColors[key]};margin-right:6px;vertical-align:middle;`;
            group.querySelector('label').prepend(dot);
            input.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                this.params[key].value = val;
                document.getElementById(`val-${key}`).textContent = val;
                this.draw(); this.updateInfo();
            });
            this.controlsEl.appendChild(group);
        }

        // Mode display (additive only)
        const modeGroup = document.createElement('div');
        modeGroup.className = 'control-group';
        modeGroup.innerHTML = '<label><span>混合模式</span><span class="value" style="color:#7c8a9e;font-weight:600;">加色混合 (Additive)</span></label>';
        this.controlsEl.appendChild(modeGroup);
    },

    reset: function() {
        this.params.red.value = 255;
        this.params.green.value = 255;
        this.params.blue.value = 255;
        // Update slider UI
        ['red', 'green', 'blue'].forEach(k => {
            const slider = this.controlsEl.querySelector(`input[data-key="${k}"]`);
            if (slider) slider.value = 255;
            const valEl = document.getElementById(`val-${k}`);
            if (valEl) valEl.textContent = '255';
        });
        this.draw(); this.updateInfo();
    },

    togglePause: function() {
        // Static experiment - no animation, but togglePause is required by framework
    },

    animate: function(timestamp) {
        // Static experiment - draw once
        this.draw();
    },

    draw: function() {
        const ctx = this.ctx, W = this.W, H = this.H;
        Draw.clear(ctx, W, H, '#1a1a2e');

        const r = this.params.red.value;
        const g = this.params.green.value;
        const b = this.params.blue.value;

        // Circle positions (Venn diagram layout)
        const circleR = Math.min(W * 0.16, H * 0.22);
        const cxR = W * 0.30, cyR = H * 0.35;       // Red - upper left
        const cxG = W * 0.50, cyG = H * 0.35;       // Green - upper right
        const cxB = W * 0.40, cyB = H * 0.62;       // Blue - lower center

        // Draw circles with additive blending
        ctx.save();

        // Red circle
        const gradR = ctx.createRadialGradient(cxR, cyR, circleR * 0.1, cxR, cyR, circleR);
        gradR.addColorStop(0, `rgba(${r},0,0,${r/255})`);
        gradR.addColorStop(1, `rgba(${r},0,0,0.1)`);
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = gradR;
        ctx.beginPath(); ctx.arc(cxR, cyR, circleR, 0, Math.PI * 2); ctx.fill();

        // Green circle
        const gradG = ctx.createRadialGradient(cxG, cyG, circleR * 0.1, cxG, cyG, circleR);
        gradG.addColorStop(0, `rgba(0,${g},0,${g/255})`);
        gradG.addColorStop(1, `rgba(0,${g},0,0.1)`);
        ctx.fillStyle = gradG;
        ctx.beginPath(); ctx.arc(cxG, cyG, circleR, 0, Math.PI * 2); ctx.fill();

        // Blue circle
        const gradB = ctx.createRadialGradient(cxB, cyB, circleR * 0.1, cxB, cyB, circleR);
        gradB.addColorStop(0, `rgba(0,0,${b},${b/255})`);
        gradB.addColorStop(1, `rgba(0,0,${b},0.1)`);
        ctx.fillStyle = gradB;
        ctx.beginPath(); ctx.arc(cxB, cyB, circleR, 0, Math.PI * 2); ctx.fill();

        ctx.globalCompositeOperation = 'source-over';
        ctx.restore();

        // Circle outlines and labels
        const drawCircleOutline = (cx, cy, color) => {
            ctx.save();
            ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.setLineDash([]);
            ctx.beginPath(); ctx.arc(cx, cy, circleR, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        };
        drawCircleOutline(cxR, cyR, `rgb(${r},0,0)`);
        drawCircleOutline(cxG, cyG, `rgb(0,${g},0)`);
        drawCircleOutline(cxB, cyB, `rgb(0,0,${b})`);

        // Labels at circle centers
        Draw.text(ctx, 'R', cxR, cyR, 'white', 16, 'center', 'middle');
        Draw.text(ctx, 'G', cxG, cyG, 'white', 16, 'center', 'middle');
        Draw.text(ctx, 'B', cxB, cyB, 'white', 16, 'center', 'middle');

        // ---- Right side: Color swatches ----
        const swatchX = W * 0.72, swatchW = W * 0.22, swatchH = 42;
        const swatchStartY = H * 0.08, swatchGap = 10;

        const drawSwatch = (y, color, label, sublabel) => {
            ctx.save();
            // Background
            ctx.fillStyle = '#2a2a3e';
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 1;
            const bgH = swatchH + (sublabel ? 20 : 0);
            ctx.fillRect(swatchX, y, swatchW, bgH);
            ctx.strokeRect(swatchX, y, swatchW, bgH);
            // Color patch
            ctx.fillStyle = color;
            ctx.fillRect(swatchX + 8, y + 6, swatchH - 12, swatchH - 12);
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 1;
            ctx.strokeRect(swatchX + 8, y + 6, swatchH - 12, swatchH - 12);
            // Label
            ctx.fillStyle = '#ccc'; ctx.font = '12px -apple-system, sans-serif';
            ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
            ctx.fillText(label, swatchX + swatchH + 6, y + swatchH / 2);
            if (sublabel) {
                ctx.fillStyle = '#888'; ctx.font = '10px -apple-system, sans-serif';
                ctx.fillText(sublabel, swatchX + 12, y + swatchH + 12);
            }
            ctx.restore();
        };

        const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));

        // R+G = Yellow
        const rPlusG = `rgb(${clamp(r+g)},${clamp(r+g)},0)`;
        // G+B = Cyan
        const gPlusB = `rgb(0,${clamp(g+b)},${clamp(g+b)})`;
        // R+B = Magenta
        const rPlusB = `rgb(${clamp(r+b)},0,${clamp(r+b)})`;
        // All three = White
        const all = `rgb(${clamp(r+g+b)},${clamp(r+g+b)},${clamp(r+g+b)})`;

        const mixed = Physics.mixColors(r + g + b, r + g + b, r + g + b);

        let sy = swatchStartY;
        drawSwatch(sy, `rgb(${r},0,0)`, `红光 R=${r}`, null);
        sy += swatchH + swatchGap + 3;
        drawSwatch(sy, `rgb(0,${g},0)`, `绿光 G=${g}`, null);
        sy += swatchH + swatchGap + 3;
        drawSwatch(sy, `rgb(0,0,${b})`, `蓝光 B=${b}`, null);
        sy += swatchH + swatchGap + 10;

        // Separator
        ctx.save();
        ctx.strokeStyle = '#555'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(swatchX, sy); ctx.lineTo(swatchX + swatchW, sy); ctx.stroke();
        ctx.restore();
        sy += 14;

        drawSwatch(sy, rPlusG, '红+绿 → 黄', `(${clamp(r+g)}, ${clamp(r+g)}, 0)`);
        sy += swatchH + swatchGap + 22;
        drawSwatch(sy, gPlusB, '绿+蓝 → 青', `(0, ${clamp(g+b)}, ${clamp(g+b)})`);
        sy += swatchH + swatchGap + 22;
        drawSwatch(sy, rPlusB, '红+蓝 → 品红', `(${clamp(r+b)}, 0, ${clamp(r+b)})`);
        sy += swatchH + swatchGap + 22;

        // Final combined swatch (larger)
        const bigH = 56;
        ctx.save();
        ctx.fillStyle = '#2a2a3e';
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
        ctx.fillRect(swatchX, sy, swatchW, bigH);
        ctx.strokeRect(swatchX, sy, swatchW, bigH);
        ctx.fillStyle = `rgb(${mixed.r},${mixed.g},${mixed.b})`;
        ctx.fillRect(swatchX + 8, sy + 8, swatchW - 16, bigH - 16);
        ctx.fillStyle = mixed.r + mixed.g + mixed.b > 380 ? '#000' : '#fff';
        ctx.font = 'bold 13px -apple-system, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('混合结果', swatchX + swatchW / 2, sy + bigH / 2);
        ctx.restore();

        // Title
        Draw.text(ctx, '加色混合原理', W * 0.30, 22, '#aaa', 15, 'center', 'top');
        Draw.text(ctx, '三原色光以不同比例叠加产生各种颜色', W * 0.30, 42, '#777', 11, 'center', 'top');
        Draw.text(ctx, '混合色板', swatchX + swatchW / 2, swatchStartY - 14, '#aaa', 13, 'center', 'bottom');
    },

    updateInfo: function() {
        const r = this.params.red.value;
        const g = this.params.green.value;
        const b = this.params.blue.value;
        const mixed = Physics.mixColors(r + g + b, r + g + b, r + g + b);

        // RGB to hex
        const toHex = (c) => c.toString(16).padStart(2, '0').toUpperCase();
        const hex = `#${toHex(mixed.r)}${toHex(mixed.g)}${toHex(mixed.b)}`;

        // Approximate dominant wavelength
        let domWL = null;
        if (g > 100 && r < 100 && b < 100) domWL = '~550 nm (绿)';
        else if (r > 100 && g > 100 && b < 100) domWL = '~580 nm (黄)';
        else if (r > 100 && g < 100 && b > 100) domWL = '~420 nm (紫/品红)';
        else if (r > 100 && g < 100 && b < 100) domWL = '~650-700 nm (红)';
        else if (b > 100 && g > 100 && r < 100) domWL = '~490 nm (青)';
        else if (r > 100 && g > 100 && b > 100) domWL = '复合白光';
        else if (b > 100 && r < 100 && g < 100) domWL = '~460 nm (蓝)';
        else domWL = '复合色';

        const total = r + g + b;
        const rPct = total > 0 ? Math.round(r / total * 100) : 0;
        const gPct = total > 0 ? Math.round(g / total * 100) : 0;
        const bPct = total > 0 ? Math.round(b / total * 100) : 0;

        this.infoEl.innerHTML = `
            <div class="info-row"><span class="label">红光 R</span><span class="value" style="color:#e74c3c;">${r}</span></div>
            <div class="info-row"><span class="label">绿光 G</span><span class="value" style="color:#2ecc71;">${g}</span></div>
            <div class="info-row"><span class="label">蓝光 B</span><span class="value" style="color:#3498db;">${b}</span></div>
            <div class="info-row"><span class="label">混合 RGB</span><span class="value">(${mixed.r}, ${mixed.g}, ${mixed.b})</span></div>
            <div class="info-row"><span class="label">十六进制</span><span class="value" style="font-family:monospace;">${hex}</span></div>
            <div class="info-row"><span class="label">R:G:B 比例</span><span class="value">${rPct}:${gPct}:${bPct}</span></div>
            <div class="info-row"><span class="label">近似波长</span><span class="value">${domWL}</span></div>
            <div class="info-row"><span class="label">混合模式</span><span class="value">加色混合</span></div>
        `;
    },

    resize: function() { this.setupCanvas(); this.draw(); }
};
