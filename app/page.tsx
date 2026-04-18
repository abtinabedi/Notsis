"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

/* ──────────────────────────────────────────────────────────────
   TYPES & CONSTANTS
────────────────────────────────────────────────────────────── */

type ComponentKey = "vize" | "odev" | "final";

interface GradeComponent {
  key: ComponentKey;
  label: string;
  icon: string;
  weight: number;
  grade: string;
  optional: boolean;
  enabled: boolean;
}

interface LetterGradeInfo {
  letter: string;
  range: string;
  status: "passed" | "conditional" | "failed";
  statusLabel: string;
  cls: "grade-great" | "grade-amber" | "grade-red";
  emoji: string;
}

const LETTER_GRADE_TABLE: Array<{ min: number; max: number } & LetterGradeInfo> = [
  { letter: "AA", range: "90 – 100", min: 90,  max: 100, status: "passed",      statusLabel: "Geçti",         cls: "grade-great", emoji: "🏆" },
  { letter: "BA", range: "85 – 89",  min: 85,  max: 89,  status: "passed",      statusLabel: "Geçti",         cls: "grade-great", emoji: "✅" },
  { letter: "BB", range: "80 – 84",  min: 80,  max: 84,  status: "passed",      statusLabel: "Geçti",         cls: "grade-great", emoji: "✅" },
  { letter: "CB", range: "75 – 79",  min: 75,  max: 79,  status: "passed",      statusLabel: "Geçti",         cls: "grade-great", emoji: "✅" },
  { letter: "CC", range: "70 – 74",  min: 70,  max: 74,  status: "passed",      statusLabel: "Geçti",         cls: "grade-great", emoji: "✅" },
  { letter: "DC", range: "65 – 69",  min: 65,  max: 69,  status: "conditional", statusLabel: "Koşullu Geçti", cls: "grade-amber", emoji: "⚠️" },
  { letter: "DD", range: "60 – 64",  min: 60,  max: 64,  status: "conditional", statusLabel: "Koşullu Geçti", cls: "grade-amber", emoji: "⚠️" },
  { letter: "FD", range: "50 – 59",  min: 50,  max: 59,  status: "failed",      statusLabel: "Kaldı",         cls: "grade-red",   emoji: "❌" },
  { letter: "FF", range: "0 – 49",   min: 0,   max: 49,  status: "failed",      statusLabel: "Kaldı",         cls: "grade-red",   emoji: "❌" },
];

// Group rows for the reference table
const LG_GROUPS = [
  { label: "Geçti", rows: LETTER_GRADE_TABLE.filter((r) => r.status === "passed") },
  { label: "Koşullu Geçti", rows: LETTER_GRADE_TABLE.filter((r) => r.status === "conditional") },
  { label: "Kaldı", rows: LETTER_GRADE_TABLE.filter((r) => r.status === "failed") },
];

function getLetterGrade(score: number): LetterGradeInfo {
  const row = LETTER_GRADE_TABLE.find((r) => score >= r.min && score <= r.max);
  return row ?? LETTER_GRADE_TABLE[LETTER_GRADE_TABLE.length - 1];
}

const INITIAL_COMPONENTS: GradeComponent[] = [
  { key: "vize",  label: "Vize",         icon: "📖", weight: 30, grade: "", optional: false, enabled: true },
  { key: "odev",  label: "Ödev / Proje", icon: "✏️", weight: 30, grade: "", optional: true,  enabled: true },
  { key: "final", label: "Final",        icon: "🎓", weight: 40, grade: "", optional: false, enabled: true },
];

const SEGMENT_COLORS: Record<ComponentKey, string> = {
  vize:  "#8b5cf6",
  odev:  "#06b6d4",
  final: "#f59e0b",
};

function parseGrade(raw: string): number | null {
  const v = parseFloat(raw.replace(",", "."));
  if (isNaN(v)) return null;
  return Math.min(100, Math.max(0, v));
}

function sliderBg(val: number) {
  return `linear-gradient(to right, #7c3aed 0%, #8b5cf6 ${val}%, #27272a ${val}%, #27272a 100%)`;
}

