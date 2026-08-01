import {useState} from 'react'

type AddCardFormProps = {
    onAdd: (title: string) => void
}

function AddCardForm({onAdd}: AddCardFormProps) {
    const [title, setTitle] = useState('')

    function handleAdd() {
        const trimmed = title.trim()
        if (trimmed === '') return
        onAdd(trimmed)
        setTitle('')
    }

    return (
        <div className="add-card">
            <input type="text"
                   value={title}
                   onChange={(e) => setTitle(e.target.value)}
                   onKeyDown={(e) => {
                       if (e.key === 'Enter') handleAdd()
                   }}
                   placeholder="New card..."
            />
            <button onClick={handleAdd}>+ Add</button>
        </div>
    )
}

export default AddCardForm