# lpa-data-validator-frontend

## Description
This is the frontend for the LPA Data Validator application. It is a nodeJS express application that uses nunjucks and the [GOV.UK Design System](https://design-system.service.gov.uk/) for the UI.

## Setup

- Install the node packages
    ```
    npm install
    ``` 
- setup husky pre-commit hooks
    ```
    npm run prepare
    ```
- compile scss file
    ```
    npm run scss
    ```

## Running the application
- Run the application
    ```
    npm run start
    ```
- Run the application in watch mode
    ```
    npm run start
    ```
- run the application, using a local api
    ```
    npm run start:local
    ```
- run the application, using a local api in watch mode
    ```
    npm run start:local:watch
    ```