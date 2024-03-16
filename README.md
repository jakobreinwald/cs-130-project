## Minuet
Minuet is a Spotify companion application that utilizes the Spotify API to enhance a Spotify user's experience and help them find other members of their musical communities. Users can access fresh song recommendations and match with users based on a match score that takes into account their Spotify listening history. The app features references back to the Spotify locations of songs, artists, users, and more, making it a perfect app to supplement your Spotify listening experience. Visit the application at our live deployment: [https://www.minuet.lol](https://www.minuet.lol)


## Usage

Navigate to our [Wiki](https://github.com/jakobreinwald/cs-130-project/wiki) to learn more about how our application works, how to use it, and how to get involved with development. 


## Development

To begin development on the project, begin local development by cloning the repository. This repository includes both the frontend tier of our application, in the ```minuet/``` directory, and the server tier of our application in the ```server/``` directory.

### Frontend (```minuet/```)

To install dependencies, navigate to ./minuet and run `npm install`.  Then, run ```npm start``` to start the frontend server located at ```http://localhost:3000```. In order for the backend calls to work and to connect to the Spotify Developer app, you will need to create the file ```minuet/.env``` that contains:
```
REACT_APP_SPOTIFY_CLIENT_ID=
REACT_APP_BACKEND_URL=
REACT_APP_FRONTEND_URL=
```


### Backend (```server/```)

Then, navigate to ./server and run `npm install`.  Then, run ```npm start``` to start the backend server located at ```http://localhost:3001```. In order to connect to the Spotify Developer app and to the database, you will need to create the file ```server/.env.local``` that contains:
```
MONGO_USERNAME=
MONGO_PASSWORD=
MONGO_CLUSTER=
MONGO_HOST=
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
```

## Deployment

Our frontend is deployed on Github Pages, and our backend is deployed on Heroku. 

### Building Frontend

To build the app, navigate to ./minuet and run `npm run build`. The final production build will be in ./minuet/build, which is the version that is deployed. 

### Deploying Frontend

To deploy the app, use the final production build found in ./minuet/build. Our CI/CD pipeline is triggered when the branch main is changed, so all deployment-ready code should end up on this branch to be run through the CI/CD pipeline and deployed. 

### Deploying Backend 

The server.js file in ./server also needs to be deployed. This can be done by pushing the latest server code to the Heroku App via ```git push heroku master```. 

### CI/CD

To run our CI/CD pipeline, simply merge changes to the main branch via a pull request. This application utilizes Github Actions to run a CI pipeline that runs tests on the frontend and backend. From there, Github Pages takes the passing code and deploys it to [https://www.minuet.lol](https://www.minuet.lol), and the passing backend code is deployed to Heroku. 

## Questions

To inquire about the app or its development, please reach out to [@jakob.reinwald@yahoo.com](@jakob.reinwald@yahoo.com) or any of the other developers on the project. 
