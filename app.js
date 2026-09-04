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
  const {data:t,error:te}=await sb.from('technicians').select('*').eq('id',user.id).maybeSingle();
  if(te) throw te;
  techProfile=t;
  if(!t){$('dashContent').innerHTML='<div class="emptyPro"><h3>Profil technicien introuvable</h3><p>Reconnectez-vous pour recréer votre profil.</p></div>';return}

  const [rq,mq,iq,nq]=await Promise.all([
    sb.from('requests').select('*').is('technician_id',null).eq('status','pending').order('created_at',{ascending:false}),
    sb.from('requests').select('*').eq('technician_id',user.id).order('created_at',{ascending:false}),
    sb.from('interventions').select('*').eq('technician_id',user.id).order('created_at',{ascending:false}),
    sb.from('notifications').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(20)
  ]);
  const err=[rq,mq,iq,nq].find(x=>x.error);
  if(err?.error) throw err.error;
  const a=rq.data||[],m=mq.data||[],i=iq.data||[],n=nq.data||[];
  const active=m.filter(x=>['accepted','quoted','scheduled','in_progress'].includes(x.status)).length;
  const completed=i.filter(x=>x.status==='completed').length;
  const unread=n.filter(x=>!x.is_read).length;
  const display=esc(((profile?.first_name||'')+' '+(profile?.last_name||'')).trim()||'Technicien');
  const first=esc((profile?.first_name||'Technicien').trim()||'Technicien');
  const initials=esc((((profile?.first_name||'')+' '+(profile?.last_name||'')).trim()||'Technicien').split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase());
  const profileDone=Boolean(t.specialty&&t.service_area);
  const availableDone=Boolean(t.is_available);
  const missionDone=Boolean(m.length);

  const fmtDate=x=>x?new Date(x).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'}):'';
  const fmtDateTime=x=>x?new Date(x).toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'';
  const shortText=x=>{const v=String(x||'Aucune description').trim();return esc(v.length>125?v.slice(0,122)+'…':v)};

  $('dashContent').innerHTML=`
    <div class="techApp">
      <aside class="techSide" id="techSide">
        <div class="techBrand"><span class="techBrandMark">❄</span><div><strong>Clim<span>Express</span></strong><small>ESPACE TECHNICIEN</small></div></div>
        <nav class="techNav" aria-label="Navigation technicien">
          <button class="active" data-tab="overview"><span>⌂</span>Tableau de bord</button>
          <button data-tab="requests"><span>▣</span>Demandes ${a.length?`<b>${a.length}</b>`:''}</button>
          <button data-tab="missions"><span>✓</span>Mes missions ${active?`<b>${active}</b>`:''}</button>
          <button data-tab="quotes"><span>€</span>Mes devis</button>
          <button data-tab="history"><span>↺</span>Historique</button>
          <button data-tab="profile"><span>◯</span>Mon profil</button>
          <button data-tab="notifications"><span>◉</span>Notifications ${unread?`<b>${unread}</b>`:''}</button>
        </nav>
        <div class="techSideBottom">
          <div class="techAvailabilityMini"><span class="techDot ${t.is_available?'on':''}"></span><div><strong>${t.is_available?'Disponible':'Indisponible'}</strong><small>${t.is_available?'Vous recevez les demandes':'Vous ne recevez pas de demandes'}</small></div></div>
          <button class="techLogout" type="button" id="techSideLogout">↪ <span>Déconnexion</span></button>
        </div>
      </aside>

      <main class="techMain">
        <header class="techHeader">
          <button class="techMenuBtn" type="button" data-action="tech-menu" aria-label="Ouvrir le menu">☰</button>
          <div class="techHeaderBrand"><strong>Clim<span>Express</span></strong><small>Technicien</small></div>
          <div class="techHeaderActions">
            <button class="techIconBtn" type="button" data-tab="notifications" aria-label="Notifications">◉${unread?`<i></i>`:''}</button>
            <button class="techProfileBtn" type="button" data-tab="profile"><span class="techAvatar">${initials}</span><span class="techProfileName"><strong>${display}</strong><small>Technicien</small></span><span class="techChevron">⌄</span></button>
          </div>
        </header>

        <div class="techContent">
          <section class="techSection active" data-section="overview">
            <div class="techWelcomeRow">
              <div><p class="techEyebrow">TABLEAU DE BORD</p><h1>Bonjour, ${first} 👋</h1><p>Gérez vos demandes et vos interventions depuis votre espace technicien.</p></div>
              <button class="techAvailability ${t.is_available?'isOn':''}" type="button" data-action="availability"><span class="techDot ${t.is_available?'on':''}"></span><span><strong>${t.is_available?'Disponible':'Indisponible'}</strong><small>${t.is_available?'Vous pouvez recevoir des missions':'Activez votre disponibilité pour recevoir des missions'}</small></span><b>${t.is_available?'Se rendre indisponible':'Se rendre disponible'}</b></button>
            </div>

            <div class="techKpis" aria-label="Statistiques">
              <div class="techKpi"><span class="kpiIcon">▣</span><div><strong>${a.length}</strong><small>Demandes disponibles</small></div></div>
              <div class="techKpi"><span class="kpiIcon">✓</span><div><strong>${active}</strong><small>Missions en cours</small></div></div>
              <div class="techKpi"><span class="kpiIcon">↺</span><div><strong>${completed}</strong><small>Interventions terminées</small></div></div>
              <div class="techKpi"><span class="kpiIcon">★</span><div><strong>${t.rating||'—'}</strong><small>Note moyenne</small></div></div>
            </div>

            <div class="techDashboardGrid">
              <div class="techPrimaryColumn">
                <section class="techPanel techRequestsPanel">
                  <div class="techPanelHead"><div><h2>Nouvelles demandes</h2><p>Les missions actuellement disponibles.</p></div><button class="techLink" data-tab="requests">Voir toutes →</button></div>
                  <div class="techRequestList">${a.slice(0,3).map(requestCard).join('')||'<div class="techEmpty"><span>✓</span><div><strong>Aucune nouvelle demande</strong><p>Les nouvelles missions apparaîtront ici.</p></div></div>'}</div>
                </section>

                <section class="techPanel">
                  <div class="techPanelHead"><div><h2>Mes missions en cours</h2><p>Les missions qui nécessitent votre attention.</p></div><button class="techLink" data-tab="missions">Voir toutes →</button></div>
                  <div class="techMissionList">${m.filter(x=>['accepted','quoted','scheduled','in_progress'].includes(x.status)).slice(0,4).map(x=>missionRow(x,i.find(iv=>iv.request_id===x.id))).join('')||'<div class="techEmpty"><span>✓</span><div><strong>Aucune mission en cours</strong><p>Acceptez une demande pour commencer.</p></div></div>'}</div>
                </section>
              </div>

              <aside class="techSecondaryColumn">
                <section class="techPanel techQuickPanel">
                  <div class="techPanelHead"><div><h2>Accès rapides</h2><p>Les rubriques essentielles.</p></div></div>
                  <button class="techQuick" data-tab="requests"><span>▣</span><div><strong>Demandes</strong><small>${a.length} disponible(s)</small></div><b>→</b></button>
                  <button class="techQuick" data-tab="quotes"><span>€</span><div><strong>Mes devis</strong><small>Créer et suivre vos devis</small></div><b>→</b></button>
                  <button class="techQuick" data-tab="history"><span>↺</span><div><strong>Historique</strong><small>${completed} intervention(s) terminée(s)</small></div><b>→</b></button>
                  <button class="techQuick" data-tab="profile"><span>◯</span><div><strong>Mon profil</strong><small>${profileDone?'Profil renseigné':'Profil à compléter'}</small></div><b>→</b></button>
                </section>

                <section class="techPanel techJourney">
                  <div class="techPanelHead"><div><h2>Votre parcours</h2><p>Un aperçu de votre activité.</p></div></div>
                  <div class="techSteps">
                    <div class="techStep ${profileDone?'done':''}"><span>${profileDone?'✓':'1'}</span><div><strong>Profil professionnel</strong><small>${profileDone?'Complété':'À renseigner'}</small></div></div>
                    <div class="techStep ${availableDone?'done':''}"><span>${availableDone?'✓':'2'}</span><div><strong>Disponibilité</strong><small>${availableDone?'Activée':'À activer'}</small></div></div>
                    <div class="techStep ${missionDone?'done':''}"><span>${missionDone?'✓':'3'}</span><div><strong>Première mission</strong><small>${missionDone?'Mission reçue':'En attente'}</small></div></div>
                  </div>
                </section>
              </aside>
            </div>
          </section>

          <section class="techSection" data-section="requests">
            <div class="techPageHead"><div><p class="techEyebrow">MISSIONS</p><h1>Demandes disponibles</h1><p>Acceptez une mission pour la prendre en charge.</p></div><div class="techCount">${a.length} disponible(s)</div></div>
            <section class="techPanel"><div class="techRequestList">${a.map(requestCard).join('')||'<div class="techEmpty"><span>✓</span><div><strong>Aucune demande disponible</strong><p>Revenez plus tard pour découvrir de nouvelles missions.</p></div></div>'}</div></section>
          </section>

          <section class="techSection" data-section="missions">
            <div class="techPageHead"><div><p class="techEyebrow">ACTIVITÉ</p><h1>Mes missions</h1><p>Suivez l’état de vos missions et effectuez la prochaine action.</p></div><div class="techCount">${active} active(s)</div></div>
            <section class="techPanel"><div class="techMissionList">${m.map(x=>missionRow(x,i.find(iv=>iv.request_id===x.id))).join('')||'<div class="techEmpty"><span>✓</span><div><strong>Aucune mission</strong><p>Vos missions apparaîtront ici après acceptation d’une demande.</p></div></div>'}</div></section>
          </section>

          <section class="techSection" data-section="quotes">
            <div class="techPageHead"><div><p class="techEyebrow">DEVIS</p><h1>Mes devis</h1><p>Créez et suivez les devis liés à vos missions.</p></div></div>
            <section class="techPanel"><div class="techRequestList">${m.filter(x=>['accepted','quoted','scheduled','in_progress'].includes(x.status)).map(x=>`<div class="techQuoteRow"><div class="techQuoteMain"><div class="techServiceIcon">€</div><div><strong>${esc(x.service_type)}</strong><small>📍 ${esc(x.address||'Localisation non renseignée')}</small></div></div><div>${badge(x.status)}</div><div class="techQuoteAction">${x.status==='accepted'?`<button class="techAction primary" data-action="quote" data-id="${x.id}">Créer le devis</button>`:x.status==='quoted'?'<span class="techMuted">Devis envoyé · en attente du client</span>':'<span class="techMuted">✓ Intervention planifiée</span>'}</div></div>`).join('')||'<div class="techEmpty"><span>€</span><div><strong>Aucun devis à gérer</strong><p>Les missions acceptées apparaîtront ici.</p></div></div>'}</div></section>
          </section>

          <section class="techSection" data-section="history">
            <div class="techPageHead"><div><p class="techEyebrow">ARCHIVES</p><h1>Historique</h1><p>Retrouvez vos interventions et leurs montants.</p></div></div>
            <section class="techPanel"><div class="techHistoryList">${i.map(x=>`<div class="techHistoryRow"><div><strong>${esc(x.status==='completed'?'Intervention terminée':'Intervention')}</strong><small>${x.completed_at?fmtDate(x.completed_at):x.scheduled_at?'Rendez-vous : '+fmtDateTime(x.scheduled_at):'Date non définie'}</small></div><div>${badge(x.status)}</div><strong>${money(x.final_amount)}</strong><div>${x.status==='scheduled'?`<button class="techAction" data-action="start-intervention" data-id="${x.id}">Démarrer</button>`:x.status==='in_progress'?`<button class="techAction primary" data-action="complete-intervention" data-id="${x.id}">Terminer</button>`:''}</div></div>`).join('')||'<div class="techEmpty"><span>↺</span><div><strong>Aucune intervention</strong><p>Votre historique apparaîtra ici.</p></div></div>'}</div></section>
          </section>

          <section class="techSection" data-section="profile">
            <div class="techPageHead"><div><p class="techEyebrow">COMPTE</p><h1>Mon profil</h1><p>Gérez vos informations professionnelles.</p></div><button class="techAction primary" data-action="edit-profile">Modifier le profil</button></div>
            <section class="techPanel techProfilePanel"><div class="techProfileHero"><span class="techAvatar large">${initials}</span><div><h2>${display}</h2><p>${esc(t.specialty||'Spécialité à renseigner')}</p></div><span class="techVerification ${t.is_verified?'verified':''}">${t.is_verified?'✓ Profil vérifié':'Vérification en attente'}</span></div><div class="techProfileGrid"><div><small>SPÉCIALITÉ</small><strong>${esc(t.specialty||'À renseigner')}</strong></div><div><small>ZONE D’INTERVENTION</small><strong>${esc(t.service_area||'À renseigner')}</strong></div><div><small>DISPONIBILITÉ</small><strong>${t.is_available?'Disponible':'Indisponible'}</strong></div><div><small>NOTE MOYENNE</small><strong>${t.rating||'—'}</strong></div></div></section>
          </section>

          <section class="techSection" data-section="notifications">
            <div class="techPageHead"><div><p class="techEyebrow">CENTRE DE NOTIFICATIONS</p><h1>Notifications</h1><p>${unread?`${unread} notification(s) non lue(s)`: 'Tout est à jour'}</p></div>${unread?'<button class="techAction" data-action="read-notifications">Tout marquer comme lu</button>':''}</div>
            <section class="techPanel"><div class="techNotifications">${n.map(x=>`<div class="techNotification ${x.is_read?'':'unread'}"><span class="techNotificationIcon">${x.is_read?'◉':'●'}</span><div><strong>${esc(x.title||'Notification')}</strong><p>${esc(x.body||'')}</p><small>${x.created_at?new Date(x.created_at).toLocaleString('fr-FR'):''}</small></div></div>`).join('')||'<div class="techEmpty"><span>◉</span><div><strong>Aucune notification</strong><p>Vous êtes à jour.</p></div></div>'}</div></section>
          </section>
        </div>
      </main>
    </div>`;

  $('techSideLogout')?.addEventListener('click',async()=>{if(sb)await sb.auth.signOut();user=null;profile=null;techProfile=null;location.reload()});
  $('techSide')?.addEventListener('click',e=>{if(e.target.closest('button[data-tab]')) $('techSide')?.classList.remove('open')});
}
function requestCard(x){
  return `<article class="techRequestCard"><div class="techRequestTop"><div class="techRequestService"><span class="techServiceIcon">${String(x.service_type||'S').trim().slice(0,1).toUpperCase()}</span><div><h3>${esc(x.service_type||'Service de climatisation')}</h3><div class="techMeta"><span>📍 ${esc(x.address||'Localisation non renseignée')}</span>${x.preferred_date?`<span>📅 ${new Date(x.preferred_date).toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}</span>`:''}</div></div></div>${badge(x.status)}</div><p class="techRequestDesc">${esc(String(x.description||'Aucune description').length>125?String(x.description).slice(0,122)+'…':x.description||'Aucune description')}</p><div class="techRequestBottom"><small>${x.budget?`Budget indicatif : ${money(x.budget)}`:'Nouvelle demande'}</small><button class="techAction primary" data-action="take" data-id="${x.id}">Accepter la mission →</button></div></article>`
}
function missionRow(x,iv){
  let action='';
  if(x.status==='accepted') action=`<button class="techAction primary" data-action="quote" data-id="${x.id}">Faire un devis</button>`;
  else if(x.status==='quoted') action='<span class="techMuted">Devis envoyé · en attente du client</span>';
  else if(x.status==='scheduled'&&iv) action=`<button class="techAction" data-action="start-intervention" data-id="${iv.id}">Démarrer</button>`;
  else if(x.status==='in_progress'&&iv) action=`<button class="techAction primary" data-action="complete-intervention" data-id="${iv.id}">Terminer</button>`;
  else if(x.status==='completed') action='<span class="techMuted">Mission terminée</span>';
  return `<article class="techMissionRow"><div class="techMissionMain"><span class="techServiceIcon">${String(x.service_type||'M').trim().slice(0,1).toUpperCase()}</span><div><strong>${esc(x.service_type||'Mission')}</strong><small>📍 ${esc(x.address||'Localisation non renseignée')}</small><small>${x.preferred_date?'📅 '+new Date(x.preferred_date).toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):iv?.scheduled_at?'📅 Rendez-vous : '+new Date(iv.scheduled_at).toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'Date à définir'}</small></div></div><div>${badge(x.status)}</div><div class="techMissionAction">${action}</div></article>`
}
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
async function handleAction(e){const el=e.target.closest('[data-action]');if(!el)return;const a=el.dataset.action;try{if(a==='take')await take(el.dataset.id);else if(a==='quote')await createQuote(el.dataset.id);else if(a==='accept-quote')await acceptQuote(el.dataset.id,el.dataset.request);else if(a==='reject-quote')await rejectQuote(el.dataset.id);else if(a==='schedule')await schedule(el.dataset.id,el.dataset.request);else if(a==='availability')await toggleAvailability();else if(a==='edit-profile')await editProfile();else if(a==='start-intervention')await startIntervention(el.dataset.id);else if(a==='complete-intervention')await completeIntervention(el.dataset.id);else if(a==='read-notifications')await readNotifications();else if(a==='rate')rate(el.dataset.id,Number(el.dataset.rating));else if(a==='review')await sendReview(el.dataset.id);else if(a==='client-menu')document.querySelector('.clientSide')?.classList.toggle('open');else if(a==='tech-menu')document.querySelector('.techSide')?.classList.toggle('open');else if(a==='client-scroll-notifications')document.querySelector('#clientNotificationsPanel')?.scrollIntoView({behavior:'smooth',block:'start'})}catch(err){console.error(err);alert('Une erreur est survenue. Réessayez.')}}

async function startApp(){if(!ready()){setTimeout(startApp,250);return}initClient();bindStatic();if(sb)sb.auth.onAuthStateChange((event)=>{ if(['SIGNED_IN','SIGNED_OUT','TOKEN_REFRESHED'].includes(event)) setTimeout(init,0); });await init()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startApp);else startApp();
