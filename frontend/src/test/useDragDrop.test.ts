import {describe, it, expect, vi, beforeEach} from 'vitest'
import {renderHook, act} from '@testing-library/react'
import type {DragEndEvent, DragOverEvent, DragStartEvent} from '@dnd-kit/core'
import {useDragAndDrop} from '../hooks/useDragDrop'
import type {Column} from '../types'

const initialBoard: Column[] = [
    {
        id: 'col-1',
        title: 'Todo',
        cards: [
            {id: 'card-1', title: 'First'},
            {id: 'card-2', title: 'Second'},
        ],
    },
    {id: 'col-2', title: 'Done', cards: [{id: 'card-3', title: 'Third'}]},
]

function setup(board: Column[] = initialBoard) {
    let columns = board
    const saveBoard = vi.fn()
    const isDraggingRef = {current: false}
    const setColumns = vi.fn((update) => {
        columns = typeof update === 'function' ? update(columns) : update
    })

    const hook = renderHook(() =>
        useDragAndDrop(columns, setColumns, saveBoard, isDraggingRef)
    )

    return {hook, saveBoard, isDraggingRef, setColumns, getColumns: () => columns}
}

// dnd-kit always hands the handlers a data ref carrying what was registered
// on the sortable, which is how a column drag is told apart from a card one.
type DragType = 'card' | 'column'
const active = (id: string, type: DragType) => ({id, data: {current: {type}}})

// These carry only the fields the hook reads, hence the cast through unknown.
const dragStart = (id: string, type: DragType = 'card') =>
    ({active: active(id, type)}) as unknown as DragStartEvent
const dragOver = (activeId: string, overId: string, type: DragType = 'card') =>
    ({active: active(activeId, type), over: {id: overId}}) as unknown as DragOverEvent
const dragEnd = (activeId: string, overId: string | null, type: DragType = 'card') =>
    ({
        active: active(activeId, type),
        over: overId === null ? null : {id: overId},
    }) as unknown as DragEndEvent

beforeEach(() => {
    vi.clearAllMocks()
})

describe('handleDragStart', () => {
    it('marks a drag as in progress', () => {
        const {hook, isDraggingRef} = setup()
        act(() => hook.result.current.handleDragStart(dragStart('card-1')))
        expect(isDraggingRef.current).toBe(true)
    })

    it('tracks the dragged card for the overlay', () => {
        const {hook} = setup()
        act(() => hook.result.current.handleDragStart(dragStart('card-1')))
        expect(hook.result.current.activeCard).toEqual({id: 'card-1', title: 'First'})
    })

    it('leaves activeCard null for an unknown id', () => {
        const {hook} = setup()
        act(() => hook.result.current.handleDragStart(dragStart('nope')))
        expect(hook.result.current.activeCard).toBeNull()
    })
})

describe('handleDragOver', () => {
    it('moves a card into the column it is hovering over', () => {
        const {hook, getColumns} = setup()
        act(() => hook.result.current.handleDragOver(dragOver('card-1', 'col-2')))

        const columns = getColumns()
        expect(columns[0].cards.map((c) => c.id)).toEqual(['card-2'])
        expect(columns[1].cards.map((c) => c.id)).toContain('card-1')
    })

    it('inserts at the position of the card being hovered', () => {
        const {hook, getColumns} = setup()
        act(() => hook.result.current.handleDragOver(dragOver('card-1', 'card-3')))
        expect(getColumns()[1].cards.map((c) => c.id)).toEqual(['card-1', 'card-3'])
    })

    it('leaves the board untouched when hovering inside the same column', () => {
        const {hook, getColumns} = setup()
        act(() => hook.result.current.handleDragOver(dragOver('card-1', 'card-2')))
        expect(getColumns()).toEqual(initialBoard)
    })

    // dragOver fires on every pointer move, and the hook is not re-rendered
    // between them, so a second call still sees the card in the column it came
    // from. Resolving the two columns from the render's `columns` rather than
    // from current state let it walk past the same-column guard and splice a
    // second copy into the column the card had already been moved to.
    it('does not duplicate the card when it fires again after the move', () => {
        const {hook, getColumns} = setup()

        act(() => hook.result.current.handleDragOver(dragOver('card-1', 'col-2')))
        act(() => hook.result.current.handleDragOver(dragOver('card-1', 'col-2')))
        act(() => hook.result.current.handleDragOver(dragOver('card-1', 'card-3')))

        const columns = getColumns()
        const ids = columns.flatMap((column) => column.cards.map((card) => card.id))
        expect(ids).toHaveLength(new Set(ids).size)
        expect(columns[1].cards.filter((c) => c.id === 'card-1')).toHaveLength(1)
        expect(columns[0].cards.map((c) => c.id)).toEqual(['card-2'])
    })

    it('does nothing when there is no drop target', () => {
        const {hook, setColumns} = setup()
        act(() => hook.result.current.handleDragOver({active: {id: 'card-1'}, over: null} as DragOverEvent))
        expect(setColumns).not.toHaveBeenCalled()
    })
})

