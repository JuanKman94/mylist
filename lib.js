// https://javascript.info/mixins

const CustomElementStaticMixin = {
  EXTENDED_ELEMENT: '',
  TAG: '',
  TEMPLATE_ID: '',

  create(attrs = {}) {
    const elem = document.createElement(this.EXTENDED_ELEMENT, { is: this.TAG })

    for (let attrName in attrs) {
      elem.setAttribute(attrName, attrs[attrName])
    }

    return elem
  },
}

const CustomElementMixin = {
  connectedCallback() {
    if (this.attach) this.attach()
    if (this.setup) this.setup()
  },

  disconnectedCallback() {
    //Array.from(this.children).forEach(el => this.removeChild(el))
  },

  attach() {
    if (this.template) {
      // TODO: think of a better check for this, maybe adding a custom object-DOM ID
      if (this.children.length < this.template.content.children.length) {
        this.appendChild(this.template.content.cloneNode(true))
      }
      this.classList.add(this.constructor.TAG)
    } else {
      console.error(`Could not attach ${this.constructor.name}: template with id '${this.constructor.TEMPLATE_ID}' not found or null`)
    }
  },

  remove() {
    this.parentElement.removeChild(this)
  },
}

const CustomElementGetSetMixin = {
  template: {
    get: function() {
      return document.getElementById(this.constructor.TEMPLATE_ID)
    },
    enumerable: true,
    configurable: true,
  },
}