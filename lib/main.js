'use babel'

import { CompositeDisposable } from 'atom'
import natsort from 'natsort'
const sorter = natsort({ insensitive:true })

export default {

  activate() {
    this.treeView = null ; this.sortEntries_ = null
    if (atom.packages.isPackageActive('tree-view')) {
      this.install(atom.packages.getActivePackage('tree-view'))
    }
    this.disposables = new CompositeDisposable()
    this.disposables.add(
      atom.packages.onDidActivatePackage((pkg) => {
        if (pkg.name=='tree-view') { this.install(pkg) }
      }),
      atom.packages.onDidDeactivatePackage((pkg) => {
        if (pkg.name=='tree-view') { this.treeView = null }
      }),
      atom.config.observe('tree-view.sortFoldersBeforeFiles', (value) => {
        this.sortFoldersBeforeFiles = value
      }),
    )
  },

  install(pkg) {
    if (this.treeView||!pkg.mainModule||!pkg.mainModule.treeView) { return }
    this.treeView = pkg.mainModule.treeView
    this.sortEntries_ = this.treeView.roots[0].directory.constructor.prototype.sortEntries
    this.treeView.roots[0].directory.constructor.prototype.sortEntries = this.sortEntries
    this.treeView.updateRoots()
  },

  deactivate() {
    this.disposables.dispose()
    if (this.treeView) {
      this.treeView.roots[0].directory.constructor.prototype.sortEntries = this.sortEntries_
      this.treeView.updateRoots()
      this.treeView = null
    }
  },

  sortEntries(combinedEntries) {
    if (this.sortFoldersBeforeFiles) {
      let directories = [] ; let files = []
      for (let entry of combinedEntries) {
        if (entry instanceof this.constructor) {
          directories.push(entry)
        } else {
          files.push(entry)
        }
      }
      directories.sort((a, b) => {
        return sorter(a.name, b.name)
      })
      files.sort((a, b) => {
        return sorter(a.name, b.name)
      })
      return directories.concat(files)
    } else {
      return combinedEntries.sort((a, b) => {
        return sorter(a.name, b.name)
      })
    }
  },

}
