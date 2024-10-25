'use babel'

import { CompositeDisposable } from 'atom'
import path from 'path'

export default {

  config: {
    sortMethod: {
      type: 'integer',
      title: 'Sort method',
      enum: [
        { value:0, description:'tree-view original sort method' },
        { value:1, description:'Natural sorting: alphabetical and numbers' },
        { value:2, description:'Natural sorting: by character code and numbers' },
      ],
      default: 0,
      order: 1,
    }
  },

  activate() {
    this.disposables = new CompositeDisposable()
    this.treeView = null
    if (atom.packages.isPackageActive('tree-view')) {
      this.install()
    }
    this.disposables.add(
      atom.config.observe('tree-view-order.sortMethod', (value) => {
        this.setSortMethod(value)
        if (this.treeView) { this.treeView.updateRoots() }
      }),
      atom.config.observe('tree-view.sortFoldersBeforeFiles', (value) => {
        sortBefore = value
      }),
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
    if (this.treeView && sortOriginal) {
      for (let root of this.treeView.roots) {
        root.directory.constructor.prototype.sortEntries = sortOriginal
      }
    }
    this.treeView.updateRoots()
    this.treeView = null
  },

  setSortMethod(sortMethod) {
    if (sortMethod===0) {
      sortCompare = sortOriginal
    } else if (sortMethod===1) {
      sortCompare = require('natural-compare-lite')
    } else if (sortMethod===2) {
      sortCompare = require('natsort').default()
    }
  },
}

let sortCompare = null
let sortOriginal = null
let sortBefore = null

function sortEntries(combinedEntries) {
  if (sortBefore) {
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
    directories.sort(sorter)
    files.sort(sorter)
    return directories.concat(files)
  } else {
    return combinedEntries.sort(sorter)
  }
}

function sorter(a, b) {
  a = path.parse(typeof a==='string' ? a.toLowerCase() : a.name.toLowerCase())
  b = path.parse(typeof b==='string' ? b.toLowerCase() : b.name.toLowerCase())
  if (a.name===b.name) {
    a = a.ext ; b = b.ext
  } else {
    a = a.name ; b = b.name
  }
  return sortCompare(a, b)
}
