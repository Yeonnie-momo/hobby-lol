import { Participant } from "./riot";

export interface MatchStats {
  position: string;
  champion: string;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  visionScore: number;
  damageDealt: number;
  damageTaken: number;
  goldEarned: number;
  timeCCing: number;
  healsOnTeammates: number;
  win: boolean;
  killParticipation: number;
  monsterKills: number;
  objectivesStolen: number;
  dragonTakedowns: number;
  baronTakedowns: number;
  gameDuration: number; // seconds
}

export interface LaneRecommendation {
  lane: string;
  laneKr: string;
  score: number;
  reasons: string[];
  recommendedChampions: ChampionRec[];
}

export interface ChampionRec {
  name: string;
  reason: string;
}

export interface AnalysisResult {
  currentMainLane: string;
  currentMainLaneKr: string;
  isMultiPosition: boolean;
  isHighWinRate: boolean;
  playstyle: string[];
  recommendations: LaneRecommendation[];
  totalGames: number;
  winRate: number;
}

// 플레이스타일 태그
// 유저 태그: 높은KDA | 팀기여 | 파밍 | 딜지향 | 탱커 | CC | 시야 | 힐 | 밸런스
// 챔피언 태그: safe | aggressive | tank | cc | farm | team | heal | vision | damage | beginner

interface ChampionPool {
  name: string;
  reason: string;
  tags: string[];
}

