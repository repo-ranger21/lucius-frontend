export const CSS = `
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
