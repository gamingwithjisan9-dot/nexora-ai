
'use strict';

/* =========================================================
   NEXORA AI — Main Frontend
   File: public/app.js

   Includes:
   - Chat UI and API requests
   - Supabase session token handling
   - Chat history and local projects
   - Error handling
   - Existing navigation and modal interactions

   IMPORTANT:
   Your Supabase client must be available as:
   window.supabaseClient
   ========================================================= */

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const state = {
  messages: [],
  conversations: [],
  projects: [],
  view: 'assistant',
  busy: false,
  currentConversationId: null
};

const els = {
  messages: $('#messages'),
  welcome: $('#welcomeBlock'),
  input: $('#messageInput'),
  form: $('#chatForm'),
  mode: $('#modeLabel'),
  toast: $('#toast'),
  modal: $('#modal')
};

/* -------------------- Authentication -------------------- */

let authMode = 'login';
let authInitialized = false;

const authEls = {
  screen: $('#authScreen'),
  form: $('#authForm'),
  email: $('#authEmail'),
  password: $('#authPassword'),
  title: $('#authTitle'),
  subtitle: $('#authSubtitle'),
  submit: $('#authSubmit'),
  message: $('#authMessage'),
  switch: $('#authSwitch'),
  switchText: $('#authSwitchText'),
  forgot: $('#forgotPassword'),
  google: $('#googleLogin')
};

function setAuthMessage(message, isError = false) {
  if (!authEls.message) return;

  authEls.message.textContent = message;
  authEls.message.style.color = isError ? '#ff8b8b' : '#bde96a';
}

function showAuthScreen(show) {
  if (authEls.screen) {
    authEls.screen.style.display = show ? 'flex' : 'none';
  }

  const appShell = $('.app-shell');

  if (appShell) {
    appShell.style.display = show ? 'none' : '';
  }
}

function updateAuthMode() {
  const signup = authMode === 'signup';

  if (authEls.title) {
    authEls.title.textContent = signup ? 'Create your account' : 'Welcome back';
  }

  if (authEls.subtitle) {
    authEls.subtitle.textContent = signup
      ? 'Sign up to start using your AI workspace.'
      : 'Sign in to continue to your AI workspace.';
  }

  if (authEls.submit) {
    authEls.submit.textContent = signup ? 'Create account' : 'Sign in';
  }

  if (authEls.password) {
    authEls.password.autocomplete = signup
      ? 'new-password'
      : 'current-password';
  }

  if (authEls.switchText) {
    authEls.switchText.textContent = signup
      ? 'Already have an account?'
      : "Don't have an account?";
  }

  if (authEls.switch) {
    authEls.switch.textContent = signup ? 'Sign in' : 'Create account';
  }

  if (authEls.forgot) {
    authEls.forgot.style.display = signup ? 'none' : '';
  }

  setAuthMessage('');
}

async function initializeAuthentication() {
  const client = getSupabaseClient();

  if (!client || !authEls.screen || !authEls.form) {
    console.error('NEXORA: Supabase client or authentication HTML is missing.');
    showAuthScreen(false);
    return;
  }

  if (authInitialized) return;
  authInitialized = true;

  updateAuthMode();

  authEls.switch?.addEventListener('click', () => {
    authMode = authMode === 'login' ? 'signup' : 'login';
    updateAuthMode();
  });

  authEls.form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = authEls.email?.value.trim();
    const password = authEls.password?.value;

    if (!email || !password) {
      setAuthMessage('Email ও password লিখো।', true);
      return;
    }

    if (authEls.submit) {
      authEls.submit.disabled = true;
      authEls.submit.textContent = 'Please wait…';
    }

    setAuthMessage('');

    try {
      let result;

      if (authMode === 'signup') {
        result = await client.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin
          }
        });

        if (result.error) throw result.error;

        if (!result.data.session) {
          setAuthMessage(
            'Account তৈরি হয়েছে। Email inbox খুলে confirmation link-এ ক্লিক করো।'
          );
          return;
        }
      } else {
        result = await client.auth.signInWithPassword({
          email,
          password
        });

        if (result.error) throw result.error;
      }

      setAuthMessage('Login successful!');

      await refreshAuthenticationState();
    } catch (error) {
      console.error('NEXORA authentication error:', error);
      setAuthMessage(error.message || 'Authentication failed.', true);
    } finally {
      if (authEls.submit) {
        authEls.submit.disabled = false;
        authEls.submit.textContent =
          authMode === 'signup' ? 'Create account' : 'Sign in';
      }
    }
  });

  authEls.forgot?.addEventListener('click', async () => {
    const email = authEls.email?.value.trim();

    if (!email) {
      setAuthMessage('আগে তোমার email address লিখো।', true);
      authEls.email?.focus();
      return;
    }

    setAuthMessage('Password reset email পাঠানো হচ্ছে…');

    try {
      const { error } = await client.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin
      });

      if (error) throw error;

      setAuthMessage(
        'যদি এই email-এ account থাকে, password reset link পাঠানো হবে।'
      );
    } catch (error) {
      setAuthMessage(error.message || 'Password reset failed.', true);
    }
  });

  authEls.google?.addEventListener('click', async () => {
    setAuthMessage('Google sign-in খুলছে…');

    try {
      const { error } = await client.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });

      if (error) throw error;
    } catch (error) {
      setAuthMessage(error.message || 'Google sign-in failed.', true);
    }
  });

  client.auth.onAuthStateChange((_event, session) => {
    showAuthScreen(!session?.access_token);
  });

  await refreshAuthenticationState();
}