const LANE_CHAMPION_POOL: Record<string, ChampionPool[]> = {
  TOP: [
    { name: "Garen", reason: "단순한 스킬셋, 높은 생존력으로 탑 입문에 최적", tags: ["tank", "safe", "beginner"] },
    { name: "Malphite", reason: "한타 이니시에이팅이 강력하고 팀 기여도 최고", tags: ["tank", "cc", "team"] },
    { name: "Darius", reason: "강한 라인전과 직관적인 킬 지향 플레이", tags: ["aggressive", "damage"] },
    { name: "Sett", reason: "높은 체력과 단순한 조작으로 탱커/딜러 모두 가능", tags: ["tank", "aggressive", "cc"] },
    { name: "Cho'Gath", reason: "파밍하면서 커지는 탱커, 후반 한타 기여 극대화", tags: ["tank", "cc", "farm"] },
    { name: "Fiora", reason: "1:1 싸움이 강한 듀얼리스트, 높은 KDA 플레이어에게 적합", tags: ["aggressive", "damage", "safe"] },
    { name: "Nasus", reason: "파밍에 집중하면 후반 무결점 탱커·딜러로 성장", tags: ["farm", "tank", "safe"] },
    { name: "Teemo", reason: "견제·시야 관리에 강한 라인 괴롭히기 챔피언", tags: ["safe", "vision", "damage"] },
  ],
  JUNGLE: [
    { name: "Warwick", reason: "초보 정글러에게 최적, 추적 본능으로 갱킹 쉬움", tags: ["safe", "beginner", "aggressive"] },
    { name: "Amumu", reason: "강력한 CC와 한타 기여, 팀 기여형 플레이어에게 최적", tags: ["cc", "team", "tank", "beginner"] },
    { name: "Vi", reason: "돌진형 이니시에이터, 공격적 플레이어에게 적합", tags: ["aggressive", "cc", "damage"] },
    { name: "Hecarim", reason: "빠른 이동속도로 갱킹 용이, 딜·탱 모두 가능", tags: ["aggressive", "damage", "tank"] },
    { name: "Nunu & Willump", reason: "오브젝트 장악력 최고, 시야·팀 기여에 강함", tags: ["team", "vision", "cc", "safe"] },
    { name: "Jarvan IV", reason: "CC와 이니시에이팅으로 팀 교전 주도", tags: ["cc", "team", "aggressive"] },
    { name: "Xin Zhao", reason: "강력한 초반 압박과 높은 딜량으로 스노우볼", tags: ["aggressive", "damage"] },
    { name: "Zac", reason: "긴 사거리 이니시와 높은 생존력으로 팀 기여", tags: ["tank", "cc", "team"] },
  ],
  MIDDLE: [
    { name: "Annie", reason: "스턴과 폭딜, 미드 기본기를 익히기 최적", tags: ["cc", "damage", "beginner"] },
    { name: "Veigar", reason: "파밍 집중하면 후반 AP 폭딜 무한성장", tags: ["farm", "damage", "safe"] },
    { name: "Lux", reason: "안전한 사거리와 CC로 라인전·한타 모두 유리", tags: ["safe", "cc", "damage", "vision"] },
    { name: "Malzahar", reason: "라인 압박·억제기 파괴 특화, 안정적인 파밍형 미드", tags: ["safe", "farm", "damage"] },
    { name: "Syndra", reason: "폭발적인 단일 딜, 킬 지향 공격적 플레이어에 적합", tags: ["aggressive", "damage"] },
    { name: "Viktor", reason: "후반으로 갈수록 강해지는 파밍형 AP 캐리", tags: ["farm", "damage", "safe"] },
    { name: "Orianna", reason: "팀 한타 이니시와 딜을 동시에, 팀 기여 최고", tags: ["team", "cc", "damage"] },
    { name: "Galio", reason: "글로벌 이니시로 팀 기여 극대화, 탱커형 미드", tags: ["tank", "cc", "team"] },
  ],
  BOTTOM: [
    { name: "Ashe", reason: "CC로 안전하게 유틸, 원딜 기본기 학습에 최적", tags: ["cc", "safe", "beginner", "team"] },
    { name: "Miss Fortune", reason: "강력한 한타 궁극기, 팀 교전 기여도 최고", tags: ["team", "damage", "aggressive"] },
    { name: "Caitlyn", reason: "긴 사거리로 안전한 라인전, 파밍과 포킹에 강함", tags: ["safe", "farm", "damage", "vision"] },
    { name: "Jinx", reason: "스노우볼 후 후반 압도적 딜, 공격적 플레이에 적합", tags: ["aggressive", "damage", "farm"] },
    { name: "Sivir", reason: "팀 이동속도 버프와 스펠 쉴드로 생존·팀 기여", tags: ["safe", "team"] },
    { name: "Jhin", reason: "CC와 높은 딜을 겸비, 팀 기여·킬 지향 모두 가능", tags: ["cc", "damage", "safe"] },
    { name: "Ezreal", reason: "스킬샷 기반 안전한 포킹, 높은 KDA 플레이어에 적합", tags: ["safe", "damage", "farm"] },
    { name: "Twitch", reason: "은신 후 기습으로 한타 폭딜, 공격적 플레이어에 적합", tags: ["aggressive", "damage"] },
  ],
  UTILITY: [
    { name: "Soraka", reason: "글로벌 힐로 팀 생존력 극대화, 힐 성향 플레이어에 최적", tags: ["heal", "safe", "team"] },
    { name: "Lux", reason: "CC와 딜을 동시에, 딜 지향 플레이어도 서폿으로 활약 가능", tags: ["cc", "damage", "safe"] },
    { name: "Blitzcrank", reason: "훅 하나로 판을 뒤집는 공격적 이니시에이터", tags: ["aggressive", "cc"] },
    { name: "Janna", reason: "실드와 디스인게이지로 원딜 완벽 보호, 안전 지향에 최적", tags: ["safe", "heal", "team"] },
    { name: "Leona", reason: "강력한 CC로 이니시에이팅, 탱커형 플레이어에게 적합", tags: ["tank", "cc", "aggressive"] },
    { name: "Thresh", reason: "훅·랜턴으로 아군 보호와 이니시 모두 가능", tags: ["cc", "team", "aggressive"] },
    { name: "Nautilus", reason: "다중 CC로 이니시에이팅, 탱커 경험 있는 플레이어에게 적합", tags: ["tank", "cc", "team"] },
    { name: "Sona", reason: "힐·버프·CC를 겸비한 올라운더 인챈터", tags: ["heal", "team", "cc", "safe"] },
  ],
};

