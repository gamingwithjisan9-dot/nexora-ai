const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];const state={messages:[],conversations:[],projects:[],view:'assistant',busy:false};const els={messages:$('#messages'),welcome:$('#welcomeBlock'),input:$('#messageInput'),form:$('#chatForm'),mode:$('#modeLabel'),toast:$('#toast'),modal:$('#modal')};const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));function showToast(t){els.toast.textContent=t;els.toast.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>els.toast.classList.remove('show'),2600)}function modal(title,text,icon='✳',primary='Got it',callback=null){$('#modalTitle').textContent=title;$('#modalText').textContent=text;$('#modalIcon').textContent=icon;$('#modalPrimary').textContent=primary;$('#modalPrimary').onclick=()=>{callback?.();els.modal.close()};els.modal.showModal()}function switchView(v){state.view=v;$$('.view').forEach(x=>x.classList.remove('active-view'));$(`#${v}View`)?.classList.add('active-view');$$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===v));$('#crumbTitle').textContent=({assistant:'AI Assistant',automations:'Automations',projects:'Projects',history:'History'})[v];$('#sidebar').classList.remove('open');if(v==='history')renderHistory();if(v==='projects')renderProjects()}function renderMessages(){els.messages.innerHTML=state.messages.map(m=>`<div class="message ${m.role}">${m.role==='assistant'?'<div class="message-avatar">✳</div>':''}<div class="message-body">${m.role==='assistant'?'<div class="message-label">NEXORA AI</div>':''}${esc(m.content).replace(/\n/g,'<br>')}</div>${m.role==='user'?'<div class="message-avatar" style="background:#2b3328;color:#e5f3d9">J</div>':''}</div>`).join('');els.welcome.style.display=state.messages.length?'none':'block';if(state.busy){const d=document.createElement('div');d.className='message assistant';d.innerHTML='<div class="message-avatar">✳</div><div class="message-body"><div class="message-label">NEXORA AI</div><div class="typing-dots"><span></span><span></span><span></span></div></div>';els.messages.append(d)}window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'})}function saveHistory(){try{localStorage.setItem('nexora-history',JSON.stringify(state.conversations.slice(-30)))}catch{}}function recordConversation(){if(!state.messages.length)return;const first=state.messages.find(m=>m.role==='user');if(!first)return;const c={id:Date.now(),title:first.content.slice(0,58)+(first.content.length>58?'…':''),messages:state.messages,updated:new Date().toISOString()};state.conversations.unshift(c);state.conversations=state.conversations.slice(0,30);saveHistory()}function resizeInput(){els.input.style.height='auto';els.input.style.height=Math.min(els.input.scrollHeight,160)+'px'}async function sendMessage(text){text=(text||'').trim();if(!text||state.busy)return;state.messages.push({role:'user',content:text});state.busy=true;els.input.value='';resizeInput();renderMessages();$('#chatForm button[type="submit"]').disabled=true;try{const r=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:state.messages.map(m=>({role:m.role,content:m.content}))})});const d=await r.json();if(!r.ok)throw Error(d.error||'Request failed');state.messages.push({role:'assistant',content:d.reply});if(d.mode==='live'){els.mode.textContent='AI connected';$('.live-dot').style.background='#bde96a'}else{els.mode.textContent='Demo mode';showToast('Demo response — add an API key for live AI.')}}catch(e){state.messages.push({role:'assistant',content:`দুঃখিত, অনুরোধটি সম্পন্ন করা যায়নি।\n\n${e.message}\n\nসার্ভার ও API সেটিংস পরীক্ষা করো।`})}finally{state.busy=false;$('#chatForm button[type="submit"]').disabled=false;renderMessages();recordConversation()}}function renderHistory(){const h=$('#historyList');if(!state.conversations.length){h.innerHTML='<div class="empty-state"><div class="empty-illustration"><span>◷</span></div><h2>No conversations yet</h2><p>Your conversations will appear here on this device.</p><button class="primary-button" id="historyStart">Start a conversation</button></div>';$('#historyStart')?.addEventListener('click',()=>{state.messages=[];renderMessages();switchView('assistant')});return}h.innerHTML=state.conversations.map(c=>`<div class="history-item"><div class="history-main"><div class="history-icon">✳</div><div><strong>${esc(c.title)}</strong><small>${new Date(c.updated).toLocaleString()} · ${c.messages.length} messages</small></div></div><button class="history-open" data-open-history="${c.id}">Open →</button></div>`).join('');$$('[data-open-history]').forEach(b=>b.onclick=()=>{const c=state.conversations.find(x=>x.id===Number(b.dataset.openHistory));if(c){state.messages=[...c.messages];renderMessages();switchView('assistant')}})}function renderProjects(){$('#projectList').innerHTML=state.projects.map(p=>`<div class="project-item"><div class="project-icon">▧</div><div><strong>${esc(p.name)}</strong><small>Created ${new Date(p.created).toLocaleDateString()}</small></div></div>`).join('')}function createProject(){const n=prompt('Project name / প্রজেক্টের নাম:');if(!n?.trim())return;state.projects.unshift({name:n.trim(),created:new Date().toISOString()});try{localStorage.setItem('nexora-projects',JSON.stringify(state.projects))}catch{}renderProjects();showToast('Project saved on this device')}function startNewChat(){state.messages=[];renderMessages();switchView('assistant');els.input.focus()}$('#chatForm').addEventListener('submit',e=>{e.preventDefault();sendMessage(els.input.value)});els.input.addEventListener('input',resizeInput);els.input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();els.form.requestSubmit()}});$$('[data-prompt]').forEach(b=>b.onclick=()=>sendMessage(b.dataset.prompt));$$('[data-view]').forEach(b=>b.onclick=()=>switchView(b.dataset.view));$('#newChat').onclick=startNewChat;$('#mobileMenu').onclick=()=>$('#sidebar').classList.toggle('open');$('#connectTools').onclick=()=>modal('Connect your tools','Real integrations are not configured yet. Connect one provider at a time using OAuth or server-side credentials.','⌘');$('#upgradeButton').onclick=()=>modal('Plans are coming next','Billing is not enabled in this demo. Add usage limits and a supported payment provider before enabling subscriptions.','✦');$('#helpButton').onclick=()=>modal('Welcome to NEXORA AI','Start with a prompt card or type a request. This starter runs in demo mode until you configure an AI API key on the server.','?');$('#attachButton').onclick=()=>modal('More ways to work','File uploads and connected tools are planned for a later build. For now, type your request in the message box.','＋');$('#profileButton').onclick=()=>modal('Personal workspace','This is a front-end prototype. Cloud user accounts are not connected yet.','J');$('#createAutomation').onclick=()=>modal('Create a workflow','Choose a template below to preview a workflow. Connecting it to n8n is a later implementation step.','⌘','Browse templates',()=>document.querySelector('.automation-grid')?.scrollIntoView({behavior:'smooth'}));$$('[data-template]').forEach(b=>b.onclick=()=>{const d={lead:['Lead follow-up assistant','Trigger: new lead → validate details → save to a connected sheet → draft a follow-up → request approval before sending. No external service is connected yet.','◎'],content:['Content idea organizer','Trigger: new idea → AI drafts an outline → save the draft → review before publishing.','✎'],summary:['Weekly summary','Collect approved task updates → summarize them → create a report draft → ask before emailing it.','◷']}[b.dataset.template];modal(d[0],d[1],d[2],'Use this idea',()=>{switchView('assistant');sendMessage('Help me design this workflow: '+d[0]+'. '+d[1])})});$('#newProject').onclick=createProject;$('#emptyNewProject').onclick=createProject;$('#clearHistory').onclick=()=>modal('Clear conversation history?','This removes saved conversation history from this browser only. It cannot be undone.','◷','Clear history',()=>{state.conversations=[];saveHistory();renderHistory();showToast('History cleared')});window.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();startNewChat()}if(e.key==='Escape')$('#sidebar').classList.remove('open')});try{state.conversations=JSON.parse(localStorage.getItem('nexora-history')||'[]');state.projects=JSON.parse(localStorage.getItem('nexora-projects')||'[]')}catch{}fetch('/api/health').then(r=>r.json()).then(d=>{if(d.mode==='live'){els.mode.textContent='AI connected';$('.live-dot').style.background='#bde96a'}}).catch(()=>{});renderMessages(); 
const authScreen = document.getElementById('authScreen');
const authForm = document.getElementById('authForm');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authMessage = document.getElementById('authMessage');
const authSubmit = document.getElementById('authSubmit');
const authTitle = document.getElementById('authTitle');
const authSubtitle = document.getElementById('authSubtitle');
const authSwitch = document.getElementById('authSwitch');
const authSwitchText = document.getElementById('authSwitchText');

let authMode = 'login';
let supabaseClient = null;

function showAuthMessage(message) {
  authMessage.textContent = message;
}

function setAuthMode(mode) {
  authMode = mode;

  const signup = mode === 'signup';

  authTitle.textContent = signup ? 'Create your account' : 'Welcome back';
  authSubtitle.textContent = signup
    ? 'Sign up to start using NEXORA AI.'
    : 'Sign in to continue to your AI workspace.';

  authSubmit.textContent = signup ? 'Create account' : 'Sign in';
  authPassword.autocomplete = signup ? 'new-password' : 'current-password';

  authSwitchText.textContent = signup
    ? 'Already have an account?'
    : "Don't have an account?";

  authSwitch.textContent = signup ? 'Sign in' : 'Create account';

  document.getElementById('forgotPassword').hidden = signup;
  showAuthMessage('');
}

function showWorkspace() {
  authScreen.hidden = true;
  document.querySelector('.app-shell').classList.remove('auth-locked');
}

function showLogin() {
  authScreen.hidden = false;
  document.querySelector('.app-shell').classList.add('auth-locked');
}

async function initNexoraAuth() {
  try {
    // Use the existing Supabase project and its PUBLIC publishable key.
    const SUPABASE_URL = 'https://bejwgsbfyvqvfwyhywgq.supabase.co';
    const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_rBQ5fENpGQhfZvgESbG0Bg_4Zq3ZmAh';

    if (
      !window.supabase ||
      SUPABASE_PUBLISHABLE_KEY.includes('PASTE_YOUR_')
    ) {
      showAuthMessage('Supabase key বসানো হয়নি। নিচের নির্দেশনা অনুসরণ করো।');
      return;
    }

    supabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY
    );

    const { data, error } = await supabaseClient.auth.getSession();

    if (error) throw error;

    if (data.session) {
      showWorkspace();
    } else {
      showLogin();
    }

    supabaseClient.auth.onAuthStateChange((event, session) => {
      if (session) {
        showWorkspace();
      } else {
        showLogin();
      }
    });
  } catch (error) {
    showAuthMessage(error.message || 'Authentication setup failed.');
  }
}

