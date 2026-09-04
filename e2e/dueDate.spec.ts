import {test, expect} from '@playwright/test'
import {addCard, addColumn, card, closeCard, openCard, registerAndSignIn} from './helpers'

// The browser sends a calendar day, the API stores an instant at UTC midnight,
// and the board reads it back through UTC again. Every one of those steps can
// shift the day for anyone not sitting on Greenwich, and no unit test crosses
// all three: this is the only place the round trip is real.
test.describe('due dates', () => {
    async function setDueDate(page: import('@playwright/test').Page, day: string) {
        await page.getByLabel('Due date').fill(day)
        await closeCard(page)
    }

    test('a due date survives a reload as the same day', async ({page}) => {
        await registerAndSignIn(page)
        await addColumn(page, 'To do')
        await addCard(page, 'To do', 'Renew the domain')

        await openCard(page, 'To do', 'Renew the domain')
        await setDueDate(page, '2030-03-05')

        const badge = card(page, 'To do', 'Renew the domain').locator('.card-due')
        await expect(badge).toHaveText('5 Mar 2030')

        await page.reload()

        await expect(badge).toHaveText('5 Mar 2030')
        // And the field the date came from agrees, rather than the badge being
        // right off a value the editor would show a day out.
        await openCard(page, 'To do', 'Renew the domain')
        await expect(page.getByLabel('Due date')).toHaveValue('2030-03-05')
    })

    test('a day that has passed is marked overdue', async ({page}) => {
        await registerAndSignIn(page)
        await addColumn(page, 'To do')
        await addCard(page, 'To do', 'File the tax return')

        await openCard(page, 'To do', 'File the tax return')
        await setDueDate(page, '2020-01-02')

        const badge = card(page, 'To do', 'File the tax return').locator('.card-due')
        await expect(badge).toHaveClass(/is-overdue/)

        await page.reload()

        await expect(badge).toHaveClass(/is-overdue/)
        // The label is what a screen reader gets, so it carries the state as
        // well as the date.
        await expect(badge).toHaveAttribute('aria-label', 'Overdue, was due 2 Jan 2020')
    })

    test('clearing a due date takes the badge off the card', async ({page}) => {
        await registerAndSignIn(page)
        await addColumn(page, 'To do')
        await addCard(page, 'To do', 'Book the flights')

        await openCard(page, 'To do', 'Book the flights')
        await setDueDate(page, '2030-03-05')

        const badge = card(page, 'To do', 'Book the flights').locator('.card-due')
        // Proven present first, so the count below cannot pass on a locator
        // that never matched anything.
        await expect(badge).toHaveText('5 Mar 2030')

        await openCard(page, 'To do', 'Book the flights')
        // Scoped to the dialog: the filter bar behind it has a Clear of its own.
        await page.getByRole('dialog').getByRole('button', {name: 'Clear'}).click()
        await closeCard(page)

        await expect(badge).toHaveCount(0)

        await page.reload()

        await expect(badge).toHaveCount(0)
    })
})
