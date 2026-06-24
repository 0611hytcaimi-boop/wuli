/**
 * 物理工具库 - 提供常用物理计算函数
 * AI工具：Claude（Anthropic）辅助生成了部分数学计算函数
 */

const Physics = {
    // 重力加速度
    g: 9.8,

    // 角度转换
    toRad: (deg) => deg * Math.PI / 180,
    toDeg: (rad) => rad * 180 / Math.PI,

    // 约束值在范围内
    clamp: (val, min, max) => Math.max(min, Math.min(max, val)),

    // 线性插值
    lerp: (a, b, t) => a + (b - a) * t,

    // 地图映射
    mapRange: (val, inMin, inMax, outMin, outMax) =>
        outMin + (val - inMin) / (inMax - inMin) * (outMax - outMin),

    // 向量2D
    Vec2: class {
        constructor(x = 0, y = 0) { this.x = x; this.y = y; }
        add(v) { return new Physics.Vec2(this.x + v.x, this.y + v.y); }
        sub(v) { return new Physics.Vec2(this.x - v.x, this.y - v.y); }
        scale(s) { return new Physics.Vec2(this.x * s, this.y * s); }
        dot(v) { return this.x * v.x + this.y * v.y; }
        length() { return Math.sqrt(this.x * this.x + this.y * this.y); }
        normalize() { const l = this.length(); return l > 0 ? this.scale(1 / l) : new Physics.Vec2(); }
    },

    // 单摆运动方程（带阻尼选项）
    pendulumMotion: function(theta, omega, L, g, dt, damping = 0) {
        // θ'' = -(g/L)sin(θ) - damping * ω
        const alpha = -(g / L) * Math.sin(theta) - damping * omega;
        omega += alpha * dt;
        theta += omega * dt;
        return { theta, omega };
    },

    // 抛物运动（带空气阻力）
    projectileMotion: function(x, y, vx, vy, dt, airResistance = 0) {
        const ax = -airResistance * vx;
        const ay = Physics.g - airResistance * vy;
        vx += ax * dt;
        vy += ay * dt;
        x += vx * dt;
        y += vy * dt;
        return { x, y, vx, vy };
    },

    // 弹簧振子（简谐运动，带阻尼）
    springMotion: function(x, v, k, m, dt, damping = 0) {
        // a = -(k/m)x - damping * v
        const a = -(k / m) * x - damping * v;
        v += a * dt;
        x += v * dt;
        return { x, v };
    },

    // RC电路充电
    rcCharge: function(t, R, C, V0) {
        // V(t) = V0 * (1 - e^(-t/RC))
        return V0 * (1 - Math.exp(-t / (R * C)));
    },

    // RC电路放电
    rcDischarge: function(t, R, C, V0) {
        // V(t) = V0 * e^(-t/RC)
        return V0 * Math.exp(-t / (R * C));
    },

    // 凸透镜成像: 1/f = 1/u + 1/v
    lensEquation: function(f, u) {
        if (Math.abs(u - f) < 0.001) return Infinity;
        const v = 1 / (1 / f - 1 / u);
        return v;
    },

    // 放大率
    magnification: function(v, u) {
        return Math.abs(v / u);
    },

    // 折射定律: n1 * sin(θ1) = n2 * sin(θ2)
    snellLaw: function(n1, n2, theta1) {
        const sinTheta2 = n1 / n2 * Math.sin(theta1);
        if (sinTheta2 > 1) return null; // 全反射
        return Math.asin(sinTheta2);
    },

    // 双缝干涉强度分布
    doubleSlitIntensity: function(x, d, L, lambda, I0 = 1) {
        // I(x) = I0 * cos²(π d x / (λ L))
        const beta = Math.PI * d * x / (lambda * L);
        return I0 * Math.cos(beta) ** 2;
    },

    // 光电效应: E_k = hf - W
    photoelectricEnergy: function(f, workFunction) {
        const h = 6.626e-34;
        const e = 1.602e-19;
        const energy = h * f - workFunction * e;
        return energy > 0 ? energy / e : 0; // 返回电子伏特
    },

    // 理想气体状态方程: PV = nRT
    idealGasLaw: function(P, V, n, T) {
        const R = 8.314;
        if (arguments.length === 3) return n * R * T / P; // 求V
        if (arguments.length === 2) return null;
    },

    // 驻波: y(x,t) = 2A sin(kx) cos(ωt)
    standingWave: function(x, t, A, k, omega) {
        return 2 * A * Math.sin(k * x) * Math.cos(omega * t);
    },

    // 多普勒效应: f' = f * (v ± v_o) / (v ∓ v_s)
    dopplerEffect: function(f, v, vo, vs, sourceToward = true, observerToward = true) {
        const v1 = observerToward ? v + vo : v - vo;
        const v2 = sourceToward ? v - vs : v + vs;
        return f * v1 / v2;
    },

    // 磁场中电荷运动（洛伦兹力）
    chargeMotion: function(x, y, z, vx, vy, vz, q, B, m, dt) {
        // F = q(v × B), a = F/m
        // 假定B沿z方向
        const Bz = B;
        const ax = (q / m) * vy * Bz;
        const ay = -(q / m) * vx * Bz;
        const az = 0;
        vx += ax * dt;
        vy += ay * dt;
        vz += az * dt;
        x += vx * dt;
        y += vy * dt;
        z += vz * dt;
        return { x, y, z, vx, vy, vz };
    },

    // 双摆运动方程
    doublePendulumMotion: function(theta1, theta2, omega1, omega2, m1, m2, L1, L2, g, dt) {
        const delta = theta2 - theta1;
        const den1 = (2 * m1 + m2 - m2 * Math.cos(2 * delta));
        const a1 = (-g * (2 * m1 + m2) * Math.sin(theta1) - m2 * g * Math.sin(theta1 - 2 * theta2)
                - 2 * Math.sin(delta) * m2 * (omega2 * omega2 * L2 + omega1 * omega1 * L1 * Math.cos(delta)))
                / (L1 * den1);
        const den2 = (2 * m1 + m2 - m2 * Math.cos(2 * delta));
        const a2 = (2 * Math.sin(delta) * (omega1 * omega1 * L1 * (m1 + m2) + g * (m1 + m2) * Math.cos(theta1)
                + omega2 * omega2 * L2 * m2 * Math.cos(delta)))
                / (L2 * den2);
        omega1 += a1 * dt;
        omega2 += a2 * dt;
        theta1 += omega1 * dt;
        theta2 += omega2 * dt;
        return { theta1, theta2, omega1, omega2 };
    },

    // 弹性碰撞 (1D)
    elasticCollision1D: function(m1, m2, v1, v2) {
        const v1f = ((m1 - m2) * v1 + 2 * m2 * v2) / (m1 + m2);
        const v2f = ((m2 - m1) * v2 + 2 * m1 * v1) / (m1 + m2);
        return { v1: v1f, v2: v2f };
    },

    // 非弹性碰撞 (1D)
    inelasticCollision1D: function(m1, m2, v1, v2, e = 1) {
        const vcm = (m1 * v1 + m2 * v2) / (m1 + m2);
        const v1f = vcm - e * (v1 - vcm);
        const v2f = vcm - e * (v2 - vcm);
        return { v1: v1f, v2: v2f };
    },

    // 二维弹性碰撞
    elasticCollision2D: function(m1, m2, x1, y1, x2, y2, vx1, vy1, vx2, vy2) {
        const dx = x2 - x1, dy = y2 - y1;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.001) return { vx1, vy1, vx2, vy2 };
        const nx = dx / dist, ny = dy / dist;
        const dvx = vx1 - vx2, dvy = vy1 - vy2;
        const dvn = dvx * nx + dvy * ny;
        if (dvn > 0) return { vx1, vy1, vx2, vy2 };
        const J = (2 * dvn) / (m1 + m2);
        return {
            vx1: vx1 - J * m2 * nx, vy1: vy1 - J * m2 * ny,
            vx2: vx2 + J * m1 * nx, vy2: vy2 + J * m1 * ny
        };
    },

    // 万有引力 (N体)
    gravityForce: function(m1, m2, dx, dy) {
        const G = 1; // 归一化引力常数
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);
        if (dist < 0.1) return { fx: 0, fy: 0 };
        const F = G * m1 * m2 / distSq;
        return { fx: F * dx / dist, fy: F * dy / dist };
    },

    // 电磁感应电动势 (法拉第定律)
    inducedEMF: function(dPhiB_dt) {
        return -dPhiB_dt;
    },

    // 浮力
    buoyancyForce: function(fluidDensity, volume, g) {
        return fluidDensity * volume * g;
    },

    // 流体阻力 (斯托克斯定律)
    stokesDrag: function(radius, viscosity, velocity) {
        return 6 * Math.PI * viscosity * radius * velocity;
    },

    // 沉降末速度
    terminalVelocity: function(mass, g, fluidDensity, volume, radius, viscosity) {
        const Fg = mass * g;
        const Fb = this.buoyancyForce(fluidDensity, volume, g);
        const Fnet = Fg - Fb;
        if (Fnet <= 0) return 0;
        // 对于球形粒子: v_t = 2r²(ρ_p-ρ_f)g / (9η)
        return 2 * radius * radius * (mass/volume - fluidDensity) * g / (9 * viscosity);
    },

    // 电场力
    electricForce: function(q, E) {
        return q * E;
    },

    // 平行板电容器电场
    parallelPlateField: function(V, d) {
        return V / d;
    },

    // 单缝衍射强度
    singleSlitIntensity: function(x, a, L, lambda, I0) {
        I0 = I0 || 1;
        const alpha = Math.PI * a * x / (lambda * L);
        if (Math.abs(alpha) < 0.001) return I0;
        return I0 * (Math.sin(alpha) / alpha) ** 2;
    },

    // 多缝衍射（光栅）
    gratingIntensity: function(x, d, a, L, lambda, N, I0) {
        I0 = I0 || 1;
        const beta = Math.PI * d * x / (lambda * L);
        const alpha = Math.PI * a * x / (lambda * L);
        const singleSlit = Math.abs(alpha) < 0.001 ? 1 : (Math.sin(alpha) / alpha) ** 2;
        const multiBeam = Math.abs(beta) < 0.001 ? N * N : (Math.sin(N * beta) / Math.sin(beta)) ** 2 / (N * N);
        return I0 * singleSlit * multiBeam;
    },

    // RGB 混合
    mixColors: function(r, g, b) {
        const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
        return { r: clamp(r), g: clamp(g), b: clamp(b) };
    },

    // 波长转RGB
    wavelengthToRGB: function(wavelength) {
        let r, g, b;
        if (wavelength >= 380 && wavelength < 440) {
            r = -(wavelength - 440) / (440 - 380);
            g = 0; b = 1;
        } else if (wavelength >= 440 && wavelength < 490) {
            r = 0; g = (wavelength - 440) / (490 - 440); b = 1;
        } else if (wavelength >= 490 && wavelength < 510) {
            r = 0; g = 1; b = -(wavelength - 510) / (510 - 490);
        } else if (wavelength >= 510 && wavelength < 580) {
            r = (wavelength - 510) / (580 - 510); g = 1; b = 0;
        } else if (wavelength >= 580 && wavelength < 645) {
            r = 1; g = -(wavelength - 645) / (645 - 580); b = 0;
        } else if (wavelength >= 645 && wavelength <= 780) {
            r = 1; g = 0; b = 0;
        } else {
            r = 0; g = 0; b = 0;
        }
        let factor;
        if (wavelength >= 380 && wavelength < 420)
            factor = 0.3 + 0.7 * (wavelength - 380) / (420 - 380);
        else if (wavelength >= 420 && wavelength <= 700)
            factor = 1;
        else if (wavelength > 700 && wavelength <= 780)
            factor = 0.3 + 0.7 * (780 - wavelength) / (780 - 700);
        else factor = 0;
        return {
            r: Math.round(255 * (r * factor)),
            g: Math.round(255 * (g * factor)),
            b: Math.round(255 * (b * factor))
        };
    }
};

