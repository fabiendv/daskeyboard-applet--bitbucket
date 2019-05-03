const q = require('daskeyboard-applet');

const logger = q.logger;
const queryUrlBase = 'https://api.bitbucket.org/2.0';

class Bitbucket extends q.DesktopApp {
  constructor() {
    super();
    // run every mintutes
    this.pollingInterval = 60 * 1000;
  }

  async applyConfig() {
    logger.info("Bitbucket initialisation.");

    // Array to keep in mind the projects name and update date.
    this.updated_at = {};

    // User ID
    this.userName = this.config.userName;

    // Only if userName is definded
    if(this.userName){

      // first get all the user projects
      await this.getAllProjects().then((projects) => {

        logger.info("Let's configure the project table by getting the time.");

        logger.info("Response projects: "+JSON.stringify(projects));

        for (let project of projects.values) {
          // Get update_at for each project
          this.updated_at[project.name] = project.updated_on;
        }

      })
      .catch(error => {
        logger.error(
          `Got error sending request to service: ${JSON.stringify(error)}`);
      });

    }else{
      logger.info("UserName is not defined.");
    }

  }

  // Get all the user projects
  async getAllProjects() {
    const query = `/repositories/${this.userName}`;
    const proxyRequest = new q.Oauth2ProxyRequest({
      apiKey: this.authorization.apiKey,
      uri: queryUrlBase + query
    });
    return this.oauth2ProxyRequest(proxyRequest);
  }

  async run() {
    logger.info("Bitbucket running.");
    return this.getAllProjects().then(projects => {
      let triggered = false;
      let message = [];
      this.url = "";
      var notification = 0;

      for (let project of projects.values) {

        logger.info("This is a project: "+JSON.stringify(project));
        logger.info("This is the time before: "+JSON.stringify(this.updated_on[project.name]));
        logger.info("This is the time after: "+JSON.stringify(project.updated_on));
        logger.info("====");

        if(project.updated_on > this.updated_on[project.name]){

        // Need to send a signal         
        triggered=true;

        logger.info("Got an update in: " + JSON.stringify(project.name));

        //   // Need to update the time of the project which got an update
        //   this.updated_at[project.name] = project.updated_at;

        // Update signal's message
        message.push(`Update in ${project.name} project.`);

        // logger.info("This is the link: " + project.links.html.href);
        // this.url = project.links.html.href;
        //   // Update url:
        //   // if there are several notifications on different projects:
        //   // the url needs to redirect on the projects page
        //   if(notification >= 1){
        //     this.url = `https://3.basecamp.com/${this.userName}/projects/`;
        //   }else{
        //     this.url = project.app_url;
        //   }
        //   notification = notification +1;

         }

      }

      if (triggered) {
        return new q.Signal({
          points: [
            [new q.Point(this.config.color, this.config.effect)]
          ],
          name: `Bitbucket`,
          message: message.join("<br>"),
          link: {
            url: this.url,
            label: 'Show in Bitbucket',
          },
        });
      } else {
        logger.info("None udpate received.");
        return null;
      }
    }).catch(error => {
      logger.error(
        `Got error sending request to service: ${JSON.stringify(error)}`);
      if(`${error.message}`.includes("getaddrinfo")){
        return q.Signal.error(
          'The Bitbucket service returned an error. <b>Please check your internet connection</b>.'
        );
      }
      return q.Signal.error([
        'The Bitbucket service returned an error. <b>Please check your user ID and account</b>.',
        `Detail: ${error.message}`]);
    });
  }
}


module.exports = {
  Bitbucket: Bitbucket
}

const applet = new Bitbucket();