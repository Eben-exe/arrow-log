import React, { useState, useEffect } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const DIANA_TYPES = [
  "Diana WA 122cm (outdoor)",
  "Diana WA 80cm (indoor)",
  "Diana WA 60cm",
  "Diana WA 40cm (indoor)",
  "Diana 3D animal",
  "Diana reducida 6-ring",
  "Otra",
];
const DISTANCES = ["5m","10m","15m","18m","20m","25m","30m","50m","70m","90m"];
const BOW_TYPES = ["Tradicional","Recurvo","Compuesto","Longbow","Barebow","Otro"];
const BOW_POUNDS = ["10","12","15","18","20","22","24","25","26","28","30","32","34","36","38","40","45","50","55","60","Otro"];
const PERIODS = [
  { key:"week",    label:"Semana" },
  { key:"month",   label:"Mes" },
  { key:"quarter", label:"Trimestre" },
  { key:"half",    label:"Semestre" },
  { key:"year",    label:"Año" },
];
const STORAGE_KEY = "archery-sessions-v1";
const COMP_KEY = "archery-comps-v1";

// ─── Storage helpers ──────────────────────────────────────────────────────────
async function loadSessions() {
  try {
    const res = localStorage.getItem(STORAGE_KEY);
    return res ? JSON.parse(res) : [];
  } catch { return []; }
}
async function saveSessions(sessions) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions)); }
  catch (e) { console.error("Storage error", e); }
}
async function loadComps() {
  try {
    const res = localStorage.getItem(COMP_KEY);
    return res ? JSON.parse(res) : [];
  } catch { return []; }
}
async function saveComps(comps) {
  try { localStorage.setItem(COMP_KEY, JSON.stringify(comps)); }
  catch (e) { console.error("Storage comp error", e); }
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
function todayStr() { return new Date().toISOString().split("T")[0]; }

function filterByPeriod(sessions, period) {
  const now = new Date();
  const from = new Date(now);
  if      (period==="week")    from.setDate(now.getDate()-7);
  else if (period==="month")   from.setMonth(now.getMonth()-1);
  else if (period==="quarter") from.setMonth(now.getMonth()-3);
  else if (period==="half")    from.setMonth(now.getMonth()-6);
  else if (period==="year")    from.setFullYear(now.getFullYear()-1);
  return sessions.filter(s => new Date(s.date) >= from);
}

function weekLabel(dateStr) {
  const d = new Date(dateStr);
  const start = new Date(d);
  start.setDate(d.getDate() - ((d.getDay()+6)%7));
  return `${start.getDate()}/${start.getMonth()+1}`;
}

function computeStats(sessions) {
  const allRounds = sessions.flatMap(s => s.rounds);
  const allArrows = allRounds.flatMap(r => r.arrows);
  const totalArrows = allArrows.length;
  const totalPoints = allArrows.reduce((a,b)=>a+(b===10.5?11:b),0);
  const avg = totalArrows ? (totalPoints/totalArrows).toFixed(2) : "—";
  const bestRound = allRounds.length ? Math.max(...allRounds.map(r=>r.total)) : "—";
  const tens  = allArrows.filter(a=>a===10).length;
  const nines = allArrows.filter(a=>a===9).length;
  return { totalArrows, totalPoints, avg, bestRound, tens, nines, sessions_count:sessions.length, allArrows, allRounds };
}

function groupByWeek(sessions) {
  const map = {};
  sessions.forEach(s => {
    const wk = weekLabel(s.date);
    if (!map[wk]) map[wk] = { label:wk, arrows:[], date:s.date };
    s.rounds.forEach(r => r.arrows.forEach(a => map[wk].arrows.push(a)));
  });
  return Object.values(map).sort((a,b)=>new Date(a.date)-new Date(b.date));
}

function groupVolumeByWeek(sessions) {
  // Returns weekly total arrow count across ALL session modes
  const map = {};
  sessions.forEach(s => {
    const wk = weekLabel(s.date);
    if (!map[wk]) map[wk] = { label:wk, count:0, date:s.date };
    s.rounds.forEach(r => { map[wk].count += (r.count || r.arrows.length); });
  });
  return Object.values(map).sort((a,b)=>new Date(a.date)-new Date(b.date));
}

// ─── Shared styles ─────────────────────────────────────────────────────────────
const S = {
  inp: { fontFamily:"'DM Mono',monospace", fontSize:13, border:"1.5px solid #000", background:"#fff", padding:"8px 12px", width:"100%", boxSizing:"border-box", outline:"none", borderRadius:0 },
  lbl: { fontFamily:"'DM Mono',monospace", fontSize:10, letterSpacing:"0.1em", textTransform:"uppercase", color:"#555", display:"block", marginBottom:4 },
  btnP: { background:"#000", color:"#fff", border:"none", padding:"10px 20px", fontFamily:"'DM Mono',monospace", fontSize:11, letterSpacing:"0.1em", textTransform:"uppercase", cursor:"pointer", width:"100%" },
  btnS: { background:"#fff", color:"#000", border:"1.5px solid #000", padding:"10px 20px", fontFamily:"'DM Mono',monospace", fontSize:11, letterSpacing:"0.1em", textTransform:"uppercase", cursor:"pointer", width:"100%" },
  mono: { fontFamily:"'DM Mono',monospace" },
  serif: { fontFamily:"'Playfair Display',serif" },
};

// ─── Components ───────────────────────────────────────────────────────────────
// 10.5 = Mosca (X) → suma 11 pts (10+1), zona central amarilla
function ptVal(p) { return p===10.5 ? 11 : p; }
function ptLabel(p) { return p===10.5 ? "X" : p===0 ? "N" : String(p); }

function ScoreCircle({ points }) {
  const isMosca = points===10.5;
  const bg =
    points>=9  ? "#F5C518" :
    points>=7  ? "#E8392A" :
    points>=5  ? "#2B6CB0" :
    points>=3  ? "#1a1a1a" :
    points>=1  ? "#f0efe8" : "#f5f5f5";
  const fg = points>=9 ? "#000" : points>=3 ? "#fff" : points>=1 ? "#555" : "#bbb";
  const bdr = isMosca ? "2.5px solid #000" : points<=2&&points>=1 ? "1.5px solid #ccc" : "none";
  return (
    <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:30, height:30, borderRadius:"50%", background:bg, color:fg, border:bdr, ...S.mono, fontSize:isMosca?11:12, fontWeight:700 }}>
      {ptLabel(points)}
    </span>
  );
}

function StatBox({ label, value, sub }) {
  return (
    <div style={{ borderTop:"2px solid #000", paddingTop:12, paddingBottom:12 }}>
      <div style={{ ...S.mono, fontSize:10, letterSpacing:"0.12em", color:"#888", textTransform:"uppercase" }}>{label}</div>
      <div style={{ ...S.serif, fontSize:30, fontWeight:700, lineHeight:1.1, marginTop:4 }}>{value}</div>
      {sub && <div style={{ ...S.mono, fontSize:10, color:"#888", marginTop:2 }}>{sub}</div>}
    </div>
  );
}


function BarRow({ score, count, total }) {
  const pct = total ? (count/total)*100 : 0;
  const bg =
    score>=9 ? "#F5C518" :
    score>=7 ? "#E8392A" :
    score>=5 ? "#2B6CB0" :
    score>=3 ? "#1a1a1a" :
    score>=1 ? "#ccc"    : "#eee";
  const lbl = score===10.5?"X":score===0?"N":score;
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
      <div style={{ width:20, textAlign:"right", fontSize:11, ...S.mono, fontWeight:700 }}>{lbl}</div>
      <div style={{ flex:1, background:"#eee", height:6 }}>
        <div style={{ background:bg, height:"100%", width:`${pct}%`, transition:"width 0.3s" }} />
      </div>
      <div style={{ width:24, fontSize:10, color:"#888", textAlign:"right" }}>{count}</div>
      <div style={{ width:28, fontSize:9, color:"#bbb" }}>{pct.toFixed(0)}%</div>
    </div>
  );
}

