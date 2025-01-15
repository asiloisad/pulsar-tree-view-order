const { CompositeDisposable } = require('atom')
const path = require('path')

// global parameters
let sortMethod
let sortCompare
let sortOriginal
let sortBefore

module.exports = {

  config: {
    sortMethod: {
      type: 'integer',
      title: 'Sort method',
      enum: [
        { value:0, description:'Original tree-view' },
        { value:1, description:'Natural sorting: alphabetical and numbers' },
        { value:2, description:'Natural sorting: by character code and numbers' },
      ],
      default: 1,
      order: 1,
    }
  },

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
    let pkg = atom.packages.getActivePackage('tree-view')
    if (!this.treeView) { this.treeView = pkg.mainModule.treeView }
    for (let root of this.treeView.roots) {
      if (!sortOriginal) {
        sortOriginal = root.directory.constructor.prototype.sortEntries
      }
      root.directory.constructor.prototype.sortEntries = sortEntries
    }
    this.treeView.updateRoots()
  },

  deactivate() {
    this.disposables.dispose()
    let updateRequired = false
    if (this.treeView && sortOriginal) {
      for (let root of this.treeView.roots) {
        root.directory.constructor.prototype.sortEntries = sortOriginal
        updateRequired = true
      }
    }
    if (this.treeView) {
      this.treeView.updateRoots()
    }
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
