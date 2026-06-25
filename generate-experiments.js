/**
 * 实验页面生成器
 * 读取 js/experiments/*.js，为每个实验生成独立的 experiments/*.html
 */
const fs = require('fs');
const path = require('path');

const experimentsDir = path.join(__dirname, 'js', 'experiments');
const outputDir = path.join(__dirname, 'experiments');
const cssPath = '../css/style.css';
const physicsJSPath = '../js/utils/physics.js';
const deepseekJSPath = '../js/utils/deepseek.js';
const experimentsJSPath = '../js/experiments';

// 读取所有实验文件，提取 id、title 和变量名
const files = fs.readdirSync(experimentsDir).filter(f => f.endsWith('.js'));

const experiments = [];

for (const file of files) {
    const content = fs.readFileSync(path.join(experimentsDir, file), 'utf-8');

    // 提取 const 变量名（例如 PendulumExperiment）
    const varNameMatch = content.match(/^const\s+(\w+Experiment)\s*=\s*\{/m);
    const idMatch = content.match(/id:\s*'([^']+)'/);
    const titleMatch = content.match(/title:\s*'([^']+)'/);
    const categoryMatch = content.match(/category:\s*'([^']+)'/);
    const descMatch = content.match(/description:\s*'([^']+)'/);

    if (idMatch && titleMatch) {
        experiments.push({
            id: idMatch[1],
            title: titleMatch[1],
            category: categoryMatch ? categoryMatch[1] : '',
            description: descMatch ? descMatch[1].replace(/\\\\n/g, ' ').replace(/' \+/g, '').replace(/\s+/g, ' ').trim() : '',
            file: file,
            varName: varNameMatch ? varNameMatch[1] : (idMatch[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase()).replace(/^[a-z]/, c => c.toUpperCase()) + 'Experiment')
        });
    }
}

// 按类别排序
const categoryOrder = ['mechanics', 'electromagnetism', 'optics', 'thermodynamics', 'waves', 'modern'];
experiments.sort((a, b) => {
    const ci = categoryOrder.indexOf(a.category) - categoryOrder.indexOf(b.category);
    if (ci !== 0) return ci;
    return a.title.localeCompare(b.title, 'zh-CN');
});

const categoryNames = {
    mechanics: '力学',
    electromagnetism: '电磁学',
    optics: '光学',
    thermodynamics: '热学',
    waves: '波与振动',
    modern: '近代物理'
};

// 生成导航 HTML 片段（分类列表）
function generateNavHTML() {
    const grouped = {};
    for (const exp of experiments) {
        if (!grouped[exp.category]) grouped[exp.category] = [];
        grouped[exp.category].push(exp);
    }

    let html = '';
    for (const cat of categoryOrder) {
        if (!grouped[cat]) continue;
        const name = categoryNames[cat] || cat;
        html += `            <div class="category open" data-category="${cat}">\n`;
        html += `                <div class="category-header">\n`;
        html += `                    <span class="manga-icon">${name[0]}</span>\n`;
        html += `                    <span>${name}</span>\n`;
        html += `                    <span class="arrow">&#12297;</span>\n`;
        html += `                </div>\n`;
        html += `                <ul class="experiment-list">\n`;
        for (const exp of grouped[cat]) {
            html += `                    <li><a href="experiments/${exp.id}.html">${exp.title}</a></li>\n`;
        }
        html += `                </ul>\n`;
        html += `            </div>\n`;
    }
    return html;
}

