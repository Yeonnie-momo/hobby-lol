import { NextRequest, NextResponse } from "next/server";
import { getAccountByRiotId, getMatch, getMatchIds } from "@/lib/riot";
import { analyzeMatches, extractStats } from "@/lib/analyze";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const gameName = searchParams.get("gameName");
  const tagLine = searchParams.get("tagLine");

  if (!gameName || !tagLine) {
    return NextResponse.json({ error: "소환사명과 태그를 입력해주세요" }, { status: 400 });
  }

  try {
    // 1. Riot ID로 PUUID 조회
    const account = await getAccountByRiotId(gameName, tagLine);
    const { puuid } = account;

    // 2. 최근 매치 ID 목록 조회
    const matchIds = await getMatchIds(puuid, 20);
    if (matchIds.length === 0) {
      return NextResponse.json({ error: "최근 게임 기록이 없습니다" }, { status: 404 });
    }

    // 3. 매치 상세 정보 배치 조회 (5개씩 나눠서 Rate Limit 방지)
    const ids = matchIds.slice(0, 20);
    const matches = [];
    for (let i = 0; i < ids.length; i += 5) {
      const batch = ids.slice(i, i + 5);
      const results = await Promise.all(batch.map((id: string) => getMatch(id)));
      matches.push(...results);
      if (i + 5 < ids.length) await new Promise((r) => setTimeout(r, 1200));
    }

    // 4. 해당 플레이어의 스탯만 추출
    const statsList = matches
      .map((match) => {
        const participant = match.info.participants.find((p) => p.puuid === puuid);
        if (!participant) return null;
        return extractStats(participant, match.info.gameDuration);
      })
      .filter(Boolean) as ReturnType<typeof extractStats>[];

    // 5. 분석
    const analysis = analyzeMatches(statsList);

    // 6. Claude로 자연어 코멘트 생성
    const topRec = analysis.recommendations[0];
    const { isMultiPosition, isHighWinRate } = analysis;
    const winRatePct = Math.round(analysis.winRate * 100);

    const situation = isMultiPosition
      ? `주포지션도 없이 ${analysis.totalGames}게임 동안 여러 포지션을 전전하고 있음. 승률 ${winRatePct}%.`
      : isHighWinRate
      ? `${analysis.currentMainLaneKr} 승률 ${winRatePct}%로 잘 하고 있음. 근데 딴 라인으로 가고 싶어함. 굳이 바꾼다면 ${topRec.laneKr} 추천.`
      : `${analysis.currentMainLaneKr} 승률 ${winRatePct}%. 스탯 분석 결과 ${topRec.laneKr}이 더 어울림. 이유: ${topRec.reasons.join(", ")}.`;

    const instruction = isMultiPosition
      ? "주포지션도 없이 이것저것 기웃거리는 걸 냉혹하게 팩폭해. 당장 하나만 파라고 단호하게 말해."
      : isHighWinRate
      ? "지금 포지션 승률이 좋으니 굳이 바꿀 필요 없다고 팩폭해. 그래도 딴 거 하고 싶으면 추천 포지션 하나 언급해줘."
      : "현재 포지션이 별로고 추천 포지션이 더 잘 맞는다고 냉혹하게 팩폭해.";

    const prompt = `너는 리그 오브 레전드 전적 분석 AI야. 말투는 반말이고, 냉혹하고 직설적이며 사이코패스 코치 스타일이야. 위로 없음. 감정 없음. 팩트만. 병신, 개판, 쓰레기 같은 거친 표현도 자연스럽게 섞어.

플레이어: ${gameName}
상황: ${situation}

할 일: ${instruction}

2~3문장. 한국어 반말. 이모지 없음.`;


    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    const comment = message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({ ...analysis, comment, gameName, tagLine });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
