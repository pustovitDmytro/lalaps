#!./node_modules/.bin/babel-node
import { docopt } from 'docopt';
import { GithubPlatform } from '../platforms/GitHub';
import config from '../config';

const github = new GithubPlatform(config.github);

const doc =
`Usage:
  github.js analize-repository <repository> 
  github.js -h | --help

Options:
  -h  --help      GitHub Runner
`;


async function run(opts) {
    try {
        const repo = await github.getRepo(opts['<repository>']);

        const result = await repo.analize();

        console.log('main:', result);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

run(docopt(doc));
