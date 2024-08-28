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

## Mac users only

If you are a Mac user, please note that port 5000 is used by AirPlay Receiver. In order to use the application, you will need to switch off AirPlay Receiver.

To switch off AirPlay Receiver, follow these steps:
1. Open System Preferences on your Mac.
2. Search for "AirDrop & Handoff".
3. In the "AirPlay Receiver" toggle, select "Off".

Once you have switched off AirPlay Receiver, you should be able to use the application without any issues.
