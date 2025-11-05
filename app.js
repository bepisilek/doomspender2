/* =======================================================================
   TINY HELPERS
   ======================================================================= */
const $=s=>document.querySelector(s);
const $$=s=>Array.from(document.querySelectorAll(s));
const esc=s=>(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
const fmtFt=v=>new Intl.NumberFormat("hu-HU",{style:"currency",currency:"HUF",maximumFractionDigits:0}).format(Number(v||0));
const now=()=>Date.now();
const MONTHS=["01","02","03","04","05","06","07","08","09","10","11","12"];

/* =======================================================================
   DATA LAYER + MIGRATION
   ======================================================================= */
const schemaVersion=2;
const Data={
  get:(k)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):null}catch(e){return null}},
  set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}},
  del:(k)=>localStorage.removeItem(k),
  migrate(){
    const v=Data.get("__schema")||1;
    if(v<2){
      ["saved","spent"].forEach(key=>{
        const arr=Data.get(key)||[];
        arr.forEach(it=>{
          if(!it.at) it.at=now();
          if(it.name && typeof it.name!=="string") it.name=String(it.name);
          if(!it.type) it.type=key;
          if(typeof it.price!=="number") it.price=Number(it.price)||0;
          if(typeof it.hours!=="number") it.hours=Number(it.hours)||0;
        });
        Data.set(key,arr);
      });
      Data.set("__schema",2);
    }
  }
};

const API={
  profile:()=>Data.get("profile"),
  saveProfile:(p)=>Data.set("profile",p),
  deleteProfile:()=>{["profile","saved","spent","goals"].forEach(Data.del)},
  list:(type)=>{
    const list=Data.get(type)||[];
    return list.map(it=>({...it,type:it.type||type}));
  },
  add:(type,item)=>{
    const list=Data.get(type)||[];
    const normalized={
      name:item.name||"",
      price:Number(item.price)||0,
      hours:Number(item.hours)||0,
      at:now(),
      type
    };
    list.unshift(normalized);
    Data.set(type,list);
  },
  setList:(type,list)=>{
    const normalized=list.map(it=>({
      ...it,
      type:it.type||type,
      price:Number(it.price)||0,
      hours:Number(it.hours)||0
    }));
    Data.set(type,normalized);
  },
  clearLists:()=>{Data.set("saved",[]);Data.set("spent",[])},
  goals:()=>Data.get("goals")||{monthlyCap:0,savingGoal:0},
  saveGoals:(g)=>Data.set("goals",g),
  exportAll:()=>({__schema:schemaVersion,profile:API.profile(),saved:API.list("saved"),spent:API.list("spent"),goals:API.goals()}),
  importAll:(obj)=>{
    if(!obj||typeof obj!=="object") throw new Error("Érvénytelen JSON");
    if(obj.__schema && obj.__schema>schemaVersion) throw new Error("Újabb sémájú adat – frissítsd az appot!");
    if(obj.profile) Data.set("profile",obj.profile);
    if(Array.isArray(obj.saved)) Data.set("saved",obj.saved);
    if(Array.isArray(obj.spent)) Data.set("spent",obj.spent);
    if(obj.goals) Data.set("goals",obj.goals);
    Data.set("__schema",schemaVersion);
  }
};

/* =======================================================================
   COACH BUBBLE CONTEXTUAL MESSAGES
   ======================================================================= */
const COACH_CONTEXTS={
  startup:[
    "Szia Lajos! Nézzük, mennyi időt dolgoztál a vágyaidért. ⏳",
    "Üdv újra, Lajos! Készen állsz egy kis pénzügyi matekra? 📈",
    "Szia Lajos! Mutasd, mire gyűjtöttél mostanában. 💼"
  ],
  save:[
    "Szépen spórolsz, Lajos! 💰",
    "Ez igen, újabb munkaóra megmentve! 🙌",
    "Szuper döntés, Lajos – így épül a tartalék. 🛡️",
    "Most tényleg közelebb kerültél a célodhoz! 🏁"
  ],
  spend:[
    "Hát ez most elment, de legalább hasznos volt. 😉",
    "Megérte? Gondold át legközelebb! 💸",
    "Egy kis öröm most, több munkaórád ment el. ⏱️",
    "Oké, Lajos, de holnap spórolós nap jön! 😅"
  ],
  results:[
    "Itt az eredmény, Lajos! 📊",
    "Nézd meg, mennyit haladtál! 🚀",
    "A számok nem hazudnak – ez a mérleged most. ⚖️",
    "Ez a teljesítményed összefoglalva. 📘"
  ]
};

