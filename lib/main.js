const { CompositeDisposable } = require('atom')
const path = require('path')
const fs = require('fs')

// global parameters
let sortMethod
let sortCompare
let sortOriginal
let sortBefore

module.exports = {

  activate() {
    this.disposables = new CompositeDisposable()
    this.disposables.add(
      atom.config.observe('tree-view-order.sortMethod', (value) => {
        this.setSortMethod(value)
        if (this.treeView) { this.treeView.updateRoots() }
      }),
      atom.config.observe('tree-view.sortFoldersBeforeFiles', (value) => {
        sortBefore = value
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

  setSortMethod(id) {
    sortMethod = id
    if (id===0) {
      sortCompare = Intl.Collator(undefined, {numeric: true, sensitivity: 'base'}).compare
    } else if (id===1) {
      sortCompare = require('natural-compare-lite')
    } else if (id===2) {
      sortCompare = require('natsort').default()
    }
  },
}

function sortEntries(combinedEntries) {
  if (sortBefore) {
    let directories = [] ; let files = []
    for (let entry of combinedEntries) {
      if (entry instanceof this.constructor) {
        directories.push(entry)
      } else if (typeof entry==='string' && fs.lstatSync(path.join(this.path, entry)).isDirectory() ) {
        directories.push(entry)
      } else {
        files.push(entry)
      }
    }
    directories.sort(sorter)
    files.sort(sorter)
    return directories.concat(files)
  } else {
    return combinedEntries.sort(sorter)
  }
}

function sorter(a, b) {
  if (sortMethod>0) {
    a = path.parse(typeof a==='string' ? a.toLowerCase() : a.name.toLowerCase())
    b = path.parse(typeof b==='string' ? b.toLowerCase() : b.name.toLowerCase())
    if (a.name===b.name) {
      a = a.ext ; b = b.ext
    } else {
      a = a.name ; b = b.name
    }
  }
  return sortCompare(a, b)
}
