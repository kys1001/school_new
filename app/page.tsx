"use client";

import { useEffect, useMemo, useState } from "react";

type Subject = "국어" | "수학" | "과학";
type AgentState = "대기" | "진행 중" | "완료";
type RecordItem = { id: string; student: string; grade: string; subject: Subject; created_at: string; content: string };

const subjects: Subject[] = ["국어", "수학", "과학"];
const examples: Record<Subject, string> = {
  국어: "현대시의 이미지와 화자 정서 분석, 모둠 토론에서 근거를 들어 의견을 조율함",
  수학: "이차함수의 그래프 변환을 실생활 자료에 적용, 풀이 과정을 친구에게 설명함",
  과학: "기후 변화 자료를 비교 분석하고 간이 온실 실험을 설계, 결과를 표와 그래프로 정리함",
};

function makeDraft(subject: Subject, observation: string) {
  const core = observation.trim() || examples[subject];
  const lead = subject === "국어" ? "작품의 표현 방식과 맥락을 세심하게 살피며" : subject === "수학" ? "개념 사이의 관계를 스스로 연결하며" : "자료와 현상을 근거로 탐구하며";
  return `${lead} ${core} 과정에서 핵심 내용을 구조화하여 설명함. 관련 개념을 자신의 언어로 정리하고, 친구들의 의견을 경청한 뒤 근거를 바탕으로 생각을 구체화하는 모습이 돋보임. 활동 결과를 성찰하며 다음 탐구 방향을 스스로 제안하는 등 꾸준한 학습 태도를 보임.`;
}

