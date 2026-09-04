const SUPABASE_URL='https://hbigfogqrjobawzdbdue.supabase.co';
const SUPABASE_KEY='sb_publishable_LRAkisi90QWpd60uheIFkA_8cZmuACl';
let sb=null,user=null,profile=null,techProfile=null;
let clientState={requests:[],quotes:[],interventions:[],reviews:[],notifications:[],payments:[]};
let techState={requests:[],missions:[],interventions:[],notifications:[]};
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const money=n=>Number(n||0).toLocaleString('fr-FR')+' FCFA';
const statusLabel={pending:'En attente',accepted:'Acceptée',quoted:'Devis reçu',scheduled:'Planifiée',in_progress:'En cours',completed:'Terminée',rejected:'Refusée',cancelled:'Annulée'};
const badge=s=>`<span class="statusBadge status-${esc(s||'pending')}">${esc(statusLabel[s]||s||'En attente')}</span>`;
const fmtDate=v=>v?new Date(v).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric'}):'—';
const fmtDateTime=v=>v?new Date(v).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—';
function ready(){return !!(window.supabase&&window.supabase.createClient)}
function initClient(){if(!sb&&ready())sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);return sb}
function modal(show){$('modal')?.classList.toggle('hidden',!show);if(show){setTimeout(()=>$('email')?.focus(),80)}}
function msg(id,text,error=false){const el=$(id);if(el){el.textContent=text;el.className=error?'formMsg error':'formMsg success'}}
function setBusy(btn,busy){if(!btn)return;btn.disabled=busy;btn.dataset.oldText??=btn.textContent;btn.textContent=busy?'Traitement…':btn.dataset.oldText}
function initials(p=profile){const s=((p?.first_name||'')+' '+(p?.last_name||'')).trim();return (s?s.split(/\s+/).map(x=>x[0]).join('').slice(0,2):'CL').toUpperCase()}
function fullName(p=profile,fallback='Utilisateur'){return (((p?.first_name||'')+' '+(p?.last_name||'')).trim()||fallback)}

function bindStatic(){
  $('authBtn')?.addEventListener('click',()=>modal(true));
  $('close')?.addEventListener('click',()=>modal(false));
  $('modal')?.addEventListener('click',e=>{if(e.target===$('modal'))modal(false)});
  $('toSignup')?.addEventListener('click',()=>showSignup('client'));
  $('toLogin')?.addEventListener('click',()=>showLogin());
  $('roleSelect')?.addEventListener('change',toggleTechFields);
  $('loginForm')?.addEventListener('submit',login);
  $('signupForm')?.addEventListener('submit',signup);
  $('requestForm')?.addEventListener('submit',createRequest);
  $('logoutBtn')?.addEventListener('click',logout);
  document.addEventListener('click',globalClick);
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawers()});
}
function showLogin(){ $('signup')?.classList.add('hidden'); $('login')?.classList.remove('hidden'); }
function showSignup(role='client'){$('login')?.classList.add('hidden');$('signup')?.classList.remove('hidden');if($('roleSelect'))$('roleSelect').value=role;toggleTechFields()}
function toggleTechFields(){const tech=$('roleSelect')?.value==='technicien';$('techFields')?.classList.toggle('hidden',!tech);if($('specialty'))$('specialty').required=tech;if($('serviceArea'))$('serviceArea').required=tech}
window.openTechSignup=()=>{modal(true);showSignup('technicien')};
function openRole(role){
  if(!user){modal(true);showSignup(role);return}
  const current=profile?.role||'client';
  if(current!==role){alert(`Ce compte est un compte ${current==='technicien'?'technicien':'client'}. Vous ne pouvez pas ouvrir l’espace ${role==='technicien'?'technicien':'client'} avec ce compte.`);return}
  openDashboard();
}
function openDashboard(){$('dashboard')?.classList.remove('hidden');$('dashboard')?.scrollIntoView({behavior:'smooth',block:'start'});renderSpace()}
function closeDrawers(){document.querySelectorAll('.appSide.open').forEach(x=>x.classList.remove('open'));document.querySelectorAll('.drawerOverlay.open').forEach(x=>x.classList.remove('open'))}
function toggleDrawer(role){const side=$(`-${role}`);if(!side)return;side.classList.toggle('open');$(`overlay-${role}`)?.classList.toggle('open',side.classList.contains('open'))}
function bindDynamicForms(){
  const f=document.querySelector('#spaceRequestForm');
  if(f&&!f.dataset.bound){f.dataset.bound='1';f.addEventListener('submit',createSpaceRequest)}
}
function globalClick(e){
  const roleNav=e.target.closest('[data-space-nav]');
  if(roleNav){e.preventDefault();navigateSpace(roleNav.dataset.space,roleNav.dataset.spaceNav);return}
  const drawerBtn=e.target.closest('[data-drawer]');
  if(drawerBtn){toggleDrawer(drawerBtn.dataset.drawer);return}
  const closeDrawer=e.target.closest('[data-close-drawer]');
  if(closeDrawer){closeDrawers();return}
  const action=e.target.closest('[data-action]');
  if(action){handleAction(action);return}
  const role=e.target.closest('[data-open-role]');
  if(role){openRole(role.dataset.openRole);return}
}