/* =======================================================================
   SZIA LAJOS! ACTION MESSAGES
   ======================================================================= */
const positiveMessages=[
  "Szia Lajos, most épp egy lépéssel közelebb vagy a szabadsághoz.",
  "Okos döntés, Lajos – még pár ilyen, és lesz nyaralásod is.",
  "Spórolni nem menő, csak hasznos – és te most hasznos vagy.",
  "A jövőbeli Lajos koccint rád egy ásványvízzel.",
  "A bankszámlád hálás, még ha nem is tud beszélni.",
  "Na látod, működik az önuralom, nem csak legenda.",
  "Lassan, de biztosan, Lajos – a türelem forintot terem.",
  "Egy kicsit most gazdagabb vagy, még ha csak lélekben is.",
  "Szia Lajos, ez volt a felnőtt élet első jele.",
  "Ha minden nap így döntesz, egyszer te leszel a motivációs poszt."
];

const negativeMessages=[
  "Megvetted? Szép. A pénztárcád sír, de legalább te boldog vagy.",
  "Szia Lajos, most megint eladtad a jövőd egy kávéért.",
  "Gratulálok, a célod most épp hátrébb lépett kettőt.",
  "Nem baj, legalább gazdagabb lettél tapasztalatban.",
  "A spórolás várhat – mondta még senki, aki elérte a célját.",
  "Lajos, a költekezés öröm – rövid távon.",
  "Még egy ilyen döntés, és a célod már csak mese lesz.",
  "Ha a pénz beszél, most épp azt mondta: viszlát.",
  "Jó választás lenne… egy másik univerzumban.",
  "Szia Lajos, a jövőbeli éned most épp kikapcsolta a Wi-Fit, hogy ne lássa ezt."
];

/* =======================================================================
   UI HELPERS
   ======================================================================= */
const UI={
  snackTimer:null,
  coachTimer:null,
  coachDelayTimer:null,
  actionMessageTimer:null,
  snack(msg,withUndo,undoFn){
    const s=$("#snack");
    if(this.snackTimer){clearTimeout(this.snackTimer); this.snackTimer=null;}
    s.classList.remove("hidden"); s.innerHTML="";
    const t=document.createElement("span"); t.textContent=msg; s.appendChild(t);
    if(withUndo){
      const b=document.createElement("button");
      b.textContent="Visszavonás";
      b.addEventListener("click",()=>{
        if(undoFn) undoFn();
        s.classList.add("hidden");
        if(this.snackTimer){clearTimeout(this.snackTimer); this.snackTimer=null;}
      });
      s.appendChild(b);
    }
    this.snackTimer=setTimeout(()=>{
      s.classList.add("hidden");
      this.snackTimer=null;
    },3500);
  },
  coach(context,opts={}){
    const pool=COACH_CONTEXTS[context];
    if(!pool||!pool.length) return;
    const delay=Math.max(0,Number(opts.delay)||0);
    const duration=Math.max(1200,Number(opts.duration)||2800);
    const run=()=>{
      const b=$("#coach");
      if(!b) return;
      if(this.coachTimer){clearTimeout(this.coachTimer); this.coachTimer=null;}
      b.classList.remove("show");
      void b.offsetWidth;
      b.textContent=pool[Math.floor(Math.random()*pool.length)];
      b.classList.add("show");
      this.coachTimer=setTimeout(()=>{
        b.classList.remove("show");
        this.coachTimer=null;
      },duration);
    };
    if(this.coachDelayTimer){clearTimeout(this.coachDelayTimer); this.coachDelayTimer=null;}
    if(delay>0){
      this.coachDelayTimer=setTimeout(()=>{run(); this.coachDelayTimer=null;},delay);
    }else{
      run();
    }
  }
};

