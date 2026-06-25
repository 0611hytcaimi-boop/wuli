/**
 * 物理实验仿真平台 - 主入口
 * 首页作为导航中心 + AI 问答
 */

const App = {

    init: function() {
        this.setupNavigation();
        this.setupAI();
    },

    // 侧边栏导航
    setupNavigation: function() {
        // 分类折叠
        document.querySelectorAll('.category-header').forEach(header => {
            header.addEventListener('click', (e) => {
                // 如果点击的是分类折叠区域（不是里面的链接）
                if (e.target.closest('.category-header')) {
                    const category = header.parentElement;
                    category.classList.toggle('open');
                }
            });
        });

        // AI按钮
        document.getElementById('ai-btn').addEventListener('click', () => {
            this.showPage('ai-page');
        });

        // 欢迎页 AI 按钮
        const welcomeAiBtn = document.getElementById('welcome-ai-btn');
        if (welcomeAiBtn) {
            welcomeAiBtn.addEventListener('click', () => {
                this.showPage('ai-page');
            });
        }
    },

    // 页面切换（欢迎页 / AI问答）
    showPage: function(pageId) {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const page = document.getElementById(pageId);
        if (page) page.classList.add('active');
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

        // 自动保存内置API密钥（若用户尚未自定义）
        if (!localStorage.getItem('deepseek_api_key')) {
            DeepSeek.setApiKey('sk-ad3a7f0a19034ea687db9c97f151771f');
        }

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
    }
};

// 启动
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
