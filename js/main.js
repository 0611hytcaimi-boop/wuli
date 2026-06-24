/**
 * 物理实验仿真平台 - 主入口
 * 负责实验切换、事件绑定、UI控制
 */

const App = {
    currentExp: null,
    experiments: {},
    canvas: null,
    ctx: null,
    controlsEl: null,
    infoEl: null,

    // 注册所有实验
    register: function(experiment) {
        this.experiments[experiment.id] = experiment;
    },

    init: function() {
        this.canvas = document.getElementById('exp-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.controlsEl = document.getElementById('controls-container');
        this.infoEl = document.getElementById('info-container');

        this.setupNavigation();
        this.setupButtons();
        this.setupWelcomeCards();
        this.setupAI();
        this.setupResize();
    },

    // 侧边栏导航
    setupNavigation: function() {
        // 分类折叠
        document.querySelectorAll('.category-header').forEach(header => {
            header.addEventListener('click', () => {
                const category = header.parentElement;
                category.classList.toggle('open');
            });
        });

        // 实验选择
        document.querySelectorAll('.experiment-list li').forEach(item => {
            item.addEventListener('click', () => {
                const expId = item.dataset.exp;
                this.loadExperiment(expId);
            });
        });

        // AI按钮
        document.getElementById('ai-btn').addEventListener('click', () => {
            this.showPage('ai-page');
            document.querySelectorAll('.experiment-list li').forEach(el => el.classList.remove('active'));
        });

        // 欢迎页卡片
        document.querySelectorAll('.welcome-card').forEach(card => {
            card.addEventListener('click', () => {
                const category = card.dataset.category;
                const firstExp = document.querySelector(`.experiment-list li[data-exp]`);
                if (firstExp) {
                    this.loadExperiment(firstExp.dataset.exp);
                }
            });
        });
    },

    // 底部按钮
    setupButtons: function() {
        document.getElementById('btn-reset').addEventListener('click', () => {
            if (this.currentExp) this.currentExp.reset();
        });

        document.getElementById('btn-pause').addEventListener('click', () => {
            if (this.currentExp) this.currentExp.togglePause();
        });
    },

    // 欢迎页卡片跳转
    setupWelcomeCards: function() {
        document.querySelectorAll('.welcome-card').forEach(card => {
            card.addEventListener('click', () => {
                const cat = card.dataset.category;
                const firstExp = document.querySelector(`.category[data-category="${cat}"] .experiment-list li`);
                if (firstExp) {
                    this.loadExperiment(firstExp.dataset.exp);
                }
            });
        });
    },

    // 加载实验
    loadExperiment: function(expId) {
        const exp = this.experiments[expId];
        if (!exp) {
            console.warn(`实验 "${expId}" 未找到`);
            return;
        }

        // 停止当前实验
        if (this.currentExp) {
            if (this.currentExp.animId) {
                cancelAnimationFrame(this.currentExp.animId);
                this.currentExp.animId = null;
            }
            this.currentExp.state.isRunning = false;
        }

        this.currentExp = exp;

        // 更新标题
        document.getElementById('exp-title').textContent = exp.title;
        document.getElementById('exp-description').textContent = exp.description || '';

        // 显示暂停按钮（默认）
        document.getElementById('btn-pause').style.display = '';

        // 切换到实验页面
        this.showPage('experiment-container');

        // 高亮导航
        document.querySelectorAll('.experiment-list li').forEach(el => el.classList.remove('active'));
        const navItem = document.querySelector(`.experiment-list li[data-exp="${expId}"]`);
        if (navItem) {
            navItem.classList.add('active');
            // 展开所属分类
            const category = navItem.closest('.category');
            if (category) category.classList.add('open');
        }

        // 初始化实验
        exp.init(this.canvas, this.controlsEl, this.infoEl);
    },

    // 页面切换
    showPage: function(pageId) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById(pageId).classList.add('active');
    },

    // AI 问答
    setupAI: function() {
        const input = document.getElementById('ai-input');
        const sendBtn = document.getElementById('ai-send');
        const messagesEl = document.getElementById('ai-messages');
        const statusText = document.getElementById('ai-status-text');
        const apiKeyInput = document.getElementById('ai-api-key-input');
        const saveKeyBtn = document.getElementById('ai-save-key-btn');
        const apiStatus = document.getElementById('ai-api-status');
        const clearBtn = document.getElementById('ai-clear-btn');

        const updateApiStatus = () => {
            const key = DeepSeek.getApiKey();
            if (key) {
                apiStatus.textContent = '✓ API 密钥已配置，你可以开始提问了';
                apiStatus.style.color = '#7a9a7e';
                apiKeyInput.value = key;
            } else {
                apiStatus.textContent = '未配置 API 密钥，请输入上方密钥后开始提问';
                apiStatus.style.color = '#999';
            }
        };

        const addMessage = (content, isUser) => {
            const div = document.createElement('div');
            div.className = `message ${isUser ? 'user' : 'ai'}`;
            div.innerHTML = `<div class="message-content">${content}</div>`;
            messagesEl.appendChild(div);
            messagesEl.scrollTop = messagesEl.scrollHeight;
        };

        // 加载已保存的密钥
        updateApiStatus();

        // 保存 API 密钥
        saveKeyBtn.addEventListener('click', () => {
            const key = apiKeyInput.value.trim();
            if (!key) {
                apiStatus.textContent = '请输入有效的 API 密钥';
                apiStatus.style.color = '#c4726e';
                return;
            }
            DeepSeek.setApiKey(key);
            updateApiStatus();
            statusText.textContent = 'API 密钥已保存';
        });
        apiKeyInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveKeyBtn.click();
            }
        });

        // 清空对话
        clearBtn.addEventListener('click', () => {
            DeepSeek.clearHistory();
            messagesEl.innerHTML = '';
            addMessage('对话已清空，你可以开始新的提问。');
            statusText.textContent = '对话历史已清空';
        });

        const sendMessage = async () => {
            const text = input.value.trim();
            if (!text) return;
            if (!DeepSeek.getApiKey()) {
                addMessage('<span style="color:#ef4444;">请先在页面上方输入并保存 DeepSeek API 密钥</span>');
                statusText.textContent = 'API 密钥未配置';
                return;
            }

            addMessage(text, true);
            input.value = '';
            statusText.textContent = 'AI思考中...';

            try {
                const response = await DeepSeekAPI.chat(text);
                addMessage(response);
                statusText.textContent = '回复完成';
            } catch (err) {
                addMessage(`<span style="color:#ef4444;">错误: ${err.message}</span>`);
                statusText.textContent = '请求失败，请检查 API 配置';
            }
        };

        sendBtn.addEventListener('click', sendMessage);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    },

    // 窗口缩放
    setupResize: function() {
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (this.currentExp) this.currentExp.resize();
            }, 200);
        });
    }
};

// ========== 注册所有实验 ==========
App.register(PendulumExperiment);
App.register(ProjectileExperiment);
App.register(SpringExperiment);
App.register(NewtonCradleExperiment);
App.register(RCCircuitExperiment);
App.register(ChargeMagneticExperiment);
App.register(LensExperiment);
App.register(RefractionExperiment);
App.register(DoubleSlitExperiment);
App.register(PhotoelectricExperiment);
App.register(StandingWaveExperiment);
App.register(DopplerExperiment);
App.register(IdealGasExperiment);
App.register(InterferenceDiffractionExperiment);
App.register(NewtonLawsExperiment);
App.register(CollisionExperiment);
App.register(DoublePendulumExperiment);
App.register(ElectromagneticInductionExperiment);
App.register(FreeFallExperiment);
App.register(ColorMixingExperiment);
App.register(ThreeBodyExperiment);
App.register(ChargedParticleFieldsExperiment);
App.register(BuoyancyExperiment);
App.register(VoltAmpereExperiment);
App.register(SHMExperiment);

// 启动
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
