'use strict';
(function(){
  const oldBtn=el('calcBtn');
  if(!oldBtn) return;
  const newBtn=oldBtn.cloneNode(true);
  oldBtn.replaceWith(newBtn);

  function confidenceForQuote(q){
    let score=42;
    if(q.sqft>=500) score+=8;
    if(q.baths>=1) score+=4;
    if(q.condition) score+=6;
    if(q.photoCount>=3) score+=10;
    if(q.photoCount>=6) score+=6;
    if((q.notes||'').length>=20) score+=4;
    if(q.learningCount>=3) score+=8;
    if(q.learningCount>=8) score+=6;
    const spread=(q.highH-q.lowH)/Math.max(.5,q.predictedMid||1);
    if(spread<.35) score+=5;
    if(spread>.7) score-=8;
    score=Math.max(25,Math.min(96,Math.round(score)));
    return {score,level:score>=80?'High':score>=60?'Moderate':'Low'};
  }

  function safeCalculateQuote(){
    const d=collect();
    if(!d.name||!d.phone){
      alert('Please enter your name and phone number first.');
      return;
    }
    const r=estimate(d);
    currentQuote={id:uid('q'),created:new Date().toISOString(),status:'new',...d,...r};

    if(el('resultPrice')) el('resultPrice').textContent=`${money(r.lowPrice)}–${money(r.highPrice)}`;
    if(el('laborHours')) el('laborHours').textContent=`${r.lowH}–${r.highH} hrs`;
    if(el('visitHours')) el('visitHours').textContent=`${r.visitLow.toFixed(1)}–${r.visitHigh.toFixed(1)} hrs`;
    if(el('resultSummary')) el('resultSummary').textContent=`${services.find(x=>x[0]===d.service)?.[1]||'Cleaning'} at ${money(r.rate)} per labor hour.`;

    const c=confidenceForQuote(currentQuote);
    currentQuote.confidence=c.score;
    currentQuote.confidenceLevel=c.level;
    const confidence=el('confidenceScore');
    if(confidence){
      confidence.textContent=`${c.score}% · ${c.level}`;
      confidence.className=c.level==='High'?'confidence-high':c.level==='Moderate'?'confidence-mid':'confidence-low';
    }

    const result=el('quoteResult');
    if(result){
      result.classList.remove('hidden');
      result.scrollIntoView({behavior:'smooth',block:'start'});
    }
  }

  newBtn.addEventListener('click',safeCalculateQuote);
})();
