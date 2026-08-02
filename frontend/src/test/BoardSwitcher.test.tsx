import {describe, it, expect, vi} from 'vitest'
import {render, screen, fireEvent} from '@testing-library/react'
import {BoardSwitcher} from '../components/BoardSwitcher'
import type {Board} from '../types'

const boards: Board[] = [
    {id: 'board-1', title: 'My Board', order: 0},
    {id: 'board-2', title: 'Work', order: 1},
]

function renderSwitcher(override: Partial<Board[]> | Board[] = boards) {
    const handlers = {
        onSelect: vi.fn(),
        onAdd: vi.fn(),
        onRename: vi.fn(),
        onDelete: vi.fn(),
    }
    render(
        <BoardSwitcher
            boards={override as Board[]}
            activeBoardId="board-1"
            {...handlers}
        />
    )
    return handlers
}

function openDrawer() {
    fireEvent.click(screen.getByRole('button', {name: 'Boards'}))
}

function openRowMenu(title: string) {
    fireEvent.click(screen.getByRole('button', {name: `Options for ${title}`}))
}

describe('the drawer', () => {
    it('stays shut until the button is pressed', () => {
        renderSwitcher()
        expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    })

    it('lists every board once opened', () => {
        renderSwitcher()
        openDrawer()
        expect(screen.getByRole('button', {name: 'My Board'})).toBeInTheDocument()
        expect(screen.getByRole('button', {name: 'Work'})).toBeInTheDocument()
    })

    it('marks the board currently on screen', () => {
        renderSwitcher()
        openDrawer()
        expect(screen.getByRole('button', {name: 'My Board'})).toHaveClass('is-active')
        expect(screen.getByRole('button', {name: 'Work'})).not.toHaveClass('is-active')
    })

    it('closes on the close button', () => {
        renderSwitcher()
        openDrawer()
        fireEvent.click(screen.getByRole('button', {name: 'Close boards menu'}))
        expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    })

    it('closes on Escape', () => {
        renderSwitcher()
        openDrawer()
        fireEvent.keyDown(window, {key: 'Escape'})
        expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    })
})

describe('choosing a board', () => {
    it('reports the choice', () => {
        const {onSelect} = renderSwitcher()
        openDrawer()
        fireEvent.click(screen.getByRole('button', {name: 'Work'}))
        expect(onSelect).toHaveBeenCalledWith('board-2')
    })

    it('leaves the drawer open so another can be picked', () => {
        renderSwitcher()
        openDrawer()
        fireEvent.click(screen.getByRole('button', {name: 'Work'}))
        expect(screen.getByRole('complementary')).toBeInTheDocument()
    })
})

describe('the row menu', () => {
    it('is not shown until the dots are pressed', () => {
        renderSwitcher()
        openDrawer()
        expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })

    it('opens from the dots', () => {
        renderSwitcher()
        openDrawer()
        openRowMenu('Work')
        expect(screen.getByRole('menuitem', {name: 'Rename'})).toBeInTheDocument()
        expect(screen.getByRole('menuitem', {name: 'Delete'})).toBeInTheDocument()
    })

    it('opens on right click as well', () => {
        renderSwitcher()
        openDrawer()
        fireEvent.contextMenu(screen.getByRole('button', {name: 'Work'}))
        expect(screen.getByRole('menu')).toBeInTheDocument()
    })

    it('deletes the board it belongs to', () => {
        const {onDelete} = renderSwitcher()
        openDrawer()
        openRowMenu('Work')
        fireEvent.click(screen.getByRole('menuitem', {name: 'Delete'}))
        expect(onDelete).toHaveBeenCalledWith('board-2')
    })

    it('refuses to delete the only board left', () => {
        renderSwitcher([boards[0]])
        openDrawer()
        openRowMenu('My Board')
        expect(screen.getByRole('menuitem', {name: 'Delete'})).toBeDisabled()
    })
})

describe('renaming', () => {
    it('opens an input holding the current title', () => {
        renderSwitcher()
        openDrawer()
        openRowMenu('Work')
        fireEvent.click(screen.getByRole('menuitem', {name: 'Rename'}))
        expect(screen.getByLabelText('Board name')).toHaveValue('Work')
    })

    it('saves on Enter', () => {
        const {onRename} = renderSwitcher()
        openDrawer()
        openRowMenu('Work')
        fireEvent.click(screen.getByRole('menuitem', {name: 'Rename'}))

        const input = screen.getByLabelText('Board name')
        fireEvent.change(input, {target: {value: 'Renamed'}})
        fireEvent.keyDown(input, {key: 'Enter'})

        expect(onRename).toHaveBeenCalledWith('board-2', 'Renamed')
    })

    it('discards on Escape', () => {
        const {onRename} = renderSwitcher()
        openDrawer()
        openRowMenu('Work')
        fireEvent.click(screen.getByRole('menuitem', {name: 'Rename'}))

        const input = screen.getByLabelText('Board name')
        fireEvent.change(input, {target: {value: 'Discarded'}})
        fireEvent.keyDown(input, {key: 'Escape'})

        expect(onRename).not.toHaveBeenCalled()
    })

    it('ignores a title that has not changed', () => {
        const {onRename} = renderSwitcher()
        openDrawer()
        openRowMenu('Work')
        fireEvent.click(screen.getByRole('menuitem', {name: 'Rename'}))
        fireEvent.keyDown(screen.getByLabelText('Board name'), {key: 'Enter'})

        expect(onRename).not.toHaveBeenCalled()
    })
})

describe('adding a board', () => {
    it('creates from the drawer', () => {
        const {onAdd} = renderSwitcher()
        openDrawer()
        fireEvent.click(screen.getByRole('button', {name: '+ New board'}))

        const input = screen.getByLabelText('New board name')
        fireEvent.change(input, {target: {value: 'Personal'}})
        fireEvent.keyDown(input, {key: 'Enter'})

        expect(onAdd).toHaveBeenCalledWith('Personal')
    })

    it('ignores an empty name', () => {
        const {onAdd} = renderSwitcher()
        openDrawer()
        fireEvent.click(screen.getByRole('button', {name: '+ New board'}))
        fireEvent.keyDown(screen.getByLabelText('New board name'), {key: 'Enter'})

        expect(onAdd).not.toHaveBeenCalled()
    })

    it('leaves the drawer open afterwards', () => {
        renderSwitcher()
        openDrawer()
        fireEvent.click(screen.getByRole('button', {name: '+ New board'}))

        const input = screen.getByLabelText('New board name')
        fireEvent.change(input, {target: {value: 'Personal'}})
        fireEvent.keyDown(input, {key: 'Enter'})

        expect(screen.getByRole('complementary')).toBeInTheDocument()
    })
})
