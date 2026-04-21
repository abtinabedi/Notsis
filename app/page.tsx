"use client";

import { useState, useCallback, useMemo, useId, useEffect } from "react";

/* ──────────────────────────────────────────────────────────────
   TYPES & CONSTANTS
────────────────────────────────────────────────────────────── */

type Module = "calculator" | "gpa" | "predictor";
type ComponentKey = "vize" | "odev" | "final";

/* ── Letter grade table ── */
interface LetterGradeInfo {
  letter: string;
  range: string;
  min: number;
  max: number;
  gpaPoints: number;
  status: "passed" | "conditional" | "failed";
  statusLabel: string;
  cls: "grade-great" | "grade-amber" | "grade-red";
  emoji: string;
}

const LETTER_GRADE_TABLE: LetterGradeInfo[] = [
  { letter: "AA", range: "90 – 100", min: 90,  max: 100, gpaPoints: 4.00, status: "passed",      statusLabel: "Geçti",         cls: "grade-great", emoji: "🏆" },
  { letter: "BA", range: "85 – 89",  min: 85,  max: 89,  gpaPoints: 3.50, status: "passed",      statusLabel: "Geçti",         cls: "grade-great", emoji: "✅" },
  { letter: "BB", range: "80 – 84",  min: 80,  max: 84,  gpaPoints: 3.00, status: "passed",      statusLabel: "Geçti",         cls: "grade-great", emoji: "✅" },
  { letter: "CB", range: "75 – 79",  min: 75,  max: 79,  gpaPoints: 2.50, status: "passed",      statusLabel: "Geçti",         cls: "grade-great", emoji: "✅" },
  { letter: "CC", range: "70 – 74",  min: 70,  max: 74,  gpaPoints: 2.00, status: "passed",      statusLabel: "Geçti",         cls: "grade-great", emoji: "✅" },
  { letter: "DC", range: "65 – 69",  min: 65,  max: 69,  gpaPoints: 1.50, status: "conditional", statusLabel: "Koşullu Geçti", cls: "grade-amber", emoji: "⚠️" },
  { letter: "DD", range: "60 – 64",  min: 60,  max: 64,  gpaPoints: 1.00, status: "conditional", statusLabel: "Koşullu Geçti", cls: "grade-amber", emoji: "⚠️" },
  { letter: "FD", range: "50 – 59",  min: 50,  max: 59,  gpaPoints: 0.50, status: "failed",      statusLabel: "Kaldı",         cls: "grade-red",   emoji: "❌" },
  { letter: "FF", range: "0 – 49",   min: 0,   max: 49,  gpaPoints: 0.00, status: "failed",      statusLabel: "Kaldı",         cls: "grade-red",   emoji: "❌" },
];

const LG_GROUPS = [
  { label: "Geçti",         rows: LETTER_GRADE_TABLE.filter((r) => r.status === "passed") },
  { label: "Koşullu Geçti", rows: LETTER_GRADE_TABLE.filter((r) => r.status === "conditional") },
  { label: "Kaldı",         rows: LETTER_GRADE_TABLE.filter((r) => r.status === "failed") },
];

function getLetterGrade(score: number): LetterGradeInfo {
  const row = LETTER_GRADE_TABLE.find((r) => score >= r.min && score <= r.max);
  return row ?? LETTER_GRADE_TABLE[LETTER_GRADE_TABLE.length - 1];
}

