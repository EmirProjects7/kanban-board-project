import {useState} from 'react'

type AddCardFormProps = {
    onAdd: (title: string) => void
}

function AddCardForm({onAdd}: AddCardFormProps) {
    const [title, setTitle] = useState('')

    function handleAdd() {
        if (title.trim() === '') return
        onAdd(title)
        setTitle('')
    }

    return (
        <div className="add-card">
            <input type="text"
                   value={title}
                   onChange={(e) => setTitle(e.target.value)}
                   placeholder="New card..."
            />
            <button onClick={handleAdd}>+ Add</button>
        </div>
    ) /*add +Add button + handle press*/
}

export default AddCardForm