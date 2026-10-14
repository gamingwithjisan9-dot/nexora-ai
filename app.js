
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const state = {
  messages: [],
  conversations: [],
  projects: [],
  view: 'assistant',
  busy: false
};

const els = {
  messages: $('#messages'),
  welcome: $('#welcomeBlock'),
  input: $('#messageInput'),
  form: $('#chatForm'),
  mode: $('#modeLabel'),
  webSearch: $('#webSearchToggle'),
  toast: $('#toast'),
  modal: $('#modal')
};

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[c]));

function safeUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return ['https:', 'http:'].includes(url.protocol)
      ? url.href
      : '#';
  } catch {
    return '#';
  }
}

function showToast(message) {
  if (!els.toast) return;

  els.toast.textContent = message;
  els.toast.classList.add('show');

  clearTimeout(showToast.timer);

  showToast.timer = setTimeout(() => {
    els.toast.classList.remove('show');
  }, 2600);
}

function modal(
  title,
  text,
  icon = '✳',
  primary = 'Got it',
  callback = null
) {
  $('#modalTitle').textContent = title;
  $('#modalText').textContent = text;
  $('#modalIcon').textContent = icon;
  $('#modalPrimary').textContent = primary;

  $('#modalPrimary').onclick = () => {
    callback?.();
    els.modal.close();
  };

  els.modal.showModal();
}

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

  $('#crumbTitle').textContent = ({
    assistant: 'AI Assistant',
    automations: 'Automations',
    projects: 'Projects',
    history: 'History'
  })[view] || 'NEXORA AI';

  $('#sidebar').classList.remove('open');

  if (view === 'history') renderHistory();
  if (view === 'projects') renderProjects();
}

function renderMessages() {
  els.messages.innerHTML = state.messages.map(message => {
    let sourcesHTML = '';

    if (
      message.role === 'assistant' &&
      Array.isArray(message.sources) &&
      message.sources.length
    ) {
      sourcesHTML = `
        <div class="source-list">
          <strong>Sources / সূত্র</strong>

          ${message.sources.map((source, index) => {
            const url = safeUrl(source.url);
            const title = esc(source.title || source.url || 'Web source');

            if (url === '#') {
              return `
                <div class="source-link">
                  <span>[${index + 1}] ${title}</span>
                </div>
              `;
            }

            return `
              <a class="source-link"
                 href="${esc(url)}"
                 target="_blank"
                 rel="noopener noreferrer">
                <span>[${index + 1}] ${title}</span>
                <small>${esc(source.url)}</small>
              </a>
            `;
          }).join('')}
        </div>
      `;
    }

    return `
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

          ${sourcesHTML}
        </div>

        ${
          message.role === 'user'
            ? '<div class="message-avatar" style="background:#2b3328;color:#e5f3d9">J</div>'
            : ''
        }
      </div>
    `;
  }).join('');

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

  window.scrollTo({
    top: document.body.scrollHeight,
    behavior: 'smooth'
  });
}

function saveHistory() {
  try {
    localStorage.setItem(
      'nexora-history',
      JSON.stringify(state.conversations.slice(-30))
    );
  } catch (error) {
    console.warn('Could not save conversation history:', error);
  }
}

function recordConversation() {
  if (!state.messages.length) return;

  const firstMessage = state.messages.find(
    message => message.role === 'user'
  );

  if (!firstMessage) return;

  const conversation = {
    id: Date.now(),
    title:
      firstMessage.content.slice(0, 58) +
      (firstMessage.content.length > 58 ? '…' : ''),
    messages: state.messages,
    updated: new Date().toISOString()
  };

  state.conversations.unshift(conversation);
  state.conversations = state.conversations.slice(0, 30);

  saveHistory();
}

function resizeInput() {
  els.input.style.height = 'auto';

  els.input.style.height =
    Math.min(els.input.scrollHeight, 160) + 'px';
}

async function sendMessage(text) {
  text = (text || '').trim();

  if (!text || state.busy) return;

  state.messages.push({
    role: 'user',
    content: text
  });

  state.busy = true;

  els.input.value = '';
  resizeInput();
  renderMessages();

  $('#chatForm button[type="submit"]').disabled = true;

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: state.messages.map(message => ({
          role: message.role,
          content: message.content
        })),

        // Web Search checkbox চালু থাকলে backend-এ true যাবে।
        webSearch: Boolean(els.webSearch?.checked)
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    state.messages.push({
      role: 'assistant',
      content: data.reply || 'কোনো উত্তর পাওয়া যায়নি।',
      sources: Array.isArray(data.sources)
        ? data.sources
        : []
    });

    if (data.mode === 'live') {
      els.mode.textContent = 'AI connected';

      const liveDot = $('.live-dot');
      if (liveDot) liveDot.style.background = '#bde96a';
    } else {
      els.mode.textContent = 'Demo mode';

      showToast(
        'Demo response — live AI-এর জন্য API key সেট করো।'
      );
    }

    if (els.webSearch?.checked && !data.sources?.length) {
      showToast(
        'উত্তর এসেছে, কিন্তু কোনো Web Search source পাওয়া যায়নি।'
      );
    }
  } catch (error) {
    state.messages.push({
      role: 'assistant',
      content:
        `দুঃখিত, অনুরোধটি সম্পন্ন করা যায়নি।\n\n` +
        `${error.message}\n\n` +
        'সার্ভার, API এবং Render-এর লগ পরীক্ষা করো।',
      sources: []
    });
  } finally {
    state.busy = false;

    $('#chatForm button[type="submit"]').disabled = false;

    renderMessages();
    recordConversation();
  }
}

