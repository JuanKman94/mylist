/**
 * Task
 *
 * @see https://todotxt.org/
 *
 * @typedef {Object} Task
 * @property {string} task Task description
 * @property {boolean} done Task completion
 * @property {string} project Task project
 * @property {string} context Task context
 * @property {string} color Task color ID
 */

window.addEventListener('DOMContentLoaded', init)
window.APP_NAME = 'MyList'
window.DEBUG_MODE = false
window.SORTABLE_INSTANCES = []
window.STORAGE_NAME = 'todoState'
window.DEFAULT_SORTABLE_CONFIG = {
  animation: 150,
  chosenClass: 'dragging',
  fallbackOnBody: false,
  ghostClass: 'zoom-in-out',
  sort: true,
  onSort: function(ev) {
    const newState = StateManager.updateState()
    postToBackend(newState)
  },
}
window.NEW_LIST_PROMPT = 'What is this list about?'
window.backendClient = new BackendClient(
  localStorage.getItem('backend_url'),
  localStorage.getItem('backend_username'),
  localStorage.getItem('backend_passphrase')
)

function cleanUpSortable() {
  let sortable = null

  while (sortable = SORTABLE_INSTANCES.pop()) {
    sortable.destroy()
  }
}

// TODO: call persistState after an element is moved
function setupSortable() {
  cleanUpSortable()

  document.querySelectorAll(`.${TaskList.TAG}`).forEach(list => {
    list.querySelectorAll(`.${TaskCategory.TAG} .tasks-container`).forEach(tasksContainer => {
      SORTABLE_INSTANCES.push(new Sortable(
        tasksContainer,
        Object.assign({ group: 'tasks', handle: '.task-grabber' }, DEFAULT_SORTABLE_CONFIG)))
    })
    SORTABLE_INSTANCES.push(new Sortable(
      list,
      Object.assign({ group: 'categories', handle: '.category-grabber' }, DEFAULT_SORTABLE_CONFIG)))
  })
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

function postToBackend(newState) {
  window.backendClient?.put(newState)
    .then(() => logMessage('OK'))
    .catch(err => logMessage(err, 'error', err.stack))
}

function syncBackend() {
  window.backendClient?.get()
    .then(resp => {
      const data = JSON.parse(resp.data)
      return StateManager.mergeState(data)
    })
    .then(state => window.backendClient.put(state))
    .then(() => logMessage('OK'))
    .catch(err => logMessage(err, 'error', err.stack))
}

function logMessage(title, cssClass, message) {
  const details = document.createElement('details')
  const li = document.createElement('li')
  const summary = document.createElement('summary')

  li.className = cssClass
  summary.classList.add('bold')
  summary.textContent = title
  details.append(summary)
  li.append(details)

  if (message) {
    const p = document.createElement('p')
    p.classList.add('pre-line')
    p.textContent = message
    details.append(p)
  }

  document.querySelector('#log_messages')?.prepend(li)
}

function init(ev) {
  if (window.DEBUG_MODE)
    setupDebugControls()

  function stateUpdated() {
    const newState = StateManager.updateState()
    setupSortable()

    postToBackend(newState)
  }

  document.addEventListener(LIST_EVENTS.CHANGE, stateUpdated)
  document.addEventListener(LIST_EVENTS.DELETE, ev => { removeListLink(ev) ; stateUpdated() })
  document.addEventListener(TASK_EVENTS.CHANGE, stateUpdated)
  document.addEventListener(TASK_EVENTS.DELETE, stateUpdated)

  document.addEventListener(BackendSettings.BACKEND_CHANGE_EVENT, (ev) => {
    window.backendClient = new BackendClient(ev.detail.url, ev.detail.username, ev.detail.passphrase)
  })

  document.querySelector('.new-list')?.addEventListener('click', ev => {
    const listName = TaskList.addList(document.getElementById('lists'))

    if (listName)
      addListLink(listName)
  })
  document.querySelector('#sync_btn')?.addEventListener('click', syncBackend)
  document.querySelector('#export_json')?.addEventListener(
    'click',
    ev => downloadUsingBrowser(`${APP_NAME}.json`, JSON.stringify(StateManager.readState()))
  )
  document.querySelector('#import_json')?.addEventListener('change', importJson)

  StateManager.loadState()
  setupSortable()
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
  document.querySelector('#print_state_btn')?.addEventListener('click', (ev) => {
    domLog(`state = ${JSON.stringify(StateManager.readState(), null, 2)}`)
  })
  document.querySelector('#reset_log')?.addEventListener('click', (ev) => {
    document.querySelector('#log_messages').innerHTML = ''
  })
}
