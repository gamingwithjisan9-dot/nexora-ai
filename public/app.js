

'use strict';

/* =========================================================
   NEXORA AI — Main App + Supabase Authentication
   File: public/app.js
   ========================================================= */

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

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

/* -------------------- Supabase configuration -------------------- */

let supabaseClient = null;

const SUPABASE_URL =
  'https://bejwgsbfyvqvfwyhywgq.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_rBQ5fENpGQhfZvgESbG0Bg_4Zq3ZmAh';

/* -------------------- General helpers -------------------- */

const esc = value =>
  String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);

function showToast(message) {
  if (!els.toast) return;

  els.toast.textContent = message;
  els.toast.classList.add('show');

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    els.toast.classList.remove('show');
  }, 2600);
}

function modal(title, message, icon = '✳', primary = 'Got it', callback = null) {
  if (!els.modal) {
    window.alert(`${title}\n\n${message}`);
    return;
  }

  $('#modalTitle').textContent = title;
  $('#modalText').textContent = message;
  $('#modalIcon').textContent = icon;
  $('#modalPrimary').textContent = primary;

  $('#modalPrimary').onclick = () => {
    if (typeof callback === 'function') callback();
    els.modal.close();
  };

  els.modal.showModal();
}

function resizeInput() {
  if (!els.input) return;

  els.input.style.height = 'auto';

  els.input.style.height =
    Math.min(els.input.scrollHeight, 160) + 'px';
}

/* -------------------- Authentication UI -------------------- */

const authScreen = $('#authScreen');
const authForm = $('#authForm');
const authEmail = $('#authEmail');
const authPassword = $('#authPassword');
const authMessage = $('#authMessage');
const authSubmit = $('#authSubmit');
const authTitle = $('#authTitle');
const authSubtitle = $('#authSubtitle');
const authSwitch = $('#authSwitch');
const authSwitchText = $('#authSwitchText');
const forgotPasswordButton = $('#forgotPassword');
const googleLoginButton = $('#googleLogin');

let authMode = 'login';

function showAuthMessage(message) {
  if (authMessage) authMessage.textContent = message;
}

function setAuthMode(mode) {
  authMode = mode === 'signup' ? 'signup' : 'login';

  const signup = authMode === 'signup';

  if (authTitle) {
    authTitle.textContent = signup
      ? 'Create your account'
      : 'Welcome back';
  }

  if (authSubtitle) {
    authSubtitle.textContent = signup
      ? 'Sign up to start using NEXORA AI.'
      : 'Sign in to continue to your AI workspace.';
  }

  if (authSubmit) {
    authSubmit.textContent = signup
      ? 'Create account'
      : 'Sign in';
  }

  if (authPassword) {
    authPassword.autocomplete = signup
      ? 'new-password'
      : 'current-password';
  }

  if (authSwitchText) {
    authSwitchText.textContent = signup
      ? 'Already have an account?'
      : "Don't have an account?";
  }

  if (authSwitch) {
    authSwitch.textContent = signup
      ? 'Sign in'
      : 'Create account';
  }

  if (forgotPasswordButton) {
    forgotPasswordButton.hidden = signup;
  }

  showAuthMessage('');
}

function showWorkspace() {
  if (authScreen) authScreen.hidden = true;

  $('.app-shell')?.classList.remove('auth-locked');

  updateLogoutVisibility();
}

function showLogin() {
  if (authScreen) authScreen.hidden = false;

  $('.app-shell')?.classList.add('auth-locked');

  updateLogoutVisibility();
}

/* -------------------- Logout button -------------------- */

const logoutButton = document.createElement('button');

logoutButton.type = 'button';
logoutButton.textContent = 'Log out';
logoutButton.className = 'secondary-button';
logoutButton.style.cssText =
  'position:fixed;right:18px;bottom:18px;z-index:30;';
logoutButton.hidden = true;

document.body.appendChild(logoutButton);

function updateLogoutVisibility() {
  if (!authScreen) {
    logoutButton.hidden = true;
    return;
  }

  // Show logout only when the authentication screen is hidden.
  logoutButton.hidden = !authScreen.hidden;
}

logoutButton.addEventListener('click', async () => {
  if (!supabaseClient) return;

  logoutButton.disabled = true;

  try {
    const { error } = await supabaseClient.auth.signOut();

    if (error) throw error;

    state.messages = [];
    state.currentConversationId = null;

    renderMessages();
    showLogin();
    showToast('Logged out');
  } catch (error) {
    showToast(error.message || 'Logout failed.');
  } finally {
    logoutButton.disabled = false;
  }
});

/* -------------------- Initialize Supabase -------------------- */

