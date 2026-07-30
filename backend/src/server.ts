import express from 'express'

const app = express()
const PORT = 3000

app.get('/health', (req, res) => {
    res.json({status: 'ok', message: 'Backend is running'})
})

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`)
})