// ─── CompView component ───────────────────────────────────────────────────────
function CompView({ comp, setComp, allComps, setAllComps, saveComps, selStyle }) {
  const [activeEnv, setActiveEnv] = React.useState("indoor");
  const [arrowInput, setArrowInput] = React.useState("");
  const [activeRound, setActiveRound] = React.useState(1);
  const [saved, setSaved] = React.useState(false);
  const [openId, setOpenId] = React.useState(null);
  const [inputMode, setInputMode] = React.useState("arrows"); // "arrows" | "total"
  const [directR1, setDirectR1] = React.useState("");
  const [directR2, setDirectR2] = React.useState("");

  // Switch env resets comp
  const switchEnv = (env) => {
    setActiveEnv(env);
    setComp(blankComp(env));
    setActiveRound(1);
    setArrowInput("");
    setSaved(false);
    setDirectR1(""); setDirectR2("");
  };

  const upd = (k,v) => setComp(c => ({ ...c, [k]:v }));

  const addArrow = (val) => {
    const v = Math.min(10.5, Math.max(0, val==="X"?10.5:parseFloat(val)||0));
    const key = activeRound===1?"round1":"round2";
    setComp(c => ({ ...c, [key]:[...c[key], v] }));
    setArrowInput("");
  };

  const removeArrow = (round, idx) => {
    const key = round===1?"round1":"round2";
    setComp(c => ({ ...c, [key]:c[key].filter((_,i)=>i!==idx) }));
  };

  const totalRound = (arr) => {
    if (!arr || !arr.length) return 0;
    if (arr[0]?.direct) return arr[0].total;
    return arr.reduce((a,b)=>a+(b===10.5?11:b),0);
  };

  const saveComp = async () => {
    // In direct-total mode, store as special sentinel: [{direct:true, total:N}]
    const finalR1 = inputMode==="total"
      ? (directR1 ? [{ direct:true, total:parseInt(directR1)||0 }] : [])
      : r1;
    const finalR2 = inputMode==="total"
      ? (directR2 ? [{ direct:true, total:parseInt(directR2)||0 }] : [])
      : r2;
    const toSave = { ...comp, round1:finalR1, round2:finalR2, inputMode, id:comp.id||Date.now(), savedAt:new Date().toISOString() };
    const existing = allComps.findIndex(x=>x.id===toSave.id);
    const updated = existing>=0 ? allComps.map(x=>x.id===toSave.id?toSave:x) : [...allComps, toSave];
    setAllComps(updated);
    await saveComps(updated);
    setSaved(true);
    setComp(blankComp(activeEnv));
    setActiveRound(1);
    setDirectR1(""); setDirectR2("");
  };

  const delComp = async (id) => {
    const updated = allComps.filter(x=>x.id!==id);
    setAllComps(updated);
    await saveComps(updated);
  };

  // History: separate by env
  const indoorComps  = allComps.filter(x=>x.env==="indoor").sort((a,b)=>new Date(b.date)-new Date(a.date));
  const outdoorComps = allComps.filter(x=>x.env==="outdoor").sort((a,b)=>new Date(b.date)-new Date(a.date));
  const envComps = activeEnv==="indoor" ? indoorComps : outdoorComps;

  // Chart data for current env
  const chartData = [...envComps].reverse().map(x => ({
    date: x.date,
    label: x.date.slice(5), // MM-DD
    r1: totalRound(x.round1),
    r2: totalRound(x.round2),
    total: totalRound(x.round1)+totalRound(x.round2),
  }));

  const r1 = comp.round1; const r2 = comp.round2;
  const t1 = totalRound(r1); const t2 = totalRound(r2);

  const scoreCircleSmall = (pts) => {
    const bg = pts>=9?"#F5C518":pts>=7?"#E8392A":pts>=5?"#2B6CB0":pts>=3?"#1a1a1a":pts>=1?"#f0efe8":"#f5f5f5";
    const fg = pts>=9?"#000":pts>=3?"#fff":pts>=1?"#555":"#bbb";
    const lbl = pts===10.5?"X":pts===0?"N":pts;
    return (
      <span key={Math.random()} style={{ display:"inline-flex", alignItems:"center", justifyContent:"center",
        width:24, height:24, borderRadius:"50%", background:bg, color:fg,
        fontFamily:"'DM Mono',monospace", fontSize:10, fontWeight:700,
        border:pts===10.5?"2px solid #000":pts<=2&&pts>=1?"1px solid #ccc":"none",
        flexShrink:0 }}>
        {lbl}
      </span>
    );
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      {/* Env tabs */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        {[["indoor","🏛 Sala (interior)"],["outdoor","🌿 Exterior"]].map(([env,label]) => (
          <div key={env} className="tap" onClick={()=>switchEnv(env)}
            style={{ border:activeEnv===env?"2px solid #000":"1.5px solid #ddd", padding:"12px", background:activeEnv===env?"#000":"#fff", transition:"all .15s", textAlign:"center" }}>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:11, fontWeight:700, color:activeEnv===env?"#fff":"#000" }}>{label}</div>
          </div>
        ))}
      </div>

      {saved && (
        <div style={{ background:"#f0f8f0", border:"1.5px solid #4a4", padding:"8px 12px", fontFamily:"'DM Mono',monospace", fontSize:11, color:"#282" }}>
          ✓ Competición guardada
        </div>
      )}

      {/* Config row */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <div>
          <label style={S.lbl}>Fecha</label>
          <input type="date" value={comp.date} onChange={e=>upd("date",e.target.value)} style={S.inp} />
        </div>
        <div>
          <label style={S.lbl}>Distancia</label>
          <select value={comp.distance} onChange={e=>upd("distance",e.target.value)} style={selStyle}>
            {DISTANCES.map(d=><option key={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label style={S.lbl}>Tipo de arco</label>
          <select value={comp.bowType} onChange={e=>upd("bowType",e.target.value)} style={selStyle}>
            {BOW_TYPES.map(b=><option key={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label style={S.lbl}>Libras</label>
          <select value={comp.bowPounds} onChange={e=>upd("bowPounds",e.target.value)} style={selStyle}>
            {BOW_POUNDS.map(b=><option key={b}>{b}</option>)}
          </select>
        </div>
      </div>

      {/* Input mode toggle */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
        {[["arrows","↗ Flecha a flecha"],["total","# Puntos directos"]].map(([m,label]) => (
          <div key={m} className="tap" onClick={()=>setInputMode(m)}
            style={{ border:inputMode===m?"2px solid #000":"1.5px solid #ddd", padding:"9px 12px",
              background:inputMode===m?"#000":"#fafaf8", transition:"all .15s", textAlign:"center" }}>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10, fontWeight:700,
              color:inputMode===m?"#fff":"#888" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Round selector */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        {[1,2].map(n => (
          <div key={n} className="tap" onClick={()=>setActiveRound(n)}
            style={{ border:activeRound===n?"2px solid #000":"1.5px solid #ddd", padding:"10px 12px", background:activeRound===n?"#000":"#fff", transition:"all .15s" }}>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:10, fontWeight:700, color:activeRound===n?"#fff":"#000" }}>
              Ronda {n}
            </div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:16, fontWeight:900, color:activeRound===n?"#fff":"#000", marginTop:2 }}>
              {inputMode==="total"
                ? (n===1 ? (directR1||"—") : (directR2||"—"))
                : (n===1?t1:t2)
              }
              {" "}<span style={{ fontSize:9, fontWeight:400, color:activeRound===n?"#aaa":"#bbb" }}>
                {inputMode==="total" ? "pts" : `pts · ${(n===1?r1:r2).length}↗`}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Modo puntos directos ── */}
      {inputMode==="total" && (
        <div style={{ background:"#f8f7f4", padding:14, borderLeft:"3px solid #000" }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, letterSpacing:"0.15em", textTransform:"uppercase", color:"#bbb", marginBottom:14 }}>
            Puntos totales por ronda
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {[["R1","directR1",directR1,setDirectR1],["R2","directR2",directR2,setDirectR2]].map(([label,key,val,setter]) => (
              <div key={key}>
                <label style={{ ...S.lbl }}>{label}</label>
                <input
                  type="number" min={0} max={600}
                  placeholder="ej. 287"
                  value={val}
                  onChange={e=>setter(e.target.value)}
                  style={{ ...S.inp, fontSize:22, fontWeight:700, fontFamily:"'Playfair Display',serif", textAlign:"center", padding:"10px 8px" }}
                />
              </div>
            ))}
          </div>
          {(directR1||directR2) && (
            <div style={{ marginTop:14, display:"flex", justifyContent:"space-between", alignItems:"baseline", borderTop:"1px solid #e0e0e0", paddingTop:12 }}>
              <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:"#888", textTransform:"uppercase", letterSpacing:"0.1em" }}>
                {directR1||0} + {directR2||0}
              </div>
              <div>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:"#888", textTransform:"uppercase", letterSpacing:"0.1em", textAlign:"right" }}>Total</div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:40, fontWeight:900, lineHeight:1 }}>
                  {(parseInt(directR1)||0)+(parseInt(directR2)||0)}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Modo flecha a flecha ── */}
      {inputMode==="arrows" && (
        <>
          {/* Arrow input */}
          <div>
            <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, letterSpacing:"0.15em", textTransform:"uppercase", color:"#bbb", marginBottom:8 }}>
              Añadir flecha · Ronda {activeRound}
            </div>
            <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:8 }}>
              {["X",10,9,8,7,6,5,4,3,2,1,0].map(v => {
                const bg = v==="X"||v>=9?"#F5C518":v>=7?"#E8392A":v>=5?"#2B6CB0":v>=3?"#1a1a1a":v>=1?"#f0efe8":"#eee";
                const fg = v==="X"||v>=9?"#000":v>=3?"#fff":v>=1?"#555":"#888";
                const bdr = v==="X"?"2px solid #000":v<=2&&v>=1?"1px solid #ccc":"none";
                return (
                  <button key={v} onClick={()=>addArrow(v)}
                    style={{ width:36, height:36, borderRadius:"50%", background:bg, color:fg, border:bdr,
                      fontFamily:"'DM Mono',monospace", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                    {v}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Arrows display */}
          {[1,2].map(n => {
            const arr = n===1?r1:r2;
            if (!arr.length) return null;
            return (
              <div key={n} style={{ background:"#f8f7f4", padding:"12px", borderLeft:"3px solid #000" }}>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, textTransform:"uppercase", letterSpacing:"0.1em", color:"#888", marginBottom:8 }}>
                  Ronda {n} · {totalRound(arr)} pts · {arr.length} flechas
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                  {arr.map((a,i) => (
                    <div key={i} style={{ position:"relative" }} onClick={()=>removeArrow(n,i)} className="tap">
                      {scoreCircleSmall(a)}
                    </div>
                  ))}
                </div>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:8, color:"#ccc", marginTop:6 }}>Toca una flecha para eliminarla</div>
              </div>
            );
          })}

          {/* Total arrows mode */}
          {(r1.length>0||r2.length>0) && (
            <div style={{ borderTop:"2px solid #000", paddingTop:12, display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
              <div>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, textTransform:"uppercase", color:"#888" }}>R1 + R2</div>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:13 }}>{t1} + {t2}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, textTransform:"uppercase", color:"#888" }}>Total</div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:40, fontWeight:900, lineHeight:1 }}>{t1+t2}</div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Observations */}
      <div>
        <label style={S.lbl}>Observaciones</label>
        <input type="text" placeholder="ej. había viento, campo nuevo, nervios..." value={comp.observations}
          onChange={e=>upd("observations",e.target.value)} style={S.inp} />
      </div>

      {(inputMode==="arrows" ? (r1.length>0||r2.length>0) : (directR1||directR2)) && (
        <button style={S.btnP} onClick={saveComp}>↓ Guardar competición</button>
      )}

      {/* History for this env */}
      {envComps.length>0 && (
        <div style={{ borderTop:"2px solid #000", paddingTop:16 }}>
          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, letterSpacing:"0.15em", textTransform:"uppercase", color:"#bbb", marginBottom:12 }}>
            Histórico · {activeEnv==="indoor"?"Sala":"Exterior"} · {envComps.length} competiciones
          </div>

          {/* Progress chart */}
          {chartData.length>1 && (() => {
            const maxT = Math.max(...chartData.map(d=>d.total), 1);
            const W=380, H=100, PAD=24;
            const mkPts = (vals) => vals.map((v,i)=>({
              x: PAD+(i/(vals.length-1))*(W-PAD*2),
              y: H-PAD-((v/maxT)*(H-PAD*2)),
              v
            }));
            const smooth = (pts) => pts.reduce((acc,p,i)=>{
              if(i===0) return `M${p.x.toFixed(1)},${p.y.toFixed(1)}`;
              const prev=pts[i-1]; const cpx=(prev.x+p.x)/2;
              return acc+` C${cpx.toFixed(1)},${prev.y.toFixed(1)} ${cpx.toFixed(1)},${p.y.toFixed(1)} ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
            },"");
            const ptsTotal = mkPts(chartData.map(d=>d.total));
            const ptsR1    = mkPts(chartData.map(d=>d.r1));
            const ptsR2    = mkPts(chartData.map(d=>d.r2));
            return (
              <div style={{ marginBottom:20 }}>
                <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, textTransform:"uppercase", letterSpacing:"0.1em", color:"#bbb", marginBottom:8 }}>
                  Evolución de puntuación
                </div>
                <div style={{ display:"flex", gap:12, marginBottom:8 }}>
                  {[["Total","#000"],["R1","#888"],["R2","#ccc"]].map(([l,col])=>(
                    <div key={l} style={{ display:"flex", alignItems:"center", gap:4 }}>
                      <div style={{ width:16, height:2, background:col }} />
                      <span style={{ fontFamily:"'DM Mono',monospace", fontSize:8, color:"#aaa" }}>{l}</span>
                    </div>
                  ))}
                </div>
                <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow:"visible" }}>
                  {[0,0.5,1].map(t=>{
                    const y=H-PAD-t*(H-PAD*2);
                    return <line key={t} x1={PAD} y1={y} x2={W-PAD} y2={y} stroke="#eee" strokeWidth={1}/>;
                  })}
                  <path d={smooth(ptsR1)} fill="none" stroke="#bbb" strokeWidth={1.5} strokeDasharray="3,3"/>
                  <path d={smooth(ptsR2)} fill="none" stroke="#ccc" strokeWidth={1.5} strokeDasharray="3,3"/>
                  <path d={smooth(ptsTotal)} fill="none" stroke="#000" strokeWidth={2.5} strokeLinecap="round"/>
                  {ptsTotal.map((p,i)=>(
                    <g key={i}>
                      <circle cx={p.x} cy={p.y} r={3} fill="#000"/>
                      <text x={p.x} y={p.y-7} textAnchor="middle" fontSize={7} fontFamily="'DM Mono',monospace" fill="#000" fontWeight="700">{p.v}</text>
                      <text x={p.x} y={H-4} textAnchor="middle" fontSize={6} fontFamily="'DM Mono',monospace" fill="#bbb">{chartData[i].label}</text>
                    </g>
                  ))}
                </svg>
              </div>
            );
          })()}

          {/* Competition list */}
          {envComps.map(x => {
            const isOpen = openId===x.id;
            const xT = totalRound(x.round1)+totalRound(x.round2);
            return (
              <div key={x.id} style={{ borderBottom:"1px solid #eee" }}>
                <div className="rh tap" onClick={()=>setOpenId(isOpen?null:x.id)}
                  style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0", gap:10 }}>
                  <div>
                    <div style={{ fontFamily:"'DM Mono',monospace", fontSize:12, fontWeight:700 }}>{x.date}</div>
                    <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:"#888", marginTop:2 }}>
                      {x.distance} · {x.bowType} {x.bowPounds}lb · R1:{totalRound(x.round1)} R2:{totalRound(x.round2)}
                    </div>
                    {x.observations && <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:"#bbb", fontStyle:"italic" }}>"{x.observations}"</div>}
                  </div>
                  <div style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700 }}>{xT}</div>
                </div>
                {isOpen && (
                  <div style={{ paddingBottom:14 }}>
                    {[1,2].map(n=>{
                      const arr = n===1?x.round1:x.round2;
                      return arr.length>0 && (
                        <div key={n} style={{ marginBottom:8 }}>
                          <div style={{ fontFamily:"'DM Mono',monospace", fontSize:9, color:"#aaa", marginBottom:4 }}>Ronda {n} · {totalRound(arr)} pts</div>
                          <div style={{ display:"flex", flexWrap:"wrap", gap:3 }}>
                            {arr.map((a,i)=><ScoreCircle key={i} points={a}/>)}
                          </div>
                        </div>
                      );
                    })}
                    <button onClick={()=>delComp(x.id)}
                      style={{ ...S.btnS, fontSize:10, padding:"6px 12px", width:"auto", color:"#c00", borderColor:"#fcc", marginTop:8 }}>
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Competition ─────────────────────────────────────────────────────────────
const blankComp = (env) => ({
  id: null,
  date: todayStr(),
  env,                    // "indoor" | "outdoor"
  distance: env==="indoor" ? "18m" : "30m",
  dianaType: env==="indoor" ? "Diana WA 40cm (indoor)" : "Diana WA 122cm (outdoor)",
  bowType: "Tradicional",
  bowPounds: "25",
  round1: [],             // arrays of arrow scores
  round2: [],
  observations: "",
});

// ─── Main ─────────────────────────────────────────────────────────────────────
const blankSession = () => ({
  id: null,
  date: todayStr(),
  mode: "score",          // "score" | "volume"
  distance: "18m",
  dianaType: "Diana WA 40cm (indoor)",
  bowType: "Tradicional",
  bowPounds: "25",
  arrowsPerSerie: 6,
  fatigueArrow: "",
  mentalGoal: "",
  rounds: [],
  warmup: [],       // {id, count} solo volumen
});

export default function ArcheryTracker() {
  const [allSessions, setAllSessions] = useState([]);
  const [ready, setReady]             = useState(false);
  const [session, setSession]         = useState(blankSession());
  const [view, setView]               = useState("config");
  const [pending, setPending]         = useState(null);
  const [period, setPeriod]           = useState("month");
  const [openId, setOpenId]           = useState(null);
  const [warmupInput, setWarmupInput] = useState("");
  const [comp, setComp]               = useState(blankComp("indoor"));
  const [compArrowInput, setCAI]      = useState(""); // temp input for comp arrows
  const [compActiveRound, setCAR]     = useState(1);  // 1 or 2

  const [allComps, setAllComps] = useState([]);

  useEffect(() => {
    Promise.all([loadSessions(), loadComps()]).then(([s,comps]) => {
      setAllSessions(s);
      setAllComps(comps);
      setReady(true);
    });
  }, []);

  const upd = (k,v) => setSession(s => ({ ...s, [k]:v }));


  // ── Round CRUD ───────────────────────────────────────────────────────────────
  const confirmRound = () => {
    if (!pending) return;
    const total = pending.arrows.reduce((a,b)=>a+ptVal(b),0);
    const round = { id:Date.now(), roundNum:session.rounds.length+1, ...pending, total };
    setSession(s => ({ ...s, rounds:[...s.rounds, round] }));
    setPending(null);
  };
  const manualRound = () => {
    const arrows = Array(parseInt(session.arrowsPerSerie)||3).fill(0);
    setPending({ arrows, total:0, count:arrows.length, notes:"", images:[] });
    setImgs([]);
  };
  const setArrow = (idx, val) => {
    if (!pending) return;
    const n = parseInt(val)||0;
    // 11 typed = mosca (stored as 10.5), anything else clamp 0-10
    const v = n===11 ? 10.5 : val===10.5 ? 10.5 : Math.min(10,Math.max(0,n));
    const arrows = [...pending.arrows]; arrows[idx]=v;
    setPending(p => ({ ...p, arrows, total:arrows.reduce((a,b)=>a+ptVal(b),0) }));
  };
  const toggleMosca = (idx) => {
    if (!pending) return;
    const current = pending.arrows[idx];
    const next = current===10.5 ? 10 : 10.5;
    const arrows = [...pending.arrows]; arrows[idx]=next;
    setPending(p => ({ ...p, arrows, total:arrows.reduce((a,b)=>a+ptVal(b),0) }));
  };
  const delRound = (id) => setSession(s => ({ ...s, rounds:s.rounds.filter(r=>r.id!==id) }));

  // ── Session save ─────────────────────────────────────────────────────────────
  const saveSession = async () => {
    if (!session.rounds.length) { setError("Añade al menos una ronda."); return; }
    const s2save = { ...session, id:session.id||Date.now(), savedAt:new Date().toISOString() };
    const existing = allSessions.findIndex(s=>s.id===s2save.id);
    const updated = existing>=0
      ? allSessions.map(s=>s.id===s2save.id?s2save:s)
      : [...allSessions, s2save];
    const stripped = updated.map(s => ({ ...s, rounds:s.rounds.map(r=>({...r,images:[]})) }));
    setAllSessions(stripped);
    await saveSessions(stripped);
    setSession(blankSession());
    setPending(null);
    setView("history");
  };
  const delSession = async (id) => {
    const updated = allSessions.filter(s=>s.id!==id);
    setAllSessions(updated);
    await saveSessions(updated);
    if (openId===id) setOpenId(null);
  };
  const editSession = (s) => { setSession(s); setView("session"); setOpenId(null); };

  // ── Current session stats ────────────────────────────────────────────────────
  const curArrows = session.rounds.flatMap(r=>r.arrows);
  const curTotal  = curArrows.reduce((a,b)=>a+(b===10.5?11:b),0);
  const curAvg    = curArrows.length ? (curTotal/curArrows.length).toFixed(2) : "—";
  const curTens   = curArrows.filter(a=>a===10).length;
  const curNines  = curArrows.filter(a=>a===9).length;
  const curBest   = session.rounds.length ? Math.max(...session.rounds.map(r=>r.total)) : "—";

  // ── History stats ────────────────────────────────────────────────────────────
  const filtered   = filterByPeriod(allSessions, period);
  const hStats     = computeStats(filtered);
  const weekGroups = groupByWeek(filtered);

  const TABS = [["config","Config"],["session","Tiradas"],["comp","Competición"],["history","Historial"]];

  const selStyle = { ...S.inp, backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23000' stroke-width='1.5' fill='none'/%3E%3C/svg%3E\")", backgroundRepeat:"no-repeat", backgroundPosition:"right 12px center", paddingRight:32 };

  if (!ready) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh", ...S.mono, fontSize:12, color:"#aaa" }}>
      Cargando…
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:#ededea;}
        select,input{-webkit-appearance:none;appearance:none;}
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}
        .tap{cursor:pointer;transition:opacity .15s;}.tap:hover{opacity:.65;}
        .rh:hover{background:#f4f4f1;}
        .pbtn{cursor:pointer;padding:6px 11px;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.1em;text-transform:uppercase;transition:all .15s;border:1.5px solid #ddd;}
      `}</style>

      <div style={{ maxWidth:480, margin:"0 auto", minHeight:"100vh", background:"#fafaf8" }}>

        {/* ── Header ── */}
        <div style={{ padding:"28px 24px 16px", borderBottom:"2px solid #000" }}>
          <div style={{ ...S.mono, fontSize:9, letterSpacing:"0.2em", textTransform:"uppercase", color:"#bbb", marginBottom:4 }}>
            Registro · tiro con arco
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
            <div style={{ ...S.serif, fontSize:34, fontWeight:900, lineHeight:1, letterSpacing:"-0.02em" }}>
              ARROW<br/>LOG
            </div>
            <div style={{ textAlign:"right" }}>
              <div style={{ ...S.mono, fontSize:11, color:"#888" }}>{session.date}</div>
              <div style={{ ...S.mono, fontSize:9, color:"#bbb" }}>{session.distance} · {session.bowType} {session.bowPounds}lb · {session.arrowsPerSerie}↗/serie</div>
              {allSessions.length>0 && <div style={{ ...S.mono, fontSize:9, color:"#bbb", marginTop:2 }}>{allSessions.length} sesiones guardadas</div>}
            </div>
          </div>
        </div>

        {/* ── Nav ── */}
        <div style={{ display:"flex", borderBottom:"1.5px solid #e0e0e0", background:"#fafaf8" }}>
          {TABS.map(([v,label]) => (
            <div key={v} className="tap" onClick={()=>setView(v)}
              style={{
                flex:1, textAlign:"center", padding:"11px 0",
                fontSize:10, letterSpacing:"0.08em", textTransform:"uppercase",
                borderBottom: view===v?"2px solid #000":"2px solid transparent",
                fontWeight: view===v?700:400,
                color: view===v?"#000":"#999",
                marginBottom:-1.5, ...S.mono,
              }}>
              {label}
            </div>
          ))}
        </div>

        <div style={{ padding:"24px 24px 64px" }}>

          {/* ══════════════════════════ CONFIG ══════════════════════════════ */}
          {view==="config" && (
            <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
              <div>
                <label style={S.lbl}>Fecha de la sesión</label>
                <input type="date" value={session.date} onChange={e=>upd("date",e.target.value)} style={S.inp} />
              </div>
              <div>
                <label style={S.lbl}>Distancia</label>
                <select value={session.distance} onChange={e=>upd("distance",e.target.value)} style={selStyle}>
                  {DISTANCES.map(d=><option key={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label style={S.lbl}>Tipo de diana</label>
                <select value={session.dianaType} onChange={e=>upd("dianaType",e.target.value)} style={selStyle}>
                  {DIANA_TYPES.map(d=><option key={d}>{d}</option>)}
                </select>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div>
                  <label style={S.lbl}>Tipo de arco</label>
                  <select value={session.bowType} onChange={e=>upd("bowType",e.target.value)} style={selStyle}>
                    {BOW_TYPES.map(b=><option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label style={S.lbl}>Libras</label>
                  <select value={session.bowPounds} onChange={e=>upd("bowPounds",e.target.value)} style={selStyle}>
                    {BOW_POUNDS.map(b=><option key={b}>{b}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={S.lbl}>Flechas por serie</label>
                <input type="number" min={1} max={12} value={session.arrowsPerSerie}
                  onChange={e=>upd("arrowsPerSerie",e.target.value)} style={S.inp} />
              </div>

              <div style={{ borderTop:"1px solid #eee", paddingTop:18, display:"flex", flexDirection:"column", gap:16 }}>
                <div style={{ ...S.mono, fontSize:9, letterSpacing:"0.2em", textTransform:"uppercase", color:"#bbb" }}>
                  Métricas personales
                </div>
                <div>
                  <label style={S.lbl}>Flecha de fatiga</label>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <input type="number" min={0} placeholder="ej. 24" value={session.fatigueArrow}
                      onChange={e=>upd("fatigueArrow",e.target.value)} style={{ ...S.inp, flex:1, width:"auto" }} />
                    <span style={{ fontSize:10, color:"#bbb", whiteSpace:"nowrap" }}>nº flecha</span>
                  </div>
                  <div style={{ ...S.mono, fontSize:9, color:"#ccc", marginTop:4 }}>A partir de qué flecha notas fatiga</div>
                </div>
                <div>
                  <label style={S.lbl}>Objetivo mental</label>
                  <input type="text" placeholder="ej. soltar limpio, respiración..." value={session.mentalGoal}
                    onChange={e=>upd("mentalGoal",e.target.value)} style={S.inp} />
                </div>
              </div>

              {/* Mode picker */}
              <div style={{ borderTop:"1px solid #eee", paddingTop:18 }}>
                <div style={{ ...S.mono, fontSize:9, letterSpacing:"0.2em", textTransform:"uppercase", color:"#bbb", marginBottom:12 }}>
                  Modo de sesión
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  {[
                    { key:"score",  icon:"◎", title:"Con puntos", sub:"Registras la puntuación de cada flecha" },
                    { key:"volume", icon:"↗", title:"Solo volumen", sub:"Cuentas flechas tiradas sin puntuar" },
                  ].map(m => (
                    <div key={m.key} className="tap"
                      onClick={()=>upd("mode", m.key)}
                      style={{
                        border: session.mode===m.key ? "2px solid #000" : "1.5px solid #ddd",
                        padding:"14px 12px",
                        background: session.mode===m.key ? "#000" : "#fff",
                        transition:"all 0.15s",
                      }}>
                      <div style={{ fontSize:20, marginBottom:6, color: session.mode===m.key?"#fff":"#888" }}>{m.icon}</div>
                      <div style={{ ...S.mono, fontSize:11, fontWeight:700, color: session.mode===m.key?"#fff":"#000", marginBottom:3 }}>{m.title}</div>
                      <div style={{ ...S.mono, fontSize:9, color: session.mode===m.key?"#888":"#bbb", lineHeight:1.4 }}>{m.sub}</div>
                    </div>
                  ))}
                </div>
              </div>

              <button style={S.btnP} onClick={()=>setView("session")}>→ Comenzar tiradas</button>
              {allSessions.length>0 && (
                <button style={S.btnS} onClick={()=>setView("history")}>
                  Historial ({allSessions.length} sesiones)
                </button>
              )}
            </div>
          )}

          {/* ══════════════════════════ TIRADAS ═════════════════════════════ */}
          {view==="session" && (
            <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

              {/* Mode badge */}
              {/* ── VOLUME MODE ── */}
              {session.mode==="volume" && (
                <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                  <div style={{ ...S.mono, fontSize:9, letterSpacing:"0.15em", textTransform:"uppercase", color:"#bbb" }}>
                    Serie {session.rounds.length+1} · solo volumen
                  </div>
                  {/* Quick +N buttons */}
                  <div>
                    <div style={{ ...S.mono, fontSize:9, color:"#bbb", marginBottom:8 }}>Añadir flechas a esta serie:</div>
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                      {[1,2,3,4,5,6].map(n => (
                        <button key={n} className="tap"
                          onClick={()=>{
                            const count = parseInt(session.arrowsPerSerie)||3;
                            const arrows = Array(count).fill(0);
                            const round = { id:Date.now(), roundNum:session.rounds.length+1, arrows, total:0, count, notes:"", images:[] };
                            setSession(s=>({...s, rounds:[...s.rounds, round]}));
                          }}
                          style={{ background:"#000", color:"#fff", border:"none", padding:"12px 0", ...S.mono, fontSize:12, fontWeight:700, cursor:"pointer", width:48 }}>
                          +{session.arrowsPerSerie}
                        </button>
                      ))}
                    </div>
                    <div style={{ ...S.mono, fontSize:9, color:"#ccc", marginTop:6 }}>Cada botón añade una serie de {session.arrowsPerSerie} flechas</div>
                  </div>
                  {/* Custom count */}
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <input type="number" min={1} max={99} placeholder="Nº flechas"
                      id="vol-custom"
                      style={{ ...S.inp, flex:1, width:"auto" }} />
                    <button style={{ ...S.btnP, width:"auto", padding:"10px 16px", whiteSpace:"nowrap" }}
                      onClick={()=>{
                        const el = document.getElementById("vol-custom");
                        const n = parseInt(el?.value)||0;
                        if (!n) return;
                        const arrows = Array(n).fill(0);
                        const round = { id:Date.now(), roundNum:session.rounds.length+1, arrows, total:0, count:n, notes:"", images:[] };
                        setSession(s=>({...s, rounds:[...s.rounds, round]}));
                        if (el) el.value="";
                      }}>
                      + Serie
                    </button>
                  </div>
                </div>
              )}

              {/* ── SCORE MODE ── */}
              {session.mode==="score" && (
                <>
                  {/* Warmup block */}
                  <div style={{ background:"#f8f7f4", borderLeft:"3px solid #bbb", padding:"12px 14px" }}>
                    <div style={{ ...S.mono, fontSize:9, letterSpacing:"0.15em", textTransform:"uppercase", color:"#888", marginBottom:10 }}>
                      Calentamiento · {session.warmup.reduce((a,w)=>a+w.count,0)} flechas
                    </div>
                    {/* Warmup quick buttons */}
                    <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:8 }}>
                      {[session.arrowsPerSerie, 3, 6, 10].filter((v,i,a)=>a.indexOf(v)===i).map(n => (
                        <button key={n} className="tap"
                          onClick={()=>{
                            const w = { id:Date.now(), count:parseInt(n)||6 };
                            setSession(s=>({...s, warmup:[...s.warmup, w]}));
                          }}
                          style={{ background:"#888", color:"#fff", border:"none", padding:"10px 0",
                            ...S.mono, fontSize:11, fontWeight:700, cursor:"pointer", width:44, borderRadius:2 }}>
                          +{n}
                        </button>
                      ))}
                    </div>
                    {/* Custom warmup */}
                    <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:8 }}>
                      <input type="number" min={1} max={99} placeholder="Nº flechas"
                        value={warmupInput} onChange={e=>setWarmupInput(e.target.value)}
                        style={{ ...S.inp, flex:1, width:"auto", fontSize:12 }} />
                      <button style={{ ...S.btnS, width:"auto", padding:"8px 14px", whiteSpace:"nowrap", fontSize:11 }}
                        onClick={()=>{
                          const n = parseInt(warmupInput)||0;
                          if (!n) return;
                          const w = { id:Date.now(), count:n };
                          setSession(s=>({...s, warmup:[...s.warmup, w]}));
                          setWarmupInput("");
                        }}>+ Serie cal.</button>
                    </div>
                    {/* Warmup series list */}
                    {session.warmup.length>0 && (
                      <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                        {session.warmup.map((w,i)=>(
                          <div key={w.id} style={{ display:"flex", alignItems:"center", gap:4,
                            background:"#e8e8e6", padding:"3px 8px 3px 10px" }}>
                            <span style={{ ...S.mono, fontSize:11, fontWeight:700 }}>{w.count}↗</span>
                            <button className="tap" onClick={()=>setSession(s=>({...s, warmup:s.warmup.filter(x=>x.id!==w.id)}))}
                              style={{ background:"none", border:"none", cursor:"pointer", color:"#aaa", fontSize:11, padding:0, lineHeight:1 }}>✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Score rounds */}
                  <div style={{ ...S.mono, fontSize:9, letterSpacing:"0.15em", textTransform:"uppercase", color:"#bbb", marginBottom:0 }}>
                    Ronda {session.rounds.length+1}
                  </div>
                  <button style={S.btnS} onClick={manualRound}>+ Nueva ronda</button>
                </>
              )}

              {/* Pending */}
              {pending && (
                <div style={{ border:"2px solid #000", padding:14, background:"#fff" }}>
                  <div style={{ ...S.mono, fontSize:9, letterSpacing:"0.15em", textTransform:"uppercase", color:"#888", marginBottom:10 }}>Confirmar puntos</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:10 }}>
                    {pending.arrows.map((pts,i) => {
                      const isMosca = pts===10.5;
                      const dispVal = isMosca ? 11 : pts;
                      const bg = pts>=9?"#F5C518":pts>=7?"#E8392A":pts>=5?"#2B6CB0":pts>=3?"#1a1a1a":pts>=1?"#f0efe8":"#f5f5f5";
                      const fg = pts>=9?"#000":pts>=3?"#fff":"#333";
                      return (
                        <div key={i} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                          <div style={{ position:"relative" }}>
                            <input type="number" min={0} max={11} value={dispVal}
                              onChange={e=>setArrow(i,e.target.value)}
                              style={{
                                width:40, height:40, textAlign:"center", ...S.mono, fontSize:16, fontWeight:700,
                                border: isMosca?"3px solid #000":"2px solid #000",
                                background:bg, color:fg, outline:"none", borderRadius:0,
                              }} />
                            {isMosca && (
                              <div style={{ position:"absolute", top:-6, right:-6, background:"#000", color:"#F5C518", fontSize:8, fontWeight:700, padding:"1px 4px", fontFamily:"'DM Mono',monospace" }}>X</div>
                            )}
                            {/* Delete arrow button */}
                            <button className="tap"
                              onClick={()=>setPending(p=>{
                                const arrows = p.arrows.filter((_,idx)=>idx!==i);
                                return { ...p, arrows, total:arrows.reduce((a,b)=>a+(b===10.5?11:b),0) };
                              })}
                              style={{ position:"absolute", top:-6, left:-6, width:14, height:14, borderRadius:"50%",
                                background:"#ccc", color:"#fff", border:"none", cursor:"pointer",
                                fontSize:9, lineHeight:"14px", textAlign:"center", padding:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                              ×
                            </button>
                          </div>
                          {dispVal===11 && (
                            <button onClick={()=>toggleMosca(i)}
                              style={{ fontSize:8, ...S.mono, background:"none", border:"none", cursor:"pointer", color:"#000", fontWeight:700, padding:0 }}>
                              ✓ mosca
                            </button>
                          )}
                          {dispVal!==11 && <span style={{ fontSize:8, color:"#aaa" }}>F{i+1}</span>}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                    <div>
                      <span style={{ fontSize:9, color:"#888", textTransform:"uppercase", letterSpacing:"0.1em" }}>Total </span>
                      <span style={{ ...S.serif, fontSize:26, fontWeight:700 }}>{pending.arrows.reduce((a,b)=>a+(b===10.5?11:b),0)}</span>
                    </div>
                    {pending.notes && <div style={{ fontSize:10, color:"#666", maxWidth:"55%", textAlign:"right", lineHeight:1.4 }}>{pending.notes}</div>}
                  </div>
                  {/* Extra arrow button */}
                  <div style={{ marginBottom:10 }}>
                    <button className="tap"
                      onClick={()=>setPending(p=>({ ...p, arrows:[...p.arrows, 0] }))}
                      style={{ ...S.btnS, fontSize:10, padding:"6px 14px", width:"auto", color:"#888", borderColor:"#ddd" }}>
                      + Flecha extra
                    </button>
                    <span style={{ ...S.mono, fontSize:9, color:"#ccc", marginLeft:8 }}>añade un cuadro más</span>
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <button style={{ ...S.btnP, flex:1 }} onClick={confirmRound}>✓ Guardar ronda</button>
                    <button style={{ ...S.btnS, width:"auto", padding:"10px 14px" }} onClick={()=>setPending(null)}>✕</button>
                  </div>
                </div>
              )}

              {/* Rounds list */}
              {session.rounds.length>0 && (
                <div>
                  <div style={{ ...S.mono, fontSize:9, letterSpacing:"0.15em", textTransform:"uppercase", color:"#bbb", marginBottom:8 }}>
                    {session.mode==="volume" ? "Series registradas" : "Rondas"}
                  </div>
                  {session.rounds.map((round,idx) => {
                    const cumul = session.rounds.slice(0,idx+1).reduce((a,r)=>a+r.count,0);
                    const fatigue = session.fatigueArrow && cumul>=parseInt(session.fatigueArrow);
                    return (
                      <div key={round.id} className="rh"
                        style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 0", borderBottom:"1px solid #eee", gap:8 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, flex:1, minWidth:0 }}>
                          <div style={{ ...S.mono, fontSize:9, color:"#bbb", minWidth:16 }}>S{round.roundNum}</div>
                          {session.mode==="volume" ? (
                            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                              <div style={{ background:"#f0f0ed", border:"1px solid #e0e0e0", padding:"4px 10px", display:"flex", alignItems:"center", gap:6 }}>
                                <span style={{ ...S.mono, fontSize:13, fontWeight:700 }}>{round.count}</span>
                                <span style={{ ...S.mono, fontSize:9, color:"#aaa" }}>flechas</span>
                              </div>
                              {fatigue && <span style={{ fontSize:8, color:"#bbb", textTransform:"uppercase", ...S.mono }}>fatiga</span>}
                            </div>
                          ) : (
                            <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
                              {round.arrows.map((a,i) => <ScoreCircle key={i} points={a} />)}
                            </div>
                          )}
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          {session.mode==="score" && fatigue && <span style={{ fontSize:8, color:"#bbb", textTransform:"uppercase" }}>fatiga</span>}
                          {session.mode==="score" && <span style={{ ...S.serif, fontSize:20, fontWeight:700 }}>{round.total}</span>}
                          <button className="tap" onClick={()=>delRound(round.id)}
                            style={{ background:"none", border:"none", cursor:"pointer", color:"#ccc", fontSize:12, padding:2 }}>✕</button>
                        </div>
                      </div>
                    );
                  })}

                  <div style={{ marginTop:12, padding:"12px 0", borderTop:"2px solid #000", display:"flex", justifyContent:"space-between", alignItems:"baseline" }}>
                    <div>
                      <div style={{ fontSize:9, letterSpacing:"0.1em", textTransform:"uppercase", color:"#888" }}>Flechas tiradas</div>
                      <div style={{ ...S.serif, fontSize:30, fontWeight:900, lineHeight:1 }}>{curArrows.length}</div>
                      <div style={{ ...S.mono, fontSize:9, color:"#bbb", marginTop:2 }}>{session.rounds.length} series{session.warmup?.length>0 ? ` · cal. ${session.warmup.reduce((a,w)=>a+w.count,0)}↗` : ""}</div>
                    </div>
                    {session.mode==="score" && (
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:9, letterSpacing:"0.1em", textTransform:"uppercase", color:"#888" }}>Puntos</div>
                        <div style={{ ...S.serif, fontSize:36, fontWeight:900, lineHeight:1 }}>{curTotal}</div>
                        <div style={{ ...S.mono, fontSize:9, color:"#bbb", marginTop:2 }}>~{curAvg}/flecha</div>
                      </div>
                    )}
                  </div>

                  <div style={{ display:"flex", flexDirection:"column", gap:8, marginTop:8 }}>
                    <button style={S.btnP} onClick={saveSession}>↓ Guardar sesión</button>
                    {session.mode==="score" && (
                      <button style={S.btnS} onClick={()=>setView("stats")}>Ver estadísticas</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════ COMPETICIÓN ════════════════════════ */}
          {view==="comp" && (
            <CompView
              comp={comp} setComp={setComp}
              allComps={allComps} setAllComps={setAllComps}
              saveComps={saveComps}
              selStyle={selStyle}
            />
          )}

          {/* ══════════════════════════ HISTORIAL ═══════════════════════════ */}
          {view==="history" && (
            <div>
              {/* Period tabs */}
              <div style={{ display:"flex", gap:4, marginBottom:22, flexWrap:"wrap" }}>
                {PERIODS.map(p => (
                  <button key={p.key} className="pbtn" onClick={()=>setPeriod(p.key)}
                    style={{ background:period===p.key?"#000":"#f0efeb", color:period===p.key?"#fff":"#888", border:period===p.key?"1.5px solid #000":"1.5px solid #ddd" }}>
                    {p.label}
                  </button>
                ))}
              </div>

              {filtered.length===0 ? (
                <div style={{ textAlign:"center", padding:"40px 0", color:"#ccc" }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>◎</div>
                  <div style={{ fontSize:11 }}>Sin sesiones en este período.</div>
                </div>
              ) : (
                <>
                  {/* Aggregate stats */}
                  <div style={{ ...S.mono, fontSize:9, letterSpacing:"0.15em", textTransform:"uppercase", color:"#bbb", marginBottom:12 }}>
                    {PERIODS.find(p=>p.key===period)?.label} · {filtered.length} sesiones
                  </div>
                  {/* Volume summary */}
                  {(() => {
                    const volSessions = filtered.filter(s=>s.mode==="volume");
                    const scoreSessions = filtered.filter(s=>s.mode!=="volume");
                    const volArrows = volSessions.flatMap(s=>s.rounds.flatMap(r=>r.arrows)).length;
                    return (
                      <>
                        {volSessions.length>0 && scoreSessions.length>0 && (
                          <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
                            <div style={{ ...S.mono, fontSize:9, color:"#888", background:"#f0f0ed", padding:"3px 8px" }}>◎ {scoreSessions.length} con puntos</div>
                            <div style={{ ...S.mono, fontSize:9, color:"#888", background:"#f0f0ed", padding:"3px 8px" }}>↗ {volSessions.length} solo volumen</div>
                          </div>
                        )}
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 24px", marginBottom:28 }}>
                          <StatBox label="Sesiones"       value={hStats.sessions_count} />
                          <StatBox label="Total flechas"  value={hStats.totalArrows} sub={volArrows>0?`${volArrows} solo vol.`:undefined} />
                          {scoreSessions.length>0 && <>
                            <StatBox label="Puntos"        value={hStats.totalPoints} />
                            <StatBox label="Media/flecha"  value={hStats.avg} />
                            <StatBox label="10s"           value={hStats.tens} sub={`${hStats.totalArrows?((hStats.tens/hStats.totalArrows)*100).toFixed(0):0}%`} />
                            <StatBox label="Mejor ronda"   value={hStats.bestRound} />
                          </>}
                        </div>
                      </>
                    );
                  })()}

                  {/* Volume line chart */}
                  {(() => {
                    const volWks = groupVolumeByWeek(filtered);
                    if (volWks.length < 2) return null;
                    const maxCount = Math.max(...volWks.map(w=>w.count), 1);
                    const W = 380; const H = 120; const PAD = 24;
                    const pts = volWks.map((w,i) => {
                      const x = PAD + (i/(volWks.length-1))*(W-PAD*2);
                      const y = H - PAD - ((w.count/maxCount)*(H-PAD*2));
                      return { x, y, w };
                    });
                    const pathD = pts.map((p,i)=>`${i===0?"M":"L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
                    // smooth curve using cubic bezier
                    const smoothD = pts.reduce((acc,p,i)=>{
                      if(i===0) return `M${p.x.toFixed(1)},${p.y.toFixed(1)}`;
                      const prev = pts[i-1];
                      const cpx = (prev.x+p.x)/2;
                      return acc+` C${cpx.toFixed(1)},${prev.y.toFixed(1)} ${cpx.toFixed(1)},${p.y.toFixed(1)} ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
                    },"");
                    const fillD = smoothD + ` L${pts[pts.length-1].x.toFixed(1)},${H-PAD} L${pts[0].x.toFixed(1)},${H-PAD} Z`;
                    return (
                      <div style={{ borderTop:"2px solid #000", paddingTop:16, marginBottom:28 }}>
                        <div style={{ ...S.mono, fontSize:9, letterSpacing:"0.15em", textTransform:"uppercase", color:"#bbb", marginBottom:4 }}>
                          Volumen de flechas por semana
                        </div>
                        <div style={{ ...S.mono, fontSize:8, color:"#ccc", marginBottom:12 }}>Total flechas (todas las sesiones)</div>
                        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow:"visible" }}>
                          {/* Grid lines */}
                          {[0,0.25,0.5,0.75,1].map(t => {
                            const y = H - PAD - t*(H-PAD*2);
                            const val = Math.round(maxCount*t);
                            return (
                              <g key={t}>
                                <line x1={PAD} y1={y} x2={W-PAD} y2={y} stroke="#eee" strokeWidth={1} />
                                <text x={PAD-4} y={y+3} textAnchor="end" fontSize={7} fontFamily="'DM Mono',monospace" fill="#bbb">{val}</text>
                              </g>
                            );
                          })}
                          {/* Fill area */}
                          <path d={fillD} fill="rgba(0,0,0,0.06)" />
                          {/* Line */}
                          <path d={smoothD} fill="none" stroke="#000" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                          {/* Dots + labels */}
                          {pts.map((p,i) => (
                            <g key={i}>
                              <circle cx={p.x} cy={p.y} r={3.5} fill="#000" />
                              <text x={p.x} y={p.y-7} textAnchor="middle" fontSize={7} fontFamily="'DM Mono',monospace" fill="#555" fontWeight="700">{p.w.count}</text>
                              <text x={p.x} y={H-4} textAnchor="middle" fontSize={6} fontFamily="'DM Mono',monospace" fill="#bbb">{p.w.label}</text>
                            </g>
                          ))}
                        </svg>
                      </div>
                    );
                  })()}

                  {/* Score avg line chart */}
                  {(() => {
                    const scoreWks = groupByWeek(filtered.filter(s=>s.mode!=="volume"));
                    if (scoreWks.length < 2) return null;
                    const avgs = scoreWks.map(w => w.arrows.length ? w.arrows.reduce((a,b)=>a+(b===10.5?11:b),0)/w.arrows.length : 0);
                    const maxAvg = 10; const minAvg = Math.max(0, Math.min(...avgs)-1);
                    const W = 380; const H = 100; const PAD = 24;
                    const pts = scoreWks.map((w,i) => {
                      const avg = avgs[i];
                      const x = PAD + (i/(scoreWks.length-1))*(W-PAD*2);
                      const y = H - PAD - ((avg-minAvg)/(maxAvg-minAvg))*(H-PAD*2);
                      return { x, y, avg, label:w.label };
                    });
                    const smoothD = pts.reduce((acc,p,i)=>{
                      if(i===0) return `M${p.x.toFixed(1)},${p.y.toFixed(1)}`;
                      const prev = pts[i-1];
                      const cpx = (prev.x+p.x)/2;
                      return acc+` C${cpx.toFixed(1)},${prev.y.toFixed(1)} ${cpx.toFixed(1)},${p.y.toFixed(1)} ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
                    },"");
                    const fillD = smoothD + ` L${pts[pts.length-1].x.toFixed(1)},${H-PAD} L${pts[0].x.toFixed(1)},${H-PAD} Z`;
                    return (
                      <div style={{ borderTop:"2px solid #000", paddingTop:16, marginBottom:28 }}>
                        <div style={{ ...S.mono, fontSize:9, letterSpacing:"0.15em", textTransform:"uppercase", color:"#bbb", marginBottom:4 }}>
                          Evolución media/flecha por semana
                        </div>
                        <div style={{ ...S.mono, fontSize:8, color:"#ccc", marginBottom:12 }}>Solo sesiones con puntuación</div>
                        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow:"visible" }}>
                          {[minAvg, (minAvg+maxAvg)/2, maxAvg].map(t => {
                            const y = H - PAD - ((t-minAvg)/(maxAvg-minAvg))*(H-PAD*2);
                            return (
                              <g key={t}>
                                <line x1={PAD} y1={y} x2={W-PAD} y2={y} stroke="#eee" strokeWidth={1} />
                                <text x={PAD-4} y={y+3} textAnchor="end" fontSize={7} fontFamily="'DM Mono',monospace" fill="#bbb">{t.toFixed(1)}</text>
                              </g>
                            );
                          })}
                          <path d={fillD} fill="rgba(0,0,0,0.06)" />
                          <path d={smoothD} fill="none" stroke="#000" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                          {pts.map((p,i) => (
                            <g key={i}>
                              <circle cx={p.x} cy={p.y} r={3.5} fill="#000" />
                              <text x={p.x} y={p.y-7} textAnchor="middle" fontSize={7} fontFamily="'DM Mono',monospace" fill="#555" fontWeight="700">{p.avg.toFixed(1)}</text>
                              <text x={p.x} y={H-4} textAnchor="middle" fontSize={6} fontFamily="'DM Mono',monospace" fill="#bbb">{p.label}</text>
                            </g>
                          ))}
                        </svg>
                      </div>
                    );
                  })()}

                  {/* Score distribution */}
                  <div style={{ borderTop:"2px solid #000", paddingTop:16, marginBottom:28 }}>
                    <div style={{ ...S.mono, fontSize:9, letterSpacing:"0.15em", textTransform:"uppercase", color:"#bbb", marginBottom:12 }}>
                      Distribución histórica
                    </div>
                    {[10.5,10,9,8,7,6,5,4,3,2,1,0].map(score => (
                      <BarRow key={score} score={score} count={hStats.allArrows.filter(a=>a===score).length} total={hStats.totalArrows} />
                    ))}
                  </div>

                  {/* Sessions list */}
                  <div style={{ borderTop:"2px solid #000", paddingTop:16 }}>
                    <div style={{ ...S.mono, fontSize:9, letterSpacing:"0.15em", textTransform:"uppercase", color:"#bbb", marginBottom:12 }}>
                      Sesiones registradas
                    </div>
                    {[...filtered].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(s => {
                      const isVol   = s.mode==="volume";
                      const sArrows = s.rounds.flatMap(r=>r.arrows);
                      const sTotal  = sArrows.reduce((a,b)=>a+(b===10.5?11:b),0);
                      const sAvg    = (!isVol && sArrows.length) ? (sTotal/sArrows.length).toFixed(1) : null;
                      const isOpen  = openId===s.id;
                      return (
                        <div key={s.id} style={{ borderBottom:"1px solid #eee" }}>
                          <div className="rh tap" onClick={()=>setOpenId(isOpen?null:s.id)}
                            style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0", gap:10 }}>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                                <div style={{ ...S.mono, fontSize:12, fontWeight:700 }}>{s.date}</div>
                                <div style={{ ...S.mono, fontSize:8, color: isVol?"#888":"#bbb", background: isVol?"#f0f0ed":"#f5f5f5", padding:"1px 6px", letterSpacing:"0.08em" }}>
                                  {isVol?"↗ volumen":"◎ puntos"}
                                </div>
                              </div>
                              <div style={{ ...S.mono, fontSize:9, color:"#888" }}>
                                {s.distance} · {s.rounds.length} series · {sArrows.length} flechas
                              </div>
                              {s.mentalGoal && (
                                <div style={{ ...S.mono, fontSize:9, color:"#bbb", marginTop:2, fontStyle:"italic" }}>"{s.mentalGoal}"</div>
                              )}
                            </div>
                            <div style={{ textAlign:"right", flexShrink:0 }}>
                              {isVol ? (
                                <>
                                  <div style={{ ...S.serif, fontSize:24, fontWeight:700 }}>{sArrows.length}</div>
                                  <div style={{ ...S.mono, fontSize:9, color:"#aaa" }}>flechas</div>
                                </>
                              ) : (
                                <>
                                  <div style={{ ...S.serif, fontSize:24, fontWeight:700 }}>{sTotal}</div>
                                  <div style={{ ...S.mono, fontSize:9, color:"#aaa" }}>~{sAvg}/↗</div>
                                </>
                              )}
                            </div>
                          </div>

                          {isOpen && (
                            <div style={{ paddingBottom:14 }}>
                              {s.rounds.map(r => (
                                <div key={r.id} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                                  <span style={{ fontSize:9, color:"#ccc", width:16 }}>S{r.roundNum}</span>
                                  {isVol ? (
                                    <div style={{ ...S.mono, fontSize:11, background:"#f0f0ed", padding:"2px 8px" }}>
                                      {r.count} flechas
                                    </div>
                                  ) : (
                                    <>
                                      <div style={{ display:"flex", gap:3, flexWrap:"wrap" }}>
                                        {r.arrows.map((a,i) => <ScoreCircle key={i} points={a} />)}
                                      </div>
                                      <span style={{ ...S.mono, fontSize:11, fontWeight:700, marginLeft:"auto" }}>{r.total}</span>
                                    </>
                                  )}
                                </div>
                              ))}
                              {s.fatigueArrow && (
                                <div style={{ ...S.mono, fontSize:9, color:"#bbb", marginTop:8 }}>
                                  Fatiga declarada: flecha {s.fatigueArrow}
                                </div>
                              )}
                              <div style={{ display:"flex", gap:8, marginTop:12 }}>
                                <button style={{ ...S.btnS, flex:1, fontSize:10, padding:"8px 12px" }} onClick={()=>editSession(s)}>
                                  Editar
                                </button>
                                <button style={{ ...S.btnS, flex:1, fontSize:10, padding:"8px 12px", color:"#c00", borderColor:"#fcc" }}
                                  onClick={()=>delSession(s.id)}>
                                  Eliminar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </>
  );
}
