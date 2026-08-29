const SUPABASE_URL='https://hbigfogqrjobawzdbdue.supabase.co', SUPABASE_KEY='sb_publishable_LRAkisi90QWpd60uheIFkA_8cZmuACl';
let sb=null,user=null,profile=null,techProfile=null;
const $=x=>document.getElementById(x);
function supabaseReady(){ return !!(window.supabase && typeof window.supabase.createClient==='function'); }
function createSupabase(){ if(!sb && supabaseReady()) sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY); return sb; }
function requireSupabase(){ if(!createSupabase()){ alert('Connexion au service momentanément indisponible. Rechargez la page.'); return false; } return true; }
const L={pending:'En attente',accepted:'Acceptée',quoted:'Devis reçu',scheduled:'Planifiée',in_progress:'En cours',completed:'Terminée',rejected:'Refusée',cancelled:'Annulée'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const badge=s=>`<span class="badge ${s==='completed'?'ok':s==='pending'||s==='quoted'?'warn':s==='rejected'||s==='cancelled'?'bad':''}">${L[s]||s}</span>`;
const money=n=>Number(n||0).toLocaleString('fr-FR')+' FCFA';
function modal(v){$('modal')?.classList.toggle('hidden',!v)}
function bindUI(){
 $('authBtn')?.addEventListener('click',()=>modal(true));$('close')?.addEventListener('click',()=>modal(false));$('modal')?.addEventListener('click',e=>{if(e.target===$('modal'))modal(false)});
 $('toSignup')?.addEventListener('click',()=>{$('login').classList.add('hidden');$('signup').classList.remove('hidden')});$('toLogin')?.addEventListener('click',()=>{$('signup').classList.add('hidden');$('login').classList.remove('hidden')});
 $('roleSelect')?.addEventListener('change',e=>{const tech=e.target.value==='technicien';$('techFields').classList.toggle('hidden',!tech);$('specialty').required=tech;$('serviceArea').required=tech});
window.openTechSignup=()=>{modal(true);$('login').classList.add('hidden');$('signup').classList.remove('hidden');$('roleSelect').value='technicien';$('techFields').classList.remove('hidden');$('specialty').required=true;$('serviceArea').required=true};
 $('logoutBtn')?.addEventListener('click',async()=>{await sb.auth.signOut();location.reload()});$('dashBtn')?.addEventListener('click',()=>{$('dashboard').classList.remove('hidden');$('dashboard').scrollIntoView({behavior:'smooth'});render()});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bindUI);else bindUI();
// Fallback UI binding: guarantees navigation/modal buttons work even while Supabase is loading.
document.addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b) return;
  if(b.id==='authBtn'){e.preventDefault();modal(true);}
  if(b.id==='close'){e.preventDefault();modal(false);}
  if(b.id==='toSignup'){e.preventDefault();$('login')?.classList.add('hidden');$('signup')?.classList.remove('hidden');}
  if(b.id==='toLogin'){e.preventDefault();$('signup')?.classList.add('hidden');$('login')?.classList.remove('hidden');}
});

async function getProfile(u){let {data}=await sb.from('profiles').select('*').eq('id',u.id).maybeSingle();return data||{id:u.id,role:u.user_metadata?.role||'client',first_name:u.user_metadata?.first_name,last_name:u.user_metadata?.last_name,phone:u.user_metadata?.phone}}
async function init(){let {data:{session}}=await sb.auth.getSession();user=session?.user||null;if(user){profile=await getProfile(user);if(profile.role==='technicien'){let r=await sb.from('technicians').select('*').eq('id',user.id).maybeSingle();techProfile=r.data||null}$('authBtn')?.classList.add('hidden');$('userMenu')?.classList.remove('hidden');$('dashboard')?.classList.remove('hidden');$('role').textContent=profile.role==='admin'?'ADMINISTRATION':profile.role==='technicien'?'ESPACE TECHNICIEN':'ESPACE CLIENT';$('welcome').textContent='Bienvenue '+(profile.first_name||'');$('hint').textContent='Vous êtes connecté.';render()}else{$('authBtn')?.classList.remove('hidden');$('userMenu')?.classList.add('hidden')}}
function setupAuthListener(){ if(!createSupabase()) return; sb.auth.onAuthStateChange(()=>setTimeout(init,0)); }

