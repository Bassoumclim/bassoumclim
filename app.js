const SUPABASE_URL='https://hbigfogqrjobawzdbdue.supabase.co';
const SUPABASE_KEY='sb_publishable_LRAkisi90QWpd60uheIFkA_8cZmuACl';
let sb=null,user=null,profile=null,techProfile=null,loading=false;
const $=id=>document.getElementById(id);
const L={pending:'En attente',accepted:'Acceptée',quoted:'Devis reçu',scheduled:'Planifiée',in_progress:'En cours',completed:'Terminée',rejected:'Refusée',cancelled:'Annulée'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const money=n=>Number(n||0).toLocaleString('fr-FR')+' FCFA';
const badge=s=>`<span class="badge ${s==='completed'?'ok':s==='pending'||s==='quoted'?'warn':s==='rejected'||s==='cancelled'?'bad':''}">${L[s]||esc(s)}</span>`;
function ready(){return !!(window.supabase&&window.supabase.createClient)}
function initClient(){if(!sb&&ready())sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);return sb}
function modal(show){$('modal')?.classList.toggle('hidden',!show)}
function msg(id,text,error=false){const el=$(id);if(el){el.textContent=text;el.className=error?'error msg':'success msg'}}
function requireAuth(){if(!user){modal(true);return false}return true}
function setBusy(btn,busy){if(!btn)return;btn.disabled=busy;btn.dataset.oldText ??= btn.textContent;btn.textContent=busy?'Traitement…':btn.dataset.oldText}

function bindStatic(){
  $('authBtn')?.addEventListener('click',()=>modal(true));
  $('close')?.addEventListener('click',()=>modal(false));
  $('modal')?.addEventListener('click',e=>{if(e.target===$('modal'))modal(false)});
  $('toSignup')?.addEventListener('click',()=>{$('login')?.classList.add('hidden');$('signup')?.classList.remove('hidden')});
  $('toLogin')?.addEventListener('click',()=>{$('signup')?.classList.add('hidden');$('login')?.classList.remove('hidden')});
  $('roleSelect')?.addEventListener('change',toggleTechFields);
  $('dashBtn')?.addEventListener('click',()=>{$('dashboard')?.classList.remove('hidden');$('dashboard')?.scrollIntoView({behavior:'smooth'});render()});
  $('logoutBtn')?.addEventListener('click',async()=>{if(sb)await sb.auth.signOut();user=null;profile=null;techProfile=null;location.reload()});
  $('loginForm')?.addEventListener('submit',login);
  $('signupForm')?.addEventListener('submit',signup);
  $('requestForm')?.addEventListener('submit',createRequest);
  $('dashContent')?.addEventListener('click',e=>{
    const tab=e.target.closest('[data-tab]');
    if(tab){ e.preventDefault(); techTab(tab.dataset.tab); return; }
    handleAction(e);
  });
}
function toggleTechFields(){const tech=$('roleSelect')?.value==='technicien';$('techFields')?.classList.toggle('hidden',!tech);if($('specialty'))$('specialty').required=tech;if($('serviceArea'))$('serviceArea').required=tech}
window.openTechSignup=()=>{modal(true);$('login')?.classList.add('hidden');$('signup')?.classList.remove('hidden');if($('roleSelect'))$('roleSelect').value='technicien';toggleTechFields()};

