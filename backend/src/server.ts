import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import authRouter from './routes/auth'
import columnsRouter from './routes/columns'
import cardsRouter from './routes/cards'

const app = express()
app.use(cors({origin: 'http://localhost:5173'}))
app.use(express.json())
app.use('/api/auth', authRouter)
app.use('/api/columns', columnsRouter)
app.use('/api/cards', cardsRouter)
const PORT = 3000

app.get('/health', (req, res) => {
    res.json({status: 'ok', message: 'Backend is running'})
})

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
})