// 生成实验 HTML 模板
function generateExperimentHTML(exp) {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${exp.title} - 物理实验室</title>
    <link rel="stylesheet" href="${cssPath}">
    <style>
        /* 实验专属页面的微调 */
        #main-content { width: 100%; }
        .page.active#experiment-container { display: flex !important; }
        #exp-header { padding-right: 32px; }
        body { overflow: hidden; height: 100vh; margin: 0; }
        /* 顶部导航栏 */
        .exp-topbar {
            display: flex; align-items: center; gap: 12px;
            padding: 8px 16px; background: var(--card-bg);
            border-bottom: 1px solid var(--border); flex-shrink: 0;
        }
        .exp-topbar a {
            text-decoration: none; color: var(--primary);
            font-size: 13px; font-weight: 500;
            display: flex; align-items: center; gap: 4px;
        }
        .exp-topbar a:hover { color: var(--primary-dark); }
        .exp-topbar .exp-title-bar {
            font-size: 14px; font-weight: 600; color: var(--text);
            margin-left: 8px;
        }
        #exp-description { font-size: 13px; }
        #controls-container { max-height: calc(100vh - 350px); overflow-y: auto; }
        html, body { height: 100%; margin: 0; padding: 0; }
    </style>
</head>
<body>
    <div id="app">
        <!-- 顶部导航 -->
        <div class="exp-topbar">
            <a href="../index.html">&larr; 返回实验室</a>
            <span class="exp-title-bar">| ${exp.title}</span>
            <a href="../index.html" style="margin-left:auto;font-size:12px;opacity:0.7;">&#8592; 首页</a>
        </div>

        <!-- 主内容 -->
        <main id="main-content" style="flex:1;overflow:hidden;">
            <div id="experiment-container" class="page active" style="display:flex;flex-direction:column;height:100%;">
                <div id="exp-header">
                    <h2 id="exp-title">${exp.title}</h2>
                    <p id="exp-description">${exp.description}</p>
                </div>
                <div id="exp-body" style="flex:1;overflow:hidden;">
                    <div id="exp-canvas-container">
                        <canvas id="exp-canvas"></canvas>
                    </div>
                    <div id="exp-controls">
                        <h3>参数控制</h3>
                        <div id="controls-container"></div>
                        <div class="control-buttons">
                            <button id="btn-reset" class="btn btn-reset">重置</button>
                            <button id="btn-pause" class="btn btn-pause">开始</button>
                        </div>
                        <div id="exp-info">
                            <h3>实验信息</h3>
                            <div id="info-container"></div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- 核心库 -->
    <script src="${physicsJSPath}"></script>
    <script src="${deepseekJSPath}"></script>

    <!-- 实验脚本 -->
    <script src="${experimentsJSPath}/${exp.file}"></script>

    <!-- 启动实验 -->
    <script>
    document.addEventListener('DOMContentLoaded', function() {
        // 直接引用实验变量（从 JS 文件中的 const 声明获取）
        var exp = typeof ${exp.varName} !== 'undefined' ? ${exp.varName} : null;

        if (!exp) {
            document.body.innerHTML = '<h2 style="color:red;padding:40px;">错误：找不到实验对象 "${exp.id}"（${exp.varName}）</h2>';
            return;
        }

        // 修正 pause 按钮的初始文字（各实验的 reset 里会设置）
        var btn = document.getElementById('btn-pause');

        // 初始化
        exp.init(document.getElementById('exp-canvas'),
                 document.getElementById('controls-container'),
                 document.getElementById('info-container'));

        // 绑定按钮
        document.getElementById('btn-reset').addEventListener('click', function() { exp.reset(); });
        document.getElementById('btn-pause').addEventListener('click', function() { exp.togglePause(); });

        // 窗口缩放时重置画布尺寸
        var resizeTimer;
        window.addEventListener('resize', function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function() {
                if (typeof exp.resize === 'function') {
                    exp.setupCanvas();
                    exp.draw();
                }
            }, 150);
        });

        // 初始适配画布
        setTimeout(function() {
            exp.setupCanvas();
            exp.draw();
        }, 50);

        // 列出所有实验的导航链接
        var navHTML = '<div style="margin-top:12px;padding:8px;border-top:1px solid var(--border);">' +
            '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:4px;">其他实验：</div>' +
            '<div style="display:flex;flex-wrap:wrap;gap:4px;">';
        var allExps = [
${experiments.map(e => `            { id: '${e.id}', title: '${e.title}', cat: '${e.category}' }`).join(',\n')}
        ];
        allExps.forEach(function(e) {
            if (e.id !== '${exp.id}') {
                navHTML += '<a href="' + e.id + '.html" style="font-size:11px;padding:2px 8px;background:var(--bg);border-radius:4px;text-decoration:none;color:var(--text-secondary);">' + e.title + '</a> ';
            }
        });
        navHTML += '</div></div>';
        document.getElementById('exp-controls').insertAdjacentHTML('beforeend', navHTML);
    });
    </script>
</body>
</html>`;
}

// ===== 生成所有文件 =====

// 1. 生成实验 HTML 文件
for (const exp of experiments) {
    const html = generateExperimentHTML(exp);
    const outputPath = path.join(outputDir, `${exp.id}.html`);
    fs.writeFileSync(outputPath, html, 'utf-8');
    console.log(`✓ ${exp.id}.html — ${exp.title}`);
}

// 2. 更新 index.html：修改侧边栏导航链接指向独立页面
const indexPath = path.join(__dirname, 'index.html');
let indexHTML = fs.readFileSync(indexPath, 'utf-8');

// 替换侧边栏中的实验列表项，改为超链接
for (const exp of experiments) {
    // 原来的 <li data-exp="pendulum">单摆运动</li>
    // 改为 <li><a href="experiments/pendulum.html">单摆运动</a></li>
    const oldItem = `<li data-exp="${exp.id}">${exp.title}</li>`;
    const newItem = `<li><a href="experiments/${exp.id}.html">${exp.title}</a></li>`;
    indexHTML = indexHTML.replace(oldItem, newItem);
}

// 修改 AI 问答按钮的点击行为（指向独立页面）
indexHTML = indexHTML.replace(
    /document\.getElementById\('ai-btn'\)\.addEventListener\('click'[^)]*\)\s*\{[^}]*\}/s,
    `document.getElementById('ai-btn').addEventListener('click', () => { window.location.href = 'experiment-ai.html'; })`
);

fs.writeFileSync(indexPath, indexHTML, 'utf-8');
console.log('\n✓ index.html 已更新导航链接');

console.log(`\n✅ 共生成 ${experiments.length} 个实验页面`);
