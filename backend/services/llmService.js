async function chat(character, history, userInput) {
  const systemPrompt = `你是一个角色扮演游戏中的角色。请严格遵守以下设定进行回应：

角色名称：${character.name}
性别：${character.gender === 'male' ? '男' : character.gender === 'female' ? '女' : '其他'}
年龄：${character.age}岁
声音类型：${character.voiceType}
角色描述：${character.description}
标签：${(character.tags || []).join('、') || '无'}

要求：
1. 始终保持该角色的人设和说话风格
2. 回复要自然、有温度，符合角色设定
3. 回复长度适中，一般 20-100 字
4. 不要暴露自己是 AI 或虚拟角色`;

  const messages = [{ role: 'system', content: systemPrompt }];

  for (const msg of history) {
    if (msg.role === 'user') {
      messages.push({ role: 'user', content: msg.content });
    } else {
      messages.push({ role: 'assistant', content: msg.content });
    }
  }

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
        temperature: 0.8,
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

function mockReply(character, userInput) {
  const greetings = ['你好呀~', '嗨！', '嗯？怎么了？', '在呢，有什么事吗？'];
  const random = greetings[Math.floor(Math.random() * greetings.length)];
  return `${random} 我是${character.name}，关于「${userInput.slice(0, 20)}${userInput.length > 20 ? '...' : ''}」，我觉得... 这是一个占位回复，请配置 LLM_API_KEY 以启用真实 AI 对话。`;
}

module.exports = { chat };
