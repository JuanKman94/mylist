// https://javascript.info/mixins

// Object.assign(ComponentClass, CustomElementStaticMixin)
const CustomElementStaticMixin = {
  create(attrs = {}) {
    const elem = document.createElement(this.TAG)

    for (let attrName in attrs) {
      elem.setAttribute(attrName, attrs[attrName])
    }

    return elem
  },
}

// Object.assign(ComponentClass.prototype, CustomElementMixin)
const CustomElementMixin = {
  connectedCallback() {
    this.events = this.events || []

    if (this.attach) this.attach()
    if (this.setup) this.setup()
  },

  disconnectedCallback() {
    let evt = null

    if (this.events?.length > 0) {
      for (evt of this.events) {
        evt.target.removeEventListener(evt.name, evt.handler)
      }
    }
    //Array.from(this.children).forEach(el => this.removeChild(el))
  },

  attach() {
    if (this.template) {
      // TODO: think of a better check for this check, maybe adding a custom object-DOM ID
      if (this.children.length < this.template.content.children.length) {
        this.appendChild(this.template.content.cloneNode(true))
      }
      this.classList.add(this.constructor.TAG)
    } else {
      console.error(`Could not attach ${this.constructor.name}: template with id '${this.constructor.TEMPLATE_ID}' not found or null`)
    }
  },

  on(target, eventName, handler) {
    target.addEventListener(eventName, handler)

    this.events.push({
      target: target,
      name: eventName,
      handler: handler,
    })
  },

  remove() {
    this.parentElement.removeChild(this)
  },
}

// for (let k in CustomElementGetSetMixin) {
//   Object.defineProperty(ComponentClass.prototype, k, CustomElementGetSetMixin[k])
// }
const CustomElementGetSetMixin = {
  template: {
    get: function() {
      return document.getElementById(this.constructor.TEMPLATE_ID)
    },
    enumerable: true,
    configurable: true,
  },
}

function utf8_to_b64( str ) {
  return window.btoa(unescape(encodeURIComponent( str )));
}

function b64_to_utf8( str ) {
  return decodeURIComponent(escape(window.atob( str )));
}

class BackendClient {
  /**
   * Create a client to comunicate with back-end
   *
   *
   * @see https://developer.mozilla.org/en-US/docs/Web/API/URL
   *
   * @param {string} url Will be cast to URL
   * @param {string} user Used for authentication
   * @param {string} password Used for authentication
   */
  constructor(url, user, password) {
    if (!url)
      return

    this.url = new URL(url)
    this.user = user
    this.password = password

    //this.url.protocol = 'https:' // force HTTPS
  }

  get shouldReport() { return !!this.url }

  put(payload) {
    if (!this.shouldReport)
      return

    const options = {
      method: 'post',
      body: JSON.stringify(payload),
      mode: 'cors',
      headers: new Headers({
        'Content-Type': 'application/json',
        'Authorization': `Basic ${this._authHeader()}`,
      }),
    }

    return fetch(this.url, options)
      .then(resp => {
        console.info('Successfully sent to back-end.', resp)
        return resp.json()
      })
      .catch(err => {
        console.error('Back-end storage failed.', err)
      })
  }

  get() {
    return fetch(this.url)
      .then(resp => resp.data)
      .catch(err => {
        console.error('Could not fetch from back-end.', err)
      })
  }

  // private
  _authHeader() {
    return utf8_to_b64(`${this.user}:${this.password}`)
  }
}

class StateManager {
  constructor() {
  }

  static readState() {
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

  static updateState() {
    const newState = this.readState()

    this.persistState(newState)

    return newState
  }

  static persistState(newState) {
    localStorage.setItem(STORAGE_NAME, JSON.stringify(newState))
  }

  static loadState() {
    const rawState = localStorage.getItem(STORAGE_NAME)

    if (!rawState) return

    const state = JSON.parse(rawState)
    const listContainer = document.getElementById('lists')

    state.lists.forEach(list => {
      const taskList = TaskList.create({ id: list.context, name: list.context })
      listContainer.appendChild(taskList)

      list.projects.forEach(project => {
        const taskCategory = TaskCategory.create({ color: project.color, name: project.name })
        taskList.addCategory(taskCategory)

        project.tasks.forEach(task => {
          const taskItem = TaskItem.create({ done: task.done, name: task.name })
          taskCategory.addTask(taskItem)
        })
      })

      addListLink(list.context)
    })

    return state
  }
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
  msg = `[${saneDateStr()}] ${msg}`

  //console.debug(msg)
  document.querySelector('#log_messages')
    .innerHTML = `<li><pre>${msg}</pre></li>` + document.querySelector('#log_messages').innerHTML
}
