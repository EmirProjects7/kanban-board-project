/**
 * Records docs/demo.gif: two sessions side by side, one being driven and the
 * other updating over the socket without a reload.
 *
 *   npm run dev        # in another terminal
 *   npm run demo
 *
 * Playwright writes one video per page, so the two are stacked with ffmpeg
 * afterwards. Both contexts are created together and seeded with the same
 * token, which keeps the recordings aligned. Registering inside one of them
 * would start that video seconds ahead of the other.
 */
import {execFileSync} from 'node:child_process'
import {mkdtempSync, mkdirSync, rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {chromium, type Page} from '@playwright/test'

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:5173'
// Wide enough for both columns and the add-column form beside them, so nothing
// sits half cut off at the edge. The height carries the columns plus the
// caption bar; much more and the empty space below them dominates the frame.
const PANE = {width: 810, height: 448}
const CAPTION_HEIGHT = 48

// Without these the recording is just two boards side by side, and nobody can
// tell which one is being used or why the other is changing.
const CAPTIONS = [
    'Window 1  ·  being used',
    'Window 2  ·  never touched, updates arrive over the socket',
]
const OUTPUT = join('docs', 'demo.gif')

// Long enough to read, short enough that the loop does not drag.
const beat = (page: Page, ms = 700) => page.waitForTimeout(ms)

async function addColumn(page: Page, title: string) {
    const input = page.getByPlaceholder('+ Add column')
    await input.click()
    await input.pressSequentially(title, {delay: 45})
    await input.press('Enter')
    await beat(page, 400)
}

function column(page: Page, title: string) {
    return page
        .locator('.column')
        .filter({has: page.getByRole('heading', {name: title, level: 2})})
}

async function addCard(page: Page, columnTitle: string, cardTitle: string) {
    const input = column(page, columnTitle).getByPlaceholder('New card...')
    await input.click()
    await input.pressSequentially(cardTitle, {delay: 40})
    await input.press('Enter')
    await beat(page, 350)
}

// dnd-kit's PointerSensor arms after five pixels and reads the drop target from
// the path rather than the end point, so the gesture is played out in steps.
// Slower than the test helper on purpose: this one is meant to be watched.
async function dragCardTo(page: Page, cardTitle: string, from: string, to: string) {
    const source = column(page, from)
        .locator('.card')
        .filter({has: page.locator('.card-title', {hasText: cardTitle})})
    const target = column(page, to)

    const a = await source.boundingBox()
    const b = await target.boundingBox()
    if (!a || !b) throw new Error('Cannot drag: an element has no box')

    const startX = a.x + a.width / 2
    const startY = a.y + a.height / 2
    const endX = b.x + b.width / 2
    const endY = b.y + 140

    await page.mouse.move(startX, startY)
    await beat(page, 250)
    await page.mouse.down()
    await page.mouse.move(startX + 10, startY + 10, {steps: 8})
    await page.mouse.move(endX, endY, {steps: 45})
    await page.mouse.move(endX, endY + 4, {steps: 6})
    await beat(page, 300)
    await page.mouse.up()
}

async function main() {
    const videoDir = mkdtempSync(join(tmpdir(), 'kanban-demo-'))
    const browser = await chromium.launch()

    // Registering happens off camera so both recorded videos start on the board.
    const setup = await browser.newContext({viewport: PANE})
    const setupPage = await setup.newPage()
    const email = `demo-${Date.now()}@example.test`
    await setupPage.goto(BASE_URL)
    await setupPage.getByRole('button', {name: 'Register'}).click()
    await setupPage.getByPlaceholder('Email').fill(email)
    await setupPage.getByPlaceholder('Password').fill('demo-password')
    await setupPage.getByRole('button', {name: 'Register'}).click()
    await setupPage.getByRole('heading', {name: 'My Board', level: 1}).waitFor()
    const token = await setupPage.evaluate(() => localStorage.getItem('token'))
    await setup.close()
    if (!token) throw new Error('No token after registering')

    const contexts = await Promise.all(
        CAPTIONS.map(async (caption) => {
            const context = await browser.newContext({
                viewport: PANE,
                recordVideo: {dir: videoDir, size: PANE},
            })
            await context.addInitScript(
                ({value, caption, height}) => {
                    localStorage.setItem('token', value)
                    // Drawn in the page rather than burnt in afterwards: this
                    // ffmpeg build has no drawtext filter, and a real element
                    // picks up the app's own font.
                    window.addEventListener('DOMContentLoaded', () => {
                        const bar = document.createElement('div')
                        bar.textContent = caption
                        Object.assign(bar.style, {
                            position: 'fixed',
                            top: '0',
                            left: '0',
                            right: '0',
                            height: `${height}px`,
                            display: 'flex',
                            alignItems: 'center',
                            padding: '0 20px',
                            font: '600 24px/1 ui-sans-serif, system-ui, -apple-system, sans-serif',
                            background: '#0a0a0e',
                            color: '#b9b9c6',
                            borderBottom: '1px solid #2c2c38',
                            zIndex: '2147483647',
                        })
                        document.body.appendChild(bar)
                        document.body.style.paddingTop = `${height}px`
                    })
                },
                {value: token, caption, height: CAPTION_HEIGHT}
            )
            return context
        })
    )

    const [left, right] = await Promise.all(contexts.map((c) => c.newPage()))
    await Promise.all([left.goto(BASE_URL), right.goto(BASE_URL)])
    await Promise.all([
        left.getByRole('heading', {name: 'My Board', level: 1}).waitFor(),
        right.getByRole('heading', {name: 'My Board', level: 1}).waitFor(),
    ])
    await beat(left, 900)

    // Everything from here happens in the left pane only. The right one is
    // never touched, so whatever shows up there arrived over the socket.
    // Two columns, not three: a third pushes the board into horizontal scroll
    // at this width, and focusing an input in it drags the whole board sideways
    // mid-recording.
    await addColumn(left, 'To do')
    await addColumn(left, 'Doing')

    await addCard(left, 'To do', 'Design the board')
    await addCard(left, 'To do', 'Wire up the socket')
    await addCard(left, 'Doing', 'Write the E2E tests')

    await beat(left, 500)
    await dragCardTo(left, 'Design the board', 'To do', 'Doing')

    // Hold on the last frame so the loop ends on both panes agreeing.
    await beat(left, 1500)

    const videos = await Promise.all(
        [left, right].map(async (page) => {
            const video = page.video()
            if (!video) throw new Error('No video recorded')
            return video
        })
    )
    await Promise.all(contexts.map((c) => c.close()))
    const [leftVideo, rightVideo] = await Promise.all(videos.map((v) => v.path()))
    await browser.close()

    mkdirSync('docs', {recursive: true})
    // Two passes over the stacked frames: one to build a palette from the
    // colours actually present, one to map onto it. A single pass would use
    // the generic 216-colour palette and band every gradient in the UI.
    execFileSync(
        'ffmpeg',
        [
            '-y',
            '-i', leftVideo,
            '-i', rightVideo,
            '-filter_complex',
            // A rule down the middle, so the two panes read as two windows
            // rather than one very wide board.
            '[0:v]pad=iw+3:ih:0:0:color=0x3a3a46[lp];' +
                '[lp][1:v]hstack=inputs=2,fps=12,scale=1000:-1:flags=lanczos,' +
                'split[s0][s1];[s0]palettegen=max_colors=128[p];' +
                '[s1][p]paletteuse=dither=bayer',
            '-loop', '0',
            OUTPUT,
        ],
        {stdio: 'inherit'}
    )
    rmSync(videoDir, {recursive: true, force: true})
    console.log(`\nWrote ${OUTPUT}`)
}

main().catch((error) => {
    console.error(error)
    process.exit(1)
})
