/**
 * DeepSeek API 集成模块
 * 用于AI物理问答功能
 * AI工具声明：本模块参考了DeepSeek API官方文档编写
 */

const DeepSeek = {
    // API配置 - 内置默认密钥，用户也可在页面中替换
    config: {
        apiKey: localStorage.getItem('deepseek_api_key') || 'sk-ad3a7f0a19034ea687db9c97f151771f',
        baseUrl: 'https://api.deepseek.com/v1',
        model: 'deepseek-chat',
        temperature: 0.7,
        maxTokens: 2000
    },

    // 对话历史
    messages: [
        {
            role: 'system',
            content: '你是一位专业的物理教师助理，擅长用通俗易懂的语言解释物理概念。' +
                '你会耐心地解答学生的物理问题，提供公式推导、概念解释和解题思路。' +
                '当学生问到物理实验时，你可以解释实验原理、步骤和注意事项。' +
                '回答应该使用中文，并且适合高中和大学低年级学生理解。' +
                '如果涉及数学公式，请使用LaTeX格式（用$$包裹行间公式，用$包裹行内公式）。'
        }
    ],

    // 设置API密钥
    setApiKey: function(key) {
        this.config.apiKey = key;
        localStorage.setItem('deepseek_api_key', key);
    },

    // 获取API密钥
    getApiKey: function() {
        return this.config.apiKey || localStorage.getItem('deepseek_api_key') || '';
    },

    // 发送消息到DeepSeek API
    sendMessage: async function(userMessage) {
        // 添加用户消息到历史
        this.messages.push({ role: 'user', content: userMessage });

        // 获取API密钥
        const apiKey = this.getApiKey();
        if (!apiKey) {
            this.messages.pop(); // 移除无效消息
            return { error: true, message: '请先配置API密钥。点击下方设置按钮输入你的DeepSeek API密钥。' };
        }

        // 构建请求体 - 使用最后10条消息以减少token使用
        const recentMessages = this.messages.slice(-10);

        try {
            const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: this.config.model,
                    messages: recentMessages,
                    temperature: this.config.temperature,
                    max_tokens: this.config.maxTokens,
                    stream: false
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`;
                this.messages.pop(); // 移除失败的消息
                return { error: true, message: `API请求失败: ${errorMsg}` };
            }

            const data = await response.json();
            const reply = data.choices?.[0]?.message?.content || '抱歉，没有收到有效回复。';

            // 保存AI回复到历史
            this.messages.push({ role: 'assistant', content: reply });

            return { error: false, message: reply };

        } catch (err) {
            this.messages.pop(); // 移除失败的消息
            return { error: true, message: `网络错误: ${err.message}。请检查网络连接和API地址配置。` };
        }
    },

    // 清空对话历史
    clearHistory: function() {
        while (this.messages.length > 1) this.messages.pop();
    },

    // 获取对话历史长度
    getHistoryLength: function() {
        return this.messages.length - 1; // 减去system消息
    }
};

// 兼容 main.js 的 DeepSeekAPI 接口
const DeepSeekAPI = {
    chat: async function(text) {
        const result = await DeepSeek.sendMessage(text);
        if (result.error) {
            throw new Error(result.message);
        }
        return result.message;
    }
};