UI.showActionMessage=function(text,type){
  const target=document.querySelector('#action-message,[data-action-message]')||$("#funnyThreat");
  if(!target){
    console.warn("UI.showActionMessage: target element not found");
    return;
  }
  let kind=type;
  let message=text;
  if((message==="positive"||message==="negative")&&!kind){
    kind=message;
    message=null;
  }
  if(!message){
    const pool=kind==="positive"?positiveMessages:kind==="negative"?negativeMessages:[];
    if(pool.length){
      message=pool[Math.floor(Math.random()*pool.length)];
    }
  }
  if(!message){
    console.warn("UI.showActionMessage: no message to display");
    return;
  }
  if(UI.actionMessageTimer){
    clearTimeout(UI.actionMessageTimer);
    UI.actionMessageTimer=null;
  }
  target.classList.remove("show");
  void target.offsetWidth;
  target.textContent=message;
  target.classList.add("show");
  UI.actionMessageTimer=setTimeout(()=>{
    target.classList.remove("show");
    UI.actionMessageTimer=null;
  },2000);
};

/* =======================================================================
   APP
   ======================================================================= */
const App={
  state:{view:"calc",search:"",filter:"all",sort:"date_desc",lastAction:null},
  init(){
    Data.migrate();
    this.bindWelcome();
    this.bindProfileSetup();
    this.bindTabs();
    this.bindCalculator();
    this.bindResults();
    this.bindGoals();
    this.bindProfileModal();
    this.bindShortcuts();
    const p=API.profile();
    if(p){
      $("#welcomeScreen").classList.add("hidden");
      $("#appScreen").classList.remove("hidden");
      this.updateProfileIcon();
      this.syncCalcHello();
      UI.coach("startup",{delay:500});
    }
    this.setView("calc");
    this.renderResults();
    this.updateGoalsUI();
  },

  /* ---------- Flow: Welcome → Profile ---------- */
  bindWelcome(){
    const startBtn=$("#startBtn");
    const backBtn=$("#backToWelcome");
    if(startBtn) startBtn.addEventListener("click",()=>{
      $("#welcomeScreen").classList.add("hidden");
      $("#profileSetupScreen").classList.remove("hidden");
    });
    if(backBtn) backBtn.addEventListener("click",()=>{
      $("#profileSetupScreen").classList.add("hidden");
      $("#welcomeScreen").classList.remove("hidden");
    });
  },
  bindProfileSetup(){
    $("#saveSetupProfile").addEventListener("click",()=>{
      const profile={
        name:$("#setupName").value.trim(),
        age:Number($("#setupAge").value),
        salary:Number($("#setupSalary").value),
        hours:Number($("#setupHours").value)
      };
      if(!profile.name||!profile.age||!profile.salary||!profile.hours){alert("Tölts ki minden mezőt!");return;}
      API.saveProfile(profile);
      $("#profileSetupScreen").classList.add("hidden");
      $("#appScreen").classList.remove("hidden");
      this.updateProfileIcon(); this.syncCalcHello();
      UI.coach("startup",{delay:520});
    });
  },

  /* ---------- Tabs (no profile tab) ---------- */
  bindTabs(){
    $$(".tab").forEach(tab=>tab.addEventListener("click",()=>this.setView(tab.dataset.view)));
    $$('[data-view="calc"]').forEach(b=>b.addEventListener("click",()=>this.setView("calc")));
  },
  setView(v,opts={}){
    const {coachDelay=null,suppressCoach=false}=opts||{};
    this.state.view=v;
    $$(".tab").forEach(t=>t.classList.toggle("active",t.dataset.view===v));
    $("#view-calc").classList.toggle("hidden",v!=="calc");
    $("#view-results").classList.toggle("hidden",v!=="results");
    $("#view-stats").classList.toggle("hidden",v!=="stats");
    $("#view-goals").classList.toggle("hidden",v!=="goals");
    if(v==="results"){
      this.renderResults();
      if(!suppressCoach){
        let delay;
        if(typeof coachDelay==="number"&&coachDelay>=0){
          delay=coachDelay;
        }else if(this.state.lastAction&&this.state.lastAction.timestamp&&(Date.now()-this.state.lastAction.timestamp)<2600){
          delay=3200;
        }else{
          delay=220;
        }
        UI.coach("results",{delay});
      }
    }
    if(v==="stats") this.drawStats();
    if(v==="calc") this.syncCalcHello();
    const prefersReduced=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({top:0,behavior:prefersReduced?"auto":"smooth"});
  },

  /* ---------- Calculator ---------- */
  bindCalculator(){
    const calc=()=>{
      const p=API.profile(); if(!p){alert("Előbb töltsd ki a profilod!");return;}
      const name=$("#productName").value.trim(); const price=Number($("#productPrice").value);
      if(!name||!price||price<=0){alert("Add meg a termék nevét és árát!");return;}
      const hourly=p.salary/(p.hours*4); const hours=price/hourly;
      $("#workHoursText").textContent=`Kb. ${hours.toFixed(1)} munkaórádba kerülne (${fmtFt(price)}).`;
      $("#hourlyHint").textContent=`Jelenlegi órabéred ~ ${fmtFt(hourly)}/óra`;
      const r=$("#calcResult"); r.dataset.name=name; r.dataset.price=String(price); r.dataset.hours=String(hours); r.classList.remove("hidden");
    };
    $("#calculateBtn").addEventListener("click",calc);

    const commit=(type)=>{
      const r=$("#calcResult"); const name=r.dataset.name; const price=Number(r.dataset.price); const hours=Number(r.dataset.hours);
      if(!name||!price){alert("Előbb számolj!");return false;}
      API.add(type,{name,price,hours});
      const actionContext=type==="saved"?"save":"spend";
      const timestamp=now();
      this.state.lastAction={type,entry:{name,price,hours,at:timestamp},timestamp};
      this.setView("results",{coachDelay:3600});
      try{
        if(typeof UI.showActionMessage==="function"){
          UI.showActionMessage(type==="saved"?"positive":"negative");
        }else{
          console.warn("UI.showActionMessage is unavailable");
        }
      }catch(err){
        console.error("Failed to show action message",err);
      }
      UI.coach(actionContext,{delay:220,duration:3000});
      $("#productName").value=""; $("#productPrice").value=""; r.classList.add("hidden");
      return true;
    };
    $("#saveBtn").addEventListener("click",()=>{commit("saved");});
    $("#buyBtn").addEventListener("click",()=>{commit("spent");});
  },
  syncCalcHello(){
    const p=API.profile(); const h=$("#hello");
    if(!p){ h.textContent="Szia! Töltsd ki a profilod a pontos számításhoz."; return; }
    h.innerHTML=`Szia <b>${esc(p.name)}</b>! Nézzük meg, hány órádba kerülne.`;
  },

  /* ---------- Results: list, search, filter, sort, edit/delete ---------- */
  bindResults(){
    $("#clearAll").addEventListener("click",()=>{
      if(!confirm("Biztos üríted a listát?")) return;
      const backup={saved:API.list("saved"),spent:API.list("spent")};
      API.clearLists(); this.renderResults(); this.drawStats();
      UI.snack("Lista törölve.",true,()=>{API.setList("saved",backup.saved);API.setList("spent",backup.spent);this.renderResults();this.drawStats();});
    });
    $("#searchBox").addEventListener("input",(e)=>{this.state.search=e.target.value.trim().toLowerCase(); this.renderResults();});
    $("#filterSelect").addEventListener("change",(e)=>{this.state.filter=e.target.value; this.renderResults();});
    $("#sortSelect").addEventListener("change",(e)=>{this.state.sort=e.target.value; this.renderResults();});
  },
  itemsFilteredSorted(){
    const q=this.state.search; const filter=this.state.filter; const sort=this.state.sort;
    let items=[...API.list("saved"),...API.list("spent")];
    if(filter!=="all") items=items.filter(i=>i.type===filter);
    if(q) items=items.filter(i=>(i.name||"").toLowerCase().includes(q));
    items.sort((a,b)=>{
      if(sort==="date_desc") return (b.at||0)-(a.at||0);
      if(sort==="date_asc") return (a.at||0)-(b.at||0);
      if(sort==="price_desc") return (b.price||0)-(a.price||0);
      if(sort==="price_asc") return (a.price||0)-(b.price||0);
      if(sort==="name_asc") return (a.name||"").localeCompare(b.name||"");
      if(sort==="name_desc") return (b.name||"").localeCompare(a.name||"");
      return 0;
    });
    return items;
  },
  renderResults(){
    const saved=API.list("saved"), spent=API.list("spent");
    const totalSaved=saved.reduce((s,i)=>s+Number(i.price||0),0);
    const totalSpent=spent.reduce((s,i)=>s+Number(i.price||0),0);
    $("#totalSaved").textContent=fmtFt(totalSaved);
    $("#totalSpent").textContent=fmtFt(totalSpent);
    $("#net").textContent=fmtFt(totalSaved-totalSpent);

    const items=this.itemsFilteredSorted();
    const ul=$("#itemList"); ul.innerHTML="";
    items.forEach((it)=>{
      const li=document.createElement("li"); li.className="item";
      const meta=document.createElement("div"); meta.className="meta";
      const badge=document.createElement("span"); badge.className="badge "+(it.type==="saved"?"b-green":"b-red"); badge.textContent=(it.type==="saved"?"spórolt":"vett");
      const name=document.createElement("span"); name.innerHTML=esc(it.name);
      const price=document.createElement("span"); price.className="price"; price.textContent=fmtFt(it.price);
      meta.appendChild(badge); meta.appendChild(name); li.appendChild(meta); li.appendChild(price);
      const actions=document.createElement("div"); actions.className="actions";
      const editBtn=document.createElement("button"); editBtn.className="icon-btn secondary"; editBtn.title="Szerkesztés"; editBtn.textContent="✏️";
      const delBtn=document.createElement("button"); delBtn.className="icon-btn danger"; delBtn.title="Törlés"; delBtn.textContent="🗑️";
      actions.appendChild(editBtn); actions.appendChild(delBtn); li.appendChild(actions);
      ul.appendChild(li);
      editBtn.addEventListener("click",()=>this.editItem(it));
      delBtn.addEventListener("click",()=>this.deleteItem(it));
    });
  },
  editItem(item){
    const newName=prompt("Új név:",item.name||""); if(newName===null) return;
    let newPrice=prompt("Új ár (Ft):",String(item.price||0)); if(newPrice===null) return;
    newPrice=Number(newPrice); if(!newName.trim()||!newPrice||newPrice<=0){alert("Érvénytelen érték.");return;}
    const list=API.list(item.type).map(it=>{
      if(it.at===item.at && it.name===item.name && it.price===item.price){
        const ratio=(Number(it.price)>0 && Number.isFinite(Number(it.hours)))?Number(it.hours)/Number(it.price):null;
        const hours=ratio!==null?Number((ratio*newPrice).toFixed(1)):it.hours;
        return {...it,name:newName.trim(),price:newPrice,hours};
      }
      return it;
    });
    API.setList(item.type,list);
    this.renderResults(); this.drawStats();
    UI.snack("Tétel frissítve.");
  },
  deleteItem(item){
    const list=API.list(item.type);
    const idx=list.findIndex(it=>it.at===item.at && it.name===item.name && it.price===item.price);
    if(idx===-1) return;
    const removed=list[idx];
    const updated=list.filter((_,i)=>i!==idx);
    API.setList(item.type,updated);
    this.renderResults(); this.drawStats();
    UI.snack("Tétel törölve.",true,()=>{
      const current=API.list(item.type);
      if(current.some(it=>it.at===removed.at && it.name===removed.name && it.price===removed.price)) return;
      const restored=[...current];
      const insertAt=Math.min(idx,restored.length);
      restored.splice(insertAt,0,removed);
      API.setList(item.type,restored);
      this.renderResults();
      this.drawStats();
    });
  },

  /* ---------- Stats ---------- */
  drawStats(){
    const cvs=$("#statsCanvas"); const ctx=cvs.getContext("2d");
    ctx.clearRect(0,0,cvs.width,cvs.height);
    const monthKey=ts=>{const d=new Date(ts);return d.getFullYear()+"-"+MONTHS[d.getMonth()]};
    const map=new Map();
    API.list("saved").forEach(it=>{const k=monthKey(it.at||now()); const o=map.get(k)||{saved:0,spent:0}; o.saved+=Number(it.price)||0; map.set(k,o);});
    API.list("spent").forEach(it=>{const k=monthKey(it.at||now()); const o=map.get(k)||{saved:0,spent:0}; o.spent+=Number(it.price)||0; map.set(k,o);});
    const arr=[...map.entries()].sort((a,b)=>a[0]>b[0]?1:-1).slice(-8);
    const labels=arr.map(x=>x[0]), sData=arr.map(x=>x[1].saved), pData=arr.map(x=>x[1].spent);
    const P={l:48,r:22,t:16,b:40}, W=cvs.width-P.l-P.r, H=cvs.height-P.t-P.b;
    const style=getComputedStyle(document.documentElement);
    ctx.strokeStyle=style.getPropertyValue("--line"); ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(P.l,P.t); ctx.lineTo(P.l,P.t+H); ctx.lineTo(P.l+W,P.t+H); ctx.stroke();
    const max=Math.max(1000,...sData,...pData); const y=v=>P.t+H-(v/max)*H; const unit=W/Math.max(1,labels.length); const bar=unit/2.4;
    for(let i=0;i<labels.length;i++){
      const x0=P.l+i*unit+8;
      ctx.fillStyle=style.getPropertyValue("--green"); ctx.fillRect(x0, y(sData[i]), bar, (P.t+H)-y(sData[i]));
      ctx.fillStyle=style.getPropertyValue("--red"); ctx.fillRect(x0+bar+6, y(pData[i]), bar, (P.t+H)-y(pData[i]));
      ctx.fillStyle=style.getPropertyValue("--muted"); ctx.font="12px system-ui"; ctx.textAlign="center";
      ctx.fillText(labels[i], x0+bar/2+3, P.t+H+16);
    }
    if(pData.length>=3){
      const avg=[]; for(let i=0;i<pData.length;i++){ const a=pData.slice(Math.max(0,i-2),i+1); avg.push(a.reduce((s,v)=>s+v,0)/a.length); }
      ctx.beginPath(); ctx.lineWidth=2; ctx.strokeStyle=style.getPropertyValue("--blue");
      for(let i=0;i<avg.length;i++){ const x=P.l+i*unit+bar; const yy=y(avg[i]); if(i===0) ctx.moveTo(x,yy); else ctx.lineTo(x,yy); }
      ctx.stroke();
    }
  },

  /* ---------- Goals ---------- */
  bindGoals(){
    $("#saveGoals").addEventListener("click",()=>{
      const g={monthlyCap:Number($("#monthlyCap").value)||0, savingGoal:Number($("#savingGoal").value)||0};
      API.saveGoals(g); this.updateGoalsUI(); UI.snack("Célok mentve.");
    });
    $("#resetGoals").addEventListener("click",()=>{API.saveGoals({monthlyCap:0,savingGoal:0}); $("#monthlyCap").value=""; $("#savingGoal").value=""; this.updateGoalsUI();});
  },
  updateGoalsUI(){
    const g=API.goals(); $("#monthlyCap").value=g.monthlyCap||""; $("#savingGoal").value=g.savingGoal||"";
    const totalSaved=(API.list("saved").reduce((s,i)=>s+Number(i.price||0),0)); const goal=g.savingGoal||0;
    const pct=goal>0?Math.min(100,Math.round((totalSaved/goal)*100)):0;
    $("#goalProgressBar").style.width=pct+"%"; $("#goalProgressLabel").textContent=pct+"%";
  },

  /* ---------- Profile modal from icon ---------- */
  bindProfileModal(){
    $("#profileIcon").addEventListener("click",()=>{
      const p=API.profile()||{name:"",age:"",salary:"",hours:""};
      $("#editName").value=p.name||""; $("#editAge").value=p.age||""; $("#editSalary").value=p.salary||""; $("#editHours").value=p.hours||"";
      $("#profileModal").classList.remove("hidden");
    });
    $("#closeModal").addEventListener("click",()=>$("#profileModal").classList.add("hidden"));
    $("#saveEditProfile").addEventListener("click",()=>{
      const p={name:$("#editName").value.trim(),age:Number($("#editAge").value),salary:Number($("#editSalary").value),hours:Number($("#editHours").value)};
      if(!p.name||!p.age||!p.salary||!p.hours){alert("Tölts ki minden mezőt!");return;}
      API.saveProfile(p); $("#profileModal").classList.add("hidden"); this.updateProfileIcon(); this.syncCalcHello(); UI.snack("Profil frissítve.");
    });
    $("#deleteProfile").addEventListener("click",()=>{
      if(!confirm("Biztos törlöd a profilodat és minden adatot?")) return;
      API.deleteProfile(); $("#profileModal").classList.add("hidden"); $("#appScreen").classList.add("hidden"); $("#welcomeScreen").classList.remove("hidden");
    });
  },
  updateProfileIcon(){
    const p=API.profile(); if(!p||!p.name) return;
    $("#profileIcon").textContent=(p.name[0]||"👤").toUpperCase();
  },

  /* ---------- Shortcuts ---------- */
  bindShortcuts(){
    document.addEventListener("keydown",(e)=>{
      if(e.key==="Escape"){ $("#profileModal").classList.add("hidden"); $("#settingsModal").classList.add("hidden"); }
      if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==="k"){ e.preventDefault(); if(this.state.view!=="results") this.setView("results"); $("#searchBox").focus(); }
    });
  }
};

