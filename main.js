/**
 * Task
 *
 * @typedef {Object} Task
 * @property {string} task Task description
 * @property {boolean} done Task completion
 * @property {string} category Task category
 * @property {string} color Task color ID
 */

window.addEventListener('DOMContentLoaded', init)
window.DEBUG_MODE = true
window.SORTABLE_INSTANCES = []
window.STORAGE_NAME = 'todoState'
window.DEFAULT_SORTABLE_CONFIG = {
  animation: 150,
  ghostClass: 'zoom-in-out',
  chosenClass: 'dragging',
  handle: '.grabber',
}
window.DEBUG_DATA = {
  lists: [
    {
      context: 'mylist',
      projects: [
        {
          name: 'ux',
          tasks: [
            {
              name: 'add controls to delete task',
              done: false,
            },
            {
              name: 'add controls to delete category',
              done: false,
            },
            {
              name: 'add controls to create new list',
              done: false,
            },
            {
              name: 'add controls to delete list',
              done: false,
            },
          ],
        },
        {
          name: 'js',
          tasks: [
            {
              name: 'persist lists across reloads',
              done: false,
            },
            {
              name: 'load state correctly: tasks, colors, order',
              done: false,
            },
            {
              name: 'create color picker component',
              done: false,
            },
          ],
        },
        {
          name: 'ui',
          tasks: [
            {
              name: 'add support for category colors',
              done: false,
            },
          ],
        },
      ],
    },
  ],
}

function cleanUpSortable() {
  let sortable = null

  while (sortable = SORTABLE_INSTANCES.pop()) {
    sortable.destroy()
  }
}

function setupSortable() {
  cleanUpSortable()
  document.querySelectorAll(`.${TaskList.TAG}`).forEach(list => {
    list.querySelectorAll(`.${TaskCategory.TAG} ul`).forEach(tasksContainer => {
      SORTABLE_INSTANCES.push(new Sortable(tasksContainer, Object.assign({ group: 'tasks' }, DEFAULT_SORTABLE_CONFIG)))
    })
    SORTABLE_INSTANCES.push(new Sortable(list, Object.assign({ group: 'categories' }, DEFAULT_SORTABLE_CONFIG)))
  })
}

function init(ev) {
  if (window.DEBUG_MODE)
    setupDebugControls()

  document.addEventListener(TASK_EVENTS.CHANGE, (ev) => {
    const { isDone, task } = ev.detail
    const newState = readState()

    //console.debug(`[${TASK_EVENTS.CHANGE}] isDone = ${isDone}, task = ${task}`)
    //persistState(newState)
    domLog(`state = ${JSON.stringify(newState, null, 2)}`)
    setupSortable()
  })

  loadState()
  setupSortable()
}

function persistState(newState) {
  localStorage.setItem(STORAGE_NAME, JSON.stringify(newState))
}

function loadState() {
  //const rawState = localStorage.getItem(STORAGE_NAME)
  const rawState = window.DEBUG_DATA

  if (!rawState) return

  //const state = JSON.parse(rawState)
  const state = rawState
  const navUl = document.querySelector('body > nav ul')
  const listContainer = document.getElementById('lists')

  state.lists.forEach(list => {
    const taskList = createCustomElement(TaskList, { id: list.context, name: list.context })
    listContainer.appendChild(taskList)

    list.projects.forEach(project => {
      const taskCategory = createCustomElement(TaskCategory, { name: project.name })
      taskList.addCategory(taskCategory)

      project.tasks.forEach(task => {
        const taskItem = createCustomElement(TaskItem, { done: task.done, name: task.name })
        taskCategory.addTask(taskItem)
      })
    })

    navUl.innerHTML += `<li><a href="#${list.context}">${list.context}</a></li>`
  })

  return state
}

function readState() {
  const lists = document.querySelectorAll(`.${TaskList.TAG}`)
  const state = {
    tasks: [],
  }
  let taskContext = null,
    project = null,
    ul = null

  lists.forEach(list => {
    list.querySelectorAll(`.${TaskCategory.TAG}`).forEach(categoryEl => {
      taskContext = serializeString(list.querySelector('.list--name')?.textContent.trim())
      project = serializeString(categoryEl.querySelector('.category--name')?.textContent.trim())
      ul = categoryEl.querySelector('ul')

      Array.from(ul.children).forEach(item => {
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

/**
 * Read task state & description from item control element
 *
 * @param {TaskControl} item
 */
function item2json(itemControl) {
  return {
    done: itemControl?.querySelector('input[type=checkbox]')?.checked,
    task: itemControl?.querySelector('.task-item--name')?.textContent.trim(),
  }
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

function createCustomElement(elementType, attrs) {
  const elem = document.createElement(elementType.EXTENDED_ELEMENT, { is: elementType.TAG })

  for (let attrName in attrs) {
    elem.setAttribute(attrName, attrs[attrName])
  }

  return elem
}

function domLog(msg) {
  msg = `[${saneDateStr()}] ${msg}`

  //console.debug(msg)
  document.querySelector('#log_messages')
    .innerHTML = `<li><pre>${msg}</pre></li>` + document.querySelector('#log_messages').innerHTML
}
