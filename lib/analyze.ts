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
  playstyle: string[];
  recommendations: LaneRecommendation[];
  totalGames: number;
  winRate: number;
}

// 포지션별 입문 추천 챔피언 (플레이스타일 태그 포함)
const LANE_CHAMPIONS: Record<string, ChampionRec[]> = {
  TOP: [
    { name: "Garen", reason: "단순한 스킬셋, 높은 생존력으로 탑 입문에 최적" },
    { name: "Malphite", reason: "한타 이니시에이팅이 강력하고 성장이 안정적" },
    { name: "Darius", reason: "강한 라인전과 직관적인 플레이 패턴" },
    { name: "Cho'Gath", reason: "탱커형 챔피언으로 생존 위주 플레이 가능" },
    { name: "Sett", reason: "높은 체력과 단순한 조작으로 라인전 우위" },
  ],
  JUNGLE: [
    { name: "Warwick", reason: "본능적인 사냥 본능, 초보자에게 최적의 정글러" },
    { name: "Amumu", reason: "강력한 CC로 한타 기여도가 높고 조작이 단순" },
    { name: "Vi", reason: "돌진형 플레이어에게 적합한 공격적 정글러" },
    { name: "Hecarim", reason: "빠른 정글 클리어와 이동속도로 갱킹 용이" },
    { name: "Nunu & Willump", reason: "탑 플레이어 감각을 정글에서 활용 가능" },
  ],
  MIDDLE: [
    { name: "Annie", reason: "스턴과 폭딜의 조합, 미드 기본기를 배우기 좋음" },
    { name: "Veigar", reason: "성장형 AP딜러로 장기전에서 강력" },
    { name: "Lux", reason: "안전한 사거리와 강력한 스킬샷으로 입문 용이" },
    { name: "Malzahar", reason: "라인 압박과 억제기 파괴에 특화된 안정적 미드" },
    { name: "Syndra", reason: "높은 폭발 피해로 킬 지향 플레이어에게 적합" },
  ],
  BOTTOM: [
    { name: "Ashe", reason: "느린 속도를 CC로 보완, 원딜 기본기 학습에 최적" },
    { name: "Miss Fortune", reason: "강력한 한타 궁극기와 안정적인 라인전" },
    { name: "Sivir", reason: "스펠 쉴드로 생존하기 쉽고 팀 교전 기여도 높음" },
    { name: "Caitlyn", reason: "긴 사거리로 안전한 라인전, 포킹 플레이에 적합" },
    { name: "Jinx", reason: "스노우볼 후 압도적인 딜, 공격적 플레이어에게 적합" },
  ],
  UTILITY: [
    { name: "Soraka", reason: "글로벌 힐로 팀 기여도 극대화, 서폿 입문 1순위" },
    { name: "Lux", reason: "CC와 딜을 동시에 갖춘 올라운더 서포터" },
    { name: "Blitzcrank", reason: "훅으로 적 포착, 어그레시브 플레이어에게 적합" },
    { name: "Janna", reason: "뛰어난 디스인게이지로 원딜 보호에 특화" },
    { name: "Leona", reason: "강력한 CC로 이니시에이팅, 탱커 경험자에게 적합" },
  ],
};

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
  const currentMainLane = Object.entries(positionCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "UNKNOWN";

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
  if (currentMainLane !== "TOP") {
    let score = 50;
    const reasons: string[] = [];
    if (avgTankiness >= 25000) { score += 15; reasons.push("피해 흡수량이 높아 탑 솔로 라인에 적합"); }
    if (avgCC >= 15) { score += 10; reasons.push("CC 활용도가 높아 탱커/이니시에이터에 유리"); }
    if (csPerMin >= 6) { score += 10; reasons.push("파밍 능력이 탑 솔로 라인에서 안정적으로 발휘될 수 있음"); }
    if (avgKDA >= 2.5) { score += 10; reasons.push("KDA가 좋아 라인전 생존력이 높을 것으로 예상"); }
    if (avgKP < 0.5) { score += 5; reasons.push("라인 고정 플레이 성향이 탑에서 유효"); }
    recommendations.push({ lane: "TOP", laneKr: "탑", score, reasons, recommendedChampions: LANE_CHAMPIONS.TOP.slice(0, 3) });
  }

  // ─── JUNGLE ───
  if (currentMainLane !== "JUNGLE") {
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
    recommendations.push({ lane: "JUNGLE", laneKr: "정글", score, reasons, recommendedChampions: LANE_CHAMPIONS.JUNGLE.slice(0, 3) });
  }

  // ─── MIDDLE ───
  if (currentMainLane !== "MIDDLE") {
    let score = 50;
    const reasons: string[] = [];
    if (avgDamage >= 20000) { score += 15; reasons.push("높은 딜량이 미드의 캐리 역할에 적합"); }
    if (csPerMin >= 6.5) { score += 10; reasons.push("CS 수급 능력이 미드 라인에서 중요한 파밍에 유리"); }
    if (avgKDA >= 3) { score += 10; reasons.push("KDA가 높아 미드 솔로 라인 생존에 유리"); }
    if (avgKP >= 0.55) { score += 10; reasons.push("킬 관여율이 높아 로밍 이후 팀 기여 가능"); }
    if (avgGold >= 12000) { score += 5; reasons.push("골드 효율이 높아 미드 성장곡선에 적합"); }
    recommendations.push({ lane: "MIDDLE", laneKr: "미드", score, reasons, recommendedChampions: LANE_CHAMPIONS.MIDDLE.slice(0, 3) });
  }

  // ─── BOTTOM (ADC) ───
  if (currentMainLane !== "BOTTOM") {
    let score = 50;
    const reasons: string[] = [];
    if (csPerMin >= 7) { score += 15; reasons.push("높은 CS 수급 능력이 원딜의 핵심 역량에 부합"); }
    if (avgDamage >= 18000) { score += 10; reasons.push("꾸준한 딜량이 원딜의 지속 피해에 적합"); }
    if (avgKDA >= 3) { score += 10; reasons.push("생존 능력이 뛰어나 원딜의 포지셔닝에 유리"); }
    if (avgGold >= 13000) { score += 10; reasons.push("골드 효율이 높아 아이템 의존도가 큰 원딜과 궁합 좋음"); }
    if (avgTankiness < 20000) { score += 5; reasons.push("피해를 덜 받는 성향이 원딜 포지셔닝과 일치"); }
    recommendations.push({ lane: "BOTTOM", laneKr: "원딜", score, reasons, recommendedChampions: LANE_CHAMPIONS.BOTTOM.slice(0, 3) });
  }

  // ─── UTILITY (Support) ───
  if (currentMainLane !== "UTILITY") {
    let score = 50;
    const reasons: string[] = [];
    if (avgVision >= 25) { score += 15; reasons.push("시야 점수가 높아 서포터의 와드 관리에 적합"); }
    if (avgKP >= 0.65) { score += 10; reasons.push("팀 교전 참여율이 높아 서포터 역할에 자연스럽게 적응 가능"); }
    if (avgCC >= 20) { score += 10; reasons.push("CC 활용도가 높아 이니시에이터 서포터에 어울림"); }
    if (avgHeal >= 1500) { score += 10; reasons.push("힐/보호 경험이 있어 인챈터 서포터에 적합"); }
    if (avgTankiness >= 22000) { score += 5; reasons.push("피해 흡수 경험이 탱커형 서포터와 궁합 좋음"); }
    recommendations.push({ lane: "UTILITY", laneKr: "서포터", score, reasons, recommendedChampions: LANE_CHAMPIONS.UTILITY.slice(0, 3) });
  }

  // 점수 정규화 (0~100)
  const maxScore = Math.max(...recommendations.map((r) => r.score));
  const minScore = Math.min(...recommendations.map((r) => r.score));
  for (const rec of recommendations) {
    rec.score = Math.round(((rec.score - minScore) / Math.max(maxScore - minScore, 1)) * 100);
  }

  recommendations.sort((a, b) => b.score - a.score);

  return {
    currentMainLane,
    currentMainLaneKr: LANE_KR[currentMainLane] ?? currentMainLane,
    playstyle,
    recommendations,
    totalGames: statsList.length,
    winRate,
  };
}