const A2HS=(()=>{
  const sessionKey="a2hs-dismissed";
  let deferred=null;
  let pill=null;
  let action=null;
  let close=null;
  const isStandalone=()=>{
    return (window.matchMedia&&window.matchMedia("(display-mode: standalone)").matches)||window.navigator.standalone===true;
  };
  const storage={
    mark(){try{sessionStorage.setItem(sessionKey,"1");}catch(e){}},
    dismissed(){try{return sessionStorage.getItem(sessionKey)==="1";}catch(e){return false;}}
  };
  const hide=()=>{if(pill) pill.classList.remove("show");};
  const show=()=>{if(!pill||!deferred||storage.dismissed()) return; pill.classList.add("show");};
  const bindInteractions=()=>{
    if(!pill||!action||!close) return;
    close.addEventListener("click",()=>{hide();storage.mark();});
    action.addEventListener("click",async()=>{
      hide();
      storage.mark();
      if(!deferred) return;
      deferred.prompt();
      try{await deferred.userChoice;}catch(e){}
      deferred=null;
    });
  };
  return{
    init(){
      if(isStandalone()) return;
      pill=document.querySelector("#a2hsPill");
      action=document.querySelector("#a2hsAction");
      close=document.querySelector("#a2hsClose");
      if(!pill||!action||!close) return;
      bindInteractions();
      window.addEventListener("beforeinstallprompt",(event)=>{
        event.preventDefault();
        deferred=event;
        show();
      });
      window.addEventListener("appinstalled",()=>{storage.mark();hide();});
    }
  };
})();

const registerServiceWorker=()=>{
  if(!("serviceWorker" in navigator)) return;
  window.addEventListener("load",()=>{
    navigator.serviceWorker.register("./sw.js?v=2025-11-05-3").then((reg)=>{
      console.info("Service worker registered:",reg.scope);
    }).catch((err)=>{
      console.error("Service worker registration failed:",err);
    });
  });
};

App.init();
A2HS.init();
registerServiceWorker();