// 유저 플레이스타일 태그 → 챔피언 태그 매핑
const STYLE_TO_CHAMPION_TAGS: Record<string, string[]> = {
  "높은 KDA": ["safe"],
  "팀 기여형": ["team", "cc"],
  "파밍 지향": ["farm"],
  "딜 지향": ["aggressive", "damage"],
  "탱커형": ["tank"],
  "CC 활용": ["cc"],
  "시야 관리": ["vision", "safe"],
  "힐/보호": ["heal"],
  "정글 경험": ["aggressive"],
  "밸런스형": ["beginner"],
};

function selectChampions(lane: string, playstyle: string[]): ChampionRec[] {
  const pool = LANE_CHAMPION_POOL[lane] ?? [];

  // 유저 플레이스타일 → 챔피언 태그로 변환
  const desiredTags = new Set<string>();
  for (const style of playstyle) {
    for (const tag of STYLE_TO_CHAMPION_TAGS[style] ?? []) {
      desiredTags.add(tag);
    }
  }

  // 챔피언별 태그 매칭 점수 계산
  const scored = pool.map((champ) => ({
    champ,
    score: champ.tags.filter((t) => desiredTags.has(t)).length,
  }));

  // 점수 내림차순 정렬, 동점이면 pool 순서 유지
  scored.sort((a, b) => b.score - a.score);

  return scored.slice(0, 3).map(({ champ }) => ({ name: champ.name, reason: champ.reason }));
}

const LANE_KR: Record<string, string> = {
  TOP: "탑",
  JUNGLE: "정글",
  MIDDLE: "미드",
  BOTTOM: "원딜",
  UTILITY: "서포터",
  UNKNOWN: "알 수 없음",
};

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function extractStats(participant: Participant, gameDuration: number): MatchStats {
  const cs = participant.totalMinionsKilled + participant.neutralMinionsKilled;
  return {
    position: participant.teamPosition || participant.individualPosition || "UNKNOWN",
    champion: participant.championName,
    kills: participant.kills,
    deaths: participant.deaths,
    assists: participant.assists,
    cs,
    visionScore: participant.visionScore,
    damageDealt: participant.totalDamageDealtToChampions,
    damageTaken: participant.totalDamageTaken,
    goldEarned: participant.goldEarned,
    timeCCing: participant.timeCCingOthers,
    healsOnTeammates: participant.totalHealsOnTeammates,
    win: participant.win,
    killParticipation: participant.challenges?.killParticipation ?? 0,
    monsterKills: participant.neutralMinionsKilled,
    objectivesStolen: participant.objectivesStolen ?? 0,
    dragonTakedowns: participant.challenges?.dragonTakedowns ?? 0,
    baronTakedowns: participant.challenges?.baronTakedowns ?? 0,
    gameDuration,
  };
}

