const chatWindow = document.getElementById("chatWindow");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMode = document.getElementById("chatMode");
const usageTip = document.getElementById("usageTip");

const llmBaseUrlInput = document.getElementById("llmBaseUrl");
const llmModelSelect = document.getElementById("llmModel");
const llmApiKeyInput = document.getElementById("llmApiKey");
const llmConfigPanel = document.getElementById("llmConfigPanel");
const saveLlmConfigBtn = document.getElementById("saveLlmConfig");
const clearLlmConfigBtn = document.getElementById("clearLlmConfig");
const conversationList = document.getElementById("conversationList");
const newConversationBtn = document.getElementById("newConversation");
const deleteConversationBtn = document.getElementById("deleteConversation");

const profile = {
  role: "内容策划",
  recent: "正在搭自己的个人主页，整理作品集",
  focus: "内容表达、AI 应用、知识整理",
};

const storageKey = "zitai_llm_config_v1";
const chatStorageKey = "zitai_chat_sessions_v1";
const usageStorageKey = "zitai_usage_count_v1";
const maxUserMessages = 10;

function loadUsageCount() {
  const raw = localStorage.getItem(usageStorageKey);
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.floor(parsed);
}

function saveUsageCount(value) {
  localStorage.setItem(usageStorageKey, String(value));
}

let usedCount = loadUsageCount();

function updateUsageTip() {
  const remain = Math.max(0, maxUserMessages - usedCount);
  usageTip.textContent = `发送额度：剩余 ${remain} / ${maxUserMessages}`;
}

function defaultConfig() {
  return {
    baseUrl: "https://api.siliconflow.cn/v1",
    model: "deepseek-ai/DeepSeek-V3",
    apiKey: "",
  };
}

function loadConfig() {
  const fallback = defaultConfig();
  const raw = localStorage.getItem(storageKey);
  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw);
    return {
      baseUrl: parsed.baseUrl || fallback.baseUrl,
      model: parsed.model || fallback.model,
      apiKey: parsed.apiKey || "",
    };
  } catch {
    return fallback;
  }
}

function saveConfig(config) {
  localStorage.setItem(storageKey, JSON.stringify(config));
}

function fillConfigInputs(config) {
  llmBaseUrlInput.value = config.baseUrl;
  llmModelSelect.value = config.model;
  llmApiKeyInput.value = config.apiKey;
}

function getDraftConfigFromInputs() {
  return {
    baseUrl: llmBaseUrlInput.value.trim() || "https://api.siliconflow.cn/v1",
    model: llmModelSelect.value || "deepseek-ai/DeepSeek-V3",
    apiKey: llmApiKeyInput.value.trim(),
  };
}

function isRealLlmEnabled(config) {
  return Boolean(config.baseUrl && config.model && config.apiKey);
}

function setModeTip(config) {
  if (isRealLlmEnabled(config)) {
    chatMode.textContent = `当前模式：硅基流动（${config.model}）`;
    return;
  }
  chatMode.textContent = `当前模式：硅基流动（${config.model}）未连接（请填写 API Key）`;
}

let llmConfig = loadConfig();
fillConfigInputs(llmConfig);
setModeTip(llmConfig);
updateUsageTip();

function loadChatState() {
  const raw = localStorage.getItem(chatStorageKey);
  if (!raw) {
    return {
      activeId: null,
      conversations: [],
    };
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      activeId: parsed.activeId || null,
      conversations: Array.isArray(parsed.conversations) ? parsed.conversations : [],
    };
  } catch {
    return {
      activeId: null,
      conversations: [],
    };
  }
}

function saveChatState() {
  localStorage.setItem(chatStorageKey, JSON.stringify(chatState));
}

function createConversation(title = "新对话") {
  const id = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  return {
    id,
    title,
    messages: [
      {
        sender: "bot",
        text: "嗨，我是 zitai 的数字分身。想了解 ta 的近况、作品或合作方式，都可以直接问我。",
      },
    ],
  };
}

let chatState = loadChatState();

if (!chatState.conversations.length) {
  const firstConversation = createConversation();
  chatState.conversations.push(firstConversation);
  chatState.activeId = firstConversation.id;
  saveChatState();
}