async function login(e){
  e.preventDefault();if(!initClient())return msg('loginMsg','Service indisponible. Rechargez la page.',true);
  const btn=e.submitter;setBusy(btn,true);msg('loginMsg','Connexion…');
  const {error}=await sb.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});
  setBusy(btn,false);
  if(error)return msg('loginMsg',error.message,true);
  msg('loginMsg','✓ Connexion réussie');setTimeout(()=>modal(false),250);
}
async function signup(e){
  e.preventDefault();if(!initClient())return msg('signupMsg','Service indisponible. Rechargez la page.',true);
  const role=$('roleSelect')?.value||'client',btn=e.submitter;setBusy(btn,true);msg('signupMsg','Création du compte…');
  const email=$('semail')?.value.trim(),password=$('spass')?.value||'';
  if(!email||password.length<6){setBusy(btn,false);return msg('signupMsg','E-mail et mot de passe (6 caractères minimum) requis.',true)}
  const meta={first_name:$('first')?.value.trim()||'',last_name:$('last')?.value.trim()||'',phone:$('sphone')?.value.trim()||'',role};
  if(role==='technicien'){meta.specialty=$('specialty')?.value.trim()||'Installation et entretien clim';meta.service_area=$('serviceArea')?.value.trim()||''}
  try{
    const {data,error}=await sb.auth.signUp({email,password,options:{data:meta,emailRedirectTo:location.origin}});
    if(error)return msg('signupMsg','Erreur : '+error.message,true);
    if(!data?.user)return msg('signupMsg','Le compte n’a pas été créé.',true);
    // Le trigger Supabase crée le profil et le profil technicien côté serveur.
    // On ne fait l’upsert client que lorsqu’une session réelle existe.
    if(data.session)await ensureProfile(data.user);
    msg('signupMsg',data.session?'✓ Compte créé. Connexion réussie.':'✓ Compte créé. Vérifiez votre e-mail puis connectez-vous.');
    if(data.session)setTimeout(()=>modal(false),650);
  }catch(err){console.error('signup',err);msg('signupMsg','Erreur : '+(err?.message||'Impossible de créer le compte.'),true)}
  finally{setBusy(btn,false)}
}
async function ensureProfile(u){
  if(!u||!sb)return;const m=u.user_metadata||{};
  try{
    await sb.from('profiles').upsert({id:u.id,role:m.role==='technicien'?'technicien':'client',first_name:m.first_name||'',last_name:m.last_name||'',phone:m.phone||''},{onConflict:'id'});
    if(m.role==='technicien')await sb.from('technicians').upsert({id:u.id,specialty:m.specialty||'Installation et entretien clim',service_area:m.service_area||'',is_verified:false,is_available:false},{onConflict:'id'});
  }catch(err){console.warn('Profil secondaire:',err)}
}
async function logout(){if(sb)await sb.auth.signOut();user=null;profile=null;techProfile=null;location.reload()}

async function createRequest(e){
  e.preventDefault();if(!initClient())return msg('requestMsg','Service indisponible. Rechargez la page.',true);
  if(!user){modal(true);showLogin();return msg('requestMsg','Connectez-vous avant d’envoyer une demande.',true)}
  if(profile?.role!=='client')return msg('requestMsg','Seul un compte client peut envoyer une demande.',true);
  const btn=e.submitter;setBusy(btn,true);msg('requestMsg','Envoi de la demande…');
  try{
    const map={installation:'Installation de clim',entretien:'Entretien de clim',reparation:'Réparation de clim'};
    const payload={client_id:user.id,service_type:map[$('service')?.value]||$('service')?.value||'Installation de clim',contact_phone:$('phone')?.value.trim()||'',address:$('address')?.value.trim()||'',preferred_date:$('date')?.value?new Date($('date').value).toISOString():null,budget:$('budget')?.value?Number($('budget').value):null,description:$('description')?.value.trim()||'',status:'pending'};
    if(!payload.contact_phone||!payload.address||!payload.description)return msg('requestMsg','Téléphone, adresse et description sont obligatoires.',true);
    const {error}=await sb.from('requests').insert(payload);if(error)return msg('requestMsg','Erreur : '+error.message,true);
    msg('requestMsg','✓ Demande envoyée. Vous serez informé de la suite.');$('requestForm')?.reset();await renderSpace();
  }catch(err){console.error(err);msg('requestMsg','Erreur : '+(err?.message||'Impossible d’envoyer la demande.'),true)}finally{setBusy(btn,false)}
}

