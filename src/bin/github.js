#!./node_modules/.bin/babel-node
import { docopt } from 'docopt';
import { RUNNER } from '../namespaces';
import { GithubPlatform } from '../platforms/GitHub';

import config from '../config';

const github = new GithubPlatform(config.github);


const doc = `Usage:
    github.js analize-repository <repository>
    github.js start [<repositories>]
    github.js -h | --help

    Options:
        -h  --help      GitHub Runner
`;

async function analizeRepository(opts) {
    const repo = await github.getRepo(opts['<repository>']);

    const result = await repo.analize();

    console.log('analizeRepository:', result);
}

async function start(opts) {
    const filter = opts['<repositories>'] && opts['<repositories>'].split(',');
    const result = await github.analize({ filter });

    console.log('start:', result.map(r => r.name));
}

async function run(opts) {
    if (opts['analize-repository']) {
        await analizeRepository(opts);
    }

    if (opts.start) {
        await start(opts);
    }
}

async function docoptRunner(opts, runner) {
    try {
        await new Promise((res, rej) => {
            RUNNER.run(async () => {
                RUNNER.set('notify', {
                    runner    : 'bin',
                    onMessage : msg => console.log(msg)
                });

                Promise.resolve(
                    Reflect.apply(runner, null, [ opts ])
                ).then(res).catch(rej);
            });
        });
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

docoptRunner(docopt(doc), run);

