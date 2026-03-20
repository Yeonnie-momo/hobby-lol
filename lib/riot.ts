const RIOT_API_KEY = process.env.RIOT_API_KEY!;

export interface Participant {
  puuid: string;
  summonerName: string;
  riotIdGameName: string;
  riotIdTagline: string;
  championName: string;
  teamPosition: string;
  individualPosition: string;
  kills: number;
  deaths: number;
  assists: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  visionScore: number;
  totalDamageDealtToChampions: number;
  totalDamageTaken: number;
  goldEarned: number;
  timeCCingOthers: number;
  totalHealsOnTeammates: number;
  win: boolean;
  objectivesStolen: number;
  objectivesStolenAssists: number;
  challenges?: {
    killParticipation?: number;
    dragonTakedowns?: number;
    baronTakedowns?: number;
  };
}

export interface Match {
  metadata: { matchId: string };
  info: {
    gameDuration: number;
    participants: Participant[];
  };
}

async function riotFetch(url: string) {
  const res = await fetch(url, {
    headers: { "X-Riot-Token": RIOT_API_KEY },
    next: { revalidate: 300 },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Riot API 오류 (${res.status}): ${text}`);
  }
  return res.json();
}

export async function getAccountByRiotId(gameName: string, tagLine: string) {
  return riotFetch(
    `https://asia.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`
  );
}

export async function getMatchIds(puuid: string, count = 20): Promise<string[]> {
  // 랭크 솔로 큐 먼저 시도
  const ranked = await riotFetch(
    `https://asia.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?count=${count}&queue=420`
  );
  if (ranked.length >= 5) return ranked;

  // 부족하면 일반 게임 포함
  return riotFetch(
    `https://asia.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?count=${count}`
  );
}

export async function getMatch(matchId: string): Promise<Match> {
  return riotFetch(
    `https://asia.api.riotgames.com/lol/match/v5/matches/${matchId}`
  );
}

export async function getLatestDDragonVersion(): Promise<string> {
  const versions = await fetch(
    "https://ddragon.leagueoflegends.com/api/versions.json"
  ).then((r) => r.json());
  return versions[0];
}