/* ──────────────────────────────────────────────────────────────
   COMPONENT
────────────────────────────────────────────────────────────── */

export default function Home() {
  const [components, setComponents] = useState<GradeComponent[]>(INITIAL_COMPONENTS);
  const [visitorCount, setVisitorCount] = useState<number | null>(null);

  // Bell curve
  const [bellEnabled, setBellEnabled] = useState(false);
  const [classAvg, setClassAvg] = useState("");
  const [bellThreshold, setBellThreshold] = useState<60 | 70>(60);

  // Visitor counter
  useEffect(() => {
    fetch("/api/counter", { method: "POST" })
      .then((r) => r.json())
      .then((d) => setVisitorCount(d.count))
      .catch(() => {});
  }, []);

  /* ── Derived values ── */
  const activeComponents = useMemo(
    () => components.filter((c) => c.enabled),
    [components]
  );

  const totalWeight = useMemo(
    () => activeComponents.reduce((s, c) => s + c.weight, 0),
    [activeComponents]
  );

  const weightOk = totalWeight === 100;

  const rawAverage = useMemo<number | null>(() => {
    if (!weightOk) return null;
    if (activeComponents.some((c) => parseGrade(c.grade) === null)) return null;
    return Number(
      activeComponents
        .reduce((s, c) => s + (parseGrade(c.grade)! * c.weight) / 100, 0)
        .toFixed(2)
    );
  }, [activeComponents, weightOk]);

  const bellInfo = useMemo(() => {
    if (!bellEnabled || rawAverage === null) return null;
    const ca = parseFloat(classAvg);
    if (isNaN(ca) || ca < 0 || ca > 100) return null;
    const correction = ca < bellThreshold ? Number((bellThreshold - ca).toFixed(2)) : 0;
    const adjusted   = Number(Math.min(100, rawAverage + correction).toFixed(2));
    return { correction, adjusted, applied: correction > 0 };
  }, [bellEnabled, rawAverage, classAvg, bellThreshold]);

  const displayScore  = bellInfo ? bellInfo.adjusted : rawAverage;
  const letterInfo    = displayScore !== null ? getLetterGrade(displayScore) : null;

  /* ── Handlers ── */
  const setWeight = useCallback((key: ComponentKey, val: string) => {
    const n = parseInt(val, 10);
    if (isNaN(n)) return;
    setComponents((prev) =>
      prev.map((c) => (c.key === key ? { ...c, weight: Math.min(100, Math.max(0, n)) } : c))
    );
  }, []);

  const setGrade = useCallback((key: ComponentKey, val: string) => {
    setComponents((prev) => prev.map((c) => (c.key === key ? { ...c, grade: val } : c)));
  }, []);

  const toggleComponent = useCallback((key: ComponentKey) => {
    setComponents((prev) =>
      prev.map((c) => (c.key === key ? { ...c, enabled: !c.enabled, grade: "" } : c))
    );
  }, []);

  const handleReset = useCallback(() => {
    setComponents(INITIAL_COMPONENTS);
    setClassAvg("");
    setBellEnabled(false);
    setBellThreshold(60);
  }, []);

  return (
    <main className="page">
      <div className="container">

        {/* ── Header ── */}
        <header className="app-header fade-up-1">
          <div className="app-logo">
            <div className="app-logo-icon" aria-hidden="true">🎯</div>
            <h1 className="app-title">Notsis</h1>
          </div>
          <p className="app-subtitle">
            Ağırlıkları kendin belirle, notları gir — ortalama ve harf notunu anında gör.
          </p>
          {visitorCount !== null && (
            <div className="visitor-chip" aria-live="polite">
              <span aria-hidden="true">👥</span>
              {visitorCount.toLocaleString("tr-TR")} öğrenci kullandı
            </div>
          )}
        </header>

        {/* ── Weight Configuration ── */}
        <section className="card fade-up-2" aria-label="Ağırlık ayarları">
          <p className="card-title">Ağırlıklar</p>

          <div className="weight-bar-preview" aria-hidden="true">
            {activeComponents.map((c) => (
              <div
                key={c.key}
                className="weight-bar-segment"
                style={{ flex: c.weight, background: SEGMENT_COLORS[c.key], minWidth: c.weight > 0 ? "4px" : "0" }}
              />
            ))}
          </div>

          <div className="weight-grid">
            {components.map((comp) => (
              <div key={comp.key} className="weight-row">
                <label
                  className="weight-label"
                  htmlFor={`weight-${comp.key}`}
                  style={{ color: comp.enabled ? "var(--text-1)" : "var(--text-3)" }}
                >
                  <span>{comp.icon}</span>
                  {comp.label}
                </label>

                <div className="weight-input-wrap" style={{ opacity: comp.enabled ? 1 : 0.3 }}>
                  <input
                    id={`weight-${comp.key}`}
                    type="number"
                    min={0}
                    max={100}
                    className="weight-input"
                    value={comp.enabled ? comp.weight : ""}
                    placeholder="—"
                    onChange={(e) => comp.enabled && setWeight(comp.key, e.target.value)}
                    disabled={!comp.enabled}
                    aria-label={`${comp.label} ağırlığı`}
                  />
                  {comp.enabled && <span className="weight-pct-sign">%</span>}
                </div>

                {comp.optional ? (
                  <button
                    className={`toggle-btn ${comp.enabled ? "remove" : "add"}`}
                    onClick={() => toggleComponent(comp.key)}
                    title={comp.enabled ? "Kaldır" : "Ekle"}
                    aria-label={comp.enabled ? `${comp.label} kaldır` : `${comp.label} ekle`}
                  >
                    {comp.enabled ? "✕" : "+"}
                  </button>
                ) : (
                  <div style={{ width: 34 }} />
                )}
              </div>
            ))}
          </div>

          <div className={`weight-total ${weightOk ? "ok" : "err"}`}>
            <span>Toplam Ağırlık</span>
            <span>
              {weightOk ? "✓" : "⚠"} %{totalWeight}
              {!weightOk && (
                <span style={{ fontWeight: 500, marginLeft: "0.25rem" }}>
                  — %{Math.abs(100 - totalWeight)} {100 - totalWeight > 0 ? "eksik" : "fazla"}
                </span>
              )}
            </span>
          </div>
        </section>

        {/* ── Grade Inputs ── */}
        <section className="card fade-up-3" aria-label="Not girişleri">
          <p className="card-title">Notlar</p>
          <div className="grade-grid">
            {activeComponents.map((comp) => {
              const gVal = parseGrade(comp.grade);
              const contribution = gVal !== null ? Number(((gVal * comp.weight) / 100).toFixed(2)) : null;
              const sliderVal = gVal ?? 0;

              return (
                <div key={comp.key} className="grade-row">
                  <div className="grade-row-left">
                    <div className="grade-row-header">
                      <span className="grade-row-name">
                        <span>{comp.icon}</span>
                        {comp.label}
                        <span style={{ fontSize: "0.72rem", color: "var(--text-3)", fontWeight: 500 }}>
                          %{comp.weight}
                        </span>
                      </span>
                      <span className={`grade-contrib ${contribution !== null ? "filled" : ""}`}>
                        {contribution !== null ? `+${contribution}` : "—"}
                      </span>
                    </div>
                    <input
                      id={`slider-${comp.key}`}
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={sliderVal}
                      className="grade-slider"
                      style={{ background: sliderBg(sliderVal) }}
                      onChange={(e) => setGrade(comp.key, e.target.value)}
                      aria-label={`${comp.label} kaydırıcı`}
                    />
                  </div>
                  <input
                    id={`grade-${comp.key}`}
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    placeholder="—"
                    className="grade-number"
                    value={comp.grade}
                    onChange={(e) => setGrade(comp.key, e.target.value)}
                    aria-label={`${comp.label} notu`}
                  />
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Bell Curve ── */}
        <section className="card fade-up-4" aria-label="Çan eğrisi">
          {/* Header row with React-controlled toggle */}
          <div className="bell-header">
            <p className="card-title" style={{ marginBottom: 0 }}>Çan Eğrisi</p>
            <button
              className="bell-switch"
              onClick={() => setBellEnabled((v) => !v)}
              aria-pressed={bellEnabled}
              aria-label="Çan eğrisini aç/kapat"
            >
              <div className={`bell-switch-track ${bellEnabled ? "on" : ""}`}>
                <div className="bell-switch-thumb" />
              </div>
              <span className={`bell-switch-label ${bellEnabled ? "on" : ""}`}>
                {bellEnabled ? "Açık" : "Kapalı"}
              </span>
            </button>
          </div>

          {bellEnabled && (
            <div className="bell-body">
              {/* Class average */}
              <div className="bell-avg-row">
                <div className="bell-avg-info">
                  <p className="bell-avg-title">Sınıf Ortalaması</p>
                  <p className="bell-avg-sub">Hocanın açıkladığı sınıf geneli ortalama</p>
                </div>
                <input
                  id="bell-class-avg"
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  placeholder="—"
                  className="bell-number"
                  value={classAvg}
                  onChange={(e) => setClassAvg(e.target.value)}
                  aria-label="Sınıf ortalaması"
                />
              </div>

              {/* Threshold selector */}
              <div>
                <p className="threshold-label">Çan Uygulama Eşiği</p>
                <div className="threshold-group" role="group" aria-label="Eşik seçimi">
                  {([60, 70] as const).map((t) => (
                    <button
                      key={t}
                      className={`threshold-btn ${bellThreshold === t ? "selected" : ""}`}
                      onClick={() => setBellThreshold(t)}
                      aria-pressed={bellThreshold === t}
                    >
                      <span className="threshold-btn-val">%{t}</span>
                      <span className="threshold-btn-desc">
                        {t === 60 ? "Yaygın uygulama" : "Bazı üniversiteler"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bell result */}
              {rawAverage !== null && bellInfo ? (
                <div className="bell-result">
                  <div className="bell-result-scores">
                    {/* Before */}
                    <div className="bell-score-box">
                      <span className="bell-score-box-label">Ham Ortalama</span>
                      <span className="bell-score-box-val before">{rawAverage.toFixed(2)}</span>
                    </div>

                    {/* Arrow */}
                    <div className={`bell-arrow ${bellInfo.applied ? "active" : ""}`}>
                      {bellInfo.applied ? "→" : "="}
                    </div>

                    {/* After */}
                    <div className="bell-score-box">
                      <span className="bell-score-box-label">Çan Sonrası</span>
                      <span className="bell-score-box-val after">{bellInfo.adjusted.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className={`bell-correction-line ${bellInfo.applied ? "applied" : "no-apply"}`}>
                    {bellInfo.applied
                      ? `+${bellInfo.correction} puan eklendi (sınıf ort. ${parseFloat(classAvg).toFixed(1)} < eşik ${bellThreshold})`
                      : `Sınıf ortalaması ≥ %${bellThreshold} — çan uygulanmadı`}
                  </div>
                </div>
              ) : rawAverage !== null ? (
                <p className="bell-no-data">Sınıf ortalamasını gir.</p>
              ) : (
                <p className="bell-no-data">Tüm notlar girildikten sonra çan sonucu görünür.</p>
              )}
            </div>
          )}
        </section>

        {/* ── Result ── */}
        <section
          className={`result-card fade-up-5 ${letterInfo?.cls ?? ""}`}
          aria-label="Hesaplama sonucu"
          aria-live="polite"
        >
          <p className="result-section-label">Sonuç</p>

          {/* Score + letter chip */}
          <div className="result-main">
            <div className="result-score-col">
              <div className={`result-score ${letterInfo?.cls ?? ""}`}>
                {displayScore !== null ? displayScore.toFixed(2) : "—"}
              </div>
              {bellInfo?.applied && (
                <span className="result-score-hint">Çan uygulandı</span>
              )}
            </div>

            <div className={`letter-chip ${letterInfo ? letterInfo.cls : ""}`}>
              <span className="letter-chip-text">{letterInfo?.letter ?? "?"}</span>
              {letterInfo && (
                <span className="letter-chip-sub">
                  {letterInfo.status === "passed" ? "Geçti" : letterInfo.status === "conditional" ? "Koşullu" : "Kaldı"}
                </span>
              )}
            </div>
          </div>

          {/* Status pill */}
          {letterInfo && (
            <div className={`status-pill ${letterInfo.cls}`}>
              <span>{letterInfo.emoji}</span>
              <span>{letterInfo.statusLabel}</span>
            </div>
          )}

          {/* Progress bar */}
          <div className="result-bar-wrap" aria-hidden="true">
            <div className="result-bar-track">
              <div
                className={`result-bar-fill ${letterInfo?.cls ?? ""}`}
                style={{ width: displayScore !== null ? `${displayScore}%` : "0%" }}
              />
            </div>
          </div>

          {/* Legend */}
          <div className="grade-legend" aria-hidden="true">
            <div className="grade-legend-item"><div className="dot dot-green" />AA–CC Geçti</div>
            <div className="grade-legend-item"><div className="dot dot-amber" />DC–DD Koşullu</div>
            <div className="grade-legend-item"><div className="dot dot-red" />FD–FF Kaldı</div>
          </div>

          {!weightOk && <p className="result-hint">⚠️ Ağırlıkların toplamı %100 olmalı.</p>}
          {weightOk && displayScore === null && !bellEnabled && (
            <p className="result-hint">Tüm notları girdikten sonra sonuç görünür.</p>
          )}
          {weightOk && displayScore === null && bellEnabled && rawAverage === null && (
            <p className="result-hint">Tüm notları gir.</p>
          )}
          {weightOk && displayScore === null && bellEnabled && rawAverage !== null && (
            <p className="result-hint">Sınıf ortalamasını gir.</p>
          )}
        </section>

        {/* ── Contribution breakdown ── */}
        {rawAverage !== null && (
          <section className="card fade-up-6" aria-label="Katkı dağılımı">
            <p className="card-title">Katkı Dağılımı</p>
            <div className="breakdown-grid">
              {activeComponents.map((comp) => {
                const gVal = parseGrade(comp.grade) ?? 0;
                const contribution = Number(((gVal * comp.weight) / 100).toFixed(2));
                return (
                  <div key={comp.key} className="breakdown-row">
                    <span className="breakdown-name">
                      <span>{comp.icon}</span> {comp.label}
                    </span>
                    <div className="breakdown-bar-track" aria-hidden="true">
                      <div
                        className="breakdown-bar-fill"
                        style={{
                          width: `${contribution}%`,
                          background: `linear-gradient(90deg, ${SEGMENT_COLORS[comp.key]}88, ${SEGMENT_COLORS[comp.key]})`,
                        }}
                      />
                    </div>
                    <span className="breakdown-val">{contribution}</span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Letter grade reference ── */}
        <section className="card fade-up-7" aria-label="Harf notu tablosu">
          <p className="card-title">Harf Notu Tablosu</p>
          <div className="lg-list">
            {LG_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="lg-group-label">{group.label}</p>
                {group.rows.map((row) => {
                  const isActive =
                    displayScore !== null &&
                    displayScore >= row.min &&
                    displayScore <= row.max;
                  return (
                    <div key={row.letter} className={`lg-row ${isActive ? "active" : ""}`}>
                      <span className={`lg-letter ${row.cls}`}>{row.letter}</span>
                      <span className="lg-range">{row.range}</span>
                      <span className={`lg-status ${row.cls}`}>
                        {row.emoji} {row.statusLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </section>

        {/* ── Reset ── */}
        <div className="fade-up-8" style={{ display: "flex", justifyContent: "center" }}>
          <button id="btn-reset" className="btn-reset" onClick={handleReset}>
            ↺ Sıfırla
          </button>
        </div>

        <footer className="app-footer">
          Veriler yalnızca bu sekmede tutulur · Sayfa yenilenince sıfırlanır
        </footer>
      </div>
    </main>
  );
}