authSwitch.addEventListener('click', () => {
  setAuthMode(authMode === 'login' ? 'signup' : 'login');
});

authForm.addEventListener('submit', async event => {
  event.preventDefault();

  if (!supabaseClient) {
    showAuthMessage('Supabase সেটআপ সম্পূর্ণ করো, তারপর আবার চেষ্টা করো।');
    return;
  }

  authSubmit.disabled = true;
  showAuthMessage('Please wait…');

  try {
    const email = authEmail.value.trim();
    const password = authPassword.value;

    if (authMode === 'signup') {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password
      });

      if (error) throw error;

      if (data.session) {
        showWorkspace();
      } else {
        showAuthMessage(
          'Account তৈরি হয়েছে। ইমেইলে আসা verification link খুলে তারপর sign in করো।'
        );
      }
    } else {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      showWorkspace();
      showToast('Login successful');
    }
  } catch (error) {
    showAuthMessage(error.message || 'Login করা যায়নি। আবার চেষ্টা করো।');
  } finally {
    authSubmit.disabled = false;
  }
});

document.getElementById('forgotPassword').addEventListener('click', async () => {
  if (!supabaseClient) {
    showAuthMessage('Supabase সেটআপ সম্পূর্ণ করো।');
    return;
  }

  const email = authEmail.value.trim();

  if (!email) {
    showAuthMessage('প্রথমে Email address লিখো।');
    authEmail.focus();
    return;
  }

  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    });

    if (error) throw error;

    showAuthMessage('Password reset-এর নির্দেশনা ইমেইলে পাঠানো হয়েছে।');
  } catch (error) {
    showAuthMessage(error.message || 'Reset email পাঠানো যায়নি।');
  }
});

document.getElementById('googleLogin').addEventListener('click', async () => {
  if (!supabaseClient) {
    showAuthMessage('আগে Supabase সেটআপ সম্পূর্ণ করো।');
    return;
  }

  try {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });

    if (error) throw error;
  } catch (error) {
    showAuthMessage(
      'Google Login চালাতে Supabase-এ Google provider ও OAuth credentials সেট করতে হবে.'
    );
  }
});

// Add a Logout button to the existing profile menu.
const logoutButton = document.createElement('button');
logoutButton.type = 'button';
logoutButton.textContent = 'Log out';
logoutButton.className = 'secondary-button';
logoutButton.style.cssText = 'position:fixed;right:18px;bottom:18px;z-index:30;';
logoutButton.hidden = true;
document.body.appendChild(logoutButton);

logoutButton.addEventListener('click', async () => {
  if (!supabaseClient) return;

  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    showToast(error.message);
    return;
  }

  showLogin();
  showToast('Logged out');
});

function updateLogoutVisibility() {
  logoutButton.hidden = authScreen.hidden;
}

const authObserver = new MutationObserver(updateLogoutVisibility);
authObserver.observe(authScreen, { attributes: true, attributeFilter: ['hidden'] });

initNexoraAuth();

