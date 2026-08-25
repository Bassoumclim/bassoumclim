const SUPABASE_URL = 'https://hbigfogqrjobawzdbdue.supabase.co';
const SUPABASE_KEY = 'sb_publishable_LRAkisi90QWpd60uheIFkA_8cZmuACl';
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const $ = (id) => document.getElementById(id);
const modal = $('modal');
const loginPanel = $('login');
const signupPanel = $('signup');

function openModal() {
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}
function closeModal() {
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

$('authBtn').addEventListener('click', async () => {
  const { data } = await db.auth.getSession();
  if (data.session) {
    await db.auth.signOut();
    await refreshAuth();
  } else {
    openModal();
  }
});
$('close').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

$('signupLink').addEventListener('click', () => {
  loginPanel.classList.add('hidden');
  signupPanel.classList.remove('hidden');
});
$('loginLink').addEventListener('click', () => {
  signupPanel.classList.add('hidden');
  loginPanel.classList.remove('hidden');
});

async function ensureProfile(user, fallback) {
  const profile = {
    id: user.id,
    first_name: fallback.first_name || null,
    last_name: fallback.last_name || null,
    phone: fallback.phone || null,
    role: 'client'
  };
  const { error } = await db.from('profiles').upsert(profile, { onConflict: 'id' });
  return error;
}

async function refreshAuth() {
  const { data: { session } } = await db.auth.getSession();
  if (session) {
    $('authBtn').textContent = 'Déconnexion';
    $('hint').textContent = 'Vous êtes connecté. Votre demande sera enregistrée dans votre espace client.';
  } else {
    $('authBtn').textContent = 'Connexion';
    $('hint').textContent = 'Connectez-vous pour envoyer une demande sécurisée.';
  }
}

db.auth.onAuthStateChange(() => { refreshAuth(); });
refreshAuth();

$('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = $('signupMsg');
  msg.textContent = 'Création du compte...';

  const firstName = $('first').value.trim();
  const lastName = $('last').value.trim();
  const phone = $('sphone').value.trim();
  const email = $('semail').value.trim();
  const password = $('spass').value;

  const { data, error } = await db.auth.signUp({ email, password });
  if (error) {
    msg.textContent = error.message;
    return;
  }

  if (data.user && data.session) {
    const profileError = await ensureProfile(data.user, {
      first_name: firstName, last_name: lastName, phone
    });
    if (profileError) {
      msg.textContent = 'Compte créé, mais profil non enregistré : ' + profileError.message;
      return;
    }
    msg.textContent = '✓ Compte créé avec succès.';
    setTimeout(closeModal, 700);
  } else {
    msg.textContent = '✓ Compte créé. Vérifie ton e-mail puis connecte-toi.';
  }
});

$('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = $('loginMsg');
  msg.textContent = 'Connexion...';

  const email = $('email').value.trim();
  const password = $('password').value;

  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) {
    msg.textContent = error.message;
    return;
  }

  const profileError = await ensureProfile(data.user, {});
  if (profileError) {
    msg.textContent = 'Connexion réussie, mais profil non enregistré : ' + profileError.message;
    return;
  }

  msg.textContent = '✓ Connexion réussie.';
  setTimeout(closeModal, 500);
});

$('requestForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = $('formMsg');
  msg.textContent = 'Envoi...';

  const { data: { user } } = await db.auth.getUser();
  if (!user) {
    msg.textContent = 'Connectez-vous d’abord pour envoyer une demande.';
    openModal();
    return;
  }

  const payload = {
    client_id: user.id,
    service_type: $('service').value,
    description: $('description').value.trim(),
    address: $('address').value.trim(),
    preferred_date: $('date').value ? new Date($('date').value).toISOString() : null,
    contact_phone: $('phone').value.trim()
  };

  const { error } = await db.from('requests').insert(payload);
  if (error) {
    msg.textContent = 'Erreur : ' + error.message;
    return;
  }

  msg.textContent = '✓ Demande envoyée et enregistrée.';
  e.target.reset();
});