if (!chatState.conversations.some((item) => item.id === chatState.activeId)) {
  chatState.activeId = chatState.conversations[0].id;
  saveChatState();
}

function getActiveConversation() {
  return chatState.conversations.find((item) => item.id === chatState.activeId) || null;
}

function renderConversationOptions() {
  conversationList.innerHTML = "";

  chatState.conversations.forEach((item) => {
    const row = document.createElement("li");
    row.className = "conversation-item";
    row.dataset.id = item.id;
    row.setAttribute("role", "option");
    row.setAttribute("aria-selected", String(item.id === chatState.activeId));

    const titleBtn = document.createElement("button");
    titleBtn.type = "button";
    titleBtn.className = "conversation-title";
    titleBtn.textContent = item.title;
    titleBtn.dataset.id = item.id;

    const actions = document.createElement("div");
    actions.className = "conversation-item-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "item-icon";
    editBtn.title = "重命名";
    editBtn.textContent = "✎";

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "item-icon";
    deleteBtn.title = "删除";
    deleteBtn.textContent = "✕";
    deleteBtn.dataset.deleteId = item.id;

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    row.appendChild(titleBtn);
    row.appendChild(actions);
    conversationList.appendChild(row);
  });
}

const answerMap = [
  {
    patterns: [/现在在做什么/, /最近在做/, /忙什么/],
    reply: `我最近在做两件核心的事：${profile.recent}。目标是把内容方向和作品表达整理得更清晰。`,
  },
  {
    patterns: [/有哪些作品/, /作品集/, /看作品/],
    reply:
      "作品还在持续整理中，这个主页就是第一版入口。接下来会按“内容策划案例 / AI 应用实践 / 写作样稿”三个板块逐步补齐。",
  },
  {
    patterns: [/怎么联系/, /联系方式/, /合作/, /面试/],
    reply:
      "你可以先在这里留言你的合作或面试需求，我会尽快回复。后续我会在主页补上邮箱和社交账号入口。",
  },
];