async function login(e){e.preventDefault();if(!initClient())return msg('loginMsg','Service indisponible. Rechargez la page.',true);const btn=e.submitter;setBusy(btn,true);msg('loginMsg','Connexion…');const {error}=await sb.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});setBusy(btn,false);if(error){msg('loginMsg',error.message,true);return}msg('loginMsg','✓ Connexion réussie');setTimeout(()=>modal(false),350)}
async function signup(e){
  e.preventDefault();
  if(!initClient())return msg('signupMsg','Service indisponible. Rechargez la page.',true);
  const role=$('roleSelect')?.value||'client';
  const btn=e.submitter;
  setBusy(btn,true);
  msg('signupMsg','Création du compte…');
  const email=$('semail')?.value.trim();
  const password=$('spass')?.value||'';
  if(!email||password.length<6){
    setBusy(btn,false);
    return msg('signupMsg','E-mail et mot de passe (6 caractères minimum) requis.',true);
  }
  const meta={
    first_name:$('first')?.value.trim()||'',
    last_name:$('last')?.value.trim()||'',
    phone:$('sphone')?.value.trim()||'',
    role
  };
  if(role==='technicien'){
    meta.specialty=$('specialty')?.value.trim()||'Installation et entretien clim';
    meta.service_area=$('serviceArea')?.value.trim()||'';
  }
  try{
    const result=await Promise.race([
      sb.auth.signUp({email,password,options:{data:meta,emailRedirectTo:location.origin}}),
      new Promise((_,reject)=>setTimeout(()=>reject(new Error('Le serveur ne répond pas. Vérifiez votre connexion puis réessayez.')),15000))
    ]);
    const {data,error}=result;
    if(error){
      msg('signupMsg','Erreur : '+error.message,true);
      return;
    }
    if(!data?.user){
      msg('signupMsg','Le compte n’a pas été créé : aucun utilisateur retourné.',true);
      return;
    }

    // Do not block the registration on profile/RLS work.
    ensureProfile(data.user);

    if(role==='technicien'){
      msg('signupMsg', data.session
        ? '✓ Compte technicien créé. Vous pouvez maintenant vous connecter.'
        : '✓ Compte technicien créé. Vérifiez votre e-mail puis connectez-vous.');
    }else{
      msg('signupMsg', data.session
        ? '✓ Compte créé. Connexion réussie.'
        : '✓ Compte créé. Vérifiez votre e-mail puis connectez-vous.');
    }

    if(data.session){
      setTimeout(()=>modal(false),700);
    }
  }catch(err){
    console.error('signup',err);
    msg('signupMsg','Erreur : '+(err?.message||'Impossible de créer le compte.'),true);
  }finally{
    setBusy(btn,false);
  }
}
async function ensureProfile(u){
  if(!u||!sb)return;
  const m=u.user_metadata||{};
  const profileData={id:u.id,role:m.role==='technicien'?'technicien':'client',first_name:m.first_name||'',last_name:m.last_name||'',phone:m.phone||''};
  try{
    await Promise.race([
      sb.from('profiles').upsert(profileData,{onConflict:'id'}),
      new Promise((_,reject)=>setTimeout(()=>reject(new Error('timeout')),5000))
    ]);
    if(m.role==='technicien'){
      await Promise.race([
        sb.from('technicians').upsert({
          id:u.id,
          specialty:m.specialty||'Installation et entretien clim',
          service_area:m.service_area||'',
          is_verified:false,
          is_available:false
        },{onConflict:'id'}),
        new Promise((_,reject)=>setTimeout(()=>reject(new Error('timeout')),5000))
      ]);
    }
  }catch(err){ console.warn('Profil créé en arrière-plan:',err); }
}
function clientRequest(x,q,i,rv){const z=q.find(a=>a.request_id===x.id&&a.status!=='rejected');const iv=i.find(a=>a.request_id===x.id);const review=iv&&rv.find(a=>a.intervention_id===iv.id);return `<div class="item"><div class="row"><b>${esc(x.service_type)}</b>${badge(x.status)}</div><p>${esc(x.description||'')}</p><small>📍 ${esc(x.address||'')} ${x.preferred_date?' · 📅 '+new Date(x.preferred_date).toLocaleString('fr-FR'):''}</small>
 ${z?`<div class="item"><div class="row"><b>Devis : ${money(z.amount)}</b>${badge(z.status)}</div><p>${esc(z.details||'')}</p>${z.status==='pending'?`<div class="actions"><button class="mini primary" data-action="accept-quote" data-id="${z.id}" data-request="${x.id}">Accepter le devis</button><button class="mini" data-action="reject-quote" data-id="${z.id}">Refuser</button></div>`:''}${z.status==='accepted'&&x.status!=='scheduled'?`<div class="scheduleForm"><label>Date et heure<input id="dt-${x.id}" type="datetime-local" required></label><button class="mini primary" data-action="schedule" data-id="${z.id}" data-request="${x.id}">Choisir le rendez-vous</button></div>`:''}</div>`:''}
 ${iv?`<div class="quoteBox"><div class="row"><b>Intervention</b>${badge(iv.status)}</div><p>${iv.scheduled_at?'Rendez-vous : '+new Date(iv.scheduled_at).toLocaleString('fr-FR'):''}</p>${iv.status==='completed'&&!review?`<div class="reviewBox"><b>Votre avis :</b><span class="stars" id="stars-${iv.id}">${[1,2,3,4,5].map(k=>`<button type="button" data-action="rate" data-id="${iv.id}" data-rating="${k}">☆</button>`).join('')}</span><input id="comment-${iv.id}" placeholder="Votre commentaire"><button class="mini primary" data-action="review" data-id="${iv.id}">Publier</button></div>`:review?`<p>⭐ ${review.rating}/5 · ${esc(review.comment||'Merci pour votre avis.')}</p>`:''}</div>`:''}</div>`}
