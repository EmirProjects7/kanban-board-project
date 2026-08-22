// Rewrites the coverage badge in the README from the summary a coverage run
// leaves behind, so the number in the badge is always one the suite actually
// reached. The thresholds in the vitest configs guard the coverage itself;
// this guards what the README says about it.
//
// With --write the number is replaced, which is how CI keeps it current.
// Without it the script only reports and exits non-zero on a difference, the
// useful shape locally. Either way `npm run test:coverage` has to have run
// first. With no workspace named it does both.
//
// Only the number is rewritten. The colour is left as authored, since it is a
// presentation choice and not a measurement.

import {readFileSync, writeFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {dirname, join} from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const write = args.includes('--write')
const named = args.filter((arg) => arg !== '--write')
const targets = named.length > 0 ? named : ['backend', 'frontend']

const readmePath = join(root, 'README.md')
let readme = readFileSync(readmePath, 'utf8')

const problems = []
const changes = []

for (const workspace of targets) {
    const badge = new RegExp(
        `(img\\.shields\\.io/badge/${workspace}%20coverage-)(\\d+)(%25-)`
    ).exec(readme)
    if (!badge) {
        problems.push(`No ${workspace} coverage badge found in README.md.`)
        continue
    }

    const summaryPath = join(root, workspace, 'coverage', 'coverage-summary.json')
    let summary
    try {
        summary = JSON.parse(readFileSync(summaryPath, 'utf8'))
    } catch {
        problems.push(
            `No coverage summary at ${workspace}/coverage/coverage-summary.json. ` +
                `Run npm run test:coverage --prefix ${workspace} first.`
        )
        continue
    }

    const claimed = Number(badge[2])
    // Rounded down, so the badge never claims a percent the suite has not
    // actually reached.
    const measured = Math.floor(summary.total.lines.pct)

    if (claimed === measured) {
        console.log(`${workspace}: badge ${claimed}%, lines ${measured}%. Unchanged.`)
        continue
    }

    if (write) {
        readme = readme.replace(badge[0], `${badge[1]}${measured}${badge[3]}`)
        changes.push(`${workspace}: ${claimed}% to ${measured}%`)
    } else {
        problems.push(
            `The ${workspace} badge claims ${claimed}%, the suite covers ${measured}% of lines.`
        )
    }
}

if (changes.length > 0) {
    writeFileSync(readmePath, readme)
    console.log(`Updated README.md. ${changes.join(', ')}.`)
}

if (problems.length > 0) {
    console.error(problems.map((line) => `\n  ${line}`).join(''))
    process.exit(1)
}