async function createSpaceRequest(e){
  e.preventDefault();if(!user||profile?.role!=='client')return;
  const btn=e.submitter;setBusy(btn,true);msg('spaceRequestMsg','Envoi de la demande…');
  try{
    const map={installation:'Installation de clim',entretien:'Entretien de clim',reparation:'Réparation de clim'};
    const payload={client_id:user.id,service_type:map[$('spaceService')?.value]||'Installation de clim',contact_phone:$('spacePhone')?.value.trim()||'',address:$('spaceAddress')?.value.trim()||'',preferred_date:$('spaceDate')?.value?new Date($('spaceDate').value).toISOString():null,budget:$('spaceBudget')?.value?Number($('spaceBudget').value):null,description:$('spaceDescription')?.value.trim()||'',status:'pending'};
    if(!payload.contact_phone||!payload.address||!payload.description)return msg('spaceRequestMsg','Téléphone, adresse et description sont obligatoires.',true);
    const {error}=await sb.from('requests').insert(payload);if(error)return msg('spaceRequestMsg','Erreur : '+error.message,true);
    msg('spaceRequestMsg','✓ Demande envoyée. Vous serez informé de la suite.');$('spaceRequestForm')?.reset();if($('spacePhone'))$('spacePhone').value=profile?.phone||'';await loadClient();setTimeout(()=>{activeClient='reservations';renderClientShell('reservations')},500);
  }catch(err){console.error(err);msg('spaceRequestMsg','Erreur : '+(err?.message||'Impossible d’envoyer la demande.'),true)}finally{setBusy(btn,false)}
}
async function loadClient(){
  const rq=await sb.from('requests').select('*').eq('client_id',user.id).order('created_at',{ascending:false});if(rq.error)throw rq.error;
  const ids=(rq.data||[]).map(x=>x.id);
  const [qt,iv,rv,nf]=await Promise.all([
    ids.length?sb.from('quotes').select('*').in('request_id',ids).order('created_at',{ascending:false}):Promise.resolve({data:[],error:null}),
    sb.from('interventions').select('*').eq('client_id',user.id).order('created_at',{ascending:false}),
    sb.from('reviews').select('*').eq('client_id',user.id).order('created_at',{ascending:false}),
    sb.from('notifications').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(20)
  ]);
  if(qt.error)throw qt.error;if(iv.error)throw iv.error;if(rv.error)throw rv.error;if(nf.error)throw nf.error;
  const ivs=iv.data||[],ivIds=ivs.map(x=>x.id);
  let payments=[];if(ivIds.length){const pay=await sb.from('payments').select('*').in('intervention_id',ivIds);if(!pay.error)payments=pay.data||[]}
  clientState={requests:rq.data||[],quotes:qt.data||[],interventions:ivs,reviews:rv.data||[],notifications:nf.data||[],payments};
}
function clientPage(name){
  const r=clientState.requests,q=clientState.quotes,i=clientState.interventions,n=clientState.notifications,p=clientState.payments;
  const first=profile?.first_name||'Client';
  const common=`<div class="spacePageHead"><div><p class="eyebrow">ESPACE CLIENT</p><h1>${name==='dashboard'?`Bonjour, ${esc(first)} 👋`:esc(name)}</h1><p>${name==='dashboard'?'Bienvenue dans votre espace client ClimExpress.':'Retrouvez ici les informations essentielles de votre compte.'}</p></div></div>`;
  if(name==='dashboard'){
    const active=r.filter(x=>!['completed','cancelled','rejected'].includes(x.status)).length;
    return `${common}<div class="clientBookingHero"><div><span>Votre prochaine intervention</span><strong>${nextClientIntervention(i,r)}</strong><small>Gérez vos demandes, rendez-vous et devis depuis votre espace.</small></div><button class="primary" data-action="client-reserve">Réserver un service</button></div>
      <div class="statsGrid clientStatsGrid"><div class="statCard"><span>Réservations</span><strong>${r.length}</strong></div><div class="statCard"><span>Interventions</span><strong>${i.length}</strong></div><div class="statCard"><span>Factures</span><strong>${p.length||i.filter(x=>x.status==='completed').length}</strong></div></div>
      <div class="contentPanel"><div class="panelHead"><div><h2>Mes réservations récentes</h2><p>Les dernières demandes enregistrées.</p></div><button class="textButton" data-space-nav="reservations">Voir tout</button></div>${r.slice(0,5).map(clientReservationRow).join('')||empty('Aucune réservation pour le moment.','Réserver un service','client-reserve')}</div>`;
  }
  if(name==='reserve')return `${common}<div class="contentPanel reservePanel"><div class="panelHead"><div><h2>Réserver un service</h2><p>Décrivez votre besoin pour recevoir une prise en charge.</p></div></div><form id="spaceRequestForm" class="requestForm spaceRequestForm"><label>Service<select id="spaceService"><option value="installation">Installation</option><option value="entretien">Entretien</option><option value="reparation">Réparation</option></select></label><label>Téléphone<input id="spacePhone" value="${esc(profile?.phone||'')}" required></label><label>Adresse<input id="spaceAddress" required></label><label>Date souhaitée<input id="spaceDate" type="datetime-local"></label><label>Budget indicatif<input id="spaceBudget" type="number" min="0" placeholder="FCFA"></label><label>Description<textarea id="spaceDescription" required placeholder="Décrivez brièvement votre besoin"></textarea></label><button class="primary">Envoyer ma demande</button><p id="spaceRequestMsg" class="formMsg"></p></form></div>`;
  if(name==='reservations')return `${common}<div class="contentPanel">${r.map(clientReservationDetail).join('')||empty('Aucune réservation pour le moment.','Réserver un service','client-reserve')}</div>`;
  if(name==='interventions')return `${common}<div class="contentPanel">${i.map(iv=>{const req=r.find(x=>x.id===iv.request_id);return `<div class="listRow"><div><strong>${esc(req?.service_type||'Intervention')}</strong><small>${esc(iv.address||req?.address||'')} · ${fmtDateTime(iv.scheduled_at)}</small></div><div>${badge(iv.status)}</div><strong>${money(iv.final_amount)}</strong></div>`}).join('')||empty('Aucune intervention enregistrée.')}</div>`;
  if(name==='invoices')return `${common}<div class="contentPanel"><div class="invoiceNote">Les montants affichés proviennent des interventions terminées et des paiements enregistrés dans votre compte.</div>${i.filter(x=>x.status==='completed').map(iv=>{const pay=p.find(x=>x.intervention_id===iv.id);return `<div class="listRow"><div><strong>Facture · ${fmtDate(iv.completed_at||iv.created_at)}</strong><small>Intervention terminée</small></div><div>${pay?badge(pay.status):'<span class="statusBadge status-pending">À régler</span>'}</div><strong>${money(pay?.amount||iv.final_amount)}</strong></div>`}).join('')||empty('Aucune facture disponible pour le moment.')}</div>`;
  if(name==='devices')return `${common}<div class="contentPanel emptyState"><div class="emptyIcon">❄</div><h2>Aucun appareil enregistré</h2><p>La gestion des appareils n’est pas encore alimentée par les données actuelles de ClimExpress.</p></div>`;
  if(name==='profile')return `${common}<div class="contentPanel profilePanel"><div class="bigAvatar">${initials()}</div><div class="profileData"><div><span>Prénom</span><strong>${esc(profile?.first_name||'—')}</strong></div><div><span>Nom</span><strong>${esc(profile?.last_name||'—')}</strong></div><div><span>Téléphone</span><strong>${esc(profile?.phone||'—')}</strong></div><div><span>E-mail</span><strong>${esc(user?.email||'—')}</strong></div></div></div>`;
  if(name==='notifications')return `${common}<div class="contentPanel"><div class="panelHead"><div><h2>Notifications</h2><p>Les informations importantes de votre compte.</p></div><button class="textButton" data-action="read-notifications">Tout marquer comme lu</button></div>${n.map(notificationRow).join('')||empty('Aucune notification.')}</div>`;
  if(name==='support')return `${common}<div class="contentPanel supportBox"><h2>Besoin d’aide ?</h2><p>Pour une demande liée à une réservation, ouvrez « Mes réservations » afin de retrouver le service, la date et le statut concernés.</p><p>Pour une intervention en cours, consultez « Mes interventions ».</p><button class="primary" data-space-nav="reservations">Voir mes réservations</button></div>`;
}
function nextClientIntervention(i,r){const x=i.find(v=>['scheduled','in_progress'].includes(v.status));if(!x)return'Aucune intervention programmée';const req=r.find(v=>v.id===x.request_id);return `${req?.service_type||'Intervention'} · ${fmtDateTime(x.scheduled_at)}`}
function clientReservationRow(x){const q=clientState.quotes.find(v=>v.request_id===x.id&&v.status!=='rejected');return `<div class="listRow"><div><strong>${esc(x.service_type)}</strong><small>${fmtDate(x.preferred_date)} · ${x.preferred_date?new Date(x.preferred_date).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'Heure à confirmer'}</small></div><div>${badge(x.status)}</div><button class="rowAction" data-space-nav="reservations">Détails</button></div>`}
function clientReservationDetail(x){const q=clientState.quotes.find(v=>v.request_id===x.id&&v.status!=='rejected'),iv=clientState.interventions.find(v=>v.request_id===x.id);return `<div class="reservationCard"><div class="reservationTop"><div><strong>${esc(x.service_type)}</strong><small>${esc(x.address||'Adresse non renseignée')}</small></div>${badge(x.status)}</div><div class="reservationMeta"><span>Date : ${fmtDateTime(x.preferred_date)}</span><span>Téléphone : ${esc(x.contact_phone||'—')}</span></div><p>${esc(x.description||'')}</p>${q?`<div class="quoteInline"><strong>Devis : ${money(q.amount)}</strong>${badge(q.status)}${q.status==='pending'?`<div class="actions"><button class="primary smallBtn" data-action="accept-quote" data-id="${q.id}" data-request="${x.id}">Accepter</button><button class="secondaryBtn" data-action="reject-quote" data-id="${q.id}">Refuser</button></div>`:''}${q.status==='accepted'&&x.status!=='scheduled'?`<div class="scheduleInline"><input id="dt-${x.id}" type="datetime-local"><button class="primary smallBtn" data-action="schedule" data-id="${q.id}" data-request="${x.id}">Choisir le rendez-vous</button></div>`:''}</div>`:''}${iv?`<div class="quoteInline"><strong>Intervention</strong>${badge(iv.status)}<span>${fmtDateTime(iv.scheduled_at)}</span>${iv.status==='completed'&&!clientState.reviews.find(v=>v.intervention_id===iv.id)?reviewBox(iv.id):''}</div>`:''}</div>`}
function reviewBox(id){return `<div class="reviewBox"><span>Votre avis :</span><div class="stars">${[1,2,3,4,5].map(k=>`<button type="button" data-action="rate" data-id="${id}" data-rating="${k}">☆</button>`).join('')}</div><input id="comment-${id}" placeholder="Votre commentaire"><button class="primary smallBtn" data-action="review" data-id="${id}">Publier</button></div>`}
function notificationRow(n){return `<div class="notificationRow ${n.is_read?'':'unread'}"><div class="notifDot"></div><div><strong>${esc(n.title||'Notification')}</strong><p>${esc(n.body||'')}</p><small>${fmtDateTime(n.created_at)}</small></div></div>`}

