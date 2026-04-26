// netlify/functions/ask.js
// OpenAI API 프록시 — 키를 서버에 숨김

exports.handler = async function(event) {
  // POST 요청만 허용
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API 키가 설정되지 않았어요' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch(e) {
    return { statusCode: 400, body: JSON.stringify({ error: '잘못된 요청입니다' }) };
  }

  const concern = body.concern;
  if (!concern || concern.length > 500) {
    return { statusCode: 400, body: JSON.stringify({ error: '고민 내용을 확인해주세요' }) };
  }

  const systemPrompt = `당신은 성경에 깊은 지식을 가진 따뜻한 기독교 상담가입니다. 사용자의 고민을 듣고 반드시 아래 JSON 형식으로만 응답하세요. Markdown 없이 순수 JSON만 출력하세요.
{"situation":"감지된 상황 한 줄 요약","story":{"title":"관련 성경 인물/사건 제목","text":"200자 이상 상세 이야기"},"verses":[{"ref":"성경책 장:절","ko":"구절 내용","en":"KJV 영어 원문","eng":"핵심 영어 표현","meaning":"뜻과 위로 이유"},{"ref":"성경책 장:절","ko":"구절 내용","en":"KJV 영어 원문","eng":"핵심 영어 표현","meaning":"뜻과 위로 이유"},{"ref":"성경책 장:절","ko":"구절 내용","en":"KJV 영어 원문","eng":"핵심 영어 표현","meaning":"뜻과 위로 이유"}],"prayer":"맞춤 기도문 3~5문장","comfort":"목사님 톤의 따뜻한 위로 메시지 3~4문장","music":{"ccm":{"t":"곡명","a":"아티스트","d":"추천 이유","q":"유튜브 검색어"},"hymn":{"n":"장번호","t":"곡명","d":"추천 이유","q":"유튜브 검색어"},"pop":{"t":"곡명","a":"아티스트","d":"추천 이유","q":"유튜브 검색어"}},"youtube":[{"t":"영상 제목","d":"설명","q":"유튜브 검색어","type":"설교"},{"t":"영상 제목","d":"설명","q":"유튜브 검색어","type":"묵상"},{"t":"영상 제목","d":"설명","q":"유튜브 검색어","type":"설교"}]}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + OPENAI_KEY
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 1800,
        temperature: 0.7,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: '고민: ' + concern }
        ]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: (err.error && err.error.message) || 'API 오류' })
      };
    }

    const data = await response.json();
    const text = data.choices[0].message.content || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const start = clean.indexOf('{');
    const end = clean.lastIndexOf('}');
    const jsonStr = (start !== -1 && end !== -1) ? clean.slice(start, end + 1) : clean;
    const result = JSON.parse(jsonStr);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result)
    };

  } catch(e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: '서버 오류: ' + e.message })
    };
  }
};