async function initNexoraAuth() {
  try {
    if (!window.supabase) {
      showLogin();
      showAuthMessage(
        'Supabase library load হয়নি। পেজ refresh করে আবার চেষ্টা করো।'
      );
      return;
    }

    if (
      !SUPABASE_URL.startsWith('https://') ||
      !SUPABASE_PUBLISHABLE_KEY ||
      SUPABASE_PUBLISHABLE_KEY.includes('PASTE_YOUR_')
    ) {
      showLogin();
      showAuthMessage('Supabase configuration পরীক্ষা করো।');
      return;
    }

    supabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY
    );

    const { data, error } =
      await supabaseClient.auth.getSession();

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
    showLogin();

    showAuthMessage(
      error.message || 'Authentication setup failed.'
    );
  }
}

/* -------------------- Switch login / signup -------------------- */

if (authSwitch) {
  authSwitch.addEventListener('click', () => {
    setAuthMode(authMode === 'login' ? 'signup' : 'login');
  });
}

/* -------------------- Email signup and login -------------------- */

if (authForm) {
  authForm.addEventListener('submit', async event => {
    event.preventDefault();

    if (!supabaseClient) {
      showAuthMessage(
        'Supabase এখনো প্রস্তুত নয়। একটু পরে আবার চেষ্টা করো।'
      );
      return;
    }

    const email = authEmail?.value.trim() || '';
    const password = authPassword?.value || '';

    if (!email || !password) {
      showAuthMessage('Email ও password লিখো।');
      return;
    }

    authSubmit.disabled = true;
    showAuthMessage('Please wait…');

    try {
      if (authMode === 'signup') {
        const { data, error } =
          await supabaseClient.auth.signUp({
            email,
            password
          });

        if (error) throw error;

        if (data.session) {
          showWorkspace();
          showToast('Account created successfully');
        } else {
          showAuthMessage(
            'Account তৈরি হয়েছে। ইমেইলে verification link এলে সেটি খুলে তারপর sign in করো।'
          );
        }
      } else {
        const { error } =
          await supabaseClient.auth.signInWithPassword({
            email,
            password
          });

        if (error) throw error;

        showWorkspace();
        showToast('Login successful');
      }
    } catch (error) {
      showAuthMessage(
        error.message || 'Authentication failed. আবার চেষ্টা করো।'
      );
    } finally {
      authSubmit.disabled = false;
    }
  });
}

/* -------------------- Google OAuth login -------------------- */

if (googleLoginButton) {
  googleLoginButton.addEventListener('click', async () => {
    if (!supabaseClient) {
      showAuthMessage(
        'Supabase প্রস্তুত নয়। পেজ refresh করে আবার চেষ্টা করো।'
      );
      return;
    }

    googleLoginButton.disabled = true;
    showAuthMessage('Google Login চালু হচ্ছে…');

    try {
      const { error } =
        await supabaseClient.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin
          }
        });

      if (error) throw error;

      // Supabase normally redirects the browser to Google.
    } catch (error) {
      showAuthMessage(
        error.message ||
        'Google Login ব্যর্থ হয়েছে। OAuth configuration পরীক্ষা করো।'
      );

      googleLoginButton.disabled = false;
    }
  });
}

/* -------------------- Forgot password -------------------- */

if (forgotPasswordButton) {
  forgotPasswordButton.addEventListener('click', async () => {
    if (!supabaseClient) {
      showAuthMessage('Supabase প্রস্তুত নয়।');
      return;
    }

    const email = authEmail?.value.trim() || '';

    if (!email) {
      showAuthMessage('প্রথমে Email address লিখো।');
      authEmail?.focus();
      return;
    }

    forgotPasswordButton.disabled = true;

    try {
      const { error } =
        await supabaseClient.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin
        });

      if (error) throw error;

      showAuthMessage(
        'Password reset-এর নির্দেশনা ইমেইলে পাঠানো হয়েছে।'
      );
    } catch (error) {
      showAuthMessage(
        error.message || 'Reset email পাঠানো যায়নি।'
      );
    } finally {
      forgotPasswordButton.disabled = false;
    }
  });
}

/* -------------------- Chat view -------------------- */

function switchView(view) {
  state.view = view;

  $$('.view').forEach(element => {
    element.classList.remove('active-view');
  });

  $(`#${view}View`)?.classList.add('active-view');

  $$('.nav-item').forEach(button => {
    button.classList.toggle(
      'active',
      button.dataset.view === view
    );
  });

  const titles = {
    assistant: 'AI Assistant',
    automations: 'Automations',
    projects: 'Projects',
    history: 'History'
  };

  const crumbTitle = $('#crumbTitle');

  if (crumbTitle) {
    crumbTitle.textContent = titles[view] || 'NEXORA AI';
  }

  $('#sidebar')?.classList.remove('open');

  if (view === 'history') renderHistory();
  if (view === 'projects') renderProjects();
}

