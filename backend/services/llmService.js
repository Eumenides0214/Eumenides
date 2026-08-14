async function chat(character, history, userInput) {
  const currentQuestion = String(userInput || '').trim();
  const systemPrompt = `你是一个角色扮演游戏中的角色。请严格遵守以下设定进行回应：

角色名称：${character.name}
性别：${character.gender === 'male' ? '男' : character.gender === 'female' ? '女' : '其他'}
年龄：${character.age}岁
声音类型：${character.voiceType}
角色描述：${character.description}
标签：${(character.tags || []).join('、') || '无'}

要求：
1. 始终保持该角色的人设和说话风格
2. 当前用户问题是最高优先级，必须先正面回答当前问题，再补充角色口吻
3. 历史对话只能作为参考，不能让历史话题覆盖当前问题
4. 如果历史回复和当前问题冲突，以当前问题为准
5. 如果用户问“某人是谁/某物是什么”，而角色设定和历史没有明确答案，要直接说明不知道或不确定，不能编造队友、使命、战斗背景
6. 如果用户在纠正你答非所问，要先简短道歉，再针对用户刚问的问题作答
7. 不要编造用户没有说过的经历、训练、约定或背景
8. 回复要自然、有温度，符合角色设定
9. 回复长度适中，一般 20-120 字
10. 不要暴露自己是 AI 或虚拟角色`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'system', content: `当前必须回答的问题：${currentQuestion}` },
  ];

  for (const msg of normalizeHistory(history, currentQuestion)) {
    if (msg.role === 'user') {
      messages.push({ role: 'user', content: msg.content });
    } else {
      messages.push({ role: 'assistant', content: msg.content });
    }
  }

  messages.push({
    role: 'user',
    content: `请直接回答这个当前问题，不要继续历史里的旧话题：${currentQuestion}`,
  });

  try {
    const apiKey = process.env.LLM_API_KEY;
    const apiUrl = process.env.LLM_API_URL;
    const model = process.env.LLM_MODEL;

    if (!apiKey || apiKey === '__REPLACE_ME__' || !apiUrl || apiUrl === '__REPLACE_ME__') {
      return mockReply(character, userInput);
    }

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages,
        max_tokens: 200,
        temperature: Number(process.env.LLM_TEMPERATURE || 0.35),
      }),
    });

    if (!res.ok) throw new Error(`LLM API 错误: ${res.status}`);
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) throw new Error('LLM 返回为空');
    return reply;
  } catch (err) {
    console.warn('[LLM] 调用失败，使用模拟回复:', err.message);
    return mockReply(character, userInput);
  }
}

function normalizeHistory(history, currentQuestion) {
  const items = Array.isArray(history) ? history : [];
  const trimmed = items.slice(-8);
  const normalized = [];

  for (let index = 0; index < trimmed.length; index++) {
    const msg = trimmed[index];
    if (!msg?.content) continue;

    const isLast = index === trimmed.length - 1;
    if (isLast && msg.role === 'user' && msg.content === currentQuestion) {
      normalized.push(msg);
      continue;
    }

    if (msg.role === 'assistant') {
      normalized.push({
        ...msg,
        content: `[历史回复，仅供参考，可能不准确，不要照抄或延续旧话题] ${msg.content}`,
      });
      continue;
    }

    normalized.push(msg);
  }

  return normalized;
}

function mockReply(character, userInput) {
  const greetings = ['你好呀~', '嗨！', '嗯？怎么了？', '在呢，有什么事吗？'];
  const random = greetings[Math.floor(Math.random() * greetings.length)];
  return `${random} 我是${character.name}，关于「${userInput.slice(0, 20)}${userInput.length > 20 ? '...' : ''}」，我觉得... 这是一个占位回复，请配置 LLM_API_KEY 以启用真实 AI 对话。`;
}

module.exports = { chat };
