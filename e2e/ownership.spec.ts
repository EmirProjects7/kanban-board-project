import {test, expect} from '@playwright/test'
import {addCard, addColumn, column, registerAndSignIn, signOut, tokenFrom} from './helpers'

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3000'

// Ownership is enforced by reaching every row through its owner, so a board
// belonging to somebody else is not found rather than refused. That is only
// worth believing against the real database: the unit tests assert against a
// mocked client, which cannot tell a working join from a missing one.
test('one account cannot see or reach another account\'s board', async ({page, request}) => {
    await registerAndSignIn(page)
    await addColumn(page, 'Private plans')
    await addCard(page, 'Private plans', 'Salary review')

    const ownerToken = await tokenFrom(page)
    const owned = await request.get(`${API_URL}/api/boards`, {
        headers: {Authorization: `Bearer ${ownerToken}`},
    })
    expect(owned.status()).toBe(200)
    const ownerBoardId = (await owned.json())[0].id

    await signOut(page)
    await registerAndSignIn(page)

    // The second account arrives with a board of its own, which is empty. The
    // first account's column must not be on it, and its board must not be in
    // the drawer beside it.
    await expect(column(page, 'Private plans')).toHaveCount(0)
    await expect(page.getByText('Nothing here yet. Add a column to start.')).toBeVisible()

    await page.getByRole('button', {name: 'Boards'}).click()
    await expect(page.locator('.board-list-item')).toHaveCount(1)

    // Same board, asked for directly with the second account's token. Reads and
    // writes both have to come back refused, not merely empty.
    const intruderToken = await tokenFrom(page)
    const headers = {Authorization: `Bearer ${intruderToken}`}

    const list = await request.get(`${API_URL}/api/boards`, {headers})
    const ids = (await list.json()).map((board: {id: string}) => board.id)
    expect(ids).not.toContain(ownerBoardId)

    const read = await request.get(`${API_URL}/api/boards/${ownerBoardId}/columns`, {headers})
    expect(read.status()).toBe(403)

    const write = await request.put(`${API_URL}/api/boards/${ownerBoardId}`, {
        headers,
        data: {title: 'Taken over'},
    })
    expect(write.status()).toBe(403)
})