async function createRequest(e){
  e.preventDefault();
  if(!initClient()) return msg('requestMsg','Service indisponible. Rechargez la page.',true);
  if(!user){
    modal(true);
    return msg('requestMsg','Connectez-vous avant d’envoyer une demande.',true);
  }
  const btn=e.submitter;
  setBusy(btn,true);
  msg('requestMsg','Envoi de la demande…');
  try{
    const serviceMap={installation:'Installation de clim',entretien:'Entretien de clim'};
    const payload={
      client_id:user.id,
      service_type:serviceMap[$('service')?.value]||$('service')?.value||'Installation de clim',
      contact_phone:$('phone')?.value.trim()||'',
      address:$('address')?.value.trim()||'',
      preferred_date:$('date')?.value?new Date($('date').value).toISOString():null,
      budget:$('budget')?.value?Number($('budget').value):null,
      description:$('description')?.value.trim()||'',
      status:'pending'
    };
    if(!payload.contact_phone||!payload.address||!payload.description){
      msg('requestMsg','Téléphone, adresse et description sont obligatoires.',true);
      return;
    }
    const {error}=await sb.from('requests').insert(payload);
    if(error){msg('requestMsg','Erreur : '+error.message,true);return}
    msg('requestMsg','✓ Demande envoyée. Vous recevrez une notification lorsqu’un technicien la prendra en charge.');
    $('requestForm')?.reset();
    await render();
  }catch(err){
    console.error('createRequest',err);
    msg('requestMsg','Erreur : '+(err?.message||'Impossible d’envoyer la demande.'),true);
  }finally{setBusy(btn,false)}
}