describe('handleDragEnd', () => {
    it('clears the dragging flag', () => {
        const {hook, isDraggingRef} = setup()
        act(() => hook.result.current.handleDragStart(dragStart('card-1')))
        act(() => hook.result.current.handleDragEnd(dragEnd('card-1', 'card-2')))
        expect(isDraggingRef.current).toBe(false)
    })

    it('clears the drag overlay card', () => {
        const {hook} = setup()
        act(() => hook.result.current.handleDragStart(dragStart('card-1')))
        act(() => hook.result.current.handleDragEnd(dragEnd('card-1', 'card-2')))
        expect(hook.result.current.activeCard).toBeNull()
    })

    it('reorders within a column and persists the result', () => {
        const {hook, saveBoard, getColumns} = setup()
        act(() => hook.result.current.handleDragEnd(dragEnd('card-1', 'card-2')))

        expect(getColumns()[0].cards.map((c) => c.id)).toEqual(['card-2', 'card-1'])
        expect(saveBoard).toHaveBeenCalledOnce()
    })

    it('persists once after a cross-column move', () => {
        const {hook, saveBoard} = setup()
        act(() => hook.result.current.handleDragEnd(dragEnd('card-1', 'col-2')))
        expect(saveBoard).toHaveBeenCalledOnce()
    })

    it('does not persist when the card is dropped outside any target', () => {
        const {hook, saveBoard} = setup()
        act(() => hook.result.current.handleDragEnd(dragEnd('card-1', null)))
        expect(saveBoard).not.toHaveBeenCalled()
    })

    it('persists without reordering when the drop target is unknown', () => {
        const {hook, saveBoard, setColumns} = setup()
        act(() => hook.result.current.handleDragEnd(dragEnd('card-1', 'ghost-column')))
        expect(saveBoard).toHaveBeenCalledOnce()
        expect(setColumns).not.toHaveBeenCalled()
    })

    it('leaves the order untouched when a card is dropped on itself', () => {
        const {hook, getColumns} = setup()
        act(() => hook.result.current.handleDragEnd(dragEnd('card-1', 'card-1')))
        expect(getColumns()[0].cards.map((c) => c.id)).toEqual(['card-1', 'card-2'])
    })
})

describe('dragging a column', () => {
    it('tracks the dragged column for the overlay', () => {
        const {hook} = setup()
        act(() => hook.result.current.handleDragStart(dragStart('col-1', 'column')))
        expect(hook.result.current.activeColumn?.id).toBe('col-1')
        expect(hook.result.current.activeCard).toBeNull()
    })

    it('clears the overlay once the drag ends', () => {
        const {hook} = setup()
        act(() => hook.result.current.handleDragStart(dragStart('col-1', 'column')))
        act(() => hook.result.current.handleDragEnd(dragEnd('col-1', 'col-2', 'column')))
        expect(hook.result.current.activeColumn).toBeNull()
    })

    it('reorders the columns when dropped on another column', () => {
        const {hook, getColumns} = setup()
        act(() => hook.result.current.handleDragEnd(dragEnd('col-1', 'col-2', 'column')))
        expect(getColumns().map((c) => c.id)).toEqual(['col-2', 'col-1'])
    })

    it('persists the new column order', () => {
        const {hook, saveBoard} = setup()
        act(() => hook.result.current.handleDragEnd(dragEnd('col-1', 'col-2', 'column')))
        expect(saveBoard).toHaveBeenCalledOnce()
        expect(saveBoard.mock.calls[0][0].map((c: {id: string}) => c.id)).toEqual([
            'col-2',
            'col-1',
        ])
    })

    it('resolves a drop onto a card back to the column holding it', () => {
        const {hook, getColumns} = setup()
        act(() => hook.result.current.handleDragEnd(dragEnd('col-1', 'card-3', 'column')))
        expect(getColumns().map((c) => c.id)).toEqual(['col-2', 'col-1'])
    })

    it('does nothing when a column is dropped on itself', () => {
        const {hook, saveBoard, setColumns} = setup()
        act(() => hook.result.current.handleDragEnd(dragEnd('col-1', 'col-1', 'column')))
        expect(setColumns).not.toHaveBeenCalled()
        expect(saveBoard).not.toHaveBeenCalled()
    })

    it('does nothing when a column is dropped outside any target', () => {
        const {hook, saveBoard, setColumns} = setup()
        act(() => hook.result.current.handleDragEnd(dragEnd('col-1', null, 'column')))
        expect(setColumns).not.toHaveBeenCalled()
        expect(saveBoard).not.toHaveBeenCalled()
    })

    it('does not move cards around while a column is dragged over another', () => {
        const {hook, setColumns} = setup()
        act(() => hook.result.current.handleDragOver(dragOver('col-1', 'col-2', 'column')))
        expect(setColumns).not.toHaveBeenCalled()
    })
})
