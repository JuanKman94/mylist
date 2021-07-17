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

// TODO: remove event listeners inside disconnectedCallback
class CustomElement extends HTMLElement {
  static EXTENDED_ELEMENT = ''
  static TAG = ''
  static TEMPLATE_ID = ''

  static create(attrs = {}) {
    const elem = document.createElement(this.EXTENDED_ELEMENT, { is: this.TAG })

    for (let attrName in attrs) {
      elem.setAttribute(attrName, attrs[attrName])
    }

    return elem
  }

  constructor() {
    super()
  }

  connectedCallback() {
    if (this.attach) this.attach()
    if (this.setup) this.setup()
  }

  disconnectedCallback() {
    //Array.from(this.children).forEach(el => this.removeChild(el))
  }

  attach() {
    if (this.template) {
      // TODO: think of a better check for this, maybe adding a custom object-DOM ID
      if (this.children.length < this.template.content.children.length) {
        this.appendChild(this.template.content.cloneNode(true))
      }
      this.classList.add(this.constructor.TAG)
    } else {
      console.error(`Could not attach ${this.constructor}: template with id '${this.constructor.TEMPLATE_ID}' not found`)
    }
  }

  remove() {
    this.parentElement.removeChild(this)
  }

  get template() { return document.getElementById(this.constructor.TEMPLATE_ID) }
}

// TODO: figure out if we can use CustomElement instead of duplicating code 'cuz of different parent class
class TaskElement extends HTMLLIElement {
  static EXTENDED_ELEMENT = 'li'
  static TAG = ''
  static TEMPLATE_ID = ''

  static create(attrs = {}) {
    const elem = document.createElement(this.EXTENDED_ELEMENT, { is: this.TAG })

    for (let attrName in attrs) {
      elem.setAttribute(attrName, attrs[attrName])
    }

    return elem
  }

  constructor() {
    super()
  }

  connectedCallback() {
    if (this.attach) this.attach()
    if (this.setup) this.setup()
  }

  disconnectedCallback() {
    //Array.from(this.children).forEach(el => this.removeChild(el))
  }

  attach() {
    if (this.template) {
      // TODO: think of a better check for this, maybe adding a custom object-DOM ID
      if (this.children.length < this.template.content.children.length) {
        this.appendChild(this.template.content.cloneNode(true))
      }
      this.classList.add(this.constructor.TAG)
    } else {
      console.error(`Could not attach ${this.constructor}: template not found`)
    }
  }

  remove() {
    this.parentElement.removeChild(this)
  }

  get template() { return document.getElementById(this.constructor.TEMPLATE_ID) }
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
  static TAG = 'task-control'
  static TEMPLATE_ID = 'newtask-template'

  get form() { return this.querySelector('form') }

  get taskCategory() { return Sortable.utils.closest(this, `.${TaskCategory.TAG}`) }

  setup() {
    this.form.addEventListener('submit', this._submitHandler.bind(this))
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

class TaskItem extends TaskElement {
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

  get deleteButton() { return this.querySelector('.delete') }

  get task() { return this.getAttribute('name') }

  setup() {
    if (this.hasAttribute('done') && this.getAttribute('done') !== 'false') {
      this.done = true
    }
    if (this.getAttribute('name')) {
      this.label.textContent = this.name
    }

    this.checkbox.addEventListener('change', this._changeHandler.bind(this))
    this.deleteButton.addEventListener('click', this._deleteHandler.bind(this))
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

class TaskCategory extends CustomElement {
  static TAG = 'task-category'
  static EXTENDED_ELEMENT = 'article'
  static TEMPLATE_ID = 'category-template'

  get deleteButton() { return this.querySelector('.delete') }

  get name() { return this.getAttribute('name').trim() }

  get nameLabel() { return this.querySelector('.category--name') }

  get taskControl() { return this.querySelector('.task-control') }

  get ul() { return this.querySelector('ul') }

  setup() {
    this.nameLabel.textContent = this.name
    this.deleteButton.addEventListener('click', this._deleteHandler.bind(this))
  }

  addTask(taskItem) {
    this.ul.insertBefore(taskItem, this.taskControl)
  }

  _deleteHandler() {
    this.remove()
    dispatchTaskEvent(TASK_EVENTS.DELETE, this.name)
  }
}

class TaskCategoryForm extends CustomElement {
  static EXTENDED_ELEMENT = 'article'
  static TAG = 'task-category-form'
  static TEMPLATE_ID = 'task-category-form-template'

  get form() { return this.querySelector('form') }

  get name() { return this.querySelector('form input[name=name]') }
  set name(newName) { this.querySelector('form input[name=name]').value = newName }

  get taskList() { return Sortable.utils.closest(this, `.${TaskList.TAG}`) }

  setup() {
    this.addEventListener('click', this._clickHandler.bind(this))
    this.form.addEventListener('submit', this._submitHandler.bind(this))
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

class TaskList extends CustomElement {
  static TAG = 'task-list'
  static EXTENDED_ELEMENT = 'section'
  static TEMPLATE_ID = 'tasklist-template'

  get deleteButton() { return this.querySelector('.delete') }

  get name() { return this.getAttribute('name')?.trim() }

  get nameLabel() { return this.querySelector('.list--name') }

  get taskCategoryForm() { return this.querySelector(`.${TaskCategoryForm.TAG}`) }

  setup() {
    this.nameLabel.textContent = this.name
    this.deleteButton.addEventListener('click', this._deleteHandler.bind(this))
  }

  addCategory(taskCategory) {
    this.insertBefore(taskCategory, this.taskCategoryForm)
  }

  _deleteHandler() {
    document.dispatchEvent(new CustomEvent(LIST_EVENTS.DELETE, { detail: { name: this.name } }))
    this.remove()
  }
}

class ColorPicker extends CustomElement {
  static TAG = 'color-picker'
  static EXTENDED_ELEMENT = 'aside'
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
    this.current.classList.add(this.color)
    this.currentLabel.textContent = this.color

    this.current.addEventListener('click', this._toggleOpen.bind(this))
    this.options.forEach(option => option.addEventListener('click', this._optionClickHandler.bind(this)))
  }

  toggle() {
    this.open = !this.open
  }

  _optionClickHandler(ev) {
    const newColor = ev.target.dataset.color

    this.color = newColor
    this.toggle()
  }

  _toggleOpen(ev) {
    this.toggle()
  }
}

function defineComponents() {
  const components = [
    ColorPicker,
    TaskCategoryForm,
    TaskCategory,
    TaskControl,
    TaskItem,
    TaskList,
  ]

  for (let component of components) {
    customElements.define(component.TAG, component, { extends: component.EXTENDED_ELEMENT })
  }
}