async function refreshAuthenticationState() {
  const client = getSupabaseClient();

  if (!client) {
    showAuthScreen(true);
    return;
  }

  const { data, error } = await client.auth.getSession();

  if (error) {
    console.error('NEXORA session check failed:', error);
    showAuthScreen(true);
    return;
  }

  showAuthScreen(!data?.session?.access_token);
}


/* -------------------- Basic helpers -------------------- */

const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);

function showToast(message) {
  if (!els.toast) return;

  els.toast.textContent = message;
  els.toast.classList.add('show');

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    els.toast.classList.remove('show');
  }, 3000);
}

function modal(
  title,
  message,
  icon = '✳',
  primary = 'Got it',
  callback = null
) {
  if (!els.modal) {
    showToast(message);
    return;
  }

  $('#modalTitle').textContent = title;
  $('#modalText').textContent = message;
  $('#modalIcon').textContent = icon;
  $('#modalPrimary').textContent = primary;

  $('#modalPrimary').onclick = () => {
    try {
      callback?.();
    } finally {
      els.modal.close();
    }
  };

  els.modal.showModal();
}

/* -------------------- Supabase session -------------------- */

function getSupabaseClient() {
  // The instantiated Supabase client must be exposed globally.
  // window.supabase alone may be the Supabase library, not the client.
  const possibleClients = [
    window.supabaseClient,
    window.nexoraSupabase,
    window.supabase
  ];

  return possibleClients.find(
    (client) =>
      client &&
      client.auth &&
      typeof client.auth.getSession === 'function'
  ) || null;
}

async function getAccessToken() {
  const supabaseClient = getSupabaseClient();

  if (!supabaseClient) {
    throw new Error(
      'Supabase client পাওয়া যায়নি। public/index.html-এ Supabase client configuration পরীক্ষা করো।'
    );
  }

  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    throw new Error('Login session পড়া যায়নি: ' + error.message);
  }

  const session = data?.session;

  if (!session?.access_token) {
    throw new Error(
      'তোমার login session পাওয়া যায়নি। আবার sign in করে চেষ্টা করো।'
    );
  }

  return session.access_token;
}

/* -------------------- Navigation -------------------- */

function switchView(view) {
  state.view = view;

  $$('.view').forEach((element) => {
    element.classList.remove('active-view');
  });

  $(`#${view}View`)?.classList.add('active-view');

  $$('.nav-item').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === view);
  });

  const titles = {
    assistant: 'AI Assistant',
    automations: 'Automations',
    projects: 'Projects',
    history: 'History'
  };

  if ($('#crumbTitle')) {
    $('#crumbTitle').textContent = titles[view] || 'NEXORA AI';
  }

  $('#sidebar')?.classList.remove('open');

  if (view === 'history') renderHistory();
  if (view === 'projects') renderProjects();
}

/* -------------------- Message rendering -------------------- */

