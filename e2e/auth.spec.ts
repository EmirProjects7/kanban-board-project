import {test, expect} from '@playwright/test'
import {registerAndSignIn} from './helpers'

const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3000'

// Logging out used to clear the token in the browser and nothing else, so a
// copy of it taken from that machine stayed good for the rest of the week.
// This is the part no unit test can show: the same token, before and after,
// against the running API.
test('logging out stops the token working, not just the browser holding it', async ({
    page,
    request,
}) => {
    await registerAndSignIn(page)

    const token = await page.evaluate(() => localStorage.getItem('token'))
    expect(token).toBeTruthy()

    const before = await request.get(`${API_URL}/api/boards`, {
        headers: {Authorization: `Bearer ${token}`},
    })
    expect(before.status()).toBe(200)

    await page.getByRole('button', {name: 'Logout'}).click()
    await expect(page.getByRole('heading', {name: 'Login'})).toBeVisible()

    const after = await request.get(`${API_URL}/api/boards`, {
        headers: {Authorization: `Bearer ${token}`},
    })
    expect(after.status()).toBe(401)
})
