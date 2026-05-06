export const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Russo+One&family=Nunito:wght@400;500;600;700;800&family=Fira+Code:wght@400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
html,body,#root{max-width:100%;overflow-x:hidden;}
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

/* Mobile bottom nav */
.mobile-nav {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;
  background: rgba(5,7,12,0.97); backdrop-filter: blur(16px);
  border-top: 1px solid rgba(79,142,247,0.12);
  display: none;
  padding-bottom: env(safe-area-inset-bottom);
}
.mobile-nav-item {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; flex: 1; padding: 10px 4px 8px;
  cursor: pointer; gap: 4px; transition: all 0.15s;
  color: rgba(209,220,240,0.3); border: none; background: transparent;
  min-height: 56px; position: relative;
}
.mobile-nav-item.active { color: #4F8EF7; }
.mobile-nav-icon { font-size: 20px; line-height: 1; }
.mobile-nav-label { font-family: 'Fira Code', monospace; font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; }

/* Mobile content padding */
.mobile-content { padding-bottom: 72px !important; }
.command-main{min-height:0;}
.command-side{display:flex;flex-direction:column;gap:16px;min-height:0;}
.gauge-wrap{width:200px;max-width:100%;margin:0 auto;}
.command-alert-list{flex:1;overflow:auto;padding:4px 20px;}
.alert-page-header{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-shrink:0;}
.alert-filter-row{display:flex;gap:6px;}
.alert-filter-btn{flex-shrink:0;}
.alert-toolbar{padding:14px 20px 12px;border-bottom:1px solid rgba(79,142,247,0.07);display:flex;justify-content:space-between;align-items:center;gap:12px;flex-shrink:0;}
.bulk-resolve-btn{width:auto;}
.mobile-alert-row{opacity:1;}
.alert-action-btn{min-height:auto;}
.scan-header{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-shrink:0;}
.scan-button{min-width:138px;}
.asset-score{font-size:36px;}
.intel-grid{display:grid;grid-template-columns:3fr 2fr;gap:18px;flex:1;min-height:0;}
.intel-panel{display:flex;flex-direction:column;min-height:0;}
.proxy-header{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-shrink:0;}
.proxy-stats{display:flex;gap:10px;flex-shrink:0;}
.proxy-codeblock{display:flex;justify-content:space-between;align-items:center;gap:0;}
.proxy-form{display:flex;gap:10px;flex-wrap:wrap;}

.health-track{height:3px;border-radius:2px;background:rgba(255,255,255,0.05);overflow:hidden;}
.health-fill{height:100%;border-radius:2px;transition:width 1s cubic-bezier(0.23,1,0.32,1);}

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

@media (max-width: 768px) {
  .mobile-nav { display: flex !important; }
  .desktop-sidebar { display: none !important; }
  .desktop-topbar { padding: 0 16px !important; height: 52px !important; }
  .stat-grid { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
  .content-grid { grid-template-columns: 1fr !important; }
  .command-main { order: 2; }
  .command-side { order: 1; gap: 10px !important; }
  .command-alert-list { max-height: 400px; }
  .gauge-wrap { width: 160px !important; }
  .asset-grid { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
  .scan-header { flex-direction: column !important; align-items: flex-start !important; }
  .scan-button { width: 100% !important; }
  .asset-score { font-size: 28px !important; }
  .alert-page-header { flex-direction: column !important; align-items: stretch !important; gap: 12px !important; }
  .alert-filter-row { overflow-x: auto !important; flex-wrap: nowrap !important; width: 100% !important; padding-bottom: 4px; }
  .alert-filter-btn { min-width: 70px !important; }
  .alert-toolbar { flex-direction: column !important; align-items: stretch !important; }
  .bulk-resolve-btn { width: 100% !important; }
  .mobile-alert-row { padding: 16px 0 !important; }
  .alert-action-btn { min-height: 44px !important; }
  .intel-grid { grid-template-columns: 1fr !important; gap: 10px !important; }
  .intel-panel { min-height: 300px !important; }
  .proxy-header { flex-direction: column !important; align-items: stretch !important; gap: 12px !important; }
  .proxy-stats { display: none !important; }
  .proxy-codeblock { flex-direction: column !important; align-items: stretch !important; gap: 10px !important; }
  .proxy-form { flex-direction: column !important; }
  .page-padding { padding: 14px 16px !important; }
  .gauge-card { grid-column: span 2 !important; }
  .l-root { overflow-x: hidden !important; }
  .card { max-width: 100%; }
  .resolve-btn { min-height: 44px !important; font-size: 11px !important; padding: 0 14px !important; }
  button, input, select, textarea { min-height: 44px; }
  .badge { font-size: 11px; }
}
`;

export const FONTS = {
  display: "'Russo One',sans-serif",
  mono: "'Fira Code',monospace",
  body: "'Nunito',sans-serif",
};

export const C = {
  blue: '#4F8EF7', blueD: 'rgba(79,142,247,0.12)', blueB: 'rgba(79,142,247,0.35)',
  green: '#39D98A', greenD: 'rgba(57,217,138,0.1)',
  orange: '#FF9B43', orangeD: 'rgba(255,155,67,0.1)',
  red: '#FF4465', redD: 'rgba(255,68,101,0.1)',
  text: '#D1DCF0', muted: 'rgba(209,220,240,0.38)', dim: 'rgba(209,220,240,0.18)',
};

export const sevColor = s =>
  s === 'critical' || s === 'crit' ? C.red :
  s === 'warning'  || s === 'warn' ? C.orange : C.blue;

export const healthColor = n => n >= 80 ? C.green : n >= 55 ? C.orange : C.red;
export const riskColor   = n => n <= 30 ? C.green : n <= 60 ? C.orange : C.red;
export const riskLabel   = n => n <= 30 ? 'LOW RISK' : n <= 60 ? 'MODERATE' : 'HIGH RISK';
