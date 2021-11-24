import github from './GitHub';
import gitea from './Gitea';
import { EmptyPlatform } from './Base';

export default [ github, gitea ].filter(p => !(p instanceof EmptyPlatform));

export {
    github,
    gitea
};
