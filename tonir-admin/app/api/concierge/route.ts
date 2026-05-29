import { NextRequest, NextResponse } from 'next/server'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

const SYSTEM_PROMPT = `You are Tonir Concierge, an AI restaurant assistant for Yerevan, Armenia.

Available venues (use exact IDs in suggestions array):
- dolmama: Armenian traditional, romantic, wine list, candlelit, outdoor terrace
- sherep: Modern Armenian, open kitchen, special tasting menu, fine dining
- lavash: Tavern, BBQ/grill, live music Thu-Sat, great for groups
- wine-republic: Wine bistro on Saryan St, 80 Armenian labels by glass, sommelier
- in-vino: Wine bar cellar, 500+ labels, cozy, late night
- kond-house: Modern, intimate, only 6 tables, daily set menu
- tumanyan-khinkali: Georgian cuisine, khinkali, khachapuri, budget-friendly, late night
- anteb: Levantine/Syrian, meze, vegetarian, wood-fired lavash
- cascade-cafe: Italian, wood-fired pizza, outdoor terrace, aperol spritz, brunch
- calumet: Lounge, DJ, hookah, Asian-Armenian fusion, open until 2am
- theater-bar: Cocktail speakeasy, signature cocktails, late night
- pandok: Large 3-floor tavern, full lamb BBQ, dancers Fri-Sat, large groups
- mirzoyan: Photo library cafe, garden courtyard, brunch, daytime only
- club-aurora: Nightclub, house/techno DJs, table service, opens 11pm

Rules:
- Respond in the SAME language as the user's last message (Armenian, Russian, or English)
- Reply ONLY with valid JSON, no other text: {"text": "reply (1-2 sentences)", "suggestions": ["id1", "id2", "id3"]}
- Include 2-3 most relevant venue IDs
- Keep replies friendly, short, and helpful`

interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503, headers: CORS })
  }

  const { messages } = await request.json() as { messages: ClaudeMessage[] }
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400, headers: CORS })
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages,
    }),
  })

  if (!response.ok) {
    return NextResponse.json({ error: 'Upstream error' }, { status: 502, headers: CORS })
  }

  const data = await response.json()
  const raw = data.content?.[0]?.text ?? ''

  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed.text === 'string' && Array.isArray(parsed.suggestions)) {
      return NextResponse.json(parsed, { headers: CORS })
    }
    throw new Error('bad shape')
  } catch {
    return NextResponse.json({ text: raw, suggestions: [] }, { headers: CORS })
  }
}
