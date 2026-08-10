'use strict';
(function(){
  function applyTheme(){
    const accent=db.settings.accentColor||'#1f6feb';
    const accent2=db.settings.accentLight||'#58a6ff';
    document.documentElement.style.setProperty('--accent',accent);
    document.documentElement.style.setProperty('--accent-2',accent2);
  }
  window.CCApplyTheme=applyTheme;
  db.settings.accentColor=db.settings.accentColor||'#1f6feb';
  db.settings.accentLight=db.settings.accentLight||'#58a6ff';
  applyTheme();

  const prevRenderSettings=renderSettings;
  renderSettings=function(){
    prevRenderSettings();
    const host=el('adminContent');
    const actions=host.querySelector('.actions');
    if(!actions)return;
    const block=document.createElement('div');
    block.className='settingsGroup';
    block.innerHTML=`<h3>Appearance</h3><p class="hint">These colors control the estimator and dashboard theme.</p><div class="grid"><div class="field"><label>Primary blue</label><input id="sAccent" type="color" value="${esc(db.settings.accentColor)}"></div><div class="field"><label>Highlight blue</label><input id="sAccentLight" type="color" value="${esc(db.settings.accentLight)}"></div></div>`;
    host.insertBefore(block,actions);
  };

  const prevSaveSettings=saveSettings;
  saveSettings=async function(){
    if(el('sAccent')) db.settings.accentColor=el('sAccent').value;
    if(el('sAccentLight')) db.settings.accentLight=el('sAccentLight').value;
    applyTheme();
    await prevSaveSettings();
  };

  function timerElapsed(j){let ms=Number(j.timerElapsedMs)||0;if(j.timerRunning&&j.timerStartedAt)ms+=Date.now()-new Date(j.timerStartedAt).getTime();return Math.max(0,ms)}
  function fmtTimer(ms){const total=Math.floor(ms/1000),h=Math.floor(total/3600),m=Math.floor((total%3600)/60),s=total%60;return[h,m,s].map(x=>String(x).padStart(2,'0')).join(':')}

  const prevJobModal=jobModal;
  jobModal=async function(j=null){
    await prevJobModal(j);if(!j)return;const body=el('modalBody'),existing=body.querySelector('.jobPhotos');
    const panel=document.createElement('div');panel.className='timerPanel';panel.innerHTML=`<div class="eyebrow">Actual job timer</div><div id="jobTimerDisplay" class="timerDisplay">${fmtTimer(timerElapsed(j))}</div><p class="hint">This timer records on-site clock time. When finished, actual labor hours = elapsed time × crew size.</p><div class="actions"><button id="timerStart" class="btn primary">${j.timerRunning?'Running':'Start / Resume'}</button><button id="timerPause" class="btn secondary">Pause</button><button id="timerFinish" class="btn dark">Finish & Use Time</button></div>`;body.insertBefore(panel,existing||body.firstChild);
    const training=document.createElement('div');training.className='settingsGroup';training.innerHTML=`<h3>Job details for estimator training</h3><div class="grid"><div class="field"><label>Property state</label><select id="jOccupancy"><option value="occupied" ${j.occupancy==='occupied'?'selected':''}>Occupied</option><option value="vacant" ${j.occupancy==='vacant'?'selected':''}>Vacant</option><option value="unknown" ${!j.occupancy||j.occupancy==='unknown'?'selected':''}>Unknown</option></select></div><div class="field"><label>Unexpected issue?</label><select id="jUnexpected"><option value="no" ${j.unexpectedIssue!=='yes'?'selected':''}>No</option><option value="yes" ${j.unexpectedIssue==='yes'?'selected':''}>Yes</option></select></div><div class="field full"><label>What affected the time?</label><textarea id="jTrainingNotes" rows="3" placeholder="Grease, hard water, pet hair, clutter, extra trash, client-added work, etc.">${esc(j.trainingNotes||'')}</textarea></div></div>`;body.insertBefore(training,body.querySelector('.actions'));
    let timerInterval;const refresh=()=>{if(el('jobTimerDisplay'))el('jobTimerDisplay').textContent=fmtTimer(timerElapsed(j))};if(j.timerRunning)timerInterval=setInterval(refresh,1000);
    el('timerStart').addEventListener('click',()=>{if(!j.timerRunning){j.timerRunning=true;j.timerStartedAt=new Date().toISOString();save();timerInterval=setInterval(refresh,1000)}refresh()});
    el('timerPause').addEventListener('click',()=>{if(j.timerRunning){j.timerElapsedMs=timerElapsed(j);j.timerRunning=false;j.timerStartedAt=null;clearInterval(timerInterval);save();refresh()}});
    el('timerFinish').addEventListener('click',()=>{j.timerElapsedMs=timerElapsed(j);j.timerRunning=false;j.timerStartedAt=null;clearInterval(timerInterval);const clock=j.timerElapsedMs/3600000;el('jClockHours').value=clock.toFixed(2);const crew=+el('jCrew').value||1;el('jActualLabor').value=(clock*crew).toFixed(2);refresh();alert('Timer stopped and actual hours filled in. Click Save Job to keep the record.')});
    el('saveJobBtn').addEventListener('click',()=>{j.occupancy=el('jOccupancy')?.value||'unknown';j.unexpectedIssue=el('jUnexpected')?.value||'no';j.trainingNotes=el('jTrainingNotes')?.value||'';save()},{capture:true});
  };

  const prevRenderCustomers=renderCustomers;
  renderCustomers=function(){prevRenderCustomers();$$('#adminContent tbody tr').forEach((tr,i)=>{tr.style.cursor='pointer';tr.title='Open customer history';tr.addEventListener('click',()=>{const c=db.customers[i];if(!c)return;const qs=db.quotes.filter(q=>(c.email&&q.email===c.email)||(c.phone&&q.phone===c.phone)),js=db.jobs.filter(j=>j.customer===c.name);el('modalTitle').textContent=c.name;el('modalBody').innerHTML=`<div class="grid3"><div class="profileCard"><div class="hint">Quotes</div><strong>${qs.length}</strong></div><div class="profileCard"><div class="hint">Jobs</div><strong>${js.length}</strong></div><div class="profileCard"><div class="hint">Completed labor</div><strong>${js.filter(j=>j.status==='completed').reduce((a,j)=>a+(Number(j.actualLabor)||0),0).toFixed(1)} hrs</strong></div></div><div class="settingsGroup"><h3>Contact</h3><p>${esc(c.phone||'')}<br>${esc(c.email||'')}<br>${esc(c.address||'')} ${esc(c.city||'')}</p></div><div class="settingsGroup"><h3>Recent jobs</h3>${js.length?js.slice(0,8).map(j=>`<div class="profileCard" style="margin-bottom:8px"><b>${fmtDate(j.date)} · ${esc(services.find(x=>x[0]===j.service)?.[1]||j.service)}</b><br><span class="hint">${j.actualLabor||'—'} actual labor hrs · ${esc(j.status)}</span></div>`).join(''):'<p class="hint">No jobs yet.</p>'}</div>`;openModal()})})};
})();
