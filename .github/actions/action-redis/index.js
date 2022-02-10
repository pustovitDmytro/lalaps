const core = require('@actions/core');
const github = require('@actions/github');
const { exec } = require('@actions/exec')

async function run(){
    try {
      const redisVersion = core.getInput('redis-version');
      console.log(`Installing Redis v.${redisVersion}!`);
      const time = (new Date()).toTimeString();
      core.setOutput("time", time);
      // Get the JSON webhook payload for the event that triggered the workflow
      const payload = JSON.stringify(github.context.payload, undefined, 2)
      console.log(`The event payload: ${payload}`);
      
      console.log('process.platform: ', process.platform);
      if(process.platform=='win32'){
          console.log('Windows');
          return;
      }

      if(process.platform=='darwin'){
        console.log('MacOS');
            
      await exec(
        `brew install redis`
      )

        return;
    }
    
      await exec(
        `apt-get install -y redis-tools redis-server`
      )
    
    } catch (error) {
      core.setFailed(error.message);
    }
}

run()