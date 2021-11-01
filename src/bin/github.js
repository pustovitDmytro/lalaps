#!./node_modules/.bin/babel-node
import { docopt } from 'docopt';
import { GithubPlatform } from '../platforms/GitHub';
import config from '../config';
import { docoptRunner } from './utils';

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

docoptRunner(docopt(doc), run);