/** Canvas 绘图辅助 */
const Draw = {
    // 绘制带箭头的线
    arrowLine: (ctx, x1, y1, x2, y2, color = '#333', lineWidth = 2) => {
        const dx = x2 - x1, dy = y2 - y1;
        const angle = Math.atan2(dy, dx);
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len < 2) return;

        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // 箭头
        const aLen = 10, aAngle = Math.PI / 6;
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - aLen * Math.cos(angle - aAngle), y2 - aLen * Math.sin(angle - aAngle));
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - aLen * Math.cos(angle + aAngle), y2 - aLen * Math.sin(angle + aAngle));
        ctx.stroke();
        ctx.restore();
    },

    // 绘制网格
    grid: (ctx, w, h, step = 50, color = '#f0f0f0') => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        for (let x = step; x < w; x += step) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
        }
        for (let y = step; y < h; y += step) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }
    },

    // 清除画布
    clear: (ctx, w, h, color = '#ffffff') => {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, w, h);
    },

    // 绘制坐标轴
    axes: (ctx, ox, oy, w, h, color = '#ddd') => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, oy); ctx.lineTo(w, oy);
        ctx.moveTo(ox, 0); ctx.lineTo(ox, h);
        ctx.stroke();
    },

    // 在画布上绘制文本（带背景）
    text: (ctx, text, x, y, color = '#333', size = 14, align = 'left', baseline = 'top') => {
        ctx.save();
        ctx.fillStyle = color;
        ctx.font = `${size}px -apple-system, sans-serif`;
        ctx.textAlign = align;
        ctx.textBaseline = baseline;
        ctx.fillText(text, x, y);
        ctx.restore();
    }
};
