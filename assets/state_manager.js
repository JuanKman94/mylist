const INITIAL_STATE = {
  lists: [
    {
      name: "Hello!  Let's get started",
      tasks: [
        {
          done: false,
          name: 'Create your first list',
        },
        {
          done: false,
          name: 'Add your first to do task',
        }
      ]
    }
  ]
}

const INITIAL_SETTINGS = {
  backend: {
    enabled: false,
    passphrase: null,
    username: null,
    url: null
  },
  nav: {
    compact: false
  },
  tasks: {
    progress: false
  }
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
    const storageState = localStorage.getItem(STORAGE_NAME)
    const state = storageState ? JSON.parse(storageState) : INITIAL_STATE
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

  static settings() {
    const storageState = localStorage.getItem('todoSettings')
    const settings = storageState ? JSON.parse(storageState) : INITIAL_SETTINGS

    return settings
  }

  static persistSettings(settings) {
    localStorage.setItem('todoSettings', JSON.stringify(settings))
  }
}
