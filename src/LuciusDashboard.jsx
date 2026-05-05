import { useState, useEffect } from "react";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Russo+One&family=Nunito:wght@400;500;600;700;800&family=Fira+Code:wght@400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
::-webkit-scrollbar{width:3px;}
::-webkit-scrollbar-track{background:rgba(255,255,255,0.02);}
::-webkit-scrollbar-thumb{background:rgba(79,142,247,0.25);border-radius:2px;}

.l-root{
  background:
    radial-gradient(ellipse at 12% 8%, rgba(79,142,247,0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 88% 92%, rgba(57,217,138,0.05) 0%, transparent 50%),
    #040608;
}
.bg-grid{
  position:fixed;inset:0;pointer-events:none;z-index:0;
  background-image:
    linear-gradient(rgba(79,142,247,0.035) 1px, transparent 1px),
    linear-gradient(90deg,rgba(79,142,247,0.035) 1px, transparent 1px);
  background-size:48px 48px;
}

.card{
  background:linear-gradient(145deg,rgba(11,16,26,0.97) 0%,rgba(7,10,16,0.97) 100%);
  border:1px solid rgba(79,142,247,0.13);
  border-radius:14px;position:relative;overflow:hidden;
  transition:border-color 0.2s,box-shadow 0.2s;
}
.card:hover{border-color:rgba(79,142,247,0.3);box-shadow:0 0 24px rgba(79,142,247,0.04);}
.card-topline::before{
  content:'';position:absolute;top:0;left:15%;right:15%;height:1px;
  background:linear-gradient(90deg,transparent,rgba(79,142,247,0.55),transparent);
}
.card-crit{border-color:rgba(255,68,101,0.28)!important;}
.card-crit::before{background:linear-gradient(90deg,transparent,rgba(255,68,101,0.6),transparent)!important;}

.nav-link{
  display:flex;align-items:center;gap:10px;padding:10px 14px;
  border-radius:9px;cursor:pointer;transition:all 0.18s;
  color:rgba(209,220,240,0.28);font-size:12px;font-weight:700;
  letter-spacing:0.06em;text-transform:uppercase;
  border:1px solid transparent;user-select:none;
}
.nav-link:hover{color:rgba(209,220,240,0.7);background:rgba(79,142,247,0.07);}
.nav-link.on{color:#4F8EF7;background:rgba(79,142,247,0.11);border-color:rgba(79,142,247,0.22);}

.alert-row{
  padding:13px 0;border-bottom:1px solid rgba(79,142,247,0.07);
  transition:background 0.15s;
}
.alert-row:last-child{border-bottom:none;}

.badge{
  font-family:'Fira Code',monospace;font-size:9px;font-weight:600;
  padding:2px 7px;border-radius:4px;letter-spacing:0.1em;text-transform:uppercase;
}

.resolve-btn{
  font-family:'Fira Code',monospace;font-size:10px;font-weight:600;
  padding:3px 11px;border-radius:5px;letter-spacing:0.06em;cursor:pointer;
  background:transparent;border:1px solid rgba(79,142,247,0.28);
  color:#4F8EF7;transition:all 0.15s;
}
.resolve-btn:hover{background:rgba(79,142,247,0.12);border-color:rgba(79,142,247,0.65);}

.health-track{height:3px;border-radius:2px;background:rgba(255,255,255,0.05);overflow:hidden;}
.health-fill{height:100%;border-radius:2px;transition:width 1s cubic-bezier(0.23,1,0.32,1);}

/* Animations */
.pulse{animation:pulse 2.4s ease-in-out infinite;}
.blink{animation:blink 1.5s ease-in-out infinite;}
.spin{animation:spin 18s linear infinite;transform-origin:center;}
.fade-in{animation:fadeUp 0.4s ease both;}

.scan-beam{
  position:absolute;top:0;left:0;right:0;height:1px;pointer-events:none;z-index:5;
  background:linear-gradient(90deg,transparent,rgba(79,142,247,0.65),transparent);
  animation:scanDown 6s ease-in-out 1s infinite;
}

@keyframes fadeUp{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
@keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.35;}}
@keyframes blink{0%,100%{opacity:1;}50%{opacity:0.15;}}
@keyframes spin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
@keyframes scanDown{0%{top:0;opacity:0;}3%{opacity:1;}96%{opacity:1;}100%{top:100%;opacity:0;}}
@keyframes countIn{from{opacity:0;transform:scale(0.82);}to{opacity:1;transform:scale(1);}}
@keyframes ringPop{0%,100%{opacity:0.2;}50%{opacity:0.55;}}
@keyframes shimmerSlide{0%{background-position:-100% 0;}100%{background-position:200% 0;}}
`;

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  blue: '#4F8EF7', blueD: 'rgba(79,142,247,0.12)', blueB: 'rgba(79,142,247,0.35)',
  green: '#39D98A', greenD: 'rgba(57,217,138,0.1)',
  orange: '#FF9B43', orangeD: 'rgba(255,155,67,0.1)',
  red: '#FF4465', redD: 'rgba(255,68,101,0.1)',
  text: '#D1DCF0', muted: 'rgba(209,220,240,0.38)', dim: 'rgba(209,220,240,0.18)',
};
const sevC = s => s==='crit' ? C.red : s==='warn' ? C.orange : C.blue;
const healthC = n => n>=80 ? C.green : n>=55 ? C.orange : C.red;
const riskC = n => n<=30 ? C.green : n<=60 ? C.orange : C.red;
const riskLabel = n => n<=30 ? 'LOW RISK' : n<=60 ? 'MODERATE' : 'HIGH RISK';

// ── Data ──────────────────────────────────────────────────────────────────────
const INIT_ALERTS = [
  { id:1, sev:'crit', time:'2m ago', title:'Brute-force attack blocked',
    detail:'247 failed logins from 185.220.101.x (Tor exit node, RU). Rate-limiting applied. No breach. Admin notified.',
    tag:'AUTH', tagC:[C.red,'rgba(255,68,101,0.1)'], done:false },
  { id:2, sev:'warn', time:'19m ago', title:'Vulnerable plugin on your site',
    detail:'Contact Form 7 v5.7.1 has a known CSRF exploit. A one-click patch is available — takes 30 seconds.',
    tag:'WORDPRESS', tagC:[C.orange,'rgba(255,155,67,0.1)'], done:false },
  { id:3, sev:'warn', time:'1h ago', title:'After-hours file access detected',
    detail:"Your admin account opened 14 donor records at 2:14 AM. If this wasn't you, change your password now.",
    tag:'BEHAVIOR', tagC:[C.orange,'rgba(255,155,67,0.1)'], done:false },
  { id:4, sev:'info', time:'3h ago', title:'SSL certificate expiring in 18 days',
    detail:'Auto-renewal is OFF for schoolofamericansafety.org. Enable it in Cloudflare to prevent a hard outage.',
    tag:'SSL', tagC:[C.blue,C.blueD], done:false },
  { id:5, sev:'info', time:'5h ago', title:'New device signed in to Google Workspace',
    detail:'Login from Providence, RI on an unrecognized Windows device. Verify this was you in Google Admin.',
    tag:'ACCESS', tagC:[C.blue,C.blueD], done:true },
];
const ASSETS = [
  { name:'schoolofamericansafety.org', type:'WEB',   score:72, sev:'warn' },
  { name:'Google Workspace',           type:'CLOUD',  score:94, sev:'good' },
  { name:'Admin Panel',                type:'APP',    score:41, sev:'crit' },
  { name:'Email (SPF+DKIM)',           type:'EMAIL',  score:88, sev:'good' },
  { name:'Cloudflare Pages',           type:'EDGE',   score:97, sev:'good' },
  { name:'Render API (FastAPI)',        type:'API',    score:91, sev:'good' },
];
const TREND = [{d:'M',v:12},{d:'T',v:8},{d:'W',v:24},{d:'T',v:6},{d:'F',v:19},{d:'S',v:4},{d:'S',v:3}];
const NAVS = [
  {id:'command',icon:'◈',label:'Command'},
  {id:'alerts', icon:'⚡',label:'Alerts'},
  {id:'assets', icon:'◎',label:'Assets'},
  {id:'topology',icon:'⬡',label:'Topology'},
  {id:'intel',  icon:'◉',label:'Intel'},
];

// ── Risk Gauge ────────────────────────────────────────────────────────────────
function RiskGauge({ score }) {
  const R = 72, circ = 2 * Math.PI * R;
  const filled = (score / 100) * circ;
  const col = riskC(score);
  const ticks = Array.from({ length: 40 }, (_, i) => {
    const angle = (i / 40) * 360;
    const rad = (angle * Math.PI) / 180;
    const r1 = 90, r2 = 94;
    return {
      x1: 100 + r1 * Math.cos(rad - Math.PI/2), y1: 100 + r1 * Math.sin(rad - Math.PI/2),
      x2: 100 + r2 * Math.cos(rad - Math.PI/2), y2: 100 + r2 * Math.sin(rad - Math.PI/2),
      major: i % 5 === 0,
    };
  });

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'20px 12px 8px' }}>
      <div style={{ position:'relative', width:200, height:200 }}>

        {/* Spinning outer dashes */}
        <svg className="spin" style={{ position:'absolute', inset:0, width:'100%', height:'100%' }} viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="97" fill="none" stroke="rgba(79,142,247,0.1)" strokeWidth="1" strokeDasharray="4 8" />
        </svg>

        {/* Tick marks */}
        <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%' }} viewBox="0 0 200 200">
          {ticks.map((t, i) => (
            <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
              stroke={t.major ? 'rgba(79,142,247,0.4)' : 'rgba(79,142,247,0.14)'}
              strokeWidth={t.major ? 1.5 : 0.8} />
          ))}
        </svg>

        {/* Main gauge SVG */}
        <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', transform:'rotate(-90deg)' }} viewBox="0 0 200 200">
          {/* Track */}
          <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="9" />
          {/* Score arc */}
          <circle cx="100" cy="100" r={R} fill="none" stroke={col} strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circ}`}
            style={{ filter:`drop-shadow(0 0 8px ${col})`, transition:'stroke-dasharray 1.2s cubic-bezier(0.23,1,0.32,1)' }}
          />
          {/* Inner decoration rings */}
          <circle cx="100" cy="100" r="56" fill="none" stroke="rgba(79,142,247,0.07)" strokeWidth="1" />
          <circle cx="100" cy="100" r="62" fill="none" stroke="rgba(79,142,247,0.04)" strokeWidth="1" />
          {/* Pulsing outer glow ring */}
          <circle cx="100" cy="100" r="78" fill="none"
            stroke={`${col}30`} strokeWidth="2"
            style={{ animation:'ringPop 3s ease-in-out infinite' }} />
        </svg>

        {/* Center text */}
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:1 }}>
          <div style={{ fontFamily:"'Russo One',sans-serif", fontSize:54, lineHeight:1, color:col,
            textShadow:`0 0 28px ${col}55`, animation:'countIn 0.9s cubic-bezier(0.23,1,0.32,1) both' }}>
            {score}
          </div>
          <div style={{ fontFamily:"'Fira Code',monospace", fontSize:9, color:C.muted, letterSpacing:'0.16em', textTransform:'uppercase', marginTop:3 }}>
            Risk Score
          </div>
          <div style={{ fontFamily:"'Fira Code',monospace", fontSize:8, color:col, letterSpacing:'0.08em', marginTop:2 }}>
            ● {riskLabel(score)}
          </div>
        </div>
      </div>

      {/* Sub-stats */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, width:'100%', padding:'0 8px', marginTop:4 }}>
        {[{l:'Threats Blocked',v:'247',c:C.green},{l:'Open Issues',v:'4',c:C.orange}].map(s=>(
          <div key={s.l} style={{ background:'rgba(79,142,247,0.04)', border:'1px solid rgba(79,142,247,0.1)', borderRadius:9, padding:'9px 12px' }}>
            <div style={{ fontFamily:"'Fira Code',monospace", fontSize:8, color:C.dim, letterSpacing:'0.08em', marginBottom:4, textTransform:'uppercase' }}>{s.l}</div>
            <div style={{ fontFamily:"'Russo One',sans-serif", fontSize:22, color:s.c, textShadow:`0 0 14px ${s.c}44` }}>{s.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color, icon, delay=0 }) {
  return (
    <div className="card card-topline fade-in" style={{ padding:'20px 22px', animationDelay:`${delay}ms` }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
        <div style={{ fontFamily:"'Fira Code',monospace", fontSize:9, color:C.muted, letterSpacing:'0.14em', textTransform:'uppercase' }}>{label}</div>
        <div style={{ fontSize:18, opacity:0.22 }}>{icon}</div>
      </div>
      <div style={{ fontFamily:"'Russo One',sans-serif", fontSize:42, lineHeight:1, color, textShadow:`0 0 18px ${color}44`, marginBottom:10 }}>
        {value}
      </div>
      <div style={{ fontSize:11, fontWeight:600, color:C.muted }}>{sub}</div>
    </div>
  );
}

// ── Alert Row ─────────────────────────────────────────────────────────────────
function AlertRow({ a, resolve, idx }) {
  const c = sevC(a.sev);
  return (
    <div className="alert-row fade-in" style={{ opacity: a.done ? 0.38 : 1, animationDelay:`${idx*55}ms` }}>
      <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
        <div style={{ marginTop:4, flexShrink:0 }}>
          <div className={!a.done && a.sev==='crit' ? 'pulse' : ''}
            style={{ width:8, height:8, borderRadius:'50%', background:c,
              boxShadow: a.done ? 'none' : `0 0 7px ${c}` }} />
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:5 }}>
            <span style={{ fontSize:13, fontWeight:800, color: a.done ? C.muted : C.text }}>{a.title}</span>
            <span className="badge" style={{ color:a.tagC[0], background:a.tagC[1], border:`1px solid ${a.tagC[0]}33` }}>{a.tag}</span>
          </div>
          <div style={{ fontSize:12, color:C.muted, lineHeight:1.55, marginBottom:7 }}>{a.detail}</div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ fontFamily:"'Fira Code',monospace", fontSize:10, color:C.dim }}>{a.time}</span>
            {!a.done
              ? <button className="resolve-btn" onClick={()=>resolve(a.id)}>RESOLVE →</button>
              : <span style={{ fontFamily:"'Fira Code',monospace", fontSize:10, color:C.green }}>✓ RESOLVED</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Asset Row ─────────────────────────────────────────────────────────────────
function AssetRow({ a, idx }) {
  const sc = healthC(a.score);
  const sevCol = a.sev==='crit' ? C.red : a.sev==='warn' ? C.orange : C.green;
  return (
    <div className="fade-in" style={{ padding:'9px 0', borderBottom:'1px solid rgba(79,142,247,0.06)', animationDelay:`${idx*40}ms` }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:6, height:6, borderRadius:'50%', background:sevCol, flexShrink:0,
          boxShadow: a.sev!=='good'?`0 0 5px ${sevCol}`:'none' }} />
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
            <span style={{ fontSize:11, fontWeight:700, color:C.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:155 }}>{a.name}</span>
            <span style={{ fontFamily:"'Fira Code',monospace", fontSize:11, color:sc, fontWeight:600 }}>{a.score}</span>
          </div>
          <div className="health-track">
            <div className="health-fill" style={{ width:`${a.score}%`, background:`linear-gradient(90deg,${sc}77,${sc})` }} />
          </div>
        </div>
        <span style={{ fontFamily:"'Fira Code',monospace", fontSize:9, color:C.dim, letterSpacing:'0.08em', flexShrink:0, width:38, textAlign:'right' }}>{a.type}</span>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function LuciusDashboard() {
  const [nav, setNav] = useState('command');
  const [time, setTime] = useState(new Date());
  const [alerts, setAlerts] = useState(INIT_ALERTS);

  useEffect(() => { const t=setInterval(()=>setTime(new Date()),1000); return()=>clearInterval(t); }, []);
  const resolve = id => setAlerts(p => p.map(a => a.id===id ? {...a,done:true} : a));

  const activeAlerts = alerts.filter(a=>!a.done).length;
  const critCount = alerts.filter(a=>a.sev==='crit'&&!a.done).length;
  const tStr = time.toLocaleTimeString('en-US',{hour12:false});
  const dStr = time.toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'});

  return (
    <>
      <style>{CSS}</style>
      <div className="l-root" style={{ display:'flex', height:'100vh', overflow:'hidden', color:C.text, fontFamily:"'Nunito',sans-serif", position:'relative' }}>
        <div className="bg-grid" />

        {/* ── SIDEBAR ──────────────────────────────────────── */}
        <div style={{ width:216, flexShrink:0, display:'flex', flexDirection:'column',
          background:'rgba(5,7,12,0.92)', backdropFilter:'blur(16px)',
          borderRight:'1px solid rgba(79,142,247,0.09)', zIndex:10, padding:'22px 12px', position:'relative' }}>

          {/* Logo */}
          <div style={{ padding:'0 8px 28px' }}>
            <div style={{ fontFamily:"'Russo One',sans-serif", fontSize:24, letterSpacing:'0.04em' }}>
              <span style={{ color:C.blue }}>LUCI</span><span style={{ color:C.text }}>US</span>
            </div>
            <div style={{ fontFamily:"'Fira Code',monospace", fontSize:9, color:C.dim, letterSpacing:'0.14em', marginTop:3 }}>
              SECOPS ENGINE v2.4
            </div>
          </div>

          {/* Nav items */}
          <div style={{ display:'flex', flexDirection:'column', gap:3, flex:1 }}>
            {NAVS.map(item=>(
              <div key={item.id} className={`nav-link ${nav===item.id?'on':''}`} onClick={()=>setNav(item.id)}>
                <span style={{ fontSize:15, width:18, textAlign:'center' }}>{item.icon}</span>
                <span>{item.label}</span>
                {item.id==='alerts' && activeAlerts>0 && (
                  <span style={{ marginLeft:'auto', background: critCount?C.red:C.orange, color:'#fff',
                    fontSize:10, fontWeight:800, borderRadius:10, padding:'1px 7px' }}>{activeAlerts}</span>
                )}
              </div>
            ))}
          </div>

          {/* System status */}
          <div style={{ borderTop:'1px solid rgba(79,142,247,0.09)', paddingTop:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:10 }}>
              <div className="pulse" style={{ width:7, height:7, borderRadius:'50%', background:C.green, boxShadow:`0 0 7px ${C.green}` }} />
              <span style={{ fontFamily:"'Fira Code',monospace", fontSize:9, color:C.green, letterSpacing:'0.08em', fontWeight:600 }}>
                SYSTEMS NOMINAL
              </span>
            </div>
            <div style={{ fontFamily:"'Fira Code',monospace", fontSize:9, color:C.dim, lineHeight:1.9, letterSpacing:'0.04em' }}>
              <div>ENTERPRISE PROTECTION</div>
              <div style={{ color:'rgba(209,220,240,0.15)' }}>6 assets · last scan 4h ago</div>
            </div>
          </div>
        </div>

        {/* ── MAIN ─────────────────────────────────────────── */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', zIndex:1, position:'relative' }}>

          {/* Top bar */}
          <div style={{ height:58, display:'flex', alignItems:'center', justifyContent:'space-between',
            padding:'0 28px', borderBottom:'1px solid rgba(79,142,247,0.07)',
            background:'rgba(4,6,8,0.75)', backdropFilter:'blur(12px)', flexShrink:0 }}>
            <div>
              <div style={{ fontFamily:"'Russo One',sans-serif", fontSize:14, letterSpacing:'0.1em' }}>COMMAND CENTER</div>
              <div style={{ fontFamily:"'Fira Code',monospace", fontSize:10, color:C.dim, letterSpacing:'0.04em', marginTop:1 }}>
                Protecting Your Organization · Lucius SecOps
              </div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:18 }}>
              {critCount>0 && (
                <div className="blink" style={{ display:'flex', alignItems:'center', gap:7, padding:'5px 13px',
                  background:'rgba(255,68,101,0.08)', border:'1px solid rgba(255,68,101,0.28)', borderRadius:7 }}>
                  <span style={{ fontSize:11, color:C.red }}>⚠</span>
                  <span style={{ fontFamily:"'Fira Code',monospace", fontSize:10, color:C.red, fontWeight:600, letterSpacing:'0.06em' }}>
                    {critCount} CRITICAL ALERT{critCount>1?'S':''}
                  </span>
                </div>
              )}
              <div style={{ textAlign:'right' }}>
                <div style={{ fontFamily:"'Fira Code',monospace", fontSize:15, color:C.blue, letterSpacing:'0.04em', lineHeight:1 }}>{tStr}</div>
                <div style={{ fontFamily:"'Fira Code',monospace", fontSize:9, color:C.dim, marginTop:2, letterSpacing:'0.04em' }}>{dStr}</div>
              </div>
            </div>
          </div>

          {/* Page content */}
          <div style={{ flex:1, overflow:'auto', padding:'22px 28px', display:'flex', flexDirection:'column', gap:18 }}>

            {/* Row 1: Gauge + 3 stat cards */}
            <div style={{ display:'grid', gridTemplateColumns:'256px 1fr 1fr 1fr', gap:16, flexShrink:0 }}>
              {/* Gauge card */}
              <div className="card card-topline" style={{ gridRow:'span 1', display:'flex', flexDirection:'column' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 18px 0' }}>
                  <span style={{ fontFamily:"'Fira Code',monospace", fontSize:9, color:C.muted, letterSpacing:'0.14em', textTransform:'uppercase' }}>Overall Risk</span>
                  <span style={{ fontFamily:"'Fira Code',monospace", fontSize:9, color:C.green,
                    background:C.greenD, padding:'2px 9px', borderRadius:5, border:`1px solid ${C.green}33` }}>LIVE</span>
                </div>
                <RiskGauge score={34} />
              </div>

              <StatCard label="Threats Blocked" value="247" sub="↑ 12 since yesterday" color={C.green} icon="🛡" delay={80} />
              <StatCard label="Assets Protected" value="6" sub="All responding normally" color={C.blue} icon="◎" delay={160} />
              <StatCard label="Next Scheduled Scan" value="18h" sub="Daily · 2:00 AM" color={C.orange} icon="⟳" delay={240} />
            </div>

            {/* Row 2: Alert feed + right panel */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:16, flex:1, minHeight:0 }}>

              {/* Alert Feed */}
              <div className="card card-topline" style={{ display:'flex', flexDirection:'column', position:'relative', minHeight:0 }}>
                <div className="scan-beam" />
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'15px 20px 13px', borderBottom:'1px solid rgba(79,142,247,0.07)', flexShrink:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                    <span style={{ fontFamily:"'Russo One',sans-serif", fontSize:13, letterSpacing:'0.1em' }}>ALERT FEED</span>
                    <span style={{ fontFamily:"'Fira Code',monospace", fontSize:9, color:C.dim, letterSpacing:'0.04em' }}>
                      AI-translated · plain English
                    </span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span style={{ fontFamily:"'Fira Code',monospace", fontSize:10, color:C.muted }}>{activeAlerts} unresolved</span>
                    <div className={critCount>0?'pulse':''} style={{ width:8, height:8, borderRadius:'50%',
                      background: critCount>0?C.red:C.green, boxShadow: critCount>0?`0 0 7px ${C.red}`:`0 0 5px ${C.green}` }} />
                  </div>
                </div>
                <div style={{ flex:1, overflow:'auto', padding:'4px 20px' }}>
                  {alerts.map((a,i)=><AlertRow key={a.id} a={a} resolve={resolve} idx={i} />)}
                </div>
              </div>

              {/* Right column */}
              <div style={{ display:'flex', flexDirection:'column', gap:16, minHeight:0 }}>

                {/* Asset Health */}
                <div className="card card-topline" style={{ flex:1, display:'flex', flexDirection:'column', minHeight:0 }}>
                  <div style={{ padding:'15px 18px 11px', borderBottom:'1px solid rgba(79,142,247,0.07)', flexShrink:0,
                    display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontFamily:"'Russo One',sans-serif", fontSize:12, letterSpacing:'0.1em' }}>ASSET HEALTH</span>
                    <span style={{ fontFamily:"'Fira Code',monospace", fontSize:9, color:C.dim }}>{ASSETS.length} MONITORED</span>
                  </div>
                  <div style={{ flex:1, overflow:'auto', padding:'4px 18px' }}>
                    {ASSETS.map((a,i)=><AssetRow key={a.name} a={a} idx={i} />)}
                  </div>
                </div>

                {/* Weekly trend */}
                <div className="card card-topline" style={{ padding:'15px 18px', flexShrink:0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                    <span style={{ fontFamily:"'Russo One',sans-serif", fontSize:11, letterSpacing:'0.1em' }}>WEEKLY THREATS</span>
                    <span style={{ fontFamily:"'Fira Code',monospace", fontSize:9, color:C.green }}>↓ 72% vs last wk</span>
                  </div>
                  <div style={{ height:56 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={TREND}>
                        <defs>
                          <linearGradient id="blueGrad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor={C.blue} stopOpacity={0.6} />
                            <stop offset="100%" stopColor={C.blue} stopOpacity={1} />
                          </linearGradient>
                        </defs>
                        <Line type="monotone" dataKey="v" stroke="url(#blueGrad)" strokeWidth={2}
                          dot={{ r:2, fill:C.blue, strokeWidth:0 }}
                          activeDot={{ r:4, fill:C.blue, boxShadow:`0 0 6px ${C.blue}` }} />
                        <Tooltip contentStyle={{ background:'#0C1422', border:`1px solid rgba(79,142,247,0.25)`,
                          borderRadius:7, fontFamily:'Fira Code', fontSize:11, padding:'6px 10px' }}
                          itemStyle={{ color:C.blue }} labelStyle={{ color:C.muted }}
                          cursor={{ stroke:'rgba(79,142,247,0.2)' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
                    {TREND.map(t=>(
                      <span key={t.d} style={{ fontFamily:"'Fira Code',monospace", fontSize:8, color:C.dim }}>{t.d}</span>
                    ))}
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
