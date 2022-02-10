const core = require('@actions/core');
const github = require('@actions/github');
const { exec } = require('@actions/exec')

async function run(){
    try {
      const redisVersion = core.getInput('redis-version');
      console.log(`Installing Redis v.${redisVersion}!`);
      const time = (new Date()).toTimeString();
      core.setOutput("time", time);
      
      console.log('process.platform: ', process.platform);

      if(process.platform=='win32'){
          console.log('Windows');
          return;
      }

      if(process.platform=='darwin'){
      console.log('MacOS');
            
      await exec(`brew install redis`);

      await exec(`redis-server --version`);

      await exec(`brew services start redis`);

      return;
    }
    
      await exec(`sudo add-apt-repository ppa:redislabs/redis`);
      await exec(`sudo apt-get install -y redis-tools redis-server`);

      await exec(`redis-server --version`);
    
    } catch (error) {
      core.setFailed(error.message);
    }
}

run()