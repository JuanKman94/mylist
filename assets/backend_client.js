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