function renderAssistantContent(content) {
  const normalized = String(content).replace(
    /\\([#*`_[\]()>+\-|.!])/g,
    '$1'
  );

  if (window.marked && window.DOMPurify) {
    const html = window.marked.parse(normalized, {
      gfm: true,
      breaks: true
    });

    return window.DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true }
    });
  }

  // Markdown library unavailable হলে নিরাপদ plain-text fallback
  return esc(content).replace(/\n/g, '<br>');
}

function renderMessages() {
  if (!els.messages || !els.welcome) return;

  els.messages.innerHTML = state.messages.map(message => `
    <div class="message ${message.role}">
      ${
        message.role === 'assistant'
          ? '<div class="message-avatar">✳</div>'
          : ''
      }
      <div class="message-body">
        ${
          message.role === 'assistant'
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
  `).join('');

  els.welcome.style.display =
    state.messages.length ? 'none' : 'block';

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

    els.messages.append(typing);
  }

  ;
}

/* -------------------- Save conversation history -------------------- */

function saveHistory() {
  try {
    localStorage.setItem(
      'nexora-history',
      JSON.stringify(state.conversations.slice(0, 30))
    );
  } catch (error) {
    console.warn('Could not save chat history:', error);
  }
}

function recordConversation() {
  if (!state.messages.length) return;

  const firstMessage = state.messages.find(
    message => message.role === 'user'
  );

  if (!firstMessage) return;

  const existing = state.conversations.find(
    conversation => conversation.id === state.currentConversationId
  );

  const conversation = {
    id: state.currentConversationId || Date.now(),
    title:
      firstMessage.content.slice(0, 58) +
      (firstMessage.content.length > 58 ? '…' : ''),
    messages: state.messages,
    updated: new Date().toISOString()
  };

  state.currentConversationId = conversation.id;

  if (existing) {
    Object.assign(existing, conversation);
  } else {
    state.conversations.unshift(conversation);
  }

  state.conversations.sort(
    (a, b) => new Date(b.updated) - new Date(a.updated)
  );

  state.conversations = state.conversations.slice(0, 30);

  saveHistory();
}

/* -------------------- Send message to authenticated API -------------------- */

async function sendMessage(text) {
  text = (text || '').trim();

  if (!text || state.busy) return;

  if (!supabaseClient) {
    showToast('প্রথমে sign in করো।');
    return;
  }

  try {
    const { data, error } =
      await supabaseClient.auth.getSession();

    if (error) throw error;

    if (!data.session?.access_token) {
      showLogin();
      showToast('AI ব্যবহার করতে sign in করো।');
      return;
    }

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

    const submitButton =
      $('#chatForm button[type="submit"]');

    if (submitButton) submitButton.disabled = true;

   
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + data.session.access_token
      },
      body: JSON.stringify({
        messages: state.messages.map(message => ({
          role: message.role,
          content: message.content
        })),
        webSearch: Boolean(
          document.querySelector('#webSearchToggle')?.checked
        )
      })
    });

    const result = await response.json();


    if (!response.ok) {
      throw new Error(result.error || 'Request failed');
    }

    state.messages.push({
      role: 'assistant',
      content: result.reply || result.message || 'কোনো উত্তর পাওয়া যায়নি।'
    });

    if (result.mode === 'live') {
      if (els.mode) els.mode.textContent = 'AI connected';

      const liveDot = $('.live-dot');

      if (liveDot) liveDot.style.background = '#bde96a';
    } else {
      if (els.mode) els.mode.textContent = 'Demo mode';

      showToast('Demo response — server API configuration পরীক্ষা করো।');
    }
  } catch (error) {
    state.messages.push({
      role: 'assistant',
      content:
        'দুঃখিত, অনুরোধটি সম্পন্ন করা যায়নি।\n\n' +
        (error.message || 'Unknown error') +
        '\n\nসার্ভার, API ও লগইন সেটিংস পরীক্ষা করো।'
    });
  } finally {
    state.busy = false;

    const submitButton =
      $('#chatForm button[type="submit"]');

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

    $('#historyStart')?.addEventListener('click', startNewChat);

    return;
  }

  historyList.innerHTML = state.conversations.map(conversation => `
    <div class="history-item">
      <div class="history-main">
        <div class="history-icon">✳</div>
        <div>
          <strong>${esc(conversation.title)}</strong>
          <small>
            ${new Date(conversation.updated).toLocaleString()}
            · ${(conversation.messages || []).length} messages
          </small>
        </div>
      </div>
      <button
        class="history-open"
        data-open-history="${conversation.id}"
      >
        Open →
      </button>
    </div>
  `).join('');

  $$('[data-open-history]').forEach(button => {
    button.onclick = () => {
      const conversation = state.conversations.find(
        item => String(item.id) === button.dataset.openHistory
      );

      if (!conversation) return;

      state.messages = [...(conversation.messages || [])];
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

  projectList.innerHTML = state.projects.map(project => `
    <div class="project-item">
      <div class="project-icon">▧</div>
      <div>
        <strong>${esc(project.name)}</strong>
        <small>
          Created ${new Date(project.created).toLocaleDateString()}
        </small>
      </div>
    </div>
  `).join('');
}

function createProject() {
  const name = window.prompt('Project name / প্রজেক্টের নাম:');

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
    console.warn('Could not save project:', error);
  }

  renderProjects();
  showToast('Project saved on this device');
}

function startNewChat() {
  state.messages = [];
  state.currentConversationId = null;

  renderMessages();
  switchView('assistant');
  els.input?.focus();
}

/* -------------------- Main event listeners -------------------- */

if (els.form && els.input) {
  els.form.addEventListener('submit', event => {
    event.preventDefault();
    sendMessage(els.input.value);
  });

  els.input.addEventListener('input', resizeInput);

  els.input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      els.form.requestSubmit();
    }
  });
}

