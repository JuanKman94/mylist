window.addEventListener('DOMContentLoaded', defineComponents)

window.TASK_EVENTS = {
  CHANGE: 'task:change',
  DELETE: 'task:delete',
}
window.LIST_EVENTS = {
  CHANGE: 'list:change',
  DELETE: 'list:delete',
}

function dispatchTaskEvent(eventName, task, isDone) {
  const taskChangeEvent = new CustomEvent(eventName, { detail: { task, isDone } })

  document.dispatchEvent(taskChangeEvent)
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
class TaskControl extends HTMLElement {
  static EXTENDED_ELEMENT = 'li'
  static TAG = 'task-control'
  static TEMPLATE_ID = 'newtask-template'

  get form() { return this.querySelector('form') }

  get taskCategory() { return Sortable.utils.closest(this, `.${TaskCategory.TAG}`) }

  setup() {
    this.on(this.form, 'submit', this._submitHandler.bind(this))
  }

  createTask(task) {
    if (!this.taskCategory)
      return

    let taskItem = TaskItem.create({ name: task })

    taskItem = this.taskCategory.addTask(taskItem)
    dispatchTaskEvent(TASK_EVENTS.CHANGE, task, false)

    return taskItem
  }

  _submitHandler(ev) {
    ev.preventDefault()
    ev.stopPropagation()
    const task = ev.target.elements['task']

    if (task.value.trim().length > 0) {
      this.createTask(task.value)
      task.value = ''
    }
  }
}

class TaskItem extends HTMLElement {
  static EXTENDED_ELEMENT = 'li'
  static TAG = 'task-item'
  static TEMPLATE_ID = 'taskitem-template'

  get checkbox() { return this.querySelector('input[type=checkbox]') }

  get done() { return this.getAttribute('done') }
  set done(isDone) {
    if (isDone) {
      this.checkbox.setAttribute('checked', true)
      this.checkbox.checked = true
      this.setAttribute('done', true)
    } else {
      this.checkbox.removeAttribute('checked')
      this.checkbox.checked = false
      this.removeAttribute('done')
    }
  }

  get label() { return this.querySelector('.task-item--name') }

  get name() { return this.getAttribute('name') }
  set name(newName) {
    this.label.textContent = newName
    this.setAttribute('name', newName)
  }

  get deleteButton() { return this.querySelector('.delete') }

  get task() { return this.getAttribute('name') }

  setup() {
    if (this.hasAttribute('done') && this.getAttribute('done') !== 'false') {
      this.done = true
    }
    if (this.getAttribute('name')) {
      this.label.textContent = this.name
    }

    this.on(this.checkbox, 'change', this._changeHandler.bind(this))
    this.on(this.deleteButton, 'click', this._deleteHandler.bind(this))
  }

  _changeHandler(ev) {
    const checked = ev.target.checked

    // order here is important, bubble up event before changing internal state
    dispatchTaskEvent(TASK_EVENTS.CHANGE, this.name, checked)
    this.done = checked
  }

  _deleteHandler() {
    this.remove()
    dispatchTaskEvent(TASK_EVENTS.DELETE, this.name)
  }
}

class TaskCategory extends HTMLElement {
  static TAG = 'task-category'
  static EXTENDED_ELEMENT = 'article'
  static TEMPLATE_ID = 'category-template'

  get color() { return this.getAttribute('color') }
  set color(newColor) {
    this.classList.remove(this.color)
    this.setAttribute('color', newColor)
    this.classList.add(newColor)
  }

  get colorPicker() { return this.querySelector(`.${ColorPicker.TAG}`) }

  get deleteButton() { return this.querySelector('.delete') }

  get name() { return this.getAttribute('name').trim() }

  get nameLabel() { return this.querySelector('.category--name') }

  get taskControl() { return this.querySelector('.task-control') }

  get tasksContainer() { return this.querySelector('.tasks-container') }

  setup() {
    this.nameLabel.textContent = this.name
    if (this.color) {
      this.classList.add(this.color)
      this.colorPicker.setAttribute('color', this.color)
    }

    this.on(this.colorPicker, 'change', this._colorChangeHandler.bind(this))
    this.on(this.deleteButton, 'click', this._deleteHandler.bind(this))
  }

  addTask(taskItem) {
    return this.tasksContainer.insertBefore(taskItem, this.taskControl)
  }

  _colorChangeHandler(ev) {
    this.color = ev.detail.color
    dispatchTaskEvent(LIST_EVENTS.CHANGE, null, false)
  }

  _deleteHandler() {
    this.remove()
    dispatchTaskEvent(TASK_EVENTS.DELETE, this.name)
  }
}

class TaskCategoryForm extends HTMLElement {
  static EXTENDED_ELEMENT = 'article'
  static TAG = 'task-category-form'
  static TEMPLATE_ID = 'task-category-form-template'

  get form() { return this.querySelector('form') }

  get name() { return this.querySelector('form input[name=name]') }
  set name(newName) { this.querySelector('form input[name=name]').value = newName }

  get taskList() { return Sortable.utils.closest(this, `.${TaskList.TAG}`) }

  setup() {
    this.on(this, 'click', this._clickHandler.bind(this))
    this.on(this.form, 'submit', this._submitHandler.bind(this))
  }

  _clickHandler(ev) {
    this.name.focus()
  }

  _submitHandler(ev) {
    ev.preventDefault()
    ev.stopPropagation()
    const name = ev.target.elements['name']

    if (name.value?.length > 0) {
      const taskCategory = TaskCategory.create({ name: name.value })
      this.taskList.addCategory(taskCategory)
      name.value = ''
    }
  }
}

class TaskList extends HTMLElement {
  static TAG = 'task-list'
  static EXTENDED_ELEMENT = 'section'
  static TEMPLATE_ID = 'tasklist-template'

  get deleteButton() { return this.querySelector('.delete') }

  get name() { return this.getAttribute('name')?.trim() }

  get nameLabel() { return this.querySelector('.list--name') }

  get taskCategoryForm() { return this.querySelector(`.${TaskCategoryForm.TAG}`) }

  static addList(target) {
    const listName = window.prompt(NEW_LIST_PROMPT)

    if (listName && listName.length > 0) {
      target.prepend(TaskList.create({ id: listName, name: listName }))
    }

    return listName
  }

  setup() {
    this.nameLabel.textContent = this.name
    this.on(this.deleteButton, 'click', this._deleteHandler.bind(this))
  }

  addCategory(taskCategory) {
    this.insertBefore(taskCategory, this.taskCategoryForm)
  }

  _deleteHandler() {
    document.dispatchEvent(new CustomEvent(LIST_EVENTS.DELETE, { detail: { name: this.name } }))
    this.remove()
  }
}

class ColorPicker extends HTMLElement {
  static TAG = 'color-picker'
  static EXTENDED_ELEMENT = 'span'
  static TEMPLATE_ID = 'colorpicker-template'

  get color() { return this.getAttribute('color') }
  set color(newColor) {
    this.current.classList.remove(this.color)
    this.setAttribute('color', newColor)
    this.current.classList.add(newColor)
    this.currentLabel.textContent = newColor
  }

  get current() { return this.querySelector('.color-picker--current') }

  get currentLabel() { return this.querySelector('.color-picker--current span') }

  get open() { return this.hasAttribute('open') && this.getAttribute('open') !== 'false' }
  set open(isOpen) {
    this.setAttribute('open', isOpen)
    if (isOpen) {
      this.classList.add('open')
    } else {
      this.classList.remove('open')
    }
  }

  get optionsContainer() { return this.querySelector('.color-picker--options') }

  get options() { return this.optionsContainer.querySelectorAll('.color-picker--option') }

  setup() {
    let i = 1

    this.current.classList.add(this.color)
    this.currentLabel.textContent = this.color

    for (i = 1; i <= 16; ++i) {
      this.addOption(`color-${i}`)
    }

    this.on(this.current, 'click', this._toggleOpen.bind(this))
    this.options.forEach(option => this.on(option, 'click', this._optionClickHandler.bind(this)))
  }

  // a bit hackish but it's fine
  addOption(color) {
    this.optionsContainer.innerHTML += `<div role="button" data-color="${color}" type="button" class="color-picker--option ${color}">
      <span class="sr-only">${color}</span>
    </div>
    `
  }

  toggle() {
    this.open = !this.open
  }

  _optionClickHandler(ev) {
    const newColor = ev.target.dataset.color

    this.color = newColor
    this.toggle()
    this.dispatchEvent(new CustomEvent('change', { bubbles: true, detail: { color: newColor } }))
  }

  _toggleOpen(ev) {
    this.toggle()
  }
}

class BackendSettings extends HTMLElement {
  static EXTENDED_ELEMENT = 'article'
  static TAG = 'backend-settings'
  static TEMPLATE_ID = 'backendsettings-template'
  static BACKEND_CHANGE_EVENT = 'backend:change'

  get form() { return this.querySelector('form') }

  get enabled() { return this.querySelector('form input[name=backend_enabled]') }
  set enabled(newVal) { this.querySelector('form input[name=backend_enabled]').checked = !!newVal }

  get url() { return this.querySelector('form input[name=backend_url]') }
  set url(newVal) { this.querySelector('form input[name=backend_url]').value = newVal }

  get username() { return this.querySelector('form input[name=backend_username]') }
  set username(newVal) { this.querySelector('form input[name=backend_username]').value = newVal }

  get passphrase() { return this.querySelector('form textarea[name=backend_passphrase]') }
  set passphrase(newVal) { this.querySelector('form textarea[name=backend_passphrase]').value = newVal }

  /**
   * Setup controls reactivity:
   *
   * * When component is bootstrapped, load values from LocalStorage
   * * When a config field changes, dispatch config event.
   * * When form submits, do nothing
   *
   * NOTE: dispatching the config event from here does not work during page
   * load 'cuz the custom event is not triggered by an user event.
   */
  setup() {
    this.setupAutoStorage()
    this.on(this.url, 'input', this._inputHandler.bind(this))
    this.on(this.username, 'input', this._inputHandler.bind(this))
    this.on(this.passphrase, 'input', this._inputHandler.bind(this))
    this.on(this.enabled, 'input', this._inputHandler.bind(this))
    this.on(this.form, 'submit', this._submitHandler.bind(this))
  }

  setupAutoStorage() {
    this.form.querySelectorAll('.config-field')?.forEach(el => {
      if (!el.name) return

      el.value = localStorage.getItem(el.name)
      if (el.type === 'checkbox') {
        el.checked = !!localStorage.getItem(el.name)
      }

      el.addEventListener('input', ev => {
        localStorage.setItem(ev.target.name, ev.target.value)
      })
    })
  }

  emitConfig() {
    const payload = {
      url: this.url.value,
      username: this.username.value,
      passphrase: this.passphrase.value,
      enabled: !!this.enabled.checked,
    }
    const newEv = new CustomEvent(this.constructor.BACKEND_CHANGE_EVENT, { detail: payload })

    document.dispatchEvent(newEv)
  }

  _inputHandler(ev) {
    this.emitConfig()
  }

  _submitHandler(ev) {
    ev.preventDefault()
    ev.stopPropagation()
  }
}

/**
 * Create a detailed LogMessage element.
 *
 * @param {string} title Message title, set to a `<summary>` element
 * @param {string} type Assigned as a CSS class to the LogMessage element
 * @param {string} message Message body, set to a `<p>` element
 * @param {number} timeout Time in milliseconds after which the component is
 *   automatically removed. If not specified, element is not autoremoved.
 */
class LogMessage extends HTMLElement {
  static EXTENDED_ELEMENT = 'details'
  static TAG = 'log-message'
  static TEMPLATE_ID = 'logmessage-template'

  get icon() { return this.attributes.icon }

  get message() { return this.attributes.message }
  get messageTag() { return this.querySelector('.message') }

  get timeout() { return this.attributes.timeout }

  get title() { return this.attributes.title }
  get titleTag() { return this.querySelector('.title') }

  get type() { return this.attributes.type }

  get hasIcon() { return !!this.icon }
  get hasMessage() { return this.message?.length > 0 }
  get hasTimeout() { return !!this.timeout }
  get hasType() { return !!this.type }

  setup() {
    this.titleTag.textContent = this.title.value

    if (this.hasType) {
      this.classList.add(this.type.value)
    }

    if (this.hasMessage) {
      this.messageTag.textContent = this.message.value
    } else {
      this.messageTag.parentElement.removeChild(this.messageTag)
    }

    if (this.hasIcon) {
      this.attachIcon()
    }

    if (this.hasTimeout) {
      window.setTimeout(() => this.remove(), this.timeout.value)
    }
  }

  attachIcon() {
    let a = document.createElement('a')

    a.className = 'log-message--icon no-link small xkcd rounded inline-block mr-1 px-1'
    a.style = 'border: 2px solid var(--border-color);'
    a.innerHTML = `${this.icon.value} `
    a.href = '#log_messages'

    this.titleTag.prepend(a)
  }
}

function defineComponents() {
  const components = [
    BackendSettings,
    ColorPicker,
    LogMessage,
    TaskCategoryForm,
    TaskCategory,
    TaskControl,
    TaskItem,
    TaskList,
  ]

  for (let component of components) {
    Object.assign(component, CustomElementStaticMixin)
    Object.assign(component.prototype, CustomElementMixin)
    for (let k in CustomElementGetSetMixin) {
      Object.defineProperty(component.prototype, k, CustomElementGetSetMixin[k])
    }

    customElements.define(component.TAG, component)
  }
}
