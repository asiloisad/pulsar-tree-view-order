const { CompositeDisposable } = require('atom')
const path = require('path')
const fs = require('fs')

// global parameters
let sortMethod
let sortCompare
let sortByBase
let sortBefore
let sortOriginal

module.exports = {

  activate() {
    this.disposables = new CompositeDisposable()
    this.disposables.add(
      atom.config.observe('tree-view-order.sortMethod', (value) => {
        sortMethod = value
        if (sortMethod===0) {
          sortCompare = Intl.Collator(undefined, { numeric:true, sensitivity:'base' }).compare
        } else if (sortMethod===1) {
          sortCompare = require('natural-compare-lite')
        } else if (sortMethod===2) {
          sortCompare = require('natsort').default()
        }
        if (this.treeView) { this.treeView.updateRoots() }
      }),
      atom.config.observe('tree-view-order.sortByBase', (value) => {
        sortByBase = value
        if (this.treeView) { this.treeView.updateRoots() }
      }),
      atom.config.observe('tree-view.sortFoldersBeforeFiles', (value) => {
        sortBefore = value
        if (this.treeView) { this.treeView.updateRoots() }
      }),
    )
    this.treeView = null
    if (atom.packages.isPackageActive('tree-view')) {
      this.install()
    }
    this.disposables.add(
      atom.packages.onDidActivatePackage((pkg) => {
        if (pkg.name=='tree-view') { this.install() }
      }),
      atom.packages.onDidDeactivatePackage((pkg) => {
        if (pkg.name=='tree-view') { this.treeView = null }
      }),
      atom.project.onDidChangePaths(() => {
        this.install()
      }),
    )
  },

  install() {
    if (this.treeView) { return }
    let pkg = atom.packages.getActivePackage('tree-view')
    if (!pkg) { return }
    const element = document.querySelector('[is="tree-view-directory"]')
    if (!element) { return }
    sortOriginal = element.directory.constructor.prototype.sortEntries
    element.directory.constructor.prototype.sortEntries = sortEntries
    this.treeView = pkg.mainModule.treeView
    this.treeView.updateRoots()
  },

  deactivate() {
    this.disposables.dispose()
    if (!this.treeView) { return }
    const element = document.querySelector('[is="tree-view-directory"]')
    if (!element) { return }
    element.directory.constructor.prototype.sortEntries = sortOriginal
    this.treeView.updateRoots()
    this.treeView = null
  },
}

function sortEntries(combinedEntries) {
  let directories = [] ; let files = [] ; let isdir = true
  for (let entry of combinedEntries) {
    if (typeof entry==='string') {
      let stat
      try {
        stat = fs.lstatSync(path.join(this.path, entry))
      } catch {
        continue
      }
      if (isdir && stat.isDirectory()) {
        entry = { _full:entry, _name:entry, _ext:'', _string:entry }
        directories.push(entry)
      } else {
        isdir = false
        p = path.parse(entry)
        entry = { _full:entry, _name:p.name, _ext:p.ext, _string:entry  }
        files.push(entry)
      }
    } else {
      if (isdir && entry instanceof this.constructor) {
        entry._full = entry.name
        entry._name = entry.name
        entry._ext = ''
        directories.push(entry)
      } else {
        isdir = false
        p = path.parse(entry.name)
        entry._full = entry.name
        entry._name = p.name
        entry._ext = p.ext
        files.push(entry)
      }
    }
    entry._full = entry._full.toLowerCase()
    entry._name = entry._name.toLowerCase()
    entry._ext = entry._ext.toLowerCase()
  }
  let data
  if (sortBefore) {
    directories.sort(sorter)
    files.sort(sorter)
    data = directories.concat(files)
  } else {
    data = directories.concat(files).sort(sorter)
  }
  return data.map((item) => item._string ? item._string : item )
}

function sorter(a, b) {
  if (sortByBase) {
    if (a._name===b._name) {
      a = a.ext ; b = b.ext
    } else {
      a = a._name ; b = b._name
    }
  } else {
    a = a._full
    b = b._full
  }
  return sortCompare(a, b)
}