export default function Home() {
  const [page, setPage] = useState<"new" | "history" | "settings">("new");
  const [student, setStudent] = useState("24-017");
  const [grade, setGrade] = useState("고등학교 2학년");
  const [activeSubject, setActiveSubject] = useState<Subject>("과학");
  const [observations, setObservations] = useState<Record<Subject, string>>({ 국어: "", 수학: "", 과학: "" });
  const [agentStates, setAgentStates] = useState<Record<string, AgentState>>({ collector: "대기", writer: "대기", reviewer: "대기" });
  const [drafts, setDrafts] = useState<Record<Subject, string>>({ 국어: "", 수학: "", 과학: "" });
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [notice, setNotice] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("Gemini 3.5 Flash-Lite");

  useEffect(() => {
    const saved = localStorage.getItem("seteuk-records");
    if (saved) setRecords(JSON.parse(saved));
    setApiKey(localStorage.getItem("gemini-api-key") || "");
    setModel(localStorage.getItem("gemini-model") || "Gemini 3.5 Flash-Lite");
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key) {
      fetch(`${url}/rest/v1/seteuk_records?select=*&order=created_at.desc`, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
        .then((response) => response.ok ? response.json() : [])
        .then((remote: RecordItem[]) => { if (remote.length) { setRecords(remote); localStorage.setItem("seteuk-records", JSON.stringify(remote)); } })
        .catch(() => undefined);
    }
  }, []);

  const readyCount = Object.values(agentStates).filter((v) => v === "완료").length;
  const dateLabel = useMemo(() => new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" }).format(new Date()), []);
  const updateObservation = (value: string) => setObservations((old) => ({ ...old, [activeSubject]: value }));

  async function generate() {
    setNotice("");
    setAgentStates({ collector: "진행 중", writer: "대기", reviewer: "대기" });
    await new Promise((resolve) => setTimeout(resolve, 450));
    setAgentStates({ collector: "완료", writer: "진행 중", reviewer: "대기" });
    await new Promise((resolve) => setTimeout(resolve, 550));
    setAgentStates({ collector: "완료", writer: "완료", reviewer: "진행 중" });
    await new Promise((resolve) => setTimeout(resolve, 650));
    const generated = Object.fromEntries(subjects.map((subject) => [subject, makeDraft(subject, observations[subject])])) as Record<Subject, string>;
    setDrafts(generated);
    setAgentStates({ collector: "완료", writer: "완료", reviewer: "완료" });
    setNotice("검토까지 완료했어요. 과목별 결과를 확인해 보세요.");
  }

  async function saveRecord() {
    const content = drafts[activeSubject];
    if (!content) { setNotice("먼저 세특 초안을 생성해 주세요."); return; }
    const item: RecordItem = { id: crypto.randomUUID(), student, grade, subject: activeSubject, created_at: new Date().toISOString(), content };
    const next = [item, ...records];
    setRecords(next);
    localStorage.setItem("seteuk-records", JSON.stringify(next));
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key) {
      await fetch(`${url}/rest/v1/seteuk_records`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify(item) });
    }
    setNotice("저장했어요. 저장 내역에서 다시 확인할 수 있습니다.");
  }

  function download() {
    const body = subjects.map((s) => `[${s}]\n${drafts[s] || "아직 생성되지 않았습니다."}`).join("\n\n");
    const blob = new Blob([`학생 식별값: ${student}\n학년: ${grade}\n생성일: ${new Date().toLocaleString("ko-KR")}\n\n${body}`], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `세특_${student}.txt`; link.click(); URL.revokeObjectURL(link.href);
  }

  function saveSettings() { localStorage.setItem("gemini-api-key", apiKey); localStorage.setItem("gemini-model", model); setNotice("개인 설정을 저장했어요."); }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">S</span><span>세특 스튜디오</span></div>
        <div className="workspace-label">WORKSPACE <span>개인</span></div>
        <nav>
          <button className={page === "new" ? "nav-item active" : "nav-item"} onClick={() => setPage("new")}><span>✦</span> 새 초안 만들기</button>
          <button className={page === "history" ? "nav-item active" : "nav-item"} onClick={() => setPage("history")}><span>◷</span> 저장 내역 <b>{records.length}</b></button>
          <button className={page === "settings" ? "nav-item active" : "nav-item"} onClick={() => setPage("settings")}><span>⚙</span> 개인 설정</button>
        </nav>
        <div className="sidebar-bottom"><div className="model-pill"><i></i><div><small>사용 중인 모델</small><strong>{model}</strong></div></div><div className="user-row"><span className="avatar">김</span><div><strong>김선생님</strong><small>교사 계정</small></div><span className="dots">•••</span></div></div>
      </aside>

      <section className="content">
        <header className="topbar"><div><p className="eyebrow">{page === "new" ? "NEW DRAFT" : page === "history" ? "ARCHIVE" : "PREFERENCES"}</p><h1>{page === "new" ? "세특 초안 만들기" : page === "history" ? "저장 내역" : "개인 설정"}</h1></div><div className="top-actions"><span className="today">{dateLabel}</span><button className="help">?</button></div></header>

        {page === "new" && <>
          <div className="intro"><div><h2>학생의 배움과 성장을<br /><em>있는 그대로</em> 기록해 보세요.</h2><p>활동 키워드만 적어도 세 가지 에이전트가 협업해<br />교육적으로 의미 있는 문장으로 다듬어 드립니다.</p></div><div className="intro-art"><span>✦</span><span>●</span><span>✧</span></div></div>
          <div className="stepper"><div className="step active"><span>01</span><div><small>STEP 01</small><strong>활동 입력</strong></div></div><div className="line"></div><div className={`step ${readyCount ? "active" : ""}`}><span>02</span><div><small>STEP 02</small><strong>초안 확인</strong></div></div><div className="line"></div><div className="step"><span>03</span><div><small>STEP 03</small><strong>저장하기</strong></div></div></div>
          <div className="grid-main">
            <div className="card input-card"><div className="card-title"><div><span className="section-num">01</span><h3>학생 정보 & 활동</h3></div><span className="required">필수 입력</span></div><p className="muted">세특에 반영할 기본 정보와 과목별 활동을 입력해 주세요.</p>
              <div className="field-row"><label>학생 식별값<input value={student} onChange={(e) => setStudent(e.target.value)} placeholder="예: 24-017" /></label><label>학년<select value={grade} onChange={(e) => setGrade(e.target.value)}><option>고등학교 1학년</option><option>고등학교 2학년</option><option>고등학교 3학년</option></select></label></div>
              <div className="subject-tabs">{subjects.map((s) => <button key={s} className={activeSubject === s ? "subject-tab active" : "subject-tab"} onClick={() => setActiveSubject(s)}>{s}<span>{observations[s] ? "●" : ""}</span></button>)}</div>
              <label className="textarea-label">{activeSubject} 활동 키워드 또는 관찰 내용<textarea value={observations[activeSubject]} onChange={(e) => updateObservation(e.target.value)} placeholder={examples[activeSubject]} /><small>입력한 내용은 세특 문구의 근거로만 활용됩니다.</small></label>
              <button className="generate" onClick={generate}><span>✦</span> 세특 초안 생성하기 <kbd>⌘ ↵</kbd></button>
            </div>
            <div className="side-column"><div className="card agents-card"><div className="card-title"><div><span className="section-num">02</span><h3>에이전트 협업</h3></div><span className="live-dot">● LIVE</span></div><p className="muted">세특을 완성하기 위해 세 에이전트가 순서대로 검토합니다.</p><Agent name="수집 에이전트" desc="키워드와 관찰 내용 정리" icon="⌁" state={agentStates.collector} /><Agent name="작성 에이전트" desc="과목별 세특 초안 작성" icon="✎" state={agentStates.writer} /><Agent name="검토 에이전트" desc="표현 규정 점검 및 다듬기" icon="✓" state={agentStates.reviewer} /></div><div className="tip"><span>✦</span><div><strong>좋은 키워드 작성 팁</strong><p>학생이 무엇을 했는지보다<br /><b>어떻게 생각하고 변화했는지</b> 적어보세요.</p></div></div></div>
          </div>
          <div className="results-head"><div><span className="section-num">03</span><h3>과목별 결과</h3><p>{readyCount === 3 ? "검토 완료된 문구입니다." : "초안을 생성하면 과목별 결과가 표시됩니다."}</p></div>{readyCount === 3 && <div className="result-actions"><button onClick={download}>↓ 텍스트 다운로드</button><button className="save" onClick={saveRecord}>저장하기 <span>→</span></button></div>}</div>
          <div className="results-tabs">{subjects.map((s) => <button key={s} className={activeSubject === s ? "result-tab active" : "result-tab"} onClick={() => setActiveSubject(s)}>{s} <span>{drafts[s] ? "완료" : "대기"}</span></button>)}</div>
          <div className="result-box">{drafts[activeSubject] ? <><div className="result-meta"><span className="status">✓ 검토 완료</span><span>{grade} · {student}</span></div><p>{drafts[activeSubject]}</p></> : <div className="empty-result"><span>✧</span><p>아직 생성된 초안이 없습니다.<br />활동 내용을 입력하고 생성 버튼을 눌러주세요.</p></div>}</div>
          {notice && <div className="notice">{notice}</div>}
        </>}

        {page === "history" && <div className="history-page"><div className="history-summary"><div><span>전체 저장 문구</span><strong>{records.length}<small>건</small></strong></div><div><span>최근 저장</span><strong>{records[0] ? new Date(records[0].created_at).toLocaleDateString("ko-KR", { month: "long", day: "numeric" }) : "-"}</strong></div></div><div className="history-list">{records.map((item) => <button className="history-item" key={item.id} onClick={() => { setStudent(item.student); setGrade(item.grade); setActiveSubject(item.subject); setDrafts((d) => ({ ...d, [item.subject]: item.content })); setPage("new"); }}><div className="history-icon">{item.subject === "과학" ? "⚛" : item.subject === "수학" ? "∑" : "가"}</div><div className="history-info"><div><strong>{item.subject} 세특 초안</strong><span>{item.grade} · {item.student}</span></div><p>{item.content}</p><small>{new Date(item.created_at).toLocaleString("ko-KR")}</small></div><span className="arrow">→</span></button>)}</div></div>}

        {page === "settings" && <div className="settings-page"><div className="card settings-card"><div className="card-title"><div><span className="section-num">01</span><h3>Gemini 연결</h3></div><span className="connected">● 로컬 저장 중</span></div><p className="muted">개인 Gemini API 키와 선호 모델을 지정하면 이후 생성 요청에 사용됩니다.</p><label>Gemini API Key<input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="AIza..." /></label><label>선호 모델<select value={model} onChange={(e) => setModel(e.target.value)}><option>Gemini 3.5 Flash-Lite</option><option>Gemini 3.5 Flash</option><option>Gemini 3.5 Pro</option></select></label><button className="generate small-button" onClick={saveSettings}>설정 저장하기</button></div><div className="privacy-note"><span>◉</span><div><strong>개인정보 보호 안내</strong><p>학생 식별값은 이름 대신 학교 내부 식별값 사용을 권장합니다. 입력한 API 키는 이 브라우저에만 저장됩니다.</p></div></div>{notice && <div className="notice">{notice}</div>}</div>}
      </section>
    </main>
  );
}

function Agent({ name, desc, icon, state }: { name: string; desc: string; icon: string; state: AgentState }) { return <div className="agent"><span className={`agent-icon ${state === "완료" ? "done" : ""}`}>{icon}</span><div><strong>{name}</strong><small>{desc}</small></div><span className={`agent-state ${state === "진행 중" ? "working" : state === "완료" ? "finished" : ""}`}>{state === "완료" ? "완료" : state === "진행 중" ? "처리 중" : "대기"}</span></div>; }
