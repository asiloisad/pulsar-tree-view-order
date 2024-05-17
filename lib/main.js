'use babel'

import { CompositeDisposable } from 'atom'
import path from 'path'

export default {

  activate() {
    this.treeView = null ; this._sortEntries = null
    if (atom.packages.isPackageActive('tree-view')) {
      this.install()
    }
    this.disposables = new CompositeDisposable()
    this.disposables.add(
      atom.packages.onDidActivatePackage((pkg) => {
        if (pkg.name=='tree-view') { this.install() }
      }),
      atom.packages.onDidDeactivatePackage((pkg) => {
        if (pkg.name=='tree-view') { this.treeView = null }
      }),
      atom.project.onDidChangePaths(() => {
        this.install()
      })
    )
  },

  install() {
    let pkg = atom.packages.getActivePackage('tree-view')
    if (!this.treeView) { this.treeView = pkg.mainModule.treeView }
    for (let root of this.treeView.roots) {
      if (!this._sortEntries) {
        this._sortEntries = root.directory.constructor.prototype.sortEntries
      }
      root.directory.constructor.prototype.sortEntries = this.sortEntries
    }
    this.treeView.updateRoots()
  },

  deactivate() {
    this.disposables.dispose()
    if (this.treeView && this._sortEntries) {
      for (let root of this.treeView.roots) {
        root.directory.constructor.prototype.sortEntries = this._sortEntries
      }
    }
    this.treeView.updateRoots()
    this.treeView = null
  },

  sortEntries(combinedEntries) {
    if (atom.config.get('tree-view.sortFoldersBeforeFiles')) {
      let directories = [] ; let files = []
      for (let entry of combinedEntries) {
        if (typeof entry==='string') {
          if (this.entries.has(entry)) {
            entry = this.entries.get(entry)
          }
        }
        if (entry instanceof this.constructor) {
          directories.push(entry)
        } else {
          files.push(entry)
        }
      }
      directories.sort(sorterFn)
      files.sort(sorterFn)
      return directories.concat(files)
    } else {
      return combinedEntries.sort(sorterFn)
    }
  },

}

function sorterFn(a, b) {
  a = path.parse(typeof a==='string' ? a : a.name)
  b = path.parse(typeof b==='string' ? b : b.name)
  if (a.name===b.name) {
    a = a.ext ; b = b.ext
  } else {
    a = a.name ; b = b.name
  }
  return objsort(a, b)
}

const objsort = natsort({ insensitive:true })

function natsort(options) {
  const ore = /^0/
  const sre = /\s+/g
  const tre = /^\s+|\s+$/g
  // unicode
  const ure = /[^\x00-\x80]/
  // hex
  const hre = /^0x[0-9a-f]+$/i
  // numeric
  const nre = /(0x[\da-fA-F]+|(^[\+\-]?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?(?=\D|\s|$))|\d+)/g
  // datetime
  const dre = /(^([\w ]+,?[\w ]+)?[\w ]+,?[\w ]+\d+:\d+(:\d+)?[\w ]?|^\d{1,4}[\/\-]\d{1,4}[\/\-]\d{1,4}|^\w+, \w+ \d+, \d{4})/
  const toLowerCase = String.prototype.toLocaleLowerCase || String.prototype.toLowerCase
  const GREATER = options.desc ? -1 : 1
  const SMALLER = -GREATER
  const normalize = options.insensitive
    ? (s) => toLowerCase.call(`${s}`).replace(tre, '')
    : (s) => (`${s}`).replace(tre, '')
  function tokenize(s) {
    return s.replace(nre, '\0$1\0').replace(/\0$/, '').replace(/^\0/, '').split('\0')
  }
  function parse(s, l) {
    // normalize spaces; find floats not starting with '0',
    // string or 0 if not defined (Clint Priest)
    return (!s.match(ore) || l === 1) && parseFloat(s) || s.replace(sre, ' ').replace(tre, '') || 0
  }
  return function (a, b) {
    // trim pre-post whitespace
    const aa = normalize(a)
    const bb = normalize(b)
    // return immediately if at least one of the values is empty.
    // empty string < any others
    if (!aa && !bb) { return 0 }
    if (!aa && bb) { return SMALLER }
    if (aa && !bb) { return GREATER }
    // tokenize: split numeric strings and default strings
    const aArr = tokenize(aa)
    const bArr = tokenize(bb)
    // hex or date detection
    const aHex = aa.match(hre)
    const bHex = bb.match(hre)
    const av = (aHex && bHex) ? parseInt(aHex[0], 16) : (aArr.length !== 1 && Date.parse(aa))
    const bv = (aHex && bHex) ? parseInt(bHex[0], 16) : av && bb.match(dre) && Date.parse(bb) || null
    // try and sort Hex codes or Dates
    if (bv) {
      if (av === bv) { return 0 }
      if (av < bv) { return SMALLER }
      if (av > bv) { return GREATER }
    }
    const al = aArr.length
    const bl = bArr.length
    // handle numeric strings and default strings
    for (let i=0, l=Math.max(al,bl); i<l; i+=1) {
      const af = parse(aArr[i]||'', al)
      const bf = parse(bArr[i]||'', bl)
      // handle numeric vs string comparison.
      // numeric < string
      if (isNaN(af) !== isNaN(bf)) {
        return isNaN(af) ? GREATER : SMALLER
      }
      // if unicode use locale comparison
      if (ure.test((af)+(bf)) && (af).localeCompare) {
        const comp = (af).localeCompare(bf)
        if (comp>0) { return GREATER }
        if (comp<0) { return SMALLER }
        if (i===l-1) { return 0 }
      }
      if (af<bf) { return SMALLER }
      if (af>bf) { return GREATER }
      if (`${af}`<`${bf}`) { return SMALLER }
      if (`${af}`>`${bf}`) { return GREATER }
    }
    return 0
  }
}
