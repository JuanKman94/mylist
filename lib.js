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