$('signupForm').onsubmit=async e=>{e.preventDefault();if(!requireSupabase())return;if(!requireSupabase())return;$('signupMsg').textContent='Création...';const role=$('roleSelect').value;let {data,error}=await sb.auth.signUp({email:$('semail').value.trim(),password:$('spass').value,options:{data:{first_name:$('first').value.trim(),last_name:$('last').value.trim(),phone:$('sphone').value.trim(),role,specialty:role==='technicien'?$('specialty').value:'',service_area:role==='technicien'?$('serviceArea').value.trim():''},emailRedirectTo:location.origin}});if(error)return $('signupMsg').textContent=error.message;if(data.session){await ensureTechProfile(data.user);modal(false)}$('signupMsg').textContent=data.session?'✓ Compte créé':'✓ Vérifiez votre e-mail puis connectez-vous. Les informations technicien seront conservées.'};
$('loginForm').onsubmit=async e=>{e.preventDefault();if(!requireSupabase())return;if(!requireSupabase())return;$('loginMsg').textContent='Connexion...';let {error}=await sb.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});$('loginMsg').textContent=error?error.message:'✓ Connexion réussie';if(!error)setTimeout(()=>modal(0),300)};
async function ensureTechProfile(u){if(!u)return;const role=u.user_metadata?.role||'client';await sb.from('profiles').upsert({id:u.id,role,first_name:u.user_metadata?.first_name||'',last_name:u.user_metadata?.last_name||'',phone:u.user_metadata?.phone||''});if(role==='technicien')await sb.from('technicians').upsert({id:u.id,specialty:u.user_metadata?.specialty||'',service_area:u.user_metadata?.service_area||'',is_verified:false,is_available:false});}
$('requestForm').onsubmit=async e=>{e.preventDefault();if(!requireSupabase())return;if(!requireSupabase())return;if(!user)return modal(1);$('requestMsg').textContent='Envoi...';let {error}=await sb.from('requests').insert({client_id:user.id,service_type:$('service').value,contact_phone:$('phone').value.trim(),address:$('address').value.trim(),preferred_date:$('date').value?new Date($('date').value).toISOString():null,budget:$('budget').value?Number($('budget').value):null,description:$('description').value.trim(),status:'pending'});$('requestMsg').textContent=error?'Erreur : '+error.message:'✓ Demande envoyée';if(!error){e.target.reset();render()}};
async function render(){if(!user)return;if(profile.role==='technicien')return tech();if(profile.role==='admin')return admin();return client()}
async function client(){
 let {data:r=[]}=await sb.from('requests').select('*').eq('client_id',user.id).order('created_at',{ascending:false});
 let ids=r.map(x=>x.id);
 let {data:q=[]}=ids.length?await sb.from('quotes').select('*').in('request_id',ids).order('created_at',{ascending:false}):{data:[]};
 let {data:i=[]}=await sb.from('interventions').select('*').eq('client_id',user.id).order('created_at',{ascending:false});
 let {data:n=[]}=await sb.from('notifications').select('*').eq('user_id',user.id).order('created_at',{ascending:false}).limit(8);
 let {data:rv=[]}=await sb.from('reviews').select('*').eq('client_id',user.id);
 $('dashContent').innerHTML=`<div class="grid"><div class="stat"><strong>${r.length}</strong>Demandes</div><div class="stat"><strong>${r.filter(x=>x.status==='pending').length}</strong>En attente</div><div class="stat"><strong>${i.length}</strong>Interventions</div><div class="stat"><strong>${n.filter(x=>!x.read).length}</strong>Notifications</div></div>
 <div class="panel"><div class="sectionTitle"><div><h3>Mes demandes</h3><p>Suivez chaque étape jusqu'à l'intervention.</p></div></div>
 ${r.length?r.map(x=>{let z=q.find(a=>a.request_id===x.id&&a.status!=='rejected');let iv=i.find(a=>a.request_id===x.id);let review=iv&&rv.find(a=>a.intervention_id===iv.id);return `<div class="item"><div class="row"><b>${esc(x.service_type)}</b>${badge(x.status)}</div><p>${esc(x.description)}</p><small>📍 ${esc(x.address)} ${x.preferred_date?' · 📅 '+new Date(x.preferred_date).toLocaleString('fr-FR'):''}</small>
 ${z?`<div class="item"><div class="row"><b>Devis : ${money(z.amount)}</b>${badge(z.status)}</div><p>${esc(z.details||'')}</p>${z.status==='pending'?`<div class="actions"><button class="mini primary" onclick="acceptQuote('${z.id}','${x.id}')">Accepter le devis</button><button class="mini" onclick="rejectQ('${z.id}')">Refuser</button></div>`:''}${z.status==='accepted'&&x.status!=='scheduled'?`<div class="scheduleForm clientAction"><label>Date et heure<input id="dt-${x.id}" type="datetime-local" required></label><button class="mini primary" onclick="scheduleIntervention('${z.id}','${x.id}')">Choisir le rendez-vous</button></div>`:''}</div>`:''}
 ${iv?`<div class="quoteBox"><div class="row"><b>Intervention</b>${badge(iv.status)}</div><p>${iv.scheduled_at?'Rendez-vous : '+new Date(iv.scheduled_at).toLocaleString('fr-FR'):''}</p>${iv.status==='completed'&&!review?`<div class="reviewBox"><b>Votre avis :</b><span class="stars" id="stars-${iv.id}">${[1,2,3,4,5].map(k=>`<button onclick="rate('${iv.id}',${k})">☆</button>`).join('')}</span><input id="comment-${iv.id}" placeholder="Votre commentaire"><button class="mini primary" onclick="sendReview('${iv.id}')">Publier</button></div>`:review?`<p>⭐ ${review.rating}/5 · ${esc(review.comment||'Merci pour votre avis.')}</p>`:''}</div>`:''}</div>`}).join(''):'Aucune demande.'}</div>
 <div class="panel"><div class="sectionTitle"><div><h3>Notifications</h3><p>Les mises à jour de vos demandes et interventions.</p></div><button class="mini" onclick="markNotificationsRead()">Tout marquer comme lu</button></div><div class="noticeList">${n.length?n.map(x=>`<div class="notice ${x.read?'':'unread'}"><b>${esc(x.title)}</b><p>${esc(x.body)}</p><small>${new Date(x.created_at).toLocaleString('fr-FR')}</small></div>`).join(''):'Aucune notification.'}</div></div>`;
}