function clientDashboard(requests,quotes,interventions,reviews,notifications){
  const q=quotes||[], i=interventions||[], rv=reviews||[], nf=notifications||[];
  const pending=requests.filter(x=>['pending','accepted','quoted','scheduled','in_progress'].includes(x.status)).length;
  const activeInterventions=i.filter(x=>['scheduled','in_progress'].includes(x.status)).length;
  const completed=i.filter(x=>x.status==='completed').length;
  const unread=nf.filter(x=>!x.is_read).length;
  const first=String(profile?.first_name||user?.user_metadata?.first_name||'Client').trim()||'Client';
  const fullName=esc((((profile?.first_name||'')+' '+(profile?.last_name||'')).trim())||first);
  const initials=esc((((profile?.first_name||'')+' '+(profile?.last_name||'')).trim()||first).split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase());
  const fmtDate=x=>x?new Date(x).toLocaleDateString('fr-FR',{day:'numeric',month:'long'}):'Date à définir';
  const fmtTime=x=>x?new Date(x).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'';
  const status=s=>`<span class="clientStatus ${esc(s||'pending')}">${L[s]||esc(s||'En attente')}</span>`;
  const recent=requests.slice(0,4);
  const booking=recent.map(x=>{
    const when=x.preferred_date;
    return `<div class="clientBooking" id="clientReservation-${esc(x.id)}"><div class="clientBookingMain"><div class="clientBookingTitle">${esc(x.service_type||'Service de climatisation')}</div><div class="clientBookingMeta"><span>📅 ${fmtDate(when)}</span>${when?`<span>🕐 ${fmtTime(when)}</span>`:''}</div></div>${status(x.status)}</div>`;
  }).join('')||'<div class="clientEmpty">Aucune réservation pour le moment.</div>';
  const notes=nf.slice(0,3).map(n=>`<div class="clientNotice"><div><b>${esc(n.title||'Notification')}</b><p>${esc(n.body||'')}</p><small>${n.created_at?new Date(n.created_at).toLocaleString('fr-FR'):''}</small></div></div>`).join('')||'<div class="clientEmpty">Aucune notification.</div>';
  $('dashContent').innerHTML=`
    <div class="clientApp">
      <aside class="clientSide" id="clientSide">
        <div class="clientBrand">Clim<span>Express</span></div>
        <nav class="clientNav" aria-label="Navigation client">
          <a class="active" href="#clientDashboard">⌂ &nbsp;Tableau de bord</a>
          <a href="#clientReservations">▣ &nbsp;Mes réservations</a>
          <a href="#clientInterventions">✓ &nbsp;Mes interventions</a>
          <a href="#clientNotificationsPanel">◉ &nbsp;Notifications ${unread?`<b>(${unread})</b>`:''}</a>
          <a href="#clientProfile">◯ &nbsp;Mon profil</a>
          <a class="reserveNav" href="#request">+ &nbsp;Réserver un service</a>
          <button class="clientLogout" type="button" id="clientSideLogout">↪ &nbsp;Déconnexion</button>
        </nav>
      </aside>
      <main class="clientMain" id="clientDashboard">
        <div class="clientMobileBar">
          <button class="clientMenuBtn" type="button" data-action="client-menu" aria-label="Ouvrir le menu">☰</button>
          <div class="clientBrand">Clim<span>Express</span></div>
          <span style="width:40px"></span>
        </div>
        <div class="clientTop">
          <div class="clientGreeting"><h1>Bonjour ${esc(first)} 👋</h1><p>Bienvenue dans votre espace client ClimExpress.</p></div>
          <div class="clientTopActions">
            <button class="clientIconBtn" type="button" data-action="client-scroll-notifications" aria-label="Notifications">♢${unread?'<span class="notifDot"></span>':''}</button>
            <div class="clientProfile" id="clientProfileCard"><div class="clientAvatar">${initials}</div><div><strong>${fullName}</strong><small>Client</small></div></div>
          </div>
        </div>
        <section class="clientHero">
          <div><h2>Besoin d’un technicien ?</h2><p>Réservez votre entretien, installation ou réparation en quelques clics.</p></div>
          <a class="primary" href="#request">Réserver un service →</a>
        </section>
        <section class="clientStats" aria-label="Résumé">
          <div class="clientStat"><div class="clientStatIcon">▣</div><div><b>${requests.length}</b><span>Mes réservations</span></div></div>
          <div class="clientStat"><div class="clientStatIcon">✓</div><div><b>${activeInterventions}</b><span>Mes interventions</span></div></div>
          <div class="clientStat"><div class="clientStatIcon">▤</div><div><b>${completed}</b><span>Mes factures</span></div></div>
        </section>
        <div class="clientGrid">
          <div>
            <section class="clientPanel" id="clientReservations">
              <div class="clientSectionHead"><div><h3>Mes réservations</h3><p>Vos demandes les plus récentes</p></div><a class="clientLink" href="#clientReservations">Voir toutes</a></div>
              ${booking}
            </section>
            <section class="clientPanel" id="clientInterventions">
              <div class="clientSectionHead"><div><h3>Mes interventions</h3><p>Suivi de vos interventions</p></div></div>
              ${i.slice(0,3).map(x=>`<div class="clientBooking"><div class="clientBookingMain"><div class="clientBookingTitle">${esc(x.request_id?'Intervention de climatisation':'Intervention')}</div><div class="clientBookingMeta"><span>${x.scheduled_at?'📅 '+fmtDate(x.scheduled_at):'Date à définir'}</span>${x.scheduled_at?`<span>🕐 ${fmtTime(x.scheduled_at)}</span>`:''}</div></div>${status(x.status)}</div>`).join('')||'<div class="clientEmpty">Aucune intervention pour le moment.</div>'}
            </section>
          </div>
          <aside>
            <section class="clientPanel">
              <div class="clientSectionHead"><div><h3>Accès rapides</h3><p>Les actions utiles</p></div></div>
              <div class="clientQuick">
                <a href="#request"><i>＋</i>Réserver un service</a>
                <a href="#clientInterventions"><i>✓</i>Mes interventions</a>
                <a href="#clientInvoices"><i>▤</i>Mes factures</a>
                <a href="#clientDevices"><i>▱</i>Mes appareils</a>
              </div>
            </section>
            <section class="clientPanel" id="clientNotificationsPanel">
              <div class="clientSectionHead"><div><h3>Notifications</h3><p>${unread?`${unread} non lue(s)`: 'Tout est à jour'}</p></div><button class="clientLink" data-action="read-notifications">Tout lire</button></div>
              ${notes}
            </section>
            <section class="clientPanel" id="clientInvoices">
              <div class="clientSectionHead"><div><h3>Mes factures</h3><p>Historique lié aux interventions terminées</p></div></div>
              <div class="clientEmpty">${completed?`${completed} intervention(s) terminée(s) peuvent être consultées dans votre suivi.`:'Aucune facture disponible pour le moment.'}</div>
            </section>
            <section class="clientPanel" id="clientDevices">
              <div class="clientSectionHead"><div><h3>Mes appareils</h3><p>Vos équipements de climatisation</p></div></div>
              <div class="clientEmpty">La gestion détaillée des appareils n’est pas encore reliée aux données actuelles du projet.</div>
            </section>
            <section class="clientPanel" id="clientProfile">
              <div class="clientSectionHead"><div><h3>Mon profil</h3><p>Vos informations de compte</p></div></div>
              <div class="clientBooking"><div class="clientBookingMain"><div class="clientBookingTitle">${fullName}</div><div class="clientBookingMeta"><span>Client</span>${profile?.phone?`<span>📞 ${esc(profile.phone)}</span>`:''}</div></div><span class="clientStatus accepted">Compte actif</span></div>
            </section>
            <section class="clientPanel">
              <div class="clientHelp"><h3>Besoin d’aide ?</h3><p>Notre équipe est disponible pour vous aider.</p><a href="#contact">Nous contacter</a></div>
            </section>
          </aside>
        </div>
      </main>
    </div>`;
  $('clientSideLogout')?.addEventListener('click',async()=>{if(sb)await sb.auth.signOut();user=null;profile=null;techProfile=null;location.reload()});
  document.querySelector('.clientSide')?.addEventListener('click',e=>{if(e.target.closest('a')) document.querySelector('.clientSide')?.classList.remove('open')});
}

