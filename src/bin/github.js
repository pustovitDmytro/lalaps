#!./node_modules/.bin/babel-node
import { docopt } from 'docopt';
import { GithubPlatform } from '../platforms/GitHub';
import config from '../config';
import { docoptRunner } from './utils';

const github = new GithubPlatform(config.github);


const doc = `Usage:
    github.js analyze-repository <repository>
    github.js start [<repositories>]
    github.js -h | --help

    Options:
        -h  --help      GitHub Runner
`;

async function analyzeRepository(opts) {
    const repo = await github.getRepo(opts['<repository>']);

    const result = await repo.analyze();

    console.log('analyzeRepository:', result);
}

async function start(opts) {
    const filter = opts['<repositories>'] && opts['<repositories>'].split(',');
    const result = await github.analyze({ filter });

    console.log('start:', result.map(r => r.name));
}

async function run(opts) {
    if (opts['analyze-repository']) {
        await analyzeRepository(opts);
    }

    if (opts.start) {
        await start(opts);
    }
}

docoptRunner(docopt(doc), run);

