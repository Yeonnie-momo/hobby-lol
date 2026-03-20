"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

interface ChampionRec {
  name: string;
  reason: string;
}

interface LaneRecommendation {
  lane: string;
  laneKr: string;
  score: number;
  reasons: string[];
  recommendedChampions: ChampionRec[];
}

interface AnalysisResult {
  gameName: string;
  tagLine: string;
  currentMainLane: string;
  currentMainLaneKr: string;
  playstyle: string[];
  recommendations: LaneRecommendation[];
  totalGames: number;
  winRate: number;
  comment: string;
}

const LANE_ICON: Record<string, string> = {
  TOP: "⚔️",
  JUNGLE: "🌲",
  MIDDLE: "🔮",
  BOTTOM: "🏹",
  UTILITY: "🛡️",
};

const DDRAGON_VERSION = "15.6.1";
const STORAGE_KEY = "lc_recent_searches";
const MAX_RECENT = 5;

function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  const prev = getRecentSearches().filter((q) => q !== query);
  const next = [query, ...prev].slice(0, MAX_RECENT);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

function ChampionImage({ name }: { name: string }) {
  const src = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/champion/${name}.png`;
  return (
    <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0" style={{ border: "2px solid #C89B3C" }}>
      <Image src={src} alt={name} width={48} height={48} className="object-cover" />
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="w-full rounded-full h-2 mt-1" style={{ backgroundColor: "#1e2d4a" }}>
      <div
        className="h-2 rounded-full transition-all duration-700"
        style={{ width: `${score}%`, background: "linear-gradient(to right, #C89B3C, #F0E6D3)" }}
      />
    </div>
  );
}

export default function Home() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  // 드롭다운 바깥 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleAnalyze(query?: string) {
    const trimmed = (query ?? input).trim();
    if (!trimmed) return;

    setInput(trimmed);
    setShowDropdown(false);

    const hashIndex = trimmed.lastIndexOf("#");
    let gameName: string;
    let tagLine: string;

    if (hashIndex > 0) {
      gameName = trimmed.slice(0, hashIndex);
      tagLine = trimmed.slice(hashIndex + 1);
    } else {
      gameName = trimmed;
      tagLine = "KR1";
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(
        `/api/analyze?gameName=${encodeURIComponent(gameName)}&tagLine=${encodeURIComponent(tagLine)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      saveRecentSearch(trimmed);
      setRecentSearches(getRecentSearches());
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다");
    } finally {
      setLoading(false);
    }
  }

  const filteredRecent = recentSearches.filter((q) =>
    input.trim() === "" || q.toLowerCase().includes(input.toLowerCase())
  );

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#0a0e1a" }}>
      {/* 헤더 */}
      <div className="py-4 px-6" style={{ borderBottom: "1px solid #1e2d4a" }}>
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <span className="text-2xl">⚡</span>
          <h1 className="font-bold text-xl tracking-wide" style={{ color: "#C89B3C" }}>
            Lane Changer
          </h1>
          <span className="text-xs ml-2" style={{ color: "#8a9bb5" }}>
            전적 기반 포지션 추천
          </span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* 히어로 */}
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold mb-3" style={{ color: "#F0E6D3" }}>
            새로운 라인을{" "}
            <span style={{ color: "#C89B3C" }}>찾아보세요</span>
          </h2>
          <p className="text-lg" style={{ color: "#8a9bb5" }}>
            최근 전적을 분석해서 당신에게 딱 맞는 포지션과 챔피언을 추천해드려요
          </p>
        </div>

        {/* 검색창 + 드롭다운 */}
        <div className="flex gap-3 mb-10">
          <div className="relative flex-1" ref={wrapperRef}>
            <input
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAnalyze();
                if (e.key === "Escape") setShowDropdown(false);
              }}
              placeholder="소환사명#KR1 (예: Hide on bush#KR1)"
              className="w-full px-5 py-3 rounded-lg text-base outline-none transition-colors"
              style={{
                backgroundColor: "#0f1629",
                border: "1px solid #1e2d4a",
                color: "#F0E6D3",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#C89B3C")}
              onBlur={(e) => (e.target.style.borderColor = "#1e2d4a")}
            />

            {/* 드롭다운 */}
            {showDropdown && filteredRecent.length > 0 && (
              <div
                className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden z-10"
                style={{ backgroundColor: "#0f1629", border: "1px solid #1e2d4a" }}
              >
                <p className="px-4 py-2 text-xs" style={{ color: "#8a9bb5", borderBottom: "1px solid #1e2d4a" }}>
                  최근 검색
                </p>
                {filteredRecent.map((q) => (
                  <button
                    key={q}
                    onMouseDown={() => handleAnalyze(q)}
                    className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors"
                    style={{ color: "#F0E6D3" }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1e2d4a")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <span style={{ color: "#8a9bb5" }}>🕐</span>
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => handleAnalyze()}
            disabled={loading}
            className="px-7 py-3 rounded-lg font-bold text-sm tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#C89B3C", color: "#0a0e1a" }}
          >
            {loading ? "분석 중..." : "분석하기"}
          </button>
        </div>

        {/* 로딩 */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl loading-shimmer" />
            ))}
            <p className="text-center text-sm mt-4" style={{ color: "#8a9bb5" }}>
              최근 20게임을 분석하고 있어요...
            </p>
          </div>
        )}

        {/* 에러 */}
        {error && (
          <div
            className="p-4 rounded-lg text-sm"
            style={{ border: "1px solid #7f1d1d", backgroundColor: "rgba(127,29,29,0.2)", color: "#fca5a5" }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* 결과 */}
        {result && (
          <div className="space-y-6">
            {/* 소환사 요약 카드 */}
            <div className="p-6 rounded-xl" style={{ backgroundColor: "#0f1629", border: "1px solid #1e2d4a" }}>
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-2xl font-bold" style={{ color: "#F0E6D3" }}>
                    {result.gameName}
                    <span className="text-base font-normal ml-1" style={{ color: "#8a9bb5" }}>
                      #{result.tagLine}
                    </span>
                  </h3>
                  <p className="mt-1 text-sm" style={{ color: "#8a9bb5" }}>
                    {result.totalGames}게임 분석 · 승률{" "}
                    <span style={{ color: result.winRate >= 0.5 ? "#60a5fa" : "#f87171" }}>
                      {Math.round(result.winRate * 100)}%
                    </span>
                    {" · 주 포지션 "}
                    <span style={{ color: "#C89B3C" }}>
                      {LANE_ICON[result.currentMainLane]} {result.currentMainLaneKr}
                    </span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {result.playstyle.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 text-xs rounded-full"
                      style={{ border: "1px solid #C89B3C", color: "#C89B3C", backgroundColor: "#1a1400" }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {result.comment && (
                <div
                  className="mt-4 p-4 rounded-lg text-sm leading-relaxed"
                  style={{ backgroundColor: "#080c18", borderLeft: "3px solid #C89B3C", color: "#c8b896" }}
                >
                  {result.comment}
                </div>
              )}
            </div>

            {/* 추천 포지션 */}
            <h3 className="font-bold text-lg" style={{ color: "#C89B3C" }}>
              추천 포지션
            </h3>
            {result.recommendations.map((rec, idx) => (
              <div
                key={rec.lane}
                className="p-5 rounded-xl"
                style={{ backgroundColor: "#0f1629", border: `1px solid ${idx === 0 ? "#C89B3C" : "#1e2d4a"}` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {idx === 0 && (
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded"
                        style={{ backgroundColor: "#C89B3C", color: "#0a0e1a" }}
                      >
                        1순위 추천
                      </span>
                    )}
                    <span className="text-lg font-bold" style={{ color: "#F0E6D3" }}>
                      {LANE_ICON[rec.lane]} {rec.laneKr}
                    </span>
                  </div>
                  <span className="font-bold text-lg" style={{ color: "#C89B3C" }}>
                    {rec.score}점
                  </span>
                </div>

                <ScoreBar score={rec.score} />

                <ul className="mt-3 space-y-1">
                  {rec.reasons.map((r) => (
                    <li key={r} className="text-sm flex items-start gap-2" style={{ color: "#8a9bb5" }}>
                      <span className="mt-0.5" style={{ color: "#C89B3C" }}>•</span>
                      {r}
                    </li>
                  ))}
                </ul>

                <div className="mt-4">
                  <p className="text-xs mb-2" style={{ color: "#8a9bb5" }}>추천 챔피언</p>
                  <div className="space-y-3">
                    {rec.recommendedChampions.map((champ) => (
                      <div key={champ.name} className="flex items-center gap-3">
                        <ChampionImage name={champ.name} />
                        <div>
                          <p className="text-sm font-semibold" style={{ color: "#F0E6D3" }}>{champ.name}</p>
                          <p className="text-xs" style={{ color: "#8a9bb5" }}>{champ.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
