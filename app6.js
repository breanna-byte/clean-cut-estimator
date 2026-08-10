'use strict';

// Clean & Cut v2.1 behavior overrides
(function(){
  // Customer-facing estimator: never auto-assign extra cleaners.
  const originalEstimate = estimate;
  estimate = function(d){
    const r = originalEstimate(d);
    r.crew = 1;
    r.visitLow = r.lowH;
    r.visitHigh = r.highH;
    return r;
  };

  // Customer result: remove crew recommendation and describe time as one-cleaner time.
  const crewStat = el('crewSize')?.closest('.stat');
  if(crewStat) crewStat.remove();
  const visitLabel = el('visitHours')?.closest('.stat')?.querySelector('small');
  if(visitLabel) visitLabel.textContent = 'Estimated time (1 cleaner)';
  const heroCrewItem = [...document.querySelectorAll('.heroCard li')].find(li=>/Recommend crew size/i.test(li.textContent));
  if(heroCrewItem) heroCrewItem.textContent = 'You choose whether to add extra cleaners';

  // Remove automatic crew controls from Settings UI while keeping legacy values harmlessly stored.
  const originalRenderSettings = renderSettings;
  renderSettings = function(){
    originalRenderSettings();
    ['sCrew2','sCrew3'].forEach(id=>{
      const field=el(id)?.closest('.field');
      if(field) field.remove();
    });
    const heading=[...el('adminContent').querySelectorAll('h3')].find(h=>/Estimate range \+ crew rules/i.test(h.textContent));
    if(heading) heading.textContent='Estimate range + learning rules';
  };

  function calcManualQuote(q, extras, hoursEach){
    const addCleaners=Math.max(0, Number(extras)||0);
    const addHoursEach=Math.max(0, Number(hoursEach)||0);
    const extraLabor=addCleaners*addHoursEach;
    const rate=Number(q.rate)||Number(db.settings.rates[q.service])||0;
    return {
      addCleaners,
      addHoursEach,
      extraLabor,
      extraCharge:extraLabor*rate,
      finalLow:Number(q.lowPrice||0)+extraLabor*rate,
      finalHigh:Number(q.highPrice||0)+extraLabor*rate,
      totalCrew:1+addCleaners
    };
  }

  // Replace quote review with a manual additional-cleaner adjustment.
  viewQuote = function(id){
    const q=db.quotes.find(x=>x.id===id);
    const saved=q.manualCrew||{additionalCleaners:0,hoursEach:0};
    const adj=calcManualQuote(q,saved.additionalCleaners,saved.hoursEach);
    el('modalTitle').textContent='Quote — '+q.name;
    el('modalBody').innerHTML=`
      <div class="grid">
        <div><b>Contact</b><p>${esc(q.phone)}<br>${esc(q.email||'No email')}</p></div>
        <div><b>Property</b><p>${esc(q.address)}, ${esc(q.city)}<br>${q.sqft} sq ft · ${q.beds} bed · ${q.baths} bath</p></div>
        <div><b>Base estimate</b><p>${q.lowH}–${q.highH} labor hrs<br>${money(q.lowPrice)}–${money(q.highPrice)}</p></div>
        <div><b>Learning</b><p>${q.learningCount?q.learning.toFixed(2)+'× from '+q.learningCount+' jobs':'Not enough data'}</p></div>
      </div>
      <div class="settingsGroup">
        <h3>Manual additional cleaners</h3>
        <p class="hint">The public estimator assumes one cleaner. Add extra cleaners here only when you decide the job needs them.</p>
        <div class="grid3">
          <div class="field"><label>Additional cleaners</label><input id="qExtraCleaners" type="number" min="0" step="1" value="${adj.addCleaners}"></div>
          <div class="field"><label>Hours each</label><input id="qExtraHours" type="number" min="0" step=".25" value="${adj.addHoursEach}"></div>
          <div class="field"><label>Hourly rate</label><input id="qExtraRate" value="${money(q.rate||db.settings.rates[q.service])}" disabled></div>
        </div>
        <div class="notice" style="margin-top:12px"><b>Extra labor charge:</b> <span id="qExtraCharge">${money(adj.extraCharge)}</span><br><b>Adjusted quote range:</b> <span id="qAdjustedRange">${money(adj.finalLow)}–${money(adj.finalHigh)}</span></div>
        <div class="actions"><button id="saveManualCrew" class="btn secondary">Save Adjustment</button></div>
      </div>
      <div class="actions"><button id="approveQ" class="btn primary">Approve / Schedule</button><button id="deleteQ" class="btn danger">Delete</button></div>`;

    const recalc=()=>{
      const a=calcManualQuote(q,el('qExtraCleaners').value,el('qExtraHours').value);
      el('qExtraCharge').textContent=money(a.extraCharge);
      el('qAdjustedRange').textContent=`${money(a.finalLow)}–${money(a.finalHigh)}`;
      return a;
    };
    el('qExtraCleaners').addEventListener('input',recalc);
    el('qExtraHours').addEventListener('input',recalc);
    el('saveManualCrew').addEventListener('click',()=>{
      const a=recalc();
      q.manualCrew={additionalCleaners:a.addCleaners,hoursEach:a.addHoursEach,extraLabor:a.extraLabor,extraCharge:a.extraCharge,totalCrew:a.totalCrew};
      q.adjustedLowPrice=a.finalLow;
      q.adjustedHighPrice=a.finalHigh;
      save();
      if(window.CCCloud?.configured) CCCloud.syncDb(db).catch(console.warn);
      alert('Manual cleaner adjustment saved.');
    });
    el('approveQ').addEventListener('click',()=>{
      const a=recalc();
      q.manualCrew={additionalCleaners:a.addCleaners,hoursEach:a.addHoursEach,extraLabor:a.extraLabor,extraCharge:a.extraCharge,totalCrew:a.totalCrew};
      q.adjustedLowPrice=a.finalLow;
      q.adjustedHighPrice=a.finalHigh;
      approveQuote(id);
    });
    el('deleteQ').addEventListener('click',()=>deleteQuote(id));
    openModal();
  };

  // When a quote becomes a job, carry the manual crew choice and extra labor forward.
  const originalApproveQuote = approveQuote;
  approveQuote = function(id){
    const q=db.quotes.find(x=>x.id===id);
    const before=db.jobs.length;
    originalApproveQuote(id);
    if(db.jobs.length>before){
      const j=db.jobs[0];
      const mc=q.manualCrew||{};
      j.crew=mc.totalCrew||1;
      j.manualAdditionalCleaners=mc.additionalCleaners||0;
      j.manualAdditionalHoursEach=mc.hoursEach||0;
      j.manualExtraLabor=mc.extraLabor||0;
      if(j.predictedLow!=null) j.predictedLow=Number(j.predictedLow)+(mc.extraLabor||0);
      if(j.predictedHigh!=null) j.predictedHigh=Number(j.predictedHigh)+(mc.extraLabor||0);
      if(j.predictedMid!=null) j.predictedMid=Number(j.predictedMid)+(mc.extraLabor||0);
      save();
      if(window.CCCloud?.configured) CCCloud.syncDb(db).catch(console.warn);
    }
  };

  // Save Settings should push immediately instead of waiting for the background timer.
  const originalSaveSettings = saveSettings;
  saveSettings = async function(){
    const oldAlert=window.alert;
    let localMessage='Settings saved.';
    window.alert=(m)=>{ localMessage=m; };
    try{ originalSaveSettings(); }
    finally{ window.alert=oldAlert; }

    if(window.CCCloud?.configured){
      try{
        await CCCloud.syncDb(db);
        oldAlert('Settings saved and published to the live estimator.');
      }catch(err){
        console.error(err);
        oldAlert('Settings saved on this device, but the cloud update failed.');
      }
    }else{
      oldAlert(localMessage);
    }
  };
})();