async function client(){
  const [rq,qt,iv,rv,nf]=await Promise.all([
    sb.from('requests').select('*').eq('client_id',user.id).order('created_at',{ascending:false}),
    sb.from('quotes').select('*').order('created_at',{ascending:false}),
    sb.from('interventions').select('*').eq('client_id',user.id).order('created_at',{ascending:false}),
    sb.from('reviews').select('*').eq('client_id',user.id).order('created_at',{ascending:false}),
    sb.from('notifications').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(10)
  ]);
  const err=[rq,qt,iv,rv,nf].find(x=>x.error);
  if(err?.error) throw err.error;
  clientDashboard(rq.data||[],qt.data||[],iv.data||[],rv.data||[],nf.data||[]);
  const box=$('clientNotifications');
  if(box){
    box.innerHTML=(nf.data||[]).map(n=>`<div class="item"><b>${esc(n.title||'Notification')}</b><p>${esc(n.body||'')}</p><small>${n.created_at?new Date(n.created_at).toLocaleString('fr-FR'):''}</small></div>`).join('')||'<div class="emptyPro">Aucune notification.</div>';
  }
}

function applyRoleUI(role){
  const body=document.body;
  body.classList.remove('client-mode','technician-mode','admin-mode');
  body.classList.add(role==='technicien'?'technician-mode':role==='admin'?'admin-mode':'client-mode');
  const header=document.querySelector('header');
  if(header){
    let badge=header.querySelector('.roleBadge');
    if(!badge){ badge=document.createElement('span'); badge.className='roleBadge'; header.querySelector('.logo')?.after(badge); }
    badge.textContent=role==='technicien'?'👨‍🔧 ESPACE TECHNICIEN':role==='admin'?'🛡️ ADMINISTRATION':'👤 ESPACE CLIENT';
    const nav=header.querySelector('nav');
    if(nav){
      if(role==='technicien') nav.innerHTML='<a href="#dashboard">Dashboard</a><a href="#dashboard" data-tech-nav="requests">Demandes</a><a href="#dashboard" data-tech-nav="missions">Missions</a><a href="#dashboard" data-tech-nav="profile">Profil</a>';
      else if(role==='admin') nav.innerHTML='<a href="#dashboard">Administration</a>';
      else nav.innerHTML='<a href="#services">Services</a><a href="#how">Fonctionnement</a><button type="button" id="authBtn">Connexion</button>';
      nav.querySelector('#authBtn')?.addEventListener('click',()=>modal(true));
    }
    header.querySelectorAll('[data-tech-nav]').forEach(a=>a.addEventListener('click',()=>setTimeout(()=>techTab(a.dataset.techNav),100)));
  }
  const request=document.querySelector('#request');
  if(request && role!=='client') request.setAttribute('aria-hidden','true');
}

async function init(){
  if(!initClient()) return;
  try{
    const {data:{session}}=await sb.auth.getSession();
    user=session?.user||null;
    $('userMenu')?.classList.toggle('hidden',!user);
    $('authBtn')?.classList.toggle('hidden',!!user);
    $('hint') && ($('hint').textContent=user?'Vous êtes connecté. Vous pouvez envoyer une demande.':'Connectez-vous pour envoyer votre demande.');
    if(!user){
      $('dashboard')?.classList.add('hidden');
      return;
    }
    const meta=user.user_metadata||{};
    const pr=await sb.from('profiles').select('*').eq('id',user.id).maybeSingle();
    const fallbackRole=meta.role==='technicien'?'technicien':meta.role==='admin'?'admin':'client';
    profile=pr.data||{id:user.id,role:fallbackRole,first_name:meta.first_name||'',last_name:meta.last_name||'',phone:meta.phone||''};
    if(!['client','technicien','admin'].includes(profile.role)) profile.role=fallbackRole;
    applyRoleUI(profile.role);
    $('dashboard')?.classList.remove('hidden');
    $('role').textContent=profile.role==='technicien'?'ESPACE TECHNICIEN':profile.role==='admin'?'ADMINISTRATION':'ESPACE CLIENT';
    $('welcome').textContent=`Bienvenue ${((profile.first_name||'')+' '+(profile.last_name||'')).trim()||'sur BassoumClim'}.`;
    $('dashDate').textContent=new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    if(profile.role==='technicien'){
      await tech();
    }else if(profile.role==='admin'){
      await admin();
    }else{
      await client();
    }
    if(!window.__dashboardInitialScroll){
      window.__dashboardInitialScroll=true;
      setTimeout(()=>$('dashboard')?.scrollIntoView({behavior:'smooth',block:'start'}),80);
    }
  }catch(err){
    console.error('init',err);
    $('dashboard')?.classList.remove('hidden');
    $('dashContent').innerHTML=`<div class="panel"><h3>Impossible de charger votre espace</h3><p>${esc(err?.message||'Erreur inconnue')}</p><button class="mini primary" onclick="location.reload()">Réessayer</button></div>`;
  }
}

async function render(){ return init(); }


