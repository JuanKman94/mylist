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
window.DEBUG_MODE = false
window.SORTABLE_INSTANCES = []
window.STORAGE_NAME = 'todoState'
window.DEFAULT_SORTABLE_CONFIG = {
  animation: 150,
  ghostClass: 'zoom-in-out',
  chosenClass: 'dragging',
}
window.NEW_LIST_PROMPT = 'What is this list about?'

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

function newList() {
  const listName = window.prompt(NEW_LIST_PROMPT)

  if (listName && listName.length > 0) {
    document.getElementById('lists')
      .prepend(createCustomElement(TaskList, { id: listName, name: listName }))
    addListLink(listName)
  }
}

function addListLink(listName) {
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

function init(ev) {
  if (window.DEBUG_MODE)
    setupDebugControls()

  document.addEventListener(LIST_EVENTS.CHANGE, updateState)
  document.addEventListener(LIST_EVENTS.DELETE, removeListLink)
  document.addEventListener(TASK_EVENTS.CHANGE, updateState)
  document.addEventListener(TASK_EVENTS.DELETE, updateState)
  document.querySelector('.new-list')?.addEventListener('click', newList)

  loadState()
  setupSortable()
}

function updateState(ev) {
  const { isDone, task } = ev.detail
  const newState = readState()

  //console.debug(`[${TASK_EVENTS.CHANGE}] isDone = ${isDone}, task = ${task}`)
  //domLog(`state = ${JSON.stringify(newState, null, 2)}`)
  persistState(newState)
  setupSortable()
}

function persistState(newState) {
  localStorage.setItem(STORAGE_NAME, JSON.stringify(newState))
}

function loadState() {
  const rawState = localStorage.getItem(STORAGE_NAME)

  if (!rawState) return

  const state = JSON.parse(rawState)
  const listContainer = document.getElementById('lists')

  state.lists.forEach(list => {
    const taskList = createCustomElement(TaskList, { id: list.context, name: list.context })
    listContainer.appendChild(taskList)

    list.projects.forEach(project => {
      const taskCategory = createCustomElement(TaskCategory, { color: project.color, name: project.name })
      taskList.addCategory(taskCategory)

      project.tasks.forEach(task => {
        const taskItem = createCustomElement(TaskItem, { done: task.done, name: task.name })
        taskCategory.addTask(taskItem)
      })
    })

    addListLink(list.context)
  })

  return state
}

function readState() {
  const lists = document.querySelectorAll(`.${TaskList.TAG}`)
  const state = {
    lists: [],
  }
  let todoList = null,
    project = null,
    task = null,
    tasksContainer = null

  lists.forEach(list => {
    todoList = {
      context: list.querySelector('.list--name')?.textContent.trim(),
      projects: [],
    }

    list.querySelectorAll(`.${TaskCategory.TAG}`).forEach(categoryEl => {
      project = {
        name: categoryEl.querySelector('.category--name')?.textContent.trim(),
        color: categoryEl.getAttribute('color') || null,
        tasks: [],
      }
      tasksContainer = categoryEl.querySelector('.tasks-container')

      Array.from(tasksContainer.children).forEach(item => {
        task = {
          done: item.querySelector('input[type=checkbox]')?.checked,
          name: item.querySelector('.task-item--name')?.textContent.trim(),
        }

        if (task.name)
          project.tasks.push(task)
      })

      todoList.projects.push(project)
    })

    state.lists.push(todoList)
  })

  return state
}

function createCustomElement(elementType, attrs) {
  const elem = document.createElement(elementType.TAG)

  for (let attrName in attrs) {
    elem.setAttribute(attrName, attrs[attrName])
  }

  return elem
}

/**
 * Parse tasks from DOM into todo.txt-compatible data structure
 */
function readStateTxt() {
  const lists = document.querySelectorAll(`.${TaskList.TAG}`)
  const state = {
    tasks: [],
  }
  let taskContext = null,
    project = null,
    tasksContainer = null

  lists.forEach(list => {
    list.querySelectorAll(`.${TaskCategory.TAG}`).forEach(categoryEl => {
      taskContext = serializeString(list.querySelector('.list--name')?.textContent.trim())
      project = serializeString(categoryEl.querySelector('.category--name')?.textContent.trim())
      tasksContainer = categoryEl.querySelector('.tasks-container')

      Array.from(tasksContainer.children).forEach(item => {
        const task = item2json(item.querySelector('label'))
        task.context = taskContext
        task.project = project
        task.color = categoryEl.dataset.color

        if (task.task)
          state.tasks.push(task)
      })
    })
  })

  return state
}

function serializeString(str) {
  if (!str)
    return ''

  return str
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z_]/g, '-')
}

function setupDebugControls() {
  document.querySelector('#debug_controls')?.classList.remove('hidden')
  document.querySelector('#print_state_btn')?.addEventListener('click', (ev) => {
    domLog(`state = ${JSON.stringify(readState(), null, 2)}`)
  })
  document.querySelector('#reset_log')?.addEventListener('click', (ev) => {
    document.querySelector('#log_messages').innerHTML = ''
  })
}

function saneDateStr() {
  const now = new Date()

  return `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()} ${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}.${now.getMilliseconds()}`
}

function domLog(msg) {
  msg = `[${saneDateStr()}] ${msg}`

  //console.debug(msg)
  document.querySelector('#log_messages')
    .innerHTML = `<li><pre>${msg}</pre></li>` + document.querySelector('#log_messages').innerHTML
}
