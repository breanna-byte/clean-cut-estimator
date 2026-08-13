'use strict';
(function(){
  const oldBtn=el('calcBtn');
  if(oldBtn){
    const newBtn=oldBtn.cloneNode(true);
    oldBtn.replaceWith(newBtn);

    function safeCalculateQuote(){
      const d=collect();
      if(!d.name||!d.phone){
        alert('Please enter your name and phone number first.');
        return;
      }
      const r=estimate(d);
      currentQuote={id:uid('q'),created:new Date().toISOString(),status:'new',...d,...r};
      if(el('resultPrice'))el('resultPrice').textContent=`${money(r.lowPrice)}–${money(r.highPrice)}`;
      if(el('laborHours'))el('laborHours').textContent=`${r.lowH}–${r.highH} hrs`;
      if(el('visitHours'))el('visitHours').textContent=`${r.visitLow.toFixed(1)}–${r.visitHigh.toFixed(1)} hrs`;
      if(el('resultSummary'))el('resultSummary').textContent=`${services.find(x=>x[0]===d.service)?.[1]||'Cleaning'} at ${money(r.rate)} per labor hour.`;
      const result=el('quoteResult');
      if(result){result.classList.remove('hidden');result.scrollIntoView({behavior:'smooth',block:'start'});}
    }
    newBtn.addEventListener('click',safeCalculateQuote);
  }

  async function getCloudSession(){
    if(!window.CCCloud?.configured)return null;
    try{const {data:{session}}=await CCCloud.client.auth.getSession();return session||null;}catch{return null;}
  }

  function drawCloudStatus(signedIn){
    const host=el('dashboard');
    if(!host)return;
    let bar=el('dashboardCloudBar');
    if(!bar){
      bar=document.createElement('div');
      bar.id='dashboardCloudBar';
      bar.className='notice';
      bar.style.marginBottom='16px';
      const head=host.querySelector('.adminHead');
      if(head)head.insertAdjacentElement('afterend',bar);else host.prepend(bar);
    }
    if(signedIn){
      bar.innerHTML='<div style="display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap"><div><b>Cloud connected</b><br><span class="hint">Customer quote requests are loaded from Supabase.</span></div><button id="refreshCloudQuotes" class="btn primary mini">Refresh Quotes</button></div>';
      const b=el('refreshCloudQuotes');
      if(b)b.onclick=()=>refreshCloudQuotes(true);
    }else{
      bar.innerHTML='<div style="display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap"><div><b>Cloud sign-in required</b><br><span class="hint">PIN-only access shows local browser data. Sign in to Supabase to receive customer quote submissions.</span></div><button id="openCloudLogin" class="btn dark mini">Cloud Sign In</button></div>';
      const b=el('openCloudLogin');
      if(b)b.onclick=()=>{el('dashboard').classList.add('hidden');el('loginBox').classList.remove('hidden');if(el('cloudEmail'))el('cloudEmail').focus();};
    }
  }

  async function refreshCloudQuotes(showAlert){
    if(!window.CCCloud?.configured){if(showAlert)alert('Cloud is not connected.');return false;}
    const session=await getCloudSession();
    if(!session){drawCloudStatus(false);if(showAlert)alert('Cloud sign-in is required to receive customer quote submissions. The PIN only unlocks local browser data.');return false;}
    try{
      db=merge(clone(DEFAULTS),await CCCloud.loadDb(db));
      save();renderChoices();if(window.CCApplyTheme)window.CCApplyTheme();renderDashboard();drawCloudStatus(true);
      if(showAlert)alert(`Cloud synced. ${db.quotes.length} quote request${db.quotes.length===1?'':'s'} loaded.`);
      return true;
    }catch(e){console.error(e);if(showAlert)alert('Could not refresh cloud quotes. Please check your cloud login.');return false;}
  }

  const originalOpenDashboard=openDashboard;
  openDashboard=function(){
    originalOpenDashboard();
    getCloudSession().then(async session=>{drawCloudStatus(Boolean(session));if(session)await refreshCloudQuotes(false);});
  };

  function enhanceCloudLogin(){
    const btn=el('cloudLoginBtn');
    if(!btn){setTimeout(enhanceCloudLogin,250);return;}
    if(btn.dataset.quoteRefreshAttached)return;
    btn.dataset.quoteRefreshAttached='1';
    btn.addEventListener('click',()=>setTimeout(()=>refreshCloudQuotes(false),800));
  }
  enhanceCloudLogin();

  window.CCRefreshCloudQuotes=refreshCloudQuotes;
})();
