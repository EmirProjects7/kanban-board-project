import {useState} from 'react'

type AddColumnFormProps = {
    onAdd: (title: string) => void
}

function AddColumnForm({onAdd}: AddColumnFormProps) {
    const [title, setTitle] = useState('')

    function handleSubmit() {
        const trimmed = title.trim()
        if (trimmed) {
            onAdd(trimmed)
            setTitle('')
        }
    }

    return (
        <div className="add-column-form">
            <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSubmit()
                }}
                placeholder="+ Add column"
            />
            <button onClick={handleSubmit}>Add</button>
        </div>
    )
}

export default AddColumnForm