async function loadTech(){
  const tp=await sb.from('technicians').select('*').eq('id',user.id).maybeSingle();if(tp.error)throw tp.error;techProfile=tp.data;
  if(!techProfile){techState={requests:[],missions:[],interventions:[],notifications:[]};return}
  const [rq,mq,iv,nf]=await Promise.all([
    sb.from('requests').select('*').is('technician_id',null).eq('status','pending').order('created_at',{ascending:false}),
    sb.from('requests').select('*').eq('technician_id',user.id).order('created_at',{ascending:false}),
    sb.from('interventions').select('*').eq('technician_id',user.id).order('created_at',{ascending:false}),
    sb.from('notifications').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(20)
  ]);
  const err=[rq,mq,iv,nf].find(x=>x.error);if(err)throw err.error;
  techState={requests:rq.data||[],missions:mq.data||[],interventions:iv.data||[],notifications:nf.data||[]};
}
function techPage(name){
  const a=techState.requests,m=techState.missions,i=techState.interventions,n=techState.notifications;
  const first=profile?.first_name||'Technicien';
  const common=`<div class="spacePageHead"><div><p class="eyebrow">ESPACE TECHNICIEN</p><h1>${name==='dashboard'?`Bonjour, ${esc(first)} 👋`:esc(name)}</h1><p>${name==='dashboard'?'Gérez vos missions et vos interventions depuis un espace simple.':'Retrouvez ici les informations essentielles de votre activité.'}</p></div></div>`;
  if(name==='dashboard'){
    const active=m.filter(x=>['accepted','quoted','scheduled','in_progress'].includes(x.status)).length,done=i.filter(x=>x.status==='completed').length,unread=n.filter(x=>!x.is_read).length;
    return `${common}<div class="availabilityCard"><div><span class="availabilityDot ${techProfile?.is_available?'available':''}"></span><div><strong>${techProfile?.is_available?'Disponible':'Indisponible'}</strong><small>${techProfile?.is_available?'Vous pouvez recevoir de nouvelles demandes.':'Activez votre disponibilité pour accepter une mission.'}</small></div></div><button class="primary smallBtn" data-action="availability">${techProfile?.is_available?'Se rendre indisponible':'Activer ma disponibilité'}</button></div>
      <div class="statsGrid techStatsGrid"><div class="statCard"><span>Demandes disponibles</span><strong>${a.length}</strong></div><div class="statCard"><span>Missions en cours</span><strong>${active}</strong></div><div class="statCard"><span>Interventions terminées</span><strong>${done}</strong></div><div class="statCard"><span>Note moyenne</span><strong>${techProfile?.rating??'—'}</strong></div></div>
      <div class="dashboardColumns"><div class="contentPanel"><div class="panelHead"><div><h2>Nouvelles demandes</h2><p>Les demandes disponibles pour vous.</p></div><button class="textButton" data-space-nav="requests">Voir tout</button></div>${a.slice(0,4).map(techRequestCard).join('')||empty('Aucune nouvelle demande.')}</div><div class="contentPanel"><div class="panelHead"><div><h2>Mes missions en cours</h2><p>La prochaine action à effectuer.</p></div><button class="textButton" data-space-nav="missions">Voir tout</button></div>${m.filter(x=>x.status!=='completed').slice(0,4).map(techMissionRow).join('')||empty('Aucune mission en cours.')}</div></div>`;
  }
  if(name==='requests')return `${common}<div class="contentPanel">${a.map(techRequestCard).join('')||empty('Aucune demande disponible.')}</div>`;
  if(name==='missions')return `${common}<div class="contentPanel">${m.map(techMissionRow).join('')||empty('Aucune mission.')}</div>`;
  if(name==='quotes')return `${common}<div class="contentPanel">${m.filter(x=>['accepted','quoted','scheduled','in_progress'].includes(x.status)).map(x=>`<div class="reservationCard"><div class="reservationTop"><div><strong>${esc(x.service_type)}</strong><small>${esc(x.address||'')}</small></div>${badge(x.status)}</div><p>${esc(x.description||'')}</p>${x.status==='accepted'?`<button class="primary smallBtn" data-action="quote" data-id="${x.id}">Créer le devis</button>`:x.status==='quoted'?'<div class="infoInline">Devis envoyé · en attente du client.</div>':'<div class="infoInline">Intervention planifiée.</div>'}</div>`).join('')||empty('Aucun devis à gérer.')}</div>`;
  if(name==='history')return `${common}<div class="contentPanel">${i.map(x=>`<div class="listRow"><div><strong>${x.status==='completed'?'Intervention terminée':'Intervention'}</strong><small>${fmtDateTime(x.completed_at||x.scheduled_at)}</small></div>${badge(x.status)}<strong>${money(x.final_amount)}</strong><div>${x.status==='scheduled'?`<button class="primary smallBtn" data-action="start-intervention" data-id="${x.id}">Démarrer</button>`:x.status==='in_progress'?`<button class="primary smallBtn" data-action="complete-intervention" data-id="${x.id}">Terminer</button>`:''}</div></div>`).join('')||empty('Aucune intervention.')}</div>`;
  if(name==='profile')return `${common}<div class="contentPanel profilePanel"><div class="bigAvatar">${initials()}</div><div class="profileData"><div><span>Nom</span><strong>${esc(fullName())}</strong></div><div><span>Spécialité</span><strong>${esc(techProfile?.specialty||'—')}</strong></div><div><span>Zone d’intervention</span><strong>${esc(techProfile?.service_area||'—')}</strong></div><div><span>Vérification</span><strong>${techProfile?.is_verified?'Profil vérifié':'En attente de vérification'}</strong></div><div><span>E-mail</span><strong>${esc(user?.email||'—')}</strong></div></div><button class="secondaryBtn" data-action="edit-profile">Modifier</button></div>`;
  if(name==='notifications')return `${common}<div class="contentPanel"><div class="panelHead"><div><h2>Notifications</h2><p>Les informations importantes de votre activité.</p></div><button class="textButton" data-action="read-notifications">Tout marquer comme lu</button></div>${n.map(notificationRow).join('')||empty('Aucune notification.')}</div>`;
}
function techRequestCard(x){return `<div class="requestCard"><div class="reservationTop"><div><strong>${esc(x.service_type)}</strong><small>📍 ${esc(x.address||'Adresse non renseignée')}</small></div>${badge(x.status)}</div><div class="reservationMeta"><span>📅 ${fmtDateTime(x.preferred_date)}</span>${x.budget?`<span>Budget : ${money(x.budget)}</span>`:''}</div><p>${esc(x.description||'Aucune description')}</p><button class="primary smallBtn" data-action="take" data-id="${x.id}">Accepter</button></div>`}
function techMissionRow(x){const iv=techState.interventions.find(v=>v.request_id===x.id);let action='';if(x.status==='accepted')action=`<button class="primary smallBtn" data-action="quote" data-id="${x.id}">Faire un devis</button>`;else if(x.status==='quoted')action='<span class="infoInline">Devis envoyé · en attente du client</span>';else if(x.status==='scheduled'&&iv)action=`<button class="primary smallBtn" data-action="start-intervention" data-id="${iv.id}">Démarrer</button>`;else if(x.status==='in_progress'&&iv)action=`<button class="primary smallBtn" data-action="complete-intervention" data-id="${iv.id}">Terminer</button>`;else if(x.status==='completed')action='<span class="infoInline">Mission terminée</span>';return `<div class="listRow missionRow"><div><strong>${esc(x.service_type)}</strong><small>${esc(x.address||'')} · ${fmtDateTime(x.preferred_date)}</small></div>${badge(x.status)}<div>${action}</div></div>`}

