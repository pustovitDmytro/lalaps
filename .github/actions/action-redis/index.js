const core = require('@actions/core');
const github = require('@actions/github');
const { exec } = require('@actions/exec')

try {
  const redisVersion = core.getInput('redis-version');
  console.log(`Installing Redis v.${redisVersion}!`);
  const time = (new Date()).toTimeString();
  core.setOutput("time", time);
  // Get the JSON webhook payload for the event that triggered the workflow
  const payload = JSON.stringify(github.context.payload, undefined, 2)
  console.log(`The event payload: ${payload}`);

  await exec(
    `sudo apt-get install -y redis-tools redis-server`
  )

} catch (error) {
  core.setFailed(error.message);
}