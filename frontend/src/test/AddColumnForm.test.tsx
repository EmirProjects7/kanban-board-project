import {describe, it, expect, vi} from 'vitest'
import {render, screen, fireEvent} from '@testing-library/react'
import AddColumnForm from '../components/AddColumnForm'

function setup() {
    const onAdd = vi.fn()
    render(<AddColumnForm onAdd={onAdd} />)
    const input = screen.getByPlaceholderText('+ Add column')
    const button = screen.getByRole('button', {name: 'Add'})
    return {onAdd, input, button}
}

describe('AddColumnForm', () => {
    it('submits the typed title', () => {
        const {onAdd, input, button} = setup()
        fireEvent.change(input, {target: {value: 'Backlog'}})
        fireEvent.click(button)
        expect(onAdd).toHaveBeenCalledWith('Backlog')
    })

    it('submits on Enter', () => {
        const {onAdd, input} = setup()
        fireEvent.change(input, {target: {value: 'Backlog'}})
        fireEvent.keyDown(input, {key: 'Enter'})
        expect(onAdd).toHaveBeenCalledWith('Backlog')
    })

    it('trims surrounding whitespace', () => {
        const {onAdd, input, button} = setup()
        fireEvent.change(input, {target: {value: '  Backlog  '}})
        fireEvent.click(button)
        expect(onAdd).toHaveBeenCalledWith('Backlog')
    })

    it('clears the input after submitting', () => {
        const {input, button} = setup()
        fireEvent.change(input, {target: {value: 'Backlog'}})
        fireEvent.click(button)
        expect(input).toHaveValue('')
    })

    it('ignores a whitespace-only submission', () => {
        const {onAdd, input, button} = setup()
        fireEvent.change(input, {target: {value: '   '}})
        fireEvent.click(button)
        expect(onAdd).not.toHaveBeenCalled()
    })
})
