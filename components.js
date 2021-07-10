window.addEventListener('DOMContentLoaded', defineComponents)

class TaskElement extends HTMLLIElement {
  static TEMPLATE_ID = ''
  static EXTENDED_ELEMENT = 'li'

  constructor() {
    super()
  }

  connectedCallback() {
    if (this.attach) this.attach()
    if (this.setup) this.setup()
  }

  attach() {
    if (this.template) {
      this.appendChild(this.template.content.cloneNode(true))
    } else {
      console.error(`Could not attach ${this.constructor}: template not found`)
    }
  }

  get template() {
    if (!this.constructor.TEMPLATE_ID) return null

    return document.getElementById(this.constructor.TEMPLATE_ID)
  }
}

/**
 * An element to represent a task, showing the task description & its state
 *
 * Implementation should include:
 *
 * - input[type=checkbox]
 * - TextNode with description
 *
 * @typedef {HTMLElement} TaskControl
 */
class TaskControl extends TaskElement {
  static TEMPLATE_ID = 'newtask-template'

  get form() {
    if (!this._form)
      this._form = this.querySelector('form')

    return this._form
  }

  setup() {
    this.form.addEventListener('submit', (ev) => {
      ev.preventDefault()
      ev.stopPropagation()
      const task = ev.target.elements['task']

      if (task.value?.trim().length > 0) {
        this.addTask(task.value)
        task.value = ''
      }
    })
  }

  addTask(task) {
    const category = Sortable.utils.closest(this, '.category ul')

    if (!category)
      return

    const li = document.createElement('li', { is: 'task-item' })
    const taskItem = document.createElement('task-item')

    li.setAttribute('name', task)
    //li.appendChild(taskItem)

    return category.insertBefore(li, this)
  }
}

class TaskItem extends TaskElement {
  static TEMPLATE_ID = 'taskitem-template'

  static get observedAttributes() {
    return ['done', 'name']
  }

  get checkbox() {
    if (!this._checkbox)
      this._checkbox = this.querySelector('input[type=checkbox]')

    return this._checkbox
  }

  get done() { return this.getAttribute('done') }
  set done(isDone) { if (isDone) { this.setAttribute('done', '') } else { this.removeAttribute('done') } }

  get label() {
    if (!this._label)
      this._label = this.querySelector('.task-item--name')

    return this._label
  }

  get name() { return this.getAttribute('name') }

  setup() {
    if (this.hasAttribute('done') && this.getAttribute('done') !== 'false') {
      this.done = this.checkbox.checked = true
    }
    if (this.getAttribute('name')) {
      this.task = this.label.textContent = this.getAttribute('name')
    }

    this.checkbox?.addEventListener('change', (ev) => {
      const checked = ev.target.value

      if (checked) {
        this.setAttribute('done', '')
      } else {
        this.removeAttribute('done')
      }
    })
  }

  attributeChangedCallback(attrName, oldVal, newVal) {
  }
}

function defineComponents() {
  customElements.define('task-item', TaskItem, { extends: TaskElement.EXTENDED_ELEMENT })
  customElements.define('task-control', TaskControl, { extends: TaskElement.EXTENDED_ELEMENT })
}
