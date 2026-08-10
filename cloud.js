(function(){
  const cfg=window.CC_SUPABASE_CONFIG||{};
  const configured=Boolean(cfg.url&&cfg.publishableKey&&window.supabase?.createClient);
  const client=configured?window.supabase.createClient(cfg.url,cfg.publishableKey):null;

  function publicEstimatorSettings(settings){
    if(!settings)return {};
    return {
      business:settings.business,
      phone:settings.phone,
      email:settings.email,
      website:settings.website,
      cleaningPage:settings.cleaningPage,
      accentColor:settings.accentColor,
      accentLight:settings.accentLight,
      minimumHours:settings.minimumHours,
      lowBuffer:settings.lowBuffer,
      highBuffer:settings.highBuffer,
      maxLearningAdjustment:settings.maxLearningAdjustment,
      learningEnabled:settings.learningEnabled,
      minimumTrainingJobs:settings.minimumTrainingJobs,
      disclaimer:settings.disclaimer,
      rates:settings.rates,
      hourFactors:settings.hourFactors,
      serviceFactors:settings.serviceFactors,
      conditions:settings.conditions,
      addons:settings.addons
    };
  }

  async function upsertTable(table,rows){
    if(!configured||!rows?.length)return;
    const payload=rows.map(x=>({id:x.id,payload:x,updated_at:new Date().toISOString()}));
    const {error}=await client.from(table).upsert(payload,{onConflict:'id'});
    if(error)throw error;
  }

  async function syncDb(db){
    if(!configured)throw new Error('Cloud is not configured.');
    const {data:{session},error:sessionError}=await client.auth.getSession();
    if(sessionError)throw sessionError;
    if(!session)throw new Error('Cloud sign-in required.');
    const results=await Promise.all([
      upsertTable('quotes',db.quotes),
      upsertTable('jobs',db.jobs),
      upsertTable('customers',db.customers),
      client.from('settings').upsert({id:'clean-cut',payload:db.settings,updated_at:new Date().toISOString()},{onConflict:'id'}),
      client.from('public_estimator_settings').upsert({id:'clean-cut',payload:publicEstimatorSettings(db.settings),updated_at:new Date().toISOString()},{onConflict:'id'})
    ]);
    const settingsError=results[3]?.error||results[4]?.error;
    if(settingsError)throw settingsError;
    return true;
  }

  async function loadDb(localDb){
    if(!configured)return localDb;
    const pub=await client.from('public_estimator_settings').select('payload').eq('id','clean-cut').maybeSingle();
    if(!pub.error&&pub.data?.payload){
      localDb.settings=Object.assign(localDb.settings,pub.data.payload);
    }
    const {data:{session}}=await client.auth.getSession();
    if(!session)return localDb;
    const [q,j,c,s]=await Promise.all([
      client.from('quotes').select('payload'),
      client.from('jobs').select('payload'),
      client.from('customers').select('payload'),
      client.from('settings').select('payload').eq('id','clean-cut').maybeSingle()
    ]);
    if(q.error||j.error||c.error||s.error)console.warn('Cloud load warning',q.error,j.error,c.error,s.error);
    return {
      ...localDb,
      quotes:q.data?.map(x=>x.payload)||localDb.quotes,
      jobs:j.data?.map(x=>x.payload)||localDb.jobs,
      customers:c.data?.map(x=>x.payload)||localDb.customers,
      settings:s.data?.payload?Object.assign(localDb.settings,s.data.payload):localDb.settings
    };
  }

  async function submitQuote(quote,files){
    if(!configured)return {ok:false,reason:'not-configured'};
    const {error}=await client.from('quotes').insert({id:quote.id,payload:quote});
    if(error)throw error;
    const uploads=[];
    for(const file of [...(files||[])].slice(0,12)){
      const safe=(file.name||'photo.jpg').replace(/[^a-zA-Z0-9._-]/g,'_');
      const path=`quotes/${quote.id}/${Date.now()}_${Math.random().toString(36).slice(2,7)}_${safe}`;
      const res=await client.storage.from('clean-cut-photos').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type||undefined});
      if(res.error)throw res.error;
      uploads.push(path);
    }
    return {ok:true,paths:uploads};
  }

  async function uploadJobPhotos(jobId,kind,files){
    if(!configured)return [];
    const {data:{session}}=await client.auth.getSession();
    if(!session)throw new Error('Sign in to upload business photos.');
    const out=[];
    for(const file of [...(files||[])]){
      const safe=(file.name||'photo.jpg').replace(/[^a-zA-Z0-9._-]/g,'_');
      const path=`jobs/${jobId}/${kind}/${Date.now()}_${Math.random().toString(36).slice(2,7)}_${safe}`;
      const res=await client.storage.from('clean-cut-photos').upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type||undefined});
      if(res.error)throw res.error;
      out.push(path);
    }
    return out;
  }

  window.CCCloud={configured,client,syncDb,loadDb,submitQuote,uploadJobPhotos};
})();
