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

const dragStart = (id: string) => ({active: {id}}) as DragStartEvent
const dragOver = (activeId: string, overId: string) =>
    ({active: {id: activeId}, over: {id: overId}}) as DragOverEvent
const dragEnd = (activeId: string, overId: string | null) =>
    ({
        active: {id: activeId},
        over: overId === null ? null : {id: overId},
    }) as DragEndEvent

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

    it('does nothing when hovering inside the same column', () => {
        const {hook, setColumns} = setup()
        act(() => hook.result.current.handleDragOver(dragOver('card-1', 'card-2')))
        expect(setColumns).not.toHaveBeenCalled()
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
