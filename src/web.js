import express from 'express';

import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';

import Queue from './Queue';
import config from './config';

const queues = [
    config.queue.repo,
    config.queue.main
].map(conf => Queue.createQuue({
    name  : conf.name,
    redis : config.queue.redis
}));

const serverAdapter = new ExpressAdapter();

createBullBoard({
    queues : queues.map(q => new BullAdapter(q)),
    serverAdapter
});

const app = express();

let server = null;

server = app.listen(config.web.port, () => {
    const { port } = server.address();

    console.log(`APP STARTING AT PORT ${port}`);
});

export default app;

export function onShutdown() {
    if (server) {
        return new Promise((res) => {
            server.close(res);
        });
    }
}

serverAdapter.setBasePath('/admin/queues');
const auth = { login: 'admin', password: config.admin.basic.adminPassword };

function checkBasicAuth(req, res, next) {
    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [ login, password ] = Buffer.from(b64auth, 'base64').toString().split(':');

    if (login === auth.login && password === auth.password) {
        return next();
    }

    const noAuthCode = 401;

    res.set('WWW-Authenticate', 'Basic realm="401"');
    res.status(noAuthCode).send('Authentication required');
}

app.use('/admin/queues', checkBasicAuth, serverAdapter.getRouter());