export function analyzeMatches(statsList: MatchStats[]): AnalysisResult {
  if (statsList.length === 0) {
    throw new Error("분석할 게임 데이터가 없습니다");
  }

  // 현재 주 포지션 파악
  const positionCount: Record<string, number> = {};
  for (const s of statsList) {
    if (s.position && s.position !== "UNKNOWN") {
      positionCount[s.position] = (positionCount[s.position] ?? 0) + 1;
    }
  }
  const sortedPositions = Object.entries(positionCount).sort((a, b) => b[1] - a[1]);
  const currentMainLane = sortedPositions[0]?.[0] ?? "UNKNOWN";
  const mainLaneRatio = (sortedPositions[0]?.[1] ?? 0) / statsList.length;
  const isMultiPosition = mainLaneRatio < 0.4;

  // 전체 평균 스탯 계산
  const winRate = statsList.filter((s) => s.win).length / statsList.length;
  const avgKDA = avg(statsList.map((s) => (s.kills + s.assists) / Math.max(s.deaths, 1)));
  const avgCS = avg(statsList.map((s) => s.cs));
  const avgVision = avg(statsList.map((s) => s.visionScore));
  const avgDamage = avg(statsList.map((s) => s.damageDealt));
  const avgTankiness = avg(statsList.map((s) => s.damageTaken));
  const avgKP = avg(statsList.map((s) => s.killParticipation));
  const avgCC = avg(statsList.map((s) => s.timeCCing));
  const avgMonster = avg(statsList.map((s) => s.monsterKills));
  const avgHeal = avg(statsList.map((s) => s.healsOnTeammates));
  const avgObjStolen = avg(statsList.map((s) => s.objectivesStolen));
  const avgDragonTakedowns = avg(statsList.map((s) => s.dragonTakedowns));
  const avgBaronTakedowns = avg(statsList.map((s) => s.baronTakedowns));
  const avgGold = avg(statsList.map((s) => s.goldEarned));
  const avgDuration = avg(statsList.map((s) => s.gameDuration)) / 60; // minutes

  // CS per minute
  const csPerMin = avgDuration > 0 ? avgCS / avgDuration : 0;

  // 플레이스타일 태그
  const playstyle: string[] = [];
  if (avgKDA >= 3) playstyle.push("높은 KDA");
  if (avgKP >= 0.6) playstyle.push("팀 기여형");
  if (csPerMin >= 7) playstyle.push("파밍 지향");
  if (avgDamage >= 20000) playstyle.push("딜 지향");
  if (avgTankiness >= 25000) playstyle.push("탱커형");
  if (avgCC >= 20) playstyle.push("CC 활용");
  if (avgVision >= 25) playstyle.push("시야 관리");
  if (avgHeal >= 2000) playstyle.push("힐/보호");
  if (avgMonster >= 50) playstyle.push("정글 경험");
  if (playstyle.length === 0) playstyle.push("밸런스형");

  // 라인별 적합도 점수 계산
  const recommendations: LaneRecommendation[] = [];

  // ─── TOP ───
  if (isMultiPosition || currentMainLane !== "TOP") {
    let score = 50;
    const reasons: string[] = [];
    if (avgTankiness >= 25000) { score += 15; reasons.push("피해 흡수량이 높아 탑 솔로 라인에 적합"); }
    if (avgCC >= 15) { score += 10; reasons.push("CC 활용도가 높아 탱커/이니시에이터에 유리"); }
    if (csPerMin >= 6) { score += 10; reasons.push("파밍 능력이 탑 솔로 라인에서 안정적으로 발휘될 수 있음"); }
    if (avgKDA >= 2.5) { score += 10; reasons.push("KDA가 좋아 라인전 생존력이 높을 것으로 예상"); }
    if (avgKP < 0.5) { score += 5; reasons.push("라인 고정 플레이 성향이 탑에서 유효"); }
    recommendations.push({ lane: "TOP", laneKr: "탑", score, reasons, recommendedChampions: selectChampions("TOP", playstyle) });
  }

  // ─── JUNGLE ───
  if (isMultiPosition || currentMainLane !== "JUNGLE") {
    let score = 50;
    const reasons: string[] = [];
    if (avgKP >= 0.6) { score += 15; reasons.push("킬 관여율이 높아 정글 갱킹 플레이에 최적"); }
    if (avgMonster >= 30) { score += 10; reasons.push("몬스터 처치 경험이 있어 정글 클리어에 적응 빠름"); }
    if (avgKDA >= 3) { score += 10; reasons.push("높은 KDA가 리스크 관리를 잘 한다는 신호"); }
    if (avgCC >= 10) { score += 10; reasons.push("CC 활용도가 정글 갱킹 성공률을 높임"); }
    if (avgDamage >= 15000) { score += 5; reasons.push("딜량이 있어 전투형 정글러에 어울림"); }
    if (avgDragonTakedowns >= 1.5) { score += 10; reasons.push("드래곤 교전 기여도가 높아 오브젝트 관리에 적합"); }
    if (avgBaronTakedowns >= 0.5) { score += 10; reasons.push("바론 처치 참여율이 높아 후반 오브젝트 운영에 강점"); }
    if (avgObjStolen >= 0.3) { score += 5; reasons.push("오브젝트 스틸 경험이 있어 스마이트 타이밍 감각 보유"); }
    recommendations.push({ lane: "JUNGLE", laneKr: "정글", score, reasons, recommendedChampions: selectChampions("JUNGLE", playstyle) });
  }

  // ─── MIDDLE ───
  if (isMultiPosition || currentMainLane !== "MIDDLE") {
    let score = 50;
    const reasons: string[] = [];
    if (avgDamage >= 20000) { score += 15; reasons.push("높은 딜량이 미드의 캐리 역할에 적합"); }
    if (csPerMin >= 6.5) { score += 10; reasons.push("CS 수급 능력이 미드 라인에서 중요한 파밍에 유리"); }
    if (avgKDA >= 3) { score += 10; reasons.push("KDA가 높아 미드 솔로 라인 생존에 유리"); }
    if (avgKP >= 0.55) { score += 10; reasons.push("킬 관여율이 높아 로밍 이후 팀 기여 가능"); }
    if (avgGold >= 12000) { score += 5; reasons.push("골드 효율이 높아 미드 성장곡선에 적합"); }
    recommendations.push({ lane: "MIDDLE", laneKr: "미드", score, reasons, recommendedChampions: selectChampions("MIDDLE", playstyle) });
  }

  // ─── BOTTOM (ADC) ───
  if (isMultiPosition || currentMainLane !== "BOTTOM") {
    let score = 50;
    const reasons: string[] = [];
    if (csPerMin >= 7) { score += 15; reasons.push("높은 CS 수급 능력이 원딜의 핵심 역량에 부합"); }
    if (avgDamage >= 18000) { score += 10; reasons.push("꾸준한 딜량이 원딜의 지속 피해에 적합"); }
    if (avgKDA >= 3) { score += 10; reasons.push("생존 능력이 뛰어나 원딜의 포지셔닝에 유리"); }
    if (avgGold >= 13000) { score += 10; reasons.push("골드 효율이 높아 아이템 의존도가 큰 원딜과 궁합 좋음"); }
    if (avgTankiness < 20000) { score += 5; reasons.push("피해를 덜 받는 성향이 원딜 포지셔닝과 일치"); }
    recommendations.push({ lane: "BOTTOM", laneKr: "원딜", score, reasons, recommendedChampions: selectChampions("BOTTOM", playstyle) });
  }

  // ─── UTILITY (Support) ───
  if (isMultiPosition || currentMainLane !== "UTILITY") {
    let score = 50;
    const reasons: string[] = [];
    if (avgVision >= 25) { score += 15; reasons.push("시야 점수가 높아 서포터의 와드 관리에 적합"); }
    if (avgKP >= 0.65) { score += 10; reasons.push("팀 교전 참여율이 높아 서포터 역할에 자연스럽게 적응 가능"); }
    if (avgCC >= 20) { score += 10; reasons.push("CC 활용도가 높아 이니시에이터 서포터에 어울림"); }
    if (avgHeal >= 1500) { score += 10; reasons.push("힐/보호 경험이 있어 인챈터 서포터에 적합"); }
    if (avgTankiness >= 22000) { score += 5; reasons.push("피해 흡수 경험이 탱커형 서포터와 궁합 좋음"); }
    recommendations.push({ lane: "UTILITY", laneKr: "서포터", score, reasons, recommendedChampions: selectChampions("UTILITY", playstyle) });
  }

  recommendations.sort((a, b) => b.score - a.score);

  const isHighWinRate = !isMultiPosition && winRate >= 0.55;

  // 점수 정규화 — 고승률이면 최대 50점으로 제한 (굳이 바꿀 필요 없다는 신호)
  const normalizeMax = isHighWinRate ? 50 : 100;
  const maxScore = Math.max(...recommendations.map((r) => r.score));
  const minScore = Math.min(...recommendations.map((r) => r.score));
  for (const rec of recommendations) {
    rec.score = Math.round(((rec.score - minScore) / Math.max(maxScore - minScore, 1)) * normalizeMax);
  }

  // 멀티 포지션 또는 고승률이면 1순위만 표시
  const finalRecommendations = (isMultiPosition || isHighWinRate)
    ? recommendations.slice(0, 1)
    : recommendations;

  return {
    currentMainLane,
    currentMainLaneKr: LANE_KR[currentMainLane] ?? currentMainLane,
    isMultiPosition,
    isHighWinRate,
    playstyle,
    recommendations: finalRecommendations,
    totalGames: statsList.length,
    winRate,
  };
}
