import {expect, type Locator, type Page} from '@playwright/test'

// A fresh account per test, so nothing depends on what an earlier run left in
// the database and the suite can be run twice in a row.
export function freshCredentials() {
    const unique = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    return {email: `e2e-${unique}@example.test`, password: 'e2e-password'}
}

export async function registerAndSignIn(page: Page) {
    const {email, password} = freshCredentials()

    await page.goto('/')
    // In login mode the only control reading "Register" is the link that flips
    // the form; once flipped it is the submit button, and the link reads
    // "Login". So the same name means a different button before and after.
    await page.getByRole('button', {name: 'Register'}).click()
    await page.getByPlaceholder('Email').fill(email)
    await page.getByPlaceholder('Password').fill(password)
    await page.getByRole('button', {name: 'Register'}).click()

    // Registering creates a board, so landing on it proves register, the
    // automatic login that follows, and the first board fetch all worked.
    await expect(page.getByRole('heading', {name: 'My Board', level: 1})).toBeVisible()

    return {email, password}
}

export function column(page: Page, title: string): Locator {
    return page
        .locator('.column')
        .filter({has: page.getByRole('heading', {name: title, level: 2})})
}

export function card(page: Page, columnTitle: string, cardTitle: string): Locator {
    return column(page, columnTitle)
        .locator('.card')
        .filter({has: page.locator('.card-title', {hasText: cardTitle})})
}

export async function addColumn(page: Page, title: string) {
    const input = page.getByPlaceholder('+ Add column')
    await input.fill(title)
    await input.press('Enter')
    await expect(column(page, title)).toBeVisible()
}

export async function addCard(page: Page, columnTitle: string, cardTitle: string) {
    const target = column(page, columnTitle)
    const input = target.getByPlaceholder('New card...')
    await input.fill(cardTitle)
    await input.press('Enter')
    await expect(card(page, columnTitle, cardTitle)).toBeVisible()
    // A new card opens its own detail, since it arrives with nothing but a
    // title. Everything below this helper works on the board, which the
    // overlay covers until it is shut.
    await closeCard(page)
}

// The board is behind a portal-rendered dialog once a card is open, so the
// tests that need one go through here rather than each finding their own way in.
export async function openCard(page: Page, columnTitle: string, cardTitle: string) {
    await card(page, columnTitle, cardTitle).getByRole('button', {name: `Open ${cardTitle}`}).click()
    await expect(page.getByRole('dialog')).toBeVisible()
}

export async function closeCard(page: Page) {
    await page.keyboard.press('Escape')
    await expect(page.locator('.detail')).toHaveCount(0)
}

export async function signOut(page: Page) {
    await page.getByRole('button', {name: 'Logout'}).click()
    await expect(page.getByRole('heading', {name: 'Login'})).toBeVisible()
}

/** The session token this browser is holding, for talking to the API directly. */
export function tokenFrom(page: Page) {
    return page.evaluate(() => localStorage.getItem('token'))
}

// page.dragAndDrop does nothing here. dnd-kit's PointerSensor is configured
// with an activation distance of five pixels, and it works the drop target out
// from the moves along the way rather than from where the pointer ends up, so
// the gesture has to be played out in steps.
export async function dragOnto(page: Page, source: Locator, target: Locator) {
    const from = await source.boundingBox()
    const to = await target.boundingBox()
    if (!from || !to) throw new Error('Cannot drag: an element has no box')

    const startX = from.x + from.width / 2
    const startY = from.y + from.height / 2
    const endX = to.x + to.width / 2
    const endY = to.y + to.height / 2

    await page.mouse.move(startX, startY)
    await page.mouse.down()
    await page.mouse.move(startX + 10, startY + 10, {steps: 5}) // past the 5px threshold
    await page.mouse.move(endX, endY, {steps: 20}) // let the sensor track the path
    await page.mouse.move(endX, endY + 4, {steps: 5}) // settle on the target
    await page.mouse.up()
}
