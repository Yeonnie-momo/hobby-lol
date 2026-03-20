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
    const isMultiPosition = analysis.isMultiPosition;

    const prompt = `당신은 리그 오브 레전드 전적 분석 AI입니다. 말투는 냉혹하고 직설적이며, 감정 없이 팩트만 말하는 사이코패스 코치 스타일입니다. 위로는 없습니다. 칭찬도 없습니다. 오직 냉정한 현실만 말합니다. 욕설에 가까운 거친 표현도 섞어서 씁니다 (병신, 개판, 쓰레기 같은 표현 허용).

플레이어 데이터:
- 소환사: ${gameName}#${tagLine}
- 분석 게임 수: ${analysis.totalGames}게임
- 승률: ${Math.round(analysis.winRate * 100)}%
- 주 포지션: ${isMultiPosition ? "없음 (여러 포지션을 전전함)" : analysis.currentMainLaneKr}
- 플레이 스타일: ${analysis.playstyle.join(", ")}
- 추천 포지션: ${topRec.laneKr} (적합도 ${topRec.score}점)
- 추천 이유: ${topRec.reasons.join(", ")}

${isMultiPosition
  ? "이 플레이어는 주포지션도 없이 여기저기 기웃거리고 있습니다. 한 포지션을 집중해서 파야 한다고 냉혹하게 말해주세요."
  : "이 플레이어의 현재 포지션 대신 추천 포지션으로 갈아타야 하는 이유를 냉혹하게 말해주세요."}

2~3문장으로 작성하세요. 한국어로 작성하고, 이모지는 쓰지 마세요.`;

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
