
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

function cleanUpSortable() {
  let sortable = null

  while (sortable = SORTABLE_INSTANCES.pop()) {
    sortable.destroy()
  }
}

function setupSortable(list) {
  cleanUpSortable()

  document.querySelectorAll('.category ul').forEach(ul => {
    SORTABLE_INSTANCES.push(new Sortable(ul, {
      animation: 150,
      ghostClass: 'zoom-in-out',
      chosenClass: 'dragging',
      dragClass: 'dragging',
      group: 'mylist',
      handle: 'li > .icon:first-child',
    }))
  })
}

function init(ev) {
  applyCategoryColors()
  setupNewCategoryControls()
  setupSortable()

  if (window.DEBUG_MODE)
    setupDebugControls()

  console.debug('state from DOM:', readState())
}

function readState() {
  const lists = document.querySelectorAll('#lists .list')
  const state = {
    tasks: [],
  }
  let project = null,
    ul = null

  lists.forEach(list => {
    list.querySelectorAll('.category').forEach(categoryEl => {
      project = serializeString(categoryEl.querySelector('h3')?.textContent.trim())
      ul = categoryEl.querySelector('ul')

      Array.from(ul.children).forEach(item => {
        const task = item2json(item.querySelector('label'))
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
    task: itemControl?.textContent?.trim(),
  }
}

function applyCategoryColors() {
  document.querySelectorAll('.category').forEach((category) => {
    category.classList.add(category.dataset.color)
  })
}

function setupNewCategoryForm(controls, list) {
  const form = controls.querySelector('form')

  form.addEventListener('submit', (ev) => {
    ev.preventDefault()
    ev.stopPropagation()
    const name = ev.target.elements['name']

    if (name.value?.length > 0) {
      const newCategory = categoryElement(name.value)
      list.insertBefore(newCategory, controls)
      name.value = ''
    }
  })
}

function categoryElement(name) {
  const template = document.querySelector('#category-template')

  if (!template)
    return

  const categoryEl = template.content.cloneNode(true)
  categoryEl.querySelector('h3').textContent = name

  return categoryEl
}

function setupNewCategoryControls() {
  const lists = document.querySelector('#lists')
  const template = document.querySelector('#newcategory-template')

  if (!template)
    return

  lists.querySelectorAll('.list')?.forEach(function(list) {
    let newCategoryControls = template.content.cloneNode(true)

    list.appendChild(newCategoryControls)
    // after appending Fragment to the DOM we lose a reference, as a new node
    // is created -- so we get a hold of the new node
    newCategoryControls = list.querySelector('.new-category')
    setupNewCategoryForm(newCategoryControls, list)
  })
}

function setupDebugControls() {
  document.querySelector('#debug_controls')?.classList.remove('hidden')
  document.querySelector('#print_state_btn')?.addEventListener('click', (ev) => {
    domLog(`state = ${JSON.stringify(readState(), null, 2)}`)
  })
}

function domLog(msg) {
  document.querySelector('#log_messages')
    .innerHTML = `<li><pre>${msg}</pre></li>` + document.querySelector('#log_messages').innerHTML
}