async function tech(){
 let {data:t}=await sb.from('technicians').select('*').eq('id',user.id).maybeSingle();techProfile=t;
 if(!t){$('dashContent').innerHTML='<div class="emptyPro"><h3>Profil technicien introuvable</h3><p>Reconnectez-vous après avoir exécuté le SQL de BassoumClim.</p></div>';return}
 let [{data:a=[]},{data:m=[]},{data:i=[]}]=await Promise.all([
  sb.from('requests').select('*').is('technician_id',null).eq('status','pending').order('created_at',{ascending:false}),
  sb.from('requests').select('*').eq('technician_id',user.id).order('created_at',{ascending:false}),
  sb.from('interventions').select('*').eq('technician_id',user.id).order('created_at',{ascending:false})
 ]);
 const active=m.filter(x=>['accepted','quoted','scheduled','in_progress'].includes(x.status)).length;
 const completed=i.filter(x=>x.status==='completed').length;
 const initials=((profile?.first_name||'T')[0]+(profile?.last_name||'')[0]).toUpperCase();
 const display=esc(((profile?.first_name||'')+' '+(profile?.last_name||'')).trim()||'Technicien');
 $('dashDate').textContent=new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'});
 $('dashContent').innerHTML=`
 <div class="techShell">
  <aside class="techSide"><div class="techBrand">❄️ BassoumClim <span style="opacity:.55">PRO</span></div>
   <div class="techNav">
    <button class="active" data-tab="overview">📊 Vue d'ensemble</button>
    <button data-tab="requests">📥 Demandes <b>(${a.length})</b></button>
    <button data-tab="missions">🛠️ Mes missions</button>
    <button data-tab="quotes">💰 Devis</button>
    <button data-tab="history">📚 Historique</button>
    <button data-tab="profile">👤 Mon profil</button>
   </div>
  </aside>
  <div class="techMain">
   <div class="techTop"><div><h3>Bonjour, ${display} 👋</h3><p>Gérez votre activité et vos interventions depuis cet espace.</p></div>
    <div class="availability"><span class="dot ${t.is_available?'on':''}"></span><b>${t.is_available?'Disponible':'Indisponible'}</b><button class="mini ${t.is_available?'primary':''}" onclick="toggleAvailability()">${t.is_available?'Se rendre indisponible':'Activer'}</button></div>
   </div>
   <section class="techSection active" data-section="overview">
    <div class="techKpis"><div class="kpi"><strong>${a.length}</strong><span>DEMANDES DISPONIBLES</span></div><div class="kpi"><strong>${active}</strong><span>MISSIONS ACTIVES</span></div><div class="kpi"><strong>${completed}</strong><span>INTERVENTIONS TERMINÉES</span></div><div class="kpi"><strong>${t.rating||'—'}</strong><span>NOTE MOYENNE</span></div></div>
    <div class="panel"><div class="sectionTitle"><div><h3>Dernières demandes</h3><p>Les nouvelles missions en attente d'un technicien.</p></div><button class="mini" onclick="techTab('requests')">Voir toutes</button></div>
     ${a.slice(0,3).map(requestCard).join('')||'<div class="emptyPro">Aucune nouvelle demande pour le moment.</div>'}
    </div>
    <div class="panel"><div class="sectionTitle"><div><h3>Mes missions en cours</h3><p>Suivez les interventions déjà prises en charge.</p></div><button class="mini" onclick="techTab('missions')">Gérer</button></div>
     ${m.filter(x=>x.status!=='completed').slice(0,4).map(missionRow).join('')||'<div class="emptyPro">Aucune mission active.</div>'}
    </div>
   </section>
   <section class="techSection" data-section="requests"><div class="panel"><div class="sectionTitle"><div><h3>Demandes disponibles</h3><p>Acceptez une mission pour la prendre en charge.</p></div></div>${a.map(requestCard).join('')||'<div class="emptyPro">Aucune demande disponible.</div>'}</div></section>
   <section class="techSection" data-section="missions"><div class="panel"><div class="sectionTitle"><div><h3>Mes missions</h3><p>Demandes que vous avez acceptées.</p></div></div>${m.map(missionRow).join('')||'<div class="emptyPro">Aucune mission.</div>'}</div></section>
   <section class="techSection" data-section="quotes"><div class="panel"><div class="sectionTitle"><div><h3>Gestion des devis</h3><p>Préparez un montant et les détails avant de l'envoyer au client.</p></div></div>${m.filter(x=>['accepted','quoted','scheduled','in_progress'].includes(x.status)).map(x=>`<div class="requestCard"><div class="row"><div><h4>${esc(x.service_type)}</h4><small>${esc(x.address)}</small></div>${badge(x.status)}</div><p>${esc(x.description||'')}</p>${x.status==='accepted'?`<button class="mini primary" onclick="quote('${x.id}')">+ Créer le devis</button>`:x.status==='quoted'?'<div class="quoteBox">💰 Devis envoyé · En attente de la réponse du client.</div>':'<div class="quoteBox">✓ Mission planifiée après acceptation du devis.</div>'}</div>`).join('')||'<div class="emptyPro">Aucun devis à gérer.</div>'}</div></section>
   <section class="techSection" data-section="history"><div class="panel"><div class="sectionTitle"><div><h3>Historique des interventions</h3><p>Retrouvez vos prestations terminées et leur montant final.</p></div></div>${i.map(x=>`<div class="missionRow"><div><b>${esc(x.status==='completed'?'Intervention terminée':'Intervention')}</b><p>${x.completed_at?new Date(x.completed_at).toLocaleDateString('fr-FR'):x.scheduled_at?new Date(x.scheduled_at).toLocaleDateString('fr-FR'):''}</p></div><div>${badge(x.status)}</div><div><b>${money(x.final_amount)}</b></div><div>${x.status==='scheduled'?`<button class="mini" onclick="setInterventionStatus('${x.id}','in_progress')">Démarrer</button>`:x.status==='in_progress'?`<button class="mini primary" onclick="completeIntervention('${x.id}')">Terminer</button>`:''}</div></div>`).join('')||'<div class="emptyPro">Votre historique apparaîtra ici.</div>'}</div></section>
   <section class="techSection" data-section="profile"><div class="panel"><div class="sectionTitle"><div><h3>Mon profil professionnel</h3><p>Les clients verront ces informations avant l'intervention.</p></div><button class="mini primary" onclick="editTechProfile()">Modifier</button></div><div class="profilePro"><div class="avatar">${esc(initials)}</div><div><h3 style="margin:0 0 5px">${display}</h3><div class="profileRows"><div class="profileField"><small>SPÉCIALITÉ</small><b>${esc(t.specialty||'À renseigner')}</b></div><div class="profileField"><small>ZONE D'INTERVENTION</small><b>${esc(t.service_area||'À renseigner')}</b></div><div class="profileField"><small>STATUT</small><b>${t.is_verified?'✓ Profil vérifié':'En attente de validation'}</b></div><div class="profileField"><small>DISPONIBILITÉ</small><b>${t.is_available?'Disponible':'Indisponible'}</b></div></div></div></div></div></section>
  </div>
 </div>`;
 document.querySelectorAll('.techNav button').forEach(btn=>btn.onclick=()=>techTab(btn.dataset.tab));
}
function techTab(name){document.querySelectorAll('.techNav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));document.querySelectorAll('.techSection').forEach(s=>s.classList.toggle('active',s.dataset.section===name));}
function requestCard(x){return `<div class="requestCard"><div class="row"><div><h4>${esc(x.service_type)}</h4><div class="meta"><span>📍 ${esc(x.address)}</span>${x.preferred_date?`<span>📅 ${new Date(x.preferred_date).toLocaleString('fr-FR')}</span>`:''}${x.budget?`<span>💰 Budget ${money(x.budget)}</span>`:''}</div></div>${badge(x.status)}</div><p>${esc(x.description||'Aucune description')}</p><button class="mini primary" onclick="take('${x.id}')">Accepter la mission →</button></div>`}
function missionRow(x){return `<div class="missionRow"><div><b>${esc(x.service_type)}</b><p>${esc(x.address)}</p></div><div>${badge(x.status)}</div><div><p>${x.preferred_date?'Souhait : '+new Date(x.preferred_date).toLocaleDateString('fr-FR'):''}</p></div><div>${x.status==='accepted'?`<button class="mini primary" onclick="quote('${x.id}')">Faire un devis</button>`:x.status==='quoted'?'<span class="badge warn">Devis en attente</span>':''}</div></div>`}
async function admin(){let [{data:p=[]},{data:r=[]},{data:t=[]},{data:i=[]}]=await Promise.all([sb.from('profiles').select('*'),sb.from('requests').select('*'),sb.from('technicians').select('*'),sb.from('interventions').select('*')]);$('dashContent').innerHTML=`<div class="grid"><div class="stat"><strong>${p.length}</strong>Utilisateurs</div><div class="stat"><strong>${t.length}</strong>Techniciens</div><div class="stat"><strong>${r.length}</strong>Demandes</div></div><div class="panel"><h3>Demandes récentes</h3>${r.slice(0,15).map(x=>`<div class="item"><div class="row"><b>${esc(x.service_type)}</b>${badge(x.status)}</div><p>${esc(x.description||'')}</p></div>`).join('')||'Aucune demande.'}</div><div class="panel"><h3>Activité</h3><p>${i.length} interventions.</p></div>`}
window.take=async id=>{if(!techProfile?.is_available){alert('Passez votre statut en Disponible avant d’accepter une mission.');return}let {data,error}=await sb.rpc('claim_request',{p_request_id:id});if(error)alert(error.message);else if(!data)alert('Cette demande a déjà été prise par un autre technicien.');render()};
window.quote=async id=>{let a=Number(prompt('Montant du devis en FCFA'));if(!Number.isFinite(a)||a<=0)return;let d=prompt('Détails du devis (matériel, main-d’œuvre, délai...)')||'';let {error}=await sb.from('quotes').insert({request_id:id,technician_id:user.id,amount:a,details:d,status:'pending'});if(!error)await sb.from('requests').update({status:'quoted'}).eq('id',id).eq('technician_id',user.id);alert(error?'Erreur : '+error.message:'Devis envoyé');render()};
window.acceptQ=async(q,r)=>{let {data,error}=await sb.from('quotes').update({status:'accepted',accepted_at:new Date().toISOString()}).eq('id',q).select().single();if(error)return alert(error.message);let {data:req}=await sb.from('requests').select('technician_id').eq('id',r).single();await sb.from('requests').update({status:'scheduled'}).eq('id',r).eq('client_id',user.id);await sb.from('interventions').upsert({request_id:r,client_id:user.id,technician_id:req.technician_id,status:'scheduled',scheduled_at:new Date().toISOString(),final_amount:data.amount},{onConflict:'request_id'});render()};
window.acceptQuote=async(q,r)=>{let {data,error}=await sb.from('quotes').update({status:'accepted',accepted_at:new Date().toISOString()}).eq('id',q).eq('status','pending').select().single();if(error)return alert(error.message);if(!data)return alert('Ce devis n’est plus disponible.');await sb.from('requests').update({status:'accepted'}).eq('id',r).eq('client_id',user.id);render()};
window.rejectQ=async id=>{await sb.from('quotes').update({status:'rejected'}).eq('id',id).eq('status','pending');render()};
window.scheduleIntervention=async(q,r)=>{const el=$('dt-'+r);if(!el||!el.value)return alert('Choisissez une date et une heure.');const scheduled=new Date(el.value).toISOString();let {data:quoteRow,error:qerr}=await sb.from('quotes').select('amount,technician_id').eq('id',q).single();if(qerr)return alert(qerr.message);let {error}=await sb.from('interventions').upsert({request_id:r,client_id:user.id,technician_id:quoteRow.technician_id,status:'scheduled',scheduled_at:scheduled,final_amount:quoteRow.amount},{onConflict:'request_id'});if(error)return alert(error.message);await sb.from('requests').update({status:'scheduled'}).eq('id',r).eq('client_id',user.id);render()};
window.markNotificationsRead=async()=>{await sb.from('notifications').update({read:true}).eq('user_id',user.id);render()};
window.rate=(id,k)=>{document.querySelectorAll('#stars-'+id+' button').forEach((b,i)=>b.textContent=i<k?'★':'☆');window._rating=window._rating||{};window._rating[id]=k};
window.sendReview=async id=>{const rating=window._rating?.[id]||0;if(!rating)return alert('Choisissez une note.');const comment=$('comment-'+id)?.value||'';let {data:iv}=await sb.from('interventions').select('client_id,technician_id').eq('id',id).single();let {error}=await sb.from('reviews').insert({intervention_id:id,client_id:user.id,technician_id:iv.technician_id,rating,comment});if(error)alert(error.message);render()};
window.toggleAvailability=async()=>{let next=!techProfile.is_available;let {error}=await sb.from('technicians').update({is_available:next}).eq('id',user.id);if(error)alert(error.message);render()};
window.editTechProfile=async()=>{let specialty=prompt('Spécialité',techProfile.specialty||'');if(specialty===null)return;let area=prompt('Zone d’intervention',techProfile.service_area||'');if(area===null)return;let {error}=await sb.from('technicians').update({specialty,service_area:area}).eq('id',user.id);if(error)alert(error.message);render()};
window.setInterventionStatus=async(id,status)=>{let {error}=await sb.from('interventions').update({status,started_at:status==='in_progress'?new Date().toISOString():null}).eq('id',id).eq('technician_id',user.id);if(error)alert(error.message);render()};
window.completeIntervention=async id=>{let amount=Number(prompt('Montant final en FCFA',techProfile?.last_amount||''));if(!Number.isFinite(amount)||amount<0)return;let {error}=await sb.from('interventions').update({status:'completed',completed_at:new Date().toISOString(),final_amount:amount}).eq('id',id).eq('technician_id',user.id);if(error)alert(error.message);else{let row=await sb.from('interventions').select('request_id').eq('id',id).single();if(row.data)await sb.from('requests').update({status:'completed'}).eq('id',row.data.request_id).eq('technician_id',user.id)}render()};
async function startApp(){
  if(!createSupabase()){ setTimeout(startApp,250); return; }
  setupAuthListener();
  try { await init(); } catch(e) { console.error('BassoumClim init:', e); }
}
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', startApp); else startApp();
