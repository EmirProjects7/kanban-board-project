import {describe, it, expect, vi} from 'vitest'
import {render, screen, fireEvent} from '@testing-library/react'
import AddCardForm from '../components/AddCardForm'

function setup() {
    const onAdd = vi.fn()
    render(<AddCardForm onAdd={onAdd} />)
    const input = screen.getByPlaceholderText('New card...')
    const button = screen.getByRole('button', {name: '+ Add'})
    return {onAdd, input, button}
}

describe('AddCardForm', () => {
    it('submits the typed title', () => {
        const {onAdd, input, button} = setup()
        fireEvent.change(input, {target: {value: 'Buy milk'}})
        fireEvent.click(button)
        expect(onAdd).toHaveBeenCalledWith('Buy milk')
    })

    it('clears the input after submitting', () => {
        const {input, button} = setup()
        fireEvent.change(input, {target: {value: 'Buy milk'}})
        fireEvent.click(button)
        expect(input).toHaveValue('')
    })

    it('ignores an empty submission', () => {
        const {onAdd, button} = setup()
        fireEvent.click(button)
        expect(onAdd).not.toHaveBeenCalled()
    })

    it('ignores a whitespace-only submission', () => {
        const {onAdd, input, button} = setup()
        fireEvent.change(input, {target: {value: '   '}})
        fireEvent.click(button)
        expect(onAdd).not.toHaveBeenCalled()
    })

    it('trims the title before submitting', () => {
        const {onAdd, input, button} = setup()
        fireEvent.change(input, {target: {value: '  Buy milk  '}})
        fireEvent.click(button)
        expect(onAdd).toHaveBeenCalledWith('Buy milk')
    })

    it('submits on Enter as well as the button', () => {
        const {onAdd, input} = setup()
        fireEvent.change(input, {target: {value: 'Buy milk'}})
        fireEvent.keyDown(input, {key: 'Enter'})
        expect(onAdd).toHaveBeenCalledWith('Buy milk')
    })

    it('clears the input after submitting with Enter', () => {
        const {input} = setup()
        fireEvent.change(input, {target: {value: 'Buy milk'}})
        fireEvent.keyDown(input, {key: 'Enter'})
        expect(input).toHaveValue('')
    })

    it('ignores Enter on an empty input', () => {
        const {onAdd, input} = setup()
        fireEvent.keyDown(input, {key: 'Enter'})
        expect(onAdd).not.toHaveBeenCalled()
    })
})