function renderMessages() {
  if (!els.messages || !els.welcome) return;

  els.messages.innerHTML = state.messages.map((message) => {
    const isAssistant = message.role === 'assistant';

    return `
      <div class="message ${esc(message.role)}">
        ${
          isAssistant
            ? '<div class="message-avatar">✳</div>'
            : ''
        }
        <div class="message-body">
          ${
            isAssistant
              ? '<div class="message-label">NEXORA AI</div>'
              : ''
          }
          ${esc(message.content).replace(/\n/g, '<br>')}
        </div>
        ${
          message.role === 'user'
            ? '<div class="message-avatar" style="background:#2b3328;color:#e5f3d9">J</div>'
            : ''
        }
      </div>
    `;
  }).join('');

  els.welcome.style.display = state.messages.length ? 'none' : 'block';

  if (state.busy) {
    const typing = document.createElement('div');

    typing.className = 'message assistant';
    typing.innerHTML = `
      <div class="message-avatar">✳</div>
      <div class="message-body">
        <div class="message-label">NEXORA AI</div>
        <div class="typing-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;

    els.messages.appendChild(typing);
  }

  window.scrollTo({
    top: document.body.scrollHeight,
    behavior: 'smooth'
  });
}

function resizeInput() {
  if (!els.input) return;

  els.input.style.height = 'auto';

  els.input.style.height =
    Math.min(els.input.scrollHeight, 160) + 'px';
}

/* -------------------- Local conversation history -------------------- */

function saveHistory() {
  try {
    localStorage.setItem(
      'nexora-history',
      JSON.stringify(state.conversations.slice(0, 30))
    );
  } catch (error) {
    console.warn('Could not save conversation history:', error);
  }
}

function recordConversation() {
  if (!state.messages.length) return;

  const firstUserMessage = state.messages.find(
    (message) => message.role === 'user'
  );

  if (!firstUserMessage) return;

  const conversationId =
    state.currentConversationId || Date.now();

  state.currentConversationId = conversationId;

  const conversation = {
    id: conversationId,
    title:
      firstUserMessage.content.slice(0, 58) +
      (firstUserMessage.content.length > 58 ? '…' : ''),
    messages: state.messages.map((message) => ({ ...message })),
    updated: new Date().toISOString()
  };

  state.conversations = [
    conversation,
    ...state.conversations.filter(
      (item) => item.id !== conversationId
    )
  ].slice(0, 30);

  saveHistory();
}

/* -------------------- Chat API -------------------- */

async function sendMessage(text) {
  text = String(text || '').trim();

  if (!text || state.busy) return;

  state.messages.push({
    role: 'user',
    content: text
  });

  state.busy = true;

  if (els.input) {
    els.input.value = '';
    resizeInput();
  }

  renderMessages();

  const submitButton = $('#chatForm button[type="submit"]');

  if (submitButton) submitButton.disabled = true;

  try {
    // Get the real access token from the current Supabase session.
    const accessToken = await getAccessToken();

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        messages: state.messages.map((message) => ({
          role: message.role,
          content: message.content
        }))
      })
    });

    let result;

    try {
      result = await response.json();
    } catch {
      throw new Error(
        'সার্ভার থেকে সঠিক JSON response আসেনি। Render logs পরীক্ষা করো।'
      );
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error(
          'Login session invalid বা expired। Sign out করে আবার sign in করো।'
        );
      }

      if (response.status === 429) {
        throw new Error(
          'অনেক বেশি request পাঠানো হয়েছে। একটু অপেক্ষা করে আবার চেষ্টা করো।'
        );
      }

      throw new Error(
        result?.error || `Server request failed (${response.status})`
      );
    }

    if (typeof result?.reply !== 'string' || !result.reply.trim()) {
      throw new Error(
        'AI থেকে কোনো উত্তর পাওয়া যায়নি। server.js ও AI provider configuration পরীক্ষা করো।'
      );
    }

    state.messages.push({
      role: 'assistant',
      content: result.reply
    });

    if (result.mode === 'live') {
      if (els.mode) els.mode.textContent = 'AI connected';

      const liveDot = $('.live-dot');

      if (liveDot) liveDot.style.background = '#bde96a';
    } else {
      if (els.mode) els.mode.textContent = 'Demo mode';

      showToast('Demo response পাওয়া গেছে।');
    }
  } catch (error) {
    console.error('NEXORA chat error:', error);

    state.messages.push({
      role: 'assistant',
      content:
        'দুঃখিত, অনুরোধটি সম্পন্ন করা যায়নি।\n\n' +
        (error?.message || 'Unknown error') +
        '\n\nLogin, server এবং AI API configuration পরীক্ষা করো।'
    });
  } finally {
    state.busy = false;

    if (submitButton) submitButton.disabled = false;

    renderMessages();
    recordConversation();
  }
}

/* -------------------- History screen -------------------- */

function renderHistory() {
  const historyList = $('#historyList');

  if (!historyList) return;

  if (!state.conversations.length) {
    historyList.innerHTML = `
      <div class="empty-state">
        <div class="empty-illustration"><span>◷</span></div>
        <h2>No conversations yet</h2>
        <p>Your conversations will appear here on this device.</p>
        <button class="primary-button" id="historyStart">
          Start a conversation
        </button>
      </div>
    `;

    $('#historyStart')?.addEventListener('click', () => {
      startNewChat();
    });

    return;
  }

  historyList.innerHTML = state.conversations.map((conversation) => `
    <div class="history-item">
      <div class="history-main">
        <div class="history-icon">✳</div>
        <div>
          <strong>${esc(conversation.title)}</strong>
          <small>
            ${esc(new Date(conversation.updated).toLocaleString())}
            · ${conversation.messages.length} messages
          </small>
        </div>
      </div>
      <button
        class="history-open"
        data-open-history="${esc(conversation.id)}"
      >
        Open →
      </button>
    </div>
  `).join('');

  $$('[data-open-history]').forEach((button) => {
    button.onclick = () => {
      const conversation = state.conversations.find(
        (item) => String(item.id) === button.dataset.openHistory
      );

      if (!conversation) return;

      state.messages = conversation.messages.map(
        (message) => ({ ...message })
      );

      state.currentConversationId = conversation.id;

      renderMessages();
      switchView('assistant');
    };
  });
}

/* -------------------- Projects -------------------- */

function renderProjects() {
  const projectList = $('#projectList');

  if (!projectList) return;

  projectList.innerHTML = state.projects.map((project) => `
    <div class="project-item">
      <div class="project-icon">▧</div>
      <div>
        <strong>${esc(project.name)}</strong>
        <small>
          Created ${esc(new Date(project.created).toLocaleDateString())}
        </small>
      </div>
    </div>
  `).join('');
}

function createProject() {
  const name = prompt('Project name / প্রজেক্টের নাম:');

  if (!name?.trim()) return;

  state.projects.unshift({
    name: name.trim(),
    created: new Date().toISOString()
  });

  try {
    localStorage.setItem(
      'nexora-projects',
      JSON.stringify(state.projects)
    );
  } catch (error) {
    console.warn('Could not save projects:', error);
  }

  renderProjects();
  showToast('Project saved on this device');
}

/* -------------------- Chat controls -------------------- */

function startNewChat() {
  if (state.busy) {
    showToast('বর্তমান request শেষ হলে নতুন chat শুরু করো।');
    return;
  }

  state.messages = [];
  state.currentConversationId = null;

  renderMessages();
  switchView('assistant');
  els.input?.focus();
}

els.form?.addEventListener('submit', (event) => {
  event.preventDefault();
  sendMessage(els.input?.value);
});

els.input?.addEventListener('input', resizeInput);

els.input?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    els.form?.requestSubmit();
  }
});

$$('[data-prompt]').forEach((button) => {
  button.onclick = () => sendMessage(button.dataset.prompt);
});

$$('[data-view]').forEach((button) => {
  button.onclick = () => switchView(button.dataset.view);
});

$('#newChat')?.addEventListener('click', startNewChat);

$('#mobileMenu')?.addEventListener('click', () => {
  $('#sidebar')?.classList.toggle('open');
});

/* -------------------- Existing UI buttons -------------------- */

$('#connectTools')?.addEventListener('click', () => {
  modal(
    'Connect your tools',
    'Real integrations are not configured yet. Connect one provider at a time using OAuth or server-side credentials.',
    '⌘'
  );
});

$('#upgradeButton')?.addEventListener('click', () => {
  modal(
    'Plans are coming next',
    'Billing is not enabled yet. Configure usage limits and a supported payment provider before enabling subscriptions.',
    '✦'
  );
});

$('#helpButton')?.addEventListener('click', () => {
  modal(
    'Welcome to NEXORA AI',
    'Start with a prompt card or type a request. The server must have a working AI provider configuration.',
    '?'
  );
});

$('#attachButton')?.addEventListener('click', () => {
  modal(
    'More ways to work',
    'File uploads and connected tools are not implemented in this version.',
    '＋'
  );
});

$('#profileButton')?.addEventListener('click', async () => {
  const client = getSupabaseClient();

  if (!client) {
    modal(
      'Account configuration',
      'Supabase client পাওয়া যায়নি। public/index.html-এর authentication setup পরীক্ষা করো।',
      'J'
    );
    return;
  }

  try {
    const { data, error } = await client.auth.getUser();

    if (error) throw error;

    const email = data?.user?.email || 'Signed-in user';

    modal(
      'Personal workspace',
      `Signed in as ${email}.`,
      'J',
      'Sign out',
      async () => {
        const { error: signOutError } = await client.auth.signOut();

        if (signOutError) {
          showToast('Sign out failed: ' + signOutError.message);
          return;
        }

        // Reload so the existing authentication UI can show the login screen.
        window.location.reload();
      }
    );
  } catch (error) {
    console.error('Account error:', error);

    modal(
      'Account',
      'Account details পাওয়া যায়নি। আবার sign in করে চেষ্টা করো।',
      'J'
    );
  }
});

$('#createAutomation')?.addEventListener('click', () => {
  modal(
    'Create a workflow',
    'Choose a template below to preview a workflow. Connecting it to n8n requires a separate integration.',
    '⌘',
    'Browse templates',
    () => {
      document.querySelector('.automation-grid')?.scrollIntoView({
        behavior: 'smooth'
      });
    }
  );
});

const automationTemplates = {
  lead: [
    'Lead follow-up assistant',
    'Trigger: new lead → validate details → save to a connected sheet → draft a follow-up → request approval before sending.',
    '◎'
  ],
  content: [
    'Content idea organizer',
    'Trigger: new idea → AI drafts an outline → save the draft → review before publishing.',
    '✎'
  ],
  summary: [
    'Weekly summary',
    'Collect approved task updates → summarize them → create a report draft → ask before emailing it.',
    '◷'
  ]
};

$$('[data-template]').forEach((button) => {
  button.onclick = () => {
    const template = automationTemplates[button.dataset.template];

    if (!template) return;

    modal(
      template[0],
      template[1],
      template[2],
      'Use this idea',
      () => {
        switchView('assistant');

        sendMessage(
          `Help me design this workflow: ${template[0]}. ${template[1]}`
        );
      }
    );
  };
});

$('#newProject')?.addEventListener('click', createProject);
$('#emptyNewProject')?.addEventListener('click', createProject);

$('#clearHistory')?.addEventListener('click', () => {
  modal(
    'Clear conversation history?',
    'This removes saved conversation history from this browser only. It cannot be undone.',
    '◷',
    'Clear history',
    () => {
      state.conversations = [];
      saveHistory();
      renderHistory();
      showToast('History cleared');
    }
  );
});

/* -------------------- Keyboard shortcuts -------------------- */

window.addEventListener('keydown', (event) => {
  if (
    (event.metaKey || event.ctrlKey) &&
    event.key.toLowerCase() === 'k'
  ) {
    event.preventDefault();
    startNewChat();
  }

  if (event.key === 'Escape') {
    $('#sidebar')?.classList.remove('open');
  }
});

/* -------------------- Restore local data -------------------- */

try {
  const savedHistory = JSON.parse(
    localStorage.getItem('nexora-history') || '[]'
  );

  const savedProjects = JSON.parse(
    localStorage.getItem('nexora-projects') || '[]'
  );

  state.conversations = Array.isArray(savedHistory)
    ? savedHistory.slice(0, 30)
    : [];

  state.projects = Array.isArray(savedProjects)
    ? savedProjects
    : [];
} catch (error) {
  console.warn('Could not restore local data:', error);
}

/* -------------------- Server health -------------------- */

async function checkServerHealth() {
  try {
    const response = await fetch('/api/health', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Health check failed (${response.status})`);
    }

    const health = await response.json();

    if (health.mode === 'live') {
      if (els.mode) els.mode.textContent = 'AI server online';

      const liveDot = $('.live-dot');

      if (liveDot) liveDot.style.background = '#bde96a';
    } else {
      if (els.mode) els.mode.textContent = 'Demo mode';
    }

    console.info('NEXORA server health:', health);
  } catch (error) {
    console.error('NEXORA health check failed:', error);

    if (els.mode) els.mode.textContent = 'Server unavailable';
  }
}

/* -------------------- Start app -------------------- */

renderMessages();
renderProjects();
checkServerHealth();
initializeAuthentication();