$$('[data-prompt]').forEach(button => {
  button.onclick = () => sendMessage(button.dataset.prompt);
});

$$('[data-view]').forEach(button => {
  button.onclick = () => switchView(button.dataset.view);
});

$('#newChat')?.addEventListener('click', startNewChat);

$('#mobileMenu')?.addEventListener('click', () => {
  $('#sidebar')?.classList.toggle('open');
});

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
    'Start with a prompt card or type a request. Live AI requires a working server API configuration.',
    '?'
  );
});

$('#attachButton')?.addEventListener('click', () => {
  modal(
    'More ways to work',
    'File uploads and connected tools are planned for a later build. For now, type your request in the message box.',
    '＋'
  );
});

$('#profileButton')?.addEventListener('click', () => {
  modal(
    'Personal workspace',
    'Your account is authenticated with Supabase. Conversation history and projects are currently stored in this browser.',
    'J'
  );
});

$('#createAutomation')?.addEventListener('click', () => {
  modal(
    'Create a workflow',
    'Choose a template below to preview a workflow. Connecting it to n8n is a later implementation step.',
    '⌘',
    'Browse templates',
    () => {
      document.querySelector('.automation-grid')?.scrollIntoView({
        behavior: 'smooth'
      });
    }
  );
});

$$('[data-template]').forEach(button => {
  button.onclick = () => {
    const templates = {
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

    const template = templates[button.dataset.template];

    if (!template) return;

    modal(
      template[0],
      template[1] + ' No external service is connected yet.',
      template[2],
      'Use this idea',
      () => {
        switchView('assistant');

        sendMessage(
          'Help me design this workflow: ' +
          template[0] + '. ' + template[1]
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
      state.currentConversationId = null;
      saveHistory();
      renderHistory();
      showToast('History cleared');
    }
  );
});

window.addEventListener('keydown', event => {
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

/* -------------------- Load locally saved data -------------------- */

try {
  const savedHistory = JSON.parse(
    localStorage.getItem('nexora-history') || '[]'
  );

  state.conversations = Array.isArray(savedHistory)
    ? savedHistory
    : [];
} catch {
  state.conversations = [];
}

try {
  const savedProjects = JSON.parse(
    localStorage.getItem('nexora-projects') || '[]'
  );

  state.projects = Array.isArray(savedProjects)
    ? savedProjects
    : [];
} catch {
  state.projects = [];
}

/* -------------------- Server health indicator -------------------- */

fetch('/api/health')
  .then(response => {
    if (!response.ok) throw new Error('Health check failed');
    return response.json();
  })
  .then(result => {
    if (result.mode === 'live') {
      if (els.mode) els.mode.textContent = 'AI connected';

      const liveDot = $('.live-dot');

      if (liveDot) liveDot.style.background = '#bde96a';
    }
  })
  .catch(() => {
    if (els.mode) els.mode.textContent = 'Server unavailable';
  });

/* -------------------- Start app -------------------- */

renderMessages();
renderProjects();
updateLogoutVisibility();
initNexoraAuth();