function addMessage(text, sender) {
  const wrapper = document.createElement("div");
  wrapper.className = `msg ${sender}`;

  const bubble = document.createElement("p");
  bubble.textContent = text;

  wrapper.appendChild(bubble);
  chatWindow.appendChild(wrapper);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function renderActiveConversation() {
  const active = getActiveConversation();
  chatWindow.innerHTML = "";
  if (!active) return;

  active.messages.forEach((item) => {
    addMessage(item.text, item.sender);
  });
}

function appendMessage(text, sender) {
  const active = getActiveConversation();
  if (!active) return;

  active.messages.push({ text, sender });
  saveChatState();
  addMessage(text, sender);
}

function maybeRenameActiveConversation(firstQuestion) {
  const active = getActiveConversation();
  if (!active) return;
  if (!active.title.startsWith("新对话")) return;

  const nextTitle = firstQuestion.trim().slice(0, 14) || active.title;
  active.title = nextTitle;
  saveChatState();
  renderConversationOptions();
}

function getReply(question) {
  const normalized = question.trim();

  for (const item of answerMap) {
    if (item.patterns.some((rule) => rule.test(normalized))) {
      return item.reply;
    }
  }

  return `你好，我是 zitai 的数字分身。ta 的身份是${profile.role}，目前在${profile.recent}，重点关注${profile.focus}。你可以直接问我最近在做什么、有哪些作品，或者怎么联系。`;
}

async function getLlmReply(question) {
  const systemPrompt = [
    "你是 zitai 的数字分身，语气真诚、简洁、像真人交流。",
    `zitai 的身份：${profile.role}。`,
    `最近在做：${profile.recent}。`,
    `擅长或关心：${profile.focus}。`,
    "最可能被问到的问题是：你现在在做什么、你有哪些作品、怎么联系你。",
    "如果用户问到未提供的信息，不要编造，明确说明暂未公开，并给出下一步建议。",
  ].join("\n");

  const endpoint = `${llmConfig.baseUrl.replace(/\/$/, "")}/chat/completions`;
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${llmConfig.apiKey}`,
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: llmConfig.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM 请求失败（${response.status}）：${errorText || "未知错误"}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content?.trim() || "我暂时没有生成到有效回复，请稍后再试。";
}

renderConversationOptions();
renderActiveConversation();

llmModelSelect.addEventListener("change", () => {
  setModeTip(getDraftConfigFromInputs());
});

llmBaseUrlInput.addEventListener("input", () => {
  setModeTip(getDraftConfigFromInputs());
});

llmApiKeyInput.addEventListener("input", () => {
  setModeTip(getDraftConfigFromInputs());
});

conversationList.addEventListener("click", (event) => {
  const deleteTarget = event.target.closest("[data-delete-id]");
  if (deleteTarget) {
    const targetId = deleteTarget.dataset.deleteId;
    if (!targetId) return;

    if (chatState.conversations.length === 1) {
      const only = chatState.conversations[0];
      only.messages = createConversation().messages;
      chatState.activeId = only.id;
    } else {
      chatState.conversations = chatState.conversations.filter((item) => item.id !== targetId);
      if (chatState.activeId === targetId) {
        chatState.activeId = chatState.conversations[0].id;
      }
    }

    saveChatState();
    renderConversationOptions();
    renderActiveConversation();
    return;
  }

  const titleTarget = event.target.closest(".conversation-title");
  if (!titleTarget) return;

  chatState.activeId = titleTarget.dataset.id;
  saveChatState();
  renderConversationOptions();
  renderActiveConversation();
});

newConversationBtn.addEventListener("click", () => {
  const next = createConversation(`新对话 ${chatState.conversations.length + 1}`);
  chatState.conversations.unshift(next);
  chatState.activeId = next.id;
  saveChatState();
  renderConversationOptions();
  renderActiveConversation();
});

deleteConversationBtn.addEventListener("click", () => {
  if (chatState.conversations.length === 1) {
    const only = chatState.conversations[0];
    only.messages = createConversation().messages;
    chatState.activeId = only.id;
    saveChatState();
    renderConversationOptions();
    renderActiveConversation();
    return;
  }

  chatState.conversations = chatState.conversations.filter((item) => item.id !== chatState.activeId);
  chatState.activeId = chatState.conversations[0].id;
  saveChatState();
  renderConversationOptions();
  renderActiveConversation();
});

saveLlmConfigBtn.addEventListener("click", () => {
  llmConfig = getDraftConfigFromInputs();

  saveConfig(llmConfig);
  setModeTip(llmConfig);
  llmConfigPanel.open = false;
  appendMessage(
    isRealLlmEnabled(llmConfig)
      ? `模型配置已保存，当前将使用真实 LLM（${llmConfig.model}）。`
      : "配置已保存，但 API Key 为空。当前会使用本地兜底回复。",
    "bot"
  );
});

clearLlmConfigBtn.addEventListener("click", () => {
  llmConfig = defaultConfig();
  localStorage.removeItem(storageKey);
  fillConfigInputs(llmConfig);
  setModeTip(llmConfig);
  appendMessage("已清除模型配置。当前为硅基流动未连接状态，会使用本地兜底回复。", "bot");
});

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const question = chatInput.value.trim();
  if (!question) return;

  if (usedCount >= maxUserMessages) {
    appendMessage("已达到体验上限（10 条）。如需继续使用，请联系 zitai 开通更多额度。", "bot");
    chatInput.value = "";
    return;
  }

  appendMessage(question, "user");
  maybeRenameActiveConversation(question);
  usedCount += 1;
  saveUsageCount(usedCount);
  updateUsageTip();
  chatInput.value = "";

  if (!isRealLlmEnabled(llmConfig)) {
    setTimeout(() => {
      appendMessage(getReply(question), "bot");
    }, 300);
    return;
  }

  setTimeout(async () => {
    try {
      const reply = await getLlmReply(question);
      appendMessage(reply, "bot");
    } catch (error) {
      appendMessage(`真实 LLM 调用失败，已回退到本地演示回复。\n${error.message}`, "bot");
      appendMessage(getReply(question), "bot");
    }
  }, 150);
});
