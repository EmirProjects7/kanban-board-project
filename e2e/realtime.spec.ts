import {test, expect} from '@playwright/test'
import {addCard, addColumn, card, registerAndSignIn} from './helpers'

// The headline feature, and the one thing the Vitest suite cannot reach: it
// needs two real browser sessions and a live socket between them.
test('a card added in one session appears in another without a reload', async ({browser}) => {
    const first = await browser.newContext()
    const pageA = await first.newPage()
    await registerAndSignIn(pageA)

    // The socket handshake authenticates with the same token as the REST calls,
    // so seeding it into a second context opens another session as the same
    // user without going through the form again.
    const token = await pageA.evaluate(() => localStorage.getItem('token'))
    expect(token).toBeTruthy()

    const second = await browser.newContext()
    await second.addInitScript((value) => localStorage.setItem('token', value), token!)
    const pageB = await second.newPage()
    await pageB.goto('/')
    await expect(pageB.getByRole('heading', {name: 'My Board', level: 1})).toBeVisible()

    await addColumn(pageA, 'To do')
    await addCard(pageA, 'To do', 'Pushed over the socket')

    // No reload on pageB. Passing means the write reached the database, the
    // server emitted into the user's room, and the other session applied it.
    await expect(card(pageB, 'To do', 'Pushed over the socket')).toBeVisible({timeout: 10_000})

    await first.close()
    await second.close()
})
