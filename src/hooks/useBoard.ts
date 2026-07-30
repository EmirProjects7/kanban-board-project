import {useState} from 'react'

export type Card = {
    id: string
    title: string
}

export type Column = {
    id: string
    title: string
    cards: Card[]
}

const initialColumns: Column[] = [
    {
        id: 'col-1',
        title: 'To Do',
        cards: [
            {id: 'card-1', title: 'Create Project'},
            {id: 'card-2', title: 'Generate Kanban'},
        ],
    },
    {
        id: 'col-2',
        title: 'In Progress',
        cards: [
            {id: 'card-3', title: 'Draw columns'},
        ],
    },
    {
        id: 'col-3',
        title: 'Done',
        cards: [
            {id: 'card-4', title: 'Load Node.js'},
            {id: 'card-5', title: 'Generate project'},
        ],
    },
]

export function useBoard() {
    const [columns, setColumns] = useState<Column[]>(initialColumns)

    function addCard(columnId: string, title: string) {
        const newCard: Card = {
            id: crypto.randomUUID(),
            title: title
        }
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

    function editCard(cardId:string, newTitle: string) {
        setColumns(columns.map((column) =>
            ({...column, cards:column.cards.map((c) => c.id === cardId ? {...c, title: newTitle} : c)})))
    }

    return {
        columns,
        setColumns,
        addCard,
        deleteCard,
        editCard,
    }

}