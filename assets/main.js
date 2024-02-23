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
  localStorage.getItem('backend_passphrase'),
  !!localStorage.getItem('backend_enabled')
)
window.AUTO_REMOVE_TIMEOUT = 6500

function cleanUpSortable() {
  let sortable = null

  while (sortable = SORTABLE_INSTANCES.pop()) {
    sortable.destroy()
  }
}

// TODO: call persistState after an element is moved
function setupSortable() {
  cleanUpSortable()

  document.querySelectorAll(`.${TaskList.TAG} .tasks-container`).forEach(tasksContainer => {
    SORTABLE_INSTANCES.push(new Sortable(
      tasksContainer,
      Object.assign({ group: 'tasks', handle: '.task-grabber' }, DEFAULT_SORTABLE_CONFIG)))
  })
}

/**
 * Apply application settings from query string parameters.
 *
 * @param config {object}
 * @return {object} Passed config with values overriden from query string.
 */
function applyQueryStringSettings(config) {
  const url = new URL(window.location);
  const theme = url.searchParams.get('theme');
  const queryStringConfig = Object.assign({}, config);

  if (theme != null) {
    queryStringConfig.theme = theme;
  }

  applySettings(queryStringConfig);

  return queryStringConfig;
}

function init(ev) {
  if (window.DEBUG_MODE) {
    setupDebugControls()
  }

  document.addEventListener(LIST_EVENTS.CHANGE, stateUpdated)
  document.addEventListener(LIST_EVENTS.DELETE, ev => { removeListLink(ev) ; stateUpdated() })
  document.addEventListener(TASK_EVENTS.CHANGE, stateUpdated)
  document.addEventListener(TASK_EVENTS.DELETE, stateUpdated)

  document.addEventListener(TodoSettings.SETTINGS_CHANGE_EVENT, (ev) => applySettings(ev.detail))

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
  document.querySelector('#clear_cache_btn')?.addEventListener('click', requestCacheFlush)

  const todoSettings = document.querySelector(TodoSettings.TAG)
  let config = StateManager.settings()

  StateManager.loadState()
  config = applyQueryStringSettings(config);

  window.backendClient.get()
  setupSortable()

  if (todoSettings) {
    todoSettings.applyConfig(config)
  }
}
