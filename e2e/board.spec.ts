import {test, expect} from '@playwright/test'
import {addCard, addColumn, card, column, dragOnto, registerAndSignIn} from './helpers'

test.describe('board', () => {
    test('a card dragged into another column stays there after a reload', async ({page}) => {
        await registerAndSignIn(page)
        await addColumn(page, 'To do')
        await addColumn(page, 'Doing')
        await addCard(page, 'To do', 'Write the E2E test')

        await dragOnto(page, card(page, 'To do', 'Write the E2E test'), column(page, 'Doing'))

        await expect(card(page, 'Doing', 'Write the E2E test')).toBeVisible()
        await expect(card(page, 'To do', 'Write the E2E test')).toHaveCount(0)

        // The move is only real once it has survived the database. The unit
        // tests cover the reducer; this is the part they cannot reach.
        await page.reload()

        await expect(card(page, 'Doing', 'Write the E2E test')).toBeVisible()
        await expect(card(page, 'To do', 'Write the E2E test')).toHaveCount(0)
    })

    test('a rename survives a reload', async ({page}) => {
        await registerAndSignIn(page)
        await addColumn(page, 'To do')
        await addCard(page, 'To do', 'Original title')

        await card(page, 'To do', 'Original title').locator('.card-title').dblclick()
        const editor = page.locator('.card-edit-input')
        await editor.fill('Renamed in the browser')
        await editor.press('Enter')

        await expect(card(page, 'To do', 'Renamed in the browser')).toBeVisible()

        await page.reload()

        await expect(card(page, 'To do', 'Renamed in the browser')).toBeVisible()
        await expect(card(page, 'To do', 'Original title')).toHaveCount(0)
    })
})
