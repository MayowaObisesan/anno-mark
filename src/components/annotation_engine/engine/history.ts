import type { Annotation } from "~components/annotation_engine/engine/types"

export type HistoryEntry = {
  annotations: Annotation[]
}

export class HistoryStack {
  private undoStack: HistoryEntry[] = []
  private redoStack: HistoryEntry[] = []
  private limit = 100
  private onChangeCallback?: () => void

  setOnChangeCallback(callback: () => void) {
    this.onChangeCallback = callback
  }

  private notifyChange() {
    this.onChangeCallback?.()
  }

  push(state: Annotation[]) {
    this.undoStack.push({
      annotations: structuredClone(state)
    })

    if (this.undoStack.length > this.limit) {
      this.undoStack.shift()
    }

    this.redoStack.length = 0
    this.notifyChange()
  }

  undo(current: Annotation[]): Annotation[] | null {
    if (this.undoStack.length === 0) return null

    const prev = this.undoStack.pop()!
    this.redoStack.push({
      annotations: structuredClone(current)
    })

    this.notifyChange()
    return structuredClone(prev.annotations)
  }

  redo(current: Annotation[]): Annotation[] | null {
    if (this.redoStack.length === 0) return null

    const next = this.redoStack.pop()!
    this.undoStack.push({
      annotations: structuredClone(current)
    })

    this.notifyChange()
    return structuredClone(next.annotations)
  }

  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  clear() {
    this.undoStack.length = 0
    this.redoStack.length = 0
    this.notifyChange()
  }
}
