import express from 'express'
import cors from 'cors'

type Card = {
    id: string
    title: string
}

type Column = {
    id: string
    title: string
    cards: Card[]
}

let columns: Column[] = [
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
        cards: [{id: 'card-3', title: 'Draw columns'}],
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

const app = express()
app.use(cors({origin: 'http://localhost:5173'}))
app.use(express.json())
const PORT = 3000

app.get('/health', (req, res) => {
    res.json({status: 'ok', message: 'Backend is running'})
})

app.get('/api/columns', (req, res) => {
    res.json(columns)
})

app.post('/api/columns/:columnId/cards', (req, res) => {
    const {columnId} = req.params
    const {title} = req.body

    const newCard: Card = {
        id: crypto.randomUUID(),
        title: title
    }
    columns = columns.map((column) =>
        column.id === columnId ? {...column, cards: [...column.cards, newCard]} : column
    )
    res.status(201).json(newCard)
})

app.post('/api/columns', (req, res) => {
    const {title} = req.body

    const newColumn: Column = {
        id: crypto.randomUUID(),
        title: title,
        cards: [],
    }

    columns = [...columns, newColumn]

    res.status(201).json(newColumn)
})

app.delete('/api/cards/:cardId', (req, res) => {
    const {cardId} = req.params
    columns = columns.map((column) => ({...column, cards: column.cards.filter((card) => card.id !== cardId)}))
    res.status(204).end()
})

app.delete('/api/columns/:columnId', (req, res) => {
    const {columnId} = req.params

    columns = columns.filter((column) => column.id !== columnId)

    res.status(204).end()
})

app.put('/api/cards/:cardId', (req, res) => {
    const {cardId} = req.params
    const {title} = req.body

    columns = columns.map((column) => ({
        ...column,
        cards: column.cards.map((card) =>
            card.id === cardId ? {...card, title: title} : card)
    }))
    res.status(200).json({id: cardId, title: title})
})

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
})