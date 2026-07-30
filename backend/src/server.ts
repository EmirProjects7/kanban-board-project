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

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
})