function empty(text,button,action){return `<div class="emptyState"><div class="emptyIcon">${button?'＋':'○'}</div><p>${esc(text)}</p>${button?`<button class="primary smallBtn" data-action="${action}">${esc(button)}</button>`:''}</div>`}
function renderClientShell(page){
  const unread=clientState.notifications.filter(x=>!x.is_read).length;
  $('dashContent').innerHTML=`<div class="appShell clientShell"><aside id="-client" class="appSide clientSide"><div class="sideBrand"><b>Clim<span>Express</span></b><small>ESPACE CLIENT</small></div><nav class="sideNav">${clientNav('dashboard','Tableau de bord')} ${clientNav('reservations','Mes réservations')} ${clientNav('interventions','Mes interventions')} ${clientNav('invoices','Mes factures')} ${clientNav('devices','Mes appareils')} ${clientNav('profile','Mon profil')} ${clientNav('notifications',`Notifications${unread?` <em>${unread}</em>`:''}`)} ${clientNav('support','Support')}</nav><button class="logoutLink" data-action="logout">Déconnexion</button></aside><div id="overlay-client" class="drawerOverlay" data-close-drawer="client"></div><section class="appMain"><header class="appHeader"><button class="hamburger" data-drawer="client" aria-label="Ouvrir le menu"><i></i><i></i><i></i></button><b class="mobileBrand">Clim<span>Express</span></b><div class="headerSpacer"></div><button class="iconBtn" data-space-nav="notifications" aria-label="Notifications">🔔${unread?`<sup>${unread}</sup>`:''}</button><button class="profileChip" data-space-nav="profile"><span>${initials()}</span><strong>${esc(fullName())}</strong></button></header><main class="appContent">${clientPage(page)}</main></section></div>`;bindDynamicForms();
}
function clientNav(key,label){return `<button class="sideLink ${activeClient===key?'active':''}" data-space-nav="${key}">${label}</button>`}
function renderTechShell(page){
  const unread=techState.notifications.filter(x=>!x.is_read).length;
  $('dashContent').innerHTML=`<div class="appShell techShell"><aside id="-technicien" class="appSide techSide"><div class="sideBrand"><b>Clim<span>Express</span></b><small>ESPACE TECHNICIEN</small></div><nav class="sideNav">${techNav('dashboard','Tableau de bord')} ${techNav('requests','Demandes disponibles')} ${techNav('missions','Mes missions')} ${techNav('quotes','Mes devis')} ${techNav('history','Historique')} ${techNav('profile','Mon profil')} ${techNav('notifications',`Notifications${unread?` <em>${unread}</em>`:''}`)}</nav><div class="sideStatus"><span class="availabilityDot ${techProfile?.is_available?'available':''}"></span><div><strong>${techProfile?.is_available?'Disponible':'Indisponible'}</strong><small>Statut actuel</small></div></div><button class="logoutLink" data-action="logout">Déconnexion</button></aside><div id="overlay-technicien" class="drawerOverlay" data-close-drawer="technicien"></div><section class="appMain"><header class="appHeader"><button class="hamburger" data-drawer="technicien" aria-label="Ouvrir le menu"><i></i><i></i><i></i></button><b class="mobileBrand">Clim<span>Express</span></b><div class="headerSpacer"></div><button class="iconBtn" data-space-nav="notifications" aria-label="Notifications">🔔${unread?`<sup>${unread}</sup>`:''}</button><button class="profileChip" data-space-nav="profile"><span>${initials()}</span><strong>${esc(fullName())}</strong></button></header><main class="appContent">${techPage(page)}</main></section></div>`;
}
function techNav(key,label){return `<button class="sideLink ${activeTech===key?'active':''}" data-space-nav="${key}">${label}</button>`}
let activeClient='dashboard',activeTech='dashboard';
async function navigateSpace(space,page){closeDrawers();if(space==='client'){activeClient=page;renderClientShell(page)}else if(space==='technicien'){activeTech=page;renderTechShell(page)}}
async function renderSpace(){
  if(!user||!profile)return;
  if(profile.role==='technicien'){await loadTech();renderTechShell(activeTech)}
  else if(profile.role==='client'){await loadClient();renderClientShell(activeClient)}
  else await renderAdmin();
}
async function renderAdmin(){
  const [{data:p=[]},{data:r=[]},{data:t=[]},{data:i=[]}]=await Promise.all([sb.from('profiles').select('*'),sb.from('requests').select('*'),sb.from('technicians').select('*'),sb.from('interventions').select('*')]);
  $('dashContent').innerHTML=`<div class="adminPanel"><div class="spacePageHead"><div><p class="eyebrow">ADMINISTRATION</p><h1>Tableau de bord</h1><p>Vue générale de l’activité ClimExpress.</p></div></div><div class="statsGrid"><div class="statCard"><span>Utilisateurs</span><strong>${p.length}</strong></div><div class="statCard"><span>Techniciens</span><strong>${t.length}</strong></div><div class="statCard"><span>Demandes</span><strong>${r.length}</strong></div><div class="statCard"><span>Interventions</span><strong>${i.length}</strong></div></div><div class="contentPanel"><div class="panelHead"><h2>Demandes récentes</h2></div>${r.slice(0,20).map(x=>`<div class="listRow"><div><strong>${esc(x.service_type)}</strong><small>${esc(x.address||'')}</small></div>${badge(x.status)}</div>`).join('')||empty('Aucune demande.')}</div></div>`;
}
async function toggleAvailability(){const next=!techProfile.is_available;const {error}=await sb.from('technicians').update({is_available:next}).eq('id',user.id);if(error)return alert(error.message);await renderSpace()}
async function take(id){if(!techProfile?.is_available)return alert('Activez votre disponibilité avant d’accepter une mission.');const {data,error}=await sb.rpc('claim_request',{p_request_id:id});if(error)return alert(error.message);if(!data)return alert('Cette demande a déjà été prise.');await renderSpace()}
async function createQuote(id){const amount=Number(prompt('Montant du devis en FCFA'));if(!Number.isFinite(amount)||amount<=0)return;const details=prompt('Détails du devis')||'';const {error}=await sb.from('quotes').insert({request_id:id,technician_id:user.id,amount,details,status:'pending'});if(error)return alert(error.message);const u=await sb.from('requests').update({status:'quoted'}).eq('id',id).eq('technician_id',user.id);if(u.error)return alert(u.error.message);alert('✓ Devis envoyé au client.');await renderSpace()}
async function acceptQuote(q,r){const {data,error}=await sb.from('quotes').update({status:'accepted',accepted_at:new Date().toISOString()}).eq('id',q).eq('status','pending').select().maybeSingle();if(error)return alert(error.message);if(!data)return alert('Ce devis n’est plus disponible.');const u=await sb.from('requests').update({status:'accepted'}).eq('id',r).eq('client_id',user.id);if(u.error)return alert(u.error.message);await renderSpace()}
async function rejectQuote(id){const {error}=await sb.from('quotes').update({status:'rejected'}).eq('id',id).eq('status','pending');if(error)return alert(error.message);await renderSpace()}
async function schedule(q,r){const el=$('dt-'+r);if(!el?.value)return alert('Choisissez une date et une heure.');const scheduled=new Date(el.value);if(Number.isNaN(scheduled.getTime()))return alert('Date invalide.');const {data:qr,error:qe}=await sb.from('quotes').select('amount,technician_id').eq('id',q).eq('status','accepted').maybeSingle();if(qe||!qr)return alert(qe?.message||'Devis introuvable.');const {error:ie}=await sb.from('interventions').upsert({request_id:r,client_id:user.id,technician_id:qr.technician_id,status:'scheduled',scheduled_at:scheduled.toISOString(),final_amount:qr.amount},{onConflict:'request_id'});if(ie)return alert(ie.message);const {error:re}=await sb.from('requests').update({status:'scheduled'}).eq('id',r).eq('client_id',user.id);if(re)return alert(re.message);alert('✓ Rendez-vous enregistré.');await renderSpace()}
async function editProfile(){let specialty=prompt('Spécialité',techProfile.specialty||'');if(specialty===null)return;let area=prompt('Zone d’intervention',techProfile.service_area||'');if(area===null)return;const {error}=await sb.from('technicians').update({specialty,service_area:area}).eq('id',user.id);if(error)return alert(error.message);await renderSpace()}
async function startIntervention(id){const {error}=await sb.from('interventions').update({status:'in_progress',started_at:new Date().toISOString()}).eq('id',id).eq('technician_id',user.id);if(error)return alert(error.message);await renderSpace()}
async function completeIntervention(id){const amount=Number(prompt('Montant final en FCFA'));if(!Number.isFinite(amount)||amount<0)return;const {data:iv,error}=await sb.from('interventions').update({status:'completed',completed_at:new Date().toISOString(),final_amount:amount}).eq('id',id).eq('technician_id',user.id).select('request_id').maybeSingle();if(error)return alert(error.message);if(iv?.request_id)await sb.from('requests').update({status:'completed'}).eq('id',iv.request_id).eq('technician_id',user.id);await renderSpace()}
async function readNotifications(){const {error}=await sb.from('notifications').update({is_read:true}).eq('user_id',user.id);if(error)return alert(error.message);await renderSpace()}
const ratings={};function rate(id,k){ratings[id]=k;document.querySelectorAll(`[data-action="rate"][data-id="${CSS.escape(id)}"]`).forEach((b,i)=>b.textContent=i<k?'★':'☆')}
async function sendReview(id){const rating=ratings[id]||0;if(!rating)return alert('Choisissez une note.');const comment=$('comment-'+id)?.value||'';const {data:iv,error:ie}=await sb.from('interventions').select('technician_id').eq('id',id).eq('client_id',user.id).maybeSingle();if(ie||!iv)return alert(ie?.message||'Intervention introuvable.');const {error}=await sb.from('reviews').insert({intervention_id:id,client_id:user.id,technician_id:iv.technician_id,rating,comment});if(error)return alert(error.message);await renderSpace()}
async function handleAction(el){
  const a=el.dataset.action;
  try{
    if(a==='client-reserve'){activeClient='reserve';await loadClient();renderClientShell('reserve');return}
    if(a==='logout'){await logout();return}
    if(a==='availability'){await toggleAvailability();return}
    if(a==='take'){await take(el.dataset.id);return}
    if(a==='quote'){await createQuote(el.dataset.id);return}
    if(a==='accept-quote'){await acceptQuote(el.dataset.id,el.dataset.request);return}
    if(a==='reject-quote'){await rejectQuote(el.dataset.id);return}
    if(a==='schedule'){await schedule(el.dataset.id,el.dataset.request);return}
    if(a==='edit-profile'){await editProfile();return}
    if(a==='start-intervention'){await startIntervention(el.dataset.id);return}
    if(a==='complete-intervention'){await completeIntervention(el.dataset.id);return}
    if(a==='read-notifications'){await readNotifications();return}
    if(a==='rate'){rate(el.dataset.id,Number(el.dataset.rating));return}
    if(a==='review'){await sendReview(el.dataset.id);return}
  }catch(err){console.error(err);alert('Une erreur est survenue. Réessayez.')}
}
function applyRoleUI(role){
  document.body.classList.remove('client-mode','technician-mode','admin-mode');document.body.classList.add(role==='technicien'?'technician-mode':role==='admin'?'admin-mode':'client-mode');
  const header=$('publicHeader');if(!header)return;
  header.classList.toggle('loggedIn',!!user);
  $('authBtn')?.classList.toggle('hidden',!!user);
  $('userMenu')?.classList.toggle('hidden',!user);
  const roleLinks=header.querySelectorAll('[data-open-role]');roleLinks.forEach(b=>b.classList.remove('disabledRole'));
  if(user){header.querySelector('[data-open-role="client"]')?.classList.toggle('disabledRole',role!=='client');header.querySelector('[data-open-role="technicien"]')?.classList.toggle('disabledRole',role!=='technicien')}
}
async function init(){
  if(!initClient())return;
  try{
    const {data:{session}}=await sb.auth.getSession();user=session?.user||null;
    if(!user){applyRoleUI('client');$('dashboard')?.classList.add('hidden');return}
    const pr=await sb.from('profiles').select('*').eq('id',user.id).maybeSingle();
    const meta=user.user_metadata||{},fallbackRole=meta.role==='technicien'?'technicien':meta.role==='admin'?'admin':'client';
    profile=pr.data||{id:user.id,role:fallbackRole,first_name:meta.first_name||'',last_name:meta.last_name||'',phone:meta.phone||''};
    if(!['client','technicien','admin'].includes(profile.role))profile.role=fallbackRole;
    applyRoleUI(profile.role);$('dashboard')?.classList.remove('hidden');await renderSpace();
  }catch(err){console.error('init',err);$('dashboard')?.classList.remove('hidden');$('dashContent').innerHTML=`<div class="errorPanel"><h2>Impossible de charger votre espace</h2><p>${esc(err?.message||'Erreur inconnue')}</p><button class="primary" onclick="location.reload()">Réessayer</button></div>`}
}
function startApp(){if(!ready()){setTimeout(startApp,250);return}initClient();bindStatic();sb.auth.onAuthStateChange(event=>{if(['SIGNED_IN','SIGNED_OUT','TOKEN_REFRESHED'].includes(event))setTimeout(init,0)});init()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startApp);else startApp();