async function tech(){
 const {data:t,error:te}=await sb.from('technicians').select('*').eq('id',user.id).maybeSingle();if(te){throw te}techProfile=t;if(!t){$('dashContent').innerHTML='<div class="emptyPro"><h3>Profil technicien introuvable</h3><p>Reconnectez-vous pour recréer votre profil.</p></div>';return}
 const [rq,mq,iq]=await Promise.all([sb.from('requests').select('*').is('technician_id',null).eq('status','pending').order('created_at',{ascending:false}),sb.from('requests').select('*').eq('technician_id',user.id).order('created_at',{ascending:false}),sb.from('interventions').select('*').eq('technician_id',user.id).order('created_at',{ascending:false})]);
 if(rq.error) throw rq.error; if(mq.error) throw mq.error; if(iq.error) throw iq.error;
 const a=rq.data||[],m=mq.data||[],i=iq.data||[];
 const active=m.filter(x=>['accepted','quoted','scheduled','in_progress'].includes(x.status)).length,completed=i.filter(x=>x.status==='completed').length,display=esc(((profile?.first_name||'')+' '+(profile?.last_name||'')).trim()||'Technicien');
 $('dashContent').innerHTML=`<div class="techShell"><aside class="techSide"><div class="techBrand">❄️ BassoumClim <span style="opacity:.55">PRO</span></div><div class="techNav"><button class="active" data-tab="overview">📊 Vue d'ensemble</button><button data-tab="requests">📥 Demandes <b>(${a.length})</b></button><button data-tab="missions">🛠️ Mes missions</button><button data-tab="quotes">💰 Devis</button><button data-tab="history">📚 Historique</button><button data-tab="profile">👤 Mon profil</button></div></aside><div class="techMain"><div class="techTop"><div><h3>Bonjour, ${display} 👋</h3><p>Gérez votre activité et vos interventions depuis cet espace.</p></div><div class="availability"><span class="dot ${t.is_available?'on':''}"></span><b>${t.is_available?'Disponible':'Indisponible'}</b><button class="mini ${t.is_available?'primary':''}" data-action="availability">${t.is_available?'Se rendre indisponible':'Activer'}</button></div></div>
 <section class="techSection active" data-section="overview"><div class="techKpis"><div class="kpi"><strong>${a.length}</strong><span>DEMANDES DISPONIBLES</span></div><div class="kpi"><strong>${active}</strong><span>MISSIONS ACTIVES</span></div><div class="kpi"><strong>${completed}</strong><span>INTERVENTIONS TERMINÉES</span></div><div class="kpi"><strong>${t.rating||'—'}</strong><span>NOTE MOYENNE</span></div></div><div class="panel"><div class="sectionTitle"><div><h3>Dernières demandes</h3><p>Les nouvelles missions en attente d'un technicien.</p></div><button class="mini" data-tab="requests">Voir toutes</button></div>${a.slice(0,3).map(requestCard).join('')||'<div class="emptyPro">Aucune nouvelle demande.</div>'}</div><div class="panel"><div class="sectionTitle"><div><h3>Mes missions en cours</h3></div><button class="mini" data-tab="missions">Gérer</button></div>${m.filter(x=>x.status!=='completed').slice(0,4).map(missionRow).join('')||'<div class="emptyPro">Aucune mission active.</div>'}</div></section>
 <section class="techSection" data-section="requests"><div class="panel"><div class="sectionTitle"><div><h3>Demandes disponibles</h3><p>Acceptez une mission pour la prendre en charge.</p></div></div>${a.map(requestCard).join('')||'<div class="emptyPro">Aucune demande disponible.</div>'}</div></section>
 <section class="techSection" data-section="missions"><div class="panel"><div class="sectionTitle"><div><h3>Mes missions</h3></div></div>${m.map(missionRow).join('')||'<div class="emptyPro">Aucune mission.</div>'}</div></section>
 <section class="techSection" data-section="quotes"><div class="panel"><div class="sectionTitle"><div><h3>Gestion des devis</h3><p>Envoyez vos devis aux clients.</p></div></div>${m.filter(x=>['accepted','quoted','scheduled','in_progress'].includes(x.status)).map(x=>`<div class="requestCard"><div class="row"><div><h4>${esc(x.service_type)}</h4><small>${esc(x.address||'')}</small></div>${badge(x.status)}</div><p>${esc(x.description||'')}</p>${x.status==='accepted'?`<button class="mini primary" data-action="quote" data-id="${x.id}">+ Créer le devis</button>`:x.status==='quoted'?'<div class="quoteBox">💰 Devis envoyé · En attente du client.</div>':'<div class="quoteBox">✓ Intervention planifiée.</div>'}</div>`).join('')||'<div class="emptyPro">Aucun devis à gérer.</div>'}</div></section>
 <section class="techSection" data-section="history"><div class="panel"><div class="sectionTitle"><div><h3>Interventions</h3></div></div>${i.map(x=>`<div class="missionRow"><div><b>${esc(x.status==='completed'?'Intervention terminée':'Intervention')}</b><p>${x.completed_at?new Date(x.completed_at).toLocaleDateString('fr-FR'):x.scheduled_at?new Date(x.scheduled_at).toLocaleDateString('fr-FR'):''}</p></div><div>${badge(x.status)}</div><div><b>${money(x.final_amount)}</b></div><div>${x.status==='scheduled'?`<button class="mini" data-action="start-intervention" data-id="${x.id}">Démarrer</button>`:x.status==='in_progress'?`<button class="mini primary" data-action="complete-intervention" data-id="${x.id}">Terminer</button>`:''}</div></div>`).join('')||'<div class="emptyPro">Aucune intervention.</div>'}</div></section>
 <section class="techSection" data-section="profile"><div class="panel"><div class="sectionTitle"><div><h3>Mon profil professionnel</h3></div><button class="mini primary" data-action="edit-profile">Modifier</button></div><div class="profilePro"><div class="avatar">${esc(((profile?.first_name||'T')[0]+(profile?.last_name||'')).slice(0,2).toUpperCase())}</div><div><h3>${display}</h3><div class="profileRows"><div class="profileField"><small>SPÉCIALITÉ</small><b>${esc(t.specialty||'À renseigner')}</b></div><div class="profileField"><small>ZONE</small><b>${esc(t.service_area||'À renseigner')}</b></div><div class="profileField"><small>VÉRIFICATION</small><b>${t.is_verified?'✓ Profil vérifié':'En attente'}</b></div></div></div></div></div></section></div></div>`;
}
function requestCard(x){return `<div class="requestCard"><div class="row"><div><h4>${esc(x.service_type)}</h4><div class="meta"><span>📍 ${esc(x.address||'')}</span>${x.preferred_date?`<span>📅 ${new Date(x.preferred_date).toLocaleString('fr-FR')}</span>`:''}${x.budget?`<span>💰 ${money(x.budget)}</span>`:''}</div></div>${badge(x.status)}</div><p>${esc(x.description||'Aucune description')}</p><button class="mini primary" data-action="take" data-id="${x.id}">Accepter la mission →</button></div>`}
function missionRow(x){return `<div class="missionRow"><div><b>${esc(x.service_type)}</b><p>${esc(x.address||'')}</p></div><div>${badge(x.status)}</div><div><p>${x.preferred_date?'Souhait : '+new Date(x.preferred_date).toLocaleDateString('fr-FR'):''}</p></div><div>${x.status==='accepted'?`<button class="mini primary" data-action="quote" data-id="${x.id}">Faire un devis</button>`:x.status==='quoted'?'<span class="badge warn">Devis en attente</span>':''}</div></div>`}
function techTab(name){document.querySelectorAll('.techNav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));document.querySelectorAll('.techSection').forEach(s=>s.classList.toggle('active',s.dataset.section===name))}
async function admin(){const [{data:p=[]},{data:r=[]},{data:t=[]},{data:i=[]}]=await Promise.all([sb.from('profiles').select('*'),sb.from('requests').select('*'),sb.from('technicians').select('*'),sb.from('interventions').select('*')]);$('dashContent').innerHTML=`<div class="grid"><div class="stat"><strong>${p.length}</strong>Utilisateurs</div><div class="stat"><strong>${t.length}</strong>Techniciens</div><div class="stat"><strong>${r.length}</strong>Demandes</div><div class="stat"><strong>${i.length}</strong>Interventions</div></div><div class="panel"><h3>Demandes récentes</h3>${r.slice(0,20).map(x=>`<div class="item"><div class="row"><b>${esc(x.service_type)}</b>${badge(x.status)}</div><p>${esc(x.description||'')}</p><small>${esc(x.address||'')}</small></div>`).join('')||'<div class="emptyPro">Aucune demande.</div>'}</div>`}

async function take(id){if(!techProfile?.is_available)return alert('Activez votre disponibilité avant d’accepter une mission.');const {data,error}=await sb.rpc('claim_request',{p_request_id:id});if(error)return alert(error.message);if(!data)return alert('Cette demande a déjà été prise.');await render()}
async function createQuote(id){const amount=Number(prompt('Montant du devis en FCFA'));if(!Number.isFinite(amount)||amount<=0)return;const details=prompt('Détails du devis')||'';const {error}=await sb.from('quotes').insert({request_id:id,technician_id:user.id,amount,details,status:'pending'});if(error)return alert(error.message);const u=await sb.from('requests').update({status:'quoted'}).eq('id',id).eq('technician_id',user.id);if(u.error)return alert(u.error.message);alert('✓ Devis envoyé au client.');await render()}
async function acceptQuote(q,r){const {data,error}=await sb.from('quotes').update({status:'accepted',accepted_at:new Date().toISOString()}).eq('id',q).eq('status','pending').select().maybeSingle();if(error)return alert(error.message);if(!data)return alert('Ce devis n’est plus disponible.');const u=await sb.from('requests').update({status:'accepted'}).eq('id',r).eq('client_id',user.id);if(u.error)return alert(u.error.message);await render()}
async function rejectQuote(id){const {error}=await sb.from('quotes').update({status:'rejected'}).eq('id',id).eq('status','pending');if(error)return alert(error.message);await render()}
async function schedule(q,r){const el=$('dt-'+r);if(!el?.value)return alert('Choisissez une date et une heure.');const scheduled=new Date(el.value);if(Number.isNaN(scheduled.getTime()))return alert('Date invalide.');const {data:qr,error:qe}=await sb.from('quotes').select('amount,technician_id').eq('id',q).eq('status','accepted').maybeSingle();if(qe||!qr)return alert(qe?.message||'Devis introuvable.');const {error:ie}=await sb.from('interventions').upsert({request_id:r,client_id:user.id,technician_id:qr.technician_id,status:'scheduled',scheduled_at:scheduled.toISOString(),final_amount:qr.amount,address:null},{onConflict:'request_id'});if(ie)return alert(ie.message);const {error:re}=await sb.from('requests').update({status:'scheduled'}).eq('id',r).eq('client_id',user.id);if(re)return alert(re.message);alert('✓ Rendez-vous enregistré.');await render()}
async function toggleAvailability(){const next=!techProfile.is_available;const {error}=await sb.from('technicians').update({is_available:next}).eq('id',user.id);if(error)return alert(error.message);await render()}
async function editProfile(){let specialty=prompt('Spécialité',techProfile.specialty||'');if(specialty===null)return;let area=prompt('Zone d’intervention',techProfile.service_area||'');if(area===null)return;const {error}=await sb.from('technicians').update({specialty,service_area:area}).eq('id',user.id);if(error)return alert(error.message);await render()}
async function startIntervention(id){const {error}=await sb.from('interventions').update({status:'in_progress',started_at:new Date().toISOString()}).eq('id',id).eq('technician_id',user.id);if(error)return alert(error.message);await render()}
async function completeIntervention(id){const amount=Number(prompt('Montant final en FCFA'));if(!Number.isFinite(amount)||amount<0)return;const {data:iv,error}=await sb.from('interventions').update({status:'completed',completed_at:new Date().toISOString(),final_amount:amount}).eq('id',id).eq('technician_id',user.id).select('request_id').maybeSingle();if(error)return alert(error.message);if(iv?.request_id)await sb.from('requests').update({status:'completed'}).eq('id',iv.request_id).eq('technician_id',user.id);await render()}
async function readNotifications(){const {error}=await sb.from('notifications').update({is_read:true}).eq('user_id',user.id);if(error)return alert(error.message);await render()}
const ratings={};function rate(id,k){ratings[id]=k;document.querySelectorAll(`#stars-${CSS.escape(id)} button`).forEach((b,i)=>b.textContent=i<k?'★':'☆')}
async function sendReview(id){const rating=ratings[id]||0;if(!rating)return alert('Choisissez une note.');const comment=$('comment-'+id)?.value||'';const {data:iv,error:ie}=await sb.from('interventions').select('technician_id').eq('id',id).eq('client_id',user.id).maybeSingle();if(ie||!iv)return alert(ie?.message||'Intervention introuvable.');const {error}=await sb.from('reviews').insert({intervention_id:id,client_id:user.id,technician_id:iv.technician_id,rating,comment});if(error)return alert(error.message);await render()}
async function handleAction(e){const el=e.target.closest('[data-action]');if(!el)return;const a=el.dataset.action;try{if(a==='take')await take(el.dataset.id);else if(a==='quote')await createQuote(el.dataset.id);else if(a==='accept-quote')await acceptQuote(el.dataset.id,el.dataset.request);else if(a==='reject-quote')await rejectQuote(el.dataset.id);else if(a==='schedule')await schedule(el.dataset.id,el.dataset.request);else if(a==='availability')await toggleAvailability();else if(a==='edit-profile')await editProfile();else if(a==='start-intervention')await startIntervention(el.dataset.id);else if(a==='complete-intervention')await completeIntervention(el.dataset.id);else if(a==='read-notifications')await readNotifications();else if(a==='rate')rate(el.dataset.id,Number(el.dataset.rating));else if(a==='review')await sendReview(el.dataset.id);else if(a==='client-menu')document.querySelector('.clientSide')?.classList.toggle('open');else if(a==='client-scroll-notifications')document.querySelector('#clientNotificationsPanel')?.scrollIntoView({behavior:'smooth',block:'start'})}catch(err){console.error(err);alert('Une erreur est survenue. Réessayez.')}}

async function startApp(){if(!ready()){setTimeout(startApp,250);return}initClient();bindStatic();if(sb)sb.auth.onAuthStateChange((event)=>{ if(['SIGNED_IN','SIGNED_OUT','TOKEN_REFRESHED'].includes(event)) setTimeout(init,0); });await init()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startApp);else startApp();