/* ── Calculator module ── */
interface GradeComponent {
  key: ComponentKey;
  label: string;
  icon: string;
  weight: number;
  grade: string;
  optional: boolean;
  enabled: boolean;
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

function parseNum(raw: string): number | null {
  const v = parseFloat(raw.replace(",", "."));
  if (isNaN(v)) return null;
  return Math.min(100, Math.max(0, v));
}

function sliderBg(val: number) {
  return `linear-gradient(to right, #7c3aed 0%, #8b5cf6 ${val}%, #1a1a28 ${val}%, #1a1a28 100%)`;
}

/* ── GPA module ── */
interface Course {
  id: string;
  name: string;
  credit: string;
  letterGrade: string;
}

const GPA_LETTER_OPTIONS = LETTER_GRADE_TABLE.map((r) => r.letter);

function gpaColorClass(gpa: number): string {
  if (gpa >= 3.0) return "grade-great";
  if (gpa >= 2.0) return "grade-amber";
  return "grade-red";
}

function gpaTextColor(gpa: number): string {
  if (gpa >= 3.0) return "var(--green)";
  if (gpa >= 2.0) return "var(--amber)";
  return "var(--red)";
}

/* ── Predictor module ── */
interface PredComp {
  key: ComponentKey;
  label: string;
  icon: string;
  weight: string;   // string so the input is controlled freely
  grade: string;
  optional: boolean;
  enabled: boolean; // optional comps can be toggled off (no ödev in this course)
  isTarget: boolean; // this is the component we're predicting for
}

function freshPredComps(): PredComp[] {
  return [
    { key: "vize",  label: "Vize",         icon: "📖", weight: "30", grade: "", optional: false, enabled: true, isTarget: false },
    { key: "odev",  label: "Ödev / Proje", icon: "✏️", weight: "30", grade: "", optional: true,  enabled: true, isTarget: false },
    { key: "final", label: "Final",        icon: "🎓", weight: "40", grade: "", optional: false, enabled: true, isTarget: true  },
  ];
}

/* ──────────────────────────────────────────────────────────────
   MAIN COMPONENT
────────────────────────────────────────────────────────────── */

export default function Home() {
  const uid = useId();
  const [activeModule, setActiveModule] = useState<Module>("calculator");
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("notsis-theme");
    const dark = saved ? saved === "dark" : true;
    setIsDark(dark);
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
      localStorage.setItem("notsis-theme", next ? "dark" : "light");
      return next;
    });
  }, []);

  /* ════════════════════════════════════════
     MODULE 1 — Not Hesaplayıcı State
  ════════════════════════════════════════ */
  const [components, setComponents] = useState<GradeComponent[]>(INITIAL_COMPONENTS);
  const [bellEnabled, setBellEnabled] = useState(false);
  const [classAvg, setClassAvg] = useState("");
  const [bellThreshold, setBellThreshold] = useState<60 | 70>(60);

  // Only enabled components participate in the calculation
  const activeComponents = useMemo(() => components.filter((c) => c.enabled), [components]);
  const totalWeight = useMemo(() => activeComponents.reduce((s, c) => s + c.weight, 0), [activeComponents]);
  const weightOk = totalWeight === 100;

  const rawAverage = useMemo<number | null>(() => {
    if (!weightOk) return null;
    if (activeComponents.some((c) => parseNum(c.grade) === null)) return null;
    return Number(
      activeComponents.reduce((s, c) => s + (parseNum(c.grade)! * c.weight) / 100, 0).toFixed(2)
    );
  }, [activeComponents, weightOk]);

  const bellInfo = useMemo(() => {
    if (!bellEnabled || rawAverage === null) return null;
    const ca = parseFloat(classAvg);
    if (isNaN(ca) || ca < 0 || ca > 100) return null;
    const correction = ca < bellThreshold ? Number((bellThreshold - ca).toFixed(2)) : 0;
    const adjusted = Number(Math.min(100, rawAverage + correction).toFixed(2));
    return { correction, adjusted, applied: correction > 0 };
  }, [bellEnabled, rawAverage, classAvg, bellThreshold]);

  const displayScore = bellInfo ? bellInfo.adjusted : rawAverage;
  const letterInfo = displayScore !== null ? getLetterGrade(displayScore) : null;

  const setWeight = useCallback((key: ComponentKey, val: string) => {
    const n = parseInt(val, 10);
    if (isNaN(n)) return;
    setComponents((prev) => prev.map((c) => c.key === key ? { ...c, weight: Math.min(100, Math.max(0, n)) } : c));
  }, []);

  const setGrade = useCallback((key: ComponentKey, val: string) => {
    setComponents((prev) => prev.map((c) => c.key === key ? { ...c, grade: val } : c));
  }, []);

  const toggleComponent = useCallback((key: ComponentKey) => {
    setComponents((prev) => prev.map((c) => c.key === key ? { ...c, enabled: !c.enabled, grade: "" } : c));
  }, []);

  const handleReset = useCallback(() => {
    setComponents(INITIAL_COMPONENTS.map((c) => ({ ...c })));
    setClassAvg("");
    setBellEnabled(false);
    setBellThreshold(60);
  }, []);

  /* ════════════════════════════════════════
     MODULE 2 — GPA State
  ════════════════════════════════════════ */
  const [courses, setCourses] = useState<Course[]>([
    { id: "c1", name: "", credit: "", letterGrade: "CC" },
  ]);

  const addCourse = useCallback(() => {
    setCourses((prev) => [...prev, { id: `c${Date.now()}`, name: "", credit: "", letterGrade: "CC" }]);
  }, []);

  const removeCourse = useCallback((id: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const updateCourse = useCallback((id: string, field: keyof Omit<Course, "id">, value: string) => {
    setCourses((prev) => prev.map((c) => c.id === id ? { ...c, [field]: value } : c));
  }, []);

  const gpaResult = useMemo(() => {
    // Only courses with a valid credit (>0) count
    const valid = courses.filter((c) => {
      const cr = parseFloat(c.credit);
      return !isNaN(cr) && cr > 0 && c.letterGrade;
    });
    if (valid.length === 0) return null;

    const totalCredits = valid.reduce((s, c) => s + parseFloat(c.credit), 0);
    const weightedSum = valid.reduce((s, c) => {
      const gradeRow = LETTER_GRADE_TABLE.find((r) => r.letter === c.letterGrade);
      const pts = gradeRow ? gradeRow.gpaPoints : 0;
      return s + pts * parseFloat(c.credit);
    }, 0);

    const gpa = totalCredits > 0 ? Number((weightedSum / totalCredits).toFixed(2)) : 0;
    return { gpa, totalCredits, courseCount: valid.length };
  }, [courses]);

  /* ════════════════════════════════════════
     MODULE 3 — Prediction State
  ════════════════════════════════════════ */
  const [predComps, setPredComps] = useState<PredComp[]>(freshPredComps);
  const [predBellEnabled, setPredBellEnabled] = useState(false);
  const [predClassAvg, setPredClassAvg] = useState("");
  const [predBellThreshold, setPredBellThreshold] = useState<60 | 70>(60);

  // The component we're predicting for (must be enabled)
  const targetComp = useMemo(() => predComps.find((c) => c.isTarget && c.enabled), [predComps]);

  // Weight validity: only among ENABLED comps (disabled optional ones are excluded)
  const predWeightOk = useMemo(() => {
    const total = predComps
      .filter((c) => c.enabled)
      .reduce((s, c) => {
        const w = parseFloat(c.weight);
        return s + (isNaN(w) ? 0 : w);
      }, 0);
    return Math.abs(total - 100) < 0.01;
  }, [predComps]);

  // Target component's weight (only if enabled)
  const targetWeight = useMemo(() => {
    if (!targetComp) return 0;
    const tw = parseFloat(targetComp.weight);
    return isNaN(tw) ? 0 : tw;
  }, [targetComp]);

  // Weighted sum of all KNOWN (non-target, enabled, grade entered) comps
  const knownWeightedSum = useMemo(() => {
    return predComps
      .filter((c) => c.enabled && !c.isTarget)
      .reduce((s, c) => {
        const g = parseNum(c.grade);
        const w = parseFloat(c.weight);
        // If grade is empty → contributes 0 (user didn't enter it yet → will block below)
        if (g === null || isNaN(w)) return s;
        return s + (g * w) / 100;
      }, 0);
  }, [predComps]);

  // Bell curve correction for predictor: if class avg < threshold, the raw score needed is lower
  const predBellCorrection = useMemo(() => {
    if (!predBellEnabled) return 0;
    const ca = parseFloat(predClassAvg);
    if (isNaN(ca) || ca < 0 || ca > 100) return 0;
    return ca < predBellThreshold ? Number((predBellThreshold - ca).toFixed(2)) : 0;
  }, [predBellEnabled, predClassAvg, predBellThreshold]);

  const predResults = useMemo(() => {
    if (!predWeightOk || targetWeight <= 0 || !targetComp) return [];

    // All enabled non-target comps must have a grade filled in
    const allKnownFilled = predComps
      .filter((c) => c.enabled && !c.isTarget)
      .every((c) => parseNum(c.grade) !== null);

    if (!allKnownFilled) return [];

    return LETTER_GRADE_TABLE.map((row) => {
      /*
       * To reach letter grade `row`, the WEIGHTED average must be >= row.min.
       *
       * If bell is enabled and correction > 0:
       *   adjustedScore = rawScore + correction
       *   We need adjustedScore >= row.min
       *   → rawScore >= row.min - correction
       *
       * rawScore = knownWeightedSum + (neededFinal * targetWeight / 100)
       * neededFinal = (effectiveTarget - knownWeightedSum) / (targetWeight / 100)
       */
      const effectiveTarget = row.min - predBellCorrection;
      const needed = (effectiveTarget - knownWeightedSum) / (targetWeight / 100);
      // Round UP to 1 decimal to ensure the threshold is met
      const neededRounded = Math.ceil(needed * 10) / 10;
      const impossible = neededRounded > 100;
      const alreadyMet = neededRounded <= 0; // even scoring 0 achieves this grade

      let statusLabel: string;
      let statusCls: string;
      if (impossible)     { statusLabel = "İmkansız";         statusCls = "no"; }
      else if (alreadyMet) { statusLabel = "Zaten karşılandı"; statusCls = "ok"; }
      else if (neededRounded >= 85) { statusLabel = "Zor";    statusCls = "hard"; }
      else if (neededRounded >= 65) { statusLabel = "Mümkün"; statusCls = "warning"; }
      else                           { statusLabel = "Kolay";  statusCls = "ok"; }

      let neededColor = "";
      if (!impossible && !alreadyMet) {
        if (neededRounded < 65)      neededColor = "green";
        else if (neededRounded < 85) neededColor = "amber";
        else                          neededColor = "red";
      }

      return {
        ...row,
        neededRaw: Math.max(0, neededRounded),
        impossible,
        alreadyMet,
        statusLabel,
        statusCls,
        neededColor,
        displayNeeded: impossible
          ? "—"
          : alreadyMet
          ? "0.0"
          : neededRounded.toFixed(1),
      };
    });
  }, [predWeightOk, targetWeight, targetComp, predComps, knownWeightedSum, predBellCorrection]);

  // Update any field on a predictor component
  const updatePredComp = useCallback((key: ComponentKey, updates: Partial<PredComp>) => {
    setPredComps((prev) => prev.map((c) => c.key === key ? { ...c, ...updates } : c));
  }, []);

  // Toggle optional comp in predictor (if it becomes disabled, it can't be the target)
  const togglePredComp = useCallback((key: ComponentKey) => {
    setPredComps((prev) => {
      const comp = prev.find((c) => c.key === key);
      if (!comp || !comp.optional) return prev;
      const nowEnabled = !comp.enabled;
      // If we're disabling the current target, assign target to "final" by default
      return prev.map((c) => {
        if (c.key === key) {
          return { ...c, enabled: nowEnabled, grade: "", isTarget: false };
        }
        // If the toggled comp was the target and we disabled it, make "final" the new target
        if (!nowEnabled && comp.isTarget && c.key === "final") {
          return { ...c, isTarget: true, grade: "" };
        }
        return c;
      });
    });
  }, []);

  // Make a component the prediction target
  const setPredTarget = useCallback((key: ComponentKey) => {
    setPredComps((prev) => prev.map((c) => ({
      ...c,
      isTarget: c.key === key,
      // Enable the component being set as target (could have been disabled previously if optional)
      enabled: c.key === key ? true : c.enabled,
      // Clear grade on the new target; preserve grades on others
      grade: c.key === key ? "" : c.grade,
    })));
  }, []);

  const resetPredictor = useCallback(() => {
    setPredComps(freshPredComps());
    setPredBellEnabled(false);
    setPredClassAvg("");
    setPredBellThreshold(60);
  }, []);

  /* ════════════════════════════════════════
     NAV CONFIG
  ════════════════════════════════════════ */
  const NAV_ITEMS: Array<{ key: Module; label: string; icon: string; badge?: string }> = [
    { key: "calculator", label: "Not Hesaplayıcı", icon: "📊" },
    { key: "gpa",        label: "GPA Hesaplayıcı", icon: "🎓", badge: "Yeni" },
    { key: "predictor",  label: "Not Tahmini",     icon: "🔮", badge: "Yeni" },
  ];

  const currentNav = NAV_ITEMS.find((n) => n.key === activeModule)!;

  /* ════════════════════════════════════════
     RENDER
  ════════════════════════════════════════ */
  return (
    <div className="dashboard">

      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon" aria-hidden="true">🎯</div>
          <span className="sidebar-logo-name">Notsis</span>
          <span className="sidebar-logo-tag">v4</span>
        </div>

        <nav className="sidebar-nav" aria-label="Modül navigasyonu">
          <p className="nav-section-label">Araçlar</p>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              id={`nav-${item.key}`}
              className={`nav-item ${activeModule === item.key ? "active" : ""}`}
              onClick={() => setActiveModule(item.key)}
              aria-current={activeModule === item.key ? "page" : undefined}
            >
              <div className="nav-item-icon">{item.icon}</div>
              <span className="nav-item-label">{item.label}</span>
              {item.badge && <span className="nav-item-badge">{item.badge}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          Veriler yalnızca bu sekmede tutulur<br />
          Sayfa yenilenince sıfırlanır
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="main-content">

        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <span className="topbar-breadcrumb-root">Notsis</span>
            <span className="topbar-breadcrumb-sep">/</span>
            <span className="topbar-breadcrumb-page">{currentNav.label}</span>
          </div>
          <div className="topbar-right">
            <span className="topbar-badge">
              <span className="topbar-badge-dot" aria-hidden="true" />
              Çevrimiçi
            </span>
            <button
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={isDark ? "Açık moda geç" : "Koyu moda geç"}
              title={isDark ? "Açık mod" : "Koyu mod"}
            >
              {isDark ? "☀️" : "🌙"}
            </button>
          </div>
        </header>

        {/* ════════════════════════════════════
            MODULE 1 — Not Hesaplayıcı
        ════════════════════════════════════ */}
        {activeModule === "calculator" && (
          <main className="page-body" aria-label="Not Hesaplayıcı">
            <div className="page-header fade-up-1">
              <h1 className="page-title">Not Hesaplayıcı</h1>
              <p className="page-subtitle">Ağırlıkları belirle, notları gir — ortalama ve harf notunu anında hesapla.</p>
            </div>

            {/* Ağırlıklar */}
            <section className="card fade-up-2" aria-label="Ağırlık ayarları">
              <div className="card-header">
                <div className="card-header-left">
                  <div className="card-icon">⚖️</div>
                  <div>
                    <p className="card-title">Ağırlıklar</p>
                    <p className="card-desc">Her bileşenin yüzde ağırlığı — toplam %100 olmalı</p>
                  </div>
                </div>
              </div>
              <div className="card-body">
                {/* Mini bar preview */}
                <div className="weight-bar" aria-hidden="true">
                  {activeComponents.map((c) => (
                    <div
                      key={c.key}
                      className="weight-bar-seg"
                      style={{ flex: c.weight, background: SEGMENT_COLORS[c.key], minWidth: c.weight > 0 ? "4px" : "0" }}
                    />
                  ))}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  {components.map((comp) => (
                    <div key={comp.key} className="weight-row">
                      <label
                        htmlFor={`${uid}-weight-${comp.key}`}
                        className="weight-row-label"
                        style={{ color: comp.enabled ? "var(--text-1)" : "var(--text-3)" }}
                      >
                        <span>{comp.icon}</span>
                        {comp.label}
                      </label>
                      <div className="weight-input-wrap" style={{ opacity: comp.enabled ? 1 : 0.3 }}>
                        <input
                          id={`${uid}-weight-${comp.key}`}
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
                        {comp.enabled && <span className="weight-pct">%</span>}
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
                        <div style={{ width: 30 }} />
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
              </div>
            </section>

            {/* Not girişleri */}
            <section className="card fade-up-3" aria-label="Not girişleri">
              <div className="card-header">
                <div className="card-header-left">
                  <div className="card-icon">✏️</div>
                  <div>
                    <p className="card-title">Notlar</p>
                    <p className="card-desc">Slider veya sayı alanını kullan</p>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="grade-rows">
                  {activeComponents.map((comp) => {
                    const gVal = parseNum(comp.grade);
                    const contribution = gVal !== null ? Number(((gVal * comp.weight) / 100).toFixed(2)) : null;
                    const sliderVal = gVal ?? 0;
                    return (
                      <div key={comp.key} className="grade-row">
                        <div className="grade-row-left">
                          <div className="grade-row-header">
                            <span className="grade-row-name">
                              <span>{comp.icon}</span>
                              {comp.label}
                              <span style={{ fontSize: "0.7rem", color: "var(--text-3)" }}>%{comp.weight}</span>
                            </span>
                            <span className={`grade-contrib ${contribution !== null ? "filled" : ""}`}>
                              {contribution !== null ? `+${contribution}` : "—"}
                            </span>
                          </div>
                          <input
                            id={`${uid}-slider-${comp.key}`}
                            type="range"
                            min={0}
                            max={100}
                            step={1}
                            value={sliderVal}
                            className="grade-slider-wrap"
                            style={{ background: sliderBg(sliderVal) }}
                            onChange={(e) => setGrade(comp.key, e.target.value)}
                            aria-label={`${comp.label} kaydırıcı`}
                          />
                        </div>
                        <input
                          id={`${uid}-grade-${comp.key}`}
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
              </div>
            </section>

            {/* Çan eğrisi */}
            <section className="card fade-up-4" aria-label="Çan eğrisi">
              <div className="card-header">
                <div className="card-header-left">
                  <div className="card-icon cyan">📈</div>
                  <div>
                    <p className="card-title">Çan Eğrisi</p>
                    <p className="card-desc">Sınıf ort. düşükse puan düzeltmesi uygulanır</p>
                  </div>
                </div>
                <button
                  className="switch-btn"
                  onClick={() => setBellEnabled((v) => !v)}
                  aria-pressed={bellEnabled}
                  aria-label="Çan eğrisini aç/kapat"
                >
                  <div className={`switch-track ${bellEnabled ? "on" : ""}`}>
                    <div className="switch-thumb" />
                  </div>
                  <span className={`switch-label ${bellEnabled ? "on" : ""}`}>
                    {bellEnabled ? "Açık" : "Kapalı"}
                  </span>
                </button>
              </div>

              {bellEnabled && (
                <div className="card-body">
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                    <div className="bell-avg-row">
                      <div className="bell-avg-info">
                        <p className="bell-avg-title">Sınıf Ortalaması</p>
                        <p className="bell-avg-sub">Hocanın açıkladığı sınıf geneli ortalama</p>
                      </div>
                      <input
                        id={`${uid}-bell-avg`}
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        placeholder="—"
                        className="grade-number"
                        style={{ width: 80 }}
                        value={classAvg}
                        onChange={(e) => setClassAvg(e.target.value)}
                        aria-label="Sınıf ortalaması"
                      />
                    </div>

                    <div>
                      <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
                        Çan Uygulama Eşiği
                      </p>
                      <div className="seg-group">
                        {([60, 70] as const).map((t) => (
                          <button
                            key={t}
                            id={`${uid}-threshold-${t}`}
                            className={`seg-btn ${bellThreshold === t ? "selected" : ""}`}
                            onClick={() => setBellThreshold(t)}
                            aria-pressed={bellThreshold === t}
                          >
                            <span className="seg-btn-val">%{t}</span>
                            <span className="seg-btn-desc">{t === 60 ? "Yaygın uygulama" : "Bazı üniversiteler"}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {rawAverage !== null && bellInfo ? (
                      <div className="bell-result">
                        <div className="bell-result-scores">
                          <div className="bell-score-box">
                            <span className="bell-score-box-label">Ham Ortalama</span>
                            <span className="bell-score-box-val before">{rawAverage.toFixed(2)}</span>
                          </div>
                          <div className={`bell-arrow ${bellInfo.applied ? "active" : ""}`}>
                            {bellInfo.applied ? "→" : "="}
                          </div>
                          <div className="bell-score-box">
                            <span className="bell-score-box-label">Çan Sonrası</span>
                            <span className="bell-score-box-val after">{bellInfo.adjusted.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className={`bell-correction-line ${bellInfo.applied ? "applied" : "no-apply"}`}>
                          {bellInfo.applied
                            ? `+${bellInfo.correction} puan eklendi (sınıf ort. ${parseFloat(classAvg).toFixed(1)} < eşik %${bellThreshold})`
                            : `Sınıf ortalaması ≥ %${bellThreshold} — çan uygulanmadı`}
                        </div>
                      </div>
                    ) : rawAverage !== null ? (
                      <p className="bell-no-data">Sınıf ortalamasını gir.</p>
                    ) : (
                      <p className="bell-no-data">Tüm notlar girildikten sonra çan sonucu görünür.</p>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Sonuç */}
            <section
              className={`result-card fade-up-5 ${letterInfo?.cls ?? ""}`}
              aria-label="Hesaplama sonucu"
              aria-live="polite"
            >
              <p className="result-section-label">Sonuç</p>
              <div className="result-main">
                <div className="result-score-col">
                  <div className={`result-score ${letterInfo?.cls ?? ""}`}>
                    {displayScore !== null ? displayScore.toFixed(2) : "—"}
                  </div>
                  {bellInfo?.applied && <span className="result-score-hint">Çan uygulandı</span>}
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

              {letterInfo && (
                <div className={`status-pill ${letterInfo.cls}`}>
                  <span>{letterInfo.emoji}</span>
                  <span>{letterInfo.statusLabel}</span>
                </div>
              )}

              <div className="result-bar-wrap" aria-hidden="true">
                <div className="result-bar-track">
                  <div
                    className={`result-bar-fill ${letterInfo?.cls ?? ""}`}
                    style={{ width: displayScore !== null ? `${displayScore}%` : "0%" }}
                  />
                </div>
              </div>

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

            {/* Katkı dağılımı — yalnızca hesaplandığında göster */}
            {rawAverage !== null && (
              <section className="card fade-up-6" aria-label="Katkı dağılımı">
                <div className="card-header">
                  <div className="card-header-left">
                    <div className="card-icon blue">📉</div>
                    <div>
                      <p className="card-title">Katkı Dağılımı</p>
                      <p className="card-desc">Her bileşenin toplam ortalamaya katkısı</p>
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  <div className="breakdown-rows">
                    {activeComponents.map((comp) => {
                      const gVal = parseNum(comp.grade) ?? 0;
                      const contribution = Number(((gVal * comp.weight) / 100).toFixed(2));
                      return (
                        <div key={comp.key} className="breakdown-row">
                          <span className="breakdown-name"><span>{comp.icon}</span> {comp.label}</span>
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
                </div>
              </section>
            )}

            {/* Harf notu tablosu */}
            <section className="card fade-up-7" aria-label="Harf notu tablosu">
              <div className="card-header">
                <div className="card-header-left">
                  <div className="card-icon green">📋</div>
                  <div>
                    <p className="card-title">Harf Notu Tablosu</p>
                    <p className="card-desc">Aktif sonucun satırı vurgulanır</p>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="lg-list">
                  {LG_GROUPS.map((group) => (
                    <div key={group.label}>
                      <p className="lg-group-label">{group.label}</p>
                      {group.rows.map((row) => {
                        const isActive = displayScore !== null && displayScore >= row.min && displayScore <= row.max;
                        return (
                          <div key={row.letter} className={`lg-row ${isActive ? "active" : ""}`}>
                            <span className={`lg-letter ${row.cls}`}>{row.letter}</span>
                            <span className="lg-range">{row.range}</span>
                            <span className={`lg-status ${row.cls}`}>{row.emoji} {row.statusLabel}</span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <div className="fade-up-8" style={{ display: "flex", justifyContent: "center" }}>
              <button id="btn-reset-calc" className="btn-reset" onClick={handleReset}>↺ Sıfırla</button>
            </div>
          </main>
        )}

        {/* ════════════════════════════════════
            MODULE 2 — GPA Hesaplayıcı
        ════════════════════════════════════ */}
        {activeModule === "gpa" && (
          <main className="page-body" aria-label="GPA Hesaplayıcı">
            <div className="page-header fade-up-1">
              <h1 className="page-title">GPA Hesaplayıcı</h1>
              <p className="page-subtitle">Dönem derslerini ekle, kredi ve harf notunu gir — dönem GPA'sı hesaplansın.</p>
            </div>

            {/* GPA Sonuç */}
            {gpaResult ? (
              <section
                className={`result-card fade-up-2 ${gpaColorClass(gpaResult.gpa)}`}
                aria-label="GPA sonucu"
                aria-live="polite"
              >
                <p className="result-section-label">Dönem GPA&apos;sı</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                  <span
                    style={{
                      fontSize: "clamp(3rem, 10vw, 4.5rem)",
                      fontWeight: 900,
                      letterSpacing: "-0.05em",
                      lineHeight: 1,
                      fontVariantNumeric: "tabular-nums",
                      color: gpaTextColor(gpaResult.gpa),
                      transition: "color 0.4s",
                    }}
                  >
                    {gpaResult.gpa.toFixed(2)}
                  </span>
                  <span style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-3)" }}>/ 4.00</span>
                </div>

                <div className="result-bar-wrap" aria-hidden="true">
                  <div className="result-bar-track">
                    <div
                      className={`result-bar-fill ${gpaColorClass(gpaResult.gpa)}`}
                      style={{ width: `${(gpaResult.gpa / 4) * 100}%` }}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", gap: "2rem" }}>
                  <div style={{ textAlign: "center" }}>
                    <p style={{ fontSize: "0.575rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)" }}>Toplam Kredi</p>
                    <p style={{ fontSize: "1.375rem", fontWeight: 900, color: "var(--text-1)" }}>{gpaResult.totalCredits}</p>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <p style={{ fontSize: "0.575rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-3)" }}>Ders Sayısı</p>
                    <p style={{ fontSize: "1.375rem", fontWeight: 900, color: "var(--text-1)" }}>{gpaResult.courseCount}</p>
                  </div>
                </div>
              </section>
            ) : (
              <section className="card fade-up-2" aria-label="GPA bekleniyor">
                <div className="empty-state">
                  <div className="empty-state-icon">🎓</div>
                  <p>En az bir ders ekleyip kredi ve harf notu gir.</p>
                </div>
              </section>
            )}

            {/* Ders listesi */}
            <section className="card fade-up-3" aria-label="Ders listesi">
              <div className="card-header">
                <div className="card-header-left">
                  <div className="card-icon">📚</div>
                  <div>
                    <p className="card-title">Dersler</p>
                    <p className="card-desc">{courses.length} ders eklendi — sadece kredisi girilmiş dersler hesaba katılır</p>
                  </div>
                </div>
                <button id="btn-add-course" className="btn btn-primary btn-sm" onClick={addCourse}>
                  + Ders Ekle
                </button>
              </div>
              <div className="card-body">
                {courses.length > 0 && (
                  <div className="course-header-row" style={{ marginBottom: "0.375rem" }}>
                    <span className="course-header-label">Ders Adı</span>
                    <span className="course-header-label" style={{ textAlign: "center" }}>Kredi</span>
                    <span className="course-header-label" style={{ textAlign: "center" }}>Harf Notu</span>
                    <span />
                  </div>
                )}
                <div className="course-list">
                  {courses.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">📭</div>
                      <p>Ders yok. "Ders Ekle" butonuna tıkla.</p>
                    </div>
                  ) : (
                    courses.map((course, i) => (
                      <div key={course.id} className="course-row">
                        <input
                          id={`${uid}-course-name-${course.id}`}
                          type="text"
                          className="course-input"
                          placeholder={`Ders ${i + 1}`}
                          value={course.name}
                          onChange={(e) => updateCourse(course.id, "name", e.target.value)}
                          aria-label={`${i + 1}. ders adı`}
                        />
                        <input
                          id={`${uid}-course-credit-${course.id}`}
                          type="number"
                          min={1}
                          max={10}
                          step={1}
                          className="course-credit"
                          placeholder="—"
                          value={course.credit}
                          onChange={(e) => updateCourse(course.id, "credit", e.target.value)}
                          aria-label={`${i + 1}. ders kredisi`}
                        />
                        <select
                          id={`${uid}-course-grade-${course.id}`}
                          className="course-grade-select"
                          value={course.letterGrade}
                          onChange={(e) => updateCourse(course.id, "letterGrade", e.target.value)}
                          aria-label={`${i + 1}. ders harf notu`}
                        >
                          {GPA_LETTER_OPTIONS.map((l) => {
                            const row = LETTER_GRADE_TABLE.find((r) => r.letter === l)!;
                            return (
                              <option key={l} value={l}>
                                {l} ({row.gpaPoints.toFixed(2)})
                              </option>
                            );
                          })}
                        </select>
                        <button
                          className="toggle-btn remove"
                          onClick={() => removeCourse(course.id)}
                          aria-label={`${i + 1}. dersi kaldır`}
                          title="Dersi kaldır"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            {/* GPA katsayı tablosu */}
            <section className="card fade-up-4" aria-label="GPA katsayı tablosu">
              <div className="card-header">
                <div className="card-header-left">
                  <div className="card-icon green">📋</div>
                  <div>
                    <p className="card-title">Harf → GPA Katsayı Tablosu</p>
                    <p className="card-desc">Kullandığın harf notları vurgulanır</p>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div className="lg-list">
                  {LG_GROUPS.map((group) => (
                    <div key={group.label}>
                      <p className="lg-group-label">{group.label}</p>
                      {group.rows.map((row) => {
                        // Highlight if any course with a valid credit uses this letter
                        const used = courses.some(
                          (c) => c.letterGrade === row.letter && parseFloat(c.credit) > 0
                        );
                        return (
                          <div key={row.letter} className={`lg-row ${used ? "active" : ""}`}>
                            <span className={`lg-letter ${row.cls}`}>{row.letter}</span>
                            <span className="lg-range">{row.range} puan</span>
                            <span className={`lg-status ${row.cls}`}>
                              {row.gpaPoints.toFixed(2)} katsayı
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <div className="fade-up-5" style={{ display: "flex", justifyContent: "center" }}>
              <button
                id="btn-reset-gpa"
                className="btn-reset"
                onClick={() => setCourses([{ id: "c1", name: "", credit: "", letterGrade: "CC" }])}
              >
                ↺ Sıfırla
              </button>
            </div>
          </main>
        )}

        {/* ════════════════════════════════════
            MODULE 3 — Harf Notu Tahmini
        ════════════════════════════════════ */}
        {activeModule === "predictor" && (
          <main className="page-body" aria-label="Not Tahmini">
            <div className="page-header fade-up-1">
              <h1 className="page-title">Harf Notu Tahmini</h1>
              <p className="page-subtitle">
                Bildiğin notları gir, &quot;Hedef&quot; olarak seçtiğin sınav için ne almak gerektiğini gör.
              </p>
            </div>

            {/* Bileşen girişleri */}
            <section className="card fade-up-2" aria-label="Not bileşenleri">
              <div className="card-header">
                <div className="card-header-left">
                  <div className="card-icon">🎯</div>
                  <div>
                    <p className="card-title">Not Bileşenleri</p>
                    <p className="card-desc">
                      <strong style={{ color: "var(--accent-3)" }}>Hedef</strong> = henüz almadığın / tahmin yapmak istediğin sınav
                    </p>
                  </div>
                </div>
              </div>
              <div className="card-body">
                <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                  {predComps.map((comp) => {
                    const isDisabledOptional = comp.optional && !comp.enabled;
                    return (
                      <div
                        key={comp.key}
                        className="pred-comp-row"
                        style={{ opacity: isDisabledOptional ? 0.4 : 1 }}
                      >
                        {/* Left: label + description */}
                        <div className="pred-comp-info">
                          <span className="pred-comp-name">
                            <span>{comp.icon}</span>
                            {comp.label}
                            {comp.isTarget && (
                              <span style={{ fontSize: "0.575rem", fontWeight: 700, padding: "0.1rem 0.35rem", borderRadius: 4, background: "var(--accent-dim)", color: "var(--accent-3)", border: "1px solid var(--accent-mid)" }}>
                                Hedef
                              </span>
                            )}
                            {isDisabledOptional && (
                              <span style={{ fontSize: "0.575rem", fontWeight: 700, padding: "0.1rem 0.35rem", borderRadius: 4, background: "var(--bg-hover)", color: "var(--text-3)", border: "1px solid var(--border-mid)" }}>
                                Devre Dışı
                              </span>
                            )}
                          </span>
                          <span className="pred-comp-sub">
                            {isDisabledOptional
                              ? "Bu ders bileşeni yok"
                              : comp.isTarget
                              ? "Tahmin hesaplanacak"
                              : "Aldığın notu gir"}
                          </span>
                        </div>

                        {/* Right: weight + grade + action buttons */}
                        <div className="pred-comp-controls">
                          {/* Ağırlık input */}
                          <div className="pred-weight-wrap">
                            <input
                              id={`${uid}-pred-weight-${comp.key}`}
                              type="number"
                              min={0}
                              max={100}
                              className="pred-weight"
                              value={comp.enabled ? comp.weight : ""}
                              placeholder="—"
                              disabled={isDisabledOptional}
                              onChange={(e) => updatePredComp(comp.key, { weight: e.target.value })}
                              aria-label={`${comp.label} ağırlığı`}
                            />
                            {comp.enabled && <span className="pred-weight-pct">%</span>}
                          </div>

                          {/* Not input — disabled for target (we're calculating this) */}
                          <input
                            id={`${uid}-pred-grade-${comp.key}`}
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            placeholder={comp.isTarget ? "?" : "—"}
                            className="pred-number"
                            value={comp.grade}
                            disabled={comp.isTarget || isDisabledOptional}
                            onChange={(e) => updatePredComp(comp.key, { grade: e.target.value })}
                            aria-label={`${comp.label} notu`}
                          />

                          {/* Hedef yap — only for non-target, enabled comps */}
                          {!comp.isTarget && comp.enabled && (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ whiteSpace: "nowrap", fontSize: "0.6rem", padding: "0.275rem 0.45rem" }}
                              onClick={() => setPredTarget(comp.key)}
                              aria-label={`${comp.label}'i hedef yap`}
                            >
                              Hedef yap
                            </button>
                          )}
                          {comp.isTarget && <div style={{ width: 58 }} />}

                          {/* Optional toggle */}
                          {comp.optional && (
                            <button
                              className={`toggle-btn ${comp.enabled ? "remove" : "add"}`}
                              onClick={() => togglePredComp(comp.key)}
                              title={comp.enabled ? "Bu bileşeni dersten kaldır" : "Bu bileşeni ekle"}
                              aria-label={comp.enabled ? `${comp.label} kaldır` : `${comp.label} ekle`}
                            >
                              {comp.enabled ? "✕" : "+"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Ağırlık toplamı uyarısı */}
                {(() => {
                  const enabledTotal = predComps
                    .filter((c) => c.enabled)
                    .reduce((s, c) => { const w = parseFloat(c.weight); return s + (isNaN(w) ? 0 : w); }, 0);
                  return (
                    <div className={`weight-total ${predWeightOk ? "ok" : "err"}`} style={{ marginTop: "0.75rem" }}>
                      <span>Aktif bileşenlerin toplam ağırlığı</span>
                      <span>
                        {predWeightOk ? "✓" : "⚠"} %{Math.round(enabledTotal)}
                        {!predWeightOk && (
                          <span style={{ fontWeight: 500, marginLeft: "0.25rem" }}>
                            — %{Math.abs(Math.round(100 - enabledTotal))} {100 - enabledTotal > 0 ? "eksik" : "fazla"}
                          </span>
                        )}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </section>

            {/* Çan eğrisi (predictor) */}
            <section className="card fade-up-3" aria-label="Çan eğrisi tahmini için">
              <div className="card-header">
                <div className="card-header-left">
                  <div className="card-icon cyan">📈</div>
                  <div>
                    <p className="card-title">Çan Eğrisi</p>
                    <p className="card-desc">Çan uygulanacaksa, hedef için gereken not düşer</p>
                  </div>
                </div>
                <button
                  className="switch-btn"
                  onClick={() => setPredBellEnabled((v) => !v)}
                  aria-pressed={predBellEnabled}
                  aria-label="Tahmin çan eğrisini aç/kapat"
                >
                  <div className={`switch-track ${predBellEnabled ? "on" : ""}`}>
                    <div className="switch-thumb" />
                  </div>
                  <span className={`switch-label ${predBellEnabled ? "on" : ""}`}>
                    {predBellEnabled ? "Açık" : "Kapalı"}
                  </span>
                </button>
              </div>

              {predBellEnabled && (
                <div className="card-body">
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                    <div className="bell-avg-row">
                      <div className="bell-avg-info">
                        <p className="bell-avg-title">Sınıf Ortalaması</p>
                        <p className="bell-avg-sub">Hocadan öğrendiğin veya tahmin ettiğin ortalama</p>
                      </div>
                      <input
                        id={`${uid}-pred-bell-avg`}
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        placeholder="—"
                        className="grade-number"
                        style={{ width: 80 }}
                        value={predClassAvg}
                        onChange={(e) => setPredClassAvg(e.target.value)}
                        aria-label="Tahmini sınıf ortalaması"
                      />
                    </div>
                    <div>
                      <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
                        Çan Uygulama Eşiği
                      </p>
                      <div className="seg-group">
                        {([60, 70] as const).map((t) => (
                          <button
                            key={t}
                            id={`${uid}-pred-threshold-${t}`}
                            className={`seg-btn ${predBellThreshold === t ? "selected" : ""}`}
                            onClick={() => setPredBellThreshold(t)}
                            aria-pressed={predBellThreshold === t}
                          >
                            <span className="seg-btn-val">%{t}</span>
                            <span className="seg-btn-desc">{t === 60 ? "Yaygın uygulama" : "Bazı üniversiteler"}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    {predBellCorrection > 0 && (
                      <p className="bell-note">
                        ✨ Çan uygulanırsa +{predBellCorrection} puan eklenir — eşikler buna göre düşürüldü.
                      </p>
                    )}
                    {predBellEnabled && predBellCorrection === 0 && predClassAvg !== "" && (
                      <p className="bell-no-data">Sınıf ortalaması eşiğin üstünde — çan uygulanmaz.</p>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Tahmin Sonuçları */}
            <section className="card fade-up-4" aria-label="Tahmin sonuçları">
              <div className="card-header">
                <div className="card-header-left">
                  <div className="card-icon amber">🔮</div>
                  <div>
                    <p className="card-title">Hedef Harf Notları</p>
                    <p className="card-desc">
                      {targetComp
                        ? `${targetComp.label} sınavında ne alman gerekiyor?`
                        : "Bir bileşeni hedef olarak seç"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="card-body">
                {predResults.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">🔮</div>
                    <p>
                      {!predWeightOk
                        ? "Aktif bileşenlerin ağırlıkları toplamı %100 olmalı."
                        : !targetComp
                        ? "Bir bileşeni hedef seç."
                        : "Bilinen notları girdikten sonra tahminler görünür."}
                    </p>
                  </div>
                ) : (
                  <div className="pred-results">
                    {predResults.map((row) => (
                      <div
                        key={row.letter}
                        className={`pred-result-row ${row.impossible ? "impossible" : "achievable"}`}
                      >
                        <span className={`pred-letter ${row.cls}`}>{row.letter}</span>
                        <div className="pred-needed-wrap">
                          <span className="pred-needed-label">
                            Gerekli {targetComp?.label ?? "sınav"} notu
                          </span>
                          <span className={`pred-needed-val ${row.impossible ? "" : row.neededColor}`}>
                            {row.displayNeeded}
                            {!row.impossible && !row.alreadyMet && " puan"}
                            {row.alreadyMet && " (zaten karşılandı)"}
                          </span>
                        </div>
                        <span className={`pred-status ${row.statusCls}`}>
                          {row.statusLabel}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <div className="fade-up-5" style={{ display: "flex", justifyContent: "center" }}>
              <button id="btn-reset-pred" className="btn-reset" onClick={resetPredictor}>↺ Sıfırla</button>
            </div>
          </main>
        )}

        {/* Mobile bottom nav */}
        <nav className="mobile-nav" aria-label="Mobil navigasyon">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              id={`mobile-nav-${item.key}`}
              className={`mobile-nav-item ${activeModule === item.key ? "active" : ""}`}
              onClick={() => setActiveModule(item.key)}
              aria-current={activeModule === item.key ? "page" : undefined}
            >
              <span className="mobile-nav-icon">{item.icon}</span>
              <span className="mobile-nav-label">
                {item.key === "calculator" ? "Not" : item.key === "gpa" ? "GPA" : "Tahmin"}
              </span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
