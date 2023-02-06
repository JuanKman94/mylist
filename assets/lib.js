// https://javascript.info/mixins

// Object.assign(ComponentClass, CustomElementStaticMixin)
const CustomElementStaticMixin = {
  /**
   * Create custom element with provided attributes
   *
   * Example:
   *
   *   MyComponent.create({message: "hello, world"})
   *   => <my-component message="hello, world" />
   *
   * @return {object}
   */
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
    if (this.events?.length > 0) {
      for (let evt of this.events) {
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

  /**
   * Add event listener to HTML element, intended to be a child of CustomElement
   *
   * @param {HTMLElement} target
   * @param {string} eventName E.g., 'click'
   * @param {Function} handler Event callback
   */
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

/**
 * Download data with the specified data using browser mechanisms.
 *
 * @param {string} name
 * @param {object} data
 * @return void
 */
function downloadUsingBrowser (name, data) {
  const a = document.createElement('a')
  const blob = new Blob(
    [ data ],
    { type: 'application/octet-stream' }
  )
  let uri = null

  uri = window.URL.createObjectURL(blob)

  a.setAttribute('href', uri)
  a.setAttribute('download', name)
  a.setAttribute('target', name)
  a.style.visibility = 'hidden'
  document.body.appendChild(a)
  a.click()
  window.setTimeout((ev) => {
    document.body.removeChild(a)
    window.URL.revokeObjectURL(uri)
  }, 500)
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
   * @param {boolean} enabled If false, requests will not be dispatched
   */
  constructor(url, user, password, enabled) {
    if (!url)
      return

    this.url = new URL(url)
    this.user = user
    this.password = password
    this.enabled = enabled

    //this.url.protocol = 'https:' // force HTTPS
  }

  get hasUrl() { return !!this.url }

  put(payload) {
    if (!this.enabled)
      return Promise.resolve(null)

    if (!this.hasUrl)
      return Promise.reject(new Error(`Invalid url: '${this.url}'`))

    const options = {
      body: JSON.stringify(payload),
      headers: new Headers({
        'Content-Type': 'application/json',
        'Authorization': `Basic ${this._authHeader()}`,
      }),
      method: 'post',
      mode: 'cors',
    }

    return fetch(this.url, options)
      .then(resp => {
        console.info('Successfully sent to back-end.', resp)
        return resp.json()
      })
      .catch(err => {
        console.error('Back-end storage failed.', err)
        throw err
      })
  }

  get() {
    if (!this.enabled)
      return Promise.resolve(null)

    if (!this.hasUrl)
      return

    const options = {
      headers: new Headers({
        'Content-Type': 'application/json',
        'Authorization': `Basic ${this._authHeader()}`,
      }),
      method: 'get',
      mode: 'cors',
    }

    return fetch(this.url, options)
      .then(resp => resp.json())
      .catch(err => {
        console.error('Could not fetch from back-end.', err)
        throw err
      })
  }

  // private
  _authHeader() {
    return utf8_to_b64(`${this.user}:${this.password}`)
  }
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

/**
 * Interface between UI & browser's local storage API
 *
 * ## Format
 *
 * The used format to export & import the tasks state is as follows:
 *
 *     {
 *       "lists": [
 *         {
 *           "color: "",
 *           "name": "",
 *           "tasks": [
 *             "done": false,
 *             "name": ""
 *           ]
 *         }
 *       ]
 *     }
 */
class StateManager {
  constructor() {
  }

  /**
   * Read To Do lists state from the DOM.
   */
  static readState() {
    const state = {
      lists: [],
    }

    document.querySelectorAll(`.${TaskCategory.TAG}`).forEach(categoryEl => {
      state.lists.push({
        name: categoryEl.name,
        color: categoryEl.color,
        tasks: categoryEl.tasks,
      })
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

    v1ToV2(state.lists).forEach(list => {
      let taskCategory = document.querySelector(`.task-category[name="${list.name}"]`)

      if (!taskCategory) {
        taskCategory = TaskCategory.create({ id: list.name, name: list.name, color: list.color })
        listContainer.appendChild(taskCategory)
      }

      list.tasks.forEach(task => {
        let taskItem = document.querySelector(`.task-item[name="${task.name}"]`)

        if (!taskItem) {
          taskItem = TaskItem.create({ done: !!task.done, name: task.name })
          taskCategory.addTask(taskItem)
        }

        taskItem.done = task.done
      })

      addListLink(list.name)
    })

    return state
  }

  /**
   * Update state without deleting entries.
   *
   * @return {object} Lists state
   */
  static mergeState(data) {
    const currentState = StateManager.readState()
    const newState = Object.assign(currentState, data)

    StateManager.persistState(newState)
    return StateManager.loadState()
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
  const target = document.querySelector('#debug_messages')

  console.debug(msg);
  if (!target) return

  target.innerHTML = `<li><pre>[${saneDateStr()}] ${msg}</pre></li>` + target.innerHTML
}