function renderHistory() {
  const history = $('#historyList');

  if (!state.conversations.length) {
    history.innerHTML = `
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
      state.messages = [];
      renderMessages();
      switchView('assistant');
    });

    return;
  }

  history.innerHTML = state.conversations.map(conversation => `
    <div class="history-item">
      <div class="history-main">
        <div class="history-icon">✳</div>
        <div>
          <strong>${esc(conversation.title)}</strong>
          <small>
            ${new Date(conversation.updated).toLocaleString()}
            · ${conversation.messages.length} messages
          </small>
        </div>
      </div>

      <button
        class="history-open"
        data-open-history="${conversation.id}">
        Open →
      </button>
    </div>
  `).join('');

  $$('[data-open-history]').forEach(button => {
    button.onclick = () => {
      const conversation = state.conversations.find(
        item => item.id === Number(button.dataset.openHistory)
      );

      if (conversation) {
        state.messages = [...conversation.messages];
        renderMessages();
        switchView('assistant');
      }
    };
  });
}

function renderProjects() {
  $('#projectList').innerHTML = state.projects.map(project => `
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

function startNewChat() {
  state.messages = [];

  renderMessages();
  switchView('assistant');
  els.input.focus();
}

// Chat form
$('#chatForm').addEventListener('submit', event => {
  event.preventDefault();
  sendMessage(els.input.value);
});

// Input resize
els.input.addEventListener('input', resizeInput);

// Enter to send; Shift+Enter for a new line
els.input.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    els.form.requestSubmit();
  }
});

// Prompt cards
$$('[data-prompt]').forEach(button => {
  button.onclick = () => sendMessage(button.dataset.prompt);
});

// Navigation
$$('[data-view]').forEach(button => {
  button.onclick = () => switchView(button.dataset.view);
});

$('#newChat').onclick = startNewChat;

$('#mobileMenu').onclick = () => {
  $('#sidebar').classList.toggle('open');
};

// Tool connection information
$('#connectTools').onclick = () => modal(
  'Connect your tools',
  'Real integrations are not configured yet. Connect one provider at a time using OAuth or server-side credentials.',
  '⌘'
);

// Upgrade information
$('#upgradeButton').onclick = () => modal(
  'Plans are coming next',
  'Billing is not enabled in this demo. Add usage limits and a supported payment provider before enabling subscriptions.',
  '✦'
);

// Help
$('#helpButton').onclick = () => modal(
  'Welcome to NEXORA AI',
  'Start with a prompt card or type a request. This starter runs in demo mode until you configure an AI API key on the server.',
  '?'
);

// Attach button
$('#attachButton').onclick = () => modal(
  'More ways to work',
  'File uploads and connected tools are planned for a later build. For now, type your request in the message box.',
  '＋'
);

// Profile
$('#profileButton').onclick = () => modal(
  'Personal workspace',
  'This is a front-end prototype. Cloud user accounts are not connected yet.',
  'J'
);

// Automation creation
$('#createAutomation').onclick = () => modal(
  'Create a workflow',
  'Choose a template below to preview a workflow. Connecting it to n8n is a later implementation step.',
  '⌘',
  'Browse templates',
  () => document.querySelector('.automation-grid')
    ?.scrollIntoView({ behavior: 'smooth' })
);

// Automation templates
$$('[data-template]').forEach(button => {
  button.onclick = () => {
    const templates = {
      lead: [
        'Lead follow-up assistant',
        'Trigger: new lead → validate details → save to a connected sheet → draft a follow-up → request approval before sending. No external service is connected yet.',
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

    const details = templates[button.dataset.template];
    if (!details) return;

    modal(
      details[0],
      details[1],
      details[2],
      'Use this idea',
      () => {
        switchView('assistant');

        sendMessage(
          'Help me design this workflow: ' +
          details[0] + '. ' + details[1]
        );
      }
    );
  };
});

// Projects
$('#newProject').onclick = createProject;
$('#emptyNewProject').onclick = createProject;

// Clear saved history
$('#clearHistory').onclick = () => modal(
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

// Keyboard shortcuts
window.addEventListener('keydown', event => {
  if (
    (event.metaKey || event.ctrlKey) &&
    event.key.toLowerCase() === 'k'
  ) {
    event.preventDefault();
    startNewChat();
  }

  if (event.key === 'Escape') {
    $('#sidebar').classList.remove('open');
  }
});

// Load saved local data
try {
  state.conversations = JSON.parse(
    localStorage.getItem('nexora-history') || '[]'
  );

  state.projects = JSON.parse(
    localStorage.getItem('nexora-projects') || '[]'
  );
} catch (error) {
  console.warn('Could not load saved data:', error);

  state.conversations = [];
  state.projects = [];
}

// Check backend health
fetch('/api/health')
  .then(response => response.json())
  .then(data => {
    if (data.mode === 'live') {
      els.mode.textContent = 'AI connected';

      const liveDot = $('.live-dot');
      if (liveDot) liveDot.style.background = '#bde96a';
    }
  })
  .catch(error => {
    console.warn('Health check failed:', error);
  });

// Initial render
renderMessages();
renderProjects();
