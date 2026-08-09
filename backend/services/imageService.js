async function generateAvatar(character) {
  const apiKey = process.env.IMAGE_API_KEY;

  if (!apiKey || apiKey === '__REPLACE_ME__') {
    return mockAvatar(character);
  }

  try {
    const prompt = `${character.name}, ${character.gender === 'male' ? 'male' : character.gender === 'female' ? 'female' : 'other'}, ${character.age} years old, ${(character.tags || []).join(', ')}, ${character.description}`;
    const res = await fetch(`${process.env.IMAGE_API_URL || 'https://api.example.com/image'}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ prompt, n: 1, size: '512x512' }),
    });

    if (!res.ok) throw new Error(`Image API 错误: ${res.status}`);
    const data = await res.json();
    return data.data?.[0]?.url || mockAvatar(character);
  } catch (err) {
    console.warn('[Image] 调用失败，使用占位头像:', err.message);
    return mockAvatar(character);
  }
}

function mockAvatar(character) {
  const colorMap = {
    male: ['#4A90D9', '#5B8DEF'],
    female: ['#E8A0BF', '#F48FB1'],
    other: ['#9B7ED9', '#7FD1B9'],
  };
  const palette = colorMap[character.gender] || colorMap.other;
  const bg = palette[Math.floor(Math.random() * palette.length)];
  const letter = encodeURIComponent(character.name.charAt(0) || '?');
  return `https://ui-avatars.com/api/?name=${letter}&background=${bg.replace('#', '')}&color=fff&size=256`;
}

module.exports = { generateAvatar };
