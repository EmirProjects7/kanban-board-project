import {useState, useEffect} from 'react'

export type Card = {
    id: string
    title: string
}

export type Column = {
    id: string
    title: string
    cards: Card[]
}

export function useBoard() {
    const [columns, setColumns] = useState<Column[]>([])

    useEffect(() => {
        fetch('http://localhost:3000/api/columns')
            .then((res) => res.json())
            .then((data) => setColumns(data))
            .catch((error) => console.log('Fetch error:', error))
    }, [])

    async function addCard(columnId: string, title: string) {
        const response = await fetch(`http://localhost:3000/api/columns/${columnId}/cards`,
            {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({title:title})
            })

        const newCard: Card = await response.json()
        
        setColumns(
            columns.map((column) =>
                column.id === columnId ? {...column, cards: [...column.cards, newCard]} : column
            )
        )
    }

    function deleteCard(cardId: string) {
        setColumns(columns.map((column) => ({
            ...column, cards: column.cards.filter((c) => c.id !== cardId)
        })))
    }

    function editCard(cardId: string, newTitle: string) {
        setColumns(columns.map((column) =>
            ({...column, cards: column.cards.map((c) => c.id === cardId ? {...c, title: newTitle} : c)})))
    }

    function addColumn(title: string) {
        const newColumn: Column = {
            id: crypto.randomUUID(),
            title: title,
            cards: []
        }
        setColumns([...columns, newColumn])
    }

    function deleteColumn(columnId: string) {
        setColumns(columns.filter((column) => column.id !== columnId))
    }

    return {
        columns,
        setColumns,
        addCard,
        deleteCard,
        editCard,
        addColumn,
        deleteColumn,
    }

}