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

    // 3. 매치 상세 정보 병렬 조회 (최대 20게임)
    const matches = await Promise.all(matchIds.slice(0, 20).map((id: string) => getMatch(id)));

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
    const prompt = `리그 오브 레전드 플레이어 분석 결과입니다.

소환사: ${gameName}#${tagLine}
분석 게임 수: ${analysis.totalGames}게임
승률: ${Math.round(analysis.winRate * 100)}%
현재 주 포지션: ${analysis.currentMainLaneKr}
플레이 스타일: ${analysis.playstyle.join(", ")}
최고 추천 포지션: ${topRec.laneKr} (적합도 ${topRec.score}점)
추천 이유: ${topRec.reasons.join(", ")}

위 분석을 바탕으로 이 플레이어에게 2~3문장의 따뜻하고 구체적인 코멘트를 작성해주세요.
현재 실력을 칭찬하고 새 포지션에서의 가능성을 언급해주세요.
반드시 한국어로 작성하고, 이모지를 1~2개만 사용하세요.`;

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
