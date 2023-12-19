function utf8_to_b64(str) {
  return window.btoa(unescape(encodeURIComponent( str )));
}

function b64_to_utf8(str) {
  return decodeURIComponent(escape(window.atob( str )));
}

/**
 * Download data with the specified data using browser mechanisms.
 *
 * @param {string} name
 * @param {object} data
 * @return void
 */
function downloadUsingBrowser(name, data) {
  const a = document.createElement('a');
  const blob = new Blob(
    [ JSON.stringify(data) ],
    { type: 'text/plain;charset=utf-8' }
  );
  let uri = null;

  uri = window.URL.createObjectURL(blob)

  a.setAttribute('href', uri);
  a.setAttribute('download', name);
  a.setAttribute('target', name);
  a.style.visibility = 'hidden';
  document.body.appendChild(a);
  a.click();
  window.setTimeout((ev) => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(uri);
  }, 500);
}

function v1ToV2(lists) {
  const v2 = [];

  lists.forEach(list => {
    // V1
    if (list.projects) {
      list.projects.forEach(project => {
        v2.push({
          color: project.color,
          name: project.name,
          tasks: project.tasks
        });
      });
    } else {
      v2.push(list)
    }
  });

  return v2;
}

function serializeString(str) {
  if (!str)
    return ''

  return str
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z_]/g, '-')
}

function saneDateStr() {
  const now = new Date()

  return `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}.${now.getMilliseconds()}`
}

function domLog(msg) {
  const target = document.querySelector('#debug_messages')

  console.debug(msg);
  if (!target) return

  target.innerHTML = `<li><pre>[${saneDateStr()}] ${msg}</pre></li>` + target.innerHTML
}

function postToBackend(newState) {
  window.backendClient?.put(newState)
    .then((resp) => {
      if (resp)
        logMessage({ title: 'OK', timeout: AUTO_REMOVE_TIMEOUT })
    })
    .catch(err => logMessage({ title: err, type: 'error', message: err.stack }))
}

function syncBackend() {
  window.backendClient?.get()
    .then(resp => {
      if (resp?.data) {
        const data = JSON.parse(resp.data)
        return StateManager.mergeState(data)
      }
    })
    .then(state => window.backendClient.put(state))
    .then(() => logMessage({ title: 'OK', timeout: AUTO_REMOVE_TIMEOUT }))
    .catch(err => logMessage({ title: err, type: 'error', message: err.stack }))
}

function logMessage(attrs) {
  switch (attrs.type) {
    case 'error':
      attrs.icon = 'X'
      break
    default:
      attrs.icon = '&#10004;'
      break
  }

  document.querySelector('#log_messages')?.prepend(LogMessage.create(attrs))
}

function addListLink(listName) {
  if (document.querySelector(`a[href="#${listName}"]`))
    return

  const li = document.createElement('li')
  const a = document.createElement('a')

  a.setAttribute('href', `#${listName}`)
  a.textContent = listName
  li.classList.add('task-list--link')
  li.dataset.list = listName
  li.appendChild(a)

  document.querySelector('body > nav ul')?.prepend(li)
}

function removeListLink(ev) {
  const link = document.querySelector(`li[data-list="${ev.detail.name}"]`)

  if (link) {
    link.parentElement.removeChild(link)
  }
}

function stateUpdated() {
  const newState = StateManager.updateState()
  setupSortable()

  postToBackend(newState)
}

function applySettings(config) {
  const backend = config.backend

  StateManager.persistSettings(config)

  window.backendClient = new BackendClient(backend.url, backend.username, backend.passphrase, backend.enabled)

  if (config.nav) {
    if (config.nav.compact)
      document.body.classList.add('config--nav-compact')
    else
      document.body.classList.remove('config--nav-compact')
  }

  if (config.tasks) {
    if (config.tasks.progress)
      document.body.classList.add('config--tasks-progress')
    else
      document.body.classList.remove('config--tasks-progress')
  }
}

function importJson(importEv) {
  if (importEv.target.files.length === 0)
    return

  const reader = new FileReader()

  reader.addEventListener('load', ev => {
    const data = JSON.parse(ev.target.result)
    StateManager.mergeState(data)
  })

  reader.readAsBinaryString(importEv.target.files.item(0))
}

function setupDebugControls() {
  document.querySelector('#debug_controls')?.classList.remove('hidden')
  document.querySelector('#debug_messages')?.classList.remove('hidden')
  document.querySelector('#print_state_btn')?.addEventListener('click', (ev) => {
    domLog(`state = ${JSON.stringify(StateManager.readState(), null, 2)}`)
  })
  document.querySelector('#reset_log')?.addEventListener('click', (ev) => {
    document.querySelector('#debug_messages').innerHTML = ''
  })
}

function requestCacheFlush(ev) {
  ev.preventDefault();
  ev.stopPropagation();

  window.fetch('/nuke-cache', { method: 'DELETE' })
    .then((resp) => {
      console.log('[requestCacheFlush]', resp);
    })
    .catch((err) => {
      console.error('[requestCacheFlush]', err);
    